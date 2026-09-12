// Polls the calendar every 10s (see CLAUDE.md), diffs against last-known
// state on start/end/location only, and re-evaluates the day on any delta.
// If Google Calendar is connected (issue #5), pulls real events first —
// same `event` shape either way, so conflict.js/world.js don't change.

const { events, people, ask } = require('../data/seed');
const { evaluateDay } = require('./conflict');
const { notifyAsk } = require('./telegram');
const googleCalendar = require('./google-calendar');

const POLL_MS = 10000;

let lastKnownState = {};
let lastNotifiedAskId = null;

function snapshot() {
  const s = {};
  for (const e of events) s[e.id] = { start: e.start, end: e.end, location: e.location };
  return s;
}

function changed(before, after) {
  const beforeIds = Object.keys(before);
  const afterIds = Object.keys(after);
  if (beforeIds.length !== afterIds.length) return true;
  return afterIds.some(id => {
    const b = before[id];
    const a = after[id];
    return !b || b.start !== a.start || b.end !== a.end || b.location !== a.location;
  });
}

// if Google Calendar is connected, replace `events`' contents with what's
// really on the calendar; otherwise leave the fake seed data alone
async function syncFromGoogleIfConnected() {
  if (!googleCalendar.isConnected()) return;
  const fresh = await googleCalendar.fetchTodayEvents(people);
  if (fresh) events.splice(0, events.length, ...fresh);
}

function notifyIfNewAsk() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const current = ask.current;
  if (current && current.id !== lastNotifiedAskId) {
    lastNotifiedAskId = current.id;
    notifyAsk(token, current, people).catch(err => console.error('telegram notify failed:', err.message));
  } else if (!current) {
    lastNotifiedAskId = null; // a future re-occurrence of the same conflict notifies again
  }
}

async function checkForChanges() {
  await syncFromGoogleIfConnected();
  const now = snapshot();
  if (changed(lastKnownState, now)) {
    evaluateDay();
    notifyIfNewAsk();
  }
  lastKnownState = now;
}

async function startPolling() {
  await syncFromGoogleIfConnected();
  lastKnownState = snapshot();
  evaluateDay(); // establish initial ask/status/flags
  setInterval(checkForChanges, POLL_MS);
}

// re-syncs the poller's own bookkeeping after data/seed.js's reset() runs —
// otherwise a stale lastKnownState would look like "no change" next poll
function resetPolling() {
  lastKnownState = snapshot();
  lastNotifiedAskId = null;
}

module.exports = { startPolling, checkForChanges, resetPolling };
