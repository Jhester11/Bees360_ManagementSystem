import { Empty, Material, MaterialCard, TrainingPage, field } from '@/components/training/training-ui';
import { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Upload } from 'lucide-react';
import { FormEvent, useState } from 'react';
export default function Library({ materials, filters }: { materials: { data: Material[] }; filters: Record<string, string> }) {
    const [search, setSearch] = useState(filters.search || '');
    const canManageTraining = ['trainer', 'operations'].includes(usePage<SharedData>().props.auth.user.role);
    function submit(e: FormEvent) {
        e.preventDefault();
        router.get('/training/library', { ...filters, search }, { preserveState: true, replace: true });
    }
    return (
        <TrainingPage
            title="Training Library"
            actions={
                canManageTraining ? (
                    <Link
                        href="/training/materials/create"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#b96f00] px-5 py-3 text-sm font-black text-white shadow-md hover:bg-[#8d5100]"
                    >
                        <Upload className="size-4" /> Upload PDF as Book
                    </Link>
                ) : undefined
            }
        >
            {canManageTraining && (
                <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-[#e3c183] bg-[#fff4d9] p-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="font-black text-[#4b2b0d]">Create a digital training book</p>
                        <p className="mt-1 text-sm font-medium text-[#6a5439]">
                            Upload a PDF, choose its audience, then publish it to the Training Library.
                        </p>
                    </div>
                    <Link href="/training/materials/create" className="font-black text-[#8c5000] underline underline-offset-4">
                        Open PDF uploader →
                    </Link>
                </div>
            )}
            {!canManageTraining && (
                <div className="mb-5 rounded-2xl border border-[#dfc99f] bg-white p-4 text-sm font-semibold text-[#5f4c35]">
                    PDF uploads and book creation are available to <strong className="text-[#8c5000]">Trainer accounts</strong>. Your account can read
                    materials published or assigned to your role.
                </div>
            )}
            <form onSubmit={submit} className="mb-5 grid gap-3 rounded-2xl border border-[#ead8bb] bg-white p-4 md:grid-cols-[1fr_180px_180px_auto]">
                <input className={field} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search books, clients, or topics" />
                <select
                    className={field}
                    defaultValue={filters.difficulty || ''}
                    onChange={(e) => router.get('/training/library', { ...filters, difficulty: e.target.value })}
                >
                    <option value="">All difficulty</option>
                    <option>beginner</option>
                    <option>intermediate</option>
                    <option>advanced</option>
                </select>
                <select
                    className={field}
                    defaultValue={filters.status || ''}
                    onChange={(e) => router.get('/training/library', { ...filters, status: e.target.value })}
                >
                    <option value="">All statuses</option>
                    <option>published</option>
                    <option>draft</option>
                    <option>archived</option>
                </select>
                <button className="rounded-xl bg-[#b96f00] px-5 font-bold text-white">Search</button>
            </form>
            {materials.data.length ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {materials.data.map((m) => (
                        <MaterialCard key={m.id} material={m} />
                    ))}
                </div>
            ) : (
                <Empty text="No training materials match these filters." />
            )}
        </TrainingPage>
    );
}
