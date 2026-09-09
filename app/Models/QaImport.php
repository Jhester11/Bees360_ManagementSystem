<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QaImport extends Model
{
    protected $fillable = [
        'source_file',
        'processed_count',
        'created_count',
        'updated_count',
        'matched_count',
        'unmatched_count',
        'uploaded_by',
    ];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
