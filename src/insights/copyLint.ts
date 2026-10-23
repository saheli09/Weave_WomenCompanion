import type { CopyEntry } from '../content/copy';

/**
 * Copy lint, PRD 11.4. Runs as a unit test (copyLint.test.ts) that is part of
 * `npm run build`, so a banned word or emoji fails the build.
 */

/** Observation, not verdict (11.4). Matched as whole words or phrases, case-insensitive. */
export const BANNED_PHRASES = [
  'should',
  "shouldn't",
  'must',
  'need to',
  'needs to',
  'have to',
  'normal',
  'normally',
  'abnormal',
  'fine',
  'worrying',
  'worry',
  'dangerous',
  'you are dehydrated',
  "you're dehydrated",
  // No praise, streaks or scores (11.4, principle 12)
  'great job',
  'good job',
  'well done',
  'amazing',
  'awesome',
  'proud of you',
  'keep it up',
  'beautifully',
  'perfect',
  'streak',
  'streaks',
  'score',
  // No comparison with other mothers or children (11.4, principle 8)
  'other mothers',
  'other moms',
  'other mums',
  'other babies',
  'most babies',
  'than her sister',
  'than his brother',
  'than her brother',
  'than his sister',
];

const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u{FE0F}/u;

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
/** Times ("5am", "10:15 AM") and dates ("2 September") may keep their numerals. */
const TIME_OR_DATE = new RegExp(`\\b\\d{1,2}(:\\d{2})?\\s?(am|pm)\\b|\\b\\d{1,2}\\s(${MONTHS})\\b|\\b(${MONTHS})\\s\\d{1,2}\\b`, 'gi');

export const HUMAN_CONTACT = /\b(provider|doctor|midwife|emergency services|emergency department|labour ward|support line|helpline|someone)\b/i;

export interface LintProblem {
  id: string;
  text: string;
  problem: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PHRASE_RES = BANNED_PHRASES.map((p) => [p, new RegExp(`(^|[^\\p{L}'’])${escapeRe(p).replace(/'/g, "['’]")}(?=$|[^\\p{L}])`, 'iu')] as const);

export function sentences(text: string): string[] {
  return text
    .replace(/\{[^}]+\}/g, 'X')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function lintText(id: string, text: string, kind: CopyEntry['kind']): LintProblem[] {
  const problems: LintProblem[] = [];
  const report = (problem: string) => problems.push({ id, text, problem });
  if (EMOJI.test(text)) report('contains an emoji');
  for (const [phrase, re] of PHRASE_RES) if (re.test(text)) report(`uses banned phrase "${phrase}"`);
  if (kind === 'headline') {
    const stripped = text.replace(/\{[^}]+\}/g, '').replace(TIME_OR_DATE, '');
    const digit = stripped.match(/(^|[^\d:])([0-9])(?![\d:])/);
    if (digit) report(`headline uses the numeral "${digit[2]}" (spell out numbers below ten)`);
    if (sentences(text).length > 2) report('headline is longer than two sentences');
  }
  return problems;
}

export function lintEntries(entries: Record<string, CopyEntry>): LintProblem[] {
  return Object.entries(entries).flatMap(([id, e]) => lintText(id, e.text, e.kind));
}
