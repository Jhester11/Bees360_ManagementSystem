<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProcessorRosterSeeder extends Seeder
{
    private const PROCESSORS = [
        ['name' => 'Lourdes M. Completado', 'n_name' => 'Lourdes', 'batch' => 1],
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

    public function run(): void
    {
        $now = now();

        DB::table('users')->where('email', 'aitest7@bees360.com')->update([
            'name' => 'Jhun Cervantes',
            'n_name' => 'Jhun',
            'batch' => 1,
            'tracks_production' => true,
            'updated_at' => $now,
        ]);

        foreach (self::PROCESSORS as $processor) {
            $existing = DB::table('users')
                ->where('name', $processor['name'])
                ->orWhere('n_name', $processor['n_name'])
                ->first();

            if ($existing !== null) {
                DB::table('users')->where('id', $existing->id)->update([
                    'name' => $processor['name'],
                    'batch' => $processor['batch'],
                    'tracks_production' => true,
                    'updated_at' => $now,
                ]);

                continue;
            }

            $emailName = str($processor['name'])->lower()->replaceMatches('/[^a-z0-9]+/', '.')->trim('.');

            DB::table('users')->insert([
                'name' => $processor['name'],
                'n_name' => $processor['n_name'],
                'email' => $emailName.'.pending@bees360.local',
                'email_verified_at' => null,
                'password' => password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT),
                'role' => 'processor',
                'batch' => $processor['batch'],
                'tracks_production' => true,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
