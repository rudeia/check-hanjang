const harness=require('fs').readFileSync('tests/inquiry.cjs','utf8').split('(async()=>{')[0];
eval(harness+`
(async()=>{
 const fields=['title','url','author','date','scope','factType','fact','comparison','conditions','meaning','trust','unverified','evidence','unknown'];
 const sources=Array.from({length:3},(_,n)=>Object.fromEntries(fields.map(k=>[k,k==='url'?'https://example.org/'+n:'KEEP_'+n+'_'+k])));
 for(let index=0;index<15;index++){
  const raw=JSON.stringify({...fixture(),sources,position:{version:1,group:1,index}}),e=setup(raw);
  assert.equal(e.writes(),0);assert.equal(e.disk(),raw);assert.equal(e.run('inquiryIndex'),Math.floor(index/5)*2+(index%5===0?0:1));
  assert.equal(e.run('inquiryItems().length'),6);assert.equal(e.run('JSON.stringify(work().sources)'),JSON.stringify(sources));
  e.run('buildReport()');for(let n=0;n<3;n++)for(const k of fields)assert(e.node('#report').innerHTML.includes(sources[n][k]),n+' '+k);
 }
 const e=setup(JSON.stringify({...fixture(),sources,position:{version:1,group:1,index:14}}));e.run('save()');assert.equal(e.run('work().position.version'),2);assert.equal(setup(e.disk()).run('inquiryIndex'),5);
 e.run("work().answers.sourceReview='SET_REVIEW';work().answers.comparison='COMPARE_ONCE';save();goInquiry(1,1)");assert(e.node('#question').innerHTML.includes('이전·추가 자료 기록'));for(const k of ['comparison','conditions','meaning','trust','unverified','evidence'])assert(e.node('#question').innerHTML.includes('KEEP_0_'+k));
 e.node('#backup').onclick();const backup=JSON.parse(await e.downloads.at(-1).blob.text());const restored=setup();await restore(restored,backup);assert.equal(restored.run('JSON.stringify(work().sources)'),JSON.stringify(sources));assert.equal(restored.run('work().answers.sourceReview'),'SET_REVIEW');
 e.run("selectTask('economy');work().sources=[{title:'ECON_SOURCE'}];goInquiry(1,1);save();selectTask('human')");assert.equal(e.run('work().sources.length'),3);assert.equal(e.run('inquiryIndex'),1);e.run('selectTask("economy")');assert.equal(e.run('inquiryIndex'),1);assert.equal(e.run('work().sources[0].title'),'ECON_SOURCE');
 const invalid=setup(JSON.stringify({...fixture(),position:{version:2,group:1,index:2}}));assert(invalid.run('storageBlocked'));assert.equal(invalid.writes(),0);
 const counts=setup(JSON.stringify({...fixture(),sources}));assert.equal(counts.run('ROUTE.reduce((n,g,i)=>{inquiryGroup=i;return n+inquiryItems().length},0)'),27);counts.run('selectTask("economy");work().sources=[{},{},{}]');assert.equal(counts.run('ROUTE.reduce((n,g,i)=>{inquiryGroup=i;return n+inquiryItems().length},0)'),29);
 e.run("selectTask('human');goInquiry(3,0)");assert(e.node('#question').innerHTML.includes('SET_REVIEW'));e.run('goInquiry(2,0)');assert(e.node('#question').innerHTML.includes('KEEP_0_trust'));assert(e.node('#question').innerHTML.includes('KEEP_0_unverified'));
 const why=setup();const whyBefore=why.run('JSON.stringify(data)');assert(why.run("activityWhy({keys:['comparison']})").includes('자료 하나만으로'));assert.equal(why.run('JSON.stringify(data)'),whyBefore);why.run("work().answers.topic='도서관 접근';chooseMission('policy');editMission('audience','도서관 담당 부서')");assert(why.run("activityWhy({keys:['policy']})").includes('대상·비용·실행 조건'));assert(why.run("activityWhy({keys:['chosenEvidence']})").includes('도서관 담당 부서'));why.run("chooseMission('advocate')");assert(why.run("activityWhy({keys:['policy']})").includes('당사자에게 필요한 변화'));assert.notEqual(why.run("activityWhy({keys:['generalization']})"),why.run("activityWhy({keys:['transfer']})"));
 why.run("chooseMission('none')");assert(!why.run("activityWhy({keys:['policy']})").includes('있는지을'));assert(why.run("activityWhy({keys:['topic']})").includes('조사할 수 있는 주제'));
 console.log('PASS friendly source route: all 15 legacy positions read-only mapped; all source fields retained in report and restore; optional editable legacy notes; per-task positions; invalid compact position fail-closed; 3-source count 27/29');
})().catch(e=>{console.error(e);process.exit(1)});
`);
