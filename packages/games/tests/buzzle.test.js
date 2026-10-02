import { expect, test } from 'bun:test';
import { answers, dayNumber, isValidGuess, keyStates, scoreGuess, shareText, status, wordForDay } from '../src/buzzle.js';

test('every answer is five uppercase letters, with no duplicates', () => {
  for (const w of answers) expect(isValidGuess(w)).toBe(true);
  expect(new Set(answers).size).toBe(answers.length);
});
test('the word is the same all day for everyone, whatever the local time', () => {
  expect(wordForDay(dayNumber(new Date('2026-10-02T00:00:01Z')))).toBe(wordForDay(dayNumber(new Date('2026-10-02T23:59:59Z'))));
});
test('the word changes the next day and cycles through the list', () => {
  const d = dayNumber(new Date('2026-10-02T12:00:00Z'));
  expect(wordForDay(d + 1)).not.toBe(wordForDay(d));
  expect(wordForDay(d + answers.length)).toBe(wordForDay(d));
});
test('scoring handles duplicate letters', () => {
  expect(scoreGuess('AGILE', 'AGILE')).toEqual(Array(5).fill('correct'));
  expect(scoreGuess('LLAMA', 'ALIGN')).toEqual(['absent', 'correct', 'present', 'absent', 'absent']);
  expect(scoreGuess('SCALE', 'AGILE')).toEqual(['absent', 'absent', 'present', 'correct', 'correct']);
});
test('keyboard keeps the best state per letter', () => {
  expect(keyStates(['SCALE', 'AGILE'], 'AGILE').A).toBe('correct');
});
test('game status and share text', () => {
  expect(status(['SCALE'], 'AGILE')).toBe('playing');
  expect(status(['SCALE', 'AGILE'], 'AGILE')).toBe('won');
  expect(status(Array(6).fill('SCALE'), 'AGILE')).toBe('lost');
  expect(shareText(['AGILE'], 'AGILE', 0)).toBe('LarpedIn Buzzle #1 1/6\n🟩🟩🟩🟩🟩');
});
