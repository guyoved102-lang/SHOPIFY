# QA Gate 100% Rejection — Root-Cause Analysis (Fable 5, 2026-07-05)

> 📌 **Consolidated 06/07/2026:** the 5 writer-side fixes recommended in §5 were executed in `agents/A3_content/agent.js` and `agents/A5_social/agent.js` this date (see `FABLE5_ACTION_TRACKER.md` item 2.2 for status). The deterministic-count-checks-out-of-the-LLM-judge follow-on was deferred. This file remains the detailed root-cause source.

Scope: `corp/core/qa-gate.js` vs. the writer prompts in `agents/A3_content/agent.js` and
`agents/A5_social/agent.js`, plus real run data from Supabase (`agent_health_log`,
`command_center_metrics`).

## 1. What the rubric actually checks

`qa-gate.js` sends one Sonnet (`claude-sonnet-4-6`) call per draft with a hard rule list and
fails **closed** on any unparseable judge response (lines 82–88: parse error → `approved: false`).

**Article rubric** (lines 24–32): (1) no exclamation marks; (2) no emojis; (3) no generic
superlatives — explicit banned list "amazing", "perfect", "best-in-class", "game-changer",
adjective stacking; (4) word count **1,500–2,000**, with the number handed to the judge verbatim
(`reported: ${wordCount}` — A3 computes it at agent.js:426 by stripping tags); (5) h2/h3/p/ul
structure, no wrapper tags; (6) **opener must be a strong authoritative statement — not a
rhetorical question or scene-setting**; (7) no inline styles; (8) authoritative-expertise tone.

**Caption rubric** (lines 47–56): no exclamation marks; no emojis in body; banned phrases
("amazing", "game-changer", "level up", "elevate", "perfect"); no rhetorical questions;
**exactly 11 hashtags** ("Count them precisely"); hook ≤ 9 words, complete thought; body
**80–110 words**, max 3 paragraphs, ≤ 3 sentences per paragraph; CTA must end
"→ sockacademy.store"; no #sockacademy.

Note what this is: mostly **mechanical craft constraints** (counts, lengths, suffixes), not the
Iron Law 2 brand register. CLAUDE.md's Iron Law 2 (lines 225–232) demands tone/register — zero
emoji, no cheap humor/childish copy, no aggressive discount language, Loro Piana benchmark. The
implemented rubric covers those, then adds exact-count checks that come from the writer prompts
themselves (per qa-gate.js's own header comment, lines 3–5), enforced with zero tolerance by an
LLM judge.

## 2. What the writer prompts actually ask for

**A3** (`writeArticle`, agent.js:115–156): "senior content writer… The Strategist meets GQ",
1,500–2,000 words, "authoritative tone — no hype, no exclamation marks", materials-science depth,
clean HTML with h2/h3/p/ul, no wrapper tags, no inline styles, 2–3 internal links, closing CTA.
Generated with **`max_tokens: 4000`** (line 124). Revision rounds re-prompt with QA issues
prepended (line 450), same token cap.

**A5** (`generateCaption`, agent.js:159–225): near-verbatim twin of the caption rubric — same
banned phrases, no rhetorical questions, exactly 11 hashtags (4 niche + 4 mid + 3 broad), hook
≤ 9 words, body 80–110 words / max 3 paragraphs, CTA "→ sockacademy.store", no brand hashtag —
plus "HUMANIZER RULES" (rhythm, em dash once, one/two-word line before the CTA, **"One paragraph
max 20 words"**). Generated with **`max_tokens: 300`** (line 166). On JSON parse failure the
catch block (lines 216–224) returns a fallback caption with
`hashtags: '#sockacademy #premiumsocks #mensstyle'`.

## 3. The gap

The rejections are very unlikely to be about brand voice. Four concrete mechanical failure paths:

1. **A5 `max_tokens: 300` almost guarantees truncation.** The required JSON is hook (~12 tok) +
   80–110-word body (~145 tok) + CTA + 11 long compound hashtags (~60–80 tok) + visual_direction
   (~25 tok) + JSON overhead ≈ 280–320 tokens — at or over the cap. A truncated response fails
   `JSON.parse`, triggering the fallback at agent.js:216–224, whose caption **cannot pass QA by
   construction**: 3 hashtags instead of 11 (rubric rule 5) and `#sockacademy` (rule 9), with raw
   truncated text as body (rule 7). Revision rounds reuse the same 300-token cap, so all 3 rounds
   can fail the same way. This alone explains "4 of 4 held" runs.

2. **A5's own prompt is internally contradictory.** "One paragraph max 20 words" (line 190) ×
   "max 3 paragraphs" caps the body at ~60 words, but the JSON spec (line 203) and QA rule 7
   demand 80–110 words. A writer obeying the humanizer rule undershoots the word floor; obeying
   the word floor breaks the humanizer rule it may also try to honor by adding the "one word or
   two" line (lines 190, 196) as a fourth block — which the judge can read as a 4th paragraph.

3. **Exact-count checks judged by an LLM.** "Exactly 11 hashtags — count them precisely",
   "80–110 words", "≤ 9-word hook": both the writer and the judge are LLMs, and both miscount.
   With 3 hard counts per caption × 4 captions per run, the probability that everything is both
   correct and correctly verified across a whole run is low even when the content is on-brand.

4. **A3's rubric checks things its prompt never asked for.** Rubric rule 6 (authoritative opener,
   no rhetorical question — the single most common LLM intro habit) has no counterpart in the
   writer prompt, which just says "intro". Rule 3's banned-word list isn't in the prompt either
   ("no hype" only) — and topic titles like "The **Perfect** Sock Gift Set" (agent.js:80) invite
   the body to echo a banned word. Rule 4 is mechanical: models systematically undershoot
   "1,500–2,000 words", and `max_tokens: 4000` is tight for 2,000 words of HTML (~3,000+ tokens);
   if `wordCount` comes in at e.g. 1,320, the judge is *handed the failing number* and must
   reject on every round.

## 4. Real rejection evidence

Queried Supabase directly (REST, service key from `.env`):

- `agent_health_log`, 2026-07-04: **two A5 runs with `qaHeldCount: 4` of 4 posts each**
  (themes "Hiking season prep…" 09:25 UTC and "Dress code…" 09:19 UTC). These wrote no metric
  rows → DRY_RUN runs, but the QA calls and holds were real.
- `command_center_metrics`, 2026-07-03 (only A3/A5 rows in the table):
  `social_posts_generated = 4`, `social_posts_published = 0`.
- A3 health rows on 2026-07-04 show `success` with empty metadata — publish-vs-withheld is not
  distinguishable from stored data, and no A3 `qa_passed` metric rows exist yet.

**The actual QA issue strings could not be retrieved**: neither agent persists them. A3 sends
them only via Telegram/email (`sendQAWithheldReport`, agent.js:309–357); A5 embeds them only in
the weekly HTML email (agent.js:402–405) and logs only the count. So the per-rule breakdown above
is code-derived inference, not confirmed by stored verdicts — the Telegram messages from
2026-07-04 would confirm it in one glance.

## 5. Recommendation

**Strengthen the writer side** (hypothesis 1, in its mechanical rather than tonal form) — the
gate is doing its job; the writers are set up to fail it. Concretely:

1. A5: raise `max_tokens` from 300 to **700** (agent.js:166) — the single highest-impact change.
2. A5: replace the parse-failure fallback (agent.js:216–224) with a retry or a null return the
   caller treats as "held" — the current fallback fabricates a caption that auto-fails rules 5
   and 9.
3. A5: delete or rewrite "One paragraph max 20 words" so it no longer contradicts the 80–110-word
   body requirement; state that the one/two-word closing line lives inside paragraph 3.
4. A3: add rubric rules 6 and 3 verbatim to the prompt — "Open with a strong declarative
   authoritative statement. Never open with a rhetorical question or scene-setting." and the
   banned-word list ("amazing", "perfect", "game-changer", "best-in-class").
5. A3: raise `max_tokens` to 6000 and add "Aim for 1,700–1,800 words; drafts under 1,500 words
   will be rejected" — models undershoot stated word ranges.

One targeted rubric change alongside: move the pure-count checks (word count, hashtag count,
CTA suffix) out of the LLM judge into deterministic JS before the Sonnet call — code counts
correctly and for free; keep Sonnet for tone/register only. I did not pick "relax the rubric"
because every rubric rule traces to either Iron Law 2 or the writers' own specs; nor
"wait-and-watch", because path 1 (A5 truncation → poisoned fallback) is deterministic and will
never self-resolve with more runs.

## 6. Bottom line

The 100% rejection rate is not a brand-voice problem and not normal tuning friction — it is
mostly plumbing. A5's 300-token generation cap truncates the caption JSON and the fallback then
substitutes a caption that violates two rubric rules by construction; A5's prompt also contradicts
itself on body length, and A3's rubric checks an opener rule and a banned-word list its writer
prompt never mentions while handing the judge a word count the model predictably undershoots. Fix
the five writer-side items above, move counting from the LLM judge into code, and re-run; the
Telegram QA-withheld messages from 2026-07-04 should be checked once to confirm the predicted
issue mix before anyone touches the rubric's actual brand-voice rules.
