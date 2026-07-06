# FABLE5 Brand Voice Audit — Human-Quality Read Against Iron Law 2

> 📌 **Consolidated 06/07/2026:** this doc's findings feed into `FABLE5_LAUNCH_READINESS_PLAN.md` (current execution order) and are tracked live in `FABLE5_ACTION_TRACKER.md`. This file remains the detailed source — read it for depth, not for current status.

**Written 05/07/2026 (Fable 5, read-only pass). Standard held against: Loro Piana / Sunspel / Falke register per CLAUDE.md Iron Law 2 ("Center Stage", $250+ tier, authoritative, zero gimmick). Complement to `FABLE5_QA_GATE_ANALYSIS.md` — this is the tone read the mechanical gate cannot do.**

## What was actually available to audit

**Found and read (real, drafted or live):**
- Welcome Series, 3 emails — inlined in `CLAUDE.md`, verified live in Klaviyo 02/07
- Abandoned Cart flow, 3 emails — `docs/ops/KLAVIYO_ABANDONED_CART_FLOW.md`, verified live 02/07
- 5 product descriptions — `scripts/setup/create_products.js` (live on Shopify)
- 5 older blog articles — `scripts/setup/content-generator.js` (published 14/06)
- 5 newer blog articles — `scripts/setup/create_articles.js` (published 14/06)
- MG-1 Merino Guide — `scripts/setup/publish-mg1-article.js` (full text; publish status unconfirmed — MG-2 is under Regulatory Hold, MG-1 script exists but I did not verify a live URL)
- Homepage copy — `templates/index.json`
- FAQ page — `scripts/setup/create_faq_and_redirects.js`

**Not retrievable:** A3 agent-generated articles and A5 Instagram captions. Neither agent caches output locally; A3 posts straight to the Shopify Blog API and A5 emails a calendar + posts to Meta. Per memory, the QA gate currently holds 100% of A3/A5 output and A5 IG publishing fails 100% of runs — so no agent-generated content has ever shipped, and none exists on disk to read. The audit below covers the human/setup-script content, which is everything actually live.

## Findings

**Welcome Series.** Email 2 is the best copy in the estate — "Because standards matter, even where no one is looking" is genuinely on-register. But Email 1 hedges: "we believe socks are the most underestimated element" — the brand voice should assert, not believe; and "a standard that most brands simply don't bother with" punches down at the market, which Loro Piana never does. Email 3's preview "Don't leave quality on the table" is a poker idiom — casual salesfloor register — and the 48-hour-expiry frame is textbook discount urgency wearing a calm voice.

**Abandoned Cart.** Strong restraint overall ("We'll sort it." is good Sunspel-adjacent plainness). Two drifts: Email 2 argues price — "less than $10 a year for socks" — cost-per-wear math is a Bombas/Darn Tough move; the benchmark brands never justify price. Email 3 announces "we don't do aggressive discounts or countdown timers" *inside a three-email cart-expiry sequence* — a self-referential meta-claim luxury brands don't make, and one the structure contradicts.

**Product descriptions.** Mixed tier. "Invisible. Comfortable. Sweat-proof." is ad-staccato; "separate serious dressers from the rest" is status flattery stated aloud (luxury implies it); "wider than most competitors' implementations" is an explicit market comparison; "**Free gift wrapping**" bolds a value cue. Also structural: every product carries a permanent `compare_at_price` strikethrough (e.g. $34.99 from $49.99) — a perpetual fake-sale mechanic that directly contradicts Email 3's no-discount claim. Conversely, "every pair passes a 48-hour wear test before earning a place in our range" is exactly the right register — but is an unverified factual claim for a pre-launch dropship catalog.

**Older 5 articles (content-generator.js) — the weakest layer, and live.** "This isn't marketing hype" (defensive hedge); "and yes, how you look" (chatty aside); "In an era where first impressions are formed in milliseconds" (LinkedIn-ism); "one of the cheapest and most reliable improvements to daily quality of life" ("cheapest" is anti-luxury framing); and the sign-off "Your feet — and your nose — will thank you." — a cutesy gag that passes every mechanical rule (no emoji, no exclamation, no banned word) and fails the brand instantly.

**Newer 5 articles.** A full tier better — "not flashy, simply correct", "It's not an error. It's an edit." are authority-register. Residual issues: "wider than most competitors' implementations" recurs, and the comparison table uses inline `style="..."` attributes that the qa-gate's own rule 7 bans — live content predating the gate would fail the gate today.

**MG-1 Merino Guide.** The strongest piece in the estate; "It is not an allergy. It is physics." is exactly the voice. The closing Founding Cohort block is defensible luxury scarcity (allocation by count, "not on a date"), but "pricing locked for the life of their enrollment" slips into value-pitch territory.

**Homepage — the weakest live surface.** "Find Your Perfect Sock", "Find the perfect sock for every occasion", "The perfect sock set for every occasion" — "perfect" appears four times and is on the qa-gate's own banned list (for captions). "Why SOCKACADEMY?" is a rhetorical question (also gate-banned elsewhere). "Socks from around the world." and "Hand-picked by sock specialists." are empty mid-market filler — "global selection" reads AliExpress, not curation. The hero "Wear Something Worth Noticing" is fine; almost everything under it lags the email/article voice by a full brand tier.

**FAQ.** Functionally sound, tone acceptable; "no vague 'premium blend' language" is slightly defensive meta-copy but consistent with the authority frame.

## Patterns (recurring across pieces)

1. **Punching down.** "most brands simply don't bother" / "buying cheap ones again" / "most competitors' implementations" / "what a shirt sold at a gas station claims" (MG-1). The benchmarks assert their own standard without referencing the market beneath them.
2. **Value-math price justification.** "$10 a year" / "less expensive per wear" / "cheapest… improvement" / "pricing locked". A $250-tier brand never argues arithmetic.
3. **Urgency in structure, restraint in prose.** WELCOME10, 48h expiry, cart-expiry sequence, permanent compare-at strikethroughs — the copy disavows discount mechanics the architecture runs.
4. **Unsourced multiplier claims stated as fact.** "4x faster than cotton" recurs in products, FAQ, and articles; "48-hour wear test" — substantiation risk and a performance-marketing tell.
5. **Two voices live on one blog.** The chatty older 5 and the authority-register newer 5 + MG-1 coexist; a reader hitting both in one session experiences two different brands.

## What the mechanical qa-gate can't catch

- **Jurisdiction:** the gate only reviews A3 articles and A5 captions — none of which have ever shipped. Everything actually live (emails, products, homepage, FAQ, the 10 published articles) has never passed through any gate.
- **Rubric blindness:** "Your feet — and your nose — will thank you." violates zero rules and the brand completely. Hedging ("we believe"), punching down, price-math, casual idiom ("on the table", "We'll sort it" is borderline-acceptable), and status flattery are all invisible to banned-word lists.
- **Cross-piece inconsistency:** the gate reviews one piece at a time; it cannot see that the blog runs two registers, or that Email 3's no-discount claim contradicts the store's compare-at pricing.
- **Structure vs. copy:** urgency implemented in flow timing and pricing fields, not words, is out of scope for a text rubric.
- **Rule asymmetry:** "perfect" and rhetorical questions are banned for captions but sit on the live homepage; inline styles are banned for articles but exist in published ones. The rules exist — they just don't reach the surfaces that are actually public.

## Bottom line

There is real content, and plenty of it — the "nothing has ever passed the gate" fact applies only to agent-generated content. Honest verdict: the estate is **two-tier**. MG-1, the newer articles, and Welcome Email 2 genuinely approach the Loro Piana/Sunspel register. The homepage, the older five articles, and the recurring reflexes (competitor comparisons, value math, urgency-in-structure) read like a competent mid-market DTC brand — precisely the drift Iron Law 2 exists to prevent, and precisely what the current gate cannot see because it never looks at these surfaces. The highest-leverage single fix is the homepage; the second is retiring or rewriting the older five articles; the third is deciding, as a brand decision, whether the permanent compare-at strikethroughs and WELCOME10 expiry mechanics are compatible with the copy's own stated posture.
