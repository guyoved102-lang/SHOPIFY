const TOKEN = 'process.env.SHOPIFY_MASTER_TOKEN';
const STORE = '11eqwi-ji.myshopify.com';
const BASE = `https://${STORE}/admin/api/2024-01`;
const BLOG_ID = 97332199622;
const headers = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json', 'Accept': 'application/json' };

const articles = [
  {
    title: 'Merino Wool vs Cotton Socks: Which Is Actually Better?',
    tags: 'merino, cotton, guide, materials',
    body_html: `<p>Walk into any premium sock retailer and you'll face the same question: merino wool or cotton? Both claim to be the superior choice. Both are right — in different contexts. Here's how to choose.</p>

<h2>The Case for Merino Wool</h2>
<p>Merino is the material that changed the outdoor and travel market because it does something no synthetic and no regular cotton can: it regulates temperature actively. In cold air, the hollow fibres trap warmth. In heat, they move moisture away from skin faster than it can build up, creating a cooling effect. This is why merino socks work in winter hiking boots and summer loafers alike.</p>
<p>The other advantage is odour resistance. Merino wool contains lanolin — a natural antimicrobial agent — which inhibits the bacteria that cause foot odour. A well-made merino sock can be worn for two to three days on a trip without becoming offensive.</p>
<p>Where merino has historically lost ground is durability. Pure merino wears through faster than cotton at high-friction points. This is why quality merino socks always include a percentage of nylon (12–20%) at the reinforcement zones.</p>

<h2>The Case for Egyptian Cotton</h2>
<p>Long-staple Egyptian cotton produces a fibre that's longer, finer, and smoother than standard cotton. When knit at 200 needles per inch, the result is a fabric with a silk-like hand-feel and a subtle lustre that synthetic blends cannot replicate.</p>
<p>For formal wear, Egyptian cotton is the correct choice. It pairs with dress shoes the way the right wine pairs with food — not flashy, simply correct. It holds its shape after washing, maintains colour depth in charcoal and navy better than wool.</p>
<p>The limitation of cotton is its single-direction moisture behaviour. Cotton absorbs sweat well but doesn't move it away from skin. In hot conditions, cotton socks become damp and stay damp.</p>

<h2>When to Choose Which</h2>
<table style="width:100%; border-collapse: collapse; margin: 1.5rem 0;">
  <thead><tr style="background:#111; color:#fff;"><th style="padding:10px 14px; text-align:left;">Situation</th><th style="padding:10px 14px; text-align:left;">Recommended Material</th></tr></thead>
  <tbody>
    <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 14px;">Business formal / suit</td><td style="padding:10px 14px;">Egyptian Cotton</td></tr>
    <tr style="border-bottom:1px solid #eee;background:#f9f9f9;"><td style="padding:10px 14px;">Smart casual / chinos</td><td style="padding:10px 14px;">Merino Wool Crew</td></tr>
    <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 14px;">Travel (3+ days)</td><td style="padding:10px 14px;">Merino Wool Crew</td></tr>
    <tr style="border-bottom:1px solid #eee;background:#f9f9f9;"><td style="padding:10px 14px;">Warm office environment</td><td style="padding:10px 14px;">No-Show Performance (Coolmax)</td></tr>
    <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 14px;">Outdoor / hiking</td><td style="padding:10px 14px;">Tactical Hiking (Merino/Thermolite)</td></tr>
    <tr style="border-bottom:1px solid #eee;background:#f9f9f9;"><td style="padding:10px 14px;">Gift for someone</td><td style="padding:10px 14px;">Essentials Gift Set</td></tr>
  </tbody>
</table>

<h2>The Bottom Line</h2>
<p>Merino is the more versatile material. Cotton is the more refined one. For most people building a complete sock wardrobe, the answer isn't either/or — it's one of each for different situations.</p>`
  },
  {
    title: 'The Complete Guide to Caring for Premium Socks',
    tags: 'care, washing, maintenance, guide',
    body_html: `<p>A pair of merino socks that retails for $34 should last three to five years with correct care. Most people wash them incorrectly and get twelve months. Here is how to close that gap.</p>

<h2>The One Rule That Applies to Everything</h2>
<p>Never put premium socks in a hot wash. Heat is the primary cause of premature fibre breakdown in both wool and fine cotton. The heat doesn't just shrink fabric — it permanently degrades the molecular structure of the fibre, reducing elasticity, softness, and colour intensity after each hot cycle.</p>

<h2>Merino Wool Socks</h2>
<ul>
  <li><strong>Temperature:</strong> 30°C maximum. Cold wash preferred.</li>
  <li><strong>Cycle:</strong> Gentle / wool setting only.</li>
  <li><strong>Detergent:</strong> Wool-specific liquid (Woolite or equivalent). Standard detergents contain enzymes that attack protein fibres.</li>
  <li><strong>Drying:</strong> Lay flat to dry. Never tumble dry. Hanging stretches the sock and distorts the knit structure.</li>
  <li><strong>Frequency:</strong> Merino's antimicrobial properties mean you can air between wears. Every 2–3 uses rather than every use extends lifespan significantly.</li>
</ul>

<h2>Egyptian Cotton Dress Socks</h2>
<ul>
  <li><strong>Temperature:</strong> 30°C maximum.</li>
  <li><strong>Cycle:</strong> Delicate. Inside out to preserve colour and sheen.</li>
  <li><strong>Detergent:</strong> Standard gentle liquid. Avoid bleach-containing products on dark colours.</li>
  <li><strong>Drying:</strong> Air dry flat or hung from the toe (not the cuff — this stretches the elastic).</li>
</ul>

<h2>Performance / No-Show Socks</h2>
<ul>
  <li><strong>Temperature:</strong> 40°C acceptable (Coolmax fibres are more heat-resistant).</li>
  <li><strong>Silicone heel grip:</strong> Hand wash occasionally to preserve the silicone adhesion. Machine washing slowly degrades the grip surface.</li>
  <li><strong>Drying:</strong> Air dry. Tumble dry on low if needed — but avoid high heat which damages the grip.</li>
</ul>

<h2>Storage</h2>
<p>Don't ball your socks. The traditional method of turning one sock's cuff over the other stretches the elastic at the cuff — the structural element that keeps the sock in place. Instead: lay one sock flat, place the second on top, fold both in half at the midpoint. Store flat.</p>

<h2>When to Replace</h2>
<p>A well-maintained premium sock should be replaced when: (1) the heel or toe shows visible thinning, (2) the cuff no longer holds its position during a full day's wear, (3) the fabric has lost its dimensional shape. These are structural failures — beyond maintenance.</p>`
  },
  {
    title: 'No-Show Socks: Why Most Get It Wrong',
    tags: 'no-show, ankle, guide, summer',
    body_html: `<p>No-show socks have one job: stay hidden while keeping the foot comfortable. Most fail at the first part within two hours of wear. Here's why, and what to look for instead.</p>

<h2>The Slipping Problem</h2>
<p>The primary reason no-show socks slip is insufficient heel grip. A no-show sock has no cuff to hold it in place — the only anchor point is the heel cup. If that cup doesn't have a high-friction surface bonded to it, the natural motion of the foot during walking causes the sock to migrate forward until it's bunched under the arch.</p>
<p>The solution is a silicone heel band — a strip of food-grade silicone applied to the inside of the heel cup. Our No-Show Performance Socks use a full-width silicone band that covers the entire rear quarter of the heel — wider than most competitors' implementations.</p>

<h2>The Visibility Problem</h2>
<p>A sock that's cut too high defeats the purpose. The sweet spot for heel height is 1.5–2cm above the heel bone — high enough to protect the skin from shoe friction, low enough to disappear below every standard shoe collar.</p>
<ul>
  <li><strong>Loafers:</strong> Standard no-show cut works for most styles.</li>
  <li><strong>Trainers / sneakers:</strong> Standard cut. The higher collar hides the sock regardless.</li>
  <li><strong>Boat shoes:</strong> Low-cut only. The collar sits just at ankle height on most models.</li>
  <li><strong>Oxford shoes:</strong> Standard no-show. The lace-up collar is high enough to allow some sock height.</li>
</ul>

<h2>Material Considerations</h2>
<p>For warm conditions — which is the primary use case for no-shows — moisture management matters more than in full socks. Coolmax polyester blends move moisture 4x faster than cotton and dry significantly faster. The tradeoff is feel: Coolmax blends feel synthetic against skin, which some people dislike.</p>
<p>If you run warm or are wearing no-shows in summer heat, the Coolmax blend is the better choice. If you prefer natural fibres in moderate temperatures, cotton works fine.</p>

<h2>How to Wash No-Shows Without Destroying the Grip</h2>
<p>The silicone grip is the most vulnerable part of the sock. Machine washing with high agitation or high heat will degrade it faster than the rest of the sock. To preserve it: wash on gentle at 40°C or below. Air dry when possible. With this care, the grip should remain effective for 50–80 wash cycles.</p>`
  },
  {
    title: 'Sock Pairing Guide: What Goes With What',
    tags: 'style, pairing, guide, fashion',
    body_html: `<p>Socks are the last styling decision most people make. They're also one of the few remaining places where men's dressing allows genuine individual expression — which means the pairing decision matters more than most people realise.</p>

<h2>The Foundation Rules</h2>
<h3>Match the sock to the trouser, not the shoe</h3>
<p>The more nuanced and correct instruction is to match socks to trousers. When you're seated, the sock creates a visual bridge between the trouser hem and the shoe. If that bridge matches the trouser tone, the eye reads a continuous line.</p>
<p>In practice: charcoal trousers with black shoes — charcoal or dark grey socks, not black. Navy suit with tan shoes — navy or mid-blue socks.</p>

<h3>Formal dressing: disappear or declare</h3>
<p>In formal contexts, there are two valid approaches. Either the sock disappears — matching the trouser so closely it reads as part of the leg — or it declares — a confident colour or pattern that signals deliberate attention to detail. The wrong approach is the middle ground: a sock that's slightly off in tone, suggesting inattention or failed creativity.</p>

<h2>Specific Pairings Worth Knowing</h2>
<h3>Oxford shoes</h3>
<p>The most formal shoe calls for the most formal sock. Egyptian cotton in charcoal, black, or navy. The sock should sit over the calf — nothing that risks exposure between the shoe and trouser. Pattern: fine ribs only, or solid.</p>

<h3>Loafers</h3>
<p>The no-show approach or a lightweight crew sock. If visible, the sock should complement the shoe colour rather than match it. Navy loafers with a light grey sock reads well.</p>

<h3>Chelsea boots</h3>
<p>The boot collar sits mid-ankle, which means any sock you wear will spend most of its time hidden. Quality over pattern. A crew-height merino sock is the default.</p>

<h2>Pattern Rules</h2>
<ul>
  <li><strong>Stripes:</strong> Always run vertically on a sock. Horizontal stripes make the foot appear shorter.</li>
  <li><strong>Dots:</strong> Work in formal contexts better than most people expect. Small, widely spaced dots on a dark ground are classic.</li>
  <li><strong>Solid ribbed:</strong> The most versatile construction. Works across every formality level.</li>
</ul>

<h2>What Breaks the Rules Well</h2>
<p>Rules are frameworks, not laws. The sock that gets noticed — in a good way — is the one that creates a small surprise within an otherwise composed outfit. A perfectly fitted grey suit with a subtle burgundy sock is not an error. It's an edit. The key word is subtle — the sock should reward the person who notices it, not demand to be noticed.</p>`
  },
  {
    title: 'How to Build a Complete Premium Sock Wardrobe',
    tags: 'wardrobe, guide, essentials, premium',
    body_html: `<p>A well-built sock wardrobe doesn't require many pairs — it requires the right ones. Here's the case for a deliberate, small collection rather than a large, undifferentiated one.</p>

<h2>The Minimum Viable Wardrobe</h2>
<p>Five pairs cover most situations for most people. Not five identical pairs — five different pairs, each designed for a specific context.</p>

<h3>1. Merino Wool Crew — 2 pairs</h3>
<p>The daily workhorse. Works with smart casual to business casual. Temperature regulates across seasons. Odour-resistant enough to double up on travel. Two pairs is the minimum — you'll reach for these more often than anything else.</p>

<h3>2. Egyptian Cotton Dress Socks — 1 pair</h3>
<p>For formal wear. If you wear a suit or attend formal events, this pair is non-negotiable. Charcoal is the most versatile single colour — pairs with black, brown, and grey shoes.</p>

<h3>3. No-Show Performance Socks — 1 pair</h3>
<p>For summer, loafers, and any shoe where sock visibility would break the aesthetic. These earn their place by covering the situations where no other sock type works.</p>

<h3>4. Tactical Hiking Socks — 1 pair</h3>
<p>For anyone who walks seriously or hikes occasionally. These are over-engineered relative to what most days require — which is exactly the point. When you need them, you'll want the cushioning, anatomical fit, and moisture performance.</p>

<h2>Building vs. Buying All at Once</h2>
<p>The temptation with socks is to buy many at once. For premium socks, this produces a wardrobe of identical pairs that covers some situations well and others not at all. A better approach: start with one merino crew and one dress sock. Wear them for a week. Identify what's missing. Add from there.</p>

<h2>The Gift Set as a Starting Point</h2>
<p>The SockAcademy Essentials Gift Set — one merino crew, one no-show performance, one Egyptian cotton dress sock — covers three of the five positions in a complete wardrobe in a single purchase. For someone whose current sock situation is low-quality basics, this is often the most efficient entry point.</p>

<h2>Longevity Math</h2>
<p>A premium sock wardrobe costs more to build than a cheap one. The offset is longevity: well-maintained merino socks last 3–5 years. A five-pair wardrobe built to last is less expensive per wear than a fifty-pair wardrobe replaced annually. The calculation isn't just financial — five considered pairs are easier to manage, maintain, and pair than fifty pairs of varying quality.</p>`
  }
];

async function createArticle(article) {
  const r = await fetch(`${BASE}/blogs/${BLOG_ID}/articles.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ article: { ...article, author: 'SockAcademy', published: true } })
  });
  const d = await r.json();
  if (r.ok) {
    console.log(`✓ ${d.article.title}`);
  } else {
    console.log(`✗ Error: ${JSON.stringify(d).slice(0, 200)}`);
  }
}

(async () => {
  console.log('Creating 5 new blog articles...\n');
  for (const a of articles) {
    await createArticle(a);
    await new Promise(r => setTimeout(r, 300));
  }
  console.log('\nDone!');
})();
