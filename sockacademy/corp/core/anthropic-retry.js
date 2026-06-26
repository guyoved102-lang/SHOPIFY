// Shared Anthropic retry wrapper — exponential backoff for transient network errors.
// Used by all agents that call client.messages.create().
//
// Retryable signals: Premature close, fetch failed, ECONNRESET, ETIMEDOUT, socket hang up.
// These are infrastructure glitches — not auth errors or rate limits (which are permanent).
//
// Usage:
//   const { withRetry } = require('../../corp/core/anthropic-retry.js');
//   const msg = await withRetry(() => client.messages.create({ ... }), 'A18');

const RETRYABLE_SIGNALS = [
  'Premature close',
  'fetch failed',
  'ECONNRESET',
  'ETIMEDOUT',
  'socket hang up',
  'network timeout',
];

const MAX_RETRIES  = 3;
const BASE_DELAY   = 2000; // ms — doubles each retry: 2s → 4s → 8s

async function withRetry(fn, label = 'Anthropic') {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg         = err?.message ?? '';
      const isRetryable = RETRYABLE_SIGNALS.some(sig => msg.includes(sig));

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1); // 2s, 4s
        console.log(`[${label}] transient error (attempt ${attempt}/${MAX_RETRIES}): ${msg} — retrying in ${delay / 1000}s`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

module.exports = { withRetry };
