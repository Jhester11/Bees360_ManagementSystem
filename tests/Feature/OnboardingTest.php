<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('a new account receives the onboarding flag in shared page data', function () {
    $user = User::factory()->create(['onboarding_completed_at' => null]);

    $this->actingAs($user)->get('/settings/profile')->assertOk()->assertInertia(
        fn (Assert $page) => $page->where('auth.user.onboarding_completed_at', null),
    );
});

test('a new account is sent to the dashboard with onboarding pending after its first login', function () {
    $user = User::factory()->create(['onboarding_completed_at' => null]);

    $login = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticatedAs($user);
    $login->assertRedirect(route('dashboard', absolute: false));
    $this->get(route('dashboard'))->assertOk()->assertInertia(
        fn (Assert $page) => $page->where('auth.user.onboarding_completed_at', null),
    );
});

test('an authenticated user can complete onboarding', function () {
    $user = User::factory()->create(['onboarding_completed_at' => null]);

    $this->actingAs($user)->post(route('onboarding.complete'))->assertRedirect();

    expect($user->fresh()->onboarding_completed_at)->not->toBeNull();
});

test('guests cannot complete onboarding', function () {
    $this->post(route('onboarding.complete'))->assertRedirect(route('login'));
});
