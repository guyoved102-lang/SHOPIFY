/**
 * SOCKACADEMY GraphQL Blog Publisher
 * ------------------------------------
 * Uses `shopify store execute` (CLI auth — no token needed) to create
 * all 20 blog posts as drafts.
 *
 * Prerequisites:
 *   shopify store auth --store 11eqwi-ji.myshopify.com --scopes write_content,read_content
 *
 * Usage:
 *   node assets/graphql-publisher.js
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const { POSTS } = require('./content-generator');

const STORE    = '11eqwi-ji.myshopify.com';
const BLOG_GID = 'gid://shopify/Blog/97332199622';

const MUTATION_FILE = path.join(os.tmpdir(), 'sa_article_mutation.graphql');

fs.writeFileSync(MUTATION_FILE, `
mutation createArticle($article: ArticleCreateInput!) {
  articleCreate(article: $article) {
    article {
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
`.trim());

function createArticle(post, index) {
  const variables = {
    article: {
      blogId:      BLOG_GID,
      title:       post.title,
      handle:      post.handle,
      body:        post.body_html,
      tags:        post.tags.split(',').map(t => t.trim()),
      isPublished: false,
      author:      { name: 'SOCKACADEMY' },
    },
  };

  const varsFile = path.join(os.tmpdir(), `sa_vars_${index}.json`);
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
    const errors = data?.articleCreate?.userErrors;
    if (errors && errors.length > 0) {
      throw new Error(errors.map(e => `${e.field}: ${e.message}`).join(', '));
    }
    return data.articleCreate.article;
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
  console.log('║     SOCKACADEMY GraphQL Blog Publisher           ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n  Creating ${POSTS.length} draft articles on ${STORE}\n`);

  let created = 0;
  let failed  = 0;

  for (let i = 0; i < POSTS.length; i++) {
    const post = POSTS[i];
    try {
      const article = createArticle(post, i);
      console.log(`  ✓ [${String(i + 1).padStart(2, '0')}] "${article.title}" → ${article.id}`);
      created++;
    } catch (err) {
      console.error(`  ✗ [${String(i + 1).padStart(2, '0')}] "${post.title}" — ${err.message}`);
      failed++;
    }
    await delay(600);
  }

  console.log('');
  console.log('  ─────────────────────────────────────────────────');
  console.log(`  Done. ${created} created, ${failed} failed.`);
  console.log(`  Review drafts at: https://${STORE}/admin/blogs`);
  console.log('');

  try { fs.unlinkSync(MUTATION_FILE); } catch (_) {}
}

main().catch(err => {
  console.error('\n  Fatal error:', err.message);
  process.exit(1);
});
