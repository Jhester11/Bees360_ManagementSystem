<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQueueSnapshotRequest;
use App\Models\QueueSnapshot;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class QueueSnapshotController extends Controller
{
    private const PROCESSORS = [
        'Christer John C. Gozon' => 1,
        'Lourdes M. Completado' => 1,
        'Elacio M. Santos Jr.' => 1,
        'Jhun Cervantes' => 1,
        'Reginald King Palo' => 1,
        'Allan Layug' => 2,
        'Arianne Joy Lopez' => 2,
        'Emma Alegre' => 2,
        'Marie Anthonette Moog' => 2,
        'Mc Oliver Noble' => 2,
        'Rheven Violet Aladin' => 2,
        'Wengmir A. Africa' => 2,
        'Chrismer Flores' => 3,
        'Denn Charles Zafe' => 3,
        'Ivan Mendoza' => 3,
        'Jerica Matic' => 3,
        'Kristine Jewel Espiritu' => 3,
        'Mac Evens T. Payongayong' => 3,
        'Nikko Adrian Dungca' => 3,
        'Rainier Sta Ana' => 3,
        'Tracy John Josafat' => 3,
    ];

    public function index(): Response
    {
        $reportDate = CarbonImmutable::now('Asia/Manila')->toDateString();
        $snapshots = QueueSnapshot::query()
            ->with(['processorEntries' => fn ($query) => $query->orderBy('batch')->orderBy('processor_name')])
            ->whereDate('report_date', $reportDate)
            ->orderBy('checked_at')
            ->get();

        return Inertia::render('operations/queue-monitor', [
            'savedSnapshots' => $snapshots->map(fn (QueueSnapshot $snapshot) => $this->serialize($snapshot)),
        ]);
    }

    public function store(StoreQueueSnapshotRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $reportDate = CarbonImmutable::now('Asia/Manila')->toDateString();
        $entries = collect($validated['entries'])
            ->filter(fn (array $entry) => (self::PROCESSORS[$entry['name']] ?? null) === $entry['batch'])
            ->unique('name')
            ->map(fn (array $entry) => [
                'batch' => self::PROCESSORS[$entry['name']],
                'processor_name' => $entry['name'],
                'general_exterior' => $entry['general_exterior'],
                'four_point' => $entry['four_point'],
                'other' => $entry['other'],
                'total' => $entry['general_exterior'] + $entry['four_point'] + $entry['other'],
            ])
            ->values();

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

    private function serialize(QueueSnapshot $snapshot): array
    {
        return [
            'fileName' => $snapshot->file_name,
            'totalRows' => $snapshot->total_rows,
            'matchedRows' => $snapshot->matched_rows,
            'ignoredRows' => $snapshot->ignored_rows,
            'checkedAt' => $snapshot->checked_at->timezone('Asia/Manila')->format('g:i A'),
            'reportDate' => $snapshot->report_date->format('Y-m-d'),
            'checkpoint' => $snapshot->checkpoint,
            'processorRows' => $snapshot->processorEntries->map(fn ($entry) => [
                'name' => $entry->processor_name,
                'batch' => $entry->batch,
                'aliases' => [],
                'generalExterior' => $entry->general_exterior,
                'fourPoint' => $entry->four_point,
                'other' => $entry->other,
                'total' => $entry->total,
            ])->values(),
        ];
    }
}
