import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = JSON.parse(readFileSync(new URL('./FreezerBatchCocktails-v2.json', import.meta.url)));
assert.equal(workflow.nodes.length, 25, 'workflow contains only the 25 purposeful v2 nodes');
assert.equal(
  workflow.nodes.some((node) => node.name === 'Legacy Flat Recipe Email (unconnected)'),
  false,
  'workflow excludes the stale flat-payload renderer',
);
const recipeNode = workflow.nodes.find((node) => node.name === 'Build Transactional Recipe Email');
assert.ok(recipeNode, 'workflow includes the transactional recipe-email Code node');

const nodeNames = workflow.nodes.map((node) => node.name);
const nodeIds = workflow.nodes.map((node) => node.id);
assert.equal(new Set(nodeNames).size, nodeNames.length, 'node names are unique');
assert.equal(new Set(nodeIds).size, nodeIds.length, 'node IDs are unique');

const nodeNameSet = new Set(nodeNames);
for (const [source, connectionTypes] of Object.entries(workflow.connections)) {
  assert.ok(nodeNameSet.has(source), `connection source exists: ${source}`);
  for (const outputGroups of Object.values(connectionTypes)) {
    for (const outputGroup of outputGroups) {
      for (const connection of outputGroup ?? []) {
        assert.ok(nodeNameSet.has(connection.node), `connection target exists: ${connection.node}`);
      }
    }
  }
}

function outputTargets(nodeName, outputIndex) {
  return (workflow.connections[nodeName]?.main?.[outputIndex] ?? []).map((edge) => edge.node);
}

function reachableFrom(startName) {
  const reached = new Set();
  const pending = [startName];
  while (pending.length) {
    const name = pending.pop();
    if (reached.has(name)) continue;
    reached.add(name);
    for (const outputGroup of workflow.connections[name]?.main ?? []) {
      for (const edge of outputGroup ?? []) pending.push(edge.node);
    }
  }
  return reached;
}

const allReachable = reachableFrom('Webhook Trigger');
assert.deepEqual([...nodeNameSet].filter((name) => !allReachable.has(name)), [], 'all nodes are reachable');

const switches = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.switch');
assert.equal(switches.length, 1, 'workflow has exactly one Switch');
assert.equal(switches[0].name, 'Route by action');
assert.deepEqual(
  switches[0].parameters.rules.values.map((rule) => rule.outputKey),
  ['send_recipe', 'subscribe', 'unsubscribe'],
);
assert.equal(switches[0].parameters.options.fallbackOutput, 'extra', 'Switch has a default output');
assert.deepEqual(outputTargets('Route by action', 0), ['Build Transactional Recipe Email']);
assert.deepEqual(outputTargets('Route by action', 1), ['Prepare Newsletter Marketing Consent']);
assert.deepEqual(outputTargets('Route by action', 2), ['Record Unsubscribe']);
assert.deepEqual(outputTargets('Route by action', 3), ['Respond Invalid Action']);
const actionReachability = [0, 1, 2, 3].map(
  (output) => new Set(outputTargets('Route by action', output).flatMap((name) => [...reachableFrom(name)])),
);
for (const name of nodeNameSet) {
  const reachableCaseCount = actionReachability.filter((reached) => reached.has(name)).length;
  if (reachableCaseCount > 0) assert.equal(reachableCaseCount, 1, `${name} belongs to exactly one action case`);
}
assert.deepEqual(
  outputTargets('Recipe Includes Marketing Consent', 0),
  ['Prepare Recipe Marketing Consent'],
  'recipe consent true is the only recipe path that writes marketing state',
);
assert.deepEqual(
  outputTargets('Recipe Includes Marketing Consent', 1),
  ['Respond Recipe Sent'],
  'recipe consent false responds without a CRM write or confirmation send',
);

const resendNodes = workflow.nodes.filter(
  (node) => node.type === 'n8n-nodes-base.httpRequest' && node.parameters.url === 'https://api.resend.com/emails',
);
const resendNames = new Set(resendNodes.map((node) => node.name));
const reachableResendNames = (routeOutput) => {
  const reached = new Set(outputTargets('Route by action', routeOutput).flatMap((name) => [...reachableFrom(name)]));
  return [...resendNames].filter((name) => reached.has(name)).sort();
};
assert.deepEqual(reachableResendNames(0), [
  'Send Recipe Double Opt-In Confirmation',
  'Send Transactional Recipe Email',
]);
assert.deepEqual(reachableResendNames(1), ['Send Newsletter Double Opt-In Confirmation']);
assert.deepEqual(reachableResendNames(2), [], 'unsubscribe reaches no email-send node');
assert.deepEqual(reachableResendNames(3), [], 'invalid action reaches no email-send node');

function headerValue(node, headerName) {
  return node.parameters.headerParameters.parameters.find((header) => header.name === headerName)?.value;
}

const transactionalSend = resendNodes.find((node) => node.name === 'Send Transactional Recipe Email');
assert.equal(headerValue(transactionalSend, 'Idempotency-Key'), '={{ $json.requestId }}');
for (const confirmationName of [
  'Send Recipe Double Opt-In Confirmation',
  'Send Newsletter Double Opt-In Confirmation',
]) {
  const confirmationSend = resendNodes.find((node) => node.name === confirmationName);
  assert.equal(headerValue(confirmationSend, 'Idempotency-Key'), "={{ $json.requestId + '-consent' }}");
}

for (const codeNode of workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.code')) {
  assert.doesNotThrow(() => new Function('$input', '$json', '$env', codeNode.parameters.jsCode), `${codeNode.name} compiles`);
}
assert.ok(workflow.nodes.every((node) => node.credentials === undefined), 'export contains no credential values');

function render(recipe) {
  const run = new Function('$input', recipeNode.parameters.jsCode);
  return run({ first: () => ({ json: { action: 'send_recipe', recipe } }) })[0].json;
}

const preset = render({
  mode: 'preset', slug: 'negroni', bottleMl: 750, unit: 'ml',
  display: {
    name: 'Negroni, freezer-ready', abv: '24%', servings: '8 drinks',
    bottleSize: '750 ml', dilution: '18%', pourOff: '190 ml', waterToAdd: '135 ml',
    ingredients: [{ name: 'Gin', amount: '250 ml' }, { name: 'Sweet vermouth', amount: '250 ml' }],
  },
});
assert.equal(preset.subject, 'Your Negroni, freezer-ready recipe');
assert.match(preset.html, /Negroni, freezer-ready/);
assert.match(preset.html, /750 ml/);
assert.match(preset.html, /Sweet vermouth/);
assert.match(preset.text, /24%/);

const custom = render({
  mode: 'custom', bottleMl: 500, unit: 'oz', dilutionPercent: 20,
  ingredients: [
    { name: 'Gin', amount: 1.5, abv: 45, isBaseSpirit: true },
    { name: 'Vermouth', amount: 0.75, abv: 18, isBaseSpirit: false },
  ],
});
assert.equal(custom.subject, 'Your Custom Freezer Batch recipe');
assert.match(custom.html, /500 ml/);
assert.doesNotMatch(custom.html, /500 oz/);
assert.match(custom.html, /20%/);
assert.match(custom.text, /1.5 oz/);

const formattedBottle = render({
  mode: 'custom',
  bottleMl: 500,
  unit: 'oz',
  display: { bottleSize: '16.9 fl oz' },
});
assert.match(formattedBottle.html, /16\.9 fl oz/);
assert.doesNotMatch(formattedBottle.html, /500 ml/);

const hostile = render({
  mode: 'preset', slug: 'negroni', bottleMl: 750, unit: 'ml',
  display: {
    name: '<img src=x onerror=alert(1)>\r\nInjected',
    ingredients: [{ name: '<svg onload=alert(1)>', amount: '1 < 2' }],
  },
});
assert.match(hostile.html, /&lt;img src=x onerror=alert\(1\)&gt; Injected/);
assert.match(hostile.html, /&lt;svg onload=alert\(1\)&gt;/);
assert.match(hostile.html, /1 &lt; 2/);
assert.doesNotMatch(hostile.html, /<img src=x|<svg onload=/);
assert.doesNotMatch(hostile.subject, /[\r\n]/);

// Single opt-in (adopted 2026-07-25 per MIGRATION.md step 4 fallback): both consent paths
// write `subscribed` immediately and still record the full consent audit trail.
const CONSENT_AUDIT_COLUMNS = ['Email', 'Status', 'Source', 'Consent Version', 'Consent Timestamp', 'Page'];
for (const upsertName of ['Upsert Newsletter Pending Consent', 'Upsert Recipe Pending Consent']) {
  const upsert = workflow.nodes.find((node) => node.name === upsertName);
  assert.ok(upsert, `${upsertName} exists`);
  const columns = upsert.parameters.columns.value;
  assert.equal(columns.Status, 'subscribed', `${upsertName} records single opt-in status`);
  for (const column of CONSENT_AUDIT_COLUMNS) {
    assert.ok(column in columns, `${upsertName} still records the ${column} consent audit field`);
  }
  assert.equal(columns.Source, '={{ $json.consentSource }}', `${upsertName} keeps the consent source`);
  assert.equal(columns['Consent Version'], '={{ $json.consentVersion }}', `${upsertName} keeps the consent version`);
  assert.equal(columns['Consent Timestamp'], '={{ $json.receivedAt }}', `${upsertName} keeps the consent timestamp`);
  assert.deepEqual(upsert.parameters.columns.matchingColumns, ['Email'], `${upsertName} matches on Email`);
}

const unsubscribeUpsert = workflow.nodes.find((node) => node.name === 'Record Unsubscribe');
assert.equal(
  unsubscribeUpsert.parameters.columns.value.Status,
  'unsubscribed',
  'the unsubscribe branch is untouched by the single opt-in switch',
);

// The former double-opt-in confirmations are now welcome emails.
function renderWelcome(nodeName) {
  const node = workflow.nodes.find((entry) => entry.name === nodeName);
  assert.ok(node, `${nodeName} exists`);
  const run = new Function('$input', node.parameters.jsCode);
  return run({ first: () => ({ json: { email: 'person@example.com', requestId: 'req-1' } }) })[0].json;
}

for (const welcomeName of [
  'Build Newsletter Double Opt-In Confirmation',
  'Build Recipe Double Opt-In Confirmation',
]) {
  const welcome = renderWelcome(welcomeName);
  assert.equal(welcome.subject, 'Welcome to Freezer Batch Cocktails', `${welcomeName} sends the welcome subject`);
  assert.match(welcome.html, /Welcome to the newsletter/, `${welcomeName} welcomes instead of asking to confirm`);
  assert.doesNotMatch(welcome.html, /pending|confirm/i, `${welcomeName} drops all confirmation language`);
  assert.doesNotMatch(welcome.text, /pending|confirm/i, `${welcomeName} plain text drops confirmation language`);
  // Branding, apex-host links, unsubscribe, and the text alternative survive the rewrite.
  assert.match(welcome.html, /#171411/, `${welcomeName} keeps the dark background`);
  assert.match(welcome.html, /#d7b46a/, `${welcomeName} keeps the brass accent`);
  assert.match(welcome.html, /https:\/\/freezerbatchcocktails\.com\/cocktails/, `${welcomeName} links the apex host`);
  assert.match(welcome.html, /https:\/\/freezerbatchcocktails\.com\/unsubscribe/, `${welcomeName} keeps the unsubscribe link`);
  assert.ok(welcome.text.length > 0, `${welcomeName} keeps a plain-text alternative`);
  assert.match(welcome.text, /Unsubscribe: https:\/\/freezerbatchcocktails\.com\/unsubscribe/, `${welcomeName} text keeps unsubscribe`);
  assert.doesNotMatch(welcome.subject, /[\r\n]/, `${welcomeName} subject stays header-safe`);
}

console.log('n8n v2 graph, recipe-email, and single opt-in static checks: pass');
