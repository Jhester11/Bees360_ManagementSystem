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
        $records = collect($entries)
            ->map(function (array $entry) use ($processors): ?array {
                $processor = $this->processorRoster->match((string) ($entry['assembled_by'] ?? ''), $processors);
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
                    'project_id' => trim((string) $entry['project_id']),
                    'insured_by' => filled($entry['insured_by'] ?? null) ? trim((string) $entry['insured_by']) : null,
                    'inspection_type' => trim((string) $entry['inspection_type']),
                    'report_category' => $category,
                    'assembled_at' => $assembledAt,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })
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
            'ignored' => count($entries) - $records->count(),
        ];
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
