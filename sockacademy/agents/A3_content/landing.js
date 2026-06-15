/**
 * A3 — Landing Page Builder (חד-פעמי)
 * יוצר דף נחיתה פרמיום ב-Shopify: /pages/join
 * הפעל פעם אחת: node landing.js
 */

require('dotenv').config({ path: '../../.env' });

const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || '11eqwi-ji.myshopify.com';
const SHOPIFY_TOKEN = process.env.SHOPIFY_MASTER_TOKEN;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTML — דף נחיתה פרמיום SockAcademy
// כולל: hero + brand story + email capture + 4 categories
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const LANDING_PAGE_HTML = `
<style>
.sa-landing { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; max-width: 100%; margin: 0; padding: 0; }
.sa-hero { background: #111827; color: #fff; text-align: center; padding: 80px 24px; }
.sa-hero-badge { display: inline-block; background: #d4a017; color: #111; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 6px 16px; border-radius: 20px; margin-bottom: 24px; }
.sa-hero h1 { font-size: clamp(28px, 5vw, 52px); font-weight: 800; line-height: 1.15; margin: 0 0 20px; letter-spacing: -1px; }
.sa-hero h1 span { color: #d4a017; }
.sa-hero p { font-size: 18px; color: #9ca3af; max-width: 560px; margin: 0 auto 40px; line-height: 1.7; }
.sa-form { display: flex; gap: 12px; max-width: 460px; margin: 0 auto; flex-wrap: wrap; justify-content: center; }
.sa-form input[type="email"] { flex: 1; min-width: 240px; padding: 14px 18px; border: none; border-radius: 6px; font-size: 15px; outline: none; }
.sa-form button { background: #d4a017; color: #111; border: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.sa-form-note { font-size: 12px; color: #6b7280; margin-top: 12px; text-align: center; }
.sa-divider { height: 4px; background: linear-gradient(90deg, #d4a017 0%, #111827 100%); }
.sa-brand { padding: 60px 24px; max-width: 720px; margin: 0 auto; text-align: center; }
.sa-brand h2 { font-size: 30px; font-weight: 800; margin-bottom: 16px; }
.sa-brand p { font-size: 17px; color: #374151; line-height: 1.8; margin-bottom: 16px; }
.sa-categories { background: #f9fafb; padding: 60px 24px; }
.sa-categories h2 { text-align: center; font-size: 26px; font-weight: 800; margin-bottom: 8px; }
.sa-categories-sub { text-align: center; color: #6b7280; margin-bottom: 40px; font-size: 15px; }
.sa-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; max-width: 900px; margin: 0 auto; }
.sa-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px 24px; }
.sa-card-icon { font-size: 32px; margin-bottom: 12px; }
.sa-card h3 { font-size: 17px; font-weight: 700; margin: 0 0 8px; }
.sa-card p { font-size: 13px; color: #6b7280; margin: 0 0 16px; line-height: 1.6; }
.sa-card a { color: #111; font-size: 13px; font-weight: 600; text-decoration: none; border-bottom: 1px solid #d4a017; padding-bottom: 2px; }
.sa-proof { padding: 60px 24px; max-width: 900px; margin: 0 auto; }
.sa-proof h2 { text-align: center; font-size: 26px; font-weight: 800; margin-bottom: 40px; }
.sa-proof-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
.sa-proof-item { text-align: center; padding: 24px; }
.sa-proof-number { font-size: 42px; font-weight: 800; color: #d4a017; line-height: 1; margin-bottom: 8px; }
.sa-proof-label { font-size: 14px; color: #6b7280; }
.sa-cta { background: #111827; color: #fff; text-align: center; padding: 60px 24px; }
.sa-cta h2 { font-size: 28px; font-weight: 800; margin-bottom: 12px; }
.sa-cta p { color: #9ca3af; margin-bottom: 28px; font-size: 16px; }
.sa-cta a { display: inline-block; background: #d4a017; color: #111; padding: 16px 36px; border-radius: 6px; font-weight: 700; font-size: 16px; text-decoration: none; }
@media (max-width: 600px) { .sa-form { flex-direction: column; } .sa-form input[type="email"], .sa-form button { width: 100%; } }
</style>

<div class="sa-landing">

  <!-- HERO -->
  <div class="sa-hero">
    <div class="sa-hero-badge">The World's First Sock Authority</div>
    <h1>Socks are the last thing<br>you put on.<br><span>They shouldn't be the<br>last thing you think about.</span></h1>
    <p>SockAcademy curates the finest socks on earth — premium materials, expert knowledge, uncompromising standards.</p>

    <!-- Klaviyo Signup Form -->
    <!-- אם Klaviyo Forms מחובר, הטמע את הForm ID שלך כאן -->
    <!-- לדוגמה: <div class="klaviyo-form-XXXXXX"></div> -->
    <!-- עד אז — פורם HTML רגיל עם Klaviyo API -->
    <form class="sa-form" id="sa-signup-form" onsubmit="saSubmit(event)">
      <input type="email" id="sa-email" placeholder="Your email address" required autocomplete="email" />
      <button type="submit">Join the Academy</button>
    </form>
    <div class="sa-form-note" id="sa-form-msg">Subscribers get early access to new arrivals and expert guides. No spam.</div>
  </div>

  <div class="sa-divider"></div>

  <!-- BRAND STORY -->
  <div class="sa-brand">
    <h2>Why SockAcademy Exists</h2>
    <p>The most discerning men have always understood that quality extends to every detail — including what covers their feet. Yet for decades, socks have been an afterthought: a drawer full of commodity pairs that wear out, sag, and pill.</p>
    <p>SockAcademy was built to change that. We are the first dedicated authority on premium socks for men — not a retailer with a lifestyle tag, but a true specialist. Every pair we carry earns its place.</p>
  </div>

  <!-- CATEGORIES -->
  <div class="sa-categories">
    <h2>The Four Pillars</h2>
    <p class="sa-categories-sub">Every sock we carry falls into one of four expert categories.</p>
    <div class="sa-grid">
      <div class="sa-card">
        <div class="sa-card-icon">🧶</div>
        <h3>Premium Materials</h3>
        <p>Merino wool, Egyptian cotton, bamboo, cashmere. Material is where quality begins and where most brands cut corners.</p>
        <a href="https://sockacademy.store/collections/crew-half-calf">Explore →</a>
      </div>
      <div class="sa-card">
        <div class="sa-card-icon">🏃</div>
        <h3>Performance</h3>
        <p>Compression, no-show, running, cycling. Engineered for activity without sacrificing construction.</p>
        <a href="https://sockacademy.store/collections/sport-running">Explore →</a>
      </div>
      <div class="sa-card">
        <div class="sa-card-icon">👔</div>
        <h3>Dress & Formal</h3>
        <p>Argyle, over-the-calf, ribbed. The sock that completes a suit — or makes a statement under a casual trouser.</p>
        <a href="https://sockacademy.store/collections/formal-dress">Explore →</a>
      </div>
      <div class="sa-card">
        <div class="sa-card-icon">🥾</div>
        <h3>Tactical & Outdoor</h3>
        <p>Hiking, waterproof, thermolite, tactical boot. When terrain demands more, your socks should too.</p>
        <a href="https://sockacademy.store/collections/hiking-tactical">Explore →</a>
      </div>
    </div>
  </div>

  <!-- SOCIAL PROOF -->
  <div class="sa-proof">
    <h2>The SockAcademy Standard</h2>
    <div class="sa-proof-grid">
      <div class="sa-proof-item">
        <div class="sa-proof-number">4</div>
        <div class="sa-proof-label">Expert categories — nothing outside them</div>
      </div>
      <div class="sa-proof-item">
        <div class="sa-proof-number">$18+</div>
        <div class="sa-proof-label">Minimum price — quality has a floor</div>
      </div>
      <div class="sa-proof-item">
        <div class="sa-proof-number">0</div>
        <div class="sa-proof-label">Novelty socks. Ever.</div>
      </div>
      <div class="sa-proof-item">
        <div class="sa-proof-number">100%</div>
        <div class="sa-proof-label">Premium materials, every pair</div>
      </div>
    </div>
  </div>

  <!-- FINAL CTA -->
  <div class="sa-cta">
    <h2>Ready to raise your standard?</h2>
    <p>Browse the full collection — curated, not crowded.</p>
    <a href="https://sockacademy.store/collections/all-socks">Shop All Socks</a>
  </div>

</div>

<script>
async function saSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('sa-email').value;
  const msg = document.getElementById('sa-form-msg');

  try {
    // Klaviyo subscribe via JS API (requires Klaviyo public key in theme)
    // If using Klaviyo onsite JS, this calls the list subscribe endpoint
    const res = await fetch('https://a.klaviyo.com/client/subscriptions/?company_id=YOUR_KLAVIYO_PUBLIC_KEY', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'revision': '2024-02-15' },
      body: JSON.stringify({
        data: {
          type: 'subscription',
          attributes: {
            profile: { data: { type: 'profile', attributes: { email } } },
            list_id: 'YOUR_KLAVIYO_LIST_ID',
          },
        },
      }),
    });

    if (res.ok || res.status === 202) {
      msg.textContent = 'Welcome to SockAcademy. Check your inbox.';
      msg.style.color = '#d4a017';
      document.getElementById('sa-email').value = '';
    } else {
      throw new Error('subscription failed');
    }
  } catch {
    // Fallback — redirect to Shopify newsletter
    window.location.href = 'https://sockacademy.store/?newsletter=1';
  }
}
</script>
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHOPIFY — יצירת/עדכון הדף
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function shopifyRequest(method, path, body = null) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/${path}`, {
    method,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Shopify ${path}: ${JSON.stringify(data.errors || data)}`);
  return data;
}

async function createLandingPage() {
  console.log('🚀 A3 — Landing Page Builder');
  console.log('━'.repeat(40));

  if (!SHOPIFY_TOKEN) {
    console.error('❌ חסר SHOPIFY_MASTER_TOKEN');
    process.exit(1);
  }

  // בדוק אם הדף קיים
  console.log('\n🔍 בודק אם הדף /pages/join קיים...');
  const existing = await shopifyRequest('GET', 'pages.json?handle=join&limit=1');

  if (existing.pages && existing.pages.length > 0) {
    // עדכן
    const pageId = existing.pages[0].id;
    console.log(`  📝 דף קיים (ID: ${pageId}) — מעדכן...`);

    const updated = await shopifyRequest('PUT', `pages/${pageId}.json`, {
      page: {
        id: pageId,
        title: 'Join SockAcademy',
        body_html: LANDING_PAGE_HTML,
        published: true,
      },
    });
    console.log(`  ✅ עודכן: https://sockacademy.store/pages/${updated.page.handle}`);
    return updated.page;
  } else {
    // צור חדש
    console.log('  ➕ יוצר דף חדש...');
    const created = await shopifyRequest('POST', 'pages.json', {
      page: {
        title: 'Join SockAcademy',
        handle: 'join',
        body_html: LANDING_PAGE_HTML,
        published: true,
        metafields: [
          {
            key: 'title_tag',
            value: 'Join SockAcademy — The World\'s First Sock Authority',
            type: 'single_line_text_field',
            namespace: 'global',
          },
          {
            key: 'description_tag',
            value: 'SockAcademy — premium socks for men who care about quality. Merino wool, Egyptian cotton, tactical, dress. Join the world\'s first sock authority.',
            type: 'single_line_text_field',
            namespace: 'global',
          },
        ],
      },
    });
    console.log(`  ✅ נוצר: https://sockacademy.store/pages/${created.page.handle}`);
    return created.page;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
createLandingPage()
  .then(page => {
    console.log('\n━'.repeat(40));
    console.log('✅ Landing page מוכן!');
    console.log(`   URL: https://sockacademy.store/pages/${page.handle}`);
    console.log('\n⚠️  שים לב: עדכן YOUR_KLAVIYO_PUBLIC_KEY + YOUR_KLAVIYO_LIST_ID בקוד');
    console.log('   מוצא אותם ב: Klaviyo → Account → API Keys');
  })
  .catch(e => {
    console.error('💥 Fatal:', e.message);
    process.exit(1);
  });
