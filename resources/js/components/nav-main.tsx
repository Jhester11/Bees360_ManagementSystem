import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export function NavMain({ items = [], label = 'Platform' }: { items: NavItem[]; label?: string }) {
    const page = usePage();
    const [currentHash, setCurrentHash] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash));

    useEffect(() => {
        const updateHash = () => setCurrentHash(window.location.hash);

        window.addEventListener('hashchange', updateHash);
        return () => window.removeEventListener('hashchange', updateHash);
    }, []);

    const isActive = (itemUrl: string) => {
        const current = new URL(page.url, 'http://bees360.local');
        const item = new URL(itemUrl, 'http://bees360.local');

        if (item.searchParams.has('view')) {
            return current.pathname === item.pathname && current.searchParams.get('view') === item.searchParams.get('view');
        }

        if (item.hash) {
            return current.pathname === item.pathname && !current.searchParams.has('view') && currentHash === item.hash;
        }

        return current.pathname === item.pathname
            && (item.pathname !== '/dashboard' || (!current.searchParams.has('view') && currentHash === ''));
    };

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive(item.url)}>
                            <Link href={item.url} prefetch>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
