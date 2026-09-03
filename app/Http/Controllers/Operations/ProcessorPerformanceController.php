<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCstProcessorMetricsRequest;
use App\Models\CstProcessorMetric;
use App\Models\QaAssessment;
use App\Models\ReportEntry;
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
    public function index(Request $request): Response
    {
        $phNow = CarbonImmutable::now('Asia/Manila');
        $cstNow = CarbonImmutable::now('America/Chicago');
        $latestQaDate = QaAssessment::query()->max('assessment_date');
        $qaMonth = $latestQaDate ? CarbonImmutable::parse($latestQaDate, 'Asia/Manila') : $phNow;
        $hasManualRange = $request->filled('start_date') && $request->filled('end_date');
        $startDate = $this->dateOrDefault($request->string('start_date')->toString(), $phNow->startOfMonth());
        $endDate = $this->dateOrDefault($request->string('end_date')->toString(), $phNow);

        if ($startDate->greaterThan($endDate)) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        $qaStartDate = $hasManualRange ? $startDate : $qaMonth->startOfMonth();
        $qaEndDate = $hasManualRange ? $endDate : $qaMonth->endOfMonth();
        $qaAssessments = QaAssessment::query()
            ->with('processor:id,name,n_name,avatar_path')
            ->whereBetween('assessment_date', [$qaStartDate->toDateString(), $qaEndDate->toDateString()])
            ->get();

        $ph = ReportEntry::query()
            ->whereBetween('report_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get(['report_date', 'processor_name', 'project_id', 'inspection_type', 'report_category', 'source'])
            ->unique(fn (ReportEntry $entry) => implode('|', [
                $entry->report_date->format('Y-m-d'), $entry->processor_name, $entry->project_id, $entry->inspection_type,
            ]))
            ->groupBy('processor_name')
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
            ->orderBy('processor_name')
            ->get()
            ->groupBy('processor_name')
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

        return Inertia::render('operations/processors', [
            'phPerformance' => $ph,
            'cstPerformance' => $cst,
            'qaHistory' => QaAssessment::query()
                ->with('processor:id,name,n_name')
                ->orderByDesc('assessment_date')
                ->orderByDesc('id')
                ->limit(5000)
                ->get()
                ->map(fn (QaAssessment $assessment): array => [
                    'id' => $assessment->id,
                    'date' => $assessment->assessment_date->format('Y-m-d'),
                    'processor' => $assessment->processor?->name ?? $assessment->processor_name,
                    'nickname' => $assessment->processor?->n_name,
                    'projectId' => $assessment->project_id,
                    'qcName' => $assessment->qc_name,
                    'reportUrl' => $assessment->report_url,
                    'score' => (float) $assessment->score,
                    'feedback' => $assessment->feedback ?? [],
                ]),
            'periods' => [
                'ph' => $phNow->format('F Y'),
                'cst' => $cstNow->format('F Y'),
                'qa' => $latestQaDate ? $qaStartDate->format('M j').' – '.$qaEndDate->format('M j, Y') : null,
            ],
            'filters' => [
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
        $rows = collect($validated['metrics'])->map(fn (array $metric): array => [
            ...$metric,
            'processor_name' => trim($metric['processor_name']),
            'qc_score' => $metric['qc_score'] ?? null,
            'source_file' => $validated['source_file'],
            'uploaded_by' => $request->user()->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::transaction(fn () => CstProcessorMetric::upsert(
            $rows->all(),
            ['report_date', 'processor_name'],
            ['general_exterior', 'four_point', 'qc_score', 'qc_reviews', 'source_file', 'uploaded_by', 'updated_at'],
        ));

        return to_route('operations.processors')->with('cstImportSummary', [
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

    private function qaScoresFor(string $processorName, Collection $assessments): Collection
    {
        $expectedWords = collect(explode(' ', $this->normalizeName($processorName)))->filter(fn (string $word) => mb_strlen($word) > 1);

        return $assessments->filter(function (QaAssessment $assessment) use ($processorName, $expectedWords): bool {
            $names = collect([
                $assessment->processor_name,
                $assessment->processor?->name,
                $assessment->processor?->n_name,
            ])->filter()->map(fn (string $name) => $this->normalizeName($name));

            return $names->contains($this->normalizeName($processorName))
                || $names->contains(fn (string $name) => collect(explode(' ', $name))
                    ->filter(fn (string $word) => mb_strlen($word) > 1)
                    ->every(fn (string $word) => $expectedWords->contains($word)));
        });
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
}
