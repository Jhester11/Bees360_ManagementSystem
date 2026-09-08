import { ProcessorSelect } from '@/components/processor-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { qaAssessmentsFromWorkbook } from '@/lib/processor-workbook';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    CalendarRange,
    CheckCircle2,
    ExternalLink,
    Eye,
    FileSpreadsheet,
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

type Props = {
    rows: QaRow[];
    processorNames: string[];
    filters: { startDate: string; endDate: string; processor: string };
    summary: { assessments: number; averageScore: number | null; processors: number; feedbackItems: number };
    canImport: boolean;
    phToday: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations dashboard', href: '/dashboard' },
    { title: 'QA & Scores', href: '/operations/quality-assurance' },
];
const formatDate = (date: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

export default function QaScores({ rows, processorNames, filters, summary, canImport, phToday }: Props) {
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
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl bg-[#fffaf1] p-4 sm:p-6">
                <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
                    <DialogContent className="border-[#bcd9c8] bg-[#fffdf8] sm:max-w-md">
                        <DialogHeader className="items-center text-center">
                            <span className="grid size-16 place-items-center rounded-full bg-[#e6f3df] text-[#347846]">
                                <CheckCircle2 className="size-9" />
                            </span>
                            <DialogTitle className="text-2xl text-[#342615]">QA scores saved</DialogTitle>
                            <DialogDescription>
                                {page.props.flash?.qaImportSummary?.saved ?? 0} assessment(s) processed successfully.
                            </DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>

                <Dialog open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto border-[#bcd9c8] bg-[#fffdf8] sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-[#342615]">
                                <ShieldCheck className="size-5 text-[#147a51]" /> QA feedback
                            </DialogTitle>
                            <DialogDescription>
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

                <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#c9dfd1] bg-gradient-to-r from-[#fffdf8] to-[#eef8f1] p-5 lg:flex-row lg:items-center">
                    <div>
                        <p className="text-xs font-extrabold tracking-[.16em] text-[#147a51] uppercase">Quality assurance</p>
                        <h1 className="mt-2 text-3xl font-black text-[#342615]">QA & Scores</h1>
                        <p className="mt-2 text-sm text-[#776a57]">
                            View all uploaded assessments or filter results by processor and PH reporting date.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-2 self-start rounded-xl bg-[#147a51] px-4 py-3 text-sm font-bold text-white">
                        <CalendarRange className="size-4" /> PH date: {formatDate(phToday)}
                    </span>
                </section>

                {canImport && (
                    <section className="rounded-2xl border border-[#bcd9c8] bg-[#fffdf8] p-5">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div className="min-w-0 flex-1">
                                <h2 className="font-extrabold text-[#342615]">Upload QA Excel</h2>
                                <p className="mt-1 text-xs text-[#806f59]">
                                    Imports Total Score, Submission Date, processor, project, QC name, report URL, and Error columns.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    disabled={uploading}
                                    className="mt-4 flex min-h-20 w-full items-center gap-4 rounded-xl border-2 border-dashed border-[#9bc8ad] bg-[#f4fbf6] p-4 text-left hover:bg-[#eaf7ee]"
                                >
                                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#dcefe2] text-[#147a51]">
                                        {uploading ? <LoaderCircle className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-bold text-[#342615]">{file?.name ?? 'Choose QA .xlsx, .xls, or .csv file'}</span>
                                        <span className="mt-1 block text-xs text-[#806f59]">Click to browse your QA workbook</span>
                                    </span>
                                </button>
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
                                className="h-12 bg-[#147a51] px-5 font-bold text-white hover:bg-[#0d5e3d]"
                            >
                                <UploadCloud className="size-4" />
                                {uploading ? 'Saving QA…' : 'Upload & save QA'}
                            </Button>
                        </div>
                        {uploadError && <p className="mt-3 rounded-xl bg-[#fbe7e2] p-3 text-sm font-semibold text-[#a04435]">{uploadError}</p>}
                    </section>
                )}

                <section className="rounded-2xl border border-[#d8e8df] bg-[#fffdf8] p-5">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr_auto] lg:items-end">
                        <label className="grid gap-2 text-sm font-bold text-[#594324]">
                            Start date
                            <input
                                type="date"
                                value={startDate}
                                max={phToday}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-12 rounded-xl border border-[#bcd9c8] bg-white px-3 text-[#4b3820] outline-none focus:border-[#147a51] focus:ring-2 focus:ring-[#a9d8bc]/60"
                            />
                        </label>
                        <label className="grid gap-2 text-sm font-bold text-[#594324]">
                            End date
                            <input
                                type="date"
                                value={endDate}
                                max={phToday}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-12 rounded-xl border border-[#bcd9c8] bg-white px-3 text-[#4b3820] outline-none focus:border-[#147a51] focus:ring-2 focus:ring-[#a9d8bc]/60"
                            />
                        </label>
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
                        <article key={label} className="rounded-2xl border border-[#d8e8df] bg-white p-5">
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

                <section className="overflow-hidden rounded-2xl border border-[#c9dfd1] bg-white">
                    <div className="border-b border-[#d8e8df] bg-[#edf7f1] px-5 py-4">
                        <h2 className="font-extrabold text-[#342615]">All QA assessment records</h2>
                        <p className="mt-1 text-xs text-[#567362]">
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
                                <tbody className="divide-y divide-[#e4eee7]">
                                    {rows.map((row) => (
                                        <tr key={row.id} className="odd:bg-white even:bg-[#f7fbf8]">
                                            <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-[#342615]">{row.processor}</span>
                                                {row.nickname && <span className="block text-xs text-[#806f59]">N-name: {row.nickname}</span>}
                                            </td>
                                            <td className="px-4 py-3 font-semibold">{row.projectId || '—'}</td>
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
