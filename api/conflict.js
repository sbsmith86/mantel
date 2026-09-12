// The one conflict rule (see CLAUDE.md): a kid's event ends at time T at
// location L, no guardian is free at T. Rank candidate guardians by who's
// free soonest, ask the top two. Re-evaluates the whole day from scratch —
// never patches state incrementally.

const { people, events, assignments, ask, status } = require('../data/seed');
const { fmt } = require('./world');

function isFreeAt(personId, T) {
  return !events.some(e => e.person_id === personId && e.start <= T && T < e.end);
}

// if free at T, ranks first (T itself); otherwise ranks by when their
// conflicting event ends — soonest-free sorts first
function freeRank(personId, T) {
  const blocking = events.find(e => e.person_id === personId && e.start <= T && T < e.end);
  return blocking ? blocking.end : T;
}

function evaluateDay() {
  people.forEach(p => { p.flag = null; });

  const guardians = people.filter(p => p.role === 'guardian');
  let openAsk = null;

  // only events with an assignment represent an expected pickup/dropoff —
  // a kid event with no assignment (e.g. "at home") needs no coverage
  for (const assignment of assignments) {
    const kidEvent = events.find(e => e.id === assignment.event_id);
    if (!kidEvent) continue;
    const T = kidEvent.end;

    if (isFreeAt(assignment.person_id, T)) continue; // covered, no conflict

    const ranked = guardians
      .map(g => ({ person: g, rank: freeRank(g.id, T) }))
      .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0))
      .slice(0, 2);

    const kid = people.find(p => p.id === kidEvent.person_id);
    kid.flag = 'true';
    ranked.forEach(r => { r.person.flag = 'true'; });

    const assigned = people.find(p => p.id === assignment.person_id);
    const reason = `The event changed. ${assigned.name} is unavailable until ${fmt(freeRank(assigned.id, T))}.`;

    openAsk = {
      id: 'ask-' + kidEvent.id,
      event_id: kidEvent.id,
      text: `Nobody is covering ${kid.name}'s pickup at ${fmt(T)}`,
      reason,
      asked: ranked.map(r => r.person.id),
      status: 'open'
    };
    break; // at most one open ask
  }

  ask.current = openAsk;

  if (openAsk) {
    const names = openAsk.asked.map(id => people.find(p => p.id === id).name).join(' and ');
    status.trace = `Asked ${names}. Waiting.`;
    status.live = true;
  } else {
    status.trace = 'Watching the calendar.';
    status.live = false;
  }
}

module.exports = { evaluateDay, isFreeAt, freeRank };
