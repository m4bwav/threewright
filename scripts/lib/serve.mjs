// Static file server so module pages load over http (Chrome blocks ES module
// imports from file:// URLs). Serves one root folder on a free localhost port.

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.map': 'application/json',
  '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ktx2': 'image/ktx2', '.hdr': 'application/octet-stream', '.exr': 'application/octet-stream',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.obj': 'text/plain', '.stl': 'model/stl', '.ply': 'application/octet-stream', '.csv': 'text/csv',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
};

export function contentType(file) {
  return TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
}

// Resolve a request path inside root; returns null when it escapes the root.
export function safeJoin(root, urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const full = normalize(join(root, clean));
  const r = resolve(root);
  if (full !== r && !full.startsWith(r.endsWith(sep) ? r : r + sep)) return null;
  return full;
}

export function serve(root) {
  const server = createServer((req, res) => {
    let file = safeJoin(root, req.url || '/');
    if (!file) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file) && /\/favicon\.ico$/.test(req.url || '')) { res.writeHead(204).end(); return; }
    if (!existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
    res.writeHead(200, {
      'content-type': contentType(file),
      'cache-control': 'no-store',
      // Needed for SharedArrayBuffer users (some physics and decoder builds).
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-embedder-policy': 'credentialless',
    });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolveP) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolveP({ url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}
