import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UsersRound } from 'lucide-react';

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
    const selectedLabel = value === 'all' ? 'All processors' : value;

    return (
        <Select value={value} onValueChange={onValueChange}>
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
            <SelectContent className="rounded-xl border-[#e3c78f] bg-[#fffdf8] p-1 shadow-[0_18px_40px_rgba(85,53,10,0.18)]">
                <SelectItem
                    value="all"
                    className="min-h-11 rounded-lg py-2 pr-3 pl-9 font-semibold text-[#5d4830] focus:bg-[#fff0c9] focus:text-[#714300] data-[state=checked]:bg-[#fff0c9] data-[state=checked]:text-[#714300]"
                >
                    <span className="flex items-center gap-2.5">
                        <span className="grid size-7 place-items-center rounded-full bg-[#f5d995] text-[#8b5b11]">
                            <UsersRound className="size-3.5" />
                        </span>
                        All processors
                    </span>
                </SelectItem>
                {processorNames.map((name) => (
                    <SelectItem
                        key={name}
                        value={name}
                        className="min-h-11 rounded-lg py-2 pr-3 pl-9 font-medium text-[#5d4830] focus:bg-[#fff0c9] focus:text-[#714300] data-[state=checked]:bg-[#fff0c9] data-[state=checked]:text-[#714300]"
                    >
                        <span className="flex items-center gap-2.5">
                            <span className="grid size-7 place-items-center rounded-full bg-[#f6e5bd] text-[10px] font-extrabold tracking-wide text-[#8b5b11]">
                                {processorInitials(name)}
                            </span>
                            {name}
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
