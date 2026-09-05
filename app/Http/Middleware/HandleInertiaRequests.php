<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');
        $user = $request->user();

        return array_merge(parent::share($request), [
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'n_name' => $user->n_name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'email_verified_at' => $user->email_verified_at?->toIso8601String(),
                    'created_at' => $user->created_at?->toIso8601String(),
                    'updated_at' => $user->updated_at?->toIso8601String(),
                    'role' => $user->role->value,
                    'is_active' => $user->is_active,
                    'onboarding_completed_at' => $user->onboarding_completed_at?->toIso8601String(),
                ] : null,
            ],
            'notifications' => $user
                ? fn (): array => $user->unreadNotifications()
                    ->latest()
                    ->limit(20)
                    ->get()
                    ->map(fn ($notification): array => [
                        'id' => $notification->id,
                        'title' => (string) ($notification->data['title'] ?? 'QA result'),
                        'message' => (string) ($notification->data['message'] ?? ''),
                        'href' => (string) ($notification->data['href'] ?? '/dashboard'),
                        'score' => $notification->data['score'] ?? null,
                        'projectId' => $notification->data['project_id'] ?? null,
                        'assessmentDate' => $notification->data['assessment_date'] ?? null,
                        'type' => (string) ($notification->data['type'] ?? 'announcement'),
                        'createdAt' => $notification->created_at->toIso8601String(),
                    ])
                    ->all()
                : [],
            'flash' => [
                'importSummary' => $request->session()->get('importSummary'),
                'userMessage' => $request->session()->get('userMessage'),
            ],
        ]);
    }
}
