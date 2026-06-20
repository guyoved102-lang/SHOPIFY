'use strict';

/**
 * LangFuse Observability — SockAcademy shared tracing module
 *
 * Wraps every LLM call with trace/span so we can monitor:
 *   - cost per agent per run
 *   - latency per model
 *   - prompt quality over time
 *   - errors and retries
 *
 * Usage in any agent:
 *   const obs = require('../../corp/core/observability');
 *   const trace = obs.startTrace({ agentId: 'A10', runId: Date.now().toString() });
 *   const result = await obs.traceLLM(trace, 'trend-analysis', () => callClaude(prompt));
 *   await obs.endTrace(trace, { status: 'success' });
 *
 * Gracefully no-ops when LANGFUSE_SECRET_KEY is absent (local dev without creds).
 */

const { Langfuse } = require('langfuse');

let _client = null;

function getClient() {
  if (_client) return _client;

  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const host      = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com';

  if (!secretKey || !publicKey) {
    return null; // graceful no-op
  }

  _client = new Langfuse({ secretKey, publicKey, baseUrl: host, flushAt: 1 });
  return _client;
}

/**
 * Start a top-level trace for one agent run.
 * @param {{ agentId: string, runId: string, metadata?: object }} opts
 * @returns trace handle (opaque — pass to traceLLM / endTrace)
 */
function startTrace({ agentId, runId, metadata = {} }) {
  const client = getClient();
  if (!client) return { _noop: true, agentId, runId };

  const trace = client.trace({
    name:     `${agentId}-run`,
    id:       `${agentId}-${runId}`,
    metadata: { agentId, runId, env: process.env.NODE_ENV || 'production', ...metadata },
    tags:     [agentId, 'sockacademy'],
  });

  return { _trace: trace, agentId, runId };
}

/**
 * Wrap an async LLM call in a span that records input, output, model, and latency.
 * @param {object} traceHandle   from startTrace()
 * @param {string} spanName      e.g. "trend-analysis", "copy-generation"
 * @param {object} opts          { model, input, fn }
 * @returns whatever fn() returns
 */
async function traceLLM(traceHandle, spanName, { model = 'claude-sonnet-4-6', input = '', fn }) {
  if (traceHandle._noop) return fn();

  const span = traceHandle._trace.generation({
    name:  spanName,
    model,
    input,
    startTime: new Date(),
  });

  const t0 = Date.now();
  try {
    const output = await fn();
    span.end({
      output,
      endTime: new Date(),
      metadata: { latencyMs: Date.now() - t0 },
    });
    return output;
  } catch (err) {
    span.end({
      level:    'ERROR',
      statusMessage: err.message,
      endTime: new Date(),
      metadata: { latencyMs: Date.now() - t0 },
    });
    throw err;
  }
}

/**
 * Wrap a generic async operation (non-LLM) in a span.
 */
async function traceSpan(traceHandle, spanName, fn, metadata = {}) {
  if (traceHandle._noop) return fn();

  const span = traceHandle._trace.span({ name: spanName, metadata });
  try {
    const result = await fn();
    span.end({ metadata: { ...metadata, status: 'ok' } });
    return result;
  } catch (err) {
    span.end({ level: 'ERROR', statusMessage: err.message });
    throw err;
  }
}

/**
 * Finalise the trace (success or failure).
 * Always call this — even on error — so LangFuse closes the trace.
 */
async function endTrace(traceHandle, { status = 'success', error = null } = {}) {
  if (traceHandle._noop) return;

  traceHandle._trace.update({
    output:   status,
    metadata: { finalStatus: status, error: error?.message || null },
  });

  const client = getClient();
  if (client) await client.flushAsync();
}

module.exports = { startTrace, traceLLM, traceSpan, endTrace };
