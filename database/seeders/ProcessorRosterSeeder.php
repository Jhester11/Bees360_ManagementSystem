<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProcessorRosterSeeder extends Seeder
{
    private const PROCESSORS = [
        ['name' => 'Christer John C. Gozon', 'n_name' => 'Chris', 'batch' => 1],
        ['name' => 'Lourdes M. Completado', 'n_name' => 'Dhes', 'batch' => 1],
        ['name' => 'Elacio M. Santos Jr.', 'n_name' => 'Elacio', 'batch' => 1],
        ['name' => 'Allan Layug', 'n_name' => 'Allan', 'batch' => 2],
        ['name' => 'Marie Anthonette Moog', 'n_name' => 'Marie', 'batch' => 2],
        ['name' => 'Mc Oliver Noble', 'n_name' => 'Oliver', 'batch' => 2],
        ['name' => 'Wengmir A. Africa', 'n_name' => 'Wengmir', 'batch' => 2],
        ['name' => 'Chrismer Flores', 'n_name' => 'Chrismer', 'batch' => 3],
        ['name' => 'Denn Charles Zafe', 'n_name' => 'Denn', 'batch' => 3],
        ['name' => 'Ivan Mendoza', 'n_name' => 'Ivan', 'batch' => 3],
        ['name' => 'Jerica Matic', 'n_name' => 'Jerica', 'batch' => 3],
        ['name' => 'Kristine Jewel Espiritu', 'n_name' => 'Kristine', 'batch' => 3],
        ['name' => 'Mac Evens T. Payongayong', 'n_name' => 'Mac', 'batch' => 3],
        ['name' => 'Nikko Adrian Dungca', 'n_name' => 'Nikko', 'batch' => 3],
        ['name' => 'Rainier Sta Ana', 'n_name' => 'Rainier', 'batch' => 3],
        ['name' => 'Tracy John Josafat', 'n_name' => 'Tracy', 'batch' => 3],
    ];

    private const REVIEWERS_WITH_PROCESSOR_HISTORY = [
        ['name' => 'Reginald King Palo', 'n_name' => 'King'],
        ['name' => 'Arianne Joy Lopez', 'n_name' => 'Arianne'],
        ['name' => 'Emma Alegre', 'n_name' => 'Emma'],
        ['name' => 'Rheven Violet Aladin', 'n_name' => 'Violet'],
    ];

    public function run(): void
    {
        $now = now();

        $jhun = DB::table('users')
            ->where('email', 'aitest7@bees360.com')
            ->orWhere('name', 'Jhun Cervantes')
            ->orWhere('n_name', 'Jhun')
            ->first();

        if ($jhun !== null) {
            DB::table('users')->where('id', $jhun->id)->update([
                'name' => 'Jhun Cervantes',
                'n_name' => 'Jhun',
                'batch' => 1,
                'tracks_production' => true,
                'updated_at' => $now,
            ]);
        } else {
            $this->insertPendingAccount('Jhun Cervantes', 'Jhun', 'processor', 1, $now);
        }

        foreach (self::PROCESSORS as $processor) {
            $existing = DB::table('users')
                ->where('name', $processor['name'])
                ->orWhere('n_name', $processor['n_name'])
                ->first();

            if ($existing !== null) {
                DB::table('users')->where('id', $existing->id)->update([
                    'name' => $processor['name'],
                    'n_name' => $processor['n_name'],
                    'role' => 'processor',
                    'batch' => $processor['batch'],
                    'tracks_production' => true,
                    'updated_at' => $now,
                ]);

                continue;
            }

            $this->insertPendingAccount($processor['name'], $processor['n_name'], 'processor', $processor['batch'], $now);
        }

        foreach (self::REVIEWERS_WITH_PROCESSOR_HISTORY as $reviewer) {
            $existing = DB::table('users')
                ->where('name', $reviewer['name'])
                ->orWhere('n_name', $reviewer['n_name'])
                ->first();

            if ($existing !== null) {
                DB::table('users')->where('id', $existing->id)->update([
                    'name' => $reviewer['name'],
                    'n_name' => $reviewer['n_name'],
                    'role' => 'reviewer',
                    'batch' => null,
                    'tracks_production' => true,
                    'updated_at' => $now,
                ]);

                continue;
            }

            $this->insertPendingAccount($reviewer['name'], $reviewer['n_name'], 'reviewer', null, $now);
        }
    }

    private function insertPendingAccount(string $name, string $nickname, string $role, ?int $batch, mixed $now): void
    {
        $emailName = str($name)->lower()->replaceMatches('/[^a-z0-9]+/', '.')->trim('.');

        DB::table('users')->insert([
            'name' => $name,
            'n_name' => $nickname,
            'email' => $emailName.'.pending@bees360.local',
            'email_verified_at' => null,
            'password' => password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT),
            'role' => $role,
            'batch' => $batch,
            'tracks_production' => true,
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
