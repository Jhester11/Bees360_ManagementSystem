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
        Schema::create('qa_assessments', function (Blueprint $table) {
            $table->id();
            $table->date('assessment_date');
            $table->foreignId('processor_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('processor_name');
            $table->decimal('score', 5, 2);
            $table->string('source_file');
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['processor_name', 'assessment_date']);
            $table->index(['processor_id', 'assessment_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('qa_assessments');
    }
};
