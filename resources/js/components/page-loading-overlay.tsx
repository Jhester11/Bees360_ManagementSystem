import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const skeletonRows = Array.from({ length: 9 }, (_, index) => index);
const skeletonColumns = Array.from({ length: 5 }, (_, index) => index);

export function PageLoadingOverlay() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let shownAt = Date.now();
        let hideTimer: number | undefined = window.setTimeout(() => {
            setIsLoading(false);
            shownAt = 0;
        }, 650);
        let failsafeTimer: number | undefined;

        const hideLoader = () => {
            window.clearTimeout(hideTimer);
            window.clearTimeout(failsafeTimer);

            const visibleFor = shownAt === 0 ? 0 : Date.now() - shownAt;
            const remaining = Math.max(0, 650 - visibleFor);

            hideTimer = window.setTimeout(() => {
                setIsLoading(false);
                shownAt = 0;
            }, remaining);
        };

        const showLoader = () => {
            window.clearTimeout(hideTimer);
            window.clearTimeout(failsafeTimer);
            shownAt = Date.now();
            setIsLoading(true);

            failsafeTimer = window.setTimeout(() => {
                setIsLoading(false);
                shownAt = 0;
            }, 5000);
        };

        const stopBeforeListener = router.on('before', (event) => {
            if (event.detail.visit.prefetch || !event.detail.visit.showProgress) return;

            const destination = new URL(String(event.detail.visit.url), window.location.href);
            if (
                destination.pathname === window.location.pathname &&
                destination.search === window.location.search
            ) return;

            showLoader();
        });

        const handleDocumentClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const target = event.target;
            const anchor = target instanceof Element ? target.closest('a[href]') : null;
            if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

            const destination = new URL(anchor.href, window.location.href);
            if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
            if (
                destination.pathname === window.location.pathname &&
                destination.search === window.location.search
            ) return;

            showLoader();
        };

        document.addEventListener('click', handleDocumentClick, true);

        const stopFinishListener = router.on('finish', (event) => {
            if (event.detail.visit.prefetch || !event.detail.visit.showProgress) return;

            hideLoader();
        });

        const stopNavigateListener = router.on('navigate', hideLoader);

        return () => {
            stopBeforeListener();
            stopFinishListener();
            stopNavigateListener();
            document.removeEventListener('click', handleDocumentClick, true);
            window.clearTimeout(hideTimer);
            window.clearTimeout(failsafeTimer);
        };
    }, []);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-[#fffdf8] text-[#4a351d]" role="status" aria-live="polite" aria-label="Loading page">
            <div className="flex h-full animate-pulse">
                <aside className="hidden w-64 shrink-0 border-r border-[#eadfcf] bg-[#342515] p-5 md:block">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-6">
                        <div className="size-10 rounded-xl bg-[#ffc83d]" />
                        <div className="grid flex-1 gap-2">
                            <div className="h-3 w-24 rounded-full bg-[#ffe398]/80" />
                            <div className="h-2 w-16 rounded-full bg-white/20" />
                        </div>
                    </div>
                    <div className="grid gap-3 pt-7">
                        {skeletonColumns.map((column) => (
                            <div key={column} className={`flex items-center gap-3 rounded-xl p-3 ${column === 0 ? 'bg-white/10' : ''}`}>
                                <div className={`size-8 rounded-lg ${column === 0 ? 'bg-[#ffc83d]/80' : 'bg-white/10'}`} />
                                <div className={`h-2.5 rounded-full ${column === 0 ? 'w-28 bg-[#fff0c0]/70' : 'w-24 bg-white/15'}`} />
                            </div>
                        ))}
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="flex h-16 items-center justify-between border-b border-[#eadfcf] bg-white px-5 sm:px-7">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-[#f4eadb]" />
                            <div className="h-2.5 w-28 rounded-full bg-[#ece4da]" />
                        </div>
                        <div className="size-9 rounded-full bg-[#f3eadc]" />
                    </header>

                    <main className="min-h-0 flex-1 overflow-hidden bg-[#fffaf1] p-4 sm:p-6 lg:p-8">
                        <div className="mx-auto grid h-full max-w-[1500px] content-start gap-5">
                            <div className="flex items-end justify-between gap-5">
                                <div className="grid gap-3">
                                    <div className="h-3 w-24 rounded-full bg-[#efc66e]/70" />
                                    <div className="h-7 w-52 rounded-lg bg-[#dcd1c3]" />
                                    <div className="h-2.5 w-72 max-w-[70vw] rounded-full bg-[#ece4da]" />
                                </div>
                                <div className="hidden h-10 w-32 rounded-xl bg-[#f1dfb8] sm:block" />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {Array.from({ length: 4 }, (_, index) => (
                                    <div key={index} className="rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between">
                                            <div className="grid gap-3">
                                                <div className="h-2.5 w-24 rounded-full bg-[#ece4da]" />
                                                <div className="h-7 w-16 rounded-lg bg-[#ded4c7]" />
                                                <div className="h-2 w-28 rounded-full bg-[#f1ebe3]" />
                                            </div>
                                            <div className="size-10 rounded-xl bg-[#fff0c5]" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm">
                                <div className="flex items-center justify-between border-b border-[#eadfcf] bg-[#fff9ed] px-5 py-4">
                                    <div className="grid gap-2">
                                        <div className="h-3 w-36 rounded-full bg-[#ded4c7]" />
                                        <div className="h-2 w-56 max-w-[50vw] rounded-full bg-[#eee6db]" />
                                    </div>
                                    <div className="h-8 w-24 rounded-lg bg-[#f2e4c8]" />
                                </div>

                                <div className="grid grid-cols-5 gap-px bg-[#eadfcf]">
                                    {skeletonColumns.map((column) => (
                                        <div key={column} className="h-11 bg-[#3a2817] px-4 py-4">
                                            <div className="h-2 w-3/5 rounded-full bg-white/25" />
                                        </div>
                                    ))}
                                </div>

                                <div className="divide-y divide-[#eee6dc]">
                                    {skeletonRows.map((row) => (
                                        <div key={row} className="grid grid-cols-5 gap-px bg-[#eee6dc]">
                                            {skeletonColumns.map((column) => (
                                                <div key={column} className="flex h-12 items-center gap-2 bg-white px-4">
                                                    {column === 0 && <div className="size-4 shrink-0 rounded-full bg-[#ece7e0]" />}
                                                    <div className={`${column === 0 ? 'w-3/4' : 'w-2/3'} h-2.5 rounded-full bg-[#edf0f2]`} />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <span className="sr-only">Loading Bees360 page…</span>
        </div>
    );
}
