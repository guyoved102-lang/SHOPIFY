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

  if (payload_json?._test) {
    console.log('[HitL Execute] _test=true — skipping real execution (smoke test payload).');
    return;
  }
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

  if (action_type === 'meta_budget') {
    const { campaign_id, new_daily_budget } = payload_json;
    if (!process.env.META_ACCESS_TOKEN) throw new Error('META_ACCESS_TOKEN not set');
    const params = new URLSearchParams({
      daily_budget: String(new_daily_budget),
      access_token: process.env.META_ACCESS_TOKEN,
    });
    const res = await fetch(`https://graph.facebook.com/v20.0/${campaign_id}`, {
      method: 'POST',
      body: params,
    });
    const d = await res.json();
    if (d.error) throw new Error(`Meta API: ${d.error.message}`);
    console.log(`  ✓ Campaign ${campaign_id} daily budget → ${new_daily_budget} cents ($${(new_daily_budget / 100).toFixed(2)})`);
    return;
  }

  if (action_type === 'blast_campaign') {
    const { campaign_id } = payload_json;
    if (!process.env.KLAVIYO_PRIVATE_API_KEY) throw new Error('KLAVIYO_PRIVATE_API_KEY not set');
    const res = await fetch('https://a.klaviyo.com/api/campaign-send-jobs/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
        'revision': '2024-10-15',
      },
      body: JSON.stringify({
        data: {
          type: 'campaign-send-job',
          attributes: { action: 'schedule' },
          relationships: {
            campaign: { data: { type: 'campaign', id: campaign_id } },
          },
        },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Klaviyo blast_campaign: ${err.errors?.[0]?.detail || JSON.stringify(err)}`);
    }
    console.log(`  ✓ Klaviyo campaign ${campaign_id} send job created`);
    return;
  }

  if (action_type === 'social_post') {
    const { caption, imageUrl, postType } = payload_json;
    if (!process.env.META_ACCESS_TOKEN) throw new Error('META_ACCESS_TOKEN not set');
    if (!process.env.META_IG_USER_ID) throw new Error('META_IG_USER_ID not set');
    const META_API    = 'https://graph.facebook.com/v20.0';
    const IG_USER_ID  = process.env.META_IG_USER_ID;
    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

    const mediaPayload = postType === 'REEL'
      ? { image_url: imageUrl, caption, media_type: 'REELS', share_to_feed: true, access_token: ACCESS_TOKEN }
      : { image_url: imageUrl, caption, access_token: ACCESS_TOKEN };

    const mediaRes = await fetch(`${META_API}/${IG_USER_ID}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mediaPayload),
    });
    const media = await mediaRes.json();
    if (media.error) throw new Error(`Meta media: ${media.error.message}`);

    const publishRes = await fetch(`${META_API}/${IG_USER_ID}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: media.id, access_token: ACCESS_TOKEN }),
    });
    const published = await publishRes.json();
    if (published.error) throw new Error(`Meta publish: ${published.error.message}`);
    console.log(`  ✓ Instagram post published — ID: ${published.id}`);
    return;
  }

  if (action_type === 'product_delete') {
    const { shopify_product_id } = payload_json;
    const headers = { 'X-Shopify-Access-Token': SHOPIFY_TOKEN };
    const res = await fetch(`${SHOPIFY_API}/products/${shopify_product_id}.json`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok && res.status !== 404) {
      const err = await res.text();
      throw new Error(`Shopify DELETE product ${shopify_product_id}: ${err.slice(0, 200)}`);
    }
    console.log(`  ✓ Product ${shopify_product_id} deleted from Shopify`);
    return;
  }

  console.warn(`[HitL Execute] Unknown action_type: ${action_type} — no executor defined.`);
}

const approvalId = process.env.APPROVAL_ID;
const decision   = process.env.DECISION;

if (!approvalId || !decision) {
  console.error('Usage: APPROVAL_ID=<uuid> DECISION=approved|rejected node hitl-execute.js');
  process.exit(1);
}

execute(approvalId, decision).catch(err => {
  console.error('[HitL Execute] Fatal:', err.message);
  process.exit(1);
});
