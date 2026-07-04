// Shared second-pass content QA gate — Sonnet reviews a draft against Iron Law 2
// (Loro Piana brand voice) before A3 publishes an article or A5 publishes a caption.
// One shared call site (DRY) with a rubric per content kind, built directly from
// the existing generation prompts in A3_content/agent.js and A5_social/agent.js —
// so the QA rubric never drifts from what the writer prompt actually asks for.
//
// Usage:
//   const { reviewContent } = require('../../corp/core/qa-gate.js');
//   const result = await reviewContent({ kind: 'article', html, topic, wordCount });
//   const result = await reviewContent({ kind: 'caption', caption, theme });
//   // result: { approved: boolean, issues: string[] }

const Anthropic = require('@anthropic-ai/sdk');
const { withRetry } = require('./anthropic-retry.js');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildArticleRubricPrompt({ html, topic, wordCount }) {
  return `You are the QA reviewer for SockAcademy — the world's first dedicated sock authority. A writer just drafted a blog article. Review it strictly against these rules and report every violation. Do not fix anything — only report.

TOPIC: ${topic.title}
REPORTED WORD COUNT: ${wordCount}

RULES (all mandatory — flag any violation):
1. No exclamation marks anywhere.
2. No emojis anywhere.
3. No generic superlatives or adjective stacking ("amazing", "perfect", "best-in-class", "game-changer", stacked adjectives like "incredible, luxurious, must-have").
4. Word count must be between 1,500 and 2,000 words (reported: ${wordCount}).
5. Structure: must use <h2> for main subheadings and <h3> for sub-points, <p> for paragraphs, <ul>/<li> for lists where appropriate. Must NOT include <html>, <head>, <body>, or any wrapping tags.
6. Must open with a strong, authoritative statement — not a rhetorical question, not generic scene-setting fluff.
7. No inline styles (no style="..." attributes).
8. Tone must be authoritative expertise (materials science, construction, use cases) — not fluffy lifestyle content.

ARTICLE HTML TO REVIEW:
${html}

Respond with ONLY raw JSON on a single logical structure — no markdown code fences (no \`\`\`), no text before or after. Use single quotes inside string values, never unescaped double quotes:
{"approved": true|false, "issues": ["specific, actionable issue 1", "specific, actionable issue 2"]}
If fully compliant, return {"approved": true, "issues": []}.`;
}

function buildCaptionRubricPrompt({ caption, theme }) {
  return `You are the QA reviewer for SockAcademy — the world's first dedicated sock authority. A writer just drafted an Instagram caption. Review it strictly against these rules and report every violation. Do not fix anything — only report.

WEEKLY THEME: ${theme}

RULES (all mandatory — flag any violation):
1. No exclamation marks anywhere, in any field.
2. No emojis in body text.
3. No generic phrases: "amazing", "game-changer", "level up", "elevate", "perfect".
4. No rhetorical questions.
5. hashtags field must contain EXACTLY 11 hashtags (4 ultra-niche + 4 mid-reach + 3 broad), one line, no commas. Count them precisely.
6. hook field: must be a complete standalone thought, max 9 words — not a teaser or cliffhanger.
7. body field: 80-110 words total, max 3 paragraphs, never more than 3 sentences in one paragraph block.
8. cta field: must end with "→ sockacademy.store".
9. hashtags must never include the brand name itself (no #sockacademy).

CAPTION JSON TO REVIEW:
${JSON.stringify(caption, null, 2)}

Respond with ONLY raw JSON on a single logical structure — no markdown code fences (no \`\`\`), no text before or after. Use single quotes inside string values, never unescaped double quotes:
{"approved": true|false, "issues": ["specific, actionable issue 1", "specific, actionable issue 2"]}
If fully compliant, return {"approved": true, "issues": []}.`;
}

async function callQAModel(prompt, label) {
  const msg = await withRetry(() => anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  }), label);

  const raw = msg.content[0].text.trim();
  try {
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const json = stripped.match(/\{[\s\S]*\}/)?.[0];
    const parsed = JSON.parse(json);
    return {
      approved: parsed.approved === true,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch {
    // Fail CLOSED, not open — a QA gate that silently approves on a parse
    // error defeats its entire purpose. An unparseable response forces a
    // revise round (or, after MAX_QA_ROUNDS, a withhold-and-alert) instead
    // of shipping unreviewed content.
    return { approved: false, issues: [`QA response could not be parsed — raw: ${raw.substring(0, 200)}`] };
  }
}

async function reviewContent({ kind, html, topic, wordCount, caption, theme }) {
  if (kind === 'article') {
    return callQAModel(buildArticleRubricPrompt({ html, topic, wordCount }), 'QA-Gate-A3');
  }
  if (kind === 'caption') {
    return callQAModel(buildCaptionRubricPrompt({ caption, theme }), 'QA-Gate-A5');
  }
  throw new Error(`qa-gate: unknown kind "${kind}" — expected "article" or "caption"`);
}

module.exports = { reviewContent };
