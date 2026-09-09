<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const REVIEWERS = [
        'Emma Alegre',
        'Reginald King Palo',
        'Arianne Joy Lopez',
        'Rheven Violet Aladin',
    ];

    private const LEGACY_BATCHES = [
        1 => ['Christer John C. Gozon', 'Chris Gozon', 'Lourdes M. Completado', 'Elacio M. Santos Jr.', 'Jhun Cervantes'],
        2 => ['Allan Layug', 'Marie Anthonette Moog', 'Mc Oliver Noble', 'Wengmir A. Africa'],
        3 => ['Chrismer Flores', 'Denn Charles Zafe', 'Denn Charles  Zafe', 'Ivan Mendoza', 'Jerica Matic', 'Kristine Jewel Espiritu', 'Mac Evens T. Payongayong', 'Nikko Adrian Dungca', 'Rainier Sta Ana', 'Tracy John Josafat'],
    ];

    public function up(): void
    {
        foreach (self::LEGACY_BATCHES as $batch => $names) {
            DB::table('users')
                ->where('role', 'processor')
                ->whereIn('name', $names)
                ->update(['batch' => $batch, 'updated_at' => now()]);
        }

        DB::table('users')
            ->where(function ($query): void {
                $query->whereIn('name', self::REVIEWERS)
                    ->orWhereIn('n_name', ['Emma', 'King', 'Arianne', 'Violet', 'Viole']);
            })
            ->whereIn('role', ['processor', 'reviewer'])
            ->update(['role' => 'reviewer', 'batch' => null, 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'reviewer')->where(function ($query): void {
            $query->where('name', 'Reginald King Palo')->orWhere('n_name', 'King');
        })->update(['role' => 'processor', 'batch' => 1, 'updated_at' => now()]);

        DB::table('users')->where('role', 'reviewer')->where(function ($query): void {
            $query->whereIn('name', ['Emma Alegre', 'Arianne Joy Lopez', 'Rheven Violet Aladin'])
                ->orWhereIn('n_name', ['Emma', 'Arianne', 'Violet', 'Viole']);
        })->update(['role' => 'processor', 'batch' => 2, 'updated_at' => now()]);
    }
};
