<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQaAssessmentsRequest;
use App\Models\QaAssessment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QaAssessmentImportController extends Controller
{
    public function __invoke(StoreQaAssessmentsRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $users = User::query()->get(['id', 'name', 'n_name']);
        $now = now();
        $matched = 0;

        $rows = collect($validated['assessments'])->map(function (array $assessment) use ($users, $request, $validated, $now, &$matched): array {
            $processor = $this->matchProcessor($assessment['processor_name'], $users);
            $matched += $processor === null ? 0 : 1;

            $processorName = $processor?->name ?? trim($assessment['processor_name']);

            return [
                ...$assessment,
                'record_key' => hash('sha256', trim($assessment['project_id']).'|'.$assessment['assessment_date']),
                'processor_id' => $processor?->id,
                'processor_name' => $processorName,
                'project_id' => filled($assessment['project_id'] ?? null) ? trim($assessment['project_id']) : null,
                'qc_name' => filled($assessment['qc_name'] ?? null) ? trim($assessment['qc_name']) : null,
                'report_url' => filled($assessment['report_url'] ?? null) ? trim($assessment['report_url']) : null,
                'feedback' => json_encode(array_values(array_filter($assessment['feedback'] ?? []))),
                'source_file' => $validated['source_file'],
                'uploaded_by' => $request->user()->id,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        });

        $existingCount = QaAssessment::query()->whereIn('record_key', $rows->pluck('record_key'))->count();

        DB::transaction(fn () => QaAssessment::upsert(
            $rows->all(),
            ['record_key'],
            ['processor_id', 'processor_name', 'project_id', 'qc_name', 'report_url', 'score', 'feedback', 'source_file', 'uploaded_by', 'updated_at'],
        ));

        return to_route('operations.processors')->with('qaImportSummary', [
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
