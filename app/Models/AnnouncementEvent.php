<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnnouncementEvent extends Model
{
    protected $fillable = ['event_key', 'type'];
}
