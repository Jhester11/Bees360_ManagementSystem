<?php

namespace App\Http\Controllers\Operations;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\QaAssessment;
use App\Models\QaImport;
use App\Services\ActiveProcessorRoster;
use App\Services\QaProcessorAttribution;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QaScoreController extends Controller
{
    public function __construct(private readonly ActiveProcessorRoster $roster, private readonly QaProcessorAttribution $attribution) {}

    public function __invoke(Request $request): Response
    {
        $phToday = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $startDate = $this->dateOrDefault($request->string('start_date')->toString(), $phToday->startOfMonth());
        $endDate = $this->dateOrDefault($request->string('end_date')->toString(), $phToday);

        if ($startDate->greaterThan($endDate)) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        $processor = trim($request->string('processor')->toString());
        $query = QaAssessment::query()
            ->whereBetween('assessment_date', [$startDate->toDateString(), $endDate->toDateString()]);

        $processors = $this->roster->all();
        $selectedProcessor = $this->roster->canonicalName($processor, $processors) ?? $processor;

        $assessments = $query
            ->orderByDesc('assessment_date')
            ->orderByDesc('id')
            ->get();
        $audit = $this->attribution->resolve($assessments);
        $rows = $audit['assessments']
            ->map(function (QaAssessment $assessment): array {
                $account = $assessment->processor;

                return [
                    'id' => $assessment->id,
                    'date' => $assessment->assessment_date->format('Y-m-d'),
                    'processor' => $account->name,
                    'nickname' => $account->n_name,
                    'projectId' => $assessment->project_id,
                    'score' => (float) $assessment->score,
                    'reportUrl' => $assessment->report_url,
                    'feedback' => $assessment->feedback ?? [],
                    'sourceFile' => $assessment->source_file,
                ];
            })
            ->filter(fn (array $row): bool => $selectedProcessor === '' || $selectedProcessor === 'all' || $row['processor'] === $selectedProcessor)
            ->values();

        return Inertia::render('operations/qa-scores', [
            'rows' => $rows,
            'attributionAudit' => [
                'total' => $assessments->count(),
                'matched' => $audit['assessments']->count(),
                'recovered' => $audit['recovered'],
                'unresolved' => $audit['unresolved'],
            ],
            'processorNames' => $processors->pluck('name')->sort()->values(),
            'filters' => [
                'startDate' => $startDate->toDateString(),
                'endDate' => $endDate->toDateString(),
                'processor' => $selectedProcessor === '' ? 'all' : $selectedProcessor,
            ],
            'summary' => [
                'assessments' => $rows->count(),
                'averageScore' => $rows->isEmpty() ? null : round($rows->avg('score'), 2),
                'processors' => $rows->pluck('processor')->unique()->count(),
                'feedbackItems' => $rows->sum(fn (array $row): int => count($row['feedback'])),
            ],
            'importHistory' => QaImport::query()
                ->with('uploader:id,name')
                ->latest()
                ->orderByDesc('id')
                ->limit(20)
                ->get()
                ->map(fn (QaImport $import): array => [
                    'id' => $import->id,
                    'sourceFile' => $import->source_file,
                    'processed' => $import->processed_count,
                    'created' => $import->created_count,
                    'updated' => $import->updated_count,
                    'matched' => $import->matched_count,
                    'unmatched' => $import->unmatched_count,
                    'uploadedBy' => $import->uploader?->name ?? 'Deleted user',
                    'uploadedAt' => $import->created_at->toIso8601String(),
                ]),
            'canImport' => in_array($request->user()?->role, [UserRole::Operations, UserRole::Qa], true),
            'phToday' => $phToday->toDateString(),
        ]);
    }

    private function dateOrDefault(string $date, CarbonImmutable $default): CarbonImmutable
    {
        try {
            return $date !== '' ? CarbonImmutable::createFromFormat('!Y-m-d', $date, 'Asia/Manila') : $default;
        } catch (\Throwable) {
            return $default;
        }
    }
}
