'use strict';

/**
 * Command Center — unified KPI snapshot reader.
 *
 * Reads the existing `command_center_latest` view (see command_center_metrics.sql)
 * and groups it by Super-Agent cluster (reusing the canonical CLUSTERS map from
 * corp/core/orchestration/index.js — DRY, one source of truth for agent→cluster).
 *
 * Zero dependencies, zero external API calls — pure Supabase read + reshape.
 * Called by A0 as one of three inputs (health + KPIs + inbox) for the unified
 * daily brief. Never throws on missing data — returns an empty-but-valid shape
 * so A0's brief always renders, even before any agent has written metrics.
 *
 * Usage:
 *   const { getCommandCenterSnapshot } = require('../../corp/core/command-center.js');
 *   const snapshot = await getCommandCenterSnapshot(supabase);
 */

const { CLUSTERS } = require('./orchestration/index.js');

// Invert CLUSTERS ({clusterName: [agentIds]}) → {agentId: clusterName} once at load time.
const AGENT_CLUSTER = {};
for (const [clusterName, agentIds] of Object.entries(CLUSTERS)) {
  for (const agentId of agentIds) AGENT_CLUSTER[agentId] = clusterName;
}

function clusterFor(agentId) {
  return AGENT_CLUSTER[agentId] || 'Unclustered';
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {{
 *   byCluster: Record<string, Array<{agentId, metricName, value, unit, metricDate}>>,
 *   byAgent:   Record<string, Array<{metricName, value, unit, metricDate}>>,
 *   totalMetrics: number,
 *   isEmpty: boolean,
 * }}
 */
async function getCommandCenterSnapshot(supabase) {
  const empty = { byCluster: {}, byAgent: {}, totalMetrics: 0, isEmpty: true };

  if (!supabase) return empty;

  const { data: rows, error } = await supabase
    .from('command_center_latest')
    .select('agent_id, metric_name, metric_date, numeric_value, text_value, unit');

  if (error) {
    console.warn(`[command-center] read failed: ${error.message}`);
    return empty;
  }
  if (!rows || rows.length === 0) return empty;

  const byCluster = {};
  const byAgent   = {};

  for (const row of rows) {
    const entry = {
      agentId:    row.agent_id,
      metricName: row.metric_name,
      value:      row.numeric_value ?? row.text_value ?? null,
      unit:       row.unit || null,
      metricDate: row.metric_date,
    };

    const cluster = clusterFor(row.agent_id);
    (byCluster[cluster] ||= []).push(entry);
    (byAgent[row.agent_id] ||= []).push({
      metricName: entry.metricName,
      value:      entry.value,
      unit:       entry.unit,
      metricDate: entry.metricDate,
    });
  }

  return { byCluster, byAgent, totalMetrics: rows.length, isEmpty: false };
}

module.exports = { getCommandCenterSnapshot };
