<?php

use App\Enums\UserRole;
use App\Models\CstProcessorMetric;
use App\Models\QaAssessment;
use App\Models\ReportEntry;
use App\Models\User;
use App\Notifications\NewQaAssessment;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/dashboard')->assertOk();
});

test('processor dashboard displays only the signed in processors monthly PH CST and QA metrics', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-04 10:00:00', 'Asia/Manila'));
    $processor = User::factory()->create([
        'name' => 'Lourdes M. Completado',
        'n_name' => 'Desh',
        'role' => UserRole::Processor,
    ]);
    $otherProcessor = User::factory()->create([
        'name' => 'Allan Layug',
        'role' => UserRole::Processor,
    ]);

    foreach ([
        ['processor_name' => 'Lourdes M. Completado', 'project_id' => 'GE-1', 'report_category' => 'general_exterior', 'inspection_type' => 'Exterior Underwriting'],
        ['processor_name' => 'Desh Completado', 'project_id' => 'GE-2', 'report_category' => 'general_exterior', 'inspection_type' => 'Exterior Underwriting'],
        ['processor_name' => 'Lourdes M. Completado', 'project_id' => 'FP-1', 'report_category' => 'four_point', 'inspection_type' => '4-Point Inspection'],
        ['processor_name' => 'Allan Layug', 'project_id' => 'OTHER-1', 'report_category' => 'general_exterior', 'inspection_type' => 'Exterior Underwriting'],
    ] as $entry) {
        ReportEntry::query()->create([
            ...$entry,
            'report_date' => '2026-08-15',
            'source' => 'closed',
            'batch' => 1,
            'insured_by' => 'Sample insured',
            'assembled_at' => '2026-08-15 10:00:00',
        ]);
    }

    foreach ([
        [$processor, 'Lourdes M. Completado', 7, 2],
        [$otherProcessor, 'Allan Layug', 99, 20],
    ] as [$uploader, $name, $generalExterior, $fourPoint]) {
        CstProcessorMetric::query()->create([
            'report_date' => '2026-08-15',
            'processor_name' => $name,
            'general_exterior' => $generalExterior,
            'four_point' => $fourPoint,
            'qc_reviews' => 0,
            'source_file' => 'August CST.xlsx',
            'uploaded_by' => $uploader->id,
        ]);
    }

    foreach ([['OWN-1', 95], ['OWN-2', 85]] as [$projectId, $score]) {
        QaAssessment::query()->create([
            'record_key' => hash('sha256', $projectId.'|2026-08-15'),
            'assessment_date' => '2026-08-15',
            'processor_id' => $processor->id,
            'processor_name' => 'Desh Completado',
            'project_id' => $projectId,
            'score' => $score,
            'feedback' => ['Elevation feedback'],
            'source_file' => 'August QA.xlsx',
            'uploaded_by' => $otherProcessor->id,
        ]);
    }

    QaAssessment::query()->create([
        'record_key' => hash('sha256', 'OTHER-QA|2026-08-15'),
        'assessment_date' => '2026-08-15',
        'processor_id' => $otherProcessor->id,
        'processor_name' => 'Allan Layug',
        'project_id' => 'OTHER-QA',
        'score' => 100,
        'source_file' => 'August QA.xlsx',
        'uploaded_by' => $otherProcessor->id,
    ]);

    $this->actingAs($processor)
        ->get('/dashboard?month=2026-08')
        ->assertInertia(fn (Assert $page) => $page
            ->component('processor-dashboard')
            ->where('selectedMonth', '2026-08')
            ->where('periodLabel', 'August 2026')
            ->where('availableMonths.0.value', '2026-09')
            ->where('availableMonths.1.value', '2026-08')
            ->where('metrics.ph.totalCases', 3)
            ->where('metrics.ph.generalExterior', 2)
            ->where('metrics.ph.fourPoint', 1)
            ->where('metrics.ph.credits', 3.25)
            ->where('metrics.ph.qaScore', 90)
            ->where('metrics.ph.qaReviews', 2)
            ->where('metrics.cst.totalCases', 9)
            ->where('metrics.cst.generalExterior', 7)
            ->where('metrics.cst.fourPoint', 2)
            ->where('metrics.cst.credits', 9.5)
            ->where('dailyOutput.ph.14.total', 3)
            ->where('dailyOutput.cst.14.total', 9)
            ->where('leaderboards.ph.0.processor', 'Lourdes M. Completado')
            ->where('leaderboards.ph.0.totalCases', 3)
            ->where('leaderboards.ph.0.isCurrentUser', true)
            ->where('leaderboards.cst.0.processor', 'Allan Layug')
            ->where('leaderboards.cst.0.totalCases', 119)
            ->where('leaderboards.accuracy.0.processor', 'Allan Layug')
            ->where('leaderboards.accuracy.0.qaScore', 100)
            ->where('leaderboards.accuracy.1.processor', 'Lourdes M. Completado')
            ->where('leaderboards.accuracy.1.qaScore', 90)
            ->where('workspaceOverview.totalReports', 4)
            ->where('workspaceOverview.weeklyReports', 0)
            ->where('workspaceOverview.activeProcessors', 3)
            ->where('workspaceOverview.generalExterior', 3)
            ->where('workspaceOverview.fourPoint', 1)
            ->where('workspaceOverview.closedSource', 4)
            ->where('workspaceOverview.activeSource', 0)
            ->where('workspaceOverview.weekStart', '2026-08-31')
            ->where('workspaceOverview.weekEnd', '2026-09-06')
            ->has('workspaceOverview.weeklyChart', 7)
            ->where('achievement.title', 'You earned the top spot!')
            ->where('achievement.period', 'August 2026')
            ->where('achievement.items.0.key', 'ph-production')
            ->where('achievement.items.0.detail', '3 reports finished')
            ->has('qaHistory', 2)
            ->missing('reportRecords'));
});

test('processor dashboard exposes new QA notifications for the signed in account', function () {
    $processor = User::factory()->create([
        'name' => 'Allan Layug',
        'role' => UserRole::Processor,
    ]);
    $assessment = QaAssessment::query()->create([
        'record_key' => hash('sha256', 'NOTICE-1|2026-09-04'),
        'assessment_date' => '2026-09-04',
        'processor_id' => $processor->id,
        'processor_name' => $processor->name,
        'project_id' => 'NOTICE-1',
        'score' => 97,
        'source_file' => 'QA September.xlsx',
        'uploaded_by' => $processor->id,
    ]);
    $processor->notify(new NewQaAssessment($assessment));

    $this->actingAs($processor)
        ->get('/dashboard?month=2026-09')
        ->assertInertia(fn (Assert $page) => $page
            ->has('processorNotifications', 1)
            ->where('processorNotifications.0.title', 'New QA result available')
            ->where('processorNotifications.0.projectId', 'NOTICE-1')
            ->where('processorNotifications.0.score', 97));
});

test('processor can mark their QA notification as read', function () {
    $processor = User::factory()->create([
        'name' => 'Allan Layug',
        'role' => UserRole::Processor,
    ]);
    $assessment = QaAssessment::query()->create([
        'record_key' => hash('sha256', 'NOTICE-2|2026-09-04'),
        'assessment_date' => '2026-09-04',
        'processor_id' => $processor->id,
        'processor_name' => $processor->name,
        'project_id' => 'NOTICE-2',
        'score' => 96,
        'source_file' => 'QA September.xlsx',
        'uploaded_by' => $processor->id,
    ]);
    $processor->notify(new NewQaAssessment($assessment));
    $notification = $processor->unreadNotifications()->firstOrFail();

    $this->actingAs($processor)
        ->post(route('processor-notifications.read', $notification->id))
        ->assertRedirect();

    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('dashboard displays deduplicated imported report data', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-01 10:00:00', 'Asia/Manila'));
    $this->actingAs(User::factory()->create(['role' => UserRole::Operations]));

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
    $this->actingAs(User::factory()->create(['role' => UserRole::Operations]));

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
