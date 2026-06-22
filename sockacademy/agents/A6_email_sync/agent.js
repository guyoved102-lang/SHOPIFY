/**
 * A6 — Klaviyo Email Sync Agent v1.0
 * Source of truth: email content is hardcoded here (from KLAVIYO_ABANDONED_CART_FLOW.md)
 * Creates or updates 3 Klaviyo templates, then emails Guy a summary + Klaviyo links.
 * Run: once before launch, or whenever email content changes.
 */

require('dotenv').config({ path: '../../.env' });
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, errorMsg = '') {
  if (!supabase) return;
  try {
    const run_status = status === 'failed' ? 'failure' : status;
    await supabase.from('agent_health_log').insert({
      agent_id:      'A6',
      agent_name:    'Email Sync',
      run_status,
      error_message: errorMsg || null,
      metadata:      {},
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}

const KLAVIYO_KEY = process.env.KLAVIYO_PRIVATE_API_KEY;
const KLAVIYO_BASE = 'https://a.klaviyo.com/api';
const REVISION = '2024-10-15';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL CONTENT — source of truth
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const EMAILS = [
  {
    name: 'SA — Abandoned Cart 1h',
    subject: 'You left something behind',
    preview: "Your cart is saved. Your standards shouldn't slip.",
    delay: '1 hour after checkout started',
    body: `Hi {{ first_name|default:"there" }},

You were close.

Your cart is still saved — including everything you selected at SockAcademy.

We don't follow up often. But when someone takes the time to choose premium socks and then leaves, we'd rather ask once than assume you changed your mind about quality.

→ Return to your cart: {{ checkout_url }}

If something wasn't right — the size, the price, a question about the product — reply to this email. We'll sort it.

— The SockAcademy Team`,
  },
  {
    name: 'SA — Abandoned Cart 24h',
    subject: "What's still in your cart — and why it's worth it",
    preview: 'A brief case for not settling.',
    delay: '24 hours after checkout started',
    body: `Hi {{ first_name|default:"there" }},

Still thinking about it?

Here's the honest case for finishing what you started:

The socks you selected aren't a luxury purchase — they're a long-term decision. A pair of Merino Wool Crew socks, maintained correctly, lasts 3–5 years. That works out to less than $10 a year for socks you'll actually want to wear every day.

The alternative is buying cheap ones again, replacing them in six months, and still not having what you wanted in the first place.

Your cart is saved. → Complete your order: {{ checkout_url }}

— The SockAcademy Team`,
  },
  {
    name: 'SA — Abandoned Cart 48h',
    subject: "Last reminder — your cart expires soon",
    preview: "We won't follow up after this.",
    delay: '48 hours after checkout started',
    body: `Hi {{ first_name|default:"there" }},

This is the last time we'll mention it.

Your SockAcademy cart is about to expire. If you were waiting for a reason — this is it: we don't do aggressive discounts or countdown timers. We let the product make the case.

If now isn't the right time, that's fine. We'll be here when it is.

→ {{ checkout_url }}

— The SockAcademy Team`,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTML BUILDER — SockAcademy dark email design
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildHTML(email) {
  const bodyHtml = email.body
    .split('\n\n')
    .map(para => {
      const line = para.trim();
      if (!line) return '';
      if (line.startsWith('→')) {
        return `<p style="margin:20px 0"><a href="${line.includes('checkout_url') ? '{{ checkout_url }}' : '#'}" style="display:inline-block;background:#C9A84C;color:#0A0A0A;font-weight:700;font-size:14px;letter-spacing:0.5px;padding:12px 24px;border-radius:3px;text-decoration:none">${line}</a></p>`;
      }
      if (line.startsWith('— The')) {
        return `<p style="color:#9ca3af;font-size:13px;margin-top:24px;border-top:1px solid #2a2a2a;padding-top:20px">${line}</p>`;
      }
      return `<p style="color:#D1C9BF;font-size:15px;line-height:1.8;margin:0 0 14px">${line}</p>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A">
    <tr><td align="center" style="padding:40px 20px">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr><td style="padding-bottom:32px;border-bottom:1px solid #1a1a1a;text-align:center">
          <div style="font-size:11px;letter-spacing:4px;color:#C9A84C;text-transform:uppercase;margin-bottom:6px">SOCKACADEMY</div>
          <div style="font-size:11px;color:#4b5563;letter-spacing:1px">sockacademy.store</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 0">
          ${bodyHtml}
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid #1a1a1a;padding-top:24px">
          <p style="color:#4b5563;font-size:11px;text-align:center;margin:0;line-height:1.8">
            SockAcademy · sockacademy.store<br>
            <a href="{{ unsubscribe_url }}" style="color:#6b7280;text-decoration:none">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(email) {
  return email.body + '\n\n---\nSockAcademy · sockacademy.store\n{{ unsubscribe_url }}';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KLAVIYO API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function klaviyoHeaders() {
  return {
    'Authorization': `Klaviyo-API-Key ${KLAVIYO_KEY}`,
    'revision': REVISION,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

async function listTemplates() {
  const all = [];
  let url = `${KLAVIYO_BASE}/templates/?page[size]=10`;

  while (url) {
    const res = await fetch(url, { headers: klaviyoHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(`Klaviyo list: ${JSON.stringify(data.errors || data)}`);
    all.push(...(data.data || []));
    url = data.links?.next || null;
  }

  return all;
}

async function createTemplate(email) {
  const res = await fetch(`${KLAVIYO_BASE}/templates/`, {
    method: 'POST',
    headers: klaviyoHeaders(),
    body: JSON.stringify({
      data: {
        type: 'template',
        attributes: {
          name: email.name,
          html: buildHTML(email),
          text: buildText(email),
        },
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Klaviyo create: ${JSON.stringify(data.errors || data)}`);
  return data.data;
}

async function updateTemplate(id, email) {
  const res = await fetch(`${KLAVIYO_BASE}/templates/${id}/`, {
    method: 'PATCH',
    headers: klaviyoHeaders(),
    body: JSON.stringify({
      data: {
        type: 'template',
        id,
        attributes: {
          name: email.name,
          html: buildHTML(email),
          text: buildText(email),
        },
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Klaviyo update: ${JSON.stringify(data.errors || data)}`);
  return data.data;
}

async function syncTemplate(email, existingTemplates) {
  const existing = existingTemplates.find(t => t.attributes?.name === email.name);

  if (existing) {
    const updated = await updateTemplate(existing.id, email);
    return { action: 'updated', id: existing.id, name: email.name };
  } else {
    const created = await createTemplate(email);
    return { action: 'created', id: created.id, name: email.name };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL CONFIRMATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendConfirmation(results) {
  if (!process.env.GMAIL_APP_PASSWORD) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const rows = results.map(r => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#F0EDE6;font-size:14px">${r.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a">
        <span style="background:${r.action === 'created' ? '#1a3a1a' : '#1a2a3a'};color:${r.action === 'created' ? '#4ade80' : '#60a5fa'};font-size:11px;font-weight:700;padding:3px 8px;border-radius:2px;text-transform:uppercase">${r.action}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a">
        <a href="https://www.klaviyo.com/email-templates/${r.id}" style="color:#C9A84C;font-size:12px;text-decoration:none">פתח ב-Klaviyo →</a>
      </td>
    </tr>
  `).join('');

  const html = `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0A0A0A;color:#F0EDE6;padding:32px;border-radius:8px">
  <div style="text-align:center;margin-bottom:28px;border-bottom:1px solid #2a2a2a;padding-bottom:20px">
    <div style="font-size:11px;letter-spacing:4px;color:#C9A84C;text-transform:uppercase">SOCKACADEMY</div>
    <div style="font-size:20px;font-weight:700;margin-top:8px">A6 — Email Sync Complete</div>
    <div style="color:#6b7280;font-size:12px;margin-top:4px">${new Date().toLocaleDateString('he-IL')}</div>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <th style="text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px">Template</th>
      <th style="text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px">Status</th>
      <th style="text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px">Link</th>
    </tr>
    ${rows}
  </table>

  <div style="background:#1a1a1a;border:1px solid #C9A84C33;border-radius:6px;padding:16px;margin-top:24px">
    <div style="font-size:11px;color:#C9A84C;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">הצעד הבא — הקצאה ב-Klaviyo</div>
    <ol style="color:#9ca3af;font-size:13px;line-height:2;margin:0;padding-left:18px">
      <li>Klaviyo → <strong style="color:#F0EDE6">Flows</strong> → Abandoned Cart flow</li>
      <li>לחץ על כל Email block → <strong style="color:#F0EDE6">Edit Template</strong></li>
      <li>בחר את ה-template המתאים מהרשימה למעלה</li>
      <li>הגדר Subject + Preview text בהתאם</li>
      <li>שמור → הפעל את ה-Flow</li>
    </ol>
  </div>

  <p style="color:#4b5563;font-size:11px;margin-top:24px;text-align:center">A6 Email Sync Agent v1.0 · SockAcademy</p>
</div>`;

  await transporter.sendMail({
    from: 'SockAcademy A6 Agent <sockacademy.store@gmail.com>',
    to: 'guyoved102@gmail.com',
    subject: `A6 — ${results.length} Klaviyo templates ${results[0]?.action || 'synced'} ✓`,
    html,
  });

  console.log('📧 Confirmation sent');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  const supabase = getSupabase();
  await logHealth(supabase, 'running');
  console.log('🚀 A6 — Klaviyo Email Sync Agent v1.0');
  console.log('━'.repeat(40));

  if (!KLAVIYO_KEY) {
    console.error('❌ Missing KLAVIYO_PRIVATE_API_KEY');
    process.exit(1);
  }

  console.log('📋 Fetching existing Klaviyo templates...');
  const existing = await listTemplates();
  console.log(`   Found ${existing.length} existing templates`);

  const results = [];

  for (const email of EMAILS) {
    process.stdout.write(`  ${email.name}... `);
    try {
      const result = await syncTemplate(email, existing);
      console.log(`✅ ${result.action} (${result.id})`);
      results.push(result);
    } catch (e) {
      console.log(`❌ ${e.message}`);
      results.push({ name: email.name, action: 'error', id: '', error: e.message });
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('━'.repeat(40));
  console.log(`✅ Done — ${results.filter(r => r.action !== 'error').length}/${results.length} synced`);

  await sendConfirmation(results);
  await logHealth(supabase, 'success');
}

main().catch(async e => {
  console.error('💥 Fatal:', e.message);
  await logHealth(getSupabase(), 'failure', e.message).catch(() => {});
  process.exit(1);
});
