'use strict';

/**
 * SA-6 Orchestrator — Decision Engine
 *
 * Called by A0 agent.js with an already-connected Supabase client.
 * Returns health map, cluster scores, and action decisions.
 *
 * Super-Agent Clusters (architecture: 20/06/2026):
 *   SA-1 Intelligence: A1, A10, A11, A13
 *   SA-2 Content:      A2, A3, A5
 *   SA-3 Revenue:      A4, A6
 *   SA-4 Operations:   A7, A12, A9
 *   SA-5 Analytics:    A8
 *
 * No dependencies — accepts supabase client via parameter (dependency injection).
 * Graceful: will not throw if individual agents are missing from health log.
 */

const CLUSTERS = {
  'SA-1 Intelligence': ['A1', 'A10', 'A11', 'A13'],
  'SA-2 Content':      ['A2', 'A3', 'A5'],
  'SA-3 Revenue':      ['A4', 'A6'],
  'SA-4 Operations':   ['A7', 'A12', 'A9'],
  'SA-5 Analytics':    ['A8'],
};

// Max hours since last successful run before agent is considered stale.
// null = no schedule expectation (manual-only agents).
const STALENESS_HOURS = {
  A0:  36,    // daily
  A1:  200,   // weekly
  A2:  36,    // daily
  A3:  200,   // weekly
  A4:  200,   // weekly
  A5:  200,   // weekly
  A6:  200,   // weekly
  A7:  200,   // weekly
  A8:  200,   // weekly
  A9:  null,  // manual only
  A10: 36,    // daily
  A11: 200,   // weekly
  A12: 200,   // weekly
  A13: 200,   // weekly
  A17: null,  // bimonthly, no strict threshold
};

// ─── HEALTH DATA ─────────────────────────────────────────────────────────────

async function fetchHealthMap(supabase) {
  const { data: rows, error } = await supabase
    .from('agent_health_log')
    .select('agent_id, agent_name, run_status, error_message, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`SA-6: agent_health_log read failed: ${error.message}`);

  const map = {};
  for (const row of rows || []) {
    if (!map[row.agent_id]) {
      map[row.agent_id] = {
        agentId:      row.agent_id,
        agentName:    row.agent_name || row.agent_id,
        status:       row.run_status || '',
        lastRun:      row.created_at || null,
        errorMessage: row.error_message || '',
      };
    }
  }
  return map;
}

// ─── STALENESS ────────────────────────────────────────────────────────────────

function isStale(lastRunIso, agentId) {
  const threshold = STALENESS_HOURS[agentId];
  if (!threshold || !lastRunIso) return false;
  const hoursSince = (Date.now() - new Date(lastRunIso).getTime()) / 3_600_000;
  return hoursSince > threshold;
}

// ─── CLUSTER SCORING ──────────────────────────────────────────────────────────

function scoreCluster(healthMap) {
  const scores = {};
  for (const [clusterName, agentIds] of Object.entries(CLUSTERS)) {
    let healthy = 0;
    let failing = 0;
    let noData  = 0;
    let stale   = 0;

    for (const agentId of agentIds) {
      const entry = healthMap[agentId];
      if (!entry) {
        noData++;
        continue;
      }
      const status = (entry.status || '').toLowerCase();
      if (status === 'failure' || status === 'error') {
        failing++;
      } else if (isStale(entry.lastRun, agentId)) {
        stale++;
      } else {
        healthy++;
      }
    }

    const total = agentIds.length;
    scores[clusterName] = {
      healthy,
      failing,
      stale,
      noData,
      total,
      score: Math.round((healthy / total) * 100),
    };
  }
  return scores;
}

// ─── DECISION ENGINE ──────────────────────────────────────────────────────────

function generateDecisions(healthMap, clusterScores) {
  const decisions = [];

  // Per-agent checks
  for (const [agentId, entry] of Object.entries(healthMap)) {
    const status = (entry.status || '').toLowerCase();
    if (status === 'failure' || status === 'error') {
      decisions.push({
        severity: 'critical',
        type:     'AGENT_FAILING',
        agentId,
        message:  `${agentId} (${entry.agentName}) last run FAILED — ${entry.errorMessage || 'no error message'}`,
      });
    } else if (isStale(entry.lastRun, agentId)) {
      decisions.push({
        severity: 'warning',
        type:     'AGENT_STALE',
        agentId,
        message:  `${agentId} (${entry.agentName}) has not run in >${STALENESS_HOURS[agentId]}h`,
      });
    }
  }

  // Agents tracked in clusters but with no health log entry at all
  const clusteredAgents = Object.values(CLUSTERS).flat();
  for (const agentId of clusteredAgents) {
    if (!healthMap[agentId]) {
      decisions.push({
        severity: 'warning',
        type:     'AGENT_NO_DATA',
        agentId,
        message:  `${agentId} has never written to agent_health_log`,
      });
    }
  }

  // Cluster-level checks
  for (const [clusterName, score] of Object.entries(clusterScores)) {
    if (score.score < 50) {
      decisions.push({
        severity: 'critical',
        type:     'CLUSTER_DEGRADED',
        agentId:  clusterName,
        message:  `${clusterName} is degraded: only ${score.healthy}/${score.total} agents healthy`,
      });
    } else if (score.score < 100) {
      decisions.push({
        severity: 'warning',
        type:     'CLUSTER_PARTIAL',
        agentId:  clusterName,
        message:  `${clusterName} partially healthy: ${score.healthy}/${score.total} agents OK`,
      });
    }
  }

  return decisions;
}

// ─── QUEUE DEPTH MONITORING ──────────────────────────────────────────────────

const QUEUES = {
  UPLOAD:  'sa:queue:upload',
  CONTENT: 'sa:queue:content',
  ORDERS:  'sa:queue:orders',
  STOCK:   'sa:queue:stock',
  INTEL:   'sa:queue:intel',
};

const QUEUE_DEPTH_WARN = 20;

async function checkQueueDepths() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  const depths = {};
  await Promise.all(
    Object.entries(QUEUES).map(async ([name, key]) => {
      try {
        const res  = await fetch(`${url}/llen/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        depths[name] = typeof json.result === 'number' ? json.result : 0;
      } catch {
        depths[name] = -1;
      }
    })
  );
  return depths;
}

// ─── HITL BACKLOG ─────────────────────────────────────────────────────────────

async function checkHitLBacklog(supabase) {
  const { count, error } = await supabase
    .from('pending_approvals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.warn(`[SA-6] Could not read pending_approvals: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

// ─── MAIN ENTRY POINT ────────────────────────────────────────────────────────

/**
 * Run the SA-6 decision engine.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {{
 *   healthMap:     Record<string, object>,
 *   clusterScores: Record<string, object>,
 *   decisions:     Array<{severity, type, agentId, message}>,
 *   hitlBacklog:   number,
 *   criticalCount: number,
 *   warningCount:  number,
 * }}
 */
async function runOrchestration(supabase) {
  const healthMap     = await fetchHealthMap(supabase);
  const clusterScores = scoreCluster(healthMap);
  const decisions     = generateDecisions(healthMap, clusterScores);

  const hitlBacklog = await checkHitLBacklog(supabase);
  if (hitlBacklog > 5) {
    decisions.push({
      severity: 'warning',
      type:     'HITL_BACKLOG',
      agentId:  'A0',
      message:  `${hitlBacklog} pending HitL approvals in queue — review required`,
    });
  }

  const queueDepths = await checkQueueDepths();
  if (queueDepths) {
    for (const [name, depth] of Object.entries(queueDepths)) {
      if (depth >= QUEUE_DEPTH_WARN) {
        decisions.push({
          severity: 'warning',
          type:     'QUEUE_OVERFLOW',
          agentId:  'A0',
          message:  `${name} queue has ${depth} unprocessed events — consumer may be stuck`,
        });
      }
    }
  }

  const criticalCount = decisions.filter(d => d.severity === 'critical').length;
  const warningCount  = decisions.filter(d => d.severity === 'warning').length;

  console.log(`\n[SA-6] Decision Engine:`);
  console.log(`   Agents in health log:  ${Object.keys(healthMap).length}`);
  console.log(`   Critical decisions:    ${criticalCount}`);
  console.log(`   Warnings:              ${warningCount}`);
  console.log(`   HitL pending:          ${hitlBacklog}`);
  if (queueDepths) {
    const queueSummary = Object.entries(queueDepths).map(([n, d]) => `${n}:${d}`).join(' ');
    console.log(`   Queue depths:          ${queueSummary}`);
  } else {
    console.log(`   Queue depths:          Upstash not configured`);
  }

  if (decisions.length > 0) {
    for (const d of decisions) {
      const icon = d.severity === 'critical' ? '🔴' : '⚠️ ';
      console.log(`   ${icon} [${d.type}] ${d.message}`);
    }
  } else {
    console.log('   ✅ All agents and clusters healthy');
  }

  return { healthMap, clusterScores, decisions, hitlBacklog, queueDepths, criticalCount, warningCount };
}

module.exports = { runOrchestration, CLUSTERS, STALENESS_HOURS, QUEUES, QUEUE_DEPTH_WARN };
