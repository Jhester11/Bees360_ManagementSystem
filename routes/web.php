<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('operations/mtd', function () {
        return Inertia::render('dashboard', ['showReportRange' => true]);
    })->name('operations.mtd');

    Route::get('operations/report-comparison', function () {
        return Inertia::render('operations/report-comparison');
    })->name('operations.report-comparison');

    Route::get('operations/{section}', function (string $section) {
        $sections = [
            'reports' => ['title' => 'Reports', 'description' => 'Review and manage submitted reports.'],
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
