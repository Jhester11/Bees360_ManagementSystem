<?php

// Run with: php tests/database-maintenance-smoke.php (isolated in-memory database).
use App\Enums\UserRole;
use App\Http\Middleware\EnsureOperationsRole;
use App\Models\User;
use App\Services\DatabaseMaintenance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config([
    'database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
    'session.driver' => 'database', 'session.connection' => 'sqlite', 'session.table' => 'sessions', 'session.lifetime' => 120,
    'cache.default' => 'database', 'cache.stores.database.connection' => 'sqlite', 'cache.stores.database.table' => 'cache',
]);
DB::purge('sqlite');
if (Artisan::call('migrate', ['--database' => 'sqlite', '--force' => true]) !== 0) {
    throw new RuntimeException(Artisan::output());
}
function verify(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}
$now = time();
foreach (array_chunk(range(1, 5100), 300) as $ids) {
    DB::table('sessions')->insert(array_map(fn (int $id): array => ['id' => 'old-'.$id, 'payload' => 'expired', 'last_activity' => $now - 10000], $ids));
}
DB::table('sessions')->insert(['id' => 'active-session', 'payload' => 'preserve', 'last_activity' => $now]);
DB::table('cache')->insert([
    ['key' => 'expired', 'value' => 'expired', 'expiration' => $now - 100],
    ['key' => 'valid', 'value' => 'preserve', 'expiration' => $now + 3600],
]);
DB::table('cache_locks')->insert(['key' => 'active-lock', 'owner' => 'owner', 'expiration' => $now + 3600]);
$user = User::create(['name' => 'Maintenance Test', 'email' => 'maintenance@example.test', 'password' => 'test-password', 'batch' => 1]);
DB::table('report_entries')->insert(['report_date' => '2026-09-01', 'source' => 'active', 'batch' => 1, 'processor_name' => $user->name, 'project_id' => 'protected', 'inspection_type' => 'Exterior', 'report_category' => 'general_exterior']);
$before = DB::table('report_entries')->get()->toJson();
$service = new DatabaseMaintenance;
$result = $service->run();
verify($result['sessionsRemoved'] === 5000 && $result['cacheRemoved'] === 1 && $result['moreRemaining'], 'Batch limits or result counts are incorrect.');
$result = $service->run();
verify($result['sessionsRemoved'] === 100 && ! $result['moreRemaining'], 'Remaining expired records were not cleaned.');
verify(DB::table('sessions')->pluck('id')->all() === ['active-session'], 'Active session was removed.');
verify(DB::table('cache')->pluck('key')->all() === ['valid'], 'Valid cache was removed.');
verify(DB::table('cache_locks')->count() === 1, 'Active lock was removed.');
verify(DB::table('report_entries')->get()->toJson() === $before && User::find($user->id) !== null, 'Business records were changed.');
$result = $service->run();
verify($result['sessionsRemoved'] === 0 && $result['cacheRemoved'] === 0, 'Repeat cleanup should be harmless.');
config(['session.driver' => 'file', 'cache.default' => 'array']);
$result = $service->run();
verify($result['sessionsRemoved'] === null && $result['cacheRemoved'] === null, 'Unsupported drivers should be skipped.');

foreach (UserRole::cases() as $role) {
    $request = Request::create('/operations/database-maintenance', 'POST');
    $request->setUserResolver(fn (): User => new User(['role' => $role]));
    try {
        (new EnsureOperationsRole)->handle($request, fn () => response('allowed'));
        verify($role === UserRole::Operations, 'Non-Operations user allowed maintenance.');
    } catch (HttpException $exception) {
        verify($role !== UserRole::Operations && $exception->getStatusCode() === 403, 'Incorrect authorization response.');
    }
}
foreach (['operations.database-maintenance', 'operations.database-maintenance.run'] as $name) {
    $route = app('router')->getRoutes()->getByName($name);
    verify($route !== null && in_array('operations', $route->gatherMiddleware(), true) && in_array('auth', $route->gatherMiddleware(), true), 'Maintenance route is unprotected.');
}
echo "PASS: bounded cleanup, active sessions/cache/locks preserved, business records preserved, repeat runs, alternate drivers, and all role permissions.\n";

config(['session.driver' => 'database', 'cache.default' => 'database', 'maintenance.lock_store' => 'database']);
$coordinator = new App\Services\RunDatabaseMaintenance($service);
$lock = Illuminate\Support\Facades\Cache::store('database')->lock('database-maintenance', 300);
verify($lock->get(), 'Unable to acquire test lock.');
verify($coordinator->run($user->id) === null, 'Overlapping maintenance was allowed.');
verify(App\Models\DatabaseMaintenanceRun::count() === 0, 'Rejected run was recorded as started.');
$lock->release();
$run = $coordinator->run($user->id);
verify($run->fresh()->status === 'completed' && $run->user_id === $user->id && $run->result['sessionsRemoved'] === 0, 'Completion audit was not saved.');

$failing = new App\Services\RunDatabaseMaintenance(new class extends DatabaseMaintenance
{
    public function run(): array
    {
        throw new RuntimeException('Simulated cleanup failure');
    }
});
try {
    $failing->run($user->id);
    throw new LogicException('Failure was swallowed.');
} catch (RuntimeException $exception) {
    verify($exception->getMessage() === 'Simulated cleanup failure', 'Unexpected exception.');
}
verify(App\Models\DatabaseMaintenanceRun::latest('id')->first()->status === 'failed', 'Failure audit was not saved.');
verify($lock->get(), 'Failure did not release the maintenance lock.');
$lock->release();
$interrupted = App\Models\DatabaseMaintenanceRun::create(['user_id' => $user->id, 'status' => 'running', 'started_at' => now()->subMinutes(10)]);
DB::table('sessions')->insert(['id' => 'budget-test', 'payload' => 'expired', 'last_activity' => $now - 10000]);
config(['maintenance.time_budget_seconds' => 0]);
$run = $coordinator->run($user->id);
verify($run->status === 'partial' && $run->result['sessionsRemoved'] === 0, 'Time budget was not respected.');
verify($interrupted->fresh()->status === 'interrupted', 'Interrupted run was not recovered.');
config(['maintenance.time_budget_seconds' => 5]);
verify($coordinator->run($user->id)->status === 'completed', 'Cleanup could not continue after its time budget.');
echo "PASS: shared lock, durable completion/failure history, lock release on failure, interrupted-run recovery, and time-budget continuation.\n";
