# Design Recommendations — Making the Storefront Earn "Wow"
**Written 05/07/2026 (Fable 5, read-only advisory pass). Nothing here is implemented. Design Freeze remains in force — every item below requires Guy's explicit individual approval before any file is touched.**

**Basis:** full read of `FABLE5_PROJECT_MAP.md`, `FABLE5_BRAND_VOICE_AUDIT.md`, `DESIGN_DECISIONS.md`, `templates/index.json`, and the actual Liquid of `hero.liquid`, `about.liquid`, `main-product.liquid`, `sock-finder.liquid`, `snippets/academy-material-insight.liquid`, plus a directory sweep of `sections/`, `templates/`, `snippets/`, `assets/`. External reference points: Loro Piana's e-commerce approach (lifestyle-situation navigation; product pages that launch short raw-material films — see [MADJOR case study](https://www.madjor.com/expertise-4-case/loro-piana-a-supreme-brand-experience-for-a-supreme-luxury-brand) and [Jaques Vanzo case study](https://www.jaquesvanzo.com/loro-piana.html)) and Falke's sizing precision (per-product shoe-size fit tables — [falke.com size tables](https://www.falke.com/us_en/information/size-tables/)).

---

## Where the site is today

The theme is technically polished — GSAP/Lenis motion, glassmorphism cart, a metafield-driven Material Profile block, a working 3-question Sock Finder — but the homepage *content structure* is generic DTC: hero → ticker → "Why SOCKACADEMY?" three-icon row → six category cards → about → blog → quiz. The brand-voice audit confirms the same gap in words: "Find Your Perfect Sock," "Socks from around the world," "Hand-picked by sock specialists," permanent compare-at strikethroughs and a "Sale" badge on the product page. So the honest starting point is: **the animation layer is at the target tier; the information architecture and the claims it animates are a full tier below it.** "Wow" will not come from more motion — it will come from giving the existing motion something worth revealing.

## The "wow" gap

What Loro Piana, Sunspel, and Falke sites make a visitor feel in the first 15 seconds is not "this is pretty" — it's **"these people know something about this object that I don't."** That is exactly the promise of the name *SockAcademy*, and it is exactly what the current homepage doesn't deliver. Specifically missing:

1. **No proof of authority above the fold.** The hero asserts ("The World's Sock Specialists") but the next thing the visitor sees is a marquee ticker with "FREE SHIPPING OVER $50" — a mid-market signal — and three icon cards with empty copy. The benchmark brands *show* the knowledge (fiber micron counts, mill origins, construction diagrams) before they ever ask you to shop.
2. **The best asset on the site is hidden.** The Material Profile block (`academy-material-insight.liquid` — micron grade, origin, gauge, weave, certification) is the single most on-brand, most differentiating artifact in the whole theme, and it appears only on product pages, below the fold, only when metafields are set. Nothing on the homepage hints it exists.
3. **Navigation is by product type, not by life.** Six cards named "Crew & Half" / "Sport & Running" is a warehouse taxonomy. Loro Piana navigates by *occasion* ("a weekend in Tuscany") — the visitor sees themselves, not a SKU tree.
4. **Structural contradictions undermine the register** (audit finding, but it's a design surface): the "Sale" badge and permanent strikethrough on `main-product.liquid`, "Secure Checkout / Free Returns" trust badges — these are the visual grammar of a store that expects to be doubted. A $250-tier store's design assumes trust; it doesn't plead for it.

---

## Recommendations

Ordered roughly from quick wins to bold. "Builds on existing" refers to sections/snippets already in the theme.

### 1. Retire the sale grammar from the product page
**Effort: small · Builds on existing (`main-product.liquid`)**
Remove the "Sale" badge, the compare-at strikethrough, and demote the "Secure Checkout / Free Returns" trust-badge row to a quiet single line of small caps near the footer of the info column. The experience: a price stated once, plainly, with nothing arguing about it. This is the cheapest possible register upgrade and it resolves the audit's most damning structural finding (the copy claims "no discounts" while the template renders a perpetual fake sale). It isn't "wow" by itself — it's the removal of the anti-wow. *(Requires a parallel product-data decision on `compare_at_price` fields — a brand decision for Guy, not just CSS.)*

### 2. Replace the ticker with a "From the Archive" fact line
**Effort: small · Builds on existing (`ticker.liquid`)**
Keep the marquee mechanic (it's already built and smooth) but replace "FREE SHIPPING OVER $50 · GIFT SETS AVAILABLE" with rotating single facts of genuine sock scholarship: *"A 200-needle gauge knits 200 loops per course — twice the resolution of a standard sock." · "Merino below 19.5 microns cannot trigger the prickle receptor in human skin." · "The hand-linked toe seam was standard until 1968. We never moved on."* Same component, opposite message: the ticker stops selling and starts teaching. First concrete proof, ~3 seconds in, that "Academy" means something.

### 3. Material Profile teaser on the homepage
**Effort: small–medium · Builds on existing (`academy-material-insight.liquid` already supports a `compact` layout)**
A quiet full-width band between the hero and the collections: one real Material Profile (e.g. the Merino 18.5μ spec that already exists as the snippet's preview data) rendered large — grade, origin, composition, gauge, certification — under a single line: *"Every pair in the catalogue carries its full material record."* The wow is the *implication*: this store documents socks the way a watchmaker documents movements. Nearly free to build because the snippet, the styling, and the metafield schema all exist.

### 4. Rebuild the "Why SOCKACADEMY?" features row as "The Standard"
**Effort: small · Builds on existing (`features.liquid`, copy-only in `index.json` settings)**
Kill the rhetorical-question heading and the three empty cards ("Socks from around the world"). Replace with three concrete, checkable standards: *fiber grade disclosed on every product · construction gauge stated, not implied · rejected pairs never listed* (or whatever three standards Guy will actually stand behind). Same section, same grid, same animation — the change is that every sentence becomes falsifiable. Authority is the willingness to be checked.

### 5. Occasion-led navigation layer ("Dressed for—")
**Effort: medium · Builds on existing (`collections-preview.liquid` + `bento-grid.liquid`, which is built but currently not in the homepage order)**
Keep the six product-type cards for people who know what they want, but *lead* with 3–4 editorial occasion tiles: *The Boardroom / The Trail / The Long-Haul Flight / The Wedding* — each a full-bleed photographic tile opening a curated cross-category edit. This is the direct, scaled-down version of Loro Piana's "weekend in Tuscany" navigation, and it's the single biggest shift from "warehouse" to "world." The dormant bento-grid section is a natural chassis for it.

### 6. The Fiber Index — a permanent editorial reference section
**Effort: medium · Net-new template (`page.json` variant + one new section), builds on existing blog content (MG-1 Merino Guide is already the strongest piece in the estate)**
A standing page — not a blog post — titled *The Fiber Index*: one entry per material (Merino, Coolmax, Thermolite, cotton lisle, cashmere blend), each with micron range, thermal behavior, moisture curve, honest weaknesses, and "what we use it for / what we refuse to use it for." Linked from the header nav as *Academy*. The "refuse" column is the wow: a store confident enough to say what it won't sell. MG-1 proves the voice can do this; the design job is giving that voice a permanent, findable home instead of a blog roll. *(The `academy-hero.liquid` section already exists as a likely header for exactly this kind of page — build on it.)*

### 7. Fit by shoe size, Falke-style, on every product page
**Effort: medium · Builds on existing (`main-product.liquid` variant option group)**
Replace the bare S/M/L variant buttons with a fit module: the visitor enters or selects their shoe size (EU/US/UK) once, and every product page thereafter pre-highlights their size and states it as a fact — *"US 10 → Size M in this construction. This pair runs true."* Localstorage, no account needed. Falke's per-product size tables are the category benchmark ([falke.com](https://www.falke.com/us_en/information/size-tables/)); doing it *better* than Falke — remembered across the whole session, phrased as a fitting-room verdict — is a genuine "these people are specialists" moment at the exact point of purchase decision. Also directly serves the open flagship S/M+L/XL variant question.

### 8. Sock Finder v2: from quiz to consultation
**Effort: medium · Builds on existing (`sock-finder.liquid` — a full 3-step engine already works)**
The mechanic exists; the register doesn't. Retitle from "Find Your Perfect Sock / 3 questions. 10 seconds." (audit-flagged: "perfect" is on the brand's own banned list) to something like *"The Fitting — three questions, one considered answer."* And upgrade the *result*: instead of just linking a collection, render the recommended product **with its Material Profile block and one sentence of reasoning** ("You asked for warmth without weight in a dress shoe. 18.5μ merino at 200-needle gauge is the correct answer."). The wow shifts from "fun quiz" to "I was just fitted by someone who knows." Move it up the page order — it's currently the *last* section on the homepage, after the blog.

### 9. Construction anatomy — one annotated macro image per product
**Effort: medium (content-heavy, code-light) · Builds on existing (product gallery in `main-product.liquid`)**
For each flagship product, one extreme-macro photograph of the knit with 3–4 quiet numbered callouts (hand-linked toe seam · cushion loop density · Y-heel gusset · welt structure), rendered as a dedicated gallery slide or a block under the description. This is the sock equivalent of a watch movement shot — the moment the visitor *sees* the difference they're paying for. No new tech: it's photography plus an annotation snippet. This is the highest wow-per-line-of-code item on this list; the constraint is producing the images (Higgsfield product-photoshoot pipeline is already available in-project for drafts, though true macro photography of the actual product is the credible endgame).

### 10. Provenance strip: "One pair, traced"
**Effort: medium–large · Net-new section, feeds from existing `academy.*` metafields**
A horizontal scroll-driven (vertical scroll, horizontal reveal — *within* one section, so it doesn't violate the horizontal-scrolling veto, which targets page-level scroll-jacking) storyline for one hero product: fleece → spinning mill → 200-needle knitting → hand-linking → wear test → the pair in the box. Five stages, five images, five one-line captions, GSAP ScrollTrigger pinning (already in the stack, already approved tech). This is the scaled-to-Dawn version of Loro Piana's raw-material films — material storytelling as the centerpiece of the homepage rather than a claim in the copy. *Honesty gate:* only ship stages that are true for the actual dropship-phase supply chain; a traced provenance story that isn't real would be a worse brand injury than no story.

### 11. "The Rejects" — an anti-catalog editorial block
**Effort: medium · Net-new section (homepage or Fiber Index page)**
A short, austere module: three socks we tested and declined to sell, each with the specific reason ("pilled at 40 wears" · "gauge claimed 200, measured 144" · "elastane band failed the 48-hour test"). No competitor names, no punching down at brands — punching *up* at a standard. Nothing communicates curation like visible rejection; it converts "Hand-picked by sock specialists" from filler into evidence. *Prerequisite:* the testing claims must be real — this item is blocked until the wear-test process is genuinely operational, which makes it a natural Phase-2-era piece.

### 12. Quiet dark-room product gallery ("The Vault" treatment)
**Effort: medium · Builds on existing (`featured-collection.liquid` / `collections-preview.liquid` + existing Ken Burns/parallax stack)**
Reframe the featured-products area as a gallery, not a grid: one product at a time at large scale on the existing dark surface, its Material Profile compact block beside it, slow crossfade or scroll-step between pairs, price present but visually tertiary. Three to five pairs maximum — scarcity of attention as a design statement. This uses only approved motion techniques and converts the existing "6 cards + Shop buttons" rhythm into the pace of a showroom.

### 13. Founding Cohort as a designed surface, not a paragraph
**Effort: medium · Builds on existing (MG-1's Founding Cohort block, `email-signup-banner.liquid`)**
The audit judged the Founding Cohort allocation ("by count, not by date") the estate's most defensible scarcity device. Give it a real surface: a restrained homepage band — *"The Founding Cohort — allocation 214 of 500"* — with a live count from actual signups, a single email field, and no other promise except early allocation. Numbers only move when real people join (pre-launch this is honest — infrastructure exists to wire it). This replaces generic newsletter capture with the one urgency mechanic the brand register actually permits. Drop the "pricing locked" value-pitch line the audit flagged.

### 14. Homepage copy re-cut to the MG-1 register
**Effort: small (copy-only, zero CSS) · Builds on existing (`index.json` settings + section defaults)**
Not a design feature, but the multiplier for every item above: rewrite every homepage string to the MG-1 / Welcome-Email-2 register — no "perfect" (×4 currently), no rhetorical questions, no "around the world," and pull `about.liquid`'s "make premium socks accessible to everyone" (accessibility framing is anti-tier). The brand-voice audit already names the homepage the weakest live surface; every visual recommendation above underperforms if it animates mid-market sentences. This can ship inside the Design Freeze's spirit (content, not CSS) but still needs Guy's line-by-line approval.

---

## Explicitly excluded

Deliberately left out: anything from the gamification/urgency family (spin-to-win, countdowns, exit-intent popups, "X people are viewing this," loyalty points, badges for the quiz) and the already-vetoed tech stack (WebGL/Three.js sock configurators, 3D spin viewers, custom cursors, page-transition takeovers) — the former because they are precisely the discount-store grammar Iron Law 2 exists to prevent, the latter because `DESIGN_DECISIONS.md` vetoes them permanently on performance and stack-compatibility grounds and a "wow" that costs 1.5s of TTI is a net loss at this tier.

## Suggested next step

If only one item could be approved: **#8 — Sock Finder v2 (quiz → consultation), bundled with its result rendering the existing Material Profile block.** Rationale: it's the highest ratio of wow to risk — the interactive engine, the metafield schema, and the visual language all already exist, so it's mostly re-copy and result-screen work; it directly fixes an audit-flagged banned-word surface ("Find Your Perfect Sock"); and it's the one feature where a first-time visitor personally *experiences* the brand's claimed authority ("I was just fitted by a specialist") rather than reading about it. Items #1 and #14 (sale-grammar removal, copy re-cut) should ride along as near-zero-cost hygiene the moment any change window opens.
