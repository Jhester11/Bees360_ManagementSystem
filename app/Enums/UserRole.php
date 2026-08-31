<?php

namespace App\Enums;

enum UserRole: string
{
    case Operations = 'operations';
    case Trainer = 'trainer';
    case Qa = 'qa';
    case User = 'user';
}
