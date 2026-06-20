const https = require('https');

const SHOP = '11eqwi-ji.myshopify.com';
const TOKEN = 'shpat_process.env.SHOPIFY_CLIENT_SECRET';

const options = {
  hostname: SHOP,
  path: '/admin/api/2024-01/shop.json',
  method: 'GET',
  headers: {
    'X-Shopify-Access-Token': TOKEN,
    'Content-Type': 'application/json',
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      const shop = JSON.parse(data).shop;
      console.log('Authentication successful!');
      console.log(`Shop: ${shop.name}`);
      console.log(`Domain: ${shop.domain}`);
      console.log(`Plan: ${shop.plan_name}`);
      console.log(`Email: ${shop.email}`);
    } else {
      console.error(`HTTP ${res.statusCode}: ${data}`);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.end();