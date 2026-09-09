<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQueueSnapshotRequest;
use App\Models\QueueProcessorEntry;
use App\Models\QueueSnapshot;
use App\Models\User;
use App\Services\ActiveProcessorRoster;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class QueueSnapshotController extends Controller
{
    public function __construct(private readonly ActiveProcessorRoster $processorRoster) {}

    public function index(): Response
    {
        $processors = $this->processorRoster->all();
        $activeProcessorNames = $processors->pluck('name');
        $historyVisible = request()->boolean('history');
        $reportDate = CarbonImmutable::now('Asia/Manila')->toDateString();
        $snapshots = QueueSnapshot::query()
            ->with(['processorEntries' => fn ($query) => $query->orderBy('batch')->orderBy('processor_name')])
            ->whereDate('report_date', $reportDate)
            ->orderBy('checked_at')
            ->get();

        return Inertia::render('operations/queue-monitor', [
            'savedSnapshots' => $snapshots->map(fn (QueueSnapshot $snapshot) => $this->serialize($snapshot, $processors)),
            'processorRoster' => $this->processorRoster->forFrontend($processors),
            'historyVisible' => $historyVisible,
            'historyEntries' => $historyVisible
                ? QueueProcessorEntry::query()
                    ->with('queueSnapshot:id,report_date,checkpoint')
                    ->whereNotIn('processor_name', $activeProcessorNames)
                    ->orderByDesc('id')
                    ->limit(1000)
                    ->get(['id', 'queue_snapshot_id', 'batch', 'processor_name', 'general_exterior', 'four_point', 'other', 'total'])
                    ->map(fn (QueueProcessorEntry $entry): array => [
                        'reportDate' => $entry->queueSnapshot->report_date->format('Y-m-d'),
                        'checkpoint' => $entry->queueSnapshot->checkpoint,
                        'name' => $entry->processor_name,
                        'batch' => $entry->batch,
                        'generalExterior' => $entry->general_exterior,
                        'fourPoint' => $entry->four_point,
                        'other' => $entry->other,
                        'total' => $entry->total,
                    ])
                : collect(),
        ]);
    }

    public function store(StoreQueueSnapshotRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $processors = $this->processorRoster->all();
        $reportDate = CarbonImmutable::now('Asia/Manila')->toDateString();
        $entries = collect($validated['entries'])
            ->map(function (array $entry) use ($processors): ?array {
                $processor = $this->processorRoster->match($entry['name'], $processors);
                if ($processor === null || (int) $processor->batch !== (int) $entry['batch']) {
                    return null;
                }

                return [
                    'batch' => $processor->batch,
                    'processor_name' => $processor->name,
                    'general_exterior' => $entry['general_exterior'],
                    'four_point' => $entry['four_point'],
                    'other' => $entry['other'],
                    'total' => $entry['general_exterior'] + $entry['four_point'] + $entry['other'],
                ];
            })
            ->filter()
            ->unique('processor_name')
            ->values();

        if ($entries->isEmpty()) {
            return back()->withErrors([
                'entries' => 'No active Batch 1, Batch 2, or Batch 3 processor names matched this queue workbook.',
            ]);
        }

        $matchedRows = $entries->sum('total');
        $totalRows = max($validated['total_rows'], $matchedRows);

        DB::transaction(function () use ($request, $validated, $entries, $matchedRows, $reportDate, $totalRows): void {
            $snapshot = QueueSnapshot::query()->updateOrCreate(
                [
                    'report_date' => $reportDate,
                    'checkpoint' => $validated['checkpoint'],
                ],
                [
                    'file_name' => $validated['file_name'],
                    'total_rows' => $totalRows,
                    'matched_rows' => $matchedRows,
                    'ignored_rows' => $totalRows - $matchedRows,
                    'uploaded_by' => $request->user()->getKey(),
                    'checked_at' => now(),
                ],
            );

            $snapshot->processorEntries()->delete();
            $snapshot->processorEntries()->createMany($entries->all());
        });

        return to_route('operations.queue-monitor')->with('queueSnapshotSaved', true);
    }

    /** @param Collection<int, User> $processors */
    private function serialize(QueueSnapshot $snapshot, Collection $processors): array
    {
        return [
            'fileName' => $snapshot->file_name,
            'totalRows' => $snapshot->total_rows,
            'matchedRows' => $snapshot->matched_rows,
            'ignoredRows' => $snapshot->ignored_rows,
            'checkedAt' => $snapshot->checked_at->timezone('Asia/Manila')->format('g:i A'),
            'reportDate' => $snapshot->report_date->format('Y-m-d'),
            'checkpoint' => $snapshot->checkpoint,
            'processorRows' => $snapshot->processorEntries
                ->map(function ($entry) use ($processors): ?array {
                    $processor = $this->processorRoster->match($entry->processor_name, $processors);
                    if ($processor === null) {
                        return null;
                    }

                    return [
                        'name' => $processor->name,
                        'batch' => (int) $processor->batch,
                        'aliases' => array_values(array_filter([$processor->n_name])),
                        'generalExterior' => $entry->general_exterior,
                        'fourPoint' => $entry->four_point,
                        'other' => $entry->other,
                        'total' => $entry->total,
                    ];
                })
                ->filter()
                ->values(),
        ];
    }
}
