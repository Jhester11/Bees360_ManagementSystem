import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type SharedData } from '@/types';
import { router, usePage, usePoll } from '@inertiajs/react';
import { Bell, BellRing, CheckCheck, Eye, ShieldCheck } from 'lucide-react';

export type ProcessorQaNotification = {
    id: string;
    title: string;
    message: string;
    href: string;
    score: number;
    projectId: string | null;
    assessmentDate: string;
    createdAt: string;
};

type ProcessorNotificationSharedData = SharedData & { processorNotifications: ProcessorQaNotification[] };

export function openProcessorNotification(notification: ProcessorQaNotification) {
    router.post(
        `/processor-notifications/${notification.id}/read`,
        {},
        {
            preserveScroll: true,
            onSuccess: () => router.visit(notification.href),
        },
    );
}

export function ProcessorQaNotificationBell() {
    const { processorNotifications = [] } = usePage<ProcessorNotificationSharedData>().props;
    usePoll(30_000, { only: ['processorNotifications'] });

    function markAllRead() {
        router.post('/processor-notifications/read-all', {}, { preserveScroll: true, preserveState: true });
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${processorNotifications.length} unread QA notifications`}
                    className="relative size-10 rounded-xl border border-[#cfe2d4] bg-[#f7fcf8] text-[#35664a] shadow-sm hover:bg-[#e7f5e9] hover:text-[#1c5635]"
                >
                    {processorNotifications.length ? (
                        <BellRing className="size-5 animate-[pulse_1.5s_ease-in-out_infinite] text-[#16815b]" />
                    ) : (
                        <Bell className="size-5" />
                    )}
                    {processorNotifications.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-[#c77a00] px-1 text-[10px] leading-none font-black text-white">
                            {processorNotifications.length > 9 ? '9+' : processorNotifications.length}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-[#cfe2d4] bg-[#fbfffb] p-0 text-[#342615] shadow-[0_20px_60px_rgba(39,91,61,0.2)] sm:w-[410px]"
            >
                <div className="bg-[#155d3d] px-5 py-4 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DropdownMenuLabel className="p-0 text-base font-black">My QA notifications</DropdownMenuLabel>
                            <p className="mt-1 text-xs text-[#cde9d8]">New quality results for your account</p>
                        </div>
                        {processorNotifications.length > 0 && (
                            <button
                                type="button"
                                onClick={markAllRead}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#4f8e70] px-2.5 py-1.5 text-[11px] font-bold text-[#e2f6e9] transition hover:bg-[#26704f]"
                            >
                                <CheckCheck className="size-3.5" /> Mark all read
                            </button>
                        )}
                    </div>
                </div>
                <DropdownMenuSeparator className="m-0 bg-[#dceade]" />
                {processorNotifications.length ? (
                    <div className="max-h-[430px] overflow-y-auto p-3">
                        {processorNotifications.map((notification) => (
                            <button
                                key={notification.id}
                                type="button"
                                onClick={() => openProcessorNotification(notification)}
                                className="mb-2 flex w-full gap-3 rounded-xl border border-[#dce8df] bg-white p-3 text-left transition last:mb-0 hover:border-[#9fc9aa] hover:bg-[#f1f9f2]"
                            >
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dff1e4] text-[#16815b]">
                                    <ShieldCheck className="size-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-3">
                                        <span className="font-black text-[#284735]">{notification.title}</span>
                                        <span className="rounded-full bg-[#e1f3df] px-2 py-0.5 text-[11px] font-black text-[#347846]">
                                            {notification.score}%
                                        </span>
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-[#6c7e72]">{notification.message}</span>
                                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#16815b]">
                                        <Eye className="size-3.5" /> Review feedback
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="grid min-h-44 place-items-center px-6 py-8 text-center">
                        <div>
                            <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#e8f5eb] text-[#4a8b61]">
                                <CheckCheck className="size-6" />
                            </span>
                            <p className="mt-3 font-black text-[#284735]">You’re all caught up</p>
                            <p className="mt-1 text-xs leading-5 text-[#718176]">New QA results will appear here automatically.</p>
                        </div>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
