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
        Schema::create('cst_processor_metrics', function (Blueprint $table) {
            $table->id();
            $table->date('report_date');
            $table->string('processor_name');
            $table->unsignedInteger('general_exterior')->default(0);
            $table->unsignedInteger('four_point')->default(0);
            $table->decimal('qc_score', 5, 2)->nullable();
            $table->unsignedInteger('qc_reviews')->default(0);
            $table->string('source_file');
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['report_date', 'processor_name']);
            $table->index(['processor_name', 'report_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cst_processor_metrics');
    }
};
