/**
 * Publishes all 20 SOCKACADEMY draft articles (sets isPublished: true).
 * Run: node assets/publish-articles.js
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const STORE = '11eqwi-ji.myshopify.com';

const ARTICLES = [
  { id: 'gid://shopify/Article/573821190342', title: 'The Complete Guide to Merino Wool Socks' },
  { id: 'gid://shopify/Article/573821223110', title: 'How to Choose Socks for Every Occasion' },
  { id: 'gid://shopify/Article/573821255878', title: 'Why Your Socks Matter More Than You Think' },
  { id: 'gid://shopify/Article/573821288646', title: 'The Ultimate Sock Care Guide: Washing, Drying and Storage' },
  { id: 'gid://shopify/Article/573821321414', title: 'No-Show vs Ankle Socks: Which Should You Choose?' },
  { id: 'gid://shopify/Article/573821354182', title: 'The Best Socks for Running: A Performance Guide' },
  { id: 'gid://shopify/Article/573821386950', title: 'Sock Pairing 101: How to Match Socks to Any Outfit' },
  { id: 'gid://shopify/Article/573821419718', title: 'Compression Socks: Do They Actually Work?' },
  { id: 'gid://shopify/Article/573821452486', title: 'Cotton vs Bamboo vs Wool: The Ultimate Sock Material Guide' },
  { id: 'gid://shopify/Article/573821485254', title: 'The Best Hiking Socks for Every Terrain' },
  { id: 'gid://shopify/Article/573821518022', title: 'How to Stop Your Socks from Slipping Down All Day' },
  { id: 'gid://shopify/Article/573821550790', title: 'Dress Socks 101: The Complete Guide for Formal Occasions' },
  { id: 'gid://shopify/Article/573821583558', title: 'The Science of Moisture-Wicking Socks Explained' },
  { id: 'gid://shopify/Article/573821616326', title: 'Fun Socks: How to Wear Bold Patterns Without Looking Careless' },
  { id: 'gid://shopify/Article/573821649094', title: 'Sock Sizing Guide: Finding Your Perfect Fit' },
  { id: 'gid://shopify/Article/573821681862', title: 'The Best Socks for People with Diabetes: What to Look For' },
  { id: 'gid://shopify/Article/573821714630', title: 'Sustainable Socks: The Environmental Cost of Your Sock Drawer' },
  { id: 'gid://shopify/Article/573821747398', title: 'How to Build the Perfect Sock Drawer' },
  { id: 'gid://shopify/Article/573821780166', title: 'The History of Socks: From Ancient Egypt to Sneaker Culture' },
  { id: 'gid://shopify/Article/573821812934', title: 'The Perfect Sock Gift Guide: What to Buy for Everyone' },
];

const MUTATION_FILE = path.join(os.tmpdir(), 'sa_publish_mutation.graphql');

fs.writeFileSync(MUTATION_FILE, `
mutation publishArticle($id: ID!, $article: ArticleUpdateInput!) {
  articleUpdate(id: $id, article: $article) {
    article {
      id
      title
      isPublished
    }
    userErrors {
      field
      message
    }
  }
}
`.trim());

function publishArticle(article, index) {
  const variables = { id: article.id, article: { isPublished: true } };
  const varsFile = path.join(os.tmpdir(), `sa_pub_vars_${index}.json`);
  fs.writeFileSync(varsFile, JSON.stringify(variables));

  try {
    const raw = execSync(
      `shopify store execute` +
      ` --store ${STORE}` +
      ` --query-file "${MUTATION_FILE}"` +
      ` --variable-file "${varsFile}"` +
      ` --allow-mutations --json`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const data = JSON.parse(raw);
    const errors = data?.articleUpdate?.userErrors;
    if (errors && errors.length > 0) {
      throw new Error(errors.map(e => `${e.field}: ${e.message}`).join(', '));
    }
    return data.articleUpdate.article;
  } finally {
    try { fs.unlinkSync(varsFile); } catch (_) {}
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     SOCKACADEMY Article Publisher                ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n  Publishing ${ARTICLES.length} articles on ${STORE}\n`);

  let published = 0;
  let failed    = 0;

  for (let i = 0; i < ARTICLES.length; i++) {
    const article = ARTICLES[i];
    try {
      const result = publishArticle(article, i);
      console.log(`  ✓ [${String(i + 1).padStart(2, '0')}] "${result.title}" → isPublished: ${result.isPublished}`);
      published++;
    } catch (err) {
      console.error(`  ✗ [${String(i + 1).padStart(2, '0')}] "${article.title}" — ${err.message}`);
      failed++;
    }
    await delay(400);
  }

  console.log('');
  console.log('  ─────────────────────────────────────────────────');
  console.log(`  Done. ${published} published, ${failed} failed.`);
  console.log(`  View live blog at: https://${STORE}/blogs/news`);
  console.log('');

  try { fs.unlinkSync(MUTATION_FILE); } catch (_) {}
}

main().catch(err => {
  console.error('\n  Fatal error:', err.message);
  process.exit(1);
});
