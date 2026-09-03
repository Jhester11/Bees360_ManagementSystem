<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
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

test('operations administrators can update account details and replace the profile image', function () {
    Storage::fake('public');
    Storage::disk('public')->put('avatars/old.png', 'old-image');
    $administrator = User::factory()->create(['role' => UserRole::Operations]);
    $user = User::factory()->create(['avatar_path' => 'avatars/old.png']);

    $response = $this->actingAs($administrator)->post(route('operations.users.update', $user), [
        '_method' => 'patch',
        'name' => 'Updated Full Name',
        'n_name' => 'Updated Nick',
        'email' => 'updated@bees360.com',
        'password' => '',
        'password_confirmation' => '',
        'role' => UserRole::Trainer->value,
        'avatar' => UploadedFile::fake()->createWithContent(
            'updated.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
        ),
    ]);

    $response->assertRedirect()->assertSessionHas('userMessage');
    $user->refresh();

    expect($user->name)->toBe('Updated Full Name')
        ->and($user->n_name)->toBe('Updated Nick')
        ->and($user->email)->toBe('updated@bees360.com')
        ->and($user->role)->toBe(UserRole::Trainer)
        ->and($user->avatar_path)->not->toBe('avatars/old.png');
    Storage::disk('public')->assertMissing('avatars/old.png');
    Storage::disk('public')->assertExists($user->avatar_path);
});

test('deleting an account removes its profile image and all connected data', function () {
    Storage::fake('public');
    Storage::disk('public')->put('avatars/delete-me.png', 'profile-image');
    $administrator = User::factory()->create(['role' => UserRole::Operations]);
    $user = User::factory()->create(['avatar_path' => 'avatars/delete-me.png']);
    $queueSnapshotId = DB::table('queue_snapshots')->insertGetId([
        'report_date' => '2026-09-03',
        'checkpoint' => '12:00 PM',
        'file_name' => 'queue.xlsx',
        'total_rows' => 1,
        'matched_rows' => 1,
        'ignored_rows' => 0,
        'uploaded_by' => $user->id,
        'checked_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('queue_processor_entries')->insert([
        'queue_snapshot_id' => $queueSnapshotId,
        'batch' => 1,
        'processor_name' => 'Processor',
        'general_exterior' => 1,
        'four_point' => 0,
        'other' => 0,
        'total' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $platformSnapshotId = DB::table('platform_pull_snapshots')->insertGetId([
        'report_date' => '2026-09-03',
        'checkpoint' => '12:00 PM',
        'active_file_name' => 'active.xlsx',
        'closed_file_name' => null,
        'uploaded_by' => $user->id,
        'pulled_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('platform_pull_entries')->insert([
        'platform_pull_snapshot_id' => $platformSnapshotId,
        'source' => 'active',
        'batch' => 1,
        'processor_name' => 'Processor',
        'general_exterior' => 1,
        'four_point' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($administrator)
        ->delete(route('operations.users.destroy', $user))
        ->assertRedirect()
        ->assertSessionHas('userMessage');

    $this->assertDatabaseMissing('users', ['id' => $user->id]);
    $this->assertDatabaseMissing('queue_snapshots', ['id' => $queueSnapshotId]);
    $this->assertDatabaseMissing('queue_processor_entries', ['queue_snapshot_id' => $queueSnapshotId]);
    $this->assertDatabaseMissing('platform_pull_snapshots', ['id' => $platformSnapshotId]);
    $this->assertDatabaseMissing('platform_pull_entries', ['platform_pull_snapshot_id' => $platformSnapshotId]);
    Storage::disk('public')->assertMissing('avatars/delete-me.png');
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

test('operations administrators cannot delete their own account', function () {
    $administrator = User::factory()->create(['role' => UserRole::Operations]);

    $this->actingAs($administrator)
        ->delete(route('operations.users.destroy', $administrator))
        ->assertUnprocessable();

    $this->assertModelExists($administrator);
});

test('an already signed in deactivated account is logged out', function () {
    $user = User::factory()->create(['is_active' => false]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

test('the account status endpoint confirms an active session', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson(route('account.status'))
        ->assertOk()
        ->assertExactJson(['active' => true]);
});

test('the account status endpoint logs out an already deactivated session', function () {
    $user = User::factory()->create(['is_active' => false]);

    $this->actingAs($user)
        ->getJson(route('account.status'))
        ->assertUnauthorized()
        ->assertExactJson(['active' => false]);

    $this->assertGuest();
});
