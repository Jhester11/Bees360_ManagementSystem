<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReportImportRequest;
use App\Models\ReportEntry;
use App\Services\ActiveProcessorRoster;
use App\Services\PerformanceAnnouncementService;
use App\Services\ReportImportService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ReportImportController extends Controller
{
    public function __construct(
        private readonly PerformanceAnnouncementService $announcements,
        private readonly ActiveProcessorRoster $processorRoster,
        private readonly ReportImportService $reportImporter,
    ) {}

    public function index(): Response
    {
        $processors = $this->processorRoster->all();
        $activeProcessorNames = $processors->pluck('name');
        $historyVisible = request()->boolean('history');
        $latestReportDate = ReportEntry::query()
            ->whereIn('processor_name', $activeProcessorNames)
            ->max('report_date');
        $requestedDate = request()->string('date')->toString();
        $parsedDate = \DateTimeImmutable::createFromFormat('!Y-m-d', $requestedDate);
        $reportDate = preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedDate)
            && $parsedDate !== false && $parsedDate->format('Y-m-d') === $requestedDate
                ? $requestedDate
                : ($latestReportDate ?? CarbonImmutable::now('Asia/Manila')->toDateString());

        $historyEntries = $historyVisible
            ? ReportEntry::query()
                ->whereNotIn('processor_name', $activeProcessorNames)
                ->orderByDesc('report_date')
                ->orderByDesc('assembled_at')
                ->limit(1000)
                ->get(['report_date', 'source', 'batch', 'processor_name', 'project_id', 'inspection_type', 'report_category', 'assembled_at'])
            : collect();

        return Inertia::render('operations/reports', [
            'reportEntries' => Inertia::defer(fn () => ReportEntry::query()
                ->whereIn('processor_name', $activeProcessorNames)
                ->where('report_date', $reportDate)
                ->orderByDesc('source')
                ->orderByDesc('assembled_at')
                ->get(['report_date', 'source', 'batch', 'processor_name', 'project_id', 'inspection_type', 'report_category', 'assembled_at'])),
            'processorRoster' => $this->processorRoster->forFrontend($processors),
            'latestReportDate' => $latestReportDate,
            'reportDate' => $reportDate,
            'historyVisible' => $historyVisible,
            'historyEntries' => $historyEntries,
        ]);
    }

    public function store(StoreReportImportRequest $request): RedirectResponse
    {
        $entries = $request->validated('entries');
        $summary = $this->reportImporter->import($entries);

        if ($summary['saved'] === 0) {
            return back()->withErrors([
                'entries' => 'No Exterior, 4-Point, or Premium 4-Point report rows could be matched to a known processor account.',
            ]);
        }

        $this->announcements->refreshCurrentMonth();

        return to_route('operations.reports')->with('importSummary', $summary);
    }
}
