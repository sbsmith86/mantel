// Fake calendar, seeded in memory. No real calendar account — see CLAUDE.md.
// Four entities only: person, event, assignment, ask.

// telegram_chat_id: all three guardians point at the same test account for
// now (Shae's) — swap in separate people's chat_ids for the real demo
const people = [
  { id: 'dana',  name: 'Dana',  role: 'guardian', telegram_chat_id: 8758977093, flag: null },
  { id: 'sam',   name: 'Sam',   role: 'guardian', telegram_chat_id: 8758977093, flag: null },
  { id: 'alex',  name: 'Alex',  role: 'guardian', telegram_chat_id: 8758977093, flag: null }, // babysitter
  { id: 'maya',  name: 'Maya',  role: 'kid',    telegram_chat_id: null, flag: null },
  { id: 'jonah', name: 'Jonah', role: 'kid',    telegram_chat_id: null, flag: null }
];

// times are 24-hour "HH:MM" strings, zero-padded — sort and compare as plain
// strings, no parsing needed
const events = [
  { id: 'ev-maya-soccer', title: 'Soccer practice', person_id: 'maya',  start: '15:00', end: '15:45', location: 'Kirkwood Field' },
  { id: 'ev-dana-calls',  title: 'Calls',            person_id: 'dana',  start: '16:00', end: '16:30', location: 'Home office' },
  { id: 'ev-sam-work',    title: 'Office',           person_id: 'sam',   start: '09:00', end: '18:00', location: 'Office' },
  { id: 'ev-alex-class',  title: 'Class',            person_id: 'alex',  start: '09:00', end: '15:30', location: 'Campus' },
  { id: 'ev-jonah-home',  title: 'Home',             person_id: 'jonah', start: '15:00', end: '18:00', location: 'Home' }
];

const assignments = [
  { id: 'asg-maya-pickup', event_id: 'ev-maya-soccer', person_id: 'dana', kind: 'pickup', status: 'assigned' }
];

// current: { id, event_id, text, reason, asked: [personId], status } or null
// resolved: { text, why } set right after a tap resolves current — shows the
// wall's "settled" tone until the next real delta re-evaluates from scratch
const ask = { current: null, resolved: null };

// mutable: what the wall's trace line says, and whether it's "live"
const status = { trace: 'Watching the calendar.', live: false };

module.exports = { people, events, assignments, ask, status };
