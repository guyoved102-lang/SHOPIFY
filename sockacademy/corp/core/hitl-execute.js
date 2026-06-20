/**
 * HitL Execute — called by .github/workflows/hitl-approve.yml
 * Reads APPROVAL_ID + DECISION from env, resolves in Supabase,
 * and if approved, executes the deferred action.
 *
 * Usage (in CI):
 *   APPROVAL_ID=<uuid> DECISION=approve node hitl-execute.js
 */

'use strict';

require('dotenv').config({ path: '../../.env' });
const { getApproval, resolveApproval } = require('./hitl');

const SHOPIFY_DOMAIN  = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_TOKEN   = process.env.SHOPIFY_MASTER_TOKEN;
const SHOPIFY_API     = `https://${SHOPIFY_DOMAIN}/admin/api/2025-01`;

async function shopifyUpsertPage(page) {
  const headers = {
    'X-Shopify-Access-Token': SHOPIFY_TOKEN,
    'Content-Type': 'application/json',
  };

  const listRes = await fetch(`${SHOPIFY_API}/pages.json?handle=${page.handle}&limit=1`, { headers });
  const listData = await listRes.json();
  const existing = listData.pages?.[0];

  if (existing) {
    const res = await fetch(`${SHOPIFY_API}/pages/${existing.id}.json`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ page: { id: existing.id, title: page.title, body_html: page.body_html, published: true } }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(`Shopify UPDATE page ${page.handle}: ${JSON.stringify(d.errors)}`);
    return { action: 'updated', handle: page.handle };
  } else {
    const res = await fetch(`${SHOPIFY_API}/pages.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ page: { title: page.title, handle: page.handle, body_html: page.body_html, published: true } }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(`Shopify CREATE page ${page.handle}: ${JSON.stringify(d.errors)}`);
    return { action: 'created', handle: page.handle };
  }
}

async function execute(approvalId, decision) {
  console.log(`[HitL Execute] ID: ${approvalId} | Decision: ${decision}`);

  const approval = await getApproval(approvalId);

  if (approval.status !== 'pending') {
    console.error(`[HitL Execute] Approval ${approvalId} is already ${approval.status} — aborting.`);
    process.exit(1);
  }

  await resolveApproval(approvalId, decision);
  console.log(`[HitL Execute] Resolved as: ${decision}`);

  if (decision === 'rejected') {
    console.log('[HitL Execute] Action rejected by operator. No changes made.');
    return;
  }

  const { action_type, payload_json } = approval;
  console.log(`[HitL Execute] Executing: ${action_type}`);

  if (action_type === 'legal_page_update') {
    const pages = payload_json.pages;
    for (const page of pages) {
      const result = await shopifyUpsertPage(page);
      console.log(`  ✓ ${result.action}: /pages/${result.handle}`);
    }
    return;
  }

  if (action_type === 'price_change') {
    const { shopify_product_id, new_price } = payload_json;
    const headers = { 'X-Shopify-Access-Token': SHOPIFY_TOKEN, 'Content-Type': 'application/json' };
    const res = await fetch(`${SHOPIFY_API}/products/${shopify_product_id}/variants.json`, { headers });
    const { variants } = await res.json();
    for (const variant of variants) {
      await fetch(`${SHOPIFY_API}/variants/${variant.id}.json`, {
        method: 'PUT', headers,
        body: JSON.stringify({ variant: { id: variant.id, price: String(new_price) } }),
      });
    }
    console.log(`  ✓ Price updated on product ${shopify_product_id} → $${new_price}`);
    return;
  }

  console.warn(`[HitL Execute] Unknown action_type: ${action_type} — no executor defined.`);
}

const approvalId = process.env.APPROVAL_ID;
const decision   = process.env.DECISION;

if (!approvalId || !decision) {
  console.error('Usage: APPROVAL_ID=<uuid> DECISION=approve|reject node hitl-execute.js');
  process.exit(1);
}

execute(approvalId, decision).catch(err => {
  console.error('[HitL Execute] Fatal:', err.message);
  process.exit(1);
});
