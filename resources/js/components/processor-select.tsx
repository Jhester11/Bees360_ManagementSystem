import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UsersRound, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type ProcessorSelectProps = {
    id: string;
    value: string;
    processorNames: string[];
    onValueChange: (value: string) => void;
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

export function ProcessorSelect({ id, value, processorNames, onValueChange }: ProcessorSelectProps) {
    const [search, setSearch] = useState('');
    const selectedLabel = value === 'all' ? 'All processors' : value;
    const filteredProcessorNames = useMemo(() => {
        const query = search.toLowerCase().trim();

        return query === '' ? processorNames : processorNames.filter((name) => name.toLowerCase().includes(query));
    }, [processorNames, search]);

    return (
        <Select
            value={value}
            onValueChange={onValueChange}
            onOpenChange={(open) => {
                if (!open) setSearch('');
            }}
        >
            <SelectTrigger
                id={id}
                className="h-12 rounded-xl border-[#dfc58f] bg-white px-3 text-[#4b3820] shadow-[0_4px_14px_rgba(88,57,18,0.06)] transition hover:border-[#c98211] focus:ring-[#d78b13] data-[state=open]:border-[#b96c00] data-[state=open]:ring-2 data-[state=open]:ring-[#f3cf81]/60 [&>svg]:text-[#a96300] [&>svg]:opacity-100"
            >
                <div className="mr-2 grid size-8 shrink-0 place-items-center rounded-lg bg-[#fff0c9] text-[#a96300]">
                    <UsersRound className="size-4" />
                </div>
                <SelectValue placeholder="Select a processor">
                    {selectedLabel ? <span className="font-semibold">{selectedLabel}</span> : undefined}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[360px] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] rounded-xl border-[#e3c78f] bg-[#fffdf8] p-1 shadow-[0_18px_40px_rgba(85,53,10,0.18)]">
                <div className="sticky top-0 z-10 border-b border-[#eddfc8] bg-[#fffdf8] p-2" onKeyDown={(event) => event.stopPropagation()}>
                    <label className="relative block" htmlFor={`${id}-search`}>
                        <span className="sr-only">Search processors</span>
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#b26a00]" />
                        <input
                            id={`${id}-search`}
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search processor…"
                            autoComplete="off"
                            className="h-10 w-full rounded-xl border border-[#dfc58f] bg-white pr-9 pl-9 text-sm font-semibold text-[#4b3820] shadow-sm outline-none placeholder:text-[#a99a84] focus:border-[#c98211] focus:ring-2 focus:ring-[#f3cf81]/60"
                        />
                        {search !== '' && (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setSearch('');
                                }}
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
                <div className="p-1">
                    {search === '' && (
                        <SelectItem
                            value="all"
                            className="min-h-11 rounded-lg py-2 pr-3 pl-9 font-semibold text-[#5d4830] focus:bg-[#fff0c9] focus:text-[#714300] data-[state=checked]:bg-[#fff0c9] data-[state=checked]:text-[#714300]"
                        >
                            <span className="flex min-w-0 items-center gap-2.5">
                                <span className="grid size-7 place-items-center rounded-full bg-[#f5d995] text-[#8b5b11]">
                                    <UsersRound className="size-3.5" />
                                </span>
                                All processors
                            </span>
                        </SelectItem>
                    )}
                    {filteredProcessorNames.map((name) => (
                        <SelectItem
                            key={name}
                            value={name}
                            className="min-h-11 rounded-lg py-2 pr-3 pl-9 font-medium text-[#5d4830] focus:bg-[#fff0c9] focus:text-[#714300] data-[state=checked]:bg-[#fff0c9] data-[state=checked]:text-[#714300]"
                        >
                            <span className="flex items-center gap-2.5">
                                <span className="grid size-7 place-items-center rounded-full bg-[#f6e5bd] text-[10px] font-extrabold tracking-wide text-[#8b5b11]">
                                    {processorInitials(name)}
                                </span>
                                <span className="truncate">{name}</span>
                            </span>
                        </SelectItem>
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
            </SelectContent>
        </Select>
    );
}
