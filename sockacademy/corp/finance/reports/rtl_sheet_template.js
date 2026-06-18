/**
 * corp/finance/reports/rtl_sheet_template.js
 * Google Sheets RTL Hebrew layout engine — SockAcademy CFO Report System
 *
 * Used by A15 CFO Agent to produce properly formatted Hebrew financial documents.
 * Requires: googleapis (install in consuming agent's package.json)
 * Auth: GOOGLE_SERVICE_ACCOUNT_JSON env var (Service Account with Sheets + Drive scopes)
 *
 * RTL Architecture:
 *   - Sheet direction: rightToLeft = true (native Sheets property)
 *   - Font: Rubik (Google's Hebrew-optimized variable font)
 *   - Locale: iw (Hebrew) — affects number/date formatting
 *   - Timezone: Asia/Jerusalem
 *   - Hebrew text cells: horizontalAlignment = RIGHT
 *   - Numeric cells: horizontalAlignment = LEFT (numbers are always LTR in RTL sheets)
 *   - Currency: ₪#,##0.00 for ILS | $#,##0.00 for USD
 */

'use strict';

const { google } = require('googleapis');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRAND TYPOGRAPHY CONSTANTS — SockAcademy palette
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BRAND = {
  font: { hebrew: 'Rubik', monospace: 'Roboto Mono' },
  fontSize: { title: 14, header: 11, body: 10 },
  color: {
    // Backgrounds
    bgDeep:      { red: 0.039, green: 0.039, blue: 0.039 },   // #0A0A0A
    bgDark:      { red: 0.102, green: 0.102, blue: 0.102 },   // #1A1A1A
    bgAlt:       { red: 0.063, green: 0.063, blue: 0.063 },   // #101010 — alternating rows
    bgWhite:     { red: 1.0,   green: 1.0,   blue: 1.0   },   // white for print mode

    // Foregrounds
    fgGold:      { red: 0.788, green: 0.659, blue: 0.298 },   // #C9A84C — headers
    fgCream:     { red: 0.941, green: 0.929, blue: 0.902 },   // #F0EDE6 — body text
    fgMuted:     { red: 0.612, green: 0.635, blue: 0.647 },   // #9CA3AF — secondary
    fgPositive:  { red: 0.290, green: 0.678, blue: 0.502 },   // #4AAD80 — profit
    fgNegative:  { red: 0.976, green: 0.431, blue: 0.431 },   // #F96E6E — loss
    fgBorder:    { red: 0.165, green: 0.165, blue: 0.165 },   // #2A2A2A
    fgGoldBorder:{ red: 0.788, green: 0.659, blue: 0.298 },   // #C9A84C — accent border
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH — shared Service Account (same as A5 Drive backup)
// Scopes: spreadsheets (R/W) + drive.file (move file to folder)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getAuth() {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  const credentials = JSON.parse(saJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORMAT BUILDERS — composable cell format objects
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function textFmt(bold = false, size = BRAND.fontSize.body, color = BRAND.color.fgCream) {
  return { fontFamily: BRAND.font.hebrew, fontSize: size, bold, foregroundColor: color };
}

// RTL-aware cell format: text = RIGHT, numbers = LEFT
function cellFmt(opts = {}) {
  const base = {
    horizontalAlignment: opts.numeric ? 'LEFT' : 'RIGHT',
    verticalAlignment: 'MIDDLE',
    textFormat: textFmt(opts.bold || false, opts.size || BRAND.fontSize.body, opts.color || BRAND.color.fgCream),
    wrapStrategy: 'CLIP',
    padding: { top: 6, bottom: 6, left: 8, right: 8 },
  };
  if (opts.bg)      base.backgroundColor = opts.bg;
  if (opts.border)  base.borders = opts.border;
  if (opts.numFmt)  base.numberFormat = opts.numFmt;
  return base;
}

// Preset formats
const FMT = {
  // Title row
  title: cellFmt({ bold: true, size: BRAND.fontSize.title, color: BRAND.color.fgGold, bg: BRAND.color.bgDeep }),
  // Column header
  colHeader: cellFmt({ bold: true, size: BRAND.fontSize.header, color: BRAND.color.fgGold, bg: BRAND.color.bgDark,
    border: { bottom: { style: 'SOLID', color: BRAND.color.fgGoldBorder, width: 2 } } }),
  // Hebrew text cell (RTL, right-aligned)
  heText: cellFmt({ color: BRAND.color.fgCream }),
  heTextAlt: cellFmt({ bg: BRAND.color.bgAlt, color: BRAND.color.fgCream }),
  // USD numeric
  usd: cellFmt({ numeric: true, numFmt: { type: 'CURRENCY', pattern: '$#,##0.00' } }),
  usdAlt: cellFmt({ numeric: true, bg: BRAND.color.bgAlt, numFmt: { type: 'CURRENCY', pattern: '$#,##0.00' } }),
  // ILS numeric
  ils: cellFmt({ numeric: true, numFmt: { type: 'CURRENCY', pattern: '₪#,##0.00' } }),
  ilsAlt: cellFmt({ numeric: true, bg: BRAND.color.bgAlt, numFmt: { type: 'CURRENCY', pattern: '₪#,##0.00' } }),
  // Percentage
  pct: cellFmt({ numeric: true, numFmt: { type: 'PERCENT', pattern: '0.0%' } }),
  pctAlt: cellFmt({ numeric: true, bg: BRAND.color.bgAlt, numFmt: { type: 'PERCENT', pattern: '0.0%' } }),
  // Exchange rate
  rate: cellFmt({ numeric: true, numFmt: { type: 'NUMBER', pattern: '#,##0.000' } }),
  // Positive/Negative profit
  profit: (val, isAlt = false) => ({
    ...cellFmt({ numeric: true, bg: isAlt ? BRAND.color.bgAlt : undefined, numFmt: { type: 'CURRENCY', pattern: '$#,##0.00' } }),
    textFormat: textFmt(true, BRAND.fontSize.body, val >= 0 ? BRAND.color.fgPositive : BRAND.color.fgNegative),
  }),
  // Subtitle
  subtitle: cellFmt({ size: BRAND.fontSize.body, color: BRAND.color.fgMuted, bg: BRAND.color.bgDark }),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// P&L SHEET COLUMN DEFINITION
// RTL order: column A = rightmost in RTL view
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PL_COLUMNS = [
  { header: 'חודש',           width: 100, key: 'month' },
  { header: 'הכנסות (USD)',   width: 125, key: 'revenueUSD' },
  { header: 'עלות מוצר',      width: 115, key: 'cogsCost' },
  { header: 'פרסום Meta',     width: 115, key: 'metaSpend' },
  { header: 'הוצאות תפעול',   width: 125, key: 'operatingCost' },
  { header: 'רווח גולמי',     width: 115, key: 'grossProfit' },
  { header: 'רווח נקי',       width: 115, key: 'netProfit' },
  { header: '% שולי רווח',    width: 105, key: 'marginPct' },
  { header: 'הכנסות (ILS)',   width: 125, key: 'revenueILS' },
  { header: 'שע"ח USD/ILS',   width: 100, key: 'usdIlsRate' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHEET SETUP — RTL + Hebrew layout requests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildSetupRequests(sheetId) {
  const requests = [];
  const colCount = PL_COLUMNS.length;

  // 1. Enable RTL + freeze 3 header rows
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        rightToLeft: true,
        gridProperties: { frozenRowCount: 3, frozenColumnCount: 0 },
      },
      fields: 'rightToLeft,gridProperties.frozenRowCount',
    },
  });

  // 2. Title row (row 0): "SockAcademy | דוח רווח והפסד חודשי"
  requests.push({
    updateCells: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colCount },
      rows: [{ values: [{ userEnteredValue: { stringValue: 'SockAcademy | דוח רווח והפסד חודשי' }, userEnteredFormat: { ...FMT.title, horizontalAlignment: 'CENTER' } }] }],
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });
  requests.push({
    mergeCells: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colCount },
      mergeType: 'MERGE_ALL',
    },
  });

  // 3. Subtitle row (row 1): updated by A15 each run
  requests.push({
    updateCells: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: colCount },
      rows: [{ values: [{ userEnteredValue: { stringValue: 'עדכון אחרון: —' }, userEnteredFormat: { ...FMT.subtitle, horizontalAlignment: 'CENTER' } }] }],
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });
  requests.push({
    mergeCells: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: colCount },
      mergeType: 'MERGE_ALL',
    },
  });

  // 4. Column headers (row 2)
  requests.push({
    updateCells: {
      range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: colCount },
      rows: [{
        values: PL_COLUMNS.map(col => ({
          userEnteredValue: { stringValue: col.header },
          userEnteredFormat: { ...FMT.colHeader, horizontalAlignment: 'CENTER' },
        })),
      }],
      fields: 'userEnteredValue,userEnteredFormat',
    },
  });

  // 5. Column widths
  PL_COLUMNS.forEach((col, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: col.width },
        fields: 'pixelSize',
      },
    });
  });

  // 6. Row heights: title=48, subtitle=28, colHeader=36
  [{ start: 0, end: 1, px: 48 }, { start: 1, end: 2, px: 28 }, { start: 2, end: 3, px: 36 }].forEach(r => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: r.start, endIndex: r.end },
        properties: { pixelSize: r.px },
        fields: 'pixelSize',
      },
    });
  });

  // 7. Conditional formatting: positive net profit = green, negative = red (col G = index 6)
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId, startRowIndex: 3, startColumnIndex: 6, endColumnIndex: 7 }],
        booleanRule: {
          condition: { type: 'NUMBER_GREATER_EQ', values: [{ userEnteredValue: '0' }] },
          format: { textFormat: { foregroundColor: BRAND.color.fgPositive, bold: true } },
        },
      },
      index: 0,
    },
  });
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId, startRowIndex: 3, startColumnIndex: 6, endColumnIndex: 7 }],
        booleanRule: {
          condition: { type: 'NUMBER_LESS', values: [{ userEnteredValue: '0' }] },
          format: { textFormat: { foregroundColor: BRAND.color.fgNegative, bold: true } },
        },
      },
      index: 1,
    },
  });

  return requests;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create a new RTL Hebrew CFO spreadsheet
 * @param {object} opts
 * @param {string} opts.title         - e.g. "SockAcademy CFO — יוני 2026"
 * @param {string} [opts.folderId]    - Google Drive folder ID (GDRIVE_BACKUP_FOLDER_ID)
 * @returns {Promise<{ spreadsheetId: string, spreadsheetUrl: string }>}
 */
async function createCFOSpreadsheet({ title, folderId }) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive  = google.drive({ version: 'v3', auth });

  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title,
        locale: 'iw',
        timeZone: 'Asia/Jerusalem',
        defaultFormat: {
          textFormat: { fontFamily: BRAND.font.hebrew, fontSize: BRAND.fontSize.body },
        },
      },
      sheets: [
        { properties: { title: 'רווח והפסד', index: 0 } },
        { properties: { title: 'Meta Ads',    index: 1 } },
        { properties: { title: 'Klaviyo',     index: 2 } },
        { properties: { title: 'מלאי',        index: 3 } },
        { properties: { title: 'עלויות',      index: 4 } },
      ],
    },
  });

  const { spreadsheetId, sheets: created } = createRes.data;
  const plSheetId = created[0].properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: buildSetupRequests(plSheetId) },
  });

  // Move to designated folder if provided
  if (folderId) {
    const fileRes = await drive.files.get({ fileId: spreadsheetId, fields: 'parents' });
    const prevParents = (fileRes.data.parents || []).join(',');
    await drive.files.update({
      fileId: spreadsheetId,
      addParents: folderId,
      removeParents: prevParents,
      fields: 'id,parents',
    });
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  console.log(`  📊 CFO Spreadsheet created (RTL/Hebrew): ${spreadsheetUrl}`);
  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Write one monthly P&L data row
 * Calculates derived values: grossProfit, netProfit, marginPct, revenueILS
 * @param {string} spreadsheetId
 * @param {object} data
 * @param {string} data.month          - "יוני 2026"
 * @param {number} data.revenueUSD
 * @param {number} data.cogsCost
 * @param {number} data.metaSpend
 * @param {number} data.operatingCost
 * @param {number} data.usdIlsRate     - e.g. 3.72
 */
async function writePLRow(spreadsheetId, data) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const { month, revenueUSD, cogsCost, metaSpend, operatingCost, usdIlsRate } = data;
  const grossProfit = revenueUSD - cogsCost;
  const netProfit   = grossProfit - metaSpend - operatingCost;
  const marginPct   = revenueUSD > 0 ? netProfit / revenueUSD : 0;
  const revenueILS  = revenueUSD * usdIlsRate;

  // Determine row index: fetch current row count
  const metaRes = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: ['רווח והפסד!A:A'],
    includeGridData: false,
  });
  const rowCount = metaRes.data.sheets[0].properties.gridProperties.rowCount;
  const targetRow = rowCount;   // append after last row

  const isAlt = (targetRow % 2 === 0);  // alternating row colour
  const txtFmt = (fmtObj, overrideColor) => overrideColor
    ? { ...fmtObj, textFormat: { ...fmtObj.textFormat, foregroundColor: overrideColor } }
    : fmtObj;

  const rowValues = [
    { userEnteredValue: { stringValue: month },        userEnteredFormat: isAlt ? FMT.heTextAlt : FMT.heText },
    { userEnteredValue: { numberValue: revenueUSD },   userEnteredFormat: isAlt ? FMT.usdAlt : FMT.usd },
    { userEnteredValue: { numberValue: cogsCost },     userEnteredFormat: isAlt ? FMT.usdAlt : FMT.usd },
    { userEnteredValue: { numberValue: metaSpend },    userEnteredFormat: isAlt ? FMT.usdAlt : FMT.usd },
    { userEnteredValue: { numberValue: operatingCost },userEnteredFormat: isAlt ? FMT.usdAlt : FMT.usd },
    { userEnteredValue: { numberValue: grossProfit },  userEnteredFormat: txtFmt(isAlt ? FMT.usdAlt : FMT.usd, grossProfit >= 0 ? BRAND.color.fgPositive : BRAND.color.fgNegative) },
    { userEnteredValue: { numberValue: netProfit },    userEnteredFormat: FMT.profit(netProfit, isAlt) },
    { userEnteredValue: { numberValue: marginPct },    userEnteredFormat: isAlt ? FMT.pctAlt : FMT.pct },
    { userEnteredValue: { numberValue: revenueILS },   userEnteredFormat: isAlt ? FMT.ilsAlt : FMT.ils },
    { userEnteredValue: { numberValue: usdIlsRate },   userEnteredFormat: FMT.rate },
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        appendCells: {
          sheetId: 0,
          rows: [{ values: rowValues }],
          fields: 'userEnteredValue,userEnteredFormat',
        },
      }],
    },
  });

  // Update subtitle with last-updated timestamp
  const now = new Date().toLocaleDateString('he-IL', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'רווח והפסד'!A2",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[`עדכון אחרון: ${now} | שע"ח: ${usdIlsRate} ₪/$`]] },
  });

  console.log(`  📊 P&L row: ${month} | הכנסות: $${revenueUSD.toFixed(0)} | רווח נקי: $${netProfit.toFixed(0)} (${(marginPct * 100).toFixed(1)}%)`);
  return { spreadsheetId, grossProfit, netProfit, marginPct };
}

/**
 * Update subtitle line with latest timestamp (called at end of each A15 run)
 */
async function touchSubtitle(spreadsheetId) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const now = new Date().toLocaleDateString('he-IL', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'רווח והפסד'!A2",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[`עדכון אחרון: ${now}`]] },
  });
}

module.exports = { createCFOSpreadsheet, writePLRow, touchSubtitle, BRAND, FMT, PL_COLUMNS };
