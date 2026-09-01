<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportEntry extends Model
{
    protected $fillable = [
        'report_date',
        'source',
        'batch',
        'processor_name',
        'project_id',
        'insured_by',
        'inspection_type',
        'report_category',
        'assembled_at',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date:Y-m-d',
            'assembled_at' => 'datetime',
        ];
    }
}
