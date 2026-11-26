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
  this.inquiries=ECONOMY_REGION_INQUIRIES;this.charts=ECONOMY_GUIDED_CHARTS;this.phenomena=ECONOMY_PHENOMENON_GUIDES;
  this.caseGuides=ECONOMY_CASE_INQUIRY_GUIDES;
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
  assert([guide.focus,guide.previousQuestion,guide.cause,guide.impact,guide.practice].every(text=>text.trim().length>0));
  assert(!guide.focus.includes('?') && guide.prompt.split('. ').length===3 && guide.prompt.endsWith('세요.'));
  assert.equal(new Set(guide.criteria).size,2);
  assert(guide.criteria.every(text=>text.trim().length>0));
}
ctx.draft.answers={guidedSetId:'renewable-sharing', 'guided_renewable-sharing_read':'학생이 직접 쓴 신안 기록'};
assert.match(run('guidedReadingReport(economyGuided())'),/학생이 직접 쓴 신안 기록/);
ctx.draft.answers['guided_renewable-sharing_initialOpinionV3']='기존 질문에 쓴 내 첫 의견';
assert.equal(run('economyInquiry()'),ctx.inquiries['renewable-sharing'].previousQuestion);
ctx.draft.answers['guided_renewable-sharing_decisionGuideVersion']='2';
assert.equal(run('economyInquiry()'),ctx.inquiries['renewable-sharing'].focus);
ctx.draft.answers['guided_renewable-sharing_inquiryV2']='학생이 직접 좁힌 질문';
assert.equal(run('economyInquiry()'),'학생이 직접 좁힌 질문');
const comparison = () => run('guidedComparisonReport(economyGuided())');
assert.equal(comparison(),'');
ctx.draft.answers['guided_renewable-sharing_ownOptionAnalysis']='택시 요금과 예약 조건을 비교한다.';
assert.match(comparison(),/<th scope="row">내가 생각한 방법<\/th><td>택시 요금과 예약 조건을 비교한다\./);
assert.doesNotMatch(comparison(),/모의 비교 조건/);
ctx.draft.answers['guided_renewable-sharing_ownOptionName']='예약 택시 <지원>';
assert.match(comparison(),/예약 택시 &lt;지원&gt;/);
assert.equal(Object.keys(ctx.phenomena).length,17);
for(const {id} of ctx.sets) {
  const analysis = ctx.phenomena[id];
  assert(analysis.label && analysis.prompt && analysis.explanations.length===2 && analysis.conclusion && analysis.conclusionLimits);
  const prefix='guided_'+id+'_';
  ctx.draft.answers={guidedSetId:id};
  assert.equal(run('nextGuidedQuestionVersion(economyGuided(),work().answers)'),'5');
  ctx.draft.answers[prefix+'decisionGuideVersion']='5';
  assert(!/제주|조수입/.test(JSON.stringify(run('guidedInquiryGuide(economyGuided())'))));
  const groups = run('guidedSourceGroups(economyGuided())');
  assert(groups.length && groups.every(group=>group?.table.sourceUrl.startsWith('https://')));
  assert(!/제주|조수입/.test(JSON.stringify(groups)));
  if (ctx.caseGuides[id]) {
    assert.equal(run('activeGuidedRegion(economyGuided())'),undefined);
    assert(run('ECONOMY_REVIEW_CASES[economyGuided().id].rows.length') >= 2);
    assert.match(run('ECONOMY_LOCAL_SIMULATIONS[economyGuided().id]'),/전남|전북/);
  } else {
    const data = run('activeGuidedRegion(economyGuided())');
    assert(data.periods.length >= 2 && data.rows.some(row=>row.slice(1).some(value=>typeof value==='number')));
    assert(data.task && data.clue && data.sources.length);
    assert(!/제주|조수입/.test(JSON.stringify(data)));
  }
  if (ctx.caseGuides[id]) {
    ctx.draft.answers[prefix+'decisionGuideVersion']='3';
    assert.equal(run('nextGuidedQuestionVersion(economyGuided(),work().answers)'),'5');
    ctx.draft.answers[prefix+'read']='이전 활동에서 해석한 내용';
    assert.equal(run('nextGuidedQuestionVersion(economyGuided(),work().answers)'),'3');
    delete ctx.draft.answers[prefix+'read'];
    ctx.draft.answers[prefix+'decisionGuideVersion']='4';
    assert.equal(run('guidedInquiryGuide(economyGuided())'),ctx.caseGuides[id]);
    ctx.draft.answers[prefix+'regionalChange']='이전 지역 자료 기록';
    assert.equal(run('guidedRegionWasUsed(economyGuided())'),false);
  }
  ctx.draft.answers[prefix+'decisionGuideVersion']='3';
  ctx.draft.answers[prefix+'source_1_excerpt']='이전 출처로 작성한 기록';
  assert.equal(run('nextGuidedQuestionVersion(economyGuided(),work().answers)'),'3');
  ctx.draft.answers[prefix+'decisionGuideVersion']='2';
  ctx.draft.answers[prefix+'ownOptionAnalysis']='이전 방식으로 작성한 비교';
  assert.equal(run('nextGuidedQuestionVersion(economyGuided(),work().answers)'),'2');
  assert.equal(run('guidedPhenomenon(economyGuided())'),null);
  ctx.draft.answers[prefix+'decisionGuideVersion']='3';
  assert.match(comparison(),analysis.application ? /설명·적용 상황/ : /현상에 대한 설명/);
  assert.doesNotMatch(comparison(),/모의 비교 조건/);
  ctx.draft.answers[prefix+'optionFirst']='자료를 적용해 비교한 결과';
  assert.equal(comparison().includes('모의 적용 조건'),Boolean(analysis.application));
}
assert.equal(run("ECONOMY_STEPS.length"),4);
assert.deepEqual(Array.from(run("['0','1','2','3','4'].map(phase=>economySavedPhase(null,{economyPhaseV3:phase},0))")),[0,1,0,1,2]);
assert.equal(run("economySavedPhase({id:'online-choice'},{'guided_online-choice_phaseV2':'1'},3)"),0);
assert.equal(run("economySavedPhase({id:'online-choice'},{'guided_online-choice_phase':'4'},0)"),2);
assert.equal(run("economySavedPhase(null,{economyPhaseV4:'3',economyPhaseV3:'0'},0)"),3);
console.log('PASS 17 topic guides, archived source preservation and semantic restoration of four-stage navigation');
