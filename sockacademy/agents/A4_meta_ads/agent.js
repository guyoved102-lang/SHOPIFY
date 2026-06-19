/**
 * A4 — Meta Ads Agent v1.0
 * יוצר קופי למודעות עם Claude → מריץ/מנטר קמפיינים Meta (Facebook + Instagram)
 * מצב נוכחי: DRY-RUN (אין META_ACCESS_TOKEN = רק מייצר קופי ומדווח)
 * להפעיל: הוסף META_ACCESS_TOKEN + META_AD_ACCOUNT_ID ל-.env
 */

require('dotenv').config({ path: '../../.env' });
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');

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
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
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
  });

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
  if (DRY_RUN) return [];

  const insights = await metaGet(`${AD_ACCOUNT_ID}/insights`, {
    fields: 'campaign_name,spend,purchase_roas,impressions,clicks',
    date_preset: 'last_7d',
    level: 'campaign',
  });

  const alerts = [];
  for (const row of (insights.data || [])) {
    const roas = parseFloat(row.purchase_roas?.[0]?.value || 0);
    const spend = parseFloat(row.spend || 0);
    if (spend > 10 && roas < 2.5) {
      alerts.push({ name: row.campaign_name, roas, spend });
      // עצור קמפיין שלא מכניס
      console.log(`⚠️  ROAS נמוך — ${row.campaign_name}: ${roas} (מינימום 2.5)`);
    }
  }
  return alerts;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRODUCTS — מוצרי SockAcademy לפרסום
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const HERO_PRODUCTS = [
  { name: 'Merino Wool Crew Socks', price: 34.99, url: 'https://sockacademy.store/products/merino-wool-crew-socks', category: 'Premium Materials' },
  { name: 'Egyptian Cotton Dress Socks', price: 29.99, url: 'https://sockacademy.store/products/egyptian-cotton-dress-socks', category: 'Dress & Formal' },
  { name: 'Tactical Hiking Socks', price: 44.99, url: 'https://sockacademy.store/products/tactical-hiking-socks-thermolite', category: 'Tactical & Outdoor' },
  { name: 'SockAcademy Gift Set', price: 79.99, url: 'https://sockacademy.store/products/sockacademy-essentials-gift-set-3-pairs', category: 'Gift Sets' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL REPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendReport(adCopies, alerts, mode) {
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

  const alertHtml = alerts.length ? `
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:16px 0">
      <h3 style="color:#dc2626;margin:0 0 8px">⚠️ ROAS נמוך — קמפיינים לבדיקה</h3>
      ${alerts.map(a => `<p style="margin:4px 0">• ${a.name}: ROAS ${a.roas} (מינימום 2.5) | הוצאה: $${a.spend}</p>`).join('')}
    </div>
  ` : '<div style="background:#f0fdf4;border-radius:8px;padding:12px;color:#16a34a">✅ כל הקמפיינים מעל ROAS 2.5</div>';

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
    to: 'guyoved102@gmail.com',
    subject: `📢 A4 — קופי מודעות Meta | ${new Date().toLocaleDateString('he-IL')} ${mode === 'dry-run' ? '[DRY-RUN]' : '[LIVE]'}`,
    html,
  });

  console.log('📧 דוח נשלח');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  console.log('🚀 A4 — Meta Ads Agent v1.0');
  console.log(`🔧 מצב: ${DRY_RUN ? 'DRY-RUN (אין API credentials)' : 'LIVE'}`);
  console.log('━'.repeat(40));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ חסר ANTHROPIC_API_KEY');
    process.exit(1);
  }

  // בדיקת ROAS
  console.log('\n📊 בודק ROAS קמפיינים...');
  const alerts = await checkCampaignROAS();

  // יצירת קופי לכל קמפיין × מוצר hero
  console.log('\n✍️  מייצר קופי מודעות עם Claude...');
  const adCopies = [];

  for (const campaign of CAMPAIGNS) {
    const product = HERO_PRODUCTS[Math.floor(Math.random() * HERO_PRODUCTS.length)];
    console.log(`  ⏳ ${campaign.id} × ${product.name}...`);

    const copy = await generateAdCopy(campaign, product);
    adCopies.push({ campaign, product, copy });

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

  await sendReport(adCopies, alerts, DRY_RUN ? 'dry-run' : 'live');
}

main().catch(e => {
  console.error('💥 Fatal:', e.message);
  process.exit(1);
});
