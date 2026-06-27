// Shared Telegram utility — sends a message to the CEO chat.
// All agents that push alerts and summaries call this.
//
// Usage:
//   const { sendTelegram } = require('../../corp/core/telegram.js');
//   await sendTelegram('<b>A14 COO:</b> הדוח הושלם');
//
// Supports Telegram HTML: <b>, <i>, <code>, <pre>
// Silently skips if TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set.

const MAX_LENGTH = 4096;

async function sendTelegram(text, { silent = false } = {}) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('[Telegram] skipped — TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return false;
  }

  const body = text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH - 3) + '...' : text;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:              chatId,
        text:                 body,
        parse_mode:           'HTML',
        disable_notification: silent,
      }),
    });

    const json = await res.json();
    if (!json.ok) {
      console.error(`[Telegram] API error: ${json.description}`);
      return false;
    }

    console.log('[Telegram] ✅ sent');
    return true;
  } catch (err) {
    console.error(`[Telegram] network error: ${err.message}`);
    return false;
  }
}

module.exports = { sendTelegram };
