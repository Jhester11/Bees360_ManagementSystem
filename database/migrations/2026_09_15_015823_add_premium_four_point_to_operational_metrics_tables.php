<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cst_processor_metrics', function (Blueprint $table) {
            $table->unsignedInteger('premium_four_point')->default(0)->after('four_point');
        });
        Schema::table('queue_processor_entries', function (Blueprint $table) {
            $table->unsignedInteger('premium_four_point')->default(0)->after('four_point');
        });
        Schema::table('platform_pull_entries', function (Blueprint $table) {
            $table->unsignedInteger('premium_four_point')->default(0)->after('four_point');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cst_processor_metrics', function (Blueprint $table) {
            $table->dropColumn('premium_four_point');
        });
        Schema::table('queue_processor_entries', function (Blueprint $table) {
            $table->dropColumn('premium_four_point');
        });
        Schema::table('platform_pull_entries', function (Blueprint $table) {
            $table->dropColumn('premium_four_point');
        });
    }
};
