<?php

namespace App\Http\Controllers\Operations;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCstProcessorMetricsRequest;
use App\Models\CstProcessorMetric;
use App\Models\QaAssessment;
use App\Models\ReportEntry;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProcessorPerformanceController extends Controller
{
    private const APPROVED_PROCESSORS = [
        'Christer John C. Gozon',
        'Lourdes M. Completado',
        'Elacio M. Santos Jr.',
        'Jhun Cervantes',
        'Reginald King Palo',
        'Allan Layug',
        'Arianne Joy Lopez',
        'Emma Alegre',
        'Marie Anthonette Moog',
        'Mc Oliver Noble',
        'Rheven Violet Aladin',
        'Wengmir A. Africa',
        'Chrismer Flores',
        'Denn Charles Zafe',
        'Ivan Mendoza',
        'Jerica Matic',
        'Kristine Jewel Espiritu',
        'Mac Evens T. Payongayong',
        'Nikko Adrian Dungca',
        'Rainier Sta Ana',
        'Tracy John Josafat',
    ];

    private const PROCESSOR_ALIASES = [
        'arianne lopez' => 'Arianne Joy Lopez',
        'chris gozon' => 'Christer John C. Gozon',
        'christer gozon' => 'Christer John C. Gozon',
        'christer john gozon' => 'Christer John C. Gozon',
        'denn zafe' => 'Denn Charles Zafe',
        'desh completado' => 'Lourdes M. Completado',
        'don santos' => 'Elacio M. Santos Jr.',
        'jhun lester cervantes' => 'Jhun Cervantes',
        'king palo' => 'Reginald King Palo',
        'kristine espiritu' => 'Kristine Jewel Espiritu',
        'mac payongayong' => 'Mac Evens T. Payongayong',
        'marie moog' => 'Marie Anthonette Moog',
        'nikko dungca' => 'Nikko Adrian Dungca',
        'oliver noble' => 'Mc Oliver Noble',
        'rainier ana' => 'Rainier Sta Ana',
        'rheven aladin' => 'Rheven Violet Aladin',
        'tracy josafat' => 'Tracy John Josafat',
        'wengmir africa' => 'Wengmir A. Africa',
    ];

    public function index(Request $request): Response
    {
        $phNow = CarbonImmutable::now('Asia/Manila');
        $latestQaDate = QaAssessment::query()->max('assessment_date');
        $qaMonth = $latestQaDate ? CarbonImmutable::parse($latestQaDate, 'Asia/Manila') : $phNow;
        $hasManualRange = $request->filled('start_date') && $request->filled('end_date');
        $startDate = $this->dateOrDefault($request->string('start_date')->toString(), $phNow->startOfMonth());
        $endDate = $this->dateOrDefault($request->string('end_date')->toString(), $phNow);

        if ($startDate->greaterThan($endDate)) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        $qaStartDate = $startDate;
        $qaEndDate = $endDate;
        $qaAssessments = QaAssessment::query()
            ->with('processor:id,name,n_name,avatar_path')
            ->whereBetween('assessment_date', [$qaStartDate->toDateString(), $qaEndDate->toDateString()])
            ->get();

        $ph = ReportEntry::query()
            ->whereBetween('report_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get(['report_date', 'processor_name', 'project_id', 'inspection_type', 'report_category', 'source'])
            ->unique(fn (ReportEntry $entry) => implode('|', [
                $entry->report_date->format('Y-m-d'), $this->canonicalProcessorName($entry->processor_name), $entry->project_id, $entry->inspection_type,
            ]))
            ->groupBy(fn (ReportEntry $entry): string => $this->canonicalProcessorName($entry->processor_name))
            ->map(function (Collection $entries, string $name) use ($qaAssessments): array {
                $scores = $this->qaScoresFor($name, $qaAssessments);

                return $this->performance(
                    $name,
                    $entries->where('report_category', 'general_exterior')->count(),
                    $entries->where('report_category', 'four_point')->count(),
                    $scores->isNotEmpty() ? round($scores->avg(fn (QaAssessment $item) => (float) $item->score), 2) : null,
                    $scores->count(),
                );
            })
            ->sortBy('processor')
            ->values();

        $cst = CstProcessorMetric::query()
            ->whereBetween('report_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->orderByDesc('updated_at')
            ->get()
            ->groupBy(fn (CstProcessorMetric $metric): string => implode('|', [
                $metric->report_date->format('Y-m-d'),
                $this->canonicalProcessorName($metric->processor_name),
            ]))
            ->map(function (Collection $duplicates): CstProcessorMetric {
                $canonicalName = $this->canonicalProcessorName($duplicates->first()->processor_name);

                return $duplicates->first(
                    fn (CstProcessorMetric $metric): bool => $metric->processor_name === $canonicalName,
                ) ?? $duplicates->first();
            })
            ->groupBy(fn (CstProcessorMetric $metric): string => $this->canonicalProcessorName($metric->processor_name))
            ->map(function (Collection $metrics, string $name) use ($qaAssessments): array {
                $reviewCount = $metrics->sum('qc_reviews');
                $weightedScore = $metrics->sum(fn (CstProcessorMetric $metric) => (float) ($metric->qc_score ?? 0) * $metric->qc_reviews);
                $uploadedQaScores = $this->qaScoresFor($name, $qaAssessments);

                if ($uploadedQaScores->isNotEmpty()) {
                    $weightedScore += $uploadedQaScores->sum(fn (QaAssessment $assessment) => (float) $assessment->score);
                    $reviewCount += $uploadedQaScores->count();
                }

                return $this->performance(
                    $name,
                    $metrics->sum('general_exterior'),
                    $metrics->sum('four_point'),
                    $reviewCount > 0 ? round($weightedScore / $reviewCount, 2) : null,
                    $reviewCount,
                );
            })
            ->sortBy('processor')
            ->values();

        $processorAccounts = User::query()
            ->where('role', UserRole::Processor->value)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['name', 'n_name'])
            ->keyBy('name');
        $approvedProcessors = collect(self::APPROVED_PROCESSORS)
            ->merge($processorAccounts->keys())
            ->unique()
            ->sort()
            ->values()
            ->map(function (string $name) use ($processorAccounts): array {
                /** @var User|null $account */
                $account = $processorAccounts->get($name);

                return [
                    'name' => $name,
                    'nickname' => $account?->n_name,
                ];
            });

        return Inertia::render('operations/processors', [
            'phPerformance' => $ph,
            'cstPerformance' => $cst,
            'approvedProcessors' => $approvedProcessors,
            'qaHistory' => QaAssessment::query()
                ->with('processor:id,name,n_name')
                ->orderByDesc('assessment_date')
                ->orderByDesc('id')
                ->limit(5000)
                ->get()
                ->map(function (QaAssessment $assessment): array {
                    $processor = $this->canonicalProcessorName($assessment->processor?->name ?? $assessment->processor_name);

                    return [
                        'id' => $assessment->id,
                        'date' => $assessment->assessment_date->format('Y-m-d'),
                        'processor' => $processor,
                        'nickname' => $assessment->processor?->n_name,
                        'projectId' => $assessment->project_id,
                        'qcName' => $assessment->qc_name,
                        'reportUrl' => $assessment->report_url,
                        'score' => (float) $assessment->score,
                        'feedback' => $assessment->feedback ?? [],
                    ];
                })
                ->filter(fn (array $assessment): bool => in_array($assessment['processor'], self::APPROVED_PROCESSORS, true))
                ->values(),
            'periods' => [
                'ph' => $this->periodLabel($startDate, $endDate),
                'cst' => $this->periodLabel($startDate, $endDate),
                'qa' => $qaAssessments->isNotEmpty() ? $this->periodLabel($qaStartDate, $qaEndDate) : null,
            ],
            'filters' => [
                'manual' => $hasManualRange,
                'startDate' => $startDate->toDateString(),
                'endDate' => $endDate->toDateString(),
                'latestQaStart' => $latestQaDate ? $qaMonth->startOfMonth()->toDateString() : null,
                'latestQaEnd' => $latestQaDate ? $qaMonth->endOfMonth()->toDateString() : null,
            ],
        ]);
    }

    public function storeCst(StoreCstProcessorMetricsRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $now = now();
        $rows = collect($validated['metrics'])
            ->map(function (array $metric): ?array {
                $processorName = $this->canonicalProcessorName($metric['processor_name']);

                if (! in_array($processorName, self::APPROVED_PROCESSORS, true)) {
                    return null;
                }

                return [...$metric, 'processor_name' => $processorName];
            })
            ->filter()
            ->groupBy(fn (array $metric): string => $metric['report_date'].'|'.$metric['processor_name'])
            ->map(function (Collection $metrics) use ($validated, $request, $now): array {
                $first = $metrics->first();
                $reviewCount = $metrics->sum('qc_reviews');
                $weightedScore = $metrics->sum(fn (array $metric): float => (float) ($metric['qc_score'] ?? 0) * $metric['qc_reviews']);

                return [
                    'report_date' => $first['report_date'],
                    'processor_name' => $first['processor_name'],
                    'general_exterior' => $metrics->sum('general_exterior'),
                    'four_point' => $metrics->sum('four_point'),
                    'qc_score' => $reviewCount > 0 ? round($weightedScore / $reviewCount, 2) : null,
                    'qc_reviews' => $reviewCount,
                    'source_file' => $validated['source_file'],
                    'uploaded_by' => $request->user()->id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            })
            ->values();

        if ($rows->isEmpty()) {
            return back()->withErrors(['metrics' => 'No approved Batch 1, Batch 2, or Batch 3 processors were found in the CST files.']);
        }

        DB::transaction(function () use ($rows): void {
            $dates = $rows->pluck('report_date')->unique()->values();
            $identities = $rows->mapWithKeys(fn (array $row): array => [
                $row['report_date'].'|'.$row['processor_name'] => true,
            ]);

            $aliasIds = CstProcessorMetric::query()
                ->whereIn('report_date', $dates)
                ->get(['id', 'report_date', 'processor_name'])
                ->filter(function (CstProcessorMetric $metric) use ($identities): bool {
                    $canonicalName = $this->canonicalProcessorName($metric->processor_name);
                    $identity = $metric->report_date->format('Y-m-d').'|'.$canonicalName;

                    return $identities->has($identity) && $metric->processor_name !== $canonicalName;
                })
                ->pluck('id');

            if ($aliasIds->isNotEmpty()) {
                CstProcessorMetric::query()->whereKey($aliasIds)->delete();
            }

            CstProcessorMetric::upsert(
                $rows->all(),
                ['report_date', 'processor_name'],
                ['general_exterior', 'four_point', 'qc_score', 'qc_reviews', 'source_file', 'uploaded_by', 'updated_at'],
            );
        });

        $previousUrl = url()->previous();
        $redirectUrl = parse_url($previousUrl, PHP_URL_HOST) === $request->getHost()
            && parse_url($previousUrl, PHP_URL_PATH) === '/operations/processors'
                ? $previousUrl
                : route('operations.processors');

        return redirect()->to($redirectUrl)->with('cstImportSummary', [
            'saved' => $rows->count(),
            'file' => $validated['source_file'],
        ]);
    }

    private function performance(string $processor, int $generalExterior, int $fourPoint, ?float $qcScore = null, int $qcReviews = 0): array
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
            ])->all();

        return [
            'processor' => $processor,
            'batch' => $this->batchForProcessor($processor),
            'totalCases' => $generalExterior + $fourPoint,
            'generalExterior' => $generalExterior,
            'fourPoint' => $fourPoint,
            'credits' => $credits,
            'qcScore' => $qcScore,
            'qcReviews' => $qcReviews,
            'incentive' => collect($tiers)->where('achieved', true)->max('incentive') ?? 0,
            'tiers' => $tiers,
        ];
    }

    private function batchForProcessor(string $processorName): ?int
    {
        $position = array_search($this->canonicalProcessorName($processorName), self::APPROVED_PROCESSORS, true);

        if ($position === false) {
            return null;
        }

        return $position < 5 ? 1 : ($position < 12 ? 2 : 3);
    }

    private function qaScoresFor(string $processorName, Collection $assessments): Collection
    {
        $canonicalProcessor = $this->canonicalProcessorName($processorName);
        $expectedWords = collect(explode(' ', $this->normalizeName($canonicalProcessor)))->filter(fn (string $word) => mb_strlen($word) > 1);

        return $assessments->filter(function (QaAssessment $assessment) use ($canonicalProcessor, $expectedWords): bool {
            $names = collect([
                $assessment->processor_name,
                $assessment->processor?->name,
                $assessment->processor?->n_name,
            ])->filter()->map(fn (string $name) => $this->normalizeName($this->canonicalProcessorName($name)));

            return $names->contains($this->normalizeName($canonicalProcessor))
                || $names->contains(fn (string $name) => collect(explode(' ', $name))
                    ->filter(fn (string $word) => mb_strlen($word) > 1)
                    ->every(fn (string $word) => $expectedWords->contains($word)));
        });
    }

    private function canonicalProcessorName(string $name): string
    {
        $normalized = $this->normalizeName($name);

        foreach (self::APPROVED_PROCESSORS as $processor) {
            if ($normalized === $this->normalizeName($processor)) {
                return $processor;
            }
        }

        return self::PROCESSOR_ALIASES[$normalized] ?? trim($name);
    }

    private function normalizeName(string $value): string
    {
        return Str::of($value)->lower()->replaceMatches('/[^a-z0-9]+/', ' ')->squish()->value();
    }

    private function dateOrDefault(string $value, CarbonImmutable $default): CarbonImmutable
    {
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $default;
        }

        try {
            return CarbonImmutable::createFromFormat('!Y-m-d', $value, 'Asia/Manila');
        } catch (\Throwable) {
            return $default;
        }
    }

    private function periodLabel(CarbonImmutable $startDate, CarbonImmutable $endDate): string
    {
        if ($startDate->isSameMonth($endDate)) {
            return $startDate->format('F Y');
        }

        return $startDate->format('M j, Y').' – '.$endDate->format('M j, Y');
    }
}
