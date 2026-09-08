<?php

namespace App\Http\Controllers\Operations;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\QaAssessment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class QaScoreController extends Controller
{
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
            ->with('processor:id,name,n_name')
            ->whereBetween('assessment_date', [$startDate->toDateString(), $endDate->toDateString()]);

        if ($processor !== '' && $processor !== 'all') {
            $query->where(function ($builder) use ($processor): void {
                $builder->where('processor_name', $processor)
                    ->orWhereHas('processor', fn ($userQuery) => $userQuery->where('name', $processor));
            });
        }

        $rows = $query
            ->orderByDesc('assessment_date')
            ->orderByDesc('id')
            ->limit(10000)
            ->get()
            ->map(fn (QaAssessment $assessment): array => [
                'id' => $assessment->id,
                'date' => $assessment->assessment_date->format('Y-m-d'),
                'processor' => $assessment->processor?->name ?? $assessment->processor_name,
                'nickname' => $assessment->processor?->n_name,
                'projectId' => $assessment->project_id,
                'qcName' => $assessment->qc_name,
                'score' => (float) $assessment->score,
                'reportUrl' => $assessment->report_url,
                'feedback' => $assessment->feedback ?? [],
                'sourceFile' => $assessment->source_file,
            ]);

        return Inertia::render('operations/qa-scores', [
            'rows' => $rows,
            'processorNames' => $this->processorNames(),
            'filters' => [
                'startDate' => $startDate->toDateString(),
                'endDate' => $endDate->toDateString(),
                'processor' => $processor === '' ? 'all' : $processor,
            ],
            'summary' => [
                'assessments' => $rows->count(),
                'averageScore' => $rows->isEmpty() ? null : round($rows->avg('score'), 2),
                'processors' => $rows->pluck('processor')->unique()->count(),
                'feedbackItems' => $rows->sum(fn (array $row): int => count($row['feedback'])),
            ],
            'canImport' => in_array($request->user()?->role, [UserRole::Operations, UserRole::Qa], true),
            'phToday' => $phToday->toDateString(),
        ]);
    }

    /** @return Collection<int, string> */
    private function processorNames(): Collection
    {
        return QaAssessment::query()
            ->distinct()
            ->orderBy('processor_name')
            ->pluck('processor_name')
            ->merge(User::query()
                ->where('role', UserRole::Processor->value)
                ->where('is_active', true)
                ->orderBy('name')
                ->pluck('name'))
            ->filter()
            ->unique()
            ->sort()
            ->values();
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
