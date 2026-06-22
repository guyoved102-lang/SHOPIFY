# HitL End-to-End Smoke Test — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the complete Human-in-the-Loop flow works end-to-end: agent submits approval request → Guy receives email → Guy approves/rejects via GitHub Actions → Supabase row is resolved.

**Architecture:** HitL code is already fully built (`hitl.js`, `hitl-execute.js`, `hitl-approve.yml`, `pending_approvals` table). This plan tests the complete flow and fixes one known issue (A0 sends weekly report to FROM address instead of Guy's inbox).

**Tech Stack:** Node.js, Supabase (pending_approvals table), Gmail SMTP (nodemailer), GitHub Actions (workflow_dispatch), @supabase/supabase-js

## Global Constraints

- SMTP sender always: `sockacademy.store@gmail.com`
- Guy's inbox (receives alerts): `guyoved102@gmail.com`
- Supabase RLS: service_role key required for all table writes
- Never print secrets in logs or chat (S2 protocol)
- All test rows must be cleaned up after the test

---

### Task 1: Fix A0 email recipient bug

**Files:**
- Modify: `sockacademy/agents/A0_orchestrator/agent.js:17`

**Context:**
A0 currently sends weekly health reports TO `sockacademy.store@gmail.com` (same as FROM).
HitL emails correctly go to `guyoved102@gmail.com`.
A0 reports should also go to `guyoved102@gmail.com` so Guy sees them in his personal inbox.

- [ ] **Step 1: Update ADMIN_EMAIL constant in A0**

In `sockacademy/agents/A0_orchestrator/agent.js`, change line 17:

```js
// Before:
const ADMIN_EMAIL = 'sockacademy.store@gmail.com';

// After:
const ADMIN_EMAIL = 'guyoved102@gmail.com';
```

- [ ] **Step 2: Verify DRY_RUN local run**

```bash
cd sockacademy/agents/A0_orchestrator
npm install
DRY_RUN=true SUPABASE_URL=<from .env> SUPABASE_SERVICE_KEY=<from .env> node agent.js
```

Expected output:
```
[DRY_RUN] Would send: "📊 SockAcademy Weekly Health..."
```
No errors. No actual email sent.

- [ ] **Step 3: Commit**

```bash
git add sockacademy/agents/A0_orchestrator/agent.js
git commit -m "fix: A0 weekly report email → guyoved102@gmail.com (was sending to FROM address)"
```

---

### Task 2: Write HitL smoke test script

**Files:**
- Create: `sockacademy/scripts/setup/hitl-smoke-test.js`

**Context:**
This is a one-time test script that validates the full HitL cycle.
Run locally with real env vars (not in CI — it sends a real email).

- [ ] **Step 1: Create the smoke test script**

Create `sockacademy/scripts/setup/hitl-smoke-test.js`:

```js
'use strict';

/**
 * HitL Smoke Test — run locally to validate end-to-end flow.
 * Sends a real email to guyoved102@gmail.com.
 * Cleans up test row from Supabase after verification.
 *
 * Usage:
 *   cd sockacademy/corp/core
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... GMAIL_APP_PASSWORD=... \
 *   node ../../scripts/setup/hitl-smoke-test.js
 */

require('dotenv').config({ path: '../../.env' });
const { requestApproval, getApproval, resolveApproval } = require('./hitl');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log('[Smoke Test] HitL end-to-end validation');
  console.log('─'.repeat(50));

  // Step 1: Submit a dummy approval request
  console.log('\n[1/3] Submitting dummy approval request...');
  const approvalId = await requestApproval({
    agentId:     'A0-TEST',
    actionType:  'price_change',
    description: 'SMOKE TEST — ignore this. Price change: Test Sock $0.01 → $0.01',
    payload:     { shopify_product_id: 'SMOKE_TEST', new_price: '0.01', _test: true },
  });

  console.log(`✅ Approval submitted. ID: ${approvalId}`);
  console.log('   Check guyoved102@gmail.com for the approval email.');

  // Step 2: Verify it's in Supabase as 'pending'
  console.log('\n[2/3] Verifying Supabase row...');
  const row = await getApproval(approvalId);
  if (row.status !== 'pending') {
    throw new Error(`Expected status='pending', got '${row.status}'`);
  }
  if (row.agent_id !== 'A0-TEST') {
    throw new Error(`Expected agent_id='A0-TEST', got '${row.agent_id}'`);
  }
  console.log('✅ Row confirmed in Supabase: status=pending, agent_id=A0-TEST');

  // Step 3: Resolve as 'rejected' (safe — does not execute anything)
  console.log('\n[3/3] Resolving as rejected (cleanup)...');
  await resolveApproval(approvalId, 'rejected');

  const resolved = await getApproval(approvalId);
  if (resolved.status !== 'rejected') {
    throw new Error(`Expected status='rejected', got '${resolved.status}'`);
  }
  console.log('✅ Row resolved as rejected. No real action taken.');

  console.log('\n' + '─'.repeat(50));
  console.log('✅ HitL smoke test PASSED');
  console.log(`   Approval ID: ${approvalId}`);
  console.log('   Email was sent to guyoved102@gmail.com');
  console.log('   Row is now status=rejected in pending_approvals');
  console.log('\n   Next: Run hitl-approve.yml manually in GitHub Actions');
  console.log('   to test the APPROVE path (use a fresh request above).');
}

main().catch(err => {
  console.error('[Smoke Test] FAILED:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Run the smoke test**

```bash
cd sockacademy/corp/core
node ../../scripts/setup/hitl-smoke-test.js
```

Expected output:
```
[1/3] Submitting dummy approval request...
[HitL] Approval email sent. ID: <uuid>
✅ Approval submitted. ID: <uuid>
   Check guyoved102@gmail.com for the approval email.
[2/3] Verifying Supabase row...
✅ Row confirmed in Supabase: status=pending, agent_id=A0-TEST
[3/3] Resolving as rejected (cleanup)...
✅ Row resolved as rejected.
✅ HitL smoke test PASSED
```

**If email is not received:** Check GMAIL_APP_PASSWORD in `.env`. Gmail may require the 2FA app password (16-char, no spaces).

- [ ] **Step 3: Test APPROVE path manually via GitHub Actions**

After smoke test passes:
1. Submit one more request by running the script again (stop before Step 3)
2. Copy the Approval ID from output
3. Go to: `https://github.com/guyoved102-lang/SHOPIFY/actions/workflows/hitl-approve.yml`
4. Click "Run workflow"
5. Enter: Approval ID = `<uuid>`, Decision = `approve`
6. Click "Run workflow"
7. Wait ~30 seconds for workflow to complete
8. Open Supabase → pending_approvals table → confirm `status='approved'`

Expected: workflow runs green, row updated to `approved`, `resolved_at` is set.

- [ ] **Step 4: Commit the smoke test script**

```bash
git add sockacademy/scripts/setup/hitl-smoke-test.js
git commit -m "test: add HitL end-to-end smoke test script"
```

---

### Task 3: Push all commits and verify CI

**Files:** None (git operations only)

- [ ] **Step 1: Check git log before push**

```bash
git log --oneline -5
```

Expected to see (in order, newest first):
```
<hash> test: add HitL end-to-end smoke test script
<hash> fix: A0 weekly report email → guyoved102@gmail.com
<hash> fix: structure-lint + A0 allow docs/superpowers/ directory
<hash> docs: full 6-phase SockAcademy roadmap spec (Phase 1–6, revenue-gated)
<hash> feat: SA-6 queue monitoring + pipeline-config schema fix + ANTI_RECURRENCE #21
```

- [ ] **Step 2: Push to GitHub**

```bash
git push
```

- [ ] **Step 3: Monitor CI**

```bash
gh run list --limit 5 --json conclusion,name,status,createdAt
```

Wait for `structure-lint` run to complete. Expected: `success`.

If `DOCS_CONTAMINATION` appears → structure-lint fix did not apply correctly. Check Task 1 of the structure-lint fix was committed.

- [ ] **Step 4: Confirm HitL system status**

After CI is green:
- `pending_approvals` table: exists in Supabase ✅
- `hitl.js`: requestApproval / resolveApproval working ✅
- `hitl-execute.js`: all 5 action types implemented ✅
- `hitl-approve.yml`: workflow_dispatch live in GitHub ✅
- SA-6: monitors backlog, alerts if >5 pending ✅
- A0: expires stale approvals (>24h) every run ✅
- Email: arrives at guyoved102@gmail.com ✅

**HitL is PROVEN. Phase 1 Task 1 = COMPLETE.**

---

## Post-Plan: What's Next (Phase 1 remaining)

After HitL is confirmed:

1. **Pipeline Test** — A1 → A2 → Shopify end-to-end
   Plan: `2026-06-22-pipeline-test.md`

2. **Content Cleanup** — Klaviyo + 3 SQL files in Supabase Editor
   - Run `trends.sql`, `competitor_prices.sql`, `competitor_intel.sql`
   - Fix Abandoned Cart placeholder text
   - Fix Welcome Series warning text

3. **LAUNCH_MODE = true** — set in Supabase → system starts

*כתוב: 22/06/2026 | מאושר ע"י גיא לפני כתיבה*
