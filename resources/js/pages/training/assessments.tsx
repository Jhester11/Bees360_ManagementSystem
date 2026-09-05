import { Assessment, Empty, Status, TrainingPage, button } from '@/components/training/training-ui';
import { Link, router } from '@inertiajs/react';
export default function Assessments({ assessments, materials }: { assessments: { data: Assessment[] }; materials: { id: number; title: string }[] }) {
    return (
        <TrainingPage
            title="Assessments"
            actions={
                <button className={button} disabled={!materials.length} onClick={() => router.visit('/training/assessments/new')}>
                    Create assessment
                </button>
            }
        >
            {assessments.data.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    {assessments.data.map((a) => (
                        <article key={a.id} className="rounded-2xl border border-[#ead8bb] bg-white p-5">
                            <div className="flex justify-between">
                                <p className="text-xs font-bold text-[#ac6500] uppercase">{a.material?.title}</p>
                                <Status value={a.is_published ? 'published' : 'draft'} />
                            </div>
                            <h2 className="mt-2 text-lg font-black">{a.name}</h2>
                            <p className="mt-2 text-sm text-[#746650]">
                                {(a as any).questions_count} questions · Pass {a.passing_score}% · {a.maximum_attempts} attempt(s)
                            </p>
                            <Link className="mt-4 inline-block font-bold text-[#a35e00]" href={`/training/assessments/${a.id}`}>
                                Edit assessment →
                            </Link>
                        </article>
                    ))}
                </div>
            ) : (
                <Empty text="No assessments have been created." />
            )}
        </TrainingPage>
    );
}
