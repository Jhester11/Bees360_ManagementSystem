<?php

namespace App\Enums;

enum UserRole: string
{
    case Operations = 'operations';
    case Processor = 'processor';
    case Trainer = 'trainer';
    case Qa = 'qa';
    case Reviewer = 'reviewer';
}
