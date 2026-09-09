<?php

namespace App\Http\Controllers\Operations;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\CstProcessorMetric;
use App\Services\ActiveProcessorRoster;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class CstReportController extends Controller
{
    public function __construct(private readonly ActiveProcessorRoster $roster) {}

    public function __invoke(Request $request): Response
    {
        $phToday = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $startDate = $this->dateOrDefault($request->string('start_date')->toString(), $phToday->startOfMonth());
        $endDate = $this->dateOrDefault($request->string('end_date')->toString(), $phToday);

        if ($startDate->greaterThan($endDate)) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        $processor = trim($request->string('processor')->toString());
        $processors = $this->roster->all();
        $selectedProcessor = $processor === 'all' ? 'all' : $this->roster->canonicalName($processor, $processors);
        $query = CstProcessorMetric::query()
            ->whereBetween('report_date', [$startDate->toDateString(), $endDate->toDateString()]);

        $rows = $processor === '' || $selectedProcessor === null
            ? collect()
            : $query
                ->orderByDesc('report_date')
                ->orderByDesc('updated_at')
                ->orderBy('processor_name')
                ->get(['id', 'report_date', 'processor_name', 'general_exterior', 'four_point', 'updated_at'])
                ->filter(fn (CstProcessorMetric $metric): bool => $this->roster->canonicalName($metric->processor_name, $processors) !== null)
                ->groupBy(fn (CstProcessorMetric $metric): string => implode('|', [
                    $metric->report_date->format('Y-m-d'),
                    $this->roster->canonicalName($metric->processor_name, $processors),
                ]))
                ->map(function (Collection $duplicates) use ($processors): CstProcessorMetric {
                    $canonicalName = $this->roster->canonicalName($duplicates->first()->processor_name, $processors);

                    return $duplicates->first(
                        fn (CstProcessorMetric $metric): bool => $metric->processor_name === $canonicalName,
                    ) ?? $duplicates->first();
                })
                ->filter(function (CstProcessorMetric $metric) use ($processors, $selectedProcessor): bool {
                    $canonicalName = $this->roster->canonicalName($metric->processor_name, $processors);

                    return $selectedProcessor === 'all' || $canonicalName === $selectedProcessor;
                })
                ->map(fn (CstProcessorMetric $metric): array => [
                    'id' => $metric->id,
                    'date' => $metric->report_date->format('Y-m-d'),
                    'processor' => $this->roster->canonicalName($metric->processor_name, $processors),
                    'generalExterior' => $metric->general_exterior,
                    'fourPoint' => $metric->four_point,
                    'total' => $metric->general_exterior + $metric->four_point,
                ])
                // Filtering a collection preserves its database indexes. Inertia
                // serializes sparse indexes as an object, while the React page
                // correctly expects a list that supports rows.map(...).
                ->values();

        return Inertia::render('operations/cst-reports', [
            'rows' => $rows,
            'processorNames' => $processors->pluck('name')->values(),
            'filters' => [
                'startDate' => $startDate->toDateString(),
                'endDate' => $endDate->toDateString(),
                'processor' => $selectedProcessor ?? '',
            ],
            'summary' => [
                'generalExterior' => $rows->sum('generalExterior'),
                'fourPoint' => $rows->sum('fourPoint'),
                'total' => $rows->sum('total'),
            ],
            'canImport' => $request->user()?->role === UserRole::Operations,
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
