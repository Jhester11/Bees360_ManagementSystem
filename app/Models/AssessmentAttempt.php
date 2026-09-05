<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssessmentAttempt extends Model
{
    protected $fillable = ['training_assignment_user_id', 'assessment_id', 'user_id', 'attempt_number', 'score', 'maximum_score', 'percentage', 'passed', 'started_at', 'submitted_at', 'duration_seconds'];

    protected function casts(): array
    {
        return ['percentage' => 'decimal:2', 'passed' => 'boolean', 'started_at' => 'datetime', 'submitted_at' => 'datetime'];
    }

    public function assignmentUser(): BelongsTo
    {
        return $this->belongsTo(TrainingAssignmentUser::class);
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(AssessmentAttemptAnswer::class);
    }
}
