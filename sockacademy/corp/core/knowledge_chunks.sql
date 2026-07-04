-- knowledge_chunks — RAG knowledge base for A16 CX support (Module 4)
-- Run once in Supabase SQL Editor: https://app.supabase.com -> SQL Editor
-- Safe to run multiple times (idempotent)

create extension if not exists vector;

create table if not exists knowledge_chunks (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,           -- 'faq_page' | 'brand_dna' | 'product:<shopify_id>' | 'policy:<handle>'
  title       text,
  content     text not null,           -- original chunk text
  embedding   vector(1536) not null,   -- OpenAI text-embedding-3-small
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table knowledge_chunks enable row level security;

DO $$
BEGIN
  CREATE POLICY "service role full access" ON knowledge_chunks
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

create index if not exists idx_knowledge_chunks_source on knowledge_chunks (source);

-- No vector index (ivfflat) yet — corpus is small enough (FAQ/policy pages +
-- BRAND_DNA.md + a handful of products) that a sequential scan is fast and
-- correct. Add an ivfflat index only if the corpus grows into the thousands.

grant all on public.knowledge_chunks to service_role;
grant all on public.knowledge_chunks to anon;
grant all on public.knowledge_chunks to authenticated;

-- match_knowledge_chunks — cosine-similarity top-k lookup, called from
-- rag-query.js via supabase.rpc('match_knowledge_chunks', { query_embedding, match_count })
create or replace function match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  source text,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    id, source, title, content, metadata,
    1 - (embedding <=> query_embedding) as similarity
  from knowledge_chunks
  order by embedding <=> query_embedding
  limit match_count;
$$;
