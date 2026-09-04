<?php

namespace App\Http\Controllers\Operations;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\CstProcessorMetric;
use App\Models\QaAssessment;
use App\Models\ReportEntry;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private const PROCESSOR_ALIASES = [
        'arianne lopez' => 'arianne joy lopez',
        'chris gozon' => 'christer john c gozon',
        'christer gozon' => 'christer john c gozon',
        'christer john gozon' => 'christer john c gozon',
        'denn zafe' => 'denn charles zafe',
        'desh completado' => 'lourdes m completado',
        'don santos' => 'elacio m santos jr',
        'jhun lester cervantes' => 'jhun cervantes',
        'king palo' => 'reginald king palo',
        'kristine espiritu' => 'kristine jewel espiritu',
        'mac payongayong' => 'mac evens t payongayong',
        'marie moog' => 'marie anthonette moog',
        'nikko dungca' => 'nikko adrian dungca',
        'oliver noble' => 'mc oliver noble',
        'rainier ana' => 'rainier sta ana',
        'rheven aladin' => 'rheven violet aladin',
        'tracy josafat' => 'tracy john josafat',
        'wengmir africa' => 'wengmir a africa',
    ];

    public function index(Request $request): Response
    {
        if ($request->user()?->role === UserRole::Processor) {
            return $this->renderProcessorDashboard($request);
        }

        return $this->renderDashboard();
    }

    public function mtd(): Response
    {
        return $this->renderDashboard(showReportRange: true);
    }

    public function comparison(): Response
    {
        return Inertia::render('operations/report-comparison', $this->reportData());
    }

    private function renderDashboard(bool $showReportRange = false): Response
    {
        return Inertia::render('dashboard', [
            'showReportRange' => $showReportRange,
            ...$this->reportData(),
        ]);
    }

    private function renderProcessorDashboard(Request $request): Response
    {
        /** @var User $processor */
        $processor = $request->user();
        $phNow = CarbonImmutable::now('Asia/Manila');
        $selectedMonth = $this->monthOrDefault($request->string('month')->toString(), $phNow);
        $startDate = $selectedMonth->startOfMonth();
        $endDate = $selectedMonth->endOfMonth();

        $allPhEntries = ReportEntry::query()
            ->whereBetween('report_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->orderByDesc('source')
            ->get(['report_date', 'source', 'processor_name', 'project_id', 'inspection_type', 'report_category'])
            ->unique(fn (ReportEntry $entry): string => implode('|', [
                $entry->report_date->format('Y-m-d'),
                $this->processorKey($entry->processor_name),
                $entry->project_id,
                $entry->inspection_type,
            ]))
            ->values();
        $phEntries = $allPhEntries
            ->filter(fn (ReportEntry $entry): bool => $this->belongsToProcessor($processor, $entry->processor_name))
            ->values();

        $allCstMetrics = CstProcessorMetric::query()
            ->whereBetween('report_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->orderByDesc('updated_at')
            ->get()
            ->groupBy(fn (CstProcessorMetric $metric): string => $metric->report_date->format('Y-m-d').'|'.$this->processorKey($metric->processor_name))
            ->map(fn (Collection $duplicates): CstProcessorMetric => $duplicates->first())
            ->values();
        $cstMetrics = $allCstMetrics
            ->filter(fn (CstProcessorMetric $metric): bool => $this->belongsToProcessor($processor, $metric->processor_name))
            ->values();

        $allQaAssessments = QaAssessment::query()
            ->whereBetween('assessment_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->orderByDesc('assessment_date')
            ->orderByDesc('id')
            ->get()
            ->values();
        $qaAssessments = $allQaAssessments
            ->filter(fn (QaAssessment $assessment): bool => $assessment->processor_id === $processor->id
                || $this->belongsToProcessor($processor, $assessment->processor_name))
            ->values();
        $processorAccounts = User::query()
            ->where('role', UserRole::Processor->value)
            ->where('is_active', true)
            ->get(['id', 'name', 'n_name']);

        $qaScore = $qaAssessments->isNotEmpty()
            ? round($qaAssessments->avg(fn (QaAssessment $assessment): float => (float) $assessment->score), 2)
            : null;
        $qaReviews = $qaAssessments->count();
        $phGeneralExterior = $phEntries->where('report_category', 'general_exterior')->count();
        $phFourPoint = $phEntries->where('report_category', 'four_point')->count();
        $cstGeneralExterior = $cstMetrics->sum('general_exterior');
        $cstFourPoint = $cstMetrics->sum('four_point');

        $leaderboards = $this->processorLeaderboards(
            $allPhEntries,
            $allCstMetrics,
            $allQaAssessments,
            $processorAccounts,
            $processor,
        );

        return Inertia::render('processor-dashboard', [
            'selectedMonth' => $selectedMonth->format('Y-m'),
            'periodLabel' => $selectedMonth->format('F Y'),
            'availableMonths' => collect([$phNow->year, $selectedMonth->year])
                ->unique()
                ->flatMap(fn (int $year): Collection => collect(range(1, 12))->map(fn (int $month): array => [
                    'value' => sprintf('%04d-%02d', $year, $month),
                    'label' => CarbonImmutable::create($year, $month, 1, 0, 0, 0, 'Asia/Manila')->format('F Y'),
                ]))
                ->filter(fn (array $month): bool => $month['value'] <= $phNow->format('Y-m'))
                ->sortByDesc('value')
                ->values(),
            'metrics' => [
                'ph' => $this->processorPerformance($phGeneralExterior, $phFourPoint, $qaScore, $qaReviews),
                'cst' => $this->processorPerformance($cstGeneralExterior, $cstFourPoint, $qaScore, $qaReviews),
            ],
            'dailyOutput' => [
                'ph' => $this->dailyPhOutput($selectedMonth, $phEntries),
                'cst' => $this->dailyCstOutput($selectedMonth, $cstMetrics),
            ],
            'qaHistory' => $qaAssessments->map(fn (QaAssessment $assessment): array => [
                'id' => $assessment->id,
                'date' => $assessment->assessment_date->format('Y-m-d'),
                'projectId' => $assessment->project_id,
                'qcName' => $assessment->qc_name,
                'reportUrl' => $assessment->report_url,
                'score' => (float) $assessment->score,
                'feedback' => collect($assessment->feedback ?? [])
                    ->filter(fn (mixed $feedback): bool => is_string($feedback))
                    ->map(fn (string $feedback): string => trim($feedback))
                    ->filter()
                    ->values(),
            ]),
            'leaderboards' => $leaderboards,
            'achievement' => $this->processorAchievement($request, $processor, $selectedMonth, $leaderboards),
            'workspaceOverview' => $this->reportData()['overview'],
            'phNow' => $phNow->toIso8601String(),
        ]);
    }

    private function processorAchievement(Request $request, User $processor, CarbonImmutable $month, array $leaderboards): ?array
    {
        $achievements = collect([
            ['key' => 'ph-production', 'earned' => (bool) data_get($leaderboards, 'ph.0.isCurrentUser'), 'label' => 'Highest PH production', 'detail' => data_get($leaderboards, 'ph.0.totalCases').' reports finished'],
            ['key' => 'cst-production', 'earned' => (bool) data_get($leaderboards, 'cst.0.isCurrentUser'), 'label' => 'Highest CST production', 'detail' => data_get($leaderboards, 'cst.0.totalCases').' reports finished'],
            ['key' => 'qa-accuracy', 'earned' => (bool) data_get($leaderboards, 'accuracy.0.isCurrentUser'), 'label' => 'Highest QA accuracy', 'detail' => data_get($leaderboards, 'accuracy.0.qaScore').'% average accuracy'],
        ])->filter(fn (array $achievement): bool => $achievement['earned'])
            ->map(fn (array $achievement): array => collect($achievement)->except('earned')->all())
            ->values();

        if ($achievements->isEmpty()) {
            return null;
        }

        $signature = implode('|', [
            $processor->id,
            $month->format('Y-m'),
            $achievements->pluck('key')->implode(','),
        ]);

        if ($request->session()->get('processor_achievement_seen') === $signature) {
            return null;
        }

        $request->session()->put('processor_achievement_seen', $signature);

        return [
            'title' => $achievements->count() > 1 ? 'You are a Bees360 top performer!' : 'You earned the top spot!',
            'period' => $month->format('F Y'),
            'items' => $achievements,
        ];
    }

    private function processorLeaderboards(
        Collection $phEntries,
        Collection $cstMetrics,
        Collection $qaAssessments,
        Collection $accounts,
        User $currentProcessor,
    ): array {
        $accountsById = $accounts->keyBy('id');
        $accountsByKey = $accounts->keyBy(fn (User $account): string => $this->processorKey($account->name));
        $qaByProcessor = $qaAssessments
            ->groupBy(function (QaAssessment $assessment) use ($accountsById): string {
                /** @var User|null $account */
                $account = $assessment->processor_id ? $accountsById->get($assessment->processor_id) : null;

                return $this->processorKey($account?->name ?? $assessment->processor_name);
            })
            ->map(fn (Collection $assessments): array => [
                'score' => round($assessments->avg(fn (QaAssessment $assessment): float => (float) $assessment->score), 2),
                'reviews' => $assessments->count(),
            ]);
        $currentKey = $this->processorKey($currentProcessor->name);

        $productionLeaders = function (Collection $records, bool $isCst) use ($accountsByKey, $qaByProcessor, $currentKey): Collection {
            return $records
                ->groupBy(fn (ReportEntry|CstProcessorMetric $record): string => $this->processorKey($record->processor_name))
                ->map(function (Collection $processorRecords, string $key) use ($accountsByKey, $qaByProcessor, $currentKey, $isCst): array {
                    /** @var User|null $account */
                    $account = $accountsByKey->get($key);
                    $first = $processorRecords->first();
                    $generalExterior = $isCst
                        ? $processorRecords->sum('general_exterior')
                        : $processorRecords->where('report_category', 'general_exterior')->count();
                    $fourPoint = $isCst
                        ? $processorRecords->sum('four_point')
                        : $processorRecords->where('report_category', 'four_point')->count();
                    $qa = $qaByProcessor->get($key);

                    return [
                        'processor' => $account?->name ?? $first->processor_name,
                        'totalCases' => $generalExterior + $fourPoint,
                        'generalExterior' => $generalExterior,
                        'fourPoint' => $fourPoint,
                        'qaScore' => $qa['score'] ?? null,
                        'qaReviews' => $qa['reviews'] ?? 0,
                        'isCurrentUser' => $key === $currentKey,
                    ];
                })
                ->filter(fn (array $leader): bool => $leader['totalCases'] > 0)
                ->sort(function (array $left, array $right): int {
                    return ($right['totalCases'] <=> $left['totalCases'])
                        ?: (($right['qaScore'] ?? -1) <=> ($left['qaScore'] ?? -1))
                        ?: ($left['processor'] <=> $right['processor']);
                })
                ->take(3)
                ->values()
                ->map(fn (array $leader, int $index): array => [...$leader, 'rank' => $index + 1]);
        };

        $accuracyLeaders = $qaByProcessor
            ->map(function (array $qa, string $key) use ($accountsByKey, $currentKey, $qaAssessments): array {
                /** @var User|null $account */
                $account = $accountsByKey->get($key);
                /** @var QaAssessment|null $assessment */
                $assessment = $qaAssessments->first(fn (QaAssessment $item): bool => $this->processorKey($item->processor_name) === $key);

                return [
                    'processor' => $account?->name ?? $assessment?->processor_name ?? 'Processor',
                    'qaScore' => $qa['score'],
                    'qaReviews' => $qa['reviews'],
                    'isCurrentUser' => $key === $currentKey,
                ];
            })
            ->sort(function (array $left, array $right): int {
                return ($right['qaScore'] <=> $left['qaScore'])
                    ?: ($right['qaReviews'] <=> $left['qaReviews'])
                    ?: ($left['processor'] <=> $right['processor']);
            })
            ->take(3)
            ->values();

        return [
            'ph' => $productionLeaders($phEntries, false),
            'cst' => $productionLeaders($cstMetrics, true),
            'accuracy' => $accuracyLeaders->map(fn (array $leader, int $index): array => [...$leader, 'rank' => $index + 1]),
        ];
    }

    private function processorPerformance(int $generalExterior, int $fourPoint, ?float $qaScore, int $qaReviews): array
    {
        $credits = round($generalExterior + ($fourPoint * 1.25), 2);
        $tiers = collect([[550, 100], [650, 200], [750, 300]])
            ->map(fn (array $tier, int $index): array => [
                'name' => 'Tier '.($index + 1),
                'target' => $tier[0],
                'incentive' => $tier[1],
                'achieved' => $credits >= $tier[0],
                'needed' => max(round($tier[0] - $credits, 2), 0),
                'percentage' => round(min(($credits / $tier[0]) * 100, 100), 1),
            ])
            ->values();

        return [
            'totalCases' => $generalExterior + $fourPoint,
            'generalExterior' => $generalExterior,
            'fourPoint' => $fourPoint,
            'credits' => $credits,
            'qaScore' => $qaScore,
            'qaReviews' => $qaReviews,
            'incentive' => $tiers->where('achieved', true)->max('incentive') ?? 0,
            'tiers' => $tiers,
        ];
    }

    private function dailyPhOutput(CarbonImmutable $month, Collection $entries): Collection
    {
        $byDate = $entries->groupBy(fn (ReportEntry $entry): string => $entry->report_date->format('Y-m-d'));

        return collect(range(1, $month->daysInMonth))->map(function (int $day) use ($month, $byDate): array {
            $date = $month->setDay($day);
            /** @var Collection<int, ReportEntry> $daily */
            $daily = $byDate->get($date->toDateString(), collect());

            return [
                'date' => $date->toDateString(),
                'day' => $date->format('M j'),
                'generalExterior' => $daily->where('report_category', 'general_exterior')->count(),
                'fourPoint' => $daily->where('report_category', 'four_point')->count(),
                'total' => $daily->count(),
            ];
        });
    }

    private function dailyCstOutput(CarbonImmutable $month, Collection $metrics): Collection
    {
        $byDate = $metrics->groupBy(fn (CstProcessorMetric $metric): string => $metric->report_date->format('Y-m-d'));

        return collect(range(1, $month->daysInMonth))->map(function (int $day) use ($month, $byDate): array {
            $date = $month->setDay($day);
            /** @var Collection<int, CstProcessorMetric> $daily */
            $daily = $byDate->get($date->toDateString(), collect());
            $generalExterior = $daily->sum('general_exterior');
            $fourPoint = $daily->sum('four_point');

            return [
                'date' => $date->toDateString(),
                'day' => $date->format('M j'),
                'generalExterior' => $generalExterior,
                'fourPoint' => $fourPoint,
                'total' => $generalExterior + $fourPoint,
            ];
        });
    }

    private function belongsToProcessor(User $processor, string $name): bool
    {
        $normalizedName = $this->normalizeName($name);

        return $this->processorKey($name) === $this->processorKey($processor->name)
            || ($processor->n_name && $normalizedName === $this->normalizeName($processor->n_name));
    }

    private function processorKey(string $name): string
    {
        $normalized = $this->normalizeName($name);

        return self::PROCESSOR_ALIASES[$normalized] ?? $normalized;
    }

    private function normalizeName(string $name): string
    {
        return Str::of($name)->lower()->replaceMatches('/[^a-z0-9]+/', ' ')->squish()->value();
    }

    private function monthOrDefault(string $value, CarbonImmutable $default): CarbonImmutable
    {
        if (! preg_match('/^\d{4}-\d{2}$/', $value)) {
            return $default->startOfMonth();
        }

        try {
            return CarbonImmutable::createFromFormat('!Y-m', $value, 'Asia/Manila')->startOfMonth();
        } catch (\Throwable) {
            return $default->startOfMonth();
        }
    }

    private function reportData(): array
    {
        $entries = ReportEntry::query()
            ->orderByDesc('source')
            ->get([
                'report_date',
                'source',
                'processor_name',
                'batch',
                'project_id',
                'inspection_type',
                'report_category',
            ])
            ->unique(fn (ReportEntry $entry) => implode('|', [
                $entry->report_date->format('Y-m-d'),
                $entry->processor_name,
                $entry->project_id,
                $entry->inspection_type,
            ]))
            ->values();

        $latestReportDate = $entries->max(fn (ReportEntry $entry) => $entry->report_date->format('Y-m-d'));
        $currentDate = CarbonImmutable::now('Asia/Manila');
        $weekStart = $currentDate->startOfWeek();
        $weekEnd = $currentDate->endOfWeek();
        $weeklyEntries = $entries->filter(fn (ReportEntry $entry) => $entry->report_date->betweenIncluded($weekStart, $weekEnd));

        $records = $entries
            ->groupBy(fn (ReportEntry $entry) => $entry->report_date->format('Y-m-d').'|'.$entry->processor_name)
            ->map(function (Collection $group): array {
                /** @var ReportEntry $first */
                $first = $group->first();

                return [
                    'date' => $first->report_date->format('Y-m-d'),
                    'dateLabel' => $first->report_date->format('M j'),
                    'processor' => $first->processor_name,
                    'batch' => $first->batch,
                    'reports' => $group->count(),
                    'generalExterior' => $group->where('report_category', 'general_exterior')->count(),
                    'fourPoint' => $group->where('report_category', 'four_point')->count(),
                ];
            })
            ->sortBy('date')
            ->values();

        $weeklyChart = collect(range(0, 6))->map(function (int $offset) use ($weekStart, $weeklyEntries): array {
            $date = $weekStart->addDays($offset);

            return [
                'day' => $date->format('D'),
                'date' => $date->format('Y-m-d'),
                'reports' => $weeklyEntries->filter(
                    fn (ReportEntry $entry) => $entry->report_date->format('Y-m-d') === $date->format('Y-m-d'),
                )->count(),
            ];
        });

        $weekStartDate = $weekStart->format('Y-m-d');
        $weekEndDate = $weekEnd->format('Y-m-d');
        $topProcessors = $records
            ->filter(fn (array $record): bool => $record['date'] >= $weekStartDate
                && $record['date'] <= $weekEndDate
                && $record['reports'] > 31)
            ->groupBy('processor')
            ->map(function (Collection $dailyRecords, string $name): array {
                $firstRecord = $dailyRecords->first();

                return [
                    'name' => $name,
                    'batch' => $firstRecord['batch'],
                    'latestDate' => $dailyRecords->max('date'),
                    'overDeliveredDays' => $dailyRecords->count(),
                    'reports' => $dailyRecords->sum('reports'),
                    'generalExterior' => $dailyRecords->sum('generalExterior'),
                    'fourPoint' => $dailyRecords->sum('fourPoint'),
                ];
            })
            ->sortBy([
                ['reports', 'desc'],
                ['name', 'asc'],
            ])
            ->values();

        return [
            'reportRecords' => $records,
            'processorNames' => $entries->pluck('processor_name')->unique()->sort()->values(),
            'reportRange' => [
                'first' => $entries->min(fn (ReportEntry $entry) => $entry->report_date->format('Y-m-d')),
                'latest' => $latestReportDate,
            ],
            'overview' => [
                'totalReports' => $entries->count(),
                'weeklyReports' => $weeklyEntries->count(),
                'activeProcessors' => $entries->pluck('processor_name')->unique()->count(),
                'generalExterior' => $entries->where('report_category', 'general_exterior')->count(),
                'fourPoint' => $entries->where('report_category', 'four_point')->count(),
                'activeSource' => $entries->where('source', 'active')->count(),
                'closedSource' => $entries->where('source', 'closed')->count(),
                'weekStart' => $weekStart->format('Y-m-d'),
                'weekEnd' => $weekEnd->format('Y-m-d'),
                'weeklyChart' => $weeklyChart,
                'topProcessor' => $topProcessors->first(),
                'topProcessors' => $topProcessors,
            ],
        ];
    }
}
