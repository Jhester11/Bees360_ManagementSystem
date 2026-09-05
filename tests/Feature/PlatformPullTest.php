<?php

use App\Enums\UserRole;
use App\Models\ReportEntry;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('platform pulls display saved report entries for the selected date', function () {
    $user = User::factory()->create(['role' => UserRole::Reviewer]);
    ReportEntry::query()->create([
        'report_date' => '2026-09-02',
        'source' => 'active',
        'batch' => 2,
        'processor_name' => 'Allan Layug',
        'project_id' => 'A-100',
        'inspection_type' => 'Exterior Underwriting',
        'report_category' => 'general_exterior',
        'assembled_at' => '2026-09-02 09:30:00',
    ]);
    ReportEntry::query()->create([
        'report_date' => '2026-09-02',
        'source' => 'closed',
        'batch' => 1,
        'processor_name' => 'Lourdes M. Completado',
        'project_id' => 'C-100',
        'inspection_type' => '4-Point Inspection',
        'report_category' => 'four_point',
        'assembled_at' => '2026-09-02 11:45:00',
    ]);
    ReportEntry::query()->create([
        'report_date' => '2026-09-01',
        'source' => 'active',
        'batch' => 3,
        'processor_name' => 'Chrismer Flores',
        'project_id' => 'A-OLD',
        'inspection_type' => 'Exterior Underwriting',
        'report_category' => 'general_exterior',
        'assembled_at' => '2026-09-01 08:00:00',
    ]);

    $this->actingAs($user)
        ->get('/operations/reports/platform-pulls?date=2026-09-02')
        ->assertInertia(fn (Assert $page) => $page
            ->component('operations/platform-pulls')
            ->where('initialReportDate', '2026-09-02')
            ->has('reportEntries', 2)
            ->where('reportEntries.0.processorName', 'Allan Layug')
            ->where('reportEntries.0.assembledTime', '09:30')
            ->where('reportEntries.1.processorName', 'Lourdes M. Completado')
            ->where('reportEntries.1.assembledTime', '11:45'));
});

test('platform pulls default to the latest stored report date', function () {
    $user = User::factory()->create(['role' => UserRole::Reviewer]);
    ReportEntry::query()->create([
        'report_date' => '2026-08-31',
        'source' => 'active',
        'batch' => 2,
        'processor_name' => 'Allan Layug',
        'project_id' => 'A-200',
        'inspection_type' => 'Exterior Underwriting',
        'report_category' => 'general_exterior',
        'assembled_at' => '2026-08-31 10:00:00',
    ]);

    $this->actingAs($user)
        ->get('/operations/reports/platform-pulls')
        ->assertInertia(fn (Assert $page) => $page
            ->where('initialReportDate', '2026-08-31')
            ->has('reportEntries', 1));
});

test('guests cannot view platform pulls', function () {
    $this->get('/operations/reports/platform-pulls')->assertRedirect('/login');
});
