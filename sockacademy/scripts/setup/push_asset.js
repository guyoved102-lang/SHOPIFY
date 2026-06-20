const fs = require('fs');
const path = require('path');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || '11eqwi-ji.myshopify.com';
const SHOPIFY_TOKEN = process.env.SHOPIFY_MASTER_TOKEN;
const THEME_ID = process.env.SHOPIFY_THEME_ID || '151789863110';

async function pushAsset(key, filePath) {
  const value = fs.readFileSync(filePath, 'utf8');
  const body = JSON.stringify({ asset: { key, value } });

  const res = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/themes/${THEME_ID}/assets.json`,
    {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body,
    }
  );

  const data = await res.json();
  if (data.errors) { console.error('Error:', data.errors); process.exit(1); }
  console.log(`✅ ${data.asset.key} — ${data.asset.updated_at}`);
}

pushAsset('sections/hero.liquid', path.join(__dirname, 'sections/hero.liquid'))
  .catch(e => { console.error(e); process.exit(1); });
