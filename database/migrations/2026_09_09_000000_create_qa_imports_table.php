<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qa_imports', function (Blueprint $table) {
            $table->id();
            $table->string('source_file');
            $table->unsignedInteger('processed_count');
            $table->unsignedInteger('created_count')->default(0);
            $table->unsignedInteger('updated_count')->default(0);
            $table->unsignedInteger('matched_count')->default(0);
            $table->unsignedInteger('unmatched_count')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        DB::table('qa_assessments')
            ->select(['id', 'source_file', 'uploaded_by', 'processor_id', 'created_at', 'updated_at'])
            ->orderBy('id')
            ->get()
            ->groupBy(fn (object $assessment): string => implode('|', [
                $assessment->source_file,
                $assessment->uploaded_by,
                $assessment->updated_at,
            ]))
            ->each(function ($assessments): void {
                $latest = $assessments->last();
                $processed = $assessments->count();
                $matched = $assessments->whereNotNull('processor_id')->count();

                DB::table('qa_imports')->insert([
                    'source_file' => $latest->source_file,
                    'processed_count' => $processed,
                    'created_count' => $processed,
                    'updated_count' => 0,
                    'matched_count' => $matched,
                    'unmatched_count' => $processed - $matched,
                    'uploaded_by' => $latest->uploaded_by,
                    'created_at' => $latest->updated_at ?? $latest->created_at,
                    'updated_at' => $latest->updated_at ?? $latest->created_at,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('qa_imports');
    }
};
