import { Empty, Status, TrainingPage, button } from '@/components/training/training-ui';
import { Link } from '@inertiajs/react';
export default function My({ assignments, summary }: { assignments: any[]; summary: Record<string, number> }) {
    return (
        <TrainingPage title="My Training">
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Object.entries(summary).map(([k, v]) => (
                    <div key={k} className="rounded-2xl border border-[#e7d5b8] bg-white p-5">
                        <p className="text-sm text-[#766650] capitalize">{k}</p>
                        <b className="text-3xl text-[#3e280f]">{v}</b>
                    </div>
                ))}
            </div>
            {assignments.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    {assignments.map((x) => {
                        const p = Number(x.progress?.progress_percentage || 0);
                        const canTake = p >= 100 && x.assignment.assessment;
                        return (
                            <article key={x.id} className="rounded-2xl border border-[#ead8bb] bg-white p-5">
                                <div className="flex justify-between">
                                    <p className="text-xs font-bold text-[#ad6600] uppercase">{x.assignment.material.subject?.name}</p>
                                    <Status value={x.status} />
                                </div>
                                <h2 className="mt-2 text-lg font-black">{x.assignment.material.title}</h2>
                                <p className="mt-2 text-sm">
                                    Due: {x.assignment.due_at ? new Date(x.assignment.due_at).toLocaleDateString() : 'No deadline'}
                                </p>
                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eee4d2]">
                                    <div className="h-full bg-[#d98a00]" style={{ width: `${p}%` }} />
                                </div>
                                <p className="mt-1 text-xs">Reading progress: {p}%</p>
                                <div className="mt-4 flex gap-2">
                                    <Link className={button} href={`/training/materials/${x.assignment.material.id}/read`}>
                                        {p ? 'Continue Reading' : 'Start Reading'}
                                    </Link>
                                    {x.assignment.assessment && (
                                        <Link
                                            aria-disabled={!canTake}
                                            className={`${button} ${!canTake ? 'pointer-events-none opacity-40' : ''}`}
                                            href={`/training/assessments/${x.assignment.assessment.id}/take`}
                                        >
                                            Take Assessment
                                        </Link>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <Empty text="No training has been assigned to you yet." />
            )}
        </TrainingPage>
    );
}
