import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { BeesDatePicker, formatDate, philippinesToday } from '@/pages/dashboard';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    ChartNoAxesCombined,
    CheckCircle2,
    Database,
    Download,
    FileSpreadsheet,
    Layers3,
    Moon,
    PackageCheck,
    Sun,
    Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx-js-style';

type ReportType = 'midday' | 'endOfDay';
type Batch = 'batch1' | 'batch2' | 'batch3' | 'overall';
type PageTab = 'reports' | 'import';
type Source = 'active' | 'closed';
type ReportEntry = {
    report_date: string;
    source: Source;
    batch: number;
    processor_name: string;
    project_id: string;
    inspection_type: string;
    report_category: 'general_exterior' | 'four_point';
    assembled_at: string | null;
};
type ReportRow = { name: string; nickname: string; batch: number; generalExtensions: number; fourPoint: number };
type ReportsProps = { reportEntries: ReportEntry[]; latestReportDate?: string | null };
type ImportEntry = { source: Source; project_id: string; insured_by: string; inspection_type: string; assembled_by: string; assembled_at: string };

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations dashboard', href: '/dashboard' },
    { title: 'Reports', href: '/operations/reports' },
];
const processorRoster: Omit<ReportRow, 'generalExtensions' | 'fourPoint'>[] = [
    { name: 'Chrismer Flores', nickname: 'Chrismer', batch: 3 },
    { name: 'Denn Charles Zafe', nickname: 'Denn', batch: 3 },
    { name: 'Ivan Mendoza', nickname: 'Ivan', batch: 3 },
    { name: 'Jerica Matic', nickname: 'Jerica', batch: 3 },
    { name: 'Kristine Jewel Espiritu', nickname: 'Kristine', batch: 3 },
    { name: 'Mac Evens T. Payongayong', nickname: 'Mac', batch: 3 },
    { name: 'Nikko Adrian Dungca', nickname: 'Nikko', batch: 3 },
    { name: 'Rainier Sta Ana', nickname: 'Rainier', batch: 3 },
    { name: 'Tracy John Josafat', nickname: 'Tracy', batch: 3 },
    { name: 'Allan Layug', nickname: 'Allan', batch: 2 },
    { name: 'Arianne Joy Lopez', nickname: 'Arianne', batch: 2 },
    { name: 'Emma Alegre', nickname: 'Emma', batch: 2 },
    { name: 'Marie Anthonette Moog', nickname: 'Tonette', batch: 2 },
    { name: 'Mc Oliver Noble', nickname: 'Oliver', batch: 2 },
    { name: 'Rheven Violet Aladin', nickname: 'Violet', batch: 2 },
    { name: 'Wengmir A. Africa', nickname: 'Wengmir', batch: 2 },
    { name: 'Christer John C. Gozon', nickname: 'Chris', batch: 1 },
    { name: 'Lourdes M. Completado', nickname: 'Lourdes', batch: 1 },
    { name: 'Elacio M. Santos Jr.', nickname: 'Elacio', batch: 1 },
    { name: 'Jhun Cervantes', nickname: 'Jhun', batch: 1 },
    { name: 'Reginald King Palo', nickname: 'King', batch: 1 },
];
const sampleCounts = [
    [12, 2],
    [10, 1],
    [14, 2],
    [9, 1],
    [16, 4],
    [8, 0],
    [13, 3],
    [11, 2],
    [15, 1],
    [17, 4],
    [10, 2],
    [12, 3],
    [8, 2],
    [14, 1],
    [11, 3],
    [16, 2],
    [13, 3],
    [9, 1],
    [12, 2],
    [15, 4],
    [10, 1],
] as const;
const requiredColumns = ['Project ID', 'Insured by', 'Inspection Type', 'First Assembled by', 'First Assembled Time'];
const dateKey = (value: string) => value.slice(0, 10);

async function rowsFromWorkbook(file: File, source: Source): Promise<ImportEntry[]> {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error(`${file.name} does not contain a worksheet.`);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
    const missingColumns = requiredColumns.filter((column) => !Object.prototype.hasOwnProperty.call(rows[0] ?? {}, column));
    if (missingColumns.length > 0) throw new Error(`${file.name} is missing: ${missingColumns.join(', ')}.`);
    return rows.map((row) => ({
        source,
        project_id: String(row['Project ID']).trim(),
        insured_by: String(row['Insured by']).trim(),
        inspection_type: String(row['Inspection Type']).trim(),
        assembled_by: String(row['First Assembled by']).trim(),
        assembled_at: String(row['First Assembled Time']).trim(),
    }));
}

export default function Reports({ reportEntries, latestReportDate }: ReportsProps) {
    const { flash } = usePage<{ flash?: { importSummary?: { saved: number; ignored: number } } }>().props;
    const [pageTab, setPageTab] = useState<PageTab>('reports');
    const [reportType, setReportType] = useState<ReportType>('midday');
    const [batch, setBatch] = useState<Batch>('overall');
    const [reportDate, setReportDate] = useState(latestReportDate ?? philippinesToday);
    const [activeFile, setActiveFile] = useState<File | null>(null);
    const [closedFile, setClosedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showImportConfirmation, setShowImportConfirmation] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(() => Boolean(flash?.importSummary));

    useEffect(() => {
        if (flash?.importSummary) {
            setShowSuccessModal(true);
        }
    }, [flash?.importSummary]);

    const hasImportedData = reportEntries.some((entry) => dateKey(entry.report_date) === reportDate);
    const allRows = useMemo(() => {
        const reportRows = processorRoster.map((processor, index) => {
            const entriesByReport = new Map<string, ReportEntry>();

            reportEntries
                .filter(
                    (entry) =>
                        dateKey(entry.report_date) === reportDate &&
                        entry.processor_name === processor.name &&
                        (reportType === 'endOfDay' || (entry.assembled_at !== null && entry.assembled_at.slice(11, 16) <= '12:15')),
                )
                .forEach((entry) => {
                    const key = `${entry.project_id}|${entry.inspection_type}`;

                    if (!entriesByReport.has(key) || entry.source === 'closed') {
                        entriesByReport.set(key, entry);
                    }
                });

            const entries = [...entriesByReport.values()];
            return {
                ...processor,
                generalExtensions: hasImportedData
                    ? entries.filter((entry) => entry.report_category === 'general_exterior').length
                    : sampleCounts[index][0],
                fourPoint: hasImportedData ? entries.filter((entry) => entry.report_category === 'four_point').length : sampleCounts[index][1],
            };
        });
        return reportRows.map((row) => ({
            ...row,
            generalExtensions: reportType === 'midday' && !hasImportedData ? Math.max(0, row.generalExtensions - 4) : row.generalExtensions,
            fourPoint: reportType === 'midday' && !hasImportedData ? Math.floor(row.fourPoint / 2) : row.fourPoint,
        }));
    }, [hasImportedData, reportDate, reportEntries, reportType]);
    const rows = useMemo(() => (batch === 'overall' ? allRows : allRows.filter((row) => row.batch === Number(batch.at(-1)))), [allRows, batch]);
    const totals = rows.reduce(
        (total, row) => ({ generalExtensions: total.generalExtensions + row.generalExtensions, fourPoint: total.fourPoint + row.fourPoint }),
        { generalExtensions: 0, fourPoint: 0 },
    );
    const reportLabel = reportType === 'midday' ? 'Mid-Day Report' : 'End of Day Report';
    const combinedTotals = allRows.reduce(
        (total, row) => ({ generalExtensions: total.generalExtensions + row.generalExtensions, fourPoint: total.fourPoint + row.fourPoint }),
        { generalExtensions: 0, fourPoint: 0 },
    );

    function exportCombinedReport() {
        const headerRow = 4;
        const firstDataRow = headerRow + 1;
        const totalRow = firstDataRow + allRows.length;
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['BEES360 | DAILY OPERATIONS REPORT'],
            [`${reportLabel} · ${formatDate(reportDate)} · Batch 1, Batch 2 and Batch 3`],
            [],
            ['NAMES', 'N-NAME', 'BATCH', 'DAY', 'GEN EXT', '4-POINT', 'TOTAL'],
            ...allRows.map((row) => [row.name, row.nickname, `Batch ${row.batch}`, formatDate(reportDate), row.generalExtensions, row.fourPoint, 0]),
            ['COMBINED TOTAL', '', '', '', 0, 0, 0],
        ]) as XLSX.WorkSheet;
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
        const numberStyle = { ...bodyStyle, alignment: { horizontal: 'center', vertical: 'center' }, numFmt: '#,##0' };
        const totalLabelStyle = {
            alignment: { horizontal: 'center', vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '5A3900' } },
            fill: { fgColor: { rgb: 'FFF0C5' } },
            border: { top: { style: 'medium', color: { rgb: '4A351D' } } },
        };
        const totalNumberStyle = {
            ...totalLabelStyle,
            numFmt: '#,##0',
        };
        const totalColumnStyle = {
            ...numberStyle,
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '694400' } },
            fill: { fgColor: { rgb: 'FFF0C5' } },
        };
        const finalTotalStyle = { ...totalNumberStyle, fill: { fgColor: { rgb: 'F2CF72' } } };
        const whiteCellStyle = {
            font: { name: 'Century Gothic', sz: 10, color: { rgb: '4A3821' } },
            fill: { fgColor: { rgb: 'FFFFFF' } },
        };

        for (let row = 1; row <= totalRow; row += 1) {
            for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
                const address = `${column}${row}`;
                worksheet[address] ??= { t: 's', v: '' };
                worksheet[address].s = whiteCellStyle;
            }
        }

        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
            { s: { r: totalRow - 1, c: 0 }, e: { r: totalRow - 1, c: 3 } },
        ];
        worksheet['!cols'] = [{ wch: 31 }, { wch: 16 }, { wch: 13 }, { wch: 23 }, { wch: 17 }, { wch: 14 }, { wch: 13 }];
        worksheet['!rows'] = [{ hpt: 27 }, { hpt: 20 }, { hpt: 8 }, { hpt: 25 }];
        worksheet.A1.s = titleStyle;
        worksheet.A2.s = subtitleStyle;

        for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) worksheet[`${column}${headerRow}`].s = headerStyle;
        worksheet[`G${headerRow}`].s = { ...headerStyle, fill: { fgColor: { rgb: '2F2112' } } };
        allRows.forEach((_, index) => {
            const rowNumber = firstDataRow + index;
            const rowStyle = index % 2 === 0 ? bodyStyle : alternateStyle;
            worksheet[`A${rowNumber}`].s = rowStyle;
            worksheet[`B${rowNumber}`].s = { ...rowStyle, alignment: { horizontal: 'left', vertical: 'center' } };
            for (const column of ['C', 'D'])
                worksheet[`${column}${rowNumber}`].s = { ...rowStyle, alignment: { horizontal: 'center', vertical: 'center' } };
            for (const column of ['E', 'F'])
                worksheet[`${column}${rowNumber}`].s = { ...numberStyle, ...(index % 2 === 1 ? { fill: { fgColor: { rgb: 'FFF8E8' } } } : {}) };
            worksheet[`G${rowNumber}`] = { f: `E${rowNumber}+F${rowNumber}`, t: 'n', s: totalColumnStyle };
        });
        for (const column of ['A', 'B', 'C', 'D']) worksheet[`${column}${totalRow}`].s = totalLabelStyle;
        worksheet[`E${totalRow}`] = { f: `SUM(E${firstDataRow}:E${totalRow - 1})`, v: combinedTotals.generalExtensions, t: 'n', s: totalNumberStyle };
        worksheet[`F${totalRow}`] = { f: `SUM(F${firstDataRow}:F${totalRow - 1})`, v: combinedTotals.fourPoint, t: 'n', s: totalNumberStyle };
        worksheet[`G${totalRow}`] = {
            f: `SUM(G${firstDataRow}:G${totalRow - 1})`,
            v: combinedTotals.generalExtensions + combinedTotals.fourPoint,
            t: 'n',
            s: finalTotalStyle,
        };

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Combined Report');
        XLSX.writeFile(workbook, `Bees360_Combined_Report_${reportDate}.xlsx`, { compression: true });
    }

    function confirmImport() {
        if (!activeFile && !closedFile) {
            setUploadError('Choose an Active file, a Closed file, or both before generating the report.');
            return;
        }

        setUploadError(null);
        setShowImportConfirmation(true);
    }

    async function importReports() {
        setShowImportConfirmation(false);
        setUploadError(null);
        setIsUploading(true);
        try {
            const entries = [
                ...(activeFile ? await rowsFromWorkbook(activeFile, 'active') : []),
                ...(closedFile ? await rowsFromWorkbook(closedFile, 'closed') : []),
            ];
            if (entries.length === 0) {
                setUploadError('The selected workbook has no report rows.');
                setIsUploading(false);
                return;
            }
            router.post(
                '/operations/reports/import',
                { entries: JSON.stringify(entries) },
                {
                    preserveScroll: true,
                    onError: (errors) =>
                        setUploadError(
                            errors.entries ??
                                Object.values(errors).find((message) => typeof message === 'string') ??
                                'The import could not be saved. Check the workbook and try again.',
                        ),
                    onSuccess: () => {
                        setActiveFile(null);
                        setClosedFile(null);
                        setShowSuccessModal(true);
                    },
                    onFinish: () => setIsUploading(false),
                },
            );
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'The workbook could not be read.');
            setIsUploading(false);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />
            <div className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 md:p-8">
                <Dialog open={showImportConfirmation} onOpenChange={setShowImportConfirmation}>
                    <DialogContent className="overflow-hidden border-[#e6c783] bg-[#fffdf8] p-0 sm:max-w-md">
                        <div className="flex flex-col items-center px-7 pt-8 text-center">
                            <div className="grid size-20 place-items-center rounded-full border-4 border-[#f4d486] bg-[#fff2c8] text-[#a96000] shadow-[0_0_0_8px_rgb(244,212,134,0.2)]">
                                <Database className="size-9" />
                            </div>
                            <DialogTitle className="mt-6 text-2xl font-extrabold text-[#342615]">Generate and save this report?</DialogTitle>
                            <DialogDescription className="mt-3 text-sm leading-6 text-[#756448]">
                                Bees360 will read the selected workbook{activeFile && closedFile ? 's' : ''} and save all valid report rows to the
                                database.
                            </DialogDescription>
                        </div>
                        <div className="mx-7 grid gap-2 rounded-xl border border-[#f0dfbd] bg-[#fff8e8] p-4 text-sm text-[#654b2d]">
                            {activeFile && (
                                <div className="flex items-center justify-between gap-4">
                                    <span className="font-bold">ACTIVE</span>
                                    <span className="truncate text-[#806f59]">{activeFile.name}</span>
                                </div>
                            )}
                            {closedFile && (
                                <div className="flex items-center justify-between gap-4">
                                    <span className="font-bold">CLOSED</span>
                                    <span className="truncate text-[#806f59]">{closedFile.name}</span>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="gap-3 px-7 pt-2 pb-7 sm:gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="border-[#d8bd8c] text-[#75552d] hover:bg-[#fff4dc]"
                                onClick={() => setShowImportConfirmation(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="button" className="bg-[#b96c00] font-bold text-white hover:bg-[#925400]" onClick={importReports}>
                                Yes, generate & save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                    <DialogContent className="overflow-hidden border-[#e6c783] bg-[#fffdf8] p-0 sm:max-w-md">
                        <div className="flex flex-col items-center px-7 pt-8 text-center">
                            <div className="grid size-20 place-items-center rounded-full border-4 border-[#9bd4a4] bg-[#eaf8e9] text-[#2e7d42] shadow-[0_0_0_8px_rgb(155,212,164,0.2)]">
                                <CheckCircle2 className="size-10" strokeWidth={2.5} />
                            </div>
                            <p className="mt-6 text-xs font-bold tracking-[0.2em] text-[#b26a00] uppercase">Bees360 report ready</p>
                            <DialogTitle className="mt-2 text-2xl font-extrabold text-[#342615]">Successfully saved!</DialogTitle>
                        </div>
                        <DialogHeader className="gap-3 px-7 pt-3 text-center sm:text-center">
                            <DialogDescription className="text-sm leading-6 text-[#756448]">
                                Your report has been generated and saved to the Bees360 database. You can now review the totals by date and batch.
                            </DialogDescription>
                            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#f0dfbd] bg-[#fff8e8] p-4 text-center">
                                <div>
                                    <p className="text-2xl font-extrabold text-[#9e5b00]">{flash?.importSummary?.saved ?? 0}</p>
                                    <p className="mt-1 text-xs font-bold text-[#806f59] uppercase">Rows saved</p>
                                </div>
                                <div className="border-l border-[#ead6aa]">
                                    <p className="text-2xl font-extrabold text-[#9e5b00]">{formatDate(reportDate)}</p>
                                    <p className="mt-1 text-xs font-bold text-[#806f59] uppercase">Report date</p>
                                </div>
                            </div>
                        </DialogHeader>
                        <DialogFooter className="px-7 pt-2 pb-7 sm:justify-center">
                            <Button
                                type="button"
                                className="min-w-32 bg-[#b96c00] font-bold text-white hover:bg-[#925400]"
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    setPageTab('reports');
                                }}
                            >
                                OK
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Operations reporting</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">Daily reports</h1>
                        <p className="mt-2 text-sm text-[#776a57]">Review batch production or import the latest Active and Closed workbooks.</p>
                    </div>
                    <span
                        className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${hasImportedData ? 'border-[#b9dfbd] bg-[#edfaeb] text-[#28703c]' : 'border-[#eed8a9] bg-[#fff5dc] text-[#936000]'}`}
                    >
                        <span className={`size-2 rounded-full ${hasImportedData ? 'bg-[#36934b]' : 'bg-[#e29a17]'}`} />
                        {hasImportedData ? 'Imported report data' : 'Sample report data'}
                    </span>
                </section>
                {flash?.importSummary && (
                    <div className="flex items-start gap-3 rounded-2xl border border-[#b9dfbd] bg-[#edfaeb] px-5 py-4 text-sm text-[#286a39]">
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                        <p>
                            <strong>
                                {flash.importSummary.saved} report row{flash.importSummary.saved === 1 ? '' : 's'}
                            </strong>{' '}
                            saved.{' '}
                            {flash.importSummary.ignored > 0
                                ? `${flash.importSummary.ignored} row${flash.importSummary.ignored === 1 ? '' : 's'} were ignored because they are outside the approved processor list or are not Exterior / 4-Point reports.`
                                : 'Only the approved processors and report types were saved.'}
                        </p>
                    </div>
                )}
                <div className="flex w-fit rounded-xl border border-[#e2d1b8] bg-[#fffdf8] p-1" role="tablist" aria-label="Reports area">
                    <Button
                        type="button"
                        role="tab"
                        aria-selected={pageTab === 'reports'}
                        onClick={() => setPageTab('reports')}
                        className={`h-10 gap-2 rounded-lg px-4 text-sm font-bold ${pageTab === 'reports' ? 'bg-[#b96c00] text-white hover:bg-[#925400]' : 'bg-transparent text-[#806f59] hover:bg-[#fff0d1]'}`}
                    >
                        <PackageCheck className="size-4" /> Daily reports
                    </Button>
                    <Button
                        type="button"
                        role="tab"
                        aria-selected={pageTab === 'import'}
                        onClick={() => setPageTab('import')}
                        className={`h-10 gap-2 rounded-lg px-4 text-sm font-bold ${pageTab === 'import' ? 'bg-[#4a351d] text-white hover:bg-[#2f2112]' : 'bg-transparent text-[#806f59] hover:bg-[#fff0d1]'}`}
                    >
                        <Upload className="size-4" /> Import Excel
                    </Button>
                    <Button
                        asChild
                        type="button"
                        className="h-10 gap-2 rounded-lg bg-transparent px-4 text-sm font-bold text-[#806f59] hover:bg-[#fff0d1]"
                    >
                        <Link href="/operations/reports/platform-pulls" prefetch>
                            <ChartNoAxesCombined className="size-4" /> Platform Pulls
                        </Link>
                    </Button>
                </div>
                {pageTab === 'import' ? (
                    <section className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
                        <div className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                            <div className="flex items-start gap-4">
                                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fff0c9] text-[#a96300]">
                                    <FileSpreadsheet className="size-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#342615]">Import report workbooks</h2>
                                    <p className="mt-1 text-sm leading-6 text-[#806f59]">
                                        Upload Active, Closed, or both Excel files. The available file is enough to generate a report; matching data
                                        is stacked safely instead of duplicated.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {(
                                    [
                                        ['active', 'Active workbook', activeFile, setActiveFile, 'Choose ACTIVE'],
                                        ['closed', 'Closed workbook', closedFile, setClosedFile, 'Choose CLOSED'],
                                    ] as const
                                ).map(([source, label, file, setFile, example]) => (
                                    <label
                                        key={source}
                                        className="group cursor-pointer rounded-2xl border border-dashed border-[#d8bd8c] bg-[#fffaf1] p-5 transition hover:border-[#b96c00] hover:bg-[#fff4dd]"
                                    >
                                        <input
                                            key={`${source}-${file?.name ?? 'empty'}`}
                                            type="file"
                                            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                            className="sr-only"
                                            onChange={(event) => {
                                                setFile(event.target.files?.[0] ?? null);
                                                setUploadError(null);
                                            }}
                                        />
                                        <FileSpreadsheet className="size-7 text-[#b96c00]" />
                                        <p className="mt-4 font-bold text-[#4a3821]">{label}</p>
                                        <p className="mt-1 text-xs text-[#806f59]">{file ? file.name : example}</p>
                                        <span className="mt-4 inline-flex rounded-lg border border-[#dfc595] bg-white px-3 py-1.5 text-xs font-bold text-[#8b5b11] group-hover:bg-[#fff7e9]">
                                            {file ? 'Replace file' : 'Choose .xlsx file'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {uploadError && (
                                <p className="mt-4 rounded-xl border border-[#f0c5bc] bg-[#fff0ec] px-4 py-3 text-sm font-medium text-[#ae361f]">
                                    {uploadError}
                                </p>
                            )}
                            <div className="mt-6 flex flex-col gap-3 border-t border-[#f0e5d4] pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs leading-5 text-[#806f59]">
                                    Required columns: Project ID, Insured by, Inspection Type, First Assembled by, and First Assembled Time.
                                </p>
                                <Button
                                    type="button"
                                    disabled={isUploading}
                                    onClick={confirmImport}
                                    className="h-11 gap-2 bg-[#b96c00] px-5 font-bold text-white hover:bg-[#925400] disabled:bg-[#d5b477]"
                                >
                                    <Database className="size-4" />
                                    {isUploading ? 'Generating report…' : 'Generate & save report'}
                                </Button>
                            </div>
                        </div>
                        <aside className="rounded-2xl border border-[#eadbc6] bg-[#4a351d] p-6 text-[#fff8e7] shadow-[0_8px_30px_rgb(88,57,18,0.12)]">
                            <p className="text-xs font-bold tracking-[0.16em] text-[#f2ca71] uppercase">Safe import rules</p>
                            <h2 className="mt-3 text-xl font-bold">Focused reporting, ready for review.</h2>
                            <ul className="mt-5 grid gap-4 text-sm leading-6 text-[#f8e9c7]">
                                <li>
                                    <strong className="text-white">21 approved processors</strong> are assigned automatically to Batch 1, 2, or 3.
                                </li>
                                <li>
                                    Only <strong className="text-white">Exterior</strong> and <strong className="text-white">4-Point</strong>{' '}
                                    inspections are counted.
                                </li>
                                <li>Re-importing a workbook updates its matching rows instead of creating duplicates.</li>
                            </ul>
                        </aside>
                    </section>
                ) : (
                    <>
                        <section className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-4 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-5">
                            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                                <div className="grid gap-1.5">
                                    <span className="px-1 text-xs font-bold text-[#6d5735]">Report type</span>
                                    <div className="flex rounded-xl border border-[#e2d1b8] bg-[#fffaf1] p-1">
                                        <Button
                                            type="button"
                                            onClick={() => setReportType('midday')}
                                            className={`h-10 gap-2 rounded-lg px-4 text-sm font-bold ${reportType === 'midday' ? 'bg-[#b96c00] text-white hover:bg-[#925400]' : 'bg-transparent text-[#806f59] hover:bg-[#fff0d1]'}`}
                                        >
                                            <Sun className="size-4" /> Mid-Day Report
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => setReportType('endOfDay')}
                                            className={`h-10 gap-2 rounded-lg px-4 text-sm font-bold ${reportType === 'endOfDay' ? 'bg-[#b96c00] text-white hover:bg-[#925400]' : 'bg-transparent text-[#806f59] hover:bg-[#fff0d1]'}`}
                                        >
                                            <Moon className="size-4" /> End of Day
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid gap-1.5">
                                    <span className="px-1 text-xs font-bold text-[#6d5735]">Select batch</span>
                                    <div className="flex flex-wrap gap-2">
                                        {(
                                            [
                                                ['batch1', 'Batch 1'],
                                                ['batch2', 'Batch 2'],
                                                ['batch3', 'Batch 3'],
                                                ['overall', 'Overall'],
                                            ] as const
                                        ).map(([value, label]) => (
                                            <Button
                                                key={value}
                                                type="button"
                                                onClick={() => setBatch(value)}
                                                className={`h-9 rounded-lg px-4 text-sm font-bold ${batch === value ? 'bg-[#4a351d] text-white hover:bg-[#2f2112]' : 'border border-[#d9c7a9] bg-white text-[#705b3d] hover:bg-[#fff4d8]'}`}
                                            >
                                                {value === 'overall' && <Layers3 className="size-4" />}
                                                {label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="w-full xl:w-64">
                                    <BeesDatePicker
                                        id="daily-report-date"
                                        label="Pick a date"
                                        value={reportDate}
                                        min="2026-01-01"
                                        max={philippinesToday}
                                        onChange={setReportDate}
                                    />
                                </div>
                            </div>
                        </section>
                        <section className="grid gap-4 md:grid-cols-3">
                            {[
                                { label: 'Report view', value: reportLabel, icon: PackageCheck, tone: 'bg-[#fff0c9] text-[#a96300]' },
                                {
                                    label: 'Selected batch',
                                    value: batch === 'overall' ? 'All batches' : `Batch ${batch.at(-1)}`,
                                    icon: Layers3,
                                    tone: 'bg-[#e6f5e5] text-[#28703c]',
                                },
                                { label: 'Report date', value: formatDate(reportDate), icon: CalendarDays, tone: 'bg-[#ffeadf] text-[#b34d10]' },
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
                                        <p className="mt-4 text-sm text-[#806f59]">{metric.label}</p>
                                        <p className="mt-1 text-lg font-bold text-[#342615]">{metric.value}</p>
                                    </article>
                                );
                            })}
                        </section>
                        <section className="overflow-hidden rounded-2xl border border-[#eadbc6] bg-[#fffdf8] shadow-[0_8px_30px_rgb(88,57,18,0.08)]">
                            <div className="flex flex-col gap-3 border-b border-[#f0e5d4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div>
                                    <h2 className="font-bold text-[#342615]">{reportLabel}</h2>
                                    <p className="mt-1 text-sm text-[#806f59]">
                                        {batch === 'overall' ? 'Combined Batch 1, Batch 2, and Batch 3' : `Batch ${batch.at(-1)} processor group`} ·{' '}
                                        {formatDate(reportDate)} · {reportType === 'midday' ? 'PH time: 12:00 AM–12:15 PM' : 'Full PH day'}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={exportCombinedReport}
                                    className="h-10 w-full gap-2 bg-[#4a351d] px-4 font-bold text-white hover:bg-[#2f2112] sm:w-auto"
                                >
                                    <Download className="size-4" /> Export to Excel
                                </Button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[900px] text-left text-sm">
                                    <thead className="bg-[#3b2915] text-xs tracking-wide text-[#fff8e7] uppercase">
                                        <tr>
                                            <th className="px-5 py-4">Names</th>
                                            <th className="px-5 py-4">N-Name</th>
                                            <th className="px-5 py-4">Batch</th>
                                            <th className="px-5 py-4">Day</th>
                                            <th className="px-5 py-4 text-center">Gen Ext</th>
                                            <th className="px-5 py-4 text-center">4-Point</th>
                                            <th className="bg-[#2f2112] px-5 py-4 text-center">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f1e7d8]">
                                        {rows.map((row) => (
                                            <tr key={row.name} className="odd:bg-[#fffdf8] even:bg-[#fff8e8]">
                                                <td className="px-5 py-4 font-bold text-[#4a3821]">{row.name}</td>
                                                <td className="px-5 py-4 text-[#806f59]">{row.nickname}</td>
                                                <td className="px-5 py-4 text-[#806f59]">Batch {row.batch}</td>
                                                <td className="px-5 py-4 text-[#806f59]">{formatDate(reportDate)}</td>
                                                <td className="px-5 py-4 text-center font-semibold text-[#4a3821]">{row.generalExtensions}</td>
                                                <td className="px-5 py-4 text-center font-semibold text-[#4a3821]">{row.fourPoint}</td>
                                                <td className="bg-[#fff1cc] px-5 py-4 text-center font-extrabold text-[#694400]">
                                                    {row.generalExtensions + row.fourPoint}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="border-t-[3px] border-[#4a351d] bg-[#fff1cc]">
                                        <tr>
                                            <td colSpan={4} className="px-5 py-4 text-center font-extrabold text-[#4a3821] uppercase">
                                                Combined total
                                            </td>
                                            <td className="px-5 py-4 text-center font-extrabold text-[#8b620f]">{totals.generalExtensions}</td>
                                            <td className="px-5 py-4 text-center font-extrabold text-[#8b620f]">{totals.fourPoint}</td>
                                            <td className="bg-[#f2cf72] px-5 py-4 text-center text-lg font-extrabold text-[#5a3900]">
                                                {totals.generalExtensions + totals.fourPoint}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
