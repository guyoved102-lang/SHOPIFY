# Fable 5 Initiative — Progress Ledger

**Purpose:** Guy has a limited-time free trial of Fable 5 (claude-fable-5) and wants to use it
for the highest-judgment work in the project — design recommendations, the ~77-finding security/PII
audit, strategy-doc reconciliation. Sessions/dispatches are kept short and scoped (fresh subagent per
stage) instead of one open-ended "read everything" session, both to conserve quota and because a
narrower context produces better judgment per task.

**Rule:** Every stage's deliverable is a written doc, and its outcome is logged here immediately
after it completes — this file is the memory that survives across separate dispatches/sessions, since
each Fable 5 subagent starts with zero memory of prior stages. Read this file before dispatching any
new stage to see what's already done and what the next stage should build on.

**Do not re-dispatch a stage marked `done` below.** Resume at the first `pending` stage.

---

## Stage 1: Project Map

**Status:** done
**Output:** `sockacademy/docs/ops/FABLE5_PROJECT_MAP.md`
**Scope:** Read-only. Curated institutional docs only (CLAUDE.md, VISION.md,
PHASE_ARCHITECTURE_SKELETON.md, ANTI_RECURRENCE_PROTOCOL.md, project_sockacademy_state.md,
clever-skipping-hamster.md audit plan) + a directory-level listing of `sockacademy/agents/` —
not full agent source. Produces a compact architecture/strategy map that later stages read
instead of re-deriving context from scratch.
**Key correction surfaced:** the ~77-finding audit plan (clever-skipping-hamster.md) is NOT
"Batch 1 done, 2-7 pending" as this ledger originally assumed — `project_sockacademy_state.md`'s
"Fable 5 Plan Execution — COMPLETE" section (dated 04/07/2026, verified directly, not from stale
skill-file text) confirms all 7 batches + Tasks 30/31 + all 9 Guy decisions (G-1..G-9) are done,
committed, CI green. Old Stages 3 and 5 below are superseded because of this — see their entries.

## Stage 2: Design Recommendations ("few steps forward")

**Status:** in-progress
**Output:** `sockacademy/docs/superpowers/specs/2026-07-04-design-recommendations.md`
**Scope:** Read-only. Reads Stage 1's map, current theme (Liquid/CSS), `DESIGN_DECISIONS.md`,
brand benchmarks (Loro Piana/Sunspel/Falke) + external premium-DTC research. Produces a
recommendations doc — no code changes. Guy reviews and approves individual items before any
implementation; current site stays untouched (git-tracked, always revertible) throughout.
**Guy's creative brief (verbatim intent, 04/07/2026):** wants the site to be much more
compelling/"magnetic" — doesn't have exact vocabulary yet, but wants visitors to land on the
site, want to stay, and react "wow." Explicitly open to ambitious/bold feature ideas, not just
polish. This must still fit Iron Law 2 (premium/authoritative register, zero gimmicks/childish
novelty) — the brief is for "wow via craft," Loro Piana-register delight, not gimmick features.

## Stage 3: Security/PII Audit Continuation (Batch 2-7) — SUPERSEDED, do not dispatch

**Status:** moot — already fully executed (see Stage 1's correction above). Batches 2-7,
Tasks 30/31, and G-1..G-9 are all done. Do not re-run.

## Stage 3': CLAUDE.md Consolidation (replaces old Stage 3)

**Status:** done — `sockacademy/docs/ops/FABLE5_CLAUDE_MD_CONSOLIDATION.md` written. Full
section-by-section classification (KEEP/STALE/ARCHIVE/DELETE) of all 31 CLAUDE.md sections +
proposed consolidated outline (~1,066 → ~450-500 lines). Awaiting Guy's review/approval before
any real restructuring edit happens.
**Critical escalation surfaced by this pass, verified directly (not just taken on the subagent's
word):** the exposed Klaviyo key (`pk_QSMqNV_...`) is printed in full inside `CLAUDE.md` itself —
a tracked, committed file — and `gh repo view` confirms the repo (`guyoved102-lang/SHOPIFY`) is
**PUBLIC**. `git log --all -S "pk_QSMqNV"` shows the key has been in the repo since the very first
commit. This is a live public exposure, not a historical one. Redacted the value from `CLAUDE.md`
locally (commit/push pending Guy's go-ahead). See `project_sockacademy_state.md` PENDING #15 for
full detail — key rotation is the only real fix; deleting the text doesn't erase git history.
**Output:** proposed consolidated `sockacademy/CLAUDE.md` (or a clearly-scoped diff) — Guy
approves before it's actually edited
**Scope:** Read-only analysis first. `CLAUDE.md` itself was flagged by Stage 1 as carrying
multiple stale layers: an old "6 Super-Agents" section (fleet has grown to 10 clusters), an
old "11 agents" roster, a stale "Phase 2 after 10 sales" trigger (canonical is 25 orders/$1K
per `PHASE_ARCHITECTURE_SKELETON.md`), and a 19/06 "Immediate Action Required" secrets list
largely resolved elsewhere. This is a live instance of the project's #1 documented failure
mode (docs assert a state the code/memory doesn't match) — worth Fable-5-level judgment to
untangle which sections are current-truth vs. historical record worth archiving vs. safe to
delete outright.

## Stage 4: Strategy Doc Phase-Numbering Reconciliation

**Status:** pending
**Output:** one reconciliation doc addressing H11, M9, M10, M11 (conflicting Phase-N numbering
across `SOCKACADEMY_VISION.md`, `PRIVATE_LABEL_ROADMAP.md`, `BRAND_STRATEGY.md`,
`DESIGN_DECISIONS.md`) against the canonical `PHASE_ARCHITECTURE_SKELETON.md`.
**Scope:** Read-only analysis + proposed single canonical numbering; Guy approves before any
doc edits.

## Stage 5: G-1 Decision Support (A16/A24 Gating) — SUPERSEDED, do not dispatch

**Status:** moot — G-1 (and G-2..G-9) already resolved and implemented per the completed audit
plan. A16/A24 already have real `LAUNCH_MODE` gates as of 04/07/2026.

## Stage 6: Tooling, Integrations & Claude Config Review

**Status:** done — verified directly by controller (read the actual settings files, confirmed
git-tracking status, confirmed hook mechanism). Real finding: live Shopify + Klaviyo credentials
sitting in plaintext in `.claude/settings.local.json` allow-rules (gitignored, never committed,
but plaintext on disk under a OneDrive-synced folder), AND the PreToolUse credential-scan hook in
`.claude/settings.json` is a no-op (`$CLAUDE_TOOL_INPUT` is never set by Claude Code — hooks get
JSON on stdin, not that env var) — so Iron Law S4 has had no real enforcement. Guy approved — fixed 04/07/2026: stripped the 9 credential-bearing allow-entries from
`settings.local.json` (verified via `node -e JSON.parse(...)` that both settings files still
parse, and re-grepped for `shpat_|atkn_|pk_QSMqNV` to confirm zero remaining matches beyond the
hook's own pattern string); rewrote the PreToolUse hook in `settings.json` to parse the real
stdin JSON (`tool_input.command`) and `exit 2` (actually blocks) instead of the old no-op
`$CLAUDE_TOOL_INPUT` grep; also pruned the permanently-allowlisted `rm -rf .../sockacademy/.git`
entry (finding #3). **Still outstanding — Guy-only:** rotate the Shopify access token and the
Klaviyo private key that were sitting in that file (Shopify Admin / Klaviyo dashboard).
**Output:** `sockacademy/docs/ops/FABLE5_TOOLING_REVIEW.md`
**Scope:** Read-only. Two inputs Guy sent directly (a screenshot of a product called "Paperclip"
— structured AI-task tickets + full trace + immutable audit log, 72.7k GitHub stars — and a link
to `opensesh.github.io/our-links`, a design studio's link-in-bio page offering free resources
incl. a "Claude Code Harness" and "Brand Design System") are handed to the subagent as text
since it can't view the image itself. Also reviews: the MCP Servers table in `CLAUDE.md`
(several are `ON-HOLD`: higgsfield, perplexity, zapier; `magic` ruled NOT APPLICABLE for stack
reasons) to see if current project state (audit complete, attorney review pending) changes any
verdict; the real `.claude/` config in both the main repo and this worktree
(`settings.json`, `settings.local.json`, custom skills under `.claude/skills/`) for any
configuration improvement; and a general "what else is worth connecting" pass.
**Guy's ask (verbatim intent, 04/07/2026):** wants Fable 5's own take on the Paperclip
screenshot + the opensesh link specifically (not just my read), plus whether there are more
integrations/connections worth making in general, and whether Claude Code settings could be
improved.

---

## Log

- 2026-07-04 — Ledger created. Stage 1 dispatched (model: fable, background).
- 2026-07-04 — Stage 1 complete. File landed at the wrong path (worktree copy of `sockacademy/`,
  because the dispatch prompt gave a relative path and the subagent's cwd was the RAG-branch
  worktree) — moved to the correct main-checkout path. Stage 1 surfaced that the audit plan is
  already fully done, contradicting this ledger's original Stage 3/5 framing (which came from
  stale text in the `boot-sockacademy` skill file, not the live memory state) — corrected above.
  Old Stage 3 replaced with Stage 3' (CLAUDE.md consolidation). Old Stage 5 marked moot.
