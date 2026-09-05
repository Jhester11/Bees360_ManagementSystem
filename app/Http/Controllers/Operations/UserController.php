<?php

namespace App\Http\Controllers\Operations;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\UpdateUserStatusRequest;
use App\Models\User;
use App\Services\AvatarStorage;
use App\Services\PerformanceAnnouncementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class UserController extends Controller
{
    public function __construct(
        private readonly AvatarStorage $avatars,
        private readonly PerformanceAnnouncementService $announcements,
    ) {}

    public function index(): Response
    {
        return Inertia::render('operations/users', [
            'users' => User::query()->orderByDesc('is_active')->orderBy('name')->get()->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'n_name' => $user->n_name,
                'email' => $user->email,
                'role' => $user->role->value,
                'is_active' => $user->is_active,
                'avatar' => $user->avatar,
                'created_at' => $user->created_at->toDateString(),
            ]),
            'roles' => collect(UserRole::cases())->map(fn (UserRole $role): array => [
                'value' => $role->value,
                'label' => match ($role) {
                    UserRole::Operations => 'Operation',
                    UserRole::Processor => 'Processor',
                    UserRole::Trainer => 'Trainer',
                    UserRole::Qa => 'Quality Assurance',
                    UserRole::Reviewer => 'Reviewer',
                },
            ]),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $data = $request->safe()->only(['name', 'n_name', 'email', 'password', 'role']);
        $newAvatarPath = null;

        if ($request->hasFile('avatar')) {
            $newAvatarPath = $this->avatars->store($request->file('avatar'));
            $data['avatar_path'] = $newAvatarPath;
        }

        try {
            $user = User::query()->create($data);
        } catch (Throwable $exception) {
            $this->avatars->delete($newAvatarPath);

            throw $exception;
        }

        $this->announcements->announceNewAccount($user);

        return to_route('operations.users.index')->with('userMessage', 'The Bees360 account was created successfully.');
    }

    public function updateStatus(UpdateUserStatusRequest $request, User $user): RedirectResponse
    {
        abort_if($request->user()->is($user), 422, 'You cannot deactivate your own account.');

        $isActive = $request->boolean('is_active');
        DB::transaction(function () use ($isActive, $user): void {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if (! $isActive) {
                $this->assertActiveOperationsAccountRemains($lockedUser);
            }

            $lockedUser->update(['is_active' => $isActive]);

            if (! $isActive) {
                DB::table(config('session.table', 'sessions'))->where('user_id', $lockedUser->getKey())->delete();
            }
        });

        return back()->with(
            'userMessage',
            $isActive ? 'The account is now active and can sign in.' : 'The account was deactivated and can no longer sign in.',
        );
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->safe()->only(['name', 'n_name', 'email', 'role']);

        if ($request->filled('password')) {
            $data['password'] = $request->validated('password');
        }

        $newAvatarPath = null;
        $oldAvatarPath = null;
        $currentPasswordChanged = false;

        if ($request->hasFile('avatar')) {
            $newAvatarPath = $this->avatars->store($request->file('avatar'));
            $data['avatar_path'] = $newAvatarPath;
        }

        try {
            DB::transaction(function () use ($data, $request, $user, &$currentPasswordChanged, &$oldAvatarPath): void {
                $lockedUser = User::query()->lockForUpdate()->findOrFail($user->getKey());
                $oldAvatarPath = $lockedUser->avatar_path;
                $newRole = UserRole::from($data['role']);

                if ($newRole !== UserRole::Operations) {
                    $this->assertActiveOperationsAccountRemains($lockedUser);
                }

                $lockedUser->fill($data);
                $shouldRevokeSessions = $lockedUser->isDirty(['name', 'n_name', 'email', 'password', 'role']);
                $passwordChanged = $lockedUser->isDirty('password');
                $lockedUser->save();

                if ($passwordChanged) {
                    $lockedUser->forceFill(['remember_token' => Str::random(60)])->save();
                    $currentPasswordChanged = $request->user()->is($lockedUser);
                }

                if ($shouldRevokeSessions) {
                    $sessions = DB::table(config('session.table', 'sessions'))->where('user_id', $lockedUser->getKey());

                    if ($request->user()->is($lockedUser)) {
                        $sessions->where('id', '!=', $request->session()->getId());
                    }

                    $sessions->delete();
                }
            });
        } catch (Throwable $exception) {
            $this->avatars->delete($newAvatarPath);

            throw $exception;
        }

        if ($newAvatarPath && $oldAvatarPath) {
            $this->avatars->delete($oldAvatarPath);
        }

        if ($currentPasswordChanged) {
            $request->session()->regenerate(true);
        }

        return back()->with('userMessage', 'The Bees360 account was updated successfully.');
    }

    public function destroy(User $user): RedirectResponse
    {
        abort_if(request()->user()->is($user), 422, 'You cannot delete your own account.');

        $avatarPath = $user->avatar_path;

        DB::transaction(function () use ($user): void {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->getKey());

            $this->assertActiveOperationsAccountRemains($lockedUser);

            $lockedUser->notifications()->delete();
            $lockedUser->queueSnapshots()->delete();
            $lockedUser->platformPullSnapshots()->delete();
            DB::table(config('session.table', 'sessions'))->where('user_id', $lockedUser->getKey())->delete();
            $lockedUser->delete();
        });

        $this->avatars->delete($avatarPath);

        return back()->with('userMessage', 'The Bees360 account and all connected data were deleted successfully.');
    }

    private function assertActiveOperationsAccountRemains(User $user): void
    {
        if ($user->role !== UserRole::Operations || ! $user->is_active) {
            return;
        }

        $activeOperationsIds = User::query()
            ->where('role', UserRole::Operations->value)
            ->where('is_active', true)
            ->lockForUpdate()
            ->pluck('id');

        abort_if(
            $activeOperationsIds->count() <= 1,
            422,
            'At least one active Operations account is required.',
        );
    }
}
