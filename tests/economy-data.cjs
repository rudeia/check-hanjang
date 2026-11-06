// Checked teaching edition: protect published numbers, units and local chart assets.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const data = vm.runInNewContext(fs.readFileSync('docs/economy-data.js', 'utf8') + '\nECONOMY_DATA');
const ideas = vm.runInNewContext(fs.readFileSync('docs/topic-ideas.js', 'utf8') + '\nTOPIC_IDEAS');
const expected = {
  'online-sales': [[2288607, 2420897], [1690320, 1823654]],
  'apple-output': [[566, 394, 460]],
  'renewable-share': [[4.16, 4.65, 5.21]],
  'aging-share': [[18.2, 25.2, 10.3], [19.2, 26.2, 11.0]],
  'jeju-visitors': [[1079.2, 1164.0]],
  'jeju-retail': [[97.0, 96.5]],
  'cocoa-price': [[2.39, 3.28, 7.33]],
  'household-spending': [[2640, 2792, 2890]],
  'dual-income': [[48.0, 43.7, 62.2]],
  'regional-growth': [[2.0, 3.6, 3.4, -0.8, -1.5]]
};
assert.deepEqual(Object.keys(data.packs).sort(), Array.from(ideas.economy, item => item.id).sort());
for (const [id, values] of Object.entries(expected)) {
  const chart = data.charts[id];
  assert.deepEqual(JSON.parse(JSON.stringify(chart.series.map(series => series.values))), values, id);
  assert(chart.region && chart.period && chart.unit && chart.note && chart.sourcePage && chart.published);
  assert.match(chart.sourceUrl, /^https:\/\//);
  for (const series of chart.series) {
    assert.equal(series.values.length, chart.labels.length);
    assert(series.values.every(value => Number.isFinite(value)));
  }
  const svg = fs.readFileSync('docs/assets/economy/' + id + '.svg', 'utf8');
  assert.match(svg, /<svg/);
  assert(!svg.includes('http-equiv') && !svg.includes('<script'));
}
for (const pack of Object.values(data.packs)) {
  assert(pack.charts.every(id => data.charts[id]));
  for (const key of ['compare', 'explain', 'check', 'local']) assert(pack[key].length > 20);
}
// These two views are one source, and their units cannot be combined on a single axis.
assert.equal(data.charts['jeju-visitors'].sourceUrl, data.charts['jeju-retail'].sourceUrl);
assert.notEqual(data.charts['jeju-visitors'].unit, data.charts['jeju-retail'].unit);
assert.match(data.charts['jeju-visitors'].note, /調整|조정/);
assert.match(data.charts['aging-share'].note, /추산/);
assert.match(data.charts['online-sales'].note, /포함/);
console.log('PASS 9 case packs, 10 checked official series, offline SVG assets, units/scope/cautions, separate reading questions.');

// Regression: answering the reading questions must retain the graph in the report,
// even when the student did not separately copy it into an evidence card.
const work = { answers: { ideaId: 'global-prices' }, sources: [{}] };
const context = { activeTask: () => 'economy', work: () => work, filled: value => Boolean(value?.trim()), Intl };
vm.createContext(context);
vm.runInContext(['workbook-storage', 'topic-ideas', 'economy-data', 'economy-activity']
  .map(name => fs.readFileSync('docs/' + name + '.js', 'utf8')).join('\n'), context);
const report = () => vm.runInContext('economyReadingReport()', context);
assert.equal(report(), '');
work.answers['reading_global-prices_compare'] = '7.33 and 2.39 were compared';
assert.match(report(), /assets\/economy\/cocoa-price.svg/);
assert.match(report(), /7.33 and 2.39 were compared/);
work.sources = [{ statId: 'cocoa-price' }];
assert.doesNotMatch(report(), /<img/); // The evidence card already prints the same graph.
work.answers.economyPackId = 'living-costs';
assert.equal(report(), ''); // Old answers must not appear under a different data pack.
console.log('PASS reading-only graph inclusion, no duplicate evidence graph, and case-isolated report answers.');
