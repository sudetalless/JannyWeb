/* ═══════════════════════════════════════════════════════════
   Cambia el dominio del sitio en todos los archivos de una vez.

       npm run domain https://jannyvazquez.com

   Las etiquetas Open Graph, el canonical, el sitemap y robots.txt
   necesitan URLs absolutas. Este script las reescribe todas para
   que no quede ninguna apuntando al dominio viejo.

   Después de correrlo:
     1. vercel --prod
     2. En Vercel → Settings → Domains, añade el dominio nuevo
     3. Deja el .vercel.app redirigiendo al dominio (no duplicado)
   ═══════════════════════════════════════════════════════════ */
const fs   = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..');
const FILES = ['index.html', 'sitemap.xml', 'robots.txt', 'README.md'];

const raw = process.argv[2];
if (!raw) {
  console.error('\n  Uso:  npm run domain https://tudominio.com\n');
  process.exit(1);
}

let next;
try {
  next = new URL(raw.includes('://') ? raw : 'https://' + raw);
} catch (_) {
  console.error('\n  «' + raw + '» no es una URL válida.\n');
  process.exit(1);
}
if (next.protocol !== 'https:') {
  console.error('\n  Usa https:// — los buscadores y Open Graph lo esperan.\n');
  process.exit(1);
}

const base = next.origin;                       // https://ejemplo.com (sin barra final)

// Detecta el dominio actual desde el canonical
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const m = html.match(/<link rel="canonical" href="(https?:\/\/[^/"]+)/);
if (!m) {
  console.error('\n  No encontré el <link rel="canonical"> en index.html.\n');
  process.exit(1);
}
const current = m[1];

if (current === base) {
  console.log('\n  El sitio ya usa ' + base + '. Nada que cambiar.\n');
  process.exit(0);
}

console.log('\n  ' + current + '\n    →  ' + base + '\n');

let total = 0;
for (const file of FILES) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) continue;

  const before = fs.readFileSync(p, 'utf8');
  const hits   = before.split(current).length - 1;
  if (!hits) { console.log('  = ' + file.padEnd(14) + ' sin cambios'); continue; }

  fs.writeFileSync(p, before.split(current).join(base));
  console.log('  ✓ ' + file.padEnd(14) + hits + (hits === 1 ? ' cambio' : ' cambios'));
  total += hits;
}

// El sitemap lleva fecha de última modificación
const sm = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(sm)) {
  const hoy = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8')
    .replace(/<lastmod>[^<]*<\/lastmod>/, '<lastmod>' + hoy + '</lastmod>'));
}

console.log('\n  ' + total + ' URLs actualizadas.');
console.log('  Siguiente paso:  vercel --prod  y añadir el dominio en Vercel → Settings → Domains.\n');
