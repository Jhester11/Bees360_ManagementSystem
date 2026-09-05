<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingTopic extends Model
{
    protected $fillable = ['training_subject_id', 'name'];

    public function subject(): BelongsTo
    {
        return $this->belongsTo(TrainingSubject::class, 'training_subject_id');
    }
}
