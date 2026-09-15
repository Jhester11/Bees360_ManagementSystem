import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { PageLoadingOverlay } from './components/page-loading-overlay';
import { initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'Bees360';

// An open tab can reference an old lazy-loaded chunk after a deployment or local
// production build. Recover automatically instead of leaving the user on a blank page.
window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    window.location.reload();
});

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <>
                <App {...props} />
                <PageLoadingOverlay />
            </>,
        );

        const bootSkeleton = document.getElementById('bees360-boot-skeleton');
        const hideBootSkeleton = () => {
            window.requestAnimationFrame(() => {
                bootSkeleton?.remove();
                window.dispatchEvent(new CustomEvent('bees360:page-ready'));
            });
        };
        if (document.readyState === 'complete') hideBootSkeleton();
        else window.addEventListener('load', hideBootSkeleton, { once: true });
    },
    progress: {
        color: '#f4b400',
    },
});

// This will set light / dark mode on load...
initializeTheme();
