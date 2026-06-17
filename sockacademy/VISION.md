# SockAcademy — Brand Vision & Operating Standards

## Brand DNA
SockAcademy = האקדמיה הראשונה בעולם לגרביים פרמיום.
מוצר מינימלי. פרזנטציה מקסימלית. כל מילה, כל פיקסל — מכוונים.

## Tone of Voice — חוק בל יעבור
- **קצר. סמכותי. לא חופר.**
- אין מילות מילוי. אין ביטויים ילדותיים. אין סמלי אימוג'י בפרסום.
- כל שורת קופי נבדקת: "האם זה נשמע כמו מותג $250+ ?"
- דגם: Loro Piana, Sunspel, Falke — לא H&M, לא AliExpress.

## Omnichannel Ad Architecture — רמת פלטפורמות
| פלטפורמה | API | סטטוס |
|---|---|---|
| Meta Ads | Marketing API v25 | ✅ מחובר |
| Instagram | Graph API | ✅ הוגדר |
| TikTok for Business | TikTok Ads API | 🔜 Phase 2 |
| Google Ads | Google Ads API | 🔜 Phase 2 |
| Pinterest | Pinterest API | 🔜 Phase 3 |

## Server-Side Data Layer — CAPI (Phase 2)
כשיש traffic אמיתי → נבנה Meta Conversions API server-side:
- Events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase
- Hash: email/phone/IP → SHA256 לפני שליחה
- Deduplication: event_id משותף בין pixel + CAPI
- אפס תלות ב-browser, אפס ad-blockers

## Price Floor — קשיח
| קטגוריה | מינימום |
|---|---|
| Single Pair | $18 |
| Premium | $28 |
| Merino/Tactical | $35 |
| Gift Set | $65 |

## Blocked — לכל הסוכנים לעולם
- גרביים לכלבים / חיות מחמד
- גרביים לילדים / תינוקות
- נובלטי / פאני / קריקטורים
- תמונות Higgsfield ללא רפרנס מגיא

## Agent Fleet Status (17/06/2026)
| סוכן | פונקציה | סטטוס |
|---|---|---|
| A1 | Product Research | ✅ |
| A2 | Product Upload | ✅ |
| A3 | Content & Blog | ✅ |
| A4 | Meta Ads | ✅ Live (secrets added 17/06) |
| A5 | Instagram Social | ⚠️ ממתין להרשאות Instagram |
| A6 | Email / Klaviyo | ✅ |
| A7 | Supplier Monitor | ⚠️ MOCK products |
| A9 | Legal Compliance | ✅ (ממתין לעורך דין לפני traffic) |
| A10 | Trend Scout | ✅ |
| A11 | Price Intelligence | ✅ |
| A12 | Review Collector | ✅ |
