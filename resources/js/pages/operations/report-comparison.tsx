import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { BeesDatePicker, formatDate, processorNames, sampleRecords, type TimeBasis } from '@/pages/dashboard';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Clock3, Equal, GitCompareArrows, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';

type DateRange = {
    start: string;
    end: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations dashboard', href: '/dashboard' },
    { title: 'Report comparison', href: '/operations/report-comparison' },
];

function rangeLabel(range: DateRange) {
    return `${formatDate(range.start)} – ${formatDate(range.end)}`;
}

function deliveryStatus(total: number) {
    if (total < 25) return { label: 'Under delivered', className: 'bg-[#fde1e2] text-[#a5474b]' };
    if (total > 31) return { label: 'Over delivered', className: 'bg-[#e2efd9] text-[#477239]' };

    return { label: 'Delivered', className: 'bg-[#fff0c5] text-[#936000]' };
}

function calculateRange(range: DateRange, processor: string, timeBasis: TimeBasis) {
    const records = sampleRecords.filter(
        (record) => record.date >= range.start && record.date <= range.end && (processor === 'all' || record.processor === processor),
    );
    const daily = new Map<string, { date: string; label: string; total: number }>();
    const byProcessor = new Map<string, { completed: number; accuracyTotal: number; recordCount: number }>();

    records.forEach((record) => {
        const amount = record[timeBasis];
        const currentDay = daily.get(record.date) ?? { date: record.date, label: record.dateLabel, total: 0 };
        currentDay.total += amount;
        daily.set(record.date, currentDay);
        const processorTotals = byProcessor.get(record.processor) ?? { completed: 0, accuracyTotal: 0, recordCount: 0 };
        processorTotals.completed += amount;
        processorTotals.accuracyTotal += record.accuracy;
        processorTotals.recordCount += 1;
        byProcessor.set(record.processor, processorTotals);
    });

    return {
        total: records.reduce((sum, record) => sum + record[timeBasis], 0),
        averageAccuracy: records.length ? records.reduce((sum, record) => sum + record.accuracy, 0) / records.length : 0,
        days: Array.from(daily.values()),
        byProcessor,
    };
}

export default function ReportComparison() {
    const [firstRange, setFirstRange] = useState<DateRange>({ start: '2026-08-01', end: '2026-08-15' });
    const [secondRange, setSecondRange] = useState<DateRange>({ start: '2026-01-01', end: '2026-01-15' });
    const [draftFirstRange, setDraftFirstRange] = useState(firstRange);
    const [draftSecondRange, setDraftSecondRange] = useState(secondRange);
    const [selectedProcessor, setSelectedProcessor] = useState('all');
    const [timeBasis, setTimeBasis] = useState<TimeBasis>('ph');

    const firstData = useMemo(() => calculateRange(firstRange, selectedProcessor, timeBasis), [firstRange, selectedProcessor, timeBasis]);
    const secondData = useMemo(() => calculateRange(secondRange, selectedProcessor, timeBasis), [secondRange, selectedProcessor, timeBasis]);
    const pending =
        firstRange.start !== draftFirstRange.start ||
        firstRange.end !== draftFirstRange.end ||
        secondRange.start !== draftSecondRange.start ||
        secondRange.end !== draftSecondRange.end;
    const difference = firstData.total - secondData.total;
    const processorRows = processorNames
        .filter((name) => selectedProcessor === 'all' || name === selectedProcessor)
        .map((name) => {
            const first = firstData.byProcessor.get(name) ?? { completed: 0, accuracyTotal: 0, recordCount: 0 };
            const second = secondData.byProcessor.get(name) ?? { completed: 0, accuracyTotal: 0, recordCount: 0 };
            const firstAccuracy = first.recordCount ? first.accuracyTotal / first.recordCount : 0;
            const secondAccuracy = second.recordCount ? second.accuracyTotal / second.recordCount : 0;

            return {
                name,
                first: first.completed,
                second: second.completed,
                difference: first.completed - second.completed,
                firstAccuracy,
                secondAccuracy,
                accuracyDifference: firstAccuracy - secondAccuracy,
            };
        });
    const timezoneLabel = timeBasis === 'ph' ? 'PH Time (UTC+8)' : 'CST Time (UTC-6)';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Report comparison" />

            <div className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 md:p-8">
                <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Operations reporting</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">Compare report periods</h1>
                        <p className="mt-2 max-w-2xl text-sm text-[#776a57]">
                            Compare any two date ranges, such as January against August, using sample completed-report data.
                        </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eed8a9] bg-[#fff5dc] px-3 py-1.5 text-xs font-semibold text-[#936000]">
                        <span className="size-2 rounded-full bg-[#e29a17]" />
                        Sample comparison data
                    </span>
                </section>

                <section className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                    <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-[#fff0c9] text-[#a96300]">
                            <GitCompareArrows className="size-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-[#342615]">Select two reporting periods</h2>
                            <p className="text-sm text-[#806f59]">Each period keeps its own date range.</p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr_220px]">
                        {[
                            { title: 'Period A', range: draftFirstRange, setRange: setDraftFirstRange },
                            { title: 'Period B', range: draftSecondRange, setRange: setDraftSecondRange },
                        ].map(({ title, range, setRange }) => (
                            <div key={title} className="rounded-2xl border border-[#efdbac] bg-[#fff9ec] p-4">
                                <p className="mb-3 text-sm font-bold text-[#5d4830]">{title}</p>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                    <BeesDatePicker
                                        id={`${title}-start`}
                                        label="Start date"
                                        value={range.start}
                                        max={range.end}
                                        onChange={(start) =>
                                            setRange((current) => ({ ...current, start, end: current.end < start ? start : current.end }))
                                        }
                                    />
                                    <BeesDatePicker
                                        id={`${title}-end`}
                                        label="End date"
                                        value={range.end}
                                        min={range.start}
                                        onChange={(end) => setRange((current) => ({ ...current, end }))}
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="grid content-start gap-4 rounded-2xl border border-[#efdbac] bg-[#fff9ec] p-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-bold text-[#5d4830]" htmlFor="comparison-processor">
                                    Processor name
                                </label>
                                <Select value={selectedProcessor} onValueChange={setSelectedProcessor}>
                                    <SelectTrigger
                                        id="comparison-processor"
                                        className="h-11 rounded-xl border-[#e2d1b8] bg-white text-[#4b3820] focus:ring-[#d78b13]"
                                    >
                                        <UsersRound className="mr-2 size-4 text-[#a96300]" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All processors</SelectItem>
                                        {processorNames.map((name) => (
                                            <SelectItem key={name} value={name}>
                                                {name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <span className="text-sm font-bold text-[#5d4830]">Reporting time</span>
                                <div className="flex rounded-xl border border-[#e2d1b8] bg-white p-1">
                                    {(['ph', 'cst'] as const).map((basis) => (
                                        <Button
                                            key={basis}
                                            type="button"
                                            onClick={() => setTimeBasis(basis)}
                                            className={`h-9 flex-1 rounded-lg px-2 text-xs font-bold ${timeBasis === basis ? 'bg-[#b96c00] text-white hover:bg-[#925400]' : 'bg-transparent text-[#806f59] hover:bg-[#fff0d1]'}`}
                                        >
                                            {basis === 'ph' ? 'PH Time' : 'CST Time'}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#efdbac] pt-4">
                        <p className="flex items-center gap-2 text-xs text-[#887760]">
                            <Clock3 className="size-3.5 text-[#b26a00]" /> Data is displayed using {timezoneLabel}.
                        </p>
                        <Button
                            type="button"
                            disabled={!pending}
                            onClick={() => {
                                setFirstRange(draftFirstRange);
                                setSecondRange(draftSecondRange);
                            }}
                            className="h-10 gap-2 rounded-xl bg-[#b96c00] px-4 font-bold text-white hover:bg-[#925400] disabled:bg-[#d5b87c]"
                        >
                            <BarChart3 className="size-4" /> Compare periods
                        </Button>
                    </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-5">
                    {[
                        {
                            label: 'Period A reports',
                            value: firstData.total,
                            description: rangeLabel(firstRange),
                            tone: 'bg-[#fff0c9] text-[#a96300]',
                        },
                        {
                            label: 'Period B reports',
                            value: secondData.total,
                            description: rangeLabel(secondRange),
                            tone: 'bg-[#ffeadf] text-[#b34d10]',
                        },
                        {
                            label: 'Difference',
                            value: `${difference > 0 ? '+' : ''}${difference}`,
                            description: difference === 0 ? 'No change between periods' : `Period ${difference > 0 ? 'A is higher' : 'B is higher'}`,
                            tone: difference >= 0 ? 'bg-[#e6f5e5] text-[#28703c]' : 'bg-[#fde1e2] text-[#a5474b]',
                        },
                        {
                            label: 'Period A accuracy',
                            value: `${firstData.averageAccuracy.toFixed(1)}%`,
                            description: rangeLabel(firstRange),
                            tone: 'bg-[#e6f5e5] text-[#28703c]',
                        },
                        {
                            label: 'Period B accuracy',
                            value: `${secondData.averageAccuracy.toFixed(1)}%`,
                            description: rangeLabel(secondRange),
                            tone: 'bg-[#edf0ff] text-[#4958a4]',
                        },
                    ].map((metric) => (
                        <article
                            key={metric.label}
                            className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)]"
                        >
                            <div className={`grid size-10 place-items-center rounded-xl ${metric.tone}`}>
                                <CalendarDays className="size-5" />
                            </div>
                            <p className="mt-4 text-sm font-medium text-[#806f59]">{metric.label}</p>
                            <p className="mt-1 text-3xl font-bold tracking-tight text-[#342615]">{metric.value}</p>
                            <p className="mt-2 text-xs text-[#9a8a72]">{metric.description}</p>
                        </article>
                    ))}
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#eadbc6] bg-[#fffdf8] shadow-[0_8px_30px_rgb(88,57,18,0.05)]">
                    <div className="flex flex-col justify-between gap-4 border-b border-[#f0e5d4] p-5 sm:p-6 lg:flex-row lg:items-center">
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-[#342615]">Processor difference table</h2>
                            <p className="mt-1 text-sm text-[#806f59]">
                                See completed reports, accuracy, and the exact change between the two periods.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                            <span className="text-[#806f59]">Daily status:</span>
                            <span className="rounded-full bg-[#fde1e2] px-2.5 py-1 text-[#a5474b]">Under &lt; 25</span>
                            <span className="rounded-full bg-[#fff0c5] px-2.5 py-1 text-[#936000]">Delivered 25–31</span>
                            <span className="rounded-full bg-[#e2efd9] px-2.5 py-1 text-[#477239]">Over &gt; 31</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left text-sm">
                            <thead className="bg-[#fff8e8] text-xs tracking-wide text-[#806f59] uppercase">
                                <tr>
                                    <th className="px-5 py-3 font-bold">Processor</th>
                                    <th className="px-5 py-3 font-bold">Period A · {rangeLabel(firstRange)}</th>
                                    <th className="px-5 py-3 font-bold">Period B · {rangeLabel(secondRange)}</th>
                                    <th className="px-5 py-3 font-bold">Report difference</th>
                                    <th className="px-5 py-3 font-bold">A accuracy</th>
                                    <th className="px-5 py-3 font-bold">B accuracy</th>
                                    <th className="px-5 py-3 font-bold">Accuracy change</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f1e7d8]">
                                {processorRows.map((row) => (
                                    <tr key={row.name}>
                                        <td className="px-5 py-4 font-bold text-[#4a3821]">{row.name}</td>
                                        <td className="px-5 py-4 font-semibold text-[#4a3821]">{row.first}</td>
                                        <td className="px-5 py-4 font-semibold text-[#4a3821]">{row.second}</td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${row.difference > 0 ? 'bg-[#e2efd9] text-[#477239]' : row.difference < 0 ? 'bg-[#fde1e2] text-[#a5474b]' : 'bg-[#f1ede4] text-[#776a57]'}`}
                                            >
                                                {row.difference > 0 ? (
                                                    <ArrowUpRight className="size-3.5" />
                                                ) : row.difference < 0 ? (
                                                    <ArrowDownRight className="size-3.5" />
                                                ) : (
                                                    <Equal className="size-3.5" />
                                                )}
                                                {row.difference > 0 ? '+' : ''}
                                                {row.difference}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-semibold text-[#28703c]">{row.firstAccuracy.toFixed(1)}%</td>
                                        <td className="px-5 py-4 font-semibold text-[#4958a4]">{row.secondAccuracy.toFixed(1)}%</td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.accuracyDifference > 0 ? 'bg-[#e2efd9] text-[#477239]' : row.accuracyDifference < 0 ? 'bg-[#fde1e2] text-[#a5474b]' : 'bg-[#f1ede4] text-[#776a57]'}`}
                                            >
                                                {row.accuracyDifference > 0 ? '+' : ''}
                                                {row.accuracyDifference.toFixed(1)} pts
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                    {[
                        { title: 'Period A daily reports', range: firstRange, data: firstData },
                        { title: 'Period B daily reports', range: secondRange, data: secondData },
                    ].map(({ title, range, data }) => (
                        <article
                            key={title}
                            className="overflow-hidden rounded-2xl border border-[#eadbc6] bg-[#fffdf8] shadow-[0_8px_30px_rgb(88,57,18,0.05)]"
                        >
                            <div className="border-b border-[#f0e5d4] p-5">
                                <h2 className="font-bold text-[#342615]">{title}</h2>
                                <p className="mt-1 text-sm text-[#806f59]">{rangeLabel(range)}</p>
                            </div>
                            <div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#fff8e8] text-xs tracking-wide text-[#806f59] uppercase">
                                        <tr>
                                            <th className="px-5 py-3">Date</th>
                                            <th className="px-5 py-3">Completed</th>
                                            <th className="px-5 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f1e7d8]">
                                        {data.days.map((day) => {
                                            const status = deliveryStatus(day.total);

                                            return (
                                                <tr key={day.date}>
                                                    <td className="px-5 py-3 font-semibold text-[#4a3821]">{day.label}</td>
                                                    <td className="px-5 py-3 font-bold text-[#4a3821]">{day.total}</td>
                                                    <td className="px-5 py-3">
                                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </article>
                    ))}
                </section>
            </div>
        </AppLayout>
    );
}
