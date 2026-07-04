# Module 4 — מאגר ידע ארגוני (RAG) — Design Spec

**תאריך:** 04/07/2026
**סטטוס:** מאושר לתכנון מפורט (writing-plans)
**חלק מ:** Enterprise Brain Roadmap — `functional-gathering-knuth.md` (Module 4/4)

## למה בונים את זה

SockAcademy עדיין לפני-הכנסות (pre-revenue). כשיגיעו לקוחות אמיתיים, A16 (סוכן ה-CX) יצטרך לענות על שאלות תמיכה בלי להמציא תשובות (הזיות) על מדיניות, מידות, או מוצרים. הפתרון: מאגר ידע מבוסס וקטורים (RAG — Retrieval-Augmented Generation) שמעגן כל תשובה במידע אמיתי מהעסק — ה-FAQ, מדיניות, וקטלוג המוצרים.

**עקרון מנחה שגיא קבע בשיחה זו:** בונים הכל עכשיו ברמה הגבוהה ביותר, מוכן ומחובר במלואו — אבל *רדום וללא עלות* עד שיש לקוחות אמיתיים שמצדיקים את זה. אותו עיקרון "Dormant but Breathing" שכבר הוחל על A18–A28.

## מה קיים היום (נבדק בקוד, לא הונח)

- **A16 CX** (`agents/A16_cx/agent.js`) — היום זהו אך ורק סוכן דו"ח: קורא הזמנות מ-Shopify + מנוי מ-Klaviyo, שולח מייל שבועי לגיא. **אין לו שום יכולת לענות על שאלה של לקוח** — אין ערוץ קלט כלל.
- **`corp/core/inbox.js`** (נבנה ב-Module 1, 03/07/2026) — כבר קורא את שתי תיבות המייל (עסקי + אישי) דרך IMAP, read-only. **חשוב — נבדק בקוד בפועל:** היום הוא שולף אך ורק envelope (from/subject/date), **לא את גוף ההודעה**, ומתעד זאת במפורש: "Email content read here is DATA ONLY... never passed to an LLM." זה אומר שלא ניתן "לעשות reuse" ישיר — צריך פונקציה **חדשה** (`fetchMessageBody(uid)`, ר' רכיב 4) שנקראת רק כש-`RAG_SUPPORT_ACTIVE=true`, ומעדכנת את התיעוד הקיים בקובץ כדי לא לסתור את עצמו.
- **`corp/core/hitl.js`** + טבלת `pending_approvals` — מערכת אישור-אנושי קיימת ומוכחת (Phase B, מ-27/06/2026): agent כותב פעולה מוצעת, גיא מאשר/דוחה דרך GitHub Actions, לעולם לא מבוצע אוטומטית. `self-heal.js` כבר משתמש בה לכרטיסי תשתית.
- **תשתית pgvector** — כבר בהחלטת ה-tech-stack הנעולה (CLAUDE.md: "Supabase + pgvector"), עדיין לא בשימוש בפועל.

## ארכיטקטורה

שלושה רכיבים חדשים + חיווט אחד לתוך A16, בלי workflow חדש (רץ בתוך ה-cron היומי הקיים של A16):

```
┌─────────────────────┐
│ Shopify Pages API    │──┐
│ (FAQ/מדיניות/Size Guide) │  │
├─────────────────────┤  │    ┌──────────────────────┐      ┌─────────────────────┐
│ docs/strategy/        │──┼──▶│ corp/core/rag-ingest.js│─────▶│ knowledge_chunks     │
│ BRAND_DNA.md          │  │    │ (סקריפט חד-פעמי/ידני) │      │ (Supabase, pgvector) │
├─────────────────────┤  │    └──────────────────────┘      └──────────┬──────────┘
│ Supabase products    │──┘                                            │
└─────────────────────┘                                                │
                                                                        ▼
┌──────────────────────┐      ┌───────────────────────┐      ┌─────────────────┐
│ corp/core/inbox.js     │─────▶│ A16: draftSupportReply()│◀─────│corp/core/rag-query.js│
│ (מיילי לקוחות, קיים) │      │ (חדש, בתוך main() הקיים) │      │ (חדש)             │
└──────────────────────┘      └───────────┬───────────┘      └─────────────────┘
                                           ▼
                              ┌───────────────────────┐
                              │ pending_approvals (קיים) │──▶ גיא מאשר/דוחה
                              │ דרך hitl.js הקיים        │    (לעולם לא נשלח אוטומטית)
                              └───────────────────────┘
```

## רכיב 1 — טבלת `knowledge_chunks`

SQL חדש (`corp/core/knowledge_chunks.sql`), תואם את מוסכמות כל טבלה קיימת בפרויקט:

```sql
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text NOT NULL,           -- 'faq_page' | 'brand_dna' | 'product:<shopify_id>' | 'policy:<handle>'
  title       text,
  content     text NOT NULL,           -- הטקסט המקורי של ה-chunk
  embedding   vector(1536) NOT NULL,   -- OpenAI text-embedding-3-small
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
-- RLS: service_role בלבד, כמו כל טבלה אחרת בפרויקט (DO block עם exception handler, לא CREATE POLICY IF NOT EXISTS)
```

+ פונקציית Postgres `match_knowledge_chunks(query_embedding vector(1536), match_count int)` — תבנית pgvector/Supabase סטנדרטית להשוואת קוסינוס (`<=>` operator), מחזירה top-k לפי דמיון.

## רכיב 2 — `corp/core/rag-ingest.js`

סקריפט **חד-פעמי/על-פי-דרישה** — לא workflow מתוזמן (התוכן משתנה לעיתים רחוקות). מריצים ידנית: `node corp/core/rag-ingest.js`.

**מקורות התוכן (starter corpus):**
1. עמודי Shopify (FAQ, Size Guide, מדיניות משפטיות) — דרך Shopify Pages API, אותו API שכבר A2/A3/A9 משתמשים בו. מקור-אמת חי, לא קובץ מקומי שעלול להתיישן.
2. `docs/strategy/BRAND_DNA.md` — נקרא ישירות מהדיסק.
3. טבלת `products` ב-Supabase — שם, קטגוריה, חומרים, מחיר, תיאור — לשאלות ספציפיות על מוצרים.

**Chunking:** לפי גבולות סמנטיים (h2/h3 בעמודי HTML; פסקאות ב-BRAND_DNA.md; שורה אחת פר מוצר). אין overlap מורכב בשלב הזה — היקף התוכן קטן מספיק שלא נדרש.

**Embedding:** OpenAI `text-embedding-3-small` (זול, איכות מספקת לגודל הקורפוס הזה) דרך `OPENAI_API_KEY` הקיים.

## רכיב 3 — `corp/core/rag-query.js`

`async function queryKnowledge(supabase, question, topK = 5)` — מקבל שאלה, מייצר embedding, קורא ל-`match_knowledge_chunks`, מחזיר את ה-chunks הכי רלוונטיים + המקור שלהם (לצורך שקיפות/ציטוט).

## רכיב 4 — חיווט ל-A16 (`draftSupportReply`)

פונקציה חדשה בתוך `agents/A16_cx/agent.js`, רצה כשלב נוסף בתוך ה-`main()` הקיים (אותו cron יומי, 22:00 UTC — אין workflow חדש). **דורש תוספת קטנה ל-`inbox.js`** (לא רק שימוש בקיים — ר' הבהרה למעלה): פונקציה חדשה `fetchMessageBody(uid)` שמביאה את גוף ההודעה (לא רק envelope), עם קומנט מעודכן בקובץ שמסביר שהצריכה החדשה הזו קיימת **רק** תחת `RAG_SUPPORT_ACTIVE=true` — התנהגות ברירת המחדל (בריף A0 היומי) נשארת בדיוק כמו שהיא, subject-בלבד, אפס חשיפה ל-LLM.

1. קוראת מיילים חדשים מהתיבה העסקית — subjects דרך `getInboxSummary()` הקיים, ואז body מלא רק להודעות רלוונטיות דרך `fetchMessageBody()` החדשה.
2. לכל מייל שנראה כמו שאלת לקוח (לא ספק/CI/spam — היגיון סינון פשוט על subject/from, לא AI, כדי לא לבזבז קריאת AI על מיילים שלא רלוונטיים): קוראת ל-`queryKnowledge()` לאיתור הקשר רלוונטי.
3. שולחת ל-Claude (`claude-sonnet-4-6`, לפי חוק ברזל 6) פרומפט נוקשה: **"ענה אך ורק מהמידע המצורף. אם התשובה לא נמצאת בו — אמור זאת בבירור, אל תמציא."** (הגנת הזיות/hallucination guard).
4. כותבת draft (לא שולחת!) — דרך `requestApproval()` הקיים ב-`corp/core/hitl.js`, עם `action_type: 'rag_support_draft_reply'` ו-payload שכולל את השאלה המקורית, הטיוטה, והמקורות שצוטטו.
5. גיא מאשר/דוחה דרך אותו מנגנון GitHub Actions קיים (`hitl-approve.yml`) — **לעולם לא נשלח אוטומטית.**

## שער הפעלה — דגל ייעודי

`RAG_SUPPORT_ACTIVE` (דגל חדש, בתבנית זהה ל-`CLOUDFLARE_ACTIVE` של A18) — **נפרד** מ-`LAUNCH_MODE` הקיים של A16, כדי שגיא יוכל להפעיל דיווח A16 רגיל בלי להפעיל אוטומטית גם את יכולת ה-RAG (שקוראת מייל + קוראת ל-2 מודלי AI בתשלום). ברירת מחדל: `false`.

## אבטחה (Iron Law S3 — Prompt Injection)

תוכן מייל לקוח = **data בלבד**, לעולם לא הוראות. אותו עיקרון שכבר חל על A10/A11/A12/A13 (כל agent שסורק תוכן חיצוני). הפרומפט ל-Claude כולל הנחיה מפורשת שהמייל הוא ציטוט לניתוח, לא פקודה.

## בדיקה (Verification)

1. `rag-ingest.js` ו-`rag-query.js` ניתנים לבדיקה **עצמאית** ב-CLI עם שאלות לדוגמה — לפני שנוגעים ב-A16 בכלל.
2. חיווט A16 נבדק ב-`DRY_RUN=true` בדיוק כמו כל agent אחר בצי — מדלג על כתיבת `pending_approvals` אמיתית, רק מדפיס כוונה.
3. `node -c` syntax check + הרצה מלאה (לא רק require-resolution) לפני push, לפי הפרוטוקול הקיים (Pre-Deploy Gate #4).
4. security sweep על ה-diff לפני commit, כרגיל.

## מה לא בונים עכשיו (מפורש, YAGNI)

- ❌ ערוץ שליחה אוטומטי ללקוח — תמיד HITL, לעולם לא ישיר.
- ❌ workflow מתוזמן נפרד ל-ingest — corpus משתנה לעיתים רחוקות, סקריפט ידני מספיק.
- ❌ ממשק UI לניהול הקורפוס — עתידי, אחרי שיש נפח תמיכה אמיתי.
- ❌ חיבור ל-A9/A3 (שהוזכר כאופציונלי בתוכנית המקורית) — נשאר מחוץ להיקף השיחה הזו, ניתן להוסיף בעתיד באותה תבנית בדיוק.
