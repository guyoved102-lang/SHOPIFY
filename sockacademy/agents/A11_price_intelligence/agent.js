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
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const DRY_RUN = process.env.DRY_RUN === 'true';
const GMAIL_USER = 'guyoved102@gmail.com';
const ALERT_EMAIL = 'guyoved102@gmail.com';
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

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

async function writeToSheets(results) {
  if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    console.log('⚠️  Sheets env not set — skipping write');
    return;
  }

  const svc = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new JWT({
    email: svc.client_email,
    key: svc.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SHEET_ID, auth);
  await doc.loadInfo();

  let sheet = doc.sheetsByTitle['A11_Prices'];
  if (!sheet) {
    sheet = await doc.addSheet({ title: 'A11_Prices' });
  }

  const HEADERS = [
    'Timestamp',
    'Brand',
    'Product Name',
    'Category',
    'Price (USD)',
    'SA Floor (USD)',
    'Δ vs SA',
    'URL',
    'Status',
  ];

  await sheet.setHeaderRow(HEADERS);

  const rows = results.map((r) => ({
    'Timestamp': r.timestamp,
    'Brand': r.brand,
    'Product Name': r.product_name,
    'Category': r.category,
    'Price (USD)': r.price_usd ?? '',
    'SA Floor (USD)': r.sa_floor ?? '',
    'Δ vs SA': r.price_usd && r.sa_floor ? (r.price_usd - r.sa_floor).toFixed(2) : '',
    'URL': r.url,
    'Status': r.status,
  }));

  await sheet.addRows(rows);
  console.log(`\n✅ Sheets: ${results.length} rows → A11_Prices tab`);
}

function buildEmailHtml(results, summary, dateStr) {
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

async function sendEmailDigest(results, summary) {
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
    html: buildEmailHtml(results, summary, dateStr),
  });

  console.log(`✅ Email digest sent → ${ALERT_EMAIL}`);
}

async function main() {
  console.log('\n🧦 SockAcademy A11 — Price Intelligence Agent');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(DRY_RUN ? '🔬 DRY_RUN mode — simulated prices' : '🌐 LIVE — fetching real prices');
  console.log(`📋 Competitors: ${Object.keys(COMPETITORS).join(', ')}`);

  try {
    const results = await scoutAllCompetitors();

    const summary = buildMarketSummary(results);

    console.log('\n📊 Market Summary:');
    for (const s of summary) {
      console.log(
        `  ${s.category}: $${s.min}–$${s.max} | avg $${s.avg} | SA floor $${s.saFloor}+ | ${s.positioning}`
      );
    }

    if (!DRY_RUN) {
      await writeToSheets(results);
      await sendEmailDigest(results, summary);
    } else {
      console.log('\n🔬 DRY_RUN: skipping Sheets + email');
      console.log('Sample output:', JSON.stringify(results.slice(0, 2), null, 2));
    }

    const okCount = results.filter((r) => r.price_usd || r.status === 'DRY_RUN').length;
    console.log(`\n✅ A11 done — ${okCount}/${results.length} products processed`);
  } catch (err) {
    console.error('❌ A11 fatal error:', err.message);
    process.exit(1);
  }
}

main();
