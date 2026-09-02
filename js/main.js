/* ═══════════════════════════════════════════════════
   JANNY VÁZQUEZ — main.js
   Sin dependencias. Todo se degrada si falla algo.
   ═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine    = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ─────────── 1. PRELOADER ─────────── */
  const loader = $('#loader');
  const bar    = $('.loader__bar i');

  function startSite() {
    document.body.classList.remove('is-loading');
    if (loader) loader.classList.add('done');
    // Revela el título del hero con stagger
    $$('.hero__title .mask').forEach((m, i) => {
      m.style.setProperty('--d', 0.15 + i * 0.12 + 's');
      requestAnimationFrame(() => m.classList.add('in'));
    });
    $$('.hero .reveal').forEach(el => el.classList.add('in'));
  }

  document.body.classList.add('is-loading');

  (function preload() {
    // Seguimos las imágenes que ya están en el DOM (así respetamos <picture>/WebP
    // y no forzamos una segunda descarga del JPG).
    const imgs  = $$('.hero img');
    const total = Math.max(imgs.length, 1);
    let done = 0;
    const tick = () => {
      done++;
      if (bar) bar.style.width = Math.min(100, Math.round((done / total) * 100)) + '%';
    };
    if (!imgs.length) tick();
    imgs.forEach(img => {
      if (img.complete) tick();
      else {
        img.addEventListener('load', tick, { once: true });
        img.addEventListener('error', tick, { once: true });
      }
    });
    // Arranca pase lo que pase (mínimo 700 ms para que el loader no parpadee)
    const min = new Promise(r => setTimeout(r, reduced ? 0 : 700));
    const load = new Promise(r => {
      if (document.readyState === 'complete') r();
      else window.addEventListener('load', r, { once: true });
    });
    Promise.all([min, load]).then(startSite);
    setTimeout(startSite, 4000); // failsafe
  })();

  /* ─────────── 2. REVEAL ON SCROLL ─────────── */
  const revealables = $$('.reveal, .mask').filter(el => !el.closest('.hero__title'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealables.forEach(el => io.observe(el));
  } else {
    revealables.forEach(el => el.classList.add('in'));
  }

  /* ─────────── 3. CONTADORES ─────────── */
  // 48273 → "48.3K"  ·  1033398 → "1.03M"
  function compact(n) {
    const trim = t => t.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
    if (n >= 1e6) return trim((n / 1e6).toFixed(2)) + 'M';
    if (n >= 1e3) return trim((n / 1e3).toFixed(1)) + 'K';
    return String(Math.round(n));
  }

  function animateCount(el, from) {
    const to     = parseFloat(el.dataset.to || '0');
    const dec    = parseInt(el.dataset.dec || '0', 10);
    const suffix = el.dataset.suffix || '';
    const isComp = el.dataset.fmt === 'compact';
    const start  = typeof from === 'number' ? from : 0;
    const dur    = 1500;
    const render = v => (isComp ? compact(v) : v.toFixed(dec)) + suffix;

    const finish = () => { el._done = true; el._val = to; };

    if (reduced) { el.textContent = render(to); finish(); return; }

    const t0 = performance.now();
    (function frame(now) {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);           // easeOutCubic
      el.textContent = render(start + (to - start) * e);
      if (p < 1) requestAnimationFrame(frame);
      else finish();
    })(t0);
  }

  const counters = $$('.counter');
  if ('IntersectionObserver' in window && counters.length) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        animateCount(e.target);
        cio.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(c => cio.observe(c));
  } else {
    counters.forEach(animateCount);
  }

  /* ─────────── 4. NAV + PROGRESO + TIMELINE ─────────── */
  const nav      = $('#nav');
  const progress = $('#progress');
  const rail     = $('.timeline__rail i');
  const timeline = $('#timeline');
  const navLinks = $$('.nav__links a');
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y   = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';

    if (nav) {
      nav.classList.toggle('stuck', y > 24);
      const menuOpen = $('#menu')?.classList.contains('open');
      nav.classList.toggle('hide', y > 320 && y > lastY && !menuOpen);
    }

    if (rail && timeline) {
      const r  = timeline.getBoundingClientRect();
      const vh = window.innerHeight;
      const p  = (vh * 0.75 - r.top) / r.height;
      rail.style.transform = 'scaleY(' + Math.max(0, Math.min(1, p)) + ')';
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  // Link activo
  if ('IntersectionObserver' in window && navLinks.length) {
    const sections = navLinks
      .map(a => document.getElementById(a.getAttribute('href').slice(1)))
      .filter(Boolean);

    const sio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => sio.observe(s));
  }

  /* ─────────── 5. MENÚ MÓVIL ─────────── */
  const burger = $('#burger');
  const menu   = $('#menu');

  function setMenu(open) {
    if (!menu || !burger) return;
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.documentElement.classList.toggle('is-locked', open);
  }

  burger?.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('.menu__links a, .menu__foot a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ─────────── 6. CURSOR PERSONALIZADO ─────────── */
  if (fine && !reduced) {
    const cur = $('#cursor');
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;

    window.addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      cur.classList.add('on');
    }, { passive: true });

    document.addEventListener('mouseleave', () => cur.classList.remove('on'));

    (function loop() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(loop);
    })();

    const hoverables = 'a, button, [data-cursor]';
    document.addEventListener('mouseover', e => {
      const t = e.target.closest(hoverables);
      cur.classList.remove('link', 'play');
      if (t) cur.classList.add(t.dataset.cursor === 'play' ? 'play' : 'link');
    });
  }

  /* ─────────── 7. BOTONES MAGNÉTICOS ─────────── */
  if (fine && !reduced) {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + x * 0.22 + 'px,' + y * 0.32 + 'px)';
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ─────────── 8. TILT 3D ─────────── */
  if (fine && !reduced) {
    $$('[data-tilt]').forEach(el => {
      const max = parseFloat(el.dataset.tilt) || 9;   // grados máximos: data-tilt="5"
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width  - 0.5;
        const py = (e.clientY - r.top)  / r.height - 0.5;
        el.style.transform =
          'perspective(900px) rotateY(' + (px * max) + 'deg) rotateX(' + (-py * max) + 'deg)';
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ─────────── 9. SPOTLIGHT ─────────── */
  if (fine) {
    $$('[data-spotlight]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ─────────── 10. PARALLAX SUAVE ─────────── */
  const paras = $$('[data-parallax]');
  if (paras.length && !reduced) {
    let pTick = false;
    const runParallax = () => {
      const vh = window.innerHeight;
      paras.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = parseFloat(el.dataset.parallax) || 0.06;
        const off   = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = 'translate3d(0,' + off.toFixed(2) + 'px,0)';
      });
      pTick = false;
    };
    window.addEventListener('scroll', () => {
      if (!pTick) { requestAnimationFrame(runParallax); pTick = true; }
    }, { passive: true });
    runParallax();
  }

  /* ─────────── 11. DATOS EN VIVO (/api/social) ─────────── */
  // Los números del HTML son el último valor conocido; si la API responde,
  // se reemplazan por los reales sin que se note el salto.
  function pathGet(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function renderYouTube(yt) {
    const grid = $('#ytGrid');
    if (!grid || !yt || !yt.videos || !yt.videos.length) return;

    grid.innerHTML = yt.videos.slice(0, 4).map(v => (
      '<a class="ytv" href="' + v.url + '" target="_blank" rel="noopener" data-cursor="play">' +
        '<div class="ytv__thumb"><img src="' + v.thumb + '" alt="" loading="lazy" /></div>' +
        '<span class="ytv__play" aria-hidden="true"></span>' +
        '<div class="ytv__meta"><b>' + v.title.replace(/[<>&]/g, '') + '</b>' +
          '<small>' + (v.views ? v.views.toLocaleString('es') + ' vistas' : v.published) + '</small>' +
        '</div>' +
      '</a>'
    )).join('');

    grid.hidden = false;
    grid.closest('.yt-block')?.removeAttribute('hidden');
  }

  // Una sola petición, compartida con el módulo 12.
  const socialData = fetch('/api/social', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);

  (async function liveStats() {
    try {
      const data = await socialData;
      if (!data) return;                      // sin API: se quedan los números del HTML

      let any = false;
      $$('[data-live]').forEach(el => {
        const v = pathGet(data, el.dataset.live);
        if (typeof v !== 'number' || !isFinite(v) || v <= 0) return;
        el.dataset.to = String(v);
        if (el._done) animateCount(el, el._val);   // ya visible → transición suave
        any = true;
      });

      if (any && data.ok) {
        const note = $('#liveNote');
        if (note) note.hidden = false;
      }

      renderYouTube(data.youtube);
    } catch (_) { /* la web funciona igual con los números del HTML */ }
  })();

  /* ─────────── 12. EMBED DE TIKTOK (carga diferida) ─────────── */
  // Se usan embeds de VIDEO individual, no el de creador: ese último lo
  // limita TikTok y devuelve "overload-protect triggered".
  const ttEmbed = $('#ttEmbed');
  if (ttEmbed) {
    const HANDLE = 'jannypsico';

    // Cambia los videos del HTML por los que devuelva la API.
    function swapVideos(list) {
      const grid = $('#ttVideos');
      if (!grid || !Array.isArray(list) || !list.length) return;

      const html = list.slice(0, 3).map(v => {
        const id = String(v.id).replace(/\D/g, '');
        if (!id) return '';
        const url = 'https://www.tiktok.com/@' + HANDLE + '/video/' + id;
        return '<blockquote class="tiktok-embed" cite="' + url + '" data-video-id="' + id + '">' +
                 '<section><a target="_blank" rel="noopener" href="' + url + '">Ver en TikTok</a></section>' +
               '</blockquote>';
      }).join('');

      if (html) grid.innerHTML = html;
    }

    // embed.js recorre el DOM al cargar, así que primero se ponen los
    // blockquotes definitivos y recién después se inyecta el script.
    const start = async () => {
      if (document.getElementById('tiktok-embed-js')) return;
      try {
        const data = await socialData;
        swapVideos(data && data.tiktok && data.tiktok.videoList);
      } catch (_) { /* se quedan los del HTML */ }

      const sc = document.createElement('script');
      sc.id = 'tiktok-embed-js';
      sc.async = true;
      sc.src = 'https://www.tiktok.com/embed.js';
      document.body.appendChild(sc);
    };

    if ('IntersectionObserver' in window) {
      const eio = new IntersectionObserver(en => {
        if (en.some(e => e.isIntersecting)) { eio.disconnect(); start(); }
      }, { rootMargin: '500px' });
      eio.observe(ttEmbed);
    } else {
      start();
    }
  }

  /* ─────────── 13. FORMULARIO ─────────── */
  const form = $('#form');
  const note = $('#formNote');

  form?.addEventListener('submit', e => {
    e.preventDefault();

    const nombre  = $('#nombre');
    const email   = $('#email');
    const mensaje = $('#mensaje');
    const motivo  = $('#motivo');
    let ok = true;

    [nombre, email, mensaje].forEach(f => {
      const valid = f.value.trim() !== '' &&
                    (f.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value));
      f.parentElement.classList.toggle('err', !valid);
      if (!valid) ok = false;
    });

    if (!ok) {
      note.textContent = 'Revisa los campos marcados, por favor.';
      note.className = 'form__note bad';
      return;
    }

    // Sin backend todavía: abre el cliente de correo.
    // Para recibirlo en el sitio, cambia esto por Formspree / una API route de Vercel.
    const to   = 'hola@jannyvazquez.com';
    const subj = encodeURIComponent('[Web] ' + motivo.value + ' — ' + nombre.value);
    const body = encodeURIComponent(
      nombre.value + ' (' + email.value + ') escribe:\n\n' + mensaje.value
    );
    window.location.href = 'mailto:' + to + '?subject=' + subj + '&body=' + body;

    note.textContent = 'Abriendo tu correo… ¡gracias por escribir!';
    note.className = 'form__note ok';
    form.reset();
  });

  /* ─────────── 14. VARIOS ─────────── */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Scroll suave con compensación del nav fijo
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    });
  });
})();
