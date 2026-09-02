<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QueueSnapshot extends Model
{
    protected $fillable = [
        'report_date',
        'checkpoint',
        'file_name',
        'total_rows',
        'matched_rows',
        'ignored_rows',
        'uploaded_by',
        'checked_at',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date:Y-m-d',
            'checked_at' => 'datetime',
        ];
    }

    public function processorEntries(): HasMany
    {
        return $this->hasMany(QueueProcessorEntry::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
