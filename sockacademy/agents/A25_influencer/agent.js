'use strict';
require('dotenv').config();

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { withRetry } = require('../../corp/core/anthropic-retry.js');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');

// ── Environment ──────────────────────────────────────────────────────────────
const DRY_RUN     = process.env.DRY_RUN === 'true';
const REPORT_DATE = process.env.REPORT_DATE || new Date().toISOString().slice(0, 10);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';
const SMTP_USER   = 'sockacademy.store@gmail.com';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: SMTP_USER, pass: process.env.GMAIL_APP_PASSWORD }
});

// ── Pillar 1 — Lead Processing ───────────────────────────────────────────────

async function fetchNewLeads() {
  const { data, error } = await supabase
    .from('influencer_leads')
    .select('*')
    .eq('status', 'new')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function generateFitScore(lead) {
  const tagsJson = JSON.stringify(lead.aesthetic_tags || []);
  const engRate  = lead.engagement_rate ?? 0;

  const prompt = `You are a brand alignment analyst for SockAcademy — a premium minimalist sock brand.
Brand DNA: Loro Piana aesthetic. High-end, athletic elegance, minimalist.

Evaluate this influencer lead and output JSON only:
{
  "fit_score": <integer 0-100>,
  "fit_justification": "<one objective sentence in English>"
}

Scoring rubric:
- Visual Aesthetic (40 pts): Tags: ${tagsJson}.
  Max points: minimalist, premium, monochrome, clean, editorial.
  Zero points: loud, colorful, chaotic, fast-fashion.
- Niche Alignment (40 pts): Niche: "${lead.niche}".
  Max points: high-end lifestyle, athletic elegance, luxury streetwear.
  Zero points: unrelated niches.
- Engagement Potential (20 pts): Rate: ${engRate}%.
  <1% = 0pts | 1-2% = 10pts | 2-4% = 15pts | 4%+ = 20pts.

Return ONLY valid JSON. No markdown. No explanation outside JSON.`;

  const response = await withRetry(() => anthropic.messages.create({
    model:     'claude-sonnet-4-6',
    max_tokens: 150,
    messages:  [{ role: 'user', content: prompt }]
  }), 'A25');

  return JSON.parse(response.content[0].text.trim());
}

async function generateOutreachDraft(lead) {
  const name = lead.full_name || `@${lead.handle}`;

  const prompt = `You are writing a partnership outreach email on behalf of SockAcademy — a premium minimalist sock brand.
Tone: Authoritative. Minimalist. Exclusive. Think Loro Piana, not H&M.
Language: Perfect English. Zero emojis. Zero exclamation marks. Maximum 4 sentences.

Lead:
- Name: ${name}
- Niche: ${lead.niche}
- Fit Score: ${lead.fit_score}/100

Output JSON only:
{
  "subject": "<short premium subject line — max 8 words>",
  "body": "<3-4 sentences. Reference their aesthetic. Introduce SockAcademy briefly. Invite collaboration.>"
}

Return ONLY valid JSON. No markdown.`;

  const response = await withRetry(() => anthropic.messages.create({
    model:     'claude-sonnet-4-6',
    max_tokens: 300,
    messages:  [{ role: 'user', content: prompt }]
  }), 'A25');

  return JSON.parse(response.content[0].text.trim());
}

async function processLeads(leads) {
  const results = [];
  for (const lead of leads) {
    try {
      const { fit_score, fit_justification } = await generateFitScore(lead);
      lead.fit_score         = fit_score;
      lead.fit_justification = fit_justification;

      const { subject, body } = await generateOutreachDraft(lead);
      results.push({ ...lead, draft_subject: subject, draft_body: body });
    } catch (err) {
      console.error(`[A25] Lead processing failed for ${lead.handle}:`, err.message);
      results.push({ ...lead, fit_score: null, fit_justification: null, draft_subject: null, draft_body: null });
    }
  }
  return results;
}

// ── Pillar 2 — Supabase Write ────────────────────────────────────────────────

async function upsertLeads(processedLeads) {
  if (DRY_RUN) {
    console.log('[DRY_RUN] Skipping Supabase writes for', processedLeads.length, 'leads');
    return;
  }
  for (const lead of processedLeads) {
    if (lead.fit_score === null || lead.fit_score === undefined) continue;
    const { error } = await supabase
      .from('influencer_leads')
      .update({
        fit_score:         lead.fit_score,
        fit_justification: lead.fit_justification,
        draft_subject:     lead.draft_subject,
        draft_body:        lead.draft_body,
        status:            'draft_ready',
        processed_at:      new Date().toISOString()
      })
      .eq('id', lead.id);
    if (error) console.error(`[A25] Failed to update lead ${lead.handle}:`, error.message);
  }
}

async function upsertReport(summary) {
  if (DRY_RUN) {
    console.log('[DRY_RUN] Skipping executive_reports write');
    return;
  }
  const { error } = await supabase
    .from('executive_reports')
    .upsert({
      agent_id:    'A25',
      report_type: 'influencer_outreach',
      report_date: REPORT_DATE,
      payload:     summary
    }, { onConflict: 'agent_id,report_type,report_date' });
  if (error) console.error('[A25] executive_reports write failed:', error.message);
}

// ── Pillar 3 — Email Report ──────────────────────────────────────────────────

async function buildNarrative(processedLeads) {
  const scores      = processedLeads.filter(l => l.fit_score !== null && l.fit_score !== undefined).map(l => l.fit_score);
  const minScore    = scores.length ? Math.min(...scores) : 0;
  const maxScore    = scores.length ? Math.max(...scores) : 0;
  const avgScore    = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const lowFitCount = scores.filter(s => s < 50).length;

  const prompt = `כתוב בעברית עסקית ומקצועית ברמה גבוהה.
אתה עוזר ה-CMO של SockAcademy מסכם את פעילות סוכן A25 — Influencer Outreach.

נתונים:
- תאריך: ${REPORT_DATE}
- לידים שעובדו: ${processedLeads.length}
- טווח fit scores: ${minScore}–${maxScore}, ממוצע: ${avgScore}
- לידים עם score נמוך מ-50: ${lowFitCount}

כתוב 3-4 משפטים בלבד + המלצה עסקית אחת לשיפור תהליך גיוס influencers.`;

  const response = await withRetry(() => anthropic.messages.create({
    model:     'claude-sonnet-4-6',
    max_tokens: 250,
    messages:  [{ role: 'user', content: prompt }]
  }), 'A25');

  return response.content[0].text.trim();
}

function buildEmailHtml(narrative, processedLeads) {
  const draftReadyCount = processedLeads.filter(l => l.fit_score !== null && l.fit_score >= 50).length;
  const lowFitCount     = processedLeads.filter(l => l.fit_score !== null && l.fit_score < 50).length;

  const rows = processedLeads.map(l => {
    const score   = l.fit_score !== null && l.fit_score !== undefined ? l.fit_score : '—';
    const badge   = l.fit_score !== null && l.fit_score < 50 ? '⚠️ Low Fit' : 'draft_ready';
    const bgColor = l.fit_score >= 70 ? '#f0fdf4' : l.fit_score >= 50 ? '#fffbeb' : '#fef2f2';
    return `
      <tr style="background:${bgColor}">
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">@${l.handle}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${l.niche || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700">${score}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${badge}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280">${l.fit_justification || '—'}</td>
      </tr>`;
  }).join('');

  const emptyState = processedLeads.length === 0
    ? `<p style="color:#6b7280;font-size:13px;margin:16px 0 0">
        No new leads to process today. Add rows with <code>status='new'</code> to the
        <code>influencer_leads</code> table in Supabase.
       </p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Georgia,serif;max-width:820px;margin:0 auto;padding:24px;background:#f9fafb">

  <div style="background:#0a0a0a;color:#f0ede6;padding:24px 32px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:20px;font-weight:400;letter-spacing:2px">A25 — INFLUENCER OUTREACH</h1>
    <p style="margin:6px 0 0;color:#9ca3af;font-size:13px">${REPORT_DATE} · SockAcademy</p>
  </div>

  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px 32px">

    <h2 style="font-size:13px;font-weight:600;color:#374151;margin:0 0 12px;letter-spacing:1px;text-transform:uppercase">Executive Summary</h2>
    <p style="color:#374151;line-height:1.75;margin:0 0 24px;font-size:14px;direction:rtl;text-align:right">${narrative}</p>

    <div style="display:flex;gap:16px;margin-bottom:24px">
      <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#0a0a0a">${processedLeads.length}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;letter-spacing:1px">LEADS PROCESSED</div>
      </div>
      <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#16a34a">${draftReadyCount}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;letter-spacing:1px">DRAFTS READY</div>
      </div>
      <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#dc2626">${lowFitCount}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;letter-spacing:1px">LOW FIT (&lt;50)</div>
      </div>
    </div>

    <h2 style="font-size:13px;font-weight:600;color:#374151;margin:0 0 12px;letter-spacing:1px;text-transform:uppercase">Lead Pipeline</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:10px 12px;text-align:left;color:#374151;border-bottom:2px solid #d1d5db">Handle</th>
          <th style="padding:10px 12px;text-align:left;color:#374151;border-bottom:2px solid #d1d5db">Niche</th>
          <th style="padding:10px 12px;text-align:center;color:#374151;border-bottom:2px solid #d1d5db">Score</th>
          <th style="padding:10px 12px;text-align:left;color:#374151;border-bottom:2px solid #d1d5db">Status</th>
          <th style="padding:10px 12px;text-align:left;color:#374151;border-bottom:2px solid #d1d5db">Justification</th>
        </tr>
      </thead>
      <tbody>${rows}${emptyState}</tbody>
    </table>

    <div style="margin-top:24px;padding:16px;background:#fffbeb;border:1px solid #fbbf24;border-radius:6px">
      <p style="margin:0;font-size:13px;color:#92400e">
        <strong>Next step:</strong> Supabase → <code>influencer_leads</code> → filter
        <code>status = 'draft_ready'</code> → copy <code>draft_subject</code> +
        <code>draft_body</code> → send manually → set <code>sent_at = now()</code>
      </p>
    </div>

  </div>

  <div style="background:#f3f4f6;padding:12px 32px;border-radius:0 0 8px 8px;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">SockAcademy · A25 Influencer Outreach · ${REPORT_DATE}</p>
  </div>

</body>
</html>`;
}

async function sendEmail(narrative, processedLeads) {
  if (DRY_RUN) {
    console.log('[DRY_RUN] Skipping email send');
    return;
  }
  const html = buildEmailHtml(narrative, processedLeads);
  await transporter.sendMail({
    from:    `"SockAcademy A25" <${SMTP_USER}>`,
    to:      ADMIN_EMAIL,
    subject: `[A25] Influencer Outreach — ${processedLeads.length} leads processed · ${REPORT_DATE}`,
    html
  });
  console.log('[A25] Email sent to', ADMIN_EMAIL);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  // LAUNCH_MODE gate — protocol #27
  if (process.env.LAUNCH_MODE !== 'true') {
    console.log('[A25] LAUNCH_MODE not active — exiting without API calls.');
    process.exit(0);
  }

  console.log(`[A25] Starting — DRY_RUN=${DRY_RUN} DATE=${REPORT_DATE}`);

  let processedLeads = [];
  let narrative      = '';

  // Pillar 1 — Lead Processing
  try {
    const leads = await fetchNewLeads();
    console.log(`[A25] Found ${leads.length} new leads`);
    if (leads.length > 0) {
      processedLeads = await processLeads(leads);
      console.log(`[A25] Processed ${processedLeads.length} leads`);
    }
  } catch (err) {
    console.error('[A25] Pillar 1 (Lead Processing) failed:', err.message);
  }

  // Pillar 2 — Supabase Write
  try {
    if (processedLeads.length > 0) {
      await upsertLeads(processedLeads);
      console.log('[A25] Supabase leads updated');
    }
    const scores = processedLeads.filter(l => l.fit_score !== null && l.fit_score !== undefined).map(l => l.fit_score);
    await upsertReport({
      date:            REPORT_DATE,
      total_processed: processedLeads.length,
      draft_ready:     processedLeads.filter(l => l.fit_score !== null && l.fit_score >= 50).length,
      low_fit:         processedLeads.filter(l => l.fit_score !== null && l.fit_score < 50).length,
      avg_score:       scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      leads:           processedLeads.map(l => ({ handle: l.handle, fit_score: l.fit_score, status: l.draft_subject ? 'draft_ready' : 'error' }))
    });
    console.log('[A25] executive_reports updated');
  } catch (err) {
    console.error('[A25] Pillar 2 (Supabase Write) failed:', err.message);
  }

  // Pillar 3 — Email Report
  try {
    narrative = await buildNarrative(processedLeads);
    console.log('[A25] Narrative built');
    await sendEmail(narrative, processedLeads);
  } catch (err) {
    console.error('[A25] Pillar 3 (Email Report) failed:', err.message);
  }

  console.log('[A25] Complete');
  process.exit(0);
})();
