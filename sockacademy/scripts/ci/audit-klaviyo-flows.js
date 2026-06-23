#!/usr/bin/env node
/**
 * Audit all Klaviyo flows and their content
 * Shows what needs to be updated
 */

require('dotenv').config();
const https = require('https');

const API_KEY = process.env.KLAVIYO_PRIVATE_API_KEY;

if (!API_KEY) {
  console.error('❌ KLAVIYO_PRIVATE_API_KEY not set');
  process.exit(1);
}

async function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'a.klaviyo.com',
      path,
      method,
      headers: {
        'Authorization': `Klaviyo-API-Key ${API_KEY}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`API error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('🔍 Auditing all Klaviyo Flows...\n');

    // Get all flows
    const flowsData = await makeRequest('/api/v1/flows/');
    const flows = flowsData.data || [];

    console.log(`Found ${flows.length} flows:\n`);

    for (const flow of flows) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📧 ${flow.name} (${flow.id})`);
      console.log(`   Status: ${flow.status}`);
      console.log(`   Trigger: ${flow.trigger_type}`);

      // Get flow details
      try {
        const flowDetail = await makeRequest(`/api/v1/flows/${flow.id}/`);

        // Show revision info
        if (flowDetail.data && flowDetail.data.revisions) {
          console.log(`   Revisions: ${flowDetail.data.revisions.length}`);

          for (const revision of flowDetail.data.revisions) {
            console.log(`\n   📝 Revision ${revision.id}:`);
            console.log(`      Created: ${revision.created_at}`);

            if (revision.flow_messages && revision.flow_messages.length > 0) {
              console.log(`      Messages: ${revision.flow_messages.length}`);

              for (let i = 0; i < revision.flow_messages.length; i++) {
                const msg = revision.flow_messages[i];
                console.log(`\n      [${i + 1}] ${msg.name}`);
                if (msg.subject) console.log(`          Subject: "${msg.subject}"`);
                if (msg.preview_text) console.log(`          Preview: "${msg.preview_text}"`);
              }
            }
          }
        }
      } catch (e) {
        console.log(`   ⚠️  Could not fetch details: ${e.message}`);
      }

      console.log();
    }

    console.log('✅ Audit complete!');
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    process.exit(1);
  }
}

main();
