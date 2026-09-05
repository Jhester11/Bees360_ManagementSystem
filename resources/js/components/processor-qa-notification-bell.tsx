import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type SharedData } from '@/types';
import { router, usePage, usePoll } from '@inertiajs/react';
import { Bell, BellRing, CheckCheck, Eye, Medal, Megaphone, ShieldCheck, Sparkles, Trophy } from 'lucide-react';

export type ProcessorQaNotification = {
    id: string;
    title: string;
    message: string;
    href: string;
    score: number | null;
    projectId: string | null;
    assessmentDate: string | null;
    type: string;
    createdAt: string;
};

type ProcessorNotificationSharedData = SharedData & { notifications: ProcessorQaNotification[] };

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
    const { notifications = [] } = usePage<ProcessorNotificationSharedData>().props;
    usePoll(30_000, { only: ['notifications'] });

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
                    aria-label={`${notifications.length} unread Bees360 notifications`}
                    className="relative size-10 rounded-xl border border-[#e1bd71] bg-[#fff8e8] text-[#6a3f15] shadow-sm hover:bg-[#ffedbd] hover:text-[#4a2d10]"
                >
                    {notifications.length ? (
                        <BellRing className="size-5 animate-[pulse_1.5s_ease-in-out_infinite] text-[#c87500]" />
                    ) : (
                        <Bell className="size-5" />
                    )}
                    {notifications.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-[#c77a00] px-1 text-[10px] leading-none font-black text-white">
                            {notifications.length > 9 ? '9+' : notifications.length}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-[#e4c98f] bg-[#fffaf1] p-0 text-[#342615] shadow-[0_20px_60px_rgba(74,45,16,0.22)] sm:w-[410px]"
            >
                <div className="relative overflow-hidden bg-[#4a2d10] px-5 py-4 text-white">
                    <span className="absolute -top-8 -right-5 size-24 rounded-full bg-[#ffc83d]/18" />
                    <div className="relative flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ffc83d] text-[#4a2d10] shadow-[0_5px_15px_rgba(0,0,0,0.16)]">
                                <BellRing className="size-5" />
                            </span>
                            <div>
                                <DropdownMenuLabel className="p-0 text-base font-black">Bees360 notifications</DropdownMenuLabel>
                                <p className="mt-1 text-xs text-[#f0dcb7]">QA results, achievements and team news</p>
                            </div>
                        </div>
                        {notifications.length > 0 && (
                            <button
                                type="button"
                                onClick={markAllRead}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#b88a4b] bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-[#fff1d0] transition hover:bg-white/12"
                            >
                                <CheckCheck className="size-3.5" /> Mark all read
                            </button>
                        )}
                    </div>
                </div>
                <DropdownMenuSeparator className="m-0 bg-[#eadbc6]" />
                {notifications.length ? (
                    <div className="max-h-[430px] overflow-y-auto p-3">
                        {notifications.map((notification) => (
                            <button
                                key={notification.id}
                                type="button"
                                onClick={() => openProcessorNotification(notification)}
                                className="mb-2 flex w-full gap-3 rounded-xl border border-[#eadbc6] bg-[#fffdf8] p-3 text-left shadow-[0_3px_12px_rgba(74,45,16,0.04)] transition last:mb-0 hover:border-[#dfb96d] hover:bg-[#fff5dc]"
                            >
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0c9] text-[#a96300]">
                                    {notification.type === 'latest_qa' ? (
                                        <ShieldCheck className="size-5" />
                                    ) : notification.type === 'tier_achievement' ? (
                                        <Medal className="size-5" />
                                    ) : notification.type === 'new_account' ? (
                                        <Sparkles className="size-5" />
                                    ) : notification.type.includes('top') || notification.type.includes('highest') ? (
                                        <Trophy className="size-5" />
                                    ) : (
                                        <Megaphone className="size-5" />
                                    )}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-3">
                                        <span className="font-black text-[#4a2d10]">{notification.title}</span>
                                        {notification.score !== null && (
                                            <span className="rounded-full bg-[#e1f3df] px-2 py-0.5 text-[11px] font-black text-[#347846]">
                                                {notification.score}%
                                            </span>
                                        )}
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-[#806f59]">{notification.message}</span>
                                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#a96300]">
                                        <Eye className="size-3.5" /> {notification.type === 'latest_qa' ? 'Review feedback' : 'View details'}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="grid min-h-48 place-items-center bg-[radial-gradient(circle_at_top,rgba(255,200,61,0.12),transparent_58%)] px-6 py-8 text-center">
                        <div className="max-w-64">
                            <span className="mx-auto grid size-14 place-items-center rounded-full border border-[#bcd9c8] bg-[#eef8eb] text-[#347846] shadow-[0_0_0_7px_rgba(255,200,61,0.1)]">
                                <CheckCheck className="size-6" />
                            </span>
                            <p className="mt-4 text-base font-black text-[#4a2d10]">You’re all caught up</p>
                            <p className="mt-1 text-xs leading-5 text-[#806f59]">QA results, achievements and announcements will appear here.</p>
                        </div>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
