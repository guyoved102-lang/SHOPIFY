# FABLE5 CLAUDE.md CONSOLIDATION PLAN

> 📌 **Consolidated 06/07/2026:** this doc's findings feed into `FABLE5_LAUNCH_READINESS_PLAN.md` (current execution order) and are tracked live in `FABLE5_ACTION_TRACKER.md`. This file remains the detailed source — read it for depth, not for current status.

**Status: PROPOSAL — read-only analysis. Nothing in `CLAUDE.md` was changed. No edit happens until Guy approves.**
Written 04/07/2026 (Fable 5). Sources of current truth used: `docs/ops/FABLE5_PROJECT_MAP.md` (verified primer), `docs/strategy/PHASE_ARCHITECTURE_SKELETON.md` (canonical phase triggers), `corp/core/orchestration/index.js` `CLUSTERS` (canonical cluster map, per the project map — not re-derived here).

**Why this exists:** CLAUDE.md (1,066 lines) carries layers written 14/06 → 04/07/2026. Several early layers now contradict later sections of the same file or the canonical docs — a live instance of the project's #1 documented failure mode ("docs assert a state the current truth doesn't match"). This document classifies every section and proposes the consolidated shape.

**Legend:** ✅ KEEP AS-IS | 🔴 STALE / CONTRADICTED | 📦 HISTORICAL → ARCHIVE | 🗑️ SAFE TO DELETE
Archive destination for all 📦 items: `sockacademy/docs/ops/CLAUDE_MD_ARCHIVE.md` (move **verbatim**, with original dates — zero information loss).

---

## Part 1 — Section-by-section verdicts
(Headers below are the exact headers in the real CLAUDE.md, in file order.)

### 1. `# SOCKACADEMY - Current State (14/06/2026)` (title line)
**🔴 STALE (title only).** The file's own H1 dates it 14/06/2026 while its newest content is 04/07/2026. Retitle to something dateless, e.g. `# SOCKACADEMY — CLAUDE.md (Living Instructions)` with a "last consolidated" date line.

### 2. `## 🏗️ FILE CREATION PROTOCOL — Zero-Tolerance Enforcement (20/06/2026)`
**✅ KEEP AS-IS.** Current and load-bearing; explicitly defers to `structure-lint.js` as source of truth ("הקוד גובר על התיעוד הזה תמיד"). Updated 01/07 (`ALLOWED_ROOT_ENTRIES`, ANTI_RECURRENCE #30).

### 3. `## 🟢 פרוטוקול פתיחת שיחה — חובה (v3)`
**✅ KEEP AS-IS.** Active session-opening protocol (/boot-sockacademy, token economy, "גיא" addressing, continuous learning). Matches current boot-sockacademy skill.

### 4. `## ⚡ פרוטוקול Mid-Session — טריגרים אוטומטיים (חדש)`
**✅ KEEP AS-IS.** All 7 triggers are active operational behavior (memory-on-confirmation, pre-Write placement check, pre-commit sweep, PARANOIA on milestone, decision capture, anti-recurrence capture, context-limit save). Only cosmetic fix: drop the "(חדש)" tag — it's been in force for weeks.

### 5. `## 🎩 CTO Hat Auto-Triggers`
**✅ KEEP AS-IS.** Compact, current, no contradictions.

### 6. `## 🤝 Consultative CTO Protocol — חובה מ-27/06/2026` (incl. `### 🔒 Strategy Document Supersession Check`)
**✅ KEEP AS-IS.** Active governance; the Supersession Check (01/07, ANTI_RECURRENCE #31) is exactly the mechanism this consolidation itself follows.

### 7. `## 🔴 פרוטוקול סיום שיחה — חובה (v3)`
**✅ KEEP AS-IS.** Active close protocol (QA sweep → memory → lesson capture → git → CI verification → self-critique → report). Matches close-sockacademy skill.

### 8. `## 🧭 SYSTEM RULES, IRON LAWS & CONTEXT ANCHOR — /boot-sockacademy`
**Mixed — KEEP with two surgical fixes:**

- **שלב 1 (memory loading), PARANOIA MODE, GitHub Actions Pre-Deploy Gate (6 checks), שלב 3 Dashboard:** ✅ KEEP AS-IS. The Pre-Deploy Gate is among the freshest content in the file (items 4–6 dated 02–04/07/2026, incl. the A17 Token-Refresher exception).
- **🔴 STALE — חוק ברזל 1 architecture block:** says "בונים את **6 Super-Agents**" and lists SA-1…SA-6 as "ארכיטקטורה נוכחית (החלטה: 20/06/2026)". Current truth: **10 clusters** (SA-1…SA-10; SA-7 C-Suite, SA-8 Supply Chain, SA-9 Risk & Security, SA-10 Revenue Growth added since, the last two on 04/07/2026). Canonical source: `corp/core/orchestration/index.js` (`CLUSTERS`), per `FABLE5_PROJECT_MAP.md`. Fix: keep the Strategic-Patience principle verbatim, replace the hardcoded SA list with a pointer to the `CLUSTERS` object ("the code outranks this doc" — same pattern section 2 already uses for roots).
- **🔴 STALE — the "5 חוקי ברזל" count** (and Dashboard line `🔒 Iron Laws: ACTIVE (5/5)`): per current practice there are **7** iron laws — #6 Telegram Hebrew alerts via `heTelegramMsg()` (canonical: `memory/telegram_hebrew_standard`, Pre-Deploy Gate item 5) and #7 LAUNCH_MODE dormancy gate (dormant agents make zero API calls; flipping LAUNCH_MODE requires Guy's explicit approval). Source: `FABLE5_PROJECT_MAP.md` Iron Laws list. Fix: promote laws 6–7 into the numbered list, dashboard → `ACTIVE (7/7)`.

### 9. `## 🔐 STRICT SECURITY & CHAT PROTOCOLS — חוקי אבטחה מחייבים (20/06/2026)` (S1–S4)
**✅ KEEP AS-IS.** All four chat-security laws active and load-bearing. (Note: section 30 below currently *violates* S2 — see there.)

### 10. `## 🏛️ ARCHITECTURAL OVERHAUL — החלטות נעולות (20/06/2026)`
**📦 HISTORICAL → ARCHIVE (with one carve-out).** The Sheets→Supabase migration it plans ("POC: A2 ראשון", "Phase 2: A0, A10, A11, A13 לאחר A2 PROVEN") is a since-completed migration; the "Tech Stack חדש" table (LangFuse/Upstash/Mem0 "Phase 0 — עכשיו") is a 20/06 aspiration snapshot, not current state. Carve-out: the `### אבטחת Agents — Prompt Injection Awareness` subsection is still live doctrine — **merge it into S3** (section 9), which already half-duplicates it, then archive the rest.

### 11. `## 🎛️ CONTROL CENTER ROADMAP — Business Intelligence & Operations Hub`
**🔴 STALE (status flags), keep the roadmap.** Phase A ✅ fine. **Phase B — Human-in-the-Loop is marked "🔴 Pre-Launch Blocker / מה בונים"** as if unbuilt — current truth: HITL is implemented (`corp/core/hitl.js` + Supabase `pending_approvals`, wired fleet-wide via self-heal; source: `FABLE5_PROJECT_MAP.md` shared-infra list). Fix: mark Phase B ✅ built (pointer to `corp/core/hitl.js`), keep the critical-actions approval list (still policy), keep Phase C as-is (genuinely future, trigger unchanged).

### 12. `## 🗺️ Enterprise Stack — ורדיקטים v2 (CTO Review 18/06/2026)`
**✅ KEEP AS-IS.** Skills/MCP/slash-command verdicts are the live registry; maintained as recently as 02/07 (`magic` verdict). No contradiction found with canonical docs.

### 13. `## 🎯 Strategic Decisions — Locked (18/06/2026)`
**✅ KEEP AS-IS (this is the *correct* version).** Its `### Phase Triggers — Revenue Milestones` table already matches the canonical `PHASE_ARCHITECTURE_SKELETON.md` (Phase 1→2: **25 הזמנות OR $1,000 MRR**; 2→3: $5K×2mo; Scale: $15K). This table becomes the file's single phase-trigger statement after the stale duplicates (sections 24–25 area) are removed. Minor flag for Guy: its Phase-3 row lists "A17 IP" while in the live fleet A17 = Meta Token Refresher (Pre-Deploy Gate item 6 exception; `FABLE5_PROJECT_MAP.md` SA-8) — the IP-protection role exists in the skeleton but the ID collision should be annotated, not silently "fixed".

### 14. `## 🔒 חוקי ברזל — נעולים לצמיתות (18/06/2026)` (rules 0–4)
**🗑️ SAFE TO DELETE (after merging the two non-duplicates).** This is a *second, older* iron-laws list that overlaps the canonical 5(→7) laws in section 8: rule 1 (Enterprise Execution) ⊂ Iron Law 3; rule 3 (Premium Brand DNA) ⊂ Iron Law 2; rule 4 (Design Freeze) already appears inside Iron Law 2 ("Design Freeze בתוקף"). Unique content to preserve before deleting: **rule 0 GROWTH & ADAPTATION DNA** (merge as a preamble to the iron-laws section) and **rule 2 META CAPI PROTOCOL** (server-side only, SHA256, event_id dedup — move into Strategic Decisions, it's a locked technical decision, not an iron law). Two competing "iron laws" numbering systems in one file is itself a contradiction generator.

### 15. `## 🎯 Brand Voice`
**🗑️ SAFE TO DELETE.** Three lines fully contained in Iron Law 2 (Loro Piana standard, authority-not-store, non-childish tone). Adds zero information.

### 16. `## 🚨 חוקי מיקוד — לכל האגנטים`
**✅ KEEP AS-IS.** Category allow/block lists (no kids/pets/novelty) + price floors ($18/$28/$35/$65) are active hard constraints cited by the verified project map.

### 17. `## ✅ הושלם הכל` (Infrastructure / Klaviyo Welcome LIVE / Shopify WELCOME10)
**📦 HISTORICAL → ARCHIVE.** Accurate 14–15/06 completion log (domain, Klaviyo sending domain, WELCOME10 IDs). Done-work records belong in the archive; the operationally reusable identifiers (discount code + price-rule IDs, sheet/scenario URLs) should be folded into the "Credentials & Infrastructure Reference" section (see Part 2) so nothing operational is lost.

### 18. `## 📧 Welcome Flow — תוכן סופי (מקצועי)` (Emails 1–3 full copy)
**📦 HISTORICAL → ARCHIVE.** The copy is live in Klaviyo and was verified against the API on 02/07 (per the TODO section itself). 64 lines of email body text read by every session is pure context cost. Archive verbatim (it's the canonical copy record) + leave a one-line pointer ("Welcome Series copy: live in Klaviyo, verified 02/07/2026; archived text in CLAUDE_MD_ARCHIVE.md").

### 19. `## 🔑 Credentials חשובים`
**✅ KEEP (trim).** Store URL, myshopify domain, GA4 ID, currency, Make.com account = operational reference every session needs. Trim within it: the Shopify client_id line is questionable under S2's spirit — recommend Guy decides whether to keep it (it's a public identifier, not a secret, but the file's own laws say be strict).

### 20. `## 🌐 DNS`
**✅ KEEP AS-IS.** Two lines, current, operational.

### 21. `## ✅ יסודות שהושלמו (14/06/2026)` + 22. `## ✅ יסודות נוספים (15/06/2026)`
**📦 HISTORICAL → ARCHIVE.** Completion logs of since-finished foundation work (products, collections, pages, redirects). Page IDs (About: 120033411270, Size Guide: 120033444038) move to the reference section before archiving.

### 23. `## 📝 TODO — משימות עתידיות`
**Split.** The two Klaviyo items and two Meta/Analytics items are `[x]` with 02/07 verification notes → **📦 ARCHIVE** (they're now completion records, and good ones — the Klaviyo notes document a corrected false diagnosis). The still-open items — תמונות מוצרים (Higgsfield, awaiting reference), הפעל מלאי, and the אסטרטגיית תמחור subsection — **✅ KEEP** in a slimmed "Open Guy-only items" block. Long-term, PENDING lives in `memory/project_sockacademy_state.md`, not here; CLAUDE.md should keep only standing policy (e.g. the pricing-category floors).

### 24. `## 🏛️ SockAcademy Virtual Corporation — Full Org Chart v2` (incl. `### BUILD PHASES`)
**🔴 STALE → ARCHIVE.** Three concrete contradictions:
1. **`### BUILD PHASES` says "Phase 2 (אחרי 10 מכירות)"** — contradicted by the canonical trigger **25 הזמנות OR $1,000 MRR** (`PHASE_ARCHITECTURE_SKELETON.md` Phase 2 header + this same file's own Phase Triggers table, section 13). This is one of the two "10 sales" instances.
2. **A8 row: "BI Analyst (On-Hold עד 10 מכירות)"** — same stale trigger, second instance.
3. Division tables assert build statuses ("לבנות", cluster compositions) that predate the 30-agent fleet and the 10-cluster CLUSTERS map; the org structure is now expressed canonically in `corp/core/orchestration/index.js`.
Archive verbatim (it documents the org design thinking); replace with a pointer to CLUSTERS + `FABLE5_PROJECT_MAP.md`.

### 25. `## 🤖 נבחרת סוכני AI — 11 סוכנים` (A1–A13 roster + `### 📋 עקרונות הבנייה`)
**🔴 STALE → ARCHIVE. The single most dangerous section in the file.** It's the original pre-build vision roster and its **agent-ID meanings no longer match the real fleet**:
- Roster A9 = "חשבונות" → real A9 = Legal Compliance (FROZEN domain, triple-guarded — ANTI_RECURRENCE #35!)
- Roster A10 = "שירות לקוחות" → real A10 = Trend Scout
- Roster A11 = "משפטי + אבטחה" → real A11 = Price Intelligence
- Roster A12 = "UI/UX Designer" → real A12 = Review Collector
- Fleet size "11 סוכנים" → real fleet = **30 agents (A0–A28 + A2.5)**; statuses "לבנות" for long-built agents.
A session skimming this could reason about the wrong agent behind an ID — with A9 that intersects a real safety protocol. Archive verbatim as the founding vision document; the `### 📋 עקרונות הבנייה` principles (build-with-Guy, human approval for financial/legal/medical) are still true — merge that half-page into the iron-laws/governance area.

### 26. `## Development`
**✅ KEEP AS-IS.** `shopify theme dev` command + preview URL, still correct.

### 27. `## 👤 User`
**🗑️ SAFE TO DELETE.** One line ("לפנות תמיד בשם גיא") already stated verbatim in section 3 (פרוטוקול פתיחת שיחה) and canonically in `memory/user_guy.md`.

### 28. `## 🏢 Corporate Directory Architecture (18/06/2026)`
**🔴 STALE.** The repo tree lists only 12 agent dirs (A0–A12) vs the real 30; `docs/` tree omits `superpowers/` (which the FILE CREATION PROTOCOL in the same file says is one of exactly 3 allowed subdirs); corp/ subtree predates today's `corp/core/*` module set (telegram, metrics, hitl, self-heal, qa-gate, rag-*, etc.). The Corp-layer usage rules (`corp/` holds no credentials/data; A15 `require` pattern) are still valid — keep those 4 lines. Replace the tree with a short pointer: "Canonical structure = `scripts/ci/structure-lint.js` (enforced in CI); fleet map = `FABLE5_PROJECT_MAP.md`." Archive the old tree verbatim.

### 29. `## 🔤 RTL & Hebrew Formatting Standards (Mandatory)`
**✅ KEEP AS-IS.** Load-bearing spec for A15 CFO Google Sheets output (RTL, locale iw, Rubik, dual-currency, live USD/ILS rate). Scope note: this governs *Sheets*; DOCX/PDF Hebrew rules live in `memory/hebrew_docx_standard` (Arial) — different medium, no conflict, worth one cross-reference line.

### 30. `## 🔐 Security Protocol — Absolute Rules`
**Mixed:**
- `### Env Vars Required` table — **🔴 partially STALE.** Its ⚠️ flags (SHOPIFY_THEME_ID, BLOG_ID, PERPLEXITY_API_KEY "Add to GitHub Secrets") date from 19/06 and are largely resolved per later layers; GDRIVE_BACKUP_FOLDER_ID is genuinely still open (project-map open item #8). The file already declares `.env.example` the "Complete variable reference" — make that the single source of truth and shrink this to the rule ("env-only, zero fallbacks, `.env.example` is canonical") + genuinely-open exceptions.
- `### Hardcoded Values — סטטוס ניקיון (19/06/2026)` — **📦 ARCHIVE.** Completed cleanup log, accurate then, done.
- `### 🚨 Immediate Action Required (גיא בלבד)` — **🔴 STALE and self-violating.** The 19/06 checklist is mostly resolved per later sections/memory, and — worse — **line ~1034 prints the exposed Klaviyo private key in full**, directly violating this same file's חוק S2 ("לעולם לא להדפיס סודות... אפילו 'ישנים', אפילו 'כבר בוטלו'"). Recommendation: **redact the key string even in the archive copy** (keep only "pk_QSM…dff — rotated per S2 incident log"); carry forward only the still-open items into the single Open-Items block. Guy should confirm the rotation actually happened before the line is retired.

### 31. `## 🔗 Sprint A — מה נשאר (סדר ביצוע)`
**📦 HISTORICAL → ARCHIVE.** The ✅ half is a 19/06 completed-audit log. The `⏳ בתור — פעולות גיא בלבד` half duplicates section 30's Immediate-Action list (same secrets, same Klaviyo rotation) — fold any still-open item into the one Open-Items block, archive the rest verbatim.

---

## Part 2 — Proposed final structure (outline for approval)

Ordering principle: protocols first (read every session), then laws, then live reference, then pointers. Everything dated-and-done leaves for `CLAUDE_MD_ARCHIVE.md`. Estimated result: ~450–500 lines (from 1,066), with zero contradictions and zero information destroyed.

1. `# SOCKACADEMY — CLAUDE.md (Living Instructions)` — dateless title + "Last consolidated: DD/MM/YYYY" + 3-line orientation (30 agents, 10 clusters, Phase 1 LIVE, canonical pointers).
2. `## 🏗️ FILE CREATION PROTOCOL` — unchanged.
3. `## 🟢 פרוטוקול פתיחת שיחה (v3)` — unchanged.
4. `## ⚡ פרוטוקול Mid-Session — 7 טריגרים` — unchanged (drop "(חדש)").
5. `## 🎩 CTO Hat Auto-Triggers` — unchanged.
6. `## 🤝 Consultative CTO Protocol + Supersession Check` — unchanged.
7. `## 🔴 פרוטוקול סיום שיחה (v3)` — unchanged.
8. `## 🧭 IRON LAWS (7) & /boot-sockacademy` — laws 1–5 as today **plus** promoted #6 Telegram-Hebrew and #7 LAUNCH_MODE; Law 1's SA-list replaced by pointer to `corp/core/orchestration/index.js` CLUSTERS; GROWTH & ADAPTATION DNA (old rule 0) as preamble; עקרונות הבנייה merged in; PARANOIA MODE; Pre-Deploy Gate (6 checks); Dashboard (`7/7`).
9. `## 🔐 SECURITY — S1–S4 + Prompt Injection + env-var rule` — S1–S4 unchanged; absorbs the Prompt-Injection doctrine (from old ARCHITECTURAL OVERHAUL) and the shrunken env-var rule ("`.env.example` is canonical; open exceptions listed").
10. `## 🎯 Strategic Decisions — Locked` — as today (correct Phase-Trigger table = the file's ONLY trigger statement, with explicit "canonical: PHASE_ARCHITECTURE_SKELETON.md" line), absorbs META CAPI protocol (old rule 2); A17 ID-collision annotation.
11. `## 🚨 חוקי מיקוד + מחירים מינימליים` — unchanged.
12. `## 🗺️ Enterprise Stack — ורדיקטים` — unchanged.
13. `## 🎛️ CONTROL CENTER ROADMAP` — Phase A ✅, **Phase B ✅ built (`corp/core/hitl.js`)** + critical-actions approval list kept as policy, Phase C future.
14. `## 🔑 Operational Reference` — merged: Credentials חשובים (trimmed) + DNS + WELCOME10/price-rule IDs + page IDs + Sheet/Make URLs + Development (`shopify theme dev`) + RTL/Hebrew Sheets standard (with DOCX cross-ref).
15. `## 🏛️ Architecture — Pointers, not copies` — 5 lines: CLUSTERS object = cluster truth; `structure-lint.js` = directory truth; `FABLE5_PROJECT_MAP.md` = verified primer; `verify-fleet-status.js` = drift gate; ANTI_RECURRENCE_PROTOCOL.md = 40 protocols.
16. `## ⏳ Open Guy-only Items` — single deduplicated block: GDRIVE_BACKUP_FOLDER_ID, Klaviyo-rotation confirmation, remove CJ_EMAIL/CJ_PASSWORD secrets, product images (awaiting Higgsfield reference), inventory activation, pricing-strategy approval. (Standing note: live PENDING is owned by `memory/project_sockacademy_state.md`.)
17. `## 📦 Archive pointer` — one line: "Historical layers (org charts, completed migrations, 14–19/06 logs, Welcome-Flow copy) moved verbatim to `docs/ops/CLAUDE_MD_ARCHIVE.md` on DD/MM."

**Moves to `docs/ops/CLAUDE_MD_ARCHIVE.md` (verbatim, dated):** ARCHITECTURAL OVERHAUL (minus prompt-injection carve-out) · הושלם הכל · Welcome Flow copy · יסודות 14/06 + 15/06 · completed TODO items · Org Chart v2 + BUILD PHASES · נבחרת 11 סוכנים · old repo tree · Hardcoded-Values cleanup log · Immediate Action Required (**Klaviyo key REDACTED**) · Sprint A.
**Deleted outright (nothing unique):** `## 🎯 Brand Voice` · `## 👤 User` · חוקי ברזל 18/06 rules 1/3/4 (after rules 0+2 are merged out).

---

## Part 3 — What this fixes

All four flagged live contradictions are closed, plus five more found in this pass:
1. **"6 Super-Agents" → 10 clusters** — Iron Law 1's hardcoded SA-1…SA-6 list is replaced by a pointer to the canonical `CLUSTERS` object in `corp/core/orchestration/index.js` (§8 above), so the file can never drift on cluster count again.
2. **"11 סוכנים" roster → 30-agent fleet** — the old roster, whose agent-ID meanings (A9/A10/A11/A12) actively contradict the real fleet and intersect the A9 safety protocol, leaves the every-session read path into the archive (§25).
3. **"Phase 2 (אחרי 10 מכירות)" → 25 הזמנות OR $1,000 MRR** — both stale "10 מכירות" instances (BUILD PHASES line + A8 "On-Hold עד 10 מכירות") are removed with their host sections; the file's one surviving trigger table (§13) already matches `PHASE_ARCHITECTURE_SKELETON.md` exactly.
4. **19/06 "Immediate Action Required" secrets checklist** — resolved items retired to archive, open ones deduplicated into a single block; and the checklist's own S2 violation (a printed Klaviyo private key) is redacted (§30).
Additional finds fixed: the "5/5 Iron Laws" count vs. the 7 laws actually in force (§8); HITL/Phase-B marked "to build" though `corp/core/hitl.js` is live fleet-wide (§11); the 12-agent repo tree and missing `superpowers/` dir (§28); two competing iron-law numbering systems merged into one (§14); duplicate Brand-Voice/User stubs deleted (§15, §27). Net effect: every architectural/phase/status claim left in CLAUDE.md either matches the canonical source or *is* a pointer to it — closing this file's instance of failure mode #1 ("documentation asserts a state the current truth doesn't match").

---
**Next step (Guy):** approve / adjust Part 2, then a single edit session executes: create `CLAUDE_MD_ARCHIVE.md` → move 📦 sections verbatim (key redacted) → apply §8/§11/§28/§30 surgical fixes → delete 🗑️ stubs → run `/security-review` + `verify-fleet-status.js` + CI before commit.
