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

## 21. PowerShell Heredoc — תחביר שגוי גורם לכישלון git commit

**מה קרה (22/06/2026):** ניסיון להריץ `git commit -m "$(cat <<'EOF')"` ב-PowerShell — גרם לשגיאה "Missing file specification after redirection operator." כי PowerShell לא תומך בbash heredoc syntax.
**פרוטוקול:**
- ב-**PowerShell**: השתמש ב-`@'...'@` (single-quoted here-string). הסוגר `'@` חייב להיות בעמודה 0, ללא רווחים לפניו.
- ב-**Bash tool**: השתמש ב-`$(cat <<'EOF')` — עובד רק בbash.
- לפני כל git commit — שאל: האם אני ב-PowerShell או Bash? תחביר שונה לחלוטין.

**תבנית PowerShell נכונה:**
```powershell
git commit -m @'
commit message here.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

**בדיקה:** אם `git commit` נכשל עם "redirection operator" — זה תחביר bash בPowerShell. עבור לתבנית `@'...'@`.

---

## 22. CREATE POLICY IF NOT EXISTS לא קיים ב-PostgreSQL

**מה קרה (22/06/2026):** SQL files כללו `CREATE POLICY IF NOT EXISTS` — PostgreSQL החזיר `syntax error at or near "not"`. ה-syntax הזה פשוט לא קיים בשפה.
**סיבה:** `IF NOT EXISTS` תקף ל-TABLE, INDEX, SEQUENCE — לא ל-POLICY.
**פרוטוקול:**
- לעולם לא לכתוב `CREATE POLICY IF NOT EXISTS`
- תמיד להשתמש ב-DO block עם exception handler:
```sql
do $$ begin
  create policy "service role full access" on <table> for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;
```
- `when duplicate_object then null` = idempotent — רץ שוב בלי לפוצץ

**בדיקה לפני הרצת SQL:** grep על הקובץ לפני הרצה: `grep -i "create policy if" <file>.sql` — חייב לחזור ריק.

---

## 23. DB Schema Drift — SQL file ≠ DB אמיתי

**מה קרה (22/06/2026):** products_table.sql כלל `name`, `orders_count`, `materials text[]` — אבל ה-DB האמיתי כלל `product_name`, `orders`, `materials text`. A1 נכשל עם `column "name" does not exist`.
**סיבה:** SQL file לא עודכן כשה-DB שונה ידנית בעבר.
**פרוטוקול:**
- Source of truth = DB אמיתי. לפני כל agent שכותב לטבלה: `SELECT column_name FROM information_schema.columns WHERE table_name='<table>';`
- כשיש divergence — לעדכן ה-SQL file להתאים ל-DB (לא להיפך)
- trigger stale: אם DB מדווח על trigger שמתייחס לcolumn שלא קיים — `DROP TRIGGER IF EXISTS <name> ON <table>;`

**תבנית verification:**
```sql
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='products' order by ordinal_position;
```

---

## 24. Runtime State Files Committed to Git

**מה קרה (25/06/2026):** A7/state.json (mock supplier data) נמצא tracked ב-git. קבצי runtime/mock state שהיו אמורים להיות local-only הגיעו ל-repo.
**סיבה:** בניית agent חדש → `git add .` ללא בדיקה → state file נכנס ל-tracking.
**פרוטוקול:**
- לפני `git add` של agent חדש: `git status --short` ולבדוק כל קובץ ידנית
- state files, last_run.json, mock data, cache files — תמיד ל-.gitignore לפני commit ראשון
- תבנית .gitignore לכל agent חדש:
```
sockacademy/agents/A<N>_*/state.json
sockacademy/agents/A<N>_*/last_run.json
sockacademy/agents/A<N>_*/*.cache
```
- אם כבר נכנס ל-tracking: `git rm --cached <file>` + הוספה ל-.gitignore

**בדיקה:** `git ls-files sockacademy/agents/ | grep -E "(state\.json|last_run|\.cache)"` — חייב לחזור ריק.

**Recurrence (01/07/2026):** `structure-violations.json` בroot — CI artifact שנכתב ע"י `structure-lint.js` בכישלון (הקוד עצמו אומר "written by this script on failure") — נמצא tracked ב-git עם תוכן מיושן מ-23/06. אותה קטגוריה בדיוק: קובץ שנוצר בזמן ריצה (הפעם CI, לא agent) הגיע ל-tracking. תוקן: `git rm --cached` + נוסף ל-`.gitignore`. **לקח מורחב:** הכלל לא רק ל-agent state files — כל קובץ שקוד אומר על עצמו "נכתב אוטומטית" חייב .gitignore, ללא קשר אם זה agent runtime או CI script output.

---

## 25. Agent Cluster Built — CLUSTERS Map לא עודכן

**מה קרה (25/06/2026):** SA-7 C-Suite (A14/A15/A16) ו-SA-8 Supply Chain (A19/A20/A22/A23) נבנו ו-committed — אבל לא נוספו ל-CLUSTERS map בcorp/core/orchestration/index.js. A0 לא יכל לזהות אם agents אלו נכשלים שקטה.
**סיבה:** בניית cluster חדש = שני שלבים (קוד + orchestration) — השני נשכח.
**פרוטוקול:**
- כל בניית SA cluster חדש כולל שני commits חובה:
  1. `feat(SA-X): agent code + YAML`
  2. `feat(orchestration): add SA-X to CLUSTERS + STALENESS_HOURS`
- לא לסגור שיחת בניית cluster לפני שstep 2 בוצע

---

## 26. Supabase GRANT חסר — service_role מקבל "permission denied"

**מה קרה (25/06/2026):** טבלות `affiliates` ו-`affiliate_performance` נוצרו ב-SQL editor — אבל DRY_RUN test נכשל עם `permission denied for table affiliates`. `SUPABASE_SERVICE_KEY` (service_role) לא קיבל GRANT אוטומטי.
**סיבה:** ב-Supabase, `ALTER DEFAULT PRIVILEGES` לא תמיד מכסה טבלאות שנוצרות ב-SQL editor. service_role צריך GRANT מפורש.
**פרוטוקול:**
- **כל SQL file של agent חדש** חייב לכלול בסוף:
```sql
GRANT ALL ON TABLE <table_name> TO service_role, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE <table_name>_id_seq TO service_role, anon, authenticated;
```
- לכלול את ה-GRANTs בקובץ `.sql` עצמו — לא כ-step נפרד
- אם agent קורא מ-Supabase (READ) — GRANT חייב להיות **לפני** DRY_RUN test

**בדיקה:** אחרי הרצת SQL ב-Supabase — מריצים `DRY_RUN=true node agent.js`. אם "permission denied" → הרץ GRANT ידנית ועדכן את ה-.sql file.
- STALENESS_HOURS: agents שרצים יומי = 36h | שבועי = 200h | חד-פעמי/bimonthly = null

**בדיקה:** `grep -c "SA-" sockacademy/corp/core/orchestration/index.js` — מספר הclusters צריך להתאים למספר Super-Agents שנבנו.

---

## 27. Agent Dormant ללא LAUNCH_MODE Gate — שריפת קרדיטים לפני Launch

**מה קרה (26/06/2026):** A14/A18/A19/A20/A21/A22/A23 נבנו כ-"dormant" אבל ללא gate אמיתי — `DRY_RUN=false` עצר רק כתיבה לDB, אבל Anthropic + Perplexity API calls רצו בכל cron. אחרי Anthropic outage התגלה שכולם שרפו קרדיטים ללא ערך.

**סיבה:** DRY_RUN ≠ dormancy. DRY_RUN מונע Supabase writes. LAUNCH_MODE מונע כל API call.

**פרוטוקול:**
- כל agent שנבנה אך לא מופעל עד Launch → חייב 4 שורות בתחילת `main()`:
```javascript
if (process.env.LAUNCH_MODE !== 'true') {
  console.log('[AXX] DORMANT — set LAUNCH_MODE=true to activate. No API calls made.');
  process.exit(0);
}
```
- YAML מקביל → `LAUNCH_MODE: 'false'` בסעיף `env:`
- **DRY_RUN** = מצב בדיקה (API calls כן, DB writes לא)
- **LAUNCH_MODE=false** = dormancy מוחלטת (אפס API calls)

**LAUNCH ACTIVATION PROTOCOL — חוק ממשל:**
שינוי `LAUNCH_MODE: 'false'` → `'true'` מחייב אישור גיא + CTO **באותה שיחה**. אין חריגות. אין הפעלה אוטומטית.

**בדיקה לפני כל push של agent dormant חדש:**
```bash
grep -c "LAUNCH_MODE" sockacademy/agents/A<N>_*/agent.js   # חייב לחזור ≥1
grep "LAUNCH_MODE" .github/workflows/a<N>-*.yml            # חייב לחזור 'false'
```

---

## 28. CSS Reveal Animation ללא JavaScript Trigger — אלמנט בלתי נראה לנצח

**מה קרה (30/06/2026):** `academy-material-insight` קיבל `opacity: 0` + `.is-visible` CSS class למנגנון reveal, אבל אף פעם לא נכתב IntersectionObserver שמוסיף את הclass. התוצאה: המידע המרכזי ביותר בעמוד המוצר היה בלתי נראה לחלוטין לכל גולש.
**למה קרה:** CSS animation pattern הוסף ב-sockacademy.css, אבל ה-JavaScript trigger ב-main-product.liquid נשכח. שני הקבצים עודכנו בשיחות שונות.
**מה מונע חזרה:** כל פעם שמוסיפים `opacity: 0` + `transition` לאלמנט — חובה לבדוק מיד שיש trigger מתאים:
- IntersectionObserver ב-JS, **או**
- class שמתווסף ב-setTimeout, **או**
- `.is-active` שנשלט מ-JS
```bash
# בדיקה: מצא כל opacity:0 ב-CSS ואמת שיש trigger מתאים
grep -r "opacity: 0" sockacademy/assets/ sockacademy/sections/ sockacademy/snippets/
```

---

## 29. Shopify Product 404 — שני סיבות נפרדות: Non-ASCII Handle + publishedAt null

**מה קרה (30/06/2026):** מוצר נגיש ב-admin אבל 404 ב-storefront. שתי בעיות נפרדות שנראו כאחת:
1. Handle עם תו μ (Greek mu, U+03BC) — Shopify router ו-browser URL encoding לא מסכימים
2. `publishedAt: null` — המוצר היה `status: ACTIVE` (לא draft) אבל **אף פעם לא פורסם לOnline Store channel**. אלה שני states שונים לחלוטין ב-Shopify.
**למה קרה:**
1. Handle נוצר ב-admin עם copy-paste מטקסט עם תו Unicode
2. המוצר נוצר דרך API בלי `published: true` — Shopify API יוצר ACTIVE (לא draft) אבל לא published
**מה מונע חזרה:**
- כל handle חדש — ASCII בלבד. בדיקה: `handle.match(/[^\x00-\x7F]/)` → reject אם true
- אחרי יצירת מוצר דרך API — תמיד לאמת `publishedAt != null`:
```bash
# GraphQL check
{ product(id: "gid://shopify/Product/XXX") { publishedAt status } }
# Fix if null:
curl -X PUT .../products/XXX.json -d '{"product":{"id":XXX,"published":true}}'
```

---

## 30. docs/ Subdirectory Whitelist — content/ נדחה ע"י Structure Lint

**מה קרה (01/07/2026):** נוצרה תיקייה `sockacademy/docs/content/` עבור MG-1 outline + draft. Structure Lint נכשל: `docs/ only allows strategy/, ops/, and superpowers/ subdirectories. Got: content`.
**סיבה:** File Creation Protocol (שאלה 1) מפרט רק `docs/strategy/` ו-`docs/ops/` כיעדים למסמכים — לא נבדק מול הlint לפני היצירה. הנחתי ש-`docs/content/` הגיוני סמנטית בלי לאמת מול הrules בפועל.
**תיקון:** `git mv` שני הקבצים ל-`docs/strategy/` — עבר CI ירוק תוך run אחד.
**מה מונע חזרה:**
- `docs/` מקבל **רק** 3 תת-תיקיות: `strategy/`, `ops/`, `superpowers/`. תוכן עריכה/פרסום (כמו MG-1, articles, guides) → `docs/strategy/` כברירת מחדל.
- לפני יצירת תת-תיקיה חדשה תחת `docs/`: להריץ מקומית `node sockacademy/scripts/ci/structure-lint.js` על עותק זמני, או לבדוק את allowed list בקובץ הlint עצמו לפני Write.

**בדיקה:** `grep -A3 "docs/ only allows" sockacademy/scripts/ci/structure-lint.js` — מציג את הרשימה המדויקת המותרת.

---

## 31. Strategy Document Drift — מסמך חדש סותר תוכנית "נעולה" קיימת

**מה קרה (01/07/2026):** נוצר `PRIVATE_LABEL_ROADMAP.md` והוכרז "**Locked**: 01/07/2026. Authority: CTO + CEO." עם ההצהרה "no dropshipping, מעבר ל-Private Label **עכשיו**." זה סתר ישירות שני מסמכים בסיסיים שכבר היו קיימים:
- `VISION.md`: *"SockAcademy begins as a curated dropshipping authority... Target: First private label SKU by **Year 2**"*
- `PHASE_ARCHITECTURE_SKELETON.md`: Private Label = **Phase 4**, טריגר **$15,000 MRR × 2 חודשים רצופים** — לא "עכשיו"

בנוסף: `A1_product_research` צומצם אותו יום ל-Merino בלבד, בזמן ש-Phase 1 הקיים (עדיין LIVE) תוכנן כקטלוג רחב עם A2.5 Quality Control Gatekeeper כבר בנוי כשכבת האיכות.

**סיבה:** `/boot-sockacademy` שלב 1 (טעינת זיכרון מוסדי) מעולם לא כלל את `VISION.md` או `PHASE_ARCHITECTURE_SKELETON.md` — רק CLAUDE.md + memory files. מסמכי ה-"constitution" של הפרויקט לא נטענו באף session, כולל זה שיצר את הסתירה. הבעיה לא התגלתה על ידי CI (זו לא הפרה טכנית — שני המסמכים תקינים בפני עצמם), רק גיא תפס אותה ידנית אחרי שעות עבודה על בסיס המסמך השגוי.

**מה מונע חזרה:**
1. `boot-sockacademy` שלב 1 כולל כעת `VISION.md` + `PHASE_ARCHITECTURE_SKELETON.md` כ-constitution-tier — נטענים בכל session, לא רק בעת דיון אסטרטגי
2. CLAUDE.md → "Strategy Document Supersession Check" (בתוך Consultative CTO Protocol) — כל מסמך חדש שמצהיר "Locked" חייב grep + קריאה בפועל של המסמכים הקיימים לפני נעילה
3. מסמך שמחליף מסמך קודם חייב שורת "**Supersedes:** [שם] — [מה השתנה]" בפתיח — אין עוד "Locked" בלי לציין מה זה דורס
4. Phase-numbering collision תועד במפורש: 3 מערכות "Phase N" נפרדות בפרויקט (SA-Cluster / Brand Architecture / Private Label Roadmap) — לעולם לא להניח שהן זהות

**בדיקה:** `grep -rn "Locked\|Authority: CTO" sockacademy/docs/strategy/*.md` — אם יש יותר ממסמך אחד "Locked" באותו נושא (business model / phase sequencing) — עצור ובדוק סתירה לפני שממשיכים.

---

## 32. Logic Duplicated Instead of Shared — A0's structure-lint copy דרבן מהמקור

**מה קרה (02/07/2026):** `A0_orchestrator/agent.js` הכיל `runWorkspaceHealthCheck()` — עותק ידני ("hand-copied") של הכללים מ-`scripts/ci/structure-lint.js`, עם קומנט "Runs the same rules as scripts/ci/structure-lint.js" — אבל בפועל לא רץ אותם קבצים, רק חיקה אותם. כש-`structure-lint.js` עודכן (01/07/2026, `ALLOWED_ROOT_ENTRIES` + `ALLOWED_SA_ROOT` הורחבו ל-`.claude`/`.vscode`/`.env`/`node_modules`/וכו') — העותק של A0 **לא עודכן**. תוצאה: A0 דיווח 14 workspace violations כוזבים בכל ריצה יומית, ומשך את Readiness Score מטה ב-5 נק' (infrastructure: 10/15 במקום 15/15) — בלי שאף אחד שם לב, כי CI (שרץ את הקובץ האמיתי) נשאר ירוק.

**סיבה:** כשנכתב A0, במקום `require('../../scripts/ci/structure-lint.js')` — הועתק הקוד ידנית. שני מקורות אמת לאותו כלל = drift בלתי נמנע ברגע שאחד מהם משתנה.

**מה מונע חזרה:**
1. `structure-lint.js` מייצא כעת `computeViolations()` כפונקציה טהורה (ללא `process.exit`/`console`/כתיבת קובץ), מוגנת ב-`if (require.main === module)` כדי שההתנהגות ב-CI לא תשתנה
2. A0 קורא ל-`computeViolations()` ישירות — מקור אמת יחיד, לא יכול לדרבן שוב
3. **כלל כללי:** אם קוד/כלל נדרש בשני agents/scripts — **תמיד** `require()` את המקור, **לעולם לא** להעתיק-להדביק "בשביל שזה ירוץ עצמאי". זה בדיוק הפרה מס' 6 (DRY) אבל ברמת agent-to-agent, לא רק function-to-function.

**בדיקה:** `grep -rn "Runs the same rules as\|same logic as\|mirrors A" sockacademy/agents/ sockacademy/corp/` — אם יש קומנט שמתאר "אותה לוגיקה כמו X" בלי `require(X)` בפועל — זה candidate לdrift, לבדוק אם אפשר לאחד למקור משותף.

---

## 33. Telegram Alerts שנשלחו באנגלית — הפרת Telegram Hebrew Standard

**מה קרה (02/07/2026):** בבניית ה-Telegram integration הראשונה ל-A0, נכתבו 7 הודעות Telegram באנגלית פשוטה — למרות ש-`telegram_hebrew_standard` memory קיים ומגדיר במפורש: כל הודעת Telegram חייבת עברית מקצועית, פורמט קנוני `<b>[AGENT] — [תאריך]</b>`. ה-commit הראשון (`e8886c1`) נדחף לפני שהmemory נבדק. תוקן ב-commit הבא (`1b48a83`) אחרי שגיא הזכיר את הדרישה.

**סיבה:** "How to apply" ב-memory אומר לבדוק את הדרישה *"לפני חיווט agent ל-sendTelegram"* — הבדיקה לא בוצעה כי זו הייתה הפעם הראשונה שAgent חי (לא A14/A15 הרדומים) חובר בפועל, ולא היה "trigger" מפורש שהזכיר לבדוק את ה-memory.

**מה מונע חזרה:**
1. `heTelegramMsg(agentName, title, body)` ב-`corp/core/telegram.js` הוא כעת ה-**אכיפה בקוד**, לא רק תיעוד — אם agent קורא ל-`notifyTelegram()` עם טקסט חופשי (לא דרך `heTelegramMsg`), זה red flag בקוד review
2. Pre-Deploy Gate (CLAUDE.md, בדיקה 5) מזכיר עכשיו במפורש "בעברית, לפי הפורמט הקנוני"
3. לפני כל `notifyTelegram()` חדש ב-agent: לוודא הקריאה עוברת דרך `heTelegramMsg()` מ-`corp/core/telegram.js`

**בדיקה:** `grep -rn "notifyTelegram(" sockacademy/agents/*/agent.js` — כל תוצאה חייבת לעטוף `heTelegramMsg(` או משתנה שנבנה ממנה. אם יש `notifyTelegram(\`...\`)` עם טקסט אנגלי חופשי — זו הפרה.

---

## 34. A25 — dotenv.config() בלי path — agent קרס בכל הרצה, אף פעם לא רץ בהצלחה

**מה קרה (02–03/07/2026):** בזמן חיווט `writeMetrics()` ל-A25 (Command Center KPIs), הרצה ישירה של `node agent.js` קרסה עם `Error: supabaseUrl is required` — לפני שהוא בכלל הגיע לבדיקת `LAUNCH_MODE`. הסיבה: שורה 2 בקובץ הייתה `require('dotenv').config();` (בלי `{ path: '../../.env' }`) — היחיד מבין 28 הסוכנים בלי ה-path המפורש. dotenv חיפש `.env` בתוך `A25_influencer/` עצמה, לא מצא, ו-`SUPABASE_URL` נשאר undefined. כיוון שיצירת ה-Supabase client קורית ב-**top-level module load** (לא בתוך `main()`), הקריסה קרתה לפני שה-`LAUNCH_MODE` gate אפילו נבדק — כלומר A25 קרס בכל ריצה, כולל בכל cron שאי-פעם רץ עליו מאז שנוצר.

**סיבה:** copy-paste מקובץ אחר (או כתיבה מאפס) בלי להשוות מול התבנית המדויקת שכל שאר ה-agents משתמשים בה. syntax check (`node -c`) לא תופס את זה — זו שגיאת runtime, לא syntax.

**מה מונע חזרה:**
1. לפני שסוכן חדש נחשב "מוכן" — להריץ אותו בפועל פעם אחת (`node agent.js`, אפילו בלי LAUNCH_MODE) ולוודא שהוא **מגיע** ל-log line הרלוונטי (dormant gate / DRY_RUN notice), לא רק ש-`node -c` עובר.
2. `grep -L "config({ path: '../../.env' })" sockacademy/agents/*/agent.js` — כל agent חדש/קיים חייב את השורה הזו במדויק; אם חסר, זו הפרה.

**בדיקה:** `grep -rn "require('dotenv').config()" sockacademy/agents/*/agent.js` — כל שורה בלי `{ path: ... }` היא red flag.

---

## 35. DRY_RUN שכחה במהלך smoke-test — פעולות live אמיתיות בטעות (03/07/2026)

**מה קרה:** בזמן בדיקת require-resolution לכל 18 הסוכנים שחוברו ל-Command Center, הורצו `node agent.js` בלולאה **בלי** `DRY_RUN=true`. רוב הסוכנים מוגני `LAUNCH_MODE` ויצאו בבטחה — אבל 5 שאין להם gate (`A6`, `A8`, `A9`, `A16`, וגם היו עלולים A24/A11/A12/A1/A2/A2.5/A3/A5/A7) **רצו live בפועל**: A6 סנכרן מחדש (idempotent, אותו תוכן) + שלח מייל אישור; A8 שלח דוח GA4 שבועי אמיתי; A9 **פתח בקשת אישור HITL חדשה** לפרסום 4 עמודים משפטיים ושלח מייל "REQUIRES YOUR APPROVAL" — ישירות לתוך תחום שגיא הגדיר כ"לא לגעת, ממתין ל-attorney review". תוקן: השורה ב-Supabase סומנה `status='rejected'` ידנית, גיא עודכן במלואו לפני שהמשכנו.

**סיבה:** ה"סמיכות ביטחון" של agents עם `LAUNCH_MODE` (שרוב הפעם בטוחים) יצרה הרגל להריץ `node agent.js` בלי מחשבה שנייה — ולא כל agent מוגן באותה שכבה. אין no single command שמריץ "את כל הצי בבטחה" עם דגל ברירת מחדל.

**מה מונע חזרה:**
1. **חוק ברזל חדש:** כל הרצה ידנית של agent לבדיקה — `DRY_RUN=true node agent.js`, **תמיד**, בלי יוצא מן הכלל, גם אם ה-agent "כנראה" מוגן ב-LAUNCH_MODE. לבדוק את הדגל *לפני* ההרצה, לא אחריה.
2. לפני בדיקת-מקבץ (loop על כמה agents) — לרשום מראש איזה agents *אין* להם LAUNCH_MODE gate (`grep -L "LAUNCH_MODE" sockacademy/agents/*/agent.js`) ולהתייחס אליהם כ-high-risk.
3. A9 בפרט: אין לו שום מושג DRY_RUN בקוד בכלל (one-shot pre-launch tool) — **לעולם לא להריץ את A9 שוב אלא אם יש כוונה מפורשת לפרסם/לבדוק את ה-HITL flow בפועל**, ורק אחרי שנבדק שאין approval row קיים שעלול "להיתפס" בטעות.

**בדיקה:** `grep -L "DRY_RUN" sockacademy/agents/*/agent.js` — agents שמופיעים ברשימה (כמו A1, A9) הם high-risk לריצה ידנית; יש להתייחס אליהם בזהירות מיוחדת.

---

## 36. עדכון Next Session Primer מחק משימה פתוחה קיימת בלי לשים לב (04/07/2026)

**מה קרה:** תחילת שיחה 04/07 נפתחה עם Primer שקבע "שיחה הבאה מתחילה ב-Module 2 — Multi-Agent QA Loop". גיא הפנה מיד לבקשת ביקורת Fable 5 מקיפה, ולא חזרנו ל-Module 2 באותה שיחה בכלל. בסוף השיחה, כשעודכן ה-Next Session Primer בשביל תוצרי ה-audit (Batch 2 כ"שיחה הבאה"), **Module 2 נמחק לגמרי מה-Primer** — לא הועבר, לא צוין כ-"עדיין פתוח", פשוט הוחלף. גיא עצמו תפס את זה ("אתה זוכר גם את המשימות שהיו לפני השיחה על פייבל?") — לא המערכת.

**סיבה:** עדכון Primer התמקד רק בתוצר החדש (audit + batches) בלי checklist מפורש שמוודא שאין משימה קודמת שנשארה "באמצע" ולא שולבה ברשימה החדשה. "לכתוב Primer חדש" נתפס כ-replace, לא כ-merge.

**מה מונע חזרה:**
1. לפני כתיבת Next Session Primer חדש בסיום שיחה — לקרוא קודם את ה-Primer **הקודם** (מה-boot של אותה שיחה) ולוודא: כל item ברשימה ההיא הושלם, עדיין רלוונטי (ולכן חוזר), או הוחלף במפורש ובכוונה (לא רק "נשכח כי לא הגענו אליו").
2. אם משימה מה-Primer הקודם לא בוצעה בשיחה הנוכחית מכל סיבה (redirect, priority אחר, זמן) — היא **חייבת** להופיע ב-Primer החדש כ-track נפרד, לא להיעלם.
3. כלל כללי: Next Session Primer הוא **תוספת מצטברת (merge)**, לא **קובץ שמחליף** — במיוחד כשיש כמה "tracks" עבודה עצמאיים (למשל: תוכנית build קיימת + audit חדש) שיכולים להתקדם במקביל.

**בדיקה:** בסיום כל שיחה, לפני כתיבת ה-Primer הסופי — לשאול במפורש: "מה היה ה-Primer שקראתי ב-boot של השיחה הזו, והאם כל סעיף בו מטופל ברשימה החדשה שאני כותב עכשיו?"

**עדכון (04/07/2026 — מומש בפועל, לא רק תועד):** גיא ביקש מנגנון טכני, לא רק כלל כתוב — "אסור שזה יקרה, תמצא פתרון". נבנה PreToolUse hook אמיתי (`~/.claude/settings.json` → matcher `Edit|Write`, script `~/.claude/hooks/archive-primer-hook.js`): לפני **כל** עריכה של `project_sockacademy_state.md`, ה-hook קורא את הקובץ כפי שהוא **עכשיו** (לפני העריכה), שולף את סקשן "Next Session Primer" הנוכחי, ומצרף אותו (append, timestamped) ל-`memory/PRIMER_HISTORY.log`. נבדק בפועל (pipe-test + הרצה חיה עם sentinel — ה-hook אכן ירה על Edit/Write אמיתי בשיחה) ועובד. זו רשת ביטחון **בנוסף** לצ'ק-ליסט הפרוצדורלי למעלה, לא תחליף לו — גם אם הצ'ק-ליסט יישכח, שום Primer לא באמת נעלם, רק צריך לבדוק את הלוג.

---

## 37. corp/core CI Install חסר — require ישיר ל-npm package אף פעם לא רץ ב-CI אמיתי (04/07/2026)

**מה קרה:** במהלך חיווט Module 3 (Self-Healing Loop) ל-A3/A5, התגלה ששני ה-workflows מעולם לא כללו שלב "Install corp/core dependencies" — למרות ש-`qa-gate.js` (Module 2, commits `118a931`/`d1a8884`) כבר דורש `@anthropic-ai/sdk` ישירות. כתוצאה מכך, ה-require הזה **מעולם לא רץ בפועל ב-CI אמיתי** — הריצות המוצלחות האחרונות של A3/A5 קדמו לקומיט של Module 2. ה-cron הבא של A5 (יום ראשון, היום שאחרי הגילוי) היה מתרסק עם `MODULE_NOT_FOUND`. אותה תבנית בדיוק חזרה על עצמה בעוד ~9 workflows נוספים (A1, A4, A6, A7, A8, A9, A10, A11, A12, A13) ברגע שגם הם נגעו ב-`corp/core/self-heal.js` (שדורש `@anthropic-ai/sdk` + `hitl.js`'s `@supabase/supabase-js`/`nodemailer`).

**סיבה:** `corp/core/` הוא תיקייה **אחות**, לא אב, של תיקיית ה-agent (`sockacademy/agents/AX_.../`). Node מפענח `require()` יחסית למיקום הקובץ **הקורא**, לא ל-`process.cwd()` — כך ש-`corp/core/qa-gate.js`'s `require('@anthropic-ai/sdk')` תמיד מחפש ב-`corp/core/node_modules`, לא ב-node_modules של ה-agent שקרא לו. כשמפתחים מוסיפים require חדש ל-shared module ב-corp/core, קל לשכוח שכל workflow YAML שמריץ agent שדורש (ישירות או בעקיפין) את אותו קובץ צריך שלב `npm install` **נפרד** בתוך `sockacademy/corp/core/`. בדיקה מקומית לא הייתה תופסת את זה — כי לרוב יש כבר `node_modules` מקומי (לא tracked ב-git) שמסתיר את הבעיה עד ריצת CI אמיתית על checkout נקי.

**מה מונע חזרה:**
1. כל פעם שקובץ ב-`corp/core/` מקבל `require()` חדש לחבילת npm (לא built-in של Node) — לבדוק **את כל** ה-workflows של agents שקוראים לקובץ הזה (ישירות או דרך שרשרת requires) ולוודא ששלב "Install corp/core dependencies" קיים.
2. `grep -L "corp/core" .github/workflows/a*.yml` על agents שבפועל כן דורשים משהו מ-corp/core — אם agent מופיע ברשימה בלי השלב, זו red flag.
3. `git status` אחרי `git clean -fdx` (בזהירות, רק בסביבת בדיקה מבודדת) חושף את התלות הנסתרת ב-node_modules המקומי — מדמה checkout נקי בלי לגעת ב-CI האמיתי.

**בדיקה:** לפני commit של require חדש ל-corp/core — `grep -rn "require(" sockacademy/corp/core/<file>.js` לזיהוי כל התלויות החדשות, ואז cross-reference מול כל workflow YAML שמריץ agent שנוגע בקובץ הזה.

---

## 38. workflow_dispatch dry_run Fallback שדולף ל-Schedule Triggers (04/07/2026)

**מה קרה:** בזמן הוספת input `dry_run` ל-A9 ו-A12 (עם `default: 'true'` — ברירת מחדל בטוחה יותר, בשונה משאר הסוכנים שמשתמשים ב-`'false'`), טיוטה ראשונית כתבה `DRY_RUN: ${{ github.event.inputs.dry_run || 'true' }}` ב-env של ה-step. נתפס **לפני commit** בביקורת עצמית: `github.event.inputs` הוא ריק על **כל** trigger שאינו `workflow_dispatch` — כולל `schedule`. המשמעות: ה-fallback `|| 'true'` היה יורה גם על ה-cron האמיתי-חי של A12 (כל יום חמישי) ומשבית **לצמיתות ובשקט** את מיילי בקשת הביקורת השבועיים האמיתיים שלו, בלי שאף אחד ישים לב.

**סיבה:** ה-pattern `${{ github.event.inputs.X || 'default' }}` נראה תמים ועקבי (זהה למה שכבר קיים בעשרות workflows אחרים עם `default: 'false'`), אבל **רק בגלל ש-'false' הוא גם ברירת המחדל הרצויה להרצות מתוזמנות** (schedule) הוא "עבד" שם במקרה — לא כי המנגנון עצמו נכון. כשמישהו בוחר ברירת מחדל **שונה** מ-'false' לסיבה לגיטימית (A9/A12, safety-first), אותו pattern בדיוק הופך לבאג אמיתי, כי הוא לא מבדיל בין "workflow_dispatch בלי ערך מפורש" (שם ה-input's own `default:` כבר מטפל בזה) לבין "trigger אחר לגמרי, שאין לו inputs בכלל".

**מה מונע חזרה:**
1. אף פעם לא לכתוב `${{ github.event.inputs.X || 'value' }}` כשה-`value` **שונה** מהברירת המחדל הרצויה עבור triggers שאינם workflow_dispatch. אם ה-input כבר מגדיר `default:` משלו — להשתמש ב-`${{ github.event.inputs.X }}` **בלי** fallback כלל; GitHub Actions כבר ממלא את ה-default של ה-input באופן אוטומטי עבור הרצות ידניות.
2. לפני הוספת input חדש ל-workflow שיש לו גם `schedule:` trigger — לשאול במפורש: "מה קורה למשתנה הזה כש-`github.event.inputs` ריק (trigger מתוזמן)?" ולוודא שהתשובה תואמת את ההתנהגות הרצויה, לא רק את מה שקורה בהרצה ידנית.
3. אחרי כל שינוי כזה — לבדוק בפועל ב-log של ריצת CI (ידנית **וגם** את הריצה המתוזמנת הבאה אם אפשר) שה-`DRY_RUN` בפועל הוא הערך הצפוי, לא רק לקרוא את ה-YAML ולהניח.

**בדיקה:** `grep -B2 "inputs\..*||" .github/workflows/*.yml` — כל match שבו ה-fallback שונה מ-`'false'` דורש בדיקה ידנית שהוא לא "דולף" להרצות מתוזמנות.

---

## 39. תיקון Dependency ב-package.json של ה-root לא הגיע ל-CI האמיתי — 18/19 סוכנים המשיכו לרוץ על הגרסה הישנה (04/07/2026)

**מה קרה:** ב-27/06/2026 (commit `4206587`) תועד "downgrade dotenv 17.4.2 → 16.6.1 — remove advertising tips" כ-**בוצע**. בפועל, ה-commit עדכן רק את `sockacademy/package.json` (root). בזמן חיווט Module 3 ל-A2, ריצת `DRY_RUN=true node agent.js` הראתה שוב את ה-tip הפרסומי (`vestauth.com`) — התברר ש-**19 מתוך 30 סוכנים** מחזיקים `package.json` נפרד משלהם עם `"dotenv": "^17.0.0"`, וזה מה ש-**CI בפועל מתקין**, כי כל workflow עושה `npm install`/`npm ci` בתוך `working-directory: sockacademy/agents/AX_.../`, ולא נוגע ב-root package.json בכלל. כלומר התיקון שתועד כ-"בוצע" מעולם לא הגיע בפועל ל-63% מהסוכנים.

**סיבה:** ארכיטקטורת הפרויקט היא **monorepo-with-independent-installs** — לכל agent יש `package.json`+`package-lock.json` נפרדים, וה-root `package.json` הוא רק נוחות מקומית ל-dev, לא מקור אמת ל-CI. תיקון dependency שנעשה רק ב-root (כי שם "בודקים" תחילה, או כי `npm install` בשורש נראה כמו "התיקון") לא מתפשט אוטומטית ל-agents — בדיוק כמו ש-LAUNCH_MODE/DRY_RUN בתיעוד לא תמיד תואם את הקוד בפועל (ר' "Dormant בתיעוד ≠ Dormant בקוד" ב-`feedback_enterprise_rules.md`). זו אותה משפחת בעיה בדיוק, רק בציר "dependency version" במקום "runtime flag".

**מה מונע חזרה:**
1. כל תיקון `npm install`/גרסת dependency — **אף פעם לא רק ב-root `sockacademy/package.json`**. לבדוק תמיד: `grep -rl "\"<package>\":" sockacademy/agents/*/package.json` ולתקן את **כל** ההתאמות, לא רק את ה-root.
2. אחרי תיקון dependency — `npm install` מחדש בכל תיקיית agent שהושפעה, ולוודא `node_modules/<package>/package.json`'s `version` בפועל, לא רק לקרוא את ה-`^range` ב-package.json (semver range לא מבטיח שה-lockfile/node_modules המקומי כבר עודכן).
3. root `package.json` הוא **לא** מקור אמת ל-CI בפרויקט הזה — כל agent הוא unit עצמאי לחלוטין מבחינת dependencies. תיקון "גלובלי" חייב loop מפורש על כל 30 תיקיות ה-agent, לא edit יחיד.

**בדיקה:** `for d in sockacademy/agents/*/; do node -p "require('$d/node_modules/<package>/package.json').version" 2>/dev/null; done | sort -u` — יותר מגרסה אחת בפלט = drift בין agents.

---

## 40. `structure-lint.js` הכשיל על תשתית worktree/superpowers שלא הייתה קיימת קודם (04/07/2026)

**מה קרה:** בפעם הראשונה שהפרויקט השתמש ב-git worktree + `superpowers:subagent-driven-development` (לבניית Module 4), הרצת `node scripts/ci/structure-lint.js` נכשלה **פעמיים** על תשתית לגיטימית שהסקריפט מעולם לא ראה קודם:
1. `ROOT_CONTAMINATION` על `.git` עצמו — קובץ שאמור להיות תמיד מותר.
2. `ROOT_CONTAMINATION` על `.superpowers/` — ספריית scratch של הסקיל (task briefs, reports, review packages, progress ledger).

**סיבה (שני ממצאים נפרדים, אותו root theme):**
1. השורה `if (name.startsWith('.git') && isDir && name === '.git') continue;` דילגה על `.git` **רק כשהוא ספרייה**. ב-checkout רגיל `.git` תמיד ספרייה — אבל בתוך git worktree, `.git` הוא **קובץ** (מצביע `gitdir: ...` לספריית ה-git המשותפת של הריפו הראשי). ה-`isDir` check מעולם לא נכשל קודם כי אף session לפני זה לא השתמש ב-worktree.
2. `.superpowers/` הוא gitignored לחלוטין (`sdd-workspace` script כותב `.superpowers/sdd/.gitignore` עם `*`) — אף פעם לא יגיע ל-CI אמיתי (checkout נקי מ-git לא מכיל אותו בכלל). אבל `structure-lint.js` סורק את הדיסק הפיזי (`fs.readdirSync`), לא את `git ls-files` — אז כשמריצים אותו **מקומית** בתוך worktree שבו הסקיל כבר רץ, הוא רואה את `.superpowers/` על הדיסק ומתריע על violation שלעולם לא היה קורה ב-CI האמיתי.

**מה מונע חזרה:**
1. תוקן #1: `if (name === '.git') continue;` — בלי תלות ב-`isDir`, כי `.git` תקין גם כספרייה וגם כקובץ (worktree).
2. תוקן #2: `.superpowers` נוסף ל-`ALLOWED_ROOT_ENTRIES` תחת אותה קטגוריה כמו `.claude`/`.agents` — תשתית tooling, לא קובץ ידני.
3. כל שינוי עתידי ל-`structure-lint.js` (או סקריפט CI אחר שמניח הנחות על מבנה הדיסק) — לבדוק גם מול worktree + סקילים שכותבים scratch state, לא רק מול checkout רגיל וריק.
4. אם עובדים ב-worktree ו-CI/lint מקומי נכשל על משהו שקשור ל-`.git`/`.claude/worktrees/`/`.superpowers/` — לבדוק קודם אם זו הנחת-יסוד שגויה על מבנה תיקיות (הבדל בין דיסק מקומי לבין checkout נקי של CI), לא רק "קובץ במקום הלא נכון".

**בדיקה:** `node scripts/ci/structure-lint.js` בתוך worktree חדש שבו הסקיל כבר כתב task briefs/reports → חייב לעבור נקי (`✅ Structure lint passed`), לא רק בתוך checkout ריק.

---

## 41. SHOPIFY_MASTER_TOKEN rotation — Custom App UI sunset + JSON-vs-form-urlencoded token exchange (05/07/2026)

**מה קרה:** אחרי שהמפתח הישן דלף וגיא ביטל אותו, ניסיון להשיג טוקן חדש נתקע על כמה שעות: ה-Custom App UI הקלאסי (Shopify Admin → Develop apps) כבר לא זמין כמו שהיה, אפליקציות Dev Dashboard חדשות משתמשות כברירת מחדל ב-"Shopify Managed Installation" (מחזיר `hmac`/`host`, לא `code`), ו-`shopify app dev` דורש dev store (החנות שלנו production). גם אחרי שנמצא הפתרון (checkbox "Use legacy install flow" + authorize URL ישיר), חילוף הקוד לטוקן נכשל שוב ושוב עם `400 Oauth error invalid_request`.

**סיבה (שלושה ממצאים נפרדים, אותו theme — הפלטפורמה השתנתה מאז הפעם הקודמת שזה נעשה):**
1. לחיצה על אייקון האפליקציה מתוך רשימת האפליקציות המותקנות ב-Admin טוענת אותה כ-embedded app (URL pattern עם `hmac`/`host`) — **לא** עוברת דרך מסך ה-OAuth consent, גם כש-"Use legacy install flow" מסומן. צריך לפנות ישירות ל-`/admin/oauth/authorize` בדפדפן.
2. `exchange_token.js` שלח את בקשת חילוף הקוד כ-`application/x-www-form-urlencoded` (הפורמט שהיה תקין בעבר) — Shopify's `/admin/oauth/access_token` דחה את זה עם `400 invalid_request` גם עם קוד תקין וסיקרט נכון. הפתרון: לשלוח JSON (`Content-Type: application/json`, גוף `JSON.stringify({...})`) — זה מה שה-endpoint בפועל דורש כרגע.
3. אותה אפליקציה יכולה להפיק שני פורמטים שונים של טוקן — `shpat_` (חילוף OAuth קלאסי) ו-`atkn_` (כפתור "Create automation token" נפרד) — לא ניתן להניח שאחד מהם "תמיד תקין"; ב-05/07/2026 ה-`atkn_` החזיר `401` (כנראה נוצר לפני שההתקנה בפועל הושלמה) בעוד ה-`shpat_` עבד מיד.

**מה מונע חזרה:**
1. הנוהל המלא, כולל כל שלבי ה-workaround, מתועד ב-`sockacademy/docs/ops/SHOPIFY_TOKEN_RUNBOOK.md` — לקרוא אותו **קודם** כל ניסיון עתידי לחדש/לסובב את הטוקן, לא לנסות לשחזר מהזיכרון.
2. `exchange_token.js` תוקן לשלוח JSON — אם מישהו יחזיר אותו ל-form-urlencoded ("כי זה מה שהיה פעם"), זו נסיגה לבאג הזה בדיוק.
3. אחרי כל חילוף טוקן חדש — **תמיד** לאמת עם קריאת GET אמיתית ל-Admin API (`shop.json`) לפני שמשתמשים בטוקן ב-`.env`/GitHub Secrets, ולא להניח שפורמט מסוים (shpat_/atkn_) תקף רק כי הוא "נראה נכון".
4. `gh secret set <NAME>` — הערך תמיד רק בפרומפט האינטראקטיבי, אף פעם לא כ-argument בפקודה עצמה (טעות שקרתה גם בשיחה הזו וגרמה ל-secret עם שם שגוי).

**בדיקה:** אם ניצור/נסובב `SHOPIFY_MASTER_TOKEN` שוב — לעקוב אחרי `SHOPIFY_TOKEN_RUNBOOK.md` צעד-אחר-צעד ולוודא שהתהליך לוקח דקות, לא שעות.

---

## 42. Fable 5 subagent הדפיס שבריר מפתח API אמיתי לתוך קובץ תיעוד (05/07/2026)

**מה קרה:** Stage 17 של יוזמת Fable 5 (audit על הגדרות Claude Code/Desktop) קרא את `~/.claude.json` וגילה מפתח API אמיתי בפורמט plain-text עבור שרת MCP בשם `magic`. בכתיבת ה-doc, ה-subagent צירף קטע מהמפתח בפועל (`"26c34f9f04a7…"`) לתוך `FABLE5_STAGE17_CLAUDE_SETTINGS_AUDIT.md` — הפרה ישירה של חוק S2 ("לעולם לא להדפיס סודות שנזכרים מהזיכרון — אפילו חלקיים, אפילו 'ישנים'"). נתפס ותוקן מיד ע"י Claude לפני שהקובץ הגיע ל-`git add` — אומת ש-`git status` הראה את הקובץ כ-`??` (untracked) לגמרי, כך שלא הייתה חשיפה בפועל להיסטוריית git או ל-GitHub הפומבי.

**סיבה:** חוק S2 מנוסח כהנחיה לגיא/Claude בצ'אט ("לעולם לא לבקש מגיא להדביק... לעולם לא להדפיס"), אבל מעולם לא הורחב במפורש ל**subagents (כולל Fable 5)** שכותבים ישירות ל-file system בלי לעבור דרך הצ'אט. Subagent שקורא קובץ config אמיתי (כמו `~/.claude.json`) ומצטט ממנו "לצורך תיעוד המצב" עלול, בלי כוונה רעה, להעתיק גם את הערך הרגיש עצמו — לא רק את קיומו.

**מה מונע חזרה:**
1. בכל dispatch עתידי ל-Fable 5 (או subagent אחר) שקורא config files אמיתיים (`~/.claude.json`, `.env`, `settings.local.json`, secrets) — להוסיף במפורש בפרומפט: "אם תמצא ערך רגיש (API key, token, password) — דווח על **קיומו והמיקום שלו בלבד**, אף פעם לא את הערך עצמו, גם לא חלקית/מקוצר."
2. אחרי כל dispatch של subagent שכתב קובץ `.md` חדש (Fable 5 או אחר) — **לפני** commit, סריקת security sweep סטנדרטית (`grep -iE "(api_key|secret|password|token|sk-|pk_|shpat_)"`) חלה גם על מסמכי Fable 5, לא רק על diff קוד. הקובץ הזה עצמו לא נבדק מיידית — Claude קרא אותו ידנית וזיהה את השבריר בעין, לא ע"י grep אוטומטי. זה מזל, לא תהליך.
3. **פעולה נדרשת (Guy):** לסובב את מפתח ה-`magic`/21st-dev MCP server ב-`~/.claude.json` בכל מקרה — הוא חשוף בקובץ מקומי plain-text, ולפי הביקורת עצמה השרת ממילא DEPRECATED/NOT APPLICABLE לפרויקט (Liquid, לא React). ההמלצה המקורית של Fable 5 (להסיר את השרת + לסובב את המפתח) עומדת בעינה, ללא קשר לתקרית התיעוד.

**בדיקה:** `grep -rn "API_KEY\"\s*:\s*\"[A-Za-z0-9]" sockacademy/docs/` — כל תוצאה עם ערך שנראה כמו מפתח אמיתי (לא `[REDACTED]`/placeholder) בתוך `docs/` היא red flag מיידי.

---

## 43. Fable 5 subagent התייחס לקופי **מוצע** (עדיין לא מאושר) כאילו הוא כבר חי באתר (06/07/2026)

**מה קרה:** Stage 20 (unit economics + Day-1 fulfillment runbook) קרא הן את ה-FAQ האמיתי (`scripts/setup/create_faq_and_redirects.js`) והן את `FABLE5_STAGE16_DELIVERABLES.md` §4.3 (שמכיל קופי **מוצע**, לא מאושר, לתיקון עתידי: "Dispatched within 48 hours. Delivered in 8-14 days."). ה-subagent מיזג בין השניים בטעות וכתב בשלושה מקומות במסמך החדש ("the site promises 48h dispatch", "the 48h-dispatch site promise is already broken") כאילו זו הבטחה **חיה וקיימת** ללקוח — בעוד שה-FAQ האמיתי מבטיח רק "7–14 ימי עסקים" משלוח, בלי שום התחייבות זמן-dispatch. נתפס ותוקן ע"י Claude באותה שיחה (לא תוקן בגוף מסמך פייבל עצמו — דוגל ב-tracker במקום, כדי לשמר את המסמך המקורי כפי שנכתב).

**סיבה:** subagent שמקבל cold-start עם כמה מסמכים — חלקם "מה שקיים בפועל" (קוד, FAQ חי) וחלקם "מה שהוצע ועדיין ממתין לאישור" (Stage 16 copy batch, item I) — עלול למזג את שניהם לרמת מידע אחידה בלי לשמר את התג "מוצע לעומת חי" לאורך כל התהליך, במיוחד כשההצעה כתובה בניסוח וודאי ("the site promises...") ולא מסויג.

**מה מונע חזרה:**
1. בכל dispatch עתידי שמסתמך על יותר ממקור אחד — להוסיף כלל מפורש בפרומפט: "לכל טענה על מה שהאתר/הלקוח 'מבטיח' או 'אומר' — לצטט את מקור הקופי **החי בפועל** (קובץ ליקוויד/FAQ script), לא מסמך המלצה. אם ההבטחה מגיעה ממסמך המלצה שעדיין ממתין לאישור גיא — לתייג אותה במפורש כ'מוצע, טרם אושר' בכל מקום שהיא מוזכרת, לא רק בפעם הראשונה."
2. Controller (Claude/Sonnet) חייב, בכל אימות של stage doc חדש שמצטט "הבטחה ללקוח"/"מה שהאתר אומר" — לוודא ישירות בקוד/FAQ החי שהטענה אכן חיה, לא רק להניח שהיא נכונה כי היא מנוסחת בביטחון.
3. אין צורך לתקן מסמכי Fable קיימים בדיעבד — מספיק לדגול את הפער ב-tracker (ראה `FABLE5_ACTION_TRACKER.md` Stage 20) כך שקורא עתידי לא ייתקל בטענה השגויה בלי הקשר מתקן.

**בדיקה:** בכל stage doc חדש — `grep -in "promise\|guarantee\|site says\|site states"` ולוודא שכל hit כזה מצוטט למקור קוד/FAQ חי, לא למסמך "proposed"/"recommendation".

---

## 44. DRY_RUN מבוסס נוכחות-credentials במקום flag מפורש — A5 פרסם לאינסטגרם בלי אישור אנושי (10-11/07/2026)

**מה קרה:** `agents/A5_social/agent.js` חישב `DRY_RUN = !ACCESS_TOKEN || !IG_USER_ID`. ברגע ש-`META_ACCESS_TOKEN`/`META_IG_USER_ID` נוספו ל-GitHub Secrets (הכנה לעתיד, לא כוונה להפעיל), `DRY_RUN` התהפך ל-`false` בשקט — A5 החל לפרסם לאינסטגרם בפועל, ללא שום אישור אנושי, הפרה ישירה של חוק ה-Human-in-the-Loop.

**למה קרה:** ה-safety flag הוגדר כביטוי **נגזר** ממשתנים אחרים (נוכחות credentials), במקום `env` מפורש שרק בן אדם קובע. זו מחלקת-בעיה שונה מ-#35 (שם פשוט שכחו להגדיר `DRY_RUN=true` בסמוק-טסט) — כאן הבעיה היא שה-flag עצמו יכול להתהפך אוטומטית, בלי כל כוונה אנושית, ברגע שתשתית לא-קשורה (הוספת secret) משתנה.

**מה מונע חזרה:**
1. תיקון מיידי (11/07): `DRY_RUN` הפך זמנית ל-hardcoded `true`.
2. תיקון מלא, אותה שיחה: HITL retrofit מלא ל-A5 — פרסום ישיר הוסר לגמרי מ-`agent.js`; פוסט שעבר QA פותח `requestApproval()` (כמו A9), ופרסום אמיתי קורה רק ב-`corp/core/hitl-execute.js` אחרי אישור גיא. שכבת הגנה נוספת: `A5_ARM` (guard שני, בלתי-תלוי, env בלבד) מגן גם על עצם פתיחת הבקשה — מראה מדויקת של `A9_ARM`.
3. **כלל כללי לכל agent עתידי:** `DRY_RUN`/`*_ARM` guards חייבים תמיד להיות `process.env.X === 'true'` ישירות — לעולם לא ביטוי נגזר ממשתנה אחר (נוכחות credentials, תוצאת פונקציה, וכו').

**בדיקה:** `grep -n "DRY_RUN\s*=" agents/*/agent.js` — כל תוצאה חייבת להיות `process.env.DRY_RUN === 'true'` או hardcoded literal, לעולם לא ביטוי עם `!`/`?`/קריאת פונקציה אחרת.

---

## 45. Storefront חי וגלוי לציבור בלי שום החלטת Go-Live מפורשת — לקוח מצא ופנה בעניין הזמנה (15/07/2026)

**מה קרה:** לקוח שלח מייל ("Can u ship to Ohio?") ישירות לתיבה האישית של גיא, מה שחשף שהחנות שקופה ונגישה לציבור. בדיקה חיה (read-only) גילתה: (1) `sockacademy.store` מחזיר HTTP 200 מלא — password protection **מעולם לא הופעל** מאז שה-theme עלה ב-14/06; (2) `robots.txt` (ברירת מחדל Shopify) לא חוסם אינדוקס — האתר עשוי כבר להיות ממופה בגוגל; (3) `shop.email` (בעל חשבון Shopify) עדיין `guyoved100@gmail.com` — כתובת אישית שמוצגת ברמת הפלטפורמה, נפרדת לגמרי מ-`shop.customer_email` (שכן מוגדר נכון ל-`hello@sockacademy.store`); (4) MX records ל-`sockacademy.store` כן resolve עכשיו ל-ImprovMX (שינוי אמיתי מאז 10/07 — `FABLE5_ACTION_TRACKER.md` item 2 היה תקוע ב-"Continue לא נלחץ"), אבל לא אומת אם ה-alias `hello@` בפועל נוצר ב-improvmx.com ומעביר, אז ייתכן שמייל ל-`hello@sockacademy.store` עדיין nowhere-bound.

**למה קרה:** Iron Law 1 ("אפס השקה עד שהמערכת מוכנה") הוא כלל *עסקי*, אבל מעולם לא תורגם לפעולה טכנית קונקרטית ("הפעל password protection ברגע שה-theme עולה ל-production"). Shopify כברירת מחדל — store פתוח לציבור אלא אם נועל אותו במפורש. ההנחה ש"לא פרסמנו אז אף אחד לא ימצא" הייתה שגויה: A3 (SEO blog) ו-A5 (social) נבנו **בכוונה** ליצור נראות אורגנית — בלי בקרת גישה מקבילה על product/checkout pages, הנראות הזו חושפת גם את מה שעדיין לא מוכן למכירה.

**מה מונע חזרה:**
1. בדיקה חדשה בכל boot/pre-launch check: `curl -s -o /dev/null -w "%{http_code}" https://sockacademy.store` — 200 = פתוח לציבור. לוודא שזו **החלטה מודעת**, לא ברירת מחדל שאיש לא בדק.
2. `inventory_policy: 'deny'` על כל variant הוא ה-safety net האמיתי (חוסם רכישה גם אם הדף גלוי) — כל מוצר חדש עד Launch חייב `deny`, לא מספיק status draft/active לבד.
3. `shop.email` (Shopify account owner, Account Settings) הוא כתובת **נפרדת** מ-SMTP sender ברמת קוד (פרוטוקול #7 מכסה רק nodemailer) — אף grep קיים לא תופס אותה כי היא לא בקוד. gap שדורש בדיקה ידנית תקופתית (🧑 גיא בלבד — Shopify Admin → Settings → Account).
4. תיקון בפועל בשיחה זו: 4 מוצרים ב-status `active` הועברו ל-`draft` (Shopify Admin API `PUT`) — מסיר אותם לגמרי מה-storefront (collections page + direct product URL = 404) בלי לפגוע ב-blog/policy pages ש-SEO כבר תלוי בהם. שני המוצרים שהיו כבר `draft` (כולל ZQ Merino עם ה-Unicode handle, פרוטוקול #29) לא שונו.

**בדיקה:** `curl -s https://sockacademy.store/collections/all | grep -c "No products found"` — חייב להחזיר 1 (אפס מוצרים גלויים) כל עוד Launch לא הוכרז במפורש. `curl -s -o /dev/null -w "%{http_code}" https://sockacademy.store/products/<handle>` על כל handle פעיל לשעבר — חייב 404.

---

## 46. MX Records הצביעו ל-ImprovMX חודשים — אבל הדומיין מעולם לא נוסף לחשבון, מייל היה יורד בשקט (18/07/2026)

**מה קרה:** בזמן חקירת item 10 (WHOIS leak, ר' #45), התגלה שהתאוריה המקורית שגויה — GoDaddy Domain Privacy כבר היה "On" וה-Contact Info כבר הציג את המייל העסקי. תוך כדי המשך חקירת D4 (אימות `hello@sockacademy.store`), גיא נכנס בפועל ל-improvmx.com לבדוק את ה-alias — והתברר ש**לא היה שום חשבון ImprovMX פעיל עם הדומיין מוגדר בו כלל**. ה-MX records (`mx1`/`mx2.improvmx.com`) הוצבעו נכון ב-DNS כבר מ-10/07 (או קודם), אך אף פעם לא הושלמה הרשמה + הוספת domain + alias בצד ImprovMX עצמו. המשמעות: כל מייל שנשלח בפועל ל-`hello@sockacademy.store` (הכתובת שה-Contact form של השירות מפנה אליה!) היה עלול **לרדת בשקט** — אין bounce שגיא היה רואה, אין log, שום סימן. זו בדיוק אותה מחלקת-בעיה כמו #45: תשתית *שנראית* מוגדרת (DNS resolve תקין) לא בהכרח *באמת* פונקציונלית מקצה לקצה.

**סיבה:** DNS MX record תקין מוכיח רק ש"מישהו הצביע לשם" — הוא לא מוכיח שהצד השני (ImprovMX) בכלל יודע על קיום הדומיין. שני המערכות (DNS registrar + forwarding provider) עצמאיות לחלוטין; שינוי באחת לא בודק את השנייה. אף session קודם לא בדק את **צד השירות** (רק ציין "MX resolve" כ-proof of progress ב-Primer מ-15/07 — ר' שורה 1219 בזיכרון), והנחה בטעות ש-resolve = מוגדר.

**מה מונע חזרה:**
1. **לעולם לא להסתפק ב-DNS resolve כהוכחת "השירות מוגדר".** לכל שירות חיצוני מבוסס-DNS (email forwarding, CDN, verification services) — לבדוק גם את **צד הפאנל של הספק עצמו** (login לחשבון, ולוודא שהדומיין/ה-alias קיימים שם בפועל), לא רק `nslookup`/`dig`.
2. לפני שמסמנים "D4 — MX resolve, זה positive progress" ב-memory/tracker — לציין במפורש: "MX resolve בלבד ≠ forwarding מוגדר בפועל. נדרש אימות בפאנל הספק."
3. לכל domain-based email setup עתידי (Klaviyo sending domain, SPF/DKIM records, וכו') — אותו כלל: DNS תקין הוא תנאי הכרחי, לא מספיק. בדיקה סופית = login לפאנל + בדיקת קבלה חיה (מייל טסט אמיתי).

**בדיקה:** לפני שסוגרים "email deliverability verified" על כל דומיין — חובה screen-share/אימות ישיר של פאנל הספק (לא רק תוצאת DNS query) + מייל טסט חי שמגיע ליעד בפועל.

---

## SESSION CONTINUITY CHECKLIST — בכל שיחה

**פתיחה:**
- [ ] `/boot-sockacademy` → Boot Dashboard v3 (CI status + git status + PENDING)
- [ ] CI ירוק על main לפני התחלה — אם אדום: לתקן קודם

**בתוך שיחה:**
- [ ] כל milestone → PARANOIA MODE
- [ ] כל קובץ חדש → 3 שאלות FILE CREATION PROTOCOL
- [ ] כל מסמך אסטרטגי חדש/"Locked" → Strategy Document Supersession Check (CLAUDE.md, ANTI_RECURRENCE #31)
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
