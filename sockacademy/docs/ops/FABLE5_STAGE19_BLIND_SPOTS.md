# FABLE 5 — Stage 19: Blind-Spot Discovery for a Solo Founder
**Written 06/07/2026 (Fable 5, Stage 19). 100% read-only pass — no code, config, or doc was changed by this stage.**
**Brief:** `FABLE5_ACTION_TRACKER.md` → "Queued for next Fable dispatch (Stage 19 candidate)", categories A–E. Claude drafted the category list; this stage investigated each one against the actual repo, DNS, and public record — not against generic founder-failure lore.

**How to read severity here:** most items below are honestly *not urgent at 0 orders*. Two are genuinely real today and cheap to act on: **E2 (a same-name UK sock company exists — verified)** and **D4 (the brand domain cannot authenticate Shopify email today — verified via DNS)**. Everything else has a named future trigger, almost always the Phase 2 gate that already exists.

**Owner tags:** 🧑 Guy-only · 🤖 Claude-executable-now · ⏳ deferred-to-Phase-N (with the trigger named).

---

## A. External tooling worth adding that nobody has proposed

**What was checked:** the fleet's actual workflow (30 agents on GitHub Actions crons → Supabase via REST → Shopify/Klaviyo/CJ APIs → Telegram/email alerts), the MCP/Skills verdict tables in `CLAUDE.md` (post-Stage-17 true-up), prior tooling rulings (Stage 6: Paperclip/KARIMO DO NOT ADOPT — those verdicts stand, not re-litigated), and the recurring friction patterns in `ANTI_RECURRENCE_PROTOCOL.md`.

**Findings — four grounded candidates, two anti-recommendations:**

1. **Official Shopify Dev MCP server (`@shopify/dev-mcp`) — config-only, free, freeze-safe.**
   Grounding: 6+ agents hand-write Shopify Admin API calls pinned at `2025-01`; theme work is queued (homepage copy re-cut, Sock Finder v2 #8); and protocol #41 documents hours lost to Shopify-platform drift (OAuth flow changed under us). A live Shopify schema/docs lookup in Claude Code sessions directly attacks that failure class. Installs into local Claude config only — zero repo change, no freeze conflict. **🧑 approves → 🤖 installs (one `claude mcp add` command).**

2. **Official Supabase MCP server in read-only mode — config-only, freeze-safe, with one caveat.**
   Grounding: the project's #1 recurring DB failure class is "SQL file ≠ real DB" (protocols #23, #26), and the tracker still carries a standing "Guy-only follow-up: re-run corrected SQL in Supabase SQL Editor" because no session can see the live DB. A read-only MCP connection lets Claude *verify* schema/policies directly instead of asking Guy to relay. Caveat: it holds a Supabase PAT in local config — given the `settings.local.json` history (Stage 6), the token should be a read-only/scoped one and never committed. **🧑 decides (it's a credential-surface trade-off) → 🤖 installs.**

3. **External uptime monitor for the storefront (UptimeRobot free tier or equivalent).**
   Verified gap: despite `CLAUDE.md`'s A7 description mentioning "UptimeRobot (ניטור)" as a plugin idea, nothing in the repo or fleet actually checks that `sockacademy.store` is up — A7 monitors *CJ supplier* health, not the store. All fleet monitoring watches the agents, none watches the shop. Zero-code, ~10 minutes, free, alerts to email/Telegram. Low value while sold-out/pre-traffic; real value the day paid traffic starts. **🧑, do at launch (or now — 10 min).**

4. **One-off automated accessibility scan (axe-core / Lighthouse) against the live store.**
   Not a new workflow (that would breach the freeze) — a single Claude session task: run the scan locally against the live URLs, triage output against section B2 below. Deterministic complement to the manual audit done this stage. **🤖 now, or bundled into the Sock Finder v2 pass (item #8).**

**Anti-recommendations (explicitly considered, rejected):** a GitHub MCP server (the `gh` CLI already covers every fleet operation used in practice); any observability SaaS beyond the existing LangFuse wiring (`corp/core/observability.js` — already built, graceful no-op); re-opening Paperclip/KARIMO (Stage 6 ruling stands). No new agents/tables/workflows proposed — everything above is local-config or Guy-side SaaS.

**Severity:** quality-of-life, not risk. Nothing here blocks or unblocks launch.

---

## B. Legal exposure beyond the attorney packet

### B1. No legal entity + live international checkout — actual exposure today

**Verified facts:** `ENTITY_TYPE=SOLE_PROPRIETOR` (`sockacademy/.env.example:62`); `CLAUDE.md` "ישות משפטית: אין עדיין — גיא ישראל"; and — the fact that caps today's exposure — **all 5 products are inventory-zero / Sold Out** (`CLAUDE.md`, "כל המוצרים Sold Out (אין מלאי לספק עדיין)"). The checkout is live but nothing is currently purchasable, so present transactional exposure is approximately zero. The attorney packet already asks entity timing as Q7 (`FABLE5_ATTORNEY_PREP.md:67`) — good; the packet just hasn't been sent (tracker item 1.3).

**General guidance (not verifiable from code — labeled as such):**
- *Israel side:* opening a tax file (מע"מ / מס הכנסה / ביטוח לאומי) is tied to **commencing business activity**, not to a revenue threshold. The practical trigger is the first real sale, not "$X MRR." עוסק פטור registration is cheap and is typically the right first step below the annual turnover ceiling (~₪120K region — verify the current figure with an accountant). This is the one piece that arguably shouldn't wait for attorney Q7's answer: it's an accountant task, ~1 hour, and doing it *before* the first order means never being retroactively out of compliance.
- *Personal liability:* sole proprietor = unlimited personal liability, but the realistic risk on plain adult socks is among the lowest in apparel — and the brand constitution helps here more than anyone noticed: children's/baby products (the actual product-liability hot zone) are **BLOCKED by Iron Law** (`VISION.md` Blocked list). The ToS limitation-of-liability clause (under attorney review) is the real day-1 protection layer.
- *When an entity stops being optional:* the honest answer is there's no statutory cliff — it's risk-proportionality. Natural trigger already defined in this project: **the Phase 2 gate (25 orders / $1K MRR)**. At that point there's real order flow, real US consumers, and A15 CFO activates with `ENTITY_TYPE` as a variable it was explicitly built to switch (`CLAUDE.md` Strategic Decisions). Recommendation: put "entity go/no-go" on the Phase 2 activation checklist, and let attorney Q7's answer set the exact form (Israeli עוסק→חברה בע"מ vs US LLC).

**Next actions:** 🧑 send the attorney packet (already tracker 1.3 — this stage adds urgency only via E2/Q8 below). 🧑 open the Israeli tax file with an accountant before first sale (~1hr, independent of the attorney). ⏳ entity formation decision → Phase 2 gate.

### B2. ADA/WCAG — actual theme audit (not "go audit it")

**What holds up (verified):** the theme is Dawn-based and keeps Dawn's accessibility spine: skip-to-content link (`layout/theme.liquid:383`), a11y announcement strings (`:399-446`), `prefers-reduced-motion` kill-switch for the GSAP reveal system (`:67-69`), and a `<noscript>` fallback forcing all sections visible (`:71-76`). A regex sweep found **zero `<img>` tags missing `alt`** across `sections/` (multiline-verified). A2 sets alt text from the product name on every API upload (`agents/A2_product_upload/agent.js:129`). Core color tokens **pass WCAG AA by computation**: `--muted` rgba(240,237,230,.55) on `--surface-base` #1A1A1A ≈ 5.4:1; `--gold` #C9A84C on #1A1A1A ≈ 7.6:1 (`assets/sockacademy.css:39-57`). The palette is not the problem.

**Real gaps found (all in the custom Sock Finder, `sections/sock-finder.liquid`):**
1. **The entire quiz is JS-injected into an empty `<div class="sfq__stage">` (`:346`)** — no server-rendered fallback and, unlike the theme-level animations, no noscript path. No JS = a heading above an empty box.
2. **No `aria-live` region and no focus management:** every step transition replaces `stage.innerHTML` (`:447`, `:486`). A screen reader hears nothing when the question changes; a keyboard user's focus silently drops to `<body>` after each answer (the button they pressed is destroyed). The options are real `<button>`s (good — tabbable/clickable), but the flow breaks at each step boundary.
3. **Progress bar is decorative-only** (`:348-350`) — no `role="progressbar"`/`aria-valuenow`. Minor, since "Step X of 3" text exists (`:449`).
4. **Computed text sizes are likely far below intent:** Dawn sets `html { font-size: 62.5% }` → `1rem = 10px` (`layout/theme.liquid:293`), so the quiz's 0.65–0.9rem labels compute to **6.5–9px**. If the section was authored assuming `1rem = 16px`, everything in it renders ~37.5% smaller than designed. *2-minute check for Guy/Claude: open the live homepage, devtools, computed font-size on `.sfq__question`.* Same base-unit question applies to other custom sections.

**Severity — honest calibration:** US demand-letter mills target stores with visible revenue; a pre-revenue, sold-out storefront is a low-value target *today*. This is a fix-cheap-before-traffic item, not an emergency. The efficient path: fold fixes 1–3 into the already-queued **Sock Finder v2 rewrite (tracker item #8)** so the Design Freeze is only disturbed once. **🤖 (bundle into item #8; the axe scan from A4 above validates the rest of the theme).**

### B3. Sales tax / VAT nexus

**Verified from repo:** `VAT_RATE=0.17`, `TAX_JURISDICTION=IL` (`.env.example:60-61`); the Phase 2 gate hard-codes the assumption "tax reserve = revenue × 0.17 (IL VAT)" (`PHASE_ARCHITECTURE_SKELETON.md:534`); tax tooling (Avalara, EU VAT) is explicitly deferred to Phase 4/A30 (`PHASE_ARCHITECTURE_SKELETON.md:369`). **Shopify's actual tax-collection settings are not visible from this repo — that is a Shopify Admin screen only Guy can check.** Honest statement: nothing in code tells us whether the store is currently set to collect US sales tax (it should NOT be, anywhere, until registered somewhere — collecting tax you're not registered to remit is worse than not collecting).

**General guidance (labeled — thresholds are legal facts I can state but not verify against Guy's situation):**
- *US:* post-*Wayfair* economic nexus is typically **$100K sales or 200 transactions per state per year**. At a 25-order Phase 2 scale this is years away. No action now beyond the 5-minute settings check.
- *EU:* the trap for dropship specifically — without IOSS registration, every EU order under €150 arrives with **import VAT + a courier "handling fee" collected from the customer at the door**. For a premium-register brand that surprise is a brand wound, not just a tax detail. Options: register IOSS when EU orders become real, or geofence/ship-to-US-only at launch, or state landed-cost honestly on the shipping policy page. Decision belongs with the positioning call (3.1), trigger = first EU order interest.
- *Israel:* whether USD sales of goods that never physically enter Israel are zero-rated exports for מע"מ is precisely attorney/accountant territory — and is **already in the packet as Q7(b)**. The coded `revenue × 0.17` reserve (Phase 2 gate) is conservative (over-reserves if exports are zero-rated), which is the safe direction — fine to leave until Q7 is answered.

**Next actions:** 🧑 5-min check: Shopify Admin → Settings → Taxes and duties → confirm no US tax collection is enabled. 🧑 Q7(b) rides the existing attorney packet. ⏳ IOSS/EU decision → first real EU demand (Phase 2+). ⏳ A15's VAT logic gets corrected to Q7's answer at Phase 2 build time — no code change now (freeze).

---

## C. Business continuity / bus-factor

**Verified:** this has never been addressed anywhere. All 42 anti-recurrence protocols read — none touches founder incapacity, credential recovery, or a second person. `CLAUDE.md` has no recovery path. Every credential lives in exactly two places: GitHub Secrets (write-only, recoverable only via Guy's GitHub login) and a local `.env` on one Windows machine (OneDrive-synced folder — noted in Stage 6). Telegram alerts go to Guy alone. There is no second human with access to anything.

**What actually happens if Guy is unreachable — traced, not assumed:**
- *Week 1 (today, pre-revenue):* almost nothing. The fleet is autonomous on crons; most agents are LAUNCH_MODE-dormant; the store is sold out. Honest verdict: a week of absence currently costs ~nothing. Do not build an enterprise DR process for this.
- *Day 60 (the real cliff, verified mechanism):* **GitHub automatically disables all scheduled workflows in a repository after 60 days without repo activity.** No commits for 60 days → every cron in the fleet silently stops, *including A0 itself* — so the watchdog dies with the watched. Downstream chain: Supabase free-tier projects pause after ~7 days of full inactivity — today it's A0's daily `agent_health_log` writes keeping the project warm, so the pause chains ~1 week behind the cron death.
- *Annual cliffs:* domain renewal at GoDaddy and Shopify subscription billing. A failed card + unreachable founder = storefront gone / domain lapsed, independent of anything in this repo.
- *Post-Phase-2 (the real bus-factor cost):* once orders exist, fulfillment is Guy-by-hand until A2.7 (per the skeleton, deliberately). A week unreachable then = paid orders sitting unfulfilled and CS unanswered — the exact "single worst failure" A2.7's spec names.

**Proportionate fix (deliberately minimal — one document, ~1-2 hours, no code):**
1. 🧑 **One sealed continuity note** for one trusted person (physical envelope or a password manager's emergency-access feature — Bitwarden/1Password have this built in and free/cheap): list of the ~10 accounts (GitHub, Google, Shopify, GoDaddy, Klaviyo, Supabase, Upstash, Telegram, CJ, Meta), 2FA **backup codes** for each, where the `.env` lives, and a 3-line instruction: "if I'm out >2 weeks: set the Shopify store to password mode, refund any open orders, let the rest idle."
2. 🧑 **Google Inactive Account Manager** (free, 10 min) — automates handing Gmail access to a chosen person after N months of inactivity; the Gmail account is the recovery root for most of the others.
3. ⏳ At **Phase 2 activation**: add "who fulfills/refunds if I'm offline for a week?" to the activation checklist alongside A2.7's HITL ramp. Not before — there is nothing to hand over until there are orders.

**Severity:** low probability, total-loss magnitude, near-zero mitigation cost — the classic case where a 2-hour one-off is correct and anything bigger is theater. Also note the day-60 cliff has a *non-emergency* twin: any planned long pause in development has the same fleet-death effect (a single trivial commit resets the clock).

---

## D. Infrastructure single points of failure

### D1. Free-tier cliffs

**What could be verified:** the repo is **PUBLIC** (established Stage 3'), which means GitHub Actions minutes are free/unmetered — there is no Actions-minutes cliff *while it stays public* (note the irony: the same publicness that caused the Klaviyo exposure is what makes the CI bill $0; if the repo is ever flipped private post-incident, the free private tier is 2,000 min/month — likely still enough after the Stage 13 cron diet, but it becomes a number to watch). The Upstash queue is wired into exactly one workflow (`shopify-webhook-handler.yml` — verified, no other YAML references UPSTASH) and `queue.js` gracefully no-ops without credentials — so an Upstash limit cannot hurt anything today; it becomes load-bearing only when A2.7 rides it (Phase 2, and Stage 18's Q-HARDEN already owns that). **The actual Supabase/Upstash plan tiers are not verifiable from the repo — Guy-side dashboard facts.** Assumed free tier per project context.

**The honest de-escalation nobody said out loud:** a real *storefront traffic spike* — the scenario in the brief — does not touch Supabase, Upstash, or GitHub Actions at all. The customer-facing store is 100% Shopify-hosted; Shopify absorbs the spike. The fleet's tiers are back-office. A viral moment cannot take the shop down via our infrastructure; the worst a hit free-tier limit does is pause agent telemetry/content. Severity accordingly: **low**.

**Real Supabase free-tier facts that do matter:** no automated backups on the free tier (see D2), ~500MB database cap, and project-pause-on-inactivity (chained to the C day-60 cliff above). Also verified: **no retention/pruning exists anywhere** — the only `.delete()` in the codebase is `rag-ingest.js:155` (re-ingest logic). `agent_health_log`/`queue_log` grow unbounded; at current row sizes that's years from 500MB, so this is a note, not an action.

### D2. Data backup — verified: none exists

If the Supabase project were deleted or corrupted tomorrow, **all data is gone**: the SQL files in git recreate empty structure only. Verified: no `pg_dump`, no export automation anywhere in `corp/core/` or any agent; the only "backup" in the codebase is A5's *image* backup to Google Drive (`backupToDrive`, A5 only) and the free tier has no Supabase-side automatic backups to fall back on. What's actually at risk *today*: agent telemetry, product records, trends, knowledge_chunks — annoying to lose, not fatal, pre-revenue. What's at risk *at Phase 2*: `fulfillments` and `financials` — business-critical and legally relevant.

**Actions, freeze-respecting:**
- 🧑 **Now, zero build:** a manual dump once a month — Supabase Dashboard/CLI (`supabase db dump`) to a local file. 10 minutes/month, covers the current risk level completely.
- ⏳ **At `PHASE_2_ACTIVATE_BY_GUY`:** one scheduled backup workflow (single YAML + `pg_dump` to an artifact or private location) added to the Phase 2 gate checklist next to A2.7 — because that's the moment the data becomes irreplaceable. This is a new workflow, so it correctly waits for the freeze to lift. If Guy prefers it sooner, it qualifies as a named freeze exception (data-safety, not a feature) — his call, flagged, not assumed.

### D3. Domain / registrar security

Not verifiable from code — said plainly. Verified context: domain registered at GoDaddy (`CLAUDE.md`), confirmed live via nameservers `ns11/ns12.domaincontrol.com` (DNS query this stage). 🧑 **5-minute self-check:** GoDaddy account → 2FA enabled (app-based, not SMS if offered), auto-renew ON for `sockacademy.store`, domain transfer lock ON, and the account's recovery email is one Guy controls. The whole business fronts through this one login.

### D4. Email deliverability — verified live gaps (the strongest finding in this category)

Checked by direct DNS queries this stage (read-only):
- **No SPF record exists on `sockacademy.store`** — the root domain's only TXT is a Klaviyo site-verification token. Nothing declares who may send mail as `@sockacademy.store`.
- **DMARC is live at `p=quarantine`** with GoDaddy-default reporting (`rua=` points at `onsecureserver.net` — i.e., **reports go to GoDaddy's void, Guy would never see a deliverability failure**). Relaxed alignment (`adkim=r; aspf=r`).
- **Shopify's sender-authentication CNAMEs do not exist** (`shop1._domainkey` / `shop2._domainkey` → NXDOMAIN, verified). The Shopify store cannot DKIM-sign as the brand domain today.
- **Klaviyo is properly set up**: `mail.sockacademy.store` is NS-delegated to Klaviyo (`ns1.klaviyo.com`, verified), so Klaviyo manages its own SPF/DKIM inside that zone and relaxed alignment makes it DMARC-pass against the org domain. The Welcome/Abandoned-Cart flows are fine.

**What this means concretely:** marketing email (Klaviyo) is healthy; **transactional email (Shopify: order confirmations, shipping notifications) is the exposed lane.** With no domain authentication, Shopify either sends "via shopifyemail.com" (unbranded, but delivered) or — under Gmail/Yahoo's bulk-sender rules — the brand-domain From gets rewritten or degraded. Either way, the first thing a paying customer receives is the least-branded, least-trusted email in the whole stack, and with DMARC reports going to GoDaddy, **the failure mode is silent by construction** — nobody would notice except via customer complaints.

**Fix — 🧑, ~15 minutes, zero code, no freeze conflict (DNS + Shopify Admin only):**
1. Shopify Admin → Settings → Notifications → Sender email → "Authenticate domain" — Shopify shows the exact CNAMEs to add at GoDaddy.
2. Add a root SPF TXT covering actual senders (Shopify's wizard supplies its include; Klaviyo's subdomain needs nothing at root).
3. Point the DMARC `rua=` at a mailbox Guy actually reads (or a free DMARC-report viewer) so future breakage is visible.
Best done **before** the first real order — this is genuinely pre-launch, unlike most of this document.

---

## E. Insurance and brand-name risk

### E1. General/product liability insurance

Out of code-verification scope — plain proportionate guidance, labeled as such. A pre-revenue dropshipper with zero shipped orders has essentially nothing to insure: no premises, no employees, no inventory, no shipped product in the field. Plain adult socks are near the bottom of apparel liability risk, and the categories that drive apparel claims (children's/baby products, medical/compression claims) are already constitutionally blocked or quarantined (`VISION.md` Blocked list; MG-2/Q5-Q6 medical-claims hold) — the brand constitution is quietly doing risk-management work here. **Trigger to act:** first real order batch / Phase 2 — then a basic general+product liability policy (US-market BOP-equivalent or Israeli עסק policy, typically low hundreds of $/year at this scale) becomes a reasonable spend. Until then the attorney-reviewed ToS limitation-of-liability is the protection layer, which is one more quiet reason 1.3 (send the packet) leads everything. **⏳ Phase 2 gate → 🧑.**

### E2. Trademark clearance — a same-name company EXISTS (verified) 🔴

This stage ran a surface web check (labeled: *a surface check, not a legal clearance search* — I have no trademark-database access). It found something material immediately:

**"Sock Academy Ltd" is a real, established UK sock company.** UK Companies House registration **05743003**; trading heritage since 2006, "Sock Academy" formed 2017; operates **sockacademy.com** (they hold the .com of this brand's exact name); houses three sock brands (United Oddsocks, Cucamelon, Cockney Spaniel); designs in the UK, manufactures in Turkey, and states retail presence in **18 countries**. Same name, same product category (socks, Nice Class 25), senior by nearly a decade, actively exhibiting (Spring Fair 2026).

**What I could NOT verify:** whether they hold *registered* trademarks for "SOCK ACADEMY" at UKIPO/EUIPO/USPTO/ILPO, and whether their 18-country footprint includes the US (Guy's primary market). Their catalog is novelty/humor socks — the exact register SockAcademy's constitution bans — so brand *confusion* in the wild may be low; but trademark conflict is decided by mark + goods class, not by tone.

**Why this is the single most consequential finding in this document:** every dollar of brand equity built into the name "SockAcademy" is at risk of a forced rebrand if a senior registered mark exists in a target market — and the cost asymmetry is brutal: checking now is free-to-cheap; rebranding after traction (domain, theme, content estate, social handles, the literal brand DNA docs) would be the most expensive event in the project's history. Two existing project plans quietly depend on this being clear: A17's own-mark registration path (`PHASE_ARCHITECTURE_SKELETON.md` Phase 3A, dependency "Trademark registration") and Phase 5's licensing ambitions. Also telling in hindsight: the brand lives on `.store` because the `.com` was never available — a signal the name was never cleared.

**Next actions, in order:**
1. 🧑 **Add this as Q8 to the attorney packet before sending it** (the packet hasn't gone out yet — tracker 1.3 — so this costs zero extra): "A UK company 'Sock Academy Ltd' (Companies House 05743003, sockacademy.com, novelty socks, claims 18-country distribution) predates us. Please run/commission a knock-out clearance search for SOCK ACADEMY / SOCKACADEMY in class 25 for US, UK, EU, IL, and advise on risk of use and on our own registration strategy."
2. 🧑 **30-minute free self-check in parallel:** USPTO search (tmsearch.uspto.gov), UKIPO and EUIPO online search, Israel ILPO — search "SOCK ACADEMY" and "SOCKACADEMY", class 25. This doesn't replace #1; it tells Guy tonight whether there's an obvious registered blocker.
3. 🧑 **Hold all trademark-filing spend and any paid brand-equity pushes** (paid ads at scale, PR) until #1 answers. Organic pre-launch work can continue — the exposure scales with visibility and revenue, both currently ~zero.
4. ⏳ If cleared: file per attorney advice at Phase 2/3 per the existing A17 plan. If conflicted: the rebrand conversation happens *now*, at 0 orders, when it costs almost nothing — which is exactly why this check exists in a blind-spot audit.

**Severity: high-attention / low-cost.** Nothing is on fire at 0 revenue — but this is the one item whose cost explodes with success, and the check is nearly free.

---

## Addendum — automated axe-core scan of the live storefront (06/07/2026, Claude, tracker item 9)

Read-only diagnostic per `FABLE5_ACTION_TRACKER.md` item 9 ("axe/Lighthouse scan of live store").
Ran `@axe-core/cli` (headless Chrome) against three live URLs — homepage, `/collections/all`, and a
product page (`/products/egyptian-cotton-dress-socks`). No theme file was touched by this scan.

**Result: 42 / 27 / 35 issues respectively, and one clear pattern emerges — a site-wide footer defect,
plus a refinement (not a contradiction) of §B2's manual contrast check.**

1. **Site-wide, every page: `color-contrast` + `region` violations concentrated in the footer**
   (`sections/footer.liquid`, `.sf__*` classes — 9 identical `region` violations and 15-17 identical
   `color-contrast` violations on all 3 pages). Root cause traced: the footer uses `--muted`
   (`rgba(240,237,230,.55)`) and `--ghost` (`rgba(240,237,230,.25)`) on `--surface-void` (`#111111` —
   `assets/sockacademy.css:38,56-58`), a **darker background than `--surface-base` (`#1A1A1A`)**, which
   is the pair §B2 manually computed as AA-passing. Different background token, different (real,
   browser-measured) result — this refines §B2's finding rather than contradicting it: the palette's
   *primary* surface pairing is fine, but `--surface-void` (footer, deep overlays per its own CSS
   comment) pushes `--muted`/`--ghost` text below AA in the browser's actual rendering. The `region`
   violations mean several footer sub-blocks (`.sf__col--brand`, `.sf__legal-bar`, `.sf__bottom`,
   newsletter block) render outside any landmark despite the outer `<footer id="sa-footer-...">` tag
   existing (`sections/footer.liquid:289`) — exact nesting cause not root-caused here (diagnostic
   scope only).
2. **Homepage-specific:** the same `--muted`-on-dark pattern recurs in `.features__card-text`,
   `.features__trust-sub`, `.sa-bento__stat-label`, `.sa-bento__benefit-sub`, and category-preview
   card captions — i.e. this is a **recurring token-pairing pattern**, not one isolated footer bug.
3. **Collection page:** one `heading-order` violation — a product card's `<h3>` (`a[aria-label="Egyptian
   Cotton Dress Socks"] > .ac-card__info > h3`) skips a heading level.
4. **Product page:** one `aria-prohibited-attr` on `.sp__stars` — **not found in this repo's own
   `.liquid`/`.css` source** (searched `sections/`, `snippets/`); this class is not defined anywhere in
   our theme files, meaning it's rendered by the third-party review-app widget (Judge.me, per the
   tracker's existing install-pending note) — flag to the app's support/settings, not a theme fix.

**How this relates to §B2 and item #8 (Sock Finder v2):** none of the above 4 findings are inside
`sections/sock-finder.liquid` itself — §B2's manual findings there (missing `aria-live`, focus loss on
`innerHTML` swap, JS-only render with no noscript fallback) stand unchanged and unconfirmed/
unrefuted by this automated pass (axe's static scan can't exercise the quiz's multi-step JS
interaction). **New scope for the same already-queued fix batch:** the footer's contrast-token pairing
and landmark structure should be fixed alongside item #8, since both are Design-Freeze-gated theme
edits and bundling avoids opening the freeze twice. Severity: same as §B2 — cheap to fix, not urgent
at zero traffic, correctly deferred to the Freeze-lift batch (tracker item C).

**Next action:** 🤖, bundled into item #8 (Sock Finder v2 + footer contrast/landmark fix), gated on
Guy approving the Design Freeze partial-lift batch (tracker item C) — no code touched by this scan.

---

## Consolidated action list

| # | Action | Owner | When |
|---|--------|-------|------|
| 1 | Add trademark Q8 to attorney packet + send (1.3) | 🧑 | This week — packet was going anyway |
| 2 | USPTO/UKIPO/EUIPO/ILPO self-search "SOCK ACADEMY" cl.25 | 🧑 | 30 min, any evening |
| 3 | Authenticate Shopify sender domain + root SPF + DMARC rua | 🧑 | ~15 min, before first order |
| 4 | Shopify Admin tax settings check (no US collection enabled) | 🧑 | 5 min |
| 5 | GoDaddy 2FA / auto-renew / transfer-lock check | 🧑 | 5 min |
| 6 | Continuity note (accounts + 2FA backup codes + 3-line instruction) + Google Inactive Account Manager | 🧑 | ~2 hours, once |
| 7 | Israeli tax file via accountant (before first sale) | 🧑 | ~1 hr, before launch |
| 8 | Monthly manual Supabase dump | 🧑 | 10 min/month starting now |
| 9 | ✅ **Done 06/07/2026** — axe scan of live store (3 pages) ran; found a site-wide footer contrast/landmark defect + 1 heading-order + 1 third-party-widget issue (see Addendum above). Sock Finder ARIA/focus/noscript fixes (§B2, unconfirmed/unrefuted by this scan) + the new footer fix both fold into item #8 | 🤖 (scan done) → 🤖 (fix, gated on C) | Fix waits on Design Freeze partial-lift approval (item C) |
| 10 | Shopify Dev MCP install | ✅ **Done 06/07/2026** — `@shopify/dev-mcp` installed (`--scope user`, local config only, no credentials). First attempt hit a corrupted npx cache entry, fixed via `npm cache verify`; re-verified `claude mcp list` → Connected. | — |
| 10b | Supabase MCP (read-only) install | 🧑 blocked — needs Guy to generate a Supabase account-level Personal Access Token from his Dashboard (Account Settings → Access Tokens) himself; the existing `SUPABASE_SERVICE_KEY` is deliberately not substituted (too high-privilege for a read-only tool). Exact install command documented in `CLAUDE.md`'s MCP table. | Whenever Guy has 2 minutes to generate the token |
| 11 | UptimeRobot on the storefront | 🧑 | At launch (or now, 10 min) |
| 12 | Scheduled Supabase backup workflow + entity go/no-go + insurance + IOSS decision | ⏳ | Phase 2 gate (`PHASE_2_ACTIVATE_BY_GUY`) — add all four to the activation checklist |

**Freeze compliance note:** nothing above requires a new agent, module, table, or workflow before Phase 2 — items are Guy-side settings/SaaS (3,4,5,6,7,8,11), local Claude config (10), bundled into already-approved work (9), or explicitly deferred to the Phase 2 gate (12). The one borderline case (automated backup workflow) is routed to Phase 2 by default with a named freeze-exception option left to Guy.

**Secrets note (protocol #42):** no credential values appear in this document. One observation reported by location only: the root domain's public DNS carries a Klaviyo site-verification TXT record — a public-by-design value, no action needed.

*Sources for E2 (external, this stage's web check): sockacademy.com (their live site + About page), UK Companies House record 05743003, LinkedIn company page "Sock Academy Ltd", Spring Fair 2026 exhibitor listing. US trademark-register status unverified — USPTO TSDR/tmsearch is the authoritative check.*
