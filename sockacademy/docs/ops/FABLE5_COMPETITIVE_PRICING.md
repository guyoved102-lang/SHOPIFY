# FABLE5 Competitive Pricing Check — Real Market Data vs. Stated Floors

> 📌 **Consolidated 06/07/2026:** this doc's findings feed into `FABLE5_LAUNCH_READINESS_PLAN.md` (current execution order) and are tracked live in `FABLE5_ACTION_TRACKER.md`. This file remains the detailed source — read it for depth, not for current status.

**Written 05/07/2026 (Fable 5, live web search). Companion to `FABLE5_BRAND_VOICE_AUDIT.md`. Not the A13 automated scan — a manual deep-dive with current retail prices, searched today.**

## Real competitor data (searched 05/07/2026)

| Brand | Single pair | Multi-pack | Tier | Positioning note |
|---|---|---|---|---|
| Uniqlo | ~$4.90 (Colorful 50 socks, "slightly less than $5" per NBC/Uniqlo US) | Sells value multipacks; exact 3-pack price could not verify | Mass | Quality-basics baseline; the floor of the entire market. |
| Bombas | ~$12.50–14 ankle at Dick's; bombas.com (IL-geo) ₪56–72 ≈ $15–19 | Ankle 4-pack ₪199 ≈ ~$54 (~10% pack savings) | Premium-performance | Comfort-engineering DTC, one-purchased-one-donated; the archetypal "value math" brand. |
| Happy Socks | $16–18/pair (Bloomingdale's, current) | Gift boxes with 10–20% tiered pack discounts | Mass/novelty-fashion | Colorful novelty gifting; **US online store closed in 2026, sells via Amazon/Bloomingdale's/Nordstrom** — a caution on the novelty-gift segment. Also: novelty is a SockAcademy BLOCKED category. |
| Stance | $17–20/pair ($16.99 Curren, $19.99 NBA/performance crew) | Packs exist; not verified | Premium-lifestyle | Streetwear/collab casual-performance. |
| Darn Tough | $26–30/pair (Hiker Micro Crew $26, Full Cushion $30) | None meaningful | Premium-performance | US-made merino, lifetime guarantee; earns its price with substance, never with luxury language. |
| Falke (mainline) | Airport (merino/cotton flagship) ~$22–30 (Nordstrom $22; Falke US/Amazon up to ~$30) | Occasional 3-packs; not verified | Premium → luxury bridge | German engineering-of-legwear authority; the brand's mainline is *cheaper than SockAcademy's premium floor*. |
| Falke (Luxury Line) | No. 4 Pure Silk $77; No. 6 Merino/Silk $84; No. 2 Finest Cashmere $132 | — | True luxury | The register CLAUDE.md actually names as benchmark. |
| Pantherella | Merino $32–40; cotton lisle $34–36; cashmere $84–165 | — | True luxury (accessible entry) | English handmade dress socks; entry-luxury merino overlaps SockAcademy's $35 tactical floor. |
| Sunspel | Cotton $30; merino ribbed/waffle $40 | — | True luxury (understated) | Stated benchmark brand; UK/Italy-made. Yes, they sell socks. |
| Loro Piana | Costina cashmere/silk $150; Classic cashmere $195; baby cashmere $525–565 | — | True luxury (apex) | Stated benchmark brand. Sock range $150–565 — roughly 8–30x SockAcademy's single-pair floor. |

Could-not-verify items are marked; no other numbers are estimated. Sources: brand sites (loropiana.com, falke.com, pantherella.com, sunspel.com, stance.com, bombas.com, uniqlo.com), Nordstrom, Bloomingdale's, Dick's Sporting Goods, MR PORTER/Lyst aggregation, GearJunkie/CNN 2026 hiking-sock roundups.

## Where the stated floors actually land

Floors: single $18+ / premium $28+ / tactical-merino $35+ / gift set $65+.

- **$18 single** sits exactly on Happy Socks ($16–18) and Stance ($17–20), above Bombas ankle ($13–15). That is the mass-to-premium-performance boundary, not luxury.
- **$28 premium** = Darn Tough territory ($26–30) and *above* Falke's own mainline Airport ($22–30). Squarely premium-performance.
- **$35 tactical/merino** = Pantherella's merino entry ($32–40) and Sunspel merino ($40). This floor genuinely touches entry-luxury — the strongest of the four.
- **$65 gift set** for multi-pair sets ≈ Bombas 4-pack (~$54) plus margin. Loro Piana charges more than double that for *one pair*.
- **The ceilings matter more than the floors.** `corp/core/pricing.js` (single source of truth for A1 + A2.5) hard-caps retail: Cashmere $85, Merino $75, Gift Sets $90, DEFAULT $65. So the brand's own code **forbids** Falke Luxury ($132 cashmere), Pantherella cashmere ($84–165, barely grazed), and the entire Loro Piana range. Current live products actually sell at ~$34.99 (with a $49.99 compare-at strikethrough, per the brand-voice audit).

**Verdict on the data:** SockAcademy's real price architecture ($18–90, live products ~$35) is the Bombas/Darn Tough/Stance band, with one toe (tactical/merino, $35–75) reaching Pantherella/Sunspel entry-luxury. It is nowhere near Loro Piana-adjacent, and the ceilings guarantee it can't be.

## The positioning gap

This is the same gap the brand-voice audit found, now confirmed in a second independent dimension. The copy talks premium-performance (4x-faster claims, cost-per-wear math, competitor comparisons) while claiming a true-luxury register — and the *pricing* does exactly the same thing: "world's first sock authority" at $250+ brand register, priced $18–90 with permanent strikethroughs and a WELCOME10 code. Loro Piana's cheapest sock ($150) costs more than SockAcademy's most expensive allowed product ($90 gift-set ceiling). The gap is not a copy problem or a pricing problem separately; it is **one coherent brand — a good premium-performance brand — wearing a luxury label**. Voice, mechanics (discounts, strikethroughs), price floors, and price ceilings all agree with each other and all disagree with the stated benchmark.

## Recommendation

1. **Keep the floors, rename the ambition — for Phase 1.** The floors are correctly set *for what the product actually is*: a curated dropship catalog. Do not raise floors to luxury levels on dropship goods; $150 CJ-sourced socks would be indefensible and Iron Law 2's "authority" claim would collapse on first customer inspection. Honest tiering: SockAcademy Phase 1 competes with Bombas/Darn Tough on curation and knowledge, at $18–90.
2. **One surgical raise: single-pair floor $18 → $22–24.** $18 lands on Happy Socks/Stance (one of which is a blocked novelty category, the other streetwear). $22–24 clears the entire mass/novelty band, sits above Falke Airport's Nordstrom price, and costs nothing structurally — CLAUDE.md's own future category table already says basic premium = "$18–28," so this narrows within an approved range.
3. **Leave $28 / $35 / $65 as-is.** $35 merino already touches Pantherella/Sunspel entry-luxury — that is the defensible "authority" tier and where the catalog's credibility should concentrate.
4. **Plan a Phase 4 luxury tier, in the ceilings.** True-luxury pricing ($75–165+, Pantherella/Falke-Luxury band) becomes available exactly when Private Label (Phase 4, Year 2 per VISION.md) gives the product substance to support it. That is a `RETAIL_CEILING` revision (one file, `corp/core/pricing.js`), gated on private-label reality — not a floor change now.
5. **Fix the mechanics before the numbers** (per the voice audit): permanent compare-at strikethroughs and discount-urgency structures do more damage to the $250+ register than any floor value. A Bombas-tier price with luxury manners beats a luxury price with Bombas manners.

## What would need to be true for the current floors to make sense

They already mostly do — as premium-performance floors. CLAUDE.md contains **no fixed markup rule and no supplier-cost-derived constraint**: the documented process is "A1 records supplier cost → Guy decides retail together," so floors are brand-positioning choices, freely movable. The real constraint runs the other way: the *ceilings* are implicitly bound by dropship product quality — you cannot charge Sunspel prices for CJ inventory. For the floors to make sense as **luxury** floors (i.e., for the $18 tier to disappear and $40+ to become the entry point), Private Label with verifiable provenance (mill, fiber certs, place of manufacture) is the prerequisite. One doc inconsistency to fix: the tactical floor is $35+, but CLAUDE.md's future category table says tactical "$25–40" — the range's lower bound violates the brand's own iron floor.

## Bottom line

SockAcademy is priced as a premium-performance brand ($18–90, live products ~$35) while its stated benchmark is a true-luxury tier whose *entry* price ($150, Loro Piana) exceeds its own coded maximum ($90). The floors themselves are sound for the Phase 1 dropship reality — raise only the single-pair floor to ~$22 to clear the novelty band — but the honest conclusion, matching the brand-voice audit exactly, is that SockAcademy currently *is* a Bombas/Darn Tough-tier brand in both voice and price, and the Loro Piana register is a Phase 4 private-label aspiration, not a Phase 1 fact. Price and speak as the excellent premium-performance authority it is now; earn the luxury tier when the product can testify for itself.
