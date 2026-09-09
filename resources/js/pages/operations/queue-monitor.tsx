import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { assertWorksheetRowLimit, readSpreadsheet } from '@/lib/spreadsheet-upload';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    CalendarDays,
    Check,
    CheckCircle2,
    CircleCheckBig,
    Clock3,
    Download,
    FileCheck2,
    FileSpreadsheet,
    Gauge,
    History,
    Inbox,
    Minus,
    ShieldCheck,
    Sparkles,
    TrendingDown,
    TrendingUp,
    TriangleAlert,
    Upload,
    UsersRound,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

type CheckpointId = 'start' | '11am' | '2pm' | '4pm';
type QueueDetailMetric = 'waiting' | 'aging' | 'completion';
type BatchQueue = { batch: number; team: string; waiting: number; processed: number; aging: number };
type QueueSnapshot = { waiting: number; processed: number; aging: number; batches: BatchQueue[] };
type ProcessorDefinition = { name: string; batch: number; aliases: string[] };
type ProcessorQueue = ProcessorDefinition & { generalExterior: number; fourPoint: number; other: number; total: number };
type WorkbookResult = {
    fileName: string;
    totalRows: number;
    matchedRows: number;
    ignoredRows: number;
    processorRows: ProcessorQueue[];
    checkedAt: string;
    reportDate: string;
    checkpoint: CheckpointId;
};
type QueueHistoryEntry = {
    reportDate: string;
    checkpoint: CheckpointId;
    name: string;
    batch: number;
    generalExterior: number;
    fourPoint: number;
    other: number;
    total: number;
};

const checkpoints: Array<{ id: CheckpointId; label: string; time: string | null; minutes: number }> = [
    { id: 'start', label: 'Start of Day', time: '8:00 AM', minutes: 8 * 60 },
    { id: '11am', label: 'Morning Check', time: '11:00 AM', minutes: 11 * 60 },
    { id: '2pm', label: 'Afternoon Check', time: '2:00 PM', minutes: 14 * 60 },
    { id: '4pm', label: 'Final Check', time: '4:00 PM', minutes: 16 * 60 },
];

const queueSnapshots: Record<CheckpointId, QueueSnapshot> = {
    start: {
        waiting: 146,
        processed: 0,
        aging: 18,
        batches: [
            { batch: 1, team: "Jhun's Team", waiting: 42, processed: 0, aging: 6 },
            { batch: 2, team: "Allan's Team", waiting: 51, processed: 0, aging: 5 },
            { batch: 3, team: "Chrismer's Team", waiting: 53, processed: 0, aging: 7 },
        ],
    },
    '11am': {
        waiting: 112,
        processed: 83,
        aging: 14,
        batches: [
            { batch: 1, team: "Jhun's Team", waiting: 30, processed: 28, aging: 4 },
            { batch: 2, team: "Allan's Team", waiting: 39, processed: 26, aging: 5 },
            { batch: 3, team: "Chrismer's Team", waiting: 43, processed: 29, aging: 5 },
        ],
    },
    '2pm': {
        waiting: 69,
        processed: 151,
        aging: 9,
        batches: [
            { batch: 1, team: "Jhun's Team", waiting: 18, processed: 52, aging: 2 },
            { batch: 2, team: "Allan's Team", waiting: 23, processed: 48, aging: 3 },
            { batch: 3, team: "Chrismer's Team", waiting: 28, processed: 51, aging: 4 },
        ],
    },
    '4pm': {
        waiting: 31,
        processed: 224,
        aging: 4,
        batches: [
            { batch: 1, team: "Jhun's Team", waiting: 7, processed: 75, aging: 1 },
            { batch: 2, team: "Allan's Team", waiting: 10, processed: 72, aging: 1 },
            { batch: 3, team: "Chrismer's Team", waiting: 14, processed: 77, aging: 2 },
        ],
    },
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations', href: '/dashboard' },
    { title: 'Queue Monitor', href: '/operations/queue-monitor' },
];
const maximumQueueRows = 100_000;
const teamNames: Record<number, string> = { 1: "Jhun's Team", 2: "Allan's Team", 3: "Chrismer's Team" };

function normalizeName(value: unknown): string {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function findProcessor(value: unknown, processorRoster: ProcessorDefinition[]): ProcessorDefinition | undefined {
    const needle = normalizeName(value);
    if (!needle) return undefined;

    const needleWords = needle.split(' ');

    return processorRoster.find((processor) => {
        const identities = [processor.name, ...processor.aliases].map(normalizeName);
        if (identities.includes(needle)) return true;
        if (needleWords.length < 2) return false;

        const identityWords = new Set(identities.flatMap((identity) => identity.split(' ')));
        return needleWords.every((word) => identityWords.has(word));
    });
}

function philippinesMinutesNow(): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
    return hour * 60 + minute;
}

function latestCheckpointId(): CheckpointId {
    const now = philippinesMinutesNow();
    return checkpoints.reduce<CheckpointId>((latest, checkpoint) => (checkpoint.minutes <= now ? checkpoint.id : latest), 'start');
}

function philippinesDate(date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

    return `${value('year')}-${value('month')}-${value('day')}`;
}

function philippinesDateLabel(date = new Date()): string {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function philippinesTimeLabel(date = new Date()): string {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    }).format(date);
}

function formatReportDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(`${value}T00:00:00Z`));
}

function percentage(processed: number, waiting: number): number {
    const total = processed + waiting;
    return total === 0 ? 0 : Math.round((processed / total) * 100);
}

async function inspectWorkbook(file: File, checkpoint: CheckpointId, processorRoster: ProcessorDefinition[]): Promise<WorkbookResult> {
    if (processorRoster.length === 0) {
        throw new Error('No active Batch 1–3 processor accounts are configured. Assign a batch to a processor account before uploading.');
    }

    const SheetJS = await import('xlsx');
    const workbook = await readSpreadsheet(file, ['xlsx', 'xls'], maximumQueueRows, { cellDates: false });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) throw new Error(`${file.name} does not contain a worksheet.`);

    assertWorksheetRowLimit(worksheet, maximumQueueRows, file.name);
    const rows = SheetJS.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });
    if (rows.length > maximumQueueRows) throw new Error(`${file.name} contains more than ${maximumQueueRows.toLocaleString()} queue rows.`);
    if (rows.length === 0) throw new Error(`${file.name} does not contain any queue rows.`);
    if (!Object.prototype.hasOwnProperty.call(rows[0], 'Processor Name')) throw new Error(`${file.name} is missing the Processor Name column.`);

    const counts = new Map<string, { generalExterior: number; fourPoint: number; other: number; total: number }>();
    const seenRows = new Set<string>();
    let matchedRows = 0;

    rows.forEach((row, index) => {
        const processor = findProcessor(row['Processor Name'], processorRoster);
        if (!processor) return;

        const projectId = String(row['Project ID'] ?? '').trim();
        const uniqueKey = `${projectId || `row-${index}`}|${processor.name}`;
        if (seenRows.has(uniqueKey)) return;
        seenRows.add(uniqueKey);

        const inspectionType = normalizeName(row['Inspection Type']);
        const current = counts.get(processor.name) ?? { generalExterior: 0, fourPoint: 0, other: 0, total: 0 };
        current.total += 1;
        if (inspectionType.includes('exterior')) current.generalExterior += 1;
        else if (inspectionType.includes('4 point')) current.fourPoint += 1;
        else current.other += 1;
        counts.set(processor.name, current);
        matchedRows += 1;
    });

    if (matchedRows === 0) {
        throw new Error('No queue rows matched the active Batch 1–3 processor accounts. Check the spreadsheet names or processor account N-names.');
    }

    return {
        fileName: file.name,
        totalRows: rows.length,
        matchedRows,
        ignoredRows: rows.length - matchedRows,
        processorRows: processorRoster
            .filter((processor) => counts.has(processor.name))
            .map((processor) => ({
                ...processor,
                ...(counts.get(processor.name) ?? { generalExterior: 0, fourPoint: 0, other: 0, total: 0 }),
            })),
        checkedAt: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date()),
        reportDate: philippinesDate(),
        checkpoint,
    };
}

export default function QueueMonitor({
    savedSnapshots = [],
    processorRoster,
    historyVisible,
    historyEntries,
}: {
    savedSnapshots?: WorkbookResult[];
    processorRoster: ProcessorDefinition[];
    historyVisible: boolean;
    historyEntries: QueueHistoryEntry[];
}) {
    const page = usePage();
    const requestedCheckpoint = new URLSearchParams(page.url.split('?')[1] ?? '').get('checkpoint');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [philippinesNow, setPhilippinesNow] = useState(() => new Date());
    const latestId = latestCheckpointId();
    const currentReportDate = philippinesDate(philippinesNow);
    const [selectedId, setSelectedId] = useState<CheckpointId>(() =>
        checkpoints.some((checkpoint) => checkpoint.id === requestedCheckpoint) ? (requestedCheckpoint as CheckpointId) : latestCheckpointId(),
    );
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [checkedQueues, setCheckedQueues] = useState<Record<string, Partial<Record<CheckpointId, WorkbookResult>>>>(() =>
        savedSnapshots.reduce<Record<string, Partial<Record<CheckpointId, WorkbookResult>>>>((days, snapshot) => {
            days[snapshot.reportDate] = { ...days[snapshot.reportDate], [snapshot.checkpoint]: snapshot };
            return days;
        }, {}),
    );
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [detailMetric, setDetailMetric] = useState<QueueDetailMetric | null>(null);

    useEffect(() => {
        const value = new URLSearchParams(page.url.split('?')[1] ?? '').get('checkpoint');
        if (checkpoints.some((checkpoint) => checkpoint.id === value)) setSelectedId(value as CheckpointId);
    }, [page.url]);

    const selectedCheckpoint = checkpoints.find((checkpoint) => checkpoint.id === selectedId) ?? checkpoints[0];
    const currentDayQueues = checkedQueues[currentReportDate] ?? {};
    const importedResult = currentDayQueues[selectedId];
    const startOfDayResult = currentDayQueues.start;
    const sampleSnapshot = queueSnapshots[selectedId];
    const latestIndex = checkpoints.findIndex((checkpoint) => checkpoint.id === latestId);
    const selectedIndex = checkpoints.findIndex((checkpoint) => checkpoint.id === selectedId);
    const importedBatchRows = useMemo<BatchQueue[]>(
        () =>
            [1, 2, 3].map((batch) => ({
                batch,
                team: teamNames[batch],
                waiting:
                    importedResult?.processorRows
                        .filter((processor) => processor.batch === batch)
                        .reduce((sum, processor) => sum + processor.total, 0) ?? 0,
                processed: 0,
                aging: 0,
            })),
        [importedResult],
    );
    const displayedBatches = importedResult ? importedBatchRows : sampleSnapshot.batches;
    const displayedWaiting = importedResult ? importedResult.matchedRows : sampleSnapshot.waiting;
    const displayedProcessed = importedResult ? 0 : sampleSnapshot.processed;
    const displayedAging = importedResult ? 0 : sampleSnapshot.aging;
    const totalQueue = displayedWaiting + displayedProcessed;
    const completion = percentage(displayedProcessed, displayedWaiting);
    const activeProcessors = importedResult?.processorRows.filter((processor) => processor.total > 0).length ?? 0;

    useEffect(() => {
        const timer = window.setInterval(() => setPhilippinesNow(new Date()), 1000);

        return () => window.clearInterval(timer);
    }, []);

    function requestWorkbookCheck() {
        if (!selectedFile) {
            setUploadError('Choose an Excel workbook before checking the queue.');
            return;
        }
        setUploadError(null);
        setShowConfirmation(true);
    }

    async function confirmWorkbookCheck() {
        if (!selectedFile) return;
        setShowConfirmation(false);
        setUploadError(null);
        setIsChecking(true);
        try {
            const result = await inspectWorkbook(selectedFile, selectedId, processorRoster);

            router.post(
                '/operations/queue-monitor',
                {
                    report_date: result.reportDate,
                    checkpoint: result.checkpoint,
                    file_name: result.fileName,
                    total_rows: result.totalRows,
                    entries: result.processorRows.map((processor) => ({
                        name: processor.name,
                        batch: processor.batch,
                        general_exterior: processor.generalExterior,
                        four_point: processor.fourPoint,
                        other: processor.other,
                        total: processor.total,
                    })),
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setCheckedQueues((current) => ({
                            ...current,
                            [result.reportDate]: {
                                ...current[result.reportDate],
                                [selectedId]: result,
                            },
                        }));
                        setShowSuccess(true);
                    },
                    onError: (errors) =>
                        setUploadError(
                            Object.values(errors).find((message) => typeof message === 'string') ??
                                'The queue workbook could not be saved. Check the file and try again.',
                        ),
                    onFinish: () => setIsChecking(false),
                },
            );
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'The workbook could not be checked.');
            setIsChecking(false);
        }
    }

    async function exportDailyQueue() {
        const XLSX = await import('xlsx-js-style');
        const checkpointResult = (checkpoint: CheckpointId) => currentDayQueues[checkpoint];
        const latestComparison = (
            [
                { id: '4pm', column: 'F', label: '4:00 PM' },
                { id: '2pm', column: 'E', label: '2:00 PM' },
                { id: '11am', column: 'D', label: '11:00 AM' },
            ] as const
        ).find((checkpoint) => checkpointResult(checkpoint.id));
        const processorTotal = (checkpoint: CheckpointId, processorName: string): number | '' => {
            const result = checkpointResult(checkpoint);
            if (!result) return '';

            return result.processorRows.find((processor) => processor.name === processorName)?.total ?? 0;
        };

        const rows = processorRoster.map((processor) => {
            const start = processorTotal('start', processor.name);
            const eleven = processorTotal('11am', processor.name);
            const two = processorTotal('2pm', processor.name);
            const four = processorTotal('4pm', processor.name);

            return [processor.name, `Batch ${processor.batch}`, start, eleven, two, four, ''];
        });
        const firstDataRow = 5;
        const lastDataRow = firstDataRow + rows.length - 1;
        const totalRow = lastDataRow + 1;
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['BEES360 | DAILY QUEUE MONITOR'],
            [`${formatReportDate(currentReportDate)} · 8:00 AM, 11:00 AM, 2:00 PM and 4:00 PM · PH Time`],
            [],
            [
                'PROCESSOR',
                'BATCH',
                '8:00 AM',
                '11:00 AM',
                '2:00 PM',
                '4:00 PM',
                latestComparison ? `NET CHANGE\n(${latestComparison.label} VS 8:00 AM)` : 'NET CHANGE',
            ],
            ...rows,
            ['DAILY QUEUE TOTAL', '', '', '', '', '', ''],
        ]);

        worksheet['!merges'] = [
            XLSX.utils.decode_range('A1:G1'),
            XLSX.utils.decode_range('A2:G2'),
            XLSX.utils.decode_range(`A${totalRow}:B${totalRow}`),
        ];

        const whiteCellStyle = {
            font: { name: 'Century Gothic', sz: 10, color: { rgb: '4A3821' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
        };
        for (let row = 1; row <= totalRow; row += 1) {
            for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
                const address = `${column}${row}`;
                worksheet[address] ??= { t: 's', v: '' };
                worksheet[address].s = whiteCellStyle;
            }
        }

        const titleStyle = {
            alignment: { horizontal: 'center', vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: 'FFF8E7' } },
            fill: { patternType: 'solid', fgColor: { rgb: '4A351D' } },
        };
        const subtitleStyle = {
            alignment: { horizontal: 'center', vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '805C24' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFF1CC' } },
        };
        const headerStyle = {
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: 'FFF8E7' } },
            fill: { patternType: 'solid', fgColor: { rgb: '3B2915' } },
            border: { bottom: { style: 'thin', color: { rgb: '80603A' } } },
        };
        const bodyTextStyle = {
            alignment: { horizontal: 'left', vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, color: { rgb: '4A3821' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
            border: { bottom: { style: 'thin', color: { rgb: 'F0E5D4' } } },
        };
        const bodyNumberStyle = {
            alignment: { horizontal: 'center', vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, color: { rgb: '4A3821' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
            border: { bottom: { style: 'thin', color: { rgb: 'F0E5D4' } } },
            numFmt: '#,##0',
        };
        const totalStyle = {
            alignment: { horizontal: 'center', vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '4A351D' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFF0C5' } },
            border: { top: { style: 'medium', color: { rgb: '4A351D' } } },
            numFmt: '#,##0',
        };
        const positiveStyle = {
            ...bodyNumberStyle,
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '2F7544' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'E9F7E9' } },
        };
        const negativeStyle = {
            ...bodyNumberStyle,
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: 'B13F2D' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FDE9E5' } },
        };

        worksheet.A1.s = titleStyle;
        worksheet.A2.s = subtitleStyle;
        for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) worksheet[`${column}4`].s = headerStyle;

        processorRoster.forEach((processor, index) => {
            const row = firstDataRow + index;
            worksheet[`A${row}`].s = bodyTextStyle;
            worksheet[`B${row}`].s = { ...bodyTextStyle, alignment: { horizontal: 'center', vertical: 'center' } };
            for (const column of ['C', 'D', 'E', 'F']) worksheet[`${column}${row}`].s = bodyNumberStyle;

            const start = processorTotal('start', processor.name);
            const latest = latestComparison ? processorTotal(latestComparison.id, processor.name) : '';
            const netChange = typeof start === 'number' && typeof latest === 'number' ? latest - start : '';
            const status =
                typeof netChange !== 'number'
                    ? ''
                    : netChange < 0
                      ? `Progress (${netChange})`
                      : netChange > 0
                        ? `Queue Increased (+${netChange})`
                        : 'Stuck (0)';
            worksheet[`G${row}`] = {
                t: 's',
                v: status,
                ...(typeof netChange === 'number'
                    ? {
                          f: `IF(${latestComparison?.column}${row}<C${row},"Progress ("&TEXT(${latestComparison?.column}${row}-C${row},"+0;-0;0")&")",IF(${latestComparison?.column}${row}>C${row},"Queue Increased ("&TEXT(${latestComparison?.column}${row}-C${row},"+0;-0;0")&")","Stuck (0)"))`,
                      }
                    : {}),
                s:
                    typeof netChange === 'number' && netChange < 0
                        ? negativeStyle
                        : typeof netChange === 'number' && netChange > 0
                          ? positiveStyle
                          : bodyNumberStyle,
            };
        });

        for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) worksheet[`${column}${totalRow}`].s = totalStyle;
        const checkpointColumns: Array<[CheckpointId, string]> = [
            ['start', 'C'],
            ['11am', 'D'],
            ['2pm', 'E'],
            ['4pm', 'F'],
        ];
        checkpointColumns.forEach(([checkpoint, column]) => {
            if (!checkpointResult(checkpoint)) return;
            worksheet[`${column}${totalRow}`] = {
                t: 'n',
                f: `SUM(${column}${firstDataRow}:${column}${lastDataRow})`,
                v: processorRoster.reduce((sum, processor) => sum + Number(processorTotal(checkpoint, processor.name)), 0),
                s: totalStyle,
            };
        });

        const comparisonCheckpoint = latestComparison?.id;
        const hasBaselineAndComparison = Boolean(checkpointResult('start') && comparisonCheckpoint);
        const totalNetChange =
            hasBaselineAndComparison && comparisonCheckpoint
                ? processorRoster.reduce((sum, processor) => {
                      return sum + Number(processorTotal(comparisonCheckpoint, processor.name)) - Number(processorTotal('start', processor.name));
                  }, 0)
                : '';
        const totalStatus =
            typeof totalNetChange !== 'number'
                ? ''
                : totalNetChange < 0
                  ? `Progress (${totalNetChange})`
                  : totalNetChange > 0
                    ? `Queue Increased (+${totalNetChange})`
                    : 'Stuck (0)';
        worksheet[`G${totalRow}`] = {
            t: 's',
            v: totalStatus,
            ...(typeof totalNetChange === 'number'
                ? {
                      f: `IF(${latestComparison?.column}${totalRow}<C${totalRow},"Progress ("&TEXT(${latestComparison?.column}${totalRow}-C${totalRow},"+0;-0;0")&")",IF(${latestComparison?.column}${totalRow}>C${totalRow},"Queue Increased ("&TEXT(${latestComparison?.column}${totalRow}-C${totalRow},"+0;-0;0")&")","Stuck (0)"))`,
                  }
                : {}),
            s: {
                ...totalStyle,
                fill: {
                    patternType: 'solid',
                    fgColor: {
                        rgb: typeof totalNetChange === 'number' && totalNetChange < 0 ? 'FADBD5' : totalNetChange === 0 ? 'FFF0C5' : 'DDEEDC',
                    },
                },
                font: {
                    name: 'Century Gothic',
                    sz: 10,
                    bold: true,
                    color: {
                        rgb: typeof totalNetChange === 'number' && totalNetChange < 0 ? 'B13F2D' : totalNetChange === 0 ? '8D5708' : '2F7544',
                    },
                },
            },
        };

        worksheet['!cols'] = [{ wch: 33 }, { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }];
        worksheet['!rows'] = [{ hpt: 27 }, { hpt: 20 }, { hpt: 8 }, { hpt: 28 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Queue Monitor');
        XLSX.writeFile(workbook, `Bees360_Daily_Queue_Monitor_${currentReportDate}.xlsx`, { compression: true });
    }

    function toggleHistory() {
        router.get('/operations/queue-monitor', historyVisible ? {} : { history: 1 }, {
            only: ['historyEntries', 'historyVisible'],
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    const hasAnySavedCheckpoint = Object.values(currentDayQueues).some(Boolean);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Queue Monitor" />
            <div data-tour="queue-page" className="min-h-full bg-[#fffaf1] p-4 text-[#352515] sm:p-6 lg:p-8">
                <ConfirmationDialog
                    open={showConfirmation}
                    onOpenChange={setShowConfirmation}
                    fileName={selectedFile?.name ?? ''}
                    checkpoint={selectedCheckpoint.time ? `${selectedCheckpoint.label} · ${selectedCheckpoint.time} PHT` : selectedCheckpoint.label}
                    onConfirm={confirmWorkbookCheck}
                />
                <SuccessDialog open={showSuccess} onOpenChange={setShowSuccess} result={importedResult} activeProcessors={activeProcessors} />
                <QueueMetricDetailsDialog
                    metric={detailMetric}
                    onOpenChange={(open) => !open && setDetailMetric(null)}
                    batches={displayedBatches}
                    checkpoint={selectedCheckpoint.label}
                />

                <section className="overflow-hidden rounded-3xl border border-[#ead7b9] bg-white shadow-[0_18px_50px_rgba(83,55,22,0.08)]">
                    <div className="relative overflow-hidden bg-[#3a2817] px-5 py-6 text-white sm:px-7 lg:px-9">
                        <div className="absolute -top-16 right-0 size-52 rounded-full bg-[#f5b800]/15 blur-3xl" />
                        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#ffd567] uppercase">
                                    <Activity className="size-4" /> Operations Queue
                                </div>
                                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Queue Monitor</h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#f3e5ce]">
                                    Upload and save each daily Operations queue checkpoint using Philippine reporting time.
                                </p>
                            </div>
                            <div className="flex flex-col items-stretch gap-3 self-start sm:flex-row lg:self-auto">
                                <Button
                                    type="button"
                                    onClick={toggleHistory}
                                    className={`h-auto min-h-12 gap-2 border font-extrabold ${historyVisible ? 'border-[#ffc83d] bg-[#ffc83d] text-[#3a2817] hover:bg-[#ffd568]' : 'border-white/20 bg-white/10 text-white hover:bg-white/20'}`}
                                >
                                    <History className="size-4" /> {historyVisible ? 'Hide history' : 'Show history'}
                                </Button>
                                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                                    <div className="grid size-10 place-items-center rounded-xl bg-[#ffc83d] text-[#3a2817]">
                                        <Clock3 className="size-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold tracking-widest text-[#ffd567] uppercase">Live Philippine time</p>
                                        <p className="mt-0.5 text-sm font-extrabold tabular-nums">{philippinesTimeLabel(philippinesNow)} PHT</p>
                                        <p className="mt-0.5 text-[11px] text-[#f3e5ce]">{philippinesDateLabel(philippinesNow)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 lg:p-8">
                        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="text-xs font-extrabold tracking-[0.16em] text-[#a96500] uppercase">Daily checkpoints</p>
                                <h2 className="mt-1 text-lg font-black text-[#352515]">Choose a queue snapshot</h2>
                            </div>
                            <div
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${importedResult ? 'bg-[#e9f7e9] text-[#2f7544]' : 'bg-[#fff4d8] text-[#85520a]'}`}
                            >
                                {importedResult ? <FileCheck2 className="size-3.5" /> : <Sparkles className="size-3.5" />}
                                {importedResult ? 'Workbook check' : 'Sample queue data'}
                            </div>
                        </div>

                        <div className="relative grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {checkpoints.map((checkpoint, index) => {
                                const isSelected = checkpoint.id === selectedId;
                                const isLatest = checkpoint.id === latestId;
                                const hasWorkbook = Boolean(currentDayQueues[checkpoint.id]);
                                return (
                                    <button
                                        key={checkpoint.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedId(checkpoint.id);
                                            setUploadError(null);
                                        }}
                                        aria-pressed={isSelected}
                                        className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all focus-visible:ring-2 focus-visible:ring-[#c77a00] focus-visible:ring-offset-2 focus-visible:outline-none ${isSelected ? 'border-[#c77a00] bg-[#fff3cf] shadow-[0_10px_28px_rgba(181,107,0,0.14)]' : 'border-[#eadbc6] bg-[#fffdf8] hover:-translate-y-0.5 hover:border-[#d8b77c] hover:shadow-md'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div
                                                className={`grid size-10 place-items-center rounded-xl ${isSelected ? 'bg-[#c77a00] text-white' : 'bg-[#f8ead2] text-[#8a570d]'}`}
                                            >
                                                {hasWorkbook ? (
                                                    <FileCheck2 className="size-5" />
                                                ) : index <= latestIndex ? (
                                                    <Check className="size-5" />
                                                ) : (
                                                    <Clock3 className="size-5" />
                                                )}
                                            </div>
                                            <div className="flex gap-1.5">
                                                {hasWorkbook && (
                                                    <span className="rounded-full bg-[#e5f5e6] px-2 py-1 text-[9px] font-extrabold text-[#2f7544] uppercase">
                                                        Checked
                                                    </span>
                                                )}
                                                {isLatest && (
                                                    <span className="rounded-full bg-[#3a2817] px-2 py-1 text-[9px] font-extrabold text-[#ffd567] uppercase">
                                                        Latest
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="mt-4 text-sm font-extrabold text-[#3d2b18]">{checkpoint.label}</p>
                                        {checkpoint.time && <p className="mt-1 text-xl font-black text-[#a96100]">{checkpoint.time}</p>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#e5d2b2] bg-[#fff8e8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fff0c5] text-[#9b5d00]">
                                    <CalendarDays className="size-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-extrabold tracking-[0.14em] text-[#9b5d00] uppercase">Current PH reporting day</p>
                                    <p className="text-sm font-black text-[#3a2817]">{philippinesDateLabel(philippinesNow)}</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                disabled={!hasAnySavedCheckpoint}
                                onClick={exportDailyQueue}
                                title={
                                    hasAnySavedCheckpoint
                                        ? 'Export all saved checkpoints for this PH reporting day.'
                                        : 'Save at least one checkpoint before exporting.'
                                }
                                className="bg-[#3a2817] font-bold text-[#ffd15a] hover:bg-[#563c22] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <Download className="size-4" /> Export Daily Excel
                            </Button>
                        </div>

                        <div className="mt-6 grid gap-4 rounded-2xl border border-[#e5d2b2] bg-[#fffaf0] p-4 lg:grid-cols-[1fr_auto] lg:items-center lg:p-5">
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#3a2817] text-[#ffd15a]">
                                    <FileSpreadsheet className="size-6" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-extrabold tracking-[0.14em] text-[#9b5d00] uppercase">Queue Excel upload</p>
                                    <p className="mt-1 truncate text-sm font-black text-[#3a2817]">
                                        {selectedFile?.name ?? 'Choose a .xlsx or .xls workbook'}
                                    </p>
                                    <p className="mt-1 text-xs text-[#7e6c52]">
                                        Only approved Batch 1–3 processor names will be saved to the database.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="sr-only"
                                    onChange={(event) => {
                                        setSelectedFile(event.target.files?.[0] ?? null);
                                        setUploadError(null);
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-[#d5b77e] bg-white font-bold text-[#71502b] hover:bg-[#fff3d4]"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FileSpreadsheet className="size-4" /> Choose Excel
                                </Button>
                                <Button
                                    type="button"
                                    disabled={isChecking}
                                    className="bg-[#b96c00] font-bold text-white hover:bg-[#925400] disabled:opacity-60"
                                    onClick={requestWorkbookCheck}
                                >
                                    <Upload className="size-4" /> {isChecking ? 'Saving…' : 'Generate & save'}
                                </Button>
                            </div>
                        </div>

                        {uploadError && (
                            <div className="mt-3 flex items-start gap-3 rounded-xl border border-[#efb7aa] bg-[#fff0ec] px-4 py-3 text-sm font-semibold text-[#983b2b]">
                                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                                {uploadError}
                            </div>
                        )}

                        <div className="mt-5 flex flex-col gap-1 rounded-2xl border border-[#eadbc6] bg-[#fffdf9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div className="flex items-center gap-3">
                                <div className="grid size-9 place-items-center rounded-xl bg-[#3a2817] text-[#ffd15a]">
                                    <Clock3 className="size-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#8b795f]">Viewing checkpoint</p>
                                    <p className="text-sm font-black text-[#3a2817]">
                                        {selectedCheckpoint.label}
                                        {selectedCheckpoint.time ? ` · ${selectedCheckpoint.time} PHT` : ''}
                                    </p>
                                </div>
                            </div>
                            {importedResult ? (
                                <p className="mt-2 text-xs font-bold text-[#317347] sm:mt-0">
                                    Checked from {importedResult.fileName} at {importedResult.checkedAt} PHT
                                </p>
                            ) : selectedIndex > latestIndex ? (
                                <p className="mt-2 text-xs font-bold text-[#9b6412] sm:mt-0">Previewing the next scheduled sample</p>
                            ) : null}
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {importedResult ? (
                                <>
                                    <MetricCard
                                        icon={Inbox}
                                        label="Approved Queue"
                                        value={importedResult.matchedRows}
                                        note={`${importedResult.totalRows} workbook rows checked`}
                                        tone="amber"
                                    />
                                    <MetricCard
                                        icon={UsersRound}
                                        label="Active Processors"
                                        value={activeProcessors}
                                        note={`${processorRoster.length} approved processors`}
                                        tone="green"
                                    />
                                    <MetricCard
                                        icon={ShieldCheck}
                                        label="Excluded Rows"
                                        value={importedResult.ignoredRows}
                                        note="Outside approved processor roster"
                                        tone="red"
                                    />
                                    <MetricCard
                                        icon={FileCheck2}
                                        label="Saved Queue Rows"
                                        value={importedResult.matchedRows}
                                        note="Approved rows stored in database"
                                        tone="brown"
                                    />
                                </>
                            ) : (
                                <>
                                    <MetricCard
                                        icon={Inbox}
                                        label="Waiting in Queue"
                                        value={displayedWaiting}
                                        note={`${totalQueue} total available`}
                                        tone="amber"
                                        onViewDetails={() => setDetailMetric('waiting')}
                                    />
                                    <MetricCard
                                        icon={CircleCheckBig}
                                        label="Reports Processed"
                                        value={displayedProcessed}
                                        note={selectedCheckpoint.time ? `As of ${selectedCheckpoint.time} PHT` : 'Start of Day baseline'}
                                        tone="green"
                                    />
                                    <MetricCard
                                        icon={TriangleAlert}
                                        label="Aging Queue"
                                        value={displayedAging}
                                        note="Items needing attention"
                                        tone="red"
                                        onViewDetails={() => setDetailMetric('aging')}
                                    />
                                    <MetricCard
                                        icon={Gauge}
                                        label="Completion Rate"
                                        value={`${completion}%`}
                                        note="Processed vs. total queue"
                                        tone="brown"
                                        onViewDetails={() => setDetailMetric('completion')}
                                    />
                                </>
                            )}
                        </div>

                        {selectedId !== 'start' && (
                            <DailyComparison
                                baseline={startOfDayResult}
                                current={importedResult}
                                checkpoint={selectedCheckpoint}
                                reportDate={philippinesDateLabel(philippinesNow)}
                            />
                        )}

                        {importedResult && (
                            <ProcessorBreakdown
                                processors={importedResult.processorRows}
                                baseline={selectedId === 'start' ? undefined : startOfDayResult?.processorRows}
                            />
                        )}
                        <BatchBreakdown
                            batches={displayedBatches}
                            waiting={displayedWaiting}
                            processed={displayedProcessed}
                            aging={displayedAging}
                            imported={Boolean(importedResult)}
                        />
                    </div>
                </section>
                {historyVisible && (
                    <section className="mt-6 overflow-hidden rounded-3xl border border-[#d8bd8c] bg-[#fffdf8] shadow-[0_18px_50px_rgba(83,55,22,0.08)]">
                        <div className="flex flex-col gap-2 border-b border-[#eadbc6] bg-[#fff5dc] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                            <div>
                                <p className="text-xs font-extrabold tracking-[0.16em] text-[#a96500] uppercase">Historical records</p>
                                <h2 className="mt-1 text-lg font-black text-[#352515]">Former processor queue history</h2>
                            </div>
                            <span className="w-fit rounded-full bg-[#3a2817] px-3 py-1.5 text-xs font-extrabold text-[#ffd567]">
                                {historyEntries.length} record{historyEntries.length === 1 ? '' : 's'}
                            </span>
                        </div>
                        {historyEntries.length > 0 ? (
                            <div className="max-h-[32rem] overflow-auto">
                                <table className="w-full min-w-[900px] text-left text-sm">
                                    <thead className="sticky top-0 bg-[#3a2817] text-xs tracking-wide text-[#fff8e7] uppercase">
                                        <tr>
                                            <th className="px-5 py-4">Date</th>
                                            <th className="px-5 py-4">Checkpoint</th>
                                            <th className="px-5 py-4">Processor</th>
                                            <th className="px-5 py-4">Batch</th>
                                            <th className="px-5 py-4 text-center">Gen Ext</th>
                                            <th className="px-5 py-4 text-center">4-Point</th>
                                            <th className="px-5 py-4 text-center">To Do</th>
                                            <th className="px-5 py-4 text-center">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f1e7d8]">
                                        {historyEntries.map((entry, index) => (
                                            <tr
                                                key={`${entry.reportDate}-${entry.checkpoint}-${entry.name}-${index}`}
                                                className="odd:bg-[#fffdf8] even:bg-[#fff8e8]"
                                            >
                                                <td className="px-5 py-4 text-[#5f4b32]">{formatReportDate(entry.reportDate)}</td>
                                                <td className="px-5 py-4 font-semibold text-[#5f4b32]">
                                                    {checkpoints.find((checkpoint) => checkpoint.id === entry.checkpoint)?.time ?? entry.checkpoint}
                                                </td>
                                                <td className="px-5 py-4 font-black text-[#342615]">{entry.name}</td>
                                                <td className="px-5 py-4 text-[#806f59]">Batch {entry.batch}</td>
                                                <td className="px-5 py-4 text-center font-semibold text-[#4a3821]">{entry.generalExterior}</td>
                                                <td className="px-5 py-4 text-center font-semibold text-[#4a3821]">{entry.fourPoint}</td>
                                                <td className="px-5 py-4 text-center font-semibold text-[#4a3821]">{entry.other}</td>
                                                <td className="bg-[#fff1cc] px-5 py-4 text-center font-black text-[#694400]">{entry.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="grid min-h-40 place-items-center px-6 py-10 text-center text-sm text-[#806f59]">
                                No former processor queue history is available.
                            </div>
                        )}
                    </section>
                )}
            </div>
        </AppLayout>
    );
}

function ConfirmationDialog({
    open,
    onOpenChange,
    fileName,
    checkpoint,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileName: string;
    checkpoint: string;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden border-[#e6c783] bg-[#fffdf8] p-0 sm:max-w-md">
                <div className="flex flex-col items-center px-7 pt-8 text-center">
                    <div className="grid size-20 place-items-center rounded-full border-4 border-[#f4d486] bg-[#fff2c8] text-[#a96000] shadow-[0_0_0_8px_rgb(244,212,134,0.2)]">
                        <FileCheck2 className="size-9" />
                    </div>
                    <DialogTitle className="mt-6 text-2xl font-extrabold text-[#342615]">Generate and save this queue?</DialogTitle>
                    <DialogDescription className="mt-3 text-sm leading-6 text-[#756448]">
                        Bees360 will read the workbook and include only approved Batch 1, 2, and 3 processors.
                    </DialogDescription>
                </div>
                <div className="mx-7 grid gap-3 rounded-xl border border-[#f0dfbd] bg-[#fff8e8] p-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-[#654b2d]">FILE</span>
                        <span className="truncate text-[#806f59]">{fileName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-[#654b2d]">CHECKPOINT</span>
                        <span className="text-right text-[#806f59]">{checkpoint}</span>
                    </div>
                    <div className="flex items-center gap-2 border-t border-[#ead6aa] pt-3 text-xs font-bold text-[#2d7343]">
                        <ShieldCheck className="size-4" />
                        Only approved Batch 1–3 processor names will be saved.
                    </div>
                </div>
                <DialogFooter className="gap-3 px-7 pt-2 pb-7 sm:gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        className="border-[#d8bd8c] text-[#75552d] hover:bg-[#fff4dc]"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button type="button" className="bg-[#b96c00] font-bold text-white hover:bg-[#925400]" onClick={onConfirm}>
                        Yes, generate & save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SuccessDialog({
    open,
    onOpenChange,
    result,
    activeProcessors,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    result?: WorkbookResult;
    activeProcessors: number;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden border-[#e6c783] bg-[#fffdf8] p-0 sm:max-w-md">
                <div className="relative flex flex-col items-center overflow-hidden px-7 pt-8 text-center">
                    <div className="absolute top-5 left-[22%] text-lg text-[#f4b400] motion-safe:animate-pulse">✦</div>
                    <div className="absolute top-10 right-[22%] text-sm text-[#f4b400] motion-safe:animate-pulse">✦</div>
                    <div className="relative grid size-20 place-items-center rounded-full border-4 border-[#9bd4a4] bg-[#eaf8e9] text-[#2e7d42] shadow-[0_0_0_8px_rgb(155,212,164,0.2)]">
                        <CheckCircle2 className="size-10" strokeWidth={2.5} />
                        <span className="absolute -top-5 -right-4 text-3xl motion-safe:animate-bounce" aria-hidden="true">
                            🐝
                        </span>
                    </div>
                    <p className="mt-6 text-xs font-bold tracking-[0.2em] text-[#b26a00] uppercase">Bees360 queue ready</p>
                    <DialogTitle className="mt-2 text-2xl font-extrabold text-[#342615]">Successfully saved!</DialogTitle>
                    <DialogDescription className="mt-3 text-sm leading-6 text-[#756448]">
                        The approved processor queue is saved and ready for same-day reporting and comparison.
                    </DialogDescription>
                </div>
                <div className="mx-7 mt-5 grid grid-cols-3 gap-2 rounded-xl border border-[#f0dfbd] bg-[#fff8e8] p-4 text-center">
                    <div>
                        <p className="text-2xl font-extrabold text-[#9e5b00]">{result?.matchedRows ?? 0}</p>
                        <p className="mt-1 text-[10px] font-bold text-[#806f59] uppercase">Approved</p>
                    </div>
                    <div className="border-x border-[#ead6aa]">
                        <p className="text-2xl font-extrabold text-[#9e5b00]">{activeProcessors}</p>
                        <p className="mt-1 text-[10px] font-bold text-[#806f59] uppercase">Processors</p>
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-[#9e5b00]">{result?.ignoredRows ?? 0}</p>
                        <p className="mt-1 text-[10px] font-bold text-[#806f59] uppercase">Excluded</p>
                    </div>
                </div>
                <DialogFooter className="px-7 pt-5 pb-7 sm:justify-center">
                    <Button
                        type="button"
                        className="min-w-36 bg-[#b96c00] font-bold text-white hover:bg-[#925400]"
                        onClick={() => onOpenChange(false)}
                    >
                        View queue data
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DailyComparison({
    baseline,
    current,
    checkpoint,
    reportDate,
}: {
    baseline?: WorkbookResult;
    current?: WorkbookResult;
    checkpoint: (typeof checkpoints)[number];
    reportDate: string;
}) {
    if (!baseline || !current) {
        const missingBaseline = !baseline;

        return (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-dashed border-[#d8b879] bg-[#fffbf2] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0c5] text-[#9b5d00]">
                        <Gauge className="size-5" />
                    </div>
                    <div>
                        <h2 className="font-black text-[#3a2817]">Daily queue comparison</h2>
                        <p className="mt-1 text-sm leading-6 text-[#79664e]">
                            {missingBaseline
                                ? `Upload the Start of Day workbook for ${reportDate} to create the comparison baseline.`
                                : `Upload the ${checkpoint.label} workbook to compare it with today's Start of Day queue.`}
                        </p>
                    </div>
                </div>
                <span className="w-fit rounded-full bg-[#fff0c5] px-3 py-1.5 text-xs font-extrabold text-[#8d5708]">Waiting for file</span>
            </div>
        );
    }

    const change = current.matchedRows - baseline.matchedRows;
    const reduction = Math.max(0, baseline.matchedRows - current.matchedRows);

    return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#dfc796] bg-white">
            <div className="flex flex-col gap-3 bg-[#3a2817] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-[10px] font-extrabold tracking-[0.16em] text-[#ffd567] uppercase">Same-day comparison</p>
                    <h2 className="mt-1 font-black">Start of Day vs {checkpoint.label}</h2>
                </div>
                <span className="w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-[#fff1ca]">
                    {reportDate}
                </span>
            </div>
            <div className="grid gap-px bg-[#eadbc6] sm:grid-cols-2 lg:grid-cols-4">
                <ComparisonMetric label="Start of Day queue" value={baseline.matchedRows} note={baseline.fileName} />
                <ComparisonMetric label={`${checkpoint.label} queue`} value={current.matchedRows} note={current.fileName} />
                <ComparisonMetric label="Net queue movement" value={<DeltaValue value={change} />} note="Compared with Start of Day" />
                <ComparisonMetric
                    label="Net queue reduction"
                    value={reduction}
                    note={reduction > 0 ? 'Fewer reports in queue' : 'No reduction yet'}
                />
            </div>
        </div>
    );
}

function ComparisonMetric({ label, value, note }: { label: string; value: ReactNode; note: string }) {
    return (
        <div className="min-w-0 bg-[#fffdf8] p-5 text-center">
            <p className="text-[10px] font-extrabold tracking-[0.12em] text-[#806d53] uppercase">{label}</p>
            <div className="mt-2 flex min-h-9 items-center justify-center text-2xl font-black text-[#3a2817]">{value}</div>
            <p className="mt-1 truncate text-xs text-[#8b7962]" title={note}>
                {note}
            </p>
        </div>
    );
}

function DeltaValue({ value }: { value: number }) {
    if (value < 0)
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fde9e5] px-2.5 py-1 text-xs font-extrabold text-[#b13f2d]">
                <TrendingDown className="size-5" />
                Progress ({value})
            </span>
        );
    if (value > 0)
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9f7e9] px-2.5 py-1 text-xs font-extrabold text-[#2f7544]">
                <TrendingUp className="size-5" /> Queue Increased (+{value})
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0c5] px-2.5 py-1 text-xs font-extrabold text-[#8d5708]">
            <Minus className="size-5" /> Stuck (0)
        </span>
    );
}

function ProcessorBreakdown({ processors, baseline }: { processors: ProcessorQueue[]; baseline?: ProcessorQueue[] }) {
    const [batchFilter, setBatchFilter] = useState<'all' | 1 | 2 | 3>('all');
    const visibleProcessors = batchFilter === 'all' ? processors : processors.filter((processor) => processor.batch === batchFilter);
    const visibleBaseline = batchFilter === 'all' ? baseline : baseline?.filter((processor) => processor.batch === batchFilter);
    const approvedTotal = visibleProcessors.reduce((sum, processor) => sum + processor.total, 0);
    const baselineTotal = visibleBaseline?.reduce((sum, processor) => sum + processor.total, 0) ?? 0;
    const baselineLookup = new Map(baseline?.map((processor) => [processor.name, processor.total]) ?? []);
    return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#e7d6bd] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#eadfcf] bg-[#fff9ed] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-black text-[#352515]">Approved processor queue</h2>
                    <p className="mt-1 text-xs text-[#7c6a52]">
                        Only approved Batch 1, Batch 2, and Batch 3 processors are displayed with their available To Do cases.
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#e9f7e9] px-3 py-1.5 text-xs font-bold text-[#2f7544]">
                    <ShieldCheck className="size-4" />
                    Roster filtered
                </div>
            </div>
            <div className="flex flex-col gap-3 border-b border-[#eadfcf] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-extrabold tracking-[0.12em] text-[#8a5a14] uppercase">Monitor by batch</p>
                    <p className="mt-1 text-xs text-[#806f59]">Choose a batch to view only its processor queue.</p>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter processors by batch">
                    {(
                        [
                            ['all', 'All Batches'],
                            [1, 'Batch 1'],
                            [2, 'Batch 2'],
                            [3, 'Batch 3'],
                        ] as const
                    ).map(([value, label]) => {
                        const isActive = batchFilter === value;

                        return (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => setBatchFilter(value)}
                                className={`rounded-lg border px-4 py-2 text-xs font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-[#c77a00] focus-visible:ring-offset-2 focus-visible:outline-none ${
                                    isActive
                                        ? 'border-[#4a351d] bg-[#4a351d] text-white shadow-sm'
                                        : 'border-[#dfc89f] bg-[#fffdf8] text-[#77542b] hover:border-[#c88a29] hover:bg-[#fff3d4]'
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-[#3a2817] text-xs tracking-wide text-[#fff7e8] uppercase">
                        <tr>
                            <th className="px-5 py-3.5 font-extrabold">Processor name</th>
                            <th className="px-5 py-3.5 text-center font-extrabold">Batch</th>
                            <th className="px-5 py-3.5 text-center font-extrabold">General Exterior</th>
                            <th className="px-5 py-3.5 text-center font-extrabold">4-Point</th>
                            <th className="bg-[#2d1d0f] px-5 py-3.5 text-center font-extrabold">Available Cases in To Do</th>
                            {baseline && <th className="px-5 py-3.5 text-center font-extrabold">Vs Start</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee3d2]">
                        {visibleProcessors.map((processor) => (
                            <tr key={processor.name} className="bg-white transition-colors hover:bg-[#fffbf3]">
                                <td className="px-5 py-3.5 font-bold text-[#493520]">{processor.name}</td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className="inline-flex rounded-lg bg-[#fff0c9] px-2.5 py-1 text-xs font-black text-[#9b5c00]">
                                        Batch {processor.batch}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-center font-bold text-[#72512b]">{processor.generalExterior}</td>
                                <td className="px-5 py-3.5 text-center font-bold text-[#72512b]">{processor.fourPoint}</td>
                                <td className="bg-[#fff8e4] px-5 py-3.5 text-center font-black text-[#9a5a00]">{processor.total}</td>
                                {baseline && (
                                    <td className="px-5 py-3.5 text-center font-black">
                                        <DeltaValue value={processor.total - (baselineLookup.get(processor.name) ?? 0)} />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t-2 border-[#5a3c1d] bg-[#f2cf72] font-black text-[#3a2817]">
                        <tr>
                            <td colSpan={4} className="px-5 py-4 text-center text-xs tracking-wider uppercase">
                                Total available cases in To Do
                            </td>
                            <td className="px-5 py-4 text-center text-base">{approvedTotal}</td>
                            {baseline && (
                                <td className="px-5 py-4 text-center">
                                    <DeltaValue value={approvedTotal - baselineTotal} />
                                </td>
                            )}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

function BatchBreakdown({
    batches,
    waiting,
    processed,
    aging,
    imported,
}: {
    batches: BatchQueue[];
    waiting: number;
    processed: number;
    aging: number;
    imported: boolean;
}) {
    const [showBalancingTips, setShowBalancingTips] = useState(false);
    const completion = percentage(processed, waiting);
    const baseTarget = batches.length === 0 ? 0 : Math.floor(waiting / batches.length);
    const extraSlots = batches.length === 0 ? 0 : waiting % batches.length;
    const targetByBatch = new Map(
        [...batches]
            .sort((left, right) => right.waiting - left.waiting)
            .map((batch, index) => [batch.batch, baseTarget + (index < extraSlots ? 1 : 0)]),
    );
    const overloaded = batches
        .map((batch) => ({ ...batch, excess: batch.waiting - (targetByBatch.get(batch.batch) ?? 0) }))
        .filter((batch) => batch.excess > 0);
    const underloaded = batches
        .map((batch) => ({ ...batch, needed: (targetByBatch.get(batch.batch) ?? 0) - batch.waiting }))
        .filter((batch) => batch.needed > 0);
    const balancingTips: Array<{ from: number; to: number; count: number }> = [];
    let sourceIndex = 0;
    let destinationIndex = 0;

    while (sourceIndex < overloaded.length && destinationIndex < underloaded.length) {
        const source = overloaded[sourceIndex];
        const destination = underloaded[destinationIndex];
        const count = Math.min(source.excess, destination.needed);
        balancingTips.push({ from: source.batch, to: destination.batch, count });
        source.excess -= count;
        destination.needed -= count;
        if (source.excess === 0) sourceIndex += 1;
        if (destination.needed === 0) destinationIndex += 1;
    }
    const isBalanced = balancingTips.length === 0;
    const equalShare = batches.length === 0 || waiting === 0 ? 0 : 100 / batches.length;

    return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#e7d6bd] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#eadfcf] bg-[#fff9ed] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-black text-[#352515]">Batch queue breakdown</h2>
                    <p className="mt-1 text-xs text-[#7c6a52]">
                        {imported
                            ? 'Approved workbook rows grouped by Operations batch.'
                            : 'Team progress for the selected Philippine-time checkpoint.'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#73532e]">
                        <UsersRound className="size-4 text-[#bd7200]" />3 operations batches
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowBalancingTips(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#3a2817] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#5b3c1d] focus-visible:ring-2 focus-visible:ring-[#d78b16]/50 focus-visible:outline-none"
                    >
                        <Sparkles className="size-4 text-[#ffd15a]" />
                        Balance queue
                    </button>
                </div>
            </div>
            <Dialog open={showBalancingTips} onOpenChange={setShowBalancingTips}>
                <DialogContent className="max-w-xl overflow-hidden border-[#e5cda6] bg-[#fffdf9] p-0 text-[#352515] sm:rounded-3xl [&>button]:top-5 [&>button]:right-5 [&>button]:grid [&>button]:size-9 [&>button]:place-items-center [&>button]:rounded-full [&>button]:bg-white [&>button]:text-[#3a2817] [&>button]:opacity-100 [&>button]:shadow-md [&>button]:hover:bg-[#ffd15a]">
                    <div className="bg-[#3a2817] px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="grid size-10 place-items-center rounded-xl bg-[#ffd15a] text-[#3a2817]">
                                <Sparkles className="size-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-black">Queue balancing recommendation</DialogTitle>
                                <DialogDescription className="mt-1 text-xs text-[#ead9bd]">
                                    Equal distribution across all Operations batches
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#efd498] bg-[#fff8e5] p-4">
                            <p className="text-sm font-bold text-[#5d472d]">
                                Equal target: <strong className="text-[#3b2917]">{baseTarget}</strong>
                                {extraSlots > 0 ? `–${baseTarget + 1}` : ''} reports per batch
                            </p>
                            <span
                                className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
                                    isBalanced ? 'bg-[#e5f3e8] text-[#317347]' : 'bg-[#fff0c5] text-[#925b08]'
                                }`}
                            >
                                {isBalanced ? 'Queue is balanced' : `${balancingTips.length} suggested move${balancingTips.length === 1 ? '' : 's'}`}
                            </span>
                        </div>
                        {balancingTips.length > 0 && (
                            <div className="mt-4 grid gap-3">
                                {balancingTips.map((tip) => (
                                    <div
                                        key={`${tip.from}-${tip.to}`}
                                        className="flex items-center gap-2 rounded-xl border border-[#eadbc6] bg-white px-4 py-3 text-sm text-[#604c34]"
                                    >
                                        <TrendingDown className="size-4 shrink-0 text-[#b26a00]" />
                                        Move <strong className="text-[#3b2917]">{tip.count}</strong> report{tip.count === 1 ? '' : 's'} from
                                        <strong className="text-[#9b5c00]">Batch {tip.from}</strong> to
                                        <strong className="text-[#317347]">Batch {tip.to}</strong>.
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-[#3a2817] text-xs tracking-wide text-[#fff7e8] uppercase">
                        <tr>
                            <th className="px-5 py-3.5 font-extrabold">Batch</th>
                            <th className="px-5 py-3.5 text-center font-extrabold">{imported ? 'Queue rows' : 'Waiting'}</th>
                            {!imported && <th className="px-5 py-3.5 text-center font-extrabold">Processed</th>}
                            {!imported && <th className="px-5 py-3.5 text-center font-extrabold">Aging</th>}
                            <th className="px-5 py-3.5 font-extrabold">Share of queue</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee3d2]">
                        {batches.map((batch) => {
                            const actualShare = waiting === 0 ? 0 : (batch.waiting / waiting) * 100;
                            const displayedShare = isBalanced ? equalShare : actualShare;
                            return (
                                <tr key={batch.batch} className="bg-white transition-colors hover:bg-[#fffbf3]">
                                    <td className="px-5 py-4">
                                        <span className="inline-flex rounded-lg bg-[#fff0c9] px-2.5 py-1 text-xs font-black text-[#9b5c00]">
                                            Batch {batch.batch}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center font-black text-[#a36200]">{batch.waiting}</td>
                                    {!imported && <td className="px-5 py-4 text-center font-black text-[#26724a]">{batch.processed}</td>}
                                    {!imported && <td className="px-5 py-4 text-center font-black text-[#a43927]">{batch.aging}</td>}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eee5d8]">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-[#f0a500] to-[#ffc83d]"
                                                    style={{ width: `${displayedShare}%` }}
                                                />
                                            </div>
                                            <span className="w-14 text-right text-xs font-black text-[#4e3820]">{displayedShare.toFixed(2)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="border-t-2 border-[#5a3c1d] bg-[#fff1c6] font-black text-[#3a2817]">
                        <tr>
                            <td className="px-5 py-4 text-center text-xs tracking-wider uppercase">Combined total</td>
                            <td className="px-5 py-4 text-center">{waiting}</td>
                            {!imported && <td className="px-5 py-4 text-center">{processed}</td>}
                            {!imported && <td className="px-5 py-4 text-center">{aging}</td>}
                            <td className="px-5 py-4">{imported ? '100% of approved queue' : `${completion}% complete`}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

type MetricTone = 'amber' | 'green' | 'red' | 'brown';
const metricTones: Record<MetricTone, { icon: string; accent: string }> = {
    amber: { icon: 'bg-[#fff0c5] text-[#a96100]', accent: 'bg-[#f4ae00]' },
    green: { icon: 'bg-[#e6f4e9] text-[#34724b]', accent: 'bg-[#5a9d66]' },
    red: { icon: 'bg-[#fee8e2] text-[#a33e2d]', accent: 'bg-[#cf614b]' },
    brown: { icon: 'bg-[#ede4da] text-[#56391e]', accent: 'bg-[#5b3c1d]' },
};

function MetricCard({
    icon: Icon,
    label,
    value,
    note,
    tone,
    onViewDetails,
}: {
    icon: typeof Inbox;
    label: string;
    value: number | string;
    note: string;
    tone: MetricTone;
    onViewDetails?: () => void;
}) {
    const colors = metricTones[tone];
    return (
        <div className="relative overflow-hidden rounded-2xl border border-[#eadbc6] bg-white p-5 shadow-[0_8px_24px_rgba(72,48,20,0.06)]">
            <div className={`absolute inset-y-0 left-0 w-1 ${colors.accent}`} />
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-extrabold tracking-wide text-[#80705a] uppercase">{label}</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-[#342414]">{value}</p>
                    <p className="mt-1 text-xs text-[#8b7b67]">{note}</p>
                    {onViewDetails && (
                        <button
                            type="button"
                            onClick={onViewDetails}
                            className="mt-4 inline-flex items-center rounded-lg border border-[#dfbd82] bg-[#fff8e8] px-3 py-2 text-xs font-extrabold text-[#86530b] transition hover:border-[#c98211] hover:bg-[#ffefc7] focus-visible:ring-2 focus-visible:ring-[#d78b16]/40 focus-visible:outline-none"
                        >
                            View details
                        </button>
                    )}
                </div>
                <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${colors.icon}`}>
                    <Icon className="size-5" />
                </div>
            </div>
        </div>
    );
}

function QueueMetricDetailsDialog({
    metric,
    onOpenChange,
    batches,
    checkpoint,
}: {
    metric: QueueDetailMetric | null;
    onOpenChange: (open: boolean) => void;
    batches: BatchQueue[];
    checkpoint: string;
}) {
    const configuration = {
        waiting: { title: 'Waiting in Queue', description: 'Reports currently waiting per batch.', icon: Inbox, tone: 'text-[#9a6207] bg-[#fff0c5]' },
        aging: {
            title: 'Aging Queue',
            description: 'Queue items requiring attention per batch.',
            icon: TriangleAlert,
            tone: 'text-[#a33e2d] bg-[#fee8e2]',
        },
        completion: {
            title: 'Completion Rate',
            description: 'Processed reports compared with the total queue per batch.',
            icon: Gauge,
            tone: 'text-[#56391e] bg-[#ede4da]',
        },
    } as const;
    const selected = metric ? configuration[metric] : configuration.waiting;
    const DetailIcon = selected.icon;

    return (
        <Dialog open={metric !== null} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl overflow-hidden border-[#e5cda6] bg-[#fffdf9] p-0 text-[#352515] sm:rounded-3xl [&>button]:top-5 [&>button]:right-5 [&>button]:grid [&>button]:size-9 [&>button]:place-items-center [&>button]:rounded-full [&>button]:bg-white [&>button]:text-[#3a2817] [&>button]:opacity-100 [&>button]:shadow-md [&>button]:hover:bg-[#ffd15a]">
                <div className="bg-[#3a2817] px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className={`grid size-10 place-items-center rounded-xl ${selected.tone}`}>
                            <DetailIcon className="size-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black">{selected.title}</DialogTitle>
                            <DialogDescription className="mt-1 text-xs text-[#ead9bd]">{checkpoint} · Philippine Time</DialogDescription>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-[#7d6b54]">{selected.description}</p>
                    <div className="overflow-hidden rounded-2xl border border-[#eadbc6]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#fff3d5] text-xs font-extrabold tracking-wide text-[#684719] uppercase">
                                <tr>
                                    <th className="px-4 py-3">Batch</th>
                                    <th className="px-4 py-3 text-right">{selected.title}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#efe2cf] bg-white">
                                {batches.map((batch) => {
                                    const value =
                                        metric === 'aging'
                                            ? batch.aging
                                            : metric === 'completion'
                                              ? `${percentage(batch.processed, batch.waiting)}%`
                                              : batch.waiting;

                                    return (
                                        <tr key={batch.batch}>
                                            <td className="px-4 py-3 font-extrabold text-[#8b5709]">Batch {batch.batch}</td>
                                            <td className="px-4 py-3 text-right text-base font-black text-[#352515]">{value}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
