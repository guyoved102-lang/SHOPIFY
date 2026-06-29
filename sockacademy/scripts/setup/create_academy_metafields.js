/**
 * create_academy_metafields.js
 * One-time setup: creates all SockAcademy metafield definitions in Shopify.
 * Run once. Idempotent — skips definitions that already exist.
 *
 * Usage: node sockacademy/scripts/setup/create_academy_metafields.js
 * Requires: SHOPIFY_SHOP_DOMAIN + SHOPIFY_MASTER_TOKEN in .env
 *
 * Note: Shopify 2025-01 uses GraphQL for metafield definitions (REST removed).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const SHOP    = process.env.SHOPIFY_SHOP_DOMAIN;
const TOKEN   = process.env.SHOPIFY_MASTER_TOKEN;
const API_VER = '2025-01';

if (!SHOP || !TOKEN) {
  console.error('❌  SHOPIFY_SHOP_DOMAIN or SHOPIFY_MASTER_TOKEN missing from .env');
  process.exit(1);
}

const GQL_URL = `https://${SHOP}/admin/api/${API_VER}/graphql.json`;

const METAFIELD_DEFINITIONS = [
  {
    key:         'material_grade',
    name:        'Material Grade',
    description: 'e.g. "MERINO 18.5μ" — fiber grade and diameter. Displayed as primary spec.',
    type:        'single_line_text_field',
  },
  {
    key:         'material_origin',
    name:        'Material Origin',
    description: 'e.g. "New Zealand Highlands" — geographic source of the primary fiber.',
    type:        'single_line_text_field',
  },
  {
    key:         'fiber_composition',
    name:        'Fiber Composition',
    description: 'e.g. "78% Merino Wool, 20% Nylon, 2% Elastane" — full blend breakdown.',
    type:        'single_line_text_field',
  },
  {
    key:         'construction_gauge',
    name:        'Construction Gauge',
    description: 'e.g. "200-needle gauge" — knitting machine specification.',
    type:        'single_line_text_field',
  },
  {
    key:         'weave_type',
    name:        'Weave Type',
    description: 'e.g. "Plain rib, single-link toe" — construction method.',
    type:        'single_line_text_field',
  },
  {
    key:         'certification',
    name:        'Certification',
    description: 'e.g. "ZQ Merino Certified" — third-party quality or origin certification.',
    type:        'single_line_text_field',
  },
  {
    key:         'material_note',
    name:        'Material Note',
    description: 'One-line editorial statement. e.g. "Below the irritation threshold. Above every standard."',
    type:        'single_line_text_field',
  },
  {
    key:         'care_protocol',
    name:        'Care Protocol',
    description: 'Full care instructions displayed on product page. Multi-line.',
    type:        'multi_line_text_field',
  },
  {
    key:         'material_story',
    name:        'Material Story',
    description: 'Editorial paragraph about the material — shown in expanded Academy section on product page.',
    type:        'multi_line_text_field',
  },
];

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

async function getExistingDefinitions() {
  const query = `
    query {
      metafieldDefinitions(ownerType: PRODUCT, first: 250) {
        edges {
          node {
            namespace
            key
            name
          }
        }
      }
    }
  `;
  const data = await gql(query);
  return data.metafieldDefinitions.edges.map(e => e.node);
}

async function createDefinition(def) {
  const mutation = `
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
          namespace
          key
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;
  const variables = {
    definition: {
      namespace:   'academy',
      ownerType:   'PRODUCT',
      key:         def.key,
      name:        def.name,
      description: def.description,
      type:        def.type,
    },
  };
  const data = await gql(mutation, variables);
  const result = data.metafieldDefinitionCreate;
  if (result.userErrors && result.userErrors.length > 0) {
    throw new Error(result.userErrors.map(e => `${e.code}: ${e.message}`).join('; '));
  }
  return result.createdDefinition;
}

async function run() {
  console.log('🎓  SockAcademy — Metafield Definition Setup (GraphQL)');
  console.log(`    Shop: ${SHOP} | API: ${API_VER}\n`);

  const existing = await getExistingDefinitions();
  const existingKeys = existing
    .filter(d => d.namespace === 'academy')
    .map(d => d.key);

  console.log(`    Existing academy definitions: ${existingKeys.length ? existingKeys.join(', ') : 'none'}\n`);

  let created = 0;
  let skipped = 0;

  for (const def of METAFIELD_DEFINITIONS) {
    if (existingKeys.includes(def.key)) {
      console.log(`  ⏭️  Skip   academy.${def.key} (already exists)`);
      skipped++;
      continue;
    }
    try {
      const result = await createDefinition(def);
      console.log(`  ✅  Created academy.${result.key} — "${result.name}"`);
      created++;
    } catch (err) {
      console.error(`  ❌  Failed academy.${def.key}: ${err.message}`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Created: ${created} | Skipped: ${skipped} | Total: ${METAFIELD_DEFINITIONS.length}`);

  if (created + skipped === METAFIELD_DEFINITIONS.length) {
    console.log('\n  🎓  Academy metafield schema is complete.');
    console.log('  Next: populate metafields per product via Shopify Admin → Products → [Product] → Metafields');
  }
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
