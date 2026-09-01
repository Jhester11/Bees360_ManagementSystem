<?php

use App\Models\ReportEntry;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('authenticated users can import approved processor reports from either workbook', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/operations/reports/import', [
        'entries' => json_encode([
            ['source' => 'active', 'project_id' => '10001', 'insured_by' => 'Sample insured', 'inspection_type' => 'Exterior Underwriting', 'assembled_by' => 'Allan Layug', 'assembled_at' => '08/31/2026 09:30'],
            ['source' => 'active', 'project_id' => '10001', 'insured_by' => 'Sample insured', 'inspection_type' => 'Exterior Underwriting', 'assembled_by' => '', 'assembled_at' => '08/31/2026 09:30'],
            ['source' => 'closed', 'project_id' => '10002', 'insured_by' => 'Sample insured', 'inspection_type' => '4-Point Inspection', 'assembled_by' => 'Chris Gozon', 'assembled_at' => '08/31/2026 10:00'],
            ['source' => 'active', 'project_id' => '10004', 'insured_by' => 'Sample insured', 'inspection_type' => 'Exterior Underwriting', 'assembled_by' => 'Desh Completado', 'assembled_at' => '08/31/2026 10:15'],
            ['source' => 'closed', 'project_id' => '10005', 'insured_by' => 'Sample insured', 'inspection_type' => '4-Point Inspection', 'assembled_by' => 'Jhun Cervantes', 'assembled_at' => '08/31/2026 10:30'],
            ['source' => 'active', 'project_id' => '10003', 'insured_by' => 'Ignored insured', 'inspection_type' => 'Interior Inspection', 'assembled_by' => 'A processor outside the approved list', 'assembled_at' => '08/31/2026 11:00'],
        ]),
    ]);

    $response->assertRedirect(route('operations.reports'));
    $response->assertSessionHas('importSummary', ['saved' => 4, 'ignored' => 1]);
    $this->get(route('operations.reports'))->assertInertia(fn (Assert $page) => $page
        ->component('operations/reports')
        ->where('flash.importSummary', ['saved' => 4, 'ignored' => 1]));
    $this->assertDatabaseHas('report_entries', ['source' => 'active', 'batch' => 2, 'processor_name' => 'Allan Layug', 'project_id' => '10001', 'report_category' => 'general_exterior']);
    $this->assertDatabaseHas('report_entries', ['source' => 'closed', 'batch' => 1, 'processor_name' => 'Christer John C. Gozon', 'project_id' => '10002', 'report_category' => 'four_point']);
    $this->assertDatabaseHas('report_entries', ['source' => 'active', 'batch' => 1, 'processor_name' => 'Lourdes M. Completado', 'project_id' => '10004', 'report_category' => 'general_exterior']);
    $this->assertDatabaseHas('report_entries', ['source' => 'closed', 'batch' => 1, 'processor_name' => 'Jhun Cervantes', 'project_id' => '10005', 'report_category' => 'four_point']);
    $this->assertDatabaseMissing('report_entries', ['project_id' => '10003']);
});

test('guests cannot import reports', function () {
    $this->post('/operations/reports/import', ['entries' => []])->assertRedirect('/login');
});

test('large report imports are saved without exceeding database placeholder limits', function () {
    $user = User::factory()->create();
    $entries = collect(range(1, 6000))->map(fn (int $number) => [
        'source' => 'active',
        'project_id' => (string) (700000 + $number),
        'insured_by' => 'Sample insured',
        'inspection_type' => 'Exterior Underwriting',
        'assembled_by' => 'Allan Layug',
        'assembled_at' => '08/31/2026 09:30',
    ])->all();

    $response = $this->actingAs($user)->post('/operations/reports/import', [
        'entries' => json_encode($entries),
    ]);

    $response->assertRedirect(route('operations.reports'));
    $response->assertSessionHas('importSummary', ['saved' => 6000, 'ignored' => 0]);
    expect(ReportEntry::query()->count())->toBe(6000);
});
