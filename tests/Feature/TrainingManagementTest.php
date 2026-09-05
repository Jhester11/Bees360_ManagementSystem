<?php

use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\TrainingAssignment;
use App\Models\TrainingAssignmentUser;
use App\Models\TrainingMaterial;
use App\Models\TrainingSubject;
use App\Models\TrainingTopic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function trainingMaterial(User $trainer, array $audiences = ['processor'], array $attributes = []): TrainingMaterial
{
    $subject = TrainingSubject::create(['name' => fake()->unique()->word()]);
    $topic = TrainingTopic::create(['training_subject_id' => $subject->id, 'name' => fake()->unique()->word()]);
    $material = TrainingMaterial::create(array_merge([
        'training_subject_id' => $subject->id, 'training_topic_id' => $topic->id, 'created_by' => $trainer->id,
        'title' => 'Exterior Identification', 'category' => 'Inspection', 'difficulty' => 'beginner', 'version' => '1.0',
        'estimated_reading_minutes' => 10, 'pdf_path' => 'training/pdfs/test.pdf', 'pdf_size' => 100,
        'status' => 'published', 'assessment_required' => false,
    ], $attributes));
    foreach ($audiences as $audience) {
        $material->audiences()->create(['audience' => $audience]);
    }

    return $material;
}

test('trainers and operations can create training materials while processors cannot', function () {
    Storage::fake('local');
    $trainer = User::factory()->create(['role' => UserRole::Trainer]);
    $processor = User::factory()->create(['role' => UserRole::Processor]);
    $operations = User::factory()->create(['role' => UserRole::Operations]);
    $payload = ['title' => 'SageSure Exterior', 'description' => 'Training', 'subject' => 'Property Inspection', 'topic' => 'Chimney vs Vent', 'category' => 'Identification', 'audiences' => ['processor', 'reviewer'], 'difficulty' => 'beginner', 'version' => '1.0', 'estimated_reading_minutes' => 20, 'status' => 'published', 'assessment_required' => true, 'require_retraining' => false, 'pdf' => UploadedFile::fake()->createWithContent('book.pdf', "%PDF-1.4\n%%EOF")];
    $this->actingAs($processor)->post('/training/materials', $payload)->assertForbidden();
    $this->actingAs($operations)->get(route('training.materials.create'))->assertOk();
    $this->actingAs($trainer)->post('/training/materials', $payload)->assertRedirect();
    $this->assertDatabaseHas('training_materials', ['title' => 'SageSure Exterior', 'created_by' => $trainer->id]);
    $this->assertDatabaseHas('training_material_audiences', ['audience' => 'reviewer']);
});

test('processor access is restricted by audience while reviewer can view all', function () {
    $trainer = User::factory()->create(['role' => UserRole::Trainer]);
    $processor = User::factory()->create(['role' => UserRole::Processor]);
    $reviewer = User::factory()->create(['role' => UserRole::Reviewer]);
    $reviewerOnly = trainingMaterial($trainer, ['reviewer']);
    $processorBook = trainingMaterial($trainer, ['processor']);
    $this->actingAs($processor)->get(route('training.materials.show', $reviewerOnly))->assertForbidden();
    $this->actingAs($processor)->get(route('training.materials.show', $processorBook))->assertOk();
    $this->actingAs($processor)->get(route('training.materials.read', $processorBook))->assertOk();
    $this->actingAs($reviewer)->get(route('training.materials.show', $reviewerOnly))->assertOk();
});

test('reading progress is saved and completes training without an assessment', function () {
    $trainer = User::factory()->create(['role' => UserRole::Trainer]);
    $processor = User::factory()->create(['role' => UserRole::Processor]);
    $material = trainingMaterial($trainer);
    $assignment = TrainingAssignment::create(['training_material_id' => $material->id, 'assigned_by' => $trainer->id, 'name' => 'Required', 'scope_type' => 'users', 'is_active' => true]);
    $userAssignment = TrainingAssignmentUser::create(['training_assignment_id' => $assignment->id, 'user_id' => $processor->id, 'status' => 'not_started', 'assigned_at' => now()]);
    $this->actingAs($processor)->patchJson(route('training.materials.progress', $material), ['page' => 10, 'total_pages' => 10])->assertOk();
    $this->actingAs($processor)->patchJson(route('training.materials.progress', $material), ['page' => 2, 'total_pages' => 10])->assertOk();
    expect($userAssignment->fresh()->status)->toBe('completed');
    $this->assertDatabaseHas('training_progress', ['training_assignment_user_id' => $userAssignment->id, 'progress_percentage' => 100]);
});

test('assessment scoring stores every answer and cannot overwrite a submitted attempt', function () {
    $trainer = User::factory()->create(['role' => UserRole::Trainer]);
    $processor = User::factory()->create(['role' => UserRole::Processor]);
    $material = trainingMaterial($trainer, ['processor'], ['assessment_required' => true]);
    $assessment = Assessment::create(['training_material_id' => $material->id, 'created_by' => $trainer->id, 'name' => 'Roof Features', 'passing_score' => 80, 'maximum_attempts' => 2, 'show_score' => true, 'show_correct_answers' => true, 'require_training_completion' => false, 'is_published' => true]);
    $question = $assessment->questions()->create(['question' => 'Which is a roof vent?', 'points' => 1, 'position' => 1]);
    $correct = $question->choices()->create(['choice' => 'Plumbing vent', 'is_correct' => true, 'position' => 1]);
    $question->choices()->create(['choice' => 'Brick chimney', 'is_correct' => false, 'position' => 2]);
    $assignment = TrainingAssignment::create(['training_material_id' => $material->id, 'assessment_id' => $assessment->id, 'assigned_by' => $trainer->id, 'name' => 'Required', 'scope_type' => 'users', 'is_active' => true]);
    TrainingAssignmentUser::create(['training_assignment_id' => $assignment->id, 'user_id' => $processor->id, 'status' => 'not_started', 'assigned_at' => now()]);
    $this->actingAs($processor)->get(route('training.assessments.take', $assessment))->assertOk();
    $attempt = $processor->trainingAssignments()->first()->attempts()->first();
    $this->actingAs($processor)->post(route('training.attempts.submit', $attempt), ['answers' => [$question->id => $correct->id]])->assertRedirect();
    expect($attempt->fresh()->passed)->toBeTrue();
    $this->actingAs($processor)->post(route('training.attempts.submit', $attempt), ['answers' => [$question->id => $correct->id]])->assertStatus(409);
    $this->assertDatabaseCount('assessment_attempt_answers', 1);
});

test('trainer can add a private image above an assessment question', function () {
    Storage::fake('local');
    $trainer = User::factory()->create(['role' => UserRole::Trainer]);
    $processor = User::factory()->create(['role' => UserRole::Processor]);
    $material = trainingMaterial($trainer);

    $response = $this->actingAs($trainer)->post(route('training.assessments.store'), [
        'training_material_id' => $material->id,
        'name' => 'Visual identification',
        'passing_score' => 80,
        'maximum_attempts' => 2,
        'randomize_questions' => false,
        'randomize_choices' => false,
        'show_score' => true,
        'show_correct_answers' => true,
        'require_training_completion' => false,
        'is_published' => true,
        'questions' => [[
            'question' => 'Which feature is shown above?',
            'image' => UploadedFile::fake()->createWithContent(
                'reference.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII='),
            ),
            'points' => 1,
            'choices' => [
                ['choice' => 'Guard house', 'is_correct' => true],
                ['choice' => 'Chimney', 'is_correct' => false],
            ],
        ]],
    ]);

    $response->assertRedirect();
    $question = $material->assessment->questions()->firstOrFail();
    expect($question->image_path)->not->toBeNull();
    Storage::disk('local')->assertExists($question->image_path);
    $this->actingAs($processor)->get(route('training.questions.image', $question))->assertOk();
});

test('question image endpoint enforces the material audience', function () {
    Storage::fake('local');
    $trainer = User::factory()->create(['role' => UserRole::Trainer]);
    $processor = User::factory()->create(['role' => UserRole::Processor]);
    $material = trainingMaterial($trainer, ['reviewer']);
    $assessment = Assessment::create([
        'training_material_id' => $material->id,
        'created_by' => $trainer->id,
        'name' => 'Restricted visual assessment',
        'passing_score' => 80,
        'maximum_attempts' => 1,
        'is_published' => true,
    ]);
    Storage::disk('local')->put('training/question-images/restricted.png', 'private image');
    $question = $assessment->questions()->create([
        'question' => 'Restricted question',
        'image_path' => 'training/question-images/restricted.png',
        'points' => 1,
        'position' => 1,
    ]);

    $this->actingAs($processor)->get(route('training.questions.image', $question))->assertForbidden();
});

test('operations can read reports but processors cannot', function () {
    $operations = User::factory()->create(['role' => UserRole::Operations]);
    $processor = User::factory()->create(['role' => UserRole::Processor]);
    $this->actingAs($operations)->get(route('training.reports'))->assertOk();
    $this->actingAs($processor)->get(route('training.reports'))->assertForbidden();
});
