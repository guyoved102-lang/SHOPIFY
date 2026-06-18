/**
 * A5 — Social Content Agent v2.1
 * Claude (caption) → DALL-E (image) → Google Drive (archive) → Shopify CDN (host) → Meta API (publish)
 * DRY-RUN: ללא META_ACCESS_TOKEN — captions + images + Drive backup + email only
 */

require('dotenv').config({ path: '../../.env' });
const Anthropic = require('@anthropic-ai/sdk');
const { google } = require('googleapis');
const { Readable } = require('stream');
const nodemailer = require('nodemailer');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const IG_USER_ID  = process.env.META_IG_USER_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || '11eqwi-ji.myshopify.com';
const SHOPIFY_TOKEN  = process.env.SHOPIFY_MASTER_TOKEN;
const DRY_RUN = !ACCESS_TOKEN || !IG_USER_ID;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRAND VISUAL IDENTITY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BRAND_VISUAL = {
  palette: 'deep black (#0A0A0A), warm gold (#C9A84C), off-white cream (#F0EDE6)',
  surface: 'black marble, dark slate, ebony wood grain, matte charcoal',
  lighting: 'soft directional studio light, subtle rim light in warm gold, deep shadows',
  style: 'editorial luxury flat lay, Monocle magazine aesthetic, Tom Ford minimalism',
  avoid: 'bright backgrounds, colorful props, playful or cartoonish elements, cluttered compositions',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEEKLY CONTENT PLAN — 3 posts/week
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const WEEKLY_CONTENT_PLAN = [
  {
    day: 'Sunday',
    type: 'EDUCATION',
    description: 'Know Your Materials — educational post on materials, craft, expert tips',
    angle: 'educate about premium sock materials, construction, or care',
    imageStyle: 'macro close-up of premium sock fabric texture on black marble — yarn detail visible, gold accent needle or thread nearby, extreme editorial quality',
  },
  {
    day: 'Wednesday',
    type: 'PRODUCT',
    description: 'Product Spotlight — one specific product category with clear value',
    angle: 'spotlight one specific product category with clear value proposition',
    imageStyle: 'folded premium dress socks arranged in precise geometric layout on dark slate, side-lit with warm studio light, one pair slightly offset for visual tension',
  },
  {
    day: 'Friday',
    type: 'LIFESTYLE',
    description: 'Weekend Standard — lifestyle, aesthetic, desire for the brand',
    angle: 'elevate the lifestyle — what wearing premium socks says about you',
    imageStyle: 'man\'s ankle in tailored trousers and premium socks, partial frame, dark flooring, morning light from window, cinematic mood — understated luxury',
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEEKLY THEMES ROTATION — 24 weeks
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
// CLAUDE — Instagram caption
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function generateCaption(post, theme) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You write Instagram captions for SockAcademy — the world's first dedicated sock authority. Premium socks for men. Think: Monocle's precision meets a trusted friend's directness. The account is @sockacademy.store.

Weekly theme: ${theme}
Post type: ${post.type} — ${post.description}
Angle: ${post.angle}

BRAND VOICE — non-negotiable:
- No exclamation marks. Ever.
- No emojis in body text. Zero.
- No generic phrases: "amazing", "game-changer", "level up", "elevate", "perfect"
- No rhetorical questions — they feel lazy and AI-written
- Authoritative without arrogance. Expert without gatekeeping.
- Global audience: US, UK, EU, Australia — no slang, no local references

HUMANIZER RULES — every caption must feel written, not generated:
- Sentence rhythm: one short line (4-6 words), then one longer deliberate line, then short again
- White space IS punctuation — a one-sentence paragraph has more weight than three sentences
- Never start two consecutive sentences with the same word
- Use em dashes (—) once per caption for a natural pause
- The hook must be a complete, standalone thought — not a teaser, not a cliffhanger
- One paragraph max 20 words. One word or two-word closing line before the CTA.
- Occasionally begin a sentence with "And" or "But" — it sounds human, not robotic

SOCIAL-MEDIA-SKILLS — Instagram-specific craft:
- Hook line (first line): must earn the "more" tap on its own merit — specific claim or unexpected fact
- Body: max 3 paragraphs. Each paragraph breathes. Never more than 3 sentences in one block.
- The second-to-last line before CTA: one word, or two. Creates visual tension.
- Hashtag strategy: 4 ultra-niche (#merinowoolcrewsocks), 4 mid-reach (#premiumsocks #menssocks), 3 broad (#mensstyle #mensware #qualitymatters) — exactly 11 total, one line
- Never hashtag the brand name — let it earn organic mentions

Write the caption in this exact JSON format:
{
  "hook": "First line only. Complete thought. Max 9 words. Specific claim or quiet authority — stops the scroll without begging.",
  "body": "2-3 short paragraphs. Varied rhythm. 80-110 words total. Separated by blank lines.",
  "cta": "One line. Quiet close. Always ends: → sockacademy.store",
  "hashtags": "Exactly 11 hashtags: 4 niche + 4 mid + 3 broad. One line, no commas.",
  "visual_direction": "One precise sentence: surface, lighting, composition, mood. No vague adjectives."
}`,
    }],
  });

  try {
    const json = msg.content[0].text.trim().match(/\{[\s\S]*\}/)?.[0];
    return JSON.parse(json);
  } catch {
    return {
      hook: theme,
      body: msg.content[0].text,
      cta: '→ sockacademy.store',
      hashtags: '#sockacademy #premiumsocks #mensstyle',
      visual_direction: post.imageStyle,
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DALL-E — generate image
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function generateImage(post, caption, theme) {
  const visualPrompt = caption.visual_direction || post.imageStyle;

  const dallePrompt = `${visualPrompt}. ${BRAND_VISUAL.style}. Color palette: ${BRAND_VISUAL.palette}. Surface: ${BRAND_VISUAL.surface}. Lighting: ${BRAND_VISUAL.lighting}. Do not include: ${BRAND_VISUAL.avoid}. Aspect ratio 1:1, Instagram square format. Ultra high quality, sharp detail.`;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: dallePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(`gpt-image-1: ${data.error.message}`);
  // gpt-image-1 returns base64, not a URL
  return data.data[0].b64_json;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GOOGLE DRIVE — archive DALL-E images as permanent corporate asset
// Requires: GDRIVE_BACKUP_FOLDER_ID + GOOGLE_SERVICE_ACCOUNT_JSON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function backupToDrive(base64Data, filename, theme) {
  const folderId = process.env.GDRIVE_BACKUP_FOLDER_ID;
  const saJson   = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!folderId || !saJson) {
    console.log('  ☁  Drive backup skipped (GDRIVE_BACKUP_FOLDER_ID or GOOGLE_SERVICE_ACCOUNT_JSON not set)');
    return null;
  }

  let credentials;
  try {
    credentials = JSON.parse(saJson);
  } catch {
    console.log('  ☁  Drive backup skipped (GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON)');
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });
  const imageBuffer = Buffer.from(base64Data, 'base64');

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
      description: `SockAcademy A5 | ${theme} | ${new Date().toISOString()}`,
    },
    media: {
      mimeType: 'image/png',
      body: Readable.from(imageBuffer),
    },
    fields: 'id,webViewLink',
  });

  console.log(`  ☁  Drive backup: ${res.data.webViewLink}`);
  return { fileId: res.data.id, webViewLink: res.data.webViewLink };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHOPIFY CDN — upload via theme Assets API (base64 → CDN URL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const THEME_ID = '151789863110';

async function uploadToShopifyCDN(base64Data, filename) {
  if (!SHOPIFY_TOKEN) return null;

  const assetKey = `assets/${filename}`;
  const body = JSON.stringify({
    asset: {
      key: assetKey,
      attachment: base64Data,
    },
  });

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
  if (data.errors) throw new Error(`Shopify Assets: ${JSON.stringify(data.errors)}`);
  return data.asset?.public_url || null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// META API — publish to Instagram
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function publishToInstagram(caption, imageUrl) {
  if (DRY_RUN || !imageUrl) return null;

  const META_API = 'https://graph.facebook.com/v20.0';

  const mediaRes = await fetch(`${META_API}/${IG_USER_ID}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: ACCESS_TOKEN }),
  });
  const media = await mediaRes.json();
  if (media.error) throw new Error(`Meta media: ${media.error.message}`);

  const publishRes = await fetch(`${META_API}/${IG_USER_ID}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: media.id, access_token: ACCESS_TOKEN }),
  });
  const published = await publishRes.json();
  if (published.error) throw new Error(`Meta publish: ${published.error.message}`);
  return published.id;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL — weekly calendar with previews
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendWeeklyCalendar(posts, weekNum, theme) {
  if (!process.env.GMAIL_APP_PASSWORD) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const postsHtml = posts.map(p => `
    <div style="background:#111;border-radius:10px;padding:20px;margin:16px 0;border-left:3px solid #C9A84C">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
        <span style="background:#C9A84C;color:#0A0A0A;font-size:10px;font-weight:800;letter-spacing:1.5px;padding:4px 10px;border-radius:2px;text-transform:uppercase">${p.plan.type}</span>
        <span style="color:#888;font-size:12px;letter-spacing:0.5px">${p.plan.day}</span>
        ${p.imageUrl ? `<span style="background:#1a3a1a;color:#4ade80;font-size:10px;font-weight:700;padding:3px 8px;border-radius:2px">IMAGE ✓</span>` : `<span style="background:#3a1a1a;color:#f87171;font-size:10px;font-weight:700;padding:3px 8px;border-radius:2px">NO IMAGE</span>`}
        ${p.driveBackup ? `<a href="${p.driveBackup.webViewLink}" style="background:#1a2a3a;color:#60a5fa;font-size:10px;font-weight:700;padding:3px 8px;border-radius:2px;text-decoration:none">☁ DRIVE</a>` : ''}
      </div>

      ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:100%;border-radius:6px;margin-bottom:14px;max-height:400px;object-fit:cover" alt="${p.plan.type}">` : ''}

      <div style="font-size:16px;font-weight:700;color:#F0EDE6;margin-bottom:8px;font-family:Georgia,serif">"${p.caption.hook}"</div>
      <div style="font-size:13px;color:#9ca3af;line-height:1.7;white-space:pre-line;margin-bottom:10px">${p.caption.body}</div>
      <div style="font-size:12px;color:#C9A84C;margin-bottom:6px">${p.caption.cta}</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:12px">${p.caption.hashtags}</div>
      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:4px;padding:10px">
        <span style="font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px">Visual Direction: </span>
        <span style="font-size:11px;color:#9ca3af">${p.caption.visual_direction}</span>
      </div>
    </div>
  `).join('');

  const hasImages = posts.some(p => p.imageUrl);

  const html = `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:640px;margin:0 auto;background:#0A0A0A;color:#F0EDE6">
  <div style="padding:32px;text-align:center;border-bottom:1px solid #2a2a2a">
    <div style="font-size:11px;letter-spacing:4px;color:#C9A84C;text-transform:uppercase;margin-bottom:8px">SOCKACADEMY</div>
    <div style="font-size:22px;font-weight:700;font-family:Georgia,serif;color:#F0EDE6">A5 Social Agent</div>
    <div style="color:#6b7280;font-size:12px;margin-top:4px">Week ${weekNum} · ${hasImages ? '🖼 AI Images Generated' : 'DRY-RUN — No Images'}</div>
  </div>

  <div style="padding:24px">
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:16px;margin-bottom:20px">
      <span style="font-size:10px;color:#C9A84C;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Weekly Theme</span>
      <div style="font-size:15px;color:#F0EDE6;margin-top:6px;font-family:Georgia,serif;font-style:italic">${theme}</div>
    </div>

    ${postsHtml}

    ${DRY_RUN ? `
    <div style="background:#1a1a1a;border:1px solid #C9A84C33;border-radius:6px;padding:16px;margin-top:16px">
      <div style="font-size:11px;color:#C9A84C;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">להפעלה מלאה</div>
      <div style="font-size:12px;color:#9ca3af;line-height:1.8">
        META_ACCESS_TOKEN + META_IG_USER_ID → GitHub Secrets<br>
        OPENAI_API_KEY → .env (לDall-E)<br>
        SHOPIFY_MASTER_TOKEN → .env (כבר קיים ✓)
      </div>
    </div>` : ''}

    <p style="color:#4b5563;font-size:11px;margin-top:24px;text-align:center;letter-spacing:1px">A5 Social Agent v2.0 · @sockacademy.store</p>
  </div>
</div>`;

  await transporter.sendMail({
    from: 'SockAcademy A5 Agent <sockacademy.store@gmail.com>',
    to: 'guyoved102@gmail.com',
    subject: `A5 — Week ${weekNum}: "${theme.substring(0, 45)}${theme.length > 45 ? '...' : ''}"`,
    html,
  });

  console.log('📧 Weekly calendar sent');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  console.log('🚀 A5 — Social Content Agent v2.0');
  console.log(`🔧 Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'} | Images: ${process.env.OPENAI_API_KEY ? 'DALL-E ✓' : 'SKIP (no OPENAI_API_KEY)'}`);
  console.log('─'.repeat(44));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Missing ANTHROPIC_API_KEY');
    process.exit(1);
  }

  const weekNum = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  const theme = WEEKLY_THEMES[weekNum % WEEKLY_THEMES.length];

  console.log(`\n📌 Week ${weekNum}: "${theme}"`);
  console.log('\n✍️  Writing captions with Claude...');

  const posts = [];

  for (const plan of WEEKLY_CONTENT_PLAN) {
    process.stdout.write(`  ${plan.day} (${plan.type})... `);

    const caption = await generateCaption(plan, theme);
    let imageUrl = null;

    // Generate image with gpt-image-1 if API key present
    let driveBackup = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        const base64Data = await generateImage(plan, caption, theme);
        const filename = `a5-${plan.type.toLowerCase()}-week${weekNum}.png`;

        // Step 1: Archive to Google Drive (fail-safe — does not block CDN upload)
        try {
          driveBackup = await backupToDrive(base64Data, filename, theme);
        } catch (driveErr) {
          console.log(`  ☁  Drive backup failed (non-fatal): ${driveErr.message}`);
        }

        // Step 2: Upload to Shopify CDN for public Instagram URL
        imageUrl = await uploadToShopifyCDN(base64Data, filename);
        console.log(`✓ image${driveBackup ? ' + Drive' : ''}`);
      } catch (e) {
        console.log(`⚠ image failed: ${e.message}`);
      }
    } else {
      console.log(`✓ caption only`);
    }

    posts.push({ plan, caption, imageUrl, driveBackup });
    await new Promise(r => setTimeout(r, 800));
  }

  // Publish to Instagram (LIVE mode)
  if (!DRY_RUN) {
    console.log('\n📤 Publishing to Instagram...');
    for (const p of posts) {
      if (p.imageUrl) {
        const fullCaption = `${p.caption.hook}\n\n${p.caption.body}\n\n${p.caption.cta}\n\n${p.caption.hashtags}`;
        try {
          const id = await publishToInstagram(fullCaption, p.imageUrl);
          console.log(`  ✅ ${p.plan.day} published — ID: ${id}`);
        } catch (e) {
          console.error(`  ❌ ${p.plan.day}: ${e.message}`);
        }
      } else {
        console.log(`  ⚠  ${p.plan.day}: no image, skipped`);
      }
    }
  }

  console.log(`\n✅ A5 done — ${posts.length} posts generated`);
  await sendWeeklyCalendar(posts, weekNum, theme);
}

main().catch(e => {
  console.error('💥 Fatal:', e.message);
  process.exit(1);
});
