import type { Page } from '@playwright/test';
import { closePanel, openPanel } from '../e2e/helpers';

/**
 * Every screen and key state for the Claude Design canvas (decision 2026-10-30).
 * Each entry: a persona (or a fresh install), a route, and the steps that reach the
 * state. `full` captures the whole scrolling screen; sheets and overlays keep the
 * phone's height so they read as the user sees them.
 */

export interface Screen {
  id: string;
  section: SectionId;
  title: string;
  persona: 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'fresh';
  route?: string;
  act?: (page: Page) => Promise<void>;
  full?: boolean;
}

export type SectionId = 'launch' | 'cycle' | 'pregnancy' | 'newborn' | 'period' | 'toddler' | 'everywhere';

export const SECTIONS: { id: SectionId; name: string }[] = [
  { id: 'launch', name: 'First launch' },
  { id: 'cycle', name: 'Cycle tracker' },
  { id: 'pregnancy', name: 'Pregnancy' },
  { id: 'newborn', name: 'Newborn' },
  { id: 'period', name: 'Period returns' },
  { id: 'toddler', name: 'Toddler and pregnant again' },
  { id: 'everywhere', name: 'Everywhere' },
];

const dev = (p: Page) => p.locator('#device');
const tap = async (p: Page, name: string | RegExp, exact = false) => dev(p).getByRole('button', { name, exact }).first().click();

async function setClock(p: Page, value: string) {
  await openPanel(p);
  await p.locator('[data-testid="demo-panel"] input[type="datetime-local"]').first().fill(value);
  await closePanel(p);
}

/** From a fresh install to "About you" for one situation, facts filled in. */
const aboutYou = (radio: string, fill: (p: Page) => Promise<void>) => async (p: Page) => {
  await tap(p, 'Continue without an account');
  await dev(p).getByRole('radio', { name: radio, exact: true }).click();
  await tap(p, 'Continue');
  await dev(p).getByLabel('Your name').fill('Asha');
  await fill(p);
};

/** A fresh cycle tracker, onboarded, with or without a first period date. */
const freshTracker = (period?: string) => async (p: Page) => {
  await aboutYou('I’m tracking my cycle', async (q) => {
    if (period) await dev(q).getByLabel('First day of your last period (optional)').fill(period);
  })(p);
  await tap(p, 'Open Weave');
};

const startLabour = (p: Page) => tap(p, 'Start Labour Mode', true);

export const SCREENS: Screen[] = [
  // ---------------------------------------------------------------- first launch
  { id: 'welcome', section: 'launch', title: 'Welcome and sign in', persona: 'fresh', route: '/onboarding' },
  { id: 'where', section: 'launch', title: 'Where are you right now?', persona: 'fresh', route: '/onboarding', act: async (p) => { await tap(p, 'Continue without an account'); await dev(p).getByRole('radio', { name: 'I’m tracking my cycle', exact: true }).click(); } },
  { id: 'about-cycle', section: 'launch', title: 'About you: tracking my cycle', persona: 'fresh', route: '/onboarding', act: aboutYou('I’m tracking my cycle', (p) => dev(p).getByLabel('First day of your last period (optional)').fill('2026-08-24')) },
  { id: 'about-pregnant', section: 'launch', title: 'About you: pregnant', persona: 'fresh', route: '/onboarding', act: aboutYou('I’m pregnant', (p) => dev(p).getByLabel('Due date').fill('2027-01-14')) },
  { id: 'about-baby', section: 'launch', title: 'About you and your baby', persona: 'fresh', route: '/onboarding', act: aboutYou('I have a baby', async (p) => { await dev(p).getByLabel('Child’s name').fill('Mira'); await dev(p).getByLabel('Child’s date of birth').fill('2026-08-01'); }) },
  { id: 'about-both', section: 'launch', title: 'About you: pregnant with a child', persona: 'fresh', route: '/onboarding', act: aboutYou('I’m pregnant and have a child', async (p) => { await dev(p).getByLabel('Due date').fill('2027-01-14'); await dev(p).getByLabel('Child’s name').fill('Kabir'); await dev(p).getByLabel('Child’s date of birth').fill('2025-06-10'); }) },

  // ---------------------------------------------------------------- cycle tracker
  { id: 'c-today-new', section: 'cycle', title: 'Today, first visit, nothing logged', persona: 'fresh', route: '/onboarding', act: freshTracker(), full: true },
  { id: 'c-today-early', section: 'cycle', title: 'Today, one period logged', persona: 'fresh', route: '/onboarding', act: async (p) => { await freshTracker('2026-08-16')(p); await tap(p, 'Open cycle'); await p.goto('/today'); }, full: true },
  { id: 'c-today', section: 'cycle', title: 'Today (D7, day 12)', persona: 'D7', route: '/today', full: true },
  { id: 'c-cycle', section: 'cycle', title: 'Cycle (D7)', persona: 'D7', route: '/cycle', full: true },
  { id: 'c-cycle-early', section: 'cycle', title: 'Cycle, too early to estimate', persona: 'fresh', route: '/onboarding', act: async (p) => { await freshTracker('2026-08-16')(p); await p.goto('/cycle'); }, full: true },
  { id: 'c-day-sheet', section: 'cycle', title: 'Log a period day', persona: 'D7', route: '/cycle', act: (p) => tap(p, 'Log today') },
  { id: 'c-selfcare', section: 'cycle', title: 'Self care (D7)', persona: 'D7', route: '/me', full: true },
  { id: 'c-plan', section: 'cycle', title: 'Plan: Move with your cycle', persona: 'D7', route: '/me/care/plan/cycle-move', full: true },
  { id: 'c-video', section: 'cycle', title: 'Routine: Yoga for period cramps', persona: 'D7', route: '/me/care/video/yoga-cramps', full: true },
  { id: 'c-food', section: 'cycle', title: 'Food: Palak dal', persona: 'D7', route: '/me/care/food/palak-dal', full: true },
  { id: 'c-breathe', section: 'cycle', title: 'Breathe, mid-round', persona: 'D7', route: '/me/care/breathe', act: async (p) => { await tap(p, 'Start'); await p.clock.runFor(2500); } },
  { id: 'c-sleep', section: 'cycle', title: 'Your sleep (from Fitbit)', persona: 'D7', route: '/me/sleep', full: true },
  { id: 'c-vitals', section: 'cycle', title: 'Your vitals', persona: 'D7', route: '/me/vitals', full: true },
  { id: 'c-settings', section: 'cycle', title: 'Settings, cycle tracker', persona: 'D7', route: '/settings', full: true },
  { id: 'c-connect', section: 'cycle', title: 'Connect an app', persona: 'D7', route: '/settings', act: (p) => tap(p, /^Oura/) },
  { id: 'c-sharing', section: 'cycle', title: 'Sharing, cycle only', persona: 'D7', route: '/settings', act: (p) => tap(p, 'Sharing') },

  // ---------------------------------------------------------------- pregnancy
  { id: 'p-today', section: 'pregnancy', title: 'Today, week 22 (D1)', persona: 'D1', route: '/today', full: true },
  { id: 'p-tab', section: 'pregnancy', title: 'Pregnancy tab, week 22', persona: 'D1', route: '/pregnancy', full: true },
  { id: 'p-appointment', section: 'pregnancy', title: 'Add an appointment', persona: 'D1', route: '/pregnancy', act: (p) => tap(p, 'Add an appointment') },
  { id: 'p-medicine', section: 'pregnancy', title: 'Add something you take', persona: 'D1', route: '/today', act: (p) => tap(p, 'Add something you take') },
  { id: 'p-changed', section: 'pregnancy', title: 'Something changed', persona: 'D1', route: '/changed', full: true },
  { id: 'p-selfcare', section: 'pregnancy', title: 'Self care, pregnancy', persona: 'D1', route: '/me', full: true },
  { id: 'p-today-late', section: 'pregnancy', title: 'Today, week 40 (D2)', persona: 'D2', route: '/today', full: true },
  { id: 'p-labour', section: 'pregnancy', title: 'Labour mode', persona: 'D2', route: '/today', act: startLabour, full: true },
  { id: 'p-contraction', section: 'pregnancy', title: 'Labour mode, contraction running', persona: 'D2', route: '/today', act: async (p) => { await startLabour(p); await tap(p, /^Contraction/); } },
  { id: 'p-provider', section: 'pregnancy', title: 'Call your provider', persona: 'D2', route: '/today', act: async (p) => { await startLabour(p); await tap(p, /Call your provider/); } },
  { id: 'p-birth', section: 'pregnancy', title: 'Birth details', persona: 'D2', route: '/today', act: async (p) => { await startLabour(p); await tap(p, 'Baby is here'); }, full: true },
  { id: 'p-handoff', section: 'pregnancy', title: 'Welcome, little one (handoff)', persona: 'D2', route: '/today', act: async (p) => { await startLabour(p); await tap(p, 'Baby is here'); await tap(p, 'Save birth'); }, full: true },

  // ---------------------------------------------------------------- newborn
  { id: 'n-today', section: 'newborn', title: 'Today, week 3 (D3)', persona: 'D3', route: '/today', full: true },
  { id: 'n-quicklog', section: 'newborn', title: 'Quick log (+)', persona: 'D3', route: '/today', act: async (p) => void (await dev(p).getByTestId('fab').click()) },
  { id: 'n-feed', section: 'newborn', title: 'Log a feed', persona: 'D3', route: '/today', act: (p) => tap(p, 'Log a feed for Srinika') },
  { id: 'n-breastfeed', section: 'newborn', title: 'Breastfeed timer', persona: 'D3', route: '/today', act: async (p) => { await tap(p, 'Log a feed for Srinika'); await tap(p, 'Breastfeed'); } },
  { id: 'n-diaper', section: 'newborn', title: 'Diaper chooser', persona: 'D3', route: '/today', act: (p) => tap(p, /^Log a diaper for Srinika/) },
  { id: 'n-sleeping', section: 'newborn', title: 'Baby sleeping (timer pill)', persona: 'D3', route: '/today', act: async (p) => { await tap(p, /^Log sleep for Srinika/); await tap(p, 'Start now'); await p.clock.fastForward('42:00'); }, full: true },
  { id: 'n-bleeding', section: 'newborn', title: 'Bleeding: heavy, with advice', persona: 'D3', route: '/today', act: async (p) => { await tap(p, /^Log bleeding/); await dev(p).getByRole('radio', { name: 'Heavy' }).click(); } },
  { id: 'n-explain', section: 'newborn', title: 'Why am I seeing this?', persona: 'D3', route: '/today', act: (p) => tap(p, 'Three feeds logged since 5am, and no water yet today.') },
  { id: 'n-baby', section: 'newborn', title: 'Baby tab', persona: 'D3', route: '/baby', full: true },
  { id: 'n-feeding', section: 'newborn', title: 'Feeding history', persona: 'D3', route: '/baby/feeding', full: true },
  { id: 'n-baby-sleep', section: 'newborn', title: 'Sleep history', persona: 'D3', route: '/baby/sleep', full: true },
  { id: 'n-diapers', section: 'newborn', title: 'Diaper history', persona: 'D3', route: '/baby/diaper', full: true },
  { id: 'n-growth', section: 'newborn', title: 'Growth', persona: 'D3', route: '/baby/growth', full: true },
  { id: 'n-vaccines', section: 'newborn', title: 'Vaccinations', persona: 'D3', route: '/baby/vaccines', full: true },
  { id: 'n-formula', section: 'newborn', title: 'Formula tins', persona: 'D3', route: '/baby/formula', full: true },
  { id: 'n-selfcare', section: 'newborn', title: 'Self care, week 3', persona: 'D3', route: '/me', full: true },
  { id: 'n-plan', section: 'newborn', title: 'Plan: pelvic floor', persona: 'D3', route: '/me/care/plan/pelvic-floor', full: true },
  { id: 'n-her-bleeding', section: 'newborn', title: 'Bleeding history', persona: 'D3', route: '/me/bleeding', full: true },
  { id: 'n-pelvic', section: 'newborn', title: 'Pelvic floor', persona: 'D3', route: '/me/pelvic', full: true },
  { id: 'n-pain', section: 'newborn', title: 'Pain', persona: 'D3', route: '/me/pain', full: true },
  { id: 'n-hydration', section: 'newborn', title: 'Hydration', persona: 'D3', route: '/me/hydration', full: true },
  { id: 'n-mood', section: 'newborn', title: 'Mood', persona: 'D3', route: '/me/mood', full: true },

  // ---------------------------------------------------------------- period returns
  { id: 'r-card', section: 'period', title: 'Self care, week 6: has your period come back?', persona: 'D3', route: '/today', act: async (p) => { await setClock(p, '2026-09-24T10:00'); await p.goto('/me'); }, full: true },
  { id: 'r-today', section: 'period', title: 'Today, week 7, period day 3 (D4)', persona: 'D4', route: '/today', full: true },
  { id: 'r-selfcare', section: 'period', title: 'Self care, period back (D4)', persona: 'D4', route: '/me', full: true },
  { id: 'r-cycle', section: 'period', title: 'Cycle, one period after birth', persona: 'D4', route: '/me/cycle', full: true },

  // ---------------------------------------------------------------- toddler and pregnant again
  { id: 't-today', section: 'toddler', title: 'Today, 14 months (D5)', persona: 'D5', route: '/today', full: true },
  { id: 't-meals', section: 'toddler', title: 'All meals today', persona: 'D5', route: '/today', act: (p) => tap(p, 'All meals today'), full: true },
  { id: 't-baby', section: 'toddler', title: 'Baby tab, toddler', persona: 'D5', route: '/baby', full: true },
  { id: 't-food', section: 'toddler', title: 'Food journey', persona: 'D5', route: '/baby/food', full: true },
  { id: 't-food-curd', section: 'toddler', title: 'A new food: curd', persona: 'D5', route: '/baby/food/curd', full: true },
  { id: 't-recipe', section: 'toddler', title: 'Recipe: chicken stew', persona: 'D5', route: '/food/recipe/chicken-stew', full: true },
  { id: 't-reaction', section: 'toddler', title: 'Log a reaction', persona: 'D5', route: '/food/reaction/curd', full: true },
  { id: 't-emergency', section: 'toddler', title: 'Reaction: emergency card', persona: 'D5', route: '/food/reaction/curd', act: (p) => tap(p, 'Difficulty breathing') },
  { id: 't-medicines', section: 'toddler', title: 'Medicine course', persona: 'D5', route: '/baby/medicines', full: true },
  { id: 't-cycle', section: 'toddler', title: 'Cycle, period day 3 (D5)', persona: 'D5', route: '/me/cycle', full: true },
  { id: 'd6-today', section: 'toddler', title: 'Today, pregnant again (D6)', persona: 'D6', route: '/today', full: true },
  { id: 'd6-baby', section: 'toddler', title: 'Baby tab while pregnant (D6)', persona: 'D6', route: '/baby', full: true },

  // ---------------------------------------------------------------- everywhere
  { id: 'e-ask', section: 'everywhere', title: 'Ask AI', persona: 'D3', route: '/ask', full: true },
  { id: 'e-timeline', section: 'everywhere', title: 'Timeline (all entries)', persona: 'D3', route: '/timeline', full: true },
  { id: 'e-history', section: 'everywhere', title: 'History (past pregnancy)', persona: 'D3', route: '/me/history', full: true },
  { id: 'e-medicines', section: 'everywhere', title: 'Your medicines', persona: 'D1', route: '/me/medicines', full: true },
  { id: 'e-settings', section: 'everywhere', title: 'Settings, with a baby', persona: 'D3', route: '/settings', full: true },
  { id: 'e-empty-baby', section: 'everywhere', title: 'Today, new parent, nothing logged', persona: 'fresh', route: '/onboarding', act: async (p) => { await aboutYou('I have a baby', async (q) => { await dev(q).getByLabel('Child’s name').fill('Mira'); await dev(q).getByLabel('Child’s date of birth').fill('2026-08-20'); })(p); await tap(p, 'Open Weave'); }, full: true },
];
