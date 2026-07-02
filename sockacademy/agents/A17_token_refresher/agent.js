'use strict';
require('dotenv').config({ path: '../../.env' });

const https = require('https');
const nodemailer = require('nodemailer');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');

const REQUIRED = [
  'META_APP_ID', 'META_APP_SECRET', 'META_ACCESS_TOKEN',
  'GH_TOKEN', 'GH_REPO_OWNER', 'GH_REPO_NAME',
  'GMAIL_APP_PASSWORD',
];
for (const k of REQUIRED) {
  if (!process.env[k]) { console.error(`Missing env: ${k}`); process.exit(1); }
}

const {
  META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN,
  GH_TOKEN, GH_REPO_OWNER, GH_REPO_NAME,
  GMAIL_APP_PASSWORD,
} = process.env;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';
const FROM_EMAIL  = 'sockacademy.store@gmail.com';
const DRY_RUN     = process.env.DRY_RUN === 'true';

// ── helpers ────────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// ── Meta: exchange short-lived token for 60-day long-lived token ───────────

async function exchangeToken() {
  const url =
    `https://graph.facebook.com/v21.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${META_APP_ID}` +
    `&client_secret=${META_APP_SECRET}` +
    `&fb_exchange_token=${META_ACCESS_TOKEN}`;

  const { status, body } = await httpsGet(url);
  const data = JSON.parse(body);

  if (status !== 200 || !data.access_token) {
    throw new Error(`Meta token exchange failed (${status}): ${body}`);
  }

  const expiresInDays = data.expires_in ? Math.round(data.expires_in / 86400) : 60;
  return { token: data.access_token, expiresInDays };
}

// ── GitHub: update repository secret ──────────────────────────────────────

async function getPublicKey() {
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${GH_REPO_OWNER}/${GH_REPO_NAME}/actions/secrets/public-key`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'sockacademy-a17',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };
  const { status, body } = await httpsRequest(options);
  if (status !== 200) throw new Error(`GitHub public key fetch failed (${status}): ${body}`);
  return JSON.parse(body);
}

async function encryptSecret(publicKeyBase64, secretValue) {
  // libsodium-wrappers is required for sealed-box encryption (GitHub requirement)
  const sodium = require('libsodium-wrappers');
  await sodium.ready;
  const binKey   = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
  const binValue = sodium.from_string(secretValue);
  const encBytes = sodium.crypto_box_seal(binValue, binKey);
  return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
}

async function updateGithubSecret(secretName, secretValue) {
  const { key_id, key } = await getPublicKey();
  const encryptedValue   = await encryptSecret(key, secretValue);

  const payload = JSON.stringify({ encrypted_value: encryptedValue, key_id });
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${GH_REPO_OWNER}/${GH_REPO_NAME}/actions/secrets/${secretName}`,
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'User-Agent': 'sockacademy-a17',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };
  const { status, body } = await httpsRequest(options, payload);
  if (status !== 201 && status !== 204) {
    throw new Error(`GitHub secret update failed (${status}): ${body}`);
  }
}

// ── Email notification ─────────────────────────────────────────────────────

async function sendReport({ success, expiresInDays, nextRunDate, error }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: FROM_EMAIL, pass: GMAIL_APP_PASSWORD },
  });

  const subject = success
    ? `✅ SockAcademy — META_ACCESS_TOKEN renewed (${expiresInDays} days)`
    : `❌ SockAcademy — META_ACCESS_TOKEN renewal FAILED`;

  const html = success
    ? `<h2>Token Refreshed Successfully</h2>
       <p><strong>Valid for:</strong> ${expiresInDays} days</p>
       <p><strong>Next auto-refresh:</strong> ${nextRunDate}</p>
       <p><strong>Updated secret:</strong> META_ACCESS_TOKEN in GitHub Actions</p>
       <p style="color:#666;font-size:12px">Agent A17 — Token Refresher · SockAcademy</p>`
    : `<h2>Token Refresh FAILED</h2>
       <p><strong>Error:</strong> ${error}</p>
       <p>Please refresh the token manually in Meta Business Manager and update the GitHub Secret META_ACCESS_TOKEN.</p>
       <p style="color:#666;font-size:12px">Agent A17 — Token Refresher · SockAcademy</p>`;

  await transporter.sendMail({
    from: `"SockAcademy A17" <${FROM_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject,
    html,
  });
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[A17] Token Refresher — ${new Date().toISOString()}${DRY_RUN ? ' [DRY_RUN]' : ''}`);

  try {
    console.log('[A17] Exchanging Meta token…');
    const { token, expiresInDays } = await exchangeToken();
    console.log(`[A17] New token received. Valid ~${expiresInDays} days.`);

    const nextRunDate = new Date();
    nextRunDate.setDate(nextRunDate.getDate() + 50);
    const nextRunStr = nextRunDate.toISOString().split('T')[0];

    if (DRY_RUN) {
      console.log('[A17] DRY_RUN=true — skipping GitHub secret update and email.');
      console.log(`[A17] Would set META_ACCESS_TOKEN in ${GH_REPO_OWNER}/${GH_REPO_NAME}`);
      return;
    }

    console.log('[A17] Updating GitHub Secret META_ACCESS_TOKEN…');
    await updateGithubSecret('META_ACCESS_TOKEN', token);
    console.log('[A17] GitHub secret updated.');

    await sendReport({ success: true, expiresInDays, nextRunDate: nextRunStr });
    console.log(`[A17] Report sent to ${ADMIN_EMAIL}. Done.`);
  } catch (err) {
    console.error('[A17] ERROR:', err.message);
    try {
      await sendReport({ success: false, error: err.message });
    } catch (mailErr) {
      console.error('[A17] Failed to send error email:', mailErr.message);
    }
    await notifyTelegram(heTelegramMsg('A17 Token Refresher', '🚨 כשל קריטי!',
      `ה-agent נכשל בהרצה. נדרשת בדיקה דחופה.\nשגיאה: <code>${err.message}</code>`));
    process.exit(1);
  }
}

main();
