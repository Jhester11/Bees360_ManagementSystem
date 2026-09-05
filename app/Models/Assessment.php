<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assessment extends Model
{
    protected $fillable = ['training_material_id', 'created_by', 'name', 'description', 'passing_score', 'time_limit_minutes', 'maximum_attempts', 'randomize_questions', 'randomize_choices', 'show_score', 'show_correct_answers', 'require_training_completion', 'due_at', 'is_published'];

    protected function casts(): array
    {
        return ['passing_score' => 'decimal:2', 'randomize_questions' => 'boolean', 'randomize_choices' => 'boolean', 'show_score' => 'boolean', 'show_correct_answers' => 'boolean', 'require_training_completion' => 'boolean', 'is_published' => 'boolean', 'due_at' => 'datetime'];
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(TrainingMaterial::class, 'training_material_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(AssessmentQuestion::class)->orderBy('position');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TrainingAssignment::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(AssessmentAttempt::class);
    }
}
