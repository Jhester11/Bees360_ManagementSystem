import { Check, ChevronDown, Search, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type ProcessorSelectProps = {
    id: string;
    value: string;
    processorNames: string[];
    processorAliases?: Record<string, string[]>;
    onValueChange: (value: string) => void;
    includeAll?: boolean;
    allowClear?: boolean;
    clearLabel?: string;
};

function processorInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase();
}

export function ProcessorSelect({
    id,
    value,
    processorNames,
    processorAliases = {},
    onValueChange,
    includeAll = true,
    allowClear = false,
    clearLabel = 'View monthly summary',
}: ProcessorSelectProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const selectedLabel = value === 'all' ? 'All processors' : value;
    const filteredProcessorNames = useMemo(() => {
        const query = search.toLowerCase().trim();

        return query === ''
            ? processorNames
            : processorNames.filter((name) => [name, ...(processorAliases[name] ?? [])].some((label) => label.toLowerCase().includes(query)));
    }, [processorAliases, processorNames, search]);

    useEffect(() => {
        if (!open) return;

        searchRef.current?.focus();
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [open]);

    function selectProcessor(processor: string) {
        onValueChange(processor);
        setOpen(false);
        setSearch('');
    }

    return (
        <div ref={containerRef} className="relative min-w-0">
            <button
                id={id}
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-controls={`${id}-options`}
                onClick={() => setOpen((current) => !current)}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        setOpen(false);
                        setSearch('');
                    }
                }}
                className="flex h-12 w-full min-w-0 items-center rounded-xl border border-[#dfc58f] bg-white px-3 text-sm text-[#4b3820] shadow-[0_4px_14px_rgba(88,57,18,0.06)] transition hover:border-[#c98211] focus:border-[#b96c00] focus:ring-2 focus:ring-[#f3cf81]/60 focus:outline-none"
            >
                <span className="mr-2 grid size-8 shrink-0 place-items-center rounded-lg bg-[#fff0c9] text-[#a96300]">
                    <UsersRound className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-left font-semibold">{selectedLabel || 'Select a processor'}</span>
                <ChevronDown className={`ml-2 size-4 shrink-0 text-[#a96300] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-[calc(100%+6px)] left-0 z-[80] w-full min-w-0 overflow-hidden rounded-xl border border-[#e3c78f] bg-[#fffdf8] shadow-[0_18px_40px_rgba(85,53,10,0.18)]">
                    <div className="border-b border-[#eddfc8] bg-[#fffdf8] p-2.5">
                        <label className="relative block" htmlFor={`${id}-search`}>
                            <span className="sr-only">Search processors</span>
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#b26a00]" />
                            <input
                                ref={searchRef}
                                id={`${id}-search`}
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Escape') {
                                        setOpen(false);
                                        setSearch('');
                                    }
                                }}
                                placeholder="Search processor…"
                                autoComplete="off"
                                className="h-10 w-full rounded-xl border border-[#dfc58f] bg-white pr-9 pl-9 text-sm font-semibold text-[#4b3820] shadow-sm outline-none placeholder:text-[#a99a84] focus:border-[#c98211] focus:ring-2 focus:ring-[#f3cf81]/60"
                            />
                            {search !== '' && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-[#947650] hover:bg-[#fff0c9] hover:text-[#714300]"
                                    aria-label="Clear processor search"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </label>
                        <p className="mt-1.5 px-1 text-[10px] font-bold tracking-[0.08em] text-[#a46b15] uppercase">
                            {filteredProcessorNames.length} processor{filteredProcessorNames.length === 1 ? '' : 's'} found
                        </p>
                    </div>

                    <div id={`${id}-options`} role="listbox" className="max-h-64 overflow-y-auto overscroll-contain p-1.5">
                        {allowClear && search === '' && (
                            <button
                                type="button"
                                role="option"
                                aria-selected={value === ''}
                                onClick={() => selectProcessor('')}
                                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#5d4830] hover:bg-[#fff0c9]"
                            >
                                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f5d995] text-[#8b5b11]">
                                    <UsersRound className="size-3.5" />
                                </span>
                                <span className="min-w-0 flex-1 truncate">{clearLabel}</span>
                                {value === '' && <Check className="size-4 shrink-0 text-[#a96300]" />}
                            </button>
                        )}
                        {includeAll && search === '' && (
                            <button
                                type="button"
                                role="option"
                                aria-selected={value === 'all'}
                                onClick={() => selectProcessor('all')}
                                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#5d4830] hover:bg-[#fff0c9]"
                            >
                                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f5d995] text-[#8b5b11]">
                                    <UsersRound className="size-3.5" />
                                </span>
                                <span className="min-w-0 flex-1 truncate">All processors</span>
                                {value === 'all' && <Check className="size-4 shrink-0 text-[#a96300]" />}
                            </button>
                        )}
                        {filteredProcessorNames.map((name) => (
                            <button
                                key={name}
                                type="button"
                                role="option"
                                aria-selected={value === name}
                                onClick={() => selectProcessor(name)}
                                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#5d4830] hover:bg-[#fff0c9]"
                            >
                                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f6e5bd] text-[10px] font-extrabold tracking-wide text-[#8b5b11]">
                                    {processorInitials(name)}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate">{name}</span>
                                    {processorAliases[name]?.[0] && (
                                        <span className="block truncate text-[10px] font-semibold text-[#9a8465]">
                                            N-name: {processorAliases[name][0]}
                                        </span>
                                    )}
                                </span>
                                {value === name && <Check className="size-4 shrink-0 text-[#a96300]" />}
                            </button>
                        ))}
                        {filteredProcessorNames.length === 0 && (
                            <div className="flex flex-col items-center px-4 py-8 text-center">
                                <div className="grid size-10 place-items-center rounded-xl bg-[#fff0c9] text-[#a96300]">
                                    <Search className="size-5" />
                                </div>
                                <p className="mt-3 text-sm font-extrabold text-[#4a3821]">No processor found</p>
                                <p className="mt-1 text-xs text-[#8b7b64]">Try another name or clear the search.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
