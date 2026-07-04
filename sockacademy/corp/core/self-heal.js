// Self-Healing Loop (Module 3, Enterprise Brain roadmap).
// Called from inside an agent's existing main().catch() — AFTER that
// agent's own notifyTelegram() alert has already fired. This module adds
// the structured, actionable follow-up on top of the Telegram ping:
//
//   - code/logic bug   -> opens a GitHub Issue with an AI-generated root-
//     cause-analysis (never opens or merges a PR — Issue only, always
//     requires a human to actually fix it)
//   - infra/credential -> creates a HITL card via the existing
//     pending_approvals system (corp/core/hitl.js), so it surfaces in
//     Guy's approval queue, not just a Telegram message that's easy to miss
//
// Reports outcome to the Command Center via writeMetrics() (Module 1).
// Never auto-merges, never auto-fixes code — HITL-gated per design.
// Every internal step is defensively wrapped so a bug in self-healing
// itself can never break an agent's existing (already-working) fatal-
// error reporting flow.
//
// Usage (inside an agent's main().catch()):
//   const { handleFatalError } = require('../../corp/core/self-heal.js');
//   await handleFatalError({ agentId: 'A20', agentName: 'Inventory Intelligence', err, supabase });

const https = require('https');
const Anthropic = require('@anthropic-ai/sdk');
const { requestApproval } = require('./hitl.js');
const { writeMetrics } = require('./metrics.js');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Signals that indicate the failure is environmental/external, not a bug in
// our own code — network blips, auth/permission problems, rate limits, or
// missing configuration. Everything else defaults to "code" (the safer
// default — an unrecognized error gets a tracked, visible Issue rather than
// being silently filed away as "just infra").
const INFRA_SIGNALS = [
  'econnreset', 'etimedout', 'enotfound', 'eai_again', 'econnrefused',
  'fetch failed', 'network timeout', 'socket hang up', 'premature close',
  '429', 'rate limit', 'rate_limit_error',
  '401', '403', 'unauthorized', 'invalid api key', 'invalid_api_key', 'authentication',
  'not set', 'missing env',
];

function classifyError(errMessage) {
  const msg = (errMessage || '').toLowerCase();
  return INFRA_SIGNALS.some(sig => msg.includes(sig)) ? 'infra' : 'code';
}

async function generateRCA(agentName, err) {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are debugging a Node.js automation agent called "${agentName}" in the SockAcademy Shopify automation fleet. It crashed with this fatal error:

MESSAGE: ${err.message}
STACK: ${err.stack || '(no stack trace available)'}

Write a concise root-cause-analysis in plain text (no markdown headers, 4-6 sentences max):
1. What most likely caused this, based on the error and stack trace.
2. Which part of the code is implicated (file/function if identifiable from the stack).
3. A concrete, actionable next step for a human developer to investigate or fix.

If you are not confident about the cause, say so plainly instead of guessing — do not invent a root cause you cannot support from the evidence given.`,
      }],
    });
    return msg.content[0].text.trim();
  } catch (e) {
    return `(RCA generation failed: ${e.message} — see raw error/stack below.)`;
  }
}

function githubRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function openGitHubIssue({ agentId, agentName, err, rca }) {
  const token = process.env.GH_PAT_SECRETS_WRITE;
  const owner = process.env.GH_REPO_OWNER;
  const repo  = process.env.GH_REPO_NAME;

  if (!token || !owner || !repo) {
    console.log('[self-heal] GitHub Issue skipped — GH_PAT_SECRETS_WRITE/GH_REPO_OWNER/GH_REPO_NAME not set');
    return null;
  }

  const body = [
    `**Agent:** ${agentId} (${agentName})`,
    `**Time:** ${new Date().toISOString()}`,
    '',
    '## Root Cause Analysis',
    rca,
    '',
    '## Raw Error',
    '```',
    err.message,
    '```',
    '',
    '## Stack Trace',
    '```',
    err.stack || '(none)',
    '```',
    '',
    '---',
    '_Opened automatically by the Self-Healing Loop (Module 3). This Issue was never auto-fixed or auto-merged — it requires human review._',
  ].join('\n');

  const payload = JSON.stringify({
    title: `[Self-Heal] ${agentId} fatal error — ${err.message.substring(0, 80)}`,
    body,
    labels: ['self-heal', 'bug', agentId],
  });

  try {
    const { status, body: responseBody } = await githubRequest({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/issues`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'sockacademy-self-heal',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }, payload);

    if (status !== 201) {
      console.error(`[self-heal] GitHub Issue creation failed (${status}): ${responseBody}`);
      return null;
    }
    const issue = JSON.parse(responseBody);
    console.log(`[self-heal] GitHub Issue opened: ${issue.html_url}`);
    return issue.html_url;
  } catch (e) {
    console.error(`[self-heal] GitHub Issue request error: ${e.message}`);
    return null;
  }
}

async function createHitlCard({ agentId, agentName, err, classification }) {
  try {
    const approvalId = await requestApproval({
      agentId,
      actionType: 'self_heal_infra_alert',
      description: `${agentName} נכשל בשגיאת תשתית/הרשאות. שגיאה: ${err.message.substring(0, 300)}`,
      payload: {
        errMessage: err.message,
        errStack: err.stack,
        classification,
        timestamp: new Date().toISOString(),
      },
    });
    console.log(`[self-heal] HITL card created: ${approvalId}`);
    return approvalId;
  } catch (e) {
    console.error(`[self-heal] HITL card creation failed: ${e.message}`);
    return null;
  }
}

async function handleFatalError({ agentId, agentName, err, supabase }) {
  let classification, issueUrl = null, hitlId = null;

  try {
    classification = classifyError(err.message);
    console.log(`[self-heal] ${agentId} fatal error classified as: ${classification}`);

    if (classification === 'code') {
      const rca = await generateRCA(agentName, err);
      issueUrl = await openGitHubIssue({ agentId, agentName, err, rca });
    } else {
      hitlId = await createHitlCard({ agentId, agentName, err, classification });
    }
  } catch (e) {
    console.error(`[self-heal] classification/routing failed (non-fatal, agent's own error handling continues): ${e.message}`);
    classification = classification || 'unknown';
  }

  if (supabase) {
    try {
      const metricDate = new Date().toISOString().split('T')[0];
      await writeMetrics(supabase, agentId, metricDate, [
        { name: 'self_heal_triggered',          value: 1, unit: 'count' },
        { name: `self_heal_${classification}`,  value: 1, unit: 'count' },
      ]);
    } catch (e) {
      console.error(`[self-heal] writeMetrics failed: ${e.message}`);
    }
  }

  return { classification, issueUrl, hitlId };
}

module.exports = { handleFatalError, classifyError };
