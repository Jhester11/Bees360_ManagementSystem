export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-[#ffc83d] text-[#3b2915] shadow-sm">
                <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 32 32">
                    <path d="M16 4 26 10v12l-10 6-10-6V10l10-6Z" fill="currentColor" />
                    <path d="m16 4 10 6-10 6L6 10l10-6Zm0 12v12M6 10v12l10 6m10-18v12l-10 6" stroke="#fff4cf" strokeWidth="1.5" />
                </svg>
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-bold tracking-tight">Bees360</span>
                <span className="text-sidebar-foreground/60 truncate text-xs">Operations</span>
            </div>
        </>
    );
}
