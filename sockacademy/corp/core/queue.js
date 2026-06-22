'use strict';

/**
 * Upstash Redis Event Queue — SockAcademy inter-agent messaging
 *
 * Replaces polling between agents with an event-driven queue.
 * Agents push events; downstream agents pop and process.
 *
 * Event format:
 *   {
 *     id:        string (uuid),
 *     type:      string  — e.g. 'product.approved', 'order.created', 'stock.low'
 *     source:    string  — e.g. 'A1', 'shopify-webhook'
 *     payload:   object
 *     timestamp: ISO string
 *   }
 *
 * Queues (Redis lists):
 *   sa:queue:upload       → A1 approved product → A2 upload
 *   sa:queue:content      → A2 product uploaded → A3 blog, A5 social
 *   sa:queue:orders       → Shopify order event → A6 email, A8 analytics
 *   sa:queue:stock        → Low stock event     → A7 supplier monitor
 *   sa:queue:intel        → Competitor signal   → A4 ads, A3 content
 *
 * Gracefully no-ops when UPSTASH_REDIS_REST_URL is absent.
 * Always writes to Supabase queue_log when SUPABASE_URL is present.
 */

const { Redis } = require('@upstash/redis');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

const QUEUES = {
  UPLOAD:  'sa:queue:upload',
  CONTENT: 'sa:queue:content',
  ORDERS:  'sa:queue:orders',
  STOCK:   'sa:queue:stock',
  INTEL:   'sa:queue:intel',
};

let _redis = null;

function getRedis() {
  if (_redis) return _redis;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Push an event onto a queue.
 * @param {string} queue   One of QUEUES values
 * @param {string} type    Event type e.g. 'product.approved'
 * @param {string} source  Agent ID e.g. 'A1'
 * @param {object} payload Event data
 * @returns {string|null} event id, or null if Redis unavailable
 */
async function push(queue, { type, source, payload = {} }) {
  const redis = getRedis();
  const event = {
    id:        randomUUID(),
    type,
    source,
    payload,
    timestamp: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('queue_log').insert({
      event_id:   event.id,
      queue,
      event_type: event.type,
      source:     event.source,
      payload:    event.payload,
      status:     'pending',
    }).then(({ error }) => {
      if (error) console.error(`[queue] queue_log write failed: ${error.message}`);
    });
  }

  if (!redis) {
    console.warn(`[queue] Redis not configured — event queued in Supabase only: ${type}`);
    return event.id;
  }

  await redis.rpush(queue, JSON.stringify(event));
  console.log(`[queue] pushed ${type} → ${queue} (id: ${event.id})`);
  return event.id;
}

/**
 * Pop the oldest event from a queue (blocking, 5s timeout).
 * @param {string} queue
 * @returns {object|null} parsed event or null if queue empty / Redis unavailable
 */
async function pop(queue) {
  const redis = getRedis();
  if (!redis) return null;

  const result = await redis.blpop(queue, 5);
  if (!result) return null;

  const [, raw] = result;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

/**
 * Peek at all pending events without consuming them (for monitoring).
 * @param {string} queue
 * @param {number} limit max events to return
 */
async function peek(queue, limit = 20) {
  const redis = getRedis();
  if (!redis) return [];

  const items = await redis.lrange(queue, 0, limit - 1);
  return items.map((i) => (typeof i === 'string' ? JSON.parse(i) : i));
}

/**
 * Queue depth — how many events are pending.
 */
async function depth(queue) {
  const redis = getRedis();
  if (!redis) return 0;
  return redis.llen(queue);
}

/**
 * Convenience: push a product-approved event from A1 → A2.
 */
async function productApproved(productData) {
  return push(QUEUES.UPLOAD, {
    type:    'product.approved',
    source:  'A1',
    payload: productData,
  });
}

/**
 * Convenience: push a product-uploaded event from A2 → A3/A5.
 */
async function productUploaded(productData) {
  return push(QUEUES.CONTENT, {
    type:    'product.uploaded',
    source:  'A2',
    payload: productData,
  });
}

/**
 * Convenience: push an order-created event from Shopify webhook → A6/A8.
 */
async function orderCreated(orderData) {
  return push(QUEUES.ORDERS, {
    type:    'order.created',
    source:  'shopify-webhook',
    payload: orderData,
  });
}

/**
 * Convenience: push a low-stock event → A7.
 */
async function stockLow(inventoryData) {
  return push(QUEUES.STOCK, {
    type:    'stock.low',
    source:  'shopify-webhook',
    payload: inventoryData,
  });
}

module.exports = {
  QUEUES,
  push,
  pop,
  peek,
  depth,
  productApproved,
  productUploaded,
  orderCreated,
  stockLow,
};
