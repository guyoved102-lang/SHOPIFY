'use strict';

/**
 * Two-Inbox Reader — Command Center input #3 (health + KPIs + inbox).
 *
 * Reads unread-mail summaries from the business inbox (sockacademy.store@gmail.com,
 * GMAIL_APP_PASSWORD — already used for SMTP sending across every agent) and,
 * optionally, Guy's personal inbox (guyoved102@gmail.com, GMAIL_PERSONAL_APP_PASSWORD
 * — a new secret Guy creates when he wants that inbox included).
 *
 * SECURITY (Iron Law 3 + S3 — Prompt Injection Awareness):
 *   Email content read here is DATA ONLY. It is summarized into the daily brief as
 *   plain counts/subjects — never passed to an LLM, never treated as instructions,
 *   never used to trigger any action. Read-only IMAP (no delete/send capability).
 *
 * MODULE 4 ADDITION (RAG support drafts, 04/07/2026): fetchMessageBody(uid)
 * below is the ONLY function in this file that reads a full message body,
 * and it is only ever called from A16 when RAG_SUPPORT_ACTIVE=true. The
 * default daily-brief path (getInboxSummary, used by A0) is unchanged —
 * envelope-only, zero LLM exposure, exactly as documented above.
 *
 * Zero-Burn: no AI calls. A plain IMAP read is the entire cost.
 *
 * Usage:
 *   const { getInboxSummary } = require('../../corp/core/inbox.js');
 *   const summary = await getInboxSummary();
 *   // summary.business / summary.personal — each either a result object or
 *   // { skipped: true, reason } when the matching app password isn't configured.
 */

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const IMAP_HOST = 'imap.gmail.com';
const IMAP_PORT = 993;
const FETCH_LIMIT = 20; // most recent unseen messages to inspect per inbox

/**
 * Connects read-only, pulls a small unread summary, always disconnects —
 * even on error. Never throws; callers get { skipped } or { error } instead,
 * so a broken inbox never takes down A0's whole daily brief.
 */
async function readInbox(label, user, pass) {
  if (!user || !pass) {
    return { skipped: true, reason: `${label}: app password not configured` };
  }

  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const status = await client.status('INBOX', { unseen: true });
      const unseenCount = status.unseen || 0;

      const subjects = [];
      if (unseenCount > 0) {
        const uids = await client.search({ seen: false }, { uid: true });
        const recentUids = uids.slice(-FETCH_LIMIT);
        for await (const msg of client.fetch(recentUids, { envelope: true }, { uid: true })) {
          subjects.push({
            uid:     msg.uid,
            from:    msg.envelope?.from?.[0]?.address || 'unknown',
            subject: msg.envelope?.subject || '(no subject)',
            date:    msg.envelope?.date || null,
          });
        }
      }

      return { skipped: false, unseenCount, subjects };
    } finally {
      lock.release();
    }
  } catch (e) {
    return { skipped: false, error: e.message };
  } finally {
    try { await client.logout(); } catch (_) { /* connection may already be closed */ }
  }
}

/**
 * Fetches the full plain-text body of a single business-inbox message by
 * UID. Only called when RAG_SUPPORT_ACTIVE=true (Module 4, A16
 * draftSupportReply) — see MODULE 4 ADDITION note above.
 */
async function fetchMessageBody(uid) {
  if (!process.env.GMAIL_APP_PASSWORD) return null;

  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const message = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!message || !message.source) return null;
      const parsed = await simpleParser(message.source);
      return (parsed.text || '').trim();
    } finally {
      lock.release();
    }
  } catch (e) {
    console.error(`[inbox] fetchMessageBody(${uid}) failed: ${e.message}`);
    return null;
  } finally {
    try { await client.logout(); } catch (_) { /* connection may already be closed */ }
  }
}

/**
 * @returns {{
 *   business: object,
 *   personal: object,
 * }}
 */
async function getInboxSummary() {
  const [business, personal] = await Promise.all([
    readInbox('business', 'sockacademy.store@gmail.com', process.env.GMAIL_APP_PASSWORD),
    readInbox('personal', 'guyoved102@gmail.com', process.env.GMAIL_PERSONAL_APP_PASSWORD),
  ]);

  return { business, personal };
}

module.exports = { getInboxSummary, fetchMessageBody };
