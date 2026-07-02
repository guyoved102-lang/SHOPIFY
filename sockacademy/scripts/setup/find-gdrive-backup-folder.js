#!/usr/bin/env node
/**
 * One-time helper: finds the Drive folder Guy shared with the A5 service
 * account and prints its ID, so GDRIVE_BACKUP_FOLDER_ID doesn't have to be
 * copied by hand out of the browser URL bar.
 * Run from sockacademy/: node scripts/setup/find-gdrive-backup-folder.js
 */
require('dotenv').config();
const { google } = require('googleapis');

async function main() {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON not set in .env');
    process.exit(1);
  }

  const credentials = JSON.parse(saJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });

  console.log(`🔍 Searching folders shared with ${credentials.client_email}...\n`);

  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name, owners(emailAddress), sharedWithMeTime)',
    pageSize: 50,
  });

  const folders = res.data.files || [];
  if (folders.length === 0) {
    console.log('❌ No folders visible to the service account yet.');
    console.log('   Make sure the folder is shared with the service account email above (Editor access).');
    process.exit(0);
  }

  console.log(`Found ${folders.length} folder(s):\n`);
  for (const f of folders) {
    console.log(`📁 "${f.name}"`);
    console.log(`   id: ${f.id}`);
    console.log(`   owner: ${(f.owners || []).map(o => o.emailAddress).join(', ')}`);
    console.log();
  }
}

main().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
