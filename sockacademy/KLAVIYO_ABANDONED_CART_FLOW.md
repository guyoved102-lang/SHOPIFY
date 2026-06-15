# Klaviyo — Abandoned Cart Flow
# צור בKlaviyo UI: Flows → Create Flow → Abandoned Cart

## הגדרות Flow
- Trigger: Checkout Started
- Sender: hello@sockacademy.store
- Filter: לא השלימו רכישה

---

## Email 1 — 1 שעה אחרי נטישה

**Subject:** `You left something behind`
**Preview text:** `Your cart is saved. Your standards shouldn't slip.`
**From:** `hello@sockacademy.store`

**Body:**
```
Hi {{ first_name|default:"there" }},

You were close.

Your cart is still saved — including everything you selected at SockAcademy.

We don't follow up often. But when someone takes the time to choose
premium socks and then leaves, we'd rather ask once than assume you
changed your mind about quality.

→ Return to your cart: {{ checkout_url }}

If something wasn't right — the size, the price, a question about the
product — reply to this email. We'll sort it.

— The SockAcademy Team
```

---

## Email 2 — 24 שעות אחרי נטישה

**Subject:** `What's still in your cart — and why it's worth it`
**Preview text:** `A brief case for not settling.`
**From:** `hello@sockacademy.store`

**Body:**
```
Hi {{ first_name|default:"there" }},

Still thinking about it?

Here's the honest case for finishing what you started:

The socks you selected aren't a luxury purchase — they're a long-term
decision. A pair of Merino Wool Crew socks, maintained correctly,
lasts 3–5 years. That works out to less than $10 a year for socks
you'll actually want to wear every day.

The alternative is buying cheap ones again, replacing them in six
months, and still not having what you wanted in the first place.

Your cart is saved. → Complete your order: {{ checkout_url }}

— The SockAcademy Team
```

---

## Email 3 — 48 שעות אחרי נטישה (אם לא קנו)

**Subject:** `Last reminder — your cart expires soon`
**Preview text:** `We won't follow up after this.`
**From:** `hello@sockacademy.store`

**Body:**
```
Hi {{ first_name|default:"there" }},

This is the last time we'll mention it.

Your SockAcademy cart is about to expire. If you were waiting for a
reason — this is it: we don't do aggressive discounts or countdown
timers. We let the product make the case.

If now isn't the right time, that's fine. We'll be here when it is.

→ {{ checkout_url }}

— The SockAcademy Team
```

---

## הנחיות הגדרה בKlaviyo UI

1. **Flows** → **Create Flow** → **Browse Templates** → **Abandoned Cart**
2. **Trigger:** Checkout Started
3. **Time delays:**
   - Email 1: 1 Hour after trigger
   - Email 2: 23 Hours after Email 1 (= 24h total)
   - Email 3: 24 Hours after Email 2 (= 48h total)
4. **Flow Filter:** Add filter → "Placed Order zero times since starting this flow"
5. **Sender:** hello@sockacademy.store
6. **Reply-to:** hello@sockacademy.store

## חשוב — Smart Sending
- בטל Smart Sending ל-Email 3 (אחרת אנשים שקיבלו Welcome לא יקבלו)
- Flow Status: LIVE (לא Draft)
