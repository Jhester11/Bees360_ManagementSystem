import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { BeesDatePicker, formatDate, philippinesToday, type ReportRecord } from '@/pages/dashboard';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Download, Equal, GitCompareArrows, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx-js-style';

type DateRange = {
    start: string;
    end: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations dashboard', href: '/dashboard' },
    { title: 'Report comparison', href: '/operations/report-comparison' },
];

function rangeLabel(range: DateRange) {
    return `${formatDate(range.start)} – ${formatDate(range.end)}`;
}

function deliveryStatus(total: number) {
    if (total < 25) return { label: 'Under delivered', className: 'bg-[#fde1e2] text-[#a5474b]', excelFill: 'FDE1E2', excelText: 'A5474B' };
    if (total > 31) return { label: 'Over delivered', className: 'bg-[#e2efd9] text-[#477239]', excelFill: 'E2EFD9', excelText: '477239' };

    return { label: 'Delivered', className: 'bg-[#fff0c5] text-[#936000]', excelFill: 'FFF0C5', excelText: '936000' };
}

function calculateRange(records: ReportRecord[], range: DateRange, processor: string) {
    const filteredRecords = records.filter(
        (record) => record.date >= range.start && record.date <= range.end && (processor === 'all' || record.processor === processor),
    );
    const daily = new Map<string, { date: string; label: string; generalExterior: number; fourPoint: number; total: number }>();
    const byProcessor = new Map<string, { completed: number; generalExterior: number; fourPoint: number }>();

    filteredRecords.forEach((record) => {
        const currentDay = daily.get(record.date) ?? {
            date: record.date,
            label: record.dateLabel,
            generalExterior: 0,
            fourPoint: 0,
            total: 0,
        };
        currentDay.generalExterior += record.generalExterior;
        currentDay.fourPoint += record.fourPoint;
        currentDay.total += record.reports;
        daily.set(record.date, currentDay);
        const processorTotals = byProcessor.get(record.processor) ?? { completed: 0, generalExterior: 0, fourPoint: 0 };
        processorTotals.completed += record.reports;
        processorTotals.generalExterior += record.generalExterior;
        processorTotals.fourPoint += record.fourPoint;
        byProcessor.set(record.processor, processorTotals);
    });

    return {
        total: filteredRecords.reduce((sum, record) => sum + record.reports, 0),
        generalExterior: filteredRecords.reduce((sum, record) => sum + record.generalExterior, 0),
        fourPoint: filteredRecords.reduce((sum, record) => sum + record.fourPoint, 0),
        days: Array.from(daily.values()),
        byProcessor,
    };
}

export default function ReportComparison({
    reportRecords,
    processorNames,
    reportRange,
}: {
    reportRecords: ReportRecord[];
    processorNames: string[];
    reportRange: { first: string | null; latest: string | null };
}) {
    const latestDate = reportRange.latest ?? philippinesToday;
    const monthStart = `${latestDate.slice(0, 8)}01`;
    const [firstRange, setFirstRange] = useState<DateRange>({ start: monthStart, end: latestDate });
    const [secondRange, setSecondRange] = useState<DateRange>({ start: monthStart, end: latestDate });
    const [draftFirstRange, setDraftFirstRange] = useState(firstRange);
    const [draftSecondRange, setDraftSecondRange] = useState(secondRange);
    const [selectedProcessor, setSelectedProcessor] = useState('');
    const [appliedProcessor, setAppliedProcessor] = useState('');

    const firstData = useMemo(() => calculateRange(reportRecords, firstRange, appliedProcessor), [appliedProcessor, firstRange, reportRecords]);
    const secondData = useMemo(() => calculateRange(reportRecords, secondRange, appliedProcessor), [appliedProcessor, reportRecords, secondRange]);
    const pending =
        firstRange.start !== draftFirstRange.start ||
        firstRange.end !== draftFirstRange.end ||
        secondRange.start !== draftSecondRange.start ||
        secondRange.end !== draftSecondRange.end ||
        selectedProcessor !== appliedProcessor;
    const difference = firstData.total - secondData.total;
    const processorRows = processorNames
        .filter((name) => appliedProcessor === 'all' || name === appliedProcessor)
        .map((name) => {
            const first = firstData.byProcessor.get(name) ?? { completed: 0, generalExterior: 0, fourPoint: 0 };
            const second = secondData.byProcessor.get(name) ?? { completed: 0, generalExterior: 0, fourPoint: 0 };

            return {
                name,
                first: first.completed,
                second: second.completed,
                difference: first.completed - second.completed,
                firstGeneralExterior: first.generalExterior,
                firstFourPoint: first.fourPoint,
                secondGeneralExterior: second.generalExterior,
                secondFourPoint: second.fourPoint,
            };
        });

    function exportComparison() {
        if (!appliedProcessor) return;

        const headerRow = 4;
        const firstDataRow = headerRow + 1;
        const totalRow = firstDataRow + processorRows.length;
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['BEES360 | REPORT PERIOD COMPARISON'],
            [`${appliedProcessor === 'all' ? 'All processors' : appliedProcessor} · ${rangeLabel(firstRange)} vs ${rangeLabel(secondRange)}`],
            [],
            ['PROCESSOR', 'PERIOD A', 'A GEN EXT', 'A 4-POINT', 'A TOTAL', 'PERIOD B', 'B GEN EXT', 'B 4-POINT', 'B TOTAL', 'DIFFERENCE'],
            ...processorRows.map((row) => [
                row.name,
                rangeLabel(firstRange),
                row.firstGeneralExterior,
                row.firstFourPoint,
                row.first,
                rangeLabel(secondRange),
                row.secondGeneralExterior,
                row.secondFourPoint,
                row.second,
                row.difference,
            ]),
            [
                'COMPARISON TOTAL',
                '',
                firstData.generalExterior,
                firstData.fourPoint,
                firstData.total,
                '',
                secondData.generalExterior,
                secondData.fourPoint,
                secondData.total,
                difference,
            ],
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
        const numberStyle = { ...bodyStyle, alignment: { horizontal: 'center', vertical: 'center' }, numFmt: '#,##0' };
        const totalStyle = {
            alignment: { horizontal: 'center', vertical: 'center' },
            font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: '5A3900' } },
            fill: { fgColor: { rgb: 'FFF0C5' } },
            border: { top: { style: 'medium', color: { rgb: '4A351D' } } },
            numFmt: '#,##0',
        };
        const finalTotalStyle = { ...totalStyle, fill: { fgColor: { rgb: 'F2CF72' } } };
        const whiteCellStyle = {
            font: { name: 'Century Gothic', sz: 10, color: { rgb: '4A3821' } },
            fill: { fgColor: { rgb: 'FFFFFF' } },
        };

        for (let row = 1; row <= totalRow; row += 1) {
            for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) {
                const address = `${column}${row}`;
                worksheet[address] ??= { t: 's', v: '' };
                worksheet[address].s = whiteCellStyle;
            }
        }

        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
            { s: { r: totalRow - 1, c: 0 }, e: { r: totalRow - 1, c: 1 } },
        ];
        worksheet['!cols'] = [
            { wch: 29 },
            { wch: 25 },
            { wch: 13 },
            { wch: 13 },
            { wch: 12 },
            { wch: 25 },
            { wch: 13 },
            { wch: 13 },
            { wch: 12 },
            { wch: 13 },
        ];
        worksheet['!rows'] = [{ hpt: 27 }, { hpt: 20 }, { hpt: 8 }, { hpt: 28 }];
        worksheet.A1.s = titleStyle;
        worksheet.A2.s = subtitleStyle;

        for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) worksheet[`${column}${headerRow}`].s = headerStyle;
        processorRows.forEach((_, index) => {
            const rowNumber = firstDataRow + index;
            worksheet[`A${rowNumber}`].s = bodyStyle;
            for (const column of ['B', 'F'])
                worksheet[`${column}${rowNumber}`].s = { ...bodyStyle, alignment: { horizontal: 'center', vertical: 'center' } };
            for (const column of ['C', 'D', 'E', 'G', 'H', 'I', 'J']) worksheet[`${column}${rowNumber}`].s = numberStyle;
        });
        for (const column of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) worksheet[`${column}${totalRow}`].s = totalStyle;
        worksheet[`J${totalRow}`].s = finalTotalStyle;
        worksheet['!freeze'] = { xSplit: 0, ySplit: headerRow, topLeftCell: `A${firstDataRow}`, activePane: 'bottomLeft', state: 'frozen' };

        function dailyWorksheet(
            period: string,
            range: DateRange,
            days: { date: string; label: string; generalExterior: number; fourPoint: number; total: number }[],
            totals: { generalExterior: number; fourPoint: number; total: number },
        ) {
            const dailyTotalRow = firstDataRow + days.length;
            const sheet = XLSX.utils.aoa_to_sheet([
                [`BEES360 | ${period.toUpperCase()} DAILY REPORTS`],
                [`${appliedProcessor === 'all' ? 'All processors' : appliedProcessor} · ${rangeLabel(range)}`],
                [],
                ['REPORT DATE', 'GEN EXT', '4-POINT', 'TOTAL', 'STATUS'],
                ...days.map((day) => [formatDate(day.date), day.generalExterior, day.fourPoint, day.total, deliveryStatus(day.total).label]),
                ['PERIOD TOTAL', totals.generalExterior, totals.fourPoint, totals.total, ''],
            ]) as XLSX.WorkSheet;

            for (let row = 1; row <= dailyTotalRow; row += 1) {
                for (const column of ['A', 'B', 'C', 'D', 'E']) {
                    const address = `${column}${row}`;
                    sheet[address] ??= { t: 's', v: '' };
                    sheet[address].s = whiteCellStyle;
                }
            }

            sheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
            ];
            sheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 20 }];
            sheet['!rows'] = [{ hpt: 27 }, { hpt: 20 }, { hpt: 8 }, { hpt: 28 }];
            sheet.A1.s = titleStyle;
            sheet.A2.s = subtitleStyle;
            for (const column of ['A', 'B', 'C', 'D', 'E']) sheet[`${column}${headerRow}`].s = headerStyle;
            days.forEach((day, index) => {
                const rowNumber = firstDataRow + index;
                const status = deliveryStatus(day.total);
                sheet[`A${rowNumber}`].s = { ...bodyStyle, alignment: { horizontal: 'center', vertical: 'center' } };
                for (const column of ['B', 'C', 'D']) sheet[`${column}${rowNumber}`].s = numberStyle;
                sheet[`E${rowNumber}`].s = {
                    ...bodyStyle,
                    alignment: { horizontal: 'center', vertical: 'center' },
                    font: { name: 'Century Gothic', sz: 10, bold: true, color: { rgb: status.excelText } },
                    fill: { fgColor: { rgb: status.excelFill } },
                };
            });
            for (const column of ['A', 'B', 'C', 'D', 'E']) sheet[`${column}${dailyTotalRow}`].s = totalStyle;
            sheet[`D${dailyTotalRow}`].s = finalTotalStyle;
            sheet['!freeze'] = { xSplit: 0, ySplit: headerRow, topLeftCell: `A${firstDataRow}`, activePane: 'bottomLeft', state: 'frozen' };

            return sheet;
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Comparison');
        XLSX.utils.book_append_sheet(workbook, dailyWorksheet('Period A', firstRange, firstData.days, firstData), 'Period A Daily');
        XLSX.utils.book_append_sheet(workbook, dailyWorksheet('Period B', secondRange, secondData.days, secondData), 'Period B Daily');
        XLSX.writeFile(workbook, `Bees360_Report_Comparison_${firstRange.start}_vs_${secondRange.start}.xlsx`, { compression: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Report comparison" />

            <div className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 md:p-8">
                <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Operations reporting</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">Compare report periods</h1>
                        <p className="mt-2 max-w-2xl text-sm text-[#776a57]">Compare any two date ranges using your imported Bees360 report data.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eed8a9] bg-white px-3 py-1.5 text-xs font-semibold text-[#936000]">
                            <span className="size-2 rounded-full bg-[#4a9a55]" />
                            {reportRange.latest ? `Live data through ${formatDate(reportRange.latest)}` : 'No report data imported'}
                        </span>
                        <Button
                            type="button"
                            disabled={!appliedProcessor}
                            onClick={exportComparison}
                            className="h-10 gap-2 rounded-xl bg-[#4a351d] px-4 font-bold text-white hover:bg-[#2f2112] disabled:bg-[#c7bba9]"
                        >
                            <Download className="size-4" />
                            Export Excel
                        </Button>
                    </div>
                </section>

                <section className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                    <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-[#fff0c9] text-[#a96300]">
                            <GitCompareArrows className="size-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-[#342615]">Select two reporting periods</h2>
                            <p className="text-sm text-[#806f59]">Each period keeps its own date range.</p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr_220px]">
                        {[
                            { title: 'Period A', range: draftFirstRange, setRange: setDraftFirstRange },
                            { title: 'Period B', range: draftSecondRange, setRange: setDraftSecondRange },
                        ].map(({ title, range, setRange }) => (
                            <div key={title} className="rounded-2xl border border-[#efdbac] bg-[#fff9ec] p-4">
                                <p className="mb-3 text-sm font-bold text-[#5d4830]">{title}</p>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                    <BeesDatePicker
                                        id={`${title}-start`}
                                        label="Start date"
                                        value={range.start}
                                        min={reportRange.first ?? undefined}
                                        max={range.end}
                                        onChange={(start) =>
                                            setRange((current) => ({ ...current, start, end: current.end < start ? start : current.end }))
                                        }
                                    />
                                    <BeesDatePicker
                                        id={`${title}-end`}
                                        label="End date"
                                        value={range.end}
                                        min={range.start}
                                        max={reportRange.latest ?? philippinesToday}
                                        onChange={(end) => setRange((current) => ({ ...current, end }))}
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="grid content-start gap-4 rounded-2xl border border-[#efdbac] bg-[#fff9ec] p-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-bold text-[#5d4830]" htmlFor="comparison-processor">
                                    Processor name
                                </label>
                                <Select value={selectedProcessor} onValueChange={setSelectedProcessor}>
                                    <SelectTrigger
                                        id="comparison-processor"
                                        className="h-11 rounded-xl border-[#e2d1b8] bg-white text-[#4b3820] focus:ring-[#d78b13]"
                                    >
                                        <UsersRound className="mr-2 size-4 text-[#a96300]" />
                                        <SelectValue placeholder="Select a processor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All processors</SelectItem>
                                        {processorNames.map((name) => (
                                            <SelectItem key={name} value={name}>
                                                {name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#efdbac] pt-4">
                        <p className="text-xs text-[#887760]">Counts use the report dates stored during Excel import.</p>
                        <Button
                            type="button"
                            disabled={!selectedProcessor || !pending}
                            onClick={() => {
                                setFirstRange(draftFirstRange);
                                setSecondRange(draftSecondRange);
                                setAppliedProcessor(selectedProcessor);
                            }}
                            className="h-10 gap-2 rounded-xl bg-[#b96c00] px-4 font-bold text-white hover:bg-[#925400] disabled:bg-[#d5b87c]"
                        >
                            <BarChart3 className="size-4" /> Compare periods
                        </Button>
                    </div>
                </section>

                {appliedProcessor ? (
                    <>
                        <section className="grid gap-4 lg:grid-cols-5">
                            {[
                                {
                                    label: 'Period A reports',
                                    value: firstData.total,
                                    description: rangeLabel(firstRange),
                                    tone: 'bg-[#fff0c9] text-[#a96300]',
                                },
                                {
                                    label: 'Period B reports',
                                    value: secondData.total,
                                    description: rangeLabel(secondRange),
                                    tone: 'bg-[#ffeadf] text-[#b34d10]',
                                },
                                {
                                    label: 'Difference',
                                    value: `${difference > 0 ? '+' : ''}${difference}`,
                                    description:
                                        difference === 0 ? 'No change between periods' : `Period ${difference > 0 ? 'A is higher' : 'B is higher'}`,
                                    tone: difference >= 0 ? 'bg-[#e6f5e5] text-[#28703c]' : 'bg-[#fde1e2] text-[#a5474b]',
                                },
                                {
                                    label: 'Period A 4-Point',
                                    value: firstData.fourPoint,
                                    description: rangeLabel(firstRange),
                                    tone: 'bg-[#e6f5e5] text-[#28703c]',
                                },
                                {
                                    label: 'Period B 4-Point',
                                    value: secondData.fourPoint,
                                    description: rangeLabel(secondRange),
                                    tone: 'bg-[#edf0ff] text-[#4958a4]',
                                },
                            ].map((metric) => (
                                <article
                                    key={metric.label}
                                    className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)]"
                                >
                                    <div className={`grid size-10 place-items-center rounded-xl ${metric.tone}`}>
                                        <CalendarDays className="size-5" />
                                    </div>
                                    <p className="mt-4 text-sm font-medium text-[#806f59]">{metric.label}</p>
                                    <p className="mt-1 text-3xl font-bold tracking-tight text-[#342615]">{metric.value}</p>
                                    <p className="mt-2 text-xs text-[#9a8a72]">{metric.description}</p>
                                </article>
                            ))}
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-[#eadbc6] bg-[#fffdf8] shadow-[0_8px_30px_rgb(88,57,18,0.05)]">
                            <div className="flex flex-col justify-between gap-4 border-b border-[#f0e5d4] p-5 sm:p-6 lg:flex-row lg:items-center">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-[#342615]">Processor difference table</h2>
                                    <p className="mt-1 text-sm text-[#806f59]">
                                        See completed reports, category mix, and the exact change between the two periods.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                    <span className="text-[#806f59]">Daily status:</span>
                                    <span className="rounded-full bg-[#fde1e2] px-2.5 py-1 text-[#a5474b]">Under &lt; 25</span>
                                    <span className="rounded-full bg-[#fff0c5] px-2.5 py-1 text-[#936000]">Delivered 25–31</span>
                                    <span className="rounded-full bg-[#e2efd9] px-2.5 py-1 text-[#477239]">Over &gt; 31</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1000px] text-left text-sm">
                                    <thead className="bg-[#fff8e8] text-xs tracking-wide text-[#806f59] uppercase">
                                        <tr>
                                            <th className="px-5 py-3 font-bold">Processor</th>
                                            <th className="px-5 py-3 font-bold">Period A · {rangeLabel(firstRange)}</th>
                                            <th className="px-5 py-3 font-bold">Period B · {rangeLabel(secondRange)}</th>
                                            <th className="px-5 py-3 font-bold">Report difference</th>
                                            <th className="px-5 py-3 font-bold">Period A mix</th>
                                            <th className="px-5 py-3 font-bold">Period B mix</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f1e7d8]">
                                        {processorRows.map((row) => (
                                            <tr key={row.name}>
                                                <td className="px-5 py-4 font-bold text-[#4a3821]">{row.name}</td>
                                                <td className="px-5 py-4 font-semibold text-[#4a3821]">{row.first}</td>
                                                <td className="px-5 py-4 font-semibold text-[#4a3821]">{row.second}</td>
                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${row.difference > 0 ? 'bg-[#e2efd9] text-[#477239]' : row.difference < 0 ? 'bg-[#fde1e2] text-[#a5474b]' : 'bg-[#f1ede4] text-[#776a57]'}`}
                                                    >
                                                        {row.difference > 0 ? (
                                                            <ArrowUpRight className="size-3.5" />
                                                        ) : row.difference < 0 ? (
                                                            <ArrowDownRight className="size-3.5" />
                                                        ) : (
                                                            <Equal className="size-3.5" />
                                                        )}
                                                        {row.difference > 0 ? '+' : ''}
                                                        {row.difference}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 font-semibold text-[#28703c]">
                                                    {row.firstGeneralExterior} GE · {row.firstFourPoint} 4PT
                                                </td>
                                                <td className="px-5 py-4 font-semibold text-[#4958a4]">
                                                    {row.secondGeneralExterior} GE · {row.secondFourPoint} 4PT
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="grid gap-6 xl:grid-cols-2">
                            {[
                                { title: 'Period A daily reports', range: firstRange, data: firstData },
                                { title: 'Period B daily reports', range: secondRange, data: secondData },
                            ].map(({ title, range, data }) => (
                                <article
                                    key={title}
                                    className="overflow-hidden rounded-2xl border border-[#eadbc6] bg-[#fffdf8] shadow-[0_8px_30px_rgb(88,57,18,0.05)]"
                                >
                                    <div className="border-b border-[#f0e5d4] p-5">
                                        <h2 className="font-bold text-[#342615]">{title}</h2>
                                        <p className="mt-1 text-sm text-[#806f59]">{rangeLabel(range)}</p>
                                    </div>
                                    <div>
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-[#fff8e8] text-xs tracking-wide text-[#806f59] uppercase">
                                                <tr>
                                                    <th className="px-5 py-3">Date</th>
                                                    <th className="px-5 py-3">Gen Ext</th>
                                                    <th className="px-5 py-3">4-Point</th>
                                                    <th className="px-5 py-3">Completed</th>
                                                    <th className="px-5 py-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#f1e7d8]">
                                                {data.days.map((day) => {
                                                    const status = deliveryStatus(day.total);

                                                    return (
                                                        <tr key={day.date}>
                                                            <td className="px-5 py-3 font-semibold text-[#4a3821]">{day.label}</td>
                                                            <td className="px-5 py-3 font-semibold text-[#4a3821]">{day.generalExterior}</td>
                                                            <td className="px-5 py-3 font-semibold text-[#4a3821]">{day.fourPoint}</td>
                                                            <td className="px-5 py-3 font-bold text-[#4a3821]">{day.total}</td>
                                                            <td className="px-5 py-3">
                                                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>
                                                                    {status.label}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </article>
                            ))}
                        </section>
                    </>
                ) : (
                    <section className="rounded-2xl border border-dashed border-[#dfc58f] bg-[#fffdf8] px-6 py-14 text-center shadow-[0_8px_30px_rgb(88,57,18,0.05)]">
                        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff0c9] text-[#a96300]">
                            <UsersRound className="size-6" />
                        </div>
                        <h2 className="mt-4 text-lg font-bold text-[#342615]">Ready to compare periods</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#806f59]">
                            Select a processor above, choose both reporting periods, then click Compare periods to load the imported report data.
                        </p>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
