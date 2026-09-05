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
        Schema::table('users', fn (Blueprint $table) => $table->unsignedTinyInteger('batch')->nullable()->after('role')->index());

        Schema::create('training_subjects', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });
        Schema::create('training_topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_subject_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
            $table->unique(['training_subject_id', 'name']);
        });
        Schema::create('training_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('training_materials')->nullOnDelete();
            $table->foreignId('training_subject_id')->constrained()->restrictOnDelete();
            $table->foreignId('training_topic_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category');
            $table->string('difficulty', 24)->default('beginner');
            $table->string('version', 30)->default('1.0');
            $table->date('published_at')->nullable();
            $table->unsignedSmallInteger('estimated_reading_minutes')->default(10);
            $table->string('cover_path')->nullable();
            $table->string('pdf_path');
            $table->unsignedInteger('pdf_size');
            $table->unsignedSmallInteger('total_pages')->nullable();
            $table->string('status', 20)->default('draft');
            $table->boolean('assessment_required')->default(false);
            $table->boolean('require_retraining')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['status', 'published_at']);
            $table->unique(['parent_id', 'version']);
        });
        Schema::create('training_material_audiences', function (Blueprint $table) {
            $table->foreignId('training_material_id')->constrained()->cascadeOnDelete();
            $table->string('audience', 24);
            $table->primary(['training_material_id', 'audience']);
        });
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_material_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('passing_score', 5, 2)->default(80);
            $table->unsignedSmallInteger('time_limit_minutes')->nullable();
            $table->unsignedTinyInteger('maximum_attempts')->default(1);
            $table->boolean('randomize_questions')->default(false);
            $table->boolean('randomize_choices')->default(false);
            $table->boolean('show_score')->default(true);
            $table->boolean('show_correct_answers')->default(false);
            $table->boolean('require_training_completion')->default(true);
            $table->dateTime('due_at')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->unique('training_material_id');
        });
        Schema::create('assessment_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained()->cascadeOnDelete();
            $table->text('question');
            $table->text('explanation')->nullable();
            $table->unsignedSmallInteger('points')->default(1);
            $table->unsignedSmallInteger('position');
            $table->timestamps();
            $table->unique(['assessment_id', 'position']);
        });
        Schema::create('assessment_question_choices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_question_id')->constrained()->cascadeOnDelete();
            $table->text('choice');
            $table->boolean('is_correct')->default(false);
            $table->unsignedTinyInteger('position');
            $table->timestamps();
            $table->unique(['assessment_question_id', 'position'], 'assessment_choice_position_unique');
        });
        Schema::create('training_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_material_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assessment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assigned_by')->constrained('users')->restrictOnDelete();
            $table->string('name');
            $table->string('scope_type', 20)->default('users');
            $table->string('scope_value')->nullable();
            $table->dateTime('due_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['is_active', 'due_at']);
        });
        Schema::create('training_assignment_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 30)->default('not_started');
            $table->dateTime('assigned_at');
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['training_assignment_id', 'user_id']);
            $table->index(['user_id', 'status']);
        });
        Schema::create('training_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_assignment_user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('last_read_page')->default(1);
            $table->unsignedSmallInteger('total_pages')->default(1);
            $table->decimal('progress_percentage', 5, 2)->default(0);
            $table->dateTime('started_at')->nullable();
            $table->dateTime('reading_completed_at')->nullable();
            $table->timestamps();
            $table->unique('training_assignment_user_id');
        });
        Schema::create('assessment_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_assignment_user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assessment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('attempt_number');
            $table->unsignedInteger('score')->default(0);
            $table->unsignedInteger('maximum_score')->default(0);
            $table->decimal('percentage', 5, 2)->default(0);
            $table->boolean('passed')->default(false);
            $table->dateTime('started_at');
            $table->dateTime('submitted_at')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->timestamps();
            $table->unique(['training_assignment_user_id', 'attempt_number'], 'assessment_attempt_number_unique');
            $table->index(['assessment_id', 'passed']);
        });
        Schema::create('assessment_attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_attempt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assessment_question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assessment_question_choice_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_correct')->default(false);
            $table->unsignedSmallInteger('points_awarded')->default(0);
            $table->timestamps();
            $table->unique(['assessment_attempt_id', 'assessment_question_id'], 'attempt_question_unique');
        });
        Schema::create('training_bookmarks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_material_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('page');
            $table->timestamps();
            $table->unique(['user_id', 'training_material_id', 'page'], 'training_bookmark_unique');
        });
        Schema::create('training_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event', 50);
            $table->string('subject_type');
            $table->unsignedBigInteger('subject_id');
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['subject_type', 'subject_id']);
        });

        $batches = [1 => ['Christer John C. Gozon', 'Lourdes M. Completado', 'Elacio M. Santos Jr.', 'Jhun Cervantes', 'Reginald King Palo'], 2 => ['Allan Layug', 'Arianne Joy Lopez', 'Emma Alegre', 'Marie Anthonette Moog', 'Mc Oliver Noble', 'Rheven Violet Aladin', 'Wengmir A. Africa'], 3 => ['Chrismer Flores', 'Denn Charles Zafe', 'Ivan Mendoza', 'Jerica Matic', 'Kristine Jewel Espiritu', 'Mac Evens T. Payongayong', 'Nikko Adrian Dungca', 'Rainier Sta Ana', 'Tracy John Josafat']];
        foreach ($batches as $batch => $names) {
            DB::table('users')->whereIn('name', $names)->update(['batch' => $batch]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_audit_logs');
        Schema::dropIfExists('training_bookmarks');
        Schema::dropIfExists('assessment_attempt_answers');
        Schema::dropIfExists('assessment_attempts');
        Schema::dropIfExists('training_progress');
        Schema::dropIfExists('training_assignment_users');
        Schema::dropIfExists('training_assignments');
        Schema::dropIfExists('assessment_question_choices');
        Schema::dropIfExists('assessment_questions');
        Schema::dropIfExists('assessments');
        Schema::dropIfExists('training_material_audiences');
        Schema::dropIfExists('training_materials');
        Schema::dropIfExists('training_topics');
        Schema::dropIfExists('training_subjects');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('batch'));
    }
};
