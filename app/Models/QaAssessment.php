<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QaAssessment extends Model
{
    protected $fillable = [
        'record_key',
        'assessment_date',
        'processor_id',
        'processor_name',
        'project_id',
        'qc_name',
        'report_url',
        'score',
        'feedback',
        'source_file',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return ['assessment_date' => 'date:Y-m-d', 'score' => 'decimal:2', 'feedback' => 'array'];
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processor_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
