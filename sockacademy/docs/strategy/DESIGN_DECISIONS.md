# SockAcademy — Design & Motion Architecture Decisions
## CTO Review: Advanced Motion & WebGL Design Dictionary (28/06/2026)

> **Disambiguation added 04/07/2026 (Fable 5 audit M11):** every "Phase 4"/"Phase 5" below refers
> to the **Brand Architecture Phase** (CSS/UI design rollout, Layers 1–5), *not* the canonical
> **SA-Cluster Phase** (`PHASE_ARCHITECTURE_SKELETON.md`, MRR-triggered, where Phase 4 = Brand
> Elevation & International at $15K MRR). Two independent numbering systems share the name — see
> `feedback_enterprise_rules.md` → Phase-Numbering Disambiguation.

---

## Decision Log

### Vetoed Permanently — Incompatible with Stack

| Technique | Reason |
|-----------|--------|
| WebGL / Three.js / Spline | Dawn sandbox incompatible. TTI would rise from ~1.5s → 3s+. Loro Piana doesn't use WebGL for fabric. Wrong product category. |
| Horizontal Scrolling | Breaks Dawn's section rendering, Shopify Pixel, GA4 events, cart state. Documented antipattern. |
| Barba.js / PJAX | Breaks `Shopify.checkout`, Meta Pixel `PageView`, GA4 `page_view`, cart drawer state. No ROI justifies risk. |
| Custom Cursor | Mobile-first store. 70%+ traffic = mobile = no cursor. Desktop-only vanity, no conversion signal. |
| 360° Camera Paths | Requires WebGL. Same veto as above. |

### Deferred to Phase 5 (post-launch polish)

| Technique | Condition |
|-----------|-----------|
| Lottie micro-animations | After launch — success popup on ATC, loading states. JSON only, no After Effects dependency. |
| Variable Fonts | Requires full Playfair Display font-stack replacement — brand-level decision, not CSS. |

### Approved & Implemented

| Technique | Phase | Status |
|-----------|-------|--------|
| GSAP ScrollTrigger + Lenis | Phase 4 Layer 1 | ✅ Live |
| Fluid Typography (`clamp()`) | Phase 4 Layer 1 | ✅ Live |
| Blur entrance + card stagger | Phase 4 Layer 2 | ✅ Live |
| Dual parallax (hero + featured) | Phase 4 Layer 2 | ✅ Live |
| Sticky ATC (mobile) + shimmer | Phase 4 Layer 3 | ✅ Live |
| Trust badges fade-in | Phase 4 Layer 3 | ✅ Live |
| Glassmorphism cart drawer | Phase 4 Layer 4 | ✅ Live |
| Product image hover depth | Phase 4 Layer 4 | ✅ Live |
| Ken Burns collection banner | Phase 4 Layer 4 | ✅ Live |
| Bento Grid Homepage | Phase 4 Layer 5 | ✅ Live |
| GSAP Physics Easing upgrade | Phase 4 Layer 5 | ✅ Live |
| Magnetic ATC Hover (desktop) | Phase 4 Layer 5 | ✅ Live |

---

## Bento Grid Architecture (28/06/2026)

**File:** `sockacademy/sections/bento-grid.liquid`

**Layout (desktop, ≥750px):**
```
┌─────────────────────────────┬────────────────┐
│  FEATURED CARD              │  STAT TILE     │
│  (col-span: 1, row-span: 2) │  "10,247 pairs"│
│  image + headline + CTA     ├────────────────┤
│                             │  LINK CARD     │
│                             │  "Shop Merino" │
├─────────────────┬───────────┴────────────────┤
│  QUOTE TILE     │  BENEFIT TILE              │
│  Testimonial    │  "Free shipping"           │
└─────────────────┴────────────────────────────┘
```

**Mobile (< 750px):** Linear vertical stack. No grid. Cards full-width.

**Human Copy Directive (28/06/2026):**
- BANNED: "Revolutionary", "Discover", "Elevate", "Innovative", "Introducing"
- Tone: Concise, earned authority, no adjective excess
- Benchmark: Loro Piana / Sunspel editorial voice

---

## Magnetic ATC Hover Architecture (28/06/2026)

**Target:** `.sp__atc-btn` (custom selector, owned — not Dawn native)
**Scope:** Desktop only (`window.matchMedia('(pointer: fine)')`)
**Mechanism:** `mousemove` → calculate offset from button center → `gsap.to()` with translateX/Y at 30% strength → `mouseleave` → spring back to origin

---

## GSAP Easing Upgrade Map (28/06/2026)

| Animation | Before | After |
|-----------|--------|-------|
| Section reveals | `power3.out` | `expo.out` |
| Card stagger | `power3.out` | `back.out(1.7)` |
| Featured parallax | linear | `power2.out` |
| ATC magnetic | — | `elastic.out(1, 0.6)` snap-back |

All GSAP built-in eases — zero new dependencies.

---

*Last updated: 28/06/2026 — Phase 4 Layer 5 complete and live*
