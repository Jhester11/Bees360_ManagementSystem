import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock3,
    FileCheck2,
    Files,
    Trophy,
    UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type TimeBasis = 'ph' | 'cst';

export type ReportRecord = {
    month: string;
    date: string;
    dateLabel: string;
    processor: string;
    ph: number;
    cst: number;
    accuracy: number;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Operations dashboard', href: '/dashboard' }];

export const months = Array.from({ length: 12 }, (_, monthIndex) => ({
    value: `2026-${String(monthIndex + 1).padStart(2, '0')}`,
    label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, monthIndex, 1))),
}));

export const processorNames = ['Maria Santos', 'Jordan Lee', 'Aisha Rahman', 'Don Santos'];

const weeklyFinished = [
    { day: 'Mon', reports: 42 },
    { day: 'Tue', reports: 56 },
    { day: 'Wed', reports: 49 },
    { day: 'Thu', reports: 68 },
    { day: 'Fri', reports: 63 },
    { day: 'Sat', reports: 31 },
    { day: 'Sun', reports: 38 },
];

// Mock records only. These will be replaced by report records when the data source is ready.
export const sampleRecords: ReportRecord[] = months.flatMap((month, monthIndex) =>
    Array.from({ length: 15 }, (_, dayIndex) =>
        processorNames.map((processor, processorIndex) => {
            const date = `${month.value}-${String(dayIndex + 1).padStart(2, '0')}`;
            const ph = 18 + processorIndex * 2 + ((dayIndex * 7 + monthIndex * 3 + processorIndex * 5) % 17);

            return {
                month: month.value,
                date,
                dateLabel: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
                    new Date(`${date}T00:00:00Z`),
                ),
                processor,
                ph,
                cst: ph - ((dayIndex + processorIndex + monthIndex) % 3 === 0 ? 2 : 1),
                accuracy: 94 + ((dayIndex * 3 + monthIndex * 2 + processorIndex * 4) % 58) / 10,
            };
        }),
    ).flat(),
);

function reportStatus(total: number) {
    if (total < 25) return { label: 'Under delivered', className: 'bg-[#fde1e2] text-[#a5474b]' };
    if (total > 31) return { label: 'Over delivered', className: 'bg-[#e2efd9] text-[#477239]' };

    return { label: 'Delivered', className: 'bg-[#fff0c5] text-[#936000]' };
}

export function formatDate(date: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${date}T00:00:00Z`),
    );
}

function philippineGreeting() {
    const hour = Number(
        new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hourCycle: 'h23',
            timeZone: 'Asia/Manila',
        }).format(new Date()),
    );

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';

    return 'Good evening';
}

export function BeesDatePicker({
    id,
    label,
    value,
    min,
    max,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    min?: string;
    max?: string;
    onChange: (value: string) => void;
}) {
    const selectedDate = new Date(`${value}T00:00:00Z`);
    const [isOpen, setIsOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1)));
    const year = viewMonth.getUTCFullYear();
    const month = viewMonth.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => (index < firstDay ? null : index - firstDay + 1));
    const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(viewMonth);

    const openCalendar = () => {
        setViewMonth(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1)));
        setIsOpen(true);
    };

    const selectDay = (day: number) => {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(date);
        setIsOpen(false);
    };

    return (
        <div className="relative grid gap-1.5">
            <label className="px-1 text-xs font-bold text-[#6d5735]" htmlFor={id}>
                {label}
            </label>
            <button
                id={id}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                onClick={openCalendar}
                className="flex h-11 w-full items-center gap-2 rounded-xl border border-[#dfc58f] bg-white px-3 text-left text-sm font-semibold text-[#4b3820] shadow-sm transition hover:border-[#c98211] focus-visible:ring-2 focus-visible:ring-[#d78b13] focus-visible:outline-hidden"
            >
                <CalendarDays className="size-4 shrink-0 text-[#b26a00]" />
                <span className="min-w-0 flex-1 truncate">{formatDate(value)}</span>
                <ChevronDown className="size-4 text-[#a36a14]" />
            </button>

            {isOpen && (
                <div
                    role="dialog"
                    aria-label={`${label} calendar`}
                    className="absolute top-[calc(100%+0.5rem)] z-50 w-72 rounded-2xl border border-[#e5c978] bg-[#fffdf8] p-4 shadow-[0_18px_40px_rgba(85,53,10,0.2)]"
                >
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setViewMonth(new Date(Date.UTC(year, month - 1, 1)))}
                            className="grid size-8 place-items-center rounded-lg text-[#8b5a0c] hover:bg-[#fff0cb]"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        <div className="text-center">
                            <p className="text-sm font-bold text-[#3d2b14]">{monthLabel}</p>
                            <p className="text-[10px] font-bold tracking-[0.13em] text-[#b26a00] uppercase">Bees360 calendar</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setViewMonth(new Date(Date.UTC(year, month + 1, 1)))}
                            className="grid size-8 place-items-center rounded-lg text-[#8b5a0c] hover:bg-[#fff0cb]"
                            aria-label="Next month"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                    <div className="mt-4 grid grid-cols-7 text-center text-[10px] font-bold tracking-wide text-[#9d6e28] uppercase">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                            <span key={day} className="py-1">
                                {day}
                            </span>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1 text-center">
                        {days.map((day, index) => {
                            if (!day) return <span key={`blank-${index}`} className="size-8" />;
                            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isDisabled = Boolean((min && date < min) || (max && date > max));
                            const isSelected = date === value;
                            return (
                                <button
                                    key={date}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => selectDay(day)}
                                    className={`mx-auto grid size-8 place-items-center rounded-lg text-xs font-semibold transition ${isSelected ? 'bg-[#bd7200] text-white shadow-sm' : 'text-[#4b3820] hover:bg-[#fff0cb]'} disabled:cursor-not-allowed disabled:text-[#d6c7ae] disabled:hover:bg-transparent`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[#f1e2c3] pt-3">
                        <button type="button" onClick={() => setIsOpen(false)} className="text-xs font-bold text-[#9b691e] hover:text-[#714300]">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                                onChange(firstDay);
                                setIsOpen(false);
                            }}
                            className="text-xs font-bold text-[#a96300] hover:text-[#714300]"
                        >
                            Select first day
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Dashboard({ showReportRange = false }: { showReportRange?: boolean }) {
    const [startDate, setStartDate] = useState('2026-08-01');
    const [endDate, setEndDate] = useState('2026-08-15');
    const [selectedProcessor, setSelectedProcessor] = useState('all');
    const [timeBasis, setTimeBasis] = useState<TimeBasis>('ph');
    const [greeting, setGreeting] = useState(philippineGreeting);

    useEffect(() => {
        const timer = window.setInterval(() => setGreeting(philippineGreeting()), 60_000);

        return () => window.clearInterval(timer);
    }, []);

    const visibleRecords = useMemo(
        () =>
            sampleRecords.filter(
                (record) =>
                    record.date >= startDate && record.date <= endDate && (selectedProcessor === 'all' || record.processor === selectedProcessor),
            ),
        [endDate, selectedProcessor, startDate],
    );

    const dashboardData = useMemo(() => {
        const daily = new Map<string, { date: string; dateLabel: string; reports: number }>();
        const processors = new Map<string, { completed: number; accuracyTotal: number; recordCount: number }>();

        visibleRecords.forEach((record) => {
            const count = record[timeBasis];
            const currentDaily = daily.get(record.date) ?? { date: record.date, dateLabel: record.dateLabel, reports: 0 };
            currentDaily.reports += count;
            daily.set(record.date, currentDaily);
            const processor = processors.get(record.processor) ?? { completed: 0, accuracyTotal: 0, recordCount: 0 };
            processor.completed += count;
            processor.accuracyTotal += record.accuracy;
            processor.recordCount += 1;
            processors.set(record.processor, processor);
        });

        const dailyReports = Array.from(daily.values()).map((report) => ({ ...report, ...reportStatus(report.reports) }));
        const rankedProcessors = Array.from(processors, ([name, processor]) => ({
            name,
            completed: processor.completed,
            accuracy: processor.recordCount ? processor.accuracyTotal / processor.recordCount : 0,
        })).sort((a, b) => b.completed - a.completed);
        const total = visibleRecords.reduce((sum, record) => sum + record[timeBasis], 0);
        const averageAccuracy = visibleRecords.length ? visibleRecords.reduce((sum, record) => sum + record.accuracy, 0) / visibleRecords.length : 0;

        return {
            dailyReports,
            rankedProcessors,
            total,
            average: dailyReports.length ? Math.round(total / dailyReports.length) : 0,
            averageAccuracy,
            delivered: dailyReports.filter((report) => report.label === 'Delivered').length,
            underDelivered: dailyReports.filter((report) => report.label === 'Under delivered').length,
            overDelivered: dailyReports.filter((report) => report.label === 'Over delivered').length,
        };
    }, [timeBasis, visibleRecords]);

    const timezoneLabel = timeBasis === 'ph' ? 'PH Time (UTC+8)' : 'CST Time (UTC-6)';
    const topProcessor = dashboardData.rankedProcessors[0];
    const reportRangeBreadcrumbs: BreadcrumbItem[] = [
        { title: 'Operations dashboard', href: '/dashboard' },
        { title: 'MTD Reports', href: '/operations/mtd' },
    ];

    if (!showReportRange) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Operations dashboard" />

                <div className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 md:p-8">
                    <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                        <div>
                            <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Operations overview</p>
                            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">{greeting}, Operations.</h1>
                            <p className="mt-2 text-sm text-[#776a57]">A high-level view of the Bees360 workspace.</p>
                        </div>
                        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eed8a9] bg-[#fff5dc] px-3 py-1.5 text-xs font-semibold text-[#936000]">
                            <span className="size-2 rounded-full bg-[#e29a17]" />
                            Sample dashboard data
                        </span>
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        {[
                            {
                                label: 'Reports polished this week',
                                value: '347',
                                note: '12.8% above last week',
                                icon: FileCheck2,
                                tone: 'bg-[#fff0c9] text-[#a96300]',
                            },
                            {
                                label: 'Total reports',
                                value: '2,846',
                                note: 'Across all report statuses',
                                icon: Files,
                                tone: 'bg-[#ffeadf] text-[#b34d10]',
                            },
                            {
                                label: 'Total users',
                                value: '186',
                                note: '14 new users this month',
                                icon: UsersRound,
                                tone: 'bg-[#e6f5e5] text-[#28703c]',
                            },
                        ].map((metric) => {
                            const Icon = metric.icon;
                            return (
                                <article
                                    key={metric.label}
                                    className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)]"
                                >
                                    <div className={`grid size-11 place-items-center rounded-xl ${metric.tone}`}>
                                        <Icon className="size-5" />
                                    </div>
                                    <p className="mt-5 text-sm font-medium text-[#806f59]">{metric.label}</p>
                                    <p className="mt-1 text-3xl font-bold tracking-tight text-[#342615]">{metric.value}</p>
                                    <p className="mt-2 text-xs text-[#9a8a72]">{metric.note}</p>
                                </article>
                            );
                        })}
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
                        <article className="min-w-0 rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-[#342615]">Reports finished this week</h2>
                                    <p className="mt-1 text-sm text-[#806f59]">Daily completed reports across the operations team</p>
                                </div>
                                <div className="rounded-lg bg-[#fff1cc] px-3 py-2 text-right">
                                    <p className="text-xs font-medium text-[#8b620f]">Weekly total</p>
                                    <p className="text-lg font-bold text-[#694400]">347</p>
                                </div>
                            </div>
                            <div className="mt-6 h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={weeklyFinished} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="bees360WeeklyGradient" x1="0" x2="0" y1="0" y2="1">
                                                <stop offset="0%" stopColor="#e5a51e" stopOpacity={0.35} />
                                                <stop offset="100%" stopColor="#e5a51e" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke="#efe3cf" strokeDasharray="3 3" />
                                        <XAxis axisLine={false} dataKey="day" tickLine={false} tick={{ fill: '#8c7b62', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c7b62', fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ stroke: '#d18a0b', strokeWidth: 1 }}
                                            contentStyle={{
                                                border: '1px solid #eadbc6',
                                                borderRadius: '12px',
                                                boxShadow: '0 8px 24px rgba(88, 57, 18, 0.12)',
                                            }}
                                            formatter={(value) => [`${value} reports`, 'Finished']}
                                            labelStyle={{ color: '#5d4830', fontWeight: 700 }}
                                        />
                                        <Area type="monotone" dataKey="reports" stroke="#c87c00" strokeWidth={3} fill="url(#bees360WeeklyGradient)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </article>

                        <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-6 shadow-[0_8px_30px_rgb(88,57,18,0.05)]">
                            <p className="text-sm font-bold tracking-[0.16em] text-[#9d650c] uppercase">Quality snapshot</p>
                            <h2 className="mt-2 text-lg font-bold tracking-tight text-[#342615]">Total accuracy</h2>
                            <div className="mt-7 flex items-center gap-5">
                                <div className="grid size-28 place-items-center rounded-full bg-[conic-gradient(#d9900e_0deg_350deg,#f2e3c7_350deg_360deg)] p-2">
                                    <div className="flex size-full flex-col items-center justify-center rounded-full bg-[#fffdf8] text-center">
                                        <span className="text-2xl font-bold tracking-tight text-[#342615]">97.2%</span>
                                        <span className="text-[10px] font-bold tracking-wide text-[#887760] uppercase">Accuracy</span>
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-[#40301c]">On target</p>
                                    <p className="mt-1 text-sm leading-5 text-[#806f59]">Based on the current sample quality reviews.</p>
                                </div>
                            </div>
                            <div className="mt-7 rounded-xl bg-[#eff7ea] px-4 py-3 text-sm font-semibold text-[#3d703a]">
                                +1.4% compared with last week
                            </div>
                        </article>
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                        <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-6 shadow-[0_8px_30px_rgb(88,57,18,0.05)]">
                            <div className="grid size-12 place-items-center rounded-2xl bg-[#fff0c9] text-[#a96300]">
                                <CalendarDays className="size-6" />
                            </div>
                            <h2 className="mt-5 text-xl font-bold tracking-tight text-[#342615]">MTD reports</h2>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-[#776a57]">
                                Review daily report totals, compare PH and CST reporting time, and filter figures by processor across any chosen date
                                range.
                            </p>
                            <Link
                                href="/operations/mtd"
                                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#b96c00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#925400]"
                            >
                                Open MTD Reports
                                <ArrowRight className="size-4" />
                            </Link>
                        </article>

                        <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-6 shadow-[0_8px_30px_rgb(88,57,18,0.05)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-[#342615]">This week’s lead</h2>
                                    <p className="mt-1 text-sm text-[#806f59]">Top report processor</p>
                                </div>
                                <Trophy className="size-6 text-[#d59111]" />
                            </div>
                            <p className="mt-7 text-2xl font-bold tracking-tight text-[#342615]">Maria Santos</p>
                            <p className="mt-1 text-sm text-[#806f59]">128 reports finished</p>
                            <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#f6ead8]">
                                <div className="h-full w-[86%] rounded-full bg-[#d9900e]" />
                            </div>
                        </article>
                    </section>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={reportRangeBreadcrumbs}>
            <Head title="MTD Reports" />

            <div className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 md:p-8">
                <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
                    <div>
                        <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Operations overview</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">MTD report performance</h1>
                        <p className="mt-2 text-sm text-[#776a57]">Choose a start and end date to monitor team activity in PH Time or CST Time.</p>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eed8a9] bg-[#fff5dc] px-3 py-1.5 text-xs font-semibold text-[#936000]">
                        <span className="size-2 rounded-full bg-[#e29a17]" />
                        Sample dashboard data
                    </div>
                </section>

                <section className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-4 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_auto] lg:items-end">
                        <div className="rounded-2xl border border-[#ead5a6] bg-[#fff8e7] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                            <div className="mb-2 flex items-center justify-between gap-3 px-1">
                                <span className="text-xs font-bold tracking-[0.14em] text-[#946000] uppercase">Bees360 report period</span>
                                <CalendarDays className="size-4 text-[#c77b00]" />
                            </div>
                            <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                                <BeesDatePicker
                                    id="report-start-date"
                                    label="Start date"
                                    value={startDate}
                                    min="2026-01-01"
                                    max={endDate}
                                    onChange={(date) => {
                                        setStartDate(date);
                                        if (date > endDate) setEndDate(date);
                                    }}
                                />
                                <div className="mb-1.5 hidden size-8 place-items-center rounded-full border border-[#edcf89] bg-[#fff0c9] text-[#a96300] sm:grid">
                                    <ArrowRight className="size-4" />
                                </div>
                                <BeesDatePicker
                                    id="report-end-date"
                                    label="End date"
                                    value={endDate}
                                    min={startDate}
                                    max="2026-12-31"
                                    onChange={setEndDate}
                                />
                            </div>
                            <p className="mt-3 border-t border-[#efdbac] pt-3 text-xs font-medium text-[#856539]">
                                The report data updates automatically when you select a date.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-bold text-[#5d4830]" htmlFor="processor-name">
                                Processor name
                            </label>
                            <Select value={selectedProcessor} onValueChange={setSelectedProcessor}>
                                <SelectTrigger
                                    id="processor-name"
                                    className="h-11 rounded-xl border-[#e2d1b8] bg-[#fffaf1] text-[#4b3820] focus:ring-[#d78b13]"
                                >
                                    <UsersRound className="mr-2 size-4 text-[#a96300]" />
                                    <SelectValue placeholder="All processors" />
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
                            <div className="flex rounded-xl border border-[#e2d1b8] bg-[#fffaf1] p-1">
                                <Button
                                    type="button"
                                    onClick={() => setTimeBasis('ph')}
                                    className={`h-9 rounded-lg px-4 text-sm font-bold ${timeBasis === 'ph' ? 'bg-[#b96c00] text-white hover:bg-[#925400]' : 'bg-transparent text-[#806f59] hover:bg-[#fff0d1]'}`}
                                >
                                    PH Time
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setTimeBasis('cst')}
                                    className={`h-9 rounded-lg px-4 text-sm font-bold ${timeBasis === 'cst' ? 'bg-[#b96c00] text-white hover:bg-[#925400]' : 'bg-transparent text-[#806f59] hover:bg-[#fff0d1]'}`}
                                >
                                    CST Time
                                </Button>
                            </div>
                        </div>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-xs text-[#887760]">
                        <Clock3 className="size-3.5 text-[#b26a00]" />
                        Showing figures from {startDate} to {endDate} based on {timezoneLabel}.
                    </p>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: 'Reports polished', value: dashboardData.total, icon: FileCheck2, tone: 'bg-[#fff0c9] text-[#a96300]' },
                        { label: 'Average per day', value: dashboardData.average, icon: BarChart3, tone: 'bg-[#ffeadf] text-[#b34d10]' },
                        {
                            label: 'Processor accuracy',
                            value: `${dashboardData.averageAccuracy.toFixed(1)}%`,
                            icon: FileCheck2,
                            tone: 'bg-[#e6f5e5] text-[#28703c]',
                        },
                        { label: 'Top processor', value: topProcessor?.name ?? '—', icon: Trophy, tone: 'bg-[#e6f5e5] text-[#28703c]' },
                        {
                            label: 'Active processors',
                            value: dashboardData.rankedProcessors.length,
                            icon: UsersRound,
                            tone: 'bg-[#f0e6ff] text-[#7440a2]',
                        },
                    ].map((metric) => {
                        const Icon = metric.icon;
                        return (
                            <article
                                key={metric.label}
                                className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)]"
                            >
                                <div className={`grid size-10 place-items-center rounded-xl ${metric.tone}`}>
                                    <Icon className="size-5" />
                                </div>
                                <p className="mt-4 text-sm font-medium text-[#806f59]">{metric.label}</p>
                                <p className="mt-1 truncate text-2xl font-bold tracking-tight text-[#342615]">{metric.value}</p>
                                <p className="mt-2 text-xs text-[#9a8a72]">{timezoneLabel}</p>
                            </article>
                        );
                    })}
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
                    <article className="min-w-0 rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-[#342615]">Reports polished</h2>
                                <p className="mt-1 text-sm text-[#806f59]">
                                    Daily completed reports from {startDate} to {endDate}
                                </p>
                            </div>
                            <div className="rounded-lg bg-[#fff1cc] px-3 py-2 text-right">
                                <p className="text-xs font-medium text-[#8b620f]">Range total</p>
                                <p className="text-lg font-bold text-[#694400]">{dashboardData.total}</p>
                            </div>
                        </div>
                        <div className="mt-6 h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dashboardData.dailyReports} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="bees360RangeGradient" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#e5a51e" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#e5a51e" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="#efe3cf" strokeDasharray="3 3" />
                                    <XAxis axisLine={false} dataKey="dateLabel" tickLine={false} tick={{ fill: '#8c7b62', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c7b62', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ stroke: '#d18a0b', strokeWidth: 1 }}
                                        contentStyle={{
                                            border: '1px solid #eadbc6',
                                            borderRadius: '12px',
                                            boxShadow: '0 8px 24px rgba(88, 57, 18, 0.12)',
                                        }}
                                        formatter={(value) => [`${value} reports`, timezoneLabel]}
                                        labelStyle={{ color: '#5d4830', fontWeight: 700 }}
                                    />
                                    <Area type="monotone" dataKey="reports" stroke="#c87c00" strokeWidth={3} fill="url(#bees360RangeGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                        <h2 className="text-lg font-bold tracking-tight text-[#342615]">Delivery status</h2>
                        <p className="mt-1 text-sm text-[#806f59]">Daily totals compared with the sample target</p>
                        <div className="mt-6 grid gap-3">
                            {[
                                { label: 'Under delivered', value: dashboardData.underDelivered, className: 'bg-[#fde1e2] text-[#a5474b]' },
                                { label: 'Delivered', value: dashboardData.delivered, className: 'bg-[#fff0c5] text-[#936000]' },
                                { label: 'Over delivered', value: dashboardData.overDelivered, className: 'bg-[#e2efd9] text-[#477239]' },
                            ].map((status) => (
                                <div key={status.label} className="flex items-center justify-between rounded-xl border border-[#f0e5d4] p-3">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
                                    <span className="text-sm font-bold text-[#4a3821]">
                                        {status.value} day{status.value === 1 ? '' : 's'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 rounded-xl bg-[#fff8e8] p-4 text-sm leading-6 text-[#75613d]">
                            <span className="font-bold">Sample targets:</span> Under 25, Delivered 25–31, Over 31 reports per day.
                        </div>
                    </article>
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
                    <article className="overflow-hidden rounded-2xl border border-[#eadbc6] bg-[#fffdf8] shadow-[0_8px_30px_rgb(88,57,18,0.05)]">
                        <div className="border-b border-[#f0e5d4] p-5 sm:p-6">
                            <h2 className="text-lg font-bold tracking-tight text-[#342615]">Daily report log</h2>
                            <p className="mt-1 text-sm text-[#806f59]">
                                {selectedProcessor === 'all' ? 'All processors' : selectedProcessor} · {timezoneLabel}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#fff8e8] text-xs tracking-wide text-[#806f59] uppercase">
                                    <tr>
                                        <th className="px-5 py-3 font-bold">Report date</th>
                                        <th className="px-5 py-3 font-bold">Reports</th>
                                        <th className="px-5 py-3 font-bold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f1e7d8]">
                                    {dashboardData.dailyReports.length ? (
                                        dashboardData.dailyReports.map((report) => (
                                            <tr key={report.date}>
                                                <td className="px-5 py-3.5 font-semibold text-[#4a3821]">{report.dateLabel}</td>
                                                <td className="px-5 py-3.5 font-bold text-[#4a3821]">{report.reports}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${report.className}`}>
                                                        {report.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="px-5 py-8 text-center text-sm text-[#806f59]">
                                                No sample report records are available for this date and processor selection.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                        <h2 className="text-lg font-bold tracking-tight text-[#342615]">Processor leaderboard</h2>
                        <p className="mt-1 text-sm text-[#806f59]">Finished reports and sample accuracy for the selected date range</p>
                        <ol className="mt-6 grid gap-3">
                            {dashboardData.rankedProcessors.slice(0, 3).map((processor, index) => (
                                <li key={processor.name} className="flex items-center gap-3 rounded-xl border border-[#f0e5d4] p-3">
                                    <div className="grid size-7 place-items-center rounded-full bg-[#fff1cf] text-xs font-bold text-[#9e6200]">
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-[#4a3821]">{processor.name}</p>
                                        <p className="text-xs text-[#91816a]">{processor.completed} reports finished</p>
                                    </div>
                                    <span className="rounded-full bg-[#e6f5e5] px-2.5 py-1 text-xs font-bold text-[#28703c]">
                                        {processor.accuracy.toFixed(1)}%
                                    </span>
                                    {index === 0 && <Trophy className="size-5 text-[#d59111]" aria-label="First place" />}
                                </li>
                            ))}
                        </ol>
                    </article>
                </section>
            </div>
        </AppLayout>
    );
}
