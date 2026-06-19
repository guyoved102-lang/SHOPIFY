# SockAcademy — Idempotency Contracts

כל agent שA0 עשוי לretry **חייב** להגן מפני ביצועים כפולים.

---

## A1 — Product Research
**סטטוס:** ✅ Safe to retry — stateless  
**נימוק:** לא כותב לשום מקום שעלול לגרום לduplicates. כותב לGoogle Sheets אבל כל ריצה מחליפה את כל הנתונים.

---

## A2 — Product Upload ⚠️ תיקון נדרש

**בעיה:** אם A2 נכשל לאחר יצירת מוצר ב-Shopify אך לפני כתיבת `UploadStatus` ל-Sheets — retry ייצור מוצר כפול.

**תיקון נדרש ב-`agent.js`:**

```javascript
// ב-getApprovedRows — מסנן גם 'uploading' (שמגן מ-concurrent runs):
async function getApprovedRows(sheet) {
  const rows = await sheet.getRows();
  return rows.filter(row => {
    const status = (row.get('Status') || '').trim();
    const uploadStatus = (row.get('Upload Status') || '').trim();
    return (
      status === 'Approved' &&
      uploadStatus === ''  // לא מעבד uploading (in-progress) ולא uploaded
    );
  });
}

// לפני createShopifyProduct — כתיבה אופטימיסטית:
async function processRow(row, product, transporter) {
  // STEP 1: Lock the row BEFORE doing anything external
  await row.set('Upload Status', 'uploading');
  await row.save();

  try {
    // STEP 2: Generate description
    const description = await generateDescription(product);
    product.description = description;

    // STEP 3: Create Shopify product
    const shopifyProduct = await createShopifyProduct(product);

    // STEP 4: Mark complete with Shopify ID
    await row.set('Upload Status', `uploaded:${shopifyProduct.id}`);
    await row.save();

    return { success: true, id: shopifyProduct.id, name: product.name };

  } catch (err) {
    // STEP 5: On failure — mark as error (NOT empty, to prevent infinite retry)
    await row.set('Upload Status', `error:${err.message.slice(0, 150)}`);
    await row.save();
    throw err;
  }
}
```

**תוצאה לאחר תיקון:**
| UploadStatus | פירוש | A2 בריצה הבאה |
|---|---|---|
| `""` (ריק) | טרם עובד | יעבד |
| `"uploading"` | בתהליך (או נתקע) | ידלג — לא ידוע אם Shopify קיבל |
| `"uploaded:8923847162"` | הושלם | ידלג |
| `"error:Shopify 422: ..."` | נכשל | ידלג — גיא מנקה ידנית |

**איך לאפשר retry על שגיאה:** גיא מוחק את תוכן עמודת Upload Status ידנית בSheet.

---

## A3 — Content / Blog
**סטטוס:** ⚠️ בדיקה נדרשת  
**נדרש:** לפני יצירת מאמר, לבדוק אם קיים כבר מאמר עם אותו title ב-Shopify Blog. אם קיים — לדלג, לא לשכפל.

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

| Agent | Safe? | סוג guard | תיקון נדרש? |
|-------|-------|-----------|-------------|
| A1 | ✅ | stateless | לא |
| A2 | ⚠️ | optimistic_lock | **כן — ראה תיקון למעלה** |
| A3 | ⚠️ | check_existing | כן — לפני build |
| A4 | ✅ | stateless | לא |
| A5 | ✅ | stateless | לא |
| A6 | ✅ | upsert_by_name | לא |
| A7 | ✅ | shopify_update | לא |
| A9 | ✅ | stateless | לא |
| A10 | ✅ | stateless | לא |
| A11 | ✅ | stateless | לא |
| A12 | ✅ | shopify_tag | לא |
| A13 | ✅ | append | לא |
