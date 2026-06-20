const token = 'process.env.SHOPIFY_MASTER_TOKEN';
const store = '11eqwi-ji.myshopify.com';

fetch(`https://${store}/admin/api/2024-01/domains.json`, {
  method: 'POST',
  headers: {
    'X-Shopify-Access-Token': token,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({ domain: { host: 'sockacademy.store' } })
})
  .then(async r => {
    const text = await r.text();
    console.log('Status:', r.status);
    console.log('Body:', text);
  })
  .catch(e => console.error(e));
