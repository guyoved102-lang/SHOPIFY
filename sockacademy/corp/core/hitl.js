/**
 * Human-in-the-Loop (HitL) Utility — SockAcademy
 * Shared module used by any agent before executing a critical action.
 *
 * Flow:
 *  1. Agent calls requestApproval() → row written to Supabase pending_approvals
 *  2. Email sent to Guy with action description + approval instructions
 *  3. Guy runs .github/workflows/hitl-approve.yml with approval_id + decision
 *  4. Approval workflow updates Supabase status → executes or aborts the action
 *
 * Critical actions requiring approval (per CLAUDE.md Phase B):
 *  - Meta campaign budget > $50
 *  - Price change on any Shopify product
 *  - Product deletion from store
 *  - Blast campaign to full customer list
 *  - Legal page update (Terms, Privacy Policy, etc.)
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const ADMIN_EMAIL = 'guyoved102@gmail.com';
const FROM_EMAIL  = 'sockacademy.store@gmail.com';

function getSupabase() {
  if (!process.env.SUPABASE_URL)         throw new Error('SUPABASE_URL not set');
  if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function getMailer() {
  if (!process.env.GMAIL_APP_PASSWORD) throw new Error('GMAIL_APP_PASSWORD not set');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: FROM_EMAIL, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

/**
 * Submit a critical action for human approval.
 * Returns the approval_id (UUID). Agent logs this and exits — does NOT wait.
 *
 * @param {object} opts
 * @param {string} opts.agentId       e.g. 'A9'
 * @param {string} opts.actionType    e.g. 'legal_page_update' | 'price_change' | 'meta_budget' | 'blast_campaign' | 'product_delete'
 * @param {string} opts.description   Human-readable summary shown in the email
 * @param {object} opts.payload       Full action payload stored in Supabase (retrieved by hitl-approve.yml)
 */
async function requestApproval({ agentId, actionType, description, payload }) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('pending_approvals')
    .insert({
      agent_id:    agentId,
      action_type: actionType,
      description,
      payload_json: payload,
      status:       'pending',
    })
    .select('id')
    .single();

  if (error) throw new Error(`HitL insert failed: ${error.message}`);

  const approvalId = data.id;

  await sendApprovalEmail({ approvalId, agentId, actionType, description });

  return approvalId;
}

async function sendApprovalEmail({ approvalId, agentId, actionType, description }) {
  const mailer = getMailer();

  const approveUrl = `https://github.com/guyoved102-lang/SHOPIFY/actions/workflows/hitl-approve.yml`;

  const html = `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0A0A0A;color:#F0EDE6;padding:40px 32px;border-radius:8px">
  <div style="text-align:center;margin-bottom:28px;border-bottom:1px solid #2a2a2a;padding-bottom:20px">
    <div style="font-size:11px;letter-spacing:4px;color:#C9A84C;text-transform:uppercase">SOCKACADEMY</div>
    <div style="font-size:20px;font-weight:700;margin-top:10px">Action Pending Approval</div>
    <div style="color:#F96E6E;font-size:12px;margin-top:4px;font-weight:600">REQUIRES YOUR APPROVAL WITHIN 24 HOURS</div>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
    <tr>
      <td style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:8px 0">Agent</td>
      <td style="color:#F0EDE6;font-size:14px;padding:8px 0;font-weight:600">${agentId}</td>
    </tr>
    <tr>
      <td style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:8px 0">Action</td>
      <td style="color:#F0EDE6;font-size:14px;padding:8px 0">${actionType}</td>
    </tr>
    <tr>
      <td style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:8px 0;vertical-align:top">Details</td>
      <td style="color:#F0EDE6;font-size:14px;padding:8px 0">${description}</td>
    </tr>
    <tr>
      <td style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:8px 0">Approval ID</td>
      <td style="color:#C9A84C;font-size:13px;padding:8px 0;font-family:monospace">${approvalId}</td>
    </tr>
  </table>

  <div style="background:#1a1a1a;border-radius:6px;padding:20px;margin-bottom:24px">
    <div style="font-size:13px;color:#9ca3af;margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px">To Approve or Reject:</div>
    <ol style="color:#F0EDE6;font-size:13px;margin:0;padding-left:20px;line-height:2">
      <li>Go to: <a href="${approveUrl}" style="color:#C9A84C">${approveUrl}</a></li>
      <li>Click "Run workflow"</li>
      <li>Enter Approval ID: <span style="font-family:monospace;color:#C9A84C">${approvalId}</span></li>
      <li>Set Decision: <code style="color:#4ade80">approve</code> or <code style="color:#F96E6E">reject</code></li>
      <li>Click "Run workflow"</li>
    </ol>
  </div>

  <div style="font-size:11px;color:#4b5563;text-align:center">
    If not actioned within 24 hours, this request will be automatically aborted.<br>
    SockAcademy Autonomous Operations — ${new Date().toISOString()}
  </div>
</div>`;

  await mailer.sendMail({
    from:    `"SockAcademy HitL" <${FROM_EMAIL}>`,
    to:      ADMIN_EMAIL,
    subject: `[APPROVAL REQUIRED] ${agentId} — ${actionType}`,
    html,
  });

  console.log(`[HitL] Approval email sent. ID: ${approvalId}`);
}

/**
 * Check if a specific approval_id has been approved.
 * Used by the hitl-approve workflow to retrieve payload and confirm status.
 */
async function getApproval(approvalId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('pending_approvals')
    .select('*')
    .eq('id', approvalId)
    .single();
  if (error) throw new Error(`HitL getApproval failed: ${error.message}`);
  return data;
}

/**
 * Resolve an approval (set status to 'approved' or 'rejected').
 * Called by hitl-approve.yml after Guy's decision.
 */
async function resolveApproval(approvalId, decision) {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error(`Invalid decision: ${decision}. Must be 'approved' or 'rejected'.`);
  }
  const supabase = getSupabase();
  const { error } = await supabase
    .from('pending_approvals')
    .update({ status: decision, resolved_at: new Date().toISOString() })
    .eq('id', approvalId);
  if (error) throw new Error(`HitL resolveApproval failed: ${error.message}`);
}

/**
 * Abort all pending approvals older than 24 hours.
 * Called by A0 as part of its daily health sweep.
 */
async function expireStaleApprovals() {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('pending_approvals')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('created_at', cutoff);
  if (error) throw new Error(`HitL expireStale failed: ${error.message}`);
}

module.exports = { requestApproval, getApproval, resolveApproval, expireStaleApprovals };
