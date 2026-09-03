import { useEffect, useRef } from 'react';

const STATUS_CHECK_INTERVAL = 3_000;

export function AccountStatusMonitor() {
    const redirecting = useRef(false);

    useEffect(() => {
        let controller: AbortController | null = null;

        const checkAccount = async () => {
            if (redirecting.current) return;

            controller?.abort();
            controller = new AbortController();

            try {
                const response = await fetch('/account/status', {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                const status = response.ok ? ((await response.json()) as { active: boolean }) : null;

                if (response.status === 401 || status?.active === false) {
                    redirecting.current = true;
                    window.location.replace('/login');
                }
            } catch {
                // A cancelled request or temporary network failure must not sign out an active user.
                return;
            }
        };

        void checkAccount();
        const timer = window.setInterval(() => void checkAccount(), STATUS_CHECK_INTERVAL);
        const checkWhenVisible = () => {
            if (document.visibilityState === 'visible') void checkAccount();
        };
        document.addEventListener('visibilitychange', checkWhenVisible);

        return () => {
            controller?.abort();
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', checkWhenVisible);
        };
    }, []);

    return null;
}
