<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class DatabaseMaintenance
{
    public function run(): array
    {
        $sessions = null;
        $cache = null;
        $more = false;
        $deadline = hrtime(true) + (int) (config('maintenance.time_budget_seconds', 5) * 1_000_000_000);

        if (config('session.driver') === 'database') {
            $query = DB::connection(config('session.connection'))
                ->table(config('session.table', 'sessions'))
                ->where('last_activity', '<', now()->timestamp - ((int) config('session.lifetime', 120) * 60));
            $sessions = $this->prune($query, 'id', $deadline);
            $more = $query->exists();
        }

        $store = config('cache.stores.'.config('cache.default'));
        if (($store['driver'] ?? null) === 'database') {
            $query = DB::connection($store['connection'] ?? null)
                ->table($store['table'] ?? 'cache')
                ->where('expiration', '<', now()->timestamp);
            $cache = $this->prune($query, 'key', $deadline);
            $more = $query->exists() || $more;
        }

        return [
            'sessionsRemoved' => $sessions,
            'cacheRemoved' => $cache,
            'moreRemaining' => $more,
            'completedAt' => now('Asia/Manila')->format('M j, Y g:i A').' PHT',
        ];
    }

    private function prune(Builder $query, string $key, int $deadline): int
    {
        $removed = 0;
        // Bound each request; recheck expiration during deletion in case a row was refreshed.
        for ($batch = 0; $batch < config('maintenance.max_batches', 10) && hrtime(true) < $deadline; $batch++) {
            $ids = (clone $query)->orderBy($key)->limit(config('maintenance.batch_size', 500))->pluck($key);
            if ($ids->isEmpty()) {
                break;
            }
            $removed += (clone $query)->whereIn($key, $ids)->delete();
        }

        return $removed;
    }
}
