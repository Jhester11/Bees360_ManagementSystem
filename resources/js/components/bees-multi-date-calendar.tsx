import { CalendarCheck2, Check, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export function BeesMultiDateCalendar({
    id,
    initialDate,
    isSelected,
    onToggle,
    onReset,
}: {
    id: string;
    initialDate: string;
    isSelected: (date: string) => boolean;
    onToggle: (date: string) => void;
    onReset: () => void;
}) {
    const initial = new Date(`${initialDate}T00:00:00Z`);
    const [isOpen, setIsOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => new Date(Date.UTC(initial.getUTCFullYear(), initial.getUTCMonth(), 1)));
    const year = viewMonth.getUTCFullYear();
    const month = viewMonth.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => (index < firstDay ? null : index - firstDay + 1));
    const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(viewMonth);
    const dateForDay = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const selectedThisMonth = Array.from({ length: daysInMonth }, (_, index) => dateForDay(index + 1)).filter(isSelected).length;

    return (
        <div className="relative grid min-w-0 flex-1 gap-1.5">
            <label htmlFor={id} className="px-1 text-xs font-bold text-[#6d5735]">
                Notification calendar
            </label>
            <button
                id={id}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
                className="flex h-11 w-full items-center gap-2 rounded-xl border border-[#dfc58f] bg-white px-3 text-left text-sm font-semibold text-[#4b3820] shadow-sm transition hover:border-[#c98211] focus-visible:ring-2 focus-visible:ring-[#d78b13] focus-visible:outline-hidden"
            >
                <CalendarCheck2 className="size-4 shrink-0 text-[#b26a00]" />
                <span className="min-w-0 flex-1 truncate">Manage multiple dates</span>
                <span className="rounded-full bg-[#fff0c5] px-2 py-0.5 text-[10px] font-extrabold text-[#936000]">{selectedThisMonth}</span>
                <ChevronDown className={`size-4 text-[#a36a14] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    role="dialog"
                    aria-label="Multi-select notification calendar"
                    className="absolute top-[calc(100%+0.5rem)] right-0 z-[80] w-80 rounded-2xl border border-[#e5c978] bg-[#fffdf8] p-4 shadow-[0_20px_50px_rgba(85,53,10,0.24)]"
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
                            <p className="text-sm font-extrabold text-[#3d2b14]">{monthLabel}</p>
                            <p className="text-[10px] font-bold tracking-[0.13em] text-[#b26a00] uppercase">Select multiple workdays</p>
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

                    <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#fff3d3] px-3 py-2 text-[10px] font-bold text-[#765222]">
                        <span className="inline-flex items-center gap-1">
                            <span className="size-2 rounded-full bg-[#bd7200]" /> Scheduled
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="size-2 rounded-full border border-[#cfb98f] bg-white" /> Paused
                        </span>
                    </div>

                    <div className="mt-3 grid grid-cols-7 text-center text-[10px] font-bold tracking-wide text-[#9d6e28] uppercase">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                            <span key={day} className="py-1">
                                {day}
                            </span>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1 text-center">
                        {days.map((day, index) => {
                            if (!day) return <span key={`blank-${index}`} className="size-9" />;
                            const date = dateForDay(day);
                            const selected = isSelected(date);
                            const isToday = date === initialDate;

                            return (
                                <button
                                    key={date}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => onToggle(date)}
                                    className={`relative mx-auto grid size-9 place-items-center rounded-lg text-xs font-semibold transition ${
                                        selected
                                            ? 'bg-[#bd7200] text-white shadow-sm hover:bg-[#9f5e00]'
                                            : 'border border-transparent bg-white text-[#4b3820] hover:border-[#e6c982] hover:bg-[#fff0cb]'
                                    } ${isToday ? 'ring-2 ring-[#f0c55b] ring-offset-1' : ''}`}
                                >
                                    {day}
                                    {selected && <Check className="absolute right-0.5 bottom-0.5 size-2.5" strokeWidth={3} />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#f1e2c3] pt-3">
                        <button
                            type="button"
                            onClick={onReset}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9b691e] hover:text-[#714300]"
                        >
                            <RotateCcw className="size-3.5" /> Reset weekdays
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg bg-[#4a351d] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-[#2f2112]"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
