<?php

use App\Http\Controllers\Operations\DashboardController;
use App\Http\Controllers\Operations\PlatformPullController;
use App\Http\Controllers\Operations\QueueSnapshotController;
use App\Http\Controllers\Operations\ReportImportController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('operations/mtd', [DashboardController::class, 'mtd'])->name('operations.mtd');

    Route::get('operations/report-comparison', [DashboardController::class, 'comparison'])->name('operations.report-comparison');

    Route::get('operations/reports', [ReportImportController::class, 'index'])->name('operations.reports');
    Route::post('operations/reports/import', [ReportImportController::class, 'store'])->name('operations.reports.import');
    Route::get('operations/reports/platform-pulls', [PlatformPullController::class, 'index'])->name('operations.platform-pulls');

    Route::get('operations/queue-monitor', [QueueSnapshotController::class, 'index'])->name('operations.queue-monitor');
    Route::post('operations/queue-monitor', [QueueSnapshotController::class, 'store'])->name('operations.queue-monitor.store');

    Route::get('operations/{section}', function (string $section) {
        $sections = [
            'processors' => ['title' => 'Processors', 'description' => 'Monitor processor performance and workloads.'],
            'users' => ['title' => 'Users', 'description' => 'Manage team accounts and access.'],
            'training' => ['title' => 'Training Center', 'description' => 'Create and organize learning materials.'],
            'quality-assurance' => ['title' => 'QA & Scores', 'description' => 'Review quality checks and scoring results.'],
            'settings' => ['title' => 'Operations Settings', 'description' => 'Configure your Bees360 workspace.'],
        ];

        abort_unless(array_key_exists($section, $sections), 404);

        return Inertia::render('operations/coming-soon', $sections[$section]);
    })->where('section', 'reports|processors|users|training|quality-assurance|settings');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
