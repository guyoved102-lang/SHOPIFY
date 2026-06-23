/**
 * A2.5 — Quality Control Agent
 *
 * Runs at 07:30 UTC daily, 30 minutes before A2 (08:00 UTC).
 * Picks products with status='Approved' and upload_status=''.
 * Validates each product against 7 checks.
 * Sets upload_status to 'qc_approved' or 'qc_rejected:<reason>'.
 * A2 only uploads products with upload_status='qc_approved'.
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const DRY_RUN = process.env.DRY_RUN === 'true';
const ADMIN_EMAIL = 'guyoved102@gmail.com';

const PRICE_MIN = 18;
const PRICE_MAX = 65;
const MIN_A1_SCORE = 50;

// ─── SUPABASE ────────────────────────────────────────────────────────────────

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function getPendingProducts(supabase) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'Approved')
    .eq('upload_status', '');
  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data || [];
}

async function getUploadedCjPids(supabase) {
  const { data, error } = await supabase
    .from('products')
    .select('cj_pid')
    .like('upload_status', 'uploaded:%');
  if (error) throw new Error(`Duplicate check query failed: ${error.message}`);
  return new Set((data || []).map(r => r.cj_pid).filter(Boolean));
}

async function setUploadStatus(supabase, id, status) {
  if (DRY_RUN) {
    console.log(`     [DRY_RUN] Would set upload_status="${status}"`);
    return;
  }
  const { error } = await supabase
    .from('products')
    .update({ upload_status: status })
    .eq('id', id);
  if (error) throw new Error(`Status update failed: ${error.message}`);
}

async function logQcResult(supabase, product, passed, failures) {
  if (DRY_RUN) return;
  const price = parseFloat(product.retail_price);
  const { error } = await supabase
    .from('product_qc_log')
    .insert({
      product_id:       product.id,
      product_name:     product.product_name,
      qc_result:        passed ? 'approved' : 'rejected',
      rejection_reason: failures.length > 0 ? failures.join('; ') : null,
      checks_passed: {
        has_name:       !!(product.product_name && product.product_name.trim().length >= 5),
        price_in_range: !isNaN(price) && price >= PRICE_MIN && price <= PRICE_MAX,
        has_image:      !!(product.image_url && product.image_url.startsWith('http')),
        has_category:   !!(product.category && product.category.trim().length >= 2),
        has_materials:  !!(product.materials && product.materials.trim().length >= 3),
        no_duplicate:   !failures.some(f => f.startsWith('duplicate')),
        score_ok:       product.score === null || product.score === undefined || product.score >= MIN_A1_SCORE,
      },
    });
  if (error) console.error(`⚠️ QC log insert failed: ${error.message}`);
}

async function updateA25Health(supabase, status, meta = {}) {
  if (DRY_RUN) return;
  const { error } = await supabase
    .from('agent_health_log')
    .insert({
      agent_id:        'A2.5',
      agent_name:      'Quality Control',
      run_status:      status,
      items_processed: meta.total || 0,
      metadata:        meta,
    });
  if (error) console.error(`⚠️ Health log failed: ${error.message}`);
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────

function validateProduct(product, uploadedCjPids) {
  const failures = [];

  if (!product.product_name || product.product_name.trim().length < 5)
    failures.push('product_name too short or missing');

  const price = parseFloat(product.retail_price);
  if (isNaN(price) || price < PRICE_MIN || price > PRICE_MAX)
    failures.push(`price $${price} outside $${PRICE_MIN}–$${PRICE_MAX}`);

  if (!product.image_url || !product.image_url.startsWith('http'))
    failures.push('image_url missing or invalid');

  if (!product.category || product.category.trim().length < 2)
    failures.push('category missing');

  if (!product.materials || product.materials.trim().length < 3)
    failures.push('materials missing');

  if (product.cj_pid && uploadedCjPids.has(product.cj_pid))
    failures.push(`duplicate: cj_pid ${product.cj_pid} already uploaded`);

  if (product.score !== null && product.score !== undefined && product.score < MIN_A1_SCORE)
    failures.push(`A1 score ${product.score} below minimum ${MIN_A1_SCORE}`);

  return failures;
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

async function sendRejectionEmail(rejected) {
  if (!process.env.GMAIL_APP_PASSWORD || rejected.length === 0) return;
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would send rejection email for ${rejected.length} product(s)`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const rows = rejected
    .map(({ product, reasons }) =>
      `<tr>
        <td style="padding:4px 8px">${product.product_name}</td>
        <td style="padding:4px 8px;color:#c0392b">${reasons.join(', ')}</td>
      </tr>`
    )
    .join('');

  const html = `<div style="font-family:monospace;max-width:650px">
    <h2 style="color:#d97706">A2.5 QC — ${rejected.length} Product(s) Blocked from Upload</h2>
    <p>The following products failed quality control. They will not be uploaded until corrected.</p>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0">
      <tr style="background:#f2f2f2">
        <th style="padding:4px 8px;text-align:left">Product</th>
        <th style="padding:4px 8px;text-align:left">Reason</th>
      </tr>
      ${rows}
    </table>
    <p><strong>To fix:</strong> edit the product in Supabase, then set <code>upload_status = ''</code> to re-queue.</p>
    <hr>
    <p style="color:#888;font-size:11px">SockAcademy A2.5 Quality Control Agent</p>
  </div>`;

  await transporter.sendMail({
    from: '"SockAcademy A2.5" <sockacademy.store@gmail.com>',
    to: ADMIN_EMAIL,
    subject: `A2.5 QC: ${rejected.length} product(s) blocked from upload`,
    html,
  });
  console.log(`📧 Rejection email sent: ${rejected.length} product(s)`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍 A2.5 Quality Control Agent');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN}`);
  console.log('─'.repeat(52));

  const supabase = getSupabase();
  console.log('✅ Supabase connected');

  const products = await getPendingProducts(supabase);
  console.log(`\n📦 ${products.length} product(s) awaiting QC`);

  if (products.length === 0) {
    console.log('✅ Nothing to validate');
    await updateA25Health(supabase, 'success', { total: 0, approved: 0, rejected: 0 });
    return;
  }

  const uploadedCjPids = await getUploadedCjPids(supabase);
  console.log(`📋 ${uploadedCjPids.size} CJ PIDs already uploaded (duplicate baseline)\n`);

  let approved = 0;
  let rejected = 0;
  const rejectedList = [];

  for (const product of products) {
    const failures = validateProduct(product, uploadedCjPids);
    const passed = failures.length === 0;

    if (passed) {
      console.log(`  ✅ APPROVED: "${product.product_name}"`);
      await setUploadStatus(supabase, product.id, 'qc_approved');
      await logQcResult(supabase, product, true, []);
      approved++;
    } else {
      console.log(`  🔴 REJECTED: "${product.product_name}" — ${failures.join('; ')}`);
      await setUploadStatus(supabase, product.id, `qc_rejected:${failures.join('; ')}`);
      await logQcResult(supabase, product, false, failures);
      rejectedList.push({ product, reasons: failures });
      rejected++;
    }
  }

  console.log(`\n📊 QC Summary: ${approved} approved → A2 queue | ${rejected} rejected`);

  if (rejectedList.length > 0) {
    await sendRejectionEmail(rejectedList);
  }

  await updateA25Health(supabase, 'success', { total: products.length, approved, rejected });

  console.log('\n' + '─'.repeat(52));
  console.log(`✅ Done | ${approved} approved | ${rejected} blocked`);
}

main().catch(async err => {
  console.error('\n❌ A2.5 fatal:', err.message);
  try {
    const sb = getSupabase();
    await updateA25Health(sb, 'failure', { error: err.message });
  } catch (_) {}
  process.exit(1);
});
