// Refreshes n8n/FreezerBatchCocktails-v2.json from the live workflow.
//
//   N8N_KEY_FILE=<path> node n8n/refresh-workflow-snapshot.mjs
//
// READ-ONLY: does a GET and writes a local file. Never PUTs, never publishes.
//
// The committed snapshot is the workflow *definition*, not a live-environment dump. The
// live API response carries environment bindings that must not enter the repo:
//
//   - node.credentials  — credential IDs; the static test rejects any node that has them
//   - node.webhookId     — instance-specific webhook identifier
//   - shared             — owner/sharing records, i.e. account information
//   - id, activeVersionId, versionCounter, triggerCount, sourceWorkflowId,
//     createdAt, updatedAt, isArchived, activeVersion, nodeGroups, description
//
// and two fields the repo deliberately neutralises so the snapshot is a template rather
// than a claim about production state: `active` (false) and `versionId` (null).
//
// This script exists because the snapshot silently went stale once already: the Cold Open
// welcome was published to n8n on 2026-08-01 and the repo copy was never updated, so the
// static test kept passing against a definition nobody was running. Run this after every
// publish.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redactNode, assertNoSecrets } from './redact-workflow-secrets.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.join(HERE, 'FreezerBatchCocktails-v2.json');
const WORKFLOW_ID = 'oAutYB68sxicWzZZ';

// Exactly the top-level keys the committed snapshot carries, in its existing order.
const KEEP_TOP = ['name', 'nodes', 'pinData', 'connections', 'active', 'settings', 'versionId', 'meta', 'tags'];
// Exactly the node keys it carries.
const KEEP_NODE = ['parameters', 'id', 'name', 'type', 'typeVersion', 'position'];

async function loadLive() {
  const keyPath = process.env.N8N_KEY_FILE;
  if (!keyPath || !fs.existsSync(keyPath)) {
    throw new Error('set N8N_KEY_FILE to a file containing the n8n API key');
  }
  const key = fs.readFileSync(keyPath, 'utf8').trim();
  const res = await fetch(`https://zax76.app.n8n.cloud/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': key, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GET workflow -> ${res.status} ${res.statusText}`);
  return res.json();
}

const live = await loadLive();
console.log(`live: versionId ${live.versionId}  updatedAt ${live.updatedAt}  nodes ${live.nodes.length}`);

// Back up what we are about to replace, outside the repo.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(os.homedir(), 'n8n-backups');
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(TARGET, path.join(backupDir, `FreezerBatchCocktails-v2.repo-snapshot-before-${stamp}.json`));

const prev = JSON.parse(fs.readFileSync(TARGET, 'utf8'));

const snapshot = {};
for (const k of KEEP_TOP) snapshot[k] = live[k];
snapshot.nodes = live.nodes.map((n) => {
  const out = {};
  for (const k of KEEP_NODE) if (k in n) out[k] = n[k];
  // The live workflow hardcodes the webhook secret in a code node. It must never land here.
  return redactNode(out);
});
// Template, not a claim about production state.
snapshot.active = false;
snapshot.versionId = null;
// live.meta is null; the snapshot's marker is meaningful to n8n's importer, so keep it.
snapshot.meta = prev.meta ?? { templateCredsSetupCompleted: false };
snapshot.pinData = live.pinData ?? {};
snapshot.tags = live.tags ?? [];

// ── guards: nothing environment-specific may survive ────────────────────────
const blob = JSON.stringify(snapshot);
for (const [label, probe] of [
  ['credential bindings', (s) => s.nodes.some((n) => 'credentials' in n)],
  ['webhookId', (s) => s.nodes.some((n) => 'webhookId' in n)],
  ['sharing/owner records', () => 'shared' in snapshot],
  ['workflow id', () => 'id' in snapshot],
]) {
  if (probe(snapshot)) throw new Error(`refusing to write: snapshot still contains ${label}`);
}
if (/"(createdAt|updatedAt|activeVersionId|sourceWorkflowId|triggerCount)"/.test(blob)) {
  throw new Error('refusing to write: snapshot still contains environment metadata');
}

fs.writeFileSync(TARGET, JSON.stringify(snapshot, null, 2) + '\n');

// ── report what moved ───────────────────────────────────────────────────────
const byName = (w) => Object.fromEntries(w.nodes.map((n) => [n.name, n]));
const a = byName(prev), b = byName(snapshot);
const changed = Object.keys(b).filter((n) => a[n] && JSON.stringify(a[n].parameters) !== JSON.stringify(b[n].parameters));
console.log(`\nnodes: ${prev.nodes.length} -> ${snapshot.nodes.length}`);
console.log(`only in live: ${Object.keys(b).filter((n) => !a[n]).join(', ') || '(none)'}`);
console.log(`only in old snapshot: ${Object.keys(a).filter((n) => !b[n]).join(', ') || '(none)'}`);
console.log(`parameters changed: ${changed.length ? changed.join(', ') : '(none)'}`);
for (const n of changed) {
  const before = a[n].parameters.jsCode?.length, after = b[n].parameters.jsCode?.length;
  if (before || after) console.log(`  ${n}: jsCode ${before ?? '-'} -> ${after ?? '-'} chars`);
}
console.log(`\nsettings: ${JSON.stringify(snapshot.settings)}`);
console.log(`wrote ${path.relative(path.join(HERE, '..'), TARGET)} (active:false, versionId:null, no credentials)`);
