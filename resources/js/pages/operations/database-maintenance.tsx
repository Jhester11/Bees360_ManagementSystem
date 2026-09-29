import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Database, LoaderCircle } from 'lucide-react';

type Result = {
    sessionsRemoved: number | null;
    cacheRemoved: number | null;
    moreRemaining: boolean;
    completedAt: string;
};

type MaintenanceRun = {
    id: number;
    status: 'running' | 'completed' | 'partial' | 'failed' | 'interrupted';
    result: Result | null;
    startedAt: string;
};

const statusLabels = { running: 'Running', completed: 'Completed', partial: 'More cleanup available', failed: 'Failed', interrupted: 'Interrupted' };

export default function DatabaseMaintenance({ runs }: { runs: MaintenanceRun[] }) {
    const { post, processing, errors } = useForm<{ maintenance: string }>({ maintenance: '' });
    const result = runs[0]?.result;

    return (
        <AppLayout breadcrumbs={[{ title: 'Database Maintenance', href: '/operations/database-maintenance' }]}>
            <Head title="Database Maintenance" />
            <div className="p-6 md:p-10">
                <section className="max-w-3xl rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-6 shadow-sm">
                    <Database className="mb-4 size-8 text-[#a96300]" aria-hidden="true" />
                    <h1 className="text-2xl font-bold text-[#312416]">Database Maintenance</h1>
                    <p className="mt-3 text-[#756752]">
                        Clean up expired login sessions and temporary database cache entries to reduce unnecessary database storage.
                    </p>
                    <p className="mt-3 text-sm text-[#756752]">
                        Reports, QA feedback, processor accounts, and uploaded files are preserved. Active sessions and valid cache entries stay
                        available.
                    </p>
                    <p className="mt-3 text-sm text-[#756752]">
                        Each run cleans up to 5,000 expired entries per category. If more remain, you can run maintenance again. This cleanup does not
                        replace a database backup.
                    </p>
                    <button
                        type="button"
                        disabled={processing}
                        onClick={() => post('/operations/database-maintenance', { preserveScroll: true })}
                        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#cd7e00] px-5 py-3 font-semibold text-white hover:bg-[#a96300] disabled:cursor-wait disabled:opacity-60"
                    >
                        {processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                        {processing ? 'Running maintenance…' : 'Run Database Maintenance'}
                    </button>
                    {errors.maintenance && (
                        <p role="alert" className="mt-4 text-sm text-red-700">
                            {errors.maintenance}
                        </p>
                    )}
                    {result && !processing && !errors.maintenance && (
                        <div role="status" className="mt-6 rounded-xl border border-[#eadbc6] bg-white p-5">
                            <h2 className="font-semibold text-[#312416]">
                                {result.moreRemaining ? 'Maintenance batch completed' : 'Maintenance completed'}
                            </h2>
                            <p className="mt-1 text-sm text-[#756752]">{result.completedAt}</p>
                            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                <div>
                                    <dt className="text-[#756752]">Expired sessions removed</dt>
                                    <dd className="mt-1 font-semibold">{result.sessionsRemoved?.toLocaleString() ?? 'Not stored in database'}</dd>
                                </div>
                                <div>
                                    <dt className="text-[#756752]">Expired cache entries removed</dt>
                                    <dd className="mt-1 font-semibold">{result.cacheRemoved?.toLocaleString() ?? 'Not stored in database'}</dd>
                                </div>
                            </dl>
                            {result.moreRemaining && (
                                <p className="mt-4 text-sm text-[#a96300]">More expired entries remain. Run maintenance again to continue cleanup.</p>
                            )}
                        </div>
                    )}
                    <div className="mt-8 border-t border-[#eadbc6] pt-5">
                        <h2 className="font-semibold text-[#312416]">Recent maintenance runs</h2>
                        {runs.length === 0 && <p className="mt-3 text-sm text-[#756752]">No maintenance runs yet.</p>}
                        <ul className="mt-3 divide-y divide-[#eadbc6]">
                            {runs.map((run) => (
                                <li key={run.id} className="py-3 text-sm">
                                    <div className="flex flex-wrap justify-between gap-2">
                                        <span className="text-[#756752]">{run.startedAt}</span>
                                        <span className="font-semibold">{statusLabels[run.status]}</span>
                                    </div>
                                    {(run.status === 'failed' || run.status === 'interrupted') && (
                                        <p className="mt-2 text-[#756752]">
                                            This run did not finish. Some expired entries may have been cleaned. You can run maintenance again.
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
