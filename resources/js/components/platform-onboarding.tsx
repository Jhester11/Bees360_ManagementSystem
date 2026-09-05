import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type SharedData, type User } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Check, CheckCircle2, Compass, PartyPopper, Pointer, Sparkles, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type GuideStep = { title: string; description: string; href: string; target: string };
type TargetRect = { top: number; left: number; width: number; height: number };

function savedStep(key: string, totalSteps: number) {
    if (typeof window === 'undefined') return 0;
    const value = Number(sessionStorage.getItem(key) ?? 0);
    return Number.isInteger(value) ? Math.max(0, Math.min(value, totalSteps - 1)) : 0;
}

function guideFor(user: User): GuideStep[] {
    if (user.role === 'processor')
        return [
            {
                title: 'Your workspace',
                description: 'This header shows your reporting month and timezone controls.',
                href: '/dashboard',
                target: 'processor-welcome',
            },
            {
                title: 'Team activity',
                description: 'These live cards summarize weekly polished reports, total reports, and active processors.',
                href: '/dashboard',
                target: 'team-overview',
            },
            {
                title: 'Production and QA',
                description: 'These cards show your total cases, General Exterior, 4-Point, and average QA accuracy.',
                href: '/dashboard',
                target: 'processor-metrics',
            },
            {
                title: 'Production leaderboard',
                description: 'This leaderboard ranks processors by monthly output so you can see the leading performers.',
                href: '/dashboard',
                target: 'production-leaderboard',
            },
            {
                title: 'QA leaderboard',
                description: 'This area ranks monthly QA averages and stays empty when the selected month has no QA assessments.',
                href: '/dashboard',
                target: 'qa-leaderboard',
            },
            {
                title: 'QA assessment history',
                description: 'Review every QA assessment, score, error, and feedback for the selected month here.',
                href: '/dashboard?view=qa#qa-history',
                target: 'qa-history',
            },
            {
                title: 'Credits and incentives',
                description: 'Your weighted credits, tier progress, and current incentive appear here.',
                href: '/dashboard?view=daily',
                target: 'earned-credits',
            },
            {
                title: 'Tier 1 progress',
                description:
                    'Tier 1 needs 550 credits, equivalent to a 100 dollar incentive. The gauge shows your completed percentage, and Remaining Credits shows exactly how many more credits you need to reach Tier 1.',
                href: '/dashboard?view=daily',
                target: 'tier-550',
            },
            {
                title: 'Tier 2 progress',
                description:
                    'Tier 2 needs 650 credits, equivalent to a 200 dollar incentive. The gauge shows your completed percentage, and Remaining Credits shows exactly how many more credits you need to reach Tier 2.',
                href: '/dashboard?view=daily',
                target: 'tier-650',
            },
            {
                title: 'Tier 3 progress',
                description:
                    'Tier 3 needs 750 credits, equivalent to a 300 dollar incentive. The gauge shows your completed percentage, and Remaining Credits shows exactly how many more credits you need to reach Tier 3.',
                href: '/dashboard?view=daily',
                target: 'tier-750',
            },
            {
                title: 'Daily productivity',
                description: 'This table shows your General Exterior and 4-Point output for each reporting day.',
                href: '/dashboard?view=daily',
                target: 'daily-productivity',
            },
            {
                title: 'Delivery status',
                description: 'This summary groups your days as under delivered, delivered, or over delivered.',
                href: '/dashboard?view=daily',
                target: 'delivery-status',
            },
            {
                title: 'Daily output chart',
                description: 'This chart visualizes your daily production mix and trend across the month.',
                href: '/dashboard?view=daily',
                target: 'daily-chart',
            },
            {
                title: 'Profile image',
                description: 'Select the profile circle to upload or drag and drop your account image.',
                href: '/settings/profile',
                target: 'profile-image',
            },
            {
                title: 'Password security',
                description: 'Use Change password to update your password securely. Your name and nickname remain protected.',
                href: '/settings/profile',
                target: 'change-password',
            },
        ];

    const steps: GuideStep[] = [
        {
            title: 'Operations dashboard',
            description: 'This is your live Bees360 operations workspace and reporting overview.',
            href: '/dashboard',
            target: 'operations-welcome',
        },
        {
            title: 'Team totals',
            description: 'These cards show weekly polished reports, deduplicated total reports, and active processors.',
            href: '/dashboard',
            target: 'operations-summary',
        },
        {
            title: 'Weekly production',
            description: 'This chart displays the team output trend for the current week.',
            href: '/dashboard',
            target: 'weekly-production',
        },
        {
            title: 'Report mix',
            description: 'This section compares General Exterior and 4-Point volume with current report status.',
            href: '/dashboard',
            target: 'report-mix',
        },
        {
            title: 'Month-to-date reports',
            description: 'Review production totals for every processor in the selected reporting period.',
            href: '/operations/mtd',
            target: 'mtd-page',
        },
        {
            title: 'Imported reports',
            description: 'Review and manage the source workbooks used by the reporting dashboard.',
            href: '/operations/reports',
            target: 'reports-page',
        },
        {
            title: 'Compare reports',
            description: 'Compare daily production and export the verified report to Excel.',
            href: '/operations/report-comparison',
            target: 'comparison-page',
        },
        {
            title: 'Processor performance',
            description: 'Review each processor’s credits, QA accuracy, tier, and incentive.',
            href: '/operations/processors',
            target: 'processors-page',
        },
    ];
    if (user.role === 'operations')
        steps.push(
            {
                title: 'Queue monitor',
                description: 'Inspect waiting work, aging, completion rate, and balanced batch distribution.',
                href: '/operations/queue-monitor',
                target: 'queue-page',
            },
            {
                title: 'User accounts',
                description: 'Create, activate, deactivate, and securely administer Bees360 accounts.',
                href: '/operations/users',
                target: 'users-page',
            },
        );
    return steps;
}

function pageMatches(currentHref: string, expectedHref: string) {
    const origin = typeof window === 'undefined' ? 'http://bees360.local' : window.location.origin;
    const current = new URL(currentHref, origin);
    const expected = new URL(expectedHref, origin);
    if (current.pathname !== expected.pathname) return false;
    const expectedView = expected.searchParams.get('view');
    return expectedView ? current.searchParams.get('view') === expectedView : !current.searchParams.has('view');
}

export function PlatformOnboarding() {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const steps = useMemo(() => guideFor(auth.user), [auth.user]);
    const activeKey = `bees360-guide-active:${auth.user.id}`;
    const stepKey = `bees360-guide-step:${auth.user.id}`;
    const guideAlreadyActive = typeof window !== 'undefined' && sessionStorage.getItem(activeKey) === '1';
    const [welcomeOpen, setWelcomeOpen] = useState(auth.user.onboarding_completed_at === null && !guideAlreadyActive);
    const [started, setStarted] = useState(guideAlreadyActive);
    const celebrationKey = `bees360-guide-celebration:${auth.user.id}`;
    const [step, setStep] = useState(() => savedStep(stepKey, steps.length));
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
    const [targetUnavailable, setTargetUnavailable] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(() => typeof window !== 'undefined' && localStorage.getItem('bees360-guide-voice') !== 'off');
    const [narrationComplete, setNarrationComplete] = useState(false);
    const [pageReady, setPageReady] = useState(() => typeof document === 'undefined' || document.documentElement.dataset.pageLoading !== 'true');
    const [celebrationOpen, setCelebrationOpen] = useState(() => typeof window !== 'undefined' && sessionStorage.getItem(celebrationKey) === '1');
    const spokenStep = useRef<string | null>(null);
    const narrationRun = useRef(0);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const voiceAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const current = steps[Math.min(step, steps.length - 1)];
    const targetLocated = targetRect !== null;

    const speak = useCallback(
        (message: string, force = false, onFinished?: () => void) => {
            if (!voiceAvailable || (!voiceEnabled && !force)) {
                onFinished?.();
                return;
            }
            const narration = new SpeechSynthesisUtterance(message);
            utteranceRef.current = narration;
            const voices = window.speechSynthesis.getVoices();
            narration.voice =
                voices.find((v) => /^en-GB/i.test(v.lang) && /daniel|ryan|george|arthur|male/i.test(v.name)) ??
                voices.find((v) => /^en-GB/i.test(v.lang)) ??
                voices.find((v) => /^en/i.test(v.lang)) ??
                null;
            narration.lang = narration.voice?.lang || 'en-GB';
            narration.rate = 0.92;
            narration.pitch = 0.82;
            const finish = () => {
                if (utteranceRef.current !== narration) return;
                utteranceRef.current = null;
                onFinished?.();
            };
            narration.onend = finish;
            narration.onerror = finish;
            window.speechSynthesis.speak(narration);
        },
        [voiceAvailable, voiceEnabled],
    );

    useEffect(() => {
        const replay = () => {
            sessionStorage.setItem(activeKey, '1');
            sessionStorage.setItem(stepKey, '0');
            spokenStep.current = null;
            setStep(0);
            setStarted(true);
            setNarrationComplete(false);
            setTargetUnavailable(false);
            setWelcomeOpen(false);
        };
        window.addEventListener('bees360:start-guide', replay);
        return () => window.removeEventListener('bees360:start-guide', replay);
    }, [activeKey, stepKey]);

    useEffect(() => {
        if (celebrationOpen) sessionStorage.removeItem(celebrationKey);
    }, [celebrationKey, celebrationOpen]);

    useEffect(() => {
        const stopBefore = router.on('before', (event) => {
            if (event.detail.visit.prefetch || event.detail.visit.method !== 'get') return;
            const destination = new URL(String(event.detail.visit.url), window.location.href);
            const isDifferentPage = destination.pathname !== window.location.pathname || destination.search !== window.location.search;
            if (!isDifferentPage) return;
            setPageReady(false);
            setNarrationComplete(false);
            setTargetUnavailable(false);
            narrationRun.current += 1;
            window.speechSynthesis?.cancel();
        });
        const ready = () => setPageReady(true);
        window.addEventListener('bees360:page-ready', ready);
        return () => {
            stopBefore();
            window.removeEventListener('bees360:page-ready', ready);
        };
    }, []);

    useEffect(() => {
        if (!started || !current) return;
        if (!pageMatches(page.url, current.href)) {
            setTargetRect(null);
            setTargetUnavailable(false);
            router.visit(current.href, { preserveScroll: false, preserveState: false, replace: true });
            return;
        }
        let timer = 0;
        let frame = 0;
        let observer: ResizeObserver | null = null;
        const measure = () => {
            const target = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
            if (!target) return setTargetRect(null);
            const rect = target.getBoundingClientRect();
            if (!rect.width || !rect.height) return setTargetRect(null);
            const top = Math.max(10, rect.top - 6);
            const left = Math.max(10, rect.left - 6);
            const right = Math.min(window.innerWidth - 10, rect.right + 6);
            const bottom = Math.min(window.innerHeight - 10, rect.bottom + 6);
            setTargetRect({ top, left, width: Math.max(40, right - left), height: Math.max(40, bottom - top) });
        };
        const begin = (attempt = 0) => {
            const target = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
            if (!target) {
                measure();
                if (attempt < 50) timer = window.setTimeout(() => begin(attempt + 1), 100);
                else {
                    setTargetUnavailable(true);
                    setNarrationComplete(true);
                }
                return;
            }
            setTargetUnavailable(false);
            if ('ResizeObserver' in window) {
                observer = new ResizeObserver(measure);
                observer.observe(target);
            }
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            const startedAt = performance.now();
            const animate = () => {
                measure();
                if (performance.now() - startedAt < 900) frame = window.requestAnimationFrame(animate);
            };
            animate();
        };
        timer = window.setTimeout(begin, 120);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            window.clearTimeout(timer);
            window.cancelAnimationFrame(frame);
            observer?.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [current, page.url, started]);

    useEffect(() => {
        if (!started || !current || !targetLocated || !pageReady) return;
        if (!voiceEnabled) {
            setNarrationComplete(true);
            return;
        }
        const key = `${step}:${current.target}`;
        if (spokenStep.current === key) return;
        spokenStep.current = key;
        setNarrationComplete(false);
        const run = ++narrationRun.current;
        let fallback = 0;
        let speechMonitor = 0;
        let observedSpeaking = false;
        let retried = false;
        let lastAttemptAt = 0;
        const finishNarration = () => {
            if (narrationRun.current !== run) return;
            window.clearTimeout(fallback);
            window.clearInterval(speechMonitor);
            setNarrationComplete(true);
        };
        const timer = window.setTimeout(() => {
            const words = `${current.title} ${current.description}`.trim().split(/\s+/).length;
            fallback = window.setTimeout(finishNarration, Math.max(6000, Math.ceil((words / 2.2) * 1000) + 2500));
            speak(`${current.title}. ${current.description}`, false, finishNarration);
            lastAttemptAt = performance.now();
            speechMonitor = window.setInterval(() => {
                if (narrationRun.current !== run) return;
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                    return;
                }
                if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                    observedSpeaking = true;
                    return;
                }
                if (performance.now() - lastAttemptAt < 700) return;
                if (!observedSpeaking && !retried) {
                    retried = true;
                    lastAttemptAt = performance.now();
                    speak(`${current.title}. ${current.description}`, false, finishNarration);
                    return;
                }
                finishNarration();
            }, 150);
        }, 250);
        return () => {
            window.clearTimeout(timer);
            window.clearTimeout(fallback);
            window.clearInterval(speechMonitor);
        };
    }, [current, pageReady, speak, started, step, targetLocated, voiceEnabled]);

    function startGuide() {
        sessionStorage.setItem(activeKey, '1');
        sessionStorage.setItem(stepKey, '0');
        spokenStep.current = null;
        setStarted(true);
        setStep(0);
        setNarrationComplete(false);
        setTargetUnavailable(false);
        setWelcomeOpen(false);
    }
    function completeGuide(showCelebration = false) {
        sessionStorage.removeItem(activeKey);
        sessionStorage.removeItem(stepKey);
        if (showCelebration) sessionStorage.setItem(celebrationKey, '1');
        narrationRun.current += 1;
        setStarted(false);
        setWelcomeOpen(false);
        setTargetRect(null);
        setNarrationComplete(false);
        setTargetUnavailable(false);
        window.speechSynthesis?.cancel();
        router.post(
            '/onboarding/complete',
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (!showCelebration) return;
                    sessionStorage.removeItem(celebrationKey);
                    setCelebrationOpen(true);
                },
                onError: () => sessionStorage.removeItem(celebrationKey),
            },
        );
    }
    function moveTo(next: number) {
        const bounded = Math.max(0, Math.min(next, steps.length - 1));
        sessionStorage.setItem(stepKey, String(bounded));
        spokenStep.current = null;
        narrationRun.current += 1;
        window.speechSynthesis?.cancel();
        setTargetRect(null);
        setNarrationComplete(false);
        setTargetUnavailable(false);
        setStep(bounded);
    }
    function toggleVoice() {
        const enabled = !voiceEnabled;
        setVoiceEnabled(enabled);
        localStorage.setItem('bees360-guide-voice', enabled ? 'on' : 'off');
        if (enabled && targetLocated) {
            setNarrationComplete(false);
            spokenStep.current = `${step}:${current.target}`;
            const run = ++narrationRun.current;
            window.setTimeout(
                () =>
                    speak(`${current.title}. ${current.description}`, true, () => {
                        if (narrationRun.current === run) setNarrationComplete(true);
                    }),
                0,
            );
        } else {
            narrationRun.current += 1;
            window.speechSynthesis?.cancel();
            setNarrationComplete(true);
        }
    }

    const vw = typeof window === 'undefined' ? 1200 : window.innerWidth;
    const vh = typeof window === 'undefined' ? 800 : window.innerHeight;
    const handOnLeft = !!targetRect && targetRect.left + targetRect.width > vw - 72;
    const handTop = targetRect ? Math.min(Math.max(targetRect.top + Math.min(targetRect.height / 2, 100) - 22, 8), vh - 52) : 8;
    const calloutOnLeft = vw >= 640 && !!targetRect && targetRect.left + targetRect.width / 2 > vw / 2;
    const calloutOnTop = vw >= 640 && !!targetRect && targetRect.top + targetRect.height / 2 > vh / 2;

    return (
        <>
            <Dialog open={welcomeOpen} onOpenChange={() => undefined}>
                <DialogContent
                    onEscapeKeyDown={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                    className="overflow-hidden border-[#e5bc59] bg-[#fffdf8] p-0 text-[#342615] shadow-[0_24px_80px_rgba(73,43,11,0.28)] sm:max-w-lg [&>button:last-child]:hidden"
                >
                    <div className="relative bg-[#4a2d10] px-7 py-7 text-white">
                        <span className="absolute -top-10 -right-8 size-32 rounded-full bg-[#ffc83d]/20" />
                        <span className="relative grid size-14 place-items-center rounded-2xl bg-[#ffc83d] text-[#4a2d10] shadow-lg">
                            <Sparkles className="size-7" />
                        </span>
                        <DialogHeader className="relative mt-5 text-left">
                            <DialogTitle className="text-2xl font-black text-white">
                                Hi {auth.user.n_name || auth.user.name.split(' ')[0]}, welcome to Bees360!
                            </DialogTitle>
                            <DialogDescription className="mt-2 leading-6 text-[#ffe7ae]">
                                The guide will open each page, move the hand to the feature being explained, and narrate what it does.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <DialogFooter className="gap-3 px-7 pb-7 sm:justify-between">
                        <Button type="button" variant="outline" onClick={() => completeGuide(false)} className="border-[#d9b66e]">
                            Skip guide
                        </Button>
                        <Button type="button" onClick={startGuide} className="bg-[#d18400] text-white hover:bg-[#ad6d00]">
                            Start guided tour <Pointer className="size-4" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={celebrationOpen} onOpenChange={setCelebrationOpen}>
                <DialogContent className="overflow-hidden border-0 bg-[#fffaf1] p-0 text-[#342615] shadow-[0_28px_90px_rgba(61,38,11,0.34)] sm:max-w-lg [&>button:last-child]:hidden">
                    <div className="relative isolate overflow-hidden bg-gradient-to-br from-[#3b240d] via-[#5b3510] to-[#805014] px-7 pt-10 pb-16 text-center text-white">
                        <span className="absolute -top-16 -left-12 -z-10 size-44 animate-pulse rounded-full bg-[#ffc83d]/20 blur-sm" />
                        <span className="absolute -right-12 -bottom-20 -z-10 size-52 animate-pulse rounded-full bg-[#e99a16]/30 blur-sm [animation-delay:400ms]" />
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-[1] overflow-hidden">
                            {[12, 31, 52, 73, 90].map((left, index) => (
                                <span
                                    key={`balloon-${left}`}
                                    className={`bees-balloon ${['bg-[#ffc83d]', 'bg-[#ed9b27]', 'bg-[#70bd83]', 'bg-[#f8df8e]', 'bg-[#d87845]'][index]}`}
                                    style={{
                                        left: `${left}%`,
                                        animationDelay: `${index * 650}ms`,
                                        animationDuration: `${4.8 + (index % 3) * 0.8}s`,
                                    }}
                                />
                            ))}
                            {[
                                { left: '18%', top: '24%' },
                                { left: '78%', top: '20%' },
                                { left: '68%', top: '62%' },
                            ].map((position, index) => (
                                <span
                                    key={`firework-${position.left}`}
                                    className="bees-firework"
                                    style={{ ...position, animationDelay: `${index * 900 + 250}ms` }}
                                />
                            ))}
                        </div>
                        {Array.from({ length: 12 }, (_, index) => (
                            <span
                                key={index}
                                className="absolute size-2 animate-bounce rounded-sm bg-[#ffc83d]"
                                style={{
                                    left: `${8 + ((index * 17) % 84)}%`,
                                    top: `${10 + ((index * 23) % 72)}%`,
                                    animationDelay: `${index * 90}ms`,
                                    animationDuration: `${900 + (index % 4) * 180}ms`,
                                    transform: `rotate(${index * 31}deg)`,
                                }}
                            />
                        ))}
                        <div className="relative mx-auto grid size-24 place-items-center rounded-full border-4 border-[#ffe49c] bg-[#ffc83d] text-[#4a2d10] shadow-[0_0_0_12px_rgba(255,200,61,0.13),0_18px_45px_rgba(0,0,0,0.28)]">
                            <Trophy className="size-12 animate-[bounce_1.4s_ease-in-out_2]" />
                            <span className="absolute -right-2 -bottom-1 grid size-9 place-items-center rounded-full border-4 border-[#5b3510] bg-[#16815b] text-white">
                                <Check className="size-4 stroke-[3]" />
                            </span>
                        </div>
                        <p className="mt-6 text-xs font-black tracking-[0.24em] text-[#ffc83d] uppercase">Guided tour complete</p>
                        <DialogHeader className="mt-2 text-center">
                            <DialogTitle className="text-3xl font-black tracking-tight text-white">
                                Congratulations, {auth.user.n_name || auth.user.name.split(' ')[0]}!
                            </DialogTitle>
                            <DialogDescription className="mx-auto mt-3 max-w-sm text-base leading-7 text-[#ffe9bb]">
                                Welcome to Bees360. You are ready to explore your workspace, monitor performance, and make every report count.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <div className="relative -mt-7 px-7 pb-7">
                        <div className="rounded-2xl border border-[#ecd7ae] bg-white p-5 shadow-[0_12px_35px_rgba(87,55,16,0.1)]">
                            <div className="grid grid-cols-[auto_1fr] items-center gap-4">
                                <span className="grid size-12 place-items-center rounded-xl bg-[#e5f5e9] text-[#16815b]">
                                    <CheckCircle2 className="size-6" />
                                </span>
                                <div>
                                    <p className="font-black text-[#3f2a14]">Your Bees360 journey starts now</p>
                                    <p className="mt-1 text-sm leading-5 text-[#806f59]">You can replay this guide anytime from your account menu.</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                onClick={() => setCelebrationOpen(false)}
                                className="mt-5 h-11 w-full bg-[#d18400] font-black text-white shadow-[0_8px_20px_rgba(209,132,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ad6d00]"
                            >
                                Enter Bees360 <PartyPopper className="size-5" />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {started && current && (
                <>
                    {targetRect && (
                        <>
                            <div
                                className="pointer-events-none fixed z-[80] rounded-xl border-2 border-[#ffc83d] transition-all duration-500 ease-out"
                                style={{ ...targetRect, boxShadow: '0 0 0 9999px rgba(30, 20, 9, 0.68), 0 0 0 6px rgba(255, 200, 61, 0.28)' }}
                            />
                            <span
                                className="pointer-events-none fixed z-[90] grid size-11 place-items-center rounded-full bg-[#ffc83d] text-[#4a2d10] shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-[top,left] duration-500 ease-out"
                                style={{
                                    top: handTop,
                                    left: handOnLeft ? Math.max(targetRect.left - 54, 8) : Math.min(targetRect.left + targetRect.width + 12, vw - 52),
                                }}
                            >
                                <span className="animate-bounce">
                                    <Pointer className={`size-6 ${handOnLeft ? 'rotate-[102deg]' : '-rotate-12'}`} />
                                </span>
                            </span>
                        </>
                    )}
                    {narrationComplete && (
                        <aside
                            className="fixed z-[100] w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#e5bc59] bg-[#fffdf8] text-[#342615] shadow-[0_20px_65px_rgba(35,22,8,0.35)] sm:w-96"
                            style={{
                                left: calloutOnLeft ? 24 : vw < 640 ? 16 : undefined,
                                right: calloutOnLeft || vw < 640 ? undefined : 24,
                                top: calloutOnTop ? 72 : undefined,
                                bottom: calloutOnTop ? undefined : vw < 640 ? 16 : 24,
                            }}
                        >
                            <div className="bg-[#4a2d10] px-5 py-4 text-white">
                                <div className="flex items-start justify-between gap-3">
                                    <span className="grid size-10 place-items-center rounded-xl bg-[#ffc83d] text-[#4a2d10]">
                                        <Compass className="size-5" />
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {voiceAvailable && (
                                            <button
                                                type="button"
                                                onClick={toggleVoice}
                                                className="grid size-9 place-items-center rounded-full text-[#ffe7ae] transition hover:bg-white/10 hover:text-white"
                                                aria-label={voiceEnabled ? 'Mute guide voice' : 'Enable guide voice'}
                                            >
                                                {voiceEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => completeGuide(false)}
                                            className="grid size-9 place-items-center rounded-full text-[#ffe7ae] transition hover:bg-white/10 hover:text-white"
                                            aria-label="End platform guide"
                                        >
                                            <X className="size-5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-3 text-[10px] font-black tracking-[0.18em] text-[#ffc83d] uppercase">
                                    Step {step + 1} of {steps.length}
                                </p>
                                <h2 className="mt-1 text-lg font-black">{current.title}</h2>
                            </div>
                            <div className="space-y-4 p-5">
                                <p className="text-sm leading-6 text-[#6f5435]">{current.description}</p>
                                <div className="h-2 overflow-hidden rounded-full bg-[#eee7dc]">
                                    <div
                                        className="h-full rounded-full bg-[#d18400] transition-all duration-500"
                                        style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                                    />
                                </div>
                                <p className="flex items-center gap-2 text-xs font-bold text-[#9a650d]">
                                    {targetUnavailable ? (
                                        <>
                                            <span className="grid size-4 place-items-center rounded-full bg-[#fff0c9] text-[10px]">!</span> This
                                            feature is unavailable. You can safely continue.
                                        </>
                                    ) : targetLocated ? (
                                        <>
                                            <Pointer className="size-4 animate-pulse" /> Feature highlighted
                                        </>
                                    ) : (
                                        <>
                                            <span className="size-3 animate-spin rounded-full border-2 border-[#d18400] border-t-transparent" />{' '}
                                            Opening and locating feature…
                                        </>
                                    )}
                                </p>
                                <div className="flex items-center justify-between gap-3">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={step === 0}
                                        onClick={() => moveTo(step - 1)}
                                        className="border-[#d9b66e] bg-[#fff8e8] font-bold text-[#6a3f15] hover:bg-[#ffedbd] disabled:opacity-50"
                                    >
                                        <ArrowLeft className="size-4" /> Previous
                                    </Button>
                                    {step === steps.length - 1 ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => completeGuide(true)}
                                            className="bg-[#16734b] text-white hover:bg-[#105d3c]"
                                        >
                                            Finish tour <Check className="size-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => moveTo(step + 1)}
                                            className="bg-[#d18400] text-white hover:bg-[#ad6d00]"
                                        >
                                            Next feature <Pointer className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </aside>
                    )}
                </>
            )}
        </>
    );
}
