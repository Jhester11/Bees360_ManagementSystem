<?php

use App\Models\CstProcessorMetric;
use App\Models\QaAssessment;
use App\Models\ReportEntry;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

test('processor page calculates weighted credits tiers and incentives for the current PH month', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-04 10:00:00', 'Asia/Manila'));
    $this->actingAs(User::factory()->create());

    foreach (range(1, 500) as $index) {
        ReportEntry::query()->create([
            'report_date' => '2026-09-03',
            'source' => 'closed',
            'batch' => 2,
            'processor_name' => 'Allan Layug',
            'project_id' => 'GE-'.$index,
            'insured_by' => 'Sample insured',
            'inspection_type' => 'Exterior Underwriting',
            'report_category' => 'general_exterior',
            'assembled_at' => '2026-09-03 10:00:00',
        ]);
    }

    foreach (range(1, 40) as $index) {
        ReportEntry::query()->create([
            'report_date' => '2026-09-03',
            'source' => 'closed',
            'batch' => 2,
            'processor_name' => 'Allan Layug',
            'project_id' => 'FP-'.$index,
            'insured_by' => 'Sample insured',
            'inspection_type' => '4-Point Inspection',
            'report_category' => 'four_point',
            'assembled_at' => '2026-09-03 10:00:00',
        ]);
    }

    $this->get('/operations/processors')->assertInertia(fn (Assert $page) => $page
        ->component('operations/processors')
        ->where('periods.ph', 'September 2026')
        ->has('phPerformance', 1)
        ->where('phPerformance.0.totalCases', 540)
        ->where('phPerformance.0.generalExterior', 500)
        ->where('phPerformance.0.fourPoint', 40)
        ->where('phPerformance.0.credits', 550)
        ->where('phPerformance.0.incentive', 100)
        ->where('phPerformance.0.tiers.0.achieved', true)
        ->where('phPerformance.0.tiers.0.percentage', 100)
        ->where('phPerformance.0.tiers.1.needed', 100));
});

test('authenticated users can upload CST processor metrics and weighted QC scores are displayed', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-04 10:00:00', 'America/Chicago'));
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/operations/processors/cst-import', [
        'source_file' => 'CST September.xlsx',
        'metrics' => [
            ['report_date' => '2026-09-02', 'processor_name' => 'Allan Layug', 'general_exterior' => 100, 'four_point' => 20, 'qc_score' => 95, 'qc_reviews' => 2],
            ['report_date' => '2026-09-03', 'processor_name' => 'Allan Layug', 'general_exterior' => 50, 'four_point' => 10, 'qc_score' => 80, 'qc_reviews' => 1],
        ],
    ]);

    $response->assertRedirect(route('operations.processors'));
    $response->assertSessionHas('cstImportSummary', ['saved' => 2, 'file' => 'CST September.xlsx']);
    $this->assertDatabaseCount('cst_processor_metrics', 2);
    $this->get('/operations/processors')->assertInertia(fn (Assert $page) => $page
        ->where('cstPerformance.0.totalCases', 180)
        ->where('cstPerformance.0.credits', 187.5)
        ->where('cstPerformance.0.qcScore', 90)
        ->where('cstPerformance.0.qcReviews', 3));
});

test('CST imports require valid bounded metrics', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/operations/processors/cst-import', [
        'source_file' => 'invalid.xlsx',
        'metrics' => [['report_date' => 'invalid', 'processor_name' => '', 'general_exterior' => -1, 'four_point' => 0, 'qc_score' => 101, 'qc_reviews' => 0]],
    ])->assertSessionHasErrors(['metrics.0.report_date', 'metrics.0.processor_name', 'metrics.0.general_exterior', 'metrics.0.qc_score']);

    expect(CstProcessorMetric::query()->count())->toBe(0);
});

test('guests cannot open or import processor performance data', function () {
    $this->get('/operations/processors')->assertRedirect('/login');
    $this->post('/operations/processors/cst-import')->assertRedirect('/login');
    $this->post('/operations/processors/qa-import')->assertRedirect('/login');
});

test('live QA accuracy uses the average Total Score from the latest uploaded QA month', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-04 10:00:00', 'Asia/Manila'));
    $user = User::factory()->create();

    ReportEntry::query()->create([
        'report_date' => '2026-09-03', 'source' => 'closed', 'batch' => 2, 'processor_name' => 'Allan Layug',
        'project_id' => 'LIVE-REPORT', 'insured_by' => 'Sample insured', 'inspection_type' => 'Exterior Underwriting',
        'report_category' => 'general_exterior', 'assembled_at' => '2026-09-03 10:00:00',
    ]);

    foreach ([['AUG-1', 90], ['AUG-2', 100]] as [$projectId, $score]) {
        QaAssessment::query()->create([
            'record_key' => hash('sha256', $projectId.'|2026-08-31'),
            'assessment_date' => '2026-08-31', 'processor_name' => 'Allan Layug', 'project_id' => $projectId,
            'score' => $score, 'source_file' => 'August QA.csv', 'uploaded_by' => $user->id,
        ]);
    }

    $this->actingAs($user)->get('/operations/processors')->assertInertia(fn (Assert $page) => $page
        ->where('periods.qa', 'August 2026')
        ->where('phPerformance.0.qcScore', 95)
        ->where('phPerformance.0.qcReviews', 2));
});

test('QA score imports calculate an average and update repeated report uploads without duplicates', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-04 10:00:00', 'Asia/Manila'));
    $uploader = User::factory()->create();
    $processor = User::factory()->create(['name' => 'Christer John Gozon', 'n_name' => 'Chris']);

    $upload = function (string $name, string $projectId, int $score) use ($uploader): array {
        $this->actingAs($uploader)->post('/operations/processors/qa-import', [
            'source_file' => 'QA September.xlsx',
            'assessments' => [[
                'assessment_date' => '2026-09-03',
                'processor_name' => $name,
                'score' => $score,
                'project_id' => $projectId,
                'qc_name' => 'Hongke Su',
                'report_url' => 'https://example.test/report/'.$projectId,
                'feedback' => ['(-2) Elevation: Sample error', '(-2) Elevation: Sample error'],
            ]],
        ])->assertRedirect(route('operations.processors'));

        return session('qaImportSummary');
    };

    expect($upload('Chris', '677616', 96))->toMatchArray(['created' => 1, 'updated' => 0, 'matched' => 1]);
    expect($upload('Christer John C. Gozon', '677616', 94))->toMatchArray(['created' => 0, 'updated' => 1, 'matched' => 1]);
    expect($upload('Chris', '677617', 86))->toMatchArray(['created' => 1, 'updated' => 0, 'matched' => 1]);

    expect(QaAssessment::query()->count())->toBe(2);
    expect(QaAssessment::query()->pluck('processor_id')->unique()->all())->toBe([$processor->id]);
    expect(QaAssessment::query()->first()->feedback)->toBe(['(-2) Elevation: Sample error', '(-2) Elevation: Sample error']);

    ReportEntry::query()->create([
        'report_date' => '2026-09-03',
        'source' => 'closed',
        'batch' => 1,
        'processor_name' => 'Christer John C. Gozon',
        'project_id' => 'QA-LINK',
        'insured_by' => 'Sample insured',
        'inspection_type' => 'Exterior Underwriting',
        'report_category' => 'general_exterior',
        'assembled_at' => '2026-09-03 10:00:00',
    ]);

    $this->get('/operations/processors')->assertInertia(fn (Assert $page) => $page
        ->where('phPerformance.0.qcScore', 90)
        ->where('phPerformance.0.qcReviews', 2)
        ->has('qaHistory', 2)
        ->where('qaHistory.0.processor', 'Christer John Gozon')
        ->where('qaHistory.0.nickname', 'Chris')
        ->where('qaHistory.0.projectId', '677617')
        ->where('qaHistory.0.score', 86)
        ->has('qaHistory.0.feedback', 2));
});
