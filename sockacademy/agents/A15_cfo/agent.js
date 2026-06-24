/**
 * A15 — CFO Agent (Chief Financial Officer)
 *
 * Runs daily at 22:30 UTC.
 * PRE-REVENUE mode (orders=0): reports catalog margin analysis from products table.
 * LIVE mode (orders>0): reports realized revenue, COGS, gross margin, Phase 2 progress.
 * Fetches live USD/ILS exchange rate.
 * Writes: executive_reports (agent_id='A15', report_type='daily')
 * Sends: daily financial digest email to Guy
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const DRY_RUN        = process.env.DRY_RUN === 'true';
const ADMIN_EMAIL    = 'guyoved102@gmail.com';
const REPORT_DATE    = new Date().toISOString().split('T')[0];
const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_TOKEN  = process.env.SHOPIFY_MASTER_TOKEN;
const SHOPIFY_API    = `https://${SHOPIFY_DOMAIN}/admin/api/2025-01`;

const PHASE2_ORDER_TRIGGER = 25;
const PHASE2_MRR_TRIGGER   = 1000;

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, meta = {}) {
  if (DRY_RUN) return;
  try {
    await supabase.from('agent_health_log').insert({
      agent_id:   'A15',
      agent_name: 'CFO Financial Report',
      run_status: status,
      metadata:   meta,
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}

// ─── SHOPIFY ──────────────────────────────────────────────────────────────────

async function fetchOrdersLastNDays(days) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    console.log('   [skip] Shopify credentials not set');
    return [];
  }
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const url   = `${SHOPIFY_API}/orders.json?created_at_min=${encodeURIComponent(since)}&status=any&limit=250`;
  const res   = await fetch(url, { headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN } });
  if (!res.ok) throw new Error(`Shopify orders fetch failed: ${res.status}`);
  return (await res.json()).orders || [];
}

async function fetchAllTimeOrderCount() {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) return 0;
  const url = `${SHOPIFY_API}/orders/count.json?status=any`;
  const res = await fetch(url, { headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN } });
  if (!res.ok) return 0;
  return (await res.json()).count || 0;
}

// ─── EXCHANGE RATE ────────────────────────────────────────────────────────────

async function fetchUsdIlsRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(6000) });
    return res.ok ? ((await res.json())?.rates?.ILS || null) : null;
  } catch (_) {
    return null;
  }
}

// ─── CATALOG MARGIN ANALYSIS (PRE-REVENUE) ────────────────────────────────────

async function getCatalogMargins(supabase) {
  const { data, error } = await supabase
    .from('products')
    .select('product_name, supplier_price, retail_price, category')
    .like('upload_status', 'uploaded:%');
  if (error || !data?.length) return null;

  const margins = data
    .filter(p => p.supplier_price > 0 && p.retail_price > 0)
    .map(p => ({
      name:            p.product_name,
      category:        p.category,
      supplier_price:  parseFloat(p.supplier_price),
      retail_price:    parseFloat(p.retail_price),
      gross_margin_pct: Math.round(((p.retail_price - p.supplier_price) / p.retail_price) * 100),
    }));

  if (!margins.length) return null;

  const avg_margin = Math.round(margins.reduce((s, m) => s + m.gross_margin_pct, 0) / margins.length);
  const min_margin = Math.min(...margins.map(m => m.gross_margin_pct));
  const max_margin = Math.max(...margins.map(m => m.gross_margin_pct));
  const potential_revenue_at_sell_through = margins.reduce((s, m) => s + m.retail_price, 0);

  return {
    products_analyzed: margins.length,
    avg_gross_margin_pct: avg_margin,
    min_gross_margin_pct: min_margin,
    max_gross_margin_pct: max_margin,
    potential_revenue_at_sell_through: parseFloat(potential_revenue_at_sell_through.toFixed(2)),
    top_margin_products: [...margins].sort((a, b) => b.gross_margin_pct - a.gross_margin_pct).slice(0, 3),
  };
}

// ─── CALCULATIONS ─────────────────────────────────────────────────────────────

function calcOrderStats(orders) {
  if (orders.length === 0) return { count: 0, revenue: 0, aov: 0, refunds: 0 };
  const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  const refunds = orders.reduce((sum, o) => sum + parseFloat(o.total_refunds || 0), 0);
  return {
    count:   orders.length,
    revenue: parseFloat(revenue.toFixed(2)),
    aov:     parseFloat((revenue / orders.length).toFixed(2)),
    refunds: parseFloat(refunds.toFixed(2)),
  };
}

function phase2Progress(allTimeOrders, weeklyRevenue) {
  const estimatedMrr = weeklyRevenue * 4.33;
  const orderPct     = Math.min(100, Math.round((allTimeOrders / PHASE2_ORDER_TRIGGER) * 100));
  const mrrPct       = Math.min(100, Math.round((estimatedMrr / PHASE2_MRR_TRIGGER) * 100));
  return { orderPct, mrrPct, estimatedMrr: parseFloat(estimatedMrr.toFixed(2)) };
}

function progressBar(pct) {
  const filled = Math.round(pct / 5);
  const empty  = 20 - filled;
  return `${'|'.repeat(filled)}${'-'.repeat(empty)} ${pct}%`;
}

// ─── ALERTS ──────────────────────────────────────────────────────────────────

function buildAlerts(stats7d, allTimeOrders, catalog) {
  const alerts = [];
  if (allTimeOrders === 0)
    alerts.push({ level: 'info', message: 'Pre-revenue phase — showing projected catalog margins' });
  if (stats7d.refunds > 0 && stats7d.revenue > 0 && (stats7d.refunds / stats7d.revenue) > 0.1)
    alerts.push({ level: 'critical', message: `High refund rate: ${Math.round((stats7d.refunds / stats7d.revenue) * 100)}% of revenue refunded this week` });
  if (catalog && catalog.avg_gross_margin_pct < 40)
    alerts.push({ level: 'warning', message: `Low avg catalog margin: ${catalog.avg_gross_margin_pct}% — review supplier pricing` });
  const progress = phase2Progress(allTimeOrders, stats7d.revenue);
  if (progress.orderPct >= 100 || progress.mrrPct >= 100)
    alerts.push({ level: 'info', message: 'Phase 2 milestone reached — activate C-Suite cluster' });
  return alerts;
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

async function writeReport(sb, kpis, alerts) {
  if (DRY_RUN) {
    console.log('\n[DRY_RUN] Would upsert to executive_reports (A15)');
    return;
  }
  const { error } = await sb.from('executive_reports').upsert({
    agent_id:    'A15',
    report_date: REPORT_DATE,
    report_type: 'daily',
    kpis,
    alerts,
    narrative:   null,
  }, { onConflict: 'agent_id,report_date,report_type' });
  if (error) throw new Error(`executive_reports upsert failed: ${error.message}`);
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

function buildFinancialHtml(stats7d, allTimeOrders, ilsRate, weekLabel) {
  const progress  = phase2Progress(allTimeOrders, stats7d.revenue);
  const ilsRevStr = ilsRate ? `₪${(stats7d.revenue * ilsRate).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
  const rateStr   = ilsRate ? ilsRate.toFixed(3) : 'N/A';
  const phase2Hit = progress.orderPct >= 100 || progress.mrrPct >= 100;

  return `<div style="font-family:monospace;max-width:700px;background:#0a0a0a;color:#f0ede6;padding:20px;border-radius:4px">
  <h2 style="color:#C9A84C;margin:0 0 4px">A15 CFO — Weekly Financial Report</h2>
  <p style="color:#9CA3AF;margin:0 0 20px;font-size:12px">${weekLabel}</p>

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px">Weekly Revenue — Last 7 Days</h3>
  <table style="width:100%;margin-bottom:8px">
    <tr><td style="color:#9CA3AF;width:200px">Orders</td>
        <td style="color:${stats7d.count > 0 ? '#4AAD80' : '#888'}">${stats7d.count}</td></tr>
    <tr><td style="color:#9CA3AF">Revenue (USD)</td>
        <td style="color:${stats7d.revenue > 0 ? '#4AAD80' : '#888'}">$${stats7d.revenue.toLocaleString()}</td></tr>
    <tr><td style="color:#9CA3AF">Revenue (ILS)</td><td>${ilsRevStr}</td></tr>
    <tr><td style="color:#9CA3AF">AOV</td><td>$${stats7d.aov}</td></tr>
    <tr><td style="color:#9CA3AF">Refunds</td>
        <td style="color:${stats7d.refunds > 0 ? '#c0392b' : '#888'}">$${stats7d.refunds}</td></tr>
    <tr><td style="color:#9CA3AF">USD/ILS Rate</td><td style="color:#9CA3AF">${rateStr}</td></tr>
  </table>

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Phase 2 Milestone Progress</h3>
  <p style="color:#9CA3AF;font-size:11px;margin:4px 0 8px">Trigger: 25 orders OR $1,000 estimated MRR</p>
  <table style="width:100%;margin-bottom:8px">
    <tr><td style="color:#9CA3AF;width:200px">All-time orders</td><td>${allTimeOrders} / ${PHASE2_ORDER_TRIGGER}</td></tr>
    <tr><td style="color:#9CA3AF">Orders progress</td>
        <td style="font-size:11px;color:#C9A84C;letter-spacing:0">${progressBar(progress.orderPct)}</td></tr>
    <tr><td style="color:#9CA3AF">Est. MRR (x4.33)</td><td>$${progress.estimatedMrr}</td></tr>
    <tr><td style="color:#9CA3AF">MRR progress</td>
        <td style="font-size:11px;color:#C9A84C;letter-spacing:0">${progressBar(progress.mrrPct)}</td></tr>
  </table>
  ${phase2Hit ? '<p style="color:#4AAD80;font-weight:bold">Phase 2 trigger reached — activate COO/CFO/CX cluster and confirm with Guy.</p>' : ''}

  <hr style="border-color:#333;margin:20px 0">
  <p style="color:#555;font-size:11px">SockAcademy A15 CFO Agent — ${weekLabel}</p>
</div>`;
}

async function sendReport(html, weekLabel) {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log('   [no GMAIL_APP_PASSWORD] skipping email');
    return;
  }
  if (DRY_RUN) {
    console.log('   [DRY_RUN] Would send CFO report email');
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: '"SockAcademy CFO" <sockacademy.store@gmail.com>',
    to:   ADMIN_EMAIL,
    subject: `A15 CFO Weekly Report — ${weekLabel}`,
    html,
  });
  console.log('   Email sent');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nA15 CFO — Weekly Financial Report');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN}`);
  console.log('─'.repeat(52));

  const supabase = getSupabase();
  console.log('Supabase connected');

  const weekLabel = new Date().toLocaleDateString('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });

  console.log('\nFetching financial data...');
  const [orders7d, allTimeOrders, ilsRate, catalog] = await Promise.all([
    fetchOrdersLastNDays(7),
    fetchAllTimeOrderCount(),
    fetchUsdIlsRate(),
    getCatalogMargins(supabase),
  ]);

  const stats    = calcOrderStats(orders7d);
  const progress = phase2Progress(allTimeOrders, stats.revenue);
  const phase2Hit = progress.orderPct >= 100 || progress.mrrPct >= 100;
  console.log(`   Last 7 days: ${stats.count} orders | $${stats.revenue} revenue`);
  console.log(`   All-time orders: ${allTimeOrders}`);
  console.log(`   USD/ILS: ${ilsRate || 'unavailable'}`);
  if (catalog) console.log(`   Catalog margins: avg ${catalog.avg_gross_margin_pct}% (${catalog.products_analyzed} products)`);
  if (allTimeOrders === 0) console.log('   [PRE-REVENUE MODE] Reporting projected catalog metrics');

  // Write LAUNCH_MODE when Phase 2 is hit
  if (phase2Hit) {
    console.log('   *** Phase 2 milestone REACHED ***');
    if (!DRY_RUN) {
      try {
        await supabase.from('system_config')
          .upsert({ key: 'LAUNCH_MODE', value: 'true' }, { onConflict: 'key' });
        console.log('   system_config.LAUNCH_MODE → true');
      } catch (e) { console.error('   system_config write failed:', e.message); }
    } else {
      console.log('   [DRY_RUN] Would set system_config.LAUNCH_MODE = true');
    }
  }

  const alerts = buildAlerts(stats, allTimeOrders, catalog);
  const kpis   = { stats7d: stats, allTimeOrders, ilsRate, catalog, phase2Progress: progress };

  if (alerts.length > 0) {
    console.log(`\n⚠️  ${alerts.length} alert(s):`);
    alerts.forEach(a => console.log(`   [${a.level.toUpperCase()}] ${a.message}`));
  }

  await writeReport(supabase, kpis, alerts);
  const html = buildFinancialHtml(stats, allTimeOrders, ilsRate, weekLabel);
  await sendReport(html, weekLabel);
  await logHealth(supabase, 'success', {
    orders7d:         stats.count,
    revenue7d:        stats.revenue,
    allTimeOrders,
    phase2_triggered: phase2Hit,
    alerts:           alerts.length,
  });

  console.log('\n' + '─'.repeat(52));
  console.log('✅ A15 CFO complete');
}

main().catch(async err => {
  console.error('\nA15 fatal:', err.message);
  try {
    const sb = getSupabase();
    await logHealth(sb, 'failure', { error: err.message });
  } catch (_) {}
  process.exit(1);
});
