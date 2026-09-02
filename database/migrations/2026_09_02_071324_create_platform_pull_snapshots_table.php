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
        Schema::create('platform_pull_snapshots', function (Blueprint $table) {
            $table->id();
            $table->date('report_date');
            $table->string('checkpoint', 10);
            $table->string('active_file_name')->nullable();
            $table->string('closed_file_name')->nullable();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->timestamp('pulled_at');
            $table->timestamps();

            $table->unique(['report_date', 'checkpoint']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_pull_snapshots');
    }
};
