<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class Bees360Announcement extends Notification
{
    use Queueable;

    /** @param array<string, int|float|string|null> $data */
    public function __construct(private readonly array $data) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, int|float|string|null> */
    public function toArray(object $notifiable): array
    {
        return $this->data;
    }
}
