import type { ParsingOptions, WorkBook, WorkSheet } from 'xlsx';

export type SpreadsheetFileType = 'csv' | 'xls' | 'xlsx';

export const MAX_SPREADSHEET_FILE_BYTES = 12 * 1024 * 1024;

const zipSignatures = [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
    [0x50, 0x4b, 0x07, 0x08],
];
const oleSignature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function hasSignature(bytes: Uint8Array, signature: number[]): boolean {
    return signature.every((value, index) => bytes[index] === value);
}

function extensionOf(file: File): SpreadsheetFileType | null {
    const extension = file.name.split('.').pop()?.toLowerCase();

    return extension === 'xlsx' || extension === 'xls' || extension === 'csv' ? extension : null;
}

export async function assertSpreadsheetFile(
    file: File,
    allowedTypes: readonly SpreadsheetFileType[],
    maxBytes = MAX_SPREADSHEET_FILE_BYTES,
): Promise<SpreadsheetFileType> {
    const extension = extensionOf(file);

    if (!extension || !allowedTypes.includes(extension)) {
        throw new Error(`Choose a ${allowedTypes.map((type) => `.${type}`).join(', ')} file.`);
    }

    if (file.size === 0) {
        throw new Error(`${file.name} is empty.`);
    }

    if (file.size > maxBytes) {
        throw new Error(`${file.name} is larger than ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
    }

    const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());

    if (extension === 'xlsx' && !zipSignatures.some((signature) => hasSignature(bytes, signature))) {
        throw new Error(`${file.name} is not a valid .xlsx workbook.`);
    }

    if (extension === 'xls' && !hasSignature(bytes, oleSignature)) {
        throw new Error(`${file.name} is not a valid .xls workbook.`);
    }

    if (extension === 'csv') {
        const hasUtf16Bom = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff);

        if (!hasUtf16Bom && bytes.includes(0)) {
            throw new Error(`${file.name} does not contain valid CSV text.`);
        }
    }

    return extension;
}

export async function readSpreadsheet(
    file: File,
    allowedTypes: readonly SpreadsheetFileType[],
    maximumRows: number,
    options: ParsingOptions = {},
): Promise<WorkBook> {
    await assertSpreadsheetFile(file, allowedTypes);
    const SheetJS = await import('xlsx');

    return SheetJS.read(await file.arrayBuffer(), {
        ...options,
        type: 'array',
        sheets: 0,
        sheetRows: maximumRows + 2,
        cellFormula: false,
        cellHTML: false,
        cellStyles: false,
    });
}

export function assertWorksheetRowLimit(worksheet: WorkSheet, maximumRows: number, fileName: string): void {
    const reference = (worksheet as WorkSheet & { '!fullref'?: string })['!fullref'] ?? worksheet['!ref'];

    if (!reference) return;

    const [startReference, endReference = startReference] = reference.split(':');
    const startRow = Number(startReference.match(/\d+$/)?.[0] ?? 1);
    const endRow = Number(endReference.match(/\d+$/)?.[0] ?? startRow);
    const rows = endRow - startRow + 1;

    if (rows > maximumRows + 1) {
        throw new Error(`${fileName} contains more than ${maximumRows.toLocaleString()} data rows.`);
    }
}
