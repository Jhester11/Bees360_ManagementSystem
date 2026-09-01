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
        ->has('overview.topProcessors', 2)
        ->where('overview.topProcessors.0.name', 'Allan Layug')
        ->where('overview.topProcessors.0.reports', 1)
        ->where('reportRange.first', '2026-08-31')
        ->where('reportRange.latest', '2026-08-31')
        ->has('reportRecords', 2)
        ->where('processorNames', ['Allan Layug', 'Chrismer Flores']));
});

test('authenticated users can open an operations module', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/operations/reports')->assertOk();
});

test('authenticated users can compare two report periods', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/operations/report-comparison')->assertOk();
});

test('operations routes return 404 for an unknown module', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/operations/unknown')->assertNotFound();
});
