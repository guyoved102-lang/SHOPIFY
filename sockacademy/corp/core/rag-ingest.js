'use strict';

/**
 * RAG Ingest — corp/core/rag-ingest.js (Module 4)
 *
 * One-shot/on-demand script (NOT a scheduled workflow — the corpus changes
 * rarely). Reads the starter corpus (Shopify pages, BRAND_DNA.md, uploaded
 * products), chunks it, embeds each chunk via OpenAI, and replaces the
 * contents of knowledge_chunks with the fresh set.
 *
 * Usage:
 *   cd sockacademy/corp/core
 *   node rag-ingest.js
 *
 * Requires knowledge_chunks.sql to have been run in Supabase first.
 */

const fs = require('fs');
const path = require('path');
const { embedText } = require('./rag-query.js');

const BRAND_DNA_PATH  = path.join(__dirname, '../../docs/strategy/BRAND_DNA.md');

const MIN_CHUNK_CHARS = 40;
const MAX_CHUNK_CHARS = 2000;

// ─── CHUNKING ─────────────────────────────────────────────────────────────

function stripHtmlToText(html) {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(h1|h2|h3|h4|p|li|br|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join('\n');
}

// Groups consecutive non-empty lines into chunks up to MAX_CHUNK_CHARS,
// merging any final trailing fragment shorter than MIN_CHUNK_CHARS into the
// previous chunk. No overlap — the corpus is small enough that overlap
// between chunks isn't needed for retrieval quality (see design spec).
function chunkText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const chunks = [];
  let buffer = '';

  for (const line of lines) {
    if (buffer.length + line.length + 1 > MAX_CHUNK_CHARS && buffer.length >= MIN_CHUNK_CHARS) {
      chunks.push(buffer.trim());
      buffer = '';
    }
    buffer += (buffer ? '\n' : '') + line;
  }

  if (buffer.trim().length >= MIN_CHUNK_CHARS || chunks.length === 0) {
    if (buffer.trim()) chunks.push(buffer.trim());
  } else if (buffer.trim()) {
    chunks[chunks.length - 1] += '\n' + buffer.trim();
  }

  return chunks;
}

// ─── SOURCES ──────────────────────────────────────────────────────────────

async function fetchShopifyPageChunks() {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
  const SHOPIFY_TOKEN  = process.env.SHOPIFY_MASTER_TOKEN;
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    console.log('[skip] Shopify credentials not set');
    return [];
  }
  const SHOPIFY_API = `https://${SHOPIFY_DOMAIN}/admin/api/2025-01`;
  const res = await fetch(`${SHOPIFY_API}/pages.json?limit=50`, {
    headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN },
  });
  if (!res.ok) throw new Error(`Shopify pages fetch failed: ${res.status}`);
  const { pages } = await res.json();

  const chunks = [];
  for (const page of pages) {
    const plain = stripHtmlToText(page.body_html || '');
    const sections = chunkText(plain);
    sections.forEach((content, i) => {
      chunks.push({
        source:  `policy:${page.handle}`,
        title:   sections.length > 1 ? `${page.title} (${i + 1}/${sections.length})` : page.title,
        content,
      });
    });
  }
  console.log(`[rag-ingest] ${chunks.length} chunk(s) from ${pages.length} Shopify page(s)`);
  return chunks;
}

function fetchBrandDnaChunks() {
  if (!fs.existsSync(BRAND_DNA_PATH)) {
    console.log(`[skip] BRAND_DNA.md not found at ${BRAND_DNA_PATH}`);
    return [];
  }
  const text = fs.readFileSync(BRAND_DNA_PATH, 'utf8');
  const chunks = chunkText(text);
  console.log(`[rag-ingest] ${chunks.length} chunk(s) from BRAND_DNA.md`);
  return chunks.map((content, i) => ({
    source:  'brand_dna',
    title:   `Brand DNA (${i + 1}/${chunks.length})`,
    content,
  }));
}

async function fetchProductChunks(supabase) {
  const { data, error } = await supabase
    .from('products')
    .select('shopify_id, product_name, category, materials, retail_price')
    .eq('status', 'Uploaded')
    .not('shopify_id', 'is', null);
  if (error) throw new Error(`products fetch failed: ${error.message}`);

  const chunks = (data || []).map(p => ({
    source:  `product:${p.shopify_id}`,
    title:   p.product_name,
    content: [
      p.product_name,
      p.category       ? `Category: ${p.category}`       : null,
      p.materials      ? `Materials: ${p.materials}`      : null,
      p.retail_price   ? `Price: $${p.retail_price}`      : null,
    ].filter(Boolean).join('. '),
  }));
  console.log(`[rag-ingest] ${chunks.length} chunk(s) from uploaded products`);
  return chunks;
}

// ─── INGEST ───────────────────────────────────────────────────────────────

async function ingestAll(supabase) {
  const allChunks = [
    ...(await fetchShopifyPageChunks()),
    ...(fetchBrandDnaChunks()),
    ...(await fetchProductChunks(supabase)),
  ];

  console.log(`[rag-ingest] ${allChunks.length} chunk(s) total to embed and store`);

  // Wipe + reload — simplest correct approach for a small, infrequently
  // changing corpus with no scheduled re-ingest (see design spec YAGNI list).
  const { error: delErr } = await supabase
    .from('knowledge_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) throw new Error(`knowledge_chunks clear failed: ${delErr.message}`);

  let inserted = 0;
  for (const chunk of allChunks) {
    const embedding = await embedText(chunk.content);
    const { error } = await supabase.from('knowledge_chunks').insert({
      source:  chunk.source,
      title:   chunk.title || null,
      content: chunk.content,
      embedding,
    });
    if (error) {
      console.error(`[rag-ingest] insert failed for "${chunk.title}": ${error.message}`);
      continue;
    }
    inserted++;
  }

  console.log(`[rag-ingest] ✅ ${inserted}/${allChunks.length} chunks stored`);
  return inserted;
}

if (require.main === module) {
  require('dotenv').config({ path: '../../.env' });
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  ingestAll(supabase)
    .then(n => { console.log(`Done. ${n} chunk(s) stored.`); process.exit(0); })
    .catch(e => { console.error('[rag-ingest] FATAL:', e.message); process.exit(1); });
}

module.exports = { ingestAll, chunkText, stripHtmlToText };
