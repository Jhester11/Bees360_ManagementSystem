import { BeesDatePicker } from '@/components/bees-date-picker';
import { ProcessorSelect } from '@/components/processor-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { qaAssessmentsFromWorkbook } from '@/lib/processor-workbook';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    CalendarRange,
    CheckCircle2,
    CircleDotDashed,
    ExternalLink,
    Eye,
    FileSpreadsheet,
    History,
    LoaderCircle,
    Search,
    ShieldCheck,
    UploadCloud,
    UsersRound,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

type QaRow = {
    id: number;
    date: string;
    processor: string;
    nickname: string | null;
    projectId: string | null;
    qcName: string | null;
    score: number;
    reportUrl: string | null;
    feedback: string[];
    sourceFile: string;
};

type QaImportHistory = {
    id: number;
    sourceFile: string;
    processed: number;
    created: number;
    updated: number;
    matched: number;
    unmatched: number;
    uploadedBy: string;
    uploadedAt: string;
};

type Props = {
    rows: QaRow[];
    processorNames: string[];
    filters: { startDate: string; endDate: string; processor: string };
    summary: { assessments: number; averageScore: number | null; processors: number; feedbackItems: number };
    importHistory: QaImportHistory[];
    canImport: boolean;
    phToday: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations dashboard', href: '/dashboard' },
    { title: 'QA & Scores', href: '/operations/quality-assurance' },
];
const formatDate = (date: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const formatDateTime = (date: string) =>
    new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Manila',
        timeZoneName: 'short',
    }).format(new Date(date));

export default function QaScores({ rows, processorNames, filters, summary, importHistory, canImport, phToday }: Props) {
    const page = usePage<{
        flash?: { qaImportSummary?: { saved: number; created: number; updated: number; matched: number; unmatched: number } };
        errors?: Record<string, string>;
    }>();
    const fileRef = useRef<HTMLInputElement>(null);
    const [startDate, setStartDate] = useState(filters.startDate);
    const [endDate, setEndDate] = useState(filters.endDate);
    const [processor, setProcessor] = useState(filters.processor);
    const [applying, setApplying] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<QaRow | null>(null);
    const [successOpen, setSuccessOpen] = useState(Boolean(page.props.flash?.qaImportSummary));
    const averageTone = summary.averageScore === null ? 'text-[#806f59]' : summary.averageScore >= 90 ? 'text-[#147a51]' : 'text-[#a04435]';
    const latestImport = importHistory[0] ?? null;
    const uploadIndicator = uploading
        ? {
              label: 'Uploading now',
              detail: 'Saving the selected QA workbook…',
              tone: 'border-[#d8bd8c] bg-[#fff0c9] text-[#8b5b11]',
              fieldTone: 'border-[#dfb866] bg-[#fff9eb]',
              icon: LoaderCircle,
          }
        : file
          ? {
                label: 'Ready to upload',
                detail: 'A QA file is selected and ready to save.',
                tone: 'border-[#e2bb68] bg-[#fff0c9] text-[#8b5b11]',
                fieldTone: 'border-[#d58a0b] bg-[#fff7df]',
                icon: FileSpreadsheet,
            }
          : latestImport
            ? {
                  label: 'Already uploaded',
                  detail: `Latest: ${latestImport.sourceFile} · ${formatDateTime(latestImport.uploadedAt)}`,
                  tone: 'border-[#add5b5] bg-[#e8f6e8] text-[#28703c]',
                  fieldTone: 'border-[#8fc59b] bg-[#f2fbf1]',
                  icon: CheckCircle2,
              }
            : {
                  label: 'Insert a file now',
                  detail: 'No QA workbook has been uploaded yet.',
                  tone: 'border-[#e3d2b5] bg-[#fff8e8] text-[#80602b]',
                  fieldTone: 'border-[#dfb866] bg-[#fff9eb]',
                  icon: CircleDotDashed,
              };
    const UploadIndicatorIcon = uploadIndicator.icon;

    const aliases = useMemo(
        () => Object.fromEntries(rows.filter((row) => row.nickname).map((row) => [row.processor, [row.nickname as string]])),
        [rows],
    );

    function applyFilters() {
        router.get(
            '/operations/quality-assurance',
            { start_date: startDate, end_date: endDate, processor },
            {
                preserveState: true,
                replace: true,
                onStart: () => setApplying(true),
                onFinish: () => setApplying(false),
            },
        );
    }

    async function uploadQa() {
        if (!file) return;
        setUploading(true);
        setUploadError(null);

        try {
            const assessments = await qaAssessmentsFromWorkbook(file);
            router.post(
                '/operations/processors/qa-import',
                { source_file: file.name, assessments },
                {
                    preserveScroll: true,
                    onError: (errors) => {
                        setUploadError(Object.values(errors)[0] ?? 'The QA workbook could not be saved.');
                        setUploading(false);
                    },
                    onSuccess: () => {
                        setFile(null);
                        if (fileRef.current) fileRef.current.value = '';
                        setSuccessOpen(true);
                    },
                    onFinish: () => setUploading(false),
                },
            );
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'The QA workbook could not be read.');
            setUploading(false);
        }
    }

    const cards = [
        ['QA assessments', summary.assessments, FileSpreadsheet, 'bg-[#fff0c9] text-[#a96300]'],
        ['Average accuracy', summary.averageScore === null ? 'No data' : `${summary.averageScore}%`, ShieldCheck, 'bg-[#e3f3e8] text-[#147a51]'],
        ['Processors reviewed', summary.processors, UsersRound, 'bg-[#e4f3df] text-[#237148]'],
        ['Feedback entries', summary.feedbackItems, Eye, 'bg-[#eee7ff] text-[#7047c4]'],
    ] as const;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="QA & Scores" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto bg-[#fffaf1] p-5 text-[#342615] md:p-8">
                <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
                    <DialogContent className="overflow-hidden border-[#e6c783] bg-[#fffdf8] p-0 text-[#342615] sm:max-w-md [&>button]:text-[#594324]">
                        <div className="relative flex flex-col items-center overflow-hidden px-7 pt-8 text-center">
                            <span className="absolute top-6 left-[24%] text-lg text-[#f4b400] motion-safe:animate-pulse">✦</span>
                            <span className="absolute top-11 right-[23%] text-sm text-[#f4b400] motion-safe:animate-pulse">✦</span>
                            <span className="grid size-20 place-items-center rounded-full border-4 border-[#9bd4a4] bg-[#eaf8e9] text-[#2e7d42] shadow-[0_0_0_8px_rgb(155,212,164,0.2)]">
                                <CheckCircle2 className="size-10" strokeWidth={2.5} />
                            </span>
                            <p className="mt-6 text-xs font-bold tracking-[0.2em] text-[#b26a00] uppercase">Bees360 QA ready</p>
                            <DialogTitle className="mt-2 text-2xl font-extrabold text-[#342615]">QA scores saved!</DialogTitle>
                            <DialogDescription className="mt-3 text-sm leading-6 text-[#756448]">
                                {page.props.flash?.qaImportSummary?.saved ?? 0} assessment(s) processed successfully.
                            </DialogDescription>
                        </div>
                        <div className="mx-7 mt-5 grid grid-cols-3 gap-2 rounded-xl border border-[#f0dfbd] bg-[#fff8e8] p-4 text-center">
                            <div>
                                <p className="text-2xl font-extrabold text-[#9e5b00]">{page.props.flash?.qaImportSummary?.saved ?? 0}</p>
                                <p className="mt-1 text-[10px] font-bold text-[#806f59] uppercase">Processed</p>
                            </div>
                            <div className="border-x border-[#ead6aa]">
                                <p className="text-2xl font-extrabold text-[#28703c]">{page.props.flash?.qaImportSummary?.created ?? 0}</p>
                                <p className="mt-1 text-[10px] font-bold text-[#806f59] uppercase">New</p>
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-[#9e5b00]">{page.props.flash?.qaImportSummary?.updated ?? 0}</p>
                                <p className="mt-1 text-[10px] font-bold text-[#806f59] uppercase">Updated</p>
                            </div>
                        </div>
                        <DialogFooter className="px-7 pt-5 pb-7 sm:justify-center">
                            <Button
                                type="button"
                                onClick={() => setSuccessOpen(false)}
                                className="min-w-36 bg-[#b96c00] px-5 font-bold text-white hover:bg-[#925400]"
                            >
                                View QA data
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto border-[#bcd9c8] bg-[#fffdf8] text-[#342615] sm:max-w-2xl [&>button]:text-[#594324]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-[#342615]">
                                <ShieldCheck className="size-5 text-[#147a51]" /> QA feedback
                            </DialogTitle>
                            <DialogDescription className="text-[#6d5e49]">
                                {selectedRow?.processor} · {selectedRow && formatDate(selectedRow.date)} · Project {selectedRow?.projectId}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl bg-[#edf7f1] p-4">
                                <p className="text-xs text-[#567362]">Total score</p>
                                <p
                                    className={`mt-1 text-2xl font-black ${selectedRow && selectedRow.score >= 90 ? 'text-[#147a51]' : 'text-[#a04435]'}`}
                                >
                                    {selectedRow?.score}%
                                </p>
                            </div>
                            <div className="rounded-xl bg-[#fff4d9] p-4">
                                <p className="text-xs text-[#806f59]">QC reviewer</p>
                                <p className="mt-1 font-bold text-[#342615]">{selectedRow?.qcName || '—'}</p>
                            </div>
                            <div className="rounded-xl bg-[#f3edff] p-4">
                                <p className="text-xs text-[#74608e]">Feedback entries</p>
                                <p className="mt-1 text-2xl font-black text-[#7047c4]">{selectedRow?.feedback.length ?? 0}</p>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            {selectedRow?.feedback.length ? (
                                selectedRow.feedback.map((feedback, index) => (
                                    <div
                                        key={`${feedback}-${index}`}
                                        className="rounded-xl border border-[#eadbc6] bg-white p-4 text-sm font-semibold text-[#594a37]"
                                    >
                                        {feedback}
                                    </div>
                                ))
                            ) : (
                                <p className="rounded-xl bg-[#edf7f1] p-4 text-sm text-[#347846]">No error feedback was recorded.</p>
                            )}
                        </div>
                        {selectedRow?.reportUrl && (
                            <a
                                href={selectedRow.reportUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-10 items-center gap-2 self-start rounded-xl bg-[#4a351d] px-4 text-sm font-bold text-white hover:bg-[#342615]"
                            >
                                Open QA report <ExternalLink className="size-4" />
                            </a>
                        )}
                    </DialogContent>
                </Dialog>

                <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Quality assurance</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">QA & Scores</h1>
                        <p className="mt-2 text-sm text-[#776a57]">
                            View all uploaded assessments or filter results by processor and PH reporting date.
                        </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eed8a9] bg-[#fff5dc] px-3 py-1.5 text-xs font-semibold text-[#936000]">
                        <span className="size-2 rounded-full bg-[#e29a17]" />
                        <CalendarRange className="size-3.5" /> PH date: {formatDate(phToday)}
                    </span>
                </section>

                {canImport && (
                    <>
                        <section className="rounded-2xl border border-[#e6c783] bg-[#fffdf8] p-5 shadow-[0_10px_30px_rgba(87,54,14,0.04)]">
                            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h2 className="font-extrabold text-[#342615]">Upload QA Excel</h2>
                                            <p className="mt-1 text-xs text-[#806f59]">
                                                Imports QC Score or Total Score, Approval or Submission Date, processor, project, QC name, report URL,
                                                and Error columns.
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold ${uploadIndicator.tone}`}
                                            role="status"
                                            aria-live="polite"
                                        >
                                            <UploadIndicatorIcon className={`size-4 ${uploading ? 'animate-spin' : ''}`} />
                                            {uploadIndicator.label}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        disabled={uploading}
                                        className={`mt-4 flex min-h-20 w-full items-center gap-4 rounded-xl border-2 border-dashed p-4 text-left transition hover:border-[#bd7200] hover:bg-[#fff3d5] focus-visible:ring-2 focus-visible:ring-[#e9bd5e] focus-visible:outline-hidden ${uploadIndicator.fieldTone}`}
                                    >
                                        <span
                                            className={`grid size-11 shrink-0 place-items-center rounded-xl ${latestImport && !file && !uploading ? 'bg-[#dff1df] text-[#28703c]' : 'bg-[#ffedbd] text-[#a96300]'}`}
                                        >
                                            {uploading ? (
                                                <LoaderCircle className="size-5 animate-spin" />
                                            ) : latestImport && !file ? (
                                                <CheckCircle2 className="size-5" />
                                            ) : (
                                                <UploadCloud className="size-5" />
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-bold text-[#342615]">
                                                {file?.name ?? latestImport?.sourceFile ?? 'Choose QA .xlsx, .xls, or .csv file'}
                                            </span>
                                            <span className="mt-1 block text-xs text-[#806f59]">
                                                {file
                                                    ? 'Selected file — click Upload & save QA to continue.'
                                                    : latestImport
                                                      ? 'This file is already saved. Click here to choose another QA workbook.'
                                                      : 'Click to browse your QA workbook.'}
                                            </span>
                                        </span>
                                    </button>
                                    <p className="mt-2 text-xs font-semibold text-[#806f59]">{uploadIndicator.detail}</p>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="sr-only"
                                        onChange={(event) => {
                                            setFile(event.target.files?.[0] ?? null);
                                            setUploadError(null);
                                        }}
                                    />
                                </div>
                                <Button
                                    onClick={() => void uploadQa()}
                                    disabled={!file || uploading}
                                    className="h-12 bg-[#b96c00] px-5 font-bold text-white shadow-sm hover:bg-[#925400]"
                                >
                                    <UploadCloud className="size-4" />
                                    {uploading ? 'Saving QA…' : 'Upload & save QA'}
                                </Button>
                            </div>
                            {uploadError && <p className="mt-3 rounded-xl bg-[#fbe7e2] p-3 text-sm font-semibold text-[#a04435]">{uploadError}</p>}
                        </section>
                        <section className="overflow-hidden rounded-2xl border border-[#e6c783] bg-[#fffdf8] shadow-[0_10px_30px_rgba(87,54,14,0.04)]">
                            <div className="flex items-center gap-3 border-b border-[#ead6aa] bg-[#fff8e8] px-5 py-4">
                                <span className="grid size-10 place-items-center rounded-xl bg-[#ffedbd] text-[#a96300]">
                                    <History className="size-5" />
                                </span>
                                <div>
                                    <h2 className="font-extrabold text-[#342615]">QA upload history</h2>
                                    <p className="text-xs text-[#806f59]">The latest 20 uploads and updates, displayed in PH time.</p>
                                </div>
                            </div>
                            {importHistory.length === 0 ? (
                                <p className="p-6 text-sm text-[#806f59]">No QA uploads have been recorded yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[900px] text-left text-sm text-[#4b3820]">
                                        <thead className="bg-[#3b2915] text-xs text-[#fff8e7] uppercase">
                                            <tr>
                                                <th className="px-4 py-3">Uploaded</th>
                                                <th className="px-4 py-3">File</th>
                                                <th className="px-4 py-3">Uploaded by</th>
                                                <th className="px-4 py-3 text-center">Processed</th>
                                                <th className="px-4 py-3 text-center">New</th>
                                                <th className="px-4 py-3 text-center">Updated</th>
                                                <th className="px-4 py-3 text-center">Matched</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#eadfce] text-[#4b3820]">
                                            {importHistory.map((item) => (
                                                <tr key={item.id} className="odd:bg-white even:bg-[#fffaf1]">
                                                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatDateTime(item.uploadedAt)}</td>
                                                    <td className="max-w-80 truncate px-4 py-3 font-bold text-[#342615]" title={item.sourceFile}>
                                                        {item.sourceFile}
                                                    </td>
                                                    <td className="px-4 py-3">{item.uploadedBy}</td>
                                                    <td className="px-4 py-3 text-center font-extrabold">{item.processed.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-[#147a51]">
                                                        {item.created.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-[#a96300]">
                                                        {item.updated.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="rounded-full bg-[#e4f3df] px-2.5 py-1 text-xs font-bold text-[#347846]">
                                                            {item.matched.toLocaleString()}
                                                        </span>
                                                        {item.unmatched > 0 && (
                                                            <span className="ml-2 text-xs font-bold text-[#a04435]">{item.unmatched} unmatched</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </>
                )}

                <section className="rounded-2xl border border-[#e6c783] bg-[#fffdf8] p-5 shadow-[0_10px_30px_rgba(87,54,14,0.04)]">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr_auto] lg:items-end">
                        <BeesDatePicker
                            id="qa-start-date"
                            label="Start date"
                            value={startDate}
                            max={endDate < phToday ? endDate : phToday}
                            onChange={setStartDate}
                        />
                        <BeesDatePicker id="qa-end-date" label="End date" value={endDate} min={startDate} max={phToday} onChange={setEndDate} />
                        <label className="grid gap-2 text-sm font-bold text-[#594324]">
                            Processor
                            <ProcessorSelect
                                id="qa-processor"
                                value={processor}
                                processorNames={processorNames}
                                processorAliases={aliases}
                                onValueChange={setProcessor}
                            />
                        </label>
                        <Button onClick={applyFilters} disabled={applying} className="h-12 bg-[#4a351d] px-5 font-bold text-white hover:bg-[#342615]">
                            <Search className="size-4" />
                            {applying ? 'Loading…' : 'Apply filters'}
                        </Button>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map(([label, value, Icon, tone]) => (
                        <article
                            key={label}
                            className="rounded-2xl border border-[#ead7b4] bg-[#fffdf8] p-5 shadow-[0_8px_24px_rgba(87,54,14,0.035)]"
                        >
                            <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                                <Icon className="size-5" />
                            </span>
                            <p className="mt-4 text-sm text-[#806f59]">{label}</p>
                            <p className={`mt-1 text-2xl font-black ${label === 'Average accuracy' ? averageTone : 'text-[#342615]'}`}>
                                {typeof value === 'number' ? value.toLocaleString() : value}
                            </p>
                        </article>
                    ))}
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#e6c783] bg-white shadow-[0_10px_30px_rgba(87,54,14,0.04)]">
                    <div className="border-b border-[#ead6aa] bg-[#fff8e8] px-5 py-4">
                        <h2 className="font-extrabold text-[#342615]">All QA assessment records</h2>
                        <p className="mt-1 text-xs text-[#806f59]">
                            Showing {filters.processor === 'all' ? 'all processors' : filters.processor} from {formatDate(filters.startDate)} to{' '}
                            {formatDate(filters.endDate)}.
                        </p>
                    </div>
                    {rows.length === 0 ? (
                        <div className="grid min-h-56 place-items-center p-8 text-center text-[#806f59]">There is no QA data for this selection.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px] text-left text-sm">
                                <thead className="bg-[#3b2915] text-xs text-[#fff8e7] uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Processor</th>
                                        <th className="px-4 py-3">Project</th>
                                        <th className="px-4 py-3">QC</th>
                                        <th className="px-4 py-3 text-center">Score</th>
                                        <th className="px-4 py-3 text-center">Feedback</th>
                                        <th className="px-4 py-3 text-center">View</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e4eee7] text-[#4b3820]">
                                    {rows.map((row) => (
                                        <tr key={row.id} className="odd:bg-white even:bg-[#f7fbf8]">
                                            <td className="px-4 py-3 whitespace-nowrap text-[#4b3820]">{formatDate(row.date)}</td>
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-[#342615]">{row.processor}</span>
                                                {row.nickname && <span className="block text-xs text-[#806f59]">N-name: {row.nickname}</span>}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-[#4b3820]">{row.projectId || '—'}</td>
                                            <td className="px-4 py-3 text-[#6d5e49]">{row.qcName || '—'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-black ${row.score >= 90 ? 'bg-[#e4f3df] text-[#347846]' : 'bg-[#fbe4df] text-[#a04435]'}`}
                                                >
                                                    {row.score}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-[#7047c4]">{row.feedback.length}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedRow(row)}
                                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#9bc8ad] bg-[#eef8f1] px-3 text-xs font-extrabold text-[#147a51] hover:bg-[#dff1e5]"
                                                >
                                                    <Eye className="size-3.5" /> View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
