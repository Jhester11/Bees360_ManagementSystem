import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

function formatDate(date: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${date}T00:00:00Z`),
    );
}

export function BeesDatePicker({
    id,
    label,
    value,
    min,
    max,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    min?: string;
    max?: string;
    onChange: (value: string) => void;
}) {
    const selectedDate = new Date(`${value}T00:00:00Z`);
    const [isOpen, setIsOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1)));
    const year = viewMonth.getUTCFullYear();
    const month = viewMonth.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => (index < firstDay ? null : index - firstDay + 1));
    const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(viewMonth);

    const openCalendar = () => {
        setViewMonth(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1)));
        setIsOpen(true);
    };

    const selectDay = (day: number) => {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(date);
        setIsOpen(false);
    };

    return (
        <div className="relative grid gap-1.5">
            <label className="px-1 text-xs font-bold text-[#6d5735]" htmlFor={id}>
                {label}
            </label>
            <button
                id={id}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                onClick={openCalendar}
                className="flex h-11 w-full items-center gap-2 rounded-xl border border-[#dfc58f] bg-white px-3 text-left text-sm font-semibold text-[#4b3820] shadow-sm transition hover:border-[#c98211] focus-visible:ring-2 focus-visible:ring-[#d78b13] focus-visible:outline-hidden"
            >
                <CalendarDays className="size-4 shrink-0 text-[#b26a00]" />
                <span className="min-w-0 flex-1 truncate">{formatDate(value)}</span>
                <ChevronDown className="size-4 text-[#a36a14]" />
            </button>

            {isOpen && (
                <div
                    role="dialog"
                    aria-label={`${label} calendar`}
                    className="absolute top-[calc(100%+0.5rem)] z-[70] w-72 rounded-2xl border border-[#e5c978] bg-[#fffdf8] p-4 shadow-[0_18px_40px_rgba(85,53,10,0.2)]"
                >
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setViewMonth(new Date(Date.UTC(year, month - 1, 1)))}
                            className="grid size-8 place-items-center rounded-lg text-[#8b5a0c] hover:bg-[#fff0cb]"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        <div className="text-center">
                            <p className="text-sm font-bold text-[#3d2b14]">{monthLabel}</p>
                            <p className="text-[10px] font-bold tracking-[0.13em] text-[#b26a00] uppercase">Bees360 calendar</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setViewMonth(new Date(Date.UTC(year, month + 1, 1)))}
                            className="grid size-8 place-items-center rounded-lg text-[#8b5a0c] hover:bg-[#fff0cb]"
                            aria-label="Next month"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                    <div className="mt-4 grid grid-cols-7 text-center text-[10px] font-bold tracking-wide text-[#9d6e28] uppercase">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                            <span key={day} className="py-1">
                                {day}
                            </span>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1 text-center">
                        {days.map((day, index) => {
                            if (!day) return <span key={`blank-${index}`} className="size-8" />;
                            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isDisabled = Boolean((min && date < min) || (max && date > max));
                            const isSelected = date === value;
                            return (
                                <button
                                    key={date}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => selectDay(day)}
                                    className={`mx-auto grid size-8 place-items-center rounded-lg text-xs font-semibold transition ${isSelected ? 'bg-[#bd7200] text-white shadow-sm' : 'text-[#4b3820] hover:bg-[#fff0cb]'} disabled:cursor-not-allowed disabled:text-[#d6c7ae] disabled:hover:bg-transparent`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[#f1e2c3] pt-3">
                        <button type="button" onClick={() => setIsOpen(false)} className="text-xs font-bold text-[#9b691e] hover:text-[#714300]">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                                onChange(firstDay);
                                setIsOpen(false);
                            }}
                            className="text-xs font-bold text-[#a96300] hover:text-[#714300]"
                        >
                            Select first day
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
