<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('report_entries')
            ->where('processor_name', 'Jhun Lester Cervantes')
            ->update(['processor_name' => 'Jhun Cervantes', 'batch' => 1]);
    }

    public function down(): void
    {
        DB::table('report_entries')
            ->where('processor_name', 'Jhun Cervantes')
            ->update(['processor_name' => 'Jhun Lester Cervantes', 'batch' => 1]);
    }
};
