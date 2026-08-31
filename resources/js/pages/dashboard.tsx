import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowUpRight, Award, FileCheck2, Files, Trophy, UsersRound } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Operations dashboard',
        href: '/dashboard',
    },
];

// Temporary client-side visualization data until report records are available.
const weeklyReports = [
    { day: 'Mon', reports: 42 },
    { day: 'Tue', reports: 56 },
    { day: 'Wed', reports: 49 },
    { day: 'Thu', reports: 68 },
    { day: 'Fri', reports: 63 },
    { day: 'Sat', reports: 31 },
    { day: 'Sun', reports: 38 },
];

const topProcessors = [
    { rank: 1, name: 'Maria Santos', completed: 128, initials: 'MS', tone: 'bg-[#f8c956] text-[#5d3b00]' },
    { rank: 2, name: 'Jordan Lee', completed: 114, initials: 'JL', tone: 'bg-[#f5dfaa] text-[#754c00]' },
    { rank: 3, name: 'Aisha Rahman', completed: 97, initials: 'AR', tone: 'bg-[#e7c6a5] text-[#6b3b18]' },
];

const metrics = [
    { label: 'Reports polished this week', value: '347', note: '+12.8% from last week', icon: FileCheck2, tone: 'bg-[#fff0c9] text-[#a96300]' },
    { label: 'Total reports', value: '2,846', note: 'Across all report statuses', icon: Files, tone: 'bg-[#ffeadf] text-[#b34d10]' },
    { label: 'Total users', value: '186', note: '14 new users this month', icon: UsersRound, tone: 'bg-[#e6f5e5] text-[#28703c]' },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Operations dashboard" />

            <div className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 md:p-8">
                <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                    <div>
                        <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Operations overview</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">Good morning, Operations.</h1>
                        <p className="mt-2 text-sm text-[#776a57]">Here’s a snapshot of Bees360 activity for this week.</p>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eed8a9] bg-[#fff5dc] px-3 py-1.5 text-xs font-semibold text-[#936000]">
                        <span className="size-2 rounded-full bg-[#e29a17]" />
                        Sample dashboard data
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    {metrics.map((metric) => {
                        const Icon = metric.icon;

                        return (
                            <article
                                key={metric.label}
                                className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)]"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className={`grid size-11 place-items-center rounded-xl ${metric.tone}`}>
                                        <Icon className="size-5" />
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#398447]">
                                        <ArrowUpRight className="size-3.5" />
                                        Live view
                                    </span>
                                </div>
                                <p className="mt-5 text-sm font-medium text-[#806f59]">{metric.label}</p>
                                <p className="mt-1 text-3xl font-bold tracking-tight text-[#342615]">{metric.value}</p>
                                <p className="mt-2 text-xs text-[#9a8a72]">{metric.note}</p>
                            </article>
                        );
                    })}
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
                    <article className="min-w-0 rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-[#342615]">Reports polished weekly</h2>
                                <p className="mt-1 text-sm text-[#806f59]">Completed reports over the past seven days</p>
                            </div>
                            <div className="rounded-lg bg-[#fff1cc] px-3 py-2 text-right">
                                <p className="text-xs font-medium text-[#8b620f]">Weekly total</p>
                                <p className="text-lg font-bold text-[#694400]">347</p>
                            </div>
                        </div>

                        <div className="mt-6 h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weeklyReports} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="bees360ReportGradient" x1="0" x2="0" y1="0" y2="1">
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
                                        formatter={(value) => [`${value} reports`, 'Polished']}
                                        labelStyle={{ color: '#5d4830', fontWeight: 700 }}
                                    />
                                    <Area type="monotone" dataKey="reports" stroke="#c87c00" strokeWidth={3} fill="url(#bees360ReportGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)] sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-[#342615]">Top processors</h2>
                                <p className="mt-1 text-sm text-[#806f59]">Most finished reports this week</p>
                            </div>
                            <Trophy className="size-6 text-[#d59111]" />
                        </div>

                        <ol className="mt-6 grid gap-3">
                            {topProcessors.map((processor) => (
                                <li key={processor.rank} className="flex items-center gap-3 rounded-xl border border-[#f0e5d4] p-3">
                                    <div className="grid size-7 place-items-center rounded-full bg-[#fff1cf] text-xs font-bold text-[#9e6200]">
                                        {processor.rank}
                                    </div>
                                    <div className={`grid size-10 place-items-center rounded-full text-sm font-bold ${processor.tone}`}>
                                        {processor.initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-[#4a3821]">{processor.name}</p>
                                        <p className="text-xs text-[#91816a]">{processor.completed} reports finished</p>
                                    </div>
                                    {processor.rank === 1 && <Award className="size-5 text-[#d59111]" aria-label="First place" />}
                                </li>
                            ))}
                        </ol>

                        <Link
                            href="/operations/processors"
                            className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#a96300] hover:text-[#744400]"
                        >
                            View all processors
                            <ArrowUpRight className="size-4" />
                        </Link>
                    </article>
                </section>
            </div>
        </AppLayout>
    );
}
