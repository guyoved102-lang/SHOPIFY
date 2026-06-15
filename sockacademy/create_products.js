const TOKEN = 'process.env.SHOPIFY_MASTER_TOKEN';
const STORE = '11eqwi-ji.myshopify.com';
const BASE = `https://${STORE}/admin/api/2024-01`;
const HEADERS = {
  'X-Shopify-Access-Token': TOKEN,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

const SIZES = ['S (EU 36-38)', 'M (EU 39-41)', 'L (EU 42-44)', 'XL (EU 45-47)'];

function variants(price, compare) {
  return SIZES.map(size => ({
    option1: size,
    price: String(price),
    compare_at_price: String(compare),
    inventory_management: 'shopify',
    inventory_quantity: 50,
    requires_shipping: true,
    taxable: true,
  }));
}

const PRODUCTS = [
  {
    title: 'Merino Wool Crew Socks',
    body_html: `<p><strong>The benchmark of premium socks.</strong></p>
<p>Crafted from 85% Merino wool sourced from New Zealand, these crew socks deliver natural temperature regulation — warm in winter, cool in summer. The fine-gauge knit ensures a smooth profile inside dress shoes, while the reinforced heel and toe extend wear life well beyond conventional socks.</p>
<ul>
  <li>85% Merino Wool, 12% Nylon, 3% Elastane</li>
  <li>Anti-odour, moisture-wicking, hypoallergenic</li>
  <li>Reinforced heel &amp; toe for durability</li>
  <li>Comfortable mid-calf height</li>
  <li>Machine washable at 30°C</li>
</ul>
<p><em>SockAcademy standard: every pair passes a 48-hour wear test before earning a place in our range.</em></p>`,
    vendor: 'SockAcademy',
    product_type: 'Crew Socks',
    tags: 'merino, wool, crew, premium, bestseller',
    options: [{ name: 'Size', values: SIZES }],
    variants: variants(34.99, 49.99),
    status: 'active',
  },
  {
    title: 'No-Show Performance Socks',
    body_html: `<p><strong>Invisible. Comfortable. Sweat-proof.</strong></p>
<p>Engineered for low-cut and loafer-style footwear, these no-show socks stay perfectly in place with a silicone heel grip — no slipping, no bunching. The Coolmax® fibre blend moves moisture away from the skin 4x faster than cotton, keeping you dry through the longest days.</p>
<ul>
  <li>60% Coolmax® Polyester, 32% Cotton, 8% Elastane</li>
  <li>Silicone anti-slip heel band</li>
  <li>Ultra-low cut — invisible in all shoe types</li>
  <li>Flat toe seam for zero irritation</li>
  <li>Available in White, Black, Nude (pack of 3)</li>
</ul>`,
    vendor: 'SockAcademy',
    product_type: 'No-Show Socks',
    tags: 'no-show, ankle, coolmax, invisible, sport',
    options: [{ name: 'Size', values: SIZES }],
    variants: variants(24.99, 34.99),
    status: 'active',
  },
  {
    title: 'Tactical Hiking Socks — Thermolite',
    body_html: `<p><strong>Built for terrain. Tested on trail.</strong></p>
<p>Whether you're on a day hike or a multi-day trek, these socks protect where it counts. Thermolite® insulation keeps feet warm even when wet, while the zoned cushioning system absorbs impact on the heel and forefoot. The anatomical left/right construction eliminates seam pressure on long distances.</p>
<ul>
  <li>45% Thermolite® Polyester, 40% Merino Wool, 10% Nylon, 5% Elastane</li>
  <li>Anatomical left/right fit</li>
  <li>Zoned cushioning: heel, arch, and forefoot</li>
  <li>Over-the-calf height for full lower-leg coverage</li>
  <li>Moisture-wicking and quick-dry technology</li>
</ul>`,
    vendor: 'SockAcademy',
    product_type: 'Hiking Socks',
    tags: 'hiking, tactical, thermolite, outdoor, merino',
    options: [{ name: 'Size', values: SIZES }],
    variants: variants(44.99, 64.99),
    status: 'active',
  },
  {
    title: 'Egyptian Cotton Dress Socks',
    body_html: `<p><strong>The sock that completes the suit.</strong></p>
<p>Woven from long-staple Egyptian cotton with a fine 200-needle gauge, these dress socks have the silky hand-feel and lustrous sheen that separate serious dressers from the rest. The over-the-calf design holds its position without elastic marks, even after 10 hours at a desk.</p>
<ul>
  <li>80% Egyptian Cotton, 15% Nylon, 5% Elastane</li>
  <li>200-needle fine-gauge knit</li>
  <li>Over-the-calf stay-up design</li>
  <li>Reinforced sole for long-wearing durability</li>
  <li>Available in Charcoal, Navy, Black, Burgundy</li>
</ul>
<p><em>Pairs perfectly with Oxford shoes, loafers, and Chelsea boots.</em></p>`,
    vendor: 'SockAcademy',
    product_type: 'Dress Socks',
    tags: 'formal, dress, egyptian-cotton, office, premium',
    options: [{ name: 'Size', values: SIZES }],
    variants: variants(29.99, 44.99),
    status: 'active',
  },
  {
    title: 'SockAcademy Essentials Gift Set — 3 Pairs',
    body_html: `<p><strong>Three pairs. Three occasions. One definitive gift.</strong></p>
<p>The SockAcademy Essentials Gift Set is our most considered introduction to premium sock culture — curated for the person who deserves better than ordinary. Each set includes one pair of Merino Wool Crew, one pair of No-Show Performance, and one pair of Egyptian Cotton Dress socks, presented in our signature gift box.</p>
<ul>
  <li>1× Merino Wool Crew Socks</li>
  <li>1× No-Show Performance Socks</li>
  <li>1× Egyptian Cotton Dress Socks</li>
  <li>Presented in SockAcademy signature black gift box</li>
  <li>Includes care guide card</li>
</ul>
<p><strong>Free gift wrapping available at checkout.</strong></p>`,
    vendor: 'SockAcademy',
    product_type: 'Gift Set',
    tags: 'gift, set, bundle, premium, bestseller',
    options: [{ name: 'Size', values: SIZES }],
    variants: variants(79.99, 109.99),
    status: 'active',
  },
];

async function createProduct(product) {
  const res = await fetch(`${BASE}/products.json`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ product }),
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`✓ Created: ${data.product.title} (ID: ${data.product.id})`);
    return data.product;
  } else {
    console.error(`✗ Failed: ${product.title}`, JSON.stringify(data).slice(0, 300));
    return null;
  }
}

(async () => {
  console.log('Creating SockAcademy products...\n');
  for (const p of PRODUCTS) {
    await createProduct(p);
  }
  console.log('\nDone!');
})();
