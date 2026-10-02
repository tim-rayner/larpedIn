// Daily corporate-word puzzle. The word is derived from the UTC date, so every player sees the same one.
export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export const answers = [
  'AGILE', 'SCRUM', 'LEARN', 'PIVOT', 'SCALE', 'ALIGN', 'LEVER', 'OWNER', 'STACK', 'AUDIT',
  'QUOTA', 'BRAND', 'CLOUD', 'FOCUS', 'IDEAS', 'LEADS', 'MERGE', 'NICHE', 'PITCH', 'QUEUE',
  'RAISE', 'SALES', 'TEAMS', 'VALUE', 'YIELD', 'ASSET', 'BOARD', 'CHURN', 'DRIVE', 'ENTRY',
  'FUNDS', 'GOALS', 'HIRED', 'INBOX', 'MOATS', 'NOTES', 'OFFER', 'PROXY', 'SHIFT', 'TREND',
  'UNITS', 'WORTH', 'BONUS', 'DEMOS', 'SLACK', 'STAFF', 'PAYER',
];

const DAY_MS = 86_400_000;
const EPOCH = Date.UTC(2026, 0, 1);

export const dayNumber = (date = new Date()) =>
  Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - EPOCH) / DAY_MS);

export const wordForDay = day => answers[((day % answers.length) + answers.length) % answers.length];

export const isValidGuess = guess => /^[A-Z]{5}$/.test(guess);

// Standard Wordle scoring: greens first, then yellows limited by the letters remaining in the answer.
export function scoreGuess(guess, answer) {
  const result = Array(guess.length).fill('absent');
  const remaining = {};
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) result[i] = 'correct';
    else remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue;
    if (remaining[guess[i]] > 0) {
      result[i] = 'present';
      remaining[guess[i]]--;
    }
  }
  return result;
}

const rank = { absent: 0, present: 1, correct: 2 };
export function keyStates(guesses, answer) {
  const states = {};
  for (const guess of guesses) {
    scoreGuess(guess, answer).forEach((s, i) => {
      if ((rank[s] ?? -1) > (rank[states[guess[i]]] ?? -1)) states[guess[i]] = s;
    });
  }
  return states;
}

export const status = (guesses, answer) =>
  guesses.at(-1) === answer ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing';

export function shareText(guesses, answer, day) {
  const glyph = { correct: '🟩', present: '🟨', absent: '⬜' };
  const won = guesses.at(-1) === answer;
  const rows = guesses.map(g => scoreGuess(g, answer).map(s => glyph[s]).join('')).join('\n');
  return `LarpedIn Buzzle #${day + 1} ${won ? guesses.length : 'X'}/${MAX_GUESSES}\n${rows}`;
}
