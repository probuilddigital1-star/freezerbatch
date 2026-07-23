import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = JSON.parse(readFileSync(new URL('./FreezerBatchCocktails-v2.json', import.meta.url)));
const recipeNode = workflow.nodes.find((node) => node.name === 'Build Transactional Recipe Email');
assert.ok(recipeNode, 'workflow includes the transactional recipe-email Code node');

function render(recipe) {
  const run = new Function('$input', recipeNode.parameters.jsCode);
  const result = run({ first: () => ({ json: { action: 'send_recipe', recipe } }) });
  return result[0].json;
}

const preset = render({
  mode: 'preset',
  slug: 'negroni',
  bottleMl: 750,
  unit: 'ml',
  display: {
    name: 'Negroni, freezer-ready',
    abv: '24%',
    servings: '8 drinks',
    bottleSize: '750 ml',
    dilution: '18%',
    pourOff: '190 ml',
    waterToAdd: '135 ml',
    ingredients: [
      { name: 'Gin', amount: '250 ml' },
      { name: 'Sweet vermouth', amount: '250 ml' },
    ],
  },
});
assert.equal(preset.subject, 'Your Negroni, freezer-ready recipe');
assert.match(preset.html, /Negroni, freezer-ready/);
assert.match(preset.html, /750 ml/);
assert.match(preset.html, /Sweet vermouth/);
assert.match(preset.text, /24%/);

const custom = render({
  mode: 'custom',
  bottleMl: 500,
  unit: 'oz',
  dilutionPercent: 20,
  ingredients: [
    { name: 'Gin', amount: 1.5, abv: 45, isBaseSpirit: true },
    { name: 'Vermouth', amount: 0.75, abv: 18, isBaseSpirit: false },
  ],
});
assert.equal(custom.subject, 'Your Custom Freezer Batch recipe');
assert.match(custom.html, /500 oz/);
assert.match(custom.html, /20%/);
assert.match(custom.html, /Gin/);
assert.match(custom.text, /1.5 oz/);

const hostile = render({
  mode: 'preset',
  slug: 'negroni',
  bottleMl: 750,
  unit: 'ml',
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
assert.doesNotMatch(hostile.text, /[\r\n]{3,}/);

console.log('n8n v2 recipe-email static rendering: pass');
