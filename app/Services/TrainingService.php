<?php

namespace App\Services;

use App\Models\AssessmentAttempt;
use App\Models\TrainingAssignment;
use App\Models\TrainingAssignmentUser;
use App\Models\TrainingAuditLog;
use App\Models\TrainingMaterial;
use App\Models\User;
use App\Notifications\Bees360Announcement;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TrainingService
{
    public function audit(string $event, object $subject, array $metadata = []): void
    {
        TrainingAuditLog::create(['actor_id' => auth()->id(), 'event' => $event, 'subject_type' => $subject::class, 'subject_id' => $subject->id, 'metadata' => $metadata]);
    }

    public function recipients(array $data): Collection
    {
        $query = User::query()->where('is_active', true);

        return match ($data['scope_type']) {
            'users' => $query->whereIn('id', $data['user_ids'] ?? [])->get(),
            'role' => $query->where('role', $data['scope_value'])->get(),
            'batch' => $query->where('batch', (int) $data['scope_value'])->get(),
            default => $query->get(),
        };
    }

    public function assign(array $data, User $trainer): TrainingAssignment
    {
        return DB::transaction(function () use ($data, $trainer) {
            $material = TrainingMaterial::with('assessment')->findOrFail($data['training_material_id']);
            $assignment = TrainingAssignment::create([
                'training_material_id' => $material->id, 'assessment_id' => $material->assessment?->id,
                'assigned_by' => $trainer->id, 'name' => $data['name'], 'scope_type' => $data['scope_type'],
                'scope_value' => $data['scope_value'] ?? null, 'due_at' => $data['due_at'] ?? null, 'is_active' => true,
            ]);
            foreach ($this->recipients($data) as $user) {
                TrainingAssignmentUser::firstOrCreate(
                    ['training_assignment_id' => $assignment->id, 'user_id' => $user->id],
                    ['status' => 'not_started', 'assigned_at' => now()],
                );
                $user->notify(new Bees360Announcement([
                    'type' => 'training_assigned', 'title' => 'New training assigned',
                    'message' => $material->title, 'url' => route('training.my'),
                ]));
            }
            $this->audit('training_assigned', $assignment, ['users' => $assignment->users()->count()]);

            return $assignment;
        });
    }

    public function submit(AssessmentAttempt $attempt, array $answers): AssessmentAttempt
    {
        if ($attempt->submitted_at) {
            abort(409, 'This attempt has already been submitted.');
        }

        return DB::transaction(function () use ($attempt, $answers) {
            $attempt->load('assessment.questions.choices', 'assignmentUser.progress', 'user');
            if ($attempt->assessment->time_limit_minutes && now()->greaterThan($attempt->started_at->copy()->addMinutes($attempt->assessment->time_limit_minutes)->addSeconds(30))) {
                throw ValidationException::withMessages(['assessment' => 'The assessment time limit has expired.']);
            }
            $score = 0;
            $maximum = 0;
            foreach ($attempt->assessment->questions as $question) {
                $maximum += $question->points;
                $choice = $question->choices->firstWhere('id', (int) ($answers[$question->id] ?? 0));
                $correct = (bool) $choice?->is_correct;
                $attempt->answers()->create([
                    'assessment_question_id' => $question->id,
                    'assessment_question_choice_id' => $choice?->id,
                    'is_correct' => $correct, 'points_awarded' => $correct ? $question->points : 0,
                ]);
                if ($correct) {
                    $score += $question->points;
                }
            }
            $percentage = $maximum ? round($score / $maximum * 100, 2) : 0;
            $attempt->update(['score' => $score, 'maximum_score' => $maximum, 'percentage' => $percentage,
                'passed' => $percentage >= (float) $attempt->assessment->passing_score, 'submitted_at' => now(),
                'duration_seconds' => $attempt->started_at->diffInSeconds(now())]);
            $assignmentUser = TrainingAssignmentUser::with('progress')->findOrFail($attempt->training_assignment_user_id);
            $progressComplete = (float) ($assignmentUser->progress?->progress_percentage ?? 0) >= 100;
            $assignmentUser->update([
                'status' => $attempt->passed && $progressComplete ? 'completed' : ($attempt->passed ? 'assessment_passed' : 'failed'),
                'completed_at' => $attempt->passed && $progressComplete ? now() : null,
            ]);
            $attempt->user->notify(new Bees360Announcement([
                'type' => $attempt->passed ? 'assessment_passed' : 'assessment_failed',
                'title' => $attempt->passed ? 'Assessment passed' : 'Assessment needs another try',
                'message' => $attempt->assessment->name.' · '.$percentage.'%',
                'url' => route('training.attempts.result', $attempt),
            ]));

            return $attempt->fresh();
        });
    }
}
