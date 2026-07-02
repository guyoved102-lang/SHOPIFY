/**
 * A4 — Meta Ads Agent v1.0
 * יוצר קופי למודעות עם Claude → מריץ/מנטר קמפיינים Meta (Facebook + Instagram)
 * מצב נוכחי: DRY-RUN (אין META_ACCESS_TOKEN = רק מייצר קופי ומדווח)
 * להפעיל: הוסף META_ACCESS_TOKEN + META_AD_ACCOUNT_ID ל-.env
 */

require('dotenv').config({ path: '../../.env' });
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, errorMsg = '', metadata = {}) {
  if (!supabase) return;
  try {
    const run_status = status === 'failed' ? 'failure' : status;
    await supabase.from('agent_health_log').insert({
      agent_id:      'A4',
      agent_name:    'Meta Ads',
      run_status,
      error_message: errorMsg || null,
      metadata,
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}
const nodemailer = require('nodemailer');
const { withRetry } = require('../../corp/core/anthropic-retry.js');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const META_API_VERSION = 'v20.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
const strip = s => (s || '').replace(/^﻿/, '').trim();
const AD_ACCOUNT_ID = strip(process.env.META_AD_ACCOUNT_ID); // act_XXXXXXXXXXXXXXX
const ACCESS_TOKEN = strip(process.env.META_ACCESS_TOKEN);
const PAGE_ID = strip(process.env.META_PAGE_ID);

const DRY_RUN = !ACCESS_TOKEN || !AD_ACCOUNT_ID;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// קמפיינים — מבנה SockAcademy
// 3 שלבי פאנל: Awareness → Interest → Conversion
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CAMPAIGNS = [
  {
    id: 'awareness',
    name: 'SA — Awareness — Premium Socks',
    objective: 'OUTCOME_AWARENESS',
    dailyBudget: 500, // $5/day (בסנט)
    audience: 'Cold — Men 25-45, interests: fashion, luxury goods, running, hiking',
    format: 'image',
    goal: 'להכיר את המותג — לא למכור עדיין',
  },
  {
    id: 'traffic',
    name: 'SA — Traffic — Product Pages',
    objective: 'OUTCOME_TRAFFIC',
    dailyBudget: 700, // $7/day
    audience: 'Warm — engaged with awareness ads, visited sockacademy.store',
    format: 'carousel',
    goal: 'להביא טראפיק לדפי מוצר',
  },
  {
    id: 'conversion',
    name: 'SA — Conversion — Purchase',
    objective: 'OUTCOME_SALES',
    dailyBudget: 1000, // $10/day
    audience: 'Hot — added to cart, visited 3+ times, retargeting',
    format: 'video',
    goal: 'רכישה — ROAS מינימלי 2.5',
    minROAS: 2.5,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLAUDE — יצירת קופי למודעות
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function generateAdCopy(campaign, product) {
  const msg = await withRetry(() => anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You are writing Meta ad copy for SockAcademy — the world's first dedicated sock authority. Premium socks for men, $18–$85. Think: Tom Ford's restraint meets Patagonia's conviction.

Campaign goal: ${campaign.goal}
Format: ${campaign.format} ad
Product: ${product.name} ($${product.price})
Audience: ${campaign.audience}

BRAND VOICE — non-negotiable:
- No exclamation marks. Ever.
- No superlatives: no "best", "ultimate", "perfect", "amazing", "incredible"
- No parallel list structures ("X for Y, Z for A") — they read as AI
- Authoritative but not arrogant — the expert who has worn everything and chose this

HUMANIZER RULES — apply to every line:
- Vary sentence length dramatically. Short impact. Then a longer, deliberate observation that earns its length. Then short again.
- Use em dashes (—) for natural pauses, not commas: "The difference — and it's measurable — starts at fiber density"
- Include ONE specific tactile or sensory detail per ad: weight, texture, temperature, compression feel
- Write to ONE specific man. Not a demographic. Not a persona. One actual human.
- Occasional sentence fragments are human: "Worth noting." / "Two years, no pilling."
- Strategic asymmetry: if line 1 is short, make line 2 longer. Never two long lines in a row.

Write:
1. PRIMARY TEXT (125 chars max) — conversational, one specific claim, one sensory detail
2. HEADLINE (40 chars max) — declarative statement, no question marks
3. DESCRIPTION (30 chars max) — functional benefit, stated plainly
4. HOOK (first 3 seconds if video) — a statement that earns attention without begging for it

Return as JSON: { "primary": "...", "headline": "...", "description": "...", "hook": "..." }`
    }],
  }), 'A4');

  try {
    const text = msg.content[0].text.trim();
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    return JSON.parse(json);
  } catch {
    return { primary: msg.content[0].text, headline: product.name, description: 'Shop now', hook: '' };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// META API — קמפיין
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function metaPost(endpoint, body) {
  const url = `${META_BASE}/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: ACCESS_TOKEN }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Meta API: ${data.error.message}`);
  return data;
}

async function metaGet(endpoint, params = {}) {
  const qs = new URLSearchParams({ ...params, access_token: ACCESS_TOKEN }).toString();
  const res = await fetch(`${META_BASE}/${endpoint}?${qs}`);
  const data = await res.json();
  if (data.error) throw new Error(`Meta API: ${data.error.message}`);
  return data;
}

async function createCampaign(campaign) {
  return await metaPost(`${AD_ACCOUNT_ID}/campaigns`, {
    name: campaign.name,
    objective: campaign.objective,
    status: 'PAUSED', // תמיד מתחיל PAUSED — גיא מפעיל ידנית
    special_ad_categories: [],
  });
}

async function checkCampaignROAS() {
  if (DRY_RUN) return { lowRoas: [], zeroConversion: [] };

  const insights = await metaGet(`${AD_ACCOUNT_ID}/insights`, {
    fields: 'campaign_name,spend,purchase_roas,actions,impressions,clicks',
    date_preset: 'last_7d',
    level: 'campaign',
  });

  const lowRoas = [];
  const zeroConversion = [];
  for (const row of (insights.data || [])) {
    const roas = parseFloat(row.purchase_roas?.[0]?.value || 0);
    const spend = parseFloat(row.spend || 0);
    const purchases = (row.actions || []).find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase');
    const conversions = parseInt(purchases?.value || 0, 10);

    if (spend > 5 && conversions === 0) {
      zeroConversion.push({ name: row.campaign_name, spend });
      console.log(`🔴 ZERO CONVERSIONS — ${row.campaign_name}: $${spend.toFixed(2)} spent, 0 purchases — pause immediately`);
    } else if (spend > 10 && roas < 2.5) {
      lowRoas.push({ name: row.campaign_name, roas, spend });
      console.log(`⚠️  ROAS נמוך — ${row.campaign_name}: ${roas} (מינימום 2.5)`);
    }
  }
  return { lowRoas, zeroConversion };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROAS-WEIGHTED PRODUCT SELECTION (Gap 2)
// Reads last 8 successful runs from health log; sorts products by avg ROAS
// Falls back to random on first run or when no Supabase
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function buildProductROASMap(supabase) {
  if (!supabase) return {};
  try {
    const { data } = await supabase
      .from('agent_health_log')
      .select('metadata')
      .eq('agent_id', 'A4')
      .eq('run_status', 'success')
      .order('created_at', { ascending: false })
      .limit(8);
    const roasMap = {};
    for (const row of (data || [])) {
      for (const entry of (row.metadata?.product_campaign_map || [])) {
        if (entry.roas != null) {
          if (!roasMap[entry.product]) roasMap[entry.product] = [];
          roasMap[entry.product].push(entry.roas);
        }
      }
    }
    return roasMap;
  } catch { return {}; }
}

function selectROASWeightedProduct(liveProducts, usedNames, roasMap) {
  const available = liveProducts.filter(p => !usedNames.has(p.name));
  const pool = available.length ? available : liveProducts;
  if (Object.keys(roasMap).length === 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return pool.slice().sort((a, b) => {
    const aScores = roasMap[a.name] || [];
    const bScores = roasMap[b.name] || [];
    const aAvg = aScores.length ? aScores.reduce((s, v) => s + v, 0) / aScores.length : 0;
    const bAvg = bScores.length ? bScores.reduce((s, v) => s + v, 0) / bScores.length : 0;
    return bAvg - aAvg;
  })[0];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRODUCTS — מוצרי SockAcademy לפרסום
// קורא מ-Supabase מוצרים שהועלו בפועל ל-Shopify
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getHeroProducts(supabase) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('product_name, retail_price, shopify_url, category')
      .like('upload_status', 'uploaded:%')
      .not('shopify_url', 'is', null)
      .limit(20);

    if (error || !data?.length) return null;

    return data.map(p => ({
      name:     p.product_name,
      price:    parseFloat(p.retail_price) || 29.99,
      url:      p.shopify_url,
      category: p.category || 'Premium Socks',
    }));
  } catch {
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL REPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendReport(adCopies, { lowRoas = [], zeroConversion = [] } = {}, mode) {
  if (!process.env.GMAIL_APP_PASSWORD) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const copyHtml = adCopies.map(({ campaign, product, copy }) => `
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:12px 0">
      <div style="font-weight:700;color:#111;margin-bottom:8px">📢 ${campaign.name}</div>
      <div style="font-size:13px;color:#374151;margin-bottom:4px">🎯 מוצר: <strong>${product.name}</strong> ($${product.price})</div>
      <div style="background:#fff;border-radius:6px;padding:12px;font-size:12px;color:#555;margin-top:8px">
        <div><strong>PRIMARY:</strong> ${copy.primary}</div>
        <div style="margin-top:4px"><strong>HEADLINE:</strong> ${copy.headline}</div>
        <div style="margin-top:4px"><strong>DESCRIPTION:</strong> ${copy.description}</div>
        ${copy.hook ? `<div style="margin-top:4px"><strong>HOOK:</strong> ${copy.hook}</div>` : ''}
      </div>
    </div>
  `).join('');

  const zeroConvHtml = zeroConversion.length ? `
    <div style="background:#450a0a;border:1px solid #ef4444;border-radius:8px;padding:16px;margin:16px 0">
      <h3 style="color:#ef4444;margin:0 0 8px">🔴 PAUSE IMMEDIATELY — 0 המרות, תקציב נשרף</h3>
      ${zeroConversion.map(a => `<p style="margin:4px 0;color:#fca5a5">• ${a.name}: $${parseFloat(a.spend).toFixed(2)} הוצאה | 0 רכישות</p>`).join('')}
    </div>
  ` : '';
  const lowRoasHtml = lowRoas.length ? `
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:16px 0">
      <h3 style="color:#dc2626;margin:0 0 8px">⚠️ ROAS נמוך — קמפיינים לבדיקה</h3>
      ${lowRoas.map(a => `<p style="margin:4px 0">• ${a.name}: ROAS ${a.roas} (מינימום 2.5) | הוצאה: $${a.spend}</p>`).join('')}
    </div>
  ` : '';
  const alertHtml = (zeroConvHtml || lowRoasHtml)
    ? zeroConvHtml + lowRoasHtml
    : '<div style="background:#f0fdf4;border-radius:8px;padding:12px;color:#16a34a">✅ כל הקמפיינים מעל ROAS 2.5</div>';

  const html = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
  <div style="background:#111827;padding:24px;text-align:center;border-radius:12px 12px 0 0">
    <div style="color:#fff;font-size:22px;font-weight:800">🧦 SockAcademy</div>
    <div style="color:#9ca3af;font-size:13px;margin-top:4px">A4 Meta Ads Agent — ${new Date().toLocaleDateString('he-IL')}</div>
    <div style="background:#374151;color:#fbbf24;padding:4px 12px;border-radius:12px;font-size:11px;display:inline-block;margin-top:8px">
      ${mode === 'dry-run' ? '🔧 DRY-RUN MODE — לא הועלו מודעות' : '🚀 LIVE MODE'}
    </div>
  </div>
  <div style="padding:20px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
    ${alertHtml}
    <h3 style="color:#111;margin:20px 0 8px">📝 קופי מודעות שנוצר</h3>
    ${copyHtml}
    ${mode === 'dry-run' ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-top:16px">
      <strong>להפעלה מלאה נדרש:</strong>
      <ul style="font-size:13px;color:#92400e;margin:8px 0">
        <li>META_ACCESS_TOKEN — ב-.env</li>
        <li>META_AD_ACCOUNT_ID — ב-.env (act_XXXXXXXXX)</li>
        <li>META_PAGE_ID — ID של דף Sockacademy ב-Facebook</li>
      </ul>
    </div>` : ''}
    <p style="color:#9ca3af;font-size:11px;margin-top:20px;text-align:center">A4 Agent v1.0 — SockAcademy · Facebook + Instagram</p>
  </div>
</div>`;

  await transporter.sendMail({
    from: 'SockAcademy A4 Agent <sockacademy.store@gmail.com>',
    to: ADMIN_EMAIL,
    subject: `📢 A4 — קופי מודעות Meta | ${new Date().toLocaleDateString('he-IL')} ${mode === 'dry-run' ? '[DRY-RUN]' : '[LIVE]'}`,
    html,
  });

  console.log('📧 דוח נשלח');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  // LAUNCH_MODE gate — protocol #27
  if (process.env.LAUNCH_MODE !== 'true') {
    console.log('[A4] LAUNCH_MODE not active — exiting without API calls.');
    process.exit(0);
  }

  const supabase = getSupabase();
  await logHealth(supabase, 'running');
  console.log('🚀 A4 — Meta Ads Agent v1.0');
  console.log(`🔧 מצב: ${DRY_RUN ? 'DRY-RUN (אין API credentials)' : 'LIVE'}`);
  console.log('━'.repeat(40));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ חסר ANTHROPIC_API_KEY');
    process.exit(1);
  }

  // בדיקת ROAS
  console.log('\n📊 בודק ROAS קמפיינים...');
  const { lowRoas: roasAlerts, zeroConversion: zeroAlerts } = await checkCampaignROAS();
  if (zeroAlerts.length) console.log(`🔴 ${zeroAlerts.length} campaign(s) with 0 conversions — immediate action needed`);

  // טעינת מוצרים חיים מ-Supabase
  const liveProducts = await getHeroProducts(supabase);
  if (!liveProducts?.length) {
    console.log('⚠️  No uploaded products in Supabase — skipping ad copy generation');
    console.log('   Upload products via A1→A2 pipeline first, then re-run A4');
    await sendReport([], { lowRoas: roasAlerts, zeroConversion: zeroAlerts }, DRY_RUN ? 'dry-run' : 'live');
    await logHealth(supabase, 'success');
    return;
  }
  console.log(`📦 ${liveProducts.length} live product(s) loaded from Supabase`);

  // ROAS-weighted product selection (Gap 2)
  const roasMap = await buildProductROASMap(supabase);
  const usedProductNames = new Set();
  console.log(`📈 ROAS history: ${Object.keys(roasMap).length > 0 ? Object.keys(roasMap).length + ' product(s) with data' : 'no history yet — random fallback'}`);

  // יצירת קופי לכל קמפיין × מוצר hero
  console.log('\n✍️  מייצר קופי מודעות עם Claude...');
  const adCopies = [];
  const productCampaignMap = [];

  for (const campaign of CAMPAIGNS) {
    const product = selectROASWeightedProduct(liveProducts, usedProductNames, roasMap);
    usedProductNames.add(product.name);
    console.log(`  ⏳ ${campaign.id} × ${product.name}...`);

    const copy = await generateAdCopy(campaign, product);
    adCopies.push({ campaign, product, copy });
    productCampaignMap.push({ campaign: campaign.id, product: product.name, roas: null });

    console.log(`  ✅ "${copy.headline}"`);
    await new Promise(r => setTimeout(r, 500));
  }

  // אם LIVE — יצור קמפיינים ב-Meta (PAUSED)
  if (!DRY_RUN) {
    console.log('\n📤 יוצר קמפיינים ב-Meta (PAUSED)...');
    for (const campaign of CAMPAIGNS) {
      try {
        const result = await createCampaign(campaign);
        console.log(`  ✅ ${campaign.name} — ID: ${result.id}`);
      } catch (e) {
        console.log(`  ❌ ${campaign.name}: ${e.message}`);
      }
    }
  }

  console.log('\n━'.repeat(40));
  console.log(`✅ A4 הושלם — ${adCopies.length} קופי נוצרו`);

  await sendReport(adCopies, { lowRoas: roasAlerts, zeroConversion: zeroAlerts }, DRY_RUN ? 'dry-run' : 'live');
  await logHealth(supabase, 'success', '', { product_campaign_map: productCampaignMap });
}

main().catch(async e => {
  console.error('💥 Fatal:', e.message);
  await logHealth(getSupabase(), 'failure', e.message).catch(() => {});
  await notifyTelegram(heTelegramMsg('A4 Meta Ads', '🚨 כשל קריטי!',
    `ה-agent נכשל בהרצה. נדרשת בדיקה דחופה.\nשגיאה: <code>${e.message}</code>`));
  process.exit(1);
});
