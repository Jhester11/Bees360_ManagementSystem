<?php

namespace App\Notifications;

use App\Models\QaAssessment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewQaAssessment extends Notification
{
    use Queueable;

    public function __construct(private readonly QaAssessment $assessment) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, int|float|string|null> */
    public function toArray(object $notifiable): array
    {
        return [
            'assessment_id' => $this->assessment->id,
            'project_id' => $this->assessment->project_id,
            'score' => (float) $this->assessment->score,
            'assessment_date' => $this->assessment->assessment_date->toDateString(),
            'title' => 'New QA result available',
            'message' => 'Your QA result'.($this->assessment->project_id ? ' for project '.$this->assessment->project_id : '').' is ready to review.',
            'href' => '/dashboard?month='.$this->assessment->assessment_date->format('Y-m').'#qa-history',
        ];
    }
}
