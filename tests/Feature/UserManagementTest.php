<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('operations administrators can view user management', function () {
    $administrator = User::factory()->create(['role' => UserRole::Operations]);
    User::factory()->create(['name' => 'Managed User', 'n_name' => 'Managed']);

    $this->actingAs($administrator)
        ->get(route('operations.users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('operations/users')
            ->has('users', 2)
            ->has('roles', 5));
});

test('operations administrators can create an account with a profile image and role', function () {
    Storage::fake('public');
    $administrator = User::factory()->create(['role' => UserRole::Operations]);

    $response = $this->actingAs($administrator)->post(route('operations.users.store'), [
        'name' => 'Quality Reviewer',
        'n_name' => 'QR',
        'email' => 'reviewer@bees360.com',
        'password' => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
        'role' => UserRole::Reviewer->value,
        'avatar' => UploadedFile::fake()->createWithContent(
            'reviewer.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
        ),
    ]);

    $response
        ->assertRedirect(route('operations.users.index'))
        ->assertSessionHas('userMessage');

    $user = User::query()->where('email', 'reviewer@bees360.com')->firstOrFail();

    expect($user->name)->toBe('Quality Reviewer')
        ->and($user->n_name)->toBe('QR')
        ->and($user->role)->toBe(UserRole::Reviewer)
        ->and($user->is_active)->toBeTrue()
        ->and($user->avatar_path)->not->toBeNull();
    Storage::disk('public')->assertExists($user->avatar_path);
});

test('account creation validates the profile image and account fields', function () {
    $administrator = User::factory()->create(['role' => UserRole::Operations]);

    $this->actingAs($administrator)
        ->post(route('operations.users.store'), [
            'name' => '',
            'n_name' => '',
            'email' => 'invalid',
            'password' => 'short',
            'password_confirmation' => 'different',
            'role' => 'owner',
        ])
        ->assertSessionHasErrors(['name', 'n_name', 'email', 'password', 'role']);
});

test('operations administrators can create an account without a profile image', function () {
    $administrator = User::factory()->create(['role' => UserRole::Operations]);

    $this->actingAs($administrator)->post(route('operations.users.store'), [
        'name' => 'Christer John Gozon',
        'n_name' => 'Christer',
        'email' => 'christer@bees360.com',
        'password' => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
        'role' => UserRole::Processor->value,
    ])->assertRedirect(route('operations.users.index'));

    $user = User::query()->where('email', 'christer@bees360.com')->firstOrFail();

    expect($user->name)->toBe('Christer John Gozon')
        ->and($user->avatar)->toBeNull()
        ->and($user->role)->toBe(UserRole::Processor);
});

test('non operations users cannot manage accounts', function () {
    $user = User::factory()->create(['role' => UserRole::Processor]);

    $this->actingAs($user)->get(route('operations.users.index'))->assertForbidden();
});

test('deactivated accounts cannot authenticate', function () {
    $user = User::factory()->create(['is_active' => false]);

    $this->post('/login', ['email' => $user->email, 'password' => 'password']);

    $this->assertGuest();
});

test('operations administrators can deactivate and reactivate another account', function () {
    $administrator = User::factory()->create(['role' => UserRole::Operations]);
    $user = User::factory()->create();

    $this->actingAs($administrator)
        ->patch(route('operations.users.status', $user), ['is_active' => false])
        ->assertRedirect();
    expect($user->fresh()->is_active)->toBeFalse();

    $this->actingAs($administrator)
        ->patch(route('operations.users.status', $user), ['is_active' => true])
        ->assertRedirect();
    expect($user->fresh()->is_active)->toBeTrue();
});

test('operations administrators cannot deactivate their own account', function () {
    $administrator = User::factory()->create(['role' => UserRole::Operations]);

    $this->actingAs($administrator)
        ->patch(route('operations.users.status', $administrator), ['is_active' => false])
        ->assertUnprocessable();

    expect($administrator->fresh()->is_active)->toBeTrue();
});

test('an already signed in deactivated account is logged out', function () {
    $user = User::factory()->create(['is_active' => false]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});
