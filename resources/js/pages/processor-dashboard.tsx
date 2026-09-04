import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage, usePoll } from '@inertiajs/react';
import { Award, CalendarDays, CheckCircle2, Eye, FileCheck2, Gauge, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Timezone = 'ph' | 'cst';
type Tier = { name: string; target: number; incentive: number; achieved: boolean; needed: number; percentage: number };
type Performance = {
    totalCases: number;
    generalExterior: number;
    fourPoint: number;
    credits: number;
    qaScore: number | null;
    qaReviews: number;
    incentive: number;
    tiers: Tier[];
};
type DailyOutput = { date: string; day: string; generalExterior: number; fourPoint: number; total: number };
type QaRecord = {
    id: number;
    date: string;
    projectId: string | null;
    qcName: string | null;
    reportUrl: string | null;
    score: number;
    feedback: string[];
};
type Props = {
    selectedMonth: string;
    periodLabel: string;
    availableMonths: { value: string; label: string }[];
    metrics: Record<Timezone, Performance>;
    dailyOutput: Record<Timezone, DailyOutput[]>;
    qaHistory: QaRecord[];
    phNow: string;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'My dashboard', href: '/dashboard' }];

function greeting(date: Date) {
    const hour = Number(
        new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Manila' }).format(date),
    );

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

function phDateTime(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Manila',
        timeZoneName: 'short',
    }).format(date);
}

function formatDate(date: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${date}T00:00:00Z`),
    );
}

function AnimatedGauge({ percentage, color = '#15865b' }: { percentage: number; color?: string }) {
    const [animated, setAnimated] = useState(0);

    useEffect(() => {
        setAnimated(0);
        const frame = requestAnimationFrame(() => setAnimated(Math.min(Math.max(percentage, 0), 100)));
        return () => cancelAnimationFrame(frame);
    }, [percentage]);

    return (
        <svg viewBox="0 0 200 118" className="h-28 w-full overflow-visible" aria-label={`${percentage}% progress`}>
            <path d="M 20 100 A 80 80 0 0 1 180 100" pathLength="100" fill="none" stroke="#e4e9e3" strokeWidth="17" strokeLinecap="round" />
            <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                pathLength="100"
                fill="none"
                stroke={color}
                strokeWidth="17"
                strokeLinecap="round"
                strokeDasharray="100"
                strokeDashoffset={100 - animated}
                className="transition-[stroke-dashoffset] duration-1000 ease-out"
            />
        </svg>
    );
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof FileCheck2; tone: string }) {
    return (
        <article className="group relative min-h-40 overflow-hidden rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(88,57,18,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(88,57,18,0.1)]">
            <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                <Icon className="size-5" />
            </span>
            <p className="mt-5 text-sm font-medium text-[#806f59]">{label}</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-[#342615]">{value.toLocaleString()}</p>
            <span className="absolute -right-8 -bottom-10 size-28 rounded-full bg-[#ffc83d]/10 transition duration-500 group-hover:scale-125" />
        </article>
    );
}

function TierCard({ tier, period }: { tier: Tier; period: string }) {
    return (
        <article
            className={`rounded-2xl border p-5 shadow-[0_8px_28px_rgba(88,57,18,0.05)] transition duration-300 hover:-translate-y-1 ${
                tier.achieved ? 'border-[#add8b3] bg-[#f4fbf1]' : 'border-[#eadbc6] bg-[#fffdf8]'
            }`}
        >
            <div className="flex items-center justify-between">
                <span className={`grid size-9 place-items-center rounded-xl ${tier.achieved ? 'bg-[#dff1da] text-[#24733d]' : 'bg-[#fff0c9] text-[#a96300]'}`}>
                    {tier.achieved ? <CheckCircle2 className="size-5" /> : <Award className="size-5" />}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#a96300] shadow-sm">${tier.incentive}</span>
            </div>
            <div className="relative mt-3">
                <AnimatedGauge percentage={tier.percentage} color={tier.achieved ? '#2dbb78' : '#e29a18'} />
                <div className="absolute inset-x-0 bottom-1 text-center">
                    <p className="text-2xl font-black text-[#342615]">{tier.percentage}%</p>
                    <p className="text-[10px] font-bold tracking-wide text-[#8b7454] uppercase">of {tier.target} credits</p>
                </div>
            </div>
            <div className="mt-2 text-center">
                <h3 className="font-black text-[#342615]">{tier.name}</h3>
                <p className="mt-1 text-[11px] font-semibold text-[#8b7454] uppercase">{period}</p>
            </div>
            <div className={`mt-4 rounded-xl border px-3 py-3 text-center ${tier.achieved ? 'border-[#b9ddb8] bg-[#e4f5e1]' : 'border-[#f0cf88] bg-[#fff2d2]'}`}>
                <p className={`text-[10px] font-bold uppercase ${tier.achieved ? 'text-[#24733d]' : 'text-[#a96300]'}`}>
                    {tier.achieved ? 'Target achieved' : 'Remaining credits'}
                </p>
                <p className={`mt-1 text-base font-black ${tier.achieved ? 'text-[#24733d]' : 'text-[#b96c00]'}`}>
                    {tier.achieved ? `$${tier.incentive} earned` : tier.needed.toLocaleString()}
                </p>
            </div>
        </article>
    );
}

export default function ProcessorDashboard({ selectedMonth, periodLabel, availableMonths, metrics, dailyOutput, qaHistory, phNow }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [timezone, setTimezone] = useState<Timezone>('ph');
    const [clock, setClock] = useState(() => new Date(phNow));
    const [monthLoading, setMonthLoading] = useState(false);
    const [feedbackRecord, setFeedbackRecord] = useState<QaRecord | null>(null);
    usePoll(30_000, { only: ['metrics', 'dailyOutput', 'qaHistory', 'phNow'] });

    useEffect(() => {
        const timer = window.setInterval(() => setClock(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const performance = metrics[timezone];
    const chartData = dailyOutput[timezone];
    const hasProduction = performance.totalCases > 0;
    const recurringFeedback = useMemo(() => {
        const counts = new Map<string, number>();
        qaHistory.flatMap((record) => record.feedback).forEach((feedback) => {
            if (!feedback || feedback.toLowerCase().includes('no error')) return;
            counts.set(feedback, (counts.get(feedback) ?? 0) + 1);
        });
        return [...counts.entries()].map(([feedback, count]) => ({ feedback, count })).sort((a, b) => b.count - a.count);
    }, [qaHistory]);

    function selectMonth(month: string) {
        setMonthLoading(true);
        router.get('/dashboard', { month }, { preserveState: true, preserveScroll: true, replace: true, onFinish: () => setMonthLoading(false) });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Bees360 dashboard" />
            <div className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 text-[#342615] md:p-8">
                <Dialog open={Boolean(feedbackRecord)} onOpenChange={(open) => !open && setFeedbackRecord(null)}>
                    <DialogContent className="max-w-xl border-[#ead5a6] bg-[#fffdf8] text-[#342615]">
                        <DialogHeader>
                            <DialogTitle>QA feedback · {feedbackRecord?.projectId || 'Assessment'}</DialogTitle>
                            <DialogDescription className="text-[#806f59]">
                                {feedbackRecord ? `${formatDate(feedbackRecord.date)} · ${feedbackRecord.score}% score` : ''}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid max-h-[55vh] gap-2 overflow-y-auto pr-1">
                            {feedbackRecord?.feedback.length ? (
                                feedbackRecord.feedback.map((item, index) => (
                                    <div key={`${item}-${index}`} className="rounded-xl border border-[#efdfc8] bg-white p-3 text-sm leading-6 text-[#5c4932]">
                                        {item}
                                    </div>
                                ))
                            ) : (
                                <p className="rounded-xl bg-[#eef8eb] p-4 text-sm font-semibold text-[#347846]">No errors were recorded for this assessment.</p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                <section className="relative overflow-hidden rounded-3xl bg-[#4a2d10] px-6 py-6 text-white shadow-[0_16px_40px_rgba(74,45,16,0.18)] md:px-8">
                    <div className="absolute -top-16 -right-10 size-52 rounded-full bg-[#ffc83d]/20" />
                    <div className="absolute right-28 -bottom-20 size-40 rotate-45 rounded-3xl border border-[#ffc83d]/15" />
                    <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                        <div>
                            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#ffc83d] uppercase">
                                <Sparkles className="size-4" /> My performance workspace
                            </p>
                            <h1 className="mt-3 text-3xl font-black tracking-tight">{greeting(clock)}, {auth.user.n_name || auth.user.name.split(' ')[0]}.</h1>
                            <p className="mt-2 text-sm text-[#ead8be]">Track your production, quality, and incentive progress in one place.</p>
                            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#fff2d2]">
                                <span className="size-2 animate-pulse rounded-full bg-[#68d391]" /> Live PH Time · {phDateTime(clock)}
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[440px]">
                            <label className="grid gap-2 text-xs font-bold text-[#ffe9b5]">
                                Reporting month
                                <span className="relative">
                                    <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#b96c00]" />
                                    <select
                                        value={selectedMonth}
                                        disabled={monthLoading}
                                        onChange={(event) => selectMonth(event.target.value)}
                                        className="h-11 w-full appearance-none rounded-xl border border-[#e0bd75] bg-[#fffdf8] pr-9 pl-10 text-sm font-bold text-[#4a3821] outline-none focus:ring-2 focus:ring-[#ffc83d]"
                                    >
                                        {availableMonths.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                                    </select>
                                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#b96c00]">▾</span>
                                </span>
                            </label>
                            <div className="grid gap-2 text-xs font-bold text-[#ffe9b5]">
                                Reporting timezone
                                <div className="flex h-11 rounded-xl bg-white/10 p-1 ring-1 ring-white/15">
                                    {(['ph', 'cst'] as Timezone[]).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => setTimezone(zone)}
                                            className={`flex-1 rounded-lg text-sm font-black transition duration-300 ${timezone === zone ? 'bg-[#ffc83d] text-[#3f280e] shadow' : 'text-white hover:bg-white/10'}`}
                                        >
                                            {zone === 'ph' ? 'PH Time' : 'CST Time'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Total cases" value={performance.totalCases} icon={FileCheck2} tone="bg-[#fff0c9] text-[#a96300]" />
                    <MetricCard label="General Exterior" value={performance.generalExterior} icon={ShieldCheck} tone="bg-[#e4f3df] text-[#347846]" />
                    <MetricCard label="4-Point" value={performance.fourPoint} icon={Gauge} tone="bg-[#efe6ff] text-[#7146c6]" />
                    <article className="relative min-h-40 overflow-hidden rounded-2xl border border-[#bcd9c8] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(20,122,81,0.07)]">
                        <div className="flex items-start justify-between">
                            <div><p className="text-sm font-bold">Total accuracy</p><p className="mt-1 text-xs text-[#806f59]">{periodLabel}</p></div>
                            <span className="grid size-9 place-items-center rounded-xl bg-[#e4f4ec] text-[#16815b]"><ShieldCheck className="size-5" /></span>
                        </div>
                        {performance.qaScore === null ? (
                            <div className="grid h-24 place-items-center text-center"><p className="text-sm font-bold text-[#806f59]">No QA data for this month</p></div>
                        ) : (
                            <div className="relative -mt-1">
                                <AnimatedGauge percentage={performance.qaScore} />
                                <div className="absolute inset-x-0 bottom-1 text-center"><p className="text-2xl font-black">{performance.qaScore}%</p><p className="text-[9px] font-bold text-[#16815b] uppercase">Total accuracy</p></div>
                            </div>
                        )}
                        <p className="text-center text-[11px] text-[#806f59]">{performance.qaReviews ? `Average from ${performance.qaReviews} QA assessments` : 'Awaiting QA assessments'}</p>
                    </article>
                </section>

                <section className="grid gap-4 xl:grid-cols-[minmax(340px,0.95fr)_repeat(3,minmax(220px,0.55fr))]">
                    <article className="relative overflow-hidden rounded-2xl bg-[#553112] p-6 text-white shadow-[0_12px_34px_rgba(74,45,16,0.16)]">
                        <span className="absolute -top-16 -right-12 size-44 rounded-full bg-[#e8a928]/25" />
                        <p className="text-xs font-black tracking-wide text-[#ffe0a0] uppercase">Total earned credits</p>
                        <p className="mt-1 text-xs font-semibold text-[#ead8be]">Monthly tier progress · {periodLabel}</p>
                        <p className="mt-4 text-4xl font-black tracking-tight">{performance.credits.toLocaleString()}</p>
                        <p className="mt-2 text-xs font-semibold text-[#ead8be]">{performance.generalExterior} × 1 + {performance.fourPoint} × 1.25</p>
                        <div className="mt-7 flex items-center justify-between rounded-xl bg-white/12 p-4">
                            <div><p className="text-xs text-[#ead8be]">Current incentive</p><p className="text-2xl font-black text-[#ffc83d]">${performance.incentive}</p></div>
                            <Target className="size-8 text-[#ffc83d]" />
                        </div>
                    </article>
                    {performance.tiers.map((tier) => <TierCard key={`${timezone}-${tier.name}`} tier={tier} period={periodLabel} />)}
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
                    <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(88,57,18,0.05)] sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div><p className="text-xs font-bold tracking-[0.16em] text-[#b26a00] uppercase">Monthly production</p><h2 className="mt-1 text-xl font-black">Daily report output</h2><p className="mt-1 text-sm text-[#806f59]">{periodLabel} · {timezone === 'ph' ? 'PH Time' : 'CST Time'}</p></div>
                            <div className="flex gap-3 text-xs font-semibold text-[#806f59]"><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#d89013]" />General Exterior</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#6d4bc3]" />4-Point</span></div>
                        </div>
                        {hasProduction ? (
                            <div className="mt-6 h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                                        <defs><linearGradient id="processorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ffc83d" stopOpacity={0.35} /><stop offset="95%" stopColor="#ffc83d" stopOpacity={0.02} /></linearGradient></defs>
                                        <CartesianGrid stroke="#eadfce" strokeDasharray="4 4" vertical={false} />
                                        <XAxis dataKey="day" stroke="#927d61" tickLine={false} axisLine={false} interval="preserveStartEnd" fontSize={11} />
                                        <YAxis stroke="#927d61" tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
                                        <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e4c98f', background: '#fffdf8', color: '#342615' }} />
                                        <Area type="monotone" dataKey="total" stroke="#a96700" strokeWidth={3} fill="url(#processorTotal)" isAnimationActive animationDuration={1100} />
                                        <Bar dataKey="generalExterior" fill="#d89013" radius={[5, 5, 0, 0]} maxBarSize={13} isAnimationActive animationDuration={900} />
                                        <Bar dataKey="fourPoint" fill="#6d4bc3" radius={[5, 5, 0, 0]} maxBarSize={13} isAnimationActive animationDuration={1200} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="mt-6 grid h-72 place-items-center rounded-2xl border border-dashed border-[#e1c894] bg-[#fffaf1] text-center"><div><FileCheck2 className="mx-auto size-10 text-[#d5a650]" /><p className="mt-3 font-black">No {timezone.toUpperCase()} production data</p><p className="mt-1 text-sm text-[#806f59]">No reports were imported for {periodLabel}.</p></div></div>
                        )}
                    </article>
                    <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_28px_rgba(88,57,18,0.05)] sm:p-6">
                        <p className="text-xs font-bold tracking-[0.16em] text-[#16815b] uppercase">Quality pattern</p><h2 className="mt-1 text-xl font-black">Recurring feedback</h2><p className="mt-1 text-sm text-[#806f59]">Repeated notes during {periodLabel}</p>
                        <div className="mt-5 grid max-h-72 gap-2 overflow-y-auto pr-1">
                            {recurringFeedback.length ? recurringFeedback.map((item) => (
                                <div key={item.feedback} className="flex gap-3 rounded-xl border border-[#efdfc8] bg-[#fffaf1] p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#ffe3a0] text-xs font-black text-[#9c5d00]">{item.count}×</span><p className="text-xs leading-5 text-[#5c4932]">{item.feedback}</p></div>
                            )) : <div className="rounded-xl bg-[#eef8eb] p-4 text-center text-sm font-semibold text-[#347846]">No recurring feedback for this month.</div>}
                        </div>
                    </article>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#bcd9c8] bg-[#fbfffb] shadow-[0_8px_28px_rgba(20,122,81,0.06)]">
                    <div className="border-b border-[#dceade] p-5 sm:p-6"><p className="text-xs font-bold tracking-[0.16em] text-[#16815b] uppercase">Quality history</p><h2 className="mt-1 text-xl font-black">My QA assessment records</h2><p className="mt-1 text-sm text-[#806f59]">{periodLabel} · {qaHistory.length} assessment{qaHistory.length === 1 ? '' : 's'}</p></div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-[#eaf5ee] text-xs font-bold tracking-wide text-[#3d6b52] uppercase"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Project</th><th className="px-5 py-3">QC</th><th className="px-5 py-3">Score</th><th className="px-5 py-3">Errors</th><th className="px-5 py-3 text-right">Feedback</th></tr></thead>
                            <tbody className="divide-y divide-[#e5eee7]">
                                {qaHistory.length ? qaHistory.map((record) => {
                                    const errors = record.feedback.filter((item) => item && !item.toLowerCase().includes('no error')).length;
                                    return <tr key={record.id} className="bg-white transition hover:bg-[#fffaf1]"><td className="px-5 py-3.5 text-[#806f59]">{formatDate(record.date)}</td><td className="px-5 py-3.5 font-bold">{record.projectId || '—'}</td><td className="px-5 py-3.5 text-[#806f59]">{record.qcName || '—'}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${record.score >= 95 ? 'bg-[#e1f3df] text-[#347846]' : record.score >= 90 ? 'bg-[#fff0c9] text-[#936000]' : 'bg-[#f9dfda] text-[#a5474b]'}`}>{record.score}%</span></td><td className="px-5 py-3.5 font-bold text-[#a96300]">{errors}</td><td className="px-5 py-3.5 text-right"><Button type="button" onClick={() => setFeedbackRecord(record)} className="h-9 border border-[#dfb96d] bg-[#fffaf1] text-[#8a5200] hover:bg-[#ffe8b5]"><Eye className="size-4" /> View</Button></td></tr>;
                                }) : <tr><td colSpan={6} className="px-5 py-10 text-center text-[#806f59]">No QA assessments are available for {periodLabel}.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
