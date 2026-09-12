// Pure functions that derive the wall's `world` JSON from the seed data.
// Conflict evaluation itself lives in api/conflict.js — this just shapes
// whatever it produced into what the wall renders.

const { people, events, assignments, ask, status } = require('../data/seed');

// "15:45" -> "3:45pm"
function fmt(hhmm) {
  const [hStr, mStr] = hhmm.split(':');
  const h24 = parseInt(hStr, 10);
  const ampm = h24 >= 12 ? 'pm' : 'am';
  let h = h24 % 12; if (h === 0) h = 12;
  return `${h}:${mStr}${ampm}`;
}

// shows who's on the hook for pickup *before* anything breaks — otherwise a
// conflict looks like it comes from nowhere, since nothing else on the wall
// says a guardian was ever expected to cover this
function describeEvent(person, e) {
  if (!e) return person.role === 'kid' ? 'No events today' : 'Free';

  if (person.role === 'kid') {
    // suppressed during an open conflict — the ask banner already says
    // coverage is broken, so restating the (now-stale) assignment here
    // would contradict it
    let coverNote = '';
    if (person.flag !== 'true') {
      const assignment = assignments.find(a => a.kid_person_id === person.id);
      const covering = assignment && people.find(p => p.id === assignment.person_id);
      if (covering) coverNote = ` — ${covering.name}'s got pickup`;
    }
    return `${e.title} until ${fmt(e.end)}, ${e.location}${coverNote}`;
  }

  return `${e.title} until ${fmt(e.end)}`;
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
}

function buildAsk() {
  if (ask.current) return { tone: 'open', kicker: 'Needs a person', line: ask.current.text, why: ask.current.reason };
  if (ask.resolved) return { tone: 'settled', kicker: 'Handled', line: ask.resolved.text, why: ask.resolved.why };
  return null;
}

function buildWorld() {
  const peopleView = people.map(p => {
    const evs = events.filter(e => e.person_id === p.id).sort((a, b) => a.start.localeCompare(b.start));
    return { id: p.id, name: p.name, role: p.role, state: describeEvent(p, evs[0]), flag: p.flag };
  });

  return {
    today: todayLabel(),
    people: peopleView,
    ask: buildAsk(),
    trace: status.trace,
    live: status.live
  };
}

module.exports = { fmt, describeEvent, buildWorld };
