const TOKEN = 'process.env.SHOPIFY_MASTER_TOKEN';
const STORE = '11eqwi-ji.myshopify.com';
const BASE = `https://${STORE}/admin/api/2024-01`;
const headers = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json', 'Accept': 'application/json' };

async function createPage(page) {
  const r = await fetch(`${BASE}/pages.json`, { method: 'POST', headers, body: JSON.stringify({ page }) });
  const d = await r.json();
  if (r.ok) console.log(`✓ Page: ${d.page.title} (${d.page.handle})`);
  else console.log(`✗ Page error: ${JSON.stringify(d).slice(0, 200)}`);
}

async function createRedirect(path, target) {
  const r = await fetch(`${BASE}/redirects.json`, {
    method: 'POST', headers,
    body: JSON.stringify({ redirect: { path, target } })
  });
  const d = await r.json();
  if (r.ok) console.log(`✓ Redirect: ${path} → ${target}`);
  else console.log(`✗ Redirect error: ${path} → ${JSON.stringify(d).slice(0, 100)}`);
}

async function run() {
  // --- FAQ Page ---
  await createPage({
    title: 'FAQ',
    handle: 'faq',
    published: true,
    body_html: `<div class="faq-page">
  <h1>Frequently Asked Questions</h1>

  <h2>Orders & Shipping</h2>

  <details open>
    <summary><strong>How long does shipping take?</strong></summary>
    <p>Standard international shipping takes 7–14 business days. Express options (3–5 business days) are available at checkout. All orders are tracked and you'll receive a tracking link by email once dispatched.</p>
  </details>

  <details>
    <summary><strong>Do you ship worldwide?</strong></summary>
    <p>Yes. SockAcademy ships to over 40 countries. Shipping costs and delivery times vary by destination and are calculated at checkout.</p>
  </details>

  <details>
    <summary><strong>Is there free shipping?</strong></summary>
    <p>Free standard shipping on all orders over $50. No code required — applied automatically at checkout.</p>
  </details>

  <details>
    <summary><strong>Can I change or cancel my order?</strong></summary>
    <p>Orders can be modified or cancelled within 1 hour of placing them. After that, the order enters fulfilment. Contact us at <a href="mailto:hello@sockacademy.store">hello@sockacademy.store</a> as quickly as possible.</p>
  </details>

  <h2>Products & Sizing</h2>

  <details>
    <summary><strong>How do I find my size?</strong></summary>
    <p>All SockAcademy socks use EU shoe sizing. Find your size in our <a href="/pages/size-guide">Size Guide</a>. If you're between sizes, size up — socks stretch to accommodate, but a sock that's too small loses its structure faster.</p>
  </details>

  <details>
    <summary><strong>What makes SockAcademy socks different?</strong></summary>
    <p>Every pair in our range is evaluated for material quality, construction, fit over time, and performance after repeated washing. We specify exact fibre percentages and construction details for every product — no vague "premium blend" language. If a sock doesn't meet our standard, it doesn't make the range.</p>
  </details>

  <details>
    <summary><strong>Are your socks suitable for sensitive skin?</strong></summary>
    <p>Our Merino Wool Crew Socks are naturally hypoallergenic and suitable for most sensitive skin types — merino is far finer and less scratchy than standard wool. Our Egyptian Cotton and No-Show Performance socks are also suitable for sensitive skin. If you have a specific allergy, check the fibre composition listed on each product page.</p>
  </details>

  <details>
    <summary><strong>What is Coolmax® and why does it matter?</strong></summary>
    <p>Coolmax® is a high-performance polyester fibre engineered to move moisture away from skin 4x faster than standard cotton. Used in our No-Show Performance Socks, it keeps feet dry in warm conditions where cotton would stay damp. It's the material standard for premium athletic and no-show socks.</p>
  </details>

  <h2>Care & Maintenance</h2>

  <details>
    <summary><strong>How do I wash premium socks correctly?</strong></summary>
    <p>The core rule: cold or 30°C wash, gentle cycle. Never tumble dry merino wool. Lay flat to air dry. For full care instructions by material, read our <a href="/blogs/news/the-complete-guide-to-caring-for-premium-socks">Care Guide</a>.</p>
  </details>

  <details>
    <summary><strong>How long should premium socks last?</strong></summary>
    <p>With correct care — cold wash, air dry, occasional rest between wears — merino wool socks last 3–5 years. Egyptian cotton dress socks, 2–4 years. No-show socks, 1–2 years (the silicone grip is the limiting factor). Poor care (hot wash, tumble dry) can halve this.</p>
  </details>

  <h2>Returns & Exchanges</h2>

  <details>
    <summary><strong>What is your returns policy?</strong></summary>
    <p>We accept returns of unworn, unwashed items in original packaging within 30 days of delivery. Sale items are final sale. See our full <a href="/policies/refund-policy">Refund Policy</a>.</p>
  </details>

  <details>
    <summary><strong>Can I exchange for a different size?</strong></summary>
    <p>Yes. Contact us at <a href="mailto:hello@sockacademy.store">hello@sockacademy.store</a> within 30 days of delivery with your order number and the size you need. We'll arrange the exchange at no additional shipping cost on the replacement.</p>
  </details>

  <details>
    <summary><strong>What if my order arrives damaged or incorrect?</strong></summary>
    <p>We'll replace it immediately. Email <a href="mailto:hello@sockacademy.store">hello@sockacademy.store</a> with your order number and a photo. We aim to respond within 24 hours.</p>
  </details>

  <h2>Gift Sets</h2>

  <details>
    <summary><strong>Do gift sets come wrapped?</strong></summary>
    <p>Yes. The SockAcademy Essentials Gift Set is presented in our signature black gift box, ready to give. A gift message option is available at checkout.</p>
  </details>

  <details>
    <summary><strong>Can I send a gift directly to the recipient?</strong></summary>
    <p>Yes. Enter the recipient's address as the shipping address at checkout. Add a gift message in the order notes and we'll include it in the box.</p>
  </details>

  <h2>Still have a question?</h2>
  <p>Email us at <a href="mailto:hello@sockacademy.store">hello@sockacademy.store</a> — we respond within 24 hours, Monday to Friday.</p>
</div>`
  });

  // --- Redirects ---
  const redirects = [
    { path: '/socks',        target: '/collections/all-socks' },
    { path: '/shop',         target: '/collections/all-socks' },
    { path: '/products',     target: '/collections/all-socks' },
    { path: '/about',        target: '/pages/about' },
    { path: '/faq',          target: '/pages/faq' },
    { path: '/size',         target: '/pages/size-guide' },
    { path: '/sizing',       target: '/pages/size-guide' },
    { path: '/care',         target: '/blogs/news/the-complete-guide-to-caring-for-premium-socks' },
    { path: '/contact',      target: '/pages/contact' },
    { path: '/returns',      target: '/policies/refund-policy' },
    { path: '/shipping',     target: '/policies/shipping-policy' },
    { path: '/gift',         target: '/collections/gift-sets' },
    { path: '/gifts',        target: '/collections/gift-sets' },
    { path: '/merino',       target: '/products/merino-wool-crew-socks' },
    { path: '/hiking',       target: '/products/tactical-hiking-socks-thermolite' },
    { path: '/dress',        target: '/products/egyptian-cotton-dress-socks' },
    { path: '/bestsellers',  target: '/collections/best-sellers' },
  ];

  console.log('\nCreating redirects...');
  for (const r of redirects) {
    await createRedirect(r.path, r.target);
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n✅ Done!');
}

run().catch(console.error);
