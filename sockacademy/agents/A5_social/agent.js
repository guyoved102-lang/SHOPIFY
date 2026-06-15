/**
 * A5 — Social Content Agent v1.0
 * כותב 3 קפיות שבועיות לאינסטגרם עם Claude
 * שולח לוח תוכן שבועי למייל + מוכן לפוסטינג אוטומטי דרך Meta API
 * DRY-RUN: ללא META_ACCESS_TOKEN — רק קפיות + מייל
 */

require('dotenv').config({ path: '../../.env' });
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const IG_USER_ID = process.env.META_IG_USER_ID;       // Instagram Business Account ID
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const DRY_RUN = !ACCESS_TOKEN || !IG_USER_ID;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// לוח תוכן שבועי — 3 פוסטים קבועים
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const WEEKLY_CONTENT_PLAN = [
  {
    day: 'Sunday',
    type: 'EDUCATION',
    description: 'Know Your Materials — פוסט חינוכי על חומרים, כינולוגיה, טיפים מקצועיים',
    angle: 'educate about premium sock materials, construction, or care',
  },
  {
    day: 'Wednesday',
    type: 'PRODUCT',
    description: 'Product Spotlight — הדגשת מוצר ספציפי עם ערך ותועלת',
    angle: 'spotlight one specific product category with clear value proposition',
  },
  {
    day: 'Friday',
    type: 'LIFESTYLE',
    description: 'Weekend Standard — פוסט לייפסטייל, אסתטי, שיוצר תשוקה למותג',
    angle: 'elevate the lifestyle — what wearing premium socks says about you',
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOPICS ROTATION — 52 שבועות
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const WEEKLY_THEMES = [
  'Merino Wool — the fiber that breathes, regulates, and lasts',
  'The no-show sock: invisible by design, premium by choice',
  'Dress code: what your socks signal in a meeting room',
  'Hiking season prep — why your feet deserve more than generic wool',
  'Egyptian cotton: thread count matters below the ankle too',
  'Compression explained — not just for planes, not just for athletes',
  'The gift that actually gets used: premium sock sets',
  'Argyle in 2026 — classic pattern, modern execution',
  'Tactical boot socks: what professionals actually wear',
  'Care guide: how to make premium socks last years, not months',
  'The sock drawer audit — what stays, what goes',
  'Bamboo vs cotton — sustainability meets performance',
  'Over-the-calf socks: the detail that separates serious dressers',
  'Running socks after mile 3 — the difference becomes obvious',
  'Thermal layers: where warmth starts (hint: not your coat)',
  'Black tie, brown shoes, the wrong socks — how to fix it',
  'Waterproof socks: technology, not just a claim',
  'The capsule sock wardrobe — 5 pairs for every occasion',
  'Cycling kit and socks: the last frontier of performance gear',
  'Weekend dress code: smart casual done right, from the ground up',
  'Antimicrobial fibers — copper-infused socks decoded',
  'Business travel packing: one pair that does everything',
  'The psychology of small luxuries — why premium socks matter',
  'Sock length guide: ankle, crew, over-the-calf — when to wear what',
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLAUDE — יצירת קפי אינסטגרם
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function generateCaption(post, theme, weekNum) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You write Instagram captions for SockAcademy — the world's first dedicated sock authority. Premium socks for men. Think: authoritative, minimal, tasteful. The account is @sockacademy.store.

Weekly theme: ${theme}
Post type: ${post.type} — ${post.description}
Angle: ${post.angle}

Brand voice rules:
- No exclamation marks. Ever.
- No emojis in body text (only allowed: 1 subtle emoji max in the whole caption, only if it genuinely adds something)
- Short sentences. White space between paragraphs.
- Authoritative but not arrogant — like a trusted expert, not a salesman
- No generic phrases: "amazing", "perfect", "best ever", "game-changer"
- CTA always: "Link in bio → sockacademy.store" (never pushy)

Write the caption in this exact JSON format:
{
  "hook": "The first line — must stop the scroll. Max 10 words. Bold claim or unexpected insight.",
  "body": "2-3 short paragraphs separated by blank lines. 80-120 words total. The meat of the post.",
  "cta": "Subtle close. 1 line. Always ends with: → sockacademy.store",
  "hashtags": "8-12 relevant hashtags, mix of niche (#merinowoolsocks) and broader (#premiumsocks #mensStyle). One line, space-separated.",
  "visual_direction": "One sentence describing the ideal image/visual for this post — for the photographer/designer."
}`,
    }],
  });

  try {
    const text = msg.content[0].text.trim();
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    return JSON.parse(json);
  } catch {
    return {
      hook: theme,
      body: msg.content[0].text,
      cta: '→ sockacademy.store',
      hashtags: '#sockacademy #premiumsocks #mensStyle',
      visual_direction: 'Premium flat lay of socks on clean surface.',
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// META API — פרסום לאינסטגרם (LIVE בלבד)
// דורש: image_url ציבורי + ACCESS_TOKEN + IG_USER_ID
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function publishToInstagram(caption, imageUrl) {
  if (DRY_RUN || !imageUrl) return null;

  const META_API = 'https://graph.facebook.com/v20.0';

  // שלב 1 — יצור media container
  const mediaRes = await fetch(`${META_API}/${IG_USER_ID}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: ACCESS_TOKEN,
    }),
  });
  const media = await mediaRes.json();
  if (media.error) throw new Error(`Meta media: ${media.error.message}`);

  // שלב 2 — פרסם
  const publishRes = await fetch(`${META_API}/${IG_USER_ID}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: media.id,
      access_token: ACCESS_TOKEN,
    }),
  });
  const published = await publishRes.json();
  if (published.error) throw new Error(`Meta publish: ${published.error.message}`);
  return published.id;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL — לוח תוכן שבועי
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendWeeklyCalendar(posts, weekNum, theme) {
  if (!process.env.GMAIL_APP_PASSWORD) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const postsHtml = posts.map((p, i) => `
    <div style="background:#f9fafb;border-radius:10px;padding:20px;margin:16px 0;border-left:4px solid #d4a017">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="background:#111827;color:#d4a017;font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 10px;border-radius:12px;text-transform:uppercase">${p.plan.type}</span>
        <span style="color:#6b7280;font-size:13px">${p.plan.day}</span>
      </div>
      <div style="font-size:17px;font-weight:700;color:#111;margin-bottom:8px">"${p.caption.hook}"</div>
      <div style="font-size:13px;color:#374151;line-height:1.7;white-space:pre-line;margin-bottom:12px">${p.caption.body}</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:8px">${p.caption.cta}</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:12px">${p.caption.hashtags}</div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:10px">
        <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px">Visual Direction: </span>
        <span style="font-size:12px;color:#374151">${p.caption.visual_direction}</span>
      </div>
    </div>
  `).join('');

  const html = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
  <div style="background:#111827;padding:28px;text-align:center;border-radius:12px 12px 0 0">
    <div style="color:#fff;font-size:22px;font-weight:800">🧦 SockAcademy</div>
    <div style="color:#9ca3af;font-size:13px;margin-top:4px">A5 Social Agent — שבוע ${weekNum}</div>
    <div style="background:#374151;color:#fbbf24;padding:4px 12px;border-radius:12px;font-size:11px;display:inline-block;margin-top:8px">
      ${DRY_RUN ? '🔧 DRY-RUN — קפיות מוכנות, פרסום ידני' : '🚀 LIVE MODE'}
    </div>
  </div>
  <div style="padding:20px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:20px">
      <strong>נושא השבוע:</strong> ${theme}
    </div>

    <h3 style="color:#111;margin:0 0 4px">📅 לוח תוכן שבועי — 3 פוסטים</h3>
    <p style="color:#6b7280;font-size:13px;margin:0 0 16px">העתק-הדבק לאינסטגרם. הוסף תמונה לפי ה-Visual Direction.</p>

    ${postsHtml}

    ${DRY_RUN ? `
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-top:16px">
      <strong style="color:#0369a1">להפעלה אוטומטית (פרסום ישיר לאינסטגרם):</strong>
      <ul style="font-size:13px;color:#0c4a6e;margin:8px 0">
        <li>META_ACCESS_TOKEN — ב-.env</li>
        <li>META_IG_USER_ID — Instagram Business Account ID</li>
        <li>image_url — URL ציבורי לתמונה (Shopify CDN / Cloudinary)</li>
      </ul>
    </div>` : ''}

    <p style="color:#9ca3af;font-size:11px;margin-top:20px;text-align:center">A5 Social Agent v1.0 · @sockacademy.store</p>
  </div>
</div>`;

  await transporter.sendMail({
    from: 'SockAcademy A5 Agent <sockacademy.store@gmail.com>',
    to: 'guyoved102@gmail.com',
    subject: `📱 A5 — לוח תוכן שבוע ${weekNum}: "${theme.substring(0, 45)}..."`,
    html,
  });

  console.log('📧 לוח תוכן נשלח למייל');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  console.log('🚀 A5 — Social Content Agent v1.0');
  console.log(`🔧 מצב: ${DRY_RUN ? 'DRY-RUN (קפיות בלבד)' : 'LIVE (פרסום אוטומטי)'}`);
  console.log('━'.repeat(40));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ חסר ANTHROPIC_API_KEY');
    process.exit(1);
  }

  // נושא השבוע
  const weekNum = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  const theme = WEEKLY_THEMES[weekNum % WEEKLY_THEMES.length];

  console.log(`\n📌 נושא שבוע ${weekNum}: "${theme}"`);

  // יצור 3 קפיות
  console.log('\n✍️  כותב קפיות עם Claude...');
  const posts = [];

  for (const plan of WEEKLY_CONTENT_PLAN) {
    console.log(`  ⏳ ${plan.day} (${plan.type})...`);
    const caption = await generateCaption(plan, theme, weekNum);
    posts.push({ plan, caption });
    console.log(`  ✅ "${caption.hook}"`);
    await new Promise(r => setTimeout(r, 500));
  }

  // DRY-RUN — רק מייל
  // LIVE — נסה לפרסם (דורש image_url מ-ENV)
  if (!DRY_RUN) {
    console.log('\n📤 מפרסם לאינסטגרם...');
    for (const p of posts) {
      const imageUrl = process.env[`IG_IMAGE_${p.plan.type}`]; // IG_IMAGE_EDUCATION, IG_IMAGE_PRODUCT, IG_IMAGE_LIFESTYLE
      if (imageUrl) {
        const fullCaption = `${p.caption.hook}\n\n${p.caption.body}\n\n${p.caption.cta}\n\n${p.caption.hashtags}`;
        try {
          const id = await publishToInstagram(fullCaption, imageUrl);
          console.log(`  ✅ ${p.plan.day} פורסם — ID: ${id}`);
        } catch (e) {
          console.error(`  ❌ ${p.plan.day}: ${e.message}`);
        }
      } else {
        console.log(`  ⚠️  ${p.plan.day}: חסרה תמונה (ENV: IG_IMAGE_${p.plan.type})`);
      }
    }
  }

  console.log('\n━'.repeat(40));
  console.log(`✅ A5 הושלם — ${posts.length} קפיות נוצרו`);

  await sendWeeklyCalendar(posts, weekNum, theme);
}

main().catch(e => {
  console.error('💥 Fatal:', e.message);
  process.exit(1);
});
