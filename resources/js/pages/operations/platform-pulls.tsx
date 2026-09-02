import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { BeesDatePicker, formatDate, philippinesToday } from '@/pages/dashboard';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarClock, CheckCircle2, Database, Download, PackageCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx-js-style';

type Source = 'active' | 'closed';
type CheckpointId = '10am' | '12nn' | '2pm' | '4pm' | '5pm';
type BatchFilter = 'all' | 1 | 2 | 3;
type ReportEntry = {
    source: Source;
    batch: number;
    processorName: string;
    projectId: string;
    reportCategory: 'general_exterior' | 'four_point';
    assembledTime: string | null;
};
type ProcessorRow = {
    name: string;
    nickname: string;
    batch: number;
    activeGeneralExterior: number;
    activeFourPoint: number;
    closedGeneralExterior: number;
    closedFourPoint: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations dashboard', href: '/dashboard' },
    { title: 'Reports', href: '/operations/reports' },
    { title: 'Platform Pulls', href: '/operations/reports/platform-pulls' },
];
const checkpoints: Array<{ id: CheckpointId; label: string; start: string | null; cutoff: string; rangeLabel: string; minutes: number }> = [
    { id: '10am', label: '10:00 AM', start: null, cutoff: '10:00', rangeLabel: '12:00 AM–10:00 AM', minutes: 10 * 60 },
    { id: '12nn', label: '12:00 NN', start: '10:00', cutoff: '12:00', rangeLabel: 'After 10:00 AM–12:00 NN', minutes: 12 * 60 },
    { id: '2pm', label: '2:00 PM', start: '12:00', cutoff: '14:00', rangeLabel: 'After 12:00 NN–2:00 PM', minutes: 14 * 60 },
    { id: '4pm', label: '4:00 PM', start: '14:00', cutoff: '16:00', rangeLabel: 'After 2:00 PM–4:00 PM', minutes: 16 * 60 },
    { id: '5pm', label: '5:00 PM', start: '16:00', cutoff: '17:00', rangeLabel: 'After 4:00 PM–5:00 PM', minutes: 17 * 60 },
];
const processorRoster = [
    { name: 'Christer John C. Gozon', nickname: 'Chris', batch: 1 },
    { name: 'Lourdes M. Completado', nickname: 'Lourdes', batch: 1 },
    { name: 'Elacio M. Santos Jr.', nickname: 'Elacio', batch: 1 },
    { name: 'Jhun Cervantes', nickname: 'Jhun', batch: 1 },
    { name: 'Reginald King Palo', nickname: 'King', batch: 1 },
    { name: 'Allan Layug', nickname: 'Allan', batch: 2 },
    { name: 'Arianne Joy Lopez', nickname: 'Arianne', batch: 2 },
    { name: 'Emma Alegre', nickname: 'Emma', batch: 2 },
    { name: 'Marie Anthonette Moog', nickname: 'Tonette', batch: 2 },
    { name: 'Mc Oliver Noble', nickname: 'Oliver', batch: 2 },
    { name: 'Rheven Violet Aladin', nickname: 'Violet', batch: 2 },
    { name: 'Wengmir A. Africa', nickname: 'Wengmir', batch: 2 },
    { name: 'Chrismer Flores', nickname: 'Chrismer', batch: 3 },
    { name: 'Denn Charles Zafe', nickname: 'Denn', batch: 3 },
    { name: 'Ivan Mendoza', nickname: 'Ivan', batch: 3 },
    { name: 'Jerica Matic', nickname: 'Jerica', batch: 3 },
    { name: 'Kristine Jewel Espiritu', nickname: 'Kristine', batch: 3 },
    { name: 'Mac Evens T. Payongayong', nickname: 'Mac', batch: 3 },
    { name: 'Nikko Adrian Dungca', nickname: 'Nikko', batch: 3 },
    { name: 'Rainier Sta Ana', nickname: 'Rainier', batch: 3 },
    { name: 'Tracy John Josafat', nickname: 'Tracy', batch: 3 },
] as const;

function currentCheckpoint(): CheckpointId {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date());
    const minutes =
        Number(parts.find((part) => part.type === 'hour')?.value ?? 0) * 60 + Number(parts.find((part) => part.type === 'minute')?.value ?? 0);

    return checkpoints.reduce<CheckpointId>((latest, checkpoint) => (checkpoint.minutes <= minutes ? checkpoint.id : latest), '10am');
}

function isWithinCheckpoint(entry: ReportEntry, start: string | null, cutoff: string): boolean {
    return entry.assembledTime !== null && (start === null || entry.assembledTime > start) && entry.assembledTime <= cutoff;
}

function entriesAtCheckpoint(reportEntries: ReportEntry[], start: string | null, cutoff: string): ReportEntry[] {
    return reportEntries.filter((entry) => isWithinCheckpoint(entry, start, cutoff));
}

function rowsAtCheckpoint(reportEntries: ReportEntry[], start: string | null, cutoff: string): ProcessorRow[] {
    return processorRoster.map((processor) => {
        const entries = reportEntries.filter((entry) => entry.processorName === processor.name && isWithinCheckpoint(entry, start, cutoff));
        const count = (source: Source, category: ReportEntry['reportCategory']) =>
            new Set(
                entries
                    .filter((entry) => entry.source === source && entry.reportCategory === category)
                    .map((entry) => `${entry.projectId}|${entry.reportCategory}`),
            ).size;

        return {
            ...processor,
            activeGeneralExterior: count('active', 'general_exterior'),
            activeFourPoint: count('active', 'four_point'),
            closedGeneralExterior: count('closed', 'general_exterior'),
            closedFourPoint: count('closed', 'four_point'),
        };
    });
}

function totalsFor(rows: ProcessorRow[]) {
    return rows.reduce(
        (sum, row) => ({
            activeGeneralExterior: sum.activeGeneralExterior + row.activeGeneralExterior,
            activeFourPoint: sum.activeFourPoint + row.activeFourPoint,
            closedGeneralExterior: sum.closedGeneralExterior + row.closedGeneralExterior,
            closedFourPoint: sum.closedFourPoint + row.closedFourPoint,
        }),
        { activeGeneralExterior: 0, activeFourPoint: 0, closedGeneralExterior: 0, closedFourPoint: 0 },
    );
}

export default function PlatformPulls({ reportEntries = [], initialReportDate }: { reportEntries?: ReportEntry[]; initialReportDate: string }) {
    const [reportDate, setReportDate] = useState(initialReportDate);
    const [checkpoint, setCheckpoint] = useState<CheckpointId>(() => currentCheckpoint());
    const [batch, setBatch] = useState<BatchFilter>('all');
    const selectedCheckpoint = checkpoints.find((item) => item.id === checkpoint) ?? checkpoints[0];
    const selectedEntries = useMemo(
        () => entriesAtCheckpoint(reportEntries, selectedCheckpoint.start, selectedCheckpoint.cutoff),
        [reportEntries, selectedCheckpoint.start, selectedCheckpoint.cutoff],
    );
    const allRows = useMemo(
        () => rowsAtCheckpoint(reportEntries, selectedCheckpoint.start, selectedCheckpoint.cutoff),
        [reportEntries, selectedCheckpoint.start, selectedCheckpoint.cutoff],
    );
    const rows = batch === 'all' ? allRows : allRows.filter((row) => row.batch === batch);
    const totals = totalsFor(rows);
    const hasStoredData = reportEntries.length > 0;
    const selectedHasData = selectedEntries.length > 0;

    function changeReportDate(value: string) {
        setReportDate(value);
        router.get('/operations/reports/platform-pulls', { date: value }, { preserveScroll: true, preserveState: false, replace: true });
    }

    function exportPlatformPulls() {
        if (!hasStoredData) return;

        type ExportSection = {
            checkpointRow: number;
            headerRow: number;
            subheaderRow: number;
            firstDataRow: number;
            lastDataRow: number;
            totalRow: number;
            rows: ProcessorRow[];
            hasData: boolean;
        };
        const sheetRows: Array<Array<string | number>> = [
            ['BEES360 | PLATFORM PULL REPORT'],
            [`${formatDate(reportDate)} · 10:00 AM, 12:00 NN, 2:00 PM, 4:00 PM and 5:00 PM · PH Time`],
            [],
        ];
        const sections: ExportSection[] = [];

        checkpoints.forEach((item, checkpointIndex) => {
            const exportRows = rowsAtCheckpoint(reportEntries, item.start, item.cutoff);
            const checkpointHasData = entriesAtCheckpoint(reportEntries, item.start, item.cutoff).length > 0;
            const checkpointRow = sheetRows.length + 1;
            sheetRows.push([
                checkpointHasData
                    ? `${item.label} PH TIME · ${item.rangeLabel}`
                    : `${item.label} PH TIME · NO DATA FOR THIS INTERVAL (${item.rangeLabel})`,
            ]);
            const headerRow = sheetRows.length + 1;
            sheetRows.push(['PROCESSOR', 'N-NAME', 'BATCH', 'ACTIVE', '', '', 'CLOSED', '', '', 'COMBINED']);
            const subheaderRow = sheetRows.length + 1;
            sheetRows.push(['', '', '', 'GEN EXT', '4-POINT', 'TOTAL', 'GEN EXT', '4-POINT', 'TOTAL', 'TOTAL']);
            const firstDataRow = sheetRows.length + 1;
            exportRows.forEach((row) => {
                sheetRows.push([
                    row.name,
                    row.nickname,
                    `Batch ${row.batch}`,
                    checkpointHasData ? row.activeGeneralExterior : '',
                    checkpointHasData ? row.activeFourPoint : '',
                    checkpointHasData ? 0 : '',
                    checkpointHasData ? row.closedGeneralExterior : '',
                    checkpointHasData ? row.closedFourPoint : '',
                    checkpointHasData ? 0 : '',
                    checkpointHasData ? 0 : '',
                ]);
            });
            const lastDataRow = sheetRows.length;
            const totalRow = sheetRows.length + 1;
            sheetRows.push([
                `${item.label} PLATFORM PULL TOTAL`,
                '',
                '',
                checkpointHasData ? 0 : '',
                checkpointHasData ? 0 : '',
                checkpointHasData ? 0 : '',
                checkpointHasData ? 0 : '',
                checkpointHasData ? 0 : '',
                checkpointHasData ? 0 : '',
                checkpointHasData ? 0 : '',
            ]);
            if (checkpointIndex < checkpoints.length - 1) sheetRows.push([]);
            sections.push({
                checkpointRow,
                headerRow,
                subheaderRow,
                firstDataRow,
                lastDataRow,
                totalRow,
                rows: exportRows,
                hasData: checkpointHasData,
            });
        });

        const worksheet = XLSX.utils.aoa_to_sheet(sheetRows) as XLSX.WorkSheet;
        const white = {
            font: { name: 'Century Gothic', sz: 10, color: { rgb: '4A3821' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
        };
        const title = {
            alignment: { horizontal: 'center', vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: 'FFF8E7' } },
            fill: { patternType: 'solid', fgColor: { rgb: '4A351D' } },
        };
        const subtitle = {
            alignment: { horizontal: 'center', vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '805C24' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFF1CC' } },
        };
        const header = {
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: 'FFF8E7' } },
            fill: { patternType: 'solid', fgColor: { rgb: '3B2915' } },
            border: { bottom: { style: 'thin', color: { rgb: '80603A' } } },
        };
        const activeHeader = { ...header, fill: { patternType: 'solid', fgColor: { rgb: '8B5A12' } } };
        const closedHeader = { ...header, fill: { patternType: 'solid', fgColor: { rgb: '604321' } } };
        const checkpointStyle = {
            alignment: { horizontal: 'center', vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '5A3900' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'F2CF72' } },
        };
        const body = {
            alignment: { vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, color: { rgb: '4A3821' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
            border: { bottom: { style: 'thin', color: { rgb: 'F0E5D4' } } },
        };
        const number = { ...body, alignment: { horizontal: 'center', vertical: 'center' }, numFmt: '#,##0' };
        const activeTotal = {
            ...number,
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '7D5100' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFF1CC' } },
        };
        const closedTotal = {
            ...number,
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '4A351D' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'F8E8CC' } },
        };
        const combinedTotal = {
            ...number,
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '5A3900' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'F2CF72' } },
        };
        const footer = { ...combinedTotal, border: { top: { style: 'medium', color: { rgb: '4A351D' } } } };

        for (let row = 1; row <= sheetRows.length; row += 1) {
            for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) {
                const address = `${column}${row}`;
                worksheet[address] ??= { t: 's', v: '' };
                worksheet[address].s = white;
            }
        }
        worksheet['!merges'] = [
            XLSX.utils.decode_range('A1:J1'),
            XLSX.utils.decode_range('A2:J2'),
            ...sections.flatMap((section) => [
                XLSX.utils.decode_range(`A${section.checkpointRow}:J${section.checkpointRow}`),
                XLSX.utils.decode_range(`A${section.headerRow}:A${section.subheaderRow}`),
                XLSX.utils.decode_range(`B${section.headerRow}:B${section.subheaderRow}`),
                XLSX.utils.decode_range(`C${section.headerRow}:C${section.subheaderRow}`),
                XLSX.utils.decode_range(`D${section.headerRow}:F${section.headerRow}`),
                XLSX.utils.decode_range(`G${section.headerRow}:I${section.headerRow}`),
                XLSX.utils.decode_range(`J${section.headerRow}:J${section.subheaderRow}`),
                XLSX.utils.decode_range(`A${section.totalRow}:C${section.totalRow}`),
            ]),
        ];
        worksheet.A1.s = title;
        worksheet.A2.s = subtitle;

        sections.forEach((section) => {
            worksheet[`A${section.checkpointRow}`].s = checkpointStyle;
            for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) {
                worksheet[`${column}${section.headerRow}`].s =
                    column >= 'D' && column <= 'F' ? activeHeader : column >= 'G' && column <= 'I' ? closedHeader : header;
                worksheet[`${column}${section.subheaderRow}`].s =
                    column >= 'D' && column <= 'F' ? activeHeader : column >= 'G' && column <= 'I' ? closedHeader : header;
            }
            section.rows.forEach((rowValues, index) => {
                const row = section.firstDataRow + index;
                worksheet[`A${row}`].s = body;
                worksheet[`B${row}`].s = body;
                worksheet[`C${row}`].s = { ...body, alignment: { horizontal: 'center', vertical: 'center' } };
                for (const column of ['D', 'E', 'G', 'H']) worksheet[`${column}${row}`].s = number;
                if (!section.hasData) {
                    for (const column of ['D', 'E', 'F', 'G', 'H', 'I', 'J']) {
                        worksheet[`${column}${row}`] = { t: 's', v: '', s: number };
                    }
                    return;
                }
                const active = rowValues.activeGeneralExterior + rowValues.activeFourPoint;
                const closed = rowValues.closedGeneralExterior + rowValues.closedFourPoint;
                worksheet[`F${row}`] = { t: 'n', f: `D${row}+E${row}`, v: active, s: activeTotal };
                worksheet[`I${row}`] = { t: 'n', f: `G${row}+H${row}`, v: closed, s: closedTotal };
                worksheet[`J${row}`] = { t: 'n', f: `F${row}+I${row}`, v: active + closed, s: combinedTotal };
            });

            for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) worksheet[`${column}${section.totalRow}`].s = footer;
            if (!section.hasData) {
                for (const column of ['D', 'E', 'F', 'G', 'H', 'I', 'J']) {
                    worksheet[`${column}${section.totalRow}`] = { t: 's', v: '', s: footer };
                }
                return;
            }

            const checkpointTotals = totalsFor(section.rows);
            const footerValues: Record<string, number> = {
                D: checkpointTotals.activeGeneralExterior,
                E: checkpointTotals.activeFourPoint,
                F: checkpointTotals.activeGeneralExterior + checkpointTotals.activeFourPoint,
                G: checkpointTotals.closedGeneralExterior,
                H: checkpointTotals.closedFourPoint,
                I: checkpointTotals.closedGeneralExterior + checkpointTotals.closedFourPoint,
                J:
                    checkpointTotals.activeGeneralExterior +
                    checkpointTotals.activeFourPoint +
                    checkpointTotals.closedGeneralExterior +
                    checkpointTotals.closedFourPoint,
            };
            for (const column of ['D', 'E', 'F', 'G', 'H', 'I', 'J']) {
                worksheet[`${column}${section.totalRow}`] = {
                    t: 'n',
                    f: `SUM(${column}${section.firstDataRow}:${column}${section.lastDataRow})`,
                    v: footerValues[column],
                    s: footer,
                };
            }
        });

        worksheet['!cols'] = [
            { wch: 31 },
            { wch: 15 },
            { wch: 12 },
            { wch: 13 },
            { wch: 12 },
            { wch: 12 },
            { wch: 13 },
            { wch: 12 },
            { wch: 12 },
            { wch: 14 },
        ];
        worksheet['!rows'] = [{ hpt: 27 }, { hpt: 20 }, { hpt: 8 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'All Platform Pulls');
        XLSX.writeFile(workbook, `Bees360_All_Platform_Pulls_${reportDate}.xlsx`, { compression: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Platform Pulls" />
            <div className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 md:p-8">
                <section className="rounded-3xl border border-[#ead7b9] bg-white p-6 shadow-[0_18px_50px_rgba(83,55,22,0.08)] md:p-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-extrabold tracking-[0.18em] text-[#a96500] uppercase">Operations reporting</p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#342615]">Platform Pulls</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#776a57]">
                                Automatically generated from the Active and Closed report records already stored in the database.
                            </p>
                        </div>
                        <Button asChild variant="outline" className="border-[#d8bd8c] bg-[#fffaf1] font-bold text-[#75552d] hover:bg-[#fff0d1]">
                            <Link href="/operations/reports" prefetch>
                                <PackageCheck className="size-4" /> Daily Reports
                            </Link>
                        </Button>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div className="flex items-start gap-4 rounded-2xl border border-[#b9dfbd] bg-[#edfaeb] p-5">
                        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#d9f1d9] text-[#28703c]">
                            <Database className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs font-extrabold tracking-[0.14em] text-[#28703c] uppercase">Database connected</p>
                            <h2 className="mt-1 font-black text-[#2d4e32]">No additional upload required</h2>
                            <p className="mt-1 text-sm text-[#52735a]">
                                {hasStoredData
                                    ? `${reportEntries.length} saved report records are available for this date.`
                                    : 'No saved Active or Closed report records were found for this date.'}
                            </p>
                        </div>
                    </div>
                    <div className="w-full rounded-2xl border border-[#eadbc6] bg-white p-4 md:w-72">
                        <BeesDatePicker
                            id="platform-pull-date"
                            label="Platform pull date"
                            value={reportDate}
                            min="2026-01-01"
                            max={philippinesToday}
                            onChange={changeReportDate}
                        />
                    </div>
                </section>

                <section className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)]">
                    <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-[#fff0c9] text-[#a96300]">
                            <CalendarClock className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs font-extrabold tracking-[0.14em] text-[#9b5d00] uppercase">PH reporting checkpoints</p>
                            <p className="mt-1 text-xs text-[#806f59]">Each checkpoint shows only reports assembled within its PH-time interval.</p>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {checkpoints.map((item) => (
                            <Button
                                key={item.id}
                                type="button"
                                onClick={() => setCheckpoint(item.id)}
                                className={`h-10 gap-2 rounded-lg px-4 font-bold ${checkpoint === item.id ? 'bg-[#4a351d] text-white hover:bg-[#2f2112]' : 'border border-[#d9c7a9] bg-white text-[#705b3d] hover:bg-[#fff4d8]'}`}
                            >
                                {checkpoint === item.id && <CheckCircle2 className="size-4 text-[#f2cf72]" />}
                                {item.label}
                            </Button>
                        ))}
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#eadbc6] bg-white shadow-[0_8px_30px_rgb(88,57,18,0.08)]">
                    <div className="flex flex-col gap-4 border-b border-[#eadbc6] bg-[#fff9ed] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="font-black text-[#342615]">{selectedCheckpoint.label} processor platform pull</h2>
                            <p className="mt-1 text-xs text-[#806f59]">
                                {formatDate(reportDate)} · PH Time · {selectedCheckpoint.rangeLabel}
                            </p>
                            {!selectedHasData && (
                                <p className="mt-2 inline-flex rounded-full border border-[#e5c98e] bg-[#fff4d4] px-3 py-1 text-xs font-extrabold text-[#8a5700]">
                                    No data for this checkpoint interval
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(['all', 1, 2, 3] as const).map((value) => (
                                <Button
                                    key={value}
                                    type="button"
                                    onClick={() => setBatch(value)}
                                    className={`h-9 rounded-lg px-3 text-xs font-bold ${batch === value ? 'bg-[#4a351d] text-white hover:bg-[#2f2112]' : 'border border-[#d9c7a9] bg-white text-[#705b3d] hover:bg-[#fff4d8]'}`}
                                >
                                    {value === 'all' ? 'All Batches' : `Batch ${value}`}
                                </Button>
                            ))}
                            <Button
                                type="button"
                                disabled={!hasStoredData}
                                onClick={exportPlatformPulls}
                                title="Export all five PH-time platform pulls for the selected date."
                                className="h-9 bg-[#b96c00] px-4 text-xs font-bold text-white hover:bg-[#925400] disabled:opacity-45"
                            >
                                <Download className="size-4" /> Export All Times
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-left text-sm">
                            <thead className="bg-[#3b2915] text-xs tracking-wide text-[#fff8e7] uppercase">
                                <tr>
                                    <th rowSpan={2} className="px-5 py-4">
                                        Processor
                                    </th>
                                    <th rowSpan={2} className="px-4 py-4 text-center">
                                        Batch
                                    </th>
                                    <th colSpan={3} className="bg-[#8b5a12] px-4 py-3 text-center">
                                        Active
                                    </th>
                                    <th colSpan={3} className="bg-[#604321] px-4 py-3 text-center">
                                        Closed
                                    </th>
                                    <th rowSpan={2} className="bg-[#2f2112] px-4 py-4 text-center">
                                        Combined Total
                                    </th>
                                </tr>
                                <tr>
                                    {['Gen Ext', '4-Point', 'Total', 'Gen Ext', '4-Point', 'Total'].map((label, index) => (
                                        <th
                                            key={`${label}-${index}`}
                                            className={`px-4 py-3 text-center ${index < 3 ? 'bg-[#8b5a12]' : 'bg-[#604321]'}`}
                                        >
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0e5d4]">
                                {rows.map((row) => {
                                    const activeTotal = row.activeGeneralExterior + row.activeFourPoint;
                                    const closedTotal = row.closedGeneralExterior + row.closedFourPoint;
                                    return (
                                        <tr key={row.name} className="bg-white hover:bg-[#fffbf3]">
                                            <td className="px-5 py-3.5 font-bold text-[#4a3821]">{row.name}</td>
                                            <td className="px-4 py-3.5 text-center text-[#806f59]">Batch {row.batch}</td>
                                            <td className="px-4 py-3.5 text-center font-semibold text-[#4a3821]">
                                                {selectedHasData ? row.activeGeneralExterior : '—'}
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-semibold text-[#4a3821]">
                                                {selectedHasData ? row.activeFourPoint : '—'}
                                            </td>
                                            <td className="bg-[#fff7e2] px-4 py-3.5 text-center font-black text-[#8b5a12]">
                                                {selectedHasData ? activeTotal : '—'}
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-semibold text-[#4a3821]">
                                                {selectedHasData ? row.closedGeneralExterior : '—'}
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-semibold text-[#4a3821]">
                                                {selectedHasData ? row.closedFourPoint : '—'}
                                            </td>
                                            <td className="bg-[#f8ead4] px-4 py-3.5 text-center font-black text-[#604321]">
                                                {selectedHasData ? closedTotal : '—'}
                                            </td>
                                            <td className="bg-[#fff0c5] px-4 py-3.5 text-center font-black text-[#694400]">
                                                {selectedHasData ? activeTotal + closedTotal : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="border-t-[3px] border-[#4a351d] bg-[#fff0c5] font-black text-[#4a351d]">
                                <tr>
                                    <td colSpan={2} className="px-5 py-4 text-center uppercase">
                                        Platform pull total
                                    </td>
                                    <td className="px-4 py-4 text-center">{selectedHasData ? totals.activeGeneralExterior : '—'}</td>
                                    <td className="px-4 py-4 text-center">{selectedHasData ? totals.activeFourPoint : '—'}</td>
                                    <td className="px-4 py-4 text-center">
                                        {selectedHasData ? totals.activeGeneralExterior + totals.activeFourPoint : '—'}
                                    </td>
                                    <td className="px-4 py-4 text-center">{selectedHasData ? totals.closedGeneralExterior : '—'}</td>
                                    <td className="px-4 py-4 text-center">{selectedHasData ? totals.closedFourPoint : '—'}</td>
                                    <td className="px-4 py-4 text-center">
                                        {selectedHasData ? totals.closedGeneralExterior + totals.closedFourPoint : '—'}
                                    </td>
                                    <td className="bg-[#f2cf72] px-4 py-4 text-center text-base">
                                        {selectedHasData
                                            ? totals.activeGeneralExterior +
                                              totals.activeFourPoint +
                                              totals.closedGeneralExterior +
                                              totals.closedFourPoint
                                            : '—'}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
