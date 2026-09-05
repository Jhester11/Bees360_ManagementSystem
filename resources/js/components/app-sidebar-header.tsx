import { Breadcrumbs } from '@/components/breadcrumbs';
import { ProcessorQaNotificationBell } from '@/components/processor-qa-notification-bell';
import { ReportingReminderBell } from '@/components/reporting-reminder-bell';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { auth } = usePage<SharedData>().props;

    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="ml-auto shrink-0">{auth.user.role === 'processor' ? <ProcessorQaNotificationBell /> : <ReportingReminderBell />}</div>
        </header>
    );
}
