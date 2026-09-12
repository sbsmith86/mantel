// Polls the calendar every 10s (see CLAUDE.md), diffs against last-known
// state on start/end/location only, and re-evaluates the day on any delta.
// Right now "the calendar" is the in-memory fake in data/seed.js — same
// shape as a real one, so this is the seam issue #5 swaps later.

const { events, people, ask } = require('../data/seed');
const { evaluateDay } = require('./conflict');
const { notifyAsk } = require('./telegram');

const POLL_MS = 10000;

let lastKnownState = {};
let lastNotifiedAskId = null;

function snapshot() {
  const s = {};
  for (const e of events) s[e.id] = { start: e.start, end: e.end, location: e.location };
  return s;
}

function changed(before, after) {
  return Object.keys(after).some(id => {
    const b = before[id];
    const a = after[id];
    return !b || b.start !== a.start || b.end !== a.end || b.location !== a.location;
  });
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

function checkForChanges() {
  const now = snapshot();
  if (changed(lastKnownState, now)) {
    evaluateDay();
    notifyIfNewAsk();
  }
  lastKnownState = now;
}

function startPolling() {
  lastKnownState = snapshot();
  evaluateDay(); // establish initial ask/status/flags
  setInterval(checkForChanges, POLL_MS);
}

module.exports = { startPolling, checkForChanges };
