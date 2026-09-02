<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

test('authenticated users save only approved processors for the current PH reporting day', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-02 10:00:00', 'Asia/Manila'));
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/operations/queue-monitor', [
        'report_date' => '2026-09-01',
        'checkpoint' => 'start',
        'file_name' => 'monitor.xlsx',
        'total_rows' => 12,
        'entries' => [
            ['name' => 'Jhun Cervantes', 'batch' => 1, 'general_exterior' => 3, 'four_point' => 2, 'other' => 0, 'total' => 999],
            ['name' => 'Allan Layug', 'batch' => 2, 'general_exterior' => 2, 'four_point' => 1, 'other' => 0, 'total' => 3],
            ['name' => 'Person Outside Roster', 'batch' => 3, 'general_exterior' => 4, 'four_point' => 0, 'other' => 0, 'total' => 4],
            ['name' => 'Chrismer Flores', 'batch' => 1, 'general_exterior' => 1, 'four_point' => 0, 'other' => 0, 'total' => 1],
        ],
    ]);

    $response->assertRedirect(route('operations.queue-monitor'));
    $this->assertDatabaseHas('queue_snapshots', [
        'report_date' => '2026-09-02',
        'checkpoint' => 'start',
        'file_name' => 'monitor.xlsx',
        'total_rows' => 12,
        'matched_rows' => 8,
        'ignored_rows' => 4,
        'uploaded_by' => $user->id,
    ]);
    $this->assertDatabaseHas('queue_processor_entries', [
        'batch' => 1,
        'processor_name' => 'Jhun Cervantes',
        'general_exterior' => 3,
        'four_point' => 2,
        'total' => 5,
    ]);
    $this->assertDatabaseHas('queue_processor_entries', ['batch' => 2, 'processor_name' => 'Allan Layug', 'total' => 3]);
    $this->assertDatabaseMissing('queue_processor_entries', ['processor_name' => 'Person Outside Roster']);
    $this->assertDatabaseMissing('queue_processor_entries', ['processor_name' => 'Chrismer Flores']);

    $this->get(route('operations.queue-monitor'))->assertInertia(fn (Assert $page) => $page
        ->component('operations/queue-monitor')
        ->has('savedSnapshots', 1)
        ->where('savedSnapshots.0.matchedRows', 8)
        ->where('savedSnapshots.0.processorRows.0.name', 'Jhun Cervantes'));
});

test('saving the same reporting checkpoint replaces its previous queue data', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-02 12:00:00', 'Asia/Manila'));
    $user = User::factory()->create();
    $payload = [
        'report_date' => '2026-09-02',
        'checkpoint' => '11am',
        'file_name' => 'first.xlsx',
        'total_rows' => 4,
        'entries' => [
            ['name' => 'Jhun Cervantes', 'batch' => 1, 'general_exterior' => 4, 'four_point' => 0, 'other' => 0, 'total' => 4],
        ],
    ];
    $this->actingAs($user)->post('/operations/queue-monitor', $payload);

    $response = $this->actingAs($user)->post('/operations/queue-monitor', [
        ...$payload,
        'file_name' => 'replacement.xlsx',
        'total_rows' => 2,
        'entries' => [
            ['name' => 'Allan Layug', 'batch' => 2, 'general_exterior' => 1, 'four_point' => 1, 'other' => 0, 'total' => 2],
        ],
    ]);

    $response->assertRedirect(route('operations.queue-monitor'));
    $this->assertDatabaseCount('queue_snapshots', 1);
    $this->assertDatabaseCount('queue_processor_entries', 1);
    $this->assertDatabaseHas('queue_snapshots', ['file_name' => 'replacement.xlsx', 'matched_rows' => 2]);
    $this->assertDatabaseHas('queue_processor_entries', ['processor_name' => 'Allan Layug', 'total' => 2]);
    $this->assertDatabaseMissing('queue_processor_entries', ['processor_name' => 'Jhun Cervantes']);
});

test('queue snapshot validation rejects an unknown checkpoint', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/operations/queue-monitor', [
        'report_date' => '2026-09-02',
        'checkpoint' => '9am',
        'file_name' => 'monitor.xlsx',
        'total_rows' => 0,
        'entries' => [],
    ]);

    $response->assertSessionHasErrors(['checkpoint']);
    $this->assertDatabaseCount('queue_snapshots', 0);
});

test('guests cannot save queue snapshots', function () {
    $this->post('/operations/queue-monitor', [])->assertRedirect('/login');
});
