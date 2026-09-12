// Google Calendar as a real calendar source (issue #5) — same `event` shape
// as the fake seed, so nothing downstream (conflict.js, world.js) changes.
// Events must be titled "Name: Title" to be attributed to a seeded person —
// there's no other reliable signal linking a calendar event to a family
// member on one shared Google account.

const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';

function buildAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent'
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function exchangeCodeForTokens(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  });
  const data = await res.json();
  if (data.refresh_token) {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify({ refresh_token: data.refresh_token }, null, 2));
  }
  return data;
}

function isConnected() {
  return fs.existsSync(TOKEN_PATH);
}

function loadRefreshToken() {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')).refresh_token;
}

let cachedAccessToken = null;
let cachedExpiry = 0;

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < cachedExpiry) return cachedAccessToken;

  const refreshToken = loadRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  });
  const data = await res.json();
  if (!data.access_token) { console.error('google token refresh failed:', data.error || data); return null; }

  cachedAccessToken = data.access_token;
  cachedExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedAccessToken;
}

function toHHMM(dateTimeStr) {
  const d = new Date(dateTimeStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// returns null on failure (caller should keep using whatever it already
// has rather than clearing the day out from under a transient API error)
async function fetchTodayEvents(people) {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const params = new URLSearchParams({ timeMin: startOfDay, timeMax: endOfDay, singleEvents: 'true', orderBy: 'startTime' });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await res.json();
  if (!data.items) { console.error('google events fetch failed:', data.error || data); return null; }

  const mapped = [];
  for (const item of data.items) {
    if (!item.start?.dateTime || !item.end?.dateTime) continue; // skip all-day events, no time to conflict-check

    const colonIndex = (item.summary || '').indexOf(':');
    if (colonIndex === -1) continue; // no "Name: Title" prefix, can't attribute to anyone

    const personName = item.summary.slice(0, colonIndex).trim().toLowerCase();
    const person = people.find(p => p.name.toLowerCase() === personName);
    if (!person) continue;

    mapped.push({
      id: item.id,
      title: item.summary.slice(colonIndex + 1).trim(),
      person_id: person.id,
      start: toHHMM(item.start.dateTime),
      end: toHHMM(item.end.dateTime),
      location: item.location || ''
    });
  }
  return mapped;
}

module.exports = { buildAuthUrl, exchangeCodeForTokens, isConnected, fetchTodayEvents };
