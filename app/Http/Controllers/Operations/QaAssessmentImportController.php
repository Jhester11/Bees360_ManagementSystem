<?php

namespace App\Http\Controllers\Operations;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQaAssessmentsRequest;
use App\Models\QaAssessment;
use App\Models\User;
use App\Notifications\NewQaAssessment;
use App\Services\PerformanceAnnouncementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QaAssessmentImportController extends Controller
{
    private const UPSERT_CHUNK_SIZE = 500;

    public function __construct(private readonly PerformanceAnnouncementService $announcements) {}

    public function __invoke(StoreQaAssessmentsRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $users = User::query()->where('role', UserRole::Processor->value)->get(['id', 'name', 'n_name']);
        $now = now();
        $matched = 0;

        $rows = collect($validated['assessments'])->map(function (array $assessment) use ($users, $request, $validated, $now): array {
            $processor = $this->matchProcessor($assessment['processor_name'], $users);

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
        })->reverse()->unique('record_key')->reverse()->values();

        $matched = $rows->whereNotNull('processor_id')->count();

        $existingKeys = QaAssessment::query()->whereIn('record_key', $rows->pluck('record_key'))->pluck('record_key');
        $existingCount = $existingKeys->count();
        $newKeys = $rows->pluck('record_key')->diff($existingKeys)->values();

        DB::transaction(function () use ($rows): void {
            $rows->chunk(self::UPSERT_CHUNK_SIZE)->each(fn (Collection $chunk) => QaAssessment::upsert(
                $chunk->all(),
                ['record_key'],
                ['processor_id', 'processor_name', 'project_id', 'qc_name', 'report_url', 'score', 'feedback', 'source_file', 'uploaded_by', 'updated_at'],
            ));
        });

        QaAssessment::query()
            ->with('processor')
            ->whereIn('record_key', $newKeys)
            ->get()
            ->each(function (QaAssessment $assessment): void {
                $assessment->processor?->notify(new NewQaAssessment($assessment));
            });

        $this->announcements->refreshCurrentMonth();

        $previousUrl = url()->previous();
        $redirectUrl = parse_url($previousUrl, PHP_URL_HOST) === $request->getHost()
            && in_array(parse_url($previousUrl, PHP_URL_PATH), ['/operations/processors', '/operations/quality-assurance'], true)
                ? $previousUrl
                : route('operations.processors');

        return redirect()->to($redirectUrl)->with('qaImportSummary', [
            'saved' => $rows->count(),
            'created' => $rows->count() - $existingCount,
            'updated' => $existingCount,
            'matched' => $matched,
            'unmatched' => $rows->count() - $matched,
        ]);
    }

    private function matchProcessor(string $name, Collection $users): ?User
    {
        $needle = $this->normalize($name);
        $needleWords = collect(explode(' ', $needle))->filter(fn (string $word) => mb_strlen($word) > 1);

        return $users->first(function (User $user) use ($needle, $needleWords): bool {
            $fullName = $this->normalize($user->name);
            $nickname = $this->normalize($user->n_name ?? '');
            $fullNameWords = collect(explode(' ', $fullName));

            return $needle === $fullName
                || ($nickname !== '' && $needle === $nickname)
                || ($needleWords->count() >= 2 && $needleWords->every(fn (string $word) => $fullNameWords->contains($word)));
        });
    }

    private function normalize(string $value): string
    {
        return Str::of($value)->lower()->replaceMatches('/[^a-z0-9]+/', ' ')->squish()->value();
    }
}
