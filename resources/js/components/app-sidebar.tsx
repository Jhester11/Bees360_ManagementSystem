import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    BookOpenCheck,
    CalendarDays,
    Clock3,
    FileText,
    GitCompareArrows,
    LayoutGrid,
    Settings,
    ShieldCheck,
    UsersRound,
} from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
        tourId: 'nav-dashboard',
    },
    {
        title: 'Reports',
        url: '/operations/reports',
        icon: FileText,
    },
    {
        title: 'Queue Monitor',
        url: '/operations/queue-monitor',
        icon: Activity,
        tourId: 'nav-queue-monitor',
    },
    {
        title: 'MTD Reports',
        url: '/operations/mtd',
        icon: CalendarDays,
        tourId: 'nav-mtd-reports',
    },
    {
        title: 'CST Reports',
        url: '/operations/cst-reports',
        icon: Clock3,
        tourId: 'nav-cst-reports',
    },
    {
        title: 'Compare Reports',
        url: '/operations/report-comparison',
        icon: GitCompareArrows,
        tourId: 'nav-compare-reports',
    },
    {
        title: 'Processors',
        url: '/operations/processors',
        icon: BarChart3,
        tourId: 'nav-processors',
    },
    {
        title: 'Users',
        url: '/operations/users',
        icon: UsersRound,
        tourId: 'nav-users',
    },
];

const qualityNavItems: NavItem[] = [
    {
        title: 'Training Library',
        url: '/training/library',
        icon: BookOpenCheck,
    },
    {
        title: 'QA & Scores',
        url: '/operations/quality-assurance',
        icon: ShieldCheck,
    },
];

const processorNavItems: NavItem[] = [
    {
        title: 'Training Library',
        url: '/training/library',
        icon: BookOpenCheck,
    },
    {
        title: 'My Training',
        url: '/training/my-training',
        icon: BookOpenCheck,
    },
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
        tourId: 'nav-dashboard',
    },
    {
        title: 'QA Feedback',
        url: '/dashboard?view=qa#qa-history',
        icon: ShieldCheck,
        tourId: 'nav-qa-feedback',
    },
    {
        title: 'Daily Reports',
        url: '/dashboard?view=daily',
        icon: FileText,
        tourId: 'nav-daily-reports',
    },
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const isProcessor = auth.user.role === 'processor';
    const visibleMainNavItems = isProcessor
        ? processorNavItems
        : mainNavItems.filter((item) => item.url !== '/operations/users' || auth.user.role === 'operations');
    const trainingItems: NavItem[] = ['trainer', 'operations'].includes(auth.user.role)
        ? [
              { title: 'Training Dashboard', url: '/training', icon: BookOpenCheck },
              { title: 'Training Library', url: '/training/library', icon: BookOpenCheck },
              { title: 'Materials', url: '/training/materials', icon: FileText },
              { title: 'Assessments', url: '/training/assessments', icon: ShieldCheck },
              { title: 'Assignments', url: '/training/assignments', icon: UsersRound },
              { title: 'Training Reports', url: '/training/reports', icon: BarChart3 },
          ]
        : isProcessor
          ? []
          : [
                { title: 'Training Library', url: '/training/library', icon: BookOpenCheck },
                { title: 'My Training', url: '/training/my-training', icon: BookOpenCheck },
            ];
    const visibleQualityNavItems = isProcessor ? [] : qualityNavItems.filter((item) => item.url !== '/training/library');

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="[--sidebar-accent-foreground:#fff8e7] [--sidebar-accent:#4a351d] [--sidebar-background:#2f2112] [--sidebar-border:#563c20] [--sidebar-foreground:#fff8e7] [--sidebar-primary-foreground:#3b2915] [--sidebar-primary:#ffc83d]"
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch="hover" cacheFor="5m">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <NavMain items={visibleMainNavItems} label={isProcessor ? 'My workspace' : 'Operations'} />
                {trainingItems.length > 0 && <NavMain items={trainingItems} label="Training" />}
                {visibleQualityNavItems.length > 0 && <NavMain items={visibleQualityNavItems} label="Learning & Quality" />}
            </SidebarContent>

            <SidebarFooter>
                <SidebarGroup className="px-2 py-0">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link
                                    href={isProcessor ? '/settings/profile' : '/operations/settings'}
                                    prefetch="hover"
                                    cacheFor="5m"
                                    data-tour="nav-settings"
                                >
                                    <Settings />
                                    <span>Settings</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
