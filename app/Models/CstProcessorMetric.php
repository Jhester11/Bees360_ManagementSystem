<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CstProcessorMetric extends Model
{
    protected $fillable = [
        'report_date',
        'processor_name',
        'general_exterior',
        'four_point',
        'qc_score',
        'qc_reviews',
        'source_file',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date:Y-m-d',
            'qc_score' => 'decimal:2',
        ];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
