/* ═══════════════════════════════════════════════════════════
   Servidor de desarrollo — sirve los archivos estáticos Y
   ejecuta las funciones de /api, igual que Vercel en producción.

       npm run dev   →   http://localhost:3000

   Sin dependencias. Solo para desarrollo local.
   ═══════════════════════════════════════════════════════════ */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.xml':  'application/xml; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

  /* ── Rutas de API ───────────────────────────────────────── */
  if (pathname.startsWith('/api/')) {
    const name = pathname.slice(5).replace(/\.js$/, '');
    const file = path.join(ROOT, 'api', name + '.js');

    if (!file.startsWith(path.join(ROOT, 'api')) || !fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end('{"error":"not found"}');
    }

    // Polyfill de lo que Vercel añade al response
    res.status = code => { res.statusCode = code; return res; };

    try {
      delete require.cache[require.resolve(file)];   // recarga en caliente
      const t = Date.now();
      await require(file)(req, res);
      console.log(`  api ${pathname} → ${res.statusCode} (${Date.now() - t}ms)`);
    } catch (err) {
      console.error('  api error:', err);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
    return;
  }

  /* ── Archivos estáticos ─────────────────────────────────── */
  let rel = pathname === '/' ? '/index.html' : pathname;
  let file = path.normalize(path.join(ROOT, rel));

  if (!file.startsWith(ROOT)) {                    // path traversal
    res.writeHead(403); return res.end('Forbidden');
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) {                      // cleanUrls: /algo → /algo.html
    if (fs.existsSync(file + '.html')) file += '.html';
    else {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>404</h1><p>No existe <code>' + rel + '</code></p>');
    }
  }

  res.writeHead(200, {
    'Content-Type':  MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log('\n  Janny Vázquez — servidor de desarrollo');
  console.log('  ──────────────────────────────────────');
  console.log('  Sitio       http://localhost:' + PORT);
  console.log('  API         http://localhost:' + PORT + '/api/social');
  console.log('  Tipografías http://localhost:' + PORT + '/preview-fonts.html\n');
});
