<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\AnnouncementEvent;
use App\Models\QaAssessment;
use App\Models\ReportEntry;
use App\Models\User;
use App\Notifications\Bees360Announcement;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class PerformanceAnnouncementService
{
    public function announceNewAccount(User $newUser): void
    {
        $this->broadcastOnce(
            'new-account:'.$newUser->id,
            'new_account',
            [
                'type' => 'new_account',
                'title' => 'Welcome to the Bees360 team',
                'message' => $newUser->name.' joined Bees360 as '.match ($newUser->role) {
                    UserRole::Operations => 'Operation',
                    UserRole::Processor => 'Processor',
                    UserRole::Trainer => 'Trainer',
                    UserRole::Qa => 'Quality Assurance',
                    UserRole::Reviewer => 'Reviewer',
                }.'.',
                'href' => '/dashboard',
            ],
        );
    }

    public function refreshCurrentMonth(): void
    {
        $month = CarbonImmutable::now('Asia/Manila')->startOfMonth();
        $end = $month->endOfMonth();
        $accounts = User::query()
            ->where('role', UserRole::Processor->value)
            ->where('is_active', true)
            ->get(['id', 'name', 'n_name']);

        if ($accounts->isEmpty()) {
            return;
        }

        $entries = ReportEntry::query()
            ->whereBetween('report_date', [$month->toDateString(), $end->toDateString()])
            ->orderByDesc('source')
            ->get(['report_date', 'source', 'processor_name', 'project_id', 'inspection_type', 'report_category'])
            ->unique(fn (ReportEntry $entry): string => implode('|', [
                $entry->report_date->format('Y-m-d'),
                $this->normalize($entry->processor_name),
                $entry->project_id,
                $entry->inspection_type,
            ]));

        $production = $accounts->map(function (User $account) use ($entries): array {
            $mine = $entries->filter(fn (ReportEntry $entry): bool => $this->matches($account, $entry->processor_name));
            $generalExterior = $mine->where('report_category', 'general_exterior')->count();
            $fourPoint = $mine->where('report_category', 'four_point')->count();

            return [
                'user' => $account,
                'general_exterior' => $generalExterior,
                'four_point' => $fourPoint,
                'total' => $generalExterior + $fourPoint,
                'credits' => round($generalExterior + ($fourPoint * 1.25), 2),
            ];
        });

        $this->announceLeader($production, 'credits', 'overall_top_performer', 'Overall top performer', 'earned credits', $month);
        $this->announceLeader($production, 'total', 'highest_reports', 'Highest polished reports', 'reports', $month);
        $this->announceLeader($production, 'general_exterior', 'top_general_exterior', 'Top General Exterior performer', 'General Exterior reports', $month);
        $this->announceLeader($production, 'four_point', 'top_four_point', 'Top 4-Point performer', '4-Point reports', $month);
        $this->announceTiers($production, $month);

        $assessments = QaAssessment::query()
            ->whereBetween('assessment_date', [$month->toDateString(), $end->toDateString()])
            ->get(['processor_id', 'processor_name', 'score']);
        $qa = $accounts->map(function (User $account) use ($assessments): array {
            $scores = $assessments
                ->filter(fn (QaAssessment $assessment): bool => $assessment->processor_id === $account->id
                    || ($assessment->processor_id === null && $this->matches($account, $assessment->processor_name)))
                ->pluck('score');

            return ['user' => $account, 'average' => $scores->isEmpty() ? 0 : round($scores->avg(), 2), 'reviews' => $scores->count()];
        })->filter(fn (array $row): bool => $row['reviews'] > 0);

        $this->announceLeader($qa, 'average', 'highest_qa', 'Highest QA accuracy', '% average QA', $month);
    }

    /** @param Collection<int, array<string, mixed>> $rows */
    private function announceLeader(Collection $rows, string $metric, string $type, string $title, string $unit, CarbonImmutable $month): void
    {
        $leader = $rows->filter(fn (array $row): bool => (float) $row[$metric] > 0)
            ->sort(fn (array $left, array $right): int => ((float) $right[$metric] <=> (float) $left[$metric]) ?: ($left['user']->name <=> $right['user']->name))
            ->first();

        if (! $leader) {
            return;
        }

        /** @var User $user */
        $user = $leader['user'];
        $value = $leader[$metric];
        $this->broadcastOnce(
            implode(':', [$type, $month->format('Y-m'), $user->id]),
            $type,
            [
                'type' => $type,
                'title' => $title,
                'message' => $user->name.' leads '.$month->format('F Y').' with '.$value.' '.$unit.'.',
                'href' => '/dashboard',
            ],
        );
    }

    /** @param Collection<int, array<string, mixed>> $production */
    private function announceTiers(Collection $production, CarbonImmutable $month): void
    {
        foreach ($production as $row) {
            /** @var User $user */
            $user = $row['user'];

            foreach ([[1, 550, 100], [2, 650, 200], [3, 750, 300]] as [$tier, $target, $incentive]) {
                if ($row['credits'] < $target) {
                    continue;
                }

                $this->notifyOnce(
                    'tier:'.$month->format('Y-m').':'.$user->id.':'.$tier,
                    'tier_achievement',
                    collect([$user]),
                    [
                        'type' => 'tier_achievement',
                        'title' => 'Tier '.$tier.' achieved!',
                        'message' => 'Congratulations! You reached '.$target.' credits and earned a $'.$incentive.' incentive for '.$month->format('F Y').'.',
                        'href' => '/dashboard?month='.$month->format('Y-m'),
                    ],
                );
            }
        }
    }

    /** @param array<string, int|float|string|null> $data */
    private function broadcastOnce(string $key, string $type, array $data): void
    {
        if (! $this->recordEvent($key, $type)) {
            return;
        }

        User::query()->where('is_active', true)->select(['id'])->chunkById(200, function (Collection $users) use ($data): void {
            $users->each->notify(new Bees360Announcement($data));
        });
    }

    /** @param Collection<int, User> $recipients
     * @param  array<string, int|float|string|null>  $data
     */
    private function notifyOnce(string $key, string $type, Collection $recipients, array $data): void
    {
        if (! $this->recordEvent($key, $type)) {
            return;
        }

        $recipients->each->notify(new Bees360Announcement($data));
    }

    private function recordEvent(string $key, string $type): bool
    {
        return AnnouncementEvent::query()->insertOrIgnore([
            'event_key' => $key,
            'type' => $type,
            'created_at' => now(),
            'updated_at' => now(),
        ]) === 1;
    }

    private function matches(User $account, string $name): bool
    {
        $needle = $this->normalize($name);
        $full = $this->normalize($account->name);
        $nickname = $this->normalize($account->n_name ?? '');
        $needleWords = collect(explode(' ', $needle))->filter(fn (string $word): bool => strlen($word) > 1);
        $fullWords = collect(explode(' ', $full));

        return $needle === $full
            || ($nickname !== '' && $needle === $nickname)
            || ($needleWords->count() >= 2 && $needleWords->every(fn (string $word): bool => $fullWords->contains($word)));
    }

    private function normalize(string $value): string
    {
        return Str::of($value)->lower()->replaceMatches('/[^a-z0-9]+/', ' ')->squish()->value();
    }
}
