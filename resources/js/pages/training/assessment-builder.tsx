import { Assessment, TrainingPage, button, field, secondary } from '@/components/training/training-ui';
import { useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
const blank = () => ({
    question: '',
    image: null as File | null,
    image_path: undefined as string | undefined,
    remove_image: false,
    explanation: '',
    points: 1,
    choices: [
        { choice: '', is_correct: true },
        { choice: '', is_correct: false },
    ],
});
export default function Builder({ assessment, materials }: { assessment?: Assessment; materials: { id: number; title: string }[] }) {
    const f = useForm({
        training_material_id: assessment?.training_material_id || materials[0]?.id || 0,
        name: assessment?.name || '',
        description: assessment?.description || '',
        passing_score: Number(assessment?.passing_score || 80),
        time_limit_minutes: assessment?.time_limit_minutes || 30,
        maximum_attempts: assessment?.maximum_attempts || 2,
        randomize_questions: assessment?.randomize_questions || false,
        randomize_choices: assessment?.randomize_choices || false,
        show_score: assessment?.show_score ?? true,
        show_correct_answers: assessment?.show_correct_answers || false,
        require_training_completion: assessment?.require_training_completion ?? true,
        is_published: assessment?.is_published || false,
        due_at: '',
        questions: assessment?.questions?.map((q) => ({
            ...q,
            image: null as File | null,
            remove_image: false,
            choices: q.choices.map((c) => ({ ...c, is_correct: !!c.is_correct })),
        })) || [blank()],
    });
    function submit(e: FormEvent) {
        e.preventDefault();
        if (assessment) {
            f.transform((data) => ({ ...data, _method: 'put' })).post(`/training/assessments/${assessment.id}`, { forceFormData: true });
        } else {
            f.post('/training/assessments', { forceFormData: true });
        }
    }
    function patchQ(i: number, v: any) {
        const q = [...f.data.questions];
        q[i] = { ...q[i], ...v };
        f.setData('questions', q);
    }
    return (
        <TrainingPage title={assessment ? 'Edit Assessment' : 'Create Assessment'}>
            <form onSubmit={submit} className="space-y-5">
                <section className="grid gap-4 rounded-2xl border border-[#ead8bb] bg-white p-5 md:grid-cols-3">
                    <label>
                        <b className="text-sm">Training</b>
                        <select
                            className={field}
                            value={f.data.training_material_id}
                            onChange={(e) => f.setData('training_material_id', Number(e.target.value))}
                        >
                            {materials.map((m) => (
                                <option value={m.id} key={m.id}>
                                    {m.title}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="md:col-span-2">
                        <b className="text-sm">Assessment name</b>
                        <input className={field} value={f.data.name} onChange={(e) => f.setData('name', e.target.value)} />
                    </label>
                    {[
                        ['Passing score %', 'passing_score'],
                        ['Time limit (minutes)', 'time_limit_minutes'],
                        ['Maximum attempts', 'maximum_attempts'],
                    ].map(([l, k]) => (
                        <label key={k}>
                            <b className="text-sm">{l}</b>
                            <input
                                type="number"
                                className={field}
                                value={(f.data as any)[k]}
                                onChange={(e) => f.setData(k as any, Number(e.target.value))}
                            />
                        </label>
                    ))}
                    <div className="flex flex-wrap gap-4 md:col-span-3">
                        {[
                            ['Randomize questions', 'randomize_questions'],
                            ['Randomize choices', 'randomize_choices'],
                            ['Show score', 'show_score'],
                            ['Show correct answers', 'show_correct_answers'],
                            ['Require reading completion', 'require_training_completion'],
                            ['Published', 'is_published'],
                        ].map(([l, k]) => (
                            <label key={k}>
                                <input
                                    type="checkbox"
                                    className="mr-2"
                                    checked={(f.data as any)[k]}
                                    onChange={(e) => f.setData(k as any, e.target.checked)}
                                />
                                {l}
                            </label>
                        ))}
                    </div>
                </section>
                {f.data.questions.map((q, i) => (
                    <section key={i} className="rounded-2xl border border-[#ead8bb] bg-white p-5">
                        <div className="flex justify-between">
                            <h2 className="font-black">Question {i + 1}</h2>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className={secondary}
                                    onClick={() =>
                                        f.setData('questions', [
                                            ...f.data.questions,
                                            {
                                                ...q,
                                                id: undefined,
                                                image: null,
                                                image_path: undefined,
                                                remove_image: false,
                                                choices: q.choices.map((c) => ({ ...c, id: undefined })),
                                            },
                                        ])
                                    }
                                >
                                    Duplicate
                                </button>
                                {f.data.questions.length > 1 && (
                                    <button
                                        type="button"
                                        className={secondary}
                                        onClick={() =>
                                            f.setData(
                                                'questions',
                                                f.data.questions.filter((_, n) => n !== i),
                                            )
                                        }
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                        <textarea
                            className={`${field} mt-3`}
                            rows={2}
                            value={q.question}
                            onChange={(e) => patchQ(i, { question: e.target.value })}
                            placeholder="Question"
                        />
                        <div className="mt-4 rounded-xl border border-dashed border-[#d8b878] bg-[#fffaf0] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-black text-[#4b2b0d]">Optional question image</p>
                                    <p className="text-xs text-[#776750]">Shown above the question. JPG, PNG, or WebP up to 5 MB.</p>
                                </div>
                                <label className={`${secondary} cursor-pointer`}>
                                    Choose image
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="sr-only"
                                        onChange={(event) =>
                                            patchQ(i, {
                                                image: event.target.files?.[0] || null,
                                                remove_image: false,
                                            })
                                        }
                                    />
                                </label>
                            </div>
                            {(q.image || (q.image_path && !q.remove_image)) && (
                                <div className="mt-4">
                                    <QuestionImagePreview file={q.image} questionId={q.id} hasStoredImage={!!q.image_path} />
                                    <button
                                        type="button"
                                        className="mt-2 text-sm font-bold text-red-700"
                                        onClick={() => patchQ(i, { image: null, remove_image: true })}
                                    >
                                        Remove image
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {q.choices.map((c, j) => (
                                <div className="flex gap-2" key={j}>
                                    <input
                                        type="radio"
                                        name={`correct-${i}`}
                                        checked={c.is_correct}
                                        onChange={() => patchQ(i, { choices: q.choices.map((x, n) => ({ ...x, is_correct: n === j })) })}
                                    />
                                    <input
                                        className={field}
                                        value={c.choice}
                                        onChange={(e) =>
                                            patchQ(i, { choices: q.choices.map((x, n) => (n === j ? { ...x, choice: e.target.value } : x)) })
                                        }
                                        placeholder={`Choice ${j + 1}`}
                                    />
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="mt-3 text-sm font-bold text-[#a35e00]"
                            onClick={() => patchQ(i, { choices: [...q.choices, { choice: '', is_correct: false }] })}
                        >
                            + Add choice
                        </button>
                        <textarea
                            className={`${field} mt-3`}
                            value={q.explanation || ''}
                            onChange={(e) => patchQ(i, { explanation: e.target.value })}
                            placeholder="Optional explanation"
                        />
                    </section>
                ))}
                <button type="button" className={secondary} onClick={() => f.setData('questions', [...f.data.questions, blank()])}>
                    + Add question
                </button>
                <button className={`${button} ml-3`} disabled={f.processing}>
                    Save assessment
                </button>
                {Object.keys(f.errors).length > 0 && <p className="text-sm text-red-600">Please review the highlighted assessment information.</p>}
            </form>
        </TrainingPage>
    );
}

function QuestionImagePreview({ file, questionId, hasStoredImage }: { file: File | null; questionId?: number; hasStoredImage: boolean }) {
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setPreview(null);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    const source = preview || (hasStoredImage && questionId ? `/training/questions/${questionId}/image` : null);

    return source ? (
        <img src={source} alt="Question preview" className="max-h-72 w-full rounded-xl border border-[#e4cfaa] bg-white object-contain" />
    ) : null;
}
