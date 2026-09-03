import { ProcessorSelect } from '@/components/processor-select';
import { BeesDatePicker } from '@/components/bees-date-picker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Award,
    CalendarRange,
    CheckCircle2,
    Clock3,
    FileSpreadsheet,
    Gauge,
    History,
    LoaderCircle,
    ShieldCheck,
    UploadCloud,
    WalletCards,
    X,
} from 'lucide-react';
import { DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';

type Tier = { name: string; target: number; incentive: number; achieved: boolean; needed: number; percentage: number };
type Performance = {
    processor: string;
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
    qaHistory: QaHistoryRow[];
    periods: { ph: string; cst: string; qa: string | null };
    filters: { startDate: string; endDate: string; latestQaStart: string | null; latestQaEnd: string | null };
};
type Timezone = 'ph' | 'cst';
type ImportMetric = {
    report_date: string;
    processor_name: string;
    general_exterior: number;
    four_point: number;
    qc_score: number | null;
    qc_reviews: number;
};
type QaAssessment = {
    assessment_date: string;
    processor_name: string;
    score: number;
    project_id: string;
    qc_name: string;
    report_url: string;
    feedback: string[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations dashboard', href: '/dashboard' },
    { title: 'Processors', href: '/operations/processors' },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const valueFor = (row: Record<string, unknown>, aliases: string[]) => {
    const keys = Object.keys(row);
    const key = keys.find((candidate) => aliases.includes(normalize(candidate)));
    return key ? row[key] : undefined;
};
const integer = (value: unknown) => Math.max(0, Math.round(Number(String(value ?? 0).replace(/,/g, '')) || 0));
const dateValue = (value: unknown) => {
    if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
    const parsed = new Date(String(value ?? ''));
    return Number.isNaN(parsed.valueOf()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
};

async function metricsFromWorkbook(file: File): Promise<ImportMetric[]> {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('The workbook does not contain a worksheet.');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (rows.length === 0) throw new Error('The worksheet does not contain data.');

    const grouped = new Map<string, { date: string; name: string; ge: number; fp: number; score: number; reviews: number }>();
    rows.forEach((row) => {
        const processor = String(valueFor(row, ['processor', 'processorname', 'name', 'nname', 'firstassembledby', 'assembledby']) ?? '').trim();
        if (!processor) return;
        const date = dateValue(valueFor(row, ['reportdate', 'date', 'assembleddate', 'firstassembledtime']));
        const key = `${date}|${processor.toLowerCase()}`;
        const current = grouped.get(key) ?? { date, name: processor, ge: 0, fp: 0, score: 0, reviews: 0 };
        const summaryGe = valueFor(row, ['generalexterior', 'genexterior', 'genext', 'ge']);
        const summaryFp = valueFor(row, ['4point', 'fourpoint', 'gen4point', 'fp']);
        if (summaryGe !== undefined || summaryFp !== undefined) {
            current.ge += integer(summaryGe);
            current.fp += integer(summaryFp);
        } else {
            const inspection = String(valueFor(row, ['inspectiontype', 'reporttype', 'type']) ?? '').toLowerCase();
            if (inspection.includes('exterior')) current.ge += 1;
            if (inspection.includes('4-point') || inspection.includes('4 point') || inspection.includes('four point')) current.fp += 1;
        }
        const rawScore = valueFor(row, ['qcscore', 'accuracyscore', 'accuracy', 'qualityscore', 'score']);
        if (rawScore !== undefined && String(rawScore).trim() !== '') {
            let score = Number(String(rawScore).replace('%', '').trim());
            if (Number.isFinite(score)) {
                if (score <= 1) score *= 100;
                current.score += Math.min(Math.max(score, 0), 100);
                current.reviews += 1;
            }
        }
        grouped.set(key, current);
    });

    const metrics = [...grouped.values()].map((item) => ({
        report_date: item.date,
        processor_name: item.name,
        general_exterior: item.ge,
        four_point: item.fp,
        qc_score: item.reviews ? Number((item.score / item.reviews).toFixed(2)) : null,
        qc_reviews: item.reviews,
    }));
    if (metrics.length === 0) throw new Error('No processor names were found. Add a Processor or Processor Name column.');
    return metrics;
}

async function qaFromWorkbook(file: File): Promise<QaAssessment[]> {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('The QA workbook does not contain a worksheet.');
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    const headerIndex = rawRows.findIndex((row) => row.some((cell) => normalize(String(cell)) === 'totalscore'));
    if (headerIndex < 0) throw new Error('The QA file must contain a Total Score column.');
    const headers = rawRows[headerIndex].map((cell) => String(cell));
    const rows = rawRows.slice(headerIndex + 1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
    const assessments = rows.flatMap((row) => {
        const processorName = String(valueFor(row, ['processor', 'processorname', 'name', 'nname', 'nickname']) ?? '').trim();
        const scoreValue = valueFor(row, ['totalscore', 'qcscore', 'qascore', 'accuracyscore', 'accuracy', 'qualityscore', 'score']);
        if (!processorName || scoreValue === undefined || String(scoreValue).trim() === '') return [];
        let score = Number(String(scoreValue).replace('%', '').trim());
        if (!Number.isFinite(score)) return [];
        if (score <= 1) score *= 100;
        if (score < 0 || score > 100) return [];
        const feedback = Object.entries(row)
            .filter(([header, value]) => /^error\d*$/.test(normalize(header)) && String(value).trim() !== '')
            .map(([, value]) => String(value).trim());
        return [
            {
                assessment_date: dateValue(valueFor(row, ['submissiondate', 'assessmentdate', 'reportdate', 'qadate', 'date'])),
                processor_name: processorName,
                score: Number(score.toFixed(2)),
                project_id: String(valueFor(row, ['projectid']) ?? '').trim(),
                qc_name: String(valueFor(row, ['qcname', 'reviewer']) ?? '').trim(),
                report_url: String(valueFor(row, ['reporturl', 'url']) ?? '').trim(),
                feedback,
            },
        ];
    });
    if (assessments.length === 0) throw new Error('Add Processor Name and QA Score columns with valid data.');
    return assessments;
}

function QaAccuracyGauge({ score, reviews, period }: { score: number | null; reviews: number; period: string | null }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setProgress(0);
        const frame = requestAnimationFrame(() => setProgress(score ?? 0));

        return () => cancelAnimationFrame(frame);
    }, [score]);

    return (
        <article className="relative overflow-hidden rounded-2xl border border-[#bcd9c8] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgba(20,122,81,0.08)]">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-extrabold text-[#342615]">QA Accuracy</p>
                    <p className="mt-1 text-xs text-[#806f59]">Average Total Score · {period ?? 'No uploads'}</p>
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
                    <p className="text-4xl font-black tracking-tight text-[#342615]">{score === null ? '—' : `${score}%`}</p>
                    <p className="text-[10px] font-bold tracking-[0.12em] text-[#147a51] uppercase">QA accuracy</p>
                </div>
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-[#806f59]">
                {reviews > 0 ? `Average from ${reviews} QA assessment${reviews === 1 ? '' : 's'}` : 'Upload QA results to calculate the average'}
            </p>
        </article>
    );
}

function TierProgressGauge({ tier }: { tier: Tier }) {
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

export default function Processors({ phPerformance, cstPerformance, qaHistory, periods, filters }: Props) {
    const page = usePage<{
        flash?: {
            cstImportSummary?: { saved: number; file: string };
            qaImportSummary?: { saved: number; created: number; updated: number; matched: number; unmatched: number };
        };
        errors?: Record<string, string>;
    }>();
    const fileRef = useRef<HTMLInputElement>(null);
    const [timezone, setTimezone] = useState<Timezone>('ph');
    const [processor, setProcessor] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [successOpen, setSuccessOpen] = useState(Boolean(page.props.flash?.cstImportSummary));
    const qaFileRef = useRef<HTMLInputElement>(null);
    const [qaOpen, setQaOpen] = useState(false);
    const [qaFile, setQaFile] = useState<File | null>(null);
    const [qaDragging, setQaDragging] = useState(false);
    const [qaUploading, setQaUploading] = useState(false);
    const [qaProgress, setQaProgress] = useState(0);
    const [qaError, setQaError] = useState<string | null>(null);
    const [qaRange, setQaRange] = useState<'month' | 'all'>('month');
    const [startDate, setStartDate] = useState(filters.startDate);
    const [endDate, setEndDate] = useState(filters.endDate);
    const [applyingDates, setApplyingDates] = useState(false);
    const performances = timezone === 'ph' ? phPerformance : cstPerformance;
    const names = useMemo(() => performances.map((item) => item.processor), [performances]);
    const selected = performances.find((item) => item.processor === processor) ?? null;
    const latestQaMonth = useMemo(
        () =>
            qaHistory
                .map((row) => row.date.slice(0, 7))
                .sort()
                .at(-1) ?? '',
        [qaHistory],
    );
    const visibleQaHistory = useMemo(
        () =>
            qaHistory.filter((row) => {
                const sameProcessor = !processor || row.processor === processor || row.nickname?.toLowerCase() === processor.toLowerCase();
                return sameProcessor && (qaRange === 'all' || row.date.startsWith(latestQaMonth));
            }),
        [processor, qaHistory, qaRange, latestQaMonth],
    );
    const feedbackSummary = useMemo(() => {
        const counts = new Map<string, number>();
        visibleQaHistory
            .flatMap((row) => row.feedback)
            .filter((feedback) => !normalize(feedback).includes('noerror'))
            .forEach((feedback) => counts.set(feedback, (counts.get(feedback) ?? 0) + 1));
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [visibleQaHistory]);

    const applyDateRange = (from = startDate, to = endDate) => {
        const normalizedStart = from <= to ? from : to;
        const normalizedEnd = from <= to ? to : from;
        setStartDate(normalizedStart);
        setEndDate(normalizedEnd);
        router.get('/operations/processors', { start_date: normalizedStart, end_date: normalizedEnd }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            onStart: () => setApplyingDates(true),
            onFinish: () => setApplyingDates(false),
        });
    };

    useEffect(() => {
        if (!names.includes(processor)) setProcessor(names[0] ?? '');
    }, [names, processor]);
    useEffect(() => {
        if (page.props.flash?.cstImportSummary || page.props.flash?.qaImportSummary) setSuccessOpen(true);
    }, [page.props.flash?.cstImportSummary, page.props.flash?.qaImportSummary]);

    const chooseFile = (candidate?: File) => {
        if (!candidate) return;
        if (!/\.xlsx?$/.test(candidate.name.toLowerCase())) {
            setError('Choose an Excel .xlsx or .xls file.');
            return;
        }
        setFile(candidate);
        setError(null);
    };
    const dropFile = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragging(false);
        chooseFile(event.dataTransfer.files[0]);
    };
    const upload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        setProgress(15);
        try {
            const metrics = await metricsFromWorkbook(file);
            setProgress(55);
            router.post(
                '/operations/processors/cst-import',
                { source_file: file.name, metrics },
                {
                    preserveScroll: true,
                    onProgress: (event) => setProgress(Math.max(55, event.percentage ?? 55)),
                    onError: (errors) => {
                        setError(Object.values(errors)[0] ?? 'The CST workbook could not be saved.');
                        setProgress(0);
                    },
                    onSuccess: () => {
                        setProgress(100);
                        setFile(null);
                    },
                    onFinish: () => setUploading(false),
                },
            );
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'The workbook could not be read.');
            setProgress(0);
            setUploading(false);
        }
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
            const assessments = await qaFromWorkbook(qaFile);
            setQaProgress(55);
            router.post(
                '/operations/processors/qa-import',
                { source_file: qaFile.name, assessments },
                {
                    preserveScroll: true,
                    onProgress: (event) => setQaProgress(Math.max(55, event.percentage ?? 55)),
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Processor performance" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl bg-[#fffaf1] p-4 sm:p-6">
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
                                    Reads Total Score, Submission Date and Error through Error20 from your QA file.
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
                                className="h-12 bg-[#147a51] px-8 font-bold text-white hover:bg-[#0d5e3d]"
                            >
                                <UploadCloud className="size-4" />
                                Upload QA scores
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
                            className="h-12 bg-[#147a51] px-4 font-bold text-white hover:bg-[#0d5e3d]"
                        >
                            <ShieldCheck className="size-4" />
                            Upload QA
                        </Button>
                        <div className="inline-flex rounded-xl border border-[#e2c88f] bg-white p-1 shadow-sm">
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

                <section className={`grid gap-4 ${timezone === 'cst' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="w-full rounded-2xl border border-[#ead4ad] bg-gradient-to-r from-[#fffdf8] to-[#fff7e7] p-6 shadow-[0_8px_30px_rgba(88,57,18,0.06)]">
                        <label htmlFor="performance-processor" className="mb-2 block text-sm font-bold text-[#594324]">
                            Select processor name
                        </label>
                        <ProcessorSelect
                            id="performance-processor"
                            value={processor}
                            processorNames={names}
                            onValueChange={setProcessor}
                            includeAll={false}
                        />
                        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#947650]">
                            <Clock3 className="size-3.5" />
                            {timezone === 'ph' ? 'Philippine' : 'Central'} time · {periods[timezone]}
                        </p>
                    </div>
                    {timezone === 'cst' && (
                        <div className="rounded-2xl border border-[#ead4ad] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgba(88,57,18,0.06)]">
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDragEnter={() => setDragging(true)}
                                onDragLeave={() => setDragging(false)}
                                onDrop={dropFile}
                                onClick={() => !uploading && fileRef.current?.click()}
                                className={`flex min-h-28 cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed p-4 transition ${dragging ? 'border-[#b96c00] bg-[#fff0c9]' : 'border-[#dfc58f] bg-white hover:bg-[#fff8e9]'}`}
                            >
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="sr-only"
                                    onChange={(e) => chooseFile(e.target.files?.[0])}
                                />
                                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#fff0c9] text-[#a96300]">
                                    {uploading ? <LoaderCircle className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-bold text-[#3f2e18]">{file?.name ?? 'Drop CST Excel file here'}</p>
                                    <p className="mt-1 text-xs text-[#806f59]">Processor, General Exterior, 4-Point and optional QC Score.</p>
                                </div>
                            </div>
                            {(uploading || progress > 0) && (
                                <div className="mt-3">
                                    <div className="flex justify-between text-xs font-bold text-[#806f59]">
                                        <span>Uploading CST data</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f0e1c8]">
                                        <div className="h-full rounded-full bg-[#d88a0c] transition-all" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            )}
                            {error && <p className="mt-2 text-sm font-semibold text-[#a04435]">{error}</p>}
                            <Button
                                type="button"
                                disabled={!file || uploading}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void upload();
                                }}
                                className="mt-3 h-11 w-full bg-[#b96c00] font-bold text-white hover:bg-[#925400]"
                            >
                                <UploadCloud className="size-4" /> Upload CST workbook
                            </Button>
                        </div>
                    )}
                </section>

                {!selected ? (
                    <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-[#dfc58f] bg-[#fffdf8] p-8 text-center">
                        <div>
                            <FileSpreadsheet className="mx-auto size-10 text-[#c17b12]" />
                            <h2 className="mt-4 text-xl font-bold text-[#342615]">No {timezone.toUpperCase()} processor data yet</h2>
                            <p className="mt-2 text-sm text-[#806f59]">
                                {timezone === 'cst'
                                    ? 'Upload a CST workbook to begin tracking performance.'
                                    : 'Import daily reports first to calculate PH performance.'}
                            </p>
                        </div>
                    </section>
                ) : (
                    <>
                        <section className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {statCards.map(([label, value, Icon, tone]) => (
                                <article
                                    key={label}
                                    className="group relative w-full overflow-hidden rounded-2xl border border-[#eadbc6] bg-gradient-to-br from-[#fffdf8] to-[#fff8eb] p-5 shadow-[0_8px_30px_rgba(88,57,18,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(88,57,18,0.1)]"
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
                                key={`${selected.processor}-${selected.qcScore}-${selected.qcReviews}`}
                                score={selected.qcScore}
                                reviews={selected.qcReviews}
                                period={periods.qa}
                            />
                        </section>
                        <section className="grid gap-5 lg:grid-cols-[1.1fr_1.9fr]">
                            <article className="relative overflow-hidden rounded-2xl bg-[#4d2f12] p-6 text-white shadow-[0_16px_36px_rgba(77,47,18,0.2)]">
                                <div className="absolute -top-16 -right-12 size-48 rounded-full bg-[#f0a91e]/25" />
                                <p className="text-sm font-bold text-[#f7d994]">TOTAL EARNED CREDITS</p>
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
                                    <TierProgressGauge key={tier.name} tier={tier} />
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {
                    <section className="grid gap-5 rounded-2xl border border-[#cce0d5] bg-[#f9fdf9] p-5 shadow-[0_10px_34px_rgba(20,122,81,0.08)]">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                            <div>
                                <p className="text-xs font-extrabold tracking-[0.16em] text-[#147a51] uppercase">Quality history</p>
                                <h2 className="mt-1 text-2xl font-black text-[#342615]">QA results and recurring feedback</h2>
                                <p className="mt-1 text-sm text-[#71624e]">
                                    {processor || 'Select a processor'} · {visibleQaHistory.length} assessment(s)
                                </p>
                            </div>
                            <div className="inline-flex self-start rounded-xl border border-[#bed8ca] bg-white p-1">
                                <button
                                    type="button"
                                    onClick={() => setQaRange('month')}
                                    className={`flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold ${qaRange === 'month' ? 'bg-[#147a51] text-white' : 'text-[#37624e]'}`}
                                >
                                    <CalendarRange className="size-4" />
                                    Latest month
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
                                            No error feedback for this selection.
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
                                                </tr>
                                            ))}
                                            {visibleQaHistory.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-5 py-12 text-center text-[#806f59]">
                                                        No QA results found for this processor and period.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </article>
                        </div>
                    </section>
                }
            </div>
        </AppLayout>
    );
}
