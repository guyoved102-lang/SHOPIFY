# SockAcademy — Brand DNA
**Knowledge base for all agents, templates, and content decisions.**
**Locked: 01/07/2026. Authority: CTO + CEO.**

---

## I. Identity Statement

SockAcademy is the world's first sock authority.
It does not sell socks. It maintains standards.

Benchmark tier: Loro Piana, Sunspel, Falke.
Not: H&M, AliExpress, Happy Socks.

Price floor: $18 single pair / $65 gift set.
Target: adult male/unisex premium purchaser.

---

## II. Brand Voice

**Tone:** Authoritative. Economical. Adult.

| Permitted | Forbidden |
|---|---|
| "curated selection" | "amazing deals" |
| "wardrobe replenishment" | "grab yours now" |
| "merino wool construction" | discount language |
| "effortless continuity" | emoji in any ad copy |
| "a standard most brands ignore" | childish copy |
| "by specialists" | humor that undermines premium |

**Zero emoji** in all commercial content: emails, product descriptions, meta, social captions, Telegram reports.

**Copy brevity law:** If a sentence can be cut, cut it. Luxury does not explain itself.

---

## III. Three Design Modes

Every page belongs to exactly one mode. No mixing.

### 1. Editorial — Homepage & Campaign Pages
Character: Cinematic. Full-bleed. Radical whitespace.
Typography: Playfair Display for headlines.
Content position: Bottom-left.
Animation: Ken Burns at `var(--duration-cinematic)` (9s).
Gold: max 1 use per section (CTA only, never text/heading).

### 2. Curatorial — Collection & Catalog Pages
Character: Ordered. Disciplined. Museum-like.
Grid: 3-column SACRED. Never 4. Never 2 on desktop.
Cards: Product image occupies 75%+ of card height.
Gold: max 1 use per card (material/cert badge only).
No ATC button on cards — click goes to product page.

### 3. Precision — Product Pages
Character: Clinical. Technical. High-end retail.
Image: 3:4 portrait ratio. 55% of viewport.
Material authority: Dedicated section in info column.
Gold: max 3 uses (ATC fill, material badge, active variant border).
Price: `--cream` — never gold. Vendor: `--muted` — never gold.

---

## IV. Gold Discipline Law

**Gold is authority, not decoration.**
Every use of gold must earn its place.

**MAX per page:**
- Editorial (homepage): 2 total (1 CTA + 1 structural rule)
- Curatorial (collection): 2 total (1 CTA + 1 cert badge)
- Precision (product): 3 total (ATC + material badge + active variant)

**PERMITTED uses:**
1. Primary CTA button (fill + border)
2. Authority / certification badge (material origin, cert icon)
3. Structural accent (keyline/separator — `var(--gold-dim)` only)

**FORBIDDEN uses — zero exceptions:**
- Body text color
- Heading color
- Eyebrow / label color
- Text hover states (nav links, card buttons)
- Icon hover states (header icons, nav icons)
- Decorative fills or background washes
- Price display
- Vendor / brand labels

**Gold hidden until hover — canonical pattern:**
```css
border-top: 3px solid var(--surface-raised);  /* rest: invisible */
border-top-color: var(--gold);                 /* hover: structural reveal */
```

---

## V. CSS Token System

All visual values must reference tokens from `sockacademy.css :root`.
Zero hardcoded hex in any section file, template, or JavaScript.

### Surface Hierarchy
```
--surface-void:   #111111   (page background, hero void)
--surface-base:   #1A1A1A   (section background)
--surface-raised: #222222   (card background)
--surface-border: #2A2A2A   (card border, hover bg)
```

### Gold Scale
```
--gold:     #C9A84C           (full authority gold)
--gold-dim: rgba(201,168,76,0.25)  (separator lines)
--gold-glow: rgba(201,168,76,0.10) (trust borders, shadow wash)
```

### Text Hierarchy
```
--cream:  #F0EDE6                     (primary content)
--muted:  rgba(240,237,230,0.55)      (secondary / metadata)
--ghost:  rgba(240,237,230,0.25)      (placeholder / tertiary)
```

### Typography Scale (all clamp)
```
--text-xs:    clamp(0.6875rem, 1.5vw, 0.75rem)
--text-sm:    clamp(0.8125rem, 2vw, 0.875rem)
--text-base:  clamp(0.9375rem, 2.5vw, 1rem)
--text-md:    clamp(1.0625rem, 3vw, 1.125rem)
--text-lg:    clamp(1.25rem, 4vw, 1.5rem)
--text-xl:    clamp(1.625rem, 5vw, 2rem)
--text-2xl:   clamp(2rem, 6.5vw, 3rem)
--text-hero:  clamp(3rem, 10vw, 5.5rem)
```

### Typography Rules
```
--weight-regular: 400
--weight-bold:    700
--tracking-widest: 0.18em    (eyebrows, CTAs, labels)
--tracking-tight:  -0.02em   (display headlines)
--leading-tight:   1.05      (editorial headlines)
```

### Spacing System (8px base unit)
```
--space-1:  8px     --space-6:  128px
--space-2:  16px    --space-7:  160px
--space-3:  24px    --space-8:  192px
--space-4:  32px    --space-9:  224px
--space-5:  64px    --space-10: 256px
```

**Law:** Section-to-section gaps = `--space-9` minimum.
Whitespace is not waste. It is the luxury signal.

### Layout
```
--width-page: 1320px
--grid-gap:   32px (= --space-4)
```

### Motion
```
--ease-luxury:        cubic-bezier(0.25, 0.46, 0.45, 0.94)
--duration-micro:     0.2s     (hover transitions)
--duration-reveal:    0.55s    (scroll reveals, card entrances)
--duration-cinematic: 9s       (Ken Burns, hero animation)
```

**Prefers-reduced-motion rule:** All animations using `--duration-cinematic` must disable and release `will-change` when `prefers-reduced-motion: reduce`.

### Radius
```
--radius-none: 0
--radius-sm:   2px
```
SockAcademy does not use rounded corners on primary surfaces. Sharpness signals precision.

---

## VI. SVG & Icon Rules

- All inline SVG strokes: `stroke="currentColor"` (never hardcoded hex)
- Icon color context set on container: `color: var(--cream)` or `color: var(--muted)`
- Feature icons: `var(--cream)` — they describe function, not authority
- Authority/cert icons: `var(--gold)` — ONLY when they signal certification
- Trust badge icons (SSL, returns, shipping): `var(--muted)` — secondary UI

---

## VII. JavaScript Token Bridge

CSS custom properties cannot be used directly in JS strings.
Read them at runtime:

```javascript
var _cs   = getComputedStyle(document.documentElement);
var _void = _cs.getPropertyValue('--surface-void').trim() || '#111111';
var _base = _cs.getPropertyValue('--surface-base').trim() || '#1A1A1A';
var _gold = _cs.getPropertyValue('--gold').trim()         || '#C9A84C';
```

Fallback hex in `|| guards` is intentional defensive safety — never reached in production.
No external URL dependencies in animation scripts (P1-7 closed).

---

## VIII. Responsive Rules

**Mobile breakpoint:** 749px
**Tablet breakpoint:** 750px–989px

Mobile laws:
- Duration: half of desktop values
- Translation: 40% of desktop translate values
- No parallax effects
- CTAs: full-width (`width: 100%`)
- Hero: `min-height: 90dvh` (not 100dvh)

---

## IX. Compliance Checklist (per section, before commit)

- [ ] Zero hardcoded hex (`#C9A84C`, `#F0EDE6`, `#1A1A1A`, `#111111`, `#222222`, `#2A2A2A`)
- [ ] Gold count ≤ permitted max for this design mode
- [ ] No gold on: headings, text hovers, icon hovers, eyebrows, price, vendor
- [ ] `var(--grid-gap)` for all internal grid gaps
- [ ] `var(--space-*)` for all padding/margin (except truly local values)
- [ ] Transitions: `var(--duration-*) var(--ease-luxury)`
- [ ] SVG strokes: `stroke="currentColor"` — no `stroke="#hex"`
- [ ] `prefers-reduced-motion`: any `--duration-cinematic` animation must handle it

---

## X. Local Values (permitted exceptions)

Some values have no exact token equivalent and may remain hardcoded:
- `rgba(13,13,13,*)` — gradient veil in hero (deeper than `--surface-void`, intentional)
- `#888888` — neutral body copy in legacy sections (between `--muted` and `--ghost`)
- `#666` — disabled/tertiary text
- `#E2C47A` — lighter gold hover variant (above `--gold`, intentional warmth shift)
- `rgba(201,168,76,0.12–0.20)` — shadow values below `--gold-glow` threshold
- Specific `clamp()` ranges in hero headline that exceed `--text-hero` ceiling

These are documented exceptions — not violations. Do not replace them without explicit approval.

---

*This document is the single source of truth for all brand and visual decisions.*
*All agents that generate content, templates, or UI must reference this file.*
*Update path: `sockacademy/docs/strategy/BRAND_DNA.md` → commit → agents re-read at next session.*
