// Pure functions that derive the wall's `world` JSON from the seed data.
// No conflict logic yet (that's issue #3) — status lines just describe
// each person's first event today.

const { people, events, ask } = require('./seed');

function fmt(mins) {
  let h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')}${ampm}`;
}

function describeEvent(person, e) {
  if (!e) return person.role === 'kid' ? 'No events today' : 'Free';
  if (person.role === 'kid') return `${e.title} until ${fmt(e.end)}, ${e.location}`;
  return `${e.title} until ${fmt(e.end)}`;
}

function buildWorld() {
  const peopleView = people.map(p => {
    const evs = events.filter(e => e.person_id === p.id).sort((a, b) => a.start - b.start);
    return { id: p.id, name: p.name, state: describeEvent(p, evs[0]), flag: null };
  });

  return {
    today: 'Today',
    people: peopleView,
    ask: ask.current,
    trace: 'Watching the calendar.',
    live: false
  };
}

module.exports = { fmt, describeEvent, buildWorld };
