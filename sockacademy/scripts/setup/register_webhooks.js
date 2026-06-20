'use strict';

/**
 * register_webhooks.js — One-time setup: register Shopify webhooks → Make.com
 *
 * Run once:
 *   node sockacademy/scripts/setup/register_webhooks.js
 *
 * Prerequisites:
 *   - SHOPIFY_SHOP_DOMAIN and SHOPIFY_MASTER_TOKEN in .env
 *   - MAKE_WEBHOOK_URL in .env (your Make.com webhook scenario URL)
 *     Get it from: Make.com → New scenario → Webhooks → Custom Webhook → Copy URL
 */

require('dotenv').config({ path: '../../.env' });

const https = require('https');

const DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const TOKEN  = process.env.SHOPIFY_MASTER_TOKEN;
const TARGET = process.env.MAKE_WEBHOOK_URL;

if (!DOMAIN || !TOKEN || !TARGET) {
  console.error('Missing: SHOPIFY_SHOP_DOMAIN, SHOPIFY_MASTER_TOKEN, MAKE_WEBHOOK_URL in .env');
  process.exit(1);
}

const TOPICS = [
  'orders/create',
  'orders/paid',
  'orders/cancelled',
  'products/create',
  'products/update',
  'inventory_levels/update',
];

function shopifyRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req  = https.request(
      {
        hostname: DOMAIN,
        path,
        method,
        headers: {
          'X-Shopify-Access-Token': TOKEN,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve({ status: res.statusCode, body: raw }));
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function listExisting() {
  const { body } = await shopifyRequest('GET', '/admin/api/2025-01/webhooks.json');
  return JSON.parse(body).webhooks || [];
}

async function register(topic) {
  const { status, body } = await shopifyRequest('POST', '/admin/api/2025-01/webhooks.json', {
    webhook: { topic, address: TARGET, format: 'json' },
  });
  if (status === 201) {
    const wh = JSON.parse(body).webhook;
    console.log(`  ✓ ${topic} → id ${wh.id}`);
  } else {
    console.error(`  ✗ ${topic} (${status}): ${body}`);
  }
}

async function deleteWebhook(id) {
  await shopifyRequest('DELETE', `/admin/api/2025-01/webhooks/${id}.json`);
}

async function main() {
  console.log(`\nShopify Webhook Registration — ${DOMAIN}`);
  console.log(`Target: ${TARGET}\n`);

  // Remove existing webhooks pointing to old/stale URLs
  const existing = await listExisting();
  console.log(`Found ${existing.length} existing webhook(s).`);
  for (const wh of existing) {
    if (wh.address !== TARGET) {
      await deleteWebhook(wh.id);
      console.log(`  ✗ Removed stale webhook: ${wh.topic} → ${wh.address}`);
    } else {
      console.log(`  ✓ Already registered: ${wh.topic}`);
    }
  }

  // Register all required topics (skip already registered)
  const registeredTopics = new Set(
    existing.filter((w) => w.address === TARGET).map((w) => w.topic)
  );

  console.log('\nRegistering webhooks:');
  for (const topic of TOPICS) {
    if (registeredTopics.has(topic)) {
      console.log(`  ↷ ${topic} already registered — skip`);
      continue;
    }
    await register(topic);
  }

  console.log('\nDone. Webhooks active in Shopify → Make.com → GitHub Actions.');
  console.log('\nNext: in Make.com, configure the webhook scenario to POST to:');
  console.log(
    `  https://api.github.com/repos/${process.env.GH_REPO_OWNER || 'OWNER'}/${process.env.GH_REPO_NAME || 'REPO'}/dispatches`
  );
  console.log('  Headers: Authorization: Bearer <GH_PAT_SECRETS_WRITE>');
  console.log('  Body:    { "event_type": "shopify-webhook", "client_payload": { "topic": "{{topic}}", "data": {{body}} } }');
}

main().catch((e) => { console.error(e); process.exit(1); });
