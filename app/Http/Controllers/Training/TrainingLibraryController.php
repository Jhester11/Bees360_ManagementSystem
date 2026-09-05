<?php

namespace App\Http\Controllers\Training;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AssessmentAttempt;
use App\Models\TrainingAssignment;
use App\Models\TrainingAssignmentUser;
use App\Models\TrainingMaterial;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TrainingLibraryController extends Controller
{
    public function dashboard(Request $r)
    {
        if (in_array($r->user()->role, [UserRole::Trainer, UserRole::Operations], true)) {
            return Inertia::render('training/dashboard', ['stats' => ['materials' => TrainingMaterial::count(), 'published' => TrainingMaterial::where('status', 'published')->count(), 'activeAssignments' => TrainingAssignment::where('is_active', true)->count(), 'usersAssigned' => TrainingAssignmentUser::distinct('user_id')->count('user_id'), 'completed' => TrainingAssignmentUser::where('status', 'completed')->count(), 'pending' => TrainingAssignmentUser::whereIn('status', ['not_started', 'in_progress'])->count(), 'failed' => TrainingAssignmentUser::where('status', 'failed')->count(), 'averageScore' => round((float) AssessmentAttempt::whereNotNull('submitted_at')->avg('percentage'), 1)]]);
        }

        return $this->my($r);
    }

    public function library(Request $r)
    {
        $q = TrainingMaterial::with(['subject', 'topic', 'author', 'audiences'])->visibleTo($r->user());
        if ($r->user()->role === UserRole::Processor) {
            $q->where('status', 'published');
        }
        foreach (['category', 'difficulty', 'status'] as $f) {
            if ($r->filled($f)) {
                $q->where($f, $r->string($f));
            }
        }
        if ($r->filled('subject')) {
            $q->whereHas('subject', fn ($x) => $x->where('name', $r->string('subject')));
        }
        if ($r->filled('topic')) {
            $q->whereHas('topic', fn ($x) => $x->where('name', $r->string('topic')));
        }
        if ($r->filled('audience')) {
            $q->whereHas('audiences', fn ($x) => $x->where('audience', $r->string('audience')));
        }
        if ($r->filled('trainer')) {
            $q->whereHas('author', fn ($x) => $x->where('name', 'like', '%'.$r->string('trainer').'%'));
        }
        if ($r->filled('published_date')) {
            $q->whereDate('published_at', $r->date('published_date'));
        }
        if ($r->filled('search')) {
            $q->where(fn ($x) => $x->where('title', 'like', '%'.$r->string('search').'%')->orWhere('description', 'like', '%'.$r->string('search').'%'));
        }

        return Inertia::render('training/library', ['materials' => $q->latest()->paginate(12)->withQueryString(), 'filters' => $r->only('search', 'category', 'difficulty', 'status', 'subject', 'topic', 'audience', 'trainer', 'published_date')]);
    }

    public function my(Request $r)
    {
        $items = TrainingAssignmentUser::with(['assignment.material.subject', 'assignment.material.topic', 'assignment.assessment', 'progress', 'attempts' => fn ($q) => $q->whereNotNull('submitted_at')->latest()])->where('user_id', $r->user()->id)->latest('assigned_at')->get();

        return Inertia::render('training/my-training', ['assignments' => $items, 'summary' => ['required' => $items->whereNotIn('status', ['completed'])->count(), 'inProgress' => $items->where('status', 'in_progress')->count(), 'completed' => $items->where('status', 'completed')->count(), 'failed' => $items->where('status', 'failed')->count()]]);
    }
}
