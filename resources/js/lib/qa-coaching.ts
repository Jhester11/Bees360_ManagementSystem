export type CoachingAssessment = {
    id: number;
    processor: string;
    date: string;
    projectId: string | null;
    score: number;
    feedback: string[];
};

const normalize = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
const noIssue = /^(no errors?|no issues?|no feedback|none|n a|passed|all correct)( found| noted| recorded| identified)?$/;

export function coachingTips(feedback: string): string[] {
    const text = normalize(feedback);
    const tips: string[] = [];
    if (/\b(photo|photos|image|images|picture|pictures)\b/.test(text))
        tips.push('Compare each required photo with the report section; confirm it is clear, correctly labeled, and shows the relevant detail.');
    if (/\b(roof|roofing|shingle|shingles)\b/.test(text))
        tips.push('Recheck the roof observations against the available photos and source notes before recording the condition or material.');
    if (/\b(address|name|insured|policy|project)\b/.test(text))
        tips.push('Match identifying details against the source record, including spelling, address, and project or policy number.');
    if (/\b(missing|incomplete|blank|omitted)\b/.test(text))
        tips.push('Use the required-field checklist before submission; resolve missing information or flag it to QA instead of guessing.');
    if (/\b(wrong|incorrect|mismatch|inconsistent|discrepancy)\b/.test(text))
        tips.push('Compare the flagged value with its source and related report sections, then resolve any conflicting entries.');
    if (/\b(typo|spelling|grammar|format|formatting)\b/.test(text))
        tips.push('Proofread the affected section and compare its wording and formatting with the approved report template.');
    if (/\b(electrical|plumbing|hvac|heating|panel)\b/.test(text))
        tips.push('Verify the system details against supporting photos and notes; ask QA to clarify any unsupported condition or specification.');
    return tips.length
        ? tips
        : ['Review the quoted feedback with QA, confirm the expected correction, and add that check to the next report’s pre-submission review.'];
}

export function analyzeQaCoaching(rows: CoachingAssessment[]) {
    const grouped = new Map<string, CoachingAssessment[]>();
    for (const row of rows) grouped.set(row.processor, [...(grouped.get(row.processor) ?? []), row]);
    return Array.from(grouped, ([processor, assessments]) => {
        const improvementAssessments = assessments
            .filter((assessment) => assessment.score < 100)
            .sort((a, b) => a.score - b.score || b.date.localeCompare(a.date) || b.id - a.id);
        const redAssessments = improvementAssessments.filter((assessment) => assessment.score <= 89);
        const canAnalyze = improvementAssessments.length > 0;
        const issues = new Map<string, { feedback: string; assessments: CoachingAssessment[]; tips: string[] }>();
        for (const assessment of improvementAssessments) {
            const seen = new Set<string>();
            for (const value of assessment.feedback) {
                const feedback = value.trim();
                const key = normalize(feedback);
                if (!key || noIssue.test(key) || seen.has(key)) continue;
                seen.add(key);
                const issue = issues.get(key) ?? { feedback, assessments: [], tips: coachingTips(feedback) };
                issue.assessments.push(assessment);
                issues.set(key, issue);
            }
        }
        const average = assessments.reduce((total, row) => total + row.score, 0) / assessments.length;
        const themes = [...issues.values()]
            .map((issue) => ({
                ...issue,
                lowestScore: issue.assessments[0].score,
                redCount: issue.assessments.filter((assessment) => assessment.score <= 89).length,
            }))
            .sort(
                (a, b) =>
                    Number(b.redCount > 0) - Number(a.redCount > 0) ||
                    a.lowestScore - b.lowestScore ||
                    b.assessments.length - a.assessments.length ||
                    a.feedback.localeCompare(b.feedback),
            );
        const repeated = themes.filter((issue) => issue.assessments.length > 1).length;
        const priority = redAssessments.length > 0 ? 2 : canAnalyze ? 1 : 0;
        const status = priority === 2 ? 'Needs improvement' : canAnalyze ? 'Opportunity to improve' : '100% accuracy';
        return {
            processor,
            assessments,
            redAssessments,
            improvementAssessments,
            canAnalyze,
            average,
            themes,
            repeated,
            priority,
            status,
            summary: canAnalyze
                ? `${processor} has ${improvementAssessments.length} QA assessment(s) below 100%. ${redAssessments.length ? `Prioritize ${redAssessments.length} red assessment(s), starting with ${redAssessments[0].score}%. ` : ''}${
                      themes.length
                          ? `Focus on correcting: ${themes
                                .slice(0, 3)
                                .map((theme) => theme.feedback)
                                .join('; ')}.`
                          : 'No specific improvement topic is recorded; review the affected reports to identify what needs correction.'
                  }`
                : 'This processor has 100% accuracy on every assessment in the selected period.',
        };
    }).sort((a, b) => b.priority - a.priority || b.repeated - a.repeated || a.average - b.average || a.processor.localeCompare(b.processor));
}
