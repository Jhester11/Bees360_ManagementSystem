<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('report_entries')
            ->whereIn('processor_name', ['Christer John C. Gozon', 'Lourdes M. Completado', 'Elacio M. Santos Jr.', 'Jhun Lester Cervantes', 'Reginald King Palo'])
            ->update(['batch' => 1]);

        DB::table('report_entries')
            ->whereIn('processor_name', ['Chrismer Flores', 'Denn Charles Zafe', 'Ivan Mendoza', 'Jerica Matic', 'Kristine Jewel Espiritu', 'Mac Evens T. Payongayong', 'Nikko Adrian Dungca', 'Rainier Sta Ana', 'Tracy John Josafat'])
            ->update(['batch' => 3]);
    }

    public function down(): void
    {
        DB::table('report_entries')
            ->whereIn('processor_name', ['Christer John C. Gozon', 'Lourdes M. Completado', 'Elacio M. Santos Jr.', 'Jhun Lester Cervantes', 'Reginald King Palo'])
            ->update(['batch' => 3]);

        DB::table('report_entries')
            ->whereIn('processor_name', ['Chrismer Flores', 'Denn Charles Zafe', 'Ivan Mendoza', 'Jerica Matic', 'Kristine Jewel Espiritu', 'Mac Evens T. Payongayong', 'Nikko Adrian Dungca', 'Rainier Sta Ana', 'Tracy John Josafat'])
            ->update(['batch' => 1]);
    }
};
