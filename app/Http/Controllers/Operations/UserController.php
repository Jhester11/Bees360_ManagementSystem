<?php

namespace App\Http\Controllers\Operations;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserStatusRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
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

        if ($request->hasFile('avatar')) {
            $data['avatar_path'] = $request->file('avatar')->store('avatars', 'public');
        }

        User::query()->create($data);

        return to_route('operations.users.index')->with('userMessage', 'The Bees360 account was created successfully.');
    }

    public function updateStatus(UpdateUserStatusRequest $request, User $user): RedirectResponse
    {
        abort_if($request->user()->is($user), 422, 'You cannot deactivate your own account.');

        $isActive = $request->boolean('is_active');
        $user->update(['is_active' => $isActive]);

        if (! $isActive) {
            DB::table('sessions')->where('user_id', $user->getKey())->delete();
        }

        return back()->with(
            'userMessage',
            $isActive ? 'The account is now active and can sign in.' : 'The account was deactivated and can no longer sign in.',
        );
    }
}
