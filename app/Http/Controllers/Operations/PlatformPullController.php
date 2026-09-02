<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\ReportEntry;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlatformPullController extends Controller
{
    public function index(Request $request): Response
    {
        $latestReportDate = ReportEntry::query()->max('report_date');
        $defaultReportDate = $latestReportDate
            ? CarbonImmutable::parse($latestReportDate)->toDateString()
            : CarbonImmutable::now('Asia/Manila')->toDateString();
        $requestedDate = $request->string('date')->toString();
        $reportDate = preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedDate) === 1
            ? $requestedDate
            : $defaultReportDate;

        $entries = ReportEntry::query()
            ->whereDate('report_date', $reportDate)
            ->orderBy('assembled_at')
            ->get(['source', 'batch', 'processor_name', 'project_id', 'report_category', 'assembled_at']);

        return Inertia::render('operations/platform-pulls', [
            'initialReportDate' => $reportDate,
            'reportEntries' => $entries->map(fn (ReportEntry $entry) => [
                'source' => $entry->source,
                'batch' => $entry->batch,
                'processorName' => $entry->processor_name,
                'projectId' => $entry->project_id,
                'reportCategory' => $entry->report_category,
                'assembledTime' => $entry->assembled_at?->format('H:i'),
            ])->values(),
        ]);
    }
}
