import {
  childAge,
  formatChildAge,
  formulaDaysLeft,
  formulaDiscardBy,
  numberWord,
  postpartumWeek,
  pregnancyWeek,
} from './dates';

const at = (s: string) => new Date(`${s}T10:30:00`);

describe('formula discard date (9.15)', () => {
  it('matches the PRD example: opened 2 September, discard by 17 October', () => {
    expect(formulaDiscardBy('2026-09-02', 45)).toBe('2026-10-17');
  });
  it('treats the opening day as day 0', () => {
    expect(formulaDiscardBy('2026-08-27', 1)).toBe('2026-08-28');
    expect(formulaDiscardBy('2026-08-27', 0)).toBe('2026-08-27');
  });
  it('crosses month ends', () => {
    expect(formulaDiscardBy('2026-01-31', 30)).toBe('2026-03-02');
    expect(formulaDiscardBy('2026-12-20', 45)).toBe('2027-02-03');
  });
  it('handles leap years', () => {
    expect(formulaDiscardBy('2028-02-01', 28)).toBe('2028-02-29');
    expect(formulaDiscardBy('2028-01-20', 45)).toBe('2028-03-05');
    expect(formulaDiscardBy('2027-01-20', 45)).toBe('2027-03-06');
  });
  it('counts days left from the clock, 0 on the day and negative after', () => {
    expect(formulaDaysLeft('2026-10-17', at('2026-10-05'))).toBe(12);
    expect(formulaDaysLeft('2026-10-17', at('2026-10-17'))).toBe(0);
    expect(formulaDaysLeft('2026-10-17', at('2026-10-19'))).toBe(-2);
  });
  it('is not affected by the time of day', () => {
    expect(formulaDaysLeft('2026-10-17', new Date('2026-10-16T23:59:00'))).toBe(1);
    expect(formulaDaysLeft('2026-10-17', new Date('2026-10-17T00:01:00'))).toBe(0);
  });
});

describe('pregnancy week (completed weeks)', () => {
  it('resolves 17.1 #3: due 31 December reads Week 22 on Thursday 27 August 2026', () => {
    expect(pregnancyWeek('2026-12-31', at('2026-08-27'))).toMatchObject({ week: 22, day: 0 });
  });
  it('22 weeks and 3 days still reads Week 22', () => {
    expect(pregnancyWeek('2026-12-31', at('2026-08-30')).week).toBe(22);
  });
  it('past the due date', () => {
    expect(pregnancyWeek('2026-08-25', at('2026-08-27'))).toMatchObject({ week: 40, day: 2 });
  });
});

describe('postpartum week (days 0 to 6 are Week 1)', () => {
  it.each([
    ['2026-08-27', 1],
    ['2026-08-21', 1],
    ['2026-08-20', 2],
    ['2026-08-12', 3],
    ['2026-07-13', 7],
  ])('birth %s -> Week %i on 27 August', (birth, week) => {
    expect(postpartumWeek(birth, at('2026-08-27'))).toBe(week);
  });
});

describe('child age', () => {
  it('matches the toddler Figma pill (1y 2m 20d) for a 7 June 2025 birthday', () => {
    expect(formatChildAge('2025-06-07', at('2026-08-27'))).toBe('1y 2m 20d');
    expect(childAge('2025-06-07', at('2026-08-27')).totalMonths).toBe(14);
  });
  it('newborns show days only', () => {
    expect(formatChildAge('2026-08-12', at('2026-08-27'))).toBe('15d');
  });
  it('handles month-end birthdays', () => {
    expect(formatChildAge('2026-01-31', at('2026-03-01'))).toBe('1m 1d');
  });
});

describe('numberWord', () => {
  it('spells out headline numbers', () => {
    expect(numberWord(3)).toBe('three');
    expect(numberWord(12)).toBe('twelve');
    expect(numberWord(45)).toBe('forty-five');
    expect(numberWord(120)).toBe('120');
  });
});
