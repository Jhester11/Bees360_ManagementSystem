<?php

use App\Enums\UserRole;
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
        ->where('phPerformance.0.batch', 2)
        ->where('phPerformance.0.generalExterior', 500)
        ->where('phPerformance.0.fourPoint', 40)
        ->where('phPerformance.0.credits', 550)
        ->where('phPerformance.0.incentive', 100)
        ->where('phPerformance.0.tiers.0.achieved', true)
        ->where('phPerformance.0.tiers.0.percentage', 100)
        ->where('phPerformance.0.tiers.1.needed', 100));
});

test('processor page includes every active approved processor even without performance data', function () {
    $viewer = User::factory()->create(['role' => UserRole::Operations]);
    User::factory()->create([
        'name' => 'Approved Processor',
        'n_name' => 'Approved',
        'role' => UserRole::Processor,
        'is_active' => true,
    ]);
    User::factory()->create([
        'name' => 'Inactive Processor',
        'role' => UserRole::Processor,
        'is_active' => false,
    ]);
    User::factory()->create([
        'name' => 'QA Reviewer',
        'role' => UserRole::Qa,
        'is_active' => true,
    ]);

    $this->actingAs($viewer)->get('/operations/processors')->assertInertia(fn (Assert $page) => $page
        ->has('approvedProcessors', 22)
        ->where('approvedProcessors.1.name', 'Approved Processor')
        ->where('approvedProcessors.1.nickname', 'Approved'));
});

test('processor page displays performance from the selected month', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-04 10:00:00', 'Asia/Manila'));
    $user = User::factory()->create(['role' => UserRole::Operations]);

    foreach ([['2026-08-20', 'AUGUST'], ['2026-09-03', 'SEPTEMBER']] as [$date, $projectId]) {
        ReportEntry::query()->create([
            'report_date' => $date,
            'source' => 'closed',
            'batch' => 2,
            'processor_name' => 'Allan Layug',
            'project_id' => $projectId,
            'insured_by' => 'Sample insured',
            'inspection_type' => 'Exterior Underwriting',
            'report_category' => 'general_exterior',
            'assembled_at' => $date.' 10:00:00',
        ]);
    }

    $this->actingAs($user)
        ->get('/operations/processors?start_date=2026-08-01&end_date=2026-08-31')
        ->assertInertia(fn (Assert $page) => $page
            ->where('periods.ph', 'August 2026')
            ->where('periods.cst', 'August 2026')
            ->where('filters.startDate', '2026-08-01')
            ->where('filters.endDate', '2026-08-31')
            ->has('phPerformance', 1)
            ->where('phPerformance.0.processor', 'Allan Layug')
            ->where('phPerformance.0.totalCases', 1));
});

test('processor page displays July QA scores under approved processor names', function () {
    $user = User::factory()->create(['role' => UserRole::Operations]);
    ReportEntry::query()->create([
        'report_date' => '2026-07-31',
        'source' => 'closed',
        'batch' => 1,
        'processor_name' => 'Lourdes M. Completado',
        'project_id' => 'JULY-REPORT',
        'insured_by' => 'Sample insured',
        'inspection_type' => 'Exterior Underwriting',
        'report_category' => 'general_exterior',
        'assembled_at' => '2026-07-31 10:00:00',
    ]);
    QaAssessment::query()->create([
        'record_key' => hash('sha256', 'JULY-QA|2026-07-31'),
        'assessment_date' => '2026-07-31',
        'processor_name' => 'Desh Completado',
        'project_id' => 'JULY-QA',
        'score' => 96,
        'source_file' => 'July QA.csv',
        'uploaded_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->get('/operations/processors?start_date=2026-07-01&end_date=2026-07-31')
        ->assertInertia(fn (Assert $page) => $page
            ->where('periods.ph', 'July 2026')
            ->where('phPerformance.0.processor', 'Lourdes M. Completado')
            ->where('phPerformance.0.qcScore', 96)
            ->where('phPerformance.0.qcReviews', 1)
            ->has('qaHistory', 1)
            ->where('qaHistory.0.processor', 'Lourdes M. Completado')
            ->where('qaHistory.0.date', '2026-07-31'));
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

test('CST import combines approved aliases and calculates tiers for the selected month', function () {
    $user = User::factory()->create(['role' => UserRole::Operations]);

    CstProcessorMetric::query()->create([
        'report_date' => '2026-08-15',
        'processor_name' => 'Desh Completado',
        'general_exterior' => 999,
        'four_point' => 0,
        'qc_reviews' => 0,
        'source_file' => 'Older CST import.xlsx',
        'uploaded_by' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->from('/operations/processors?start_date=2026-08-01&end_date=2026-08-31')
        ->post('/operations/processors/cst-import', [
            'source_file' => 'CST Active August.xlsx + CST Closed August.xlsx',
            'metrics' => [
                ['report_date' => '2026-08-15', 'processor_name' => 'Desh Completado', 'general_exterior' => 300, 'four_point' => 0, 'qc_score' => null, 'qc_reviews' => 0],
                ['report_date' => '2026-08-15', 'processor_name' => 'Lourdes M. Completado', 'general_exterior' => 250, 'four_point' => 0, 'qc_score' => null, 'qc_reviews' => 0],
                ['report_date' => '2026-08-15', 'processor_name' => 'Not Approved', 'general_exterior' => 900, 'four_point' => 0, 'qc_score' => null, 'qc_reviews' => 0],
            ],
        ]);

    $response->assertRedirect('/operations/processors?start_date=2026-08-01&end_date=2026-08-31');
    $response->assertSessionHas('cstImportSummary', [
        'saved' => 1,
        'file' => 'CST Active August.xlsx + CST Closed August.xlsx',
    ]);
    $this->assertDatabaseCount('cst_processor_metrics', 1);
    $this->assertDatabaseHas('cst_processor_metrics', [
        'report_date' => '2026-08-15',
        'processor_name' => 'Lourdes M. Completado',
        'general_exterior' => 550,
    ]);

    $this->get('/operations/processors?start_date=2026-08-01&end_date=2026-08-31')
        ->assertInertia(fn (Assert $page) => $page
            ->where('periods.cst', 'August 2026')
            ->where('cstPerformance.0.batch', 1)
            ->where('cstPerformance.0.credits', 550)
            ->where('cstPerformance.0.incentive', 100)
            ->where('cstPerformance.0.tiers.0.achieved', true));
});

test('processor reports group stored aliases under one canonical processor name', function () {
    $user = User::factory()->create(['role' => UserRole::Operations]);

    foreach (['Desh Completado', 'Lourdes M. Completado'] as $processorName) {
        ReportEntry::query()->create([
            'report_date' => '2026-08-15',
            'source' => 'closed',
            'batch' => 1,
            'processor_name' => $processorName,
            'project_id' => 'SAME-REPORT',
            'insured_by' => 'Sample insured',
            'inspection_type' => 'Exterior Underwriting',
            'report_category' => 'general_exterior',
            'assembled_at' => '2026-08-15 10:00:00',
        ]);
    }

    CstProcessorMetric::query()->create([
        'report_date' => '2026-08-15',
        'processor_name' => 'Desh Completado',
        'general_exterior' => 900,
        'four_point' => 0,
        'qc_reviews' => 0,
        'source_file' => 'Legacy alias.xlsx',
        'uploaded_by' => $user->id,
    ]);
    CstProcessorMetric::query()->create([
        'report_date' => '2026-08-15',
        'processor_name' => 'Lourdes M. Completado',
        'general_exterior' => 20,
        'four_point' => 4,
        'qc_reviews' => 0,
        'source_file' => 'Canonical import.xlsx',
        'uploaded_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->get('/operations/processors?start_date=2026-08-01&end_date=2026-08-31')
        ->assertInertia(fn (Assert $page) => $page
            ->has('phPerformance', 1)
            ->where('phPerformance.0.processor', 'Lourdes M. Completado')
            ->where('phPerformance.0.totalCases', 1)
            ->has('cstPerformance', 1)
            ->where('cstPerformance.0.processor', 'Lourdes M. Completado')
            ->where('cstPerformance.0.generalExterior', 20)
            ->where('cstPerformance.0.fourPoint', 4));
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
    expect($processor->notifications()->count())->toBe(2);
    expect($processor->unreadNotifications()->count())->toBe(2);
    expect($processor->notifications->pluck('data.project_id')->all())->toContain('677616', '677617');
    expect($processor->notifications->first(fn ($notification): bool => $notification->data['project_id'] === '677617')->data)->toMatchArray([
        'project_id' => '677617',
        'score' => 86.0,
        'title' => 'New QA result available',
    ]);
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
        ->where('qaHistory.0.processor', 'Christer John C. Gozon')
        ->where('qaHistory.0.nickname', 'Chris')
        ->where('qaHistory.0.projectId', '677617')
        ->where('qaHistory.0.score', 86)
        ->has('qaHistory.0.feedback', 2));
});
