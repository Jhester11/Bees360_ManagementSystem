import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { analyzeQaCoaching, type CoachingAssessment } from '@/lib/qa-coaching';
import { useMemo } from 'react';

export function QaCoaching({
    rows,
    startDate,
    endDate,
    selected,
    onSelect,
}: {
    rows: CoachingAssessment[];
    startDate: string;
    endDate: string;
    selected: string | null;
    onSelect: (processor: string | null) => void;
}) {
    const analyses = useMemo(() => analyzeQaCoaching(rows), [rows]);
    const analysis = analyses.find((item) => item.processor === selected && item.canAnalyze);
    return (
        <section className="rounded-2xl border border-[#e6c783] bg-[#fffdf8] p-5 text-[#342615]">
            <h2 className="text-lg font-extrabold">Processor coaching analysis</h2>
            <p className="mt-1 text-sm text-[#776a57]">
                {startDate} to {endDate} · Philippine reporting dates. Analyze a processor to review feedback and coaching reminders.
            </p>
            <p className="mt-2 text-xs text-[#776a57]">
                Analyze is available for scores below 100%, including green scores. Processors with 100% on every assessment have no Analyze button.
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {analyses.map((item) => (
                    <article
                        key={item.processor}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadbc6] bg-white p-4"
                    >
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold break-words">{item.processor}</h3>
                            <p className={`mt-1 text-sm font-semibold ${item.priority === 2 ? 'text-[#a04435]' : 'text-[#80602b]'}`}>{item.status}</p>
                            <p className="mt-1 text-xs text-[#776a57]">
                                {item.average.toFixed(2)}% average · {item.redAssessments.length} red assessments · Lowest score:{' '}
                                {Math.min(...item.assessments.map((row) => row.score))}%
                            </p>
                        </div>
                        {item.canAnalyze && (
                            <Button
                                onClick={() => onSelect(item.processor)}
                                aria-label={`Analyze ${item.processor}`}
                                className="bg-[#c97900] text-white hover:bg-[#a96000]"
                            >
                                Analyze
                            </Button>
                        )}
                    </article>
                ))}
                {!analyses.length && <p className="py-4 text-sm text-[#776a57]">No QA assessments to analyze for the applied filters.</p>}
            </div>
            <Dialog open={Boolean(analysis)} onOpenChange={(open) => !open && onSelect(null)}>
                <DialogContent className="max-h-[85vh] overflow-y-auto border-[#e6c783] bg-[#fffdf8] text-[#342615] sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Processor improvement · {analysis?.processor}</DialogTitle>
                        <DialogDescription>
                            {startDate} to {endDate} · {analysis?.assessments.length} assessments · {analysis?.average.toFixed(2)}% average accuracy
                        </DialogDescription>
                    </DialogHeader>
                    {analysis && (
                        <>
                            {analysis.redAssessments.length > 0 && (
                                <section className="rounded-xl border border-[#e8b6ad] bg-[#fff1ee] p-4">
                                    <h3 className="font-bold text-[#a04435]">
                                        Priority: red accuracy · {analysis.redAssessments.length} assessments
                                    </h3>
                                    <p className="mt-1 text-sm text-[#a04435]">
                                        Address these first, starting with the lowest score. Red means 89% or below.
                                    </p>
                                    <div className="mt-3 grid gap-3">
                                        {analysis.redAssessments.map((row) => (
                                            <article key={row.id} className="rounded-lg border border-[#e8b6ad] bg-white p-3">
                                                <p className="font-bold text-[#a04435]">
                                                    {row.score}% · Project {row.projectId || '—'}
                                                </p>
                                                <p className="mt-1 text-xs text-[#776a57]">{row.date}</p>
                                                {row.feedback.length ? (
                                                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                                                        {row.feedback.map((feedback, index) => (
                                                            <li key={index} className="whitespace-pre-wrap">
                                                                {feedback}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="mt-2 text-sm">
                                                        No feedback recorded. Review this report with QA to identify the correction.
                                                    </p>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            )}
                            <div className="rounded-xl bg-[#fff1cc] p-4">
                                <h3 className="font-bold">{analysis.status}</h3>
                                <p className="mt-2 text-sm">{analysis.summary}</p>
                                <p className="mt-2 text-xs">
                                    Tips are checklist suggestions based on feedback keywords. Confirm the applicable procedure with QA.
                                </p>
                            </div>
                            <div className="rounded-xl border border-[#eadbc6] p-4">
                                <h3 className="font-bold">What needs to improve</h3>
                                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                                    <li>
                                        {analysis.redAssessments.length
                                            ? 'Address the red assessments above first, starting with the lowest accuracy, then review the remaining improvement opportunities.'
                                            : analysis.repeated
                                              ? 'Correct the recurring issues below and recheck the affected report sections before submission.'
                                              : 'Use the feedback from assessments below 100% to identify opportunities to improve your reports.'}
                                    </li>
                                    <li>Apply the prevention tips below as a checklist before submitting your next report.</li>
                                    <li>Check your next QA result to confirm these issues have been resolved.</li>
                                </ul>
                            </div>
                            <h3 className="font-bold">Processor feedback and prevention tips · red scores first</h3>
                            {analysis.themes.map((theme) => (
                                <article key={theme.feedback} className="rounded-xl border border-[#eadbc6] bg-white p-4">
                                    {theme.redCount > 0 && (
                                        <p className="mb-2 text-xs font-bold text-[#a04435]">
                                            Priority · {theme.redCount} red assessment(s) · Lowest accuracy {theme.lowestScore}%
                                        </p>
                                    )}
                                    <p className="text-xs font-bold text-[#a96300]">Recorded on {theme.assessments.length} assessment(s)</p>
                                    <p className="mt-2 text-sm font-semibold whitespace-pre-wrap">{theme.feedback}</p>
                                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#594a37]">
                                        {theme.tips.map((tip) => (
                                            <li key={tip}>{tip}</li>
                                        ))}
                                    </ul>
                                    <details className="mt-3 text-sm">
                                        <summary className="cursor-pointer font-semibold text-[#147a51]">Supporting assessments</summary>
                                        <ul className="mt-2 space-y-1">
                                            {theme.assessments.map((row) => (
                                                <li key={row.id}>
                                                    {row.date} · Project {row.projectId || '—'} · {row.score}%
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                </article>
                            ))}
                            {!analysis.themes.length && (
                                <p className="text-sm text-[#776a57]">
                                    No actionable feedback text was recorded.{' '}
                                    {analysis.canAnalyze
                                        ? 'Review the assessments below 100% with QA to identify the improvement topic.'
                                        : 'Continue routine QA checks.'}
                                </p>
                            )}
                            <details className="rounded-xl border border-[#eadbc6] p-4 text-sm">
                                <summary className="cursor-pointer font-bold">
                                    Original feedback from assessments below 100% ({analysis.improvementAssessments.length})
                                </summary>
                                <div className="mt-3 grid gap-3">
                                    {analysis.improvementAssessments.map((row) => (
                                        <div key={row.id} className="border-t border-[#eadbc6] pt-3">
                                            <p className="font-semibold">
                                                {row.date} · Project {row.projectId || '—'} · {row.score}%
                                            </p>
                                            {row.feedback.length ? (
                                                <ul className="mt-2 list-disc pl-5">
                                                    {row.feedback.map((text, index) => (
                                                        <li key={index} className="whitespace-pre-wrap">
                                                            {text}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="mt-2">No feedback recorded.</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
}
