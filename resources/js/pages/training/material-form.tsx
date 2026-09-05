import { Material, TrainingPage, button, field, secondary } from '@/components/training/training-ui';
import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
export default function MaterialForm({ material }: { material?: Material }) {
    const form = useForm({
        title: material?.title || '',
        description: material?.description || '',
        subject: material?.subject?.name || '',
        topic: material?.topic?.name || '',
        category: material?.category || '',
        audiences: material?.audiences?.map((a) => a.audience) || ['processor'],
        difficulty: material?.difficulty || 'beginner',
        version: material?.version || '1.0',
        published_at: '',
        estimated_reading_minutes: material?.estimated_reading_minutes || 10,
        cover: null as File | null,
        pdf: null as File | null,
        status: material?.status || 'draft',
        assessment_required: material?.assessment_required || false,
        require_retraining: false,
    });
    function submit(e: FormEvent) {
        e.preventDefault();
        form.post(material ? `/training/materials/${material.id}` : '/training/materials', { forceFormData: true });
    }
    return (
        <TrainingPage title={material ? 'Edit Training Material' : 'Create Training Material'}>
            <form onSubmit={submit} className="mx-auto max-w-5xl rounded-2xl border border-[#e8d4b4] bg-white p-5 md:p-7">
                <div className="grid gap-5 md:grid-cols-2">
                    {[
                        ['Title', 'title'],
                        ['Client', 'subject'],
                        ['Topic', 'topic'],
                        ['Training category', 'category'],
                        ['Version', 'version'],
                    ].map(([label, key]) => (
                        <label className={key === 'title' ? 'md:col-span-2' : ''} key={key}>
                            <span className="mb-1 block text-sm font-bold">{label}</span>
                            <input
                                className={field}
                                value={(form.data as any)[key]}
                                onChange={(e) => form.setData(key as any, e.target.value)}
                                placeholder={key === 'subject' ? 'Example: SageSure' : key === 'category' ? 'Example: Client Guidelines' : undefined}
                                list={key === 'category' ? 'training-categories' : undefined}
                            />
                            {key === 'category' && (
                                <span className="mt-1 block text-xs font-medium text-[#705b42]">
                                    The kind of training: Client Guidelines, Property Inspection, Quality, Process Update, Safety, or Onboarding.
                                </span>
                            )}
                            <Error text={(form.errors as any)[key]} />
                        </label>
                    ))}
                    <datalist id="training-categories">
                        <option value="Client Guidelines" />
                        <option value="Property Inspection" />
                        <option value="Quality" />
                        <option value="Process Update" />
                        <option value="Safety" />
                        <option value="Onboarding" />
                    </datalist>
                    <label>
                        <span className="mb-1 block text-sm font-bold">Difficulty</span>
                        <select className={field} value={form.data.difficulty} onChange={(e) => form.setData('difficulty', e.target.value)}>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </label>
                    <label className="md:col-span-2">
                        <span className="mb-1 block text-sm font-bold">Description</span>
                        <textarea
                            rows={4}
                            className={field}
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                        />
                    </label>
                    <fieldset className="md:col-span-2">
                        <legend className="text-sm font-bold">Target audience</legend>
                        <div className="mt-2 flex flex-wrap gap-4">
                            {['processor', 'reviewer', 'operations', 'all'].map((a) => (
                                <label key={a} className="capitalize">
                                    <input
                                        type="checkbox"
                                        className="mr-2"
                                        checked={form.data.audiences.includes(a)}
                                        onChange={(e) =>
                                            form.setData(
                                                'audiences',
                                                e.target.checked ? [...form.data.audiences, a] : form.data.audiences.filter((x) => x !== a),
                                            )
                                        }
                                    />
                                    {a === 'all' ? 'All users' : a}
                                </label>
                            ))}
                        </div>
                        <Error text={form.errors.audiences} />
                    </fieldset>
                    <label>
                        <span className="mb-1 block text-sm font-bold">Estimated reading (minutes)</span>
                        <input
                            type="number"
                            min="1"
                            className={field}
                            value={form.data.estimated_reading_minutes}
                            onChange={(e) => form.setData('estimated_reading_minutes', Number(e.target.value))}
                        />
                    </label>
                    <label>
                        <span className="mb-1 block text-sm font-bold">Status</span>
                        <select className={field} value={form.data.status} onChange={(e) => form.setData('status', e.target.value)}>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                        </select>
                    </label>
                    <label className="rounded-2xl border-2 border-dashed border-[#d69224] bg-[#fff8e8] p-5 md:col-span-2">
                        <span className="block text-base font-black text-[#4b2b0d]">
                            Upload training PDF {material && '(leave blank to keep current)'}
                        </span>
                        <span className="mt-1 mb-3 block text-sm font-medium text-[#705b42]">
                            The PDF will open as a digital book with pages, thumbnails, search, bookmarks, progress saving, and the spoken guide.
                        </span>
                        <input
                            type="file"
                            accept="application/pdf"
                            className={`${field} cursor-pointer bg-white file:mr-3 file:rounded-lg file:border-0 file:bg-[#b96f00] file:px-4 file:py-2 file:font-bold file:text-white`}
                            onChange={(e) => form.setData('pdf', e.target.files?.[0] || null)}
                        />
                        <Error text={form.errors.pdf} />
                    </label>
                    <label>
                        <span className="mb-1 block text-sm font-bold">Cover image</span>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className={field}
                            onChange={(e) => form.setData('cover', e.target.files?.[0] || null)}
                        />
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.data.assessment_required}
                            onChange={(e) => form.setData('assessment_required', e.target.checked)}
                        />
                        Assessment required
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.data.require_retraining}
                            onChange={(e) => form.setData('require_retraining', e.target.checked)}
                        />
                        Require retraining for this version
                    </label>
                </div>
                <div className="mt-7 flex justify-end gap-3">
                    <Link className={secondary} href="/training/materials">
                        Cancel
                    </Link>
                    <button disabled={form.processing} className={button}>
                        {form.processing ? 'Saving…' : 'Save material'}
                    </button>
                </div>
            </form>
        </TrainingPage>
    );
}
function Error({ text }: { text?: string }) {
    return text ? <p className="mt-1 text-xs text-red-600">{text}</p> : null;
}
