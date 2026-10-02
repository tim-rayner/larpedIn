import { expect, test } from 'bun:test';
import { greetingFor } from '../public/greeting.js';

// 2026-10-02 is a Friday; 2026-10-03 a Saturday; 2026-10-05 a Monday.
const at = (day, hour) => new Date(2026, 9, day, hour, 0);

test('small hours get the awake greeting', () => expect(greetingFor(at(1, 3), 'Scam', 0)).toBe('Why are you awake?'));
test('lunchtime on a weekday', () => expect(greetingFor(at(1, 12), 'Scam', 0)).toBe('Lunchtime reads?'));
test('Friday afternoon', () => expect(greetingFor(at(2, 15), 'Scam', 0)).toBe('Friday Afternoon Reading'));
test('weekends use the weekend pool', () => expect(greetingFor(at(3, 10), 'Scam', 0)).toBe('Weekend reading, Scam'));
test('Monday morning', () => expect(greetingFor(at(5, 8), 'Scam', 1)).toBe('Happy Monday, allegedly'));
test('placeholders are always filled', () => {
  for (let d = 1; d <= 7; d++) for (let h = 0; h < 24; h++) for (let s = 0; s < 4; s++) expect(greetingFor(at(d, h), 'Scam', s)).not.toMatch(/[{}]/);
});
