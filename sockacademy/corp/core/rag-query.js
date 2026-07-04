'use strict';

/**
 * RAG Query — corp/core/rag-query.js (Module 4)
 *
 * Embeds a question via OpenAI and returns the closest knowledge_chunks
 * rows via the match_knowledge_chunks() Postgres function (cosine similarity).
 *
 * Usage:
 *   const { queryKnowledge } = require('../../corp/core/rag-query.js');
 *   const chunks = await queryKnowledge(supabase, 'What is your return policy?', 5);
 *   // chunks: [{ source, title, content, similarity }, ...]
 */

const EMBEDDING_MODEL = 'text-embedding-3-small';

async function embedText(text) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

async function queryKnowledge(supabase, question, topK = 5) {
  const embedding = await embedText(question);

  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: embedding,
    match_count: topK,
  });

  if (error) throw new Error(`match_knowledge_chunks RPC failed: ${error.message}`);

  return (data || []).map(row => ({
    source:     row.source,
    title:      row.title,
    content:    row.content,
    similarity: row.similarity,
  }));
}

if (require.main === module) {
  require('dotenv').config({ path: '../../.env' });
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const question = process.argv.slice(2).join(' ') || 'What is your return policy?';

  queryKnowledge(supabase, question).then(chunks => {
    console.log(`Query: "${question}"\n`);
    if (!chunks.length) { console.log('(no chunks found — table may be empty, run rag-ingest.js first)'); return; }
    chunks.forEach((c, i) => console.log(
      `[${i + 1}] (${c.source}, similarity=${c.similarity.toFixed(3)}) ${c.title || ''}\n${c.content.slice(0, 200)}\n`
    ));
  }).catch(e => { console.error('FATAL:', e.message); process.exit(1); });
}

module.exports = { queryKnowledge, embedText };
