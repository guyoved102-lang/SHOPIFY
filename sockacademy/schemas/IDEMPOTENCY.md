# SockAcademy — Idempotency Contracts

כל agent שA0 עשוי לretry **חייב** להגן מפני ביצועים כפולים.

---

## A1 — Product Research
**סטטוס:** ✅ Safe to retry — stateless  
**נימוק:** לא כותב לשום מקום שעלול לגרום לduplicates. כותב לGoogle Sheets אבל כל ריצה מחליפה את כל הנתונים.

---

## A2 — Product Upload
**סטטוס:** ✅ תוקן — optimistic lock  

**הגנה מובנית ב-`agent.js` (ריצה מה-19/06/2026):**

```javascript
// getApprovedRows — מסנן גם 'uploading':
async function getApprovedRows(sheet) {
  const rows = await sheet.getRows();
  return rows.filter(row => {
    const status = (row.get('Status') || '').trim();
    const uploadStatus = (row.get('Upload Status') || '').trim();
    return (
      status === 'Approved' &&
      uploadStatus === ''
      // 'uploading' = בתהליך או נתקע → דלג (מונע duplicate Shopify product)
      // 'uploaded:ID' = הושלם → דלג
      // 'error:...' = נכשל → דלג, גיא מנקה ידנית
      // 'stuck:TIMESTAMP' = A0 זיהה תקיעה → דלג, גיא מנקה
    );
  });
}

// לפני createShopifyProduct — כתיבה אופטימיסטית:
row.set('Upload Status', 'uploading');
await row.save();

// לאחר הצלחה:
row.set('Upload Status', `uploaded:${shopifyProduct.id}`);
row.set('Shopify ID', String(shopifyProduct.id));
row.set('Shopify URL', `https://sockacademy.store/products/${shopifyProduct.handle}`);
row.set('Upload Date', new Date().toISOString().split('T')[0]);
await row.save();

// לאחר כישלון:
row.set('Upload Status', `Error: ${e.message.slice(0, 150)}`);
await row.save();
```

**טבלת מצבים — עמודת `Upload Status` ב-Sheets:**
| Upload Status | פירוש | A2 בריצה הבאה |
|---|---|---|
| `""` (ריק) | טרם עובד | יעבד |
| `"uploading"` | בתהליך (או נתקע) | ידלג — לא ידוע אם Shopify קיבל |
| `"uploaded:8923847162"` | הושלם | ידלג |
| `"error:Shopify 422: ..."` | נכשל | ידלג — גיא מנקה ידנית |
| `"stuck:1750316400"` | A0 זיהה תקיעה (Unix timestamp) | ידלג — גיא מנקה ידנית |

**איך לאפשר retry על שגיאה:** גיא מוחק את תוכן עמודת `Upload Status` ידנית ב-Sheet.

---

## A3 — Content / Blog
**סטטוס:** ✅ תוקן — check_existing by handle  

**הגנה מובנית ב-`agent.js` (ריצה מה-19/06/2026):**

```javascript
// לפני publishArticle — בודק אם מאמר קיים לפי handle:
const exists = await articleExists(handle);
if (exists) {
  console.log(`⏭️  מאמר קיים (${handle}) — מדלג`);
  return; // idempotent — skip without error
}
// רק אם לא קיים → פרסם
article = await publishArticle(topic, bodyHtml);
```

**נימוק:** handle = נגזר דטרמיניסטית מ-topic.title. אותה ריצה שבועית תייצר אותו handle → בדיקה בלבד מונעת כפל.

---

## A4 — Meta Ads
**סטטוס:** ✅ Safe to retry — stateless  
**נימוק:** מייצר copy בלבד, לא מפרסם.

---

## A5 — Social Content
**סטטוס:** ✅ Safe to retry — stateless  
**נימוק:** מייצר assets בלבד, שומר ל-Google Drive, לא מפרסם.

---

## A6 — Email/Klaviyo
**סטטוס:** ✅ Safe to retry — upsert by name  
**נימוק:** `listTemplates()` בודק אם template קיים לפי שם. אם קיים → update. אם לא → create. הריצה תמיד מביאה לאותו state.

---

## A7 — Supplier Monitor
**סטטוס:** ✅ Safe to retry — idempotent by design  
**נימוק:** עדכון מחיר ב-Shopify לאותו ערך = no-op. אין יצירת records חדשים.

---

## A9 — Legal Compliance
**סטטוס:** ✅ Safe to retry — stateless  
**נימוק:** מייצר דוח ושולח email. retry שולח דוח כפול למייל — סבלי.

---

## A10 — Trend Scout
**סטטוס:** ✅ Safe to retry — stateless  
**נימוק:** מייצר דוח ושולח email.

---

## A11 — Price Intelligence
**סטטוס:** ✅ Safe to retry — stateless  
**נימוק:** scraping + דוח. לא כותב לstate חיצוני.

---

## A12 — Review Collector
**סטטוס:** ✅ Safe to retry — Shopify tag guard  
**נימוק:** תג `review-requested` מונע שליחה כפולה. retry יסרוק אורדרים שוב וידלג על כאלה שכבר תוייגו.

---

## A13 — Competitive Intelligence
**סטטוס:** ✅ Safe to retry — append-only  
**נימוק:** מוסיף שורות לSheets. retry מוסיף שורה כפולה לאותו תאריך — acceptable, ניתן לזהות לפי timestamp.

---

## סיכום — סטטוס idempotency

| Agent | Safe? | סוג guard | תוקן? |
|-------|-------|-----------|--------|
| A1 | ✅ | stateless | — |
| A2 | ✅ | optimistic_lock | ✅ 19/06/2026 |
| A3 | ✅ | check_existing (handle) | ✅ 19/06/2026 |
| A4 | ✅ | stateless | — |
| A5 | ✅ | stateless | — |
| A6 | ✅ | upsert_by_name | — |
| A7 | ✅ | shopify_update | — |
| A9 | ✅ | stateless | — |
| A10 | ✅ | stateless | — |
| A11 | ✅ | stateless | — |
| A12 | ✅ | shopify_tag | — |
| A13 | ✅ | append | — |
