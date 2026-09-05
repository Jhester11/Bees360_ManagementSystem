<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Http\Requests\Training\UpdateReadingProgressRequest;
use App\Models\TrainingAssignmentUser;
use App\Models\TrainingBookmark;
use App\Models\TrainingMaterial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TrainingReaderController extends Controller
{
    public function show(Request $r, TrainingMaterial $material)
    {
        $this->authorize('view', $material);
        $au = TrainingAssignmentUser::with('progress')->where('user_id', $r->user()->id)->whereHas('assignment', fn ($q) => $q->where('training_material_id', $material->id))->latest()->first();

        return Inertia::render('training/reader', ['material' => $material->load(['subject', 'topic']), 'assignmentUser' => $au, 'bookmarks' => TrainingBookmark::whereBelongsTo($r->user())->where('training_material_id', $material->id)->pluck('page'), 'fileUrl' => route('training.materials.file', $material)]);
    }

    public function file(TrainingMaterial $material)
    {
        $this->authorize('view', $material);
        abort_unless(Storage::disk('local')->exists($material->pdf_path), 404);

        return Storage::disk('local')->response($material->pdf_path, $material->title.'.pdf', ['Content-Type' => 'application/pdf', 'Content-Disposition' => 'inline']);
    }

    public function cover(TrainingMaterial $material)
    {
        $this->authorize('view', $material);
        abort_unless($material->cover_path && Storage::disk('local')->exists($material->cover_path), 404);

        return Storage::disk('local')->response($material->cover_path);
    }

    public function progress(UpdateReadingProgressRequest $r, TrainingMaterial $material)
    {
        $this->authorize('view', $material);
        $au = TrainingAssignmentUser::where('user_id', $r->user()->id)->whereHas('assignment', fn ($q) => $q->where('training_material_id', $material->id))->latest()->firstOrFail();
        $page = min($r->integer('page'), $r->integer('total_pages'));
        $existing = $au->progress;
        $percent = max((float) ($existing?->progress_percentage ?? 0), round($page / $r->integer('total_pages') * 100, 2));
        $p = $au->progress()->updateOrCreate([], ['last_read_page' => $page, 'total_pages' => $r->integer('total_pages'), 'progress_percentage' => $percent, 'started_at' => $existing?->started_at ?? now(), 'reading_completed_at' => $percent >= 100 ? ($existing?->reading_completed_at ?? now()) : null]);
        $material->update(['total_pages' => $r->integer('total_pages')]);
        $assessmentRequired = $material->assessment_required;
        if ($percent >= 100 && ! $assessmentRequired) {
            $au->update(['status' => 'completed', 'completed_at' => now()]);
        } else {
            $au->update(['status' => $percent >= 100 ? 'assessment_pending' : 'in_progress']);
        }

        return response()->json(['progress' => $p, 'status' => $au->status]);
    }

    public function bookmark(Request $r, TrainingMaterial $material)
    {
        $this->authorize('view', $material);
        $d = $r->validate(['page' => ['required', 'integer', 'min:1']]);
        $b = TrainingBookmark::where(['user_id' => $r->user()->id, 'training_material_id' => $material->id, 'page' => $d['page']])->first();
        if ($b) {
            $b->delete();

            return response()->json(['bookmarked' => false]);
        }TrainingBookmark::create(['user_id' => $r->user()->id, 'training_material_id' => $material->id, 'page' => $d['page']]);

        return response()->json(['bookmarked' => true]);
    }
}
