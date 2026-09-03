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
        Schema::table('qa_assessments', function (Blueprint $table) {
            $table->string('project_id', 50)->nullable()->after('processor_name');
            $table->string('qc_name')->nullable()->after('project_id');
            $table->text('report_url')->nullable()->after('qc_name');
            $table->json('feedback')->nullable()->after('score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('qa_assessments', function (Blueprint $table) {
            $table->dropColumn(['project_id', 'qc_name', 'report_url', 'feedback']);
        });
    }
};
