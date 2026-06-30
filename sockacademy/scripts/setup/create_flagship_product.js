/**
 * create_flagship_product.js
 * Creates SockAcademy's flagship Merino product with all 9 academy.* metafields.
 * One-time. Idempotent — checks for existing product by title before creating.
 *
 * Usage: node sockacademy/scripts/setup/create_flagship_product.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const SHOP    = process.env.SHOPIFY_SHOP_DOMAIN;
const TOKEN   = process.env.SHOPIFY_MASTER_TOKEN;
const API_VER = '2025-01';
const GQL_URL = `https://${SHOP}/admin/api/${API_VER}/graphql.json`;

if (!SHOP || !TOKEN) {
  console.error('❌  SHOPIFY_SHOP_DOMAIN or SHOPIFY_MASTER_TOKEN missing from .env');
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// ── Product Data ──────────────────────────────────────────────────────────────

const PRODUCT_TITLE = 'ZQ Merino 18.5μ Ribbed Crew';

// Shopify 2025-01: bodyHtml → descriptionHtml, variants created separately
const PRODUCT_INPUT = {
  title: PRODUCT_TITLE,
  descriptionHtml: `<p>Where fibre science meets precision knitting.</p>
<p>At 18.5 microns — well below the recognised irritation threshold — this merino sits in a class occupied by less than three percent of global wool production. ZQ-certified, sourced from the high-altitude grasslands of New Zealand, knitted at 200-needle gauge for a fabric density most mills cannot achieve.</p>
<p>A crew sock built for those who understand that what you cannot see defines everything.</p>`,
  vendor: 'SockAcademy',
  productType: 'Crew Socks',
  tags: ['merino', 'premium', 'crew', 'the-academy', 'zq-merino', 'new-zealand'],
  status: 'ACTIVE',
};

// Shopify 2025-01: sku lives inside inventoryItem, no inventoryPolicy on BulkInput
const VARIANTS_INPUT = [
  {
    price: '38.00',
    optionValues: [{ optionName: 'Size', name: 'S/M (EU 36–41)' }],
    inventoryItem: { sku: 'SA-MERINO-185-S-M' },
  },
  {
    price: '38.00',
    optionValues: [{ optionName: 'Size', name: 'L/XL (EU 42–46)' }],
    inventoryItem: { sku: 'SA-MERINO-185-L-XL' },
  },
];

// ── Academy Metafields ────────────────────────────────────────────────────────

function buildMetafields(productGid) {
  return [
    {
      ownerId:   productGid,
      namespace: 'academy',
      key:       'material_grade',
      type:      'single_line_text_field',
      value:     'MERINO 18.5μ',
    },
    {
      ownerId:   productGid,
      namespace: 'academy',
      key:       'material_origin',
      type:      'single_line_text_field',
      value:     'New Zealand Highlands',
    },
    {
      ownerId:   productGid,
      namespace: 'academy',
      key:       'fiber_composition',
      type:      'single_line_text_field',
      value:     '78% ZQ Merino Wool · 20% Nylon · 2% Elastane',
    },
    {
      ownerId:   productGid,
      namespace: 'academy',
      key:       'construction_gauge',
      type:      'single_line_text_field',
      value:     '200-needle gauge',
    },
    {
      ownerId:   productGid,
      namespace: 'academy',
      key:       'weave_type',
      type:      'single_line_text_field',
      value:     'Plain rib · Single-link toe',
    },
    {
      ownerId:   productGid,
      namespace: 'academy',
      key:       'certification',
      type:      'single_line_text_field',
      value:     'ZQ Merino Certified',
    },
    {
      ownerId:   productGid,
      namespace: 'academy',
      key:       'material_note',
      type:      'single_line_text_field',
      value:     'Below the irritation threshold. Above every standard.',
    },
    {
      ownerId:   productGid,
      namespace: 'academy',
      key:       'care_protocol',
      type:      'multi_line_text_field',
      value:     'Hand wash cold.\nLay flat to dry.\nDo not tumble dry.\nDo not iron.\nDo not dry clean.',
    },
    {
      ownerId:   productGid,
      namespace: 'academy',
      key:       'material_story',
      type:      'multi_line_text_field',
      value:     'ZQ Merino originates from the high-altitude grasslands of New Zealand, where temperature variation and clean air produce fibre of exceptional fineness. At 18.5 microns — well below the 19-micron irritation threshold — this wool makes direct contact with skin without compromise.\n\nZQ certification traces each fleece from paddock to product, verifying animal welfare, land stewardship, and fibre quality at every stage. It is the only certification that connects a finished sock to the individual farm that produced its raw material.\n\nThe result is a sock that performs at the level of a technical garment while wearing like nothing at all.',
    },
  ];
}

// ── Queries & Mutations ───────────────────────────────────────────────────────

async function findExistingProduct(title) {
  const data = await gql(`
    query findProduct($query: String!) {
      products(first: 5, query: $query) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }
  `, { query: `title:"${title}"` });
  return data.products.edges.find(e => e.node.title === title)?.node || null;
}

async function createProduct(input) {
  const data = await gql(`
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
          title
          handle
        }
        userErrors {
          field
          message
        }
      }
    }
  `, { input });
  const result = data.productCreate;
  if (result.userErrors?.length) {
    throw new Error(result.userErrors.map(e => `${e.field}: ${e.message}`).join('; '));
  }
  return result.product;
}

async function createVariants(productId, variants) {
  const data = await gql(`
    mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants) {
        productVariants {
          id
          title
          price
        }
        userErrors {
          field
          message
        }
      }
    }
  `, { productId, variants });
  const result = data.productVariantsBulkCreate;
  if (result.userErrors?.length) {
    throw new Error(result.userErrors.map(e => `${e.field}: ${e.message}`).join('; '));
  }
  return result.productVariants;
}

async function setMetafields(metafields) {
  const data = await gql(`
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          key
          namespace
          value
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `, { metafields });
  const result = data.metafieldsSet;
  if (result.userErrors?.length) {
    throw new Error(result.userErrors.map(e => `${e.code} ${e.field}: ${e.message}`).join('; '));
  }
  return result.metafields;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🎓  SockAcademy — Flagship Product Setup');
  console.log(`    Shop: ${SHOP} | API: ${API_VER}\n`);

  // 1. Check for existing product
  console.log(`  🔍  Checking for existing product: "${PRODUCT_TITLE}"...`);
  let product = await findExistingProduct(PRODUCT_TITLE);

  if (product) {
    console.log(`  ⏭️  Product already exists: ${product.handle} (${product.id})`);
    console.log('      Proceeding to set / update metafields...\n');
  } else {
    console.log('  ✨  Creating product...');
    product = await createProduct(PRODUCT_INPUT);
    console.log(`  ✅  Created: "${product.title}"`);
    console.log(`      Handle: ${product.handle}`);
    console.log(`      ID:     ${product.id}\n`);

    console.log('  🔀  Creating size variants...');
    const variants = await createVariants(product.id, VARIANTS_INPUT);
    for (const v of variants) {
      console.log(`  ✅  Variant: ${v.title} @ $${v.price}`);
    }
    console.log('');
  }

  // 2. Set all 9 metafields
  console.log('  🏷️   Setting academy.* metafields...');
  const metafields = buildMetafields(product.id);
  const saved = await setMetafields(metafields);
  for (const m of saved) {
    console.log(`  ✅  academy.${m.key}`);
  }

  // 3. Done
  const handle = product.handle;
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  🎓  Product live with all 9 metafields.`);
  console.log(`      Preview: https://${SHOP}/products/${handle}`);
  console.log('      Next: remove preview: true from sections/main-product.liquid\n');
}

run().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
