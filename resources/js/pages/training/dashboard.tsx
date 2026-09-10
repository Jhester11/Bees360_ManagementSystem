import { TrainingPage } from '@/components/training/training-ui';
import { Link } from '@inertiajs/react';
export default function Dashboard({ stats }: { stats: Record<string, number> }) {
    return (
        <TrainingPage
            title="Training Dashboard"
            actions={
                <Link className="rounded-xl bg-[#b96f00] px-4 py-2 font-bold text-white" href="/training/materials/create">
                    Create material
                </Link>
            }
        >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(stats).map(([k, v]) => (
                    <div key={k} className="rounded-2xl border border-[#ead8bb] bg-white p-5">
                        <p className="text-sm text-[#756650] capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                        <strong className="mt-2 block text-3xl text-[#3b2812]">{k === 'averageScore' ? `${v}%` : v}</strong>
                    </div>
                ))}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                    ['Materials', '/training/materials'],
                    ['Assignments', '/training/assignments'],
                    ['Reports', '/training/reports'],
                ].map(([x, u]) => (
                    <Link
                        href={u}
                        className="rounded-2xl border border-[#dca33c] bg-[#fff5d8] p-6 text-xl font-bold text-[#5b3700] shadow-sm transition hover:border-[#b96c00] hover:bg-[#ffe6a3] hover:text-[#3f2600]"
                        key={x}
                    >
                        {x} →
                    </Link>
                ))}
            </div>
        </TrainingPage>
    );
}
