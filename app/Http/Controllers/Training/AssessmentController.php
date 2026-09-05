<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Http\Requests\Training\StoreAssessmentRequest;
use App\Models\Assessment;
use App\Models\TrainingMaterial;
use App\Services\TrainingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Throwable;

class AssessmentController extends Controller
{
    public function __construct(private TrainingService $service) {}

    public function index()
    {
        $this->authorize('manage', TrainingMaterial::class);

        return Inertia::render('training/assessments', ['assessments' => Assessment::with('material')->withCount('questions')->latest()->paginate(20), 'materials' => TrainingMaterial::where('status', '!=', 'archived')->get(['id', 'title'])]);
    }

    public function create()
    {
        $this->authorize('manage', TrainingMaterial::class);

        return Inertia::render('training/assessment-builder', ['materials' => TrainingMaterial::where('status', '!=', 'archived')->get(['id', 'title'])]);
    }

    public function edit(Assessment $assessment)
    {
        $this->authorize('manage', TrainingMaterial::class);
        $assessment->load('questions.choices');
        $assessment->questions->each(fn ($q) => $q->choices->each->makeVisible('is_correct'));

        return Inertia::render('training/assessment-builder', ['assessment' => $assessment, 'materials' => TrainingMaterial::get(['id', 'title'])]);
    }

    public function store(StoreAssessmentRequest $r)
    {
        $material = TrainingMaterial::findOrFail($r->integer('training_material_id'));
        $this->authorize('update', $material);
        $a = $this->persist($r, $material->assessment);

        return to_route('training.assessments.edit', $a)->with('success', 'Assessment saved.');
    }

    public function update(StoreAssessmentRequest $r, Assessment $assessment)
    {
        $this->authorize('manage', TrainingMaterial::class);
        $this->persist($r, $assessment);

        return back()->with('success', 'Assessment updated.');
    }

    private function persist(StoreAssessmentRequest $r, ?Assessment $a): Assessment
    {
        $newImagePaths = [];

        try {
            return DB::transaction(function () use ($r, $a, &$newImagePaths) {
                $d = $r->validated();
                $questions = $d['questions'];
                unset($d['questions']);
                $d['created_by'] = $a?->created_by ?? $r->user()->id;
                $d['training_material_id'] = $a?->training_material_id ?? $r->integer('training_material_id');
                $a ? $a->update($d) : $a = Assessment::create($d);

                $oldImagePaths = $a->questions()->pluck('image_path', 'id');
                $retainedImagePaths = collect();
                $a->questions()->delete();

                foreach ($questions as $i => $questionData) {
                    $choices = $questionData['choices'];
                    $sourceId = $questionData['id'] ?? null;
                    $image = $questionData['image'] ?? null;
                    $imagePath = $sourceId ? $oldImagePaths->get($sourceId) : null;

                    if ($image) {
                        $imagePath = $image->store('training/question-images', 'local');
                        $newImagePaths[] = $imagePath;
                    } elseif ($questionData['remove_image'] ?? false) {
                        $imagePath = null;
                    }

                    unset($questionData['id'], $questionData['image'], $questionData['remove_image'], $questionData['choices']);
                    $questionData['image_path'] = $imagePath;
                    $question = $a->questions()->create($questionData + ['position' => $i + 1]);

                    if ($imagePath) {
                        $retainedImagePaths->push($imagePath);
                    }

                    foreach ($choices as $j => $choice) {
                        $question->choices()->create($choice + ['position' => $j + 1]);
                    }
                }

                $unusedImagePaths = $oldImagePaths->filter()->diff($retainedImagePaths)->values()->all();
                DB::afterCommit(fn () => Storage::disk('local')->delete($unusedImagePaths));
                $this->service->audit($a->wasRecentlyCreated ? 'assessment_created' : 'assessment_updated', $a);

                return $a;
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($newImagePaths);

            throw $exception;
        }
    }
}
