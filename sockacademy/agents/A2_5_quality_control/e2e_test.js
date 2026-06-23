#!/usr/bin/env node
/**
 * E2E Pipeline Test — DUMMY-FIRST Protocol
 * Validates: A2.5 QC Gate → A2 Shopify Upload (end-to-end)
 *
 * Usage: node e2e_test.js
 * Run from: sockacademy/agents/A2_5_quality_control/
 *
 * Steps:
 *   1. Insert dummy product (status=Approved, upload_status='')
 *   2. A2.5 DRY_RUN=true  → verify reads and would approve
 *   3. A2.5 DRY_RUN=false → verify upload_status='qc_approved' in Supabase
 *   4. A2  DRY_RUN=true   → verify description generation (no Shopify call)
 *   5. A2  DRY_RUN=false  → verify upload_status='uploaded:<id>' + Shopify draft created
 *   6. Cleanup: delete Shopify draft + Supabase row + QC log
 *   7. Report PROVEN ✅ or FAILED ❌
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const { spawnSync }    = require('child_process');
const path             = require('path');

const AGENT_A25 = path.resolve(__dirname, 'agent.js');
const AGENT_A2  = path.resolve(__dirname, '../A2_product_upload/agent.js');

const DUMMY_NAME = 'E2E TEST — Merino Dress Socks (DELETE ME)';

function makeDummy() {
  return {
    product_name:  DUMMY_NAME,
    category:      'Dress',
    materials:     'Merino Wool, Cotton',
    retail_price:  28.00,
    image_url:     'https://images.pexels.com/photos/1020370/pexels-photo-1020370.jpeg',
    cj_pid:        `E2E_TEST_${Date.now()}`,
    score:         75,
    status:        'Approved',
    upload_status: '',
    platform:      'TEST',
    run_date:      new Date().toISOString().split('T')[0],
  };
}

function hr(msg) { console.log(`\n${'━'.repeat(60)}\n${msg}\n${'━'.repeat(60)}`); }
function pass(msg) { console.log(`✅  ${msg}`); }
function abort(msg) { console.error(`\n❌  ABORT: ${msg}\n`); process.exit(1); }

function runAgent(agentPath, dryRun) {
  console.log(`\n   → node ${path.basename(agentPath)} DRY_RUN=${dryRun}\n`);
  const result = spawnSync('node', [agentPath], {
    env:      { ...process.env, DRY_RUN: dryRun ? 'true' : 'false' },
    encoding: 'utf8',
    timeout:  120_000,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) abort(`Agent exited with code ${result.status}`);
  return result.stdout || '';
}

async function deleteShopifyProduct(shopifyId) {
  if (!shopifyId) return;
  if (!process.env.SHOPIFY_SHOP_DOMAIN || !process.env.SHOPIFY_MASTER_TOKEN) {
    console.error('⚠️  SHOPIFY env vars missing — skip Shopify cleanup');
    return;
  }
  try {
    const res = await fetch(
      `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2025-01/products/${shopifyId}.json`,
      { method: 'DELETE', headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_MASTER_TOKEN } }
    );
    (res.ok || res.status === 404)
      ? pass(`Shopify draft #${shopifyId} deleted`)
      : console.error(`⚠️  Shopify DELETE returned ${res.status}`);
  } catch (e) {
    console.error(`⚠️  Shopify cleanup error: ${e.message}`);
  }
}

async function main() {
  // Pre-flight checks
  if (!process.env.SUPABASE_URL)        abort('SUPABASE_URL not set — check sockacademy/.env');
  if (!process.env.SUPABASE_SERVICE_KEY) abort('SUPABASE_SERVICE_KEY not set — check sockacademy/.env');
  if (!process.env.ANTHROPIC_API_KEY)    abort('ANTHROPIC_API_KEY not set — A2 needs it for description generation');

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  let dummyId  = null;
  let shopifyId = null;

  try {
    // ── STEP 1: Insert dummy ─────────────────────────────────────────────────
    hr('STEP 1 — Insert dummy product into Supabase');

    // Warn if other products are already queued (would also be processed)
    const { data: existing } = await sb.from('products')
      .select('id, product_name').eq('status', 'Approved').eq('upload_status', '');
    if (existing?.length) {
      console.warn(`⚠️  WARNING: ${existing.length} other product(s) in the Approved queue will also be processed by A2.5.`);
      existing.forEach(p => console.warn(`   - ${p.product_name}`));
    }

    const { data: inserted, error: insertErr } = await sb
      .from('products').insert(makeDummy()).select().single();
    if (insertErr) abort(`Supabase INSERT failed: ${insertErr.message}`);
    dummyId = inserted.id;
    pass(`Dummy inserted — id: ${dummyId}`);

    // ── STEP 2: A2.5 DRY_RUN=true ───────────────────────────────────────────
    hr('STEP 2 — A2.5 DRY_RUN=true (verify reads and approves)');
    const out25dry = runAgent(AGENT_A25, true);

    if (!out25dry.includes(DUMMY_NAME)) abort('A2.5 did not pick up the dummy product — check Supabase query');
    if (!out25dry.toLowerCase().includes('approved')) abort('A2.5 did not approve the dummy product — check validation logic');
    pass('A2.5 reads dummy and marks it APPROVED (dry run)');

    const { data: afterDry25 } = await sb.from('products').select('upload_status').eq('id', dummyId).single();
    if (afterDry25.upload_status !== '') abort(`DRY_RUN should NOT write to Supabase. Got: "${afterDry25.upload_status}"`);
    pass('upload_status unchanged after DRY_RUN=true ✅');

    // ── STEP 3: A2.5 DRY_RUN=false ──────────────────────────────────────────
    hr('STEP 3 — A2.5 DRY_RUN=false (write qc_approved to Supabase)');
    runAgent(AGENT_A25, false);

    const { data: afterQc, error: qcErr } = await sb.from('products').select('upload_status').eq('id', dummyId).single();
    if (qcErr) abort(`Supabase read failed: ${qcErr.message}`);
    if (afterQc.upload_status !== 'qc_approved') abort(`Expected "qc_approved", got "${afterQc.upload_status}"`);
    pass('upload_status = "qc_approved" ✅');

    // ── STEP 4: A2 DRY_RUN=true ─────────────────────────────────────────────
    hr('STEP 4 — A2 DRY_RUN=true (Claude description, no Shopify call)');
    const out2dry = runAgent(AGENT_A2, true);

    if (!out2dry.includes('DRY_RUN')) abort('A2 DRY_RUN=true did not output expected DRY_RUN marker');
    pass('A2 generates Claude description, skips Shopify upload ✅');

    // upload_status should still be qc_approved (A2 DRY_RUN doesn't write)
    const { data: afterA2dry } = await sb.from('products').select('upload_status').eq('id', dummyId).single();
    if (afterA2dry.upload_status !== 'qc_approved') abort(`After A2 DRY_RUN, status changed unexpectedly to "${afterA2dry.upload_status}"`);
    pass('upload_status unchanged after A2 DRY_RUN=true ✅');

    // ── STEP 5: A2 DRY_RUN=false (LIVE) ─────────────────────────────────────
    hr('STEP 5 — A2 DRY_RUN=false (LIVE Shopify upload as Draft)');
    runAgent(AGENT_A2, false);

    const { data: afterUpload, error: uploadErr } = await sb
      .from('products').select('upload_status, shopify_id').eq('id', dummyId).single();
    if (uploadErr) abort(`Supabase read failed: ${uploadErr.message}`);
    if (!afterUpload.upload_status?.startsWith('uploaded:')) {
      abort(`Expected "uploaded:<id>", got "${afterUpload.upload_status}"`);
    }
    shopifyId = afterUpload.shopify_id;
    pass(`upload_status = "${afterUpload.upload_status}" ✅`);
    pass(`Shopify Draft product ID: ${shopifyId}`);

  } finally {
    // ── CLEANUP ──────────────────────────────────────────────────────────────
    hr('CLEANUP');

    await deleteShopifyProduct(shopifyId);

    if (dummyId) {
      await sb.from('product_qc_log').delete().eq('product_id', dummyId);
      const { error: delErr } = await sb.from('products').delete().eq('id', dummyId);
      delErr
        ? console.error(`⚠️  Supabase product delete: ${delErr.message}`)
        : pass('Supabase dummy row deleted');
    }

    // ── RESULT ───────────────────────────────────────────────────────────────
    hr('RESULT');
    if (shopifyId) {
      console.log('\n🎉  PIPELINE E2E — PROVEN ✅');
      console.log('    A2.5 QC Gate → Claude SEO → Shopify Draft: end-to-end working\n');
    } else {
      console.log('\n💥  PIPELINE E2E — FAILED ❌');
      console.log('    Check the output above for the first failure point.\n');
    }
  }
}

main().catch(e => {
  console.error(`\n💥  Fatal: ${e.message}\n`);
  process.exit(1);
});
