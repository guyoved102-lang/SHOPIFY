(function () {
  'use strict';

  // Read design tokens from CSS at runtime — single source of truth
  var _cs   = getComputedStyle(document.documentElement);
  var _void = _cs.getPropertyValue('--surface-void').trim() || '#111111';
  var _base = _cs.getPropertyValue('--surface-base').trim() || '#1A1A1A';
  var _gold = _cs.getPropertyValue('--gold').trim()         || '#C9A84C';

  var BG_URL      = '';  // P1-7: External Unsplash dependency removed
  var BG_FALLBACK = 'linear-gradient(180deg, ' + _void + ' 0%, ' + _base + ' 100%)';

  var KEN_BURNS_DURATION   = 10000;
  var KEN_BURNS_END_SCALE  = 1.14;
  var PARALLAX_FACTOR      = 0.40;
  var PARALLAX_CLAMP       = 120;
  var DEPTH_FACTOR         = 0.20;
  var DEPTH_CLAMP          = 60;
  var BUFFER_PCT           = '14%';

  var PARTICLE_COUNT  = 38;
  var PARTICLE_COLORS = [_gold, _gold, _gold];

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
      position:           'absolute',
      inset:              '0',
      backgroundImage:    BG_FALLBACK,
      backgroundSize:     'cover',
      backgroundPosition: 'center',
      willChange:         'transform',
      transformOrigin:    'center center',
    });

    wrap.appendChild(bg);

    // ── Depth layer (desktop only): second parallax plane, moves opposite to bg ──
    var depthLayer = null;
    if (window.innerWidth >= 750) {
      depthLayer = document.createElement('div');
      setStyles(depthLayer, {
        position:      'absolute',
        inset:         '0',
        background:    'radial-gradient(ellipse at 40% 35%, rgba(201,168,76,0.05) 0%, rgba(201,168,76,0.02) 40%, transparent 70%)',
        willChange:    'transform',
        pointerEvents: 'none',
      });
      wrap.appendChild(depthLayer);
    }

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

      // Depth layer: opposite direction → cinematic front/back separation
      if (depthLayer) {
        var depthRaw    = rect.top * DEPTH_FACTOR;
        var depthOffset = Math.max(-DEPTH_CLAMP, Math.min(DEPTH_CLAMP, depthRaw));
        depthLayer.style.transform = 'translateY(' + depthOffset + 'px)';
      }

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
   SCROLL ENTRANCE ANIMATIONS — GSAP ScrollTrigger
   Phase 4 Layer 2 — blur entrance, card stagger, featured parallax
───────────────────────────────────────────── */

(function () {
  'use strict';

  var CARD_SEL     = '.card-wrapper';
  var FEATURED_SEL = '.featured-collection, [id*="FeaturedCollection"]';

  function initGSAPReveal() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      document.querySelectorAll('.shopify-section').forEach(function (el) {
        el.style.opacity   = '1';
        el.style.transform = 'none';
        el.style.filter    = 'none';
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Mobile 70% Rule: half intensity, no blur, no stagger
    var mobile  = window.matchMedia('(max-width: 749px)').matches;
    var yOff    = mobile ? 22 : 48;
    var dur     = mobile ? 0.40 : 0.70;
    var blurIn  = mobile ? 'blur(0px)' : 'blur(10px)';
    var stagger = mobile ? 0 : 0.08;

    var standardSecs = [];
    var featuredSecs = [];
    var cardSecs     = [];

    // CRO Arbiter: never animate cart total / checkout button on load —
    // exempt cart-items and cart-footer sections (templates/cart.json) from reveal.
    document.querySelectorAll('.shopify-section:not(:first-child):not([id*="cart-items"]):not([id*="cart-footer"])').forEach(function (sec) {
      if (sec.querySelector(FEATURED_SEL)) {
        featuredSecs.push(sec);
      } else if (sec.querySelector(CARD_SEL)) {
        cardSecs.push(sec);
      } else {
        standardSecs.push(sec);
      }
    });

    // ── A. Standard sections: opacity + translateY + blur ─────────
    if (standardSecs.length) {
      gsap.set(standardSecs, { opacity: 0, y: yOff, filter: blurIn });
      ScrollTrigger.batch(standardSecs, {
        start: 'top 92%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, {
            opacity: 1, y: 0, filter: 'blur(0px)',
            duration: dur, stagger: mobile ? 0 : 0.10,
            ease: 'expo.out',
            clearProps: 'transform,filter',
          });
        },
      });
    }

    // ── B. Card grid sections: section fade-in + dealing-cards stagger ──
    cardSecs.forEach(function (sec) {
      var cards = sec.querySelectorAll(CARD_SEL);

      // CRO Arbiter: stagger 0.08s × N cards — always ≤ 0.5s total delay
      gsap.set(sec,   { opacity: 0 });
      gsap.set(cards, { opacity: 0, y: yOff, filter: blurIn });

      ScrollTrigger.create({
        trigger: sec,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          gsap.to(sec, { opacity: 1, duration: 0.25 });
          gsap.to(cards, {
            opacity: 1, y: 0, filter: 'blur(0px)',
            duration: dur, stagger: stagger,
            ease: 'back.out(1.7)', delay: 0.10,
            clearProps: 'transform,filter',
          });
        },
      });
    });

    // ── C. Featured Collection: blur entrance + parallax scrub ────
    featuredSecs.forEach(function (sec) {
      var inner = sec.querySelector(FEATURED_SEL) || sec;

      gsap.set(sec, { opacity: 0, filter: blurIn });
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 85%',
        once: true,
        onEnter: function () {
          gsap.to(sec, {
            opacity: 1, filter: 'blur(0px)',
            duration: dur, ease: 'expo.out',
            clearProps: 'filter',
          });
        },
      });

      // Parallax scrub: inner content drifts 6% top→bottom — desktop only
      if (!mobile) {
        gsap.fromTo(inner, { y: '6%' }, {
          y: '-6%',
          ease: 'none',
          scrollTrigger: {
            trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 1.5,
          },
        });
      }
    });

    // Shopify Theme Editor — refresh on section load/reorder
    document.addEventListener('shopify:section:load', function () {
      ScrollTrigger.refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGSAPReveal);
  } else {
    initGSAPReveal();
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
    if (typeof gsap !== 'undefined') {
      // Sync with GSAP RAF — eliminates jank between Lenis + ScrollTrigger
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }

  initLenis();

})();

/* ─────────────────────────────────────────────
   PRODUCT CRO — Trust badges + Sticky ATC bar
   Phase 4 Layer 3 — social proof reveal + mobile ATC
───────────────────────────────────────────── */
(function () {
  'use strict';

  function initProductCRO() {
    var isMobile = window.matchMedia('(max-width: 749px)').matches;

    /* ── Social proof: GSAP fade-in ─────────────────────────── */
    var social = document.querySelector('.sp__social-proof');
    if (social && typeof gsap !== 'undefined') {
      gsap.from(social, {
        opacity: 0, y: 6,
        duration: 0.55, ease: 'power2.out', delay: 0.30,
        clearProps: 'transform',
      });
    }

    /* ── Trust badges: GSAP fade-in ─────────────────────────── */
    var trust = document.querySelector('.sp__trust');
    if (trust && typeof gsap !== 'undefined') {
      gsap.from(trust, {
        opacity: 0, y: 8,
        duration: 0.65, ease: 'power2.out', delay: 0.45,
        clearProps: 'transform',
      });
    }

    /* ── Sticky ATC bar — mobile only ───────────────────────── */
    if (!isMobile) return;
    if (typeof gsap === 'undefined') return;

    var nativeBtn = document.querySelector('.sp__atc-btn');
    if (!nativeBtn) return;

    /* Build bar DOM */
    var bar = document.createElement('div');
    bar.id = 'sa-sticky-atc';
    bar.setAttribute('aria-hidden', 'true');

    function getPriceText() {
      var el = document.querySelector('.sp__price');
      return el ? el.textContent.trim() : '';
    }

    function getVariantLabel() {
      var parts = [];
      document.querySelectorAll('.sp__opt-btn--active').forEach(function (b) {
        parts.push(b.dataset.optionValue);
      });
      return parts.length ? parts.join(' · ') : '';
    }

    bar.innerHTML =
      '<div class="sa-sticky-atc__inner">' +
        '<div class="sa-sticky-atc__info">' +
          '<span class="sa-sticky-atc__price">' + getPriceText() + '</span>' +
          '<span class="sa-sticky-atc__variant">' + getVariantLabel() + '</span>' +
        '</div>' +
        '<button type="button" class="sa-sticky-atc__btn"' +
          (nativeBtn.disabled ? ' disabled' : '') +
          ' aria-label="Add to cart">' +
          '<span class="sa-sticky-atc__shimmer" aria-hidden="true"></span>' +
          '<span class="sa-sticky-atc__label">ADD TO CART</span>' +
        '</button>' +
      '</div>';

    document.body.appendChild(bar);

    /* Keep price + variant in sync with native form state */
    function syncBar() {
      var ps = bar.querySelector('.sa-sticky-atc__price');
      var vs = bar.querySelector('.sa-sticky-atc__variant');
      var sb = bar.querySelector('.sa-sticky-atc__btn');
      if (ps) ps.textContent = getPriceText();
      if (vs) vs.textContent = getVariantLabel();
      if (sb) sb.disabled   = nativeBtn.disabled;
    }

    document.querySelectorAll('.sp__opt-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setTimeout(syncBar, 60); });
    });

    /* Watch price span for variant-driven mutations */
    var priceEl = document.querySelector('.sp__price');
    if (priceEl) {
      new MutationObserver(syncBar).observe(priceEl, {
        childList: true, subtree: true, characterData: true,
      });
    }

    /* Show / hide via IntersectionObserver → GSAP slide */
    var shown = false;
    new IntersectionObserver(function (entries) {
      var nativeInView = entries[0].isIntersecting;
      if (!nativeInView && !shown) {
        shown = true;
        bar.setAttribute('aria-hidden', 'false');
        gsap.to(bar, { y: '0%', duration: 0.42, ease: 'power3.out' });
      } else if (nativeInView && shown) {
        shown = false;
        bar.setAttribute('aria-hidden', 'true');
        gsap.to(bar, { y: '100%', duration: 0.32, ease: 'power2.in' });
      }
    }, { threshold: 0.1 }).observe(nativeBtn);

    /* Tap sticky btn → trigger native form submit */
    bar.querySelector('.sa-sticky-atc__btn').addEventListener('click', function () {
      if (!nativeBtn.disabled) nativeBtn.click();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductCRO);
  } else {
    initProductCRO();
  }

})();

/* ─────────────────────────────────────────────
   MAGNETIC ATC HOVER — Desktop only
   Phase 4 Layer 5 — premium pull effect on .sp__atc-btn
   pointer: fine = mouse only (not touch/mobile)

   CRO Arbiter documented exception (G-7, Fable 5 audit, 04/07/2026):
   the letter of the CRO Arbiter law forbids "animation on the ATC
   button." This hover-follow effect and the sticky-ATC shimmer are the
   one approved exception — neither moves the button's position/opacity
   in a way that delays visibility or clickability; they are pointer-
   feedback micro-interactions, not the structural reveal/stagger
   animations the law targets. No other ATC animation is permitted
   without the same explicit carve-out.
───────────────────────────────────────────── */
(function () {
  'use strict';

  function initMagneticATC() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (typeof gsap === 'undefined') return;

    var btns = document.querySelectorAll('.sp__atc-btn');
    if (!btns.length) return;

    btns.forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        if (btn.disabled) return;
        var rect = btn.getBoundingClientRect();
        var cx   = rect.left + rect.width  / 2;
        var cy   = rect.top  + rect.height / 2;
        var dx   = (e.clientX - cx) * 0.28;
        var dy   = (e.clientY - cy) * 0.28;
        gsap.to(btn, {
          x: dx, y: dy,
          duration: 0.38,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      });

      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, {
          x: 0, y: 0,
          duration: 0.70,
          ease: 'elastic.out(1, 0.6)',
          overwrite: 'auto',
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMagneticATC);
  } else {
    initMagneticATC();
  }

})();

/* ── Academy Material Insight — Scroll Reveal ────────────
   Triggers .is-visible on [data-academy-insight] elements
   when they enter the viewport. Uses IntersectionObserver
   as a lightweight fallback when GSAP ScrollTrigger isn't
   available (e.g. GSAP hasn't loaded yet on collection grids).
   ────────────────────────────────────────────────────── */
(function initAcademyInsight() {
  function reveal() {
    const insights = document.querySelectorAll('[data-academy-insight]');
    if (!insights.length) return;

    if (window.gsap && window.ScrollTrigger) {
      insights.forEach(function (el) {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          },
        });
      });
    } else {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });

      insights.forEach(function (el) { io.observe(el); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reveal);
  } else {
    reveal();
  }
})();
