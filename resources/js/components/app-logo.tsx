import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-[#ffc83d] text-[#3b2915] shadow-sm">
                <AppLogoIcon className="size-7" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-bold tracking-tight">Bees360</span>
                <span className="text-sidebar-foreground/60 truncate text-xs">Operations</span>
            </div>
        </>
    );
}
