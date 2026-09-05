<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/settings/profile');

    $response->assertOk();
});

test('users can update their email but cannot change their Operations-managed identity', function () {
    $user = User::factory()->create(['role' => UserRole::Operations]);

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Changed Name',
            'n_name' => 'Changed Nickname',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    $user->refresh();

    expect($user->name)->not->toBe('Changed Name');
    expect($user->n_name)->not->toBe('Changed Nickname');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => $user->name,
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('identity fields sent by any account role are ignored', function (UserRole $role) {
    $user = User::factory()->create(['role' => $role]);

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Another Processor',
            'n_name' => 'Another Nickname',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    expect($user->fresh()->name)->toBe($user->name)
        ->and($user->fresh()->n_name)->toBe($user->n_name);
})->with([
    'processor' => UserRole::Processor,
    'trainer' => UserRole::Trainer,
    'quality assurance' => UserRole::Qa,
    'reviewer' => UserRole::Reviewer,
    'operations' => UserRole::Operations,
]);

test('users can upload and replace their own private profile image', function () {
    Storage::fake('local');
    Storage::fake('public');
    Storage::disk('local')->put('avatars/old.png', 'old');
    $user = User::factory()->create(['avatar_path' => 'avatars/old.png']);

    $response = $this->actingAs($user)->post('/settings/profile', [
        '_method' => 'patch',
        'email' => $user->email,
        'avatar' => UploadedFile::fake()->createWithContent(
            'new.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
        ),
    ]);

    $response->assertRedirect('/settings/profile')->assertSessionHas('userMessage');
    $user->refresh();

    Storage::disk('local')->assertExists($user->avatar_path);
    Storage::disk('local')->assertMissing('avatars/old.png');
});

test('users cannot delete their own Operations-managed account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete('/settings/profile', [
            'password' => 'password',
        ]);

    $response->assertMethodNotAllowed();
    $this->assertAuthenticatedAs($user);
    $this->assertModelExists($user);
});
