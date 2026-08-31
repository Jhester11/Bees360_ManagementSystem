import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { BeesDatePicker, formatDate, philippinesToday } from '@/pages/dashboard';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CalendarDays, Layers3, Moon, PackageCheck, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';

type ReportType = 'midday' | 'endOfDay';
type Batch = 'batch1' | 'batch2' | 'batch3' | 'overall';

type ReportRow = {
    name: string;
    nickname: string;
    location: string;
    generalExtensions: number;
    fourPoint: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations dashboard', href: '/dashboard' },
    { title: 'Reports', href: '/operations/reports' },
];

const reportRows: ReportRow[] = [
    { name: 'Reginald King Palo', nickname: 'King', location: 'BPOSeats', generalExtensions: 13, fourPoint: 0 },
    { name: 'Lourdes M. Completado', nickname: 'Des', location: 'BPOSeats', generalExtensions: 14, fourPoint: 1 },
    { name: 'Christer John C. Gozon', nickname: 'Chris', location: 'Tarlac', generalExtensions: 10, fourPoint: 2 },
    { name: 'Elacio M. Santos Jr.', nickname: 'Don', location: 'BPOSeats', generalExtensions: 5, fourPoint: 0 },
    { name: 'Jhun Lester Cervantes', nickname: 'Jhun', location: 'BPOSeats', generalExtensions: 20, fourPoint: 14 },
    { name: 'Rheven Violet Aladin', nickname: 'Violet', location: 'Tarlac', generalExtensions: 20, fourPoint: 7 },
    { name: 'Arianne Joy Lopez', nickname: 'Ariann', location: 'BPOSeats', generalExtensions: 9, fourPoint: 0 },
    { name: 'Allan Layug', nickname: 'Allan', location: 'BPOSeats', generalExtensions: 7, fourPoint: 2 },
    { name: 'Wengmir A. Africa', nickname: 'Weng', location: 'BPOSeats', generalExtensions: 20, fourPoint: 0 },
    { name: 'Emma Alegre', nickname: 'Ems', location: 'BPOSeats', generalExtensions: 12, fourPoint: 5 },
    { name: 'Mc Oliver Noble', nickname: 'Oliver', location: 'BPOSeats', generalExtensions: 17, fourPoint: 0 },
    { name: 'Marie Anthonette Moog', nickname: 'Tonette', location: 'BPOSeats', generalExtensions: 6, fourPoint: 6 },
    { name: 'Camille D. Ramos', nickname: 'Camille', location: 'Tarlac', generalExtensions: 15, fourPoint: 3 },
    { name: 'Joshua A. Reyes', nickname: 'Josh', location: 'BPOSeats', generalExtensions: 11, fourPoint: 4 },
    { name: 'Nicole Anne Cruz', nickname: 'Nicole', location: 'BPOSeats', generalExtensions: 16, fourPoint: 2 },
    { name: 'Paolo M. Garcia', nickname: 'Paolo', location: 'Tarlac', generalExtensions: 8, fourPoint: 5 },
    { name: 'Samantha G. Flores', nickname: 'Sam', location: 'BPOSeats', generalExtensions: 18, fourPoint: 1 },
    { name: 'Miguel L. Navarro', nickname: 'Miguel', location: 'BPOSeats', generalExtensions: 13, fourPoint: 6 },
];

export default function Reports() {
    const [reportType, setReportType] = useState<ReportType>('midday');
    const [batch, setBatch] = useState<Batch>('overall');
    const [reportDate, setReportDate] = useState(philippinesToday);
    const rows = useMemo(() => {
        const batchRows =
            batch === 'batch1'
                ? reportRows.slice(0, 6)
                : batch === 'batch2'
                  ? reportRows.slice(6, 12)
                  : batch === 'batch3'
                    ? reportRows.slice(12)
                    : reportRows;

        return batchRows.map((row) => ({
            ...row,
            generalExtensions: reportType === 'midday' ? Math.max(0, row.generalExtensions - 4) : row.generalExtensions,
            fourPoint: reportType === 'midday' ? Math.floor(row.fourPoint / 2) : row.fourPoint,
        }));
    }, [batch, reportType]);
    const totals = rows.reduce(
        (total, row) => ({
            generalExtensions: total.generalExtensions + row.generalExtensions,
            fourPoint: total.fourPoint + row.fourPoint,
        }),
        { generalExtensions: 0, fourPoint: 0 },
    );
    const reportLabel = reportType === 'midday' ? 'Mid-Day Report' : 'End of Day Report';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />
            <div className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 md:p-8">
                <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Operations reporting</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">Daily reports</h1>
                        <p className="mt-2 text-sm text-[#776a57]">Review sample Mid-Day and End of Day production by batch.</p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eed8a9] bg-[#fff5dc] px-3 py-1.5 text-xs font-semibold text-[#936000]">
                        <span className="size-2 rounded-full bg-[#e29a17]" /> Sample report data
                    </span>
                </section>

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
                            value: batch === 'overall' ? 'All batches' : batch === 'batch1' ? 'Batch 1' : batch === 'batch2' ? 'Batch 2' : 'Batch 3',
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
                    <div className="flex flex-col justify-between gap-2 border-b border-[#f0e5d4] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                        <div>
                            <h2 className="font-bold text-[#342615]">{reportLabel}</h2>
                            <p className="mt-1 text-sm text-[#806f59]">
                                {batch === 'overall'
                                    ? 'Combined Batch 1, Batch 2, and Batch 3'
                                    : `${batch === 'batch1' ? 'First' : batch === 'batch2' ? 'Second' : 'Third'} processor group`}{' '}
                                · {formatDate(reportDate)}
                            </p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-[#3b2915] text-xs tracking-wide text-[#fff8e7] uppercase">
                                <tr>
                                    <th className="px-5 py-4">Names</th>
                                    <th className="px-5 py-4">N-Name</th>
                                    <th className="px-5 py-4">Loc</th>
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
                                        <td className="px-5 py-4 text-[#806f59]">{row.location}</td>
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
            </div>
        </AppLayout>
    );
}
