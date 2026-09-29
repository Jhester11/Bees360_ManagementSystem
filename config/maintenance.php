<?php

return [
    // Use a shared store so concurrent requests coordinate across app processes.
    'lock_store' => env('MAINTENANCE_LOCK_STORE', 'database'),
    'lock_seconds' => 300,
    'batch_size' => 500,
    'max_batches' => 10,
    'time_budget_seconds' => 5,
];
