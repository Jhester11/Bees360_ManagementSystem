<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingAuditLog extends Model
{
    protected $fillable = ['actor_id', 'event', 'subject_type', 'subject_id', 'metadata'];

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }
}
