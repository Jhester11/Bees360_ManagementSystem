<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlatformPullSnapshot extends Model
{
    protected $fillable = [
        'report_date',
        'checkpoint',
        'active_file_name',
        'closed_file_name',
        'uploaded_by',
        'pulled_at',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date:Y-m-d',
            'pulled_at' => 'datetime',
        ];
    }

    public function entries(): HasMany
    {
        return $this->hasMany(PlatformPullEntry::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
