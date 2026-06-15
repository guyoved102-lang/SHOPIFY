const fs = require('fs');
const path = require('path');

const TOKEN = 'process.env.SHOPIFY_MASTER_TOKEN';
const STORE = '11eqwi-ji.myshopify.com';
const THEME_ID = '151789863110';
const THEME_DIR = __dirname;

const FOLDERS = ['layout', 'templates', 'sections', 'snippets', 'assets', 'config', 'locales'];
const SKIP_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];

async function pushAsset(key, content, isBinary = false) {
  const body = isBinary
    ? JSON.stringify({ asset: { key, attachment: content } })
    : JSON.stringify({ asset: { key, value: content } });

  const res = await fetch(`https://${STORE}/admin/api/2024-01/themes/${THEME_ID}/assets.json`, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body,
  });

  if (res.ok) {
    process.stdout.write(`✓ ${key}\n`);
  } else {
    const err = await res.text();
    process.stdout.write(`✗ ${key}: ${res.status} ${err.slice(0, 100)}\n`);
  }
}

async function pushAll() {
  const files = [];

  for (const folder of FOLDERS) {
    const folderPath = path.join(THEME_DIR, folder);
    if (!fs.existsSync(folderPath)) continue;

    const walkDir = (dir, base) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        const key = path.join(base, entry.name).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          walkDir(fullPath, key);
        } else {
          files.push({ fullPath, key });
        }
      }
    };

    walkDir(folderPath, folder);
  }

  console.log(`Pushing ${files.length} files to Shopify theme #${THEME_ID}...\n`);

  for (const { fullPath, key } of files) {
    const ext = path.extname(key).toLowerCase();
    if (SKIP_EXT.includes(ext)) {
      // Push binary as base64
      const data = fs.readFileSync(fullPath);
      const b64 = data.toString('base64');
      await pushAsset(key, b64, true);
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      await pushAsset(key, content, false);
    }
    await new Promise(r => setTimeout(r, 200)); // rate limit
  }

  console.log('\n✅ Theme push complete!');
}

pushAll().catch(console.error);
