import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    openProcessorNotification,
    type ProcessorQaNotification,
} from '@/components/processor-qa-notification-bell';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage, usePoll } from '@inertiajs/react';
import { Award, BellRing, CalendarDays, CheckCircle2, Download, Eye, FileCheck2, Gauge, LoaderCircle, PartyPopper, ShieldCheck, Sparkles, Target, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Timezone = 'ph' | 'cst';
type Tier = { name: string; target: number; incentive: number; achieved: boolean; needed: number; percentage: number };
type Performance = {
    totalCases: number;
    generalExterior: number;
    fourPoint: number;
    credits: number;
    qaScore: number | null;
    qaReviews: number;
    incentive: number;
    tiers: Tier[];
};
type DailyOutput = { date: string; day: string; generalExterior: number; fourPoint: number; total: number };
type QaRecord = {
    id: number;
    date: string;
    projectId: string | null;
    qcName: string | null;
    reportUrl: string | null;
    score: number;
    feedback: string[];
};
type ProductionLeader = {
    rank: number;
    processor: string;
    totalCases: number;
    generalExterior: number;
    fourPoint: number;
    qaScore: number | null;
    qaReviews: number;
    isCurrentUser: boolean;
};
type AccuracyLeader = {
    rank: number;
    processor: string;
    qaScore: number;
    qaReviews: number;
    isCurrentUser: boolean;
};
type Props = {
    selectedMonth: string;
    periodLabel: string;
    availableMonths: { value: string; label: string }[];
    metrics: Record<Timezone, Performance>;
    dailyOutput: Record<Timezone, DailyOutput[]>;
    qaHistory: QaRecord[];
    leaderboards: { ph: ProductionLeader[]; cst: ProductionLeader[]; accuracy: AccuracyLeader[] };
    achievement: {
        title: string;
        period: string;
        items: { key: string; label: string; detail: string }[];
    } | null;
    phNow: string;
};

const rankStyles = [
    { card: 'border-[#e8c04c] bg-[#fff8dc]', badge: 'bg-[#f3c63f] text-[#4b3100]', bar: 'bg-[#d9a900]', label: 'Gold' },
    { card: 'border-[#c7ced7] bg-[#f5f7f9]', badge: 'bg-[#c2c9d1] text-[#303944]', bar: 'bg-[#9ca6b2]', label: 'Silver' },
    { card: 'border-[#d7a27f] bg-[#fff1e8]', badge: 'bg-[#c98557] text-white', bar: 'bg-[#b56e42]', label: 'Bronze' },
];

const breadcrumbs: BreadcrumbItem[] = [{ title: 'My dashboard', href: '/dashboard' }];

function greeting(date: Date) {
    const hour = Number(
        new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Manila' }).format(date),
    );

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

function phDateTime(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Manila',
        timeZoneName: 'short',
    }).format(date);
}

function formatDate(date: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${date}T00:00:00Z`),
    );
}

function AnimatedGauge({ percentage, color = '#15865b' }: { percentage: number; color?: string }) {
    const [animated, setAnimated] = useState(0);

    useEffect(() => {
        setAnimated(0);
        const frame = requestAnimationFrame(() => setAnimated(Math.min(Math.max(percentage, 0), 100)));
        return () => cancelAnimationFrame(frame);
    }, [percentage]);

    return (
        <svg viewBox="0 0 200 118" className="h-28 w-full overflow-visible" aria-label={`${percentage}% progress`}>
            <path d="M 20 100 A 80 80 0 0 1 180 100" pathLength="100" fill="none" stroke="#e4e9e3" strokeWidth="17" strokeLinecap="round" />
            <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                pathLength="100"
                fill="none"
                stroke={color}
                strokeWidth="17"
                strokeLinecap="round"
                strokeDasharray="100"
                strokeDashoffset={100 - animated}
                className="transition-[stroke-dashoffset] duration-1000 ease-out"
            />
        </svg>
    );
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof FileCheck2; tone: string }) {
    return (
        <article className="group relative min-h-40 overflow-hidden rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(88,57,18,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(88,57,18,0.1)]">
            <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                <Icon className="size-5" />
            </span>
            <p className="mt-5 text-sm font-medium text-[#806f59]">{label}</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-[#342615]">{value.toLocaleString()}</p>
            <span className="absolute -right-8 -bottom-10 size-28 rounded-full bg-[#ffc83d]/10 transition duration-500 group-hover:scale-125" />
        </article>
    );
}

function TierCard({ tier, period }: { tier: Tier; period: string }) {
    return (
        <article
            className={`rounded-2xl border p-5 shadow-[0_8px_28px_rgba(88,57,18,0.05)] transition duration-300 hover:-translate-y-1 ${
                tier.achieved ? 'border-[#add8b3] bg-[#f4fbf1]' : 'border-[#eadbc6] bg-[#fffdf8]'
            }`}
        >
            <div className="flex items-center justify-between">
                <span className={`grid size-9 place-items-center rounded-xl ${tier.achieved ? 'bg-[#dff1da] text-[#24733d]' : 'bg-[#fff0c9] text-[#a96300]'}`}>
                    {tier.achieved ? <CheckCircle2 className="size-5" /> : <Award className="size-5" />}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#a96300] shadow-sm">${tier.incentive}</span>
            </div>
            <div className="relative mt-3">
                <AnimatedGauge percentage={tier.percentage} color={tier.achieved ? '#2dbb78' : '#e29a18'} />
                <div className="absolute inset-x-0 bottom-1 text-center">
                    <p className="text-2xl font-black text-[#342615]">{tier.percentage}%</p>
                    <p className="text-[10px] font-bold tracking-wide text-[#8b7454] uppercase">of {tier.target} credits</p>
                </div>
            </div>
            <div className="mt-2 text-center">
                <h3 className="font-black text-[#342615]">{tier.name}</h3>
                <p className="mt-1 text-[11px] font-semibold text-[#8b7454] uppercase">{period}</p>
            </div>
            <div className={`mt-4 rounded-xl border px-3 py-3 text-center ${tier.achieved ? 'border-[#b9ddb8] bg-[#e4f5e1]' : 'border-[#f0cf88] bg-[#fff2d2]'}`}>
                <p className={`text-[10px] font-bold uppercase ${tier.achieved ? 'text-[#24733d]' : 'text-[#a96300]'}`}>
                    {tier.achieved ? 'Target achieved' : 'Remaining credits'}
                </p>
                <p className={`mt-1 text-base font-black ${tier.achieved ? 'text-[#24733d]' : 'text-[#b96c00]'}`}>
                    {tier.achieved ? `$${tier.incentive} earned` : tier.needed.toLocaleString()}
                </p>
            </div>
        </article>
    );
}

export default function ProcessorDashboard({ selectedMonth, periodLabel, availableMonths, metrics, dailyOutput, qaHistory, leaderboards, achievement, phNow }: Props) {
    const page = usePage<SharedData & { processorNotifications: ProcessorQaNotification[] }>();
    const { auth, processorNotifications = [] } = page.props;
    const isDailyView = new URL(page.url, 'http://bees360.local').searchParams.get('view') === 'daily';
    const [timezone, setTimezone] = useState<Timezone>('ph');
    const [clock, setClock] = useState(() => new Date(phNow));
    const [monthLoading, setMonthLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [feedbackRecord, setFeedbackRecord] = useState<QaRecord | null>(null);
    const [showAllFeedback, setShowAllFeedback] = useState(false);
    const [showAchievement, setShowAchievement] = useState(Boolean(achievement));
    usePoll(30_000, { only: ['metrics', 'dailyOutput', 'qaHistory', 'phNow'] });

    useEffect(() => {
        const timer = window.setInterval(() => setClock(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const performance = metrics[timezone];
    const phToday = phNow.slice(0, 10);
    const chartData = dailyOutput[timezone]
        .filter((day) => selectedMonth !== phToday.slice(0, 7) || day.date <= phToday)
        .filter((day) => !isDailyView || day.total > 0);
    const productionLeaders = leaderboards[timezone];
    const latestQaNotification = processorNotifications[0];
    const highestProduction = productionLeaders[0]?.totalCases || 1;
    const highestAccuracy = leaderboards.accuracy[0]?.qaScore || 100;
    const hasProduction = performance.totalCases > 0;
    const recurringFeedback = useMemo(() => {
        const counts = new Map<string, number>();
        qaHistory.flatMap((record) => record.feedback).forEach((feedback) => {
            const normalizedFeedback = feedback?.trim();
            if (!normalizedFeedback || normalizedFeedback.toLowerCase().includes('no error')) return;
            counts.set(normalizedFeedback, (counts.get(normalizedFeedback) ?? 0) + 1);
        });
        return [...counts.entries()].map(([feedback, count]) => ({ feedback, count })).sort((a, b) => b.count - a.count);
    }, [qaHistory]);

    function selectMonth(month: string) {
        setMonthLoading(true);
        router.get(
            '/dashboard',
            { month, ...(isDailyView ? { view: 'daily' } : {}) },
            { preserveState: true, preserveScroll: true, replace: true, onFinish: () => setMonthLoading(false) },
        );
    }

    async function exportDailyReports() {
        if (!hasProduction || exporting) return;

        setExporting(true);

        try {
            const XLSX = await import('xlsx-js-style');
            const headerRow = 4;
            const firstDataRow = headerRow + 1;
            const totalRow = firstDataRow + chartData.length;
            const timeLabel = timezone === 'ph' ? 'PH Time' : 'CST Time';
            const worksheet = XLSX.utils.aoa_to_sheet([
                ['BEES360 | MY DAILY PRODUCTIVITY'],
                [`${auth.user.name} · ${periodLabel} · ${timeLabel}`],
                [],
                ['REPORT DATE', 'GENERAL EXTERIOR', '4-POINT', 'TOTAL FINISHED'],
                ...chartData.map((day) => [new Date(`${day.date}T00:00:00Z`), day.generalExterior, day.fourPoint, 0]),
                ['MONTHLY TOTAL', 0, 0, 0],
            ]);
            const titleStyle = {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: 'FFF8E7' } },
                fill: { fgColor: { rgb: '4A351D' } },
            };
            const subtitleStyle = {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '805C24' } },
                fill: { fgColor: { rgb: 'FFF1CC' } },
            };
            const headerStyle = {
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: 'FFF8E7' } },
                fill: { fgColor: { rgb: '3B2915' } },
                border: { bottom: { style: 'thin', color: { rgb: '80603A' } } },
            };
            const bodyStyle = {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { name: 'Century Gothic', sz: 10, color: { rgb: '4A3821' } },
                fill: { fgColor: { rgb: 'FFFFFF' } },
                border: { bottom: { style: 'thin', color: { rgb: 'F0E5D4' } } },
                numFmt: '#,##0',
            };
            const totalStyle = {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '5A3900' } },
                fill: { fgColor: { rgb: 'FFF0C5' } },
                border: { top: { style: 'medium', color: { rgb: '4A351D' } } },
                numFmt: '#,##0',
            };

            for (let row = 1; row <= totalRow; row += 1) {
                for (const column of ['A', 'B', 'C', 'D']) {
                    const address = `${column}${row}`;
                    worksheet[address] ??= { t: 's', v: '' };
                    worksheet[address].s = { ...bodyStyle, fill: { fgColor: { rgb: 'FFFFFF' } } };
                }
            }

            worksheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
            ];
            worksheet['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 19 }];
            worksheet['!rows'] = [{ hpt: 27 }, { hpt: 20 }, { hpt: 8 }, { hpt: 27 }];
            worksheet.A1.s = titleStyle;
            worksheet.A2.s = subtitleStyle;

            for (const column of ['A', 'B', 'C', 'D']) worksheet[`${column}${headerRow}`].s = headerStyle;
            worksheet[`D${headerRow}`].s = { ...headerStyle, fill: { fgColor: { rgb: '2F2112' } } };

            chartData.forEach((day, index) => {
                const rowNumber = firstDataRow + index;
                const fill = index % 2 === 0 ? 'FFFFFF' : 'FFF8E8';
                const rowStyle = { ...bodyStyle, fill: { fgColor: { rgb: fill } } };

                worksheet[`A${rowNumber}`].s = { ...rowStyle, numFmt: 'mmm d, yyyy' };
                worksheet[`B${rowNumber}`].s = rowStyle;
                worksheet[`C${rowNumber}`].s = rowStyle;
                worksheet[`D${rowNumber}`] = {
                    f: `B${rowNumber}+C${rowNumber}`,
                    v: day.total,
                    t: 'n',
                    s: { ...rowStyle, font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '694400' } }, fill: { fgColor: { rgb: 'FFF0C5' } } },
                };
            });

            worksheet[`A${totalRow}`].s = totalStyle;
            worksheet[`B${totalRow}`] = { f: `SUM(B${firstDataRow}:B${totalRow - 1})`, v: performance.generalExterior, t: 'n', s: totalStyle };
            worksheet[`C${totalRow}`] = { f: `SUM(C${firstDataRow}:C${totalRow - 1})`, v: performance.fourPoint, t: 'n', s: totalStyle };
            worksheet[`D${totalRow}`] = {
                f: `SUM(D${firstDataRow}:D${totalRow - 1})`,
                v: performance.totalCases,
                t: 'n',
                s: { ...totalStyle, fill: { fgColor: { rgb: 'F2CF72' } } },
            };

            const chartHeaderRow = 5;
            const chartFirstDataRow = chartHeaderRow + 1;
            const chartLastColumn = 23;
            const chartWorksheet = XLSX.utils.aoa_to_sheet([
                ['BEES360 | DAILY PRODUCTIVITY CHART'],
                [`${auth.user.name} · ${periodLabel} · ${timeLabel}`],
                [],
                ['GENERAL EXTERIOR', '', '4-POINT'],
                ['REPORT DATE', 'GEN EXT', '4-POINT', 'TOTAL', 'DAILY REPORT VOLUME'],
                ...chartData.map((day) => [new Date(`${day.date}T00:00:00Z`), day.generalExterior, day.fourPoint, day.total]),
            ]);
            const chartHeaderStyle = {
                ...headerStyle,
                fill: { fgColor: { rgb: '3B2915' } },
            };
            const generalExteriorLegendStyle = {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '4A351D' } },
                fill: { fgColor: { rgb: 'E3A326' } },
            };
            const fourPointLegendStyle = {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: '7651C7' } },
            };
            const maxDailyTotal = Math.max(...chartData.map((day) => day.total), 1);

            for (let row = 1; row < chartFirstDataRow + chartData.length; row += 1) {
                for (let column = 0; column <= chartLastColumn; column += 1) {
                    const address = XLSX.utils.encode_cell({ r: row - 1, c: column });
                    chartWorksheet[address] ??= { t: 's', v: '' };
                    chartWorksheet[address].s = { ...bodyStyle, fill: { fgColor: { rgb: 'FFFFFF' } } };
                }
            }

            chartWorksheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: chartLastColumn } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: chartLastColumn } },
                { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
                { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
                { s: { r: 4, c: 4 }, e: { r: 4, c: chartLastColumn } },
            ];
            chartWorksheet['!cols'] = [
                { wch: 17 }, { wch: 11 }, { wch: 11 }, { wch: 11 },
                ...Array.from({ length: 20 }, () => ({ wch: 2.6 })),
            ];
            chartWorksheet['!rows'] = [{ hpt: 27 }, { hpt: 20 }, { hpt: 8 }, { hpt: 22 }, { hpt: 27 }];
            chartWorksheet.A1.s = titleStyle;
            chartWorksheet.A2.s = subtitleStyle;
            chartWorksheet.A4.s = generalExteriorLegendStyle;
            chartWorksheet.C4.s = fourPointLegendStyle;

            for (const column of ['A', 'B', 'C', 'D', 'E']) chartWorksheet[`${column}${chartHeaderRow}`].s = chartHeaderStyle;
            chartData.forEach((day, index) => {
                const rowNumber = chartFirstDataRow + index;
                const fill = index % 2 === 0 ? 'FFFFFF' : 'FFF8E8';
                const rowStyle = { ...bodyStyle, fill: { fgColor: { rgb: fill } } };
                const totalSegments = Math.max(1, Math.round((day.total / maxDailyTotal) * 20));
                let generalExteriorSegments = Math.round(totalSegments * (day.generalExterior / day.total));
                let fourPointSegments = totalSegments - generalExteriorSegments;

                if (day.generalExterior > 0 && generalExteriorSegments === 0) {
                    generalExteriorSegments = 1;
                    fourPointSegments = Math.max(fourPointSegments - 1, 0);
                }

                if (day.fourPoint > 0 && fourPointSegments === 0) {
                    fourPointSegments = 1;
                    generalExteriorSegments = Math.max(generalExteriorSegments - 1, 0);
                }

                chartWorksheet[`A${rowNumber}`].s = { ...rowStyle, numFmt: 'mmm d, yyyy' };
                for (const column of ['B', 'C', 'D']) chartWorksheet[`${column}${rowNumber}`].s = rowStyle;

                for (let segment = 0; segment < 20; segment += 1) {
                    const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: segment + 4 });
                    const isGeneralExterior = segment < generalExteriorSegments;
                    const isFourPoint = segment >= generalExteriorSegments && segment < generalExteriorSegments + fourPointSegments;
                    chartWorksheet[address] = {
                        t: 's',
                        v: '',
                        s: {
                            fill: { fgColor: { rgb: isGeneralExterior ? 'E3A326' : isFourPoint ? '7651C7' : fill } },
                            border: { bottom: { style: 'thin', color: { rgb: 'F0E5D4' } } },
                        },
                    };
                }
            });

            const workbook = XLSX.utils.book_new();
            workbook.Props = { Title: 'Bees360 My Daily Productivity', Subject: `${periodLabel} ${timeLabel}`, Author: 'Bees360' };
            XLSX.utils.book_append_sheet(workbook, chartWorksheet, 'Daily Chart');
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Data');
            XLSX.writeFile(workbook, `Bees360_My_Daily_Reports_${selectedMonth}_${timezone.toUpperCase()}.xlsx`, { compression: true });
        } finally {
            setExporting(false);
        }
    }

    return (
        <AppLayout breadcrumbs={isDailyView ? [{ title: 'My Daily Reports', href: '/dashboard?view=daily' }] : breadcrumbs}>
            <Head title={isDailyView ? 'My Daily Reports' : 'My Bees360 dashboard'} />
            <div className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 text-[#342615] md:p-8">
                <Dialog open={Boolean(feedbackRecord)} onOpenChange={(open) => !open && setFeedbackRecord(null)}>
                    <DialogContent className="max-w-xl border-[#ead5a6] bg-[#fffdf8] text-[#342615]">
                        <DialogHeader>
                            <DialogTitle>QA feedback · {feedbackRecord?.projectId || 'Assessment'}</DialogTitle>
                            <DialogDescription className="text-[#806f59]">
                                {feedbackRecord ? `${formatDate(feedbackRecord.date)} · ${feedbackRecord.score}% score` : ''}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid max-h-[55vh] gap-2 overflow-y-auto pr-1">
                            {feedbackRecord?.feedback.some((item) => item?.trim()) ? (
                                feedbackRecord.feedback.filter((item) => item?.trim()).map((item, index) => (
                                    <div key={`${item}-${index}`} className="rounded-xl border border-[#efdfc8] bg-white p-3 text-sm leading-6 text-[#5c4932]">
                                        {item.trim()}
                                    </div>
                                ))
                            ) : (
                                <p className="rounded-xl bg-[#eef8eb] p-4 text-sm font-semibold text-[#347846]">No errors were recorded for this assessment.</p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={showAchievement} onOpenChange={setShowAchievement}>
                    <DialogContent className="max-w-lg overflow-hidden border-[#e5bc59] bg-[#fffdf8] p-0 text-[#342615] shadow-[0_24px_80px_rgba(73,43,11,0.28)]">
                        <div className="relative overflow-hidden bg-[#4a2d10] px-7 py-8 text-center text-white">
                            <span className="absolute top-5 left-8 text-xl text-[#ffc83d] motion-safe:animate-bounce">✦</span>
                            <span className="absolute top-9 right-10 text-sm text-[#ffe29a] motion-safe:animate-pulse">✦</span>
                            <span className="absolute -right-10 -bottom-16 size-40 rounded-full bg-[#ffc83d]/20" />
                            <span className="relative mx-auto grid size-20 place-items-center rounded-full border-4 border-[#ffe29a] bg-[#ffc83d] text-[#4a2d10] shadow-[0_0_0_10px_rgba(255,200,61,0.12)] motion-safe:animate-[bounce_1s_ease-in-out_2]">
                                <Trophy className="size-10" />
                            </span>
                            <DialogHeader className="relative mt-5 text-center">
                                <DialogTitle className="text-2xl font-black text-white">{achievement?.title}</DialogTitle>
                                <DialogDescription className="text-[#ffe7ae]">Outstanding performance for {achievement?.period}</DialogDescription>
                            </DialogHeader>
                        </div>
                        <div className="grid gap-3 p-6">
                            {achievement?.items.map((item) => (
                                <div key={item.key} className="flex items-center gap-3 rounded-2xl border border-[#eed59a] bg-[#fff8e7] p-4">
                                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ffc83d] text-[#553112]"><Award className="size-6" /></span>
                                    <div><p className="font-black">{item.label}</p><p className="mt-0.5 text-sm text-[#806f59]">{item.detail}</p></div>
                                </div>
                            ))}
                            <p className="pt-1 text-center text-sm font-semibold text-[#806f59]">Great work—keep the momentum going!</p>
                            <Button type="button" onClick={() => setShowAchievement(false)} className="mt-1 h-11 bg-[#c87500] font-black text-white hover:bg-[#a86100]">
                                <PartyPopper className="size-4" /> Continue to my dashboard
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={showAllFeedback} onOpenChange={setShowAllFeedback}>
                    <DialogContent className="max-h-[88vh] max-w-4xl overflow-hidden border-[#d2e5d7] bg-[#fbfffb] p-0 text-[#342615]">
                        <DialogHeader className="border-b border-[#dceade] bg-[#eff8f1] px-6 py-5 text-left">
                            <DialogTitle className="flex items-center gap-3 text-xl">
                                <span className="grid size-10 place-items-center rounded-xl bg-[#dff1e4] text-[#16815b]">
                                    <Eye className="size-5" />
                                </span>
                                All QA feedback
                            </DialogTitle>
                            <DialogDescription className="text-[#63796b]">
                                {auth.user.name} · {periodLabel} · {qaHistory.length} assessment{qaHistory.length === 1 ? '' : 's'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid max-h-[68vh] gap-3 overflow-y-auto p-6">
                            {qaHistory.length ? (
                                qaHistory.map((record) => {
                                    const errors = record.feedback.map((item) => item?.trim()).filter(
                                        (item): item is string => Boolean(item) && !item.toLowerCase().includes('no error'),
                                    );

                                    return (
                                        <article key={`all-${record.id}`} className="overflow-hidden rounded-2xl border border-[#dce8df] bg-white">
                                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eee8] bg-[#fbfdfb] px-4 py-3">
                                                <div>
                                                    <p className="font-black text-[#342615]">Project {record.projectId || '—'}</p>
                                                    <p className="mt-1 text-xs text-[#806f59]">
                                                        {formatDate(record.date)} · QC: {record.qcName || '—'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                                            record.score >= 95
                                                                ? 'bg-[#e1f3df] text-[#347846]'
                                                                : record.score >= 90
                                                                  ? 'bg-[#fff0c9] text-[#936000]'
                                                                  : 'bg-[#f9dfda] text-[#a5474b]'
                                                        }`}
                                                    >
                                                        {record.score}%
                                                    </span>
                                                    <span className="rounded-full bg-[#fff3d8] px-2.5 py-1 text-xs font-bold text-[#a96300]">
                                                        {errors.length} error{errors.length === 1 ? '' : 's'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid gap-2 p-4">
                                                {errors.length ? (
                                                    errors.map((item, index) => (
                                                        <p
                                                            key={`${record.id}-${item}-${index}`}
                                                            className="rounded-xl border border-[#efdfc8] bg-[#fffaf1] px-3 py-2.5 text-sm leading-6 text-[#5c4932]"
                                                        >
                                                            {item}
                                                        </p>
                                                    ))
                                                ) : (
                                                    <p className="rounded-xl bg-[#eef8eb] px-3 py-2.5 text-sm font-semibold text-[#347846]">
                                                        No errors were recorded for this assessment.
                                                    </p>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })
                            ) : (
                                <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-[#bcd9c8] text-center">
                                    <div>
                                        <ShieldCheck className="mx-auto size-10 text-[#76a98b]" />
                                        <p className="mt-3 font-black">No feedback available</p>
                                        <p className="mt-1 text-sm text-[#806f59]">There are no QA assessments for {periodLabel}.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                <section className="relative overflow-hidden rounded-3xl bg-[#4a2d10] px-6 py-6 text-white shadow-[0_16px_40px_rgba(74,45,16,0.18)] md:px-8">
                    <div className="absolute -top-16 -right-10 size-52 rounded-full bg-[#ffc83d]/20" />
                    <div className="absolute right-28 -bottom-20 size-40 rotate-45 rounded-3xl border border-[#ffc83d]/15" />
                    <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                        <div>
                            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#ffc83d] uppercase">
                                <Sparkles className="size-4" /> {isDailyView ? 'My daily productivity' : 'My performance workspace'}
                            </p>
                            <h1 className="mt-3 text-3xl font-black tracking-tight">{greeting(clock)}, {auth.user.n_name || auth.user.name.split(' ')[0]}.</h1>
                            <p className="mt-2 text-sm text-[#ead8be]">
                                {isDailyView
                                    ? 'Review how many General Exterior and 4-Point reports you finished each day.'
                                    : 'Track your production, quality, and incentive progress in one place.'}
                            </p>
                            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#fff2d2]">
                                <span className="size-2 animate-pulse rounded-full bg-[#68d391]" /> Live PH Time · {phDateTime(clock)}
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[440px]">
                            <label className="grid gap-2 text-xs font-bold text-[#ffe9b5]">
                                {isDailyView ? 'Report month · PH calendar' : 'Reporting month'}
                                <span className="relative">
                                    <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#b96c00]" />
                                    <select
                                        value={selectedMonth}
                                        disabled={monthLoading}
                                        onChange={(event) => selectMonth(event.target.value)}
                                        className="h-11 w-full appearance-none rounded-xl border border-[#e0bd75] bg-[#fffdf8] pr-9 pl-10 text-sm font-bold text-[#4a3821] outline-none focus:ring-2 focus:ring-[#ffc83d]"
                                    >
                                        {availableMonths.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                                    </select>
                                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#b96c00]">▾</span>
                                </span>
                                {isDailyView && <span className="font-medium text-[#d9c49f]">Defaults to the current Philippine month. Select any previous month to review it.</span>}
                            </label>
                            <div className="grid gap-2 text-xs font-bold text-[#ffe9b5]">
                                Reporting timezone
                                <div className="flex h-11 rounded-xl bg-white/10 p-1 ring-1 ring-white/15">
                                    {(['ph', 'cst'] as Timezone[]).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => setTimezone(zone)}
                                            className={`flex-1 rounded-lg text-sm font-black transition duration-300 ${timezone === zone ? 'bg-[#ffc83d] text-[#3f280e] shadow' : 'text-white hover:bg-white/10'}`}
                                        >
                                            {zone === 'ph' ? 'PH Time' : 'CST Time'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {latestQaNotification && !isDailyView && (
                    <section className="relative overflow-hidden rounded-2xl border border-[#9fc9aa] bg-[#eff9f1] p-5 shadow-[0_10px_30px_rgba(21,129,91,0.1)]">
                        <span className="absolute -top-8 -right-8 size-28 rounded-full bg-[#5caf78]/10" />
                        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div className="flex min-w-0 items-start gap-4">
                                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#16815b] text-white shadow-[0_6px_18px_rgba(21,129,91,0.22)]">
                                    <BellRing className="size-5 animate-[pulse_1.5s_ease-in-out_infinite]" />
                                </span>
                                <div>
                                    <p className="text-xs font-black tracking-[0.14em] text-[#16815b] uppercase">New QA notification</p>
                                    <h2 className="mt-1 font-black text-[#284735]">{latestQaNotification.title}</h2>
                                    <p className="mt-1 text-sm leading-6 text-[#63796b]">{latestQaNotification.message}</p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <span className="rounded-full bg-white px-3 py-2 text-sm font-black text-[#347846] shadow-sm">
                                    {latestQaNotification.score}%
                                </span>
                                <Button
                                    type="button"
                                    onClick={() => openProcessorNotification(latestQaNotification)}
                                    className="h-10 bg-[#155d3d] px-4 font-bold text-white hover:bg-[#10472f]"
                                >
                                    <Eye className="size-4" /> View feedback
                                </Button>
                            </div>
                        </div>
                    </section>
                )}

                <section className={`grid gap-4 sm:grid-cols-2 ${isDailyView ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
                    <MetricCard label="Total cases" value={performance.totalCases} icon={FileCheck2} tone="bg-[#fff0c9] text-[#a96300]" />
                    <MetricCard label="General Exterior" value={performance.generalExterior} icon={ShieldCheck} tone="bg-[#e4f3df] text-[#347846]" />
                    <MetricCard label="4-Point" value={performance.fourPoint} icon={Gauge} tone="bg-[#efe6ff] text-[#7146c6]" />
                    {!isDailyView && <article className="relative min-h-40 overflow-hidden rounded-2xl border border-[#bcd9c8] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(20,122,81,0.07)]">
                        <div className="flex items-start justify-between">
                            <div><p className="text-sm font-bold">Total accuracy</p><p className="mt-1 text-xs text-[#806f59]">{periodLabel}</p></div>
                            <span className="grid size-9 place-items-center rounded-xl bg-[#e4f4ec] text-[#16815b]"><ShieldCheck className="size-5" /></span>
                        </div>
                        {performance.qaScore === null ? (
                            <div className="grid h-24 place-items-center text-center"><p className="text-sm font-bold text-[#806f59]">No QA data for this month</p></div>
                        ) : (
                            <div className="relative -mt-1">
                                <AnimatedGauge percentage={performance.qaScore} />
                                <div className="absolute inset-x-0 bottom-1 text-center"><p className="text-2xl font-black">{performance.qaScore}%</p><p className="text-[9px] font-bold text-[#16815b] uppercase">Total accuracy</p></div>
                            </div>
                        )}
                        <p className="text-center text-[11px] text-[#806f59]">{performance.qaReviews ? `Average from ${performance.qaReviews} QA assessments` : 'Awaiting QA assessments'}</p>
                    </article>}
                </section>

                {!isDailyView && <section className="grid gap-4 xl:grid-cols-[minmax(340px,0.95fr)_repeat(3,minmax(220px,0.55fr))]">
                    <article className="relative overflow-hidden rounded-2xl bg-[#553112] p-6 text-white shadow-[0_12px_34px_rgba(74,45,16,0.16)]">
                        <span className="absolute -top-16 -right-12 size-44 rounded-full bg-[#e8a928]/25" />
                        <p className="text-xs font-black tracking-wide text-[#ffe0a0] uppercase">Total earned credits</p>
                        <p className="mt-1 text-xs font-semibold text-[#ead8be]">Monthly tier progress · {periodLabel}</p>
                        <p className="mt-4 text-4xl font-black tracking-tight">{performance.credits.toLocaleString()}</p>
                        <p className="mt-2 text-xs font-semibold text-[#ead8be]">{performance.generalExterior} × 1 + {performance.fourPoint} × 1.25</p>
                        <div className="mt-7 flex items-center justify-between rounded-xl bg-white/12 p-4">
                            <div><p className="text-xs text-[#ead8be]">Current incentive</p><p className="text-2xl font-black text-[#ffc83d]">${performance.incentive}</p></div>
                            <Target className="size-8 text-[#ffc83d]" />
                        </div>
                    </article>
                    {performance.tiers.map((tier) => <TierCard key={`${timezone}-${tier.name}`} tier={tier} period={periodLabel} />)}
                </section>}

                {!isDailyView && <section id="leaderboards" className="grid scroll-mt-6 gap-6 xl:grid-cols-2">
                    <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(88,57,18,0.05)] sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold tracking-[0.16em] text-[#b26a00] uppercase">Monthly leaderboard</p>
                                <h2 className="mt-1 text-xl font-black">Top production performers</h2>
                                <p className="mt-1 text-sm text-[#806f59]">Most total cases · {periodLabel} · {timezone.toUpperCase()} Time</p>
                            </div>
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0c9] text-[#c07a00]">
                                <Trophy className="size-5" />
                            </span>
                        </div>
                        <div className="mt-5 grid gap-3">
                            {productionLeaders.length ? (
                                productionLeaders.map((leader, index) => {
                                    const style = rankStyles[index];
                                    return (
                                        <div key={`${timezone}-${leader.processor}`} className={`rounded-xl border p-3.5 ${style.card}`}>
                                            <div className="flex items-center gap-3">
                                                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-black shadow-sm ${style.badge}`}>
                                                    {leader.rank}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-black text-[#342615]">
                                                        {leader.processor}
                                                        {leader.isCurrentUser && <span className="ml-2 text-xs font-bold text-[#16815b]">You</span>}
                                                    </p>
                                                    <p className="mt-1 text-xs text-[#806f59]">
                                                        {leader.generalExterior} GE · {leader.fourPoint} 4PT
                                                        {leader.qaScore !== null ? ` · ${leader.qaScore}% accuracy` : ''}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-[#a96300]">{leader.totalCases.toLocaleString()}</p>
                                                    <p className="text-[10px] font-bold text-[#8b7454] uppercase">cases</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${style.bar}`}
                                                    style={{ width: `${Math.max((leader.totalCases / highestProduction) * 100, 5)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-xl border border-dashed border-[#e1c894] bg-[#fffaf1] p-7 text-center text-sm text-[#806f59]">
                                    No production rankings are available for {periodLabel}.
                                </div>
                            )}
                        </div>
                    </article>

                    <article className="rounded-2xl border border-[#bcd9c8] bg-[#fbfffb] p-5 shadow-[0_8px_28px_rgba(20,122,81,0.06)] sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold tracking-[0.16em] text-[#16815b] uppercase">Quality leaderboard</p>
                                <h2 className="mt-1 text-xl font-black">Highest QA accuracy</h2>
                                <p className="mt-1 text-sm text-[#806f59]">Top quality averages · {periodLabel}</p>
                            </div>
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dff1e4] text-[#16815b]">
                                <ShieldCheck className="size-5" />
                            </span>
                        </div>
                        <div className="mt-5 grid gap-3">
                            {leaderboards.accuracy.length ? (
                                leaderboards.accuracy.map((leader, index) => {
                                    const style = rankStyles[index];
                                    return (
                                        <div key={`accuracy-${leader.processor}`} className={`rounded-xl border p-3.5 ${style.card}`}>
                                            <div className="flex items-center gap-3">
                                                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-black shadow-sm ${style.badge}`}>
                                                    {leader.rank}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-black text-[#342615]">
                                                        {leader.processor}
                                                        {leader.isCurrentUser && <span className="ml-2 text-xs font-bold text-[#16815b]">You</span>}
                                                    </p>
                                                    <p className="mt-1 text-xs text-[#806f59]">
                                                        Average from {leader.qaReviews} assessment{leader.qaReviews === 1 ? '' : 's'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-[#16815b]">{leader.qaScore}%</p>
                                                    <p className="text-[10px] font-bold text-[#64806f] uppercase">accuracy</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${style.bar}`}
                                                    style={{ width: `${Math.max((leader.qaScore / highestAccuracy) * 100, 5)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-xl border border-dashed border-[#bcd9c8] bg-white p-7 text-center text-sm text-[#806f59]">
                                    No QA accuracy rankings are available for {periodLabel}.
                                </div>
                            )}
                        </div>
                    </article>
                </section>}

                <section
                    id="daily-productivity"
                    className="scroll-mt-6 overflow-hidden rounded-2xl border border-[#eadbc6] bg-[#fffdf8] shadow-[0_8px_28px_rgba(88,57,18,0.05)]"
                >
                    <div className="flex flex-col justify-between gap-4 border-b border-[#eadbc6] bg-[#fff9ed] p-5 sm:flex-row sm:items-center sm:p-6">
                        <div>
                            <p className="text-xs font-bold tracking-[0.16em] text-[#b26a00] uppercase">My daily reports</p>
                            <h2 className="mt-1 text-xl font-black">Daily productivity details</h2>
                            <p className="mt-1 text-sm text-[#806f59]">General Exterior and 4-Point reports for {periodLabel}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex w-fit rounded-xl border border-[#e1c894] bg-white p-1">
                                {(['ph', 'cst'] as Timezone[]).map((zone) => (
                                    <button
                                        key={`daily-${zone}`}
                                        type="button"
                                        onClick={() => setTimezone(zone)}
                                        className={`rounded-lg px-4 py-2 text-xs font-black transition ${timezone === zone ? 'bg-[#553112] text-white shadow-sm' : 'text-[#806f59] hover:bg-[#fff3d8]'}`}
                                    >
                                        {zone.toUpperCase()} Time
                                    </button>
                                ))}
                            </div>
                            {isDailyView && (
                                <Button
                                    type="button"
                                    onClick={exportDailyReports}
                                    disabled={!hasProduction || exporting}
                                    className="h-11 gap-2 bg-[#c87500] px-4 font-black text-white shadow-[0_6px_16px_rgba(174,101,0,0.18)] hover:bg-[#a86100] disabled:bg-[#cbbda9]"
                                >
                                    {exporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
                                    {exporting ? 'Preparing…' : 'Export Excel'}
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-left text-sm">
                            <thead className="sticky top-0 z-10 bg-[#3f2813] text-xs font-black tracking-wide text-white uppercase">
                                <tr><th className="px-6 py-3.5">Report date</th><th className="px-6 py-3.5 text-center">General Exterior</th><th className="px-6 py-3.5 text-center">4-Point</th><th className="bg-[#2f1d0e] px-6 py-3.5 text-center">Total finished</th></tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee3d3]">
                                {chartData.length ? (
                                    chartData.map((day) => (
                                        <tr key={`${timezone}-${day.date}`} className={`transition hover:bg-[#fff4d8] ${day.total === 0 ? 'bg-[#fffdf9] text-[#a89a87]' : 'bg-white text-[#4d3922]'}`}>
                                            <td className="px-6 py-3 font-bold">{formatDate(day.date)}</td>
                                            <td className="px-6 py-3 text-center font-semibold">{day.generalExterior}</td>
                                            <td className="px-6 py-3 text-center font-semibold">{day.fourPoint}</td>
                                            <td className={`px-6 py-3 text-center font-black ${day.total > 0 ? 'bg-[#fff1c7] text-[#9b5d00]' : 'bg-[#fffaf0]'}`}>{day.total}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="bg-white px-6 py-10 text-center text-sm font-semibold text-[#806f59]">
                                            No {timezone.toUpperCase()} daily reports are available for {periodLabel}.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {chartData.length > 0 && <tfoot className="sticky bottom-0 border-t-2 border-[#5b3815] bg-[#ffedb8] font-black text-[#4a2d10]">
                                <tr><td className="px-6 py-3.5">Monthly total · {timezone.toUpperCase()}</td><td className="px-6 py-3.5 text-center">{performance.generalExterior}</td><td className="px-6 py-3.5 text-center">{performance.fourPoint}</td><td className="bg-[#f6d370] px-6 py-3.5 text-center">{performance.totalCases}</td></tr>
                            </tfoot>}
                        </table>
                    </div>
                </section>

                <section className={`grid gap-6 ${isDailyView ? '' : 'xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]'}`}>
                    <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(88,57,18,0.05)] sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div><p className="text-xs font-bold tracking-[0.16em] text-[#b26a00] uppercase">Monthly production</p><h2 className="mt-1 text-xl font-black">Daily report output</h2><p className="mt-1 text-sm text-[#806f59]">{periodLabel} · {timezone === 'ph' ? 'PH Time' : 'CST Time'}</p></div>
                            <div className="flex gap-3 text-xs font-semibold text-[#806f59]"><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#d89013]" />General Exterior</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#6d4bc3]" />4-Point</span></div>
                        </div>
                        {hasProduction ? (
                            <div className={`mt-6 w-full ${isDailyView ? 'h-64' : 'h-72'}`}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                                        <defs><linearGradient id="processorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ffc83d" stopOpacity={0.35} /><stop offset="95%" stopColor="#ffc83d" stopOpacity={0.02} /></linearGradient></defs>
                                        <CartesianGrid stroke="#eadfce" strokeDasharray="4 4" vertical={false} />
                                        <XAxis dataKey="day" stroke="#927d61" tickLine={false} axisLine={false} interval="preserveStartEnd" fontSize={11} />
                                        <YAxis stroke="#927d61" tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
                                        <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e4c98f', background: '#fffdf8', color: '#342615' }} />
                                        <Area type="monotone" dataKey="total" stroke="#a96700" strokeWidth={3} fill="url(#processorTotal)" isAnimationActive animationDuration={1100} />
                                        <Bar dataKey="generalExterior" fill="#d89013" radius={[5, 5, 0, 0]} maxBarSize={13} isAnimationActive animationDuration={900} />
                                        <Bar dataKey="fourPoint" fill="#6d4bc3" radius={[5, 5, 0, 0]} maxBarSize={13} isAnimationActive animationDuration={1200} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="mt-6 grid h-72 place-items-center rounded-2xl border border-dashed border-[#e1c894] bg-[#fffaf1] text-center"><div><FileCheck2 className="mx-auto size-10 text-[#d5a650]" /><p className="mt-3 font-black">No {timezone.toUpperCase()} production data</p><p className="mt-1 text-sm text-[#806f59]">No reports were imported for {periodLabel}.</p></div></div>
                        )}
                    </article>
                    {!isDailyView && <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(88,57,18,0.05)] sm:p-6">
                        <p className="text-xs font-bold tracking-[0.16em] text-[#16815b] uppercase">Quality pattern</p><h2 className="mt-1 text-xl font-black">Recurring feedback</h2><p className="mt-1 text-sm text-[#806f59]">Repeated notes during {periodLabel}</p>
                        <div className="mt-5 grid max-h-72 gap-2 overflow-y-auto pr-1">
                            {recurringFeedback.length ? recurringFeedback.map((item) => (
                                <div key={item.feedback} className="flex gap-3 rounded-xl border border-[#efdfc8] bg-[#fffaf1] p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#ffe3a0] text-xs font-black text-[#9c5d00]">{item.count}×</span><p className="text-xs leading-5 text-[#5c4932]">{item.feedback}</p></div>
                            )) : <div className="rounded-xl bg-[#eef8eb] p-4 text-center text-sm font-semibold text-[#347846]">No recurring feedback for this month.</div>}
                        </div>
                    </article>}
                </section>

                {!isDailyView && <section
                    id="qa-history"
                    className="scroll-mt-6 overflow-hidden rounded-2xl border border-[#bcd9c8] bg-[#fbfffb] shadow-[0_8px_28px_rgba(20,122,81,0.06)]"
                >
                    <div className="flex flex-col justify-between gap-4 border-b border-[#dceade] p-5 sm:flex-row sm:items-center sm:p-6">
                        <div>
                            <p className="text-xs font-bold tracking-[0.16em] text-[#16815b] uppercase">Quality history</p>
                            <h2 className="mt-1 text-xl font-black">My QA assessment records</h2>
                            <p className="mt-1 text-sm text-[#806f59]">
                                {periodLabel} · {qaHistory.length} assessment{qaHistory.length === 1 ? '' : 's'}
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={() => setShowAllFeedback(true)}
                            disabled={qaHistory.length === 0}
                            className="h-11 gap-2 bg-[#553112] px-5 font-bold text-white hover:bg-[#3f230c] disabled:bg-[#cbbda9]"
                        >
                            <Eye className="size-4" />
                            View all feedback
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-[#eaf5ee] text-xs font-bold tracking-wide text-[#3d6b52] uppercase"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Project</th><th className="px-5 py-3">QC</th><th className="px-5 py-3">Score</th><th className="px-5 py-3">Errors</th><th className="px-5 py-3 text-right">Feedback</th></tr></thead>
                            <tbody className="divide-y divide-[#e5eee7]">
                                {qaHistory.length ? qaHistory.map((record) => {
                                    const errors = record.feedback.filter((item) => item?.trim() && !item.trim().toLowerCase().includes('no error')).length;
                                    return <tr key={record.id} className="bg-white transition hover:bg-[#fffaf1]"><td className="px-5 py-3.5 text-[#806f59]">{formatDate(record.date)}</td><td className="px-5 py-3.5 font-bold">{record.projectId || '—'}</td><td className="px-5 py-3.5 text-[#806f59]">{record.qcName || '—'}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${record.score >= 95 ? 'bg-[#e1f3df] text-[#347846]' : record.score >= 90 ? 'bg-[#fff0c9] text-[#936000]' : 'bg-[#f9dfda] text-[#a5474b]'}`}>{record.score}%</span></td><td className="px-5 py-3.5 font-bold text-[#a96300]">{errors}</td><td className="px-5 py-3.5 text-right"><Button type="button" onClick={() => setFeedbackRecord(record)} className="h-9 border border-[#dfb96d] bg-[#fffaf1] text-[#8a5200] hover:bg-[#ffe8b5]"><Eye className="size-4" /> View</Button></td></tr>;
                                }) : <tr><td colSpan={6} className="px-5 py-10 text-center text-[#806f59]">No QA assessments are available for {periodLabel}.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>}
            </div>
        </AppLayout>
    );
}
