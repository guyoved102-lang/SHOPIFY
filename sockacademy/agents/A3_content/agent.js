/**
 * A3 — Content Agent v1.0
 * כותב מאמר בלוג SEO חדש בכל שבוע + מפרסם ל-Shopify אוטומטית
 * תדירות: כל שני בבוקר (GitHub Actions)
 */

require('dotenv').config({ path: '../../.env' });
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const { withRetry } = require('../../corp/core/anthropic-retry.js');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');
const { writeMetrics } = require('../../corp/core/metrics.js');
const { reviewContent } = require('../../corp/core/qa-gate.js');
const { handleFatalError } = require('../../corp/core/self-heal.js');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';
const MAX_QA_ROUNDS = 2;

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, errorMsg = '') {
  if (!supabase) return;
  try {
    const run_status = status === 'failed' ? 'failure' : status;
    await supabase.from('agent_health_log').insert({
      agent_id:      'A3',
      agent_name:    'Content',
      run_status,
      error_message: errorMsg || null,
      metadata:      {},
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const DRY_RUN = process.env.DRY_RUN === 'true';
const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_MASTER_TOKEN;
const BLOG_ID = process.env.BLOG_ID;
if (!BLOG_ID) { console.error('❌ BLOG_ID not set — add to GitHub Secrets'); process.exit(1); }
if (!SHOPIFY_DOMAIN) { console.error('❌ SHOPIFY_SHOP_DOMAIN not set'); process.exit(1); }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEO TOPICS — 24 נושאים לרוטציה שנתית
// Claude בוחר נושא לפי שבוע בשנה
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BLOG_TOPICS = [
  // Premium Materials
  { title: "The Complete Guide to Merino Wool Socks: Why They're Worth Every Penny", keywords: 'merino wool socks, best merino socks, wool socks guide', category: 'Premium Materials' },
  { title: "Egyptian Cotton Socks: What Makes Them Different (And Better)", keywords: 'egyptian cotton socks, premium cotton socks, dress socks material', category: 'Premium Materials' },
  { title: "Bamboo vs Merino Socks: Which Should You Choose?", keywords: 'bamboo socks vs merino, best eco socks, sustainable socks comparison', category: 'Premium Materials' },
  { title: "Cashmere Socks: The Luxury Sock That's Actually Practical", keywords: 'cashmere socks, luxury socks men, soft socks premium', category: 'Premium Materials' },

  // Dress & Formal
  { title: "The Men's Dress Sock Guide: Length, Material, and Pattern Rules", keywords: 'mens dress socks guide, formal socks, dress socks length', category: 'Dress & Formal' },
  { title: "Argyle Socks in 2026: How to Wear Them Without Looking Dated", keywords: 'argyle socks men, how to wear argyle, pattern dress socks', category: 'Dress & Formal' },
  { title: "Over-the-Calf Socks: Why Every Man Needs a Pair in His Drawer", keywords: 'over the calf socks, OTC socks men, dress socks that stay up', category: 'Dress & Formal' },
  { title: "Business Socks: The Unspoken Signal in Every Professional Meeting", keywords: 'business socks men, professional dress socks, office socks guide', category: 'Dress & Formal' },
  { title: "How to Match Socks to Suit: The Rule No One Taught You", keywords: 'match socks to suit, dress code socks, formal sock matching', category: 'Dress & Formal' },

  // Performance
  { title: "No-Show Socks That Actually Stay Hidden: A Buyer's Guide", keywords: 'no show socks men, invisible socks, best no-show socks', category: 'Performance' },
  { title: "Compression Socks for Men: When You Need Them (And When You Don't)", keywords: 'compression socks men, medical compression socks, best compression socks', category: 'Performance' },
  { title: "Running Socks vs Regular Socks: Why the Difference Matters After Mile 3", keywords: 'running socks guide, best running socks, performance socks for runners', category: 'Performance' },
  { title: "Cycling Socks Explained: Fit, Material, and Length Guide", keywords: 'cycling socks guide, best cycling socks, bike socks review', category: 'Performance' },
  { title: "Athletic Socks: How to Choose Based on Your Sport", keywords: 'athletic socks guide, sport-specific socks, performance socks by activity', category: 'Performance' },

  // Tactical & Outdoor
  { title: "Best Hiking Socks in 2026: What to Look For Before You Hit the Trail", keywords: 'best hiking socks 2026, hiking sock guide, trail socks review', category: 'Tactical & Outdoor' },
  { title: "Waterproof Socks: Do They Actually Work? An Honest Review", keywords: 'waterproof socks review, weatherproof socks, dry socks hiking', category: 'Tactical & Outdoor' },
  { title: "Thermal Socks: How to Stay Warm Without Losing Feeling in Your Feet", keywords: 'thermal socks men, winter hiking socks, best cold weather socks', category: 'Tactical & Outdoor' },
  { title: "Tactical Boot Socks: What Military and Law Enforcement Professionals Wear", keywords: 'tactical socks, military boot socks, law enforcement socks', category: 'Tactical & Outdoor' },
  { title: "Thermolite Socks: The Synthetic Insulation That Outperforms Wool in Wet Conditions", keywords: 'thermolite socks, synthetic thermal socks, best socks for wet hiking', category: 'Tactical & Outdoor' },

  // Lifestyle & Gift
  { title: "The Perfect Sock Gift Set: What to Look For and What to Avoid", keywords: 'sock gift set men, best sock gifts, premium sock gift guide', category: 'Gift Sets' },
  { title: "Why Socks Are the Most Underestimated Gift for Men (And How to Give Them Right)", keywords: 'socks as gift, best mens gift, unique mens gifts', category: 'Gift Sets' },
  { title: "How to Care for Premium Socks: Washing, Drying, and Storage", keywords: 'how to wash merino socks, sock care guide, extend sock life', category: 'Premium Materials' },
  { title: "The Psychology of Socks: What Your Choice Says About Your Attention to Detail", keywords: 'sock style men, what socks say about you, premium sock culture', category: 'Lifestyle' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHOPIFY API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function shopifyRequest(method, path, body = null) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2025-01/${path}`, {
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

async function shopifyPost(path, body) {
  return shopifyRequest('POST', path, body);
}

async function articleExists(handle) {
  const data = await shopifyRequest('GET', `blogs/${BLOG_ID}/articles.json?handle=${encodeURIComponent(handle)}&limit=1`);
  return data.articles && data.articles.length > 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLAUDE — כתיבת מאמר 1,500+ מילים
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function writeArticle(topic, revisionNotes = null) {
  console.log(`  ✍️  כותב: "${topic.title}"...`);

  const revisionBlock = revisionNotes
    ? `\n\nPREVIOUS DRAFT FEEDBACK — fix these issues before rewriting:\n${revisionNotes}\n`
    : '';

  const msg = await withRetry(() => anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000, // was 4000 — tight for 2,000 words of HTML (~3,000+ tokens); undershooting caused the QA word-count rule to fail predictably (Fable 5 QA_GATE_ANALYSIS.md finding 4, 06/07/2026)
    messages: [{
      role: 'user',
      content: `You are a senior content writer for SockAcademy — the world's first dedicated sock authority. We are the authoritative voice on premium socks for men. Think: The Strategist meets GQ, but focused entirely on socks.

Write a comprehensive, authoritative blog post on the following topic:

TITLE: ${topic.title}
TARGET KEYWORDS: ${topic.keywords}
CATEGORY: ${topic.category}
${revisionBlock}
Requirements:
- Aim for 1,700-1,800 words; drafts under 1,500 words will be rejected by QA (hard floor 1,500, hard ceiling 2,000)
- Written in American English, authoritative tone — no hype, no exclamation marks
- Open with a strong, declarative, authoritative statement. Never open with a rhetorical question or generic scene-setting.
- No generic superlatives or adjective stacking — never use "amazing", "perfect", "best-in-class", "game-changer", or stacked adjectives like "incredible, luxurious, must-have"
- Deep expertise: materials science, construction methods, use cases — not fluffy lifestyle content
- Structure: intro → 4-6 subheadings with real substance → expert conclusion
- Naturally include keywords without stuffing
- Include 2-3 internal links to https://sockacademy.store (product pages or collections, natural anchor text)
- End with a strong CTA pointing to https://sockacademy.store

Format the entire article as clean HTML:
- Use <h2> for main subheadings, <h3> for sub-points
- Use <p> for paragraphs
- Use <ul>/<li> for lists where appropriate
- Do NOT include <html>, <head>, <body>, or any wrapping tags — just the article content starting with the first paragraph (title will be set separately)
- No inline styles

Write the article now:`,
    }],
  }), 'A3');

  return msg.content[0].text.trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERNAL LINK VALIDATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function validateInternalLinks(html) {
  const hrefs = [...html.matchAll(/href="(https?:\/\/sockacademy\.store[^"]+)"/g)].map(m => m[1]);
  const unique = [...new Set(hrefs)];
  const broken = [];

  for (const url of unique) {
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        broken.push(url);
        console.log(`  ⚠️  Internal link ${res.status}: ${url}`);
      }
    } catch {
      broken.push(url);
      console.log(`  ⚠️  Internal link unreachable: ${url}`);
    }
  }

  let cleanHtml = html;
  for (const url of broken) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanHtml = cleanHtml.replace(new RegExp(`<a[^>]*href="${escaped}"[^>]*>(.*?)<\\/a>`, 'gi'), '$1');
  }

  return { html: cleanHtml, broken };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PEAK TRAFFIC SCHEDULING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getPeakPublishAt() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, 2=Tue
  const daysToTuesday = day <= 2 ? (2 - day) || 7 : 9 - day;
  const target = new Date(now);
  target.setUTCDate(now.getUTCDate() + daysToTuesday);
  target.setUTCHours(8, 0, 0, 0); // 08:00 UTC = 10:00 AM Israel
  if (target <= now) target.setUTCDate(target.getUTCDate() + 7);
  return target.toISOString();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHOPIFY — פרסום מאמר לבלוג
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function publishArticle(topic, bodyHtml) {
  const handle = topic.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);

  const metaDescription = `${topic.title} — Expert guide from SockAcademy, the world's premier sock authority. Premium socks, professional knowledge.`;

  const publishAt = getPeakPublishAt();

  const payload = {
    article: {
      title: topic.title,
      body_html: bodyHtml,
      blog_id: parseInt(BLOG_ID),
      author: 'SockAcademy',
      tags: `${topic.category}, SEO, ${topic.keywords.split(',')[0].trim()}`,
      handle,
      published_at: publishAt,
      metafields: [
        {
          key: 'description_tag',
          value: metaDescription.substring(0, 320),
          type: 'single_line_text_field',
          namespace: 'global',
        },
        {
          key: 'title_tag',
          value: `${topic.title} | SockAcademy`,
          type: 'single_line_text_field',
          namespace: 'global',
        },
      ],
    },
  };

  const result = await shopifyPost(`blogs/${BLOG_ID}/articles.json`, payload);
  return result.article;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL REPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendReport(topic, article, published) {
  if (!process.env.GMAIL_APP_PASSWORD) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const articleUrl = published
    ? `https://sockacademy.store/blogs/news/${article.handle}`
    : null;

  const preview = article?.body_html
    ? article.body_html.replace(/<[^>]+>/g, ' ').substring(0, 400) + '...'
    : 'תצוגה מקדימה לא זמינה';

  const html = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
  <div style="background:#111827;padding:24px;text-align:center;border-radius:12px 12px 0 0">
    <div style="color:#fff;font-size:22px;font-weight:800">🧦 SockAcademy</div>
    <div style="color:#9ca3af;font-size:13px;margin-top:4px">A3 Blog Agent — ${new Date().toLocaleDateString('he-IL')}</div>
  </div>
  <div style="padding:20px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
    ${published ? `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-weight:700;color:#15803d;margin-bottom:4px">✅ מאמר פורסם בהצלחה</div>
      <a href="${articleUrl}" style="color:#1d4ed8;font-size:14px">${articleUrl}</a>
    </div>` : `
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-weight:700;color:#dc2626">❌ שגיאה בפרסום — בדוק לוגים</div>
    </div>`}

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">מאמר השבוע</div>
      <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:8px">${topic.title}</div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:12px">קטגוריה: ${topic.category} | Keywords: ${topic.keywords}</div>
      <div style="font-size:13px;color:#374151;line-height:1.6">${preview}</div>
    </div>

    <p style="color:#9ca3af;font-size:11px;margin-top:20px;text-align:center">A3 Content Agent v1.0 — SockAcademy</p>
  </div>
</div>`;

  await transporter.sendMail({
    from: 'SockAcademy A3 Agent <sockacademy.store@gmail.com>',
    to: ADMIN_EMAIL,
    subject: `📝 A3 — מאמר חדש: "${topic.title.substring(0, 50)}..." | ${new Date().toLocaleDateString('he-IL')}`,
    html,
  });

  console.log('📧 דוח נשלח');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QA WITHHELD REPORT — sent when the article still fails QA after
// MAX_QA_ROUNDS revisions. Not a system error (logHealth stays 'success' —
// the agent correctly refused to publish weak content) so this is a
// distinct, honestly-worded alert, not the generic error email.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendQAWithheldReport(topic, html, issues, roundsUsed) {
  const issuesList = issues.map(i => `<li style="margin-bottom:6px">${i}</li>`).join('');
  const preview = html.replace(/<[^>]+>/g, ' ').substring(0, 400) + '...';

  await notifyTelegram(heTelegramMsg('A3 Content', '⏸️ מאמר נעצר ע"י QA — לא פורסם',
    `נושא: "${topic.title}"\nלאחר ${roundsUsed} סבבי QA עדיין לא עבר את הרובריקה.\nבעיות: ${issues.join(' | ')}`));

  if (!process.env.GMAIL_APP_PASSWORD) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const html_email = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
  <div style="background:#111827;padding:24px;text-align:center;border-radius:12px 12px 0 0">
    <div style="color:#fff;font-size:22px;font-weight:800">🧦 SockAcademy</div>
    <div style="color:#9ca3af;font-size:13px;margin-top:4px">A3 Blog Agent — ${new Date().toLocaleDateString('he-IL')}</div>
  </div>
  <div style="padding:20px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-weight:700;color:#92400e;margin-bottom:4px">⏸️ מאמר נעצר ע"י QA — לא פורסם</div>
      <div style="font-size:13px;color:#92400e">לאחר ${roundsUsed} סבבי כתיבה+QA עדיין לא עבר את הרובריקה. זו לא תקלת מערכת — הסוכן נמנע במכוון מפרסום תוכן חלש.</div>
    </div>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">מאמר שנעצר</div>
      <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:8px">${topic.title}</div>
      <div style="font-size:13px;color:#374151;line-height:1.6">${preview}</div>
    </div>

    <div style="background:#fef2f2;border-radius:8px;padding:16px">
      <div style="font-size:11px;color:#991b1b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">בעיות QA שדווחו</div>
      <ul style="font-size:13px;color:#374151;line-height:1.6;padding-right:18px;margin:0">${issuesList}</ul>
    </div>

    <p style="color:#9ca3af;font-size:11px;margin-top:20px;text-align:center">A3 Content Agent v1.1 — SockAcademy</p>
  </div>
</div>`;

  await transporter.sendMail({
    from: 'SockAcademy A3 Agent <sockacademy.store@gmail.com>',
    to: ADMIN_EMAIL,
    subject: `⏸️ A3 — מאמר נעצר ע"י QA: "${topic.title.substring(0, 50)}..." | ${new Date().toLocaleDateString('he-IL')}`,
    html: html_email,
  });

  console.log('📧 דוח QA-withheld נשלח');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// A1 CONTEXT — topic selection aligned with weekly product research
// When running via A0 Orchestrator, these env vars are injected automatically.
// Standalone runs fall back to week-rotation.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function selectTopic(weekOfYear) {
  const a1Category = process.env.A1_TOP_CATEGORY;
  const a1Keywords = process.env.A1_TREND_KEYWORDS;

  // When A1 context is available: find a blog topic matching this week's top category
  if (a1Category) {
    const categoryMap = {
      'Premium Materials': ['Premium Materials'],
      'Dress & Formal': ['Dress & Formal'],
      'Athletic': ['Performance'],
      'Tactical & Outdoor': ['Tactical & Outdoor'],
      'Gift Sets': ['Gift Sets'],
      'Casual & No-Show': ['Performance'],
    };
    const targetCategories = categoryMap[a1Category] || [a1Category];
    const matching = BLOG_TOPICS.filter(t => targetCategories.includes(t.category));

    if (matching.length > 0) {
      // Rotate within the matching category to avoid repeats
      const idx = weekOfYear % matching.length;
      const topic = matching[idx];
      console.log(`🔗 A1 Context: top category = "${a1Category}" → topic aligned`);
      if (a1Keywords) console.log(`   A1 trend keywords: ${a1Keywords}`);
      return { ...topic, a1Context: { category: a1Category, keywords: a1Keywords } };
    }
  }

  // Fallback: standard week-rotation
  const topicIndex = weekOfYear % BLOG_TOPICS.length;
  console.log('📌 No A1 context — using standard week rotation');
  return BLOG_TOPICS[topicIndex];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  const supabase = getSupabase();
  await logHealth(supabase, 'running');
  console.log('🚀 A3 — Content Agent v1.1');
  console.log('━'.repeat(40));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ חסר ANTHROPIC_API_KEY');
    process.exit(1);
  }

  if (!SHOPIFY_TOKEN) {
    console.error('❌ חסר SHOPIFY_MASTER_TOKEN');
    process.exit(1);
  }

  const weekOfYear = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  const topic = selectTopic(weekOfYear);

  console.log(`\n📌 נושא השבוע (שבוע ${weekOfYear}): "${topic.title}"`);
  console.log(`   קטגוריה: ${topic.category}${topic.a1Context ? ' [A1-aligned]' : ' [rotation]'}`);

  // כתוב מאמר עם Claude
  console.log('\n✍️  כותב מאמר עם Claude...');
  let bodyHtml = await writeArticle(topic);
  let wordCount = bodyHtml.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  console.log(`  ✅ ${wordCount} מילים נכתבו`);

  // ── QA Gate — Sonnet second-pass review against Iron Law 2 before publish ──
  // Up to MAX_QA_ROUNDS revise rounds. If still not approved — do not publish.
  let qaApproved   = false;
  let qaIssues     = [];
  let qaRoundsUsed = 0;

  for (let round = 0; round <= MAX_QA_ROUNDS; round++) {
    console.log(`  🔍 QA round ${round + 1}/${MAX_QA_ROUNDS + 1}...`);
    const qaResult = await reviewContent({ kind: 'article', html: bodyHtml, topic, wordCount });
    qaRoundsUsed = round + 1;

    if (qaResult.approved) {
      qaApproved = true;
      console.log('  ✅ QA approved');
      break;
    }

    qaIssues = qaResult.issues;
    console.log(`  ⚠️  QA revise requested: ${qaIssues.join('; ')}`);

    if (round < MAX_QA_ROUNDS) {
      bodyHtml = await writeArticle(topic, qaIssues.join('; '));
      wordCount = bodyHtml.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
      console.log(`  ✍️  Rewritten (${wordCount} words) — re-checking...`);
    }
  }

  if (!qaApproved) {
    console.log(`  ❌ QA failed after ${qaRoundsUsed} round(s) — withholding publication`);

    console.log('\n━'.repeat(40));
    console.log('⏸️  A3 הושלם — מאמר נעצר ע"י QA (לא פורסם)');

    await sendQAWithheldReport(topic, bodyHtml, qaIssues, qaRoundsUsed);

    if (!DRY_RUN && supabase) {
      const metricDate = new Date().toISOString().split('T')[0];
      await writeMetrics(supabase, 'A3', metricDate, [
        { name: 'blog_published',   value: 0,            unit: 'count' },
        { name: 'blog_word_count',  value: wordCount,    unit: 'count' },
        { name: 'qa_passed',        value: 0,            unit: 'count' },
        { name: 'qa_rounds_used',   value: qaRoundsUsed, unit: 'count' },
      ]);
    }

    // The agent behaved correctly — it refused to publish weak content.
    // This is a successful run, not a system failure.
    await logHealth(supabase, 'success');
    return;
  }

  // Validate internal links — strip broken URLs before publishing
  console.log('  🔍 Validating internal links...');
  const { html: validatedHtml, broken: brokenLinks } = await validateInternalLinks(bodyHtml);
  if (brokenLinks.length > 0) {
    console.log(`  ⚠️  ${brokenLinks.length} broken link(s) stripped from article`);
  } else {
    console.log('  ✅ All internal links valid');
  }

  // פרסם ל-Shopify
  let article = null;
  let published = false;

  if (DRY_RUN) {
    const scheduledAt = getPeakPublishAt();
    console.log(`\n📤 [DRY_RUN] מדלג על פרסום Shopify (would schedule: ${scheduledAt})`);
    article = { body_html: validatedHtml, handle: 'dry-run' };
  } else {
    console.log('\n📤 מפרסם ל-Shopify...');
    try {
      const handle = topic.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 80);

      console.log('  🔍 בודק אם מאמר קיים...');
      const exists = await articleExists(handle);

      if (exists) {
        console.log(`  ⏭️  מאמר קיים (${handle}) — מדלג (idempotency guard)`);
        article = { body_html: validatedHtml, handle };
        published = true;
      } else {
        article = await publishArticle(topic, validatedHtml);
        published = true;
        console.log(`  ✅ מתוזמן לפרסום: https://sockacademy.store/blogs/news/${article.handle}`);
      }
    } catch (e) {
      console.error(`  ❌ שגיאה בפרסום: ${e.message}`);
    }
  }

  console.log('\n━'.repeat(40));
  console.log(`✅ A3 הושלם — ${published ? 'מתוזמן/פורסם' : 'נכשל'}`);

  await sendReport(topic, article || { body_html: validatedHtml, handle: '' }, published);

  // Command Center KPIs — feeds A0's unified daily brief (deterministic, no AI;
  // skip during DRY_RUN so simulated runs never pollute real KPI history)
  if (!DRY_RUN && supabase) {
    const metricDate = new Date().toISOString().split('T')[0];
    await writeMetrics(supabase, 'A3', metricDate, [
      { name: 'blog_published', value: published ? 1 : 0, unit: 'count' },
      { name: 'blog_word_count', value: wordCount,         unit: 'count' },
      { name: 'qa_passed',      value: 1,                  unit: 'count' },
      { name: 'qa_rounds_used', value: qaRoundsUsed,        unit: 'count' },
    ]);
  }

  await logHealth(supabase, 'success');
}

main().catch(async e => {
  console.error('💥 Fatal:', e.message);
  let sb = null;
  try {
    sb = getSupabase();
    await logHealth(sb, 'failure', e.message);
  } catch (_) {}
  await notifyTelegram(heTelegramMsg('A3 Content', '🚨 כשל קריטי!',
    `ה-agent נכשל בהרצה. נדרשת בדיקה דחופה.\nשגיאה: <code>${e.message}</code>`));
  await handleFatalError({ agentId: 'A3', agentName: 'Content Director', err: e, supabase: sb });
  process.exit(1);
});
