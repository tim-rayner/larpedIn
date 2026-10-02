import { expect, test } from 'bun:test';
import { PUBLIC_CHARACTERS, characterForCompany, currentUser } from '../src/index.ts';

test('Scam Altman is the current fictional user', () => {
  expect(currentUser.name).toBe('Scam Altman');
  expect(currentUser.company).toBe('ClosedAI');
});

test('real companies route to fictional characters without entering public data', () => {
  expect(characterForCompany('OpenAI Group PBC')?.characterId).toBe('scam-altman');
  expect(characterForCompany('NVIDIA Corporation')?.characterId).toBe('jensen-hype');
  expect(characterForCompany('Alphabet, Inc.')?.characterId).toBe('sundar-pitchai');
  expect(characterForCompany('unknown')).toBeUndefined();
  for (const character of Object.values(PUBLIC_CHARACTERS)) expect('realCompany' in character).toBe(false);
});
