/**
 * One-time script: publish MG-1-FINAL.md (Merino Guide) as a live Shopify blog article.
 * Run once: node sockacademy/scripts/setup/publish-mg1-article.js
 */

require('dotenv').config({ path: '../../.env' });

const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_MASTER_TOKEN;
const BLOG_ID = process.env.BLOG_ID;

if (!SHOPIFY_DOMAIN) { console.error('❌ SHOPIFY_SHOP_DOMAIN not set'); process.exit(1); }
if (!SHOPIFY_TOKEN) { console.error('❌ SHOPIFY_MASTER_TOKEN not set'); process.exit(1); }
if (!BLOG_ID) { console.error('❌ BLOG_ID not set'); process.exit(1); }

async function shopifyRequest(method, path, body = null) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2025-01/${path}`, {
    method,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Shopify ${path}: ${JSON.stringify(data.errors || data)}`);
  return data;
}

const TITLE = 'The Complete Guide to Merino Wool';
const HANDLE = 'the-complete-guide-to-merino-wool';

const BODY_HTML = `
<p>Wool is not a uniform material. It is a fiber whose properties change measurably with the diameter of a single strand, and that diameter is what separates a garment that performs from one that merely claims to.</p>

<h2>The Biology of Merino — Why 18.5μ Is the Standard</h2>

<p>The unit of measurement is the micron — one-thousandth of a millimeter. A human hair measures approximately 70 microns across. Merino wool, depending on the animal, the region, and the age at shearing, ranges from under 15 microns to over 24. This range is the entire story of why one Merino product feels transformative and another, labeled identically, does not.</p>

<p>At the skin level, the mechanism is mechanical, not subjective. Human skin contains nociceptors — nerve endings that register pressure and, at sufficient force, discomfort. A wool fiber above approximately 30 microns is stiff enough that its cut ends, however fine, press against these receptors and register as itch. This is the sensation most people associate with "wool" as a category, and it is the reason an entire generation avoided the fiber entirely. It is not an allergy. It is physics.</p>

<p>Below 18.5 microns, the fiber becomes pliable enough that it bends against the skin rather than pressing into it. The nociceptor threshold is not reached. This is the basis for what the textile industry classifies as "fine" wool, and it is the reason 18.5 microns functions as a meaningful line rather than an arbitrary marketing number. Fiber measurably finer than this — in the 15-micron range and below — exists, but trades comfort gains against reduced tensile strength, requiring higher synthetic reinforcement to survive daily wear. The 18.5-micron threshold is where softness and structural durability are both still intact. It is an engineering compromise, not a luxury flourish.</p>

<p>Micron count is not measured by inspection. It is measured by an Optical Fibre Diameter Analyser, a laboratory instrument that scans a fiber sample and produces a distribution — not a single number, but a curve. A batch described as "18.5 microns" has a mean, and a manufacturer's willingness to disclose the full distribution, not just the average, is itself a signal of whether the claim can be trusted. A tight distribution around 18.5μ behaves consistently. A wide distribution with the same average contains fibers coarse enough to trigger the exact discomfort the specification claims to eliminate.</p>

<p>The second property, distinct from softness, is thermal behavior — and this is where Merino separates from both cotton and synthetic fiber at a structural level. Wool's cortex, the fiber's internal protein structure, is hygroscopic: it absorbs atmospheric moisture into the fiber itself, not merely across its surface. A Merino fiber can absorb up to roughly a third of its own dry weight in moisture vapor before the wearer perceives any dampness. This absorption is not passive. As water vapor molecules bond to the fiber's protein structure, a measurable exothermic reaction releases a small quantity of heat — the fiber generates warmth as it absorbs moisture, and reverses the process, releasing heat as the fiber dries. This is fundamentally different from wicking, the mechanism synthetic fibers rely on, which moves surface moisture along a fiber's exterior without any absorption or thermal exchange at all.</p>

<p>This is the foundation of the claim that matters most to us: a foot is a high-moisture, high-friction environment, and the fiber surrounding it should be doing active work, not simply sitting inert. Cotton absorbs moisture and holds it, becoming heavier and colder against the skin. Synthetic fiber moves moisture away but generates no thermal regulation and provides the bacteria-friendly environment that produces odor within hours. Merino, correctly specified below 18.5 microns and correctly constructed, does both: it manages moisture at the fiber level and remains dry-feeling and temperature-stable in a way neither alternative achieves.</p>

<p>This is the standard against which every material decision in this guide is measured. It is also the first specification we require in writing from any manufacturer under consideration.</p>

<h2>The Science of Foot Health — Moisture Managed at the Fiber, Not the Surface</h2>

<p>The foot is the body's most demanding textile environment: roughly 250,000 sweat glands per pair, enclosed in a shoe for eight to twelve hours, generating up to half a pint of moisture on an active day. Whatever fiber sits against that skin determines whether the day ends in comfort or in the specific discomfort of a damp, cooling sock.</p>

<p>Synthetic fiber addresses this problem at the surface. Wicking moves liquid moisture along the exterior of the fiber, away from the skin — a mechanical transport process that does nothing to the water itself. Cotton addresses it not at all: cotton absorbs moisture into a hollow fiber structure and holds it there, which is why a cotton sock becomes heavier, colder, and slower to dry as the day progresses.</p>

<p>Merino is the only one of the three that manages moisture from inside the fiber. Its cortex is hygroscopic — a protein structure capable of absorbing atmospheric moisture vapor directly into the fiber, before it condenses into liquid sweat on the skin. This is a chemical and thermal process, not a mechanical one. As vapor bonds to the fiber's protein chains, a measurable exothermic reaction occurs, releasing warmth. As the fiber later releases that moisture, the reverse — an endothermic, cooling reaction — occurs. The fiber is not passive. It participates in regulating the microclimate against the skin in both directions.</p>

<p>This is why we do not describe our product as "moisture-wicking," a term that would be technically true but would understate what the fiber does. Wicking is what a shirt sold at a gas station claims. Absorption, phase-change, and thermal buffering are what a fiber engineered at 18.5 microns and knitted at 200-needle gauge actually performs. This is the standard we hold every specification to — and the reason foot health sits at the center of our material philosophy: the product is doing structural, measurable work, not making a comfort claim we cannot defend.</p>

<h2>The Certification Gap — Why "Certified" Is the Only Word That Means Anything</h2>

<p>Three certification systems govern the wool and textile industry, and they answer three different questions. Conflating them is how most brands mislead — not through false claims, but through certifications that sound equivalent and are not.</p>

<p><strong>ZQ Merino</strong> (New Zealand Merino Company) certifies fiber quality and farm-level animal welfare: micron count by lot, mulesing-free practice, and land stewardship, with a documented chain from farm to garment. It is the only program that ties a specific micron specification back to a traceable source.</p>

<p><strong>Responsible Wool Standard (RWS)</strong> certifies animal welfare and land management. It says nothing about fiber diameter. A garment can carry RWS certification and still contain 24-micron wool — ethically sourced, but not fine enough to avoid the itch threshold this guide opened with.</p>

<p><strong>OEKO-TEX Standard 100</strong> certifies chemical safety — the absence of harmful substances in the finished textile. It says nothing about fiber origin, animal welfare, or micron count at all.</p>

<p>A brand can hold any one of these and describe its product as "certified" without disclosing which standard, or what that standard actually governs. This is the gap we require our suppliers to close in writing: not "certified," but certified to which standard, verifying which claim. We require ZQ documentation specifically, because it is the only certification that validates the number this entire guide is built around — 18.5 microns, traceable to a named source. RWS and OEKO-TEX compliance are requested in addition, not instead.</p>

<h2>The Durability Myth — Engineering Around Merino's One Real Weakness</h2>

<p>Merino's reputation for fragility is not a myth in the sense of being false — it is a myth in the sense of being incomplete. Pure, unreinforced Merino wool at 18.5 microns is genuinely less abrasion-resistant than synthetic fiber at the specific points where a sock experiences the most repetitive mechanical stress: the heel strike and the toe push-off. Reporting this and stopping there is how most technical descriptions of Merino end. It is also where the useful engineering begins.</p>

<p>The fiber science bears this out directly. A wool fiber can be flexed roughly 20,000 times before breaking, compared to about 3,200 cycles for cotton. That is not a weak fiber — it is a strong fiber undergoing more mechanical stress in a shoe than it would in almost any other application. The solution is not a different fiber. It is a different ratio in a different location.</p>

<p>An 80/20 Merino-to-nylon blend — full Merino through the leg and foot for softness and thermal performance, nylon reinforcement concentrated in the heel and toe — is not a compromise on the material claim. It is where knitting engineering, not fiber substitution, does the work: at 200-needle gauge, this ratio is what allows a sock to sustain in excess of 10,000 Martindale abrasion cycles in high-wear zones, well above the 8,000-cycle minimum we require of any supplier as a baseline. The nylon is not there because the wool failed. It is there because a sock, unlike a sweater, spends its life being stepped on.</p>

<h2>The Academy Care Protocol — Maintaining the Fiber Correctly</h2>

<p>A correctly specified Merino sock can last years. An incorrectly washed one will not survive a season, regardless of what it was made from. The failure, when it happens, is almost always a laundering error, not a manufacturing one.</p>

<p><strong>Wash cold, on a wool or delicate cycle.</strong> Superwash treatment — a bio-enzymatic process that smooths the fiber's outer scales — is what makes machine washing possible at all. It is not a license to wash Merino the way one washes cotton. Heat accelerates felting even on Superwash-treated fiber; 30°C is the ceiling, not a suggestion.</p>

<p><strong>Do not use fabric softener.</strong> Softener coats the fiber in a residue that blocks the hygroscopic exchange this entire guide describes. A softened Merino sock still looks like Merino. It no longer performs like it.</p>

<p><strong>Dry flat, away from direct heat.</strong> Tumble drying is the single most common cause of premature shrinkage in wool product, Superwash-treated or not. Flat drying preserves both dimensional stability and the fiber's natural loft.</p>

<p><strong>Rotate, do not repeat.</strong> Wool fiber recovers its shape over roughly 24 hours of rest after wear. A rotation of at least three pairs is not a purchasing upsell — it is the condition under which the fiber's recovery properties actually function as engineered.</p>

<p>This protocol is not incidental to the product. A customer who follows it will own a garment that improves in comfort over its first several wears and holds its construction for years. A customer who does not will experience a failure that looks like a manufacturing defect and is, in fact, a laundering one. We publish this protocol because the difference between those two outcomes is entirely within the customer's control, and an authority does not withhold the information that makes its own claims true.</p>

<hr>

<p><em>The Academy opens its Inaugural Semester enrollment in Q1 2027.</em></p>

<p><em>If you have read this far, you already understand what separates a specification from a claim.</em></p>

<p><em>The Founding Cohort receives first allocation from our inaugural production run, pricing locked for the life of their enrollment, and a handwritten note enclosed with their first pair.</em></p>

<p><em>There are 100 places in the Founding Cohort. Enrollment closes when they are filled — not on a date.</em></p>

<p><strong>[Enroll in the Founding Cohort →]</strong></p>
`.trim();

const META_DESCRIPTION = 'The complete guide to Merino wool: why 18.5 microns is the fiber standard, how moisture management works at the fiber level, what certification actually means, and how to care for the fabric correctly. From SockAcademy, the world\'s first sock authority.';

async function main() {
  const existing = await shopifyRequest('GET', `blogs/${BLOG_ID}/articles.json?handle=${HANDLE}&limit=1`);
  if (existing.articles && existing.articles.length > 0) {
    console.log(`⚠️  Article already exists: https://sockacademy.store/blogs/news/${HANDLE}`);
    return;
  }

  const payload = {
    article: {
      title: TITLE,
      body_html: BODY_HTML,
      blog_id: parseInt(BLOG_ID),
      author: 'SockAcademy',
      tags: 'Premium Materials, Merino Wool, Material Guide, SEO',
      handle: HANDLE,
      published: true,
      metafields: [
        {
          key: 'description_tag',
          value: META_DESCRIPTION.substring(0, 320),
          type: 'single_line_text_field',
          namespace: 'global',
        },
        {
          key: 'title_tag',
          value: `${TITLE} | SockAcademy`,
          type: 'single_line_text_field',
          namespace: 'global',
        },
      ],
    },
  };

  const result = await shopifyRequest('POST', `blogs/${BLOG_ID}/articles.json`, payload);
  console.log(`✅ Published: https://sockacademy.store/blogs/news/${result.article.handle}`);
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
