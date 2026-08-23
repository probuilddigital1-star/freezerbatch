// Builds the proposed post-republish workflow JSON and a node-level diff.
//
//   node n8n/republish-2026-08/build-republish.mjs
//
// READ-ONLY against n8n. This script never PUTs and never publishes. It fetches the live
// workflow (GET), constructs the modified definition, writes it to proposed-workflow.json
// beside this file, and prints what changed. Applying it is a separate, deliberate step —
// see APPLY.md.

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redactNode, assertNoSecrets } from '../redact-workflow-secrets.mjs';

// ─────────────────────────────────────────────────────────────────────────────
//  THE ONE FILL-IN — supplied at build time, never stored in this file.
//
//  This file is tracked and the repository is public. The CAN-SPAM footer value
//  is a home address, so it is passed in rather than committed:
//
//    POSTAL_ADDRESS='…'          node n8n/republish-2026-08/build-republish.mjs
//    POSTAL_ADDRESS_FILE=<path>  node n8n/republish-2026-08/build-republish.mjs
//
//  Until one is provided the build still succeeds, but the generated build node
//  refuses to send at runtime — deliberately. CAN-SPAM requires the address.
// ─────────────────────────────────────────────────────────────────────────────
function readPostalAddress() {
  const file = process.env.POSTAL_ADDRESS_FILE;
  if (file) {
    if (!fs.existsSync(file)) throw new Error(`POSTAL_ADDRESS_FILE does not exist: ${file}`);
    return fs.readFileSync(file, 'utf8').trim();
  }
  return (process.env.POSTAL_ADDRESS || '').trim();
}
export const POSTAL_ADDRESS = readPostalAddress();
// ─────────────────────────────────────────────────────────────────────────────

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..', '..');
const EMAILS = path.join(REPO, 'n8n', 'emails', 'cold-open');
const WORKFLOW_ID = 'oAutYB68sxicWzZZ';

const WELCOME_NODE = 'Build Newsletter Double Opt-In Confirmation';
const RECIPE_NODE = 'Build Transactional Recipe Email';

const SUBJECT = 'Your free label sheet is inside';

const TOKENS = {
  '{{LABEL_SHEET_URL}}': 'https://freezerbatchcocktails.com/downloads/fbc-bottle-labels.pdf',
  '{{TIMING_SHEET_URL}}': 'https://freezerbatchcocktails.com/downloads/fbc-batch-timing.pdf',
  '{{RECIPE_URL}}': 'https://freezerbatchcocktails.com/cocktails/negroni',
  // Restored 2026-08-23. Deployed and verified image/jpeg, 1200x630; the row was
  // removed 08-01 only because no Negroni photograph existed yet.
  '{{IMAGE_URL}}': 'https://freezerbatchcocktails.com/images/cocktails/negroni-og.jpg',
  // Dated block, live through Mon Sep 7 2026 — the swap comment in welcome.html
  // names the replacement. The evergreen version links /blog/ literally, so
  // removing this token at the swap needs no change here (unused map entries
  // are harmless; only template tokens must be mapped).
  '{{LABOR_DAY_URL}}': 'https://freezerbatchcocktails.com/blog/batch-ahead-for-labor-day/',
  '{{UNSUBSCRIBE_URL}}': 'https://freezerbatchcocktails.com/unsubscribe',
  '{{COMPANY_NAME}}': 'Freezer Batch Cocktails',
  '{{POSTAL_ADDRESS}}': POSTAL_ADDRESS,
};

// ── source of truth: the live workflow ───────────────────────────────────────
async function loadLiveWorkflow() {
  const keyPath = process.env.N8N_KEY_FILE;
  if (keyPath && fs.existsSync(keyPath)) {
    const key = fs.readFileSync(keyPath, 'utf8').trim();
    const res = await fetch(`https://zax76.app.n8n.cloud/api/v1/workflows/${WORKFLOW_ID}`, {
      headers: { 'X-N8N-API-KEY': key, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`GET workflow -> ${res.status} ${res.statusText}`);
    console.log('baseline: fresh GET from n8n');
    return res.json();
  }
  // Fall back to the newest read-only export in ~/n8n-backups (never the repo).
  const dir = path.join(os.homedir(), 'n8n-backups');
  const candidates = fs.readdirSync(dir).filter((f) => f.startsWith('FreezerBatchCocktails-v2.')).sort();
  if (!candidates.length) throw new Error('no export in ~/n8n-backups and no N8N_KEY_FILE set');
  const file = path.join(dir, candidates[candidates.length - 1]);
  console.log(`baseline: newest local export ${path.basename(file)}`);
  console.log('  (set N8N_KEY_FILE=<path> to fetch a fresh one instead)');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// ── welcome build node ───────────────────────────────────────────────────────
function buildWelcomeCode() {
  const tpl = fs.readFileSync(path.join(EMAILS, 'welcome.html'), 'utf8');

  const present = [...new Set(tpl.match(/\{\{[A-Z_0-9]+\}\}/g) || [])];
  const unmapped = present.filter((t) => !(t in TOKENS));
  if (unmapped.length) throw new Error(`welcome.html has unmapped tokens: ${unmapped.join(', ')}`);

  const TEXT = [
    'COLD OPEN BY FBC',
    '',
    "You're in. Here's your free label sheet.",
    '',
    'Download your free label sheet: ' + TOKENS['{{LABEL_SHEET_URL}}'],
    '',
    'Before you print',
    '  Full-sheet label stock or plain cardstock. Die-cut sheets will not match the grid.',
    '  Cut on the dashed lines.',
    '  Apply to a dry, room-temperature bottle before the first freeze, or hang it as a neck tag.',
    '',
    'Also free - the batch timing sheet, how long each of the 18 recipes keeps in the freezer:',
    '  ' + TOKENS['{{TIMING_SHEET_URL}}'],
    '',
    // DATED — swap with the html block on Tue Sep 8 2026 (see welcome.html):
    // 'Not sure where to start? The guides: https://freezerbatchcocktails.com/blog/'
    'Batching for Labor Day? Friday, August 28 is the day - a margarita batched then',
    'is at its best over the weekend of the 5th, with the lime still sharp:',
    '  ' + TOKENS['{{LABOR_DAY_URL}}'],
    '',
    'What arrives, and how often',
    '  Monthly - one make-ahead recipe and a hosting timeline.',
    '  Occasionally - a short countdown series before the big hosting holidays.',
    '  Never - daily email, countdown clocks, or anything shouting LAST CHANCE.',
    '',
    'Start here: batch the Negroni - ' + TOKENS['{{RECIPE_URL}}'],
    '',
    '---',
    'Unsubscribe: ' + TOKENS['{{UNSUBSCRIBE_URL}}'],
    TOKENS['{{COMPANY_NAME}}'],
    '__POSTAL_ADDRESS_LINE__',
    'For readers 21+. Please drink responsibly.',
  ].join('\n');

  return `const data = $input.first().json;

// Cold Open welcome email. Source of truth: n8n/emails/cold-open/welcome.html in the site
// repo — edit there and re-run n8n/republish-2026-08/build-republish.mjs. Do not hand-edit
// this node; the next build would silently overwrite it. No build timestamp here on
// purpose, so re-running produces a byte-identical node and the diff stays honest.
const TEMPLATE = ${JSON.stringify(tpl)};

const TOKENS = ${JSON.stringify(TOKENS, null, 2)};

let html = TEMPLATE;
for (const [token, value] of Object.entries(TOKENS)) {
  html = html.split(token).join(value);
}

let text = ${JSON.stringify(TEXT)};
text = text.replace('__POSTAL_ADDRESS_LINE__', TOKENS['{{POSTAL_ADDRESS}}']);

// ── fail closed ─────────────────────────────────────────────────────────────
// Same posture as the unsubscribe guard that has been live since 2026-08-01: refuse to
// hand Resend a message that is legally or functionally broken, rather than sending it.
const leftover = html.match(/\\{\\{[^}]*\\}\\}/g);
if (leftover) {
  throw new Error('Unresolved merge tokens in welcome email: ' + [...new Set(leftover)].join(', '));
}
if (!TOKENS['{{UNSUBSCRIBE_URL}}'] || !html.includes(TOKENS['{{UNSUBSCRIBE_URL}}'])) {
  throw new Error('Welcome email is missing its unsubscribe link');
}
if (!TOKENS['{{TIMING_SHEET_URL}}'] || !html.includes(TOKENS['{{TIMING_SHEET_URL}}'])) {
  throw new Error('Welcome email is missing the batch timing sheet link');
}
// The hero must be an absolute https URL. A relative or empty src renders as a
// broken image in every inbox, which is worse than the no-image version this
// replaces — and the site answers 200 text/html for missing paths, so a typo
// would not even fail loudly. Written without a regex on purpose: this string is
// emitted through a template literal, which silently eats backslash escapes.
const heroUrl = (TOKENS['{{IMAGE_URL}}'] || '').trim();
if (!heroUrl.startsWith('https://') || heroUrl.includes(' ')) {
  throw new Error('Welcome email hero image URL is missing or not an absolute https URL');
}
if (!html.includes(heroUrl)) {
  throw new Error('Welcome email hero image did not render into the html');
}
// CAN-SPAM: a marketing email without a physical mailing address must not go out.
const postal = (TOKENS['{{POSTAL_ADDRESS}}'] || '').trim();
if (!postal) {
  throw new Error('Welcome email has no postal address: refusing to send (CAN-SPAM)');
}
if (!html.includes(postal) || !text.includes(postal)) {
  throw new Error('Welcome email postal address did not render into both html and text');
}

return [{ json: { ...data, html, text, subject: ${JSON.stringify(SUBJECT)} } }];
`;
}

// ── recipe build node ────────────────────────────────────────────────────────
function stripFragment(raw) {
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('');
}

function buildRecipeCode(currentCode) {
  const fragment = stripFragment(fs.readFileSync(path.join(EMAILS, 'recipe-utility-line.html'), 'utf8'));
  if (/[`]|\$\{/.test(fragment)) {
    throw new Error('utility fragment contains a backtick or ${ — it would break the template literal');
  }
  if (currentCode.includes(fragment)) {
    console.log('  recipe node: utility line already present, no change');
    return currentCode;
  }
  const ANCHOR = "<p><a href='${escapeHtml(websiteUrl)}/cocktails'>Browse cocktails</a></p>";
  const n = currentCode.split(ANCHOR).length - 1;
  if (n !== 1) throw new Error(`recipe node: expected 1 anchor occurrence, found ${n}`);
  return currentCode.replace(ANCHOR, fragment + ANCHOR);
}

// ── main ─────────────────────────────────────────────────────────────────────
const live = await loadLiveWorkflow();
console.log(`  versionId ${live.versionId}  updatedAt ${live.updatedAt}  nodes ${live.nodes.length}`);

const proposed = JSON.parse(JSON.stringify(live));
const changes = [];

const welcome = proposed.nodes.find((n) => n.name === WELCOME_NODE);
if (!welcome) throw new Error(`node not found: ${WELCOME_NODE}`);
const oldWelcome = welcome.parameters.jsCode;
welcome.parameters.jsCode = buildWelcomeCode();
if (oldWelcome !== welcome.parameters.jsCode) {
  changes.push([WELCOME_NODE, oldWelcome.length, welcome.parameters.jsCode.length]);
}

const recipe = proposed.nodes.find((n) => n.name === RECIPE_NODE);
if (!recipe) throw new Error(`node not found: ${RECIPE_NODE}`);
const oldRecipe = recipe.parameters.jsCode;
recipe.parameters.jsCode = buildRecipeCode(oldRecipe);
if (oldRecipe !== recipe.parameters.jsCode) {
  changes.push([RECIPE_NODE, oldRecipe.length, recipe.parameters.jsCode.length]);
}

// Nothing else may move.
const touched = proposed.nodes.filter((n, i) => JSON.stringify(n) !== JSON.stringify(live.nodes[i])).map((n) => n.name);
const expected = new Set([WELCOME_NODE, RECIPE_NODE]);
const unexpected = touched.filter((n) => !expected.has(n));
if (unexpected.length) throw new Error(`unexpected node changes: ${unexpected.join(', ')}`);
if (JSON.stringify(proposed.connections) !== JSON.stringify(live.connections)) throw new Error('connections drifted');
if (JSON.stringify(proposed.settings) !== JSON.stringify(live.settings)) throw new Error('settings drifted');

// ── artifacts ────────────────────────────────────────────────────────────────
// The two jsCode payloads ARE the change. Apply these on top of a fresh live export so
// credential bindings survive — see APPLY.md.
fs.writeFileSync(path.join(HERE, 'welcome-node.jsCode.js'), welcome.parameters.jsCode);
fs.writeFileSync(path.join(HERE, 'recipe-node.jsCode.js'), recipe.parameters.jsCode);

// The review copy is credential-STRIPPED, because the repo must never carry credential
// bindings (n8n/FreezerBatchCocktails-v2.static-test.mjs enforces this, and it caught a
// live export being written here). Stripping makes the file safe to commit and safe to
// static-test — and unsafe to PUT, since PUTting it would unbind Resend and Google Sheets
// from six nodes. Hence the filename and the _warning key.
// Whitelist the top level to the same shape the committed snapshot uses. A live API
// response also carries `activeVersion` — a complete nested copy of the published
// workflow, i.e. a SECOND copy of every node and therefore of the hardcoded secret —
// plus `shared` (owner records) and instance metadata. Copying the response wholesale
// and only cleaning `nodes` leaks all of it, which is exactly what happened in fdecbf5.
const KEEP_TOP = ['name', 'nodes', 'pinData', 'connections', 'active', 'settings', 'versionId', 'meta', 'tags'];
const KEEP_NODE = ['parameters', 'id', 'name', 'type', 'typeVersion', 'position'];

const review = {};
for (const k of KEEP_TOP) review[k] = JSON.parse(JSON.stringify(proposed[k] ?? null));
review.active = false;
review.versionId = null;
review.meta = { templateCredsSetupCompleted: false };
review.pinData = review.pinData ?? {};
review.tags = review.tags ?? [];

let stripped = 0;
review.nodes = proposed.nodes.map((src) => {
  if (src.credentials) stripped++;
  const n = {};
  for (const k of KEEP_NODE) if (k in src) n[k] = JSON.parse(JSON.stringify(src[k]));
  // The live workflow hardcodes the webhook secret in a code node — redact before commit.
  return redactNode(n);
});
review._warning =
  'REVIEW AND STATIC-TEST ONLY. Credential bindings have been stripped so this file is safe ' +
  'to commit. Do NOT PUT this JSON: it would unbind Resend and Google Sheets from ' +
  stripped + ' nodes. Apply welcome-node.jsCode.js and recipe-node.jsCode.js on top of a ' +
  'fresh live export instead — see APPLY.md.';
const reviewSerialised = JSON.stringify(review, null, 2);
assertNoSecrets(reviewSerialised, 'proposed-workflow.REVIEW-ONLY.json');
fs.writeFileSync(path.join(HERE, 'proposed-workflow.REVIEW-ONLY.json'), reviewSerialised);
console.log(`\n  credential bindings stripped from ${stripped} nodes for the committed review copy`);

console.log('\n=== node-level diff ===');
for (const [name, before, after] of changes) {
  console.log(`  ${name}: jsCode ${before} -> ${after} chars`);
}
console.log(`  nodes changed: ${touched.length} of ${live.nodes.length} (${touched.join(', ') || 'none'})`);
console.log(`  connections: unchanged   settings: unchanged   credentials: untouched`);
console.log(`\n  welcome subject: ${JSON.stringify(SUBJECT)}`);
// Never echo the value: it is a home address, and this output lands in terminals,
// CI logs and pasted reports. Confirm it resolved, and prove which one it is with a
// short digest rather than the text.
console.log(
  `  POSTAL_ADDRESS: ${
    POSTAL_ADDRESS
      ? `set (${POSTAL_ADDRESS.length} chars, sha256 ${createHash('sha256').update(POSTAL_ADDRESS).digest('hex').slice(0, 12)}) — value not printed`
      : '(EMPTY — build node will refuse to send until filled)'
  }`,
);
console.log('\nwrote proposed-workflow.REVIEW-ONLY.json + the two jsCode payloads — nothing was sent to n8n.');
