const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildWorld } = require('./world');

const PORT = 3000;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/world') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildWorld()));
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/wall.html')) {
    const file = path.join(__dirname, '..', 'public', 'wall.html');
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
