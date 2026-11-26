const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const modules=['workbook-storage','economy-data','economy-guided-data','economy-local-data','economy-paired-data','economy-activity','economy-flow'];
const context=vm.createContext({Intl,URL});
vm.runInContext(modules.map(name=>fs.readFileSync('docs/'+name+'.js','utf8')).join('\n')+`
  const draft = {answers:{},sources:[{}]};
  const activeTask = () => 'economy';
  const work = () => draft;
  const filled = value => Boolean(value?.trim());
  const sourceFact = source => source.fact ?? '';
  const sourceThought = source => source.thought ?? '';
  const answer = key => draft.answers[key] || '';
  this.pairs=ECONOMY_PAIRED_START;
  this.sets=ECONOMY_GUIDED_SETS;
  this.draft=draft;
`,context);
const run=s=>vm.runInContext(s,context);
assert.equal(Object.keys(context.pairs).length,12);
for(const [id,pair] of Object.entries(context.pairs)){
  assert(context.sets.some(set=>set.id===id),id);
  assert(pair.label && pair.question && pair.read && pair.inquiry && pair.search,id);
  assert.equal(new Set(pair.roles).size,2,id);
  assert.equal(pair.impacts.length,2,id);
  assert.equal(pair.proposals.length,2,id);
  assert.equal(pair.cards.length,2,id);
  for(const card of pair.cards){
    assert(card.title && card.note && card.rows.length && card.sources.length,id);
    assert(card.rows.every(row=>row.length===card.headers.length),id);
    assert(card.sources.every(source=>source.length===4 && source.every(Boolean) && source[2].startsWith('https://')),id);
  }
  context.draft.answers={guidedSetId:id};
  context.draft.sources=[{}];
  assert.equal(run('nextGuidedQuestionVersion(economyGuided(),work().answers)'),'6');
  const prefix='guided_'+id+'_';
  context.draft.answers[prefix+'decisionGuideVersion']='6';
  assert.equal(run('economyInquiry()'),pair.question);
  const [a,b]=pair.cards;
  context.draft.answers[prefix+'pair_fact_0']='A의 사실';
  assert.equal(run('economyInitialRecorded(economyGuided())'),false);
  context.draft.answers[prefix+'pair_fact_1']='B의 사실';
  assert.equal(run('economyInitialRecorded(economyGuided())'),true);
  for(const [, ,url] of [...a.sources,...b.sources]){
    context.draft.sources=[{title:'겹친 자료',url,fact:'핵심',thought:'요약',judgmentUse:'판단'}];
    assert.equal(run('economyOwnEvidence(economyGuided()).length'),0);
  }
  context.draft.sources=[{title:'새 자료',url:'https://example.invalid/test',fact:'핵심',thought:'요약',judgmentUse:'판단'}];
  assert.equal(run('economyOwnEvidence(economyGuided()).length'),1);
  context.draft.answers[prefix+'decisionGuideVersion']='5';
  context.draft.answers[prefix+'initialOpinionV3']='저장된 단일 자료 기반 기록';
  assert.equal(run('nextGuidedQuestionVersion(economyGuided(),work().answers)'),'5');
  assert.equal(run('Boolean(economyPaired(economyGuided()))'),false);
}
assert.equal(run("economyTopicSelectable(ECONOMY_GUIDED_SETS.find(s=>s.id==='cocoa-buying'))"),false);
for(const region of ['제주','울산']) {
  const count=Object.values(context.pairs).filter(pair=>pair.cards.some(card=>card.sources.some(([,title,,section])=>[title,section].some(text=>text.includes(region))))).length;
  assert.equal(count,1,region);
}
const sourceId=link=>{context.sourceLink=link;return run('economyOwnSourceOrigin({url:sourceLink})');};
assert.equal(sourceId('https://www.mods.go.kr/board.es?act=view&bid=5148&list_no=443530'),
  sourceId('https://sri.kostat.go.kr/boardDownload.es?bid=5148&list_no=443530&seq=1'));
assert.equal(sourceId('https://example.com/Table?b=1&a=2&utm_source=test#page=4'),sourceId('https://www.example.com/Table?a=2&b=1'));
assert.notEqual(sourceId('https://example.com/Table?period=2025'),sourceId('https://example.com/Table?period=2024'));
assert.notEqual(sourceId('https://example.com/Table'),sourceId('https://example.com/table'));
console.log('PASS 12 paired topics, data shape and provenance, source exclusion, dual facts, legacy version and regional diversity');
