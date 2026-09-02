<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformPullEntry extends Model
{
    protected $fillable = [
        'source',
        'batch',
        'processor_name',
        'general_exterior',
        'four_point',
    ];

    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(PlatformPullSnapshot::class, 'platform_pull_snapshot_id');
    }
}
