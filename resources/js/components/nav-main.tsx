import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export function NavMain({ items = [], label = 'Platform' }: { items: NavItem[]; label?: string }) {
    const page = usePage();
    const [currentHash, setCurrentHash] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash));
    const [optimisticUrl, setOptimisticUrl] = useState<string | null>(null);

    useEffect(() => {
        const updateHash = () => setCurrentHash(window.location.hash);

        window.addEventListener('hashchange', updateHash);
        return () => window.removeEventListener('hashchange', updateHash);
    }, []);

    useEffect(() => {
        const stopBefore = router.on('before', (event) => {
            if (event.detail.visit.prefetch || event.detail.visit.method !== 'get') return;
            const destination = new URL(String(event.detail.visit.url), window.location.href);
            setOptimisticUrl(`${destination.pathname}${destination.search}${destination.hash}`);
        });
        const stopFinish = router.on('finish', (event) => {
            if (!event.detail.visit.prefetch) setOptimisticUrl(null);
        });
        return () => {
            stopBefore();
            stopFinish();
        };
    }, []);

    const isActive = (itemUrl: string) => {
        const current = new URL(optimisticUrl ?? page.url, 'http://bees360.local');
        const item = new URL(itemUrl, 'http://bees360.local');
        const effectiveHash = optimisticUrl ? current.hash : currentHash;

        if (item.searchParams.has('view')) {
            return current.pathname === item.pathname && current.searchParams.get('view') === item.searchParams.get('view');
        }

        if (item.hash) {
            return current.pathname === item.pathname && !current.searchParams.has('view') && effectiveHash === item.hash;
        }

        return current.pathname === item.pathname && (item.pathname !== '/dashboard' || (!current.searchParams.has('view') && effectiveHash === ''));
    };

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive(item.url)}>
                            <Link href={item.url} prefetch="hover" cacheFor="5m" data-tour={item.tourId}>
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
