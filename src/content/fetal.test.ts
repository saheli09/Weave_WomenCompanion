import { FETAL_WEEKS, fetalForWeek } from './fetal';

describe('your baby this week: size comparisons (decision 2026-10-31)', () => {
  it('every week compares to something; all but the earliest have a picture', () => {
    for (const f of FETAL_WEEKS) {
      expect(f.size.thing.text).toMatch(/^an? /);
      if (f.week > 4) expect(f.size.emoji).toBeTruthy();
    }
    expect(fetalForWeek(4)!.size.emoji).toBeUndefined(); // a poppy seed: a drawn dot
  });
  it('weeks between entries use the latest one', () => {
    expect(fetalForWeek(17)!.size.thing.text).toBe('an avocado');
    expect(fetalForWeek(22)!.size.thing.text).toBe('a large mango');
    expect(fetalForWeek(3)).toBeUndefined();
  });
});
