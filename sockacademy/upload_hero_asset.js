const fs = require('fs');
const path = require('path');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || '11eqwi-ji.myshopify.com';
const SHOPIFY_TOKEN = process.env.SHOPIFY_MASTER_TOKEN;
const THEME_ID = process.env.SHOPIFY_THEME_ID || '151789863110';
const IMAGE_PATH = path.join(__dirname, 'hero_banner.png');
const ASSET_KEY = 'assets/sa-hero-banner.png';

async function uploadHeroAsset() {
  const buffer = fs.readFileSync(IMAGE_PATH);
  const attachment = buffer.toString('base64');
  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);

  console.log(`Uploading ${sizeMB} MB → theme asset: ${ASSET_KEY}`);

  const res = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/themes/${THEME_ID}/assets.json`,
    {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        asset: {
          key: ASSET_KEY,
          attachment,
        },
      }),
    }
  );

  const data = await res.json();
  if (data.errors) {
    console.error('Error:', JSON.stringify(data.errors));
    process.exit(1);
  }

  console.log('✅ Uploaded successfully');
  console.log('Key:', data.asset.key);
  console.log('Public URL:', data.asset.public_url);
  console.log('Updated at:', data.asset.updated_at);
}

uploadHeroAsset().catch(e => { console.error(e); process.exit(1); });
