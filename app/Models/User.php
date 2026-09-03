<?php

namespace App\Models;

use App\Enums\UserRole;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $attributes = [
        'is_active' => true,
        'role' => UserRole::Processor,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'n_name',
        'email',
        'password',
        'role',
        'avatar_path',
        'is_active',
    ];

    protected $appends = ['avatar'];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'is_active' => 'boolean',
        ];
    }

    public function getAvatarAttribute(): ?string
    {
        return $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null;
    }

    public function queueSnapshots(): HasMany
    {
        return $this->hasMany(QueueSnapshot::class, 'uploaded_by');
    }

    public function platformPullSnapshots(): HasMany
    {
        return $this->hasMany(PlatformPullSnapshot::class, 'uploaded_by');
    }

    public function cstProcessorMetrics(): HasMany
    {
        return $this->hasMany(CstProcessorMetric::class, 'uploaded_by');
    }

    public function qaAssessments(): HasMany
    {
        return $this->hasMany(QaAssessment::class, 'processor_id');
    }

    public function uploadedQaAssessments(): HasMany
    {
        return $this->hasMany(QaAssessment::class, 'uploaded_by');
    }
}
