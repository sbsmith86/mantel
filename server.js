const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// ---- data model: person, event, assignment, ask (per CLAUDE.md) ----

const people = [
  { id: 'dana',  name: 'Dana',  role: 'parent', telegram_chat_id: null },
  { id: 'sam',   name: 'Sam',   role: 'parent', telegram_chat_id: null },
  { id: 'maya',  name: 'Maya',  role: 'kid',    telegram_chat_id: null },
  { id: 'jonah', name: 'Jonah', role: 'kid',    telegram_chat_id: null }
];

// times are minutes since midnight
let events = [
  { id: 'ev-maya-soccer', title: 'Soccer practice', person_id: 'maya',  start: 900, end: 945,  location: 'Kirkwood Field' },
  { id: 'ev-dana-calls',  title: 'Calls',            person_id: 'dana',  start: 840, end: 990,  location: 'Home office' },
  { id: 'ev-sam-work',    title: 'Office',           person_id: 'sam',   start: 540, end: 1080, location: 'Office' },
  { id: 'ev-jonah-home',  title: 'Home',             person_id: 'jonah', start: 900, end: 1080, location: 'Home' }
];

let assignments = [
  { id: 'asg-maya-pickup', event_id: 'ev-maya-soccer', person_id: 'dana', kind: 'pickup', status: 'assigned' }
];

let currentAsk = null; // { id, event_id, text, reason, asked: [personId], status }

// ---- no conflict logic yet (that's issue #3) — status lines are a direct
// description of each person's first event today ----

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
    ask: currentAsk,
    trace: 'Watching the calendar.',
    live: false
  };
}

// ---- HTTP server ----

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/world') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildWorld()));
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/wall.html')) {
    const file = path.join(__dirname, 'wall.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(500); res.end('could not load wall.html'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`Mantel backend on http://localhost:${PORT}`);
});
