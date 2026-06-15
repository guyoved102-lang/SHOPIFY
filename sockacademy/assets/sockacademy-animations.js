(function () {
  'use strict';

  var BG_URL = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1600&auto=format&fit=crop';
  var BG_FALLBACK = 'linear-gradient(180deg, #111111 0%, #1A1A1A 100%)';

  var KEN_BURNS_DURATION   = 10000; // ms — user-requested 10 s zoom
  var KEN_BURNS_END_SCALE  = 1.14;  // zoom in to 114%
  var PARALLAX_FACTOR      = 0.28;  // bg scrolls at 28% of banner scroll speed
  var PARALLAX_CLAMP       = 110;   // max px shift, must fit inside buffer below

  // The parallax wrapper overhangs the banner by BUFFER_PCT on top + bottom.
  // At 100vh ≈ 900 px, 14% ≈ 126 px — comfortably above the 110 px clamp.
  var BUFFER_PCT = '14%';

  var PARTICLE_COUNT  = 38;
  var PARTICLE_COLORS = ['#C9A84C', '#C9A84C', '#C9A84C'];

  /* ─────────────────────────────────────────────
     BANNER INIT
  ───────────────────────────────────────────── */

  function initBanner(banner) {
    if (banner.dataset.saAnimInit) return;
    banner.dataset.saAnimInit = '1';

    // Remove the CSS background image — we'll own it in a managed layer.
    // The background-color #1A1A1A is preserved as a load-time fallback.
    banner.style.backgroundImage = 'none';

    /*
      Layer stack (back → front):
        0  .sa-parallax-wrap   position:absolute, overhangs banner by BUFFER_PCT
             └ .sa-hero-bg     fills wrap, receives translateY + scale via JS
        1  .sa-overlay         solid rgba dark veil
        2  canvas              particle system
        3+ existing content    .banner__3d-sphere (z:5), .banner__hero-content (z:4)
    */

    // ── Layer 0: parallax wrapper + background ──────────────────────────
    var wrap = document.createElement('div');
    setStyles(wrap, {
      position:   'absolute',
      top:        '-' + BUFFER_PCT,
      bottom:     '-' + BUFFER_PCT,
      left:       '0',
      right:      '0',
      zIndex:     '0',
      overflow:   'hidden',
    });

    var bg = document.createElement('div');
    setStyles(bg, {
      position:         'absolute',
      inset:            '0',
      backgroundImage:  'url("' + BG_URL + '")',
      backgroundSize:   'cover',
      backgroundPosition: 'center',
      willChange:       'transform',
      transformOrigin:  'center center',
    });

    // Probe the image; fall back to CSS gradient if it fails to load
    var probe = new Image();
    probe.onload = function () {
      bg.style.backgroundImage = 'url("' + BG_URL + '")';
    };
    probe.onerror = function () {
      bg.style.backgroundImage = BG_FALLBACK;
    };
    probe.src = BG_URL;

    wrap.appendChild(bg);

    // ── Layer 1: overlay ────────────────────────────────────────────────
    var overlay = document.createElement('div');
    setStyles(overlay, {
      position:      'absolute',
      inset:         '0',
      background:    'rgba(0,0,0,0.65)',
      zIndex:        '1',
      pointerEvents: 'none',
    });

    // ── Layer 2: particle canvas ────────────────────────────────────────
    var canvas = document.createElement('canvas');
    setStyles(canvas, {
      position:      'absolute',
      inset:         '0',
      zIndex:        '2',
      pointerEvents: 'none',
    });

    // Insert all new layers before existing children
    var ref = banner.firstElementChild;
    banner.insertBefore(wrap,    ref);
    banner.insertBefore(overlay, ref);
    banner.insertBefore(canvas,  ref);

    // Lift existing content above the new layers
    var sphere  = banner.querySelector('.banner__3d-sphere');
    var content = banner.querySelector('.banner__hero-content');
    if (sphere)  sphere.style.zIndex  = '5';
    if (content) content.style.zIndex = '4';

    // ── Canvas sizing (DPR-aware) ───────────────────────────────────────
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resizeCanvas() {
      var w = banner.offsetWidth;
      var h = banner.offsetHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);
    }
    resizeCanvas();
    new ResizeObserver(resizeCanvas).observe(banner);

    // ── Particles ───────────────────────────────────────────────────────
    var particles = spawnParticles(banner.offsetWidth, banner.offsetHeight);

    // ── Animation loop ──────────────────────────────────────────────────
    var startTime = null;

    function tick(now) {
      if (document.hidden) { requestAnimationFrame(tick); return; }
      if (!startTime) startTime = now;

      // Ken Burns: scale 1.0 → KEN_BURNS_END_SCALE (ease-out cubic)
      var elapsed  = now - startTime;
      var progress = Math.min(elapsed / KEN_BURNS_DURATION, 1);
      var eased    = 1 - Math.pow(1 - progress, 3);
      var scale    = 1 + eased * (KEN_BURNS_END_SCALE - 1);

      // Parallax: how far banner top is from viewport top, scaled down
      var rect   = banner.getBoundingClientRect();
      var raw    = rect.top * -PARALLAX_FACTOR;
      var offset = Math.max(-PARALLAX_CLAMP, Math.min(PARALLAX_CLAMP, raw));

      // Apply both transforms to bg in one declaration — no conflict
      bg.style.transform = 'translateY(' + offset + 'px) scale(' + scale + ')';

      // Particle canvas drifts at 0.3× scroll speed for depth separation
      var canvasRaw = rect.top * -0.30;
      canvas.style.transform = 'translateY(' + Math.max(-50, Math.min(50, canvasRaw)) + 'px)';

      // Particles
      var cw = canvas.offsetWidth;
      var ch = canvas.offsetHeight;
      ctx.clearRect(0, 0, cw, ch);
      tickParticles(ctx, particles, cw, ch);

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /* ─────────────────────────────────────────────
     PARTICLE SYSTEM
  ───────────────────────────────────────────── */

  function spawnParticles(w, h) {
    var pts = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      pts.push(makeParticle(w, h, true));
    }
    return pts;
  }

  function makeParticle(w, h, scatter) {
    return {
      x:            Math.random() * w,
      y:            scatter ? Math.random() * h : h + 8,
      vx:           (Math.random() - 0.5) * 0.35,
      vy:           -(0.25 + Math.random() * 0.55),
      r:            2 + Math.random() * 2,
      color:        PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      alpha:        0.25 + Math.random() * 0.6,
      alphaDelta:   (Math.random() > 0.5 ? 1 : -1) * 0.0025,
      wobble:       Math.random() * Math.PI * 2,
      wobbleSpeed:  0.012 + Math.random() * 0.018,
    };
  }

  function tickParticles(ctx, pts, w, h) {
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];

      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.18;
      p.y += p.vy;

      p.alpha += p.alphaDelta;
      if (p.alpha > 0.85 || p.alpha < 0.2) p.alphaDelta = -p.alphaDelta;

      // Respawn off the top
      if (p.y < -8) { pts[i] = makeParticle(w, h, false); continue; }

      // Wrap horizontally
      if (p.x < -8) p.x = w + 8;
      if (p.x > w + 8) p.x = -8;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = p.r * 8;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ─────────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────────── */

  function setStyles(el, styles) {
    Object.keys(styles).forEach(function (prop) {
      el.style[prop] = styles[prop];
    });
  }

  /* ─────────────────────────────────────────────
     BOOT
  ───────────────────────────────────────────── */

  function initAll() {
    document.querySelectorAll('[id^="Banner-"]').forEach(initBanner);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Shopify Theme Editor: re-init when section reloads
  document.addEventListener('shopify:section:load', function (e) {
    var banner = e.target.querySelector('[id^="Banner-"]');
    if (banner) initBanner(banner);
  });

})();

/* ─────────────────────────────────────────────
   SCROLL ENTRANCE ANIMATIONS (Intersection Observer)
───────────────────────────────────────────── */

(function () {
  'use strict';

  function initScrollEntrance() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: make everything visible immediately
      document.querySelectorAll('.shopify-section').forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.shopify-section').forEach(function (el) {
      observer.observe(el);
    });

    // Re-observe sections added dynamically in Theme Editor
    document.addEventListener('shopify:section:load', function (e) {
      var section = e.target.closest('.shopify-section');
      if (section) observer.observe(section);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollEntrance);
  } else {
    initScrollEntrance();
  }

})();

/* ─────────────────────────────────────────────
   LENIS SMOOTH SCROLL
───────────────────────────────────────────── */

(function () {
  'use strict';

  function initLenis() {
    if (typeof Lenis === 'undefined') return;
    var lenis = new Lenis({
      duration: 1.2,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothTouch: false,
      touchMultiplier: 2,
    });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }

  initLenis();

})();
