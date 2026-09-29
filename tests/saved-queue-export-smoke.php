<?php

// Isolated regression check; never writes to the configured application database.
use App\Enums\UserRole;
use App\Http\Controllers\Operations\QueueExportController;
use App\Http\Controllers\Operations\QueueSnapshotController;
use App\Models\QueueSnapshot;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:', 'cache.default' => 'array']);
DB::purge('sqlite');
if (Artisan::call('migrate', ['--database' => 'sqlite', '--force' => true]) !== 0) {
    throw new RuntimeException(Artisan::output());
}
function verifyQueue(bool $condition, string $message): void
{
    if (! $condition) throw new RuntimeException($message);
}
$operator = User::create(['name' => 'Queue Operations', 'email' => 'operations@example.test', 'password' => 'test-password', 'role' => UserRole::Operations]);
$processor = User::create(['name' => 'Queue Processor', 'email' => 'processor@example.test', 'password' => 'test-password', 'batch' => 1]);
foreach (['2026-09-01', '2026-09-02'] as $date) {
    $snapshot = QueueSnapshot::create(['report_date' => $date, 'checkpoint' => 'start', 'file_name' => 'saved.xlsx', 'total_rows' => 12, 'matched_rows' => 12, 'ignored_rows' => 0, 'uploaded_by' => $operator->id, 'checked_at' => $date.' 08:00:00']);
    $snapshot->processorEntries()->createMany([
        ['processor_name' => $processor->name, 'batch' => 1, 'general_exterior' => 3, 'four_point' => 2, 'premium_four_point' => 1, 'other' => 0, 'total' => 6],
        ['processor_name' => 'Former Processor', 'batch' => 2, 'general_exterior' => 6, 'four_point' => 0, 'premium_four_point' => 0, 'other' => 0, 'total' => 6],
    ]);
}
$controller = new QueueExportController;
$request = Request::create('/reports/saved-queue', 'GET', ['start' => '2026-09-01', 'end' => '2026-09-01']);
$request->setUserResolver(fn () => $operator);
$response = $controller($request);
$rows = $response->getData(true)['rows'];
verifyQueue(count($rows) === 2 && array_sum(array_column($rows, 'total')) === 12, 'Saved totals or date filtering incorrect.');
verifyQueue(in_array('Former Processor', array_column($rows, 'processor'), true), 'Historical processor data was lost.');
$request->query->set('processor', 'Former Processor');
$request->setUserResolver(fn () => $processor);
$rows = $controller($request)->getData(true)['rows'];
verifyQueue(count($rows) === 1 && $rows[0]['processor'] === $processor->name, 'Processor can export another processor queue.');
$request->setUserResolver(fn () => new User(['role' => UserRole::Trainee]));
try {
    $controller($request);
    throw new RuntimeException('Trainee unexpectedly allowed.');
} catch (Symfony\Component\HttpKernel\Exception\HttpException $exception) {
    verifyQueue($exception->getStatusCode() === 403, 'Wrong access response.');
}
$request = Request::create('/operations/queue-monitor', 'GET', ['date' => '2026-09-01']);
$page = $app->make(QueueSnapshotController::class)->index($request);
$props = (new ReflectionProperty($page, 'props'))->getValue($page);
verifyQueue($props['reportDate'] === '2026-09-01' && $props['savedSnapshots']->count() === 1, 'Previous date was not reloaded.');
verifyQueue($props['savedSnapshots']->first()['processorRows']->count() === 2, 'Historical display lost saved rows.');
echo "PASS: saved dates/totals, historical processors, processor isolation, denied trainee access, and database snapshot reload.\n";
