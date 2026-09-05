<?php

namespace App\Providers;

use App\Models\TrainingMaterial;
use App\Policies\TrainingMaterialPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(TrainingMaterial::class, TrainingMaterialPolicy::class);
        Password::defaults(fn (): Password => Password::min(12)
            ->mixedCase()
            ->numbers()
            ->symbols());

        $this->assertSecureProductionConfiguration();
    }

    private function assertSecureProductionConfiguration(): void
    {
        if (! app()->isProduction()) {
            return;
        }

        $connection = (string) config('database.default');
        $databaseUser = (string) config("database.connections.{$connection}.username");
        $problems = [];

        if (config('app.debug')) {
            $problems[] = 'APP_DEBUG must be false';
        }

        if (parse_url((string) config('app.url'), PHP_URL_SCHEME) !== 'https') {
            $problems[] = 'APP_URL must use HTTPS';
        }

        if (! config('session.encrypt')) {
            $problems[] = 'SESSION_ENCRYPT must be true';
        }

        if (! config('session.secure')) {
            $problems[] = 'SESSION_SECURE_COOKIE must be true';
        }

        if ($databaseUser === '' || strtolower($databaseUser) === 'root') {
            $problems[] = 'the application database user must be a dedicated non-root account';
        }

        if ($problems !== []) {
            throw new \RuntimeException('Unsafe production configuration: '.implode('; ', $problems).'.');
        }
    }
}
