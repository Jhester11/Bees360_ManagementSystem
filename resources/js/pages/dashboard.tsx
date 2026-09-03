import { BeesDatePicker } from '@/components/bees-date-picker';
import { ProcessorSelect } from '@/components/processor-select';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePoll } from '@inertiajs/react';
import { ArrowRight, BarChart3, CalendarDays, Clock3, FileCheck2, Files, Trophy, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type ReportRecord = {
    date: string;
    dateLabel: string;
    processor: string;
    batch: number;
    reports: number;
    generalExterior: number;
    fourPoint: number;
};

type DashboardProps = {
    showReportRange?: boolean;
    reportRecords: ReportRecord[];
    processorNames: string[];
    reportRange: { first: string | null; latest: string | null };
    overview: {
        totalReports: number;
        weeklyReports: number;
        activeProcessors: number;
        generalExterior: number;
        fourPoint: number;
        activeSource: number;
        closedSource: number;
        weekStart: string;
        weekEnd: string;
        weeklyChart: { day: string; date: string; reports: number }[];
        topProcessor: { name: string; reports: number } | null;
        topProcessors: {
            name: string;
            batch: number;
            latestDate: string;
            overDeliveredDays: number;
            reports: number;
            generalExterior: number;
            fourPoint: number;
        }[];
    };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Operations dashboard', href: '/dashboard' }];

export function philippinesDate() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Manila',
    }).formatToParts(new Date());
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

    return `${value('year')}-${value('month')}-${value('day')}`;
}

export const philippinesToday = philippinesDate();

function reportStatus(total: number) {
    if (total < 25) return { label: 'Under delivered', className: 'bg-[#fde1e2] text-[#a5474b]', barClassName: 'bg-[#d36c72]' };
    if (total > 31) return { label: 'Over delivered', className: 'bg-[#e2efd9] text-[#477239]', barClassName: 'bg-[#63a653]' };

    return { label: 'Delivered', className: 'bg-[#fff0c5] text-[#936000]', barClassName: 'bg-[#d9900e]' };
}

export function formatDate(date: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${date}T00:00:00Z`),
    );
}

export { BeesDatePicker } from '@/components/bees-date-picker';

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

export default function Dashboard({ showReportRange = false, reportRecords, processorNames, reportRange, overview }: DashboardProps) {
    usePoll(30_000, { only: ['reportRecords', 'processorNames', 'reportRange', 'overview'] });

    const [currentPhilippineDate, setCurrentPhilippineDate] = useState(philippinesDate);
    const referenceDate = showReportRange ? currentPhilippineDate : (reportRange.latest ?? currentPhilippineDate);
    const [startDate, setStartDate] = useState(`${referenceDate.slice(0, 8)}01`);
    const [endDate, setEndDate] = useState(referenceDate);
    const [selectedProcessor, setSelectedProcessor] = useState(showReportRange ? '' : 'all');
    const [appliedProcessor, setAppliedProcessor] = useState(showReportRange ? '' : 'all');
    const [greeting, setGreeting] = useState(philippineGreeting);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setGreeting(philippineGreeting());
            setCurrentPhilippineDate((currentDate) => {
                const liveDate = philippinesDate();

                if (liveDate === currentDate) return currentDate;

                if (showReportRange) {
                    setStartDate(`${liveDate.slice(0, 8)}01`);
                    setEndDate(liveDate);
                }

                return liveDate;
            });
        }, 60_000);

        return () => window.clearInterval(timer);
    }, [showReportRange]);

    const visibleRecords = useMemo(
        () =>
            reportRecords.filter(
                (record) =>
                    record.date >= startDate &&
                    record.date <= endDate &&
                    (!showReportRange || (appliedProcessor !== '' && (appliedProcessor === 'all' || record.processor === appliedProcessor))),
            ),
        [appliedProcessor, endDate, reportRecords, showReportRange, startDate],
    );

    const dashboardData = useMemo(() => {
        const daily = new Map<string, { date: string; dateLabel: string; reports: number }>();
        const processors = new Map<string, { completed: number; generalExterior: number; fourPoint: number }>();

        visibleRecords.forEach((record) => {
            const currentDaily = daily.get(record.date) ?? { date: record.date, dateLabel: record.dateLabel, reports: 0 };
            currentDaily.reports += record.reports;
            daily.set(record.date, currentDaily);
            const processor = processors.get(record.processor) ?? { completed: 0, generalExterior: 0, fourPoint: 0 };
            processor.completed += record.reports;
            processor.generalExterior += record.generalExterior;
            processor.fourPoint += record.fourPoint;
            processors.set(record.processor, processor);
        });

        const dailyReports = Array.from(daily.values()).map((report) => ({ ...report, ...reportStatus(report.reports) }));
        const rankedProcessors = Array.from(processors, ([name, processor]) => ({
            name,
            completed: processor.completed,
            generalExterior: processor.generalExterior,
            fourPoint: processor.fourPoint,
        })).sort((a, b) => b.completed - a.completed);
        const total = visibleRecords.reduce((sum, record) => sum + record.reports, 0);

        return {
            dailyReports,
            rankedProcessors,
            total,
            average: dailyReports.length ? Math.round(total / dailyReports.length) : 0,
            generalExterior: visibleRecords.reduce((sum, record) => sum + record.generalExterior, 0),
            fourPoint: visibleRecords.reduce((sum, record) => sum + record.fourPoint, 0),
            delivered: dailyReports.filter((report) => report.label === 'Delivered').length,
            underDelivered: dailyReports.filter((report) => report.label === 'Under delivered').length,
            overDelivered: dailyReports.filter((report) => report.label === 'Over delivered').length,
        };
    }, [visibleRecords]);

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
                            <span className="size-2 rounded-full bg-[#4a9a55]" />
                            {reportRange.latest ? `Live data through ${formatDate(reportRange.latest)}` : 'No report data imported'}
                        </span>
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        {[
                            {
                                label: 'Reports polished this week',
                                value: overview.weeklyReports.toLocaleString(),
                                note: `${formatDate(overview.weekStart)} – ${formatDate(overview.weekEnd)}`,
                                icon: FileCheck2,
                                tone: 'bg-[#fff0c9] text-[#a96300]',
                            },
                            {
                                label: 'Total reports',
                                value: overview.totalReports.toLocaleString(),
                                note: 'Deduplicated imported reports',
                                icon: Files,
                                tone: 'bg-[#ffeadf] text-[#b34d10]',
                            },
                            {
                                label: 'Active processors',
                                value: overview.activeProcessors.toLocaleString(),
                                note: 'Processors found in imported data',
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
                                    <p className="mt-1 text-sm text-[#806f59]">
                                        Real-time totals for {formatDate(overview.weekStart)} – {formatDate(overview.weekEnd)}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-[#fff1cc] px-3 py-2 text-right">
                                    <p className="text-xs font-medium text-[#8b620f]">Weekly total</p>
                                    <p className="text-lg font-bold text-[#694400]">{overview.weeklyReports.toLocaleString()}</p>
                                    <p className="text-[10px] font-semibold text-[#9b762f]">Refreshes every 30 sec</p>
                                </div>
                            </div>
                            <div className="mt-6 h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={overview.weeklyChart} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
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
                            <p className="text-sm font-bold tracking-[0.16em] text-[#9d650c] uppercase">Report mix</p>
                            <h2 className="mt-2 text-lg font-bold tracking-tight text-[#342615]">Imported categories</h2>
                            <div className="mt-6 grid gap-3">
                                <div className="flex items-center justify-between rounded-xl bg-[#fff4d8] px-4 py-3">
                                    <span className="text-sm font-semibold text-[#6d5735]">General Exterior</span>
                                    <span className="text-xl font-bold text-[#a96300]">{overview.generalExterior.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-[#f1ebff] px-4 py-3">
                                    <span className="text-sm font-semibold text-[#6d5735]">4-Point</span>
                                    <span className="text-xl font-bold text-[#7440a2]">{overview.fourPoint.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="mt-4 rounded-xl bg-[#eff7ea] px-4 py-3 text-sm font-semibold text-[#3d703a]">
                                {overview.closedSource.toLocaleString()} Closed · {overview.activeSource.toLocaleString()} Active
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
                                    <h2 className="text-lg font-bold tracking-tight text-[#342615]">Overall top performers</h2>
                                    <p className="mt-1 text-sm text-[#806f59]">One overall result per over-delivering processor</p>
                                </div>
                                <Trophy className="size-6 text-[#d59111]" />
                            </div>
                            {overview.topProcessors.length ? (
                                <ol className="mt-5 grid gap-3">
                                    {overview.topProcessors.map((processor, index) => {
                                        const status = reportStatus(processor.reports);

                                        return (
                                            <li key={processor.name} className="rounded-xl border border-[#cfe1c7] bg-[#f5fbf1] p-3">
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-extrabold ${index === 0 ? 'bg-[#f3c95d] text-[#624000]' : 'bg-[#f3e8d6] text-[#806f59]'}`}
                                                    >
                                                        {index + 1}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-bold text-[#4a3821]">{processor.name}</p>
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#91816a]">
                                                            <span>
                                                                Batch {processor.batch} · {processor.overDeliveredDays}{' '}
                                                                {processor.overDeliveredDays === 1 ? 'over-delivered day' : 'over-delivered days'} ·
                                                                Latest {formatDate(processor.latestDate)} · {processor.generalExterior} GE ·{' '}
                                                                {processor.fourPoint} 4PT
                                                            </span>
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${status.className}`}
                                                            >
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-extrabold whitespace-nowrap text-[#a96300]">
                                                        {processor.reports.toLocaleString()} reports
                                                    </span>
                                                </div>
                                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f6ead8]">
                                                    <div
                                                        className={`h-full rounded-full ${status.barClassName}`}
                                                        style={{
                                                            width: `${Math.max(8, (processor.reports / (overview.topProcessors[0]?.reports || 1)) * 100)}%`,
                                                        }}
                                                    />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            ) : (
                                <div className="mt-5 rounded-xl border border-dashed border-[#dfc58f] bg-[#fffaf1] px-4 py-8 text-center text-sm text-[#806f59]">
                                    No processor has exceeded 31 reports on a single day this week.
                                </div>
                            )}
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
                        <p className="mt-2 text-sm text-[#776a57]">Choose a date range and processor to review imported report production.</p>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eed8a9] bg-[#fff5dc] px-3 py-1.5 text-xs font-semibold text-[#936000]">
                        <span className="size-2 rounded-full bg-[#4a9a55]" />
                        {reportRange.latest ? `Live data through ${formatDate(reportRange.latest)}` : 'No report data imported'}
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
                                    min={reportRange.first ?? undefined}
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
                                    max={currentPhilippineDate}
                                    onChange={setEndDate}
                                />
                            </div>
                            <p className="mt-3 border-t border-[#efdbac] pt-3 text-xs font-medium text-[#856539]">
                                Choose a processor, then compare the selected reporting period.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-bold text-[#5d4830]" htmlFor="processor-name">
                                Processor name
                            </label>
                            <ProcessorSelect
                                id="processor-name"
                                value={selectedProcessor}
                                processorNames={processorNames}
                                onValueChange={setSelectedProcessor}
                            />
                        </div>

                        <div className="grid gap-2">
                            <span className="text-sm font-bold text-[#5d4830]">Apply selection</span>
                            <Button
                                type="button"
                                disabled={!selectedProcessor}
                                onClick={() => setAppliedProcessor(selectedProcessor)}
                                className="h-11 w-full gap-2 rounded-xl bg-[#b96c00] text-sm font-bold text-white hover:bg-[#925400] disabled:bg-[#d5b87c]"
                            >
                                <BarChart3 className="size-4" />
                                Compare periods
                            </Button>
                        </div>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-xs text-[#887760]">
                        <Clock3 className="size-3.5 text-[#b26a00]" />
                        {appliedProcessor
                            ? `Showing ${appliedProcessor === 'all' ? 'all processors' : appliedProcessor} from ${startDate} to ${endDate}.`
                            : 'Select a processor and click Compare periods to view MTD data.'}
                    </p>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    {[
                        { label: 'Reports polished', value: dashboardData.total, icon: FileCheck2, tone: 'bg-[#fff0c9] text-[#a96300]' },
                        { label: 'Average per day', value: dashboardData.average, icon: BarChart3, tone: 'bg-[#ffeadf] text-[#b34d10]' },
                        {
                            label: 'General Exterior',
                            value: dashboardData.generalExterior,
                            icon: FileCheck2,
                            tone: 'bg-[#e6f5e5] text-[#28703c]',
                        },
                        {
                            label: '4-Point',
                            value: dashboardData.fourPoint,
                            icon: FileCheck2,
                            tone: 'bg-[#f1ebff] text-[#7440a2]',
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
                                <p className="mt-2 text-xs text-[#9a8a72]">Imported report data</p>
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
                                        formatter={(value) => [`${value} reports`, 'Completed']}
                                        labelStyle={{ color: '#5d4830', fontWeight: 700 }}
                                    />
                                    <Area type="monotone" dataKey="reports" stroke="#c87c00" strokeWidth={3} fill="url(#bees360RangeGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                        <h2 className="text-lg font-bold tracking-tight text-[#342615]">Delivery status</h2>
                        <p className="mt-1 text-sm text-[#806f59]">Daily totals grouped by output level</p>
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
                            <span className="font-bold">Output levels:</span> Under 25, Delivered 25–31, Over 31 reports per day.
                        </div>
                    </article>
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
                    <article className="overflow-hidden rounded-2xl border border-[#eadbc6] bg-[#fffdf8] shadow-[0_8px_30px_rgb(88,57,18,0.05)]">
                        <div className="border-b border-[#f0e5d4] p-5 sm:p-6">
                            <h2 className="text-lg font-bold tracking-tight text-[#342615]">Daily report log</h2>
                            <p className="mt-1 text-sm text-[#806f59]">
                                {appliedProcessor === 'all' ? 'All processors' : appliedProcessor || 'No processor selected'}
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
                                                No imported report records are available for this date and processor selection.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                        <h2 className="text-lg font-bold tracking-tight text-[#342615]">Processor leaderboard</h2>
                        <p className="mt-1 text-sm text-[#806f59]">Finished reports by category for the selected date range</p>
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
                                    <span className="text-xs font-semibold whitespace-nowrap text-[#806f59]">
                                        {processor.generalExterior} GE · {processor.fourPoint} 4PT
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
