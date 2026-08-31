<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/dashboard')->assertOk();
});

test('authenticated users can open an operations module', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/operations/reports')->assertOk();
});

test('operations routes return 404 for an unknown module', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/operations/unknown')->assertNotFound();
});
