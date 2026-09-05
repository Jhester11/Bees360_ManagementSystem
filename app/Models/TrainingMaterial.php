<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class TrainingMaterial extends Model
{
    use SoftDeletes;

    protected $fillable = ['parent_id', 'training_subject_id', 'training_topic_id', 'created_by', 'title', 'description', 'category', 'difficulty', 'version', 'published_at', 'estimated_reading_minutes', 'cover_path', 'pdf_path', 'pdf_size', 'total_pages', 'status', 'assessment_required', 'require_retraining'];

    protected function casts(): array
    {
        return ['published_at' => 'date', 'assessment_required' => 'boolean', 'require_retraining' => 'boolean'];
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(TrainingSubject::class, 'training_subject_id');
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(TrainingTopic::class, 'training_topic_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function audiences(): HasMany
    {
        return $this->hasMany(TrainingMaterialAudience::class);
    }

    public function assessment(): HasOne
    {
        return $this->hasOne(Assessment::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TrainingAssignment::class);
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->role->value !== 'processor') {
            return $query;
        }

        return $query->whereHas('audiences', fn (Builder $audiences) => $audiences->whereIn('audience', ['processor', 'all']));
    }
}
