import { ProcessorSelect } from '@/components/processor-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { qaAssessmentsFromWorkbook } from '@/lib/processor-workbook';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage, usePoll } from '@inertiajs/react';
import {
    AlertTriangle,
    Award,
    CalendarRange,
    CheckCircle2,
    Clock3,
    Download,
    Eye,
    FileSpreadsheet,
    Gauge,
    History,
    LoaderCircle,
    ShieldCheck,
    UploadCloud,
    WalletCards,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { WorkSheet } from 'xlsx-js-style';

type Tier = { name: string; target: number; incentive: number; achieved: boolean; needed: number; percentage: number };
type Performance = {
    processor: string;
    batch: number | null;
    totalCases: number;
    generalExterior: number;
    fourPoint: number;
    credits: number;
    qcScore: number | null;
    qcReviews: number;
    incentive: number;
    tiers: Tier[];
};
type QaHistoryRow = {
    id: number;
    date: string;
    processor: string;
    nickname: string | null;
    projectId: string | null;
    qcName: string | null;
    reportUrl: string | null;
    score: number;
    feedback: string[];
};
type Props = {
    phPerformance: Performance[];
    cstPerformance: Performance[];
    approvedProcessors: { name: string; nickname: string | null }[];
    qaHistory: QaHistoryRow[];
    periods: { ph: string; cst: string; qa: string | null };
    filters: { manual: boolean; startDate: string; endDate: string; latestQaStart: string | null; latestQaEnd: string | null };
};
type Timezone = 'ph' | 'cst';
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations dashboard', href: '/dashboard' },
    { title: 'Processors', href: '/operations/processors' },
];
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const philippinesMonth = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        timeZone: 'Asia/Manila',
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

    return `${value('year')}-${value('month')}`;
};
const formatQaMonth = (month: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
const formatQaDay = (date: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const formatPhilippinesDateTime = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Manila',
        timeZoneName: 'short',
    }).format(date);
function QaAccuracyGauge({ score, reviews, period }: { score: number | null; reviews: number; period: string | null }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setProgress(0);
        const frame = requestAnimationFrame(() => setProgress(score ?? 0));

        return () => cancelAnimationFrame(frame);
    }, [score]);

    return (
        <article className="relative h-full overflow-hidden rounded-2xl border border-[#bcd9c8] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgba(20,122,81,0.08)]">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-extrabold text-[#342615]">Total Accuracy</p>
                    <p className="mt-1 text-xs text-[#806f59]">QA Total Score · {period ?? 'No uploads'}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-[#e3f3e8] text-[#147a51]">
                    <ShieldCheck className="size-5" />
                </span>
            </div>
            <div className="relative mx-auto mt-3 max-w-[230px]">
                <svg
                    viewBox="0 0 200 118"
                    className="w-full drop-shadow-sm"
                    role="img"
                    aria-label={score === null ? 'No QA score available' : `Average QA accuracy ${score} percent`}
                >
                    <defs>
                        <pattern id="qa-gauge-stripes" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                            <rect width="3" height="7" fill="#cdd9d1" />
                        </pattern>
                    </defs>
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="url(#qa-gauge-stripes)"
                        strokeWidth="22"
                        strokeLinecap="round"
                        pathLength="100"
                    />
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#147a51"
                        strokeWidth="22"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray={`${progress} 100`}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-x-0 bottom-0 text-center">
                    <p className={`${score === null ? 'text-2xl' : 'text-4xl'} font-black tracking-tight text-[#342615]`}>
                        {score === null ? 'No data' : `${score}%`}
                    </p>
                    <p className="text-[10px] font-bold tracking-[0.12em] text-[#147a51] uppercase">Total accuracy</p>
                </div>
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-[#806f59]">
                {reviews > 0
                    ? `Average from ${reviews} QA assessment${reviews === 1 ? '' : 's'}`
                    : `No QA score available for ${period ?? 'this period'}`}
            </p>
        </article>
    );
}

function TierProgressGauge({ tier, period }: { tier: Tier; period: string }) {
    const segments = 25;
    const completed = Math.round((tier.percentage / 100) * segments);

    return (
        <article
            className={`group rounded-2xl border p-5 transition duration-500 hover:-translate-y-1 hover:shadow-[0_16px_35px_rgba(88,57,18,0.12)] ${tier.achieved ? 'border-[#a9d2a6] bg-[#f3faef]' : 'border-[#eadbc6] bg-[#fffdf8]'}`}
        >
            <div className="flex items-center justify-between">
                <span
                    className={`grid size-10 place-items-center rounded-xl ${tier.achieved ? 'bg-[#ddefd7] text-[#347846]' : 'bg-[#fff0c9] text-[#a96300]'}`}
                >
                    <Award className="size-5" />
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#8b5b11]">${tier.incentive}</span>
            </div>
            <div className="relative mx-auto mt-4 max-w-[210px]">
                <svg viewBox="0 0 200 112" className="w-full drop-shadow-sm" aria-label={`${tier.name} is ${tier.percentage} percent complete`}>
                    {Array.from({ length: segments }, (_, index) => {
                        const angle = Math.PI + (Math.PI * index) / (segments - 1);
                        const x1 = 100 + 62 * Math.cos(angle);
                        const y1 = 100 + 62 * Math.sin(angle);
                        const x2 = 100 + 82 * Math.cos(angle);
                        const y2 = 100 + 82 * Math.sin(angle);
                        const isComplete = index < completed;
                        const isNext = index === completed && !tier.achieved;

                        return (
                            <line
                                key={index}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={isComplete ? '#36b878' : isNext ? '#e39a20' : '#d7dcd8'}
                                strokeWidth={isNext ? 8 : 7}
                                strokeLinecap="round"
                                className={`transition-all duration-700 ${isNext ? 'animate-pulse' : ''}`}
                                style={{ transitionDelay: `${index * 22}ms` }}
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-x-0 bottom-0 text-center">
                    <p className="text-3xl font-black text-[#342615]">{tier.percentage}%</p>
                    <p className="text-[10px] font-bold tracking-wide text-[#947650] uppercase">of {tier.target} credits</p>
                </div>
            </div>
            <h3 className="mt-3 text-center text-lg font-extrabold text-[#342615]">{tier.name}</h3>
            <p className="mt-1 text-center text-[10px] font-bold tracking-wide text-[#8b7557] uppercase">{period}</p>
            <div
                className={`mt-3 rounded-xl border px-3 py-3 text-center ${tier.achieved ? 'border-[#b9dbb9] bg-[#e5f5e2]' : 'border-[#f0c675] bg-[#fff3d8]'}`}
            >
                <p className={`text-xs font-black tracking-wide uppercase ${tier.achieved ? 'text-[#347846]' : 'text-[#9b5d00]'}`}>
                    {tier.achieved ? 'Target achieved' : 'Remaining credits'}
                </p>
                <p className={`mt-1 text-xl font-black ${tier.achieved ? 'text-[#347846]' : 'text-[#b56b00]'}`}>
                    {tier.achieved ? `$${tier.incentive} earned` : tier.needed}
                </p>
            </div>
        </article>
    );
}

export default function Processors({ phPerformance, cstPerformance, approvedProcessors, qaHistory, periods, filters }: Props) {
    usePoll(30_000, { only: ['phPerformance', 'cstPerformance', 'approvedProcessors', 'qaHistory', 'periods'] });

    const page = usePage<{
        flash?: {
            cstImportSummary?: { saved: number; file: string };
            qaImportSummary?: { saved: number; created: number; updated: number; matched: number; unmatched: number };
        };
        errors?: Record<string, string>;
    }>();
    const [timezone, setTimezone] = useState<Timezone>('ph');
    const [processor, setProcessor] = useState('');
    const [successOpen, setSuccessOpen] = useState(Boolean(page.props.flash?.cstImportSummary));
    const qaFileRef = useRef<HTMLInputElement>(null);
    const [qaOpen, setQaOpen] = useState(false);
    const [qaFile, setQaFile] = useState<File | null>(null);
    const [qaDragging, setQaDragging] = useState(false);
    const [qaUploading, setQaUploading] = useState(false);
    const [qaProgress, setQaProgress] = useState(0);
    const [qaError, setQaError] = useState<string | null>(null);
    const [feedbackScope, setFeedbackScope] = useState<'all' | string | null>(null);
    const [phNow, setPhNow] = useState(() => new Date());
    const phCurrentMonth = philippinesMonth(phNow);
    const previousPhMonth = useRef(phCurrentMonth);
    const qaMonths = useMemo(() => {
        const year = phCurrentMonth.slice(0, 4);
        const calendarMonths = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);

        return [...new Set([...calendarMonths, ...qaHistory.map((row) => row.date.slice(0, 7))])].filter(Boolean).sort((a, b) => a.localeCompare(b));
    }, [phCurrentMonth, qaHistory]);
    const [qaRange, setQaRange] = useState<'month' | 'all'>('month');
    const [selectedQaMonth, setSelectedQaMonth] = useState(() => filters.startDate.slice(0, 7) || philippinesMonth());
    const [applyingMonth, setApplyingMonth] = useState(false);
    const [incentiveView, setIncentiveView] = useState<'overall' | 'tier3'>('overall');
    const performances = timezone === 'ph' ? phPerformance : cstPerformance;
    const names = useMemo(
        () =>
            [
                ...new Set([
                    ...approvedProcessors.map((item) => item.name),
                    ...performances.map((item) => item.processor),
                    ...qaHistory.map((row) => row.processor),
                ]),
            ].sort((a, b) => a.localeCompare(b)),
        [approvedProcessors, performances, qaHistory],
    );
    const processorAliases = useMemo(
        () => Object.fromEntries(approvedProcessors.filter((item) => item.nickname).map((item) => [item.name, [item.nickname as string]])),
        [approvedProcessors],
    );
    const selected = performances.find((item) => item.processor === processor) ?? null;
    const qaFilterStart = filters.startDate;
    const qaFilterEnd = filters.endDate;
    const visibleQaHistory = useMemo(
        () =>
            qaHistory.filter((row) => {
                const sameProcessor = !processor || row.processor === processor || row.nickname?.toLowerCase() === processor.toLowerCase();
                return sameProcessor && (qaRange === 'all' || (row.date >= qaFilterStart && row.date <= qaFilterEnd));
            }),
        [processor, qaHistory, qaRange, qaFilterStart, qaFilterEnd],
    );
    const feedbackSummary = useMemo(() => {
        const counts = new Map<string, number>();
        visibleQaHistory
            .flatMap((row) => row.feedback)
            .filter((feedback) => !normalize(feedback).includes('noerror'))
            .forEach((feedback) => counts.set(feedback, (counts.get(feedback) ?? 0) + 1));
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [visibleQaHistory]);
    const qaAccuracy = useMemo(() => {
        const period = qaRange === 'all' ? 'All QA months' : `${formatQaDay(qaFilterStart)} – ${formatQaDay(qaFilterEnd)}`;

        if (visibleQaHistory.length === 0) return { score: null, reviews: 0, period };

        return {
            score: Number((visibleQaHistory.reduce((total, row) => total + row.score, 0) / visibleQaHistory.length).toFixed(2)),
            reviews: visibleQaHistory.length,
            period,
        };
    }, [qaRange, qaFilterStart, qaFilterEnd, visibleQaHistory]);
    const feedbackRows = useMemo(
        () => (feedbackScope === 'all' ? visibleQaHistory : feedbackScope ? visibleQaHistory.filter((row) => row.date === feedbackScope) : []),
        [feedbackScope, visibleQaHistory],
    );
    const feedbackErrors = useMemo(
        () => feedbackRows.reduce((total, row) => total + row.feedback.filter((feedback) => !normalize(feedback).includes('noerror')).length, 0),
        [feedbackRows],
    );
    const incentiveRows = useMemo(
        () =>
            performances
                .map((performance) => ({
                    ...performance,
                    highestTier: [...performance.tiers].reverse().find((tier) => tier.achieved)?.name ?? 'Not achieved',
                }))
                .filter((performance) => incentiveView === 'overall' || performance.incentive === 300)
                .sort(
                    (left, right) =>
                        right.incentive - left.incentive || right.credits - left.credits || left.processor.localeCompare(right.processor),
                ),
        [incentiveView, performances],
    );
    const tierThreeEarners = useMemo(() => performances.filter((performance) => performance.incentive === 300).length, [performances]);

    const incentiveTotals = useMemo(
        () => ({
            generalExterior: incentiveRows.reduce((total, row) => total + row.generalExterior, 0),
            fourPoint: incentiveRows.reduce((total, row) => total + row.fourPoint, 0),
            totalCases: incentiveRows.reduce((total, row) => total + row.totalCases, 0),
            credits: incentiveRows.reduce((total, row) => total + row.credits, 0),
            payout: incentiveRows.reduce((total, row) => total + row.incentive, 0),
        }),
        [incentiveRows],
    );

    useEffect(() => {
        if (processor && !names.includes(processor)) setProcessor('');
    }, [names, processor]);
    useEffect(() => {
        if (!selectedQaMonth || !qaMonths.includes(selectedQaMonth)) setSelectedQaMonth(qaMonths[0] ?? '');
    }, [qaMonths, selectedQaMonth]);
    useEffect(() => {
        const timer = window.setInterval(() => setPhNow(new Date()), 1_000);

        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        if (previousPhMonth.current === phCurrentMonth) return;

        const previousMonth = previousPhMonth.current;
        previousPhMonth.current = phCurrentMonth;
        setSelectedQaMonth((month) => (month === previousMonth ? phCurrentMonth : month));
    }, [phCurrentMonth]);
    useEffect(() => {
        if (page.props.flash?.cstImportSummary || page.props.flash?.qaImportSummary) setSuccessOpen(true);
    }, [page.props.flash?.cstImportSummary, page.props.flash?.qaImportSummary]);

    const applyProcessorMonth = (month: string) => {
        const [year, monthNumber] = month.split('-').map(Number);
        const endDate = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);

        setSelectedQaMonth(month);
        setQaRange('month');
        router.get(
            '/operations/processors',
            { start_date: `${month}-01`, end_date: endDate },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                onStart: () => setApplyingMonth(true),
                onFinish: () => setApplyingMonth(false),
            },
        );
    };

    const chooseQaFile = (candidate?: File) => {
        if (!candidate) return;
        if (!/\.(xlsx?|csv)$/.test(candidate.name.toLowerCase())) {
            setQaError('Choose an Excel .xlsx, .xls or .csv file.');
            return;
        }
        setQaFile(candidate);
        setQaError(null);
    };
    const uploadQa = async () => {
        if (!qaFile) return;
        setQaUploading(true);
        setQaError(null);
        setQaProgress(15);
        try {
            const assessments = await qaAssessmentsFromWorkbook(qaFile);
            setQaProgress(55);
            router.post(
                '/operations/processors/qa-import',
                { source_file: qaFile.name, assessments },
                {
                    preserveScroll: true,
                    onProgress: (event) => setQaProgress(Math.max(55, event?.percentage ?? 55)),
                    onError: (errors) => {
                        setQaError(Object.values(errors)[0] ?? 'The QA workbook could not be saved.');
                        setQaProgress(0);
                    },
                    onSuccess: () => {
                        setQaProgress(100);
                        setQaFile(null);
                        setQaOpen(false);
                    },
                    onFinish: () => setQaUploading(false),
                },
            );
        } catch (exception) {
            setQaError(exception instanceof Error ? exception.message : 'The QA workbook could not be read.');
            setQaProgress(0);
            setQaUploading(false);
        }
    };

    const statCards = selected
        ? ([
              ['Total cases', selected.totalCases, FileSpreadsheet, 'bg-[#fff0c9] text-[#a96300]'],
              ['General Exterior', selected.generalExterior, ShieldCheck, 'bg-[#e6f3df] text-[#347846]'],
              ['4-Point', selected.fourPoint, Gauge, 'bg-[#efe7ff] text-[#7048bd]'],
          ] as const)
        : [];

    const exportMonthlyIncentives = async () => {
        const XLSX = await import('xlsx-js-style');
        if (incentiveRows.length === 0) return;

        const headerRow = 4;
        const firstDataRow = headerRow + 1;
        const totalRow = firstDataRow + incentiveRows.length;
        const viewLabel = incentiveView === 'overall' ? 'Overall' : '$300 Earners';
        const timeLabel = timezone === 'ph' ? 'PH Time' : 'CST';
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['BEES360 | MONTHLY INCENTIVE SUMMARY'],
            [`${periods[timezone]} · ${timeLabel} · ${viewLabel}`],
            [],
            ['PROCESSOR', 'BATCH', 'GEN EXT', '4-POINT', 'TOTAL CASES', 'EARNED CREDITS', 'QA ACCURACY', 'FINAL TIER', 'INCENTIVE'],
            ...incentiveRows.map((row) => [
                row.processor,
                row.batch ?? '',
                row.generalExterior,
                row.fourPoint,
                row.totalCases,
                row.credits,
                row.qcScore === null ? '' : row.qcScore / 100,
                row.highestTier,
                row.incentive,
            ]),
            [incentiveView === 'overall' ? 'OVERALL TOTAL' : '$300 EARNERS TOTAL', '', 0, 0, 0, 0, '', '', 0],
        ]) as WorkSheet;
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
            alignment: { vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, color: { rgb: '4A3821' } },
            fill: { fgColor: { rgb: 'FFFFFF' } },
            border: { bottom: { style: 'thin', color: { rgb: 'F0E5D4' } } },
        };
        const alternateStyle = { ...bodyStyle, fill: { fgColor: { rgb: 'FFF8E8' } } };
        const totalStyle = {
            alignment: { horizontal: 'center', vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '5A3900' } },
            fill: { fgColor: { rgb: 'FFF0C5' } },
            border: { top: { style: 'medium', color: { rgb: '4A351D' } } },
        };

        for (let row = 1; row <= totalRow; row += 1) {
            for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
                const address = `${column}${row}`;
                worksheet[address] ??= { t: 's', v: '' };
                worksheet[address].s = { ...bodyStyle, fill: { fgColor: { rgb: 'FFFFFF' } } };
            }
        }

        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
            { s: { r: totalRow - 1, c: 0 }, e: { r: totalRow - 1, c: 1 } },
        ];
        worksheet['!cols'] = [{ wch: 31 }, { wch: 11 }, { wch: 13 }, { wch: 13 }, { wch: 15 }, { wch: 18 }, { wch: 17 }, { wch: 15 }, { wch: 15 }];
        worksheet['!rows'] = [{ hpt: 27 }, { hpt: 20 }, { hpt: 8 }, { hpt: 28 }];
        worksheet.A1.s = titleStyle;
        worksheet.A2.s = subtitleStyle;

        for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) worksheet[`${column}${headerRow}`].s = headerStyle;
        worksheet[`I${headerRow}`].s = { ...headerStyle, fill: { fgColor: { rgb: '2F2112' } } };

        incentiveRows.forEach((row, index) => {
            const rowNumber = firstDataRow + index;
            const rowStyle = index % 2 === 0 ? bodyStyle : alternateStyle;
            const fill = index % 2 === 0 ? 'FFFFFF' : 'FFF8E8';

            worksheet[`A${rowNumber}`].s = rowStyle;
            for (const column of ['B', 'C', 'D', 'E', 'F', 'G', 'H']) {
                worksheet[`${column}${rowNumber}`].s = { ...rowStyle, alignment: { horizontal: 'center', vertical: 'center' } };
            }
            worksheet[`E${rowNumber}`] = { f: `C${rowNumber}+D${rowNumber}`, v: row.totalCases, t: 'n', s: worksheet[`E${rowNumber}`].s };
            worksheet[`F${rowNumber}`] = {
                f: `C${rowNumber}+(D${rowNumber}*1.25)`,
                v: row.credits,
                t: 'n',
                s: { ...worksheet[`F${rowNumber}`].s, numFmt: '#,##0.00' },
            };
            worksheet[`G${rowNumber}`].s = { ...worksheet[`G${rowNumber}`].s, numFmt: '0.00%' };
            worksheet[`I${rowNumber}`].s = {
                ...rowStyle,
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: row.incentive === 300 ? 'FFFFFF' : '694400' } },
                fill: { fgColor: { rgb: row.incentive === 300 ? 'D99000' : fill } },
                numFmt: '$#,##0.00',
            };
        });

        for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) worksheet[`${column}${totalRow}`].s = totalStyle;
        worksheet[`C${totalRow}`] = { f: `SUM(C${firstDataRow}:C${totalRow - 1})`, v: incentiveTotals.generalExterior, t: 'n', s: totalStyle };
        worksheet[`D${totalRow}`] = { f: `SUM(D${firstDataRow}:D${totalRow - 1})`, v: incentiveTotals.fourPoint, t: 'n', s: totalStyle };
        worksheet[`E${totalRow}`] = { f: `SUM(E${firstDataRow}:E${totalRow - 1})`, v: incentiveTotals.totalCases, t: 'n', s: totalStyle };
        worksheet[`F${totalRow}`] = {
            f: `SUM(F${firstDataRow}:F${totalRow - 1})`,
            v: incentiveTotals.credits,
            t: 'n',
            s: { ...totalStyle, numFmt: '#,##0.00' },
        };
        worksheet[`I${totalRow}`] = {
            f: `SUM(I${firstDataRow}:I${totalRow - 1})`,
            v: incentiveTotals.payout,
            t: 'n',
            s: { ...totalStyle, fill: { fgColor: { rgb: 'F2CF72' } }, numFmt: '$#,##0.00' },
        };

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Incentives');
        XLSX.writeFile(workbook, `Bees360_Monthly_Incentives_${selectedQaMonth}_${timezone.toUpperCase()}_${incentiveView}.xlsx`, {
            compression: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Processor performance" />
            <div data-tour="processors-page" className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl bg-[#fffaf1] p-4 sm:p-6">
                <Dialog open={successOpen} onOpenChange={() => undefined}>
                    <DialogContent
                        showCloseButton={false}
                        onEscapeKeyDown={(e) => e.preventDefault()}
                        onPointerDownOutside={(e) => e.preventDefault()}
                        className="border-[#e5ce9f] bg-[#fffdf8] sm:max-w-md"
                    >
                        <DialogHeader className="items-center text-center">
                            <span className="grid size-16 place-items-center rounded-full bg-[#e6f3df] text-[#347846]">
                                <CheckCircle2 className="size-9" />
                            </span>
                            <DialogTitle className="text-2xl text-[#342615]">
                                {page.props.flash?.qaImportSummary ? 'QA scores uploaded' : 'CST data uploaded'}
                            </DialogTitle>
                            <DialogDescription>
                                {page.props.flash?.qaImportSummary
                                    ? `${page.props.flash.qaImportSummary.created} new score(s) saved and ${page.props.flash.qaImportSummary.updated} existing score(s) updated. ${page.props.flash.qaImportSummary.matched} linked to processor accounts.`
                                    : `${page.props.flash?.cstImportSummary?.saved ?? 0} processor record(s) were saved successfully.`}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                onClick={() => setSuccessOpen(false)}
                                className="h-12 w-full bg-[#b96c00] text-base font-bold text-white hover:bg-[#925400]"
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={qaOpen} onOpenChange={() => undefined}>
                    <DialogContent
                        showCloseButton={false}
                        onEscapeKeyDown={(e) => e.preventDefault()}
                        onPointerDownOutside={(e) => e.preventDefault()}
                        className="border-[#e5ce9f] bg-[#fffdf8] sm:max-w-xl"
                    >
                        <button
                            type="button"
                            onClick={() => !qaUploading && setQaOpen(false)}
                            className="absolute top-4 right-4 grid size-10 place-items-center rounded-xl border border-[#e1c896] bg-white text-[#805a22] hover:bg-[#fff0c9]"
                            aria-label="Close QA uploader"
                        >
                            <X className="size-5" />
                        </button>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-2xl text-[#342615]">
                                <span className="grid size-11 place-items-center rounded-xl bg-[#fff0c9] text-[#a96300]">
                                    <ShieldCheck className="size-5" />
                                </span>
                                Upload QA scores
                            </DialogTitle>
                            <DialogDescription>
                                Scores are appended to the database and matched using the processor’s full name or N-name, such as Chris.
                            </DialogDescription>
                        </DialogHeader>
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnter={() => setQaDragging(true)}
                            onDragLeave={() => setQaDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setQaDragging(false);
                                chooseQaFile(e.dataTransfer.files[0]);
                            }}
                            onClick={() => !qaUploading && qaFileRef.current?.click()}
                            className={`grid min-h-48 cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition ${qaDragging ? 'border-[#147a51] bg-[#e9f7ef]' : 'border-[#dfc58f] bg-white hover:bg-[#fff8e9]'}`}
                        >
                            <input
                                ref={qaFileRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="sr-only"
                                onChange={(e) => chooseQaFile(e.target.files?.[0])}
                            />
                            <div>
                                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e4f3df] text-[#237148]">
                                    {qaUploading ? <LoaderCircle className="size-7 animate-spin" /> : <UploadCloud className="size-7" />}
                                </span>
                                <p className="mt-4 font-extrabold text-[#342615]">{qaFile?.name ?? 'Drop QA Excel file here'}</p>
                                <p className="mt-1 text-sm text-[#806f59]">
                                    Reads QC Score or Total Score, Approval or Submission Date, and Error through Error20 from your QA file.
                                </p>
                            </div>
                        </div>
                        {(qaUploading || qaProgress > 0) && (
                            <div>
                                <div className="flex justify-between text-xs font-bold text-[#806f59]">
                                    <span>Uploading QA history</span>
                                    <span>{qaProgress}%</span>
                                </div>
                                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f0e1c8]">
                                    <div
                                        className="h-full rounded-full bg-[#19865a] transition-all duration-700"
                                        style={{ width: `${qaProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        {qaError && <p className="text-sm font-semibold text-[#a04435]">{qaError}</p>}
                        <DialogFooter>
                            <Button
                                type="button"
                                disabled={qaUploading}
                                onClick={() => setQaOpen(false)}
                                className="h-12 border border-[#dac7a7] bg-white px-8 font-bold text-[#654d2e] hover:bg-[#fff5df]"
                            >
                                Close
                            </Button>
                            <Button
                                type="button"
                                disabled={!qaFile || qaUploading}
                                onClick={() => void uploadQa()}
                                className="h-12 bg-[#147a51] px-8 font-bold text-white hover:bg-[#0d5e3d] hover:text-white"
                            >
                                <UploadCloud className="size-4" />
                                Upload QA scores
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={feedbackScope !== null} onOpenChange={(open) => !open && setFeedbackScope(null)}>
                    <DialogContent className="max-h-[88vh] overflow-hidden border-[#e5ce9f] bg-[#fffdf8] sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-2xl text-[#342615]">
                                <span className="grid size-11 place-items-center rounded-xl bg-[#fff0c9] text-[#a96300]">
                                    <Eye className="size-5" />
                                </span>
                                {feedbackScope === 'all' ? 'Overall processor feedback' : 'Daily QA feedback'}
                            </DialogTitle>
                            <DialogDescription>
                                {processor || 'Selected processor'} ·{' '}
                                {feedbackScope === 'all'
                                    ? qaRange === 'all'
                                        ? 'All QA months'
                                        : formatQaMonth(selectedQaMonth)
                                    : feedbackScope
                                      ? formatQaDay(feedbackScope)
                                      : ''}{' '}
                                · {feedbackRows.length} assessment(s)
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-[#eadbc6] bg-white p-3 text-center">
                                <p className="text-xs font-bold text-[#806f59]">Assessments</p>
                                <p className="mt-1 text-2xl font-black text-[#342615]">{feedbackRows.length}</p>
                            </div>
                            <div className="rounded-xl border border-[#eadbc6] bg-white p-3 text-center">
                                <p className="text-xs font-bold text-[#806f59]">Total errors</p>
                                <p className="mt-1 text-2xl font-black text-[#b96c00]">{feedbackErrors}</p>
                            </div>
                            <div className="col-span-2 rounded-xl border border-[#bcd9c8] bg-[#f3faef] p-3 text-center sm:col-span-1">
                                <p className="text-xs font-bold text-[#51705e]">{feedbackScope === 'all' ? 'Overall accuracy' : 'Daily accuracy'}</p>
                                <p className="mt-1 text-2xl font-black text-[#147a51]">
                                    {feedbackRows.length
                                        ? `${Number((feedbackRows.reduce((total, row) => total + row.score, 0) / feedbackRows.length).toFixed(2))}%`
                                        : 'No data'}
                                </p>
                            </div>
                        </div>

                        <div className="grid max-h-[52vh] gap-3 overflow-y-auto pr-1">
                            {feedbackRows.map((row) => {
                                const errors = row.feedback.filter((feedback) => !normalize(feedback).includes('noerror'));

                                return (
                                    <article key={row.id} className="rounded-2xl border border-[#eadbc6] bg-white p-4 shadow-sm">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-black text-[#342615]">Project {row.projectId || 'Not provided'}</p>
                                                <p className="mt-1 text-xs font-semibold text-[#806f59]">
                                                    {feedbackScope === 'all' ? `${formatQaDay(row.date)} · ` : ''}Reviewed by{' '}
                                                    {row.qcName || 'QA reviewer'}
                                                </p>
                                            </div>
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-black ${row.score >= 90 ? 'bg-[#e4f3df] text-[#347846]' : 'bg-[#fbe4df] text-[#a04435]'}`}
                                            >
                                                {row.score}% score
                                            </span>
                                        </div>
                                        {errors.length ? (
                                            <div className="mt-3 grid gap-2">
                                                {errors.map((feedback, index) => (
                                                    <div
                                                        key={`${row.id}-${index}`}
                                                        className="flex items-start gap-3 rounded-xl border border-[#f0dfc1] bg-[#fffaf1] p-3"
                                                    >
                                                        <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#ffe5b0] text-[10px] font-black text-[#935b00]">
                                                            {index + 1}
                                                        </span>
                                                        <p className="text-sm leading-5 font-semibold text-[#594a37]">{feedback}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-3 rounded-xl bg-[#eef7ef] p-3 text-sm font-bold text-[#347846]">
                                                No error feedback was recorded for this assessment.
                                            </p>
                                        )}
                                    </article>
                                );
                            })}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                onClick={() => setFeedbackScope(null)}
                                className="h-11 bg-[#c97900] px-7 font-bold text-white hover:bg-[#a96000] hover:text-white"
                            >
                                Close feedback view
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Performance & incentives</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">Processor performance</h1>
                        <p className="mt-2 text-sm text-[#776a57]">Credits: General Exterior × 1 + 4-Point × 1.25.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            onClick={() => setQaOpen(true)}
                            className="h-12 bg-[#147a51] px-4 font-bold text-white hover:bg-[#0d5e3d] hover:text-white"
                        >
                            <ShieldCheck className="size-4" />
                            Upload QA
                        </Button>
                        <div className="inline-flex gap-1 rounded-xl bg-[#f7eddd] p-1">
                            {(['ph', 'cst'] as Timezone[]).map((zone) => (
                                <button
                                    key={zone}
                                    onClick={() => setTimezone(zone)}
                                    className={`flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-bold transition ${timezone === zone ? 'bg-[#b96c00] text-white shadow' : 'text-[#765b35] hover:bg-[#fff2d2]'}`}
                                >
                                    <Clock3 className="size-4" />
                                    {zone === 'ph' ? 'PH Time' : 'CST'}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="w-full">
                    <div className="w-full rounded-2xl border border-[#ead4ad] bg-gradient-to-r from-[#fffdf8] to-[#fff7e7] p-4 shadow-[0_8px_30px_rgba(88,57,18,0.06)] sm:p-5 lg:p-6">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_minmax(260px,1fr)_auto] xl:items-end">
                            <div>
                                <label htmlFor="performance-processor" className="mb-2 block text-sm font-bold text-[#594324]">
                                    Select processor name
                                </label>
                                <ProcessorSelect
                                    id="performance-processor"
                                    value={processor}
                                    processorNames={names}
                                    processorAliases={processorAliases}
                                    onValueChange={setProcessor}
                                    includeAll={false}
                                    allowClear
                                />
                            </div>
                            <label htmlFor="processor-reporting-month" className="grid gap-2 text-sm font-bold text-[#594324]">
                                Reporting month
                                <span className="relative block">
                                    {applyingMonth ? (
                                        <LoaderCircle className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-[#b96c00]" />
                                    ) : (
                                        <CalendarRange className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#b96c00]" />
                                    )}
                                    <select
                                        id="processor-reporting-month"
                                        value={selectedQaMonth}
                                        disabled={applyingMonth}
                                        onChange={(event) => applyProcessorMonth(event.target.value)}
                                        className="h-12 w-full appearance-none rounded-xl border border-[#dfc58f] bg-white pr-9 pl-10 text-sm font-bold text-[#4b3820] shadow-[0_4px_14px_rgba(88,57,18,0.06)] outline-none focus:border-[#b96c00] focus:ring-2 focus:ring-[#f3cf81]/60"
                                    >
                                        {qaMonths.map((month) => (
                                            <option key={month} value={month}>
                                                {formatQaMonth(month)}
                                                {month === phCurrentMonth ? ' · Current PH month' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-[#b96c00]">▼</span>
                                </span>
                            </label>
                            <div className="flex min-h-12 items-center gap-2 rounded-xl border border-[#ead4ad] bg-white/80 px-4 text-xs font-semibold text-[#947650] sm:col-span-2 xl:col-span-1">
                                <Clock3 className="size-4 shrink-0 text-[#b96c00]" />
                                <span className="leading-5">
                                    {timezone === 'ph' ? 'Philippine' : 'Central'} time
                                    <span className="mx-1 text-[#c99747]">·</span>
                                    {periods[timezone]}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {processor && !selected ? (
                    <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-[#dfc58f] bg-[#fffdf8] p-8 text-center">
                        <div>
                            <FileSpreadsheet className="mx-auto size-10 text-[#c17b12]" />
                            <h2 className="mt-4 text-xl font-bold text-[#342615]">No {timezone.toUpperCase()} processor data yet</h2>
                            <p className="mt-2 text-sm text-[#806f59]">
                                {timezone === 'cst'
                                    ? 'No CST report data is available for this processor and reporting month.'
                                    : 'Import daily reports first to calculate PH performance.'}
                            </p>
                        </div>
                    </section>
                ) : processor && selected ? (
                    <>
                        <section className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {statCards.map(([label, value, Icon, tone]) => (
                                <article
                                    key={label}
                                    className="group relative h-full w-full overflow-hidden rounded-2xl border border-[#eadbc6] bg-gradient-to-br from-[#fffdf8] to-[#fff8eb] p-5 shadow-[0_8px_30px_rgba(88,57,18,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(88,57,18,0.1)]"
                                >
                                    <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                                        <Icon className="size-5" />
                                    </span>
                                    <p className="mt-4 text-sm text-[#806f59]">{label}</p>
                                    <p className="mt-1 text-2xl font-extrabold text-[#342615]">{value}</p>
                                    <span className="absolute -right-8 -bottom-8 size-24 rounded-full bg-[#f3d99f]/20 transition-transform duration-500 group-hover:scale-125" />
                                </article>
                            ))}
                            <QaAccuracyGauge
                                key={`${selected.processor}-${selectedQaMonth}-${qaAccuracy.score}-${qaAccuracy.reviews}`}
                                score={qaAccuracy.score}
                                reviews={qaAccuracy.reviews}
                                period={qaAccuracy.period}
                            />
                        </section>
                        <section className="grid gap-5 lg:grid-cols-[1.1fr_1.9fr]">
                            <article className="relative overflow-hidden rounded-2xl bg-[#4d2f12] p-6 text-white shadow-[0_16px_36px_rgba(77,47,18,0.2)]">
                                <div className="absolute -top-16 -right-12 size-48 rounded-full bg-[#f0a91e]/25" />
                                <p className="text-sm font-bold text-[#f7d994]">TOTAL EARNED CREDITS</p>
                                <p className="mt-1 text-xs font-semibold text-[#ead8be]">Monthly tier progress · {periods[timezone]}</p>
                                <p className="mt-3 text-5xl font-black">{selected.credits.toLocaleString()}</p>
                                <p className="mt-2 text-sm text-[#ead8be]">
                                    {selected.generalExterior} × 1 + {selected.fourPoint} × 1.25
                                </p>
                                <div className="mt-7 flex items-center justify-between rounded-xl bg-white/10 p-4">
                                    <span>
                                        <span className="block text-xs text-[#ead8be]">Current incentive</span>
                                        <span className="text-3xl font-black text-[#ffc83d]">${selected.incentive}</span>
                                    </span>
                                    <WalletCards className="size-9 text-[#ffc83d]" />
                                </div>
                            </article>
                            <div className="grid gap-4 md:grid-cols-3">
                                {selected.tiers.map((tier) => (
                                    <TierProgressGauge key={tier.name} tier={tier} period={periods[timezone]} />
                                ))}
                            </div>
                        </section>
                    </>
                ) : null}

                {!processor && (
                    <section className="overflow-hidden rounded-2xl border border-[#e5ce9f] bg-[#fffdf8] shadow-[0_10px_34px_rgba(88,57,18,0.08)]">
                        <div className="flex flex-col justify-between gap-4 border-b border-[#eadbc6] bg-gradient-to-r from-[#fff8e8] to-[#fffdf8] px-5 py-5 lg:flex-row lg:items-end">
                            <div>
                                <p className="text-xs font-extrabold tracking-[0.16em] text-[#b26a00] uppercase">Incentive overview</p>
                                <h2 className="mt-1 text-2xl font-black text-[#342615]">Monthly incentive summary</h2>
                                <p className="mt-1 text-sm text-[#806f59]">
                                    {periods[timezone]} · {timezone === 'ph' ? 'PH Time' : 'CST'} · {tierThreeEarners} processor
                                    {tierThreeEarners === 1 ? '' : 's'} earned $300
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 self-start">
                                <div className="inline-flex gap-1 rounded-xl bg-[#f7eddd] p-1">
                                    <button
                                        type="button"
                                        onClick={() => setIncentiveView('overall')}
                                        className={`h-10 rounded-lg px-4 text-sm font-extrabold transition ${incentiveView === 'overall' ? 'bg-[#c97900] text-white shadow-sm hover:bg-[#a96000] hover:text-white' : 'text-[#765b35] hover:bg-[#fff2d2] hover:text-[#4a351d]'}`}
                                    >
                                        Overall
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIncentiveView('tier3')}
                                        className={`h-10 rounded-lg px-4 text-sm font-extrabold transition ${incentiveView === 'tier3' ? 'bg-[#c97900] text-white shadow-sm hover:bg-[#a96000] hover:text-white' : 'text-[#936000] hover:bg-[#fff2d2] hover:text-[#4a351d]'}`}
                                    >
                                        $300 Earners
                                    </button>
                                </div>
                                <Button
                                    type="button"
                                    disabled={incentiveRows.length === 0}
                                    onClick={exportMonthlyIncentives}
                                    className="h-12 gap-2 rounded-xl bg-[#b96c00] px-5 font-extrabold text-white shadow-[0_6px_18px_rgba(185,108,0,0.22)] hover:bg-[#925400] disabled:bg-[#d4c2a5]"
                                >
                                    <Download className="size-4" />
                                    Export Excel
                                </Button>
                            </div>
                        </div>

                        {incentiveRows.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1100px] text-left text-sm">
                                    <thead className="bg-[#3b2915] text-[11px] tracking-wide text-[#fff8e7] uppercase">
                                        <tr>
                                            <th className="px-4 py-4">Processor</th>
                                            <th className="px-4 py-4 text-center">Batch</th>
                                            <th className="px-4 py-4 text-center">Gen Ext</th>
                                            <th className="px-4 py-4 text-center">4-Point</th>
                                            <th className="px-4 py-4 text-center">Total cases</th>
                                            <th className="px-4 py-4 text-center">Earned credits</th>
                                            <th className="px-4 py-4 text-center">Accuracy</th>
                                            <th className="px-4 py-4 text-center">Final tier</th>
                                            <th className="bg-[#2f2112] px-4 py-4 text-center">Incentive</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee2d0]">
                                        {incentiveRows.map((row) => (
                                            <tr key={`${timezone}-${row.processor}`} className="odd:bg-white even:bg-[#fff8e8]">
                                                <td className="px-4 py-3.5 font-extrabold text-[#3f2e18]">{row.processor}</td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className="inline-flex rounded-full bg-[#f2eadf] px-2.5 py-1 text-xs font-black text-[#684b29]">
                                                        Batch {row.batch ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center font-bold text-[#594a37]">{row.generalExterior}</td>
                                                <td className="px-4 py-3.5 text-center font-bold text-[#594a37]">{row.fourPoint}</td>
                                                <td className="px-4 py-3.5 text-center font-black text-[#342615]">{row.totalCases}</td>
                                                <td className="px-4 py-3.5 text-center font-black text-[#9b5d00]">{row.credits.toLocaleString()}</td>
                                                <td className="px-4 py-3.5 text-center font-bold text-[#147a51]">
                                                    {row.qcScore === null ? 'No QA' : `${row.qcScore}%`}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${row.incentive === 300 ? 'bg-[#fff0b8] text-[#8b5700]' : row.incentive > 0 ? 'bg-[#e4f3df] text-[#347846]' : 'bg-[#eeeae4] text-[#786b5b]'}`}
                                                    >
                                                        {row.highestTier}
                                                    </span>
                                                </td>
                                                <td className="bg-[#fff3d3] px-4 py-3.5 text-center">
                                                    <span
                                                        className={`inline-flex min-w-20 justify-center rounded-lg px-3 py-2 font-black ${row.incentive === 300 ? 'bg-[#d99000] text-white shadow-sm' : 'text-[#795000]'}`}
                                                    >
                                                        ${row.incentive.toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="border-t-[3px] border-[#4d2f12] bg-[#fff0c9] font-black text-[#4d351b]">
                                        <tr>
                                            <td colSpan={2} className="px-4 py-4 text-center uppercase">
                                                {incentiveView === 'overall' ? 'Overall total' : '$300 earners total'}
                                            </td>
                                            <td className="px-4 py-4 text-center">{incentiveTotals.generalExterior}</td>
                                            <td className="px-4 py-4 text-center">{incentiveTotals.fourPoint}</td>
                                            <td className="px-4 py-4 text-center">{incentiveTotals.totalCases}</td>
                                            <td className="px-4 py-4 text-center">{incentiveTotals.credits.toLocaleString()}</td>
                                            <td colSpan={2} />
                                            <td className="bg-[#f2cf72] px-4 py-4 text-center text-base">${incentiveTotals.payout.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <div className="grid min-h-48 place-items-center px-6 py-10 text-center">
                                <div>
                                    <Award className="mx-auto size-11 text-[#d49a28]" />
                                    <p className="mt-3 font-extrabold text-[#342615]">No $300 earners for {periods[timezone]}</p>
                                    <p className="mt-1 text-sm text-[#806f59]">Processors will appear here when they reach 750 monthly credits.</p>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {processor && (
                    <section className="grid gap-5 rounded-2xl border border-[#cce0d5] bg-[#f9fdf9] p-5 shadow-[0_10px_34px_rgba(20,122,81,0.08)]">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                            <div>
                                <p className="text-xs font-extrabold tracking-[0.16em] text-[#147a51] uppercase">Quality history</p>
                                <h2 className="mt-1 text-2xl font-black text-[#342615]">QA results and recurring feedback</h2>
                                <p className="mt-1 text-sm text-[#71624e]">
                                    {processor || 'Select a processor'} ·{' '}
                                    {qaRange === 'all' ? 'All QA months' : `${formatQaDay(qaFilterStart)} – ${formatQaDay(qaFilterEnd)}`} ·{' '}
                                    {visibleQaHistory.length} assessment(s)
                                </p>
                                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#147a51]">
                                    <Clock3 className="size-3.5" />
                                    Live PH time · {formatPhilippinesDateTime(phNow)}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-end gap-2 self-start">
                                <div className="inline-flex gap-1 rounded-xl bg-[#edf5ed] p-1">
                                    <button
                                        type="button"
                                        onClick={() => setQaRange('month')}
                                        className={`flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold ${qaRange === 'month' ? 'bg-[#147a51] text-white' : 'text-[#37624e]'}`}
                                    >
                                        <CalendarRange className="size-4" />
                                        Selected dates
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setQaRange('all')}
                                        className={`flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold ${qaRange === 'all' ? 'bg-[#147a51] text-white' : 'text-[#37624e]'}`}
                                    >
                                        <History className="size-4" />
                                        Start to latest
                                    </button>
                                </div>
                                <Button
                                    type="button"
                                    disabled={visibleQaHistory.length === 0}
                                    onClick={() => setFeedbackScope('all')}
                                    className="h-11 bg-[#c97900] px-4 font-bold text-white hover:bg-[#a96000] hover:text-white"
                                >
                                    <Eye className="size-4" />
                                    View all feedback
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
                            <article className="rounded-2xl border border-[#d8e8df] bg-white p-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-extrabold text-[#342615]">Overall feedback</h3>
                                    <AlertTriangle className="size-5 text-[#d88a0c]" />
                                </div>
                                <p className="mt-1 text-xs text-[#806f59]">Repeated feedback remains counted to reveal frequent errors.</p>
                                <div className="mt-4 grid max-h-96 gap-2 overflow-y-auto pr-1">
                                    {feedbackSummary.slice(0, 20).map(([feedback, count], index) => (
                                        <div key={`${feedback}-${index}`} className="rounded-xl border border-[#eee2cf] bg-[#fffaf1] p-3">
                                            <div className="flex items-start gap-3">
                                                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#ffe5b0] text-xs font-black text-[#935b00]">
                                                    {count}×
                                                </span>
                                                <p className="text-xs leading-5 font-semibold text-[#594a37]">{feedback}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {feedbackSummary.length === 0 && (
                                        <p className="rounded-xl bg-[#eef7ef] p-4 text-sm font-semibold text-[#347846]">
                                            {visibleQaHistory.length === 0
                                                ? qaRange === 'all'
                                                    ? 'There is no QA feedback data for this processor.'
                                                    : `There is no QA feedback data for ${formatQaMonth(selectedQaMonth)}.`
                                                : 'No error feedback was recorded for this selection.'}
                                        </p>
                                    )}
                                </div>
                            </article>
                            <article className="overflow-hidden rounded-2xl border border-[#d8e8df] bg-white">
                                <div className="border-b border-[#e1ece5] px-5 py-4">
                                    <h3 className="font-extrabold text-[#342615]">Assessment records</h3>
                                    <p className="mt-1 text-xs text-[#806f59]">Total Score is used as the QA score.</p>
                                </div>
                                <div className="max-h-[470px] overflow-auto">
                                    <table className="w-full min-w-[680px] text-left text-sm">
                                        <thead className="sticky top-0 bg-[#edf7f1] text-xs tracking-wide text-[#37624e] uppercase">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Project</th>
                                                <th className="px-4 py-3">Processor</th>
                                                <th className="px-4 py-3">QC</th>
                                                <th className="px-4 py-3 text-center">Score</th>
                                                <th className="px-4 py-3 text-center">Errors</th>
                                                <th className="px-4 py-3 text-center">Feedback</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#edf0ec]">
                                            {visibleQaHistory.map((row) => (
                                                <tr key={row.id} className="hover:bg-[#fbfdfb]">
                                                    <td className="px-4 py-3 whitespace-nowrap text-[#6d5e49]">{row.date}</td>
                                                    <td className="px-4 py-3 font-bold text-[#493821]">{row.projectId || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-bold text-[#342615]">{row.processor}</span>
                                                        {row.nickname && <span className="block text-xs text-[#8a7962]">N-name: {row.nickname}</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-[#6d5e49]">{row.qcName || '—'}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span
                                                            className={`rounded-full px-3 py-1 text-xs font-black ${row.score >= 90 ? 'bg-[#e4f3df] text-[#347846]' : 'bg-[#fbe4df] text-[#a04435]'}`}
                                                        >
                                                            {row.score}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-[#a05e09]">
                                                        {row.feedback.filter((item) => !normalize(item).includes('noerror')).length}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFeedbackScope(row.date)}
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dfc58f] bg-[#fff8e8] px-3 text-xs font-extrabold text-[#8a5708] transition hover:border-[#b96c00] hover:bg-[#ffedbd]"
                                                        >
                                                            <Eye className="size-3.5" />
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {visibleQaHistory.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-5 py-12 text-center text-[#806f59]">
                                                        {qaRange === 'all'
                                                            ? 'There is no QA data for this processor.'
                                                            : `There is no QA data for this processor in ${formatQaMonth(selectedQaMonth)}.`}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </article>
                        </div>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
