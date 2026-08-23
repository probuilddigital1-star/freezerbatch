// Proves the proposed workflow is safe to apply, without touching n8n.
//
//   node n8n/republish-2026-08/verify-republish.mjs
//
// 1. Executes the generated welcome build node with NO postal address -> must throw.
// 2. Executes it with an address -> must produce html + text carrying every required link.
// 3. Asserts the recipe node carries the utility line and still returns a subject.
// 4. Runs the repo's real static test unmodified against proposed-workflow.json.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..', '..');
const PROPOSED = path.join(HERE, "proposed-workflow.REVIEW-ONLY.json");

const wf = JSON.parse(fs.readFileSync(PROPOSED, 'utf8'));
const node = (name) => {
  const n = wf.nodes.find((x) => x.name === name);
  assert.ok(n, `node present: ${name}`);
  return n;
};

const welcomeCode = node('Build Newsletter Double Opt-In Confirmation').parameters.jsCode;
const recipeCode = node('Build Transactional Recipe Email').parameters.jsCode;

const run = (code, input) => new Function('$input', code)({ first: () => ({ json: input }) });
const SAMPLE = { email: 'someone@example.com', requestId: 'req-verify' };

let passed = 0;
const ok = (label) => { console.log(`  PASS  ${label}`); passed++; };

// ── 1. fail closed with no postal address ───────────────────────────────────
assert.match(welcomeCode, /"\{\{POSTAL_ADDRESS\}\}": ""/, 'address is currently empty in the built node');
assert.throws(() => run(welcomeCode, SAMPLE), /postal address/i, 'refuses to send without an address');
ok('welcome node refuses to send with no postal address (CAN-SPAM guard)');

// ── 2. succeeds once the address is filled ──────────────────────────────────
const TEST_ADDRESS = 'PO Box 000, Anytown ST 00000';
const filled = welcomeCode.replace('"{{POSTAL_ADDRESS}}": ""', `"{{POSTAL_ADDRESS}}": ${JSON.stringify(TEST_ADDRESS)}`);
assert.notEqual(filled, welcomeCode, 'address substitution applied');

const out = run(filled, SAMPLE);
const j = out[0].json;

assert.equal(j.subject, 'Your free label sheet is inside');
ok(`welcome subject is ${JSON.stringify(j.subject)}`);

assert.equal(j.html.match(/\{\{[^}]*\}\}/g), null, 'no unresolved tokens in html');
ok('no unresolved merge tokens survive');

for (const [label, needle] of [
  ['label sheet URL', '/downloads/fbc-bottle-labels.pdf'],
  ['timing sheet URL', '/downloads/fbc-batch-timing.pdf'],
  ['unsubscribe link', '/unsubscribe'],
  ['postal address', TEST_ADDRESS],
  ['"Before you print" block', 'Before you print'],
]) {
  assert.ok(j.html.includes(needle), `html carries the ${label}`);
  ok(`html carries the ${label}`);
}
for (const [label, needle] of [
  ['label sheet URL', '/downloads/fbc-bottle-labels.pdf'],
  ['timing sheet URL', '/downloads/fbc-batch-timing.pdf'],
  ['postal address', TEST_ADDRESS],
]) {
  assert.ok(j.text.includes(needle), `text alternative carries the ${label}`);
  ok(`text alternative carries the ${label}`);
}

// Inverted 2026-08-23. The row was absent only because no Negroni photograph
// existed; it was shot 08-22 and its render is deployed. What matters now is
// that the hero is a real absolute URL with alt text — a relative or empty src
// renders as a broken image in every inbox, and this site answers
// 200 text/html for missing paths, so a bad URL would not fail loudly.
const hero = j.html.match(/<img[^>]*>/g) || [];
assert.equal(hero.length, 1, `expected exactly one image row, found ${hero.length}`);
assert.match(hero[0], /src="https:\/\/freezerbatchcocktails\.com\/images\/cocktails\/negroni-og\.jpg"/, 'hero points at the deployed Negroni render');
assert.match(hero[0], /alt="[^"]{10,}"/, 'hero carries alt text that survives blocked images');
ok('image row restored: one hero, absolute URL, alt text present');
// Dated Labor Day block (addendum 2026-08-23) — must render in BOTH parts, and
// the template must carry the swap-date comment so it cannot quietly outlive
// Sep 7. When the block is swapped for the evergreen guides version, update
// these three checks in the same commit.
const LD = 'https://freezerbatchcocktails.com/blog/batch-ahead-for-labor-day/';
assert.ok(j.html.includes(LD) && j.html.includes('Batching for Labor Day?'), 'html carries the Labor Day block');
ok('html carries the Labor Day block and its guide link');
assert.ok(j.text.includes(LD), 'text alternative carries the Labor Day guide link');
ok('text alternative carries the Labor Day guide link');
assert.ok(j.html.includes('SWAP ON TUESDAY, SEPTEMBER 8, 2026'), 'swap-date comment present');
ok('swap-date comment names Tue Sep 8 2026');
assert.ok(!j.html.includes('PREFERENCES'), 'no preferences link');
ok('no preferences link (no such page exists)');
assert.ok(j.html.length < 100_000, `html is ${j.html.length} bytes, under the 100KB Gmail clip`);
ok(`html is ${j.html.length} bytes (under Gmail's 100KB clip)`);
assert.deepEqual(Object.keys(j).filter((k) => !['html', 'text', 'subject'].includes(k)).sort(), ['email', 'requestId']);
ok('passthrough keys preserved for the Resend node');

// ── 3. recipe node ──────────────────────────────────────────────────────────
assert.ok(recipeCode.includes('Print the free labels'), 'recipe node carries the utility line');
ok('recipe node carries "Print the free labels"');
assert.ok(recipeCode.includes('fbc-bottle-labels.pdf'), 'utility line links the label sheet');
ok('utility line links the label sheet');
assert.ok(/Glasses in the freezer an hour before guests/.test(recipeCode), '3-step timeline present');
ok('recipe node carries the 3-step timeline');
assert.ok(/subject: `Your \$\{recipeNamePlain\} recipe`/.test(recipeCode), 'recipe subject unchanged');
ok('recipe subject unchanged');

// Hero (second 08-23 republish): execute the node against a preset and a custom
// payload rather than grepping for the code — behaviour, not text.
{
  const presetOut = run(recipeCode, { email: 'x@example.com', requestId: 'r', recipe: { mode: 'preset', slug: 'negroni', bottleMl: 750, unit: 'oz', display: { name: 'Negroni', abv: '28.3', servings: '7' } } })[0].json;
  assert.match(presetOut.html, /<img src='https:\/\/freezerbatchcocktails\.com\/images\/cocktails\/negroni-og\.jpg'/, 'preset hero uses the ogImage.ts-shaped absolute URL');
  assert.match(presetOut.html, /alt='Negroni batched for the freezer/, 'preset hero alt is built from the recipe name');
  ok('preset recipe email carries its own hero with real alt text');

  const customOut = run(recipeCode, { email: 'x@example.com', requestId: 'r', recipe: { mode: 'custom', bottleMl: 750, unit: 'oz', dilutionPercent: 20, ingredients: [{ name: 'Gin', amount: 2 }] } })[0].json;
  assert.ok(!customOut.html.includes('<img'), 'custom recipe (no slug, no render) stays imageless');
  ok('custom recipe email stays imageless — it has no slug to derive a render from');

  const hostileOut = run(recipeCode, { email: 'x@example.com', requestId: 'r', recipe: { mode: 'preset', slug: "x' onerror='alert(1)", bottleMl: 750, unit: 'oz' } })[0].json;
  assert.ok(!hostileOut.html.includes('<img'), 'a slug outside the site shape produces no image, not a shaped URL');
  ok('hostile slug renders no hero rather than an attacker-shaped URL');
}

// ── 4. the repo's real static test, unmodified, against the proposed JSON ───
// The static test executes the welcome node, so it needs an address to render at all —
// check 1 above already proved the empty-address build refuses to send. Inject the same
// placeholder here so this step measures structure, not the guard.
const forStatic = JSON.parse(fs.readFileSync(PROPOSED, 'utf8'));
delete forStatic._warning;
const sw = forStatic.nodes.find((n) => n.name === 'Build Newsletter Double Opt-In Confirmation');
sw.parameters.jsCode = sw.parameters.jsCode.replace(
  '"{{POSTAL_ADDRESS}}": ""',
  `"{{POSTAL_ADDRESS}}": ${JSON.stringify(TEST_ADDRESS)}`,
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fbc-static-'));
fs.copyFileSync(path.join(REPO, 'n8n', 'FreezerBatchCocktails-v2.static-test.mjs'), path.join(tmp, 'test.mjs'));
fs.writeFileSync(path.join(tmp, 'FreezerBatchCocktails-v2.json'), JSON.stringify(forStatic, null, 2));
try {
  execFileSync(process.execPath, [path.join(tmp, 'test.mjs')], { stdio: 'pipe' });
  ok("repo static test passes against the proposed workflow (placeholder address)");
} catch (err) {
  console.error('  FAIL  static test:', err.stdout?.toString(), err.stderr?.toString());
  process.exit(1);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${passed} checks passed. Nothing was sent to n8n.`);
