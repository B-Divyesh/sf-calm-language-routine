import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'dist');
const port = 4173;
const spaRoutes = new Set(['/', '/demo', '/cards', '/plan', '/shelf', '/about']);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8'
};
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self' https://api.sociobot.in; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};
let serviceWorkerRevision = 0;

function send(response, status, body, headers = {}) {
  response.writeHead(status, { ...securityHeaders, ...headers });
  response.end(body);
}

async function staticFile(pathname) {
  const clean = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let target = join(root, clean);
  try {
    if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
    return { body: await readFile(target), target };
  } catch {
    return null;
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  if (request.method === 'POST' && url.pathname === '/__test/service-worker-update') {
    serviceWorkerRevision += 1;
    send(response, 204, '');
    return;
  }

  if (url.pathname === '/sw.js') {
    const source = await readFile(join(root, 'sw.js'), 'utf8');
    const revised = source.replace('quiet-loop-v2', `quiet-loop-v2-test-${serviceWorkerRevision}`);
    send(response, 200, revised, { 'Content-Type': types['.js'], 'Cache-Control': 'no-cache' });
    return;
  }

  let file = await staticFile(url.pathname);
  let statusCode = 200;
  if (!file && spaRoutes.has(url.pathname.replace(/\/$/, '') || '/')) file = await staticFile('/index.html');
  if (!file) {
    file = await staticFile('/404.html');
    statusCode = 404;
  }
  const extension = extname(file.target);
  const cache = url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=30, must-revalidate';
  send(response, statusCode, request.method === 'HEAD' ? '' : file.body, { 'Content-Type': types[extension] || 'application/octet-stream', 'Cache-Control': cache });
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`Quiet Loop test server listening on ${port}\n`);
});
