# Janny Vázquez — Landing / Portafolio

Sitio estático (HTML + CSS + JS puro, sin build) con **estadísticas en vivo de TikTok**
vía una función serverless de Vercel. Pensado para crecer: hoy es una landing personal,
mañana un portafolio con trabajos, recursos y colaboraciones.

---

## Estructura

```
.
├── index.html            ← toda la página (secciones comentadas)
├── css/styles.css        ← tokens de diseño + estilos por sección
├── js/main.js            ← animaciones e interacciones (14 módulos numerados)
├── api/social.js         ← función serverless: stats en vivo de TikTok + YouTube
├── dev-server.js         ← servidor local que también ejecuta /api (sin dependencias)
├── scripts/
│   ├── refresh-stats.js  ← `npm run refresh`: actualiza los números de respaldo
│   ├── make-assets.js    ← `npm run assets`: iconos + imagen para compartir
│   └── set-domain.js     ← `npm run domain`: cambia el dominio en todos lados
├── robots.txt · sitemap.xml · site.webmanifest · favicon.ico
├── preview-fonts.html    ← comparador de tipografías (excluido del deploy)
├── assets/
│   ├── og-template.html  ← plantilla de la imagen para compartir
│   └── img/              ← retratos, iconos y og.jpg
├── vercel.json           ← headers de caché
└── package.json
```

---

## Correr en local

```bash
npm run dev          # http://localhost:3000
```

Esto levanta `dev-server.js`, que sirve los archivos **y** ejecuta `/api/social`,
igual que Vercel. Así ves los números reales en localhost sin instalar nada.

- Sitio → http://localhost:3000
- API → http://localhost:3000/api/social
- Tipografías → http://localhost:3000/preview-fonts.html

> Con un servidor estático cualquiera (`npx serve`, `python -m http.server`) el sitio
> funciona igual, pero `/api/social` no existe y se muestran los últimos números
> conocidos que están escritos en el HTML.

---

## Subir a Vercel

100 % estático + una función serverless. Sin configuración:

```bash
npm i -g vercel
vercel            # preview
vercel --prod     # producción
```

O conecta el repo en [vercel.com/new](https://vercel.com/new).
**Framework Preset:** `Other` · **Build Command:** vacío · **Output Directory:** `./`

> El enlace en su bio de TikTok ya apunta a `https://jannyvazquez.vercel.app/`.
> Si ese proyecto es tuyo, despliega ahí para no tener que cambiar la bio.

---

## Dominio propio

Las etiquetas Open Graph, el `canonical`, el sitemap y `robots.txt` necesitan **URLs
absolutas**, así que el dominio aparece en varios archivos. Para cambiarlo todo de una vez:

```bash
npm run domain https://jannyvazquez.com
```

Reescribe las 10 URLs repartidas entre `index.html`, `sitemap.xml`, `robots.txt` y este
README, y actualiza la fecha del sitemap. Después:

1. `vercel --prod`
2. Vercel → **Settings → Domains** → añadir el dominio
3. Dejar que `jannyvazquez.vercel.app` **redirija** al dominio nuevo (Vercel lo hace solo).
   Así no quedan dos sitios idénticos compitiendo en Google.
4. Actualizar el enlace de la bio de TikTok, Instagram y YouTube.
5. Dar de alta el sitio en [Google Search Console](https://search.google.com/search-console)
   y enviar `https://tudominio.com/sitemap.xml`.

---

## Etiquetas / SEO

Todo lo que lleva el `<head>`:

| Etiqueta | Para qué |
|---|---|
| `title` + `description` | Lo que se ve en Google |
| `canonical` | Evita que el `.vercel.app` y el dominio propio compitan entre sí |
| `robots` | `max-image-preview:large` → miniatura grande en Google |
| Open Graph (11 etiquetas) | Vista previa en WhatsApp, Facebook, Telegram, Discord |
| Twitter Card (5) | Vista previa en X |
| `theme-color` ×2 | Color de la barra del navegador, claro y oscuro |
| Iconos + `manifest` | Favicon, icono de iOS, «añadir a inicio» |
| **JSON-LD `Person`** | Le dice a Google quién es, dónde estudia y cuáles son sus redes (`sameAs`) |

> ⚠️ Las URLs de `og:image` y `og:url` **deben ser absolutas**. Con rutas relativas la
> vista previa sale en blanco. Por eso existe `npm run domain`.

### Imagen para compartir

`assets/img/og.jpg` (1200×630) se renderiza con Chrome desde `assets/og-template.html`,
así usa la tipografía y los colores reales del sitio:

```bash
npm run assets
```

Ese mismo comando regenera `favicon.ico`, `icon-192.png`, `icon-512.png` y
`apple-touch.png` recortando la foto original. Si cambian los números de la imagen OG,
edita la plantilla y vuelve a correrlo.

**Para comprobar cómo se ve al compartir** (después de publicar):
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Prueba de resultados enriquecidos de Google](https://search.google.com/test/rich-results)

---

## Estadísticas en vivo

`api/social.js` lee la página pública del perfil y extrae seguidores, me gusta y
número de videos. **No usa API keys.**

- Se cachea en el edge de Vercel: `s-maxage=1800` (30 min) + `stale-while-revalidate`.
  Una visita normal no dispara ninguna petición a TikTok.
- Si TikTok cambia su HTML o bloquea la petición, la función responde con `ok:false`
  y los últimos valores conocidos (`FALLBACK` al inicio del archivo). **La web nunca
  se rompe** — simplemente muestra los números escritos en el HTML.
- El indicador «Datos actualizados en vivo» solo aparece cuando la lectura fue real.

Los elementos que se actualizan solos llevan `data-live` en el HTML:

```html
<b class="counter" data-to="48273" data-fmt="compact" data-live="tiktok.followers">48.3K</b>
```

`data-live` es la ruta dentro del JSON de la API (`tiktok.followers`, `tiktok.likes`,
`tiktok.videos`). Para añadir otra métrica basta con ponerle ese atributo.

**Mantenimiento — un solo comando:**

```bash
npm run refresh
```

Lee el perfil real y reescribe los números de respaldo en los tres sitios a la vez:
`FALLBACK` de `api/social.js`, los `data-to` de `index.html` y la tabla de este README.
Si TikTok no responde, no toca ningún archivo. Conviene correrlo antes de cada
`vercel --prod`.

### Videos
- **TikTok:** embeds de **video individual** (`data-video-id`).

  > ⚠️ **No usar el embed de creador** (`data-embed-type="creator"`). TikTok lo limita
  > agresivamente y devuelve `overload-protect triggered` dentro del iframe. Los embeds
  > de video individual no tienen ese problema.

  Los IDs salen de `tiktokVideos()` en `api/social.js`, que lee
  `https://www.tiktok.com/embed/@jannypsico` — esa página sí expone un `videoList` con
  id, descripción y reproducciones (la página del perfil no lo trae).

  `index.html` lleva 3 IDs de respaldo escritos a mano. Al acercarse la sección, el
  módulo 12 espera la respuesta de la API, sustituye los blockquotes por los videos más
  recientes y **recién entonces** carga `embed.js` (el script recorre el DOM una sola
  vez al cargar, por eso el orden importa). Si la API falla, quedan los 3 de respaldo.
- **YouTube:** el canal existe (`@psicojannyy`, `UCDzSqW143IYEdeBMtvVzWOg`) pero todavía
  no tiene videos públicos, por eso el bloque está oculto. En cuanto suba el primero,
  el feed RSS empieza a responder y las tarjetas aparecen **solas**, sin tocar código.

---

## Datos reales verificados

Leídos del perfil público el 2026-09-02:

| Dato | Valor |
|---|---|
| TikTok | [@jannypsico](https://www.tiktok.com/@jannypsico) — «Janny \| Psicología» |
| Seguidores | ~48.3K |
| Me gusta | ~1.03M |
| Videos | 28 |
| YouTube | [@psicojannyy](https://www.youtube.com/@psicojannyy) — «psicojanny», sin videos aún |
| Instagram | [@vazquez_janny](https://www.instagram.com/vazquez_janny/) |
| Facebook | [jannyvazquez19](https://www.facebook.com/jannyvazquez19/) |
| Universidad | Universidad Bicentenaria de Aragua (UBA) — 5.º semestre de Psicología |
| Email | psicojannyv@gmail.com |
| Bio TikTok | 🌸 Estudiante de Psicología \| Ψ · 🧠 Ciencia · Mente · Crecimiento |

## Pendiente de confirmar con ella

| Dónde | Qué |
|---|---|
| Trayectoria | Las materias por semestre son redacción genérica, no un plan de estudios real |

---

## Personalizar

### Tono de voz
Janny dice mucho **«mi corazón»** — es su marca. Aparece 4 veces, repartidas para que
suene natural y no como un tic: al abrir el hero, en «Sobre mí», en Contacto y en la
despedida del footer. Si añades texto nuevo, mantén ese registro: cercano, en segunda
persona, sin tecnicismos vacíos ni promesas mágicas.

### Colores
Todo vive en `:root` al inicio de `css/styles.css`:

```css
--violet:  #7A5AF8;   /* acento principal */
--rose:    #FF6F91;   /* acento secundario */
--peach:   #FFB489;   /* acento cálido */
--ivory:   #FCF9F6;   /* fondo claro */
--night:   #100C1B;   /* fondo de la sección oscura */
```

Cambiar esos cinco valores rebrandea el sitio entero.

### Tipografía
Una sola variable: `--display` en `:root`. Cambia también el `<link>` de Google Fonts
en el `<head>` de `index.html`. Abre `preview-fonts.html` para comparar opciones.

### Agregar un proyecto al portafolio
Duplica un `<article class="pf">` dentro de `.pf-grid`. Para la animación escalonada
añade `style="--d:.32s"` (+0.08 s por tarjeta).

### Agregar una sección
1. Copia el patrón `<section class="section" id="...">` con su `.sec-head`.
2. Ponle `class="reveal"` a lo que deba animarse al hacer scroll.
3. Agrega el link en `.nav__links` y en `.menu__links`.

### Videos concretos de TikTok
Si quiere destacar videos específicos en vez del carrusel del perfil, reemplaza el
bloque `#ttEmbed` por varios embeds individuales:

```html
<blockquote class="tiktok-embed" cite="URL_DEL_VIDEO" data-video-id="ID_DEL_VIDEO">
  <section></section>
</blockquote>
```

### Formulario
Hoy abre el cliente de correo (`mailto:`). Para recibir mensajes en el sitio:

- **Rápido:** [Formspree](https://formspree.io) — pon `action="https://formspree.io/f/XXXX"`
  y `method="POST"` en el `<form>` y borra el `e.preventDefault()` del módulo 13 de `main.js`.
- **En Vercel:** crea `api/contact.js` igual que `api/social.js` y hazle `fetch` desde el JS.

---

## Animaciones

| # | Módulo (`js/main.js`) | Qué hace |
|---|---|---|
| 1 | Preloader | Barra de carga + cortina que sube |
| 2 | Reveal | Aparición al hacer scroll (`IntersectionObserver`) |
| 3 | Contadores | Números que suben con easing y formato compacto (48.3K, 1.03M) |
| 4 | Nav / progreso | Barra de progreso, nav que se oculta, link activo, riel del timeline |
| 5 | Menú móvil | Apertura circular con `clip-path` |
| 6 | Cursor | Cursor personalizado con inercia (solo desktop) |
| 7 | Magnético | Botones que siguen al puntero |
| 8 | Tilt 3D | Inclinación en retrato y tarjetas |
| 9 | Spotlight | Brillo que sigue al cursor dentro de las tarjetas |
| 10 | Parallax | Desplazamiento suave de la foto de «Sobre mí» |
| 11 | Datos en vivo | Fetch a `/api/social` y transición suave a los números reales |
| 12 | Embed TikTok | Sustituye los videos por los últimos y carga el script |
| 13 | Formulario | Validación + envío |
| 14 | Varios | Año automático, scroll suave con offset del nav |

En CSS: blobs flotantes, marquee infinito, gradiente animado en el nombre, anillo
cónico giratorio, chips que flotan y máscaras de texto.

**Accesibilidad:** todo respeta `prefers-reduced-motion: reduce`, hay skip link,
estados `:focus-visible` y `aria-*` en nav, menú y formulario.

---

## Rendimiento

- Cero dependencias JS propias (~15 KB sin minificar).
- Externos: Google Fonts, y el script de TikTok **solo** al llegar a esa sección.
- Imágenes servidas en WebP con fallback JPG (676 KB de originales → 92 KB servidos).
- La API se cachea en el edge, no en el navegador de cada visitante.
