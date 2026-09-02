<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queue_snapshots', function (Blueprint $table) {
            $table->id();
            $table->date('report_date');
            $table->string('checkpoint', 10);
            $table->string('file_name');
            $table->unsignedInteger('total_rows');
            $table->unsignedInteger('matched_rows');
            $table->unsignedInteger('ignored_rows');
            $table->foreignId('uploaded_by')->constrained('users');
            $table->timestamp('checked_at');
            $table->timestamps();

            $table->unique(['report_date', 'checkpoint']);
        });

        Schema::create('queue_processor_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('queue_snapshot_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('batch');
            $table->string('processor_name');
            $table->unsignedInteger('general_exterior')->default(0);
            $table->unsignedInteger('four_point')->default(0);
            $table->unsignedInteger('other')->default(0);
            $table->unsignedInteger('total')->default(0);
            $table->timestamps();

            $table->unique(['queue_snapshot_id', 'processor_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_processor_entries');
        Schema::dropIfExists('queue_snapshots');
    }
};
