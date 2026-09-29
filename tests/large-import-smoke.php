<?php

// Standalone regression check for installations without the Pest dev dependencies.
// All database work uses a disposable in-memory connection, never the configured database.
use App\Models\QaAssessment;
use App\Models\ReportEntry;
use App\Models\User;
use App\Services\QaProcessorAttribution;
use App\Services\ReportImportService;
use App\Support\UniqueRecords;
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
function check(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}
$rows = collect(range(1, 30000))->map(fn (int $id): array => ['key' => 'project-'.($id % 20000), 'value' => $id]);
$start = microtime(true);
$expected = $rows->unique('key')->values()->all();
$oldMs = (microtime(true) - $start) * 1000;
$start = microtime(true);
$actual = $rows->filter(UniqueRecords::byKey(fn (array $row): string => $row['key']))->values()->all();
$newMs = (microtime(true) - $start) * 1000;
check($actual === $expected, 'Duplicate selection or row order changed.');
printf("30,000-row duplicate check: previous %.1f ms, new %.1f ms; identical results.\n", $oldMs, $newMs);

$user = User::create(['name' => 'Volume Test Processor', 'n_name' => 'Volume', 'email' => 'volume@example.test', 'password' => 'test-only-password', 'batch' => 1]);
$entries = [];
for ($id = 1; $id <= 12000; $id++) {
    $entries[] = ['source' => 'closed', 'project_id' => (string) $id, 'assembled_by' => $user->name, 'inspection_type' => 'Exterior Underwriting', 'assembled_at' => '2026-09-01 00:00:00'];
}
$entries[] = $entries[0];
$service = $app->make(ReportImportService::class);
$start = microtime(true);
$summary = $service->import($entries);
check($summary === ['saved' => 12000, 'ignored' => 0], 'Large import summary incorrect.');
check(ReportEntry::count() === 12000, 'Large import lost or duplicated records.');
$service->import($entries);
check(ReportEntry::count() === 12000, 'Re-upload created duplicates.');
printf("Imported and re-uploaded 12,001 rows in %.2f s; 12,000 unique records retained.\n", microtime(true) - $start);
$assessments = collect(range(1, 1200))->map(fn (int $id): QaAssessment => new QaAssessment([
    'processor_name' => 'Unknown imported name', 'project_id' => (string) $id, 'assessment_date' => '2026-09-02', 'score' => 66,
]));
$result = $app->make(QaProcessorAttribution::class)->resolve($assessments);
check($result['recovered'] === 1200 && $result['unresolved']->isEmpty(), 'Batched attribution lost records.');
check($result['assessments']->every(fn (QaAssessment $row): bool => $row->processor_id === $user->id && (float) $row->score === 66.0), 'Processor or score changed.');
echo "QA ownership and red scores preserved across three lookup batches.\n";
$start = microtime(true);
$controller = $app->make(App\Http\Controllers\Operations\DashboardController::class);
$reportData = (new ReflectionMethod($controller, 'reportData'))->invoke($controller);
check($reportData['overview']['totalReports'] === 12000, 'Dashboard total changed.');
check($reportData['reportRecords']->sum('reports') === 12000, 'Daily report totals changed.');
printf("Dashboard totals verified for 12,000 records in %.2f s.\n", microtime(true) - $start);
