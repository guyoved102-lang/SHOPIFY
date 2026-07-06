# FABLE5 PHASE RECONCILIATION — Phase-Numbering Collision Audit

> 📌 **Consolidated 06/07/2026:** this doc's findings feed into `FABLE5_LAUNCH_READINESS_PLAN.md` (current execution order) and are tracked live in `FABLE5_ACTION_TRACKER.md`. This file remains the detailed source — read it for depth, not for current status.

**Written 05/07/2026 (Fable 5, read-only pass). No file was edited. Every fix below awaits Guy's individual approval.**
**Scope:** ANTI_RECURRENCE #31 follow-up — verify H11/M9/M10/M11 fixes, sweep all of `docs/strategy/` for any remaining "Phase" collision against the canonical numbering.

---

## 1. Canonical reference — SA-Cluster Phases (PHASE_ARCHITECTURE_SKELETON.md)

| Phase | Activation Trigger | What Unlocks |
|---|---|---|
| 1 | ACTIVE (now) | A0, A1, A2, A2.5, A3–A7, A9–A13, A17 |
| 2 | 25 orders OR $1,000 MRR | A14 COO, A15 CFO, A8 Analytics, A16 CX, **A20 Inventory** |
| 3A | $5,000 MRR × 2 consecutive months | A17 IP, A18 Fraud, A19 Returns, A21 Affiliate |
| 3B | $5,000 MRR × 2 months (+ 3A active) | **A22 Supply Chain, A23 Private Label/Factory, A24 CRO, A25 Influencer, A26 Regulatory, A27 PR, A28 Subscription Club** |
| 4 | $15,000 MRR × 2 consecutive months | A29 Private Label at Scale, A30 International, A31 B2B, A32 Financial Infra |
| 5 | $40,000 MRR × 2 consecutive months | A33 Media, A34 Community, A35 Licensing, A36 Data Product |
| 6 | $80,000 MRR × 3 months OR manual `PHASE_6_STRATEGIC_DECISION` | A37 Due Diligence, A38 IP Portfolio, A39 Acquisition Intel |

Every phase also requires: Readiness ≥ 95 for 48h + automated DRY_RUN suite + **explicit Guy sign-off** (`PHASE_X_ACTIVATE_BY_GUY`). *"No phase transitions without explicit Guy sign-off. Zero exceptions."*
Known internal defects in the skeleton itself (LOW-14, still open, separate from this audit): §"Proposed Optimizations" says threshold "Score ≥ 85" vs. 95 everywhere else; the "Missing Agents" table's A29–A31 roles contradict its own Phase 4 skeleton.

**Other legitimate "Phase"/"שלב" axes (different meaning, not wrong):** Brand Architecture Phase 1–5 (CSS/UI design maturity — DESIGN_DECISIONS.md); Private Label Sub-Phase A–E (execution breakdown *inside* SA-Cluster Phase 4); Gender Rollout Stages 1–3 (BRAND_STRATEGY.md); FEEL→BELIEVE→BUY "Phase F/B/Buy" (page-scroll psychology, lettered).

---

## 2. Prior findings H11/M9/M10/M11 — verification against current file content

| ID | File | Status | Evidence (verified 05/07) |
|---|---|---|---|
| H11 | `SOCKACADEMY_VISION.md` | ✅ **FIXED** | File renamed to `SOCKACADEMY_VISION_SNAPSHOT_17-06-2026.md` with a SUPERSEDED banner. All occurrences corrected with strikethrough, e.g. Iron Laws table: „~~$5,000/month × 3 חודשים רצופים~~ → **$15,000/month × 2 חודשים רצופים** (SA-Cluster Phase 4, הקנוני — תוקן 04/07/2026)". A13 row and Agent Build Log entry likewise corrected. |
| M9 | `PRIVATE_LABEL_ROADMAP.md` | ✅ **FIXED** | Capital Clarity Table now uses "Sub-Phase | A — Foundation … E — Waitlist Launch" with an explicit note: "**Relabeled 04/07/2026 (Fable 5 audit M9)** — this table used the old Phase 0–4 numbering…". No Phase 0–4 rows remain. |
| M10 | `BRAND_STRATEGY.md` | ✅ **FIXED** (but see N4 — the fix did NOT propagate to `MASTER_STRATEGY.html`) | Section renamed "Gender Strategy — Rollout Stages" with relabel note; Stage 3 now reads "After $5,000 MRR × 2 consecutive months — aligned to SA-Cluster Phase 3A trigger" (was ×3). |
| M11 | `DESIGN_DECISIONS.md` | ✅ **FIXED** | Header banner: "every 'Phase 4'/'Phase 5' below refers to the **Brand Architecture Phase** (CSS/UI design rollout, Layers 1–5), *not* the canonical **SA-Cluster Phase**". The Brand Architecture axis is legitimately different — labeling now sufficient, no renumbering needed. |

---

## 3. New findings (not covered by H11/M9/M10/M11)

### N1 — `VISION.md`: A20 placed in Phase 3; A22/A23/A27/A28 deferred to a "$15K Scale Phase" — contradicts canonical Phase 2 / 3B ⚠️ HIGHEST PRIORITY
`VISION.md` is a constitution-tier doc (the snapshot banner points readers to it), yet its Agent Fleet Status table + "Build Phases" section contradict the skeleton on **five agents' activation triggers**:
- Line 88: `| A20 | Inventory Intelligence | 🔜 Phase 3 |` — canonical: **Phase 2** ("A20 — Inventory Intelligence (Phase 2 add-on)"; Phase 2 gate is titled "Before A14–A20 activate"). A session preparing Phase 2 activation from VISION.md would omit A20.
- Lines 90–91, 94–95: A22/A23/A27 `🔜 Scale`, A28 `🔜 Scale ($15K MRR)` — canonical: all four are **Phase 3B ($5K MRR × 2mo)**. VISION.md line 111 compounds it: `### Scale Phase — Empire ($15K MRR)` listing "A23 Factory (Private Label), A28 SockAcademy Club, A27 PR". "Scale Phase" is an unlabeled 5th numbering ("Empire") with the Phase-4 dollar figure but Phase-3B agents, and it omits "× 2 consecutive months".
- Internal self-contradiction: line 91 says A23 is "Scale" ($15K) but line 121 says "A23 Factory Relations begins Alibaba intelligence at Phase 3" ($5K).
- Lines 85–89, 92–93: A17/A18/A19/A21 and A24/A26 all say bare `Phase 3` — canonical splits 3A (risk) vs 3B (growth); A24/A26 are 3B, not 3A. Line 108: `### Phase 3 — Enterprise Protection ($5K MRR × 2 months)` merges both and wrongly includes A20.
- Minor, same family: line 20 Pinterest `🔜 Phase 3`, line 36 Club pricing `TBD Phase 3` — should say 3B.

**Decision needed from Guy (one question):** Is deferring A23/A27/A28 to $15K an *intentional* VISION-level choice? If yes → the skeleton's Phase 3B must change (bigger edit). If no (recommended — skeleton is canonical) → apply the fixes in §4. Note: the Fleet Status table is already flagged as stale (project map tension #3, "do not fix without Guy"), so these edits fold into that same pending decision.

### N2 — `MASTER_STRATEGY.html` line 855: the M10 error survives in the Hebrew mirror ⚠️ LIVE CONTRADICTION
The gender-rollout timeline still shows the old ×3 window that M10 corrected in `BRAND_STRATEGY.md`:
> `<div class="timeline-badge">שלב ג׳ — $5K MRR×3</div>`

Canonical (and the corrected BRAND_STRATEGY.md Stage 3) is **$5K MRR × 2** consecutive months. The „שלב א׳/ב׳/ג׳" lettering itself is fine (it mirrors Stages 1–3 and doesn't collide with numeric phases) — only the ×3 figure is wrong.

### N3 — `MG-1-MERINO-GUIDE-OUTLINE.md` line 218: stale old-roadmap cross-reference
> `- **Referenced by:** PRIVATE_LABEL_ROADMAP.md (Phase 1, Supplier Discovery)`

"Phase 1" here is the roadmap's *retired* Phase 0–4 numbering (Supplier Discovery is now **Sub-Phase B**) and reads as SA-Cluster Phase 1 to a cold session — exactly the #31 trap.

### N4 — `MG-2-ANATOMY-OUTLINE.md` lines 78, 87: references to a "Phase 0" that no longer exists
> line 78: `…this is the section most exposed to regulatory scrutiny (per PRIVATE_LABEL_ROADMAP.md Phase 0 gap analysis)…`
> line 87: `…see PRIVATE_LABEL_ROADMAP.md Phase 0 regulatory gap`

The roadmap has no Phase 0 anymore (Foundation = **Sub-Phase A**). Note: both MG outlines are superseded by `MG-1-FINAL.md` / `MG-2-FINAL.md`, which are clean (MG-2-FINAL correctly says "Phase 4 (private label, $15K MRR trigger)"; MG-1-FINAL correctly cites "Phase 1 / Phase 4"). So N3/N4 are low-severity, but the outlines are still in `docs/strategy/` and quotable.

### N5 — `BRAND_STRATEGY.md` FEEL→BELIEVE→BUY headers use "Phase" (lettered) — cosmetic only
> `### Phase F — FEEL (0–8 seconds)` / `### Phase B — BELIEVE (8 seconds–2 minutes)` / `### Phase Buy — BUY (2–4 minutes)`
No numbers, no trigger amounts — collision risk is near zero. Optional consistency rename only. The MG outlines' generic "Sourcing Phase Use" headers are likewise harmless; no change proposed.

---

## 4. Proposed fixes (exact old → new; each individually approvable)

**F1 (N1, `VISION.md`)** — apply only after Guy answers the N1 question, assuming skeleton wins:
- L88: `| A20 | Inventory Intelligence | 🔜 Phase 3 |` → `| A20 | Inventory Intelligence | 🔜 Phase 2 |`
- L85–87, 89: `🔜 Phase 3` → `🔜 Phase 3A` (A17, A18, A19, A21)
- L92–93: `🔜 Phase 3` → `🔜 Phase 3B` (A24, A26)
- L90–91: `🔜 Scale` → `🔜 Phase 3B ($5K MRR ×2mo)` (A22, A23)
- L94: `| A27 | PR & Media | 🔜 Scale |` → `| A27 | PR & Media | 🔜 Phase 3B ($5K MRR ×2mo) |`
- L95: `| A28 | SockAcademy Club | 🔜 Scale ($15K MRR) |` → `| A28 | SockAcademy Club | 🔜 Phase 3B ($5K MRR ×2mo) |`
- L108: `### Phase 3 — Enterprise Protection ($5K MRR × 2 months)` → `### Phase 3A + 3B — Enterprise Protection & Growth ($5K MRR × 2 consecutive months)`
- L109: `A17 IP, A18 Fraud, A19 Returns, A20 Inventory, A21 Affiliate, A24 CRO, A26 Regulatory Watch` → `3A: A17 IP, A18 Fraud, A19 Returns, A21 Affiliate · 3B: A22 Supply Chain, A23 Factory, A24 CRO, A25 Influencer, A26 Regulatory, A27 PR, A28 Club`
- L111: `### Scale Phase — Empire ($15K MRR)` → `### Phase 4 — Brand Elevation & International ($15K MRR × 2 consecutive months)` and L112: `A23 Factory (Private Label), A28 SockAcademy Club, A27 PR` → `A29 Private Label at Scale, A30 International, A31 B2B, A32 Financial Infra (A23/A27/A28 already live from Phase 3B)`
- L121: `A23 Factory Relations begins Alibaba intelligence at Phase 3` → `…at Phase 3B`
- L20: Pinterest `🔜 Phase 3` → `🔜 Phase 3B`; L36: `TBD Phase 3` → `TBD Phase 3B`

**F2 (N2, `MASTER_STRATEGY.html` L855):** `שלב ג׳ — $5K MRR×3` → `שלב ג׳ — $5K MRR×2`

**F3 (N3, `MG-1-MERINO-GUIDE-OUTLINE.md` L218):** `PRIVATE_LABEL_ROADMAP.md (Phase 1, Supplier Discovery)` → `PRIVATE_LABEL_ROADMAP.md (Sub-Phase B — Supplier Discovery + Sampling)`

**F4 (N4, `MG-2-ANATOMY-OUTLINE.md`):** L78 + L87: `PRIVATE_LABEL_ROADMAP.md Phase 0 gap analysis` / `Phase 0 regulatory gap` → `PRIVATE_LABEL_ROADMAP.md Sub-Phase A gap analysis` / `Sub-Phase A regulatory gap`. *Alternative (cheaper):* add a one-line SUPERSEDED-by-FINAL banner atop both outline files and leave the body untouched.

**F5 (N5, optional):** `### Phase F — FEEL` / `### Phase B — BELIEVE` / `### Phase Buy — BUY` → `### Step 1 — FEEL` / `### Step 2 — BELIEVE` / `### Step 3 — BUY`. Skip if Guy prefers zero churn in a locked doc (file header: „נעול: 19/06/2026 | עדכן רק אחרי אישור גיא").

---

## 5. Bottom line

The four previously flagged findings (H11, M9, M10, M11) are **all genuinely fixed** in the current files — verified against content, not labels. But the collision is **not fully resolved**: two live numeric contradictions remain — **`VISION.md`'s phase map disagrees with the canonical skeleton on the activation trigger of 5+ agents (A20, A22, A23, A27, A28) and invents an unlabeled "Scale Phase — Empire"** (N1, needs one Guy decision), and **`MASTER_STRATEGY.html` still carries the old ×3 window that M10 fixed only in the English file** (N2, trivially fixable). N3/N4 are stale cross-refs in superseded outlines; N5 is cosmetic. Nothing here requires renumbering the Brand Architecture, Sub-Phase A–E, or Gender-Stage axes — labeling on those is now adequate.
