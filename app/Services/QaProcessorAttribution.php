<?php

namespace App\Services;

use App\Models\QaAssessment;
use App\Models\ReportEntry;
use App\Models\User;
use Illuminate\Support\Collection;

class QaProcessorAttribution
{
    public function __construct(private readonly ActiveProcessorRoster $roster) {}

    /** Resolve display ownership without rewriting the imported evidence. */
    public function resolve(Collection $assessments): array
    {
        $processors = $this->roster->all();
        $byId = $processors->keyBy('id');
        $nameMatches = [];
        $matches = function (string $name) use ($processors, &$nameMatches): Collection {
            return $nameMatches[$name] ??= $processors->filter(
                fn (User $processor): bool => $this->roster->match($name, collect([$processor])) !== null,
            )->values();
        };
        $production = ReportEntry::query()
            ->whereIn('project_id', $assessments->pluck('project_id')->filter()->unique())
            ->get(['project_id', 'processor_name', 'report_date'])
            ->groupBy('project_id');
        $resolved = collect();
        $unresolved = collect();
        $recovered = 0;

        foreach ($assessments as $assessment) {
            $named = $matches($assessment->processor_name);
            $linked = $byId->get($assessment->processor_id);
            $entries = $production->get($assessment->project_id, collect())
                ->filter(fn (ReportEntry $entry): bool => $entry->report_date->lte($assessment->assessment_date));
            $projectMatches = $entries->flatMap(fn (ReportEntry $entry): Collection => $matches($entry->processor_name))->unique('id')->values();
            $unknownProduction = $entries->contains(fn (ReportEntry $entry): bool => $matches($entry->processor_name)->isEmpty());
            $direct = collect([$linked])->filter()->merge($named)->unique('id')->values();
            $reason = null;
            $account = null;
            if ($direct->count() > 1 || $projectMatches->count() > 1) {
                $reason = 'Multiple processors match this assessment or its production records.';
            } elseif ($direct->count() === 1 && $projectMatches->count() === 1 && $direct->first()->id !== $projectMatches->first()->id) {
                $reason = 'The imported processor conflicts with the project production records.';
            } elseif ($direct->count() === 1) {
                $account = $direct->first();
            } elseif ($projectMatches->count() === 1 && ! $unknownProduction) {
                $account = $projectMatches->first();
                $recovered++;
            } else {
                $reason = 'No unique active processor could be verified from the name or project records.';
            }

            if ($account === null) {
                $unresolved->push([
                    'id' => $assessment->id,
                    'date' => $assessment->assessment_date->format('Y-m-d'),
                    'projectId' => $assessment->project_id,
                    'score' => (float) $assessment->score,
                    'reason' => $reason,
                ]);
                continue;
            }

            $record = clone $assessment;
            $record->processor_id = $account->id;
            $record->processor_name = $account->name;
            $record->setRelation('processor', $account);
            $resolved->push($record);
        }

        return ['assessments' => $resolved, 'unresolved' => $unresolved, 'recovered' => $recovered];
    }
}
