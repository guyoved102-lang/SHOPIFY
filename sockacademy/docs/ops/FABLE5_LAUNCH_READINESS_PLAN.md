# FABLE5 LAUNCH READINESS PLAN — תוכנית הפעלה
**Written 05/07/2026 (Fable 5, Stage 14 master synthesis). Read-only synthesis — no code or doc was changed by this pass.**

## How to read this document

This is the single consolidated action plan built from all 11 completed Fable 5 review stages
(project map, tooling, CLAUDE.md consolidation, phase reconciliation, QA gate, attorney prep,
brand voice, pricing, A5 alert design, RLS pass, cron review) — ranked by what actually needs to
happen and in what order, not a re-listing of raw findings; the depth lives in the source docs,
each cited by filename. Confidence note: findings marked **[verified]** were independently
re-confirmed by direct file/repo inspection per `FABLE5_INITIATIVE_LEDGER.md`; unmarked findings
rest on the original sub-review alone and carry slightly lower confidence.

---

## Tier 1 — Blockers / time-sensitive

**1.1 UPDATE (post-plan, same session): Klaviyo key rotation is DONE. Shopify token rotation still open. [verified]**
The key (`pk_QSMqNV_...`) was printed in full inside the committed `CLAUDE.md`; the repo
(`guyoved102-lang/SHOPIFY`) is **PUBLIC**, and `git log -S` showed the key present since the very
first commit — real live public exposure, not historical (`FABLE5_INITIATIVE_LEDGER.md` Stage 3';
original finding `FABLE5_TOOLING_REVIEW.md` §4.1, `FABLE5_CLAUDE_MD_CONSOLIDATION.md` §30). Since
this plan's source docs were written: **Guy has rotated the Klaviyo key** (confirmed), and the
CLAUDE.md redaction was already committed and pushed (`94d39c5`) — that part of this item is
closed. **Still open:** the Shopify access token that sat in `.claude/settings.local.json` (entries
already stripped locally, hook already fixed per ledger Stage 6) — Guy deleted/revoked the old
exposed token, but has **not yet** created its replacement, because the app used for it
("SOCKACADEMY KEY" in Shopify's Partners dev dashboard) turned out to be a Managed-Installation
app (no `code=` OAuth param, `exchange_token.js` doesn't apply to it) — deferred by Guy mid-session
to resume later via a plain Shopify Admin → Develop apps custom app instead.
*Next action (Guy-only, ~10 min, whenever he's ready):* Shopify Admin → Settings → Apps and sales
channels → Develop apps → create a simple custom app → Install → API credentials → reveal Admin
API access token → update `.env` (`SHOPIFY_MASTER_TOKEN`) + `gh secret set SHOPIFY_MASTER_TOKEN`.
Until then, agents depending on `SHOPIFY_MASTER_TOKEN` (A2,A3,A5,A7,A9,A12) won't run live —
expected and safe while paused.

**1.2 Ungated regulated-health-claim content sits in live topic rotations. [verified]**
The medical-claims quarantine in `research_materials.md` does NOT cover: A3's blog topic
"Copper-Infused Socks" (keyword "antimicrobial socks"), A5's caption topic "Antimicrobial fibers —
copper-infused socks decoded", and a full pre-written diabetic-foot-health article in
`scripts/setup/content-generator.js` (`FABLE5_ATTORNEY_PREP.md` Q5). If the A3/A5 rotation ever
selects those topics in a live run, regulated claims could reach output before attorney review.
Content is currently held by the QA gate + LAUNCH_MODE dormancy, so exposure is contained — but
it is one flag-flip away from not being.
*Next action:* Guy decides delete-now vs hold-for-attorney-ruling (logged as PENDING in memory);
the cheap containment is deleting the two topic-list entries today and letting the attorney set
the permanent line via Q5.

**1.3 Attorney review of A9 legal templates — the single true pre-launch blocker.**
Open since ~27/06; MG-2's publish is chained behind it (`FABLE5_PROJECT_MAP.md` tension #1). The
packet is now ready: `FABLE5_ATTORNEY_PREP.md` contains the four templates' locations, business
context, and questions Q1–Q7 (jurisdiction, GDPR, FTC, medical-claims line, MG-2 clearance,
entity timing). Every launch-path item ultimately queues behind this.
*Next action (Guy-only):* export the four `body_html` blocks from
`agents/A9_legal_compliance/agent.js` to Word/PDF and send the packet to an attorney this week.

**1.4 STALENESS_HOURS vs cron mismatch can silently block Phase 2 forever. [verified]**
`corp/core/orchestration/index.js` sets A8/A10 staleness to 36h ("daily") but both crons are
weekly (Sunday), so A0 falsely flags them stale ~6 days a week — and Readiness ≥95 for 48h is a
hard Phase 2 gate (`FABLE5_CRON_EFFICIENCY.md` issue 2). This is a readiness false-negative built
into the gate itself.
*Next action:* one-file code fix — set A8/A10 to 200h (and align A7's comment/cadence); pair with
the Tier 2 cron re-schedule so the numbers stay consistent.

---

## Tier 2 — Should do before/around launch

**2.1 SQL/RLS mechanical fixes (8+ files).** No data is exposed today — RLS deny-by-default holds
on all 27 tables including PII — but: `products_table.sql:43` uses `CREATE POLICY IF NOT EXISTS`,
which is invalid PostgreSQL and fails on run **[verified]**; 4 tables (`fraud_events`,
`affiliates`, `affiliate_performance`, `regulatory_events`) have RLS enabled with zero policies;
10 non-idempotent `CREATE POLICY` statements will reproduce the recent production
`duplicate_object` error on any re-run (two files falsely claim "idempotent" in their headers)
(`FABLE5_RLS_SANITY_PASS.md`). Fix all in one batch using the `trends.sql` DO-block pattern;
also verify in Supabase that the `products` policy actually exists (`pg_policies`).

**2.2 QA gate 100%-rejection: fix the writers, not the rubric.** The holds are plumbing, not
tonal drift (`FABLE5_QA_GATE_ANALYSIS.md`): A5's `max_tokens: 300` truncates the caption JSON
**[verified]**, the parse-failure fallback fabricates a caption that auto-fails two rubric rules,
and A5's prompt self-contradicts on body length (20-word paragraphs × 3 vs 80–110 words required)
**[verified]**; A3's rubric enforces an opener rule + banned-word list its prompt never states.
Five concrete writer-side fixes are listed in that doc, plus one rubric change: move pure counts
(words, hashtags, CTA suffix) from the LLM judge into deterministic JS. Also start persisting the
QA rejection reasons (today they exist only in Telegram/email) — and check the 04/07 Telegram
QA-withheld messages once to confirm the predicted failure mix before touching brand-voice rules.

**2.3 A5 Instagram publish failure: implement the alert, and Guy fixes Meta.** The 100% publish
failure ran silent for 10+ days because the per-post catch swallows errors and the run still logs
"success" **[verified silent-catch location]**. A ready-to-implement ~10-line aggregated Hebrew
Telegram alert design exists (`FABLE5_A5_ALERT_DESIGN.md`). The underlying fix — Meta Business
Suite permissions / IG_USER_ID — is Guy-only (memory blocker #14) and no code change resolves it.

**2.4 Cron re-schedule: 9 dormant agents burn daily CI runs.** ~270+ no-op runs and ~400–500 CI
minutes/month against the project's own Zero-Waste law; concrete weekly staggered crons proposed,
plus two live/live same-minute overlaps to split (A0/A7 daily 06:00; A5/A8 Sunday 07:00 — the
reporter reads metrics its subject is mid-writing) (`FABLE5_CRON_EFFICIENCY.md` issues 1, 3, 4 —
not independently re-verified, lower stakes). Must ship together with 1.4's staleness fix or A0
will flag the newly-weekly agents stale.

**2.5 Remaining phase-numbering contradictions (2 live).** `VISION.md` disagrees with the
canonical skeleton on the activation triggers of 5+ agents — notably A20 listed Phase 3 vs
canonical Phase 2 **[verified]** — and invents an unlabeled "Scale Phase — Empire";
`MASTER_STRATEGY.html:855` still shows the old "$5K MRR×3" window **[verified]** that the M10 fix
corrected only in the English file (`FABLE5_PHASE_RECONCILIATION.md` N1/N2, exact old→new edits
pre-drafted as F1/F2). N1 needs one Guy decision first (see 3.5); F2 is a one-character-class fix.

**2.6 Execute the CLAUDE.md consolidation.** Full section-by-section plan is approved-ready
(`FABLE5_CLAUDE_MD_CONSOLIDATION.md`): 1,066 → ~450–500 lines, archives the dangerous stale
"11 agents" roster (whose A9–A12 ID meanings contradict the real fleet and intersect the A9
safety protocol), fixes "6 Super-Agents"→10 clusters, "10 sales"→25 orders/$1K, and redacts the
Klaviyo key line permanently. One edit session after Guy approves Part 2. Fold in the small MCP
true-ups from `FABLE5_TOOLING_REVIEW.md` §3 (table verdicts vs installed reality) in the same pass.

**2.7 Homepage copy rewrite — the weakest live surface.** "Perfect" ×4, a rhetorical-question
header, and "socks from around the world" filler sit on the most public page while those exact
patterns are banned by the brand's own QA rubric — which never reviews the homepage
(`FABLE5_BRAND_VOICE_AUDIT.md`). Highest-leverage single content fix; second is retiring or
rewriting the older 5 blog articles (the chatty 14/06 layer), so the blog stops running two
registers at once. In the same pass, resolve the unsourced factual claims stated as fact across
live products/FAQ/articles — "4x faster than cotton", "every pair passes a 48-hour wear test" —
substantiate, soften, or cut (substantiation risk for a pre-launch dropship catalog;
`FABLE5_BRAND_VOICE_AUDIT.md` pattern 4). Copy changes need Guy's approval (brand sensitivity +
Design Freeze).

---

## Tier 3 — Strategic decisions for Guy (not bugs — choices)

**3.1 The positioning gap: the brand talks Loro Piana and prices Bombas.** Two independent
reviews converged: the voice audit found value-math, competitor punch-downs, and
urgency-in-structure (`FABLE5_BRAND_VOICE_AUDIT.md`); the pricing check found the entire coded
price architecture ($18–90 ceiling, live products ~$35) sits in the Bombas/Darn Tough
premium-performance band, while the *cheapest* Loro Piana sock ($150) exceeds SockAcademy's own
maximum allowed price (`FABLE5_COMPETITIVE_PRICING.md` **[ceiling verified in
`corp/core/pricing.js`]**). This is one coherent premium-performance brand wearing a luxury
label. The recommendation from both docs: own premium-performance for Phase 1 (dropship reality),
defer the true-luxury register/pricing to Phase 4 private label when the product can testify for
itself. **Only Guy can make this call — but the two docs agree it should be made explicitly, not
drift.**

**3.2 Discount mechanics vs stated posture.** Every live product carries a permanent
`compare_at_price` strikethrough, WELCOME10 has a 48h expiry, and the cart-recovery Email 3
literally claims "we don't do aggressive discounts" inside a discount sequence
(`FABLE5_BRAND_VOICE_AUDIT.md`). Whatever 3.1 decides, this self-contradiction should be resolved
in that direction: keep the mechanics and drop the no-discount copy, or keep the posture and drop
the mechanics. The voice audit's view: the mechanics damage the register more than any price does.

**3.3 Single-pair floor $18 → ~$22–24.** $18 lands exactly on Happy Socks (a blocked novelty
category) and Stance; $22–24 clears the mass/novelty band and stays inside CLAUDE.md's own
approved $18–28 range (`FABLE5_COMPETITIVE_PRICING.md`). Keep $28/$35/$65 as-is; also fix the doc
inconsistency where the future category table says tactical "$25–40" below the $35 iron floor.

**3.4 QA rubric policy.** The QA-gate analysis recommends strengthen-the-writers (2.2), NOT
relaxing the rubric — every rule traces to Iron Law 2 or the writers' own specs
(`FABLE5_QA_GATE_ANALYSIS.md` §5). Guy signs off on that direction, plus the follow-on question
the voice audit raises: the rubric's rules don't reach the surfaces that are actually public
(homepage, emails, products) — decide whether a periodic human/manual brand pass over live
surfaces becomes standing policy (`FABLE5_BRAND_VOICE_AUDIT.md` "rule asymmetry").

**3.5 VISION.md phase map: is deferring A23/A27/A28 to $15K intentional?** One question decides
whether F1's edits apply (skeleton wins, recommended) or the skeleton itself must change
(`FABLE5_PHASE_RECONCILIATION.md` N1). Answer it before anyone edits VISION.md.

**3.6 ToS jurisdiction — hand to the attorney, don't decide alone.** Delaware law + AAA
arbitration is asserted by an Israeli individual with no US entity (`FABLE5_ATTORNEY_PREP.md`
Q1/Q2/Q7). Already framed as attorney questions; Guy's only job is to actually ask them (1.3).

**3.7 Confirmed non-decisions (already answered, just for the record).** Paperclip and the
KARIMO harness: DO NOT ADOPT — both duplicate working internal capability
(`FABLE5_TOOLING_REVIEW.md` §1–2). A6 having no cron at all: confirm it's intentional that
Klaviyo sync only runs on push/manual (`FABLE5_CRON_EFFICIENCY.md`).

---

## Tier 4 — Nice-to-have / low urgency

- **Trim `GRANT ALL TO anon, authenticated` on 11 tables** (incl. `system_config`) to the
  `command_center_metrics` revoke pattern — inert today (RLS blocks it), pure defense-in-depth
  (`FABLE5_RLS_SANITY_PASS.md` issue 4).
- **Stale cross-refs in superseded MG outline files** (retired "Phase 0"/"Phase 1" labels) — fix
  F3/F4 or just banner the outlines as superseded (`FABLE5_PHASE_RECONCILIATION.md` N3/N4);
  optional FEEL/BELIEVE/BUY "Phase F/B" rename (N5, cosmetic).
- **PHASE_ARCHITECTURE_SKELETON internal defects** (Readiness 85-vs-95 line; A29–A31 table
  contradicting its own Phase 4) — LOW-14, flagged, unfixed (`FABLE5_PROJECT_MAP.md` tension #7).
- **`a25-quality-control.yml` (A2.5) vs `a25-influencer.yml` (A25) filename confusion** — rename
  when touching those files anyway (`FABLE5_CRON_EFFICIENCY.md` cosmetic).
- **Remove or minimize the `magic` MCP server** (the only one installed, ruled inapplicable;
  keep at most `logo_search`) (`FABLE5_TOOLING_REVIEW.md` §3).
- **Minor open Guy items:** GDRIVE_BACKUP_FOLDER_ID, A17 KPI wiring, logo decision, flagship
  variants, CJ_EMAIL/CJ_PASSWORD secret removal (`FABLE5_PROJECT_MAP.md` open item #8,
  `FABLE5_CLAUDE_MD_CONSOLIDATION.md` §16).

---

## Suggested execution order

1. **Rotate the Shopify token** (1.1) — *Guy-only, ~10 min; Klaviyo rotation + CLAUDE.md
   redaction push are already done as of this session.*
2. **Delete/quarantine the 3 ungated medical-claim content items** (1.2) — *needs Guy's
   delete-vs-hold call, then a 5-minute edit.*
3. **Send the attorney packet** (1.3) — *Guy-only external send; the review itself runs in
   parallel with everything below — needs external professional.*
4. **Fix STALENESS_HOURS (A8/A10 → 200h) + the cron re-schedule + the two same-minute splits**
   (1.4 + 2.4, one combined PR) — *small task, one code file + ~11 YAMLs.*
5. **Batch SQL/RLS fix** (2.1) — *small mechanical task, 8+ files, one pattern; verify
   `products` policy in Supabase while at it.*
6. **QA-gate writer fixes + count-checks-to-JS + persist rejection reasons** (2.2) — *small task;
   check the 04/07 Telegram messages first (5 min) to confirm the diagnosis.*
7. **Implement the A5 publish-failure alert** (2.3) — *quick fix, ~10 lines, design ready;* Guy
   fixes Meta Business Suite permissions in parallel — *Guy-only.*
8. **Guy decides the positioning question** (3.1→3.2→3.3) — *needs Guy's decision first; no code
   until decided.*
9. **Homepage rewrite + retire older 5 articles** (2.7) — *small task, but blocked on #8's
   direction so the new copy lands in the chosen register.*
10. **Answer the VISION.md question (3.5), then apply F1/F2 phase fixes** (2.5) — *quick fixes
    once decided.*
11. **Execute the CLAUDE.md consolidation + MCP table true-up** (2.6) — *one focused edit
    session after Guy approves the outline; last because items 1–10 change facts it records.*
12. Tier 4 items — *opportunistic, no deadline.*

---

## What this plan deliberately does NOT include

Stage 2 (site design recommendations, `docs/superpowers/specs/2026-07-04-design-recommendations.md`)
was still running when this synthesis was dispatched and is a separate track that will be merged
in once it completes.
