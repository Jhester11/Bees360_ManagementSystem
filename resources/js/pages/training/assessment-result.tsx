import { Status, TrainingPage, secondary } from '@/components/training/training-ui';
import { Link } from '@inertiajs/react';
export default function Result({ attempt }: { attempt: any }) {
    const review = attempt.assessment.show_correct_answers;
    return (
        <TrainingPage title="Assessment Completed">
            <section
                className={`mx-auto max-w-3xl rounded-3xl border p-8 text-center ${attempt.passed ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}
            >
                <Status value={attempt.passed ? 'passed' : 'failed'} />
                <h2 className="mt-4 text-2xl font-black">{attempt.assessment.name}</h2>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        ['Score', `${attempt.score} / ${attempt.maximum_score}`],
                        ['Percentage', `${attempt.percentage}%`],
                        ['Passing', `${attempt.assessment.passing_score}%`],
                        ['Attempt', attempt.attempt_number],
                    ].map(([x, v]) => (
                        <div className="rounded-xl bg-white p-4" key={x}>
                            <p className="text-xs text-[#776750] uppercase">{x}</p>
                            <b className="text-xl">{v}</b>
                        </div>
                    ))}
                </div>
                <Link className={`${secondary} mt-6`} href="/training/my-training">
                    Back to My Training
                </Link>
            </section>
            {review && (
                <div className="mx-auto mt-6 max-w-3xl space-y-4">
                    {attempt.answers.map((a: any, i: number) => (
                        <article className="rounded-2xl border border-[#ead8bb] bg-white p-5" key={a.id}>
                            {a.question.image_path && (
                                <img
                                    src={`/training/questions/${a.question.id}/image`}
                                    alt={`Reference for question ${i + 1}`}
                                    className="mb-4 max-h-80 w-full rounded-xl border border-[#ead8bb] bg-[#fbf7ef] object-contain"
                                />
                            )}
                            <p className="font-black">
                                {i + 1}. {a.question.question}
                            </p>
                            <p className={`mt-2 text-sm ${a.is_correct ? 'text-emerald-700' : 'text-red-700'}`}>
                                Your answer: {a.choice?.choice || 'Unanswered'}
                            </p>
                            {!a.is_correct && <p className="mt-1 text-sm">Correct: {a.question.choices.find((c: any) => c.is_correct)?.choice}</p>}
                            {a.question.explanation && <p className="mt-3 rounded-lg bg-[#fff6df] p-3 text-sm">{a.question.explanation}</p>}
                        </article>
                    ))}
                </div>
            )}
        </TrainingPage>
    );
}
