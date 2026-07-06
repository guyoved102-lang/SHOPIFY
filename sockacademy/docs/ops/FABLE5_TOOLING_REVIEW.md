# Fable 5 Tooling Review — Paperclip, Open Session, MCP & Claude Config

> 📌 **Consolidated 06/07/2026:** this doc's findings feed into `FABLE5_LAUNCH_READINESS_PLAN.md` (current execution order) and are tracked live in `FABLE5_ACTION_TRACKER.md`. This file remains the detailed source — read it for depth, not for current status.

**Date:** 04/07/2026 | **Scope:** advisory only, no changes made | **Author:** Claude (Fable 5 trial)

---

## 1. Paperclip — verdict: DO NOT ADOPT

**Identified with high confidence:** `github.com/paperclipai/paperclip` ("The open-source app
everyone uses to manage agents at work", also at paperclip.ing). The screenshot copy matches the
repo's marketing verbatim ("Every task is a ticket with a clear owner, status, and thread";
"Append-only history. No edits, no deletions."). Launched March 2026, one of the fastest-growing
repos on GitHub — 72.7k stars is consistent with its trajectory. It is a Node.js server + React
dashboard: a "control plane" where interactive AI agents work through tickets with full tool-call
tracing. Note: a similarly named `agencyenterprise/paperclip-ai` exists — the screenshot is the
former, not that one.

**Why not:** it solves problems SockAcademy does not have. The fleet is 28 scheduled batch agents
(GitHub Actions cron + A0 orchestrator), not interactive agents needing a shared ticket queue.
Every capability Paperclip sells already exists here in working form: task/status ledger = git
commits + `FABLE5_INITIATIVE_LEDGER.md` + memory state file; audit trail = git history + Supabase
health/metrics logs; human-in-the-loop = `pending_approvals` (RLS on) + Telegram/email alerts.
Adopting it means hosting a server and re-plumbing 28 agents into a ticket model for zero new
capability. Revisit only if the fleet ever moves to always-on interactive agents.

## 2. Open Session (opensesh.github.io/our-links) — verdict: DO NOT ADOPT

Confirmed: "Open Session" is a small design studio. The "Claude Code Harness" is their repo
**KARIMO** (249 stars, Apache 2.0, actively released — v9.10.1, May 2026): a Claude Code plugin
for PRD-driven development — research → PRD interview → task briefs → parallel-wave orchestration
→ PR inspection, installing a `.karimo/` directory of config/hooks/agents.

**Why not:** it is a legitimate, well-built tool, but it duplicates what is already installed and
proven here — the `superpowers` plugin suite (brainstorming → writing-plans → executing-plans →
subagent-driven-development → code-review) covers the identical loop, and the project's per-task
subagent review discipline is already built around it. A second competing harness adds workflow
confusion, and its `.karimo/` root directory would fight `structure-lint.js` root rules. Their
"Brand Design System" is a Figma resource — irrelevant while Design Freeze (Iron Law 4) holds;
at most, bookmark it for the future CRO/design phase.

## 3. MCP server re-evaluation

**Reality check first:** the only MCP server actually configured on this machine is `magic`
(`~/.claude.json`); there is no `.mcp.json` in the repo and no agent code references
agent-browser/context7/supermetrics. The CLAUDE.md table's ACTIVE verdicts describe intent, not
installed reality.

| Server | CLAUDE.md verdict | Status now | Reasoning |
|---|---|---|---|
| context7 | ACTIVE | Not installed | No config anywhere; install only if a dev session actually needs library docs. |
| agent-browser | ACTIVE | Not installed, unused | Agents call APIs directly in Node; nothing references it. |
| higgsfield | ON-HOLD | Still blocked (Guy-only) | Blocker = reference product image from Guy — still real. Meanwhile capability shipped as 4 `higgsfield-*` skills, so the MCP row is stale. |
| perplexity | ON-HOLD | Blocker resolved — differently | A13/A23/A26/A27 already call the Perplexity REST API directly (`PERPLEXITY_API_KEY`). Nothing to install; update the row to "SATISFIED via direct API". |
| supermetrics | ACTIVE | Effectively blocked | Zero sales → no data to aggregate; A8/A15 are Phase 2. Honest verdict is ON-HOLD. |
| notion | ACTIVE | Contradicts itself | CLAUDE.md elsewhere says Notion is Phase 2+ ("ממתין לפתיחת workspace"). Not installed. Mark ON-HOLD. |
| granola | ACTIVE | No use case | Meeting recorder for a solo founder with no meetings pipeline. Not installed. |
| zapier | ON-HOLD | Still blocked — correctly | Accounting bridge is phase-gated ($5K MRR Wave, $20K QuickBooks). Zero sales. |
| magic (21st.dev) | NOT APPLICABLE | The only one installed | Ironic: the sole configured server is the one ruled inapplicable. Removing it (or keeping only for `logo_search`) reduces surface. |

**Net:** nothing to install. One documentation true-up: rewrite the table so verdicts match reality.

## 4. Claude config findings (concrete gaps only)

1. **Live credentials inside `.claude\settings.local.json` — Iron Law S2 violation.**
   Permission allow-rules embed a Klaviyo private key (`pk_QSMqNV_...`, lines 23–33) and Shopify
   access tokens (`atkn_...`, `shpat_shpss_...`, lines 19–21) from one-off June curl commands.
   The file is gitignored, but it is plaintext synced to OneDrive, and those keys also appeared in
   chat transcripts. **Action: rotate both keys, delete those stale allow entries.** This is the
   same failure class as the 20/06 Meta App Secret incident.
2. **The PreToolUse credential-scan hook is a no-op.** `.claude\settings.json` greps
   `$CLAUDE_TOOL_INPUT`, but Claude Code hooks receive tool input as JSON on stdin — that env var
   is not set, so the grep always tests an empty string. Even if it matched, it echoes and exits 0,
   which does not warn Claude or block. So the enforcement layer for Iron Law S4 does not actually
   exist. Fix: read stdin (e.g. `jq -r .tool_input.command`), and `exit 2` on match.
3. **Stale destructive allowlist entry:** `Bash(rm -rf ".../sockacademy/.git" && echo "removed")`
   is permanently pre-approved in `settings.json` (line 11). A one-time migration command should
   never stay allowlisted. Prune it along with the dozens of dead one-off entries.
4. **CLAUDE.md MCP table vs reality** — covered in §3; a 10-minute doc edit.

## Bottom line

Adopt nothing external — both of Guy's finds are polished solutions to problems SockAcademy has
already solved more simply. The genuinely worthwhile actions are internal, small, and specific:
**(a) rotate the Klaviyo + Shopify keys sitting in `settings.local.json` and prune those entries,
(b) fix the no-op PreToolUse security hook so S4 is actually enforced, (c) true-up the MCP table.**
Everything ON-HOLD is either still correctly blocked (zapier, higgsfield reference image) or
already satisfied by direct API (perplexity).
