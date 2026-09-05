import { Status, TrainingPage, field } from '@/components/training/training-ui';
import { router } from '@inertiajs/react';
export default function Reports({ rows, summary, filters }: { rows: any; summary: Record<string, number>; filters: any }) {
    return (
        <TrainingPage title="Training Reports">
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Object.entries(summary).map(([k, v]) => (
                    <div className="rounded-2xl border border-[#ead8bb] bg-white p-5" key={k}>
                        <p className="text-sm capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                        <b className="text-3xl">{k === 'averageScore' ? `${v}%` : v}</b>
                    </div>
                ))}
            </div>
            <div className="mb-4 flex gap-3">
                <input
                    className={`${field} max-w-xs`}
                    defaultValue={filters.user || ''}
                    placeholder="Filter by user"
                    onKeyDown={(e) => e.key === 'Enter' && router.get('/training/reports', { ...filters, user: e.currentTarget.value })}
                />
                <select
                    className={`${field} max-w-48`}
                    defaultValue={filters.status || ''}
                    onChange={(e) => router.get('/training/reports', { ...filters, status: e.target.value })}
                >
                    <option value="">All statuses</option>
                    {['not_started', 'in_progress', 'assessment_pending', 'completed', 'failed', 'overdue'].map((x) => (
                        <option key={x}>{x}</option>
                    ))}
                </select>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#ead8bb] bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#41280f] text-white">
                        <tr>
                            {['User', 'Training', 'Progress', 'Latest Score', 'Status'].map((x) => (
                                <th className="p-4" key={x}>
                                    {x}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.data.map((x: any) => (
                            <tr className="border-b" key={x.id}>
                                <td className="p-4 font-bold">{x.user.name}</td>
                                <td className="p-4">{x.assignment.material.title}</td>
                                <td className="p-4">{x.progress?.progress_percentage || 0}%</td>
                                <td className="p-4">{x.attempts[0] ? `${x.attempts[0].percentage}%` : '—'}</td>
                                <td className="p-4">
                                    <Status value={x.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </TrainingPage>
    );
}
