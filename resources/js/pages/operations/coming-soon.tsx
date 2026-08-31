import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Construction } from 'lucide-react';

interface ComingSoonProps {
    title: string;
    description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Operations', href: '/dashboard' },
        { title, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />
            <div className="flex flex-1 items-center justify-center p-6 md:p-10">
                <div className="max-w-md rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-8 text-center shadow-sm">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#fff1ce] text-[#a96300]">
                        <Construction className="size-7" />
                    </div>
                    <h1 className="mt-5 text-2xl font-bold tracking-tight text-[#312416]">{title}</h1>
                    <p className="mt-3 leading-6 text-[#756752]">{description} This Operations module is ready for its next build.</p>
                    <Link href="/dashboard" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#a96300] hover:text-[#774400]">
                        <ArrowLeft className="size-4" />
                        Back to dashboard
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
