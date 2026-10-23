import { copy, type CopyEntry } from '../content/copy';

/**
 * Insight copy templates for the rule catalogue (PRD 11.2) and escalations (11.3).
 * Rules (rules.ts) decide WHEN; these decide WHAT is said. An LLM may later
 * paraphrase within these, but never adds claims (11.1).
 *
 * Placeholders in headlines are filled with spelled-out numbers (numberWord)
 * and formatted dates, never raw digits.
 */

export interface InsightTemplate {
  ruleId: string;
  severity: 'info' | 'escalate';
  headline: CopyEntry;
  body?: CopyEntry;
  actions: CopyEntry[];
}

const clinical = (ref: string, note?: string) => ({ kind: 'clinical' as const, ref, note });

export const TEMPLATES = {
  R01: {
    ruleId: 'R01',
    severity: 'info',
    headline: copy('{Count} feeds logged since {time}, and no water yet today.', 'headline'),
    // 11.4: replaces the unsupported lactation claim in the Figma frame.
    body: copy('Nursing can make you thirstier. Worth a glass while you’re sitting down.', 'body', { kind: 'lactation', ref: '11.4', note: 'Lactation consultant to check final wording' }),
    actions: [copy('Log a glass', 'action')],
  },
  R02: {
    ruleId: 'R02',
    severity: 'info',
    headline: copy('{count} of {goal} glasses so far today.', 'headline'),
    actions: [copy('Log a glass', 'action')],
  },
  R03: {
    ruleId: 'R03',
    severity: 'info',
    headline: copy('Day {day} of your period, and {water} so far today.', 'headline'),
    body: copy('Some people find water helps on heavier days.', 'body', clinical('11.2 R03', 'Figma claims hydration eases cramping; softened, needs review')),
    actions: [copy('Log a glass', 'action')],
  },
  R04: {
    ruleId: 'R04',
    severity: 'info',
    // Decision 2026-10-01: second sentence "Week N usually looks like this." dropped (reads as reassurance).
    headline: copy('{Level} has eased for three days.', 'headline'),
    actions: [],
  },
  R05: {
    ruleId: 'R05',
    severity: 'info',
    headline: copy('You’ve slept under six hours four nights running.', 'headline'),
    body: copy('Nothing to do with this. Just worth knowing.', 'body'),
    actions: [],
  },
  R06_nap: {
    ruleId: 'R06',
    severity: 'info',
    headline: copy('{name}’s naps today are {direction} than last week.', 'headline'),
    body: copy('Compared with {name}’s own recent days only.', 'body'),
    actions: [],
  },
  R06_gap: {
    ruleId: 'R06',
    severity: 'info',
    headline: copy('Feeds are {direction} today than {name}’s recent average.', 'headline'),
    body: copy('Compared with {name}’s own recent days only.', 'body'),
    actions: [],
  },
  R07: {
    ruleId: 'R07',
    severity: 'info',
    headline: copy('{Food} introduced today.', 'headline'),
    body: copy('No reaction yet.', 'body'),
    actions: [copy('Log a reaction', 'action'), copy('Not now', 'action')],
  },
  R08: {
    ruleId: 'R08',
    severity: 'info',
    headline: copy('{recipe}', 'headline'),
    body: copy('Ingredients already introduced safely.', 'body'),
    actions: [copy('View recipe', 'action')],
  },
  R09: {
    ruleId: 'R09',
    severity: 'info',
    headline: copy('{Slot} dose of {medicine} not logged yet.', 'headline'),
    actions: [copy('Log dose', 'action')],
  },
  R10: {
    ruleId: 'R10',
    severity: 'info',
    headline: copy('{done} of {target} pelvic floor sets this week.', 'headline'),
    actions: [copy('Log a set', 'action')],
  },
  R11: {
    ruleId: 'R11',
    severity: 'info',
    headline: copy('Has your period come back?', 'headline'),
    body: copy('Most first periods land between two and twelve months. When yours does, cycle tracking opens up here.', 'support', clinical('9.8')),
    actions: [copy('Yes, it has', 'action'), copy('Not yet', 'action')],
  },
  R12: {
    ruleId: 'R12',
    severity: 'info',
    headline: copy('Your practice contractions moved from {from} minutes apart to {to} over the last two days.', 'headline'),
    body: copy('Not a signal on its own. Timing them properly is one tap away.', 'body', clinical('11.2 R12')),
    actions: [copy('Start Labour mode', 'action')],
  },
  R13: {
    ruleId: 'R13',
    severity: 'escalate',
    headline: copy('All three signs have held for an hour.', 'headline', clinical('9.6', 'Copy shown when all three signs are met')),
    body: copy('Call your provider or labour ward now.', 'body', clinical('9.6')),
    actions: [copy('Call your provider', 'action')],
  },
  R14: {
    ruleId: 'R14',
    severity: 'escalate',
    headline: copy('Heavy bleeding logged.', 'headline', clinical('11.3')),
    body: copy('Contact your provider now, or emergency services if you feel unwell.', 'body', clinical('11.3')),
    actions: [copy('Contact your provider', 'action')],
  },
  R15: {
    ruleId: 'R15',
    severity: 'escalate',
    headline: copy('You’ve logged low mood three days in a row.', 'headline', clinical('11.3')),
    body: copy('Your provider can help with this, and so can a support line. You can talk to someone today.', 'body', clinical('11.3', 'Support resource is region-configurable; verify numbers before shipping')),
    actions: [copy('See support options', 'action')],
  },
  R16: {
    ruleId: 'R16',
    severity: 'info',
    headline: copy('The open formula tin is due to be discarded by {discardBy}.', 'headline', { kind: 'product', ref: '9.15', note: 'Default 45-day window: confirm against the tin labels' }),
    body: copy('Opened {opened}. {DaysLeft} days left.', 'body'),
    actions: [copy('Finished', 'action'), copy('Discarded', 'action'), copy('Not now', 'action')],
  },
  R16_today: {
    ruleId: 'R16',
    severity: 'info',
    headline: copy('The open formula tin is due to be discarded today.', 'headline', { kind: 'product', ref: '9.15' }),
    body: copy('Opened {opened}.', 'body'),
    actions: [copy('Finished', 'action'), copy('Discarded', 'action'), copy('Not now', 'action')],
  },
  R16_one: {
    ruleId: 'R16',
    severity: 'info',
    headline: copy('The open formula tin is due to be discarded by {discardBy}.', 'headline', { kind: 'product', ref: '9.15' }),
    body: copy('Opened {opened}. One day left.', 'body'),
    actions: [copy('Finished', 'action'), copy('Discarded', 'action'), copy('Not now', 'action')],
  },
  R17: {
    ruleId: 'R17',
    severity: 'info',
    headline: copy('The open formula tin has passed its discard date.', 'headline', { kind: 'product', ref: '9.15' }),
    body: copy('Opened {opened}. Due to be discarded by {discardBy}.', 'body'),
    actions: [copy('Discarded', 'action'), copy('Finished', 'action'), copy('Not now', 'action')],
  },
  ESC_reaction: {
    ruleId: 'ESC_reaction',
    severity: 'escalate',
    headline: copy('Seek urgent medical care now.', 'headline', clinical('9.9')),
    body: copy('Call emergency services or go to the nearest emergency department. You can log the details later.', 'body', clinical('9.9')),
    actions: [copy('Call emergency services', 'action')],
  },
  ESC_dehydration: {
    ruleId: 'ESC_dehydration',
    severity: 'escalate',
    headline: copy('Fewer wet diapers than usual today.', 'headline', clinical('11.3', 'Rule wording needs clinical input before inclusion')),
    body: copy('Worth a call to your provider today.', 'body', clinical('11.3')),
    actions: [copy('Contact your provider', 'action')],
  },
} satisfies Record<string, InsightTemplate>;

export type TemplateKey = keyof typeof TEMPLATES;
