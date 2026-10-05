import { S } from '../content/strings';
import { READING } from '../content/reading';
import { MILESTONES } from '../content/milestones';
import { HUMAN_CONTACT, lintEntries, lintText } from './copyLint';
import { TEMPLATES as RAW, type InsightTemplate } from './templates';

const TEMPLATES: Record<string, InsightTemplate> = RAW;

/**
 * PRD 11.4 "Automated check". This file runs inside `npm run build`.
 * A failure here prints the offending id, text and rule.
 */

const fail = (problems: { id: string; text: string; problem: string }[]) =>
  problems.map((p) => `${p.id}: ${p.problem}\n    "${p.text}"`).join('\n');

describe('copy lint: every template and string passes 11.4', () => {
  it('insight templates', () => {
    const entries = Object.fromEntries(
      Object.entries(TEMPLATES).flatMap(([k, t]) => [
        [`${k}.headline`, t.headline],
        ...(t.body ? [[`${k}.body`, t.body]] : []),
        ...t.actions.map((a, i) => [`${k}.action${i}`, a]),
      ]),
    );
    const problems = lintEntries(entries);
    expect(problems, fail(problems)).toEqual([]);
  });

  it('UI strings', () => {
    const problems = lintEntries(S);
    expect(problems, fail(problems)).toEqual([]);
  });

  it('reading cards and milestone content', () => {
    const entries = Object.fromEntries([
      ...READING.flatMap((r) => [[`reading.${r.id}.headline`, r.headline], [`reading.${r.id}.body`, r.body]]),
      ...MILESTONES.map((m) => [`milestone.${m.id}`, m.title]),
    ]);
    const problems = lintEntries(entries);
    expect(problems, fail(problems)).toEqual([]);
  });

  it('every escalation names a human, not the app (11.4)', () => {
    for (const [k, t] of Object.entries(TEMPLATES)) {
      if (t.severity !== 'escalate') continue;
      const text = [t.headline.text, t.body?.text, ...t.actions.map((a) => a.text)].join(' ');
      expect(HUMAN_CONTACT.test(text), `${k} has no provider or emergency contact`).toBe(true);
    }
  });

  it('every escalation is flagged for clinical review (11.3)', () => {
    for (const [k, t] of Object.entries(TEMPLATES)) {
      if (t.severity !== 'escalate') continue;
      expect(t.headline.review?.kind ?? t.body?.review?.kind, `${k} is missing a clinical review flag`).toBe('clinical');
    }
  });
});

describe('copy lint catches what it should (the lint is real, not decorative)', () => {
  it.each([
    ['You should drink more water.', 'should'],
    ['That is completely normal.', 'normal'],
    ['Abnormal pattern.', 'abnormal'],
    ['You need to rest.', 'need to'],
    ['All fine today.', 'fine'],
    ['Great job on your water!', 'great job'],
    ['Five-day streak.', 'streak'],
    ['Slower than most babies.', 'most babies'],
    ['You are dehydrated.', 'you are dehydrated'],
    ['You MUST call.', 'must'],
    ['It’s not dangerous.', 'dangerous'],
  ])('flags "%s"', (text, phrase) => {
    expect(lintText('t', text, 'body').map((p) => p.problem)).toContain(`uses banned phrase "${phrase}"`);
  });

  it('flags emoji, including ones joined with variation selectors', () => {
    expect(lintText('t', 'Time for water 💧', 'body')).toHaveLength(1);
    expect(lintText('t', 'Heart ❤️', 'body').length).toBeGreaterThan(0);
    expect(lintText('t', 'Flag 🇮🇳', 'body').length).toBeGreaterThan(0);
  });

  it('matches whole words only', () => {
    expect(lintText('t', 'Define the window. Refine later. Mustard seeds. Scoreboard.', 'body')).toEqual([]);
  });

  it('spells out numbers below ten in headlines, but keeps times and dates', () => {
    expect(lintText('t', '3 feeds logged.', 'headline')[0]?.problem).toMatch(/numeral "3"/);
    expect(lintText('t', 'Three feeds logged since 5am, and no water yet today.', 'headline')).toEqual([]);
    expect(lintText('t', 'The tin opened on 2 September has passed its discard date.', 'headline')).toEqual([]);
    expect(lintText('t', 'Fed at 10:15 AM.', 'headline')).toEqual([]);
    expect(lintText('t', 'Logged 3 feeds.', 'label')).toEqual([]); // labels may use numerals
  });

  it('caps headlines at two sentences', () => {
    expect(lintText('t', 'One. Two. Three.', 'headline')[0]?.problem).toMatch(/two sentences/);
  });
});
