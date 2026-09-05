<?php

use App\Http\Controllers\Auth\AccountStatusController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\Operations\DashboardController;
use App\Http\Controllers\Operations\PlatformPullController;
use App\Http\Controllers\Operations\ProcessorPerformanceController;
use App\Http\Controllers\Operations\QaAssessmentImportController;
use App\Http\Controllers\Operations\QueueSnapshotController;
use App\Http\Controllers\Operations\ReportImportController;
use App\Http\Controllers\Operations\UserController;
use App\Http\Controllers\ProcessorNotificationController;
use App\Http\Controllers\Training\AssessmentAttemptController;
use App\Http\Controllers\Training\AssessmentController;
use App\Http\Controllers\Training\AssessmentQuestionImageController;
use App\Http\Controllers\Training\TrainingAssignmentController;
use App\Http\Controllers\Training\TrainingLibraryController;
use App\Http\Controllers\Training\TrainingMaterialController;
use App\Http\Controllers\Training\TrainingReaderController;
use App\Http\Controllers\Training\TrainingReportController;
use App\Http\Controllers\UserAvatarController;
use App\Http\Middleware\EnsureOperationsRole;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login')->name('home');

Route::get('account/status', AccountStatusController::class)
    ->middleware('auth')
    ->name('account.status');

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('training', [TrainingLibraryController::class, 'dashboard'])->name('training.dashboard');
    Route::get('training/library', [TrainingLibraryController::class, 'library'])->name('training.library');
    Route::get('training/my-training', [TrainingLibraryController::class, 'my'])->name('training.my');
    Route::get('training/materials/{material}/read', [TrainingReaderController::class, 'show'])->name('training.materials.read');
    Route::get('training/materials/{material}/file', [TrainingReaderController::class, 'file'])->name('training.materials.file');
    Route::get('training/materials/{material}/cover', [TrainingReaderController::class, 'cover'])->name('training.materials.cover');
    Route::patch('training/materials/{material}/progress', [TrainingReaderController::class, 'progress'])->middleware('throttle:120,1')->name('training.materials.progress');
    Route::post('training/materials/{material}/bookmark', [TrainingReaderController::class, 'bookmark'])->middleware('throttle:60,1')->name('training.materials.bookmark');
    Route::get('training/materials/{material}', [TrainingMaterialController::class, 'show'])->whereNumber('material')->name('training.materials.show');
    Route::get('training/assessments/{assessment}/take', [AssessmentAttemptController::class, 'take'])->name('training.assessments.take');
    Route::post('training/attempts/{attempt}/submit', [AssessmentAttemptController::class, 'submit'])->middleware('throttle:10,1')->name('training.attempts.submit');
    Route::get('training/attempts/{attempt}/result', [AssessmentAttemptController::class, 'result'])->name('training.attempts.result');
    Route::get('training/questions/{question}/image', AssessmentQuestionImageController::class)->name('training.questions.image');

    Route::get('training/materials', [TrainingMaterialController::class, 'index'])->name('training.materials.index');
    Route::get('training/materials/create', [TrainingMaterialController::class, 'create'])->name('training.materials.create');
    Route::post('training/materials', [TrainingMaterialController::class, 'store'])->name('training.materials.store');
    Route::get('training/materials/{material}/edit', [TrainingMaterialController::class, 'edit'])->name('training.materials.edit');
    Route::post('training/materials/{material}', [TrainingMaterialController::class, 'update'])->name('training.materials.update');
    Route::patch('training/materials/{material}/archive', [TrainingMaterialController::class, 'archive'])->name('training.materials.archive');
    Route::delete('training/materials/{material}', [TrainingMaterialController::class, 'destroy'])->name('training.materials.destroy');
    Route::post('training/materials/{material}/versions', [TrainingMaterialController::class, 'version'])->name('training.materials.version');
    Route::get('training/assessments', [AssessmentController::class, 'index'])->name('training.assessments.index');
    Route::get('training/assessments/new', [AssessmentController::class, 'create'])->name('training.assessments.create');
    Route::post('training/assessments', [AssessmentController::class, 'store'])->name('training.assessments.store');
    Route::get('training/assessments/{assessment}', [AssessmentController::class, 'edit'])->name('training.assessments.edit');
    Route::put('training/assessments/{assessment}', [AssessmentController::class, 'update'])->name('training.assessments.update');
    Route::get('training/assignments', [TrainingAssignmentController::class, 'index'])->name('training.assignments.index');
    Route::post('training/assignments', [TrainingAssignmentController::class, 'store'])->name('training.assignments.store');
    Route::get('training/assignments/{assignment}', [TrainingAssignmentController::class, 'show'])->name('training.assignments.show');
    Route::get('training/reports', TrainingReportController::class)->name('training.reports');
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('users/{user}/avatar', UserAvatarController::class)->name('users.avatar');
    Route::post('processor-notifications/read-all', [ProcessorNotificationController::class, 'readAll'])
        ->name('processor-notifications.read-all');
    Route::post('processor-notifications/{notification}/read', [ProcessorNotificationController::class, 'read'])
        ->name('processor-notifications.read');
    Route::post('onboarding/complete', OnboardingController::class)
        ->middleware('throttle:10,1')
        ->name('onboarding.complete');

    Route::middleware(EnsureOperationsRole::class.':operations,trainer,qa,reviewer')->group(function () {
        Route::redirect('operations/training', '/training')->name('operations.training');
        Route::get('operations/mtd', [DashboardController::class, 'mtd'])->name('operations.mtd');

        Route::get('operations/report-comparison', [DashboardController::class, 'comparison'])->name('operations.report-comparison');

        Route::get('operations/reports', [ReportImportController::class, 'index'])->name('operations.reports');
        Route::get('operations/reports/platform-pulls', [PlatformPullController::class, 'index'])->name('operations.platform-pulls');

        Route::get('operations/processors', [ProcessorPerformanceController::class, 'index'])->name('operations.processors');
        Route::post('operations/processors/qa-import', QaAssessmentImportController::class)
            ->middleware(EnsureOperationsRole::class.':operations,qa')
            ->name('operations.processors.qa-import');

        Route::get('operations/queue-monitor', [QueueSnapshotController::class, 'index'])->name('operations.queue-monitor');

        Route::middleware('operations')->group(function () {
            Route::post('operations/reports/import', [ReportImportController::class, 'store'])
                ->middleware('throttle:10,1')
                ->name('operations.reports.import');
            Route::post('operations/processors/cst-import', [ProcessorPerformanceController::class, 'storeCst'])
                ->middleware('throttle:10,1')
                ->name('operations.processors.cst-import');
            Route::post('operations/queue-monitor', [QueueSnapshotController::class, 'store'])
                ->middleware('throttle:10,1')
                ->name('operations.queue-monitor.store');

            Route::get('operations/users', [UserController::class, 'index'])->name('operations.users.index');
            Route::post('operations/users', [UserController::class, 'store'])->name('operations.users.store');
            Route::patch('operations/users/{user}', [UserController::class, 'update'])->name('operations.users.update');
            Route::delete('operations/users/{user}', [UserController::class, 'destroy'])->name('operations.users.destroy');
            Route::patch('operations/users/{user}/status', [UserController::class, 'updateStatus'])->name('operations.users.status');
        });

        Route::get('operations/{section}', function (string $section) {
            $sections = [
                'processors' => ['title' => 'Processors', 'description' => 'Monitor processor performance and workloads.'],
                'users' => ['title' => 'Users', 'description' => 'Manage team accounts and access.'],
                'quality-assurance' => ['title' => 'QA & Scores', 'description' => 'Review quality checks and scoring results.'],
                'settings' => ['title' => 'Operations Settings', 'description' => 'Configure your Bees360 workspace.'],
            ];

            abort_unless(array_key_exists($section, $sections), 404);

            return Inertia::render('operations/coming-soon', $sections[$section]);
        })->where('section', 'reports|quality-assurance|settings');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
