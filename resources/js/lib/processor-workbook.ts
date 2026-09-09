import { assertWorksheetRowLimit, readSpreadsheet } from '@/lib/spreadsheet-upload';

export type CstImportMetric = {
    report_date: string;
    processor_name: string;
    general_exterior: number;
    four_point: number;
    qc_score: number | null;
    qc_reviews: number;
};

export type QaImportAssessment = {
    assessment_date: string;
    processor_name: string;
    score: number;
    project_id: string;
    qc_name: string;
    report_url: string;
    feedback: string[];
};

const maximumCstSourceRows = 50_000;
const maximumCstMetrics = 5_000;
const maximumQaWorksheetRows = 10_050;
const maximumQaAssessments = 10_000;
const qaScoreAliases = ['totalscore', 'qcscore', 'qascore', 'accuracyscore', 'accuracy', 'qualityscore', 'score'];
const qaDateAliases = ['submissiondate', 'subdate', 'approvaldate', 'assessmentdate', 'reportdate', 'qadate', 'date', 'qcscorereleasedate'];
const qaProcessorAliases = ['processor', 'processorname', 'name', 'nname', 'nickname'];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const valueFor = (row: Record<string, unknown>, aliases: string[]) => {
    const key = Object.keys(row).find((candidate) => aliases.includes(normalize(candidate)));

    return key ? row[key] : undefined;
};
const integer = (value: unknown) => Math.max(0, Math.round(Number(String(value ?? 0).replace(/,/g, '')) || 0));
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateValue = (value: unknown) => {
    if (value instanceof Date && !Number.isNaN(value.valueOf())) return localDate(value);
    const raw = String(value ?? '').trim();
    const isoDate = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\D|$)/);
    if (isoDate) return `${isoDate[1]}-${isoDate[2].padStart(2, '0')}-${isoDate[3].padStart(2, '0')}`;
    const usDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D|$)/);
    if (usDate) return `${usDate[3]}-${usDate[1].padStart(2, '0')}-${usDate[2].padStart(2, '0')}`;
    const parsed = new Date(raw);

    return Number.isNaN(parsed.valueOf()) ? '' : localDate(parsed);
};
const webUrlValue = (value: unknown) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    try {
        const url = new URL(raw);

        return url.protocol === 'http:' || url.protocol === 'https:' ? raw : '';
    } catch {
        return '';
    }
};

export async function cstMetricsFromWorkbook(file: File): Promise<CstImportMetric[]> {
    const SheetJS = await import('xlsx');
    const workbook = await readSpreadsheet(file, ['xlsx', 'xls'], maximumCstSourceRows, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('The workbook does not contain a worksheet.');
    assertWorksheetRowLimit(sheet, maximumCstSourceRows, file.name);
    const rows = SheetJS.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (rows.length === 0) throw new Error('The worksheet does not contain data.');

    const grouped = new Map<string, { date: string; name: string; ge: number; fp: number; score: number; reviews: number }>();
    rows.forEach((row) => {
        const processor = String(valueFor(row, ['processor', 'processorname', 'name', 'nname', 'firstassembledby', 'assembledby']) ?? '').trim();
        if (!processor) return;
        const date = dateValue(valueFor(row, ['reportdate', 'date', 'assembleddate', 'firstassembledtime']));
        if (!date) return;
        const key = `${date}|${normalize(processor)}`;
        const current = grouped.get(key) ?? { date, name: processor, ge: 0, fp: 0, score: 0, reviews: 0 };
        const generalExterior = valueFor(row, ['generalexterior', 'genexterior', 'genext', 'ge']);
        const fourPoint = valueFor(row, ['4point', 'fourpoint', 'gen4point', 'fp']);

        if (generalExterior !== undefined || fourPoint !== undefined) {
            current.ge += integer(generalExterior);
            current.fp += integer(fourPoint);
        } else {
            const inspection = String(valueFor(row, ['inspectiontype', 'reporttype', 'type']) ?? '').toLowerCase();
            if (inspection.includes('exterior')) current.ge += 1;
            if (inspection.includes('4-point') || inspection.includes('4 point') || inspection.includes('four point')) current.fp += 1;
        }

        const rawScore = valueFor(row, ['qcscore', 'accuracyscore', 'accuracy', 'qualityscore', 'score']);
        if (rawScore !== undefined && String(rawScore).trim() !== '') {
            let score = Number(String(rawScore).replace('%', '').trim());
            if (Number.isFinite(score)) {
                if (score <= 1) score *= 100;
                current.score += Math.min(Math.max(score, 0), 100);
                current.reviews += 1;
            }
        }
        grouped.set(key, current);
    });

    const metrics = [...grouped.values()].map((row) => ({
        report_date: row.date,
        processor_name: row.name,
        general_exterior: row.ge,
        four_point: row.fp,
        qc_score: row.reviews ? Number((row.score / row.reviews).toFixed(2)) : null,
        qc_reviews: row.reviews,
    }));

    if (metrics.length === 0) throw new Error('No dated processor rows were found in the workbook.');
    if (metrics.length > maximumCstMetrics) throw new Error(`The CST import cannot contain more than ${maximumCstMetrics.toLocaleString()} metrics.`);

    return metrics;
}

export function combineCstMetrics(groups: CstImportMetric[][]): CstImportMetric[] {
    const combined = new Map<string, CstImportMetric>();
    groups.flat().forEach((metric) => {
        const key = `${metric.report_date}|${normalize(metric.processor_name)}`;
        const current = combined.get(key) ?? { ...metric, general_exterior: 0, four_point: 0, qc_score: null, qc_reviews: 0 };
        const reviews = current.qc_reviews + metric.qc_reviews;
        const weightedScore = (current.qc_score ?? 0) * current.qc_reviews + (metric.qc_score ?? 0) * metric.qc_reviews;
        combined.set(key, {
            ...current,
            general_exterior: current.general_exterior + metric.general_exterior,
            four_point: current.four_point + metric.four_point,
            qc_score: reviews > 0 ? Number((weightedScore / reviews).toFixed(2)) : null,
            qc_reviews: reviews,
        });
    });

    return [...combined.values()];
}

export async function qaAssessmentsFromWorkbook(file: File): Promise<QaImportAssessment[]> {
    const SheetJS = await import('xlsx');
    const workbook = await readSpreadsheet(file, ['xlsx', 'xls', 'csv'], maximumQaWorksheetRows, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('The QA workbook does not contain a worksheet.');
    assertWorksheetRowLimit(sheet, maximumQaWorksheetRows, file.name);
    const rawRows = SheetJS.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    const headerIndex = rawRows.findIndex((row) => {
        const normalizedHeaders = row.map((cell) => normalize(String(cell)));

        return (
            normalizedHeaders.some((header) => qaScoreAliases.includes(header)) &&
            normalizedHeaders.some((header) => qaProcessorAliases.includes(header)) &&
            normalizedHeaders.includes('projectid')
        );
    });
    if (headerIndex < 0) throw new Error('The QA file must contain a QC Score or Total Score column, Processor Name, and Project ID.');
    const headers = rawRows[headerIndex].map(String);
    const rows = rawRows.slice(headerIndex + 1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
    const assessments = rows.flatMap((row): QaImportAssessment[] => {
        const processorName = String(valueFor(row, qaProcessorAliases) ?? '').trim();
        const scoreValue = valueFor(row, qaScoreAliases);
        if (!processorName || scoreValue === undefined || String(scoreValue).trim() === '') return [];
        let score = Number(String(scoreValue).replace('%', '').trim());
        if (!Number.isFinite(score)) return [];
        if (score <= 1) score *= 100;
        const assessmentDate = dateValue(valueFor(row, qaDateAliases));
        const projectId = String(valueFor(row, ['projectid']) ?? '').trim();
        if (!assessmentDate || !projectId || score < 0 || score > 100) return [];

        return [
            {
                assessment_date: assessmentDate,
                processor_name: processorName,
                score: Number(score.toFixed(2)),
                project_id: projectId,
                qc_name: String(valueFor(row, ['qcname', 'reviewer']) ?? '').trim(),
                report_url: webUrlValue(valueFor(row, ['reporturl', 'url'])),
                feedback: Object.entries(row)
                    .filter(([header, value]) => /^error\d*$/.test(normalize(header)) && String(value).trim() !== '')
                    .map(([, value]) => String(value).trim()),
            },
        ];
    });

    if (assessments.length === 0)
        throw new Error(
            'No valid QA assessment rows were found. Check QC Score or Total Score, Approval or Submission Date, Project ID, and Processor Name.',
        );
    if (assessments.length > maximumQaAssessments)
        throw new Error(`The QA import cannot contain more than ${maximumQaAssessments.toLocaleString()} assessments.`);

    return assessments;
}
