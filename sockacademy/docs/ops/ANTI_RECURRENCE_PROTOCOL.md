# ANTI-RECURRENCE PROTOCOL — SockAcademy
# נוצר: 20/06/2026 | מעודכן: 20/06/2026
# מטרה: כל בעיה שהייתה — לא תחזור. כל פרוטוקול נגזר מבעיה אמיתית.

---

## 1. אובדן הקשר בין שיחות

**מה קרה:** שיחות החלו מאפס — Claude לא ידע מה הושלם, מה ממתין, מה הוחלט.
**פרוטוקול:**
- `/boot-sockacademy` בתחילת כל שיחה — טוען CLAUDE.md + memory + פרופיל גיא
- `סיום שיחה` בסוף כל שיחה — מעדכן `memory/project_sockacademy_state.md` לפני git push
- Boot Dashboard מציג בדיוק איפה עצרנו, מה ממתין לגיא, מה הבא לבנות

**בדיקה:** אם ב-boot הדוח ריק או לא מציג PENDING — לעצור ולקרוא את הmemory ידנית.

---

## 2. קבצים נוחתים במקום הלא נכון (Root Contamination)

**מה קרה:** קבצים נוצרו ב-root של הרפו או ב-sockacademy/ במקום בתיקיות canonical.
**פרוטוקול — 3 שאלות חובה לפני כל Write:**
1. לאיזה canonical dir שייך הקובץ? (טבלה ב-CLAUDE.md)
2. האם אני מזהם root? (בדוק כלל ROOT_CONTAMINATION)
3. האם CI יתפוס אותי אם טעיתי? (structure-lint.yml, ~15 שניות)

**CI Enforcement:** `structure-lint.yml` רץ על כל push, מכשיל ב-15 שניות.
**A0 Enforcement:** בדיקת workspace בכל ריצה יומית, email alert אם יש violation.

---

## 3. Credentials חשופות / Hardcoded

**מה קרה:** Meta App Secret נחשף בצ'אט (20/06/2026) — רוטייט מיד.
**פרוטוקול:**
- אפס credentials בקוד — הכל דרך `process.env` + GitHub Secrets
- אפס הדפסת secrets בצ'אט — גם partial, גם masked
- Security sweep לפני כל commit: `git diff --cached` — לוודא אפס .env חשוף
- אם secret נחשף: רוטייט מיד, commit חדש, לא להמתין

**בדיקה אוטומטית ב-סיום שיחה:** סריקת כל קבצים שנגענו בהם בשיחה.

---

## 4. CI נכשל ב-11 שניות (Setup Failures)

**מה קרה:** `actions/setup-node` הוריד Node מיותר — 60 שניות לכישלון. `package-lock.json` חסר ב-git.
**פרוטוקול — Pre-Deploy Gate (4 בדיקות לפני כל push של agent):**
1. `git ls-files <agent>/package-lock.json` — חייב להחזיר תוצאה
2. `gh secret list` — כל Secrets שב-YAML חייבים להיות ברשימה
3. `cache-dependency-path` מצביע לנתיב שקיים בpre
4. `DRY_RUN=true node agent.js` עבר מקומית

**כלל:** CI שנכשל תוך 11 שניות = תמיד setup failure, לא קוד.

---

## 5. Google Sheets כ-Production Database

**מה קרה:** A2 השתמש ב-Google Sheets — rate limits, אין transactions, אין real-time, לא scalable.
**פרוטוקול:**
- **Supabase בלבד** לכל data production: products, trends, competitor_prices, competitor_intel, agent_health_log
- Google Sheets נשאר **ל-human review בלבד** (גיא מסמן Approved)
- כל agent חדש → Supabase מהיום הראשון, לא Sheets

**migration_map:** ראה `pipeline-config.json` → `data_layer.supabase_migrated`

---

## 6. קוד כפול בין Agents (DRY Violations)

**מה קרה:** אותה לוגיקת nodemailer, אותה auth CJ, אותן פונקציות utility — הועתקו בין agents.
**פרוטוקול:**
- לוגיקה שחוזרת ב-2+ agents → **מוציאים ל-`sockacademy/corp/core/`**
- Shared modules קיימים: `observability.js`, `queue.js`
- לפני כתיבת util חדש: לבדוק אם כבר קיים ב-`corp/core/`

---

## 7. SMTP — שולח מייל שגוי

**מה קרה:** A11 ו-A13 שלחו מ-`guyoved102@gmail.com` במקום `sockacademy.store@gmail.com`.
**פרוטוקול:**
- SMTP sender תמיד: `sockacademy.store@gmail.com`
- `auth.user` = `sockacademy.store@gmail.com` בכל nodemailer config
- לעולם לא: `guyoved102@gmail.com` ו-`guyoved100@gmail.com` בkוד

**בדיקה ב-סיום שיחה:** grep על כל nodemailer config שנגענו בו.

---

## 8. Token Expiry — Meta Access Token פג תוקף

**מה קרה:** Meta tokens פגי תוקף אחרי 60 יום — A4 ו-A5 הפסיקו לעבוד בשקט.
**פרוטוקול:**
- A17 Token Refresher: cron כל 1 לחודש זוגי, 08:00 UTC — מחדש אוטומטית
- אם A4/A5 נכשלים: תמיד לבדוק META_ACCESS_TOKEN תחילה
- Workflow: `.github/workflows/a17-token-refresher.yml`

---

## 9. אין Observability — אי-אפשר לדעת מה agent עשה

**מה קרה:** agents רצו ב-GitHub Actions ולא ידענו מה קרה — אין traces, אין spans.
**פרוטוקול:**
- LangFuse: כל LLM call עוטף ב-`traceLLM()` מ-`corp/core/observability.js`
- Graceful no-op כשLANGFUSE_SECRET_KEY חסר — לא חוסם production
- כל agent חדש: מוסיף `startTrace` + `endTrace`

---

## 10. אין Event-Driven Architecture — agents לא מתקשרים

**מה קרה:** agents עבדו בסדרה נוקשה, לא יכלו לתקשר async — A1 לא יכול להודיע ל-A2.
**פרוטוקול:**
- Upstash Redis queues: `corp/core/queue.js` — 5 queues מוגדרות
- כל שינוי status משמעותי → push לqueue המתאים
- Shopify events → Make.com → GitHub `repository_dispatch` → handler

---

## 11. Human-in-the-Loop ללא מנגנון רשמי

**מה קרה:** A2 הצטרך אישור גיא אבל לא הייתה דרך רשמית לתת אותו — process לא ברור.
**פרוטוקול:**
- `pending_approvals` table ב-Supabase — כל דבר שדורש אישור נכנס לשם
- `hitl.js` + `hitl-execute.js` + `hitl-approve.yml` — workflow רשמי
- Phase B: pre-launch blocker — שום deploy חי לפני שHITL מוכח

---

## 12. Placeholder Code בProduction

**מה קרה:** `// TODO`, mock data, ו-`// coming soon` נמצאו בagents שהיו אמורים לעבוד.
**פרוטוקול:**
- Iron Law 3: **אפס placeholders** בקוד production
- DRY_RUN=true מחליף mock data — לא `// TODO implement`
- ב-PARANOIA MODE: scan על כל `TODO|FIXME|coming soon|mock` בקבצים שנגענו בהם

---

## PARANOIA MODE — Auto Self-Audit בסיום כל Milestone

**מופעל אוטומטית — ללא צורך שגיא יבקש:**

```
□ Cross-reference: כל מה שהובטח נכתב בקוד?
□ Iron Laws: אפס credentials? אפס placeholders? DRY?
□ SMTP: sender = sockacademy.store@gmail.com?
□ Secrets: כל process.env vars מוגדרים ב-GitHub Secrets?
□ package-lock.json: מחויב ב-git?
□ structure-lint: לא מזהם root?
□ Memory: project_sockacademy_state.md מעודכן?
```

---

## SESSION CONTINUITY CHECKLIST — בכל שיחה

**פתיחה:**
- [ ] `/boot-sockacademy` → Boot Dashboard מציג PENDING
- [ ] CI ירוק על main לפני התחלה

**בתוך שיחה:**
- [ ] כל milestone → PARANOIA MODE
- [ ] כל קובץ חדש → 3 שאלות FILE CREATION PROTOCOL
- [ ] כל commit → security sweep

**סגירה:**
- [ ] `memory/project_sockacademy_state.md` עדכני
- [ ] git commit + push
- [ ] דוח סיום: מה הושלם / מה ממתין / מה הבא
