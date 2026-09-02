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
        Schema::create('platform_pull_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_pull_snapshot_id')->constrained()->cascadeOnDelete();
            $table->string('source', 10);
            $table->unsignedTinyInteger('batch');
            $table->string('processor_name');
            $table->unsignedInteger('general_exterior')->default(0);
            $table->unsignedInteger('four_point')->default(0);
            $table->timestamps();

            $table->unique(['platform_pull_snapshot_id', 'source', 'processor_name'], 'platform_pull_entry_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_pull_entries');
    }
};
