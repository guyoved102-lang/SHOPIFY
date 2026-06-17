# SOCKACADEMY - Current State (14/06/2026)

## 🔴 טריגר סיום שיחה — חובה

**כאשר גיא כותב "סיום שיחה" או "מסיימים שיחה" — מופעל אוטומטית:**
Total Quality Control & System Audit Protocol:
1. בדיקת syntax לכל agent files
2. סריקת credentials — אפס hardcoded
3. השוואת GitHub Secrets מול כל הworkflows
4. בדיקת TODO/placeholders — תיעוד מה בכוונה ומה צריך תיקון
5. git commit + push של כל שינויים פתוחים
6. דוח QA בעברית — מה נשמר, מה הבא, מצב המערכת

## 🤖 הוראת פתיחת שיחה — חובה
**בתחילת כל שיחה חדשה (פעם אחת בלבד):**
הפעל את הסקיל `/run-sockacademy-agents` לבדיקת בריאות הסוכנים. דווח בשורה אחת.

**חיסכון בטוקנים — תמיד:**
תגובות קצרות. לא לחזור על מה שנאמר. לא לסכם. לא להסביר לפני שעושים — פשוט לעשות.

**פנייה לגיא — תמיד:**
כל תגובה מתחילה במילה "גיא". ללא יוצא מן הכלל.

**למידה מתמשכת:**
תוך כדי שיחה — אם מגלים משהו חדש על גיא (סגנון, העדפה, דרך חשיבה) — לעדכן `memory/user_guy.md` מיד.

## 🔒 חוקי ברזל — נעולים לצמיתות (18/06/2026)

### 0. GROWTH & ADAPTATION DNA — ללמוד, להסתגל, לצמוח
SockAcademy הוא מערכת חיה. כל עדכון הוא ניסיון למידה — לא רק משימה.
כשמשהו לא עובד: מנתחים, לומדים, מתאימים — לא מוחקים ומתחילים מחדש.
iteration > perfection. כל pivot הוא מידע. מתעדים שינויים ב-CLAUDE.md ו-memory בזמן אמת.

### 1. ENTERPRISE EXECUTION RULE — אפס קיצורים
אפס placeholders. אפס `// TODO`. אפס קוד חצי-אפוי. כל קטע קוד שנכתב — production-ready מלא, מפורט, ומושלם.
אסור לתת תשובה "עצלה" — אם המשימה גדולה, מפרקים אותה לחלקים ומשלימים כל חלק במלואו.

### 2. META CAPI PROTOCOL — Server-Side בלבד
כשמגיעים לשלב CAPI — בונים server-side Meta Conversions API ישירות בתוך framework הסוכנים.
לא נגע ב-Facebook Business Manager UI למשימות data. Events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase. Hash: SHA256. Deduplication: event_id.

### 3. PREMIUM BRAND DNA — יוקרתי ועניני
כל פיסת תוכן — פרסום, סושיאל, מייל — צריכה להרגיש כמו מותג $250+.
רפרנסים: Loro Piana, Sunspel, Falke. **לא** H&M, **לא** AliExpress.
קצר. סמכותי. לא חופר. בלי אמוג'י בפרסום.

### 4. DESIGN FREEZE — קפוא עד הודעה חדשה
Frontend, עיצוב, דפים סטטיים, legacy CSS — **קפואים**. לא נוגעים.
פוקוס בלעדי: pipeline הסוכנים + backend sync.

## 🎯 Brand Voice
מותג פרמיום, סמכותי, מקצועי. SockAcademy = האקדמיה הראשונה בעולם לגרביים.
טון: בגרות, ידע, כבוד לפרטים — לא ילדותי, לא קריקטורי.

## 🚨 חוקי מיקוד — לכל האגנטים
**SockAcademy = גרביים פרמיום לגברים/יוניסקס בוגרים. נקודה.**

### מה מכניסים:
| קטגוריה | דוגמאות |
|---|---|
| Premium Materials | Merino Wool, Cashmere, Bamboo, Egyptian Cotton, Copper |
| Performance | Compression, No-Show, Athletic, Cycling, Running |
| Tactical & Outdoor | Hiking, Waterproof, Thermolite, Tactical Boot |
| Dress & Formal | Dress, Argyle, Business, Over-the-calf, Ribbed |
| Gift Sets | Premium multi-pair sets, gift boxes |

### מה שאסור בשום אגנט:
- גרביים לכלבים / חיות מחמד — **BLOCKED**
- גרביים לילדים / תינוקות — **BLOCKED**
- נובלטי / פאני / קריקטורים — **BLOCKED**
- מוצר ללא premium signal ברור — **BLOCKED**
- תמונות Higgsfield ללא רפרנס מגיא — **BLOCKED**

### מחירים מינימליים (לא לרדת מתחת):
- Single pair: $18+ | Premium: $28+ | Tactical/Merino: $35+ | Gift Set: $65+

## ✅ הושלם הכל

### Infrastructure
- Make.com "Integration Shopify" - LIVE (Watch orders → Google Sheets כל 15 דקות)
  - Sheet: https://docs.google.com/spreadsheets/d/1ojfN0ClyB4EM83yk03RhKlQImrTjZdYEurZ4dJbuQBg
  - Scenario: https://us2.make.com/2431763/scenarios/5378494/edit
- **דומיין: sockacademy.store** — נרשם ב-GoDaddy, מחובר ל-Shopify ✅
- **Shopify Primary Domain: sockacademy.store** ✅
- **Klaviyo Sending Domain: mail.sockacademy.store** ✅ (מוגדר דרך Entri)
- Klaviyo API מחובר ✅

### Klaviyo Welcome Series Flow — LIVE ✅
3 מיילים מוגדרים עם תוכן מקצועי, שולח מ-`hello@sockacademy.store`

### Shopify
- WELCOME10 discount code — 10% off, תוקף 7 ימים ✅
- Price rule ID: 1885562142918 | Discount code ID: 18092896977094

## 📧 Welcome Flow — תוכן סופי (מקצועי)

### Email 1 (מיידי) — Welcome
**Subject:** `Welcome to SockAcademy — the world's first sock authority`
**Preview:** `Where sock knowledge meets premium craft.`
**From:** `hello@sockacademy.store`
**Body:**
```
Hi {{ first_name|default:"there" }},

You've just joined the world's first dedicated sock authority.

At SockAcademy, we believe socks are the most underestimated element
of personal style — and we've built something to change that.

Expect curated selections from the world's finest sock makers,
expert knowledge on materials and fit, and a standard that most
brands simply don't bother with.

As a welcome, use WELCOME10 for 10% off your first order.
Valid for 7 days.

— The SockAcademy Team
```

### Email 2 (יום 3) — Brand Philosophy
**Subject:** `The sock is the last thing you put on. It shouldn't be the last thing you think about.`
**Preview:** `A different standard for what covers your feet.`
**From:** `hello@sockacademy.store`
**Body:**
```
Hi {{ first_name|default:"there" }},

The most discerning dressers have always known it:
socks are where attention to detail becomes visible — or invisible.

The right sock doesn't just complete an outfit. It signals something
about who you are. The quality of the fabric. The precision of the knit.
The way it holds its shape after a hundred washes.

At SockAcademy, we don't carry socks. We curate them.
From merino wool to Egyptian cotton, from timeless ribbed to bold
statement patterns — every pair earns its place.

Because standards matter, even where no one is looking.

— The SockAcademy Team
```

### Email 3 (יום 7) — Expiry
**Subject:** `Your welcome discount expires in 48 hours`
**Preview:** `Don't leave quality on the table.`
**From:** `hello@sockacademy.store`
**Body:**
```
Hi {{ first_name|default:"there" }},

A brief reminder: your 10% welcome discount expires in 48 hours.

Use WELCOME10 at checkout — and use it on something worth wearing.

→ https://sockacademy.store

— The SockAcademy Team
```

## 🔑 Credentials חשובים
- SHOPIFY_MASTER_TOKEN: ב-.env (כל ההרשאות — write_themes + הכל)
- KLAVIYO_PRIVATE_API_KEY: ב-.env
- GA4 Measurement ID: G-YMG2N14HD4 (מחובר ל-theme.liquid)
- Shopify API Key (client_id): 877bb86b64dae4afe6b6537bcf455d10
- Make.com: sockacademy.store@gmail.com
- Store URL: https://sockacademy.store
- Shopify internal: 11eqwi-ji.myshopify.com
- Currency: USD 🌍

## 🌐 DNS
- `sockacademy.store` → 23.227.38.32 (Shopify) ✅
- `mail.sockacademy.store` → Klaviyo (DKIM/sending) ✅

## ✅ יסודות שהושלמו (14/06/2026)
- 5 מוצרי ייסוד + 9 Collections (כולל Best Sellers + All Socks) ✅
- כל המוצרים מחוברים לכל הCollections הנכונות ✅
- GA4 G-YMG2N14HD4 מחובר ✅
- Theme מלא עלה ל-Shopify (369 קבצים) ✅
- SHOPIFY_MASTER_TOKEN עם כל ההרשאות ✅
- Currency: USD ✅
- 5 Policy Pages ✅
- About SockAcademy Page (ID: 120033411270) ✅
- Size Guide Page (ID: 120033444038) ✅
- 10 Blog Articles (5 ישנים + 5 חדשים SEO) ✅
- Abandoned Cart Flow Content — מוכן ב-KLAVIYO_ABANDONED_CART_FLOW.md ✅
- 5 GitHub Secrets שמורים ✅

## ✅ יסודות נוספים (15/06/2026)
- Abandoned Cart Flow LIVE (hello@sockacademy.store) ✅ — 2 מיילים, Day 2 delay
- FAQ Page ✅
- 17 URL Redirects ✅
- SEO metafields על כל 5 מוצרים ✅
- כל המוצרים Sold Out (אין מלאי לספק עדיין) ✅
- Homepage שופרה — hero text + Best Sellers ✅

## 📝 TODO — משימות עתידיות
### Klaviyo
- [ ] **החלף תוכן Abandoned Cart emails** — subject lines + body לטקסטים מ-`KLAVIYO_ABANDONED_CART_FLOW.md`
  - Email 1: Subject: "You left something behind" | תוכן מותאם SockAcademy
  - Email 2: Subject: "What's still in your cart — and why it's worth it"
  - כרגע: Klaviyo generic template. Sender: hello@sockacademy.store ✅
- [ ] **Welcome Series ⚠️** — יש warning על ה-flow הLive, לבדוק מה הבעיה

### Meta & Analytics
- [x] **Meta Pixel** — מחובר דרך Facebook & Instagram Shopify App ✅ (15/06/2026)
- [x] **GA4 Stream URL** — מעודכן → sockacademy.store ✅ (15/06/2026)

### מוצרים
- [ ] **תמונות מוצרים** — Higgsfield כשיש תמונת רפרנס (לא לבזבז קרדיטים!)
- [ ] **הפעל מלאי** — כשמוצרים מוכנים לאספקה, להחזיר inventory ל-50

### 💰 אסטרטגיית תמחור — לעתיד (כשמוכנים למכירות)
- כל מוצר יתומחר בנפרד לפי **קטגוריה + איכות**
- אין מחיר אחיד — האקדמיה לגרביים = כל מוצר ייחודי
- A1 מוצא מוצרים + רושם עלות ספק → גיא מחליט מחיר מכירה ביחד
- קטגוריות מחיר משוערות (לאישור גיא בעתיד):
  - גרביים בסיסיים פרימיום: $18–$28
  - גרביים מיוחדים / Merino / Egyptian Cotton: $28–$45
  - סטים / מתנות: $45–$85
  - Tactical / ביצועים גבוהים: $25–$40

---

## 🤖 נבחרת סוכני AI — 11 סוכנים

### A1 — מחקר מוצרים 🔍
סורק Spocket/AliExpress/טרנדים TikTok → מנתח מרג'ין/ביקוש/תחרות → מדרג 1-100 → דוח שבועי "5 מוצרים מומלצים".
**כלים:** Claude API + Make.com + Web Scraping | **סטטוס:** לבנות

### A2 — העלאת מוצרים 📦
מקבל מוצר מאושר → כותב תיאור SEO + כותרות → יוצר תמונות (Midjourney/Higgsfield) → מעלה דרך Shopify GraphQL → מתמחר לפי נוסחת מרג'ין קבועה.
**כלים:** Claude + Shopify GraphQL + Midjourney | **סטטוס:** לבנות

### A3 — Landing Page & תוכן ובלוג ✍️
**Landing Page:** דף נחיתה פרימיום — hero section, סיפור מותג, popup איסוף לידים → Klaviyo.
**בלוג:** חוקר מילות מפתח → כותב מאמר 1,500+ מילים → מפרסם אוטומטית → מפיץ לרשתות.
**כלים:** Claude + Shopify API + Klaviyo popup | **סטטוס:** 50% בנוי ✅
**סקילים:** Shopify Liquid, SEO on-page, CRO (conversion rate optimization)
**פלאגינים:** Privy / Klaviyo Forms (popup), Yoast SEO equivalent לשופיפיי

### A4 — פרסום Meta/TikTok Ads 📢
יוצר מודעות (קופי + קריאייטיב) → מריץ קמפיינים → מאופטם (כיבוי מפסידות, הגדלת מנצחות).
**חוק ברזל:** ROAS מינימלי 2.5, תקציב יומי מוגבל. דוח יומי בוואטסאפ/מייל.
**כלים:** Meta Ads API + TikTok Ads API + Claude לקופי | **סטטוס:** לבנות
**סקילים:** Pixel setup, Custom Audiences, Lookalike, A/B testing מודעות
**פלאגינים:** Meta Pixel (Shopify app), TikTok for Business app

### A5 — Customer Acquisition + תוכן אורגני סושיאל 📱
אורגני + ממומן — 3 פוסטים/שבוע לאינסטגרם, סרטוני מוצר (Higgsfield), תזמון אוטומטי.
מציאת אינפלואנסרים בנישת אופנה/גרביים + פנייה אוטומטית.
**כלים:** Buffer/Later לתזמון + Higgsfield לוידאו + Claude לקפיות | **סטטוס:** לבנות
**סקילים:** Hook writing, Reels editing, hashtag strategy, influencer outreach
**פלאגינים:** Later (תזמון), Modash (מציאת אינפלואנסרים)

### A6 — אימייל ושימור Klaviyo 💌
4 Flows: ברוכים הבאים (+10% הנחה), עגלה נטושה (3 מיילים), אחרי רכישה (upsell), לקוח רדום (win-back) + קמפיינים חגים.
**סטטוס:** Welcome Flow LIVE ✅ | hello@sockacademy.store
**סקילים:** Segmentation, A/B subject lines, flow branching, deliverability
**פלאגינים:** Klaviyo (מחובר ✅), Recart (SMS)

### A7 — תחזוקה טכנית 🛠️
ניטור uptime 24/7, Theme Check אוטומטי בכל push, התראות שגיאות, גיבוי GitHub יומי.
**סטטוס:** GitHub + Dependabot פעיל ✅
**סקילים:** CI/CD, Shopify CLI, Theme Check, performance auditing
**פלאגינים:** Dependabot (✅), UptimeRobot (ניטור), Lighthouse CI

### A8 — Analytics & Reporting 📊
דשבורד יומי — מכירות, טראפיק, המרות, Klaviyo stats, ROAS. מדווח אוטומטית לגיא.
**כלים:** Google Analytics 4 + Shopify Analytics + Make.com | **סטטוס:** לבנות
**סקילים:** GA4 setup, UTM tracking, funnel analysis, cohort analysis
**פלאגינים:** GA4 (Shopify app), Lucky Orange (heatmaps), Triple Whale

### A9 — חשבונות 💵
רושם הכנסות/הוצאות, מחשב רווח/הפסד יומי, דוח חודשי לרו"ח, מעקב מע"מ.
**חוק ברזל:** דיווח לרשויות = רו"ח אנושי. | **סטטוס:** לבנות
**כלים:** Google Sheets (כבר פעיל ✅) + Make.com + חישוב מרג'ין אוטומטי
**פלאגינים:** Shopify Balance, Accountify

### A10 — שירות לקוחות 💬
עונה על שאלות נפוצות, פותר בעיות הזמנה, מסלים מקרים מורכבים, אוסף פידבק.
**כלים:** Claude + Shopify Inbox + WhatsApp | **סטטוס:** לבנות
**סקילים:** Prompt engineering לתשובות מותג, escalation logic
**פלאגינים:** Shopify Inbox (חינם), Tidio (צ'אט + AI), Gorgias

### A11 — משפטי + אבטחה ⚖️🔒
משפטי: חוק הגנת הצרכן הישראלי, GDPR, FTC, עדכון Policies.
אבטחה: ניטור איומים, חסימת IP זדוניים, SSL/TLS, PCI-DSS, fraud detection, גיבויים.
**חוק ברזל:** שינוי מהותי / דיווח = אישור אנושי תמיד.
**כלים:** Cloudflare + Shopify Security + GitHub | **סטטוס:** לבנות

---

### A12 — UI/UX Designer & Website Builder 🎨 (חדש!)
**תפקיד:** מעצב ובונה את החנות ברמת PRO — כמו צוות UX/UI מקצועי מלא.
**יכולות:**
- מחקר UX: ניתוח heatmaps, session recordings, user flows
- עיצוב: Figma mockups → Shopify Liquid code → פיצ'ר מוגמר
- Landing pages: hero sections, social proof, urgency elements, CTA optimization
- Mobile-first: כל עיצוב קודם מובייל, אח"כ דסקטופ
- A/B testing: מריץ טסטים על layouts, צבעים, CTAs
- Performance: Core Web Vitals — LCP < 2.5s, CLS < 0.1, FID < 100ms
**סקילים ללמוד:**
  - Shopify Liquid (templating)
  - CSS Grid + Flexbox + animations
  - Conversion Rate Optimization (CRO)
  - Accessibility (WCAG 2.1)
  - Page speed optimization (lazy load, image compression, CDN)
**פלאגינים:**
  - PageFly / Shogun (drag & drop builder)
  - TinyIMG (אופטימיזציה תמונות אוטומטית)
  - Hotjar (heatmaps + recordings)
  - Google Optimize (A/B testing)
  - Lighthouse (ביצועים אוטומטי)

### A13 — מודיעין תחרותי עולמי 🌍🕵️ (חדש!)
**תפקיד:** סורק את כל המתחרים בעולם בנישת גרביים פרימיום — מביא מידע, מזהה פערים, ומפעיל אגנטים אחרים אוטומטית.
**יכולות:**
- סריקת מתחרים עולמיים: Bombas, Happy Socks, Falke, Pantherella, Darn Tough, Stance, Thursday Boots, Uniqlo Socks + כל מתחרה חדש
- ניתוח: מחירים, מוצרים, קמפיינים, SEO keywords, ביקורות, UGC
- מזהה מה **חסר** אצל המתחרים → הזדמנות ל-SockAcademy
- מדווח אוטומטית → מפעיל A1 (מחקר מוצר), A4 (פרסום), A3 (תוכן) לפי הממצאים
- מביא לגיא: "מתחרה X הוריד מחיר / השיק מוצר / פרסם קמפיין חדש"
**פלטי מידע:**
  - דוח שבועי: "מה קורה בעולם הגרביים הפרימיום"
  - התראות מיידיות: כשמתחרה עושה מהלך חריג
  - רשימת הזדמנויות: פערים שSockAcademy יכולה למלא
**כלים:** Claude API + Web Search + Make.com + Google Sheets | **סטטוס:** לבנות

### 📋 עקרונות הבנייה
- כל סוכן נבנה ביחד עם גיא — שאלות → הבנה → ביצוע
- גישה: ללא ידע מוקדם — הכל מאפס, לומדים ביחד
- יעד: אוטומציה מלאה 24/7, קהל גלובלי
- כל סוכן לומד סקילים + פלאגינים ספציפיים לתחומו
- חוקי ברזל: פיננסי/משפטי/רפואי = אישור אנושי תמיד

---

## Development

```
shopify theme dev --store 11eqwi-ji.myshopify.com
```

Local preview: http://127.0.0.1:9292
## 👤 User
- שם: גיא — לפנות תמיד בשם גיא

