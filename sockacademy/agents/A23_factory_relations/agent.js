/**
 * A23 — Factory Relations Agent
 *
 * Runs monthly on the 1st at 09:00 UTC.
 * Reads:  Supabase products table → extract active product categories
 *         Perplexity API → research private label factories per category
 * Writes: factory_reports (one row per factory found)
 *         executive_reports (agent_id='A23', report_type='monthly')
 * Sends:  monthly factory intelligence email to Guy
 *
 * Pre-revenue behavior: runs fully, researches factories for current product
 * categories. Builds private label pipeline ahead of revenue milestone.
 * When $5K MRR × 2 months is reached, Guy already has factory candidates ready.
 *
 * Note: Higgsfield creative generation is gated behind Guy providing a
 * reference photo (Iron Law). A23 does not call Higgsfield autonomously.
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const Anthropic        = require('@anthropic-ai/sdk');
const nodemailer       = require('nodemailer');
const { withRetry }    = require('../../corp/core/anthropic-retry.js');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');
const { writeMetrics } = require('../../corp/core/metrics.js');

const DRY_RUN     = process.env.DRY_RUN === 'true';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';
const REPORT_DATE = new Date().toISOString().split('T')[0];

// ─── SUPABASE ────────────────────────────────────────────────────────────────

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

async function getActiveCategories(sb) {
  const { data, error } = await sb
    .from('products')
    .select('category')
    .not('category', 'is', null);
  if (error) throw new Error(`products query failed: ${error.message}`);

  const counts = {};
  for (const row of data || []) {
    const cat = (row.category || '').trim();
    if (cat) counts[cat] = (counts[cat] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat]) => cat);
}

// ─── PERPLEXITY FACTORY RESEARCH ─────────────────────────────────────────────

async function researchFactoriesForCategory(category) {
  if (!process.env.PERPLEXITY_API_KEY) {
    console.warn(`⚠️  PERPLEXITY_API_KEY not set — skipping factory research for "${category}"`);
    return [];
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{
        role:    'system',
        content: 'You are a sourcing analyst for a premium sock brand. Return ONLY valid JSON — no markdown, no explanation.',
      }, {
        role:    'user',
        content: `Research private label sock manufacturers specializing in "${category}" socks. Focus on factories suitable for a premium brand ($25–$65 retail). Return a JSON array of up to 3 factories, each with:
{
  "factory_name": string,
  "factory_location": string (city, country),
  "moq": number (minimum order quantity in pairs),
  "cost_per_unit_usd": number (estimated cost per pair in USD),
  "lead_time_days": number,
  "quality_score": number (0-100, based on known reputation, certifications),
  "certifications": [string] (e.g. "OEKO-TEX", "ISO 9001", "BSCI"),
  "contact_info": string (general contact info or website if known),
  "source_notes": string (brief rationale, why suitable for premium brand)
}
Return only the JSON array. No other text.`,
      }],
      max_tokens:   800,
      temperature:  0.2,
      return_citations: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`⚠️  Perplexity API error for "${category}": ${res.status} — ${err.slice(0, 200)}`);
    return [];
  }

  const data    = await res.json();
  const content = data.choices?.[0]?.message?.content || '[]';

  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed  = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn(`⚠️  Could not parse Perplexity response for "${category}": ${e.message}`);
    return [];
  }
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

async function writeFactoryReports(sb, reports) {
  if (DRY_RUN) {
    console.log(`\n[DRY_RUN] Would insert ${reports.length} rows to factory_reports`);
    reports.forEach(r => console.log(`   ${r.factory_name} (${r.factory_location}) — MOQ ${r.moq} | $${r.cost_per_unit_usd}/pair`));
    return;
  }
  for (const r of reports) {
    const { error } = await sb.from('factory_reports').insert({
      factory_name:       r.factory_name,
      factory_location:   r.factory_location,
      product_category:   r.product_category,
      moq:                r.moq,
      cost_per_unit_usd:  r.cost_per_unit_usd,
      lead_time_days:     r.lead_time_days,
      quality_score:      r.quality_score,
      certifications:     r.certifications || [],
      contact_info:       r.contact_info,
      source_notes:       r.source_notes,
      report_date:        REPORT_DATE,
    });
    if (error) console.warn(`⚠️  factory_reports insert failed (${r.factory_name}): ${error.message}`);
  }
}

async function writeExecutiveReport(sb, summary, alerts, narrative) {
  if (DRY_RUN) {
    console.log('\n[DRY_RUN] Would upsert executive_reports (A23)');
    return;
  }
  const { error } = await sb.from('executive_reports').upsert({
    agent_id:    'A23',
    report_date: REPORT_DATE,
    report_type: 'monthly',
    kpis:        summary,
    alerts,
    narrative,
  }, { onConflict: 'agent_id,report_date,report_type' });
  if (error) throw new Error(`executive_reports upsert failed: ${error.message}`);
}

async function logHealth(sb, status, meta = {}) {
  if (DRY_RUN) return;
  const { error } = await sb.from('agent_health_log').insert({
    agent_id:        'A23',
    agent_name:      'Factory Relations',
    run_status:      status,
    items_processed: meta.factories_found || 0,
    metadata:        meta,
  });
  if (error) console.error(`⚠️  Health log failed: ${error.message}`);
}

// ─── NARRATIVE ───────────────────────────────────────────────────────────────

async function generateNarrative(summary) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt =
    `אתה מנהל Factory Relations ב-SockAcademy — מותג גרביים פרמיום הבונה לקראת ` +
    `ייצור Private Label.\n` +
    `כתוב בעברית עסקית ומקצועית ברמה גבוהה סקירה חודשית קצרה (2 משפטים) למנכ"ל על ` +
    `התקדמות איתור מפעלים. כלול צעד פעולה מומלץ אחד.\n\n` +
    `נתונים:\n${JSON.stringify(summary)}`;

  const msg = await withRetry(() => client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  }), 'A23');
  return msg.content[0].text.trim();
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

async function sendEmail(allReports, summary, narrative) {
  if (!process.env.GMAIL_APP_PASSWORD) return;
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would send A23 Factory Relations email to ${ADMIN_EMAIL}`);
    return;
  }

  const topFactories = allReports
    .sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
    .slice(0, 6);

  const factoryRows = topFactories.map(f => `
    <tr style="border-bottom:1px solid #1a1a1a">
      <td style="padding:8px;color:#f0ede6">${f.factory_name}<br><span style="color:#9CA3AF;font-size:11px">${f.factory_location}</span></td>
      <td style="padding:8px;color:#9CA3AF;font-size:11px">${f.product_category}</td>
      <td style="padding:8px;text-align:center">${f.moq || 'N/A'}</td>
      <td style="padding:8px;text-align:center">${f.cost_per_unit_usd ? `$${f.cost_per_unit_usd}` : 'N/A'}</td>
      <td style="padding:8px;text-align:center">${f.lead_time_days ? `${f.lead_time_days}d` : 'N/A'}</td>
      <td style="padding:8px;text-align:center;color:${(f.quality_score || 0) >= 80 ? '#4AAD80' : '#d97706'}">${f.quality_score || 'N/A'}</td>
    </tr>`).join('');

  const html = `
<div style="font-family:monospace;max-width:700px;background:#0a0a0a;color:#f0ede6;padding:20px;border-radius:4px">
  <h2 style="color:#C9A84C;margin:0 0 4px">A23 — Factory Relations</h2>
  <p style="color:#9CA3AF;margin:0 0 4px;font-size:12px">Monthly Private Label Intelligence — ${REPORT_DATE}</p>
  <p style="color:#555;font-size:11px;margin:0 0 20px">Phase 3B: Private label activation at $5K MRR × 2 months</p>

  ${narrative ? `<blockquote style="border-left:3px solid #C9A84C;padding:8px 16px;margin:0 0 20px;background:#111;color:#f0ede6;font-style:italic">${narrative}</blockquote>` : ''}

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px">Monthly Summary</h3>
  <table style="width:100%;margin-bottom:16px">
    <tr><td style="color:#9CA3AF;width:220px">Categories researched</td><td>${summary.categories_researched}</td></tr>
    <tr><td style="color:#9CA3AF">Factories identified</td><td style="color:#4AAD80">${summary.factories_found}</td></tr>
    <tr><td style="color:#9CA3AF">Avg quality score</td><td>${summary.avg_quality_score || 'N/A'}</td></tr>
    <tr><td style="color:#9CA3AF">Best MOQ found</td><td>${summary.best_moq ? `${summary.best_moq} pairs` : 'N/A'}</td></tr>
    <tr><td style="color:#9CA3AF">Lowest cost/pair</td><td>${summary.lowest_cost_per_unit ? `$${summary.lowest_cost_per_unit}` : 'N/A'}</td></tr>
  </table>

  ${topFactories.length > 0 ? `
  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Top Factory Candidates</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr style="background:#1a1a1a">
      <th style="padding:6px 8px;text-align:left;color:#9CA3AF;font-size:11px">Factory</th>
      <th style="padding:6px 8px;text-align:left;color:#9CA3AF;font-size:11px">Category</th>
      <th style="padding:6px 8px;text-align:center;color:#9CA3AF;font-size:11px">MOQ</th>
      <th style="padding:6px 8px;text-align:center;color:#9CA3AF;font-size:11px">Cost/pair</th>
      <th style="padding:6px 8px;text-align:center;color:#9CA3AF;font-size:11px">Lead</th>
      <th style="padding:6px 8px;text-align:center;color:#9CA3AF;font-size:11px">Score</th>
    </tr>
    ${factoryRows}
  </table>` : '<p style="color:#9CA3AF">No factory data retrieved this cycle.</p>'}

  <p style="color:#9CA3AF;font-size:11px;margin-top:16px">
    Next step: When Phase 3B activates, request samples from top 2 factories per category.
    Higgsfield product visuals require a reference photo from Guy before generation.
  </p>

  <hr style="border-color:#333;margin:20px 0">
  <p style="color:#555;font-size:11px">SockAcademy A23 Factory Relations — ${REPORT_DATE}</p>
</div>`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from:    '"SockAcademy Factory Relations" <sockacademy.store@gmail.com>',
    to:      ADMIN_EMAIL,
    subject: `A23 Factory Relations — ${REPORT_DATE} | ${summary.factories_found} factories identified across ${summary.categories_researched} categories`,
    html,
  });
  console.log('📧 Factory Relations monthly digest sent');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.LAUNCH_MODE !== 'true') {
    console.log('[A23] DORMANT — set LAUNCH_MODE=true to activate. No API calls made.');
    process.exit(0);
  }

  console.log('\n🏭 A23 — Factory Relations Agent');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN}`);
  console.log('─'.repeat(52));

  const sb = getSupabase();
  console.log('✅ Supabase connected');

  let categories;
  try {
    categories = await getActiveCategories(sb);
  } catch (e) {
    await logHealth(sb, 'failure', { error: e.message });
    throw e;
  }

  if (categories.length === 0) {
    categories = ['Premium Merino Wool Socks', 'Dress Socks', 'Athletic Performance Socks'];
    console.log(`ℹ️  No categories in DB — using defaults: ${categories.join(', ')}`);
  } else {
    console.log(`📦 Categories from Supabase: ${categories.join(', ')}`);
  }

  const allReports = [];
  for (const cat of categories) {
    console.log(`\n🔍 Researching factories for: ${cat}`);
    const factories = await researchFactoriesForCategory(cat);
    console.log(`   Found ${factories.length} factory candidate(s)`);
    for (const f of factories) {
      allReports.push({ ...f, product_category: cat });
    }
    await new Promise(r => setTimeout(r, 1200));
  }

  const scores     = allReports.map(r => r.quality_score || 0).filter(s => s > 0);
  const moqs       = allReports.map(r => r.moq || 0).filter(m => m > 0);
  const costs      = allReports.map(r => r.cost_per_unit_usd || 0).filter(c => c > 0);

  const summary = {
    categories_researched: categories.length,
    factories_found:       allReports.length,
    avg_quality_score:     scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : null,
    best_moq:              moqs.length > 0 ? Math.min(...moqs) : null,
    lowest_cost_per_unit:  costs.length > 0 ? Math.min(...costs) : null,
    categories,
  };

  console.log(`\n📊 Summary: ${summary.factories_found} factories | avg score ${summary.avg_quality_score} | best MOQ ${summary.best_moq}`);

  const narrative = await generateNarrative(summary);
  if (narrative) console.log(`\n📝 ${narrative}`);

  const alerts = summary.factories_found === 0
    ? [{ level: 'warning', message: 'No factory candidates retrieved — check PERPLEXITY_API_KEY and retry' }]
    : [];

  await writeFactoryReports(sb, allReports);
  await writeExecutiveReport(sb, summary, alerts, narrative);
  await sendEmail(allReports, summary, narrative);

  // Command Center KPIs — feeds A0's unified daily brief
  if (!DRY_RUN) {
    await writeMetrics(sb, 'A23', REPORT_DATE, [
      { name: 'factories_found',         value: summary.factories_found,               unit: 'count' },
      { name: 'categories_researched',   value: summary.categories_researched,         unit: 'count' },
      { name: 'avg_factory_quality',     value: summary.avg_quality_score ?? 0,        unit: 'count' },
    ]);
  }

  await logHealth(sb, 'success', { factories_found: allReports.length, categories_researched: categories.length });

  console.log('\n' + '─'.repeat(52));
  console.log('✅ A23 Factory Relations complete');
}

main().catch(async e => {
  console.error('\n❌ A23 fatal:', e.message);
  try {
    const sb = getSupabase();
    await logHealth(sb, 'failure', { error: e.message });
  } catch (_) {}
  await notifyTelegram(heTelegramMsg('A23 Factory Relations', '🚨 כשל קריטי!',
    `ה-agent נכשל בהרצה. נדרשת בדיקה דחופה.\nשגיאה: <code>${e.message}</code>`));
  process.exit(1);
});
