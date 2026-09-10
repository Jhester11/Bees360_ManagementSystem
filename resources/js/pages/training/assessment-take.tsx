import { Assessment, Question, TrainingPage, button, secondary } from '@/components/training/training-ui';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type AssessmentAttempt = { id: number; started_at: string };

export default function Take({ assessment, attempt, questions }: { assessment: Assessment; attempt: AssessmentAttempt; questions: Question[] }) {
    const [index, setIndex] = useState(0),
        [answers, setAnswers] = useState<Record<number, number>>({}),
        [seconds, setSeconds] = useState(
            assessment.time_limit_minutes
                ? Math.max(0, assessment.time_limit_minutes * 60 - Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000))
                : 0,
        );
    useEffect(() => {
        if (!assessment.time_limit_minutes) return;
        const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(id);
    }, [assessment.time_limit_minutes]);
    function submit() {
        const unanswered = questions.length - Object.keys(answers).length;
        if (
            !confirm(
                unanswered ? `You still have ${unanswered} unanswered question(s). Are you sure you want to submit?` : 'Submit your final answers?',
            )
        )
            return;
        router.post(`/training/attempts/${attempt.id}/submit`, { answers });
    }
    const q = questions[index];
    return (
        <TrainingPage
            title={assessment.name}
            actions={
                <div className="rounded-xl bg-[#4b2b0d] px-4 py-2 font-bold text-white">
                    {assessment.time_limit_minutes ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : 'No time limit'}
                </div>
            }
        >
            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                <aside className="rounded-2xl border border-[#ead8bb] bg-white p-4">
                    <p className="mb-3 text-sm font-bold">Question navigation</p>
                    <div className="grid grid-cols-5 gap-2">
                        {questions.map((x, i) => (
                            <button
                                onClick={() => setIndex(i)}
                                className={`aspect-square rounded-lg text-xs font-bold transition ${i === index ? 'bg-[#c97900] text-white shadow-sm hover:bg-[#a96000] hover:text-white' : answers[x.id] ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-[#f2eadc] text-[#59452e] hover:bg-[#ffe7ad]'}`}
                                key={x.id}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <p className="mt-4 text-xs">
                        Answered {Object.keys(answers).length} · Unanswered {questions.length - Object.keys(answers).length}
                    </p>
                </aside>
                <main className="rounded-2xl border border-[#ead8bb] bg-white p-6 md:p-8">
                    <p className="text-xs font-bold text-[#ae6500] uppercase">
                        Question {index + 1} of {questions.length}
                    </p>
                    {q.image_path && (
                        <img
                            src={`/training/questions/${q.id}/image`}
                            alt={`Reference for question ${index + 1}`}
                            className="mt-4 max-h-[420px] w-full rounded-2xl border border-[#ead8bb] bg-[#fbf7ef] object-contain"
                        />
                    )}
                    <h2 className="mt-3 text-xl leading-8 font-black">{q.question}</h2>
                    <div className="mt-6 space-y-3">
                        {q.choices.map((c, i) => (
                            <label
                                key={c.id}
                                className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${answers[q.id] === c.id ? 'border-[#d48600] bg-[#fff6df]' : 'border-[#e9ddca]'}`}
                            >
                                <input
                                    type="radio"
                                    name={`q${q.id}`}
                                    checked={answers[q.id] === c.id}
                                    onChange={() => setAnswers({ ...answers, [q.id]: c.id })}
                                />
                                <span>
                                    <b>{String.fromCharCode(65 + i)}.</b> {c.choice}
                                </span>
                            </label>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-between">
                        <button className={secondary} disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                            Previous
                        </button>
                        {index < questions.length - 1 ? (
                            <button className={button} onClick={() => setIndex((i) => i + 1)}>
                                Next question
                            </button>
                        ) : (
                            <button className={button} onClick={submit}>
                                Submit assessment
                            </button>
                        )}
                    </div>
                </main>
            </div>
        </TrainingPage>
    );
}
