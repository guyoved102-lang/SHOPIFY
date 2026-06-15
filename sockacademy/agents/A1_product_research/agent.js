/**
 * A1 — Product Research Agent v2.0
 * פלטפורמות: CJ Dropshipping (API) + AliExpress + Alibaba + ניתוח טרנדים TikTok
 * [עתידי] Spocket — כשמנוי פעיל
 * הרצה: node agent.js | GitHub Actions: כל יום שני 10:00 ישראל
 */

require('dotenv').config({ path: '../../.env' });
const fs = require('fs');
const nodemailer = require('nodemailer');

const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'sockacademy.store@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 22 שאילתות חיפוש — כל הקטגוריות
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SEARCH_QUERIES = [
  // חומרים פרימיום
  'merino wool socks men premium',
  'merino wool ankle socks women',
  'egyptian cotton dress socks men',
  'bamboo socks men luxury antibacterial',
  'cashmere blend socks premium',
  // ספורט/ביצועים
  'compression socks running marathon',
  'anti-blister hiking socks cushioned wool',
  'no show socks athletic performance',
  'cycling socks elite sport',
  'gym cushioned ankle socks',
  // סגנון/אופנה
  'dress socks striped formal men luxury',
  'argyle socks premium wool men',
  'patterned dress socks men business',
  'thin breathable dress socks summer',
  'loafer socks suede invisible men',
  // טקטי/עונתי
  'thermal hiking socks winter wool',
  'waterproof hiking socks merino outdoor',
  'copper infused socks odor control antibacterial',
  'medical compression socks circulation',
  'toe socks sport five finger running',
  // מתנות / סטים
  'dress socks men gift box premium set',
  'men luxury socks subscription gift',
];

const EXCLUDE_WORDS = ['children', 'kids', 'baby', 'cartoon', 'anime', 'funny', 'novelty', 'christmas', 'halloween'];

// טרנדים 2025 — בסיס סטטי (מתעדכן רבעונית)
const TRENDING_2025 = [
  'merino', 'bamboo', 'copper', 'compression', 'no show', 'no-show',
  'tactical', 'waterproof', 'odor', 'antibacterial', 'gift set',
  'egyptian cotton', 'cashmere', 'thermal', 'hiking', 'loafer',
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLATFORM 1: CJ DROPSHIPPING (API)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getCJToken() {
  try {
    const res = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
    });
    const data = await res.json();
    if (!data.data?.accessToken) { console.log('⚠️  CJ API לא זמין'); return null; }
    console.log('✅ CJ Token OK');
    return data.data.accessToken;
  } catch (e) {
    console.log(`⚠️  CJ Auth: ${e.message}`);
    return null;
  }
}

async function searchCJ(token, keyword) {
  if (!token) return [];
  try {
    const url = `https://developers.cjdropshipping.com/api2.0/v1/product/list?` + new URLSearchParams({
      productNameEn: keyword,
      pageNum: 1,
      pageSize: 50,
      orderBy: 'soldCount',
      orderType: 'DESC',
    });
    const res = await fetch(url, { headers: { 'CJ-Access-Token': token } });
    const data = await res.json();
    return (data.data?.list || []).map(p => ({
      source: 'CJ',
      pid: p.pid,
      name: p.productNameEn,
      rating: parseFloat(p.productRating || 0),
      orders: parseInt(p.soldCount || 0),
      reviews: parseInt(p.reviewCount || 0),
      supplierPrice: parseFloat(p.sellPrice || p.productPrice || 0),
      imageUrl: p.productImage || '',
      url: `https://cjdropshipping.com/product/${p.pid}.html`,
      materials: extractMaterials(p.productNameEn),
      category: classifyStyle(p.productNameEn),
    }));
  } catch (e) {
    console.log(`⚠️  CJ search: ${e.message}`);
    return [];
  }
}

async function getCJProductDetail(token, pid) {
  if (!token || !pid) return null;
  try {
    const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${pid}`, {
      headers: { 'CJ-Access-Token': token },
    });
    const data = await res.json();
    return data.data || null;
  } catch (e) { return null; }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLATFORM 2: ALIEXPRESS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function searchAliExpress(keyword) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  ];

  for (const ua of userAgents) {
    try {
      const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(keyword)}&SortType=total_tranpro_desc&minStar=4&shipCountry=US`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const products = parseAliExpressHTML(html, keyword);
      if (products.length > 0) return products;
    } catch (e) { /* try next ua */ }
  }
  return [];
}

function parseAliExpressHTML(html, keyword) {
  const products = [];
  const patterns = [
    /window\.__pageData\s*=\s*({.+?});\s*window/s,
    /window\._dida_config_\s*=\s*({.+?});\s*/s,
    /"items"\s*:\s*(\[.+?\])/s,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    try {
      const raw = JSON.parse(match[1]);
      const items = raw.items || raw.result?.items || raw.data?.items || [];
      items.slice(0, 15).forEach(item => {
        const name = item.title || item.productTitle || item.subject || '';
        if (!name || EXCLUDE_WORDS.some(w => name.toLowerCase().includes(w))) return;
        products.push({
          source: 'AliExpress',
          pid: String(item.productId || item.id || Math.random()),
          name,
          rating: parseFloat(item.starRating || item.averageStar || item.averageStarRate || 0),
          orders: parseInt((item.tradeDesc || '').replace(/[^0-9]/g, '') || item.sold || item.tradedCount || 0),
          reviews: parseInt(item.feedbackRating?.totalValidNum || item.evaluateCount || item.reviews || 0),
          supplierPrice: parseFloat(item.prices?.salePrice?.minPrice || item.price?.minPrice || item.salePrice?.minAmount || 0),
          imageUrl: item.imageUrl || item.mainImage || '',
          url: `https://www.aliexpress.com/item/${item.productId || item.id}.html`,
          materials: extractMaterials(name),
          category: classifyStyle(name),
        });
      });
      if (products.length > 0) break;
    } catch (e) { continue; }
  }
  return products;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLATFORM 3: ALIBABA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function searchAlibaba(keyword) {
  try {
    const searchUrl = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(keyword)}&sortType=total_tranpro_desc&tab=all`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.alibaba.com/',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) { console.log(`   Alibaba: ${res.status}`); return []; }
    const html = await res.text();
    return parseAlibabaHTML(html, keyword);
  } catch (e) {
    console.log(`   Alibaba שגיאה: ${e.message}`);
    return [];
  }
}

function parseAlibabaHTML(html, keyword) {
  const products = [];
  const patterns = [
    /window\.__INIT_DATA__\s*=\s*({.+?});\s*</s,
    /"organic-list".*?"data"\s*:\s*(\[.+?\])/s,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    try {
      const raw = JSON.parse(match[1]);
      const items = raw?.data?.organicList || raw?.organicList || raw?.items || [];
      items.slice(0, 10).forEach(item => {
        const name = item.subjectTrans || item.subject || item.title || '';
        if (!name || EXCLUDE_WORDS.some(w => name.toLowerCase().includes(w))) return;
        const priceStr = item.priceInfo?.price || item.price?.value || '';
        const price = parseFloat(String(priceStr).replace(/[^0-9.]/g, '') || 0);
        if (price > 25) return;
        products.push({
          source: 'Alibaba',
          pid: String(item.productId || item.id || Math.random()),
          name,
          rating: parseFloat(item.tradeScore || item.supplierRating || 4.5),
          orders: parseInt(item.tradeQuantity || item.sold || 0),
          reviews: parseInt(item.reviewCount || 0),
          supplierPrice: price || 3.5,
          imageUrl: item.image?.imgUrl || item.imageUrl || '',
          url: `https://www.alibaba.com/product-detail/${item.productId || ''}.html`,
          materials: extractMaterials(name),
          category: classifyStyle(name),
        });
      });
      if (products.length > 0) break;
    } catch (e) { continue; }
  }

  // Regex fallback
  if (products.length === 0) {
    const matches = [...html.matchAll(/class="[^"]*(?:product-title|offer-title)[^"]*"[^>]*>([^<]{15,80})</g)];
    for (const m of matches) {
      const name = m[1].trim();
      if (!name.toLowerCase().includes('sock')) continue;
      if (EXCLUDE_WORDS.some(w => name.toLowerCase().includes(w))) continue;
      products.push({
        source: 'Alibaba',
        pid: `alib_${Date.now()}_${Math.random()}`,
        name,
        rating: 4.6,
        orders: 500,
        reviews: 30,
        supplierPrice: 3.5,
        imageUrl: '',
        url: `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(keyword)}`,
        materials: extractMaterials(name),
        category: classifyStyle(name),
      });
      if (products.length >= 5) break;
    }
  }
  return products;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLATFORM 4: TIKTOK TRENDS
// [עתידי] PLATFORM 5: SPOCKET (כשמנוי פעיל)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getTikTokTrends() {
  const trendKeywords = [];
  try {
    const res = await fetch('https://ads.tiktok.com/business/creativecenter/trends/hashtag/pc/en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const html = await res.text();
      const matches = [...html.matchAll(/#(\w*socks?\w*|\w*merino\w*|\w*compression\w*|\w*bamboo\w*)/gi)];
      matches.forEach(m => trendKeywords.push(m[1].toLowerCase()));
    }
  } catch (e) { /* fallback to static */ }

  // בסיס סטטי Q2 2025
  const staticTrends = [
    'merino', 'bamboo', 'copper', 'compression', 'noshowsocks',
    'hikingsocks', 'mensocks', 'premiumsocks', 'giftsocks',
    'loafersocks', 'businesssocks', 'tacticalboots', 'egyptiancotton',
  ];
  const combined = [...new Set([...trendKeywords, ...staticTrends])];
  console.log(`   טרנדים: ${combined.length} מילות מפתח`);
  return combined;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// עיבוד מוצרים
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function extractMaterials(name = '') {
  const n = name.toLowerCase();
  const found = [];
  if (n.includes('merino')) found.push('Merino Wool');
  if (n.includes('cashmere')) found.push('Cashmere');
  if (n.includes('bamboo')) found.push('Bamboo');
  if (n.includes('egyptian cotton') || (n.includes('egyptian') && n.includes('cotton'))) found.push('Egyptian Cotton');
  else if (n.includes('cotton')) found.push('Cotton');
  if (n.includes('wool') && !n.includes('merino')) found.push('Wool');
  if (n.includes('copper')) found.push('Copper Fiber');
  if (n.includes('coolmax') || n.includes('dryfit') || n.includes('dry fit')) found.push('Performance Fiber');
  if (n.includes('compression')) found.push('Compression');
  if (n.includes('thermal')) found.push('Thermal');
  return found;
}

function classifyStyle(name = '') {
  const n = name.toLowerCase();
  if (n.includes('gift') || n.includes(' set') || n.includes('box')) return 'Gift Sets';
  if (n.includes('dress') || n.includes('formal') || n.includes('argyle') || n.includes('business') || n.includes('striped')) return 'Dress & Formal';
  if (n.includes('compression') || n.includes('running') || n.includes('sport') || n.includes('gym') || n.includes('cycling') || n.includes('athletic') || n.includes('marathon')) return 'Athletic';
  if (n.includes('hiking') || n.includes('tactical') || n.includes('waterproof') || n.includes('outdoor') || n.includes('boot')) return 'Tactical & Outdoor';
  if (n.includes('merino') || n.includes('cashmere') || n.includes('egyptian') || n.includes('luxury') || n.includes('bamboo')) return 'Premium Materials';
  if (n.includes('no show') || n.includes('no-show') || n.includes('invisible') || n.includes('ankle') || n.includes('loafer')) return 'Casual & No-Show';
  return 'General';
}

function suggestRetailPrice(product) {
  const { supplierPrice, category, materials } = product;
  if (!supplierPrice || supplierPrice <= 0) return { retail: 28, margin: '0', marginPct: 0 };
  let multiplier = 4;
  if (materials.some(m => ['Merino Wool', 'Cashmere', 'Egyptian Cotton'].includes(m))) multiplier = 5;
  else if (category === 'Premium Materials') multiplier = 4.8;
  else if (category === 'Gift Sets') multiplier = 4.5;
  else if (category === 'Tactical & Outdoor') multiplier = 4.5;
  else if (category === 'Athletic') multiplier = 3.8;
  const retail = Math.round(supplierPrice * multiplier);
  const margin = (retail - supplierPrice).toFixed(2);
  const marginPct = Math.round(((retail - supplierPrice) / retail) * 100);
  return { retail, margin, marginPct };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ניקוד מוצרים — 120 נק' → מנרמל ל-100
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function scoreProduct(p, trendKeywords = []) {
  let score = 0;
  const reasons = [];

  // דירוג (30 נק')
  if (p.rating >= 4.9) { score += 30; reasons.push('דירוג 4.9★ מושלם'); }
  else if (p.rating >= 4.8) { score += 24; reasons.push('דירוג 4.8★ מצוין'); }
  else if (p.rating >= 4.7) { score += 16; reasons.push('דירוג 4.7★ טוב מאוד'); }
  else if (p.rating >= 4.5) { score += 10; }

  // מכירות מוכחות (25 נק')
  if (p.orders >= 20000) { score += 25; reasons.push('20K+ מכירות'); }
  else if (p.orders >= 10000) { score += 22; reasons.push('10K+ מכירות'); }
  else if (p.orders >= 5000) { score += 17; reasons.push('5K+ מכירות'); }
  else if (p.orders >= 1000) { score += 11; reasons.push('1K+ מכירות'); }
  else if (p.orders >= 200) { score += 5; }

  // מרג'ין (20 נק')
  if (p.supplierPrice > 0 && p.supplierPrice <= 3) { score += 20; reasons.push('מרג\'ין 75%+'); }
  else if (p.supplierPrice <= 5) { score += 16; reasons.push('מרג\'ין 70%+'); }
  else if (p.supplierPrice <= 8) { score += 11; reasons.push('מרג\'ין 65%+'); }
  else if (p.supplierPrice <= 12) { score += 6; }
  else if (p.supplierPrice <= 18) { score += 3; }

  // ביקורות (15 נק')
  if (p.reviews >= 2000) { score += 15; reasons.push('2K+ ביקורות'); }
  else if (p.reviews >= 1000) { score += 13; reasons.push('1K+ ביקורות'); }
  else if (p.reviews >= 500) { score += 9; }
  else if (p.reviews >= 100) { score += 5; }

  // חומרים פרימיום (10 נק')
  if (p.materials.length >= 2) { score += 10; reasons.push(p.materials.slice(0, 2).join(' + ')); }
  else if (p.materials.length === 1) { score += 7; reasons.push(p.materials[0]); }

  // טרנד 2025 (בונוס 20 נק')
  const name = p.name.toLowerCase();
  const allTrendWords = [...TRENDING_2025, ...trendKeywords];
  const trendMatches = [...new Set(allTrendWords.filter(t => name.includes(t)))];
  if (trendMatches.length >= 2) { score += 20; reasons.push(`🔥 טרנד: ${trendMatches.slice(0, 2).join(', ')}`); }
  else if (trendMatches.length === 1) { score += 10; reasons.push(`📈 טרנד: ${trendMatches[0]}`); }

  return { score: Math.min(100, Math.round(score)), reasons };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTML EMAIL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildHTMLEmail(top10, stats, date) {
  const catCount = {};
  top10.forEach(p => { catCount[p.category] = (catCount[p.category] || 0) + 1; });

  const categoryChips = Object.entries(catCount)
    .map(([cat, n]) => `<span style="background:#f3f4f6;padding:4px 10px;border-radius:12px;font-size:12px;margin:3px;display:inline-block;">${cat} (${n})</span>`)
    .join('');

  const productRows = top10.map((p, i) => {
    const priceInfo = suggestRetailPrice(p);
    const scoreColor = p.score >= 85 ? '#16a34a' : p.score >= 70 ? '#d97706' : '#dc2626';
    const medal = ['🥇','🥈','🥉'][i] || `${i + 1}.`;
    const img = p.imageUrl
      ? `<img src="${p.imageUrl}" width="80" height="80" style="border-radius:8px;object-fit:cover;border:1px solid #e5e7eb;" />`
      : `<div style="width:80px;height:80px;background:#f3f4f6;border-radius:8px;line-height:80px;text-align:center;font-size:28px;">🧦</div>`;

    return `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:16px 10px;vertical-align:top;width:90px;">${img}</td>
      <td style="padding:16px 10px;vertical-align:top;">
        <div style="font-weight:700;font-size:14px;color:#111827;margin-bottom:4px;">${medal} ${p.name}</div>
        <div style="color:#6b7280;font-size:12px;margin-bottom:6px;">
          📦 ${p.source} &nbsp;|&nbsp; ⭐ ${p.rating || '—'} &nbsp;|&nbsp; 🛍️ ${p.orders.toLocaleString()} הזמנות &nbsp;|&nbsp; 💬 ${p.reviews.toLocaleString()} ביקורות
        </div>
        <div style="font-size:12px;color:#374151;margin-bottom:4px;">
          🏷️ <strong>${p.category}</strong>${p.materials.length > 0 ? ' &nbsp;|&nbsp; 🧵 ' + p.materials.join(', ') : ''}
        </div>
        <div style="font-size:13px;color:#059669;font-weight:600;margin-bottom:6px;">
          💰 עלות: $${p.supplierPrice} &nbsp;→&nbsp; מכירה: ~$${priceInfo.retail} &nbsp;|&nbsp; רווח: ~$${priceInfo.margin} (${priceInfo.marginPct}%)
        </div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:8px;">📌 ${p.reasons.join(' · ')}</div>
        <a href="${p.url}" style="background:#111827;color:white;text-decoration:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;">צפה במוצר →</a>
      </td>
      <td style="padding:16px 10px;vertical-align:top;text-align:center;min-width:55px;">
        <div style="font-size:26px;font-weight:800;color:${scoreColor};">${p.score}</div>
        <div style="font-size:10px;color:#9ca3af;">/100</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${p.source}</div>
      </td>
    </tr>`;
  }).join('');

  const platformsStr = Object.entries(stats.platformStats)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>SockAcademy — דוח מוצרים שבועי</title></head>
<body style="margin:0;padding:20px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;direction:rtl;">
<div style="max-width:680px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

  <div style="background:#111827;padding:28px;text-align:center;">
    <div style="color:#f9fafb;font-size:26px;font-weight:800;">🧦 SockAcademy</div>
    <div style="color:#9ca3af;font-size:13px;margin-top:4px;">דוח מחקר מוצרים שבועי · ${date}</div>
  </div>

  <div style="background:#f8fafc;padding:16px 28px;display:flex;gap:20px;border-bottom:1px solid #e5e7eb;flex-wrap:wrap;">
    <div style="text-align:center;min-width:80px;">
      <div style="font-size:26px;font-weight:800;color:#111827;">${stats.totalScanned}</div>
      <div style="font-size:11px;color:#6b7280;">נסרקו</div>
    </div>
    <div style="text-align:center;min-width:80px;">
      <div style="font-size:26px;font-weight:800;color:#111827;">${stats.platforms}</div>
      <div style="font-size:11px;color:#6b7280;">פלטפורמות</div>
    </div>
    <div style="text-align:center;min-width:80px;">
      <div style="font-size:26px;font-weight:800;color:#111827;">${stats.totalPassed}</div>
      <div style="font-size:11px;color:#6b7280;">עברו סינון</div>
    </div>
    <div style="text-align:center;min-width:80px;">
      <div style="font-size:26px;font-weight:800;color:#111827;">10</div>
      <div style="font-size:11px;color:#6b7280;">המלצות</div>
    </div>
  </div>

  <div style="padding:6px 28px 12px;background:#fffbeb;border-bottom:1px solid #fde68a;">
    <div style="font-size:11px;color:#78350f;margin-bottom:6px;font-weight:600;">📊 פילוח: ${platformsStr}</div>
    <div>${categoryChips}</div>
  </div>

  <div style="padding:20px 28px;">
    <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:12px;">🏆 10 המוצרים המומלצים השבוע</div>
    <table style="width:100%;border-collapse:collapse;">${productRows}</table>
  </div>

  <div style="background:#f0fdf4;padding:20px 28px;border-top:1px solid #bbf7d0;text-align:center;">
    <div style="font-size:14px;font-weight:600;color:#166534;margin-bottom:10px;">✅ לאשר מוצרים ב-Google Sheets</div>
    <a href="https://docs.google.com/spreadsheets/d/1ojfN0ClyB4EM83yk03RhKlQImrTjZdYEurZ4dJbuQBg"
       style="background:#16a34a;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;display:inline-block;">
      פתח Google Sheets →
    </a>
    <div style="font-size:11px;color:#6b7280;margin-top:10px;">לאחר אישור → A2 מעלה לחנות אוטומטית</div>
  </div>

  <div style="padding:14px 28px;text-align:center;border-top:1px solid #e5e7eb;">
    <div style="font-size:10px;color:#9ca3af;">A1 Agent v2.0 · CJ + AliExpress + Alibaba + TikTok Trends · כל יום שני · sockacademy.store</div>
  </div>
</div>
</body>
</html>`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function run() {
  console.log('🚀 A1 Product Research Agent v2.0\n');
  console.log('📡 פלטפורמות: CJ Dropshipping + AliExpress + Alibaba + TikTok Trends\n');

  // CJ Auth
  const cjToken = await getCJToken();

  // טרנדים
  console.log('📈 מנתח טרנדים TikTok 2025...');
  const trendKeywords = await getTikTokTrends();
  console.log('');

  const allProducts = [];
  const platformStats = { CJ: 0, AliExpress: 0, Alibaba: 0 };

  // סריקה עמוקה — כל שאילתה × 3 פלטפורמות
  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const query = SEARCH_QUERIES[i];
    console.log(`🔍 [${i+1}/${SEARCH_QUERIES.length}] "${query}"`);

    if (cjToken) {
      const r = await searchCJ(cjToken, query);
      if (r.length) { console.log(`   CJ: ${r.length}`); platformStats.CJ += r.length; allProducts.push(...r); }
    }

    const aliR = await searchAliExpress(query);
    if (aliR.length) { console.log(`   AliExpress: ${aliR.length}`); platformStats.AliExpress += aliR.length; allProducts.push(...aliR); }

    // Alibaba כל שאילתה שנייה (למנוע חסימה)
    if (i % 2 === 0) {
      const alibR = await searchAlibaba(query);
      if (alibR.length) { console.log(`   Alibaba: ${alibR.length}`); platformStats.Alibaba += alibR.length; allProducts.push(...alibR); }
    }

    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n📊 סה"כ נסרקו: ${allProducts.length} | CJ:${platformStats.CJ} AliExpress:${platformStats.AliExpress} Alibaba:${platformStats.Alibaba}\n`);

  // סינון ייחודיות
  const seen = new Set();
  const unique = allProducts.filter(p => {
    const key = p.name.toLowerCase().trim().substring(0, 45);
    if (seen.has(key)) return false;
    seen.add(key);
    const n = p.name.toLowerCase();
    return (
      (p.rating >= 4.0 || p.rating === 0) &&
      p.name.length > 10 &&
      n.includes('sock') &&
      !EXCLUDE_WORDS.some(w => n.includes(w))
    );
  });

  console.log(`✅ עברו סינון איכות: ${unique.length} מוצרים\n`);

  // ניקוד ומיון
  const scored = unique
    .map(p => ({ ...p, ...scoreProduct(p, trendKeywords) }))
    .sort((a, b) => b.score - a.score);

  // שליפת פרטים עמוקים מ-CJ לטופ 15
  console.log('🔬 שולף פרטי מוצר עמוקים מ-CJ...');
  const top20 = scored.slice(0, 20);
  if (cjToken) {
    const cjTop = top20.filter(p => p.source === 'CJ').slice(0, 12);
    for (const p of cjTop) {
      const detail = await getCJProductDetail(cjToken, p.pid);
      if (detail) {
        if (detail.reviewCount) p.reviews = Math.max(p.reviews, parseInt(detail.reviewCount) || 0);
        if (detail.productRating) p.rating = Math.max(p.rating, parseFloat(detail.productRating) || 0);
        p.variants = detail.variants?.length || 1;
      }
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // TOP 10
  const top10 = scored.slice(0, 10);
  console.log('\n🏆 TOP 10:');
  top10.forEach((p, i) => {
    const pr = suggestRetailPrice(p);
    console.log(`${i+1}. [${p.score}/100] [${p.source}] ${p.name}`);
    console.log(`   ⭐${p.rating} | 📦${p.orders.toLocaleString()} | $${p.supplierPrice}→$${pr.retail} (${pr.marginPct}%) | ${p.category}`);
  });

  // שמירה
  const date = new Date().toLocaleDateString('he-IL');
  const stats = { totalScanned: allProducts.length, platforms: Object.values(platformStats).filter(v => v > 0).length, totalPassed: unique.length, platformStats };
  const output = { runDate: new Date().toISOString(), ...stats, top10, top20 };
  fs.writeFileSync('./last_run.json', JSON.stringify(output, null, 2));
  console.log('\n✅ last_run.json נשמר');

  // מייל HTML
  if (process.env.GMAIL_APP_PASSWORD) {
    try {
      const html = buildHTMLEmail(top10, stats, date);
      await emailTransporter.sendMail({
        from: '"SockAcademy A1 Agent" <sockacademy.store@gmail.com>',
        to: 'guyoved102@gmail.com',
        subject: `🧦 SockAcademy — דוח שבועי ${date} | ${stats.totalScanned} מוצרים נסרקו`,
        html,
        text: `SockAcademy דוח שבועי ${date}\n\nTOP 10:\n` +
          top10.map((p, i) => `${i+1}. [${p.score}/100] ${p.name} — ${p.url}`).join('\n'),
      });
      console.log('✅ מייל HTML נשלח לגיא');
    } catch (e) {
      console.log(`⚠️  שגיאת מייל: ${e.message}`);
    }
  }

  // Google Sheets — כתיבה ישירה ל-A1_Products
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_SHEET_ID) {
    try {
      const { GoogleSpreadsheet } = require('google-spreadsheet');
      const { JWT } = require('google-auth-library');
      const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new JWT({ email: sa.client_email, key: sa.private_key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
      const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
      await doc.loadInfo();

      let sheet = doc.sheetsByTitle['A1_Products'];
      if (!sheet) {
        sheet = await doc.addSheet({ title: 'A1_Products', headerValues: [
          'Run Date','Product Name','CJ PID','Category','Materials','Platform',
          'Rating','Orders','Supplier Price','Retail Price','Score',
          'Image URL','Product URL','Status','Upload Status','Shopify ID','Shopify URL','Upload Date'
        ]});
      }

      const runDate = new Date().toLocaleDateString('he-IL');
      const rows = top10.map(p => {
        const pr = suggestRetailPrice(p);
        return {
          'Run Date': runDate,
          'Product Name': p.name,
          'CJ PID': p.pid || '',
          'Category': p.category,
          'Materials': p.materials?.join(', ') || '',
          'Platform': p.source,
          'Rating': p.rating,
          'Orders': p.orders,
          'Supplier Price': p.supplierPrice,
          'Retail Price': pr.retail,
          'Score': p.score,
          'Image URL': p.imageUrl || '',
          'Product URL': p.url || '',
          'Status': 'Pending',
        };
      });
      await sheet.addRows(rows);
      console.log(`✅ ${rows.length} מוצרים נכתבו ל-Google Sheets (A1_Products)`);
    } catch (e) {
      console.log(`⚠️  Google Sheets: ${e.message}`);
    }
  }

  // Make.com webhook (legacy — אופציונלי)
  const webhookUrl = process.env.MAKE_A1_WEBHOOK;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(output) });
      console.log('✅ נשלח ל-Make.com');
    } catch (e) { console.log(`⚠️  Webhook: ${e.message}`); }
  }

  console.log('\n🎯 A1 v2.0 הושלם!');
}

run().catch(err => {
  console.error('❌ A1 Error:', err.message);
  process.exit(1);
});
