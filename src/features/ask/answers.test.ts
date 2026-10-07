import { buildPersona, ANCHOR } from '../../state/personas';
import { answer, suggestions } from './answers';
import { lintText } from '../../insights/copyLint';

describe('Ask (B33): grounded in her logs, safe by construction', () => {
  it('answers from logs', () => {
    const d3 = buildPersona('D3');
    expect(answer('When was Srinika’s last feed?', d3, ANCHOR).text).toBe('Srinika’s last feed was at 9:10 AM, left. That was 1h ago.');
    expect(answer('How much water did I have yesterday?', buildPersona('D4'), ANCHOR).text).toMatch(/^You logged \d+ glass/);
    expect(answer('Which foods has Srinika had this week?', buildPersona('D5'), ANCHOR).text).toMatch(/ragi/);
    expect(answer('When is my next appointment?', buildPersona('D1'), ANCHOR).text).toBe('Appointment with Dr. Mahua, Monday 14 September at 10:00 AM.');
    expect(answer('When is the formula tin due?', buildPersona('D5'), ANCHOR).text).toBe('The tin opened on 18 July is due to be discarded by 1 September.');
    expect(answer('Which medicines are left today?', buildPersona('D1'), ANCHOR).text).toMatch(/^Still to take today: Cipcal XT/);
  });
  it('never interprets health questions; routes them to the provider', () => {
    for (const q of ['Is this rash normal?', 'She has a fever, what do I do?', 'How much paracetamol can I give?', 'Should I worry about the bleeding?']) {
      expect(answer(q, buildPersona('D3'), ANCHOR).kind).toBe('health');
    }
  });
  it('red flags always go to people first', () => {
    for (const q of ['I want to hurt myself', 'I feel like I might harm my baby', 'she stopped breathing', 'I can’t go on']) {
      expect(answer(q.replace('’', "'"), buildPersona('D3'), ANCHOR).kind).toBe('redflag');
    }
  });
  it('suggestions change by state and pass the copy lint', () => {
    expect(suggestions(buildPersona('D1'))).toContain('When is my next appointment?');
    expect(suggestions(buildPersona('D3'))[0]).toBe('When was Srinika’s last feed?');
    for (const p of ['D1', 'D3', 'D5'] as const) for (const s of suggestions(buildPersona(p))) expect(lintText('q', s, 'label')).toEqual([]);
  });
});
