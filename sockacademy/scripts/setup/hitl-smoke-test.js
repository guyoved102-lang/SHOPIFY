'use strict';

/**
 * HitL Smoke Test — run locally to validate end-to-end flow.
 * Sends a real email to guyoved102@gmail.com.
 *
 * Usage:
 *   cd sockacademy/corp/core
 *   node ../../scripts/setup/hitl-smoke-test.js
 *
 * Requires .env with: SUPABASE_URL, SUPABASE_SERVICE_KEY, GMAIL_APP_PASSWORD
 */

require('dotenv').config({ path: '../../.env' });
const { requestApproval, getApproval, resolveApproval } = require('../../corp/core/hitl');

async function main() {
  console.log('[Smoke Test] HitL end-to-end validation');
  console.log('─'.repeat(50));

  // Step 1: Submit a dummy approval request
  console.log('\n[1/3] Submitting dummy approval request...');
  const approvalId = await requestApproval({
    agentId:     'A0-TEST',
    actionType:  'price_change',
    description: 'SMOKE TEST — ignore. Price change: Test Sock $0.01 → $0.01',
    payload:     { shopify_product_id: 'SMOKE_TEST', new_price: '0.01', _test: true },
  });

  console.log(`✅ Approval submitted. ID: ${approvalId}`);
  console.log('   Check guyoved102@gmail.com for the approval email.');

  // Step 2: Verify pending_approvals row exists with correct data
  console.log('\n[2/3] Verifying Supabase row...');
  const row = await getApproval(approvalId);

  if (row.status !== 'pending')    throw new Error(`Expected status='pending', got '${row.status}'`);
  if (row.agent_id !== 'A0-TEST')  throw new Error(`Expected agent_id='A0-TEST', got '${row.agent_id}'`);
  if (row.action_type !== 'price_change') throw new Error(`action_type mismatch: ${row.action_type}`);

  console.log('✅ Supabase row confirmed: status=pending, agent_id=A0-TEST, action_type=price_change');

  // Step 3: Resolve as rejected (cleanup — does not trigger any real action)
  console.log('\n[3/3] Resolving as rejected (safe cleanup)...');
  await resolveApproval(approvalId, 'rejected');

  const resolved = await getApproval(approvalId);
  if (resolved.status !== 'rejected') throw new Error(`Expected status='rejected', got '${resolved.status}'`);

  console.log('✅ Row resolved as rejected. No real action taken.');
  console.log('\n' + '─'.repeat(50));
  console.log('✅ HitL smoke test PASSED');
  console.log(`\n   Approval ID: ${approvalId}`);
  console.log('   Email sent to: guyoved102@gmail.com');
  console.log('   Row status: rejected (safe)');
  console.log('\n   To test APPROVE path:');
  console.log('   1. Re-run this script (get a new approval_id from output)');
  console.log('   2. Copy the Approval ID before it auto-rejects');
  console.log('   3. Go to: https://github.com/guyoved102-lang/SHOPIFY/actions/workflows/hitl-approve.yml');
  console.log('   4. Run workflow → paste Approval ID → select approve → Run');
  console.log('   5. Check Supabase: pending_approvals → status should be "approved"');
}

main().catch(err => {
  console.error('\n[Smoke Test] FAILED:', err.message);
  process.exit(1);
});
