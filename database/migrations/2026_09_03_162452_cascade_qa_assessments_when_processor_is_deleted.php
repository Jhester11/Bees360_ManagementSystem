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
            $table->dropForeign(['processor_id']);
            $table->foreign('processor_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('qa_assessments', function (Blueprint $table) {
            $table->dropForeign(['processor_id']);
            $table->foreign('processor_id')->references('id')->on('users')->nullOnDelete();
        });
    }
};
