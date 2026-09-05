import { Material, Status, TrainingPage, button, secondary } from '@/components/training/training-ui';
import { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
export default function Show({ material }: { material: Material }) {
    const role = usePage<SharedData>().props.auth.user.role;
    return (
        <TrainingPage
            title={material.title}
            actions={
                <div className="flex gap-2">
                    {['trainer', 'operations'].includes(role) && (
                        <Link className={secondary} href={`/training/materials/${material.id}/edit`}>
                            Edit
                        </Link>
                    )}
                    <Link className={button} href={`/training/materials/${material.id}/read`}>
                        Open digital book
                    </Link>
                </div>
            }
        >
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <article className="rounded-2xl border border-[#e8d4b4] bg-white p-7">
                    <Status value={material.status} />
                    <p className="mt-5 leading-7 text-[#665844]">{material.description || 'No description provided.'}</p>
                    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                        {[
                            ['Client', material.subject?.name],
                            ['Topic', material.topic?.name],
                            ['Training category', material.category],
                            ['Difficulty', material.difficulty],
                            ['Version', material.version],
                            ['Trainer', material.author?.name],
                            ['Reading time', `${material.estimated_reading_minutes} minutes`],
                            ['Audience', material.audiences?.map((a) => a.audience).join(', ')],
                        ].map(([k, v]) => (
                            <div key={k}>
                                <dt className="text-xs font-bold text-[#a06410] uppercase">{k}</dt>
                                <dd className="mt-1 font-semibold">{v}</dd>
                            </div>
                        ))}
                    </dl>
                </article>
                <aside className="rounded-2xl bg-[#4b2b0d] p-6 text-white">
                    <h2 className="text-lg font-black">Learning path</h2>
                    <ol className="mt-5 space-y-4 text-sm">
                        <li>1. Read the complete digital book</li>
                        <li>2. Progress saves automatically</li>
                        <li>3. {material.assessment_required ? 'Pass the required assessment' : 'Training completes at 100%'}</li>
                    </ol>
                    {material.assessment && (
                        <Link className="mt-6 inline-block font-bold text-[#ffd16b]" href={`/training/assessments/${material.assessment.id}/take`}>
                            Take assessment →
                        </Link>
                    )}
                </aside>
            </div>
        </TrainingPage>
    );
}
