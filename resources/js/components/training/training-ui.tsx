import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { BookOpenCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export type Material = {
    id: number;
    title: string;
    description?: string;
    cover_path?: string;
    category: string;
    difficulty: string;
    version: string;
    status: string;
    estimated_reading_minutes: number;
    assessment_required: boolean;
    subject?: { name: string };
    topic?: { name: string };
    author?: { name: string };
    audiences?: { audience: string }[];
    assessment?: Assessment;
};
export type Assessment = {
    id: number;
    training_material_id: number;
    name: string;
    description?: string;
    passing_score: number;
    time_limit_minutes?: number;
    maximum_attempts: number;
    randomize_questions: boolean;
    randomize_choices: boolean;
    show_score: boolean;
    show_correct_answers: boolean;
    require_training_completion: boolean;
    is_published: boolean;
    questions?: Question[];
    material?: Material;
};
export type Question = {
    id: number;
    question: string;
    image_path?: string;
    explanation?: string;
    points: number;
    choices: { id: number; choice: string; is_correct?: boolean }[];
};
export const field =
    'w-full rounded-xl border border-[#cfae7c] bg-white px-3 py-2.5 text-sm font-medium text-[#35240f] placeholder:text-[#7d6d59] outline-none focus:border-[#b96f00] focus:ring-2 focus:ring-[#f6d99f] disabled:text-[#6f6252]';
export const button =
    'inline-flex items-center justify-center rounded-xl bg-[#b96f00] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#8d5100] disabled:cursor-not-allowed disabled:opacity-50';
export const secondary =
    'inline-flex items-center justify-center rounded-xl border border-[#d9b36d] bg-[#fff9ed] px-4 py-2 text-sm font-bold text-[#7a4800] hover:bg-[#fff0ce]';
export function TrainingPage({
    title,
    eyebrow = 'Bees360 Learning',
    actions,
    children,
}: {
    title: string;
    eyebrow?: string;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training', href: '/training' },
                { title, href: '#' },
            ]}
        >
            <Head title={title} />
            <div className="min-h-full bg-[#fbf7ef] p-4 text-[#35240f] md:p-7">
                <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-sm font-extrabold tracking-[.16em] text-[#965700] uppercase">{eyebrow}</p>
                        <h1 className="mt-1 text-3xl font-black text-[#2c1c0b]">{title}</h1>
                    </div>
                    {actions}
                </header>
                {children}
            </div>
        </AppLayout>
    );
}
export function Empty({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-[#dbc7a6] bg-white p-12 text-center text-[#766650]">
            <BookOpenCheck className="mx-auto mb-3 size-8 text-[#c8861c]" />
            {text}
        </div>
    );
}
export function Status({ value }: { value: string }) {
    const good = ['published', 'completed', 'passed'].includes(value);
    const bad = ['failed', 'overdue', 'archived'].includes(value);
    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${good ? 'bg-emerald-100 text-emerald-800' : bad ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}
        >
            {value.replaceAll('_', ' ')}
        </span>
    );
}
export function MaterialCard({ material, progress }: { material: Material; progress?: number }) {
    return (
        <article className="overflow-hidden rounded-2xl border border-[#ead8bb] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            {material.cover_path ? (
                <img className="h-32 w-full object-cover" src={`/training/materials/${material.id}/cover`} alt="" />
            ) : (
                <div className="grid h-32 place-items-center bg-gradient-to-br from-[#5a3210] to-[#9d650f] text-white">
                    <BookOpenCheck className="size-12" />
                </div>
            )}
            <div className="p-4">
                <div className="flex justify-between gap-2">
                    <p className="text-xs font-bold text-[#b36a00] uppercase">{material.subject?.name || material.category}</p>
                    <Status value={material.status} />
                </div>
                <h2 className="mt-2 text-lg font-black text-[#35240f]">{material.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-[#786852]">
                    {material.topic?.name} · {material.estimated_reading_minutes} min · v{material.version}
                </p>
                {progress !== undefined && (
                    <div className="mt-3">
                        <div className="h-2 overflow-hidden rounded-full bg-[#eee5d5]">
                            <div className="h-full bg-[#d98a00]" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-1 text-xs">{progress}% read</p>
                    </div>
                )}
                <Link className={`${secondary} mt-4 w-full`} href={`/training/materials/${material.id}`}>
                    View training
                </Link>
            </div>
        </article>
    );
}
