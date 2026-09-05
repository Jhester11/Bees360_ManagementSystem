<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Http\Requests\Training\SubmitAssessmentRequest;
use App\Models\Assessment;
use App\Models\AssessmentAttempt;
use App\Models\TrainingAssignmentUser;
use App\Services\TrainingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AssessmentAttemptController extends Controller
{
    public function __construct(private TrainingService $service) {}

    public function take(Request $r, Assessment $assessment)
    {
        $au = TrainingAssignmentUser::with('progress')->where('user_id', $r->user()->id)->whereHas('assignment', fn ($q) => $q->where('assessment_id', $assessment->id))->firstOrFail();
        if (! $assessment->is_published) {
            abort(404);
        }if ($assessment->require_training_completion && (float) ($au->progress?->progress_percentage ?? 0) < 100) {
            throw ValidationException::withMessages(['assessment' => 'Complete the training book before taking this assessment.']);
        }$completed = $au->attempts()->whereNotNull('submitted_at')->count();
        if ($completed >= $assessment->maximum_attempts) {
            throw ValidationException::withMessages(['assessment' => 'Maximum attempts reached.']);
        }$attempt = $au->attempts()->whereNull('submitted_at')->where('assessment_id', $assessment->id)->first();
        if (! $attempt) {
            $attempt = DB::transaction(fn () => AssessmentAttempt::create(['training_assignment_user_id' => $au->id, 'assessment_id' => $assessment->id, 'user_id' => $r->user()->id, 'attempt_number' => $completed + 1, 'started_at' => now()]));
        }$questions = $assessment->questions()->with(['choices' => fn ($q) => $q->select('id', 'assessment_question_id', 'choice', 'position')])->get();
        if ($assessment->randomize_questions) {
            $questions = $questions->shuffle()->values();
        }if ($assessment->randomize_choices) {
            $questions->each(fn ($q) => $q->setRelation('choices', $q->choices->shuffle()->values()));
        }

        return Inertia::render('training/assessment-take', ['assessment' => $assessment, 'attempt' => $attempt, 'questions' => $questions]);
    }

    public function submit(SubmitAssessmentRequest $r, AssessmentAttempt $attempt)
    {
        abort_unless($attempt->user_id === $r->user()->id, 403);
        $attempt = $this->service->submit($attempt, $r->validated('answers'));

        return to_route('training.attempts.result', $attempt);
    }

    public function result(Request $r, AssessmentAttempt $attempt)
    {
        abort_unless($attempt->user_id === $r->user()->id || in_array($r->user()->role->value, ['trainer', 'operations']), 403);
        $attempt->load(['assessment.material', 'answers.question.choices', 'answers.choice']);
        if ($attempt->assessment->show_correct_answers) {
            $attempt->answers->each(fn ($a) => $a->question->choices->each->makeVisible('is_correct'));
        }

        return Inertia::render('training/assessment-result', ['attempt' => $attempt]);
    }
}
