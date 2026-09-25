<?php

use App\Enums\UserRole;
use App\Models\QaAssessment;
use App\Models\ReportEntry;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('QA recovers multiple processors and reports conflicts without rewriting imported evidence', function () {
    $viewer = User::factory()->create(['role' => UserRole::Qa]);
    foreach (['Processor One', 'Processor Two'] as $index => $name) {
        User::factory()->create(['name' => $name, 'role' => UserRole::Processor, 'batch' => 1, 'is_active' => true]);
        ReportEntry::query()->create([
            'report_date' => '2026-09-21', 'source' => 'closed', 'batch' => 1,
            'processor_name' => $name, 'project_id' => 'RECOVER-'.$index,
            'insured_by' => 'Sample', 'inspection_type' => 'Exterior Underwriting', 'report_category' => 'general_exterior',
        ]);
        QaAssessment::query()->create([
            'record_key' => hash('sha256', 'recover-'.$index), 'assessment_date' => '2026-09-22',
            'processor_name' => 'External Reviewer', 'project_id' => 'RECOVER-'.$index,
            'score' => 66 + $index, 'feedback' => ['Missing photo'], 'source_file' => 'QA.csv', 'uploaded_by' => $viewer->id,
        ]);
    }
    QaAssessment::query()->create([
        'record_key' => hash('sha256', 'conflict'), 'assessment_date' => '2026-09-23',
        'processor_name' => 'Processor Two', 'project_id' => 'RECOVER-0',
        'score' => 50, 'feedback' => ['Wrong address'], 'source_file' => 'QA.csv', 'uploaded_by' => $viewer->id,
    ]);

    $this->actingAs($viewer)->get('/operations/quality-assurance?start_date=2026-09-01&end_date=2026-09-24')
        ->assertInertia(fn (Assert $page) => $page
            ->has('rows', 2)
            ->where('rows.0.processor', 'Processor Two')
            ->where('rows.0.score', 67)
            ->where('rows.1.processor', 'Processor One')
            ->where('rows.1.score', 66)
            ->where('attributionAudit.total', 3)
            ->where('attributionAudit.matched', 2)
            ->where('attributionAudit.recovered', 2)
            ->where('attributionAudit.unresolved.0.projectId', 'RECOVER-0')
            ->where('attributionAudit.unresolved.0.reason', 'The imported processor conflicts with the project production records.'));

    $this->assertDatabaseHas('qa_assessments', ['project_id' => 'RECOVER-1', 'processor_name' => 'External Reviewer', 'score' => 67]);
});
