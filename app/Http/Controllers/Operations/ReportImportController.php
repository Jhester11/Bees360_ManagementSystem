<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReportImportRequest;
use App\Models\ReportEntry;
use App\Services\ActiveProcessorRoster;
use App\Services\PerformanceAnnouncementService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ReportImportController extends Controller
{
    private const UPSERT_CHUNK_SIZE = 1000;

    public function __construct(
        private readonly PerformanceAnnouncementService $announcements,
        private readonly ActiveProcessorRoster $processorRoster,
    ) {}

    public function index(): Response
    {
        $processors = $this->processorRoster->all();
        $activeProcessorNames = $processors->pluck('name');
        $historyVisible = request()->boolean('history');
        $entries = ReportEntry::query()
            ->whereIn('processor_name', $activeProcessorNames)
            ->orderByDesc('report_date')
            ->orderByDesc('assembled_at')
            ->limit(5000)
            ->get(['report_date', 'source', 'batch', 'processor_name', 'project_id', 'inspection_type', 'report_category', 'assembled_at']);

        $historyEntries = $historyVisible
            ? ReportEntry::query()
                ->whereNotIn('processor_name', $activeProcessorNames)
                ->orderByDesc('report_date')
                ->orderByDesc('assembled_at')
                ->limit(1000)
                ->get(['report_date', 'source', 'batch', 'processor_name', 'project_id', 'inspection_type', 'report_category', 'assembled_at'])
            : collect();

        return Inertia::render('operations/reports', [
            'reportEntries' => $entries,
            'processorRoster' => $this->processorRoster->forFrontend($processors),
            'latestReportDate' => $entries->first()?->report_date?->format('Y-m-d'),
            'historyVisible' => $historyVisible,
            'historyEntries' => $historyEntries,
        ]);
    }

    public function store(StoreReportImportRequest $request): RedirectResponse
    {
        $processors = $this->processorRoster->all();
        $records = collect($request->validated('entries'))
            ->map(function (array $entry) use ($processors): ?array {
                $processor = $this->processorRoster->match($entry['assembled_by'], $processors);
                $category = $this->category($entry['inspection_type']);

                if ($processor === null || $category === null) {
                    return null;
                }

                try {
                    $assembledAt = CarbonImmutable::parse($entry['assembled_at'], 'Asia/Manila');
                } catch (\Throwable) {
                    return null;
                }

                if ($assembledAt->isAfter(CarbonImmutable::now('Asia/Manila')->endOfDay())) {
                    return null;
                }

                return [
                    'report_date' => $assembledAt->toDateString(),
                    'source' => $entry['source'],
                    'batch' => $processor->batch,
                    'processor_name' => $processor->name,
                    'project_id' => trim($entry['project_id']),
                    'insured_by' => filled($entry['insured_by']) ? trim($entry['insured_by']) : null,
                    'inspection_type' => trim($entry['inspection_type']),
                    'report_category' => $category,
                    'assembled_at' => $assembledAt,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })
            ->filter()
            ->unique(fn (array $entry) => implode('|', [$entry['source'], $entry['project_id'], $entry['report_date'], $entry['processor_name'], $entry['inspection_type']]))
            ->values();

        if ($records->isEmpty()) {
            return back()->withErrors([
                'entries' => 'No report rows matched an active Batch 1–3 processor and an Exterior or 4-Point inspection.',
            ]);
        }

        DB::transaction(function () use ($records): void {
            $records->chunk(self::UPSERT_CHUNK_SIZE)->each(function ($chunk): void {
                ReportEntry::upsert(
                    $chunk->all(),
                    ['source', 'project_id', 'report_date', 'processor_name', 'inspection_type'],
                    ['batch', 'insured_by', 'report_category', 'assembled_at', 'updated_at'],
                );
            });
        });

        $this->announcements->refreshCurrentMonth();

        return to_route('operations.reports')->with('importSummary', [
            'saved' => $records->count(),
            'ignored' => count($request->validated('entries')) - $records->count(),
        ]);
    }

    private function category(string $inspectionType): ?string
    {
        $value = Str::lower($inspectionType);

        if (Str::contains($value, 'exterior')) {
            return 'general_exterior';
        }

        if (Str::contains($value, ['4-point', '4 point'])) {
            return 'four_point';
        }

        return null;
    }
}
