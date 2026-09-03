import { BeesMultiDateCalendar } from '@/components/bees-multi-date-calendar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from '@inertiajs/react';
import { Activity, Bell, BellRing, CheckCheck, Clock3, FileSpreadsheet, PackageCheck, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ReminderKind = 'queue' | 'platform' | 'report';
type ReminderSound = 'honey-bell' | 'gentle-chime' | 'priority-alert';

type ReportingReminder = {
    id: string;
    title: string;
    description: string;
    timeLabel: string;
    minutes: number;
    href: string;
    kind: ReminderKind;
};

const reportingReminders: ReportingReminder[] = [
    {
        id: 'queue-8am',
        title: '8:00 AM Queue Monitor',
        description: 'Upload the queue workbook for the first monitoring checkpoint.',
        timeLabel: '8:00 AM',
        minutes: 8 * 60,
        href: '/operations/queue-monitor?checkpoint=start',
        kind: 'queue',
    },
    {
        id: 'platform-10am',
        title: '10:00 AM Platform Pull',
        description: 'Review the Platform Pull generated from the saved report records.',
        timeLabel: '10:00 AM',
        minutes: 10 * 60,
        href: '/operations/reports/platform-pulls?checkpoint=10am',
        kind: 'platform',
    },
    {
        id: 'queue-11am',
        title: '11:00 AM Queue Monitor',
        description: 'Upload the queue workbook for the 11:00 AM checkpoint.',
        timeLabel: '11:00 AM',
        minutes: 11 * 60,
        href: '/operations/queue-monitor?checkpoint=11am',
        kind: 'queue',
    },
    {
        id: 'platform-12nn',
        title: '12:00 NN Platform Pull',
        description: 'Review the noon Platform Pull generated from saved report records.',
        timeLabel: '12:00 NN',
        minutes: 12 * 60,
        href: '/operations/reports/platform-pulls?checkpoint=12nn',
        kind: 'platform',
    },
    {
        id: 'report-midday',
        title: 'Mid-Day Report',
        description: 'Upload the Active or Closed Excel workbook for the Mid-Day Report.',
        timeLabel: '12:15 PM',
        minutes: 12 * 60 + 15,
        href: '/operations/reports?tab=import&type=midday',
        kind: 'report',
    },
    {
        id: 'queue-2pm',
        title: '2:00 PM Queue Monitor',
        description: 'Upload the queue workbook for the 2:00 PM checkpoint.',
        timeLabel: '2:00 PM',
        minutes: 14 * 60,
        href: '/operations/queue-monitor?checkpoint=2pm',
        kind: 'queue',
    },
    {
        id: 'platform-2pm',
        title: '2:00 PM Platform Pull',
        description: 'Review the 2:00 PM Platform Pull generated from saved report records.',
        timeLabel: '2:00 PM',
        minutes: 14 * 60,
        href: '/operations/reports/platform-pulls?checkpoint=2pm',
        kind: 'platform',
    },
    {
        id: 'queue-4pm',
        title: '4:00 PM Queue Monitor',
        description: 'Upload the queue workbook for the 4:00 PM checkpoint.',
        timeLabel: '4:00 PM',
        minutes: 16 * 60,
        href: '/operations/queue-monitor?checkpoint=4pm',
        kind: 'queue',
    },
    {
        id: 'platform-4pm',
        title: '4:00 PM Platform Pull',
        description: 'Review the 4:00 PM Platform Pull generated from saved report records.',
        timeLabel: '4:00 PM',
        minutes: 16 * 60,
        href: '/operations/reports/platform-pulls?checkpoint=4pm',
        kind: 'platform',
    },
    {
        id: 'platform-5pm',
        title: '5:00 PM Platform Pull',
        description: 'Review the final Platform Pull generated from saved report records.',
        timeLabel: '5:00 PM',
        minutes: 17 * 60,
        href: '/operations/reports/platform-pulls?checkpoint=5pm',
        kind: 'platform',
    },
    {
        id: 'report-eod',
        title: 'End-of-Day Report',
        description: 'Upload the final Active or Closed Excel workbook for the End-of-Day Report.',
        timeLabel: '5:00 PM',
        minutes: 17 * 60,
        href: '/operations/reports?tab=import&type=endOfDay',
        kind: 'report',
    },
];

const scheduleStorageKey = 'bees360-reporting-schedule-overrides';
const ringStorageKey = 'bees360-reporting-ring-enabled';
const soundStorageKey = 'bees360-reporting-ring-sound';
const reminderSounds: Array<{ id: ReminderSound; label: string }> = [
    { id: 'honey-bell', label: 'Honey Bell' },
    { id: 'gentle-chime', label: 'Gentle Chime' },
    { id: 'priority-alert', label: 'Priority Alert' },
];

function philippinesClock(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
    const hour = Number(value('hour'));
    const minute = Number(value('minute'));

    return {
        dateKey: `${value('year')}-${value('month')}-${value('day')}`,
        minutes: hour * 60 + minute,
        label: new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Manila',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date),
    };
}

function reminderIcon(kind: ReminderKind) {
    if (kind === 'queue') return Activity;
    if (kind === 'platform') return PackageCheck;

    return FileSpreadsheet;
}

function isWeekday(dateKey: string): boolean {
    const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();

    return day >= 1 && day <= 5;
}

function remindersEnabledFor(dateKey: string, overrides: Record<string, boolean>): boolean {
    return overrides[dateKey] ?? isWeekday(dateKey);
}

async function playReminderRing(sound: ReminderSound): Promise<boolean> {
    try {
        const audioContext = new AudioContext();
        await audioContext.resume();
        const start = audioContext.currentTime;
        const tones: Array<{ offset: number; frequency: number; endFrequency: number; duration: number; type: OscillatorType }> =
            sound === 'gentle-chime'
                ? [
                      { offset: 0, frequency: 620, endFrequency: 760, duration: 0.24, type: 'triangle' },
                      { offset: 0.2, frequency: 760, endFrequency: 940, duration: 0.28, type: 'triangle' },
                  ]
                : sound === 'priority-alert'
                  ? [
                        { offset: 0, frequency: 520, endFrequency: 520, duration: 0.16, type: 'square' },
                        { offset: 0.21, frequency: 700, endFrequency: 700, duration: 0.16, type: 'square' },
                        { offset: 0.42, frequency: 860, endFrequency: 860, duration: 0.2, type: 'square' },
                    ]
                  : [
                        { offset: 0, frequency: 880, endFrequency: 660, duration: 0.21, type: 'sine' },
                        { offset: 0.24, frequency: 880, endFrequency: 660, duration: 0.21, type: 'sine' },
                    ];

        tones.forEach(({ offset, frequency, endFrequency, duration, type }) => {
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, start + offset);
            oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + offset + Math.max(0.02, duration - 0.05));
            gain.gain.setValueAtTime(0.0001, start + offset);
            gain.gain.exponentialRampToValueAtTime(sound === 'priority-alert' ? 0.09 : 0.16, start + offset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.start(start + offset);
            oscillator.stop(start + offset + duration + 0.01);
        });

        window.setTimeout(() => void audioContext.close(), 700);

        return true;
    } catch {
        return false;
    }
}

export function ReportingReminderBell() {
    const [now, setNow] = useState(() => new Date());
    const [readIds, setReadIds] = useState<string[]>([]);
    const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, boolean>>({});
    const [ringEnabled, setRingEnabled] = useState(false);
    const [ringSound, setRingSound] = useState<ReminderSound>('honey-bell');
    const clock = philippinesClock(now);
    const storageKey = `bees360-reporting-reminders:${clock.dateKey}`;
    const todayIsScheduled = remindersEnabledFor(clock.dateKey, scheduleOverrides);
    const dueReminders = useMemo(
        () => (todayIsScheduled ? reportingReminders.filter((reminder) => reminder.minutes <= clock.minutes) : []),
        [clock.minutes, todayIsScheduled],
    );
    const unreadReminders = useMemo(() => dueReminders.filter((reminder) => !readIds.includes(reminder.id)), [dueReminders, readIds]);
    const nextReminder = todayIsScheduled ? reportingReminders.find((reminder) => reminder.minutes > clock.minutes) : undefined;

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60_000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(storageKey);
            setReadIds(stored ? (JSON.parse(stored) as string[]) : []);
        } catch {
            setReadIds([]);
        }
    }, [storageKey]);

    useEffect(() => {
        try {
            const storedSchedule = window.localStorage.getItem(scheduleStorageKey);
            setScheduleOverrides(storedSchedule ? (JSON.parse(storedSchedule) as Record<string, boolean>) : {});
            setRingEnabled(window.localStorage.getItem(ringStorageKey) === 'true');
            const storedSound = window.localStorage.getItem(soundStorageKey);
            if (reminderSounds.some((sound) => sound.id === storedSound)) setRingSound(storedSound as ReminderSound);
        } catch {
            setScheduleOverrides({});
            setRingEnabled(false);
            setRingSound('honey-bell');
        }
    }, []);

    useEffect(() => {
        if (!ringEnabled || !todayIsScheduled || unreadReminders.length === 0) return;

        const rungStorageKey = `bees360-reporting-rung:${clock.dateKey}`;
        let rungIds: string[] = [];
        try {
            const stored = window.localStorage.getItem(rungStorageKey);
            rungIds = stored ? (JSON.parse(stored) as string[]) : [];
        } catch {
            rungIds = [];
        }

        const newReminderIds = unreadReminders.map((reminder) => reminder.id).filter((id) => !rungIds.includes(id));
        if (newReminderIds.length === 0) return;

        void playReminderRing(ringSound).then((played) => {
            if (!played) return;
            try {
                window.localStorage.setItem(rungStorageKey, JSON.stringify([...new Set([...rungIds, ...newReminderIds])]));
            } catch {
                // The sound still plays when browser storage is unavailable.
            }
        });
    }, [clock.dateKey, ringEnabled, ringSound, todayIsScheduled, unreadReminders]);

    function saveReadIds(ids: string[]) {
        const uniqueIds = [...new Set(ids)];
        setReadIds(uniqueIds);
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(uniqueIds));
        } catch {
            // The visible state still works when browser storage is unavailable.
        }
    }

    function markAsRead(id: string) {
        saveReadIds([...readIds, id]);
    }

    function markAllAsRead() {
        saveReadIds([...readIds, ...dueReminders.map((reminder) => reminder.id)]);
    }

    function toggleScheduleDate(date: string) {
        const enabled = !remindersEnabledFor(date, scheduleOverrides);
        const defaultsToEnabled = isWeekday(date);
        const nextOverrides = { ...scheduleOverrides };

        if (enabled === defaultsToEnabled) delete nextOverrides[date];
        else nextOverrides[date] = enabled;

        setScheduleOverrides(nextOverrides);
        try {
            window.localStorage.setItem(scheduleStorageKey, JSON.stringify(nextOverrides));
        } catch {
            // The selection remains active for the current session.
        }
    }

    function resetSchedule() {
        setScheduleOverrides({});
        try {
            window.localStorage.removeItem(scheduleStorageKey);
        } catch {
            // The weekday schedule is still restored for the current session.
        }
    }

    function toggleRing() {
        const enabled = !ringEnabled;
        try {
            window.localStorage.setItem(ringStorageKey, String(enabled));
            if (enabled && unreadReminders.length > 0) {
                window.localStorage.setItem(
                    `bees360-reporting-rung:${clock.dateKey}`,
                    JSON.stringify(unreadReminders.map((reminder) => reminder.id)),
                );
            }
        } catch {
            // The ring preference remains active for the current session.
        }
        setRingEnabled(enabled);
        if (enabled) void playReminderRing(ringSound);
    }

    function selectSound(sound: ReminderSound) {
        setRingSound(sound);
        try {
            window.localStorage.setItem(soundStorageKey, sound);
        } catch {
            // The sound selection remains active for the current session.
        }
        void playReminderRing(sound);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${unreadReminders.length} pending reporting reminders`}
                    className="relative size-10 rounded-xl border border-[#ead7b9] bg-[#fffaf1] text-[#72502a] shadow-sm hover:bg-[#fff0ce] hover:text-[#4a351d]"
                >
                    {unreadReminders.length > 0 ? <BellRing className="size-5 animate-pulse text-[#b96c00]" /> : <Bell className="size-5" />}
                    {unreadReminders.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-[#c94b24] px-1 text-[10px] leading-none font-black text-white">
                            {unreadReminders.length > 9 ? '9+' : unreadReminders.length}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-[calc(100vw-2rem)] overflow-visible rounded-2xl border-[#e6d1ae] bg-[#fffdf8] p-0 shadow-[0_20px_60px_rgba(74,53,29,0.22)] sm:w-[410px]"
            >
                <div className="bg-[#4a351d] px-5 py-4 text-[#fff8e7]">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DropdownMenuLabel className="p-0 text-base font-black">Reporting reminders</DropdownMenuLabel>
                            <p className="mt-1 text-xs text-[#f2dca9]">{clock.label} PH Time · refreshes automatically</p>
                        </div>
                        {unreadReminders.length > 0 && (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#80613c] px-2.5 py-1.5 text-[11px] font-bold text-[#ffe7ad] transition hover:bg-[#604522]"
                            >
                                <CheckCheck className="size-3.5" /> Mark all done
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid gap-3 border-b border-[#eadfcf] bg-white px-4 py-4">
                    <BeesMultiDateCalendar
                        id="reporting-notification-dates"
                        initialDate={clock.dateKey}
                        isSelected={(date) => remindersEnabledFor(date, scheduleOverrides)}
                        onToggle={toggleScheduleDate}
                        onReset={resetSchedule}
                    />
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fff8e8] px-3 py-2.5">
                        <div className="min-w-0">
                            <p className="text-xs font-extrabold text-[#4a351d]">Multi-date weekday schedule</p>
                            <p className="mt-0.5 text-[11px] leading-4 text-[#806f59]">
                                Select several dates before pressing Done. Weekdays start scheduled automatically.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={toggleRing}
                            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-extrabold transition ${
                                ringEnabled
                                    ? 'bg-[#4a351d] text-white hover:bg-[#2f2112]'
                                    : 'border border-[#d9c7a9] bg-white text-[#705b3d] hover:bg-[#fff0d1]'
                            }`}
                        >
                            {ringEnabled ? <Volume2 className="size-4 text-[#f2cf72]" /> : <VolumeX className="size-4" />}
                            Ring {ringEnabled ? 'on' : 'off'}
                        </button>
                    </div>
                    <div className="grid gap-1.5">
                        <p className="px-1 text-xs font-bold text-[#6d5735]">Notification sound</p>
                        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-[#ead8b7] bg-[#fffaf1] p-1.5">
                            {reminderSounds.map((sound) => (
                                <button
                                    key={sound.id}
                                    type="button"
                                    onClick={() => selectSound(sound.id)}
                                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-extrabold transition ${
                                        ringSound === sound.id ? 'bg-[#4a351d] text-white shadow-sm' : 'bg-white text-[#725737] hover:bg-[#fff0cb]'
                                    }`}
                                >
                                    <Volume2 className={`size-3.5 ${ringSound === sound.id ? 'text-[#f2cf72]' : 'text-[#b96c00]'}`} />
                                    <span>{sound.label}</span>
                                </button>
                            ))}
                        </div>
                        <p className="px-1 text-[10px] text-[#8a7a62]">Select a sound to hear its preview.</p>
                    </div>
                </div>

                {unreadReminders.length > 0 ? (
                    <div className="max-h-[330px] overflow-y-auto p-2">
                        {[...unreadReminders].reverse().map((reminder) => {
                            const Icon = reminderIcon(reminder.kind);

                            return (
                                <div
                                    key={reminder.id}
                                    className="mb-1 flex items-center overflow-hidden rounded-xl border border-[#f0e2ca] bg-[#fff8e8] transition last:mb-0 hover:border-[#e2c58d]"
                                >
                                    <Link
                                        href={reminder.href}
                                        prefetch
                                        className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 outline-none hover:bg-[#fff4dc] focus-visible:bg-[#fff4dc]"
                                    >
                                        <span
                                            className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${
                                                reminder.kind === 'queue'
                                                    ? 'bg-[#e8f4e7] text-[#34743f]'
                                                    : reminder.kind === 'platform'
                                                      ? 'bg-[#fff0c9] text-[#a96300]'
                                                      : 'bg-[#f8e5d9] text-[#a94d20]'
                                            }`}
                                        >
                                            <Icon className="size-5" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-3">
                                                <span className="font-extrabold text-[#3d2c19]">{reminder.title}</span>
                                                <span className="size-2 shrink-0 rounded-full bg-[#c36f00]" />
                                            </span>
                                            <span className="mt-1 block text-xs leading-5 text-[#78684f]">{reminder.description}</span>
                                            <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#a26000]">
                                                <Clock3 className="size-3" /> Due {reminder.timeLabel} PH
                                            </span>
                                        </span>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => markAsRead(reminder.id)}
                                        title={`Mark ${reminder.title} as done`}
                                        className="mr-2 inline-flex shrink-0 flex-col items-center gap-1 rounded-lg border border-[#b9dfbd] bg-[#edfaeb] px-2 py-2 text-[10px] font-extrabold text-[#28703c] transition hover:bg-[#d9f1d9]"
                                    >
                                        <CheckCheck className="size-4" />
                                        Done
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center px-6 py-9 text-center">
                        <div className="grid size-12 place-items-center rounded-2xl bg-[#fff1cc] text-[#a96300]">
                            <Bell className="size-6" />
                        </div>
                        <p className="mt-3 font-extrabold text-[#3d2c19]">
                            {dueReminders.length > 0 ? 'All due reminders are done' : 'No reminders are due yet'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#806f59]">
                            {!todayIsScheduled
                                ? 'Reporting alerts are paused for today. Enable this date in the notification calendar if the team is working.'
                                : dueReminders.length > 0
                                  ? nextReminder
                                      ? `Completed reminders are removed. Next: ${nextReminder.title} at ${nextReminder.timeLabel} PH Time.`
                                      : 'Completed reminders are removed for today. There are no more scheduled checkpoints.'
                                  : nextReminder
                                    ? `Next: ${nextReminder.title} at ${nextReminder.timeLabel} PH Time.`
                                    : 'All reporting checkpoints are complete for today.'}
                        </p>
                    </div>
                )}

                <DropdownMenuSeparator className="m-0 bg-[#eadfcf]" />
                <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 text-[11px] text-[#806f59]">
                    <span>Reports, Platform Pulls, and Queue Monitor only.</span>
                    <span className="font-bold text-[#94600b]">{unreadReminders.length} pending</span>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
