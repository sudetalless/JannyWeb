/* ═══════════════════════════════════════════════════════════
   /api/social  —  Vercel Serverless Function
   Devuelve estadísticas públicas en vivo de TikTok y YouTube.

   · No usa API keys: lee la página pública del perfil.
   · Se cachea en el edge de Vercel (30 min) para no golpear TikTok
     en cada visita.
   · Si el scraping falla, responde con FALLBACK y ok:false — la web
     nunca se rompe, solo muestra el último número conocido.

   Endpoint local:  npm run dev  →  http://localhost:3000/api/social
   ═══════════════════════════════════════════════════════════ */

const TIKTOK_USER   = 'jannypsico';
const YT_HANDLE     = 'psicojannyy';
const YT_CHANNEL_ID = 'UCDzSqW143IYEdeBMtvVzWOg';

/* Último dato verificado — se usa solo si TikTok no responde. */
const FALLBACK = { followers: 48286, likes: 1034083, videos: 28 };

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function get(url, ms = 7000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(url, {
    signal: ctl.signal,
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
  }).finally(() => clearTimeout(t));
}

/* ── TikTok ───────────────────────────────────────────────── */
async function tiktok() {
  const res  = await get(`https://www.tiktok.com/@${TIKTOK_USER}`);
  const html = await res.text();

  const m = html.match(
    /id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!m) throw new Error('sin bloque de datos');

  const scope = JSON.parse(m[1])['__DEFAULT_SCOPE__'] || {};
  const info  = (scope['webapp.user-detail'] || {}).userInfo;
  if (!info) throw new Error('perfil no disponible');

  // statsV2 trae los números exactos como string; stats los redondea.
  const s2 = info.statsV2 || {};
  const s1 = info.stats   || {};
  const n  = (a, b) => parseInt(a, 10) || b || 0;

  return {
    handle:    TIKTOK_USER,
    nickname:  info.user?.nickname || 'Janny | Psicología',
    bio:       info.user?.signature || '',
    avatar:    info.user?.avatarMedium || info.user?.avatarLarger || '',
    followers: n(s2.followerCount, s1.followerCount),
    likes:     n(s2.heartCount,    s1.heartCount),
    videos:    n(s2.videoCount,    s1.videoCount),
    live:      true,
  };
}

/* ── Videos de TikTok ─────────────────────────────────────────
   La página del perfil no trae la lista de videos (se carga por XHR
   firmado), pero la página de embed sí: expone un "videoList" con id,
   descripción y reproducciones. De ahí salen los IDs para los embeds.  */

// Recorta un array JSON balanceado sin romperse con corchetes dentro de strings.
function sliceArray(str) {
  let depth = 0, inStr = false, esc = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      if (esc)            esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"')  inStr = false;
      continue;
    }
    if (c === '"')      inStr = true;
    else if (c === '[') depth++;
    else if (c === ']') { if (--depth === 0) return str.slice(0, i + 1); }
  }
  return null;
}

async function tiktokVideos() {
  const res  = await get(`https://www.tiktok.com/embed/@${TIKTOK_USER}`, 9000);
  if (!res.ok) return [];
  const html = await res.text();

  // TikTok responde 200 con esta página cuando limita las peticiones.
  if (/overload-protect/i.test(html)) throw new Error('rate limit de TikTok');

  const key = '"videoList":';
  const at  = html.indexOf(key);
  if (at < 0) return [];

  const raw = sliceArray(html.slice(at + key.length));
  if (!raw) return [];

  return JSON.parse(raw)
    .filter(v => v && v.id && !v.privateItem)
    .slice(0, 6)
    .map(v => ({
      id:    String(v.id),
      desc:  (v.desc || '').trim(),
      plays: parseInt(v.playCount, 10) || 0,
      url:   `https://www.tiktok.com/@${TIKTOK_USER}/video/${v.id}`,
    }));
}

/* ── YouTube (feed RSS público, sin API key) ──────────────── */
async function youtube() {
  const out = {
    handle: YT_HANDLE,
    channelId: YT_CHANNEL_ID,
    url: `https://www.youtube.com/@${YT_HANDLE}`,
    videos: [],
  };

  try {
    const res = await get(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`
    );
    // 404 = el canal todavía no tiene videos públicos. No es un error.
    if (!res.ok) return out;

    const xml = await res.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

    out.videos = entries.slice(0, 6).map(e => {
      const pick = re => (e.match(re) || [, ''])[1];
      const id = pick(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      return {
        id,
        title:     pick(/<title>([^<]+)<\/title>/),
        published: pick(/<published>([^<]+)<\/published>/).slice(0, 10),
        views:     parseInt(pick(/views count="(\d+)"/), 10) || null,
        thumb:     `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        url:       `https://www.youtube.com/watch?v=${id}`,
      };
    });
  } catch (_) { /* el canal sigue listándose, solo sin videos */ }

  return out;
}

/* ── Handler ──────────────────────────────────────────────── */
module.exports = async (req, res) => {
  // Cache en el edge: 30 min frescos, 24 h sirviendo el viejo mientras revalida.
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=1800, stale-while-revalidate=86400'
  );
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const [tt, vids, yt] = await Promise.all([
    tiktok().catch(err => ({
      handle: TIKTOK_USER,
      nickname: 'Janny | Psicología',
      ...FALLBACK,
      live: false,
      error: String(err.message || err),
    })),
    tiktokVideos().catch(() => []),
    youtube().catch(() => ({
      handle: YT_HANDLE,
      channelId: YT_CHANNEL_ID,
      url: `https://www.youtube.com/@${YT_HANDLE}`,
      videos: [],
    })),
  ]);

  tt.videoList = vids;

  res.status(200).end(
    JSON.stringify({ ok: tt.live === true, tiktok: tt, youtube: yt, updatedAt: Date.now() })
  );
};
