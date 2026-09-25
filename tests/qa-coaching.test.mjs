import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeQaCoaching } from '../resources/js/lib/qa-coaching.ts';

const row = (id, processor, score, feedback) => ({ id, processor, score, feedback, date: '2026-09-24', projectId: `REPORT-${id}` });

test('recurring feedback is counted across assessments and stays with its processor', () => {
    const result = analyzeQaCoaching([
        row(1, 'Alice', 88, ['Missing roof photo', 'Missing roof photo']),
        row(2, 'Alice', 87, ['missing ROOF photo.']),
        row(3, 'Bob', 100, ['No errors found.']),
    ]);
    assert.equal(result[0].processor, 'Alice');
    assert.equal(result[0].status, 'Needs improvement');
    assert.equal(result[0].repeated, 1);
    assert.deepEqual(result[0].themes[0].assessments.map(item => item.id), [2, 1]);
    assert.equal(result[0].themes[0].tips.length, 3);
    assert.equal(result[1].status, '100% accuracy');
    assert.equal(result[1].canAnalyze, false);
    assert.equal(result[1].themes.length, 0);
});

test('red scores retain higher priority while green scores can also be analyzed', () => {
    const result = analyzeQaCoaching([row(1, 'Low', 89, []), row(2, 'Boundary', 89.01, [])]);
    assert.equal(result[0].priority, 2);
    assert.equal(result[0].themes.length, 0);
    assert.equal(result[1].priority, 1);
    assert.equal(result[1].canAnalyze, true);
});

test('red feedback with an unknown topic gets a QA clarification tip', () => {
    const [result] = analyzeQaCoaching([row(1, 'Alice', 85, ['Confirm coverage exception', 'Confirm coverage exception'])]);
    assert.equal(result.canAnalyze, true);
    assert.equal(result.repeated, 0);
    assert.match(result.themes[0].tips[0], /confirm the expected correction/);
});

test('a mixed no-error note is preserved and empty input has no invented assessments', () => {
    assert.deepEqual(analyzeQaCoaching([]), []);
    const [result] = analyzeQaCoaching([row(1, 'Alice', 80, ['No errors in address, but roof photo missing', ' ', 'N/A'])]);
    assert.equal(result.themes.length, 1);
    assert.equal(result.assessments[0].feedback.length, 3);
});

test('green assessments below 100 include improvement feedback', () => {
    const [result] = analyzeQaCoaching([row(1, 'Alice', 90, ['Missing photo']), row(2, 'Alice', 95, ['Missing photo'])]);
    assert.equal(result.canAnalyze, true);
    assert.equal(result.status, 'Opportunity to improve');
    assert.equal(result.themes.length, 1);
});

test('one red score enables Analyze even with a green average and focuses on red feedback', () => {
    const [result] = analyzeQaCoaching([row(1, 'Alice', 89, ['Missing photo']), row(2, 'Alice', 100, ['Check address'])]);
    assert.equal(result.average, 94.5);
    assert.equal(result.canAnalyze, true);
    assert.equal(result.themes.length, 1);
    assert.equal(result.themes[0].feedback, 'Missing photo');
    assert.match(result.summary, /Alice has 1 QA assessment\(s\) below 100/);
});

test('99.99 qualifies but 100 never enables Analyze even with feedback', () => {
    const result = analyzeQaCoaching([row(1, 'Almost', 99.99, ['Missing photo']), row(2, 'Perfect', 100, ['Check address'])]);
    assert.equal(result[0].canAnalyze, true);
    assert.equal(result[1].canAnalyze, false);
    assert.equal(result[1].improvementAssessments.length, 0);
    assert.equal(result[1].themes.length, 0);
});

test('red assessments and their feedback precede frequent green feedback, lowest score first', () => {
    const records = [row(1, 'Alice', 98, ['Spelling']), row(2, 'Alice', 97, ['Spelling']), row(3, 'Alice', 89, ['Missing photo']), row(4, 'Alice', 66, ['Wrong address'])];
    const [result] = analyzeQaCoaching(records);
    assert.deepEqual(result.redAssessments.map(item => item.score), [66, 89]);
    assert.deepEqual(result.improvementAssessments.map(item => item.score), [66, 89, 97, 98]);
    assert.deepEqual(result.themes.map(item => item.feedback), ['Wrong address', 'Missing photo', 'Spelling']);
    assert.equal(result.themes[0].redCount, 1);
    assert.match(result.summary, /Prioritize 2 red assessment\(s\), starting with 66%/);
    assert.deepEqual(records.map(item => item.score), [98, 97, 89, 66]);
});
