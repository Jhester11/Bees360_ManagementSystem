<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingAssignment extends Model
{
    protected $fillable = ['training_material_id', 'assessment_id', 'assigned_by', 'name', 'scope_type', 'scope_value', 'due_at', 'is_active'];

    protected function casts(): array
    {
        return ['due_at' => 'datetime', 'is_active' => 'boolean'];
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(TrainingMaterial::class, 'training_material_id');
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function users(): HasMany
    {
        return $this->hasMany(TrainingAssignmentUser::class);
    }
}
