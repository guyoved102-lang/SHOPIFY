# A5 Instagram Publish-Failure Telegram Alert — Design (not implemented)

**Written 05/07/2026 (Fable 5, read-only design pass).** Closes the gap that let A5's 100% Instagram
publish failure run silently for 10+ days: `publishToInstagram()` errors are caught per-post inside
`main()`, logged to console only, and the run still ends in `logHealth('success')` — so the fatal-error
Telegram alert at the bottom of the file never fires.

## 1. Where it hooks in — `agents/A5_social/agent.js`, publish loop (~lines 542–560)

Current code (the silent swallow is the inner `catch (e)`):

```js
try {
  const id = await publishToInstagram(fullCaption, p.imageUrl, p.plan.type);
  console.log(`  ✅ ${p.plan.day} published — ID: ${id}`);
  publishedCount++;
} catch (e) {
  console.error(`  ❌ ${p.plan.day}: ${e.message}`);   // <-- error dies here; run still "succeeds"
}
```

Design: collect failures during the loop, send **one aggregated alert after the loop** (not inside the
catch — one message per run, not per post):

```js
const publishFailures = [];                              // NEW — before the for-loop
...
} catch (e) {
  console.error(`  ❌ ${p.plan.day}: ${e.message}`);
  publishFailures.push({ day: p.plan.day, type: p.plan.type,
                         hook: p.caption.hook, error: e.message });   // NEW
}
...
// NEW — after the loop, still inside `if (!DRY_RUN)`:
if (publishFailures.length > 0) {
  const lines = publishFailures.map(f =>
    `• <b>${f.day}</b> (${f.type}) — "${f.hook.slice(0, 60)}"\n  שגיאת Meta: <code>${f.error}</code>`).join('\n');
  await notifyTelegram(heTelegramMsg('A5 Social', '⚠️ פרסום לאינסטגרם נכשל',
    `${publishFailures.length} מתוך ${publishFailures.length + publishedCount} פוסטים נכשלו בפרסום. ` +
    `הקפשנים עברו QA והתמונות נוצרו — הכשל הוא בשלב הפרסום מול Meta בלבד.\n\n${lines}\n\n` +
    `👉 <b>מה לבדוק:</b> הרשאות ב-Meta Business Suite — חיבור חשבון האינסטגרם (@sockacademy.store), ` +
    `תוקף ה-Access Token, ו-IG_USER_ID. זו תקלת הרשאות בצד Meta, לא בקוד.\n` +
    `שעת הכשל: ${new Date().toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem' })}`));
}
```

`notifyTelegram` and `heTelegramMsg` are **already imported** in A5 (used in `main().catch()` at ~line
587), so no new imports or dependencies. `notifyTelegram` is the DRY_RUN-safe wrapper per the
telegram_hebrew_standard — mandatory here.

## 2. The alert message (rendered example, canonical format)

> **A5 Social — ⚠️ פרסום לאינסטגרם נכשל (יום ראשון, 5 ביולי)**
>
> 3 מתוך 3 פוסטים נכשלו בפרסום. הקפשנים עברו QA והתמונות נוצרו — הכשל הוא בשלב הפרסום מול Meta בלבד.
>
> • **Monday** (FEED) — "The sock is the first thing you put on..."
>   שגיאת Meta: `Meta media: (#10) Application does not have permission for this action`
>
> 👉 **מה לבדוק:** הרשאות ב-Meta Business Suite — חיבור חשבון האינסטגרם (@sockacademy.store), תוקף ה-Access Token, ו-IG_USER_ID. זו תקלת הרשאות בצד Meta, לא בקוד.
> שעת הכשל: 09:14
>
> *הופעל אוטומטית ב-A5 Social*

Header/date/footer come from `heTelegramMsg()` + `heDate()` exactly as fleet-wide (Iron Law 6).

## 3. Trigger condition (recommendation)

Fire **once per run, aggregated**, whenever `publishFailures.length > 0` in a live (non-DRY_RUN) run.
Reasoning: A5 runs on a weekly cron and publishes a small batch per run — per-post alerts would send
3–4 near-identical messages back-to-back, while once-per-run is one Telegram message per week even if
everything keeps failing. That is loud enough to never miss and quiet enough to not need extra
throttling state (no Supabase dedup table, no new infra). No suppression across runs: while the Meta
issue is open, a weekly reminder is a feature, not spam.

## 4. What this does NOT change

- Does **not** fix the underlying Meta permissions/IG_USER_ID issue — that remains Guy's manual task
  in Meta Business Suite (tracked separately, memory blocker #14).
- Does **not** change DRY_RUN behavior: `publishToInstagram()` still no-ops in DRY_RUN, and
  `notifyTelegram` already suppresses sends when `DRY_RUN=true`.
- Does **not** alter caption generation, QA gate, image generation, Drive backup, the weekly email,
  KPI writes, `logHealth`, or the existing fatal-error catch. The per-post `catch` still swallows the
  error for flow-control purposes — the run intentionally continues to the email/KPI steps.

## 5. Implementation note for later

This is ready for a mechanical-tier implementer pass: a single-file change in
`agents/A5_social/agent.js` (~10 new lines: one array declaration, one push inside the existing catch,
one post-loop `notifyTelegram(heTelegramMsg(...))` block), no new imports, no workflow/YAML/secret
changes, verifiable with a DRY_RUN + a mocked live run. Optionally the implementer may also add a
`social_posts_publish_failed` KPI row alongside the existing `writeMetrics` call, but the alert alone
closes the observability gap. Not implemented in this pass.
