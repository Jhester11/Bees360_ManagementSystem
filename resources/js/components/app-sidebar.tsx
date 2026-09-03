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
    },
    {
        title: 'MTD Reports',
        url: '/operations/mtd',
        icon: CalendarDays,
    },
    {
        title: 'Compare Reports',
        url: '/operations/report-comparison',
        icon: GitCompareArrows,
    },
    {
        title: 'Processors',
        url: '/operations/processors',
        icon: BarChart3,
    },
    {
        title: 'Users',
        url: '/operations/users',
        icon: UsersRound,
    },
];

const qualityNavItems: NavItem[] = [
    {
        title: 'Training Center',
        url: '/operations/training',
        icon: BookOpenCheck,
    },
    {
        title: 'QA & Scores',
        url: '/operations/quality-assurance',
        icon: ShieldCheck,
    },
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const visibleMainNavItems = mainNavItems.filter((item) => item.url !== '/operations/users' || auth.user.role === 'operations');

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
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={visibleMainNavItems} label="Operations" />
                <NavMain items={qualityNavItems} label="Learning & Quality" />
            </SidebarContent>

            <SidebarFooter>
                <SidebarGroup className="px-2 py-0">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link href="/operations/settings" prefetch>
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
