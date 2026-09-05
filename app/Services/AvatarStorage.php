<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AvatarStorage
{
    public function store(UploadedFile $avatar): string
    {
        $path = $avatar->store('avatars', 'local');

        if (! is_string($path) || ! $this->isSafePath($path)) {
            throw ValidationException::withMessages([
                'avatar' => 'The profile image could not be stored securely. Please try again.',
            ]);
        }

        return $path;
    }

    public function delete(?string $path): void
    {
        if (! $this->isSafePath($path)) {
            return;
        }

        Storage::disk('local')->delete($path);
        Storage::disk('public')->delete($path);
    }

    private function isSafePath(?string $path): bool
    {
        return is_string($path)
            && preg_match('/\Aavatars\/[A-Za-z0-9][A-Za-z0-9._-]*\z/', $path) === 1
            && ! str_contains($path, '..');
    }
}
