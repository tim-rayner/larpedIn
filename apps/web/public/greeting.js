const pick = (list, seed) => list[Math.abs(seed) % list.length];

const lateNight = ['Why are you awake?', 'Shouldn’t you be asleep, {user}?', 'Grinding at this hour, {user}? Bold.', 'Insomnia, but make it content.'];
const earlyMorning = ['Your morning digest, {user}', 'Rise and grind, {user}', 'Up before the thought leaders, {user}', 'Coffee first. Takes second.'];
const lateMorning = ['Good morning, {user}', 'Your morning digest, {user}', 'Fresh takes, fresh coffee', 'Morning, {user}. The discourse awaits.'];
const lunch = ['Lunchtime reads?', 'Eating at your desk, {user}?', 'Something to skim over lunch', 'Lunch break. Not a real one.'];
const afternoon = ['Good afternoon, {user}', 'Your afternoon briefing, {user}', 'Post-lunch slump reading', 'This could have been a meeting, {user}'];
const evening = ['Good evening, {user}', 'Evening reading, {user}', 'Still online, {user}? Respect.', 'Winding down, or doubling down?'];
const night = ['Late night reading, {user}', 'One more scroll, {user}?', 'Burning the midnight oil, {user}?', 'Everyone else is asleep. Just us and the takes.'];
const fridayAfternoon = ['Friday Afternoon Reading', 'It’s Friday, {user}. Nobody’s working.', 'Friday vibes, {user}'];
const fridayEvening = ['Weekend loading, {user}…', 'Happy Friday, {user}'];
const weekend = ['Weekend reading, {user}', 'Working on a weekend, {user}?', 'Touch grass? Later. Takes first.', 'Lazy {day} reads'];
const mondayMorning = ['Monday again, {user}', 'Happy Monday, allegedly', 'Your Monday digest, {user}'];

export function greetingFor(date, user, seed = date.getDate() + date.getHours()) {
  const h = date.getHours();
  const day = date.getDay();
  const weekday = date.toLocaleDateString('en-GB', {weekday: 'long'});
  let list;
  if (h >= 2 && h < 5) list = lateNight;
  else if (day === 0 || day === 6) list = weekend;
  else if (day === 5 && h >= 17) list = fridayEvening;
  else if (day === 5 && h >= 14) list = fridayAfternoon;
  else if (day === 1 && h >= 5 && h < 12) list = mondayMorning;
  else if (h >= 5 && h < 9) list = earlyMorning;
  else if (h >= 9 && h < 12) list = lateMorning;
  else if (h >= 12 && h < 14) list = lunch;
  else if (h >= 14 && h < 18) list = afternoon;
  else if (h >= 18 && h < 22) list = evening;
  else list = night;
  return pick(list, seed).replaceAll('{user}', user).replaceAll('{day}', weekday);
}
