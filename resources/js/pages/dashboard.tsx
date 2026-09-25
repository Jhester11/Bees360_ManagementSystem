import { BeesDatePicker } from '@/components/bees-date-picker';
import { ProcessorSelect } from '@/components/processor-select';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePoll } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    CalendarDays,
    Clock3,
    Download,
    FileCheck2,
    Gauge,
    LoaderCircle,
    ShieldCheck,
    Sparkles,
    Trophy,
    UsersRound,
} from 'lucide-react';
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
    premiumFourPoint: number;
};

type AccuracyRecord = {
    date: string;
    processor: string;
    projectId: string;
    score: number;
};

type DashboardProps = {
    showReportRange?: boolean;
    phToday: string;
    monthlyMetrics: {
        monthLabel: string;
        totalCases: number;
        generalExterior: number;
        fourPoint: number;
        premiumFourPoint: number;
        accuracy: number | null;
        assessments: number;
    };
    reportRecords: ReportRecord[];
    accuracyRecords: AccuracyRecord[];
    processorNames: string[];
    reportRange: { first: string | null; latest: string | null };
    overview: {
        totalReports: number;
        weeklyReports: number;
        activeProcessors: number;
        generalExterior: number;
        fourPoint: number;
        premiumFourPoint: number;
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
            premiumFourPoint: number;
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

function formatLongDate(date: string) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${date}T00:00:00Z`));
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

export default function Dashboard({
    showReportRange = false,
    phToday,
    monthlyMetrics,
    reportRecords,
    accuracyRecords,
    processorNames,
    reportRange,
    overview,
}: DashboardProps) {
    usePoll(30_000, { only: ['reportRecords', 'accuracyRecords', 'processorNames', 'reportRange', 'overview', 'phToday', 'monthlyMetrics'] });

    const [currentPhilippineDate, setCurrentPhilippineDate] = useState(philippinesDate);
    const referenceDate = showReportRange ? currentPhilippineDate : (reportRange.latest ?? currentPhilippineDate);
    const [startDate, setStartDate] = useState(`${referenceDate.slice(0, 8)}01`);
    const [endDate, setEndDate] = useState(referenceDate);
    const [selectedProcessor, setSelectedProcessor] = useState(showReportRange ? '' : 'all');
    const [appliedProcessor, setAppliedProcessor] = useState(showReportRange ? '' : 'all');
    const [greeting, setGreeting] = useState(philippineGreeting);
    const [exportingMtd, setExportingMtd] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

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

    const visibleAccuracyRecords = useMemo(
        () =>
            accuracyRecords.filter(
                (record) =>
                    record.date >= startDate &&
                    record.date <= endDate &&
                    appliedProcessor !== '' &&
                    (appliedProcessor === 'all' || record.processor === appliedProcessor),
            ),
        [accuracyRecords, appliedProcessor, endDate, startDate],
    );

    const accuracyData = useMemo(() => {
        const summarize = (items: AccuracyRecord[]) => ({
            average: items.length > 0 ? items.reduce((sum, item) => sum + item.score, 0) / items.length : null,
            reviews: items.length,
        });
        const byDate = new Map<string, AccuracyRecord[]>();
        const byProcessor = new Map<string, AccuracyRecord[]>();

        visibleAccuracyRecords.forEach((record) => {
            byDate.set(record.date, [...(byDate.get(record.date) ?? []), record]);
            byProcessor.set(record.processor, [...(byProcessor.get(record.processor) ?? []), record]);
        });

        return {
            overall: summarize(visibleAccuracyRecords),
            byDate: new Map(Array.from(byDate, ([key, items]) => [key, summarize(items)])),
            byProcessor: new Map(Array.from(byProcessor, ([key, items]) => [key, summarize(items)])),
            daily: Array.from(byDate, ([date, items]) => ({ date, ...summarize(items) })).sort((a, b) => a.date.localeCompare(b.date)),
        };
    }, [visibleAccuracyRecords]);

    const dashboardData = useMemo(() => {
        const daily = new Map<
            string,
            { date: string; dateLabel: string; reports: number; generalExterior: number; fourPoint: number; premiumFourPoint: number }
        >();
        const processors = new Map<string, { completed: number; generalExterior: number; fourPoint: number; premiumFourPoint: number }>();

        visibleRecords.forEach((record) => {
            const currentDaily = daily.get(record.date) ?? {
                date: record.date,
                dateLabel: record.dateLabel,
                reports: 0,
                generalExterior: 0,
                fourPoint: 0,
                premiumFourPoint: 0,
            };
            currentDaily.reports += record.reports;
            currentDaily.generalExterior += record.generalExterior;
            currentDaily.fourPoint += record.fourPoint;
            currentDaily.premiumFourPoint += record.premiumFourPoint;
            daily.set(record.date, currentDaily);
            const processor = processors.get(record.processor) ?? { completed: 0, generalExterior: 0, fourPoint: 0, premiumFourPoint: 0 };
            processor.completed += record.reports;
            processor.generalExterior += record.generalExterior;
            processor.fourPoint += record.fourPoint;
            processor.premiumFourPoint += record.premiumFourPoint;
            processors.set(record.processor, processor);
        });

        const dailyReports = Array.from(daily.values()).map((report) => ({ ...report, ...reportStatus(report.reports) }));
        const rankedProcessors = Array.from(processors, ([name, processor]) => ({
            name,
            completed: processor.completed,
            generalExterior: processor.generalExterior,
            fourPoint: processor.fourPoint,
            premiumFourPoint: processor.premiumFourPoint,
        })).sort((a, b) => b.completed - a.completed);
        const total = visibleRecords.reduce((sum, record) => sum + record.reports, 0);

        return {
            dailyReports,
            rankedProcessors,
            total,
            average: dailyReports.length ? Math.round(total / dailyReports.length) : 0,
            generalExterior: visibleRecords.reduce((sum, record) => sum + record.generalExterior, 0),
            fourPoint: visibleRecords.reduce((sum, record) => sum + record.fourPoint, 0),
            premiumFourPoint: visibleRecords.reduce((sum, record) => sum + record.premiumFourPoint, 0),
            delivered: dailyReports.filter((report) => report.label === 'Delivered').length,
            underDelivered: dailyReports.filter((report) => report.label === 'Under delivered').length,
            overDelivered: dailyReports.filter((report) => report.label === 'Over delivered').length,
        };
    }, [visibleRecords]);

    async function exportMtdReport() {
        if (!appliedProcessor || dashboardData.dailyReports.length === 0 || exportingMtd) return;

        setExportingMtd(true);
        setExportError(null);

        try {
            const XLSX = await import('xlsx-js-style');
            const selectionLabel = appliedProcessor === 'all' ? 'All processors' : appliedProcessor;
            const formattedRange = `${formatLongDate(startDate)} to ${formatLongDate(endDate)} (PHT)`;
            const titleStyle = {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { name: 'Century Gothic', sz: 12, bold: true, color: { rgb: 'FFF8E7' } },
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
            };
            const metricStyle = {
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                font: { name: 'Century Gothic', sz: 11, bold: true, color: { rgb: '694400' } },
                fill: { fgColor: { rgb: 'FFF0C5' } },
                border: {
                    top: { style: 'thin', color: { rgb: 'E2BD67' } },
                    bottom: { style: 'thin', color: { rgb: 'E2BD67' } },
                    left: { style: 'thin', color: { rgb: 'E2BD67' } },
                    right: { style: 'thin', color: { rgb: 'E2BD67' } },
                },
            };
            const chartSheet = XLSX.utils.aoa_to_sheet([
                ['BEES360 | MTD REPORT PERFORMANCE'],
                [`${formattedRange} · ${selectionLabel}`],
                [],
                [
                    'REPORTS ASSEMBLED',
                    dashboardData.total,
                    'AVERAGE PER DAY',
                    dashboardData.average,
                    'GENERAL EXTERIOR',
                    dashboardData.generalExterior,
                    '4-POINT',
                    dashboardData.fourPoint,
                    'PREMIUM 4-POINT',
                    dashboardData.premiumFourPoint,
                    'QA ACCURACY',
                    accuracyData.overall.average === null ? 'NO QA DATA' : accuracyData.overall.average / 100,
                ],
                [],
                ['REPORTS ASSEMBLED'],
                ['Full reporting days: 12:00 AM through 11:59:59 PM · Philippine Time (Asia/Manila, UTC+08:00)'],
            ]);
            chartSheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
                { s: { r: 5, c: 0 }, e: { r: 5, c: 11 } },
                { s: { r: 6, c: 0 }, e: { r: 6, c: 11 } },
            ];
            chartSheet['!cols'] = Array.from({ length: 12 }, () => ({ wch: 14 }));
            chartSheet['!rows'] = [{ hpt: 30 }, { hpt: 22 }, { hpt: 8 }, { hpt: 32 }, { hpt: 8 }, { hpt: 25 }, { hpt: 20 }, { hpt: 8 }];
            chartSheet.A1.s = titleStyle;
            chartSheet.A2.s = subtitleStyle;
            chartSheet.A6.s = headerStyle;
            chartSheet.A7.s = {
                ...bodyStyle,
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { ...bodyStyle.font, color: { rgb: '806F59' } },
            };

            for (const address of ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4', 'I4', 'J4', 'K4', 'L4']) {
                chartSheet[address].s = metricStyle;
            }
            if (accuracyData.overall.average !== null) chartSheet.L4.s = { ...metricStyle, numFmt: '0.00%' };
            chartSheet['!ref'] = 'A1:L26';

            const dailyHeaderRow = 4;
            const dailyFirstRow = dailyHeaderRow + 1;
            const dailyTotalRow = dailyFirstRow + dashboardData.dailyReports.length;
            const dailySheet = XLSX.utils.aoa_to_sheet([
                ['BEES360 | MTD DAILY DATA'],
                [`${formattedRange} · ${selectionLabel}`],
                [],
                [
                    'REPORT DATE',
                    'GENERAL EXTERIOR',
                    '4-POINT',
                    'PREMIUM 4-POINT',
                    'REPORTS ASSEMBLED',
                    'QA ACCURACY',
                    'QA REVIEWS',
                    'PENDING (MANUAL)',
                    'STATUS',
                ],
                ...dashboardData.dailyReports.map((day) => [
                    new Date(`${day.date}T00:00:00Z`),
                    day.generalExterior,
                    day.fourPoint,
                    day.premiumFourPoint,
                    day.reports,
                    accuracyData.byDate.get(day.date)?.average === undefined ? '' : accuracyData.byDate.get(day.date)!.average! / 100,
                    accuracyData.byDate.get(day.date)?.reviews ?? 0,
                    '',
                    day.label.toUpperCase(),
                ]),
                [
                    'MTD TOTAL',
                    dashboardData.generalExterior,
                    dashboardData.fourPoint,
                    dashboardData.premiumFourPoint,
                    dashboardData.total,
                    accuracyData.overall.average === null ? '' : accuracyData.overall.average / 100,
                    accuracyData.overall.reviews,
                    '',
                    '',
                ],
            ]);
            dailySheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
            ];
            dailySheet['!cols'] = [
                { wch: 18 },
                { wch: 20 },
                { wch: 14 },
                { wch: 20 },
                { wch: 18 },
                { wch: 18 },
                { wch: 14 },
                { wch: 20 },
                { wch: 22 },
            ];
            dailySheet.A1.s = titleStyle;
            dailySheet.A2.s = subtitleStyle;
            for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) dailySheet[`${column}${dailyHeaderRow}`].s = headerStyle;
            dailySheet[`H${dailyHeaderRow}`].s = { ...headerStyle, fill: { fgColor: { rgb: 'B96C00' } } };
            dashboardData.dailyReports.forEach((day, index) => {
                const row = dailyFirstRow + index;
                const fill = index % 2 === 0 ? 'FFFFFF' : 'FFF8E8';
                for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
                    dailySheet[`${column}${row}`].s = { ...bodyStyle, fill: { fgColor: { rgb: fill } } };
                }
                dailySheet[`A${row}`].s.numFmt = 'mmmm d, yyyy';
                dailySheet[`A${row}`].s.font = { ...bodyStyle.font, bold: true };
                dailySheet[`E${row}`] = { f: `SUM(B${row}:D${row})`, v: day.reports, t: 'n', s: dailySheet[`E${row}`].s };
                if (accuracyData.byDate.has(day.date)) dailySheet[`F${row}`].s.numFmt = '0.00%';
                dailySheet[`H${row}`].s = {
                    ...bodyStyle,
                    alignment: { horizontal: 'center', vertical: 'center' },
                    font: { ...bodyStyle.font, bold: true, color: { rgb: '8A5100' } },
                    fill: { fgColor: { rgb: 'FFF1CC' } },
                    numFmt: '#,##0',
                };
                const statusColors =
                    day.label === 'Under delivered'
                        ? { font: 'A5474B', fill: 'FDE1E2' }
                        : day.label === 'Over delivered'
                          ? { font: '477239', fill: 'E2EFD9' }
                          : { font: '936000', fill: 'FFF0C5' };
                dailySheet[`I${row}`].s = {
                    ...bodyStyle,
                    alignment: { horizontal: 'center', vertical: 'center' },
                    font: { ...bodyStyle.font, bold: true, color: { rgb: statusColors.font } },
                    fill: { fgColor: { rgb: statusColors.fill } },
                };
            });
            for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) dailySheet[`${column}${dailyTotalRow}`].s = metricStyle;
            dailySheet[`B${dailyTotalRow}`] = {
                f: `SUM(B${dailyFirstRow}:B${dailyTotalRow - 1})`,
                v: dashboardData.generalExterior,
                t: 'n',
                s: metricStyle,
            };
            dailySheet[`C${dailyTotalRow}`] = {
                f: `SUM(C${dailyFirstRow}:C${dailyTotalRow - 1})`,
                v: dashboardData.fourPoint,
                t: 'n',
                s: metricStyle,
            };
            dailySheet[`D${dailyTotalRow}`] = {
                f: `SUM(D${dailyFirstRow}:D${dailyTotalRow - 1})`,
                v: dashboardData.premiumFourPoint,
                t: 'n',
                s: metricStyle,
            };
            dailySheet[`E${dailyTotalRow}`] = {
                f: `SUM(E${dailyFirstRow}:E${dailyTotalRow - 1})`,
                v: dashboardData.total,
                t: 'n',
                s: metricStyle,
            };
            dailySheet[`F${dailyTotalRow}`].s = { ...metricStyle, numFmt: '0.00%' };
            dailySheet[`G${dailyTotalRow}`].s = metricStyle;
            dailySheet[`H${dailyTotalRow}`] = {
                f: `SUM(H${dailyFirstRow}:H${dailyTotalRow - 1})`,
                v: 0,
                t: 'n',
                s: { ...metricStyle, fill: { fgColor: { rgb: 'FFE3A0' } } },
            };
            const processorSheet = XLSX.utils.json_to_sheet(
                visibleRecords.map((record) => ({
                    'Report Date': new Date(`${record.date}T00:00:00Z`),
                    Processor: record.processor,
                    Batch: record.batch,
                    'General Exterior': record.generalExterior,
                    '4-Point': record.fourPoint,
                    'Premium 4-Point': record.premiumFourPoint,
                    'Reports Assembled': record.reports,
                    'MTD QA Accuracy':
                        accuracyData.byProcessor.get(record.processor)?.average === undefined
                            ? ''
                            : accuracyData.byProcessor.get(record.processor)!.average! / 100,
                    'Pending (Manual)': '',
                })),
            );
            processorSheet['!cols'] = [
                { wch: 16 },
                { wch: 30 },
                { wch: 10 },
                { wch: 20 },
                { wch: 14 },
                { wch: 20 },
                { wch: 18 },
                { wch: 20 },
                { wch: 20 },
            ];
            for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) processorSheet[`${column}1`].s = headerStyle;
            processorSheet.I1.s = { ...headerStyle, fill: { fgColor: { rgb: 'B96C00' } } };
            visibleRecords.forEach((_, index) => {
                const row = index + 2;
                const fill = index % 2 === 0 ? 'FFFFFF' : 'FFF8E8';
                for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
                    processorSheet[`${column}${row}`].s = { ...bodyStyle, fill: { fgColor: { rgb: fill } } };
                }
                processorSheet[`A${row}`].s = {
                    ...processorSheet[`A${row}`].s,
                    font: { ...bodyStyle.font, bold: true },
                    numFmt: 'mmmm d, yyyy',
                };
                processorSheet[`G${row}`].s.numFmt = '#,##0';
                if (processorSheet[`H${row}`].v !== '') processorSheet[`H${row}`].s.numFmt = '0.00%';
                processorSheet[`I${row}`].s = {
                    ...bodyStyle,
                    alignment: { horizontal: 'center', vertical: 'center' },
                    font: { ...bodyStyle.font, bold: true, color: { rgb: '8A5100' } },
                    fill: { fgColor: { rgb: 'FFF1CC' } },
                    numFmt: '#,##0',
                };
            });

            const processorTotalRow = visibleRecords.length + 2;
            XLSX.utils.sheet_add_aoa(processorSheet, [['MTD TOTAL', '', '', '', '', '', '', '', '']], { origin: `A${processorTotalRow}` });
            for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) processorSheet[`${column}${processorTotalRow}`].s = metricStyle;
            for (const column of ['D', 'E', 'F', 'G', 'I']) {
                processorSheet[`${column}${processorTotalRow}`] = {
                    f: `SUM(${column}2:${column}${processorTotalRow - 1})`,
                    v: visibleRecords.reduce(
                        (sum, record) =>
                            sum +
                            ({ D: record.generalExterior, E: record.fourPoint, F: record.premiumFourPoint, G: record.reports, I: 0 }[column] ?? 0),
                        0,
                    ),
                    t: 'n',
                    s: { ...metricStyle, numFmt: '#,##0', ...(column === 'I' ? { fill: { fgColor: { rgb: 'FFE3A0' } } } : {}) },
                };
            }

            const qaHeaderRow = 4;
            const qaFirstRow = qaHeaderRow + 1;
            const qaTotalRow = qaFirstRow + visibleAccuracyRecords.length;
            const qaSheet = XLSX.utils.aoa_to_sheet([
                ['BEES360 | QA SCORES'],
                [`${formattedRange} · ${selectionLabel}`],
                [],
                ['REPORT DATE', 'PROJECT ID', 'QA SCORE'],
                ...visibleAccuracyRecords.map((record) => [new Date(`${record.date}T00:00:00Z`), record.projectId, record.score / 100]),
                ['TOTAL ACCURACY', '', accuracyData.overall.average === null ? '' : accuracyData.overall.average / 100],
            ]);
            qaSheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
                { s: { r: qaTotalRow - 1, c: 0 }, e: { r: qaTotalRow - 1, c: 1 } },
            ];
            qaSheet['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 18 }];
            qaSheet.A1.s = titleStyle;
            qaSheet.A2.s = subtitleStyle;
            for (const column of ['A', 'B', 'C']) qaSheet[`${column}${qaHeaderRow}`].s = headerStyle;
            visibleAccuracyRecords.forEach((_, index) => {
                const row = qaFirstRow + index;
                const fill = index % 2 === 0 ? 'FFFFFF' : 'FFF8E8';
                for (const column of ['A', 'B', 'C']) {
                    qaSheet[`${column}${row}`].s = { ...bodyStyle, fill: { fgColor: { rgb: fill } } };
                }
                qaSheet[`A${row}`].s = {
                    ...qaSheet[`A${row}`].s,
                    font: { ...bodyStyle.font, bold: true },
                    numFmt: 'mmmm d, yyyy',
                };
                qaSheet[`C${row}`].s = { ...qaSheet[`C${row}`].s, numFmt: '0.00%' };
            });
            qaSheet[`A${qaTotalRow}`].s = metricStyle;
            qaSheet[`C${qaTotalRow}`].s = { ...metricStyle, numFmt: '0.00%' };
            if (visibleAccuracyRecords.length > 0) {
                qaSheet[`C${qaTotalRow}`] = {
                    f: `AVERAGE(C${qaFirstRow}:C${qaTotalRow - 1})`,
                    v: accuracyData.overall.average! / 100,
                    t: 'n',
                    s: { ...metricStyle, numFmt: '0.00%' },
                };
            }

            const workbook = XLSX.utils.book_new();
            workbook.Props = {
                Title: 'Bees360 MTD Report',
                Subject: `${formattedRange} · ${selectionLabel}`,
                Author: 'Bees360',
            };
            XLSX.utils.book_append_sheet(workbook, chartSheet, 'MTD Dashboard');
            XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Data');
            XLSX.utils.book_append_sheet(workbook, processorSheet, 'Processor Data');
            XLSX.utils.book_append_sheet(workbook, qaSheet, 'QA Scores');
            const workbookBytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true }) as ArrayBuffer;
            const { addNativeAreaChart, addNativeGaugeChart } = await import('@/lib/xlsx-native-chart');
            const areaChartWorkbook = addNativeAreaChart(new Uint8Array(workbookBytes), {
                title: 'Reports assembled',
                dataSheetName: 'Daily Data',
                firstDataRow: dailyFirstRow,
                categoryColumn: 'A',
                valueColumn: 'E',
                points: dashboardData.dailyReports.map((day) => ({ date: day.date, value: day.reports })),
            });
            const chartedWorkbook = addNativeGaugeChart(areaChartWorkbook, {
                title: 'Total Accuracy',
                worksheetIndex: 4,
                accuracy: accuracyData.overall.average,
                assessmentCount: accuracyData.overall.reviews,
                periodLabel: formattedRange,
            });
            const downloadBuffer = chartedWorkbook.buffer.slice(
                chartedWorkbook.byteOffset,
                chartedWorkbook.byteOffset + chartedWorkbook.byteLength,
            ) as ArrayBuffer;
            const downloadUrl = URL.createObjectURL(
                new Blob([downloadBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            );
            const download = document.createElement('a');
            download.href = downloadUrl;
            const exportName = (appliedProcessor === 'all' ? 'All Processors' : appliedProcessor)
                .replace(/[<>:"/\\|?*]/g, '_')
                .trim();
            download.download = `${exportName}.xlsx`;
            download.click();
            URL.revokeObjectURL(downloadUrl);
        } catch {
            setExportError('The MTD Excel report could not be generated. Please try again.');
        } finally {
            setExportingMtd(false);
        }
    }

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
                    <section data-tour="operations-welcome" className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                        <div>
                            <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Operations overview</p>
                            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">{greeting}, Operations.</h1>
                            <p className="mt-2 text-sm text-[#776a57]">A high-level view of the Bees360 workspace.</p>
                        </div>
                        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eed8a9] bg-[#fff5dc] px-3 py-1.5 text-xs font-semibold text-[#936000]">
                            <span className="size-2 rounded-full bg-[#4a9a55]" />
                            {reportRange.latest ? `Live PH month through ${formatDate(phToday)}` : 'No report data imported'}
                        </span>
                    </section>

                    <section data-tour="operations-summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        {[
                            {
                                label: 'Total cases',
                                value: overview.totalReports.toLocaleString(),
                                note: `All imported months · ${monthlyMetrics.monthLabel}: ${monthlyMetrics.totalCases.toLocaleString()}`,
                                icon: FileCheck2,
                                tone: 'bg-[#fff0c9] text-[#a96300]',
                            },
                            {
                                label: 'General Exterior',
                                value: monthlyMetrics.generalExterior.toLocaleString(),
                                note: monthlyMetrics.monthLabel,
                                icon: ShieldCheck,
                                tone: 'bg-[#e6f5e5] text-[#28703c]',
                            },
                            {
                                label: '4-Point',
                                value: monthlyMetrics.fourPoint.toLocaleString(),
                                note: monthlyMetrics.monthLabel,
                                icon: Gauge,
                                tone: 'bg-[#f1ebff] text-[#7440a2]',
                            },
                            {
                                label: 'Premium 4-Point',
                                value: monthlyMetrics.premiumFourPoint.toLocaleString(),
                                note: monthlyMetrics.monthLabel,
                                icon: Sparkles,
                                tone: 'bg-[#e8f2ff] text-[#2f659a]',
                            },
                        ].map((metric) => {
                            const Icon = metric.icon;
                            return (
                                <article
                                    key={metric.label}
                                    className="min-w-0 rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)]"
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
                        <article className="min-w-0 rounded-2xl border border-[#bcd9c8] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(20,122,81,0.06)]">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-bold text-[#342615]">Overall accuracy</p>
                                    <p className="mt-1 text-xs text-[#806f59]">{monthlyMetrics.monthLabel}</p>
                                </div>
                                <span className="grid size-9 place-items-center rounded-xl bg-[#e4f4ec] text-[#16815b]">
                                    <ShieldCheck className="size-5" />
                                </span>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                                <div className="size-14 shrink-0 rounded-full bg-[#e5f2e9] p-1" aria-hidden="true">
                                    <div className="grid size-full place-items-center rounded-full border-4 border-[#16815b] bg-white text-[#16815b]">
                                        <ShieldCheck className="size-5" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold tracking-tight text-[#342615]">
                                        {monthlyMetrics.accuracy === null ? '—' : `${monthlyMetrics.accuracy.toFixed(2)}%`}
                                    </p>
                                    <p className="text-xs text-[#806f59]">
                                        {monthlyMetrics.assessments
                                            ? `Average from ${monthlyMetrics.assessments} QA assessments`
                                            : 'No QA data this month'}
                                    </p>
                                </div>
                            </div>
                        </article>
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
                        <article
                            data-tour="weekly-production"
                            className="min-w-0 rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6"
                        >
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

                        <article
                            data-tour="report-mix"
                            className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-6 shadow-[0_8px_30px_rgb(88,57,18,0.05)]"
                        >
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
                                <div className="flex items-center justify-between rounded-xl bg-[#fff0c9] px-4 py-3">
                                    <span className="text-sm font-semibold text-[#6d5735]">Premium 4-Point</span>
                                    <span className="text-xl font-bold text-[#a96300]">{overview.premiumFourPoint.toLocaleString()}</span>
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

            <div data-tour="mtd-page" className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 md:p-8">
                <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
                    <div>
                        <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Operations overview</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">MTD report performance</h1>
                        <p className="mt-2 text-sm text-[#776a57]">Choose a date range and processor to review imported report production.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eed8a9] bg-[#fff5dc] px-3 py-1.5 text-xs font-semibold text-[#936000]">
                            <span className="size-2 rounded-full bg-[#4a9a55]" />
                            {reportRange.latest ? `Live data through ${formatDate(reportRange.latest)}` : 'No report data imported'}
                        </div>
                        <Button
                            type="button"
                            disabled={!appliedProcessor || dashboardData.dailyReports.length === 0 || exportingMtd}
                            onClick={() => void exportMtdReport()}
                            className="h-10 gap-2 rounded-xl bg-[#3f2b16] px-4 font-bold text-white hover:bg-[#28190c] disabled:bg-[#cdbd9f]"
                        >
                            {exportingMtd ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
                            {exportingMtd ? 'Building Excel…' : 'Export Excel'}
                        </Button>
                    </div>
                </section>

                {exportError && (
                    <p role="alert" className="rounded-xl border border-[#efc5c7] bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#a5474b]">
                        {exportError}
                    </p>
                )}

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
                            ? `Showing ${appliedProcessor === 'all' ? 'all processors' : appliedProcessor} from ${formatLongDate(startDate)} to ${formatLongDate(endDate)}.`
                            : 'Select a processor and click Compare periods to view MTD data.'}
                    </p>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
                    {[
                        { label: 'Reports assembled', value: dashboardData.total, icon: FileCheck2, tone: 'bg-[#fff0c9] text-[#a96300]' },
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
                        {
                            label: 'Premium 4-Point',
                            value: dashboardData.premiumFourPoint,
                            icon: FileCheck2,
                            tone: 'bg-[#fff0c9] text-[#a96300]',
                        },
                        {
                            label: 'QA accuracy',
                            value: accuracyData.overall.average === null ? '—' : `${accuracyData.overall.average.toFixed(2)}%`,
                            icon: BarChart3,
                            tone: 'bg-[#e2f3ed] text-[#24715a]',
                            note: accuracyData.overall.average === null ? 'No QA data in this range' : 'Average assessment score',
                        },
                        {
                            label: 'QA reviews',
                            value: accuracyData.overall.reviews,
                            icon: FileCheck2,
                            tone: 'bg-[#e8f2ff] text-[#2f659a]',
                            note: 'Assessments in selected range',
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
                                <p className="mt-2 text-xs text-[#9a8a72]">{'note' in metric ? metric.note : 'Imported report data'}</p>
                            </article>
                        );
                    })}
                </section>

                {appliedProcessor && (
                    <section className="overflow-hidden rounded-2xl border border-[#cfe5dc] bg-[#fbfffd] shadow-[0_8px_30px_rgb(36,113,90,0.06)]">
                        <div className="flex flex-col justify-between gap-3 border-b border-[#dcebe5] p-5 sm:flex-row sm:items-center sm:px-6">
                            <div>
                                <p className="text-xs font-bold tracking-[0.14em] text-[#24715a] uppercase">Quality performance</p>
                                <h2 className="mt-1 text-lg font-bold tracking-tight text-[#342615]">MTD QA results</h2>
                                <p className="mt-1 text-sm text-[#806f59]">
                                    {appliedProcessor === 'all' ? 'All processors' : appliedProcessor} · {formatLongDate(startDate)} to{' '}
                                    {formatLongDate(endDate)}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <span className="rounded-xl bg-[#e2f3ed] px-3 py-2 text-sm font-bold text-[#24715a]">
                                    {accuracyData.overall.average === null ? 'No score' : `${accuracyData.overall.average.toFixed(2)}% average`}
                                </span>
                                <span className="rounded-xl bg-[#e8f2ff] px-3 py-2 text-sm font-bold text-[#2f659a]">
                                    {accuracyData.overall.reviews} review{accuracyData.overall.reviews === 1 ? '' : 's'}
                                </span>
                            </div>
                        </div>
                        {accuracyData.daily.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#f0f8f5] text-xs tracking-wide text-[#55766a] uppercase">
                                        <tr>
                                            <th className="px-5 py-3 font-bold sm:px-6">Assessment date</th>
                                            <th className="px-5 py-3 font-bold">Average accuracy</th>
                                            <th className="px-5 py-3 font-bold">QA reviews</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#e2eee9]">
                                        {accuracyData.daily.map((day) => (
                                            <tr key={day.date}>
                                                <td className="px-5 py-3.5 font-semibold text-[#4a3821] sm:px-6">{formatDate(day.date)}</td>
                                                <td className="px-5 py-3.5 font-bold text-[#24715a]">
                                                    {day.average === null ? '—' : `${day.average.toFixed(2)}%`}
                                                </td>
                                                <td className="px-5 py-3.5 font-semibold text-[#4a3821]">{day.reviews}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="px-5 py-8 text-center text-sm text-[#806f59] sm:px-6">
                                No QA assessments are available for this processor and date range.
                            </p>
                        )}
                    </section>
                )}

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.7fr)]">
                    <article className="min-w-0 rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-[#342615]">Reports assembled</h2>
                                <p className="mt-1 text-sm text-[#806f59]">
                                    Daily completed reports from {formatLongDate(startDate)} to {formatLongDate(endDate)}
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
                                        <th className="px-5 py-3 font-bold">Reports assembled</th>
                                        <th className="px-5 py-3 font-bold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f1e7d8]">
                                    {dashboardData.dailyReports.length ? (
                                        dashboardData.dailyReports.map((report) => (
                                            <tr key={report.date}>
                                                <td className="px-5 py-3.5 font-bold text-[#4a3821]">{formatLongDate(report.date)}</td>
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
                                                The comparison was applied, but no production workbook rows are available for this processor and date
                                                range.
                                                {accuracyData.overall.reviews > 0 ? ' The available QA results are shown above.' : ''}
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
                                        {processor.generalExterior} GE · {processor.fourPoint} 4PT · {processor.premiumFourPoint} P4PT
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
