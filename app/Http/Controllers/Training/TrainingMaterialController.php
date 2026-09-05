<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Http\Requests\Training\StoreTrainingMaterialRequest;
use App\Models\TrainingMaterial;
use App\Models\TrainingSubject;
use App\Models\TrainingTopic;
use App\Services\TrainingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TrainingMaterialController extends Controller
{
    public function __construct(private TrainingService $service) {}

    public function index()
    {
        $this->authorize('manage', TrainingMaterial::class);

        return Inertia::render('training/materials', ['materials' => TrainingMaterial::with(['subject', 'topic', 'audiences'])->latest()->paginate(20)]);
    }

    public function create()
    {
        $this->authorize('create', TrainingMaterial::class);

        return Inertia::render('training/material-form');
    }

    public function show(TrainingMaterial $material)
    {
        $this->authorize('view', $material);

        return Inertia::render('training/material-show', ['material' => $material->load(['subject', 'topic', 'author', 'audiences', 'assessment'])]);
    }

    public function edit(TrainingMaterial $material)
    {
        $this->authorize('update', $material);

        return Inertia::render('training/material-form', ['material' => $material->load(['subject', 'topic', 'audiences'])]);
    }

    public function store(StoreTrainingMaterialRequest $r)
    {
        $m = $this->persist($r);

        return to_route('training.materials.show', $m)->with('success', 'Training material created.');
    }

    public function update(StoreTrainingMaterialRequest $r, TrainingMaterial $material)
    {
        $this->authorize('update', $material);
        $this->persist($r, $material);

        return to_route('training.materials.show', $material)->with('success', 'Training material updated.');
    }

    private function persist(StoreTrainingMaterialRequest $r, ?TrainingMaterial $m = null): TrainingMaterial
    {
        return DB::transaction(function () use ($r, $m) {
            $d = $r->validated();
            $s = TrainingSubject::firstOrCreate(['name' => $d['subject']]);
            $t = TrainingTopic::firstOrCreate(['training_subject_id' => $s->id, 'name' => $d['topic']]);
            $oldPdf = $m?->pdf_path;
            $oldCover = $m?->cover_path;
            if ($r->hasFile('pdf')) {
                $d['pdf_path'] = $r->file('pdf')->store('training/pdfs', 'local');
                $d['pdf_size'] = $r->file('pdf')->getSize();
            }if ($r->hasFile('cover')) {
                $d['cover_path'] = $r->file('cover')->store('training/covers', 'local');
            }$d['training_subject_id'] = $s->id;
            $d['training_topic_id'] = $t->id;
            $d['created_by'] = $m?->created_by ?? $r->user()->id;
            unset($d['subject'],$d['topic'],$d['audiences'],$d['pdf'],$d['cover']);
            $m ? $m->update($d) : $m = TrainingMaterial::create($d);
            $m->audiences()->delete();
            foreach ($r->validated('audiences') as $a) {
                $m->audiences()->create(['audience' => $a]);
            }if ($oldPdf && $r->hasFile('pdf')) {
                Storage::disk('local')->delete($oldPdf);
            }if ($oldCover && $r->hasFile('cover')) {
                Storage::disk('local')->delete($oldCover);
            }$this->service->audit($m->wasRecentlyCreated ? 'training_created' : 'training_updated', $m);

            return $m;
        });
    }

    public function archive(TrainingMaterial $material)
    {
        $this->authorize('update', $material);
        $material->update(['status' => 'archived']);
        $this->service->audit('training_archived', $material);

        return back()->with('success', 'Material archived.');
    }

    public function destroy(TrainingMaterial $material)
    {
        $this->authorize('delete', $material);
        $material->delete();
        $this->service->audit('training_deleted', $material);

        return to_route('training.materials.index')->with('success', 'Draft deleted.');
    }

    public function version(TrainingMaterial $material)
    {
        $this->authorize('update', $material);
        $copy = $material->replicate(['published_at']);
        $copy->parent_id = $material->parent_id ?: $material->id;
        $copy->version = request('version', '2.0');
        $copy->status = 'draft';
        $copy->save();
        foreach ($material->audiences as $a) {
            $copy->audiences()->create(['audience' => $a->audience]);
        }$this->service->audit('training_version_created', $copy);

        return to_route('training.materials.edit', $copy);
    }
}
