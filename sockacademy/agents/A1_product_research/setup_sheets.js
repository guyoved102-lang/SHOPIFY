/**
 * מריץ פעם אחת — יוצר טאב "A1_Products" ב-Google Sheets עם headers
 * דרישה: npm install googleapis
 */

// אין צורך ב-googleapis — עושים דרך Shopify Sheets (Make.com יוצר אוטומטית)
// קובץ זה מסביר את מבנה הגיליון הנדרש:

console.log(`
📊 הגדרת Google Sheets — A1_Products

פתח את הגיליון הזה:
https://docs.google.com/spreadsheets/d/1ojfN0ClyB4EM83yk03RhKlQImrTjZdYEurZ4dJbuQBg

צור טאב חדש בשם: A1_Products

הוסף שורת Headers (שורה 1):
A: Run Date
B: Product Name
C: Source (CJ/AliExpress)
D: Rating ⭐
E: Orders 📦
F: Supplier Price $
G: Score /100
H: Reasons
I: Product URL
J: Approval (Pending/Approved/Rejected)

כאשר Make.com webhook יקבל נתונים מ-A1 — ימלא אוטומטית.
גיא ישנה עמודה J ל-Approved → A2 יעלה לשופיפיי.
`);
