<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Http\Requests\Training\StoreTrainingAssignmentRequest;
use App\Models\TrainingAssignment;
use App\Models\TrainingMaterial;
use App\Models\User;
use App\Services\TrainingService;
use Inertia\Inertia;

class TrainingAssignmentController extends Controller
{
    public function __construct(private TrainingService $service) {}

    public function index()
    {
        $this->authorize('manage', TrainingMaterial::class);

        return Inertia::render('training/assignments', ['assignments' => TrainingAssignment::with('material')->withCount('users')->latest()->paginate(20), 'materials' => TrainingMaterial::where('status', 'published')->with('assessment')->get(['id', 'title']), 'users' => User::where('is_active', true)->orderBy('name')->get(['id', 'name', 'role', 'batch'])]);
    }

    public function store(StoreTrainingAssignmentRequest $r)
    {
        $a = $this->service->assign($r->validated(), $r->user());

        return to_route('training.assignments.show', $a)->with('success', 'Training assigned.');
    }

    public function show(TrainingAssignment $assignment)
    {
        $this->authorize('viewReports', TrainingMaterial::class);

        return Inertia::render('training/assignment-show', ['assignment' => $assignment->load(['material', 'assessment', 'assigner', 'users.user', 'users.progress', 'users.attempts' => fn ($q) => $q->whereNotNull('submitted_at')->latest()])]);
    }
}
