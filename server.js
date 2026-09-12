const http = require('http');
const fs = require('fs');
const path = require('path');

// load .env into process.env — no dependency, just a few lines
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
})();

const { buildWorld } = require('./api/world');
const { startPolling, checkForChanges, resetPolling } = require('./api/poller');
const { evaluateDay, resolveAsk } = require('./api/conflict');
const { pollUpdates, clearKeyboards, answerCallback, resetMessageRefs } = require('./api/telegram');
const { events, people, reset } = require('./data/seed');

const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'frontend', 'dist');
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(urlPath, res) {
  const hasExtension = path.extname(urlPath) !== '';
  const filePath = path.join(DIST_DIR, hasExtension ? urlPath : 'index.html');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found — did you run `npm run build` in frontend/?');
      return;
    }
    const type = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/world') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildWorld()));
    return;
  }

  // debug-only: simulates an external calendar edit, since there's no real
  // calendar source yet (issue #5). Not part of the real interface.
  if (req.method === 'POST' && url.pathname === '/debug/move-event') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let patch;
      try { patch = JSON.parse(body || '{}'); } catch { res.writeHead(400); res.end('bad json'); return; }

      const e = events.find(ev => ev.id === patch.id);
      if (!e) { res.writeHead(404); res.end('unknown event id'); return; }
      if (patch.start != null) e.start = patch.start;
      if (patch.end != null) e.end = patch.end;
      if (patch.location != null) e.location = patch.location;

      checkForChanges(); // re-evaluate now instead of waiting up to 10s
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(buildWorld()));
    });
    return;
  }

  // debug-only: lets you find a chat_id to put in data/seed.js without ever
  // exposing the bot token — the token stays server-side, only the parsed
  // results come back. Message the bot first, then hit this.
  if (req.method === 'GET' && url.pathname === '/debug/telegram-updates') {
    if (!TELEGRAM_TOKEN) { res.writeHead(500); res.end('TELEGRAM_BOT_TOKEN not set in .env'); return; }
    fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`)
      .then(r => r.json())
      .then(data => {
        const messages = (data.result || [])
          .filter(u => u.message)
          .map(u => ({
            chat_id: u.message.chat.id,
            name: u.message.chat.first_name || u.message.chat.username,
            text: u.message.text
          }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(messages, null, 2));
      })
      .catch(err => { res.writeHead(500); res.end('telegram request failed: ' + err.message); });
    return;
  }

  // debug-only: restores the seed data to its original state without
  // restarting the process — lets you rehearse the demo repeatedly
  if (req.method === 'POST' && url.pathname === '/debug/reset') {
    reset();
    resetPolling();
    resetMessageRefs();
    evaluateDay();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildWorld()));
    return;
  }

  if (req.method === 'GET') {
    serveStatic(url.pathname, res);
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`Mantel backend on http://localhost:${PORT}`);
});

startPolling();

async function handleCallback(cb) {
  // the tapped button names exactly who it's for — that's the identity that
  // matters, not just which Telegram account sent the tap (multiple
  // guardians can share one account during testing)
  const [action, , personId] = cb.data.split(':');
  const person = people.find(p => p.id === personId);
  if (!person) { await answerCallback(TELEGRAM_TOKEN, cb.id, 'Not recognized.'); return; }
  if (person.telegram_chat_id !== cb.from.id) { await answerCallback(TELEGRAM_TOKEN, cb.id, 'Not recognized.'); return; }

  if (action === 'resolve') {
    const result = resolveAsk(person.id);
    if (result.ok) {
      await clearKeyboards(TELEGRAM_TOKEN, `✅ ${result.person.name} is getting ${result.kid.name}.`);
      await answerCallback(TELEGRAM_TOKEN, cb.id, 'Got it — thanks!');
    } else {
      await answerCallback(TELEGRAM_TOKEN, cb.id, 'Already handled.');
    }
    return;
  }

  if (action === 'decline') {
    // leaves the ask open — CLAUDE.md: a decline must not silently resolve it
    await answerCallback(TELEGRAM_TOKEN, cb.id, 'Thanks for letting us know.');
  }
}

if (TELEGRAM_TOKEN) {
  pollUpdates(TELEGRAM_TOKEN, handleCallback);
} else {
  console.warn('TELEGRAM_BOT_TOKEN not set in .env — Telegram is disabled, everything else still works');
}
