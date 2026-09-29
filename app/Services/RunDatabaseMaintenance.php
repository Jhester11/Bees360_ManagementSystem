<?php

namespace App\Services;

use App\Models\DatabaseMaintenanceRun;
use Illuminate\Support\Facades\Cache;

class RunDatabaseMaintenance
{
    public function __construct(private readonly DatabaseMaintenance $maintenance) {}

    /** Null means another request owns the maintenance lock. */
    public function run(int $userId): ?DatabaseMaintenanceRun
    {
        $lock = Cache::store(config('maintenance.lock_store'))->lock('database-maintenance', config('maintenance.lock_seconds'));
        if (! $lock->get()) {
            return null;
        }

        try {
            // A previous process may have exited before recording its final status.
            DatabaseMaintenanceRun::query()->where('status', 'running')
                ->where('started_at', '<=', now()->subSeconds(config('maintenance.lock_seconds')))
                ->update(['status' => 'interrupted', 'finished_at' => now()]);

            $run = DatabaseMaintenanceRun::create([
                'user_id' => $userId, 'status' => 'running', 'started_at' => now(),
            ]);

            try {
                $result = $this->maintenance->run();
                $run->update([
                    'status' => $result['moreRemaining'] ? 'partial' : 'completed',
                    'result' => $result, 'finished_at' => now(),
                ]);
            } catch (\Throwable $exception) {
                $run->update(['status' => 'failed', 'finished_at' => now()]);
                throw $exception;
            }

            return $run;
        } finally {
            $lock->release();
        }
    }
}
