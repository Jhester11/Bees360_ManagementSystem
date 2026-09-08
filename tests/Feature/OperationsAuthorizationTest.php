<?php

use App\Enums\UserRole;
use App\Models\User;

$processorReadRequests = [
    'month-to-date reports' => '/operations/mtd',
    'CST reports' => '/operations/cst-reports',
    'report comparison' => '/operations/report-comparison',
    'report imports' => '/operations/reports',
    'platform pulls' => '/operations/reports/platform-pulls',
    'processor performance' => '/operations/processors',
    'queue monitor' => '/operations/queue-monitor',
    'training' => '/operations/training',
    'quality assurance' => '/operations/quality-assurance',
];

test('processors cannot open staff operations pages', function (string $uri) {
    $processor = User::factory()->create(['role' => UserRole::Processor]);

    $this->actingAs($processor)->get($uri)->assertForbidden();
})->with($processorReadRequests);

$operationsOnlyRequests = [];

foreach ([UserRole::Processor, UserRole::Trainer, UserRole::Qa, UserRole::Reviewer] as $role) {
    foreach ([
        'import reports' => '/operations/reports/import',
        'import CST metrics' => '/operations/processors/cst-import',
        'save queue snapshots' => '/operations/queue-monitor',
        'create accounts' => '/operations/users',
    ] as $action => $uri) {
        $operationsOnlyRequests[$role->value.' cannot '.$action] = [$role, $uri];
    }
}

test('only Operations accounts can modify management data', function (UserRole $role, string $uri) {
    $user = User::factory()->create(['role' => $role]);

    $this->actingAs($user)->post($uri)->assertForbidden();
})->with($operationsOnlyRequests);

test('non-QA staff cannot import QA assessments', function (UserRole $role) {
    $user = User::factory()->create(['role' => $role]);

    $this->actingAs($user)
        ->post('/operations/processors/qa-import')
        ->assertForbidden();
})->with([
    'processor' => UserRole::Processor,
    'trainer' => UserRole::Trainer,
    'reviewer' => UserRole::Reviewer,
]);

test('report imports are rate limited per authenticated account', function () {
    User::factory()->count(40)->create();
    $operations = User::factory()->create(['role' => UserRole::Operations]);

    foreach (range(1, 10) as $attempt) {
        $this->actingAs($operations)
            ->post('/operations/reports/import')
            ->assertSessionHasErrors('entries');
    }

    $this->actingAs($operations)
        ->post('/operations/reports/import')
        ->assertTooManyRequests();
});
