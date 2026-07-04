# SOCKACADEMY — Vision & Strategy

---

## 📸 SYSTEM SNAPSHOT — June 17, 2026

> This section is updated at every project wrap-up. The original founding vision below remains untouched — it is the root of everything.

### Agent Pipeline — Live Status

| Agent | Role | Status | Schedule |
|---|---|---|---|
| A1 | Product Research — CJ Dropshipping scanner | ✅ Live | Mon 10:00 IL |
| A2 | Product Upload — auto-publish approved products | ✅ Built | On trigger |
| A3 | Content — weekly blog + landing page | ✅ Built | Weekly |
| A4 | Meta Ads — campaign creation + optimization | ✅ Built (DRY_RUN) | Daily |
| A5 | Social Content — Claude → DALL-E → Instagram | ✅ Built | 3×/week |
| A6 | Klaviyo Email Sync — abandoned cart 3 templates | ✅ Built | On trigger |
| A7 | Supplier Monitor — stock + price alerts | ✅ Built (17/06/2026) | Daily 08:00 IL |
| A8 | Analytics Reporter — GA4 | ⏳ After 10 sales | Daily |
| A9 | Legal Compliance — ToS, Privacy, Shipping, Refund | ✅ Built (17/06/2026) | One-shot |
| A10 | Trend Scout — Google Trends + Reddit → Claude → Sheets | ✅ Built (17/06/2026) | Sun 08:00 IL |
| A11 | Price Intelligence — 5 competitors, Sheets A11_Prices | ✅ Built (17/06/2026) | Wed 08:00 IL |
| A12 | Review Collector — Judge.me post-purchase emails | ✅ Built (17/06/2026) | Daily 09:00 IL |
| A13 | Supplier Negotiator — private label | ⏳ Phase 2 ($5K×3mo) | On trigger |

### Key Decisions Locked (17/06/2026)

- **Legal jurisdiction:** Delaware, USA — AAA binding arbitration + class action waiver
- **Shipping framing:** "SockAcademy partners with international logistics providers" (no CJ mention)
- **GDPR/CCPA:** full rights disclosure, 5 data processors listed
- **A10 data sources:** Google Trends (free) + Reddit public API → Claude analysis. Perplexity deferred to Phase 2.
- **A11 competitors:** Bombas, Darn Tough, Stance, Smartwool, Feetures — single pair price only, no auto-repricing
- **A12 idempotency:** Shopify order tag `review-requested` — never sends twice, no external state file
- **Private Label trigger:** $5,000/month × 3 consecutive months

### Pending to Unlock Traffic

1. Install **Judge.me** on Shopify App Store
2. Add `SHOPIFY_SHOP_DOMAIN` to GitHub Secrets
3. Obtain **META tokens** (`META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_IG_USER_ID`)
4. Set `MAKE_A1_WEBHOOK` GitHub Secret
5. **Attorney review** of A9 legal templates before any live traffic

---

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- ORIGINAL FOUNDING VISION — DO NOT MODIFY — HISTORICAL ROOT BELOW  -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

---

## 🎓 מהות המותג - העמקה

### שלושת עמודי התווך

| עמוד | שם | תיאור |
|---|---|---|
| 1 | **The Academy** — ידע | תוכן מקצועי, בלוג, מדריכים, SEO. לא רק מוכרים — מלמדים. |
| 2 | **The Store** — מוצר | גרביים איכותיים, קיוריישן חכם, מנויים, חוויית קנייה פרמיום. |
| 3 | **The Brand** — זהות | אסתטיקה עקבית (זהב + פחם), קול מותג ייחודי, לויאליות לאורך זמן. |

> **"לא חנות גרביים — אקדמיה. SOCKACADEMY = Nike של גרביים"**
>
> Nike לא מוכרת נעליים — מוכרת ביצועים ושייכות. SOCKACADEMY לא מוכרת גרביים — מוכרת ידע, זהות, ושדרוג יומיומי.

---

## 💼 מודל עסקי

### מנוי — מודל דו-מימדי

לקוח בוחר **שני** פרמטרים:

**ציר 1 — מחיר (Tier):**
| Tier | תיאור |
|---|---|
| Basic | גרביים איכותיים בסיסיים, מחיר נגיש |
| Premium | גרביים פרמיום, חומרים מיוחדים |
| Luxury | גרביים יוקרתיים, limited editions |

**ציר 2 — קטגוריה (Type):**
| קטגוריה | דוגמאות |
|---|---|
| ספורט | ריצה, כדורגל, טיולים, אימון |
| יומיומי | casual, no-show, ankle |
| חורף | מרינו, תרמיים, גבוהים |
| פורמל | dress socks, עסקי, אירועים |
| + קטגוריות נוספות לפי ביקוש |

לקוח בוחר: **Premium × ספורט** — מקבל כל חודש גרביים ספורט פרמיום. או **Basic × יומיומי** — גרביים יומיומיים איכותיים במחיר נגיש.

---

## 🌍 שוק יעד

**גלובלי מהיום הראשון, ללא מיקוד גיאוגרפי/תרבותי.**

- אין מיקוד על מדינה אחת, שפה אחת, או תרבות אחת
- האתר באנגלית (שפה עולמית)
- משלוח בינלאומי מהשלב הראשון
- תוכן ושיווק — אוניברסלי

---

## ⚡ סדר עדיפויות נוכחי (עודכן)

### עדיפות 1 — חיבור והפעלת האגנטים (A1–A11)
> "העובדים שירוצו הכל, מינימום התעסקות אנושית"

המטרה: לבנות תשתית אוטומציה שמריצה את העסק ברקע — תוכן, אימיילים, SEO, inventory — ללא התערבות יומיומית.

### עדיפות 2 — ליטוש ועיצוב האתר
- Homepage: מבנה, תוכן, חוויית משתמש
- לינקים שבורים — מיפוי ותיקון
- עקביות ויזואלית לכל הסקשנים

### הערות סטטוס
- **A6 (Klaviyo)** — בעבודה: חשבון מוכן ומחובר, Flows עדיין לא נבנו
- **A1–A3** — הושלמו (תמה, סקשנים, 20 פוסטי בלוג)

---

## 🗺️ Roadmap (גבוה רמה)

| שלב | תיאור | סטטוס |
|---|---|---|
| A1 | Theme & Design System | ✅ הושלם |
| A2 | Sections & Layout | ✅ הושלם |
| A3 | תוכן ובלוג (20 פוסטים) | ✅ הושלם |
| A4–A5 | TBD | — |
| A6 | Klaviyo Email Flows | 🔄 בעבודה |
| A7–A11 | אגנטים ואוטומציה | ⏳ בתכנון |

---

## 🔌 Make.com — מפת חיבורים מתוכננת

חשבון Make.com נוצר (sockacademy.store@gmail.com, Free plan).

### חיבורים מאושרים (לפי סדר שימוש עתידי):

| אפליקציה | שימוש | אגנט רלוונטי |
|---|---|---|
| Shopify | טריגרים: הזמנות, מוצרים, לקוחות | כולם |
| Google Sheets | לוג מרכזי לכל פעולה (חוק ברזל #4) | כולם |
| Anthropic Claude | כתיבת תוכן, ניתוח, תיוג, מחקר | A1, A3, A10 |
| Klaviyo | טריגרים לאימייל (cart, purchase וכו') | A6 |
| Gmail | התראות, דוחות יומיים | A4, A9 |
| Telegram | התראות מהירות + Kill Switch | כל האגנטים |
| WhatsApp Business Cloud | שירות לקוחות, דוחות | A10, A4 |
| OpenAI (DALL-E) | יצירת תמונות מוצר | A2 |
| Perplexity AI | מחקר טרנדים/מוצרים עם מקורות | A1 |
| Instagram for Business | פרסום תוכן אורגני | A5 |
| Pinterest | תמונות מוצר/לייפסטייל | A5 |
| Youtube | וידאו מוצרים | A5 |
| Facebook Pages | קמפיינים ממומנים | A4 |

### עקרון עבודה
- כל scenario חדש ב-Make = מתועד כאן עם: trigger, פעולות, אגנט שייך
- חיבור (connection) נוצר רק כשנגיעים לאגנט הרלוונטי - לא מקדימים חיבורים שלא בשימוש
- כל scenario כותב שורה ל-Google Sheets הלוג המרכזי (timestamp, agent, action, result)

### Scenario ראשון מתוכנן
Shopify (Watch Orders) → Google Sheets (לוג) — תשתית בסיסית לפני הוספת לוגיקה

---

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- AGENT EVOLUTION LOG — appended as agents are built                 -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

## 🤖 Agent Build Log — הסוכנים שנבנו בפועל

> מה שהושלם בפועל — commit by commit. זהו הרשומה הרשמית של הבנייה.

### Phase 1 — Core Infrastructure (יוני 2026)

#### A1 — Product Research ✅
סורק CJ Dropshipping, מדרג 1-100, כותב ל-Google Sheets. פועל כל שני 10:00 ישראל.
**Output:** Google Sheets `Products` tab + email digest לגיא.

#### A2 — Product Upload ✅
מקבל מוצר מאושר מ-Google Sheets → מעלה ל-Shopify דרך REST API + מוסיף ל-Collections.
**Trigger:** שורה עם סטטוס "Approved" ב-Sheets.

#### A3 — Content ✅
פוסט בלוג שבועי (1,500+ מילים, SEO) + דף נחיתה `/pages/join`.
**Output:** Shopify Blog + Shopify Page.

#### A4 — Meta Ads ✅ (DRY_RUN — ממתין META tokens)
יוצר קמפיינים, מאופטם, מכבה מפסידות. ROAS מינימלי 2.5.
**Secrets needed:** `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`

#### A5 — Social Content ✅ (DRY_RUN — ממתין OPENAI_API_KEY)
Claude כותב קפי → DALL-E יוצר תמונה → Shopify CDN → Instagram.
**Secrets needed:** `OPENAI_API_KEY`, `META_IG_USER_ID`

#### A6 — Klaviyo Email Sync ✅
3 תבניות נוצרו: VVJgjg / Ve5Xmf / RyAVYT. Abandoned Cart Flow LIVE.
**Templates:** Welcome (3 emails) + Abandoned Cart (2 emails).

#### A7 — Supplier Monitor ✅ (built 17/06/2026)
מנטר מלאי + מחירים אצל ספק. Config-driven thresholds. Mock mode לבדיקה.
**Schedule:** יומי 08:00 ישראל.

#### A9 — Legal Compliance ✅ (built 17/06/2026)
יוצר/מעדכן 4 דפי Shopify: Terms of Service, Privacy Policy, Shipping Policy, Refund Policy.
**Legal stack:** Delaware law + AAA arbitration + class action waiver + GDPR + CCPA.
**⚠️ חובה:** סקירת עורך דין ישראלי לפני כל טראפיק חי.

#### A10 — Trend Scout ✅ (built 17/06/2026)
Google Trends (12 keywords) + Reddit (7 subreddits) → Claude Haiku → Top 5 trends.
**Output:** Google Sheets `A10_Trends` tab + email digest.
**Schedule:** כל ראשון 08:00 ישראל.
**Integration:** `cj_search_term` נקרא על ידי A1 לחיפוש אוטומטי ב-CJ.

#### A11 — Price Intelligence ✅ (built 17/06/2026)
מעקב מחירים: Bombas, Darn Tough, Stance, Smartwool, Feetures.
3 קטגוריות: Merino Wool / Performance / Tactical. Single pair price only.
**Output:** Google Sheets `A11_Prices` tab + email digest. אפס auto-repricing.
**Schedule:** כל רביעי 08:00 ישראל.

#### A12 — Review Collector ✅ (built 17/06/2026)
7 ימים אחרי fulfillment → email ממותג עם Judge.me review link.
**Idempotency:** Shopify order tag `review-requested` — אפס כפילויות, אפס state file.
**Schedule:** יומי 09:00 ישראל.

---

### Phase 2 — Growth (עתיד)

#### A8 — Analytics Reporter ⏳
מחכה ל-10 מכירות ראשונות. GA4 `G-YMG2N14HD4`.

#### A13 — Supplier Negotiator ⏳
Phase 2: Private Label. מופעל לאחר $5,000/month × 3 חודשים רצופים.

---

### חוקי ברזל שנשארים לנצח

| חוק | ניסוח |
|---|---|
| Zero Sales Until Full Sync | אפס טראפיק אמיתי לפני בדיקת כל הסוכנים |
| Rating Floor | 4.5 כוכבים מינימום — לא מתפשרים על איכות |
| Price Floors | Single $18+ \| Premium $28+ \| Merino/Tactical $35+ \| Gift $65+ |
| Brand Blocks | ילדים / כלבים / נובלטי — BLOCKED לנצח |
| Higgsfield Rule | אסור שימוש ב-Higgsfield ללא תמונת רפרנס מגיא |
| Attorney Rule | A9 templates — סקירת עורך דין לפני go-live |
| Private Label Trigger | $5,000/month × 3 חודשים רצופים |
