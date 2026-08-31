<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::query()->updateOrCreate(['email' => 'aitest7@bees360.com'], [
            'name' => 'Operations Team',
            'password' => config('bees360.operations_password'),
            'role' => UserRole::Operations,
            'email_verified_at' => now(),
        ]);
    }
}
