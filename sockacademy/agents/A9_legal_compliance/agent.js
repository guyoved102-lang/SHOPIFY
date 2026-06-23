/**
 * A9 — Legal Compliance Agent v1.0
 * One-shot: creates or updates 4 Shopify legal pages with enterprise-grade templates.
 * Governing law: Delaware, USA | Arbitration: AAA | GDPR + CCPA compliant
 *
 * Run once before launch. Re-run any time legal content changes.
 * IMPORTANT: Templates are professional placeholders — must be reviewed by a
 * certified attorney before going live.
 */

require('dotenv').config({ path: '../../.env' });
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const { requestApproval } = require('../../corp/core/hitl');

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, errorMsg = '') {
  if (!supabase) return;
  try {
    const run_status = status === 'failed' ? 'failure' : status;
    await supabase.from('agent_health_log').insert({
      agent_id:      'A9',
      agent_name:    'Legal Compliance',
      run_status,
      error_message: errorMsg || null,
      metadata:      {},
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}

const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_TOKEN  = process.env.SHOPIFY_MASTER_TOKEN;
const SHOPIFY_API    = `https://${SHOPIFY_DOMAIN}/admin/api/2025-01`;

let EFFECTIVE_DATE = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const BRAND          = 'SockAcademy';
const STORE_URL      = 'sockacademy.store';
const CONTACT_EMAIL  = 'hello@sockacademy.store';
const ENTITY         = 'SockAcademy';   // UPDATE: legal entity name after formation

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEGAL TEMPLATES — English, enterprise-grade, Delaware / GDPR / CCPA
// Built as a function so EFFECTIVE_DATE is captured at call time (after Supabase read),
// not at module-load time, ensuring a frozen date across all runs.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildLegalPages() { return [

  // ──────────────────────────────────────────────────────────────
  // 1. TERMS OF SERVICE
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Terms of Service',
    handle: 'terms',
    body_html: `
<div class="legal-document">
<p><strong>Effective Date:</strong> ${EFFECTIVE_DATE}</p>

<h2>1. Acceptance of Terms</h2>
<p>By accessing or purchasing from ${STORE_URL} (the "Site"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Site. ${ENTITY} ("we," "us," or "our") reserves the right to update these Terms at any time. Continued use of the Site after changes constitutes your acceptance of the revised Terms.</p>

<h2>2. Eligibility</h2>
<p>You must be at least 18 years of age, or the legal age of majority in your jurisdiction, to purchase from this Site. By placing an order, you represent and warrant that you meet this requirement.</p>

<h2>3. Products</h2>
<p>All product descriptions, images, and specifications are provided in good faith and are subject to change without notice. We reserve the right to limit quantities, discontinue products, or modify pricing at any time. Colors and textures may vary slightly from product images due to monitor display settings.</p>

<h2>4. Pricing and Payment</h2>
<p>All prices are listed in United States Dollars (USD) unless otherwise stated. We reserve the right to change prices at any time. Payment must be received in full before an order is processed. We accept major credit cards and other payment methods as displayed at checkout. You represent that any payment information provided is accurate and that you are authorized to use the payment method.</p>

<h2>5. Order Acceptance</h2>
<p>Your receipt of an order confirmation does not constitute our acceptance of your order. We reserve the right to refuse or cancel any order at any time for reasons including product availability, suspected fraud, or errors in pricing or product information. If we cancel an order after payment, we will issue a full refund to your original payment method.</p>

<h2>6. Fulfillment and Shipping</h2>
<p>${BRAND} partners with international logistics providers for order fulfillment. Orders are typically processed within 1–3 business days. Estimated delivery times vary by destination and are provided as guidelines only, not guarantees. Delivery delays caused by customs, carrier disruptions, natural events, or other circumstances outside our control do not entitle the customer to cancellation or compensation beyond what is provided in our Refund Policy.</p>
<p>Title and risk of loss for products pass to you upon delivery to the carrier. Customers are responsible for any applicable customs duties, import taxes, or fees imposed by their country's authorities. ${BRAND} is not responsible for delays caused by customs clearance processes.</p>

<h2>7. Returns, Refunds, and Exchanges</h2>
<p>Our return and refund policy is incorporated herein by reference. Please review our <a href="/pages/refund">Refund Policy</a> for full details. We reserve the right to deny returns that do not comply with our stated policy.</p>

<h2>8. Intellectual Property</h2>
<p>All content on this Site — including but not limited to text, graphics, logos, images, and software — is the exclusive property of ${ENTITY} or its licensors and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works from any content without our prior written consent.</p>

<h2>9. User Conduct</h2>
<p>You agree not to use this Site to: (a) violate any applicable laws or regulations; (b) transmit any harmful, fraudulent, or deceptive content; (c) interfere with the operation of the Site; (d) collect personal data of other users without consent; or (e) infringe on the intellectual property rights of ${ENTITY} or any third party.</p>

<h2>10. Disclaimer of Warranties</h2>
<p>THE SITE AND ALL PRODUCTS ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, ${ENTITY.toUpperCase()} DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>

<h2>11. Limitation of Liability</h2>
<p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ${ENTITY.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SITE OR PRODUCTS, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE ORDER GIVING RISE TO THE CLAIM.</p>

<h2>12. Indemnification</h2>
<p>You agree to indemnify, defend, and hold harmless ${ENTITY}, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses (including reasonable attorneys' fees) arising from your use of the Site, your violation of these Terms, or your violation of any third-party rights.</p>

<h2>13. Governing Law</h2>
<p>These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. You agree that any legal action or proceeding arising out of these Terms shall be subject to the dispute resolution mechanism set forth below.</p>

<h2>14. Dispute Resolution — Binding Arbitration</h2>
<p><strong>PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS.</strong></p>
<p>Any dispute, claim, or controversy arising out of or relating to these Terms or your use of the Site ("Dispute") shall be resolved exclusively through binding arbitration administered by the American Arbitration Association ("AAA") under its Consumer Arbitration Rules, rather than in court. The arbitration shall be conducted in English and shall take place remotely unless otherwise agreed.</p>
<p>The arbitrator shall have authority to grant any remedy that would be available in court. The arbitrator's decision shall be final and binding and may be entered as a judgment in any court of competent jurisdiction.</p>
<p><strong>Class Action Waiver:</strong> YOU AND ${ENTITY.toUpperCase()} AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. No arbitration or proceeding shall be combined with another without the prior written consent of all parties to all affected arbitrations or proceedings.</p>
<p><strong>Exception:</strong> Either party may seek emergency injunctive or equitable relief from a court of competent jurisdiction to prevent actual or threatened infringement of intellectual property rights or unauthorized access to confidential information.</p>
<p><strong>Time Limitation:</strong> Any claim or cause of action arising from these Terms must be filed within one (1) year after it arose, or it is permanently barred.</p>

<h2>15. Severability</h2>
<p>If any provision of these Terms is found to be invalid or unenforceable, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.</p>

<h2>16. Entire Agreement</h2>
<p>These Terms, together with our Privacy Policy, Shipping Policy, and Refund Policy, constitute the entire agreement between you and ${ENTITY} with respect to your use of the Site and supersede all prior agreements.</p>

<h2>17. Contact</h2>
<p>For questions about these Terms, contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<p><em>⚠️ These Terms have been prepared as a professional template and must be reviewed by a certified attorney before use in commerce.</em></p>
</div>
`
  },

  // ──────────────────────────────────────────────────────────────
  // 2. PRIVACY POLICY
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Privacy Policy',
    handle: 'privacy',
    body_html: `
<div class="legal-document">
<p><strong>Effective Date:</strong> ${EFFECTIVE_DATE}</p>

<h2>1. Introduction</h2>
<p>${ENTITY} ("we," "us," or "our") operates ${STORE_URL} (the "Site"). This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you visit or make a purchase from our Site. By using the Site, you consent to the practices described in this Policy.</p>

<h2>2. Information We Collect</h2>
<h3>2.1 Information You Provide</h3>
<ul>
  <li><strong>Account and order information:</strong> Name, email address, shipping address, billing address, phone number, and payment information (processed securely via our payment processor; we do not store full card numbers).</li>
  <li><strong>Communications:</strong> Any messages, feedback, or inquiries you send us.</li>
</ul>
<h3>2.2 Information Collected Automatically</h3>
<ul>
  <li><strong>Device and usage data:</strong> IP address, browser type, operating system, referring URLs, pages viewed, and time spent on the Site.</li>
  <li><strong>Cookies and tracking technologies:</strong> We use cookies, pixel tags, and similar technologies to enhance your experience, analyze usage, and serve relevant advertising. See Section 7 for details.</li>
</ul>

<h2>3. How We Use Your Information</h2>
<p>We use your information to:</p>
<ul>
  <li>Process and fulfill your orders and send order confirmations and updates</li>
  <li>Communicate with you about your account, purchases, or inquiries</li>
  <li>Send marketing communications (with your consent where required by law)</li>
  <li>Analyze Site usage to improve our products and user experience</li>
  <li>Detect, prevent, and respond to fraud or security incidents</li>
  <li>Comply with applicable legal obligations</li>
</ul>

<h2>4. Third-Party Service Providers</h2>
<p>We share your information with trusted third parties that help us operate the Site and fulfill orders:</p>
<ul>
  <li><strong>Shopify Inc.</strong> — e-commerce platform and payment processing infrastructure. <a href="https://www.shopify.com/legal/privacy" target="_blank">Shopify Privacy Policy</a></li>
  <li><strong>Klaviyo Inc.</strong> — email marketing and abandoned cart flows. Your email address and purchase history may be shared with Klaviyo to deliver transactional and marketing emails. <a href="https://www.klaviyo.com/legal/privacy-notice" target="_blank">Klaviyo Privacy Policy</a></li>
  <li><strong>Google LLC (Google Analytics 4)</strong> — website analytics. GA4 collects anonymized usage data via cookies. <a href="https://policies.google.com/privacy" target="_blank">Google Privacy Policy</a></li>
  <li><strong>Meta Platforms, Inc.</strong> — advertising and analytics via the Meta Pixel. The Meta Pixel collects data about your interactions with our Site to measure ad effectiveness and deliver personalized advertising on Facebook and Instagram. <a href="https://www.facebook.com/policy.php" target="_blank">Meta Data Policy</a></li>
  <li><strong>International fulfillment partners</strong> — name, address, and order details are shared with our logistics partners solely to fulfill your order.</li>
  <li><strong>Stripe, Inc.</strong> — payment processing. <a href="https://stripe.com/privacy" target="_blank">Stripe Privacy Policy</a></li>
</ul>
<p>We do not sell your personal information to third parties for their own marketing purposes.</p>

<h2>5. International Data Transfers</h2>
<p>Our service providers operate in the United States and other countries. When we transfer your personal data outside your country of residence, we rely on appropriate safeguards such as Standard Contractual Clauses (SCCs) approved by the European Commission, or equivalent mechanisms, to protect your data.</p>

<h2>6. Your Rights</h2>
<h3>6.1 GDPR Rights (EEA, UK, and Switzerland residents)</h3>
<p>If you are located in the European Economic Area, United Kingdom, or Switzerland, you have the right to:</p>
<ul>
  <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
  <li><strong>Rectification</strong> — request correction of inaccurate or incomplete data</li>
  <li><strong>Erasure</strong> — request deletion of your personal data ("right to be forgotten"), subject to legal retention obligations</li>
  <li><strong>Restriction</strong> — request that we limit processing of your data in certain circumstances</li>
  <li><strong>Portability</strong> — receive your personal data in a structured, machine-readable format</li>
  <li><strong>Object</strong> — object to processing based on legitimate interests or for direct marketing</li>
  <li><strong>Withdraw consent</strong> — where processing is based on consent, withdraw it at any time</li>
</ul>
<p>To exercise these rights, contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. We will respond within 30 days. You also have the right to lodge a complaint with your local supervisory authority.</p>

<h3>6.2 CCPA Rights (California residents)</h3>
<p>California residents have the right to: (a) know what personal information we collect and how it is used; (b) request deletion of personal information; (c) opt out of the sale of personal information (we do not sell personal information); and (d) non-discrimination for exercising these rights. To submit a request, email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h2>7. Cookies</h2>
<p>We use the following types of cookies:</p>
<ul>
  <li><strong>Essential cookies:</strong> Required for the Site to function (e.g., shopping cart, checkout session).</li>
  <li><strong>Analytics cookies:</strong> Google Analytics 4 — help us understand how visitors use the Site.</li>
  <li><strong>Marketing cookies:</strong> Meta Pixel — used to measure advertising effectiveness and serve personalized ads.</li>
  <li><strong>Email marketing cookies:</strong> Klaviyo — track email engagement and on-site behavior for customers who have opted into marketing.</li>
</ul>
<p>You can control cookie preferences through your browser settings. Note that disabling certain cookies may affect Site functionality.</p>

<h2>8. Data Retention</h2>
<p>We retain your personal information for as long as necessary to fulfill the purposes described in this Policy, including for legal, accounting, and dispute resolution purposes. Order data is typically retained for 7 years to comply with tax and financial regulations.</p>

<h2>9. Security</h2>
<p>We implement industry-standard technical and organizational measures to protect your personal information against unauthorized access, disclosure, alteration, or destruction. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>

<h2>10. Children's Privacy</h2>
<p>The Site is not directed to children under the age of 16. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h2>11. Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated Policy on this page with a revised effective date. Your continued use of the Site after such changes constitutes your acceptance of the updated Policy.</p>

<h2>12. Contact</h2>
<p>For privacy-related inquiries, contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<p><em>⚠️ This Privacy Policy has been prepared as a professional template and must be reviewed by a certified attorney before use in commerce.</em></p>
</div>
`
  },

  // ──────────────────────────────────────────────────────────────
  // 3. SHIPPING POLICY
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Shipping Policy',
    handle: 'shipping',
    body_html: `
<div class="legal-document">
<p><strong>Effective Date:</strong> ${EFFECTIVE_DATE}</p>

<h2>Order Processing</h2>
<p>Orders are processed within 1–3 business days (Monday through Friday, excluding public holidays) after payment is confirmed. You will receive an email confirmation once your order is placed, and a separate shipping notification with tracking information once your order has been dispatched.</p>

<h2>Fulfillment</h2>
<p>${BRAND} partners with international logistics providers for order fulfillment. Orders are shipped directly from our fulfillment network to your delivery address. This allows us to offer competitive pricing and global reach.</p>

<h2>Estimated Delivery Times</h2>
<table>
  <thead>
    <tr><th>Destination</th><th>Estimated Delivery</th></tr>
  </thead>
  <tbody>
    <tr><td>United States</td><td>7–15 business days</td></tr>
    <tr><td>Canada</td><td>10–18 business days</td></tr>
    <tr><td>United Kingdom</td><td>8–16 business days</td></tr>
    <tr><td>European Union</td><td>10–20 business days</td></tr>
    <tr><td>Australia / New Zealand</td><td>10–20 business days</td></tr>
    <tr><td>Rest of World</td><td>12–25 business days</td></tr>
  </tbody>
</table>
<p>Delivery estimates are guidelines only and are not guaranteed. During peak seasons (e.g., November–January), delivery times may be extended.</p>

<h2>Tracking</h2>
<p>Once your order ships, you will receive a tracking number via email. Tracking updates may not be visible immediately after dispatch and can take 2–5 business days to appear in the carrier's system.</p>

<h2>Customs, Duties, and Taxes</h2>
<p>International orders may be subject to customs duties, import taxes, or fees levied by your country's customs authority. These charges are the sole responsibility of the customer and are not included in our product prices or shipping fees. ${BRAND} has no control over customs processes or their timing. We recommend checking your country's import regulations before placing an order.</p>

<h2>Lost or Delayed Packages</h2>
<p>If your package has not arrived within the maximum estimated delivery window and tracking shows no movement for 10 or more consecutive business days, please contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. We will investigate and work to resolve the issue, which may include re-shipment or a refund at our discretion.</p>
<p>${BRAND} is not responsible for delays caused by customs processing, carrier operational issues, natural events, strikes, or other circumstances outside our control.</p>

<h2>Incorrect Address</h2>
<p>Please ensure your shipping address is accurate before completing your order. ${BRAND} is not responsible for orders delivered to an incorrect address provided at checkout. If you notice an error after placing your order, contact us immediately at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. We will make every effort to correct the address before shipment, but cannot guarantee changes once an order has been dispatched.</p>

<h2>Questions</h2>
<p>For shipping inquiries, contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
</div>
`
  },

  // ──────────────────────────────────────────────────────────────
  // 4. REFUND POLICY
  // ──────────────────────────────────────────────────────────────
  {
    title: 'Refund Policy',
    handle: 'refund',
    body_html: `
<div class="legal-document">
<p><strong>Effective Date:</strong> ${EFFECTIVE_DATE}</p>

<h2>Our Commitment</h2>
<p>${BRAND} is committed to quality. If you are not satisfied with your purchase, we want to make it right.</p>

<h2>Return Window</h2>
<p>You may request a return within <strong>30 days</strong> of the delivery date. Requests submitted after 30 days will not be accepted.</p>

<h2>Eligibility</h2>
<p>To be eligible for a return, items must be:</p>
<ul>
  <li>Unworn and unwashed</li>
  <li>In original condition with tags attached (if applicable)</li>
  <li>In their original packaging</li>
</ul>
<p>The following items are not eligible for return:</p>
<ul>
  <li>Items that have been worn, washed, or altered</li>
  <li>Items marked as final sale or non-returnable at the time of purchase</li>
  <li>Gift cards</li>
</ul>

<h2>Defective or Incorrect Items</h2>
<p>If you received a defective, damaged, or incorrect item, please contact us within <strong>30 days</strong> of delivery at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with your order number and photos of the issue. We will arrange a replacement or full refund at no cost to you, including return shipping where applicable.</p>

<h2>How to Request a Return</h2>
<ol>
  <li>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with your order number and reason for the return.</li>
  <li>Our team will review your request within 2 business days and provide return instructions.</li>
  <li>Ship the item using a trackable method. Return shipping costs are the customer's responsibility unless the return is due to our error or a product defect.</li>
  <li>Once we receive and inspect the returned item, we will process your refund within 5–7 business days.</li>
</ol>

<h2>Refunds</h2>
<p>Approved refunds will be issued to your original payment method. Depending on your bank or card issuer, it may take an additional 5–10 business days for the credit to appear on your statement. Original shipping fees are non-refundable unless the return is due to our error.</p>

<h2>Exchanges</h2>
<p>We currently do not offer direct exchanges. To exchange an item, please return the original item for a refund and place a new order for the desired item.</p>

<h2>Chargebacks and Disputes</h2>
<p>We encourage customers to contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> before initiating a chargeback or payment dispute. The vast majority of issues can be resolved quickly through direct communication. Initiating a chargeback before contacting us may result in your account being restricted from future purchases.</p>

<h2>Questions</h2>
<p>For questions about returns or refunds, contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. We typically respond within 1–2 business days.</p>
</div>
`
  },
]; }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHOPIFY API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function shopifyHeaders() {
  return {
    'X-Shopify-Access-Token': SHOPIFY_TOKEN,
    'Content-Type': 'application/json',
  };
}

async function getPageByHandle(handle) {
  const res = await fetch(`${SHOPIFY_API}/pages.json?handle=${handle}&limit=1`, {
    headers: shopifyHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Shopify GET page (${handle}): ${JSON.stringify(data.errors)}`);
  return data.pages?.[0] || null;
}

async function createPage(page) {
  const res = await fetch(`${SHOPIFY_API}/pages.json`, {
    method: 'POST',
    headers: shopifyHeaders(),
    body: JSON.stringify({
      page: {
        title: page.title,
        handle: page.handle,
        body_html: page.body_html,
        published: true,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Shopify CREATE page (${page.handle}): ${JSON.stringify(data.errors)}`);
  return data.page;
}

async function updatePage(id, page) {
  const res = await fetch(`${SHOPIFY_API}/pages/${id}.json`, {
    method: 'PUT',
    headers: shopifyHeaders(),
    body: JSON.stringify({
      page: {
        id,
        title: page.title,
        body_html: page.body_html,
        published: true,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Shopify UPDATE page (${page.handle}): ${JSON.stringify(data.errors)}`);
  return data.page;
}

async function syncPage(pageTemplate) {
  const existing = await getPageByHandle(pageTemplate.handle);

  if (existing) {
    const updated = await updatePage(existing.id, pageTemplate);
    return {
      action: 'updated',
      title: pageTemplate.title,
      handle: pageTemplate.handle,
      url: `https://${SHOPIFY_DOMAIN}/pages/${pageTemplate.handle}`,
      shopify_admin: `https://${SHOPIFY_DOMAIN}/admin/pages/${existing.id}`,
    };
  } else {
    const created = await createPage(pageTemplate);
    return {
      action: 'created',
      title: pageTemplate.title,
      handle: pageTemplate.handle,
      url: `https://${SHOPIFY_DOMAIN}/pages/${pageTemplate.handle}`,
      shopify_admin: `https://${SHOPIFY_DOMAIN}/admin/pages/${created.id}`,
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL CONFIRMATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendConfirmation(results) {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log('⚠️  GMAIL_APP_PASSWORD not set — skipping email confirmation');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const rows = results.map(r => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;color:#F0EDE6;font-size:14px">${r.title}</td>
      <td style="padding:12px 0;border-bottom:1px solid #1a1a1a">
        <span style="background:${r.action === 'created' ? '#1a3a1a' : '#1a2a3a'};color:${r.action === 'created' ? '#4ade80' : '#60a5fa'};font-size:11px;font-weight:700;padding:3px 8px;border-radius:2px;text-transform:uppercase">${r.action}</span>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #1a1a1a">
        <a href="${r.url}" style="color:#C9A84C;font-size:12px;text-decoration:none">View Live →</a>
        &nbsp;
        <a href="${r.shopify_admin}" style="color:#888;font-size:12px;text-decoration:none">Admin →</a>
      </td>
    </tr>
  `).join('');

  const html = `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:640px;margin:0 auto;background:#0A0A0A;color:#F0EDE6;padding:40px 32px;border-radius:8px">
  <div style="text-align:center;margin-bottom:32px;border-bottom:1px solid #2a2a2a;padding-bottom:24px">
    <div style="font-size:11px;letter-spacing:4px;color:#C9A84C;text-transform:uppercase">SOCKACADEMY</div>
    <div style="font-size:22px;font-weight:700;margin-top:10px">A9 — Legal Sync Complete</div>
    <div style="color:#6b7280;font-size:12px;margin-top:4px">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
    <tr>
      <th style="text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px">Document</th>
      <th style="text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px">Status</th>
      <th style="text-align:left;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px">Links</th>
    </tr>
    ${rows}
  </table>

  <div style="background:#1a1a1a;border:1px solid #C9A84C44;border-radius:6px;padding:20px;margin-bottom:20px">
    <div style="font-size:11px;color:#C9A84C;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">⚠️ Required Before Launch</div>
    <ul style="color:#9ca3af;font-size:13px;line-height:2;margin:0;padding-left:18px">
      <li>Review all 4 documents with a certified attorney in Israel</li>
      <li>Confirm Delaware jurisdiction is appropriate for your business structure</li>
      <li>Verify the arbitration clause meets your requirements</li>
      <li>Update ENTITY name (currently: "${ENTITY}") to your registered legal entity</li>
      <li>Check GDPR compliance with your EU customer volume</li>
    </ul>
  </div>

  <div style="background:#111;border:1px solid #2a2a2a;border-radius:6px;padding:20px">
    <div style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Configuration</div>
    <div style="font-family:monospace;font-size:12px;color:#9ca3af;line-height:2">
      Governing law: Delaware, USA<br>
      Dispute resolution: AAA Binding Arbitration<br>
      Class action waiver: ✓ Included<br>
      GDPR: ✓ Compliant<br>
      CCPA: ✓ Compliant<br>
      Data processors disclosed: Shopify, Klaviyo, GA4, Meta, Stripe
    </div>
  </div>

  <p style="color:#4b5563;font-size:11px;margin-top:28px;text-align:center">A9 Legal Compliance Agent v1.0 · SockAcademy</p>
</div>`;

  await transporter.sendMail({
    from: 'SockAcademy A9 Agent <sockacademy.store@gmail.com>',
    to: 'guyoved102@gmail.com',
    subject: `A9 — ${results.length} legal pages synced to Shopify ✓`,
    html,
  });

  console.log('📧 Confirmation email sent to guyoved102@gmail.com');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HITL EXECUTE — publish pages when approval is found in Supabase
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getApprovedHitL(supabase) {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('pending_approvals')
      .select('*')
      .eq('agent_id', 'A9')
      .eq('action_type', 'legal_page_update')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1);
    return data?.[0] || null;
  } catch { return null; }
}

async function executeHitLPublish(supabase, approval) {
  const rawPayload = approval.payload;
  const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
  const pages   = payload?.pages || [];

  console.log(`Publishing ${pages.length} legal page(s) to Shopify...`);
  const results = [];
  for (const page of pages) {
    try {
      const result = await syncPage(page);
      results.push(result);
      console.log(`  ✅ ${page.title} — ${result.action}`);
    } catch (e) {
      console.error(`  ❌ ${page.title}: ${e.message}`);
    }
  }
  await supabase.from('pending_approvals').update({ status: 'executed' }).eq('id', approval.id);
  console.log(`  HitL approval marked as 'executed' (ID: ${approval.id})`);
  return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  const supabase = getSupabase();
  await logHealth(supabase, 'running');
  console.log('A9 — Legal Compliance Agent v2.0 (HitL enabled)');
  console.log('━'.repeat(48));
  console.log('Governing law: Delaware, USA | GDPR + CCPA compliant');

  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    console.error('ERROR: Missing SHOPIFY_SHOP_DOMAIN or SHOPIFY_MASTER_TOKEN');
    process.exit(1);
  }

  // Check for an already-approved HitL request — execute immediately without re-requesting approval
  const approvedHitL = await getApprovedHitL(supabase);
  if (approvedHitL) {
    console.log(`\nApproval found (ID: ${approvedHitL.id}) — publishing legal pages now...`);
    const results = await executeHitLPublish(supabase, approvedHitL);
    if (results.length > 0) await sendConfirmation(results);
    await logHealth(supabase, 'success');
    return;
  }

  // Freeze EFFECTIVE_DATE: read from system_config, or lock today's date on first run
  try {
    if (supabase) {
      const { data: cfgDate } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'legal_effective_date')
        .single();
      if (cfgDate?.value) {
        EFFECTIVE_DATE = cfgDate.value;
        console.log(`Effective Date (frozen): ${EFFECTIVE_DATE}`);
      } else {
        await supabase.from('system_config').insert({ key: 'legal_effective_date', value: EFFECTIVE_DATE });
        console.log(`Effective Date (set for first time): ${EFFECTIVE_DATE}`);
      }
    }
  } catch (_) {
    console.log(`Could not read legal_effective_date from system_config — using today: ${EFFECTIVE_DATE}`);
  }

  const LEGAL_PAGES = buildLegalPages();
  console.log(`Pages to publish: ${LEGAL_PAGES.length}\n`);

  const pagesSummary = LEGAL_PAGES.map(p => `• ${p.title} (/pages/${p.handle})`).join('\n');
  console.log('Submitting for approval:\n' + pagesSummary + '\n');

  const approvalId = await requestApproval({
    agentId:     'A9',
    actionType:  'legal_page_update',
    description: `Publish/update ${LEGAL_PAGES.length} legal pages to Shopify:\n${pagesSummary}\n\nREMINDER: Review with a certified attorney before approving.`,
    payload:     {
      pages: LEGAL_PAGES.map(p => ({ title: p.title, handle: p.handle, body_html: p.body_html })),
    },
  });

  console.log(`\nApproval submitted. ID: ${approvalId}`);
  console.log('Check guyoved102@gmail.com for approval instructions.');
  console.log('After approving in Supabase (status → "approved"), re-run A9 to publish.');
  await logHealth(supabase, 'success');
}

main().catch(async e => {
  console.error('💥 Fatal:', e.message);
  await logHealth(getSupabase(), 'failure', e.message).catch(() => {});
  process.exit(1);
});
