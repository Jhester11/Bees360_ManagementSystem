<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingSubject extends Model
{
    protected $fillable = ['name'];

    public function topics(): HasMany
    {
        return $this->hasMany(TrainingTopic::class);
    }
}
