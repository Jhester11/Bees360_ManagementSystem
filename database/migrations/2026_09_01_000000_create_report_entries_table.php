<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_entries', function (Blueprint $table) {
            $table->id();
            $table->date('report_date')->index();
            $table->string('source', 10);
            $table->unsignedTinyInteger('batch');
            $table->string('processor_name');
            $table->string('project_id', 50);
            $table->string('insured_by')->nullable();
            $table->string('inspection_type');
            $table->string('report_category', 30);
            $table->dateTime('assembled_at')->nullable();
            $table->timestamps();

            $table->unique(['source', 'project_id', 'report_date', 'processor_name', 'inspection_type'], 'report_entry_source_project_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_entries');
    }
};
