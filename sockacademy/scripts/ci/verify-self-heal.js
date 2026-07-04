// One-off verification tool for corp/core/self-heal.js (Module 3).
// Constructs a synthetic, clearly-labeled test error and runs it through
// handleFatalError() for real — creating a real (but obviously-test)
// GitHub Issue or HITL card so the actual API integrations can be verified
// end to end, not just simulated. Safe to run repeatedly; every artifact
// it creates is labeled "[SELF-HEAL TEST]" so it can be told apart from a
// real incident and closed/rejected without concern.
//
// Usage: node scripts/ci/verify-self-heal.js --mode=code|infra
//
// Env vars come directly from the environment (GitHub Actions' own env:
// block in CI). No dotenv — this script has no local .env use case since
// its whole purpose is exercising the real secrets that only exist in CI.

const { handleFatalError } = require('../../corp/core/self-heal.js');

const mode = (process.argv.find(a => a.startsWith('--mode=')) || '--mode=code').split('=')[1];

// supabase is intentionally null here — this script verifies the GitHub
// Issue / HITL card paths specifically; writeMetrics() was already verified
// separately (A3/A5, Module 2) using the exact same function, so skipping
// it here avoids needing a second copy of the Supabase client in this
// directory's own node_modules just for this one verification run.
function makeCodeError() {
  try {
    const products = undefined;
    return products.map(p => p.id);
  } catch (e) {
    e.message = `[SELF-HEAL TEST] ${e.message}`;
    return e;
  }
}

function makeInfraError() {
  return new Error('[SELF-HEAL TEST] ECONNRESET — simulated network failure for verification');
}

async function main() {
  console.log(`[verify-self-heal] Running in "${mode}" mode`);

  const err = mode === 'infra' ? makeInfraError() : makeCodeError();
  const result = await handleFatalError({
    agentId: 'A20',
    agentName: 'Inventory Intelligence (self-heal verification — safe to close/reject)',
    err,
    supabase: null,
  });

  console.log('[verify-self-heal] Result:', JSON.stringify(result, null, 2));

  if (mode === 'code' && !result.issueUrl) {
    console.error('[verify-self-heal] FAILED — expected a GitHub Issue URL, got none.');
    process.exit(1);
  }
  if (mode === 'infra' && !result.hitlId) {
    console.error('[verify-self-heal] FAILED — expected a HITL approval ID, got none.');
    process.exit(1);
  }

  console.log('[verify-self-heal] ✅ Verified.');
}

main().catch(e => {
  console.error('[verify-self-heal] Fatal:', e.message);
  process.exit(1);
});
