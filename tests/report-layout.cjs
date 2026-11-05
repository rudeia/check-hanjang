// Content preservation and print-layout contract. This does not replace a
// browser/PDF visual check of page boundaries and the last visible text line.
const harness = require('fs').readFileSync('tests/worksheet-media.cjs', 'utf8').split('(async () => {')[0];
eval(harness + `
const css = fs.readFileSync('docs/style.css', 'utf8');
const print = fs.readFileSync('docs/report-print.css', 'utf8');
const paginator = fs.readFileSync('docs/report-print.js', 'utf8');
assert(css.includes('min-height: auto; aspect-ratio: 210 / 297'), 'paper must grow beyond the A4 preview minimum');
assert(print.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'preserve the two-column report');
assert(print.includes('break-after: page'), 'each measured A4 fragment must start a new physical page');
assert(!print.includes('overflow: hidden'), 'overflow must be measured rather than hidden');
assert(paginator.includes("addEventListener('beforeprint', beforePrint)"), 'native print must prepare pages too');
assert(paginator.includes("addEventListener('afterprint', clear)"), 'cancel/repeat must clean temporary pages');
assert(!paginator.includes('localStorage'), 'pagination must never write user data');
const long = Array.from({length: 160}, (_, i) => 'ROW_' + String(i).padStart(3, '0') + ' 긴 문장의 마지막 글자까지 보존').join('\\n') + '\\nFINAL_LINE_SENTINEL';
const source = {title: 'Synthetic source', fact: long, thought: long, url: 'https://example.org/' + 'UNBROKEN'.repeat(60)};
for (const task of ['human', 'economy']) {
  const initial = seed(); initial.sources = [source]; initial.answers = {topic: 'Synthetic', current: long, economicChange: long, role: long, reflection: long, peerLearning: long};
  if (task === 'economy') { initial.economy = JSON.parse(JSON.stringify(initial)); initial.inquiry = {version: 1, active: task}; }
  const e = environment(true, initial), before = e.state.disk;
  e.run('renderPoster()');
  const html = e.node('#poster').innerHTML;
  assert(html.includes('ROW_000') && html.includes('ROW_159') && html.includes('FINAL_LINE_SENTINEL'));
  assert(html.includes(source.url), 'full unbroken URL must survive');
  assert.equal(e.state.disk, before, 'layout and rendering must not alter saved answers');
}
console.log('PASS report layout: expanding A4 preview; measured two-column A4 pages; long human/economy answers and URLs preserved without storage writes. Browser visual QA is separate.');
`);
