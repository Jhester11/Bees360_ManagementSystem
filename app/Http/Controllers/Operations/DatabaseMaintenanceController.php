<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\DatabaseMaintenanceRun;
use App\Services\RunDatabaseMaintenance;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DatabaseMaintenanceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('operations/database-maintenance', [
            'runs' => DatabaseMaintenanceRun::query()->orderByDesc('id')->limit(10)->get()
                ->map(fn (DatabaseMaintenanceRun $run): array => [
                    'id' => $run->id,
                    'status' => $run->status,
                    'result' => $run->result,
                    'startedAt' => $run->started_at->timezone('Asia/Manila')->format('M j, Y g:i A').' PHT',
                ]),
        ]);
    }

    public function store(Request $request, RunDatabaseMaintenance $maintenance): RedirectResponse
    {
        try {
            $run = $maintenance->run($request->user()->id);
            if ($run === null) {
                return back()->withErrors(['maintenance' => 'Maintenance is already running. Please try again shortly.']);
            }
        } catch (\Throwable $exception) {
            report($exception);

            return back()->withErrors(['maintenance' => 'Maintenance could not finish. Some expired entries may have been cleaned. Please try again.']);
        }

        return to_route('operations.database-maintenance');
    }
}
