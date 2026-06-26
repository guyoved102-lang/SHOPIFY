/**
 * A13 — Global Competitive Intelligence Agent v1.0
 * Weekly deep scan + Strike Alert mode
 * Extensible MARKETS array: flip active:true to expand globally
 */

'use strict';
require('dotenv').config({ path: '../../.env' });

const https   = require('https');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, errorMessage = '', metadata = {}) {
  try {
    const run_status = status.toLowerCase() === 'failed' ? 'failure' : status.toLowerCase();
    await supabase.from('agent_health_log').insert({
      agent_id:      'A13',
      agent_name:    'Competitive Intel',
      run_status,
      error_message: errorMessage || null,
      metadata,
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}

async function getRecentHighOpportunities(supabase) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data } = await supabase
      .from('competitor_intel')
      .select('competitor, market')
      .eq('opportunity', 'HIGH')
      .gte('run_date', sevenDaysAgo);
    return new Set((data || []).map(r => `${r.competitor}|${r.market}`));
  } catch { return new Set(); }
}

async function sendErrorAlert(errorMessage) {
  if (!process.env.GMAIL_APP_PASSWORD) return;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: '"SockAcademy Agents" <sockacademy.store@gmail.com>',
    to: 'guyoved102@gmail.com',
    subject: '🚨 A13 Competitive Intel FAILED — action needed',
    html: `<div style="font-family:monospace"><h2>🚨 A13 Failed</h2><p><strong>Time:</strong> ${new Date().toISOString()}</p><pre style="background:#f5f5f5;padding:12px;border-radius:4px">${errorMessage}</pre></div>`,
  }).catch(e => console.error('Alert email failed:', e.message));
}

// ─── LAUNCH_MODE Gate — protocol #27 ────────────────────────────────────────
if (process.env.LAUNCH_MODE !== 'true') {
  console.log('[A13] LAUNCH_MODE not active — exiting without API calls.');
  process.exit(0);
}

// ─── Startup Guards ──────────────────────────────────────────────────────────
const REQUIRED = ['PERPLEXITY_API_KEY', 'ANTHROPIC_API_KEY', 'GMAIL_APP_PASSWORD',
                  'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing env vars:', missing.join(', '));
  process.exit(1);
}

// ─── Config ──────────────────────────────────────────────────────────────────
const STRIKE_MODE  = process.argv.includes('--strike');
const DRY_RUN      = process.argv.includes('--dry-run');
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';

const MARKETS = [
  { code: 'US', lang: 'en', currency: 'USD', symbol: '$',  active: true  },
  { code: 'IL', lang: 'he', currency: 'ILS', symbol: '₪',  active: true  },
  { code: 'DE', lang: 'de', currency: 'EUR', symbol: '€',  active: false },
  { code: 'UK', lang: 'en', currency: 'GBP', symbol: '£',  active: false },
  { code: 'AU', lang: 'en', currency: 'AUD', symbol: 'A$', active: false },
];

const COMPETITORS = [
  // ── Tier 1: Active deep scan ──────────────────────────────────────────────
  {
    tier: 1, name: 'Bombas', url: 'bombas.com',
    category: 'comfort-premium', priceAnchor: { min: 14, max: 24 },
    knownWeakness: 'limited styles, high price floor',
  },
  {
    tier: 1, name: 'Darn Tough', url: 'darntough.com',
    category: 'merino-outdoor', priceAnchor: { min: 19, max: 34 },
    knownWeakness: 'conservative design, niche outdoor audience',
  },
  {
    tier: 1, name: 'Stance', url: 'stance.com',
    category: 'lifestyle', priceAnchor: { min: 16, max: 30 },
    knownWeakness: 'declining premium perception, streetwear dependency',
  },
  {
    tier: 1, name: 'Happy Socks', url: 'happysocks.com',
    category: 'fashion-colorful', priceAnchor: { min: 12, max: 22 },
    knownWeakness: 'not serious premium, Gen-Z focus limits AOV',
  },
  // ── Tier 2: Monitored only (weekly surface scan) ──────────────────────────
  {
    tier: 2, name: 'Falke', url: 'falke.com',
    category: 'luxury-heritage', priceAnchor: { min: 25, max: 80 },
    knownWeakness: 'weak US e-commerce presence',
  },
  {
    tier: 2, name: 'Pantherella', url: 'pantherella.com',
    category: 'ultra-luxury', priceAnchor: { min: 30, max: 120 },
    knownWeakness: 'low brand awareness outside UK',
  },
  {
    tier: 2, name: 'Bresciani', url: 'bresciani1970.com',
    category: 'bespoke-italian', priceAnchor: { min: 40, max: 120 },
    knownWeakness: 'no US distribution, Italian-only content',
  },
];

// ─── Perplexity Intelligence Query ───────────────────────────────────────────
function buildIntelPrompt(competitor, market, mode) {
  const priceRef = `${market.symbol}${competitor.priceAnchor.min}–${market.symbol}${competitor.priceAnchor.max}`;

  if (mode === 'strike') {
    return `You are a ruthless competitive intelligence analyst for SockAcademy.
TASK: Quick strike scan of ${competitor.name} (${competitor.url}) for market ${market.code}.
Focus ONLY on:
1. Any price drops in the last 72 hours?
2. Any out-of-stock signals on key products?
3. Any flash sales or limited promotions active right now?
STRIKE_OPPORTUNITY: [HIGH/MEDIUM/LOW/NONE]
ACTION: [one specific action SockAcademy should take immediately, or NONE]
Be precise. No fluff.`;
  }

  return `You are a ruthless competitive intelligence analyst for SockAcademy — a premium global sock brand.
TARGET: ${competitor.name} | Website: ${competitor.url} | Market: ${market.code} | Language: ${market.lang}

DEEP SCAN — extract the following:

1. CURRENT PRICING (in ${market.currency})
   - Entry price, mid price, premium price
   - Reference: their previous range was approximately ${priceRef}
   - Any price changes detected vs historical?

2. PRODUCT SIGNALS
   - New product launches in the last 30 days? List them.
   - Out-of-stock on popular SKUs? Which categories?

3. CAMPAIGN INTELLIGENCE
   - Active promotions, discount codes, bundle offers?
   - Recent ad messaging or brand positioning shifts?
   - Any influencer partnerships or PR mentions this month?

4. KNOWN WEAKNESS ASSESSMENT
   - Their known weakness: "${competitor.knownWeakness}"
   - Is this weakness currently exploitable? How?

5. SOCKACADEMY STRIKE ASSESSMENT
   OPPORTUNITY_LEVEL: [HIGH / MEDIUM / LOW]
   RECOMMENDED_ACTION: [specific tactical move SockAcademy should execute NOW]
   URGENCY: [immediate / this-week / monitor]
   ESTIMATED_REVENUE_IMPACT: [high / medium / low]

Be a shark in a luxury suit. Facts only. Actionable intelligence.`;
}

async function queryPerplexity(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: 'You are a precise competitive intelligence analyst. Return structured, factual analysis.' },
        { role: 'user',   content: prompt },
      ],
      max_tokens: 1024,
      temperature: 0.2,
      search_recency_filter: 'week',
    });

    const req = https.request({
      hostname: 'api.perplexity.ai',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.choices?.[0]?.message?.content || '');
        } catch { reject(new Error('Perplexity parse error')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Claude Strike Extractor ──────────────────────────────────────────────────
async function extractStructuredIntel(rawIntel, competitor, market) {
  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Extract structured data from this competitive intelligence report.
Return ONLY valid JSON, no markdown, no explanation.

Report:
${rawIntel}

Required JSON format:
{
  "priceMin": number_or_null,
  "priceMax": number_or_null,
  "newProducts": true_or_false,
  "outOfStock": true_or_false,
  "activePromo": true_or_false,
  "promoDetail": "string_or_empty",
  "opportunityLevel": "HIGH|MEDIUM|LOW|NONE",
  "recommendedAction": "string",
  "urgency": "immediate|this-week|monitor",
  "summary": "1-2 sentence summary"
}`,
    }],
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.content?.[0]?.text || '{}';
          resolve(JSON.parse(text));
        } catch {
          resolve({
            priceMin: null, priceMax: null, newProducts: false,
            outOfStock: false, activePromo: false, promoDetail: '',
            opportunityLevel: 'LOW', recommendedAction: 'Monitor',
            urgency: 'monitor', summary: rawIntel.slice(0, 200),
          });
        }
      });
    });
    req.on('error', () => resolve({}));
    req.write(body);
    req.end();
  });
}

// ─── Supabase Logging ─────────────────────────────────────────────────────────
async function logToSupabase(rows) {
  if (!rows.length) return;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const records = rows.map(r => ({
    run_date:    r[0],
    mode:        r[1],
    market:      r[2],
    tier:        r[3],
    competitor:  r[4],
    category:    r[5],
    price_min:   r[6] !== '' ? parseFloat(r[6]) : null,
    price_max:   r[7] !== '' ? parseFloat(r[7]) : null,
    new_products: r[8],
    out_of_stock: r[9] === 'Yes',
    active_promo: r[10] === 'Yes',
    promo_detail: r[11],
    opportunity:  r[12],
    action:       r[13],
    urgency:      r[14],
    summary:      r[15],
  }));
  const { error } = await supabase.from('competitor_intel').insert(records);
  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  console.log(`  📊 Logged ${records.length} rows → Supabase competitor_intel`);
}

// ─── Email Report ─────────────────────────────────────────────────────────────
function buildEmailHtml(results, mode, runDate, newStrikeKeys = new Set()) {
  const strikes = results.filter(r => r.intel?.opportunityLevel === 'HIGH');
  const modeLabel = mode === 'strike' ? '⚡ Strike Alert' : '📡 Weekly Deep Scan';

  const rows = results.map(r => {
    const opp = r.intel?.opportunityLevel || 'LOW';
    const color = opp === 'HIGH' ? '#4AAD80' : opp === 'MEDIUM' ? '#C9A84C' : '#888';
    const oos  = r.intel?.outOfStock  ? '🔴 YES' : '✅ No';
    const promo = r.intel?.activePromo ? `🎯 ${r.intel.promoDetail || 'Active'}` : '—';
    const isNewHigh = opp === 'HIGH' && newStrikeKeys.has(`${r.competitor.name}|${r.market.code}`);
    const oppLabel = opp === 'HIGH'
      ? `${opp} ${isNewHigh ? '🆕' : '↩'}`
      : opp;
    return `
      <tr style="border-bottom:1px solid #1a1a1a">
        <td style="padding:10px;color:#F0EDE6;font-weight:600">${r.competitor.name}</td>
        <td style="padding:10px;color:#aaa">${r.market.code}</td>
        <td style="padding:10px;color:#F0EDE6">${r.competitor.tier === 1 ? 'T1' : 'T2'}</td>
        <td style="padding:10px;color:#C9A84C">${r.intel?.priceMin ? `${r.market.symbol}${r.intel.priceMin}–${r.market.symbol}${r.intel.priceMax}` : '—'}</td>
        <td style="padding:10px;color:#F0EDE6">${oos}</td>
        <td style="padding:10px;color:#F0EDE6">${promo}</td>
        <td style="padding:10px">
          <span style="background:${color};color:#0A0A0A;padding:3px 8px;border-radius:4px;font-weight:700;font-size:12px">${oppLabel}</span>
        </td>
        <td style="padding:10px;color:#F0EDE6;font-size:12px">${r.intel?.recommendedAction || '—'}</td>
      </tr>`;
  }).join('');

  const strikeBlock = strikes.length ? `
    <div style="background:#1a0a0a;border:1px solid #F96E6E;border-radius:8px;padding:20px;margin-bottom:24px">
      <h2 style="color:#F96E6E;margin:0 0 12px">🚨 ${strikes.length} STRIKE OPPORTUNIT${strikes.length > 1 ? 'IES' : 'Y'} DETECTED</h2>
      ${strikes.map(s => `
        <div style="margin-bottom:12px;padding:12px;background:#0A0A0A;border-radius:6px">
          <strong style="color:#C9A84C">${s.competitor.name} / ${s.market.code}</strong>
          <p style="color:#F0EDE6;margin:6px 0 0;font-size:14px">⚡ ${s.intel?.recommendedAction}</p>
          <p style="color:#888;font-size:12px;margin:4px 0 0">Urgency: ${s.intel?.urgency?.toUpperCase()}</p>
        </div>`).join('')}
    </div>` : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Rubik',sans-serif">
<div style="max-width:900px;margin:0 auto;padding:32px">
  <div style="border-bottom:2px solid #C9A84C;padding-bottom:16px;margin-bottom:24px">
    <h1 style="color:#C9A84C;margin:0;font-size:22px">SockAcademy — A13 ${modeLabel}</h1>
    <p style="color:#888;margin:4px 0 0;font-size:13px">${runDate} | Active Markets: US, IL | Global Storefront</p>
  </div>
  ${strikeBlock}
  <table style="width:100%;border-collapse:collapse;background:#111">
    <thead>
      <tr style="background:#1a1a1a">
        <th style="padding:10px;color:#C9A84C;text-align:left">Competitor</th>
        <th style="padding:10px;color:#C9A84C;text-align:left">Market</th>
        <th style="padding:10px;color:#C9A84C;text-align:left">Tier</th>
        <th style="padding:10px;color:#C9A84C;text-align:left">Prices</th>
        <th style="padding:10px;color:#C9A84C;text-align:left">OOS?</th>
        <th style="padding:10px;color:#C9A84C;text-align:left">Promo</th>
        <th style="padding:10px;color:#C9A84C;text-align:left">Opportunity</th>
        <th style="padding:10px;color:#C9A84C;text-align:left">Action</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="color:#333;font-size:11px;margin-top:24px;text-align:center">SockAcademy Intelligence Division — A13 v1.0</p>
</div>
</body></html>`;
}

async function sendEmail(html, mode, strikeCount) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });
  const subject = mode === 'strike'
    ? `⚡ A13 Strike Alert — ${strikeCount} High Opportunity${strikeCount !== 1 ? 's' : ''} Detected`
    : `📡 A13 Weekly Intel — Competitor Report ${new Date().toLocaleDateString('en-IL')}`;

  await transporter.sendMail({
    from: '"SockAcademy A13" <sockacademy.store@gmail.com>',
    to: ADMIN_EMAIL,
    subject,
    html,
  });
  console.log('  ✉️  Email sent →', ADMIN_EMAIL);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  const mode    = STRIKE_MODE ? 'strike' : 'deep';
  const runDate = new Date().toISOString().split('T')[0];
  console.log(`\n🕵️  A13 Competitive Intelligence — ${mode.toUpperCase()} mode | ${runDate}`);
  if (DRY_RUN) console.log('  [DRY RUN — no Sheets/email writes]');

  const supabase = getSupabase();
  await logHealth(supabase, 'RUNNING');

  const activeMarkets = MARKETS.filter(m => m.active);
  // Strike mode: Tier 1 only. Deep mode: all tiers.
  const targetCompetitors = STRIKE_MODE
    ? COMPETITORS.filter(c => c.tier === 1)
    : COMPETITORS;

  const results = [];
  const sheetRows = [];

  for (const market of activeMarkets) {
    console.log(`\n  🌍 Market: ${market.code} (${market.currency})`);

    for (const competitor of targetCompetitors) {
      console.log(`    🔍 Scanning ${competitor.name} [Tier ${competitor.tier}]...`);
      try {
        const prompt  = buildIntelPrompt(competitor, market, mode);
        const rawIntel = DRY_RUN
          ? `DRY RUN: ${competitor.name} in ${market.code} — mock intelligence data. OPPORTUNITY_LEVEL: LOW`
          : await queryPerplexity(prompt);

        const intel = await extractStructuredIntel(rawIntel, competitor, market);
        results.push({ competitor, market, intel, rawIntel });

        const opp = intel.opportunityLevel || 'LOW';
        const icon = opp === 'HIGH' ? '🔴' : opp === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`    ${icon} ${competitor.name}/${market.code} → ${opp} | ${intel.urgency || 'monitor'}`);

        sheetRows.push([
          runDate, mode, market.code, competitor.tier, competitor.name, competitor.category,
          intel.priceMin ?? '', intel.priceMax ?? '',
          intel.newProducts ? 'Yes' : 'No',
          intel.outOfStock  ? 'Yes' : 'No',
          intel.activePromo ? 'Yes' : 'No',
          intel.promoDetail || '',
          intel.opportunityLevel || 'LOW',
          intel.recommendedAction || '',
          intel.urgency || 'monitor',
          intel.summary || '',
        ]);

        // Rate limit
        if (!DRY_RUN) await new Promise(r => setTimeout(r, 1500));

      } catch (err) {
        console.error(`    ❌ ${competitor.name}/${market.code}:`, err.message);
      }
    }
  }

  const strikes = results.filter(r => r.intel?.opportunityLevel === 'HIGH');
  console.log(`\n  📊 Scan complete: ${results.length} intelligence reports | ${strikes.length} HIGH opportunities`);

  // Gap 3: deduplication — classify new vs ongoing to prevent alert fatigue
  const recentHighs = DRY_RUN ? new Set() : await getRecentHighOpportunities(supabase);
  const newStrikes     = strikes.filter(r => !recentHighs.has(`${r.competitor.name}|${r.market.code}`));
  const ongoingStrikes = strikes.filter(r =>  recentHighs.has(`${r.competitor.name}|${r.market.code}`));
  const newStrikeKeys  = new Set(newStrikes.map(r => `${r.competitor.name}|${r.market.code}`));

  if (newStrikes.length)     console.log(`  🆕 New opportunities: ${newStrikes.map(s => `${s.competitor.name}/${s.market.code}`).join(', ')}`);
  if (ongoingStrikes.length) console.log(`  ↩  Ongoing (already alerted this week): ${ongoingStrikes.map(s => `${s.competitor.name}/${s.market.code}`).join(', ')}`);

  // Skip email in strike mode if no NEW HIGH opportunities
  if (STRIKE_MODE && newStrikes.length === 0) {
    console.log(`  ✅ No new strikes — ${ongoingStrikes.length} ongoing already alerted this week.`);
    if (!DRY_RUN) {
      await logToSupabase(sheetRows);
      await logHealth(supabase, 'SUCCESS', '', { mode, results: results.length, newStrikes: 0, ongoingStrikes: ongoingStrikes.length });
    }
    return;
  }

  const html = buildEmailHtml(results, mode, runDate, newStrikeKeys);

  if (!DRY_RUN) {
    await logToSupabase(sheetRows);
    await sendEmail(html, mode, newStrikes.length);
  } else {
    console.log('  [DRY RUN] Would have logged', sheetRows.length, 'rows and sent email');
  }

  await logHealth(supabase, 'SUCCESS', '', { mode, results: results.length, newStrikes: newStrikes.length, ongoingStrikes: ongoingStrikes.length });
  console.log('\n✅ A13 complete.\n');
}

run().catch(async err => {
  console.error('❌ A13 fatal:', err);
  try {
    const sb = getSupabase();
    await logHealth(sb, 'ERROR', err.message);
    await sendErrorAlert(err.message);
  } catch (_) {}
  process.exit(1);
});
