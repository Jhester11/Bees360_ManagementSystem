<?php

use App\Enums\UserRole;
use App\Models\QaAssessment;
use App\Models\User;
use App\Services\PerformanceAnnouncementService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

test('live production and QA leaders are announced without duplicates', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-05 10:00:00', 'Asia/Manila'));
    $operations = User::factory()->create(['role' => UserRole::Operations]);
    $leader = User::factory()->create(['name' => 'Production Leader', 'n_name' => 'Leader', 'role' => UserRole::Processor]);
    User::factory()->create(['name' => 'Other Processor', 'role' => UserRole::Processor]);

    DB::table('report_entries')->insert([
        [
            'report_date' => '2026-09-05', 'source' => 'active', 'batch' => 1,
            'processor_name' => $leader->name, 'project_id' => 'LEAD-1', 'inspection_type' => 'General Exterior',
            'report_category' => 'general_exterior', 'created_at' => now(), 'updated_at' => now(),
        ],
        [
            'report_date' => '2026-09-05', 'source' => 'active', 'batch' => 1,
            'processor_name' => $leader->name, 'project_id' => 'LEAD-2', 'inspection_type' => '4-Point',
            'report_category' => 'four_point', 'created_at' => now(), 'updated_at' => now(),
        ],
    ]);

    QaAssessment::query()->create([
        'record_key' => hash('sha256', 'LEAD-QA|2026-09-05'),
        'assessment_date' => '2026-09-05',
        'processor_id' => $leader->id,
        'processor_name' => $leader->name,
        'project_id' => 'LEAD-QA',
        'score' => 99,
        'feedback' => [],
        'source_file' => 'qa.csv',
        'uploaded_by' => $operations->id,
    ]);

    $service = app(PerformanceAnnouncementService::class);
    $service->refreshCurrentMonth();

    expect($operations->notifications()->where('data->type', 'overall_top_performer')->count())->toBe(1)
        ->and($leader->notifications()->where('data->type', 'highest_qa')->count())->toBe(1)
        ->and($leader->notifications()->where('data->type', 'top_four_point')->count())->toBe(1);

    $notificationCount = $leader->notifications()->count();
    $service->refreshCurrentMonth();

    expect($leader->notifications()->count())->toBe($notificationCount);
});

test('a processor receives each earned tier announcement once', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-05 10:00:00', 'Asia/Manila'));
    $processor = User::factory()->create(['name' => 'Tier Performer', 'role' => UserRole::Processor]);
    $now = now();

    collect(range(1, 550))->chunk(50)->each(function ($numbers) use ($processor, $now): void {
        DB::table('report_entries')->insert($numbers->map(fn (int $number): array => [
            'report_date' => '2026-09-05',
            'source' => 'active',
            'batch' => 1,
            'processor_name' => $processor->name,
            'project_id' => 'TIER-'.$number,
            'inspection_type' => 'General Exterior',
            'report_category' => 'general_exterior',
            'created_at' => $now,
            'updated_at' => $now,
        ])->all());
    });

    $service = app(PerformanceAnnouncementService::class);
    $service->refreshCurrentMonth();
    $service->refreshCurrentMonth();

    expect($processor->notifications()->where('data->type', 'tier_achievement')->count())->toBe(1)
        ->and($processor->notifications()->where('data->title', 'Tier 1 achieved!')->count())->toBe(1);
});
