<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const PROCESSOR_NAMES = [
        'Arianne Lopez' => ['name' => 'Arianne Joy Lopez', 'batch' => 2],
        'Chris Gozon' => ['name' => 'Christer John C. Gozon', 'batch' => 1],
        'Denn Charles  Zafe' => ['name' => 'Denn Charles Zafe', 'batch' => 3],
        'Desh Completado' => ['name' => 'Lourdes M. Completado', 'batch' => 1],
        'Don Santos' => ['name' => 'Elacio M. Santos Jr.', 'batch' => 1],
        'Jhun Lester Cervantes' => ['name' => 'Jhun Cervantes', 'batch' => 1],
        'King Palo' => ['name' => 'Reginald King Palo', 'batch' => 1],
        'Mac Evens T.  Payongayong' => ['name' => 'Mac Evens T. Payongayong', 'batch' => 3],
        'Marie Moog' => ['name' => 'Marie Anthonette Moog', 'batch' => 2],
        'Nikko Adrian  Dungca' => ['name' => 'Nikko Adrian Dungca', 'batch' => 3],
        'Oliver Noble' => ['name' => 'Mc Oliver Noble', 'batch' => 2],
        'Rheven Aladin' => ['name' => 'Rheven Violet Aladin', 'batch' => 2],
        'Tracy John  Josafat' => ['name' => 'Tracy John Josafat', 'batch' => 3],
        'Wengmir Africa' => ['name' => 'Wengmir A. Africa', 'batch' => 2],
    ];

    public function up(): void
    {
        DB::transaction(function (): void {
            foreach (self::PROCESSOR_NAMES as $legacyName => $processor) {
                DB::table('report_entries')
                    ->where('processor_name', $legacyName)
                    ->orderBy('id')
                    ->get()
                    ->each(function (object $entry) use ($processor): void {
                        $duplicate = DB::table('report_entries')
                            ->where('source', $entry->source)
                            ->where('project_id', $entry->project_id)
                            ->where('report_date', $entry->report_date)
                            ->where('processor_name', $processor['name'])
                            ->where('inspection_type', $entry->inspection_type)
                            ->first();

                        if ($duplicate !== null) {
                            DB::table('report_entries')->where('id', $entry->id)->delete();

                            return;
                        }

                        DB::table('report_entries')->where('id', $entry->id)->update([
                            'processor_name' => $processor['name'],
                            'batch' => $processor['batch'],
                            'updated_at' => now(),
                        ]);
                    });
            }
        });
    }

    public function down(): void
    {
        // Processor aliases are intentionally consolidated and cannot be restored safely.
    }
};
