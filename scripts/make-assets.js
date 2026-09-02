/* ═══════════════════════════════════════════════════════════
   Genera los assets de marca a partir de las fotos originales.

       npm run assets

   Produce:
     · assets/img/og.jpg          1200×630, imagen para compartir
     · favicon.ico                32×32
     · assets/img/icon-192.png    icono PWA
     · assets/img/icon-512.png    icono PWA
     · assets/img/apple-touch.png 180×180, iOS

   La imagen OG se renderiza con Chrome desde assets/og-template.html,
   así sale con la tipografía y los colores reales del sitio.
   Requiere: npm i -D sharp puppeteer-core
   ═══════════════════════════════════════════════════════════ */
const fs   = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const IMG  = path.join(ROOT, 'assets', 'img');

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

function findChrome() {
  return CHROME_PATHS.find(p => fs.existsSync(p));
}

/* ── Iconos ─────────────────────────────────────────────── */
async function icons(sharp) {
  // Recorte cuadrado centrado en el rostro de la foto original.
  const src = path.join(ROOT, 'image.jpg');
  const base = fs.existsSync(src) ? src : path.join(IMG, 'janny-avatar.jpg');
  const meta = await sharp(base).metadata();

  let pipeline = sharp(base);
  if (meta.width >= 1900) {
    pipeline = pipeline.extract({ left: 350, top: 150, width: 1500, height: 1500 });
  }
  const square = await pipeline.resize(512, 512, { fit: 'cover' }).toBuffer();

  const out = [
    ['icon-512.png',    512],
    ['icon-192.png',    192],
    ['apple-touch.png', 180],
  ];
  for (const [name, size] of out) {
    await sharp(square).resize(size, size).png({ quality: 90 }).toFile(path.join(IMG, name));
    console.log('  ✓ assets/img/' + name);
  }
  // favicon.ico: un PNG de 32×32 renombrado — los navegadores lo aceptan
  await sharp(square).resize(32, 32).png().toFile(path.join(ROOT, 'favicon.ico'));
  console.log('  ✓ favicon.ico');
}

/* ── Imagen para compartir (Open Graph) ─────────────────── */
async function ogImage(sharp, puppeteer, chrome) {
  // Servidor mínimo para que la plantilla pueda cargar la foto
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, 'assets', decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(path.join(ROOT, 'assets')) || !fs.existsSync(file)) {
      res.writeHead(404); return res.end();
    }
    const ext = path.extname(file);
    res.writeHead(200, {
      'Content-Type': ext === '.html' ? 'text/html; charset=utf-8'
                    : ext === '.webp' ? 'image/webp' : 'image/jpeg',
    });
    fs.createReadStream(file).pipe(res);
  });

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const browser = await puppeteer.launch({
    executablePath: chrome, headless: 'new', args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${port}/og-template.html`, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 600));

  const png = await page.screenshot({ type: 'png' });
  await browser.close();
  server.close();

  await sharp(png).resize(1200, 630).jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(IMG, 'og.jpg'));
  console.log('  ✓ assets/img/og.jpg  (1200×630)');
}

/* ── Main ───────────────────────────────────────────────── */
(async () => {
  let sharp, puppeteer;
  try {
    sharp = require('sharp');
    puppeteer = require('puppeteer-core');
  } catch (_) {
    console.error('\n  Faltan dependencias. Instálalas con:');
    console.error('    npm i -D sharp puppeteer-core\n');
    process.exit(1);
  }

  const chrome = findChrome();
  if (!chrome) {
    console.error('\n  No se encontró Chrome ni Edge. Añade la ruta a CHROME_PATHS.\n');
    process.exit(1);
  }

  console.log('\n  Generando assets…\n');
  await icons(sharp);
  await ogImage(sharp, puppeteer, chrome);
  console.log('\n  Listo.\n');
})().catch(err => {
  console.error('\n  Error:', err.message, '\n');
  process.exit(1);
});
