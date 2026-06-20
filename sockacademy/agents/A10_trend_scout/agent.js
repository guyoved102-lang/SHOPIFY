/**
 * A10 — Trend Scout Agent v1.0
 * Weekly: Google Trends + Reddit → Claude analysis → Google Sheets + email digest
 * Schedule: Every Sunday 08:00 Israel time (06:00 UTC)
 *
 * Data flow:
 *   1. SCOUT  — fetch Google Trends interest scores + Reddit top posts
 *   2. FILTER — remove brand-blocked content (kids, novelty, cartoon...)
 *   3. ANALYZE — Claude synthesizes raw signals → structured trend report
 *   4. OUTPUT — write to Sheets tab "A10_Trends" + email digest to Guy
 */

require('dotenv').config({ path: '../../.env' });
const Anthropic      = require('@anthropic-ai/sdk');
const googleTrends   = require('google-trends-api');
const { createClient } = require('@supabase/supabase-js');
const nodemailer     = require('nodemailer');

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, errorMessage = '') {
  const now = new Date().toISOString();
  try {
    await supabase.from('agent_health_log').upsert(
      { agent: 'A10', status, last_run: now, error_message: errorMessage, updated_at: now },
      { onConflict: 'agent' }
    );
  } catch (e) { console.error('Health log failed:', e.message); }
}

async function sendErrorAlert(errorMessage) {
  if (!process.env.GMAIL_APP_PASSWORD) return;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: '"SockAcademy Agents" <sockacademy.store@gmail.com>',
    to: 'sockacademy.store@gmail.com',
    subject: '🚨 A10 Trend Scout FAILED — action needed',
    html: `<div style="font-family:monospace"><h2>🚨 A10 Failed</h2><p><strong>Time:</strong> ${new Date().toISOString()}</p><pre style="background:#f5f5f5;padding:12px;border-radius:4px">${errorMessage}</pre></div>`,
  }).catch(e => console.error('Alert email failed:', e.message));
}

// Seed keywords per category — structural placeholders, expand after market research
const CATEGORIES = {
  'Merino Wool': [
    'merino wool socks',
    'merino crew socks',
    'wool socks men',
    'merino hiking socks',
  ],
  'Performance': [
    'no show socks',
    'running socks men',
    'athletic socks',
    'performance socks',
  ],
  'Tactical': [
    'tactical socks',
    'hiking boot socks',
    'boot socks men',
    'military socks',
  ],
};

// Subreddits to scan for sock-adjacent conversations
const SUBREDDITS = [
  'malefashionadvice',
  'femalefashionadvice',
  'running',
  'hiking',
  'ultrarunning',
  'Fitness',
  'BuyItForLife',
];

// Brand safety — any result containing these terms is blocked
const BLOCKED_TERMS = [
  'kid', 'child', 'baby', 'toddler', 'boy', 'girl',
  'novelty', 'funny', 'cartoon', 'dog', 'cat', 'animal',
  'joke', 'gag', 'cute animal',
];

function isBrandSafe(text) {
  const lower = (text || '').toLowerCase();
  return !BLOCKED_TERMS.some(t => lower.includes(t));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 1 — SCOUT: Google Trends
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchGoogleTrendsScore(keyword) {
  try {
    const raw = await googleTrends.interestOverTime({
      keyword,
      startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
      geo: '',         // global
      hl: 'en-US',
    });

    const parsed   = JSON.parse(raw);
    const timeline = parsed?.default?.timelineData || [];
    if (!timeline.length) return { keyword, score: 0, direction: 'flat' };

    const values  = timeline.map(d => d.value?.[0] || 0);
    const avg     = values.reduce((a, b) => a + b, 0) / values.length;
    const recent  = values.slice(-4);  // last ~1 week (4 data points)
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;

    const direction = recentAvg > avg * 1.1 ? 'rising'
                    : recentAvg < avg * 0.9 ? 'falling'
                    : 'stable';

    return {
      keyword,
      score: Math.round(recentAvg),
      direction,
    };
  } catch {
    return { keyword, score: 0, direction: 'unknown' };
  }
}

async function scoutGoogleTrends() {
  console.log('\n📈 Scanning Google Trends...');
  const results = [];

  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    for (const keyword of keywords) {
      process.stdout.write(`   ${keyword}... `);
      const data = await fetchGoogleTrendsScore(keyword);
      console.log(`score=${data.score} (${data.direction})`);
      results.push({ category, ...data });
      await new Promise(r => setTimeout(r, 1200)); // rate limit
    }
  }

  return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 1 — SCOUT: Reddit
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchRedditPosts(subreddit, query) {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=top&t=week&limit=10`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SockAcademy-TrendScout/1.0 (research bot)' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.children || [])
      .map(c => c.data)
      .filter(p => isBrandSafe(p.title) && isBrandSafe(p.selftext))
      .map(p => ({
        subreddit,
        title:   p.title,
        score:   p.score,
        comments: p.num_comments,
        url:     `https://reddit.com${p.permalink}`,
      }));
  } catch {
    return [];
  }
}

async function scoutReddit() {
  console.log('\n🔴 Scanning Reddit...');
  const allPosts = [];
  const queries  = ['socks recommendation', 'best socks', 'merino socks', 'hiking socks', 'running socks'];

  for (const sub of SUBREDDITS) {
    for (const q of queries) {
      const posts = await fetchRedditPosts(sub, q);
      if (posts.length) {
        console.log(`   r/${sub} "${q}" → ${posts.length} posts`);
        allPosts.push(...posts);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // De-duplicate by URL, sort by engagement
  const seen = new Set();
  const unique = allPosts
    .filter(p => { if (seen.has(p.url)) return false; seen.add(p.url); return true; })
    .sort((a, b) => (b.score + b.comments) - (a.score + a.comments))
    .slice(0, 20); // top 20 posts only

  console.log(`   Total unique posts: ${unique.length}`);
  return unique;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 2 — ANALYZE: Claude synthesizes everything
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function analyzeWithClaude(trendsData, redditPosts) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const trendsBlock = trendsData
    .map(t => `[${t.category}] "${t.keyword}" → score ${t.score}/100, trend: ${t.direction}`)
    .join('\n');

  const redditBlock = redditPosts.slice(0, 15)
    .map(p => `r/${p.subreddit} | score:${p.score} | "${p.title}"`)
    .join('\n');

  const prompt = `You are a product trend analyst for SockAcademy, a premium global sock brand.

Analyze the following real-time data and identify the top 5 trending sock opportunities.

GOOGLE TRENDS DATA (last 30 days, global):
${trendsBlock}

REDDIT TOP POSTS (this week):
${redditBlock}

BRAND RULES — STRICT:
- ALLOWED categories: Merino Wool, Performance (running/athletic/no-show), Tactical (hiking/military/boot)
- BLOCKED: kids, novelty, funny, cartoon, animal-themed, cheap/fashion socks
- Minimum retail price positioning: $18+ per pair
- Target customer: adult men and women who care about quality and durability

Return a JSON array of exactly 5 trend objects, ranked #1 (strongest) to #5:
[
  {
    "rank": 1,
    "trend_name": "string — clear product-level name, e.g. 'Men\\'s Merino Wool Crew Socks'",
    "category": "Merino Wool | Performance | Tactical",
    "trend_score": number 1-100,
    "trend_direction": "rising | stable | falling",
    "reddit_signal": "string — key insight from Reddit data or 'none'",
    "google_signal": "string — key insight from Google Trends or 'none'",
    "cj_search_term": "string — exact term to search in CJ Dropshipping catalog",
    "estimated_retail_usd": number,
    "rationale": "string — 1-2 sentences why this is an opportunity now"
  }
]

Return ONLY valid JSON. No markdown, no explanation outside the array.`;

  console.log('\n🤖 Claude analyzing trends...');

  const message = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages:   [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0]?.text || '[]';

  try {
    return JSON.parse(raw);
  } catch {
    // Try to extract JSON from response if wrapped in text
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 3 — OUTPUT: Supabase
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function writeToSupabase(trends) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log('⚠️  Supabase credentials missing — skipping write');
    return;
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const scoutedAt = new Date().toISOString();
  const rows = trends.map(t => ({
    scouted_at:           scoutedAt,
    rank:                 t.rank,
    trend_name:           t.trend_name,
    category:             t.category,
    trend_score:          t.trend_score,
    trend_direction:      t.trend_direction,
    google_signal:        t.google_signal,
    reddit_signal:        t.reddit_signal,
    cj_search_term:       t.cj_search_term,
    estimated_retail_usd: t.estimated_retail_usd,
    rationale:            t.rationale,
  }));

  const { error } = await supabase.from('trends').insert(rows);
  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  console.log(`   ✅ ${rows.length} trends written to Supabase → trends`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 3 — OUTPUT: Email Digest
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendEmailDigest(trends) {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log('⚠️  GMAIL_APP_PASSWORD missing — skipping email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const directionIcon = d => d === 'rising' ? '▲' : d === 'falling' ? '▼' : '→';
  const directionColor = d => d === 'rising' ? '#4ade80' : d === 'falling' ? '#f87171' : '#9ca3af';

  const trendRows = trends.map(t => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #1a1a1a;color:#C9A84C;font-size:14px;font-weight:700">#${t.rank}</td>
      <td style="padding:14px 0;border-bottom:1px solid #1a1a1a;color:#F0EDE6;font-size:14px">${t.trend_name}</td>
      <td style="padding:14px 0;border-bottom:1px solid #1a1a1a">
        <span style="background:#1a1a2a;color:#a78bfa;font-size:11px;padding:2px 7px;border-radius:2px">${t.category}</span>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #1a1a1a;text-align:center">
        <span style="color:${directionColor(t.trend_direction)};font-weight:700">${directionIcon(t.trend_direction)} ${t.trend_score}</span>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #1a1a1a;color:#9ca3af;font-size:12px">${t.cj_search_term}</td>
    </tr>
  `).join('');

  const rationaleCards = trends.slice(0, 3).map(t => `
    <div style="background:#111;border-left:3px solid #C9A84C;padding:14px 16px;margin-bottom:12px;border-radius:0 4px 4px 0">
      <div style="color:#C9A84C;font-size:12px;font-weight:700;margin-bottom:6px">#${t.rank} — ${t.trend_name}</div>
      <div style="color:#9ca3af;font-size:13px;line-height:1.7">${t.rationale}</div>
      ${t.reddit_signal !== 'none' ? `<div style="color:#6b7280;font-size:11px;margin-top:8px">Reddit: ${t.reddit_signal}</div>` : ''}
    </div>
  `).join('');

  const html = `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:660px;margin:0 auto;background:#0A0A0A;color:#F0EDE6;padding:40px 32px;border-radius:8px">
  <div style="text-align:center;margin-bottom:32px;border-bottom:1px solid #2a2a2a;padding-bottom:24px">
    <div style="font-size:11px;letter-spacing:4px;color:#C9A84C;text-transform:uppercase">SOCKACADEMY</div>
    <div style="font-size:22px;font-weight:700;margin-top:10px">A10 — Weekly Trend Report</div>
    <div style="color:#6b7280;font-size:12px;margin-top:6px">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>

  <div style="margin-bottom:28px">
    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px">Top 5 Trends This Week</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <th style="text-align:left;color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px;width:30px">#</th>
        <th style="text-align:left;color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px">Trend</th>
        <th style="text-align:left;color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px">Category</th>
        <th style="text-align:center;color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px">Score</th>
        <th style="text-align:left;color:#4b5563;font-size:10px;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px">CJ Term</th>
      </tr>
      ${trendRows}
    </table>
  </div>

  <div style="margin-bottom:28px">
    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px">Top 3 Insights</div>
    ${rationaleCards}
  </div>

  <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:16px;text-align:center">
    <div style="color:#9ca3af;font-size:12px;margin-bottom:8px">Full data in Google Sheets</div>
    <div style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:1px">Tab: A10_Trends</div>
  </div>

  <p style="color:#4b5563;font-size:11px;margin-top:28px;text-align:center">A10 Trend Scout v1.0 · SockAcademy · Runs every Sunday</p>
</div>`;

  await transporter.sendMail({
    from:    'SockAcademy A10 Agent <sockacademy.store@gmail.com>',
    to:      'guyoved102@gmail.com',
    subject: `A10 — Weekly Trends: Top pick "${trends[0]?.trend_name || 'see report'}" ↗`,
    html,
  });

  console.log('📧 Weekly digest sent to guyoved102@gmail.com');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('🚀 A10 — Trend Scout Agent v1.0');
  console.log('━'.repeat(44));
  console.log(`📦 Categories: ${Object.keys(CATEGORIES).join(' | ')}`);
  console.log(`🔍 Keywords: ${Object.values(CATEGORIES).flat().length} total`);
  console.log(`🔴 Subreddits: ${SUBREDDITS.length}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Missing ANTHROPIC_API_KEY');
    process.exit(1);
  }

  const supabase = getSupabase();
  await logHealth(supabase, 'RUNNING');

  // Layer 1 — Scout
  const [trendsData, redditPosts] = await Promise.allSettled([
    scoutGoogleTrends(),
    scoutReddit(),
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));

  console.log(`\n📊 Raw data: ${trendsData.length} trend signals, ${redditPosts.length} Reddit posts`);

  if (!trendsData.length && !redditPosts.length) {
    console.error('❌ No data collected from any source — aborting');
    process.exit(1);
  }

  // Layer 2 — Analyze
  const trends = await analyzeWithClaude(trendsData, redditPosts);

  if (!trends.length) {
    console.error('❌ Claude returned no trends — check ANTHROPIC_API_KEY');
    process.exit(1);
  }

  console.log(`\n✅ Claude identified ${trends.length} trends:`);
  trends.forEach(t => console.log(`   #${t.rank} [${t.category}] ${t.trend_name} — score ${t.trend_score}/100 (${t.trend_direction})`));

  // Layer 3 — Output
  console.log('\n💾 Writing outputs...');
  await writeToSupabase(trends);
  await sendEmailDigest(trends);

  console.log('\n' + '━'.repeat(44));
  console.log(`✅ A10 complete — ${trends.length} trends scouted and logged`);
  await logHealth(supabase, 'SUCCESS');
}

main().catch(async e => {
  console.error('💥 Fatal:', e.message);
  try {
    const sb = getSupabase();
    await logHealth(sb, 'ERROR', e.message);
    await sendErrorAlert(e.message);
  } catch (_) {}
  process.exit(1);
});
