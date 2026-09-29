<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQaAssessmentsRequest;
use App\Models\QaAssessment;
use App\Models\QaImport;
use App\Notifications\NewQaAssessment;
use App\Services\ActiveProcessorRoster;
use App\Services\PerformanceAnnouncementService;
use App\Support\UniqueRecords;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class QaAssessmentImportController extends Controller
{
    private const UPSERT_CHUNK_SIZE = 500;

    public function __construct(
        private readonly PerformanceAnnouncementService $announcements,
        private readonly ActiveProcessorRoster $processorRoster,
    ) {}

    public function __invoke(StoreQaAssessmentsRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $users = $this->processorRoster->all();
        $now = now();
        $matched = 0;

        $processorMatches = [];
        $rows = collect($validated['assessments'])->map(function (array $assessment) use ($users, $request, $validated, $now, &$processorMatches): array {
            $name = $assessment['processor_name'];
            if (! array_key_exists($name, $processorMatches)) {
                $processorMatches[$name] = $this->processorRoster->match($name, $users);
            }
            $processor = $processorMatches[$name];

            $processorName = $processor?->name ?? trim($assessment['processor_name']);

            return [
                ...$assessment,
                'record_key' => hash('sha256', trim($assessment['project_id']).'|'.$assessment['assessment_date']),
                'processor_id' => $processor?->id,
                'processor_name' => $processorName,
                'project_id' => filled($assessment['project_id'] ?? null) ? trim($assessment['project_id']) : null,
                'qc_name' => filled($assessment['qc_name'] ?? null) ? trim($assessment['qc_name']) : null,
                'report_url' => filled($assessment['report_url'] ?? null) ? trim($assessment['report_url']) : null,
                'feedback' => collect($assessment['feedback'] ?? [])
                    ->map(fn (string $feedback): string => trim($feedback))
                    ->filter()
                    ->values()
                    ->toJson(),
                'source_file' => $validated['source_file'],
                'uploaded_by' => $request->user()->id,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        })->reverse()->filter(UniqueRecords::byKey(fn (array $row): string => $row['record_key']))->reverse()->values();

        $matched = $rows->whereNotNull('processor_id')->count();

        $existingKeys = $rows->pluck('record_key')->chunk(self::UPSERT_CHUNK_SIZE)
            ->flatMap(fn (Collection $keys): Collection => QaAssessment::query()->whereIn('record_key', $keys)->pluck('record_key'));
        $existingCount = $existingKeys->count();
        $newKeys = $rows->pluck('record_key')->diff($existingKeys)->values();

        $summary = [
            'saved' => $rows->count(),
            'created' => $rows->count() - $existingCount,
            'updated' => $existingCount,
            'matched' => $matched,
            'unmatched' => $rows->count() - $matched,
        ];

        DB::transaction(function () use ($rows, $summary, $validated, $request): void {
            $rows->chunk(self::UPSERT_CHUNK_SIZE)->each(fn (Collection $chunk) => QaAssessment::upsert(
                $chunk->all(),
                ['record_key'],
                ['processor_id', 'processor_name', 'project_id', 'qc_name', 'report_url', 'score', 'feedback', 'source_file', 'uploaded_by', 'updated_at'],
            ));

            QaImport::query()->create([
                'source_file' => $validated['source_file'],
                'processed_count' => $summary['saved'],
                'created_count' => $summary['created'],
                'updated_count' => $summary['updated'],
                'matched_count' => $summary['matched'],
                'unmatched_count' => $summary['unmatched'],
                'uploaded_by' => $request->user()->id,
            ]);
        });

        $newKeys->chunk(self::UPSERT_CHUNK_SIZE)->each(function (Collection $keys): void {
            QaAssessment::query()
                ->with('processor')
                ->whereIn('record_key', $keys)
                ->get()
                ->each(function (QaAssessment $assessment): void {
                    $assessment->processor?->notify(new NewQaAssessment($assessment));
                });
        });

        $this->announcements->refreshCurrentMonth();

        $previousUrl = url()->previous();
        $redirectUrl = parse_url($previousUrl, PHP_URL_HOST) === $request->getHost()
            && in_array(parse_url($previousUrl, PHP_URL_PATH), ['/operations/processors', '/operations/quality-assurance'], true)
                ? $previousUrl
                : route('operations.processors');

        return redirect()->to($redirectUrl)->with('qaImportSummary', $summary);
    }
}
