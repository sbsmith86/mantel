const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildWorld } = require('./api/world');

const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'frontend', 'dist');

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
