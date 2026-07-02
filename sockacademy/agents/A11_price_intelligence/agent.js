/**
 * SockAcademy A11 — Price Intelligence Agent
 *
 * SYSTEM PROMPT:
 * You are A11, a weekly price intelligence agent for SockAcademy — a premium sock brand.
 * Your mission: monitor competitor single-pair pricing across 5 premium sock brands
 * (Bombas, Darn Tough, Stance, Smartwool, Feetures) across 3 product categories
 * (Merino Wool, Performance, Tactical). You collect prices, build a market summary,
 * write all data to Google Sheets (A11_Prices tab), and send a weekly email digest.
 * You NEVER modify SockAcademy's own prices — reporting only. You run every Wednesday
 * at 08:00 Israel time via GitHub Actions. Failed fetches are logged but never fatal.
 *
 * Schedule: Every Wednesday 06:00 UTC = 08:00 Israel time
 * Output: Google Sheets tab "A11_Prices" + email digest
 * Mode: DRY_RUN=true for safe testing (simulated prices, no writes)
 */

require('dotenv').config({ path: '../../.env' });

const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');

const DRY_RUN = process.env.DRY_RUN === 'true';
const GMAIL_USER  = 'sockacademy.store@gmail.com';
const ALERT_EMAIL = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, errorMessage = '', metadata = {}) {
  try {
    const run_status = status.toLowerCase() === 'failed' ? 'failure' : status.toLowerCase();
    await supabase.from('agent_health_log').insert({
      agent_id:      'A11',
      agent_name:    'Price Intelligence',
      run_status,
      error_message: errorMessage || null,
      metadata,
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}

async function sendErrorAlert(errorMessage) {
  if (!process.env.GMAIL_APP_PASSWORD) return;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: '"SockAcademy Agents" <sockacademy.store@gmail.com>',
    to: ALERT_EMAIL,
    subject: '🚨 A11 Price Intelligence FAILED — action needed',
    html: `<div style="font-family:monospace"><h2>🚨 A11 Failed</h2><p><strong>Time:</strong> ${new Date().toISOString()}</p><pre style="background:#f5f5f5;padding:12px;border-radius:4px">${errorMessage}</pre></div>`,
  }).catch(e => console.error('Alert email failed:', e.message));
}

// SockAcademy price floors — for positioning comparison
const SA_PRICE_FLOORS = {
  'Merino Wool': 35,
  'Performance': 18,
  'Tactical': 35,
};

// --- COMPETITOR CONFIG ---
// priceSelectors: multiple fallbacks in priority order — sites change HTML
// NOTE: If a brand returns "FETCH_FAILED", update the selector for that brand's current HTML
const COMPETITORS = {
  Bombas: {
    priceSelectors: [
      '[data-testid="product-price"]',
      '.ProductPrice',
      '.product-price',
      '.price__current',
      '.price',
    ],
    products: [
      {
        name: "Men's Merino Wool Calf Sock",
        url: 'https://bombas.com/products/mens-merino-wool-calf-sock',
        category: 'Merino Wool',
      },
      {
        name: "Men's Performance Ankle Sock",
        url: 'https://bombas.com/products/mens-running-ankle-sock',
        category: 'Performance',
      },
      {
        name: "Men's Hiking Calf Sock",
        url: 'https://bombas.com/products/mens-hiking-calf-sock',
        category: 'Tactical',
      },
    ],
  },

  'Darn Tough': {
    priceSelectors: [
      '[data-product-price]',
      '.product__price .money',
      '.price .money',
      '.price',
    ],
    products: [
      {
        name: "Men's Hiker Micro Crew Midweight",
        url: 'https://darntough.com/products/mens-hiker-micro-crew-midweight',
        category: 'Merino Wool',
      },
      {
        name: "Men's Run No Show Tab Ultra-Lightweight",
        url: 'https://darntough.com/products/mens-run-no-show-tab-ultra-lightweight',
        category: 'Performance',
      },
      {
        name: "Men's Boot Full Cushion Sock",
        url: 'https://darntough.com/products/mens-boot-full-cushion',
        category: 'Tactical',
      },
    ],
  },

  Stance: {
    priceSelectors: [
      '.pdp-price__amount',
      '.product-price',
      '[itemprop="price"]',
      '.price__current',
      '.price',
    ],
    products: [
      {
        name: "Men's Fusion Run Crew",
        url: 'https://www.stance.com/products/fusion-run-crew',
        category: 'Performance',
      },
      {
        name: "Men's Icon Crew",
        url: 'https://www.stance.com/products/icon-crew',
        category: 'Performance',
      },
      {
        name: "Men's Trail Crew",
        url: 'https://www.stance.com/products/trail-crew',
        category: 'Tactical',
      },
    ],
  },

  Smartwool: {
    priceSelectors: [
      '.swc-price',
      '.product-price',
      '[data-price]',
      '.price',
    ],
    products: [
      {
        name: "Men's Hike Classic Full Cushion Crew",
        url: 'https://www.smartwool.com/products/mens-hike-classic-edition-full-cushion-crew-socks',
        category: 'Merino Wool',
      },
      {
        name: "Men's Run Targeted Cushion Low Ankle",
        url: 'https://www.smartwool.com/products/mens-run-targeted-cushion-low-ankle-socks',
        category: 'Performance',
      },
      {
        name: "Men's Hike Heavy Crew",
        url: 'https://www.smartwool.com/products/mens-hike-heavy-crew-socks',
        category: 'Tactical',
      },
    ],
  },

  Feetures: {
    priceSelectors: [
      '.product__price',
      '.regular-price',
      '[data-product-price]',
      '.price',
    ],
    products: [
      {
        name: "Elite Merino+ Light Cushion No Show Tab",
        url: 'https://feetures.com/products/elite-merino-light-cushion-no-show-tab-single',
        category: 'Merino Wool',
      },
      {
        name: "Elite Max Cushion No Show Tab",
        url: 'https://feetures.com/products/elite-max-cushion-no-show-tab',
        category: 'Performance',
      },
      {
        name: "Trail Max Cushion Quarter",
        url: 'https://feetures.com/products/trail-max-cushion-quarter',
        category: 'Tactical',
      },
    ],
  },
};

const HTTP_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Cache-Control': 'no-cache',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePrice(text) {
  if (!text) return null;
  const match = text.replace(/,/g, '').match(/\$?(\d+(?:\.\d{1,2})?)/);
  const price = match ? parseFloat(match[1]) : null;
  return price && price > 5 && price < 500 ? price : null; // sanity range
}

async function fetchPrice(url, selectors) {
  try {
    const response = await axios.get(url, {
      headers: HTTP_HEADERS,
      timeout: 15000,
    });
    const $ = cheerio.load(response.data);

    // Try CSS selectors in priority order
    for (const selector of selectors) {
      const el = $(selector).first();
      if (el.length) {
        const price = parsePrice(el.text().trim());
        if (price) return price;
      }
    }

    // Fallback: JSON-LD structured data
    let ldPrice = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        const candidate =
          data?.offers?.price ||
          data?.offers?.[0]?.price ||
          data?.price;
        if (candidate) ldPrice = parseFloat(candidate);
      } catch {}
    });
    if (ldPrice) return ldPrice;

    return null;
  } catch (err) {
    console.warn(`  ⚠️  Fetch failed: ${err.message}`);
    return null;
  }
}

async function scoutAllCompetitors() {
  const results = [];
  const timestamp = new Date().toISOString();

  for (const [brand, config] of Object.entries(COMPETITORS)) {
    console.log(`\n📊 ${brand}`);

    for (const product of config.products) {
      process.stdout.write(`  → ${product.name} ... `);

      if (DRY_RUN) {
        const mock = parseFloat((18 + Math.random() * 30).toFixed(2));
        results.push({
          timestamp,
          brand,
          product_name: product.name,
          category: product.category,
          price_usd: mock,
          sa_floor: SA_PRICE_FLOORS[product.category],
          url: product.url,
          status: 'DRY_RUN',
        });
        console.log(`$${mock} [DRY_RUN]`);
        continue;
      }

      await sleep(1800); // respectful crawl delay between products
      const price = await fetchPrice(product.url, config.priceSelectors);

      results.push({
        timestamp,
        brand,
        product_name: product.name,
        category: product.category,
        price_usd: price,
        sa_floor: SA_PRICE_FLOORS[product.category],
        url: product.url,
        status: price ? 'OK' : 'FETCH_FAILED',
      });

      console.log(price ? `$${price} ✅` : 'not found ❌');
    }

    if (!DRY_RUN) await sleep(2500); // extra delay between brands
  }

  return results;
}

async function buildPriceTrends(supabase, results) {
  try {
    const weekAgo    = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('competitor_prices')
      .select('brand, category, price_usd')
      .gte('timestamp', twoWeeksAgo)
      .lt('timestamp', weekAgo)
      .not('price_usd', 'is', null);

    const prevMap = {};
    for (const row of (data || [])) {
      const key = `${row.brand}|${row.category}`;
      if (!prevMap[key]) prevMap[key] = [];
      prevMap[key].push(row.price_usd);
    }

    const currentMap = {};
    for (const r of results) {
      if (!r.price_usd) continue;
      const key = `${r.brand}|${r.category}`;
      if (!currentMap[key]) currentMap[key] = [];
      currentMap[key].push(r.price_usd);
    }

    const trends = [];
    for (const [key, prices] of Object.entries(currentMap)) {
      const [brand, category] = key.split('|');
      const currAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const prevPrices = prevMap[key];
      if (!prevPrices || !prevPrices.length) {
        trends.push({ brand, category, currAvg: parseFloat(currAvg.toFixed(2)), prevAvg: null, pctChange: null, direction: '—' });
        continue;
      }
      const prevAvg = prevPrices.reduce((a, b) => a + b, 0) / prevPrices.length;
      const pctChange = ((currAvg - prevAvg) / prevAvg) * 100;
      const direction = pctChange > 2 ? '↑' : pctChange < -2 ? '↓' : '→';
      trends.push({
        brand, category,
        currAvg: parseFloat(currAvg.toFixed(2)),
        prevAvg: parseFloat(prevAvg.toFixed(2)),
        pctChange: parseFloat(pctChange.toFixed(1)),
        direction,
      });
    }
    return trends;
  } catch { return []; }
}

function buildMarketSummary(results) {
  const byCategory = {};

  for (const item of results) {
    if (!item.price_usd) continue;
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  return Object.entries(byCategory).map(([category, items]) => {
    const prices = items.map((i) => i.price_usd);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2));
    const saFloor = SA_PRICE_FLOORS[category] || 0;
    // BELOW MARKET = SA floor is lower than competitor average (good — we're cheaper)
    // AT/ABOVE MARKET = SA floor >= competitor avg (we're at or above market)
    const gap = (saFloor - avg).toFixed(2);
    const positioning = saFloor < avg ? 'BELOW MARKET' : saFloor > avg ? 'ABOVE MARKET' : 'AT MARKET';

    return { category, min, max, avg, saFloor, gap: parseFloat(gap), positioning, count: items.length };
  });
}

async function writeToSupabase(results) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log('⚠️  Supabase credentials missing — skipping write');
    return;
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const rows = results.map((r) => ({
    timestamp:    r.timestamp,
    brand:        r.brand,
    product_name: r.product_name,
    category:     r.category,
    price_usd:    r.price_usd ?? null,
    sa_floor:     r.sa_floor ?? null,
    delta_vs_sa:  r.price_usd && r.sa_floor
      ? parseFloat((r.price_usd - r.sa_floor).toFixed(2))
      : null,
    url:    r.url,
    status: r.status,
  }));

  const { error } = await supabase.from('competitor_prices').insert(rows);
  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  console.log(`\n✅ Supabase: ${results.length} rows → competitor_prices`);
}

function buildEmailHtml(results, summary, dateStr, trends = []) {
  const successCount = results.filter((r) => r.price_usd).length;
  const failCount = results.filter((r) => !r.price_usd && r.status !== 'DRY_RUN').length;

  const summaryRows = summary
    .map(
      (s) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;color:#F0EDE6;font-family:Arial,sans-serif;font-size:13px;">${s.category}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;color:#C9A84C;font-family:Arial,sans-serif;font-size:13px;text-align:center;">$${s.min}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;color:#C9A84C;font-family:Arial,sans-serif;font-size:13px;text-align:center;">$${s.max}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;color:#C9A84C;font-family:Arial,sans-serif;font-size:13px;text-align:center;">$${s.avg}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;color:#F0EDE6;font-family:Arial,sans-serif;font-size:13px;text-align:center;">$${s.saFloor}+</td>
      <td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;font-family:Arial,sans-serif;font-size:13px;text-align:center;font-weight:600;color:${
        s.positioning === 'BELOW MARKET' ? '#4CAF50' : s.positioning === 'ABOVE MARKET' ? '#ff6b6b' : '#888'
      };">${s.positioning}</td>
    </tr>`
    )
    .join('');

  const detailRows = results
    .filter((r) => r.price_usd)
    .map(
      (r) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #1e1e1e;color:#F0EDE6;font-family:Arial,sans-serif;font-size:12px;">${r.brand}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e1e1e;color:#888;font-family:Arial,sans-serif;font-size:12px;">${r.product_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e1e1e;color:#888;font-family:Arial,sans-serif;font-size:12px;">${r.category}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e1e1e;color:#C9A84C;font-family:Arial,sans-serif;font-size:12px;text-align:right;font-weight:700;">$${r.price_usd}</td>
    </tr>`
    )
    .join('');

  const failedBrands = results
    .filter((r) => r.status === 'FETCH_FAILED')
    .map((r) => r.brand);
  const uniqueFailed = [...new Set(failedBrands)];

  const trendsBlock = trends.length ? `
  <tr><td style="padding:16px 40px 8px;">
    <p style="margin:0 0 12px;font-size:11px;color:#C9A84C;letter-spacing:2px;text-transform:uppercase;">WEEK-OVER-WEEK PRICE TRENDS</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:6px;overflow:hidden;">
      <tr style="background:#0d0d0d;">
        <th style="padding:8px 12px;text-align:left;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Brand</th>
        <th style="padding:8px 12px;text-align:left;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Category</th>
        <th style="padding:8px 12px;text-align:right;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">This Week</th>
        <th style="padding:8px 12px;text-align:right;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Last Week</th>
        <th style="padding:8px 12px;text-align:center;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Change</th>
      </tr>
      ${trends.map(t => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1e1e1e;color:#F0EDE6;font-family:Arial,sans-serif;font-size:12px;">${t.brand}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e1e1e;color:#888;font-family:Arial,sans-serif;font-size:12px;">${t.category}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e1e1e;color:#C9A84C;font-family:Arial,sans-serif;font-size:12px;text-align:right;">$${t.currAvg}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e1e1e;color:#555;font-family:Arial,sans-serif;font-size:12px;text-align:right;">${t.prevAvg ? '$' + t.prevAvg : '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e1e1e;font-family:Arial,sans-serif;font-size:13px;text-align:center;font-weight:700;color:${t.direction === '↑' ? '#ff6b6b' : t.direction === '↓' ? '#4CAF50' : '#888'};">${t.pctChange !== null ? (t.pctChange > 0 ? '+' : '') + t.pctChange + '% ' : ''}${t.direction}</td>
      </tr>`).join('')}
    </table>
    <p style="margin:8px 0 0;font-size:11px;color:#555;">↑ competitor raised prices (SA gains ground). ↓ competitor cut prices (review positioning). → stable.</p>
  </td></tr>` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#111;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111;min-height:100vh;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:#0d0d0d;padding:32px 40px;border-bottom:2px solid #C9A84C;">
    <p style="margin:0;font-family:Georgia,serif;font-size:22px;color:#C9A84C;letter-spacing:3px;text-transform:uppercase;">SOCKACADEMY</p>
    <p style="margin:6px 0 0;font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;">A11 · Weekly Price Intelligence</p>
  </td></tr>

  <!-- Meta -->
  <tr><td style="padding:24px 40px 8px;">
    <p style="margin:0;font-size:13px;color:#888;">${dateStr} &nbsp;·&nbsp; ${successCount}/${results.length} prices collected${failCount > 0 ? ` &nbsp;·&nbsp; ⚠️ ${failCount} failed` : ''}</p>
  </td></tr>

  <!-- Market Summary -->
  <tr><td style="padding:16px 40px 8px;">
    <p style="margin:0 0 12px;font-size:11px;color:#C9A84C;letter-spacing:2px;text-transform:uppercase;">MARKET SUMMARY BY CATEGORY</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:6px;overflow:hidden;">
      <tr style="background:#0d0d0d;">
        <th style="padding:10px 16px;text-align:left;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Category</th>
        <th style="padding:10px 16px;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Low</th>
        <th style="padding:10px 16px;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">High</th>
        <th style="padding:10px 16px;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Avg</th>
        <th style="padding:10px 16px;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">SA Floor</th>
        <th style="padding:10px 16px;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Position</th>
      </tr>
      ${summaryRows}
    </table>
    <p style="margin:8px 0 0;font-size:11px;color:#555;">BELOW MARKET = SA floor is cheaper than competitors (opportunity). ABOVE MARKET = competitors charge less (review pricing).</p>
  </td></tr>

  <!-- Detail Prices -->
  <tr><td style="padding:16px 40px 24px;">
    <p style="margin:0 0 12px;font-size:11px;color:#C9A84C;letter-spacing:2px;text-transform:uppercase;">ALL PRODUCT PRICES</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:6px;overflow:hidden;">
      <tr style="background:#0d0d0d;">
        <th style="padding:8px 12px;text-align:left;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Brand</th>
        <th style="padding:8px 12px;text-align:left;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Product</th>
        <th style="padding:8px 12px;text-align:left;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Category</th>
        <th style="padding:8px 12px;text-align:right;font-size:10px;color:#555;letter-spacing:1px;font-weight:400;text-transform:uppercase;">Price</th>
      </tr>
      ${detailRows}
    </table>
  </td></tr>

  ${trendsBlock}

  ${
    uniqueFailed.length > 0
      ? `<tr><td style="padding:0 40px 20px;">
    <p style="margin:0;font-size:11px;color:#888;">⚠️ Fetch failed (selectors may need update): ${uniqueFailed.join(', ')}</p>
  </td></tr>`
      : ''
  }

  <!-- Footer -->
  <tr><td style="background:#0d0d0d;padding:20px 40px;border-top:1px solid #2a2a2a;">
    <p style="margin:0;font-size:11px;color:#444;text-align:center;">SOCKACADEMY A11 · Price Intelligence · Full data → Google Sheets A11_Prices tab</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendEmailDigest(results, summary, trends = []) {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log('⚠️  Email env not set — skipping');
    return;
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  const successCount = results.filter((r) => r.price_usd).length;

  await transporter.sendMail({
    from: `"SockAcademy A11" <${GMAIL_USER}>`,
    to: ALERT_EMAIL,
    subject: `[A11] Price Intel · ${dateStr} · ${successCount}/${results.length} prices`,
    html: buildEmailHtml(results, summary, dateStr, trends),
  });

  console.log(`✅ Email digest sent → ${ALERT_EMAIL}`);
}

async function main() {
  console.log('\n🧦 SockAcademy A11 — Price Intelligence Agent');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(DRY_RUN ? '🔬 DRY_RUN mode — simulated prices' : '🌐 LIVE — fetching real prices');
  console.log(`📋 Competitors: ${Object.keys(COMPETITORS).join(', ')}`);

  const supabase = getSupabase();
  await logHealth(supabase, 'RUNNING');

  try {
    const results = await scoutAllCompetitors();

    // Gap 3: alert when >50% of competitor fetches fail
    const liveResults = results.filter(r => r.status !== 'DRY_RUN');
    const failedCount = liveResults.filter(r => !r.price_usd).length;
    if (liveResults.length > 0 && failedCount / liveResults.length > 0.5) {
      const msg = `High fetch failure rate: ${failedCount}/${liveResults.length} products failed (${((failedCount / liveResults.length) * 100).toFixed(0)}%)`;
      console.warn(`⚠️  ${msg}`);
      await sendErrorAlert(msg);
    }

    const summary = buildMarketSummary(results);

    console.log('\n📊 Market Summary:');
    for (const s of summary) {
      console.log(
        `  ${s.category}: $${s.min}–$${s.max} | avg $${s.avg} | SA floor $${s.saFloor}+ | ${s.positioning}`
      );
    }

    // Gap 2: price trend analysis vs previous week
    const trends = DRY_RUN ? [] : await buildPriceTrends(supabase, results);
    if (trends.length) {
      console.log('\n📈 Price Trends (week-over-week):');
      for (const t of trends) {
        console.log(`  ${t.direction} ${t.brand} ${t.category}: $${t.currAvg}${t.prevAvg ? ` (prev $${t.prevAvg}, ${t.pctChange > 0 ? '+' : ''}${t.pctChange}%)` : ' (no prior data)'}`);
      }
    }

    if (!DRY_RUN) {
      await writeToSupabase(results);
      await sendEmailDigest(results, summary, trends);
    } else {
      console.log('\n🔬 DRY_RUN: skipping Sheets + email');
      console.log('Sample output:', JSON.stringify(results.slice(0, 2), null, 2));
    }

    const okCount = results.filter((r) => r.price_usd || r.status === 'DRY_RUN').length;
    console.log(`\n✅ A11 done — ${okCount}/${results.length} products processed`);
    await logHealth(supabase, 'SUCCESS', '', { total: results.length, ok: okCount, trends: trends.length });
  } catch (err) {
    console.error('❌ A11 fatal error:', err.message);
    await logHealth(supabase, 'ERROR', err.message);
    await sendErrorAlert(err.message);
    await notifyTelegram(heTelegramMsg('A11 Price Intelligence', '🚨 כשל קריטי!',
      `ה-agent נכשל בהרצה. נדרשת בדיקה דחופה.\nשגיאה: <code>${err.message}</code>`));
    process.exit(1);
  }
}

main();
