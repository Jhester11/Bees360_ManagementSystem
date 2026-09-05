<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserAvatarController extends Controller
{
    public function __invoke(Request $request, User $user): StreamedResponse
    {
        abort_unless(
            $request->user()->is($user) || $request->user()->role === UserRole::Operations,
            404,
        );

        $path = $user->avatar_path;
        abort_unless($this->isSafeAvatarPath($path), 404);

        $disk = $this->avatarDisk($path);
        abort_if($disk === null, 404);

        return $disk->response($path, null, [
            'Cache-Control' => 'private, max-age=300',
            'Content-Disposition' => 'inline',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function avatarDisk(string $path): ?FilesystemAdapter
    {
        if (Storage::disk('local')->exists($path)) {
            return Storage::disk('local');
        }

        // Existing installations may still have avatars from the former public disk.
        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public');
        }

        return null;
    }

    private function isSafeAvatarPath(?string $path): bool
    {
        return is_string($path)
            && preg_match('/\Aavatars\/[A-Za-z0-9][A-Za-z0-9._-]*\z/', $path) === 1
            && ! str_contains($path, '..');
    }
}
