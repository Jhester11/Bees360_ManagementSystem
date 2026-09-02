<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QueueProcessorEntry extends Model
{
    protected $fillable = [
        'batch',
        'processor_name',
        'general_exterior',
        'four_point',
        'other',
        'total',
    ];

    public function queueSnapshot(): BelongsTo
    {
        return $this->belongsTo(QueueSnapshot::class);
    }
}
