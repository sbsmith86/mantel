// Fake calendar, seeded in memory. No real calendar account — see CLAUDE.md.
// Four entities only: person, event, assignment, ask.

const people = [
  { id: 'dana',  name: 'Dana',  role: 'parent', telegram_chat_id: null },
  { id: 'sam',   name: 'Sam',   role: 'parent', telegram_chat_id: null },
  { id: 'maya',  name: 'Maya',  role: 'kid',    telegram_chat_id: null },
  { id: 'jonah', name: 'Jonah', role: 'kid',    telegram_chat_id: null }
];

// times are minutes since midnight
const events = [
  { id: 'ev-maya-soccer', title: 'Soccer practice', person_id: 'maya',  start: 900, end: 945,  location: 'Kirkwood Field' },
  { id: 'ev-dana-calls',  title: 'Calls',            person_id: 'dana',  start: 840, end: 990,  location: 'Home office' },
  { id: 'ev-sam-work',    title: 'Office',           person_id: 'sam',   start: 540, end: 1080, location: 'Office' },
  { id: 'ev-jonah-home',  title: 'Home',             person_id: 'jonah', start: 900, end: 1080, location: 'Home' }
];

const assignments = [
  { id: 'asg-maya-pickup', event_id: 'ev-maya-soccer', person_id: 'dana', kind: 'pickup', status: 'assigned' }
];

// mutable: { id, event_id, text, reason, asked: [personId], status } or null
const ask = { current: null };

module.exports = { people, events, assignments, ask };
