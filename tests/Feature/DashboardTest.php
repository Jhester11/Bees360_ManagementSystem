<?php

use App\Models\ReportEntry;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/dashboard')->assertOk();
});

test('dashboard displays deduplicated imported report data', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-01 10:00:00', 'Asia/Manila'));
    $this->actingAs(User::factory()->create());

    foreach ([
        ['source' => 'active', 'project_id' => '10001', 'processor_name' => 'Allan Layug', 'report_category' => 'general_exterior', 'inspection_type' => 'Exterior Underwriting'],
        ['source' => 'closed', 'project_id' => '10001', 'processor_name' => 'Allan Layug', 'report_category' => 'general_exterior', 'inspection_type' => 'Exterior Underwriting'],
        ['source' => 'closed', 'project_id' => '10002', 'processor_name' => 'Chrismer Flores', 'report_category' => 'four_point', 'inspection_type' => '4-Point Inspection'],
    ] as $entry) {
        ReportEntry::query()->create([
            ...$entry,
            'report_date' => '2026-08-31',
            'batch' => $entry['processor_name'] === 'Allan Layug' ? 2 : 3,
            'insured_by' => 'Sample insured',
            'assembled_at' => '2026-08-31 10:00:00',
        ]);
    }

    $this->get('/dashboard')->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('overview.totalReports', 2)
        ->where('overview.weeklyReports', 2)
        ->where('overview.activeProcessors', 2)
        ->where('overview.generalExterior', 1)
        ->where('overview.fourPoint', 1)
        ->where('overview.closedSource', 2)
        ->where('overview.weekStart', '2026-08-31')
        ->where('overview.weekEnd', '2026-09-06')
        ->has('overview.topProcessors', 0)
        ->where('overview.topProcessor', null)
        ->where('reportRange.first', '2026-08-31')
        ->where('reportRange.latest', '2026-08-31')
        ->has('reportRecords', 2)
        ->where('processorNames', ['Allan Layug', 'Chrismer Flores']));
});

test('leaderboard combines a processors over-delivered days into one overall result', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-03 10:00:00', 'Asia/Manila'));
    $this->actingAs(User::factory()->create());

    $createReports = function (string $processor, int $batch, string $date, int $count, string $prefix): void {
        foreach (range(1, $count) as $index) {
            ReportEntry::query()->create([
                'report_date' => $date,
                'source' => 'closed',
                'batch' => $batch,
                'processor_name' => $processor,
                'project_id' => $prefix.'-'.$index,
                'insured_by' => 'Sample insured',
                'inspection_type' => 'Exterior Underwriting',
                'report_category' => 'general_exterior',
                'assembled_at' => $date.' 10:00:00',
            ]);
        }
    };

    $createReports('Allan Layug', 2, '2026-09-01', 20, 'allan-one');
    $createReports('Allan Layug', 2, '2026-09-02', 20, 'allan-two');
    $createReports('Lourdes M. Completado', 1, '2026-09-02', 31, 'lourdes');
    $createReports('Chrismer Flores', 3, '2026-09-02', 32, 'chrismer');
    $createReports('Chrismer Flores', 3, '2026-09-03', 33, 'chrismer-next');

    $this->get('/dashboard')->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->has('overview.topProcessors', 1)
        ->where('overview.topProcessors.0.name', 'Chrismer Flores')
        ->where('overview.topProcessors.0.latestDate', '2026-09-03')
        ->where('overview.topProcessors.0.overDeliveredDays', 2)
        ->where('overview.topProcessors.0.reports', 65)
        ->where('overview.topProcessor.name', 'Chrismer Flores'));
});

test('authenticated users can open an operations module', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/operations/reports')->assertOk();
});

test('authenticated users can monitor the operations queue', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/operations/queue-monitor')->assertInertia(fn (Assert $page) => $page
        ->component('operations/queue-monitor'));
});

test('authenticated users can compare two report periods', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/operations/report-comparison')->assertOk();
});

test('operations routes return 404 for an unknown module', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/operations/unknown')->assertNotFound();
});
