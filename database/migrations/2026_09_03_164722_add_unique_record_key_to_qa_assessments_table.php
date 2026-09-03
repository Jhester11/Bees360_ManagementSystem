<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('qa_assessments', function (Blueprint $table) {
            $table->char('record_key', 64)->nullable()->after('id');
        });

        DB::table('qa_assessments')->orderBy('id')->each(function (object $assessment): void {
            DB::table('qa_assessments')->where('id', $assessment->id)->update([
                'record_key' => hash('sha256', trim((string) $assessment->project_id).'|'.$assessment->assessment_date),
            ]);
        });

        Schema::table('qa_assessments', function (Blueprint $table) {
            $table->unique('record_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('qa_assessments', function (Blueprint $table) {
            $table->dropUnique(['record_key']);
            $table->dropColumn('record_key');
        });
    }
};
