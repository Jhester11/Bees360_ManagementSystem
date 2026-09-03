<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\ReportEntry;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
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
