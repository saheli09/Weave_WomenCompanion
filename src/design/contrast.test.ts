import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrast } from './contrastUtil';

/**
 * WCAG 2.1 AA contrast check on the token pairs the components actually use
 * (PRD 15). Reads tokens.css so a token edit that breaks contrast fails the build.
 */

const css = readFileSync(join(__dirname, 'tokens.css'), 'utf8');
const token = (name: string): string => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --color-${name} not found`);
  return m[1]!;
};

const TEXT = 4.5;
const NON_TEXT = 3; // icons, glyphs, large text

// [foreground, background, minimum, where it is used]
const PAIRS: [string, string, number, string][] = [
  ['ink', 'bg', TEXT, 'titles, greetings'],
  ['ink', 'surface', TEXT, 'card text'],
  ['ink', 'sage-100', TEXT, 'insight headline'],
  ['ink', 'surface-muted', TEXT, 'reading headline'],
  ['ink-2', 'bg', TEXT, 'secondary text'],
  ['ink-2', 'surface', TEXT, 'secondary on cards'],
  ['ink-2', 'sage-100', TEXT, 'insight body'],
  ['ink-2', 'surface-muted', TEXT, 'reading body and tag'],
  ['ink-3', 'bg', TEXT, 'date row, section labels'],
  ['ink-3', 'surface', TEXT, 'muted lines on cards'],
  ['ink-4', 'surface', NON_TEXT, '"+" affordances'],
  ['ink-4', 'bg', NON_TEXT, 'chevrons on background'],
  ['sage-600', 'sage-100', TEXT, 'NOTICING label'],
  ['surface', 'sage-600', TEXT, 'sage button label'],
  ['surface', 'ink', TEXT, 'dark button label'],
  ['coral-ink', 'surface', TEXT, 'active tab label'],
  ['coral-icon', 'surface', NON_TEXT, 'active tab icon'],
  ['chip-child-fg', 'chip-child-bg', TEXT, 'child chip'],
  ['chip-her-fg', 'chip-her-bg', TEXT, 'Me chip'],
  ['terracotta', 'surface', NON_TEXT, 'escalation accent bar'],
  ['terracotta-ink', 'surface', TEXT, 'escalation label'],
  ['review-fg', 'review-bg', TEXT, 'review marker'],
  ['olive-500', 'surface', NON_TEXT, 'filled check, bars'],
];

describe('token contrast (WCAG 2.1 AA)', () => {
  it.each(PAIRS)('%s on %s is at least %s:1 (%s)', (fg, bg, min) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
  });
});

/** Dark mode (decision 2026-10-30): the same pairs on the dark tokens; a token it does not override keeps its light value. */
const darkBlock = css.slice(css.indexOf("[data-theme='dark']"));
const darkToken = (name: string): string => darkBlock.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? token(name);

describe('token contrast, dark mode (WCAG 2.1 AA)', () => {
  it.each(PAIRS)('%s on %s is at least %s:1 (%s)', (fg, bg, min) => {
    expect(contrast(darkToken(fg), darkToken(bg))).toBeGreaterThanOrEqual(min);
  });
});

/**
 * Known failure kept from Figma pending a design decision: the FAB "+" in white
 * on the coral gradient is 2.1:1 to 2.8:1 (needs 3:1). Logged in FIGMA-DEVIATIONS.md.
 */
describe('known open contrast issues', () => {
  it('FAB glyph on the coral gradient is below 3:1 (open, not silently changed)', () => {
    expect(contrast(token('fab-ink'), token('coral-a'))).toBeLessThan(NON_TEXT);
  });
});
