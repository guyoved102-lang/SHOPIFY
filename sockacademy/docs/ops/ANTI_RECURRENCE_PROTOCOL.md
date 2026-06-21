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

## 13. CI אדום שנתגלה רק בפתיחת שיחה הבאה

**מה קרה:** workflow נכשל בין שיחות — לא ידענו עד הפגישה הבאה.
**פרוטוקול:**
- `/boot-sockacademy` v3: מריץ `gh run list --limit 5` בכל פתיחה
- אם יש failure → מדווח לגיא לפני כל עבודה
- גיא מחליט אם לתקן קודם או להמשיך

---

## 14. אובדן החלטות ארכיטקטוריות שנעשו תוך כדי שיחה

**מה קרה:** החלטות גדולות (כמו מעבר ל-6 Super-Agents) נעשו תוך כדי שיחה ולא נשמרו ב-memory מיד — נשארו רק ב-context.
**פרוטוקול:**
- מילות מפתח: "נחליט ש...", "מעכשיו...", "שינינו את...", "ארכיטקטורה חדשה" → שמירה ל-memory מיד
- לא לחכות ל-`סיום שיחה` להחלטות ארכיטקטוריות

---

## 15. גיא מאשר שמשהו עבד — לא מתועד עד סוף שיחה

**מה קרה:** גיא אומר "הרצתי, עבד" — Claude לא מסמן ✅ ב-memory עד `סיום שיחה`. אם השיחה נקטעת — התקדמות אובדת.
**פרוטוקול:**
- מילות מפתח: "הרצתי ועבד", "PROVEN", "עבד", "אישרתי", "הוספתי Secret", "SQL בוצע"
- עדכון memory מיד — לא בסוף שיחה

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

## 16. Lint/CI שנכשל על קבצים לגיטימיים (False Positives)

**מה קרה (20/06/2026):** Structure Lint נכשל ב-CI עם 24 violations — כולם false positives:
- Shopify theme files (assets, sections, config...) נדחו כ-"SA_ROOT_CONTAMINATION"
- Claude infrastructure (.claude, .agents) נדחו כ-"ROOT_CONTAMINATION"
- `.env` נדחה למרות שהוא gitignored — הlint סרק filesystem במקום `git ls-files`

**סיבה:** הlint נכתב רק עם הכלל אבל בלי לדעת את כל הקבצים הלגיטימיים שכבר קיימים.

**פרוטוקול:**
- Rules 4+5 (`.env`, `node_modules`): תמיד `git ls-files` — לא filesystem walk
- ALLOWED lists: חייבות לכלול את כל הקבצים הלגיטימיים שכבר קיימים בrepo
- לפני כל שינוי בlint: להריץ מקומית ולוודא 0 violations על main

**בדיקה בסגירת שיחה:** `node sockacademy/scripts/ci/structure-lint.js` חייב לצאת exit 0 לפני push.

---

## 17. CI אדום = חסימה — לא סוגרים שיחה לפני CI ירוק

**מה קרה (20/06/2026):** push הצליח → שיחה "נסגרה" → CI נכשל → הבעיה התגלתה רק בשיחה הבאה.
**פרוטוקול:**
- `gh run list --limit 3` חובה אחרי כל push — לחכות לסיום הrun
- CI אדום = תיקון מיידי לפני סגירה. ללא יוצא מן הכלל.
- Boot Dashboard v3 מציג CI status בפתיחה — safety net אם משהו נסגר בטעות עם CI אדום

---

## 18. שגיאות לא מתועדות = שגיאות שחוזרות

**עיקרון:** כל bug שנמצא ומתוקן בשיחה → פרוטוקול חדש ב-ANTI_RECURRENCE מיד.
**טריגר mid-session:** ראה CLAUDE.md → "טריגר 6 — שגיאה תוקנה"
**מטרה:** כל שגיאה הופכת לחיסון נגד עצמה. המערכת לומדת בזמן אמת.

---

## 19. Node.js Version Mismatch — Supabase Realtime WebSocket נכשל

**מה קרה (21/06/2026):** A8 נכשל עם `Fatal: Node.js 20 detected without native WebSocket support`. כל שאר ה-agents השתמשו ב-Node 24, אבל A8 נשאר על 20 מהיצירה.
**סיבה:** Supabase `@supabase/supabase-js` Realtime client דורש WebSocket native (זמין מ-Node 22+). ב-Node 20 — fatal error מיד.
**פרוטוקול:**
- **כל** GitHub Actions YAML: `node-version: '24'` — ללא יוצא מן הכלל
- לפני כל push של agent חדש: `grep -r "node-version" .github/workflows/` — לוודא שאין 20 או 18
- אם agent ישן קיים עם Node < 22: תקן לפני שממשיכים

**בדיקה:** `grep -r "node-version" .github/workflows/ | grep -v "24"` — חייב להחזיר ריק.

---

## 20. CREATE TABLE IF NOT EXISTS לא מספיק כשSchema השתנה

**מה קרה (21/06/2026):** agent_health_log.sql כלל `CREATE TABLE IF NOT EXISTS`. A8 כבר ניסה ליצור טבלה בשם זה (עם columns שונים) — הSQL שרד בשקט, אבל index על `agent_id` נכשל כי הטבלה הישנה לא כללה את העמודה.
**שגיאה:** `ERROR: 42703: column "agent_id" does not exist` בעת יצירת index — אחרי שה-CREATE TABLE "הצליח".
**פרוטוקול:**
- כשמריצים SQL שייתכן שהטבלה כבר קיימת: **תמיד** להריץ `DROP TABLE IF EXISTS <name>;` ראשון
- לתעד בSQL file עצמו: "אם נכשל — הרץ DROP TABLE IF EXISTS קודם"
- לעולם לא להניח ש-`IF NOT EXISTS` = idempotent כאשר schema השתנה

**תבנית בטוחה לSQL files:**
```sql
-- אם הטבלה קיימת עם schema ישן — הרץ קודם: DROP TABLE IF EXISTS <name>;
CREATE TABLE IF NOT EXISTS <name> ( ... );
```

---

## SESSION CONTINUITY CHECKLIST — בכל שיחה

**פתיחה:**
- [ ] `/boot-sockacademy` → Boot Dashboard v3 (CI status + git status + PENDING)
- [ ] CI ירוק על main לפני התחלה — אם אדום: לתקן קודם

**בתוך שיחה:**
- [ ] כל milestone → PARANOIA MODE
- [ ] כל קובץ חדש → 3 שאלות FILE CREATION PROTOCOL
- [ ] כל commit → security sweep (git diff --cached)
- [ ] גיא אומר "עבד/הוספתי/בוצע" → ✅ ב-memory מיד
- [ ] שגיאה תוקנה → פרוטוקול חדש ב-ANTI_RECURRENCE מיד

**סגירה (לפי הסדר):**
- [ ] 1. QA Sweep — syntax + credentials + SMTP + placeholders
- [ ] 2. Lesson Capture — שגיאות שתוקנו → פרוטוקולים חדשים
- [ ] 3. Memory update — PENDING מעודכן + "next session primer"
- [ ] 4. git commit + push
- [ ] 5. CI Verification — `gh run list --limit 3` — לחכות לירוק. אסור לסגור עם CI אדום.
- [ ] 6. Self-Critique — מה יכולתי לתפוס מוקדם יותר?
- [ ] 7. דוח סיום — commits + שגיאות שנלמדו + מה ממתין לגיא + מה הבא
