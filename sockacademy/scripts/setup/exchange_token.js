require('dotenv').config({ path: '../../.env' });
const https = require('https');

const SHOP = '11eqwi-ji.myshopify.com';
const CLIENT_ID = '8683bf599793a0dc1060b9d8715b5451';
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

if (!CLIENT_SECRET) {
  console.error('Missing SHOPIFY_CLIENT_SECRET in sockacademy/.env');
  process.exit(1);
}

// Get the code from command line argument
const code = process.argv[2];
if (!code) {
  console.error('Usage: node exchange_token.js <code>');
  process.exit(1);
}

const postData = JSON.stringify({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  code: code,
});

const options = {
  hostname: SHOP,
  path: '/admin/oauth/access_token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP status:', res.statusCode);
    let result;
    try {
      result = JSON.parse(data);
    } catch (e) {
      console.error('Response was not JSON. Raw body (first 500 chars):');
      console.error(data.slice(0, 500));
      return;
    }
    if (result.access_token) {
      console.log('\n✅ NEW TOKEN:');
      console.log(result.access_token);
      console.log('\nScope:', result.scope);
    } else {
      console.error('Error:', data);
    }
  });
});

req.on('error', e => console.error(e));
req.write(postData);
req.end();
