<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentAttemptAnswer extends Model
{
    protected $fillable = ['assessment_attempt_id', 'assessment_question_id', 'assessment_question_choice_id', 'is_correct', 'points_awarded'];

    protected function casts(): array
    {
        return ['is_correct' => 'boolean'];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(AssessmentAttempt::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(AssessmentQuestion::class, 'assessment_question_id');
    }

    public function choice(): BelongsTo
    {
        return $this->belongsTo(AssessmentQuestionChoice::class, 'assessment_question_choice_id');
    }
}
