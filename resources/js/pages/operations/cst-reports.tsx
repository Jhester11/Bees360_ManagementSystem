import { BeesDatePicker } from '@/components/bees-date-picker';
import { ProcessorSelect } from '@/components/processor-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { combineCstMetrics, cstMetricsFromWorkbook } from '@/lib/processor-workbook';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Award, CalendarRange, CheckCircle2, Clock3, FileSpreadsheet, Gauge, LoaderCircle, Search, UploadCloud, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type CstRow = {
    id: number;
    date: string;
    processor: string;
    generalExterior: number;
    fourPoint: number;
    total: number;
};

type Props = {
    rows: CstRow[];
    processorNames: string[];
    filters: { startDate: string; endDate: string; processor: string };
    summary: { generalExterior: number; fourPoint: number; total: number };
    canImport: boolean;
    phToday: string;
};

type Tier = {
    name: string;
    target: number;
    incentive: number;
    achieved: boolean;
    needed: number;
    percentage: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations dashboard', href: '/dashboard' },
    { title: 'CST Reports', href: '/operations/cst-reports' },
];

const formatDate = (date: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

function deliveryStatus(total: number) {
    if (total < 25) return { label: 'Under delivered', className: 'bg-[#fde1e2] text-[#a5474b] ring-[#efc1c3]' };
    if (total > 31) return { label: 'Over delivered', className: 'bg-[#e2efd9] text-[#477239] ring-[#bfd9b4]' };

    return { label: 'Delivered', className: 'bg-[#fff0c5] text-[#936000] ring-[#efd893]' };
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
                <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#8b5b11] shadow-sm">${tier.incentive}</span>
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
                    {tier.achieved ? `$${tier.incentive} earned` : tier.needed.toLocaleString()}
                </p>
            </div>
        </article>
    );
}

export default function CstReports({ rows, processorNames, filters, summary, canImport, phToday }: Props) {
    const page = usePage<{ flash?: { cstImportSummary?: { saved: number; file: string } }; errors?: Record<string, string> }>();
    const [startDate, setStartDate] = useState(filters.startDate);
    const [endDate, setEndDate] = useState(filters.endDate);
    const [processor, setProcessor] = useState(filters.processor);
    const [activeFile, setActiveFile] = useState<File | null>(null);
    const [closedFile, setClosedFile] = useState<File | null>(null);
    const [archivedFile, setArchivedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [successOpen, setSuccessOpen] = useState(Boolean(page.props.flash?.cstImportSummary));
    const [savedCount, setSavedCount] = useState(page.props.flash?.cstImportSummary?.saved ?? 0);
    const selectedFiles = useMemo(
        () => [activeFile, closedFile, archivedFile].filter((file): file is File => Boolean(file)),
        [activeFile, archivedFile, closedFile],
    );
    const displayRows: CstRow[] = Array.isArray(rows) ? rows : Object.values(rows as Record<string, CstRow>);
    const credits = Math.round((summary.generalExterior + summary.fourPoint * 1.25) * 100) / 100;
    const tiers: Tier[] = [
        { name: 'Tier 1', target: 550, incentive: 100 },
        { name: 'Tier 2', target: 650, incentive: 200 },
        { name: 'Tier 3', target: 750, incentive: 300 },
    ].map((tier) => ({
        ...tier,
        achieved: credits >= tier.target,
        needed: Math.max(Math.round((tier.target - credits) * 100) / 100, 0),
        percentage: Math.round(Math.min((credits / tier.target) * 100, 100) * 10) / 10,
    }));
    const incentive = [...tiers].reverse().find((tier) => tier.achieved)?.incentive ?? 0;
    const periodLabel = `${formatDate(filters.startDate)} – ${formatDate(filters.endDate)}`;
    const filtersAreApplied = startDate === filters.startDate && endDate === filters.endDate && processor === filters.processor;
    const hasAppliedProcessor = filtersAreApplied && filters.processor !== '';
    const deliveryCounts = displayRows.reduce(
        (counts, row) => {
            if (row.total < 25) counts.under += 1;
            else if (row.total > 31) counts.over += 1;
            else counts.delivered += 1;

            return counts;
        },
        { under: 0, delivered: 0, over: 0 },
    );

    useEffect(() => {
        const imported = page.props.flash?.cstImportSummary;
        if (!imported) return;

        setSavedCount(imported.saved);
        setSuccessOpen(true);
    }, [page.props.flash?.cstImportSummary]);

    useEffect(() => {
        setStartDate(filters.startDate);
        setEndDate(filters.endDate);
        setProcessor(filters.processor);
    }, [filters.endDate, filters.processor, filters.startDate]);

    function applyFilters() {
        router.get(
            '/operations/cst-reports',
            { start_date: startDate, end_date: endDate, processor },
            {
                preserveState: false,
                replace: true,
                onStart: () => setApplying(true),
                onFinish: () => setApplying(false),
            },
        );
    }

    async function uploadFiles() {
        if (selectedFiles.length === 0) return;
        setUploading(true);
        setUploadError(null);

        try {
            const metrics = combineCstMetrics(await Promise.all(selectedFiles.map(cstMetricsFromWorkbook)));
            router.post(
                '/operations/processors/cst-import',
                {
                    source_file: selectedFiles
                        .map((file) => file.name)
                        .join(' + ')
                        .slice(0, 255),
                    metrics,
                },
                {
                    preserveScroll: true,
                    onError: (errors) => {
                        setUploadError(Object.values(errors)[0] ?? 'The CST workbook could not be saved.');
                        setUploading(false);
                    },
                    onSuccess: (responsePage) => {
                        const imported = (responsePage.props.flash as { cstImportSummary?: { saved: number } } | undefined)?.cstImportSummary;
                        const importedDates = metrics.map((metric) => metric.report_date).sort();

                        setSavedCount(imported?.saved ?? metrics.length);
                        setStartDate(importedDates[0] ?? startDate);
                        setEndDate(importedDates.at(-1) ?? endDate);
                        setProcessor('all');
                        setActiveFile(null);
                        setClosedFile(null);
                        setArchivedFile(null);
                        setUploading(false);
                        setSuccessOpen(true);
                    },
                    onFinish: () => setUploading(false),
                },
            );
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'The CST workbook could not be read.');
            setUploading(false);
        }
    }

    const cards = [
        ['General Exterior', summary.generalExterior, FileSpreadsheet, 'bg-[#e4f3df] text-[#237148]'],
        ['4-Point', summary.fourPoint, Gauge, 'bg-[#eee7ff] text-[#7047c4]'],
        ['Total reports', summary.total, Clock3, 'bg-[#fff0c9] text-[#a96300]'],
    ] as const;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="CST Reports" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl bg-[#fffaf1] p-4 sm:p-6">
                <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
                    <DialogContent className="border-[#e5ce9f] bg-[#fffdf8] sm:max-w-md">
                        <DialogHeader className="items-center text-center">
                            <span className="grid size-16 place-items-center rounded-full bg-[#e6f3df] text-[#347846]">
                                <CheckCircle2 className="size-9" />
                            </span>
                            <DialogTitle className="text-2xl text-[#342615]">CST data saved</DialogTitle>
                            <DialogDescription>{savedCount} processor record(s) are now available in CST Reports.</DialogDescription>
                        </DialogHeader>
                        <Button
                            type="button"
                            onClick={() => setSuccessOpen(false)}
                            className="mt-2 h-11 w-full bg-[#4a351d] font-bold text-white hover:bg-[#342615]"
                        >
                            Close and view reports
                        </Button>
                    </DialogContent>
                </Dialog>

                <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#ead4ad] bg-gradient-to-r from-[#fffdf8] to-[#fff5df] p-5 lg:flex-row lg:items-center">
                    <div>
                        <p className="text-xs font-extrabold tracking-[.16em] text-[#b26a00] uppercase">Central reporting time</p>
                        <h1 className="mt-2 text-3xl font-black text-[#342615]">CST processor reports</h1>
                        <p className="mt-2 text-sm text-[#776a57]">
                            Upload CST workbooks and review daily processor totals using a Philippine-time date selection.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-2 self-start rounded-xl bg-[#4a351d] px-4 py-3 text-sm font-bold text-[#fff8e7]">
                        <Clock3 className="size-4 text-[#ffc83d]" /> PH date: {formatDate(phToday)}
                    </span>
                </section>

                {canImport && (
                    <section className="rounded-2xl border border-[#e3c78f] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(88,57,18,.06)]">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="font-extrabold text-[#342615]">Upload CST workbooks</h2>
                                <p className="mt-1 text-xs text-[#806f59]">
                                    Active, Closed, and Archived files are optional. Upload any one file or combine all available files.
                                </p>
                            </div>
                            <UploadCloud className="size-6 text-[#b96c00]" />
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {(['active', 'closed', 'archived'] as const).map((kind) => {
                                const file = kind === 'active' ? activeFile : kind === 'closed' ? closedFile : archivedFile;
                                const setter = kind === 'active' ? setActiveFile : kind === 'closed' ? setClosedFile : setArchivedFile;
                                return (
                                    <label
                                        key={kind}
                                        className={`cursor-pointer rounded-xl border-2 border-dashed p-4 transition ${file ? 'border-[#79b793] bg-[#eef8ef]' : 'border-[#dfc58f] bg-white hover:bg-[#fff7e5]'}`}
                                    >
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls"
                                            className="sr-only"
                                            disabled={uploading}
                                            onChange={(event) => setter(event.target.files?.[0] ?? null)}
                                        />
                                        <span
                                            className={`grid size-10 place-items-center rounded-xl ${file ? 'bg-[#d9efdf] text-[#147a51]' : 'bg-[#fff0c9] text-[#a96300]'}`}
                                        >
                                            {file ? <CheckCircle2 className="size-5" /> : <FileSpreadsheet className="size-5" />}
                                        </span>
                                        <p className="mt-3 font-extrabold text-[#3f2e18]">
                                            {kind === 'active' ? 'Active' : kind === 'closed' ? 'Closed' : 'Archived'} CST file
                                        </p>
                                        <p className="mt-1 truncate text-xs text-[#806f59]">{file?.name ?? 'Choose an Excel workbook'}</p>
                                    </label>
                                );
                            })}
                        </div>
                        {uploadError && <p className="mt-3 rounded-xl bg-[#fbe7e2] p-3 text-sm font-semibold text-[#a04435]">{uploadError}</p>}
                        <Button
                            disabled={selectedFiles.length === 0 || uploading}
                            onClick={() => void uploadFiles()}
                            className="mt-4 h-11 bg-[#b96c00] font-bold text-white hover:bg-[#925400]"
                        >
                            {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                            {uploading ? 'Generating & saving…' : 'Generate & save CST data'}
                        </Button>
                    </section>
                )}

                <section className="rounded-2xl border border-[#ead4ad] bg-[#fffdf8] p-5">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr_auto] lg:items-end">
                        <BeesDatePicker
                            id="cst-start-date"
                            label="Start date"
                            value={startDate}
                            max={endDate < phToday ? endDate : phToday}
                            onChange={setStartDate}
                        />
                        <BeesDatePicker id="cst-end-date" label="End date" value={endDate} min={startDate} max={phToday} onChange={setEndDate} />
                        <label className="grid gap-2 text-sm font-bold text-[#594324]">
                            Processor
                            <ProcessorSelect
                                id="cst-processor"
                                value={processor}
                                processorNames={processorNames}
                                onValueChange={setProcessor}
                                allowClear
                                clearLabel="Select a processor"
                            />
                        </label>
                        <Button
                            onClick={applyFilters}
                            disabled={!processor || applying}
                            className="h-12 bg-[#4a351d] px-5 font-bold text-white hover:bg-[#342615]"
                        >
                            <Search className="size-4" />
                            {applying ? 'Loading…' : 'View reports'}
                        </Button>
                    </div>
                </section>

                {hasAppliedProcessor && (
                    <section className="grid gap-4 sm:grid-cols-3">
                        {cards.map(([label, value, Icon, tone]) => (
                            <article key={label} className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5">
                                <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                                    <Icon className="size-5" />
                                </span>
                                <p className="mt-4 text-sm text-[#806f59]">{label}</p>
                                <p className="mt-1 text-2xl font-black text-[#342615]">
                                    {typeof value === 'number' ? value.toLocaleString() : value}
                                </p>
                            </article>
                        ))}
                    </section>
                )}

                {hasAppliedProcessor && filters.processor !== 'all' && displayRows.length > 0 && (
                    <section className="grid gap-4 xl:grid-cols-[1.7fr_repeat(3,minmax(0,1fr))]">
                        <article className="relative overflow-hidden rounded-2xl bg-[#563310] p-6 text-white shadow-[0_16px_35px_rgba(75,42,10,0.16)]">
                            <div className="absolute -top-16 -right-12 size-44 rounded-full bg-[#9b6519]/70" />
                            <div className="relative">
                                <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-[#ffc83d]">
                                    <WalletCards className="size-6" />
                                </span>
                                <p className="mt-5 text-xs font-black tracking-wide text-[#ffd66e] uppercase">Total earned credits</p>
                                <p className="mt-1 text-sm font-bold text-[#fff0cb]">Selected CST period · {periodLabel}</p>
                                <p className="mt-4 text-5xl font-black tracking-tight">{credits.toLocaleString()}</p>
                                <p className="mt-2 text-sm font-semibold text-[#f2dfc7]">
                                    {summary.generalExterior.toLocaleString()} × 1 + {summary.fourPoint.toLocaleString()} × 1.25
                                </p>
                                <div className="mt-7 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                                    <p className="text-xs text-[#ead8be]">Current incentive</p>
                                    <p className="mt-1 text-3xl font-black text-[#ffc83d]">${incentive}</p>
                                </div>
                            </div>
                        </article>
                        {tiers.map((tier) => (
                            <TierProgressGauge key={tier.name} tier={tier} period={periodLabel} />
                        ))}
                    </section>
                )}

                <section className="overflow-hidden rounded-2xl border border-[#e5ce9f] bg-white">
                    <div className="flex flex-col justify-between gap-3 border-b border-[#eadbc6] bg-[#fff8e8] px-5 py-4 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="font-extrabold text-[#342615]">Daily CST production</h2>
                            <p className="mt-1 text-xs text-[#806f59]">General Exterior and 4-Point totals stored from CST uploads.</p>
                        </div>
                        {hasAppliedProcessor && (
                            <div className="flex flex-wrap gap-2 text-[11px] font-extrabold">
                                <span className="rounded-full bg-[#fde1e2] px-3 py-1.5 text-[#a5474b] ring-1 ring-[#efc1c3]">
                                    Under delivered · {deliveryCounts.under} day(s) · Below 25
                                </span>
                                <span className="rounded-full bg-[#fff0c5] px-3 py-1.5 text-[#936000] ring-1 ring-[#efd893]">
                                    Delivered · {deliveryCounts.delivered} day(s) · 25–31
                                </span>
                                <span className="rounded-full bg-[#e2efd9] px-3 py-1.5 text-[#477239] ring-1 ring-[#bfd9b4]">
                                    Over delivered · {deliveryCounts.over} day(s) · Above 31
                                </span>
                            </div>
                        )}
                    </div>
                    {!filtersAreApplied ? (
                        <div className="grid min-h-56 place-items-center p-8 text-center">
                            <div>
                                <Search className="mx-auto size-10 text-[#c17b12]" />
                                <p className="mt-3 font-bold text-[#342615]">Apply the selected filters to update the CST report.</p>
                                <p className="mt-1 text-sm text-[#806f59]">Click View reports to load only the chosen processor and date range.</p>
                            </div>
                        </div>
                    ) : !filters.processor ? (
                        <div className="grid min-h-56 place-items-center p-8 text-center">
                            <div>
                                <CalendarRange className="mx-auto size-10 text-[#c17b12]" />
                                <p className="mt-3 font-bold text-[#342615]">Select a processor to display CST data.</p>
                            </div>
                        </div>
                    ) : displayRows.length === 0 ? (
                        <div className="grid min-h-56 place-items-center p-8 text-center text-[#806f59]">
                            No CST data is available for this processor and date range.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-left text-sm text-[#594324]">
                                <thead className="bg-[#3b2915] text-xs text-[#fff8e7] uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Processor</th>
                                        <th className="px-4 py-3 text-center">Gen Ext</th>
                                        <th className="px-4 py-3 text-center">4-Point</th>
                                        <th className="px-4 py-3 text-center">Total</th>
                                        <th className="px-4 py-3 text-center">Delivery status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#efe4d2] text-[#594324]">
                                    {displayRows.map((row) => {
                                        const status = deliveryStatus(row.total);

                                        return (
                                            <tr key={row.id} className="odd:bg-white even:bg-[#fffaf0]">
                                                <td className="px-4 py-3 font-semibold whitespace-nowrap text-[#594324]">{formatDate(row.date)}</td>
                                                <td className="px-4 py-3 font-bold text-[#342615]">{row.processor}</td>
                                                <td className="px-4 py-3 text-center text-[#594324]">{row.generalExterior}</td>
                                                <td className="px-4 py-3 text-center text-[#594324]">{row.fourPoint}</td>
                                                <td className="px-4 py-3 text-center font-black text-[#9b5d00]">{row.total}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={`inline-flex min-w-28 justify-center rounded-full px-3 py-1 text-xs font-black ring-1 ${status.className}`}
                                                    >
                                                        {status.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
