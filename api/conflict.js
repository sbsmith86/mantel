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
  ask.resolved = null;

  const guardians = people.filter(p => p.role === 'guardian');
  let openAsk = null;

  // only kids with an assignment need coverage — a kid event with no
  // assignment (e.g. "at home") needs none. Keyed on the kid's person_id,
  // not a specific event_id, so it survives swapping calendar sources
  // (real calendar event IDs won't match our seeded ones)
  for (const assignment of assignments) {
    const kidEvent = events.find(e => e.person_id === assignment.kid_person_id);
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

// A guardian tapped "I've got it" on the current ask. Assigns them to cover
// the event, clears the ask, and leaves a brief "settled" message for the
// wall. Idempotent: a stale/duplicate tap (ask already resolved) is a no-op.
function resolveAsk(personId) {
  const current = ask.current;
  if (!current) return { ok: false, reason: 'no open ask' };
  if (!current.asked.includes(personId)) return { ok: false, reason: 'not asked' };

  const person = people.find(p => p.id === personId);
  const kidEvent = events.find(e => e.id === current.event_id);
  const kid = people.find(p => p.id === kidEvent.person_id);

  let a = assignments.find(x => x.kid_person_id === kidEvent.person_id);
  if (!a) {
    a = { id: 'asg-' + kidEvent.person_id, kid_person_id: kidEvent.person_id, person_id: personId, kind: 'pickup', status: 'assigned' };
    assignments.push(a);
  } else {
    a.person_id = personId;
    a.status = 'assigned';
  }

  people.forEach(p => { p.flag = null; });
  person.flag = 'fixed';
  kid.flag = 'fixed';

  ask.current = null;
  ask.resolved = { text: `${person.name} is getting ${kid.name}`, why: `${person.name} answered on Telegram.` };
  status.trace = `${person.name} answered. Calendar updated.`;
  status.live = false;

  return { ok: true, person, kid };
}

module.exports = { evaluateDay, resolveAsk, isFreeAt, freeRank };
