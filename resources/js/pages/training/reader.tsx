import { TrainingPage, button, secondary } from '@/components/training/training-ui';
import { Bookmark, ChevronLeft, ChevronRight, Maximize, Minus, Pause, Play, Plus, Search, Sparkles, Volume2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

const csrf = () =>
    decodeURIComponent(
        document.cookie
            .split('; ')
            .find((x) => x.startsWith('XSRF-TOKEN='))
            ?.split('=')[1] || '',
    );

export default function Reader({
    material,
    assignmentUser,
    bookmarks: savedBookmarks,
    fileUrl,
}: {
    material: any;
    assignmentUser: any;
    bookmarks: number[];
    fileUrl: string;
}) {
    const container = useRef<HTMLDivElement>(null),
        pdfRef = useRef<any>(null),
        narrationStarted = useRef(false),
        discussionRun = useRef(0),
        spotlightTimeout = useRef<number | null>(null),
        spotlightInterval = useRef<number | null>(null);
    const [page, setPage] = useState(assignmentUser?.progress?.last_read_page || 0),
        [pages, setPages] = useState(0),
        [scale, setScale] = useState(0.78),
        [loading, setLoading] = useState(true),
        [isMobile, setIsMobile] = useState(false),
        [turning, setTurning] = useState<'next' | 'previous' | null>(null),
        [bookmarks, setBookmarks] = useState(savedBookmarks),
        [query, setQuery] = useState(''),
        [outline, setOutline] = useState<any[]>([]),
        [guide, setGuide] = useState<number | null>(null),
        [speaking, setSpeaking] = useState(false),
        [narrating, setNarrating] = useState(false),
        [spotlightPage, setSpotlightPage] = useState<number | null>(null),
        [spotlightSeconds, setSpotlightSeconds] = useState(0),
        [autoNarrate, setAutoNarrate] = useState(false),
        [isFullscreen, setIsFullscreen] = useState(false);
    const guideSteps = [
        [
            'Open-book navigation',
            'Your training is presented as an open book. Use Previous and Next to turn one page on mobile or a complete spread on larger screens.',
        ],
        [
            'Voice discussion',
            'Select Discuss this spread and Bees360 will read the visible pages. After speaking, each page with images is highlighted for 15 seconds before continuing.',
        ],
        [
            'Study tools',
            'Use thumbnails, table of contents, search, zoom, fullscreen, and bookmarks while your reading progress saves automatically.',
        ],
    ];

    useEffect(() => {
        const media = window.matchMedia('(max-width: 767px)');
        const update = () => setIsMobile(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);
    useEffect(() => {
        let alive = true;
        import('pdfjs-dist').then(async (pdfjs) => {
            pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
            const pdf = await pdfjs.getDocument(fileUrl).promise;
            if (!alive) return;
            pdfRef.current = pdf;
            setPages(pdf.numPages);
            setOutline((await pdf.getOutline()) || []);
            setPage((current: number) => Math.min(current, pdf.numPages + 1));
            setLoading(false);
        });
        return () => {
            alive = false;
            window.speechSynthesis.cancel();
            clearSpotlightReview();
        };
    }, [fileUrl]);
    useEffect(() => {
        const update = () => setIsFullscreen(document.fullscreenElement === container.current);
        document.addEventListener('fullscreenchange', update);
        return () => document.removeEventListener('fullscreenchange', update);
    }, []);
    useEffect(() => {
        if (pages) fitSpread();
    }, [isFullscreen, isMobile, pages, page]);
    useEffect(() => {
        if (!pages || page === 0) return;
        const lastVisible = page > pages ? pages : Math.min(pages, page + (isMobile ? 0 : 1));
        fetch(`/training/materials/${material.id}/progress`, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': csrf() },
            body: JSON.stringify({ page: lastVisible, total_pages: pages }),
        });
    }, [page, pages, isMobile, material.id]);

    function speakGuide(index: number) {
        discussionRun.current += 1;
        window.speechSynthesis.cancel();
        setNarrating(false);
        clearSpotlightReview();
        setGuide(index);
        setSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(guideSteps[index][1]);
        utterance.rate = 0.92;
        utterance.onend = utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }
    async function narrateSpread() {
        if (narrating) {
            discussionRun.current += 1;
            window.speechSynthesis.cancel();
            setNarrating(false);
            clearSpotlightReview();
            return;
        }
        if (!pdfRef.current) return;
        const run = ++discussionRun.current;
        clearSpotlightReview();
        if (!document.fullscreenElement && container.current) {
            try {
                await container.current.requestFullscreen();
                await new Promise((resolve) => window.setTimeout(resolve, 250));
            } catch {
                // Narration remains available when fullscreen is blocked by browser policy.
            }
        }
        if (run !== discussionRun.current) return;
        window.speechSynthesis.cancel();
        if (page === 0 || page > pages) {
            const coverText =
                page === 0 ? `${material.subject?.name || 'Bees360 Training'}. ${material.title}.` : `You have reached the end of ${material.title}.`;
            const coverUtterance = new SpeechSynthesisUtterance(coverText);
            coverUtterance.rate = 0.9;
            coverUtterance.pitch = 0.92;
            coverUtterance.onend = () => {
                if (run !== discussionRun.current) return;
                setNarrating(false);
                clearSpotlightReview();
            };
            coverUtterance.onerror = () => {
                if (run !== discussionRun.current) return;
                discussionRun.current += 1;
                setNarrating(false);
                clearSpotlightReview();
            };
            setNarrating(true);
            window.speechSynthesis.speak(coverUtterance);
            return;
        }
        const visible = [page, ...(isMobile || page >= pages ? [] : [page + 1])];
        setNarrating(true);
        discussPageSequence(visible, 0, run);
    }
    function turn(direction: 'next' | 'previous') {
        if (turning) return;
        discussionRun.current += 1;
        window.speechSynthesis.cancel();
        setNarrating(false);
        clearSpotlightReview();
        setTurning(direction);
        window.setTimeout(() => {
            setPage((current: number) => nextBookPage(current, direction, pages, isMobile));
        }, 330);
        window.setTimeout(() => {
            setTurning(null);
            narrationStarted.current = autoNarrate;
        }, 660);
    }
    async function fitSpread() {
        if (!pdfRef.current) return;
        const pdfPage = await pdfRef.current.getPage(Math.min(pages, Math.max(1, page)));
        const original = pdfPage.getViewport({ scale: 1 });
        const spreadWidth = isMobile ? 1 : 2;
        const availableWidth = isFullscreen ? window.innerWidth - 32 : Math.max(320, (container.current?.clientWidth || window.innerWidth) - 150);
        const availableHeight = isFullscreen ? window.innerHeight - 24 : Math.max(420, window.innerHeight - 300);
        setScale(Math.max(0.35, Math.min(1.7, availableWidth / spreadWidth / original.width, availableHeight / original.height)));
    }
    async function toggleFullscreen() {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await container.current?.requestFullscreen();
    }
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) return;
            if (event.key.toLowerCase() === 'f') {
                event.preventDefault();
                toggleFullscreen();
            } else if (event.code === 'Space') {
                event.preventDefault();
                narrateSpread();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                turn('next');
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                turn('previous');
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });
    useEffect(() => {
        if (narrationStarted.current && !turning) {
            narrationStarted.current = false;
            const id = window.setTimeout(narrateSpread, 400);
            return () => window.clearTimeout(id);
        }
    }, [page, turning]);
    async function search() {
        if (!query.trim() || !pdfRef.current) return;
        for (let number = 1; number <= pages; number++) {
            const content = await (await pdfRef.current.getPage(number)).getTextContent();
            if (
                content.items
                    .map((item: any) => item.str)
                    .join(' ')
                    .toLowerCase()
                    .includes(query.toLowerCase())
            ) {
                setPage(number);
                return;
            }
        }
        alert('Text not found in this book.');
    }
    async function toggleBookmark() {
        if (page < 1 || page > pages) return;
        const response = await fetch(`/training/materials/${material.id}/bookmark`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': csrf() },
            body: JSON.stringify({ page }),
        });
        if (response.ok) setBookmarks((current) => (current.includes(page) ? current.filter((number) => number !== page) : [...current, page]));
    }
    async function openOutline(item: any) {
        const destination = typeof item.dest === 'string' ? await pdfRef.current.getDestination(item.dest) : item.dest;
        if (destination?.[0]) setPage((await pdfRef.current.getPageIndex(destination[0])) + 1);
    }

    function clearSpotlightReview() {
        if (spotlightTimeout.current !== null) window.clearTimeout(spotlightTimeout.current);
        if (spotlightInterval.current !== null) window.clearInterval(spotlightInterval.current);
        spotlightTimeout.current = null;
        spotlightInterval.current = null;
        setSpotlightPage(null);
        setSpotlightSeconds(0);
    }

    async function discussPageSequence(visiblePages: number[], index: number, run: number) {
        if (run !== discussionRun.current) return;
        if (index >= visiblePages.length) {
            spotlightTimeout.current = window.setTimeout(() => {
                if (run !== discussionRun.current) return;
                setNarrating(false);
                turn('next');
            }, 450);
            return;
        }

        const currentPage = visiblePages[index];
        const pdfPage = await pdfRef.current.getPage(currentPage);
        const content = await pdfPage.getTextContent();
        if (run !== discussionRun.current) return;
        const text = content.items
            .map((item: any) => item.str)
            .join(' ')
            .trim();
        const reviewThenContinue = () => reviewPageImages(currentPage, run, () => discussPageSequence(visiblePages, index + 1, run));

        if (!text) {
            reviewThenContinue();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 0.92;
        utterance.onend = () => {
            if (run === discussionRun.current) reviewThenContinue();
        };
        utterance.onerror = () => {
            if (run !== discussionRun.current) return;
            discussionRun.current += 1;
            setNarrating(false);
            clearSpotlightReview();
        };
        window.speechSynthesis.speak(utterance);
    }

    async function reviewPageImages(reviewPage: number, run: number, onComplete: () => void) {
        clearSpotlightReview();
        const pdfPage = await pdfRef.current.getPage(reviewPage);
        const imageRegions = await findVisibleImageRegions(pdfPage, pdfPage.getViewport({ scale: 1 }));
        if (run !== discussionRun.current) return;

        if (imageRegions.length === 0) {
            onComplete();
            return;
        }

        setSpotlightPage(reviewPage);
        setSpotlightSeconds(15);
        spotlightInterval.current = window.setInterval(() => setSpotlightSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
        spotlightTimeout.current = window.setTimeout(() => {
            if (run !== discussionRun.current) return;
            clearSpotlightReview();
            onComplete();
        }, 15000);
    }

    const isFrontCover = page === 0;
    const isBackCover = pages > 0 && page === pages + 1;
    const pageLabel = isFrontCover
        ? 'Front cover'
        : isBackCover
          ? 'Back cover'
          : `Pages ${page}${!isMobile && page < pages ? `–${page + 1}` : ''} of ${pages || '…'}`;
    const readingProgress = !pages
        ? 0
        : isBackCover
          ? 100
          : isFrontCover
            ? 0
            : Math.round((Math.min(pages, page + (isMobile ? 0 : 1)) / pages) * 100);

    return (
        <TrainingPage
            title={material.title}
            actions={
                <button className={secondary} onClick={() => speakGuide(0)}>
                    <Sparkles className="mr-2 size-4" />
                    Interactive book guide
                </button>
            }
        >
            <div
                ref={container}
                className={`relative overflow-hidden border border-[#17181b] bg-[#1b1c20] shadow-2xl ${isFullscreen ? 'h-screen w-screen rounded-none' : 'rounded-2xl'}`}
            >
                <div
                    className={`${isFullscreen ? 'hidden' : 'flex'} relative z-30 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#21170e] p-3 text-white`}
                >
                    <div className="flex items-center gap-2">
                        <button className={secondary} disabled={page <= 0} onClick={() => turn('previous')}>
                            <ChevronLeft className="size-4" />
                            Previous
                        </button>
                        <b className="min-w-36 text-center">{pageLabel}</b>
                        <button className={secondary} disabled={page >= pages + 1} onClick={() => turn('next')}>
                            Next
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-lg bg-white">
                            <input
                                className="w-32 bg-transparent px-2 text-sm text-black outline-none"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => event.key === 'Enter' && search()}
                                placeholder="Search book"
                            />
                            <button onClick={search} className="p-2 text-black">
                                <Search className="size-4" />
                            </button>
                        </div>
                        <button aria-label="Zoom out" onClick={() => setScale((value) => Math.max(0.45, value - 0.1))}>
                            <Minus />
                        </button>
                        <button aria-label="Zoom in" onClick={() => setScale((value) => Math.min(1.5, value + 0.1))}>
                            <Plus />
                        </button>
                        <button
                            aria-label="Bookmark"
                            disabled={page < 1 || page > pages}
                            onClick={toggleBookmark}
                            className={`${bookmarks.includes(page) ? 'text-[#ffc83d]' : ''} disabled:cursor-not-allowed disabled:opacity-30`}
                        >
                            <Bookmark fill={bookmarks.includes(page) ? 'currentColor' : 'none'} />
                        </button>
                        <button aria-label="Fullscreen (F)" title="Fullscreen (F)" onClick={toggleFullscreen}>
                            <Maximize />
                        </button>
                        <button
                            onClick={fitSpread}
                            className="rounded-md border border-white/30 px-2 py-1 text-xs font-bold"
                            title="Fit book to screen"
                        >
                            Fit
                        </button>
                        <button
                            onClick={narrateSpread}
                            className="flex items-center gap-1 rounded-lg bg-[#ffc83d] px-3 py-2 text-xs font-black text-[#362207]"
                        >
                            {narrating ? <Pause className="size-4" /> : <Play className="size-4" />}
                            {narrating ? 'Stop discussion' : 'Discuss this spread'}
                        </button>
                        <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={autoNarrate} onChange={(event) => setAutoNarrate(event.target.checked)} />
                            Auto speak
                        </label>
                    </div>
                </div>
                <div
                    className={`relative grid bg-gradient-to-br from-[#1a1b1e] via-[#505155] to-[#111216] ${isFullscreen ? 'h-screen min-h-0 grid-cols-1' : 'h-[calc(100vh-210px)] min-h-[520px] grid-cols-[72px_1fr] sm:grid-cols-[100px_1fr]'}`}
                >
                    <AmbientParticles />
                    <aside
                        className={`${isFullscreen ? 'hidden' : 'block'} relative z-20 overflow-y-auto border-r border-white/10 bg-black/35 p-2 text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
                    >
                        {outline.length > 0 && <p className="mb-2 text-center text-[10px] font-bold uppercase">Contents</p>}
                        {outline.slice(0, 8).map((item, index) => (
                            <button
                                key={index}
                                onClick={() => openOutline(item)}
                                className="mb-1 w-full truncate rounded p-1 text-left text-[10px] hover:bg-white/10"
                            >
                                {item.title}
                            </button>
                        ))}
                        <p className="my-2 text-center text-[10px] font-bold uppercase">Pages</p>
                        {Array.from({ length: pages }, (_, index) => (
                            <Thumbnail
                                key={index + 1}
                                pdf={pdfRef.current}
                                page={index + 1}
                                active={!isFrontCover && !isBackCover && (page === index + 1 || (!isMobile && page + 1 === index + 1))}
                                onClick={() => setPage(index + 1)}
                            />
                        ))}
                    </aside>
                    <main className={`relative z-10 flex overflow-hidden md:items-center md:justify-center ${isFullscreen ? 'p-2' : 'p-4 md:p-8'}`}>
                        {loading ? (
                            <div className="mx-auto h-[70vh] w-full max-w-4xl animate-pulse rounded bg-white/60" />
                        ) : (
                            <div className="mx-auto flex min-w-fit [perspective:1800px]">
                                {isFrontCover || isBackCover ? (
                                    <BookCover material={material} back={isBackCover} fullscreen={isFullscreen} turning={turning} />
                                ) : (
                                    <BookPage
                                        pdf={pdfRef.current}
                                        page={page}
                                        scale={scale}
                                        side={isMobile ? 'single' : 'left'}
                                        highlighted={spotlightPage === page}
                                        fullscreen={isFullscreen}
                                        turning={turning}
                                    />
                                )}
                                {!isMobile && !isFrontCover && !isBackCover && page < pages && (
                                    <BookPage
                                        pdf={pdfRef.current}
                                        page={page + 1}
                                        scale={scale}
                                        side="right"
                                        highlighted={spotlightPage === page + 1}
                                        fullscreen={isFullscreen}
                                        turning={turning}
                                    />
                                )}
                            </div>
                        )}
                    </main>
                </div>
                {isFullscreen && (
                    <>
                        <div className="pointer-events-none absolute top-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-xs font-bold text-white">
                            {pageLabel} · F to exit
                        </div>
                        <button
                            aria-label="Previous spread"
                            disabled={page <= 0}
                            onClick={() => turn('previous')}
                            className="absolute top-1/2 left-4 z-40 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white shadow-lg hover:bg-[#b96f00] disabled:opacity-20"
                        >
                            <ChevronLeft />
                        </button>
                        <button
                            aria-label="Next spread"
                            disabled={page >= pages + 1}
                            onClick={() => turn('next')}
                            className="absolute top-1/2 right-4 z-40 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white shadow-lg hover:bg-[#b96f00] disabled:opacity-20"
                        >
                            <ChevronRight />
                        </button>
                        <button
                            onClick={narrateSpread}
                            className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#ffc83d] px-5 py-3 text-sm font-black text-[#362207] shadow-xl"
                        >
                            {narrating ? <Pause className="size-4" /> : <Play className="size-4" />}
                            {narrating ? 'Stop discussion · Space' : 'Play audio · Space'}
                        </button>
                    </>
                )}
                <div
                    className={`absolute z-30 rounded-full bg-black/75 px-4 py-2 text-xs font-bold text-white ${isFullscreen ? 'bottom-5 left-5' : 'bottom-4 left-1/2 -translate-x-1/2'}`}
                >
                    Reading progress: {readingProgress}%
                </div>
                {spotlightPage !== null && (
                    <div className="absolute right-5 bottom-5 z-40 rounded-full border border-[#ffc83d]/60 bg-black/75 px-4 py-2 text-xs font-bold text-white shadow-xl">
                        Reviewing page {spotlightPage} images · Next in {spotlightSeconds}s
                    </div>
                )}
                {guide !== null && (
                    <>
                        <div
                            className={`pointer-events-none absolute ${guide === 0 ? 'top-24 left-28' : guide === 1 ? 'top-20 right-8' : 'bottom-12 left-1/2'} z-40 size-12 animate-bounce rounded-full bg-[#ffc83d] text-center text-3xl shadow-lg`}
                        >
                            ☝
                        </div>
                        <div className="absolute top-24 right-5 z-50 w-80 rounded-2xl border border-[#e7b750] bg-[#fffaf0] p-4 text-left text-[#3b280f] shadow-2xl">
                            <button
                                className="absolute top-3 right-3"
                                onClick={() => {
                                    window.speechSynthesis.cancel();
                                    setGuide(null);
                                }}
                            >
                                <X className="size-4" />
                            </button>
                            <p className="text-xs font-bold text-[#b36a00]">
                                BOOK GUIDE · {guide + 1} OF {guideSteps.length}
                            </p>
                            <h3 className="mt-2 font-black">{guideSteps[guide][0]}</h3>
                            <p className="mt-2 text-sm leading-6">{guideSteps[guide][1]}</p>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="flex items-center gap-1 text-xs">
                                    {speaking && <Volume2 className="size-4 animate-pulse" />}
                                    {speaking ? 'Speaking…' : 'Explanation complete'}
                                </span>
                                <button
                                    disabled={speaking}
                                    className={button}
                                    onClick={() => (guide === guideSteps.length - 1 ? setGuide(null) : speakGuide(guide + 1))}
                                >
                                    {guide === guideSteps.length - 1 ? 'Finish' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </TrainingPage>
    );
}

function nextBookPage(current: number, direction: 'next' | 'previous', pages: number, isMobile: boolean) {
    if (isMobile) return direction === 'next' ? Math.min(pages + 1, current + 1) : Math.max(0, current - 1);
    if (direction === 'next') {
        if (current === 0) return 1;
        if (current >= pages - 1) return pages + 1;

        return current + 2;
    }
    if (current === pages + 1) return pages % 2 === 0 ? Math.max(1, pages - 1) : pages;
    if (current <= 1) return 0;

    return Math.max(1, current - 2);
}

function BookCover({
    material,
    back,
    fullscreen,
    turning,
}: {
    material: any;
    back: boolean;
    fullscreen: boolean;
    turning: 'next' | 'previous' | null;
}) {
    const background = !back && material.cover_path ? `url('/training/materials/${material.id}/cover')` : undefined;
    const turnClass = turning === 'next' ? 'book-page-turn-forward' : turning === 'previous' ? 'book-page-turn-backward' : '';

    return (
        <div
            className={`relative aspect-[.707] overflow-hidden rounded-sm border border-[#8d5a18] bg-gradient-to-br from-[#2c1908] via-[#70430d] to-[#d08a18] bg-cover bg-center shadow-2xl ${fullscreen ? 'h-[96vh] max-w-[96vw]' : 'h-[70vh] max-h-[760px] max-w-[78vw]'} ${turnClass}`}
            style={background ? { backgroundImage: background } : undefined}
        >
            {back ? (
                <div className="absolute inset-0 grid place-items-center bg-[#3a220b] p-8 text-center text-[#fff2cf]">
                    <div className="absolute inset-5 rounded-sm border border-[#d69325]/45" />
                    <div className="relative">
                        <div className="mx-auto mb-6 size-14 rounded-full border border-[#ffc83d]/60 bg-[#ffc83d]/10" />
                        <p className="text-xs font-black tracking-[.3em] text-[#ffc83d] uppercase">Bees360 Learning</p>
                    </div>
                </div>
            ) : (
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-black/15 via-black/20 to-black/90 p-8 text-white sm:p-12">
                    <p className="text-xs font-black tracking-[.24em] text-[#ffd36b] uppercase sm:text-sm">
                        {material.subject?.name || 'Bees360 Learning'}
                    </p>
                    <h2 className="mt-3 max-w-lg text-3xl leading-tight font-black drop-shadow-lg sm:text-5xl">{material.title}</h2>
                    <div className="mt-6 h-1 w-20 rounded-full bg-[#ffc83d]" />
                </div>
            )}
        </div>
    );
}

function BookPage({
    pdf,
    page,
    scale,
    side,
    highlighted,
    fullscreen,
    turning,
}: {
    pdf: any;
    page: number;
    scale: number;
    side: 'left' | 'right' | 'single';
    highlighted: boolean;
    fullscreen: boolean;
    turning: 'next' | 'previous' | null;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const spotlightMaskId = `book-image-mask-${useId().replace(/:/g, '')}`;
    const [imageRegions, setImageRegions] = useState<ImageRegion[]>([]);
    useEffect(() => {
        if (!pdf || !ref.current) return;
        let task: any;
        let cancelled = false;
        setImageRegions([]);
        pdf.getPage(page).then(async (pdfPage: any) => {
            const viewport = pdfPage.getViewport({ scale });
            const canvas = ref.current!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            task = pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport });
            const regions = await findVisibleImageRegions(pdfPage, viewport);
            if (!cancelled) {
                setImageRegions(regions);
            }
        });
        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [pdf, page, scale]);
    const pageTurnClass =
        turning === 'next' && (side === 'right' || side === 'single')
            ? 'book-page-turn-forward'
            : turning === 'previous' && (side === 'left' || side === 'single')
              ? 'book-page-turn-backward'
              : '';

    return (
        <div
            className={`relative overflow-hidden border border-black/60 bg-white transition-shadow duration-300 ${pageTurnClass} ${side === 'left' ? 'origin-right rounded-l-sm shadow-[-14px_16px_25px_rgba(0,0,0,.48)]' : side === 'right' ? 'origin-left rounded-r-sm shadow-[14px_16px_25px_rgba(0,0,0,.48)]' : 'rounded-sm shadow-2xl'}`}
        >
            <canvas
                ref={ref}
                className={`block bg-white ${fullscreen ? 'max-h-[98vh] max-w-[98vw] md:max-w-[49vw]' : 'max-h-[72vh] max-w-[76vw] md:max-w-[39vw]'}`}
            />
            {highlighted && imageRegions.length > 0 && (
                <>
                    <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-10 size-full"
                        preserveAspectRatio="none"
                        viewBox="0 0 100 100"
                    >
                        <defs>
                            <mask id={spotlightMaskId}>
                                <rect width="100" height="100" fill="white" />
                                {imageRegions.map((region, index) => (
                                    <rect
                                        key={index}
                                        x={region.left}
                                        y={region.top}
                                        width={region.width}
                                        height={region.height}
                                        rx="0.8"
                                        fill="black"
                                    />
                                ))}
                            </mask>
                        </defs>
                        <rect width="100" height="100" fill="rgba(0, 0, 0, .32)" mask={`url(#${spotlightMaskId})`} />
                    </svg>
                    {imageRegions.map((region, index) => (
                        <div
                            key={index}
                            className="book-image-focus pointer-events-none absolute z-20 rounded-md border-[3px] border-[#ffc83d] shadow-[0_0_22px_5px_rgba(255,200,61,.7)]"
                            style={{
                                left: `${region.left}%`,
                                top: `${region.top}%`,
                                width: `${region.width}%`,
                                height: `${region.height}%`,
                            }}
                        />
                    ))}
                </>
            )}
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-white/80 px-2 text-[10px] font-bold text-black">{page}</span>
            {side !== 'single' && (
                <span
                    className={`pointer-events-none absolute inset-y-0 w-10 ${side === 'left' ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} from-black/20 to-transparent`}
                />
            )}
        </div>
    );
}

type ImageRegion = { left: number; top: number; width: number; height: number; area: number };

async function findVisibleImageRegions(pdfPage: any, viewport: any): Promise<ImageRegion[]> {
    const { OPS } = await import('pdfjs-dist');
    const operators = await pdfPage.getOperatorList();
    const stack: number[][] = [];
    let matrix = [1, 0, 0, 1, 0, 0];
    const regions: ImageRegion[] = [];
    for (let index = 0; index < operators.fnArray.length; index++) {
        const operation = operators.fnArray[index];
        if (operation === OPS.save) stack.push([...matrix]);
        else if (operation === OPS.restore) matrix = stack.pop() || [1, 0, 0, 1, 0, 0];
        else if (operation === OPS.transform) matrix = multiplyMatrix(matrix, operators.argsArray[index]);
        else if ([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject].includes(operation)) {
            const canvasMatrix = multiplyMatrix(viewport.transform, matrix);
            const points = [
                transformPoint(canvasMatrix, 0, 0),
                transformPoint(canvasMatrix, 1, 0),
                transformPoint(canvasMatrix, 0, 1),
                transformPoint(canvasMatrix, 1, 1),
            ];
            const xs = points.map((point) => point[0]),
                ys = points.map((point) => point[1]);
            const left = Math.max(0, Math.min(...xs)),
                top = Math.max(0, Math.min(...ys));
            const width = Math.min(viewport.width, Math.max(...xs)) - left,
                height = Math.min(viewport.height, Math.max(...ys)) - top;
            if (width * height > viewport.width * viewport.height * 0.015)
                regions.push({
                    left: (left / viewport.width) * 100,
                    top: (top / viewport.height) * 100,
                    width: (width / viewport.width) * 100,
                    height: (height / viewport.height) * 100,
                    area: width * height,
                });
        }
    }
    return regions
        .sort((first, second) => second.area - first.area)
        .filter((region, index, sorted) => !sorted.slice(0, index).some((existing) => regionsOverlap(existing, region) > 0.92));
}

function regionsOverlap(first: ImageRegion, second: ImageRegion) {
    const overlapWidth = Math.max(0, Math.min(first.left + first.width, second.left + second.width) - Math.max(first.left, second.left));
    const overlapHeight = Math.max(0, Math.min(first.top + first.height, second.top + second.height) - Math.max(first.top, second.top));
    const overlapArea = overlapWidth * overlapHeight;

    return overlapArea / Math.min(first.width * first.height, second.width * second.height);
}

function multiplyMatrix(first: number[], second: number[]) {
    return [
        first[0] * second[0] + first[2] * second[1],
        first[1] * second[0] + first[3] * second[1],
        first[0] * second[2] + first[2] * second[3],
        first[1] * second[2] + first[3] * second[3],
        first[0] * second[4] + first[2] * second[5] + first[4],
        first[1] * second[4] + first[3] * second[5] + first[5],
    ];
}

function transformPoint(matrix: number[], x: number, y: number) {
    return [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
}
function Thumbnail({ pdf, page, active, onClick }: { pdf: any; page: number; active: boolean; onClick: () => void }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!pdf || !ref.current) return;
        let task: any;
        pdf.getPage(page).then((pdfPage: any) => {
            const viewport = pdfPage.getViewport({ scale: 0.12 });
            const canvas = ref.current!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            task = pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport });
        });
        return () => task?.cancel();
    }, [pdf, page]);
    return (
        <button
            onClick={onClick}
            className={`mb-2 w-full rounded border p-1 text-[10px] ${active ? 'border-[#ffc83d] bg-[#ffc83d]/20' : 'border-white/20'}`}
        >
            <canvas ref={ref} className="mx-auto max-w-full bg-white" />
            <span>{page}</span>
        </button>
    );
}
function AmbientParticles() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            {Array.from({ length: 28 }, (_, index) => (
                <i
                    key={index}
                    className="book-particle absolute size-1 rounded-full bg-white/90"
                    style={{
                        left: `${(index * 37) % 100}%`,
                        top: `${(index * 61) % 100}%`,
                        animationDelay: `${(index % 9) * -0.7}s`,
                        animationDuration: `${5 + (index % 6)}s`,
                    }}
                />
            ))}
        </div>
    );
}
