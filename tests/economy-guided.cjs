const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const ctx = vm.createContext({ Intl });
const modules = ['workbook-storage','economy-data','economy-guided-data','economy-local-data','economy-activity','economy-flow'];
vm.runInContext(modules.map(name=>fs.readFileSync('docs/'+name+'.js','utf8')).join('\n')+`
  const draft = { answers:{} };
  const activeTask = () => 'economy';
  const work = () => draft;
  const filled = value => Boolean(value?.trim());
  this.sets=ECONOMY_GUIDED_SETS;this.regions=ECONOMY_LOCAL_CASES;this.draft=draft;
  this.inquiries=ECONOMY_REGION_INQUIRIES;this.charts=ECONOMY_GUIDED_CHARTS;
`,ctx);
const run = code => vm.runInContext(code,ctx);
assert.equal(ctx.sets.length,17);
assert.equal(Object.keys(ctx.regions).length,17);
assert.equal(Object.keys(ctx.inquiries).length,17);
assert.equal(new Set(Object.values(ctx.charts).flat()).size,10);
for (const topic of ctx.sets) {
  ctx.draft.answers = { guidedSetId:topic.id };
  assert(topic.label && topic.decision.options.length === 2 && topic.roles.length >= 2);
  const groups = run('guidedSourceGroups(economyGuided())');
  const old = run('guidedSourceGroups(economyGuided(),true)');
  assert(new Set(groups.map(group=>group.table.sourceUrl)).size >= 3);
  for (const group of groups) {
    const prior = old.find(item=>item.sourceNumber===group.sourceNumber);
    ctx.draft.answers['guided_'+topic.id+'_source_'+prior.storageId+'_excerpt'] = 'Previously recorded fact';
    assert.equal(group.storageId===prior.storageId,group.table.sourceUrl===prior.table.sourceUrl);
    assert(group.table.sourceUrl.startsWith('https://'));
    assert(group.table.publisher && group.table.published && group.table.sourcePage);
    for (const {table} of group.entries) assert(table.rows.every(row=>row.length===table.headers.length));
  }
  assert.equal(run('guidedWrittenSources(economyGuided()).length'),groups.filter(group=>typeof group.storageId==='number').length);
  const region = ctx.regions[topic.id];
  assert(region.region && region.clue && region.task);
  assert.equal(new Set(region.periods).size,2);
  assert(region.rows.every(row=>row.length===3));
  const guide = ctx.inquiries[topic.id];
  assert([guide.question,guide.previousQuestion,guide.cause,guide.impact,guide.practice].every(text=>text.trim().length>0));
  assert.equal(new Set(guide.criteria).size,2);
  assert(guide.criteria.every(text=>text.trim().length>0));
}
ctx.draft.answers={guidedSetId:'renewable-sharing', 'guided_renewable-sharing_read':'학생이 직접 쓴 신안 기록'};
assert.match(run('guidedReadingReport(economyGuided())'),/학생이 직접 쓴 신안 기록/);
ctx.draft.answers['guided_renewable-sharing_initialOpinionV3']='기존 질문에 쓴 내 첫 의견';
assert.equal(run('economyInquiry()'),ctx.inquiries['renewable-sharing'].previousQuestion);
ctx.draft.answers['guided_renewable-sharing_decisionGuideVersion']='2';
assert.equal(run('economyInquiry()'),ctx.inquiries['renewable-sharing'].question);
ctx.draft.answers['guided_renewable-sharing_inquiryV2']='학생이 직접 좁힌 질문';
assert.equal(run('economyInquiry()'),'학생이 직접 좁힌 질문');
console.log('PASS 17 topics, 10 visuals, 17 regional connections, and source-specific preservation across replacements');
