import type { WorkBook } from 'xlsx-js-style';

export async function appendSavedQueue(
    workbook: WorkBook,
    start: string,
    end: string,
    processor?: string,
    savedRows?: SavedQueueRow[],
): Promise<boolean> {
    try {
        const rows = savedRows ?? (await loadSavedQueue(start, end, processor));
        const XLSX = await import('xlsx-js-style');
        const sheet = XLSX.utils.aoa_to_sheet([
            ['SAVED QUEUE MONITOR · Philippine reporting dates'],
            ['Queue counts are checkpoint snapshots; do not add checkpoints together as completed reports.'],
            ['Date', 'Checkpoint', 'Processor', 'Batch', 'General Exterior', '4-Point', 'Premium 4-Point', 'Other', 'Pending Total', 'Source File'],
            ...rows.map((row) => [
                row.date.slice(0, 10),
                row.checkpoint,
                row.processor,
                row.batch,
                row.general_exterior,
                row.four_point,
                row.premium_four_point,
                row.other,
                row.total,
                row.file,
            ]),
            ...(rows.length ? [] : [['No saved queue records for this selection.']]),
        ]);
        sheet['!cols'] = [14, 14, 30, 10, 20, 14, 20, 12, 18, 40].map((wch) => ({ wch }));
        XLSX.utils.book_append_sheet(workbook, sheet, 'Saved Queue Monitor');
        return true;
    } catch (error) {
        window.alert(error instanceof Error ? error.message : 'Export could not load saved queue data. Please try again.');
        return false;
    }
}

export type SavedQueueRow = {
    date: string;
    checkpoint: string;
    processor: string;
    batch: number;
    general_exterior: number;
    four_point: number;
    premium_four_point: number;
    other: number;
    total: number;
    file: string;
};

export async function loadSavedQueue(start: string, end: string, processor?: string): Promise<SavedQueueRow[]> {
    const params = new URLSearchParams({ start, end });
    if (processor) params.set('processor', processor);
    const response = await fetch('/reports/saved-queue?' + params, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('Saved queue data could not be loaded. Please try exporting again.');
    return (await response.json()).rows;
}

export function pendingQueueCounts(rows: SavedQueueRow[], midday: boolean): Map<string, number> {
    const rank: Record<string, number> = { start: 0, '11am': 1, '2pm': 2, '4pm': 3 };
    const eligible = rows.filter((row) => rank[row.checkpoint] !== undefined && rank[row.checkpoint] <= (midday ? 1 : 3));
    const latest = Math.max(-1, ...eligible.map((row) => rank[row.checkpoint]));
    return new Map(eligible.filter((row) => rank[row.checkpoint] === latest).map((row) => [row.processor, row.total]));
}
