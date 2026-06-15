const https = require('https');
const querystring = require('querystring');

const SHOP = '11eqwi-ji.myshopify.com';
const CLIENT_ID = '877bb86b64dae4afe6b6537bcf455d10';
const CLIENT_SECRET = 'process.env.SHOPIFY_CLIENT_SECRET';

// Get the code from command line argument
const code = process.argv[2];
if (!code) {
  console.error('Usage: node exchange_token.js <code>');
  process.exit(1);
}

const postData = querystring.stringify({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  code: code,
});

const options = {
  hostname: SHOP,
  path: '/admin/oauth/access_token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
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
