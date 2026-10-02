import { expect, test } from 'bun:test';

const workflow = await Bun.file(new URL('../../../.github/workflows/refresh.yml', import.meta.url)).text();

test('the hourly Refresh is scheduled hourly but off the top of the hour, where GitHub drops scheduled runs', () => {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = /- cron: '([^']+)'/.exec(workflow)![1]!.split(' ');
  expect(hour).toBe('*');
  expect([dayOfMonth, month, dayOfWeek]).toEqual(['*', '*', '*']);
  expect(Number(minute)).toBeGreaterThan(0);
  expect(Number(minute)).toBeLessThan(60);
  expect([0, 5, 10, 15, 20, 30, 45, 55]).not.toContain(Number(minute));
});
