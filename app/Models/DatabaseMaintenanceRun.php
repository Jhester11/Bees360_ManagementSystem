<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DatabaseMaintenanceRun extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'status', 'result', 'started_at', 'finished_at'];

    protected function casts(): array
    {
        return ['result' => 'array', 'started_at' => 'immutable_datetime', 'finished_at' => 'immutable_datetime'];
    }
}
