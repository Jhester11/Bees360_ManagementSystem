<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReportImportRequest;
use App\Models\ReportEntry;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ReportImportController extends Controller
{
    private const UPSERT_CHUNK_SIZE = 1000;

    private const PROCESSORS = [
        1 => ['Christer John C. Gozon', 'Lourdes M. Completado', 'Elacio M. Santos Jr.', 'Jhun Cervantes', 'Reginald King Palo'],
        2 => ['Allan Layug', 'Arianne Joy Lopez', 'Emma Alegre', 'Marie Anthonette Moog', 'Mc Oliver Noble', 'Rheven Violet Aladin', 'Wengmir A. Africa'],
        3 => ['Chrismer Flores', 'Denn Charles Zafe', 'Ivan Mendoza', 'Jerica Matic', 'Kristine Jewel Espiritu', 'Mac Evens T. Payongayong', 'Nikko Adrian Dungca', 'Rainier Sta Ana', 'Tracy John Josafat'],
    ];

    private const ALIASES = [
        'chris gozon' => 'Christer John C. Gozon',
        'christer gozon' => 'Christer John C. Gozon',
        'desh completado' => 'Lourdes M. Completado',
        'don santos' => 'Elacio M. Santos Jr.',
        'elacio santos' => 'Elacio M. Santos Jr.',
        'jhun lester cervantes' => 'Jhun Cervantes',
        'king palo' => 'Reginald King Palo',
        'marie moog' => 'Marie Anthonette Moog',
        'wengmir africa' => 'Wengmir A. Africa',
        'weng africa' => 'Wengmir A. Africa',
        'rheven aladin' => 'Rheven Violet Aladin',
        'violet aladin' => 'Rheven Violet Aladin',
        'arianne lopez' => 'Arianne Joy Lopez',
        'mc noble' => 'Mc Oliver Noble',
        'oliver noble' => 'Mc Oliver Noble',
    ];

    public function index(): Response
    {
        $entries = ReportEntry::query()
            ->orderByDesc('report_date')
            ->orderByDesc('assembled_at')
            ->limit(5000)
            ->get(['report_date', 'source', 'batch', 'processor_name', 'project_id', 'inspection_type', 'report_category', 'assembled_at']);

        return Inertia::render('operations/reports', [
            'reportEntries' => $entries,
            'latestReportDate' => $entries->first()?->report_date?->format('Y-m-d'),
        ]);
    }

    public function store(StoreReportImportRequest $request): RedirectResponse
    {
        $records = collect($request->validated('entries'))
            ->map(function (array $entry): ?array {
                $processor = $this->processor($entry['assembled_by']);
                $category = $this->category($entry['inspection_type']);

                if ($processor === null || $category === null) {
                    return null;
                }

                try {
                    $assembledAt = CarbonImmutable::parse($entry['assembled_at'], 'Asia/Manila');
                } catch (\Throwable) {
                    return null;
                }

                return [
                    'report_date' => $assembledAt->toDateString(),
                    'source' => $entry['source'],
                    'batch' => $processor['batch'],
                    'processor_name' => $processor['name'],
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

        DB::transaction(function () use ($records): void {
            $records->chunk(self::UPSERT_CHUNK_SIZE)->each(function ($chunk): void {
                ReportEntry::upsert(
                    $chunk->all(),
                    ['source', 'project_id', 'report_date', 'processor_name', 'inspection_type'],
                    ['batch', 'insured_by', 'report_category', 'assembled_at', 'updated_at'],
                );
            });
        });

        return to_route('operations.reports')->with('importSummary', [
            'saved' => $records->count(),
            'ignored' => count($request->validated('entries')) - $records->count(),
        ]);
    }

    private function processor(string $name): ?array
    {
        $normalized = $this->normalize($name);
        $canonical = self::ALIASES[$normalized] ?? null;

        foreach (self::PROCESSORS as $batch => $names) {
            foreach ($names as $candidate) {
                if ($this->normalize($candidate) === $normalized || $candidate === $canonical) {
                    return ['batch' => $batch, 'name' => $candidate];
                }
            }
        }

        return null;
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

    private function normalize(string $value): string
    {
        return Str::of($value)->lower()->replaceMatches('/[^a-z0-9]+/', ' ')->squish()->value();
    }
}
