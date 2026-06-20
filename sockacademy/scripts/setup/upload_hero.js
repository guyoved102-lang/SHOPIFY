const fs = require('fs');
const path = require('path');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || '11eqwi-ji.myshopify.com';
const SHOPIFY_TOKEN = process.env.SHOPIFY_MASTER_TOKEN;
const IMAGE_PATH = path.join(__dirname, 'hero_banner.png');

async function graphql(query, variables = {}) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function uploadHero() {
  const fileBuffer = fs.readFileSync(IMAGE_PATH);
  const fileSize = fileBuffer.length;

  console.log(`Image size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

  // Step 1: Request staged upload target
  const stagedRes = await graphql(`
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters { name value }
        }
        userErrors { field message }
      }
    }
  `, {
    input: [{
      filename: 'sockacademy-hero-banner.png',
      mimeType: 'image/png',
      resource: 'FILE',
      fileSize: String(fileSize),
    }]
  });

  const errors = stagedRes.data?.stagedUploadsCreate?.userErrors;
  if (errors?.length) { console.error('Stage errors:', errors); process.exit(1); }

  const target = stagedRes.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target) { console.error('No target:', JSON.stringify(stagedRes)); process.exit(1); }

  console.log('Got staged URL. Uploading...');

  // Step 2: Upload using native FormData (Node 18+)
  const formData = new FormData();
  for (const { name, value } of target.parameters) {
    formData.append(name, value);
  }
  formData.append(
    'file',
    new Blob([fileBuffer], { type: 'image/png' }),
    'sockacademy-hero-banner.png'
  );

  const uploadRes = await fetch(target.url, { method: 'POST', body: formData });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    console.error('Upload HTTP error:', uploadRes.status, text.slice(0, 600));
    process.exit(1);
  }
  console.log('Staged upload complete. Status:', uploadRes.status);

  // Step 3: Finalize in Shopify
  const createRes = await graphql(`
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          ... on MediaImage { id image { url } }
          ... on GenericFile { id url }
        }
        userErrors { field message }
      }
    }
  `, {
    files: [{
      originalSource: target.resourceUrl,
      contentType: 'IMAGE',
    }]
  });

  const createErrors = createRes.data?.fileCreate?.userErrors;
  if (createErrors?.length) { console.error('fileCreate errors:', createErrors); process.exit(1); }

  const file = createRes.data?.fileCreate?.files?.[0];
  const url = file?.image?.url || file?.url || '(processing — check Shopify Files)';

  console.log('\n✅ SUCCESS');
  console.log('File ID:', file?.id);
  console.log('URL:', url);
}

uploadHero().catch(e => { console.error(e); process.exit(1); });
