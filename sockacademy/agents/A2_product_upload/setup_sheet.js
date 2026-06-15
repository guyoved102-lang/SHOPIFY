/**
 * הרצה חד-פעמית — יוצר את הגיליון A1_Products עם כל הכותרות
 * node setup_sheet.js
 */

require('dotenv').config({ path: '../../.env' });
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const HEADERS = [
  'Run Date',       // A — תאריך הרצת A1
  'Product Name',   // B — שם המוצר
  'CJ PID',         // C — מזהה ב-CJ
  'Category',       // D — קטגוריה
  'Materials',      // E — חומרים
  'Platform',       // F — CJ / AliExpress
  'Rating',         // G — דירוג
  'Orders',         // H — מכירות
  'Supplier Price', // I — מחיר עלות ($)
  'Retail Price',   // J — מחיר מכירה מוצע ($)
  'Score',          // K — ציון /100
  'Image URL',      // L — לינק לתמונה
  'Product URL',    // M — לינק למוצר
  'Status',         // N — Pending / Approved / Rejected (גיא ממלא)
  'Upload Status',  // O — ריק / Uploaded / Error (A2 ממלא)
  'Shopify ID',     // P — ID מוצר ב-Shopify
  'Shopify URL',    // Q — לינק מוצר
  'Upload Date',    // R — תאריך העלאה
];

async function setup() {
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
  await doc.loadInfo();
  console.log(`📊 גיליון: ${doc.title}`);

  let sheet = doc.sheetsByTitle['A1_Products'];
  if (sheet) {
    console.log('⚠️  גיליון A1_Products כבר קיים — לא מחליף');
  } else {
    sheet = await doc.addSheet({ title: 'A1_Products', headerValues: HEADERS });
    console.log('✅ נוצר גיליון A1_Products עם', HEADERS.length, 'עמודות');
  }

  console.log('✅ סיום — הגיליון מוכן');
  console.log(`🔗 https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`);
}

setup().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
