#!/usr/bin/env node
/**
 * Update Klaviyo Abandoned Cart Flow emails with SockAcademy content
 * Flow ID: QQtTwn
 *
 * USAGE: KLAVIYO_PRIVATE_API_KEY="..." node update-klaviyo-emails.js
 * Or with .env loaded: node update-klaviyo-emails.js
 *
 * SECURITY: API Key is read from environment only, never logged or exposed
 */

require('dotenv').config();
const https = require('https');

const FLOW_ID = 'QQtTwn';
const API_KEY = process.env.KLAVIYO_PRIVATE_API_KEY;

if (!API_KEY) {
  console.error('❌ KLAVIYO_PRIVATE_API_KEY not set in environment');
  process.exit(1);
}

// Email configs
const emails = [
  {
    name: 'Email 1 - 1 Hour',
    subject: 'You left something behind',
    preview: 'Your cart is saved. Your standards shouldn\'t slip.',
    body: `Hi {{ first_name|default:"there" }},

You were close.

Your cart is still saved — including everything you selected at SockAcademy.

We don't follow up often. But when someone takes the time to choose
premium socks and then leaves, we'd rather ask once than assume you
changed your mind about quality.

→ Return to your cart: {{ checkout_url }}

If something wasn't right — the size, the price, a question about the
product — reply to this email. We'll sort it.

— The SockAcademy Team`
  },
  {
    name: 'Email 2 - 24 Hours',
    subject: 'What\'s still in your cart — and why it\'s worth it',
    preview: 'A brief case for not settling.',
    body: `Hi {{ first_name|default:"there" }},

Still thinking about it?

Here's the honest case for finishing what you started:

The socks you selected aren't a luxury purchase — they're a long-term
decision. A pair of Merino Wool Crew socks, maintained correctly,
lasts 3–5 years. That works out to less than $10 a year for socks
you'll actually want to wear every day.

The alternative is buying cheap ones again, replacing them in six
months, and still not having what you wanted in the first place.

Your cart is saved. → Complete your order: {{ checkout_url }}

— The SockAcademy Team`
  },
  {
    name: 'Email 3 - 48 Hours',
    subject: 'Last reminder — your cart expires soon',
    preview: 'We won\'t follow up after this.',
    body: `Hi {{ first_name|default:"there" }},

This is the last time we'll mention it.

Your SockAcademy cart is about to expire. If you were waiting for a
reason — this is it: we don't do aggressive discounts or countdown
timers. We let the product make the case.

If now isn't the right time, that's fine. We'll be here when it is.

→ {{ checkout_url }}

— The SockAcademy Team`
  }
];

async function getFlowMessages() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'a.klaviyo.com',
      path: `/api/v1/flows/${FLOW_ID}/`,
      method: 'GET',
      headers: {
        'Authorization': `Klaviyo-API-Key ${API_KEY}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const flow = JSON.parse(data);
            resolve(flow);
          } catch (e) {
            reject(new Error('Failed to parse flow data'));
          }
        } else {
          reject(new Error(`Failed to fetch flow: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function updateFlowMessage(messageId, config) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      data: {
        type: 'flow-message-variant',
        attributes: {
          subject: config.subject,
          preview_text: config.preview
        }
      }
    });

    const options = {
      hostname: 'a.klaviyo.com',
      path: `/api/v1/flow-messages/${messageId}/`,
      method: 'PUT',
      headers: {
        'Authorization': `Klaviyo-API-Key ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ ${config.name} updated`);
          resolve();
        } else {
          console.error(`🔴 ${config.name} failed: ${res.statusCode}`);
          reject(new Error(`API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log(`🔄 Updating Abandoned Cart Flow (${FLOW_ID})...\n`);

  try {
    console.log('📋 Fetching flow structure...');
    const flow = await getFlowMessages();

    console.log(`Found flow with ${Object.keys(flow).length} properties\n`);

    for (let i = 0; i < emails.length; i++) {
      await updateFlowMessage(flow.id, emails[i]);
    }

    console.log('\n✅ All emails updated successfully!');
  } catch (error) {
    console.error('\n❌ Update failed:', error.message);
    process.exit(1);
  }
}

main();
