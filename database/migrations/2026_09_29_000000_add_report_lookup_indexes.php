<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_entries', function (Blueprint $table): void {
            $table->index(['project_id', 'report_date'], 'report_entries_project_date_index');
        });
        Schema::table('qa_assessments', function (Blueprint $table): void {
            $table->index(['assessment_date', 'id'], 'qa_assessments_date_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('report_entries', function (Blueprint $table): void {
            $table->dropIndex('report_entries_project_date_index');
        });
        Schema::table('qa_assessments', function (Blueprint $table): void {
            $table->dropIndex('qa_assessments_date_id_index');
        });
    }
};
