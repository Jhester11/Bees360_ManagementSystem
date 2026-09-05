<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (User::query()->where('role', UserRole::Operations->value)->exists()) {
            return;
        }

        $password = config('bees360.operations_password');

        if (! is_string($password) || $password === '') {
            throw new \LogicException('Set BEES360_OPERATIONS_PASSWORD before seeding the first Operations account.');
        }

        $bootstrapAccount = Validator::make([
            'email' => config('bees360.operations_email'),
            'name' => config('bees360.operations_name'),
            'password' => $password,
        ], [
            'email' => ['required', 'email', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', Password::defaults()],
        ])->validate();

        User::query()->create([
            'email' => $bootstrapAccount['email'],
            'name' => $bootstrapAccount['name'],
            'n_name' => 'Operations',
            'password' => $bootstrapAccount['password'],
            'role' => UserRole::Operations,
            'email_verified_at' => now(),
        ]);
    }
}
