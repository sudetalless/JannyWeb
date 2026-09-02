/* ═══════════════════════════════════════════════════════════
   Refresca los números "de respaldo" con los datos reales.

       npm run refresh

   Lee el perfil público de TikTok y reescribe:
     · api/social.js  →  const FALLBACK
     · index.html     →  cada data-to con data-live
     · README.md      →  la tabla de datos verificados

   Esos valores solo se ven si la API falla, pero conviene
   mantenerlos al día para que nunca se muestre algo viejo.
   ═══════════════════════════════════════════════════════════ */
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const USER = 'jannypsico';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function compact(n) {
  const trim = t => t.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  if (n >= 1e6) return trim((n / 1e6).toFixed(2)) + 'M';
  if (n >= 1e3) return trim((n / 1e3).toFixed(1)) + 'K';
  return String(Math.round(n));
}

(async () => {
  console.log(`\n  Leyendo @${USER} …`);

  const res  = await fetch(`https://www.tiktok.com/@${USER}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' },
  });
  const html = await res.text();

  const m = html.match(
    /id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!m) throw new Error('TikTok no devolvió el bloque de datos.');

  const info = (JSON.parse(m[1])['__DEFAULT_SCOPE__'] || {})['webapp.user-detail']?.userInfo;
  if (!info) throw new Error(`El perfil @${USER} no está disponible.`);

  const s2 = info.statsV2 || {};
  const s1 = info.stats   || {};
  const num = (a, b) => parseInt(a, 10) || b || 0;

  const stats = {
    followers: num(s2.followerCount, s1.followerCount),
    likes:     num(s2.heartCount,    s1.heartCount),
    videos:    num(s2.videoCount,    s1.videoCount),
  };

  if (!stats.followers) throw new Error('Vinieron números vacíos; no se toca nada.');

  console.log(`  seguidores ${stats.followers.toLocaleString('es')}`);
  console.log(`  me gusta   ${stats.likes.toLocaleString('es')}`);
  console.log(`  videos     ${stats.videos}\n`);

  const edit = (file, fn) => {
    const p = path.join(ROOT, file);
    const before = fs.readFileSync(p, 'utf8');
    const after  = fn(before);
    if (before === after) { console.log(`  = ${file} (sin cambios)`); return; }
    fs.writeFileSync(p, after);
    console.log(`  ✓ ${file}`);
  };

  // api/social.js → FALLBACK
  edit('api/social.js', s => s.replace(
    /const FALLBACK = \{[^}]*\};/,
    `const FALLBACK = { followers: ${stats.followers}, likes: ${stats.likes}, videos: ${stats.videos} };`
  ));

  // index.html → data-to + texto visible de cada contador en vivo
  edit('index.html', s => s.replace(
    /data-to="\d+"([^>]*?)data-live="tiktok\.(followers|likes|videos)"([^>]*)>([^<]*)</g,
    (_, mid, key, rest, _txt) => {
      const v = stats[key];
      const shown = /data-fmt="compact"/.test(mid + rest) ? compact(v) : String(v);
      return `data-to="${v}"${mid}data-live="tiktok.${key}"${rest}>${shown}<`;
    }
  ));

  // README.md → tabla de datos verificados
  const hoy = new Date().toISOString().slice(0, 10);
  edit('README.md', s => s
    .replace(/Leídos del perfil público el \d{4}-\d{2}-\d{2}:/,
             `Leídos del perfil público el ${hoy}:`)
    .replace(/\| Seguidores \| [^|]*\|/, `| Seguidores | ~${compact(stats.followers)} |`)
    .replace(/\| Me gusta \| [^|]*\|/,   `| Me gusta | ~${compact(stats.likes)} |`)
    .replace(/\| Videos \| [^|]*\|/,     `| Videos | ${stats.videos} |`)
  );

  console.log('\n  Listo.\n');
})().catch(err => {
  console.error('\n  Error:', err.message);
  console.error('  No se modificó ningún archivo.\n');
  process.exit(1);
});
