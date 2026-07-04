# SockAcademy — מדריך Skills, Agents & סנכרון מלא

> עודכן: יוני 2026 | גרסה 2.0

---

## 🗺️ מבנה המערכת

```
SockAcademy
├── 5 Agents (רצים אוטומטית)
│   ├── A1 — Product Research    (שני בבוקר)
│   ├── A2 — Product Upload      (אחרי A1 מאשר)
│   ├── A3 — Content/Blog        (שני בבוקר)
│   ├── A4 — Meta Ads            (DRY_RUN עד META tokens)
│   └── A5 — Social              (ראשון + רביעי + שישי)
│
├── Skills (Claude Code — מקלידים /שם)
│   ├── marketing-skills → /pricing, /marketing-plan, /ads, /seo-audit...
│   ├── all-skills       → /shopify-automation, /klaviyo-automation, /popups...
│   ├── postiz           → /postiz
│   ├── superpowers      → /brainstorming, /systematic-debugging...
│   ├── finance-skills   → ניתוח רווחיות
│   ├── commercial-legal → חוזים, GDPR, תנאי שימוש
│   ├── codex            → קוד מתקדם
│   └── gstack           → Google Workspace
│
└── חנות Shopify: sockacademy.store (11eqwi-ji.myshopify.com)
```

---

## כללי ברזל — לעולם לא לפרוץ

| חוק | פרט |
|-----|-----|
| ❌ אסור תמונות/Higgsfield | רק כשמוצרים סגורים + תמונת רפרנס מגיא |
| ❌ אסור hardcode keys | כל API keys רק ב-`sockacademy/.env` |
| ❌ אסור גרביים לילדים | Dog socks, children's, novelty/funny/cartoon — BLOCKED |
| ✅ Rating 4.5+ | לא מוכרים מוצר שיקבל פחות |
| ✅ מחירים מינימום | Single $18+ / Premium $28+ / Tactical $35+ / Gift Set $65+ |
| ✅ קהל יעד | גברים 25-45, מודעי אופנה, US/UK/AU |

---

## 📊 מפת שלבים — מה עושים מתי

### שלב 1 — עכשיו (יסודות)
> מטרה: תשתית מוכנה לפני מוצר אחד

- [ ] הוסף קרדיטים Anthropic (console.anthropic.com/settings/billing)
- [ ] הוסף `OPENAI_API_KEY` ל-GitHub Secrets
- [ ] `/pricing` — קבע מחירים לכל הקטגוריות
- [ ] `/marketing-plan` — תוכנית 90 יום
- [ ] `/popups` — popup לאיסוף אימיילים
- [ ] `/klaviyo-automation` — עדכן Abandoned Cart flow
- [ ] A5 DRY_RUN — וודא שמייל שבועי מגיע

### שלב 2 — כשמוצרים סגורים
> מטרה: חנות חיה עם קטלוג מלא

- [ ] A1 — הרץ ואשר מוצרים ב-Google Sheets
- [ ] `/product-marketing` — תיאורי SEO לכל מוצר
- [ ] A2 — העלה מוצרים אושרו ל-Shopify
- [ ] `/shopify-automation` — עדכן מחירים + metadata
- [ ] `/seo-audit` — 20 שיפורי SEO לפני השקה
- [ ] META tokens — הפעל A4 + A5 LIVE
- [ ] `/ad-creative` — 3-5 מודעות ראשונות

### שלב 3 — השקה (100 מכירות ראשונות)
> מטרה: טראפיק + מכירות

- [ ] A4 LIVE — Meta Ads ($5/$7/$10 יומי לפי funnel)
- [ ] A5 LIVE — Instagram 3x/שבוע
- [ ] A3 — בלוג שבועי (SEO)
- [ ] `/content-strategy` — אסטרטגיה 3 חודשים
- [ ] `/instagram-automation` + `/tiktok-automation`
- [ ] `/postiz` — תזמון פוסטים

### שלב 4 — אחרי 100 מכירות
> מטרה: צמיחה ואוטומציה מלאה

- [ ] `/cro` — שפר conversion rate
- [ ] `/referrals` — תוכנית הפניות
- [ ] `/competitors` — מחקר Bombas, Happy Socks, Falke, Darn Tough
- [ ] `/ab-testing` — A/B על כותרות, מחירים, CTAs
- [ ] `/churn-prevention` — win-back flows
- [ ] `/customer-research` — הבן מי קונה ולמה
- [ ] Higgsfield — תמונות מוצר (אחרי תמונות רפרנס מגיא)

---

## ⚙️ חיבור Agents ↔ Skills

```
A1 (מחקר מוצרים)
  └──→ Google Sheets: A1_Products
         └──→ A2 קורא Sheets → /product-marketing → Claude SEO → Shopify

A3 (בלוג שבועי)
  └──→ 24 נושאים בrotציה → מפרסם ישיר ל-Shopify Blog
         └──→ /seo-audit יבדוק שהמאמרים מדורגים

A4 (Meta Ads)
  └──→ /ad-creative כותב קופי → A4 מריץ קמפיינים
         └──→ /competitors מזין מה המתחרים עושים

A5 (Social)
  └──→ /postiz מתזמן פוסטים נוספים מעבר לA5
         └──→ /instagram-automation + /tiktok-automation מגבירים

Klaviyo (email flows)
  └──→ /klaviyo-automation מנהל flows
         └──→ /popups שולח לידים ל-Klaviyo
```

---

# 🔴 TIER 1 — עכשיו

---

## `/pricing` — אסטרטגיית תמחור

**מה:** מגדיר מחירים לכל הקטגוריות עם נימוקים, מרג'ין, ומחירי מתחרים.

**פרומט מוכן להעתקה:**
```
/pricing

מותג: SockAcademy — גרביים פרמיום לגברים
אתר: sockacademy.store
קהל: גברים 25-45, US/UK/AU, מודעי סגנון

קטגוריות ועלויות ספק (CJ Dropshipping):
- Merino Wool Crew/Ankle: עלות $8-12
- Egyptian Cotton Dress Socks: עלות $5-8
- Bamboo Performance: עלות $6-9
- Compression/Athletic: עלות $10-14
- Tactical/Hiking Boot Socks: עלות $12-16
- Gift Set 3-pack: עלות $18-22
- Gift Set 6-pack Luxury: עלות $30-36

מתחרים ומחיריהם:
- Bombas: $18-28 per pair, bundle discounts
- Happy Socks: $16-22 per pair
- Falke: $28-55 per pair (premium European)
- Darn Tough: $22-32 per pair (lifetime warranty)

מינימומים שלי:
- Single pair: $18+
- Premium materials: $28+
- Tactical/Merino: $35+
- Gift Set: $65+

בנה טבלת מחירים מלאה עם: מחיר קמעונאי, מחיר sale, מרג'ין %, 
ומיצוב ביחס לכל מתחרה.
```

---

## `/marketing-plan` — תוכנית שיווק 90 יום

**מה:** תוכנית שיווק מלאה עם ערוצים, תקציב, KPIs, ולוח זמנים.

**פרומט מוכן להעתקה:**
```
/marketing-plan

מותג: SockAcademy — גרביים פרמיום לגברים
אתר: sockacademy.store
שלב: לפני השקה (עוד ~4 שבועות)

הקהל:
- גברים 25-45, US/UK/AU
- מודעי סגנון, אוהבי איכות, גברים מקצועיים
- טרגוט: שכבה גבוהה-בינונית, קונים Bombas ודומיהם

ערוצים פעילים שיש לי:
- A5 Agent: Instagram 3x/שבוע (ראשון חינוכי, רביעי מוצר, שישי לייפסטייל)
- A3 Agent: בלוג SEO שבועי (24 נושאים בrotציה)
- A4 Agent: Meta Ads (3 שלבי funnel — awareness $5/d, traffic $7/d, conversion $10/d)
- A2 Agent: Shopify — מוצרים + SEO descriptions

מתחרים: Bombas, Happy Socks, Falke, Darn Tough

מטרות:
- חודש 1: תשתית + 500 email subscribers
- חודש 2: 50 מכירות ראשונות
- חודש 3: 150 מכירות, ROAS 2.5x

בנה תוכנית 90 יום עם: לוח זמנים שבועי, תקציב מומלץ, KPIs לכל ערוץ.
```

---

## `/popups` — popup לאיסוף אימיילים

**מה:** popup שמאסף אימיילים עם offer מפתה, מחובר ל-Klaviyo.

**פרומט מוכן להעתקה:**
```
/popups

אתר: sockacademy.store (Shopify)
מוצר: גרביים פרמיום לגברים
טון המותג: פרמיום, אינטליגנטי, לא spam, לא "קופון זול"

הצעה: 10% הנחה על הזמנה ראשונה (קוד WELCOME10)
טריגר: 8 שניות לאחר כניסה לאתר / exit intent
קהל: גברים 25-45

כותרת מוצעת: "Upgrade Your Drawer"
תת-כותרת: "Get 10% off your first pair of premium socks — no spam, ever."

פלטפורמה: Shopify + Klaviyo (KLAVIYO_PRIVATE_API_KEY קיים)
צבעי מותג: שחור/לבן/זהב (עיצוב dark premium)

תן: copywriting מלא + קוד HTML/Liquid לשילוב + הגדרות Klaviyo form.
```

---

## `/klaviyo-automation` — email flows

**מה:** מנהל flows ב-Klaviyo — Abandoned Cart, Welcome Series, Post-Purchase.

**פרומט מוכן להעתקה:**
```
/klaviyo-automation

חנות: sockacademy.store (Shopify)
Klaviyo Key: ב-sockacademy/.env תחת KLAVIYO_PRIVATE_API_KEY

> **⚠️ SUPERSEDED (04/07/2026, Fable 5 audit M12):** the example flows below are a stale
> planning template — the real Welcome Series and Abandoned Cart flows are already live and
> verified against the Klaviyo API/UI directly (source of truth = Klaviyo itself, not this
> doc). See `docs/ops/KLAVIYO_ABANDONED_CART_FLOW.md` for the actual live abandoned-cart
> content. Notably, "5% extra if needed" and "Last chance" + urgency below **violate Iron Law
> 2 (Loro Piana Standard, no discount-heavy/urgency copy)** — the live flow does not use this
> language. Treat this block as historical planning notes only, not current guidance.

Flows שצריך לבנות/לעדכן (תבנית ישנה — ר' אזהרה למעלה):

1. Welcome Series (3 מיילים):
   - מייל 1 (מיידי): "Welcome to SockAcademy" + קוד WELCOME10
   - מייל 2 (יום 3): מדריך — "The Anatomy of a Premium Sock"
   - מייל 3 (יום 7): Best Sellers + social proof

2. Abandoned Cart (3 מיילים):
   - מייל 1 (שעה): "You left something premium behind"
   - ~~מייל 2 (יום 1): תזכורת + 5% extra if needed~~ (violates Iron Law 2 — ר' live flow)
   - ~~מייל 3 (יום 3): "Last chance" + urgency~~ (violates Iron Law 2 — ר' live flow)

3. Post-Purchase (2 מיילים):
   - מייל 1 (יום 3 אחרי קנייה): "How to care for your socks"
   - מייל 2 (30 יום): "Ready for your next pair?" + cross-sell

טון: פרמיום, אינטליגנטי, ישיר. לא ילדותי. לא discount-heavy.
מחירים: Single $18+ | Premium $28+ | Tactical $35+ | Gift Set $65+
```

---

## `/shopify-automation` — ניהול חנות

**מה:** מבצע כל פעולה ב-Shopify דרך Claude — מוצרים, collections, מחירים, metadata.

**פרומט לעדכון מוצרים:**
```
/shopify-automation

חנות: 11eqwi-ji.myshopify.com
Token: ב-sockacademy/.env תחת SHOPIFY_MASTER_TOKEN
API Version: 2025-01 (locked — see CLAUDE.md API versions section; was stale at 2024-01)

משימה: עדכן את כל המוצרים בחנות:
- הוסף SEO title ו-meta description לכל מוצר
- ודא שכל מוצר יש בו: title, body_html, vendor="SockAcademy", 
  product_type, tags, handle ידידותי ל-URL
- מינימום מחיר: $18 (אם יש מוצר מתחת — שלח התראה)
- אין מוצרי ילדים / כלבים / novelty

פורמט SEO title: "[Product Name] — Premium Men's Socks | SockAcademy"
```

---

# 🟡 TIER 2 — כשמוצרים סגורים

---

## `/product-marketing` — תיאורי מוצר SEO

**מה:** כותב תיאורי מוצר מושלמים — SEO + conversion + brand voice.

**פרומט מוכן להעתקה:**
```
/product-marketing

מותג: SockAcademy — גרביים פרמיום לגברים
טון: פרמיום, ישיר, מבוסס על עובדות — לא "amazing quality!!!"
קהל: גברים 25-45, US/UK/AU, מודעי סגנון

כתוב תיאור מלא למוצר:
שם: [שם המוצר]
חומר: [חומר + אחוז — לדוגמה: 85% Merino Wool Grade A, 12% Nylon, 3% Elastane]
יתרונות מרכזיים: [thermoregulation / moisture-wicking / 300-wash durability / etc.]
מחיר: $[X]
קטגוריה: [Premium Materials / Performance / Dress & Formal / Tactical & Outdoor]
מתחרה ישיר: [Bombas / Falke / Darn Tough]

כלול:
- H1 כותרת עם keyword ראשי
- Paragraph ראשון שמוכר את הרגש (60-80 מילים)
- Bullet points: 5 יתרונות קונקרטיים (מספרים, לא שיווק)
- Paragraph שני: Why SockAcademy vs מתחרים
- SEO meta title + meta description
- 8-10 tags לShopify
```

---

## `/ad-creative` — קופי למודעות

**מה:** כותב קופי ל-Meta/TikTok Ads + creative brief לA4 Agent.

**פרומט מוכן להעתקה:**
```
/ad-creative

מותג: SockAcademy — גרביים פרמיום לגברים
אתר: sockacademy.store
קהל: גברים 28-45, מודעי סגנון, US/UK/AU

מוצר: [שם מוצר] במחיר $[X]
מתחרה להשוות: Bombas ($[Y])
USP: [מה ייחודי — חומר / ערבות / מחיר-לאיכות]

פלטפורמות:
- Instagram Feed (1080x1080): מינימליסטי, premium aesthetic
- Instagram Stories (1080x1920): hook חזק בשורה 1
- Facebook Feed: יותר טקסט, מסביר יותר

מטרה: Conversions (לא Awareness)
תקציב: $10/יום
Funnel stage: [Awareness / Traffic / Retargeting]

כתוב: 3 גרסאות קופי לכל פלטפורמה + headline + CTA + creative brief.
```

---

## `/seo-audit` — בדיקת SEO

**מה:** בודק SEO של האתר ומייצר רשימת שיפורים ממוינת לפי השפעה.

**פרומט מוכן להעתקה:**
```
/seo-audit

אתר: sockacademy.store
פלטפורמה: Shopify
מטרה: לדרג על מילות מפתח premium socks, men's dress socks, merino wool socks

בדוק:
1. Title tags + meta descriptions (כל דפי מוצר)
2. H1/H2/H3 structure
3. Image alt tags (כולל hero banner)
4. Page speed (Shopify Dawn theme)
5. Internal linking structure
6. Blog SEO (A3 agent מפרסם שבועי)
7. URL structure
8. Schema markup למוצרים
9. Mobile optimization
10. Core Web Vitals

תן: 20 שיפורים ממוינים לפי: השפעה (גבוהה/בינונית/נמוכה) × מאמץ (קל/בינוני/קשה).
```

---

## `/instagram-automation` — ניהול Instagram

**מה:** ניתוח ביצועים + אסטרטגיית צמיחה + hashtags + תזמון.

**פרומט מוכן להעתקה:**
```
/instagram-automation

חשבון: @sockacademy.store
קהל: גברים 25-45, US/UK/AU, premium lifestyle
מתחרים ב-Instagram: @bombas, @happysocks, @falke_official

A5 Agent כבר מפרסם:
- ראשון: פוסט חינוכי (חומרים, טיפים)
- רביעי: מוצר spotlight
- שישי: לייפסטייל / inspiration

תן:
1. ניתוח אסטרטגיה של @bombas ו-@happysocks
2. 30 hashtags ל-SockAcademy (3 tier: גדול/בינוני/נישה)
3. Bio מושלם
4. Stories strategy (daily)
5. Highlight covers נושאים: Shop / Reviews / Materials / Style Guide
```

---

## `/tiktok-automation` — אסטרטגיית TikTok

**מה:** scripts, hooks, trends, ואסטרטגיה לTikTok.

**פרומט מוכן להעתקה:**
```
/tiktok-automation

מותג: SockAcademy — גרביים פרמיום לגברים
קהל: גברים 22-35 ב-TikTok (צעיר יותר מInstagram)
טון: אינפורמטיבי + מפתיע, לא ילדותי

כתוב 5 סקריפטים לTikTok (30-60 שניות):
1. "לא ידעת שהגרביים שלך הורגות את הרגליים שלך" — hook + מידע
2. "הבדל בין $5 לגרביים ל-$35 לגרביים — בדיקה" — comparison
3. "למה גברים עם כסף לובשים גרביים ספציפיות" — lifestyle
4. "מה שקורה לגרביים Merino אחרי 300 כביסות" — proof
5. "Gift guide: הגרביים שכל גבר רוצה לקבל" — seasonal

לכל סקריפט: Hook (שורה 1), גוף, CTA, trending sounds להמליץ.
```

---

## `/content-strategy` — אסטרטגיית תוכן 3 חודשים

**מה:** תכנון תוכן מלא לכל הערוצים — Instagram, TikTok, Blog, Email.

**פרומט מוכן להעתקה:**
```
/content-strategy

מותג: SockAcademy — גרביים פרמיום לגברים
ערוצים:
- Instagram (A5 Agent: 3x/שבוע ראשון/רביעי/שישי)
- Blog/SEO (A3 Agent: שבועי, 24 נושאים בrotציה)
- Email (Klaviyo flows + שבועי newsletter)
- TikTok (עתידי)

תמות מותג:
- Premium Materials (Merino, Egyptian Cotton, Bamboo, Cashmere)
- Performance (Compression, Athletic, No-Show)
- Dress & Formal (Argyle, OTC, Business)
- Tactical & Outdoor (Hiking, Waterproof, Thermal)
- Gift Sets

תן: לוח תוכן 90 יום × ערוץ, כולל: נושא, פורמט, CTA, חיבור בין ערוצים.
```

---

# 🟢 TIER 3 — אחרי 100 מכירות

---

## `/cro` — Conversion Rate Optimization

**פרומט:**
```
/cro

אתר: sockacademy.store (Shopify)
Conversion Rate נוכחי: [X]%
מטרה: הגיע ל-[Y]%

נתח: Product page, Cart page, Checkout flow.
בדוק: CTA placement, trust signals, pricing display, urgency elements.
תן: 15 שיפורים ממוינים לפי השפעה × מאמץ.
```

---

## `/competitors` — מחקר מתחרים

**פרומט:**
```
/competitors

מותג שלי: SockAcademy (גרביים פרמיום לגברים, sockacademy.store)

נתח לעומק את המתחרים הבאים:
- Bombas (bombas.com) — המוביל בשוק
- Happy Socks (happysocks.com) — הפופולרי
- Falke (falke.com) — הפרמיום האירופאי
- Darn Tough (darntough.com) — lifetime warranty

לכל מתחרה: מחירים, positioning, USP, חולשות, הזדמנויות לSockAcademy.
```

---

## `/referrals` — תוכנית הפניות

**פרומט:**
```
/referrals

מותג: SockAcademy — גרביים פרמיום לגברים
פלטפורמה: Shopify
מטרה: CAC נמוך יותר דרך WOM

בנה תוכנית הפניות:
- לקוח מפנה → מה הוא מקבל?
- חבר מופנה → מה הוא מקבל?
- כלי מומלץ לShopify (ReferralCandy / Loyalty Lion / etc.)
- Email sequence לevangelists
```

---

## `/ab-testing` — A/B Tests

**פרומט:**
```
/ab-testing

אתר: sockacademy.store (Shopify)

תכנן 5 A/B tests לפי עדיפות:
1. Product page headline (benefit vs feature)
2. Price display ($34 vs $34.00 vs "From $34")
3. CTA button ("Add to Cart" vs "Get Yours" vs "Upgrade Your Drawer")
4. Hero section — tagline
5. Email subject line — abandoned cart

לכל test: hypothesis, sample size דרוש, מדד הצלחה, משך.
```

---

# 🛠️ כלי פיתוח — Superpowers

---

## `/brainstorming` — לפני כל החלטה גדולה

**פרומט:**
```
/brainstorming

נושא: [שם הפיצ'ר/קמפיין]
הקשר: SockAcademy, גרביים פרמיום, גברים 25-45
מגבלות: [תקציב / זמן / טכניקה]
מטרה: [מה אנחנו מנסים להשיג]
```

---

## `/systematic-debugging` — כשמשהו שבור

**פרומט:**
```
/systematic-debugging

בעיה: [תיאור הבעיה]
סוכן: [A1/A2/A3/A4/A5]
קובץ: sockacademy/agents/[X]/agent.js
שגיאה: [copy-paste של השגיאה המלאה]
מה ניסיתי: [מה כבר בדקתי]
```

---

## `/requesting-code-review` — לפני כל commit חשוב

**פרומט:**
```
/requesting-code-review

עברתי על: [שם הקובץ]
שינויים: [תיאור קצר]
בדוק: security (API keys לא hardcoded?), logic, error handling.
```

---

# 📋 Checklist שבועי — SockAcademy Operations

## כל ראשון בבוקר (אחרי A5 רץ):
- [ ] פתח Gmail → וודא מייל מ-A5 הגיע עם 3 captions + תמונות
- [ ] פתח Instagram → וודא שהפוסט עלה (כשMETA tokens פעיל)
- [ ] GitHub Actions → בדוק שA5 workflow הצליח

## כל שני בבוקר (A1 + A3 רצים):
- [ ] פתח Gmail → מייל מ-A1 עם מוצרים חדשים מCJ
- [ ] פתח Google Sheets (A1_Products) → בדוק מוצרים מומלצים
- [ ] פתח Gmail → מייל מ-A3 עם מאמר הבלוג השבועי
- [ ] פתח Shopify Blog → וודא שהמאמר עלה

## כל שבוע (בצ'ק כללי):
- [ ] Klaviyo → כמה subscribers חדשים השבוע?
- [ ] Shopify Analytics → כמה visitors? מאיפה?
- [ ] GitHub → כל workflows ירוקים?
- [ ] .env → כל ה-keys עדיין תקפים?

---

# ⚡ סטטוס נוכחי — מה עובד / מה ממתין

## עובד עכשיו ✅
| מרכיב | סטטוס | הערה |
|--------|--------|------|
| Shopify חנות | ✅ | 11eqwi-ji.myshopify.com |
| A5 קוד | ✅ | תוקן: gpt-image-1 + Shopify CDN |
| A5 workflow | ✅ | 3x/שבוע: ראשון/רביעי/שישי |
| A1/A2/A3/A4 קוד | ✅ | syntax תקין |
| כל ה-ENV keys | ✅ | חסר רק META tokens |
| Hero banner | ✅ | עלה ל-Shopify CDN |
| Sections design | ✅ | hero/features/ticker/footer/etc. |
| SHOPIFY_MASTER_TOKEN | ✅ | ב-.env |
| OPENAI_API_KEY | ✅ | ב-.env |
| KLAVIYO_PRIVATE_API_KEY | ✅ | ב-.env |
| CJ_API_KEY | ✅ | ב-.env |

## ממתין / חסום ⏳
| מרכיב | סטטוס | מה צריך |
|--------|--------|---------|
| ANTHROPIC_API_KEY קרדיטים | ❌ | הוסף ב-console.anthropic.com/settings/billing |
| OPENAI_API_KEY ב-GitHub Secrets | ❌ | הוסף ידנית ב-GitHub |
| META_ACCESS_TOKEN | ❌ | Instagram Business → Meta for Developers |
| META_IG_USER_ID | ❌ | נדרש יחד עם META_ACCESS_TOKEN |
| מוצרים בחנות | ❌ | ממתין לאישור A1 + עיצוב |
| Klaviyo flows | ⏳ | קיים — צריך עדכון תוכן |
| Postiz חיבור | ❌ | postiz.com — לאחר META tokens |

---

## 🚦 איך יודעים שמוכנים להשקה?

כל ה-V צריכים להיות ✅:

```
✅ Anthropic API — קרדיטים פעילים
✅ A5 — שלח מייל DRY_RUN עם 3 תמונות + captions
✅ A1 — שלח מייל עם מוצרים מ-CJ
✅ A2 — העלה לפחות מוצר 1 ל-Shopify כ-Draft
✅ A3 — פרסם מאמר בלוג ראשון
✅ Klaviyo — Welcome + Abandoned Cart flows פעילים
✅ Popup — מאסף אימיילים ב-sockacademy.store
✅ מחירים — מוגדרים לכל קטגוריה
✅ SEO — לפחות 10 שיפורים מיושמים
✅ META tokens — A4 + A5 יכולים לפרסם LIVE

→ רק אז מתחילים מכירות.
```

---

*SockAcademy · Skills Guide v2.0 · יוני 2026*
*"Build the foundation. Then sell."*
