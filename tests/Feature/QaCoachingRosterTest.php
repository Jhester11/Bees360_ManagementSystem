<?php

use App\Enums\UserRole;
use App\Models\QaAssessment;
use App\Models\ReportEntry;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('QA coaching excludes reviewers and combines processor aliases including red scores', function () {
    $viewer = User::factory()->create(['role' => UserRole::Qa]);
    User::factory()->create(['name' => 'Christer John C. Gozon', 'n_name' => 'Chris', 'role' => UserRole::Processor, 'batch' => 1, 'is_active' => true]);
    $reviewer = User::factory()->create(['name' => 'QA Reviewer', 'role' => UserRole::Reviewer, 'tracks_production' => false]);
    foreach ([['Chris', 89, null], ['Christer John C. Gozon', 100, null], ['QA Reviewer', 70, $reviewer->id], ['External Reviewer', 60, null]] as $index => [$name, $score, $processorId]) {
        QaAssessment::query()->create([
            'record_key' => hash('sha256', 'roster-'.$index),
            'assessment_date' => '2026-09-24',
            'processor_id' => $processorId,
            'processor_name' => $name,
            'project_id' => 'ROSTER-'.$index,
            'qc_name' => 'QA Reviewer',
            'score' => $score,
            'feedback' => ['Missing photo'],
            'source_file' => 'QA.xlsx',
            'uploaded_by' => $viewer->id,
        ]);
    }

    $this->actingAs($viewer)->get('/operations/quality-assurance?start_date=2026-09-01&end_date=2026-09-24&processor=Christer%20John%20C.%20Gozon')
        ->assertInertia(fn (Assert $page) => $page
            ->has('rows', 2)
            ->where('rows.0.processor', 'Christer John C. Gozon')
            ->where('rows.1.processor', 'Christer John C. Gozon')
            ->where('rows.1.score', 89)
            ->missing('rows.0.qcName')
            ->where('processorNames', ['Christer John C. Gozon'])
            ->where('summary.processors', 1));
});

test('QA attributes an unmatched imported name to the unique project processor and includes the red score', function () {
    $viewer = User::factory()->create(['role' => UserRole::Qa]);
    User::factory()->create(['name' => 'Christer John C. Gozon', 'n_name' => 'Chris', 'role' => UserRole::Processor, 'batch' => 1, 'is_active' => true]);
    foreach (['active', 'closed'] as $source) {
        ReportEntry::query()->create([
            'report_date' => '2026-09-21', 'source' => $source, 'batch' => 1,
            'processor_name' => 'Christer John C. Gozon', 'project_id' => '690940',
            'insured_by' => 'Sample', 'inspection_type' => 'Exterior Underwriting', 'report_category' => 'general_exterior',
        ]);
    }
    QaAssessment::query()->create([
        'record_key' => hash('sha256', 'project-690940'), 'assessment_date' => '2026-09-22',
        'processor_name' => 'Parker Willis', 'project_id' => '690940', 'qc_name' => 'QA Reviewer',
        'score' => 66, 'feedback' => ['Missing photo'], 'source_file' => 'QA.csv', 'uploaded_by' => $viewer->id,
    ]);

    $this->actingAs($viewer)->get('/operations/quality-assurance?start_date=2026-09-01&end_date=2026-09-24&processor=Chris')
        ->assertInertia(fn (Assert $page) => $page
            ->has('rows', 1)
            ->where('rows.0.processor', 'Christer John C. Gozon')
            ->where('rows.0.score', 66)
            ->where('rows.0.projectId', '690940')
            ->where('rows.0.feedback', ['Missing photo'])
            ->missing('rows.0.qcName'));
});

test('QA does not guess a processor from ambiguous or future production records', function (array $production) {
    $viewer = User::factory()->create(['role' => UserRole::Qa]);
    foreach (['Processor One', 'Processor Two'] as $name) {
        User::factory()->create(['name' => $name, 'role' => UserRole::Processor, 'batch' => 1, 'is_active' => true]);
    }
    foreach ($production as [$name, $date]) {
        ReportEntry::query()->create([
            'report_date' => $date, 'source' => 'closed', 'batch' => 1,
            'processor_name' => $name, 'project_id' => 'AMBIGUOUS',
            'insured_by' => 'Sample', 'inspection_type' => 'Exterior Underwriting', 'report_category' => 'general_exterior',
        ]);
    }
    QaAssessment::query()->create([
        'record_key' => hash('sha256', 'ambiguous'), 'assessment_date' => '2026-09-22',
        'processor_name' => 'External Reviewer', 'project_id' => 'AMBIGUOUS',
        'score' => 66, 'feedback' => ['Missing photo'], 'source_file' => 'QA.csv', 'uploaded_by' => $viewer->id,
    ]);
    $this->actingAs($viewer)->get('/operations/quality-assurance?start_date=2026-09-01&end_date=2026-09-24')
        ->assertInertia(fn (Assert $page) => $page->has('rows', 0)->has('attributionAudit.unresolved', 1));
})->with([
    'multiple processors' => [[[ 'Processor One', '2026-09-21'], ['Processor Two', '2026-09-21']]],
    'future production' => [[[ 'Processor One', '2026-09-23']]],
]);
