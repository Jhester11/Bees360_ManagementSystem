<?php

namespace App\Services;

use App\Models\ReportEntry;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReportImportService
{
    private const UPSERT_CHUNK_SIZE = 1000;

    public function __construct(private readonly ActiveProcessorRoster $processorRoster) {}

    /** @param array<int, array<string, mixed>> $entries */
    public function import(array $entries): array
    {
        $processors = $this->processorRoster->productionHistory();
        $inputEntries = collect($entries);
        $processorNamesByProjectId = $inputEntries
            ->filter(fn (array $entry): bool => filled($entry['project_id'] ?? null) && filled($entry['assembled_by'] ?? null))
            ->mapWithKeys(fn (array $entry): array => [trim((string) $entry['project_id']) => trim((string) $entry['assembled_by'])]);
        $projectIdsWithoutProcessor = $inputEntries
            ->filter(fn (array $entry): bool => filled($entry['project_id'] ?? null) && blank($entry['assembled_by'] ?? null))
            ->pluck('project_id')
            ->map(fn (mixed $projectId): string => trim((string) $projectId))
            ->filter()
            ->unique()
            ->values();

        $projectIdsWithoutProcessor->chunk(500)->each(function (Collection $projectIds) use ($processorNamesByProjectId): void {
            ReportEntry::query()
                ->whereIn('project_id', $projectIds)
                ->whereNotNull('processor_name')
                ->orderByDesc('assembled_at')
                ->get(['project_id', 'processor_name'])
                ->each(function (ReportEntry $entry) use ($processorNamesByProjectId): void {
                    $projectId = trim((string) $entry->project_id);

                    if (! $processorNamesByProjectId->has($projectId)) {
                        $processorNamesByProjectId->put($projectId, $entry->processor_name);
                    }
                });
        });

        $mappedRecords = $inputEntries->map(function (array $entry) use ($processorNamesByProjectId, $processors): ?array {
            $projectId = trim((string) ($entry['project_id'] ?? ''));
            $assembledBy = trim((string) ($entry['assembled_by'] ?? ''));
            $processorName = $assembledBy !== '' ? $assembledBy : (string) $processorNamesByProjectId->get($projectId, '');
            $processor = $this->processorRoster->match($processorName, $processors);
            $category = $this->category((string) ($entry['inspection_type'] ?? ''));

            if ($processor === null || $category === null) {
                return null;
            }

            try {
                $assembledAt = CarbonImmutable::parse((string) $entry['assembled_at'], 'Asia/Manila');
            } catch (\Throwable) {
                return null;
            }

            if ($assembledAt->isAfter(CarbonImmutable::now('Asia/Manila')->endOfDay())) {
                return null;
            }

            return [
                'report_date' => $assembledAt->toDateString(),
                'source' => $entry['source'],
                'batch' => $this->processorRoster->productionBatch($processor),
                'processor_name' => $processor->name,
                'project_id' => $projectId,
                'insured_by' => filled($entry['insured_by'] ?? null) ? trim((string) $entry['insured_by']) : null,
                'inspection_type' => trim((string) $entry['inspection_type']),
                'report_category' => $category,
                'assembled_at' => $assembledAt,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });
        $records = $mappedRecords
            ->filter()
            ->unique(fn (array $entry): string => implode('|', [$entry['source'], $entry['project_id'], $entry['report_date'], $entry['processor_name'], $entry['inspection_type']]))
            ->values();

        DB::transaction(function () use ($records): void {
            $records->chunk(self::UPSERT_CHUNK_SIZE)->each(function (Collection $chunk): void {
                ReportEntry::upsert(
                    $chunk->all(),
                    ['source', 'project_id', 'report_date', 'processor_name', 'inspection_type'],
                    ['batch', 'insured_by', 'report_category', 'assembled_at', 'updated_at'],
                );
            });
        });

        return [
            'saved' => $records->count(),
            'ignored' => $mappedRecords->filter(fn (?array $record): bool => $record === null)->count(),
        ];
    }

    private function category(string $inspectionType): ?string
    {
        $value = Str::lower($inspectionType);

        if (Str::contains($value, ['premium 4-point', 'premium 4 point', 'premium four point'])) {
            return 'premium_four_point';
        }

        if (Str::contains($value, 'exterior')) {
            return 'general_exterior';
        }

        if (Str::contains($value, ['4-point', '4 point'])) {
            return 'four_point';
        }

        return null;
    }
}
