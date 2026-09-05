<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\AssessmentAttempt;
use App\Models\TrainingAssignmentUser;
use App\Models\TrainingMaterial;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TrainingReportController extends Controller
{
    public function __invoke(Request $r)
    {
        $this->authorize('viewReports', TrainingMaterial::class);
        $q = TrainingAssignmentUser::with(['user', 'assignment.material', 'progress', 'attempts' => fn ($x) => $x->whereNotNull('submitted_at')->latest()]);
        if ($r->filled('status')) {
            $q->where('status', $r->string('status'));
        }if ($r->filled('user')) {
            $q->whereHas('user', fn ($x) => $x->where('name', 'like', '%'.$r->string('user').'%'));
        }

        return Inertia::render('training/reports', ['rows' => $q->latest()->paginate(30)->withQueryString(), 'summary' => ['assigned' => TrainingAssignmentUser::count(), 'completed' => TrainingAssignmentUser::where('status', 'completed')->count(), 'failed' => TrainingAssignmentUser::where('status', 'failed')->count(), 'averageScore' => round((float) AssessmentAttempt::whereNotNull('submitted_at')->avg('percentage'), 1)], 'filters' => $r->only('status', 'user')]);
    }
}
