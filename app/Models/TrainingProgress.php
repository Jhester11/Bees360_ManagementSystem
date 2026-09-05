<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingProgress extends Model
{
    protected $table = 'training_progress';

    protected $fillable = ['training_assignment_user_id', 'last_read_page', 'total_pages', 'progress_percentage', 'started_at', 'reading_completed_at'];

    protected function casts(): array
    {
        return ['progress_percentage' => 'decimal:2', 'started_at' => 'datetime', 'reading_completed_at' => 'datetime'];
    }

    public function assignmentUser(): BelongsTo
    {
        return $this->belongsTo(TrainingAssignmentUser::class);
    }
}
