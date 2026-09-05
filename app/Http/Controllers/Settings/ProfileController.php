<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Services\AvatarStorage;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request, AvatarStorage $avatars): RedirectResponse
    {
        $user = $request->user();
        $oldAvatarPath = $user->avatar_path;
        $newAvatarPath = $request->hasFile('avatar') ? $avatars->store($request->file('avatar')) : null;

        $user->fill($request->safe()->only(['email']));

        if ($newAvatarPath) {
            $user->avatar_path = $newAvatarPath;
        }

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        try {
            $user->save();
        } catch (\Throwable $exception) {
            $avatars->delete($newAvatarPath);

            throw $exception;
        }

        if ($newAvatarPath) {
            $avatars->delete($oldAvatarPath);
        }

        return to_route('profile.edit')->with('userMessage', 'Your Bees360 profile was updated successfully.');
    }
}
