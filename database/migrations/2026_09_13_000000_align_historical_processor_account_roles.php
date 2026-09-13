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

    public function up(): void
    {
        DB::table('users')
            ->where(function ($query): void {
                $query->whereIn('name', self::REVIEWERS)
                    ->orWhereIn('n_name', ['Emma', 'King', 'Arianne', 'Violet', 'Viole']);
            })
            ->update([
                'role' => 'reviewer',
                'batch' => null,
                'tracks_production' => true,
                'updated_at' => now(),
            ]);

        DB::table('users')
            ->where(function ($query): void {
                $query->where('name', 'Jhun Cervantes')
                    ->orWhere('n_name', 'Jhun')
                    ->orWhere('email', 'aitest7@bees360.com');
            })
            ->update([
                'batch' => 1,
                'tracks_production' => true,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('users')
            ->where(function ($query): void {
                $query->whereIn('name', self::REVIEWERS)
                    ->orWhereIn('n_name', ['Emma', 'King', 'Arianne', 'Violet', 'Viole']);
            })
            ->update(['tracks_production' => false, 'updated_at' => now()]);
    }
};
