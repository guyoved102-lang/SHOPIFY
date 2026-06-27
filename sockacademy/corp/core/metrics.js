// Shared utility — writes KPI snapshots to command_center_metrics for Supabase Studio.
// Uses the supabase client passed in. Zero new dependencies.
//
// Usage:
//   const { writeMetrics } = require('../../corp/core/metrics.js');
//   await writeMetrics(supabase, 'A14', '2026-06-27', [
//     { name: 'agents_healthy', value: 12, unit: 'count' },
//     { name: 'revenue_7d_usd', value: 450.00, unit: 'usd' },
//   ]);
//
// Units convention: 'usd' | 'ils' | 'pct' | 'count' | 'rate' | 'days'
// Omit 'value' and set 'text' for categorical metrics.

async function writeMetrics(supabase, agentId, metricDate, metrics) {
  if (!supabase || !agentId || !metricDate || !Array.isArray(metrics) || !metrics.length) return;

  const rows = metrics
    .filter(m => m.name && (m.value !== undefined || m.text !== undefined))
    .map(m => ({
      agent_id:      agentId,
      metric_date:   metricDate,
      metric_name:   m.name,
      numeric_value: typeof m.value === 'number' && !isNaN(m.value) ? m.value : null,
      text_value:    m.text ?? null,
      unit:          m.unit ?? null,
    }));

  if (!rows.length) return;

  const { error } = await supabase
    .from('command_center_metrics')
    .upsert(rows, { onConflict: 'agent_id,metric_date,metric_name' });

  if (error) console.error(`[metrics] write failed for ${agentId}: ${error.message}`);
  else       console.log(`[metrics] ✅ ${rows.length} metrics written for ${agentId}`);
}

module.exports = { writeMetrics };
