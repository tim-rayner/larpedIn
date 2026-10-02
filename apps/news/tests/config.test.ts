import { expect, test } from 'bun:test';
import { servicesFromEnv } from '../src/config';

const warnings = (env: Record<string, string>) => {
  const seen: string[] = [];
  servicesFromEnv(env, {warn: (message: string) => { seen.push(message); }, error() {}, log() {}});
  return seen.filter(message => message.includes('R2_'));
};

test('the in-memory image store warning names exactly which R2 variables are missing or blank', () => {
  const [message] = warnings({R2_ACCOUNT_ID: 'acct', R2_ACCESS_KEY_ID: '   ', R2_BUCKET: 'photos'});
  expect(message).toContain('R2_ACCESS_KEY_ID');
  expect(message).toContain('R2_SECRET_ACCESS_KEY');
  expect(message).not.toContain('R2_ACCOUNT_ID');
  expect(message).not.toContain('R2_BUCKET');
});

test('no R2 warning when every R2 variable is set', () => {
  expect(warnings({R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'b', R2_SECRET_ACCESS_KEY: 'c', R2_BUCKET: 'd'})).toEqual([]);
});
