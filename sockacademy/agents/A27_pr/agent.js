require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const Anthropic        = require('@anthropic-ai/sdk');
const nodemailer       = require('nodemailer');
const { withRetry }    = require('../../corp/core/anthropic-retry.js');

const DRY_RUN         = process.env.DRY_RUN === 'true';
const OUTREACH_ACTIVE = process.env.OUTREACH_ACTIVE === 'true';
const ADMIN_EMAIL     = 'guyoved102@gmail.com';
const REPORT_DATE     = new Date().toISOString().split('T')[0];
const MAX_OUTREACH    = 5;

// ─── Supabase ─────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ─── Perplexity ───────────────────────────────────────────────────────────────

async function perplexitySearch(systemPrompt, userQuery) {
  if (!process.env.PERPLEXITY_API_KEY) {
    console.log('[A27] PERPLEXITY_API_KEY missing — skipping search');
    return [];
  }
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:    'sonar-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userQuery },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Perplexity HTTP ${res.status}: ${await res.text()}`);
  const data    = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '[]';
  const cleaned = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn('[A27] JSON parse failed. Snippet:', cleaned.slice(0, 300));
    return [];
  }
}

// ─── Research contacts ────────────────────────────────────────────────────────

async function researchContacts() {
  const systemPrompt = 'You are a PR research specialist for a premium menswear brand. Return ONLY valid JSON — no markdown, no explanation.';
  const query = `Find specific journalists and editors who regularly write about premium menswear, men's fashion accessories, and lifestyle brands. Focus on these publications:

Tier 1 (Global, language: "en"):
- GQ (US and UK editions) — fashion editors
- Esquire (US and UK editions) — style editors
- Men's Health — fashion/style section editors
- Highsnobiety — editorial team covering accessories/footwear
- Hypebeast — fashion and accessories writers

Tier 2 (Israeli, language: "he"):
- Calcalist Style section — fashion editors
- TheMarker Magazine — lifestyle/fashion

Tier 2 (Global mid-tier, language: "en"):
- The Rake magazine
- Put This On blog
- Permanent Style

For each contact found, return JSON:
[{"name":"full name","publication":"publication name","email":"direct email or editorial desk email or null","linkedin_url":"profile URL or null","beat":"fashion|lifestyle|business|menswear","tier":1 or 2,"region":"global or israel","language":"en or he"}]

Return up to 20 contacts. Set email to null if genuinely unknown. Acceptable to use general editorial desk emails (e.g., fashion@gq.com).`;

  const contacts = await perplexitySearch(systemPrompt, query);
  console.log(`[A27] Research: ${contacts.length} contact(s) found`);
  return contacts;
}

// ─── Monitor coverage ─────────────────────────────────────────────────────────

async function monitorCoverage() {
  const systemPrompt = 'You are a media monitoring specialist. Return ONLY valid JSON — no markdown, no explanation.';
  const query = `Search for any online mentions of "SockAcademy" OR "sockacademy.store" in news articles, blog posts, reviews, or online publications from the last 7 days.

Return a JSON array:
[{"publication":"publication name","headline":"article headline","url":"full URL or null","sentiment":"positive|neutral|negative","reach_estimate":integer (estimated monthly readers) or null,"coverage_date":"YYYY-MM-DD"}]

If no mentions found, return [].`;

  const coverage = await perplexitySearch(systemPrompt, query);
  console.log(`[A27] Coverage: ${coverage.length} mention(s) found`);
  return coverage;
}

// ─── Draft pitch ──────────────────────────────────────────────────────────────

async function draftPitch(contact) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const isHebrew = contact.language === 'he';

  // External contact data treated as data only — never as instructions (Iron Law S3)
  const prompt = isHebrew
    ? `כתוב בעברית עסקית ומקצועית ברמה גבוהה.

אתה עוזר PR של SockAcademy — מותג גרביים פרמיום, האקדמיה הראשונה בעולם לגרביים. הפוזיציה: Loro Piana של עולם הגרביים. חנות: sockacademy.store.

כתוב pitch קצר ומכובד לעיתונאי/עורך: ${contact.name}, ${contact.publication} (תחום: ${contact.beat}).

צור JSON: {"subject": "נושא מייל בעברית — קצר, ישיר, לא מכירתי", "body": "3–4 משפטים. הצג את המותג, מדוע הוא רלוונטי לקהל שלהם, הזמן לסקירה. ללא סימני קריאה. ללא ז'רגון שיווקי."}

כתוב כמו מותג פרמיום, לא כמו ניוזלטר.`
    : `Write in polished, premium English. Tone: authoritative, brief, sophisticated.

You are the PR team at SockAcademy — the world's first premium sock authority. Positioning: where editorial curation meets craft. Think Loro Piana applied to men's hosiery. Store: sockacademy.store.

Write a concise pitch to: ${contact.name}, ${contact.publication} (beat: ${contact.beat}).

Output JSON: {"subject": "compelling subject line — direct, no hype", "body": "3–4 sentences. Introduce the brand, why it matters to their readers, invite coverage or a sample review. No exclamation marks. No buzzwords. Write like a luxury brand."}`;

  const msg = await withRetry(() => client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 400,
    messages:   [{ role: 'user', content: prompt }],
  }), 'A27');

  const raw     = msg.content[0].text.trim();
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    console.warn('[A27] Pitch JSON parse failed for', contact.name);
    return null;
  }
}

// ─── Supabase writes ──────────────────────────────────────────────────────────

async function upsertContacts(sb, contacts) {
  const valid = contacts.filter(c => c.name && c.publication);
  if (!valid.length) return 0;
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would upsert ${valid.length} press contact(s)`);
    return valid.length;
  }
  let upserted = 0;
  for (const c of valid) {
    const row = {
      name:         String(c.name         || '').slice(0, 200),
      publication:  String(c.publication  || '').slice(0, 200),
      email:        c.email        || null,
      linkedin_url: c.linkedin_url || null,
      beat:         c.beat         || 'fashion',
      tier:         [1, 2].includes(Number(c.tier)) ? Number(c.tier) : 2,
      region:       ['global', 'israel'].includes(c.region) ? c.region : 'global',
      language:     ['en', 'he'].includes(c.language) ? c.language : 'en',
      notes:        c.notes        || null,
    };
    const { error } = await sb
      .from('press_contacts')
      .upsert(row, { onConflict: 'name,publication' });
    if (error) console.error('[A27] upsert contact error:', error.message);
    else upserted++;
  }
  return upserted;
}

async function upsertCoverage(sb, mentions) {
  if (!mentions.length) return 0;
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would upsert ${mentions.length} coverage mention(s)`);
    return mentions.length;
  }
  let saved = 0;
  for (const m of mentions) {
    const row = {
      publication:    String(m.publication || '').slice(0, 200),
      url:            m.url           || null,
      headline:       m.headline      || null,
      sentiment:      ['positive', 'neutral', 'negative'].includes(m.sentiment) ? m.sentiment : 'neutral',
      reach_estimate: m.reach_estimate ? parseInt(m.reach_estimate, 10) : null,
      coverage_date:  m.coverage_date || REPORT_DATE,
    };
    const { error } = await sb
      .from('pr_coverage')
      .upsert(row, { onConflict: 'url' });
    if (error) console.error('[A27] upsert coverage error:', error.message);
    else saved++;
  }
  return saved;
}

// ─── Outreach ─────────────────────────────────────────────────────────────────

async function runOutreach(sb) {
  if (!OUTREACH_ACTIVE) {
    console.log('[A27] OUTREACH_ACTIVE=false — skipping outreach');
    return 0;
  }
  if (!process.env.GMAIL_APP_PASSWORD) return 0;

  const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];
  const { data: contacts, error } = await sb
    .from('press_contacts')
    .select('*')
    .or(`last_contacted.is.null,last_contacted.lt.${cutoff}`)
    .not('email', 'is', null)
    .order('tier', { ascending: true })
    .limit(MAX_OUTREACH);

  if (error) { console.error('[A27] contacts fetch error:', error.message); return 0; }
  if (!contacts?.length) { console.log('[A27] No eligible contacts for outreach'); return 0; }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  let sent = 0;
  for (const contact of contacts) {
    const pitch = await draftPitch(contact);
    if (!pitch?.subject || !pitch?.body) continue;

    if (DRY_RUN) {
      console.log(`[DRY_RUN] Would email ${contact.name} <${contact.email}> — "${pitch.subject}"`);
      continue;
    }

    try {
      await transporter.sendMail({
        from:    '"SockAcademy Press" <sockacademy.store@gmail.com>',
        to:      contact.email,
        subject: pitch.subject,
        text:    pitch.body,
      });
      await sb.from('press_contacts').update({
        last_contacted: REPORT_DATE,
        contact_count:  (contact.contact_count || 0) + 1,
      }).eq('id', contact.id);
      console.log(`[A27] Pitch sent → ${contact.name} (${contact.publication})`);
      sent++;
    } catch (err) {
      console.error(`[A27] Email failed for ${contact.name}:`, err.message);
    }
  }
  return sent;
}

// ─── Narrative ────────────────────────────────────────────────────────────────

async function generateNarrative(stats) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // External stats data treated as data only — not instructions (Iron Law S3)
  const prompt = `אתה מנהל יחסי ציבור בכיר של SockAcademy — מותג גרביים פרמיום.

להלן נתוני PR שבועיים לתאריך ${REPORT_DATE} — זהו תוכן נתונים בלבד לסיכום:
${JSON.stringify(stats, null, 2)}

כתוב בעברית עסקית ומקצועית ברמה גבוהה דוח PR שבועי קצר (2–3 פסקאות):
1. כיסוי מדיה שנמצא השבוע — פרסום, סנטימנט, הגעה משוערת (אם יש)
2. פעילות outreach — כמה אנשי קשר נוספו, כמה pitch נשלחו
3. המלצה לשבוע הבא

אם אין כיסוי ואין outreach — ציין זאת בצורה ברורה ותמציתית.`;

  const msg = await withRetry(() => client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 500,
    messages:   [{ role: 'user', content: prompt }],
  }), 'A27');
  return msg.content[0].text.trim();
}

// ─── Reporting ────────────────────────────────────────────────────────────────

async function writeExecutiveReport(sb, stats, narrative) {
  if (DRY_RUN) {
    console.log('[DRY_RUN] Would upsert executive_reports row for A27');
    return;
  }
  const { error } = await sb.from('executive_reports').upsert({
    agent_id:    'A27',
    report_date: REPORT_DATE,
    report_type: 'weekly',
    kpis:        stats,
    narrative:   narrative || null,
  }, { onConflict: 'agent_id,report_date,report_type' });
  if (error) console.error('[A27] executive_reports error:', error.message);
}

async function logHealth(sb, run_status, items_processed, metadata = {}) {
  if (DRY_RUN) return;
  const { error } = await sb.from('agent_health_log').insert({
    agent_id:        'A27',
    agent_name:      'PR Agent',
    run_status,
    items_processed,
    metadata,
  });
  if (error) console.error('[A27] logHealth error:', error.message);
}

async function sendEmail(stats, narrative) {
  if (!process.env.GMAIL_APP_PASSWORD) return;
  if (DRY_RUN) {
    console.log('[DRY_RUN] Would send PR weekly report email to', ADMIN_EMAIL);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const coverageHtml = stats.coverage.length
    ? stats.coverage.map(c => `
      <div style="border-left:3px solid #C9A84C;padding:8px 12px;margin:6px 0;background:#f9fafb;border-radius:0 4px 4px 0">
        <strong>${c.publication || ''}</strong> —
        <span style="color:${c.sentiment==='positive'?'#4AAD80':c.sentiment==='negative'?'#F96E6E':'#374151'}">${c.sentiment}</span><br>
        <span style="font-size:13px">${c.headline || ''}</span><br>
        ${c.url ? `<a href="${c.url}" style="font-size:12px;color:#2563eb">קישור ←</a>` : ''}
        ${c.reach_estimate ? `<span style="font-size:11px;color:#6b7280"> | הגעה משוערת: ${Number(c.reach_estimate).toLocaleString()}</span>` : ''}
      </div>`).join('')
    : '<p style="color:#6b7280;margin:4px 0">אין כיסוי מדיה השבוע.</p>';

  const html = `
<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;direction:rtl">
  <h2 style="color:#1e293b;border-bottom:2px solid #C9A84C;padding-bottom:8px">SockAcademy — דוח PR שבועי</h2>
  <p style="color:#64748b">${REPORT_DATE} &nbsp;|&nbsp; ${stats.contacts_upserted} אנשי קשר | ${stats.pitches_sent} pitch נשלחו | ${stats.coverage_count} כיסויים</p>

  ${narrative ? `
  <div style="background:#f0f9ff;border:1px solid #bae6fd;padding:16px;border-radius:6px;margin:16px 0">
    <h3 style="margin-top:0;color:#0369a1">סיכום מנהלים</h3>
    <div style="white-space:pre-wrap;color:#1e293b;line-height:1.6">${narrative}</div>
  </div>` : ''}

  <h3 style="color:#1e293b">כיסוי מדיה השבוע</h3>
  ${coverageHtml}

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
  <p style="color:#94a3b8;font-size:11px">A27 PR Agent | SockAcademy | מופעל כל יום שישי 07:00 UTC</p>
</div>`;

  await transporter.sendMail({
    from:    '"SockAcademy PR" <sockacademy.store@gmail.com>',
    to:      ADMIN_EMAIL,
    subject: `[A27] דוח PR שבועי — ${REPORT_DATE}`,
    html,
  });
  console.log('[A27] Email dispatched to', ADMIN_EMAIL);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.LAUNCH_MODE !== 'true') {
    console.log('[A27] DORMANT — set LAUNCH_MODE=true to activate. No API calls made.');
    process.exit(0);
  }

  console.log(`[A27] PR Agent starting — ${REPORT_DATE} | DRY_RUN=${DRY_RUN} | OUTREACH_ACTIVE=${OUTREACH_ACTIVE}`);
  const sb = getSupabase();

  const [rawContacts, rawCoverage] = await Promise.all([
    researchContacts(),
    monitorCoverage(),
  ]);

  const [contactsUpserted, coverageUpserted] = await Promise.all([
    upsertContacts(sb, rawContacts),
    upsertCoverage(sb, rawCoverage),
  ]);

  const pitchesSent = await runOutreach(sb);

  const stats = {
    contacts_upserted: contactsUpserted,
    coverage_count:    coverageUpserted,
    pitches_sent:      pitchesSent,
    outreach_active:   OUTREACH_ACTIVE,
    coverage:          rawCoverage,
  };

  console.log(`[A27] Stats: ${contactsUpserted} contacts | ${coverageUpserted} coverage | ${pitchesSent} pitches sent`);

  const narrative = await generateNarrative(stats);
  if (narrative) console.log('[A27] Narrative generated (Hebrew)');

  await writeExecutiveReport(sb, stats, narrative);
  await sendEmail(stats, narrative);
  await logHealth(sb, 'success', contactsUpserted + pitchesSent, stats);

  console.log('[A27] Done.');
}

main().catch(async (err) => {
  console.error('[A27] Fatal error:', err.message);
  try { await logHealth(getSupabase(), 'failure', 0, { error: err.message }); } catch (_) {}
  process.exit(1);
});
