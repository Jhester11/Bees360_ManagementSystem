<?php

use App\Enums\UserRole;
use App\Models\ReportEntry;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('operations users can import approved processor reports from either workbook', function () {
    $user = User::factory()->create(['role' => UserRole::Operations]);
    User::factory()->create(['name' => 'Allan Layug', 'n_name' => 'Allan', 'role' => UserRole::Processor, 'batch' => 2]);
    User::factory()->create(['name' => 'Christer John C. Gozon', 'n_name' => 'Chris', 'role' => UserRole::Processor, 'batch' => 1]);
    User::factory()->create(['name' => 'Lourdes M. Completado', 'n_name' => 'Desh', 'role' => UserRole::Processor, 'batch' => 1]);
    User::factory()->create(['name' => 'Jhun Cervantes', 'n_name' => 'Jhun', 'role' => UserRole::Processor, 'batch' => 1]);

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
        ->has('processorRoster', 4)
        ->where('historyVisible', false)
        ->has('historyEntries', 0)
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

test('report imports do not show success when no active processor rows match', function () {
    $user = User::factory()->create(['role' => UserRole::Operations]);

    $this->actingAs($user)->post('/operations/reports/import', [
        'entries' => json_encode([[
            'source' => 'active',
            'project_id' => 'UNKNOWN-1',
            'insured_by' => '',
            'inspection_type' => 'Exterior Underwriting',
            'assembled_by' => 'Unknown Processor',
            'assembled_at' => '09/09/2026 10:00',
        ]]),
    ])->assertSessionHasErrors('entries');

    $this->assertDatabaseCount('report_entries', 0);
});

test('large report imports are saved without exceeding database placeholder limits', function () {
    $user = User::factory()->create(['role' => UserRole::Operations]);
    User::factory()->create(['name' => 'Allan Layug', 'n_name' => 'Allan', 'role' => UserRole::Processor, 'batch' => 2]);
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

test('reports use active processor accounts while retaining reviewer history', function () {
    $user = User::factory()->create(['role' => UserRole::Operations]);
    User::factory()->create(['name' => 'Emma Alegre', 'n_name' => 'Emma', 'role' => UserRole::Reviewer, 'batch' => null]);
    User::factory()->create(['name' => 'New Processor Name', 'n_name' => 'Newbie', 'role' => UserRole::Processor, 'batch' => 3]);
    ReportEntry::query()->create([
        'report_date' => '2026-09-09',
        'source' => 'active',
        'batch' => 2,
        'processor_name' => 'Emma Alegre',
        'project_id' => 'OLD-1',
        'insured_by' => null,
        'inspection_type' => 'Exterior Underwriting',
        'report_category' => 'general_exterior',
        'assembled_at' => '2026-09-09 09:00:00',
    ]);

    $this->actingAs($user)->post('/operations/reports/import', [
        'entries' => json_encode([
            ['source' => 'active', 'project_id' => 'NEW-1', 'insured_by' => '', 'inspection_type' => 'Exterior Underwriting', 'assembled_by' => 'Newbie', 'assembled_at' => '09/09/2026 10:00'],
        ]),
    ])->assertRedirect(route('operations.reports'));

    $this->assertDatabaseHas('report_entries', ['processor_name' => 'Emma Alegre']);
    $this->assertDatabaseHas('report_entries', ['processor_name' => 'New Processor Name', 'batch' => 3, 'project_id' => 'NEW-1']);

    $this->actingAs($user)->get(route('operations.reports'))->assertInertia(fn (Assert $page) => $page
        ->where('processorRoster.0.name', 'New Processor Name')
        ->where('reportEntries.0.processor_name', 'New Processor Name')
        ->missing('reportEntries.1'));
});

test('report history is returned only when it is requested', function () {
    $user = User::factory()->create(['role' => UserRole::Operations]);
    ReportEntry::query()->create([
        'report_date' => '2026-08-31',
        'source' => 'closed',
        'batch' => 2,
        'processor_name' => 'Emma Alegre',
        'project_id' => 'HISTORY-1',
        'insured_by' => null,
        'inspection_type' => '4-Point Inspection',
        'report_category' => 'four_point',
        'assembled_at' => '2026-08-31 16:00:00',
    ]);

    $this->actingAs($user)->get(route('operations.reports', ['history' => 1]))->assertInertia(fn (Assert $page) => $page
        ->component('operations/reports')
        ->where('historyVisible', true)
        ->has('historyEntries', 1)
        ->where('historyEntries.0.processor_name', 'Emma Alegre')
        ->where('historyEntries.0.project_id', 'HISTORY-1'));
});
