<?php

namespace App\Http\Controllers\Operations;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\CstProcessorMetric;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CstReportController extends Controller
{
    private const PROCESSOR_ALIASES = [
        'arianne lopez' => 'Arianne Joy Lopez',
        'chris gozon' => 'Christer John C. Gozon',
        'christer gozon' => 'Christer John C. Gozon',
        'christer john gozon' => 'Christer John C. Gozon',
        'denn zafe' => 'Denn Charles Zafe',
        'desh completado' => 'Lourdes M. Completado',
        'don santos' => 'Elacio M. Santos Jr.',
        'jhun lester cervantes' => 'Jhun Cervantes',
        'king palo' => 'Reginald King Palo',
        'kristine espiritu' => 'Kristine Jewel Espiritu',
        'mac payongayong' => 'Mac Evens T. Payongayong',
        'marie moog' => 'Marie Anthonette Moog',
        'oliver noble' => 'Mc Oliver Noble',
        'rainier ana' => 'Rainier Sta Ana',
        'rheven aladin' => 'Rheven Violet Aladin',
        'tracy josafat' => 'Tracy John Josafat',
        'wengmir africa' => 'Wengmir A. Africa',
    ];

    public function __invoke(Request $request): Response
    {
        $phToday = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $startDate = $this->dateOrDefault($request->string('start_date')->toString(), $phToday->startOfMonth());
        $endDate = $this->dateOrDefault($request->string('end_date')->toString(), $phToday);

        if ($startDate->greaterThan($endDate)) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        $processor = trim($request->string('processor')->toString());
        $query = CstProcessorMetric::query()
            ->whereBetween('report_date', [$startDate->toDateString(), $endDate->toDateString()]);

        $rows = $processor === ''
            ? collect()
            : $query
                ->orderByDesc('report_date')
                ->orderBy('processor_name')
                ->get(['id', 'report_date', 'processor_name', 'general_exterior', 'four_point'])
                ->filter(fn (CstProcessorMetric $metric): bool => $processor === 'all'
                    || $this->canonicalProcessorName($metric->processor_name) === $this->canonicalProcessorName($processor))
                ->map(fn (CstProcessorMetric $metric): array => [
                    'id' => $metric->id,
                    'date' => $metric->report_date->format('Y-m-d'),
                    'processor' => $this->canonicalProcessorName($metric->processor_name),
                    'generalExterior' => $metric->general_exterior,
                    'fourPoint' => $metric->four_point,
                    'total' => $metric->general_exterior + $metric->four_point,
                ])
                // Filtering a collection preserves its database indexes. Inertia
                // serializes sparse indexes as an object, while the React page
                // correctly expects a list that supports rows.map(...).
                ->values();

        return Inertia::render('operations/cst-reports', [
            'rows' => $rows,
            'processorNames' => $this->processorNames(),
            'filters' => [
                'startDate' => $startDate->toDateString(),
                'endDate' => $endDate->toDateString(),
                'processor' => $processor,
            ],
            'summary' => [
                'generalExterior' => $rows->sum('generalExterior'),
                'fourPoint' => $rows->sum('fourPoint'),
                'total' => $rows->sum('total'),
            ],
            'canImport' => $request->user()?->role === UserRole::Operations,
            'phToday' => $phToday->toDateString(),
        ]);
    }

    /** @return Collection<int, string> */
    private function processorNames(): Collection
    {
        return CstProcessorMetric::query()
            ->distinct()
            ->orderBy('processor_name')
            ->pluck('processor_name')
            ->merge(User::query()
                ->where('role', UserRole::Processor->value)
                ->where('is_active', true)
                ->orderBy('name')
                ->pluck('name'))
            ->filter()
            ->map(fn (string $name): string => $this->canonicalProcessorName($name))
            ->unique()
            ->sort()
            ->values();
    }

    private function canonicalProcessorName(string $name): string
    {
        $normalized = Str::of($name)->lower()->replaceMatches('/[^a-z0-9]+/', ' ')->squish()->value();

        return self::PROCESSOR_ALIASES[$normalized] ?? trim($name);
    }

    private function dateOrDefault(string $date, CarbonImmutable $default): CarbonImmutable
    {
        try {
            return $date !== '' ? CarbonImmutable::createFromFormat('!Y-m-d', $date, 'Asia/Manila') : $default;
        } catch (\Throwable) {
            return $default;
        }
    }
}
