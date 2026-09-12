// Pure functions that derive the wall's `world` JSON from the seed data.
// No conflict logic yet (that's issue #3) — status lines just describe
// each person's first event today.

const { people, events, ask } = require('../data/seed');

// "15:45" -> "3:45pm"
function fmt(hhmm) {
  const [hStr, mStr] = hhmm.split(':');
  const h24 = parseInt(hStr, 10);
  const ampm = h24 >= 12 ? 'pm' : 'am';
  let h = h24 % 12; if (h === 0) h = 12;
  return `${h}:${mStr}${ampm}`;
}

function describeEvent(person, e) {
  if (!e) return person.role === 'kid' ? 'No events today' : 'Free';
  if (person.role === 'kid') return `${e.title} until ${fmt(e.end)}, ${e.location}`;
  return `${e.title} until ${fmt(e.end)}`;
}

function buildWorld() {
  const peopleView = people.map(p => {
    const evs = events.filter(e => e.person_id === p.id).sort((a, b) => a.start.localeCompare(b.start));
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
