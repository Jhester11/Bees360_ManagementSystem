<?php

namespace App\Http\Controllers\Operations;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\QueueProcessorEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QueueExportController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_if($request->user()->role === UserRole::Trainee, 403);
        $filters = $request->validate([
            'start' => ['required', 'date_format:Y-m-d'],
            'end' => ['required', 'date_format:Y-m-d', 'after_or_equal:start'],
            'processor' => ['nullable', 'string', 'max:255'],
        ]);
        $query = QueueProcessorEntry::query()
            ->join('queue_snapshots', 'queue_snapshots.id', '=', 'queue_processor_entries.queue_snapshot_id')
            ->whereBetween('queue_snapshots.report_date', [$filters['start'], $filters['end']]);
        $processor = $request->user()->role === UserRole::Processor
            ? $request->user()->name : ($filters['processor'] ?? null);
        if ($processor && $processor !== 'all') {
            $query->where('queue_processor_entries.processor_name', $processor);
        }

        return response()->json(['rows' => $query->orderBy('queue_snapshots.report_date')
            ->orderBy('queue_snapshots.checked_at')->orderBy('queue_processor_entries.processor_name')
            ->get([
                'queue_snapshots.report_date as date', 'queue_snapshots.checkpoint', 'queue_snapshots.file_name as file',
                'queue_processor_entries.processor_name as processor', 'queue_processor_entries.batch',
                'queue_processor_entries.general_exterior', 'queue_processor_entries.four_point',
                'queue_processor_entries.premium_four_point', 'queue_processor_entries.other', 'queue_processor_entries.total',
            ])])->header('Cache-Control', 'private, no-store');
    }
}
