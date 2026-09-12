// Pure functions that derive the wall's `world` JSON from the seed data.
// Conflict evaluation itself lives in api/conflict.js — this just shapes
// whatever it produced into what the wall renders.

const { people, events, ask, status } = require('../data/seed');

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

function buildAsk() {
  if (ask.current) return { tone: 'open', kicker: 'Needs a person', line: ask.current.text, why: ask.current.reason };
  if (ask.resolved) return { tone: 'settled', kicker: 'Handled', line: ask.resolved.text, why: ask.resolved.why };
  return null;
}

function buildWorld() {
  const peopleView = people.map(p => {
    const evs = events.filter(e => e.person_id === p.id).sort((a, b) => a.start.localeCompare(b.start));
    return { id: p.id, name: p.name, state: describeEvent(p, evs[0]), flag: p.flag };
  });

  return {
    today: 'Today',
    people: peopleView,
    ask: buildAsk(),
    trace: status.trace,
    live: status.live
  };
}

module.exports = { fmt, describeEvent, buildWorld };
