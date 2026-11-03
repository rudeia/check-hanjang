const harness=require('fs').readFileSync('tests/inquiry.cjs','utf8').split('(async()=>{')[0];
eval(harness+`
(async()=>{
 const e=setup();e.run("work().answers.reason='REASON_SENTINEL';buildReport()");assert(e.run('inquiryPoster()').includes('REASON_SENTINEL'));
 const original=e.run('JSON.stringify(data)');e.run('goInquiry(6,0)');
 assert.equal(e.run("activityIntent({kind:'answer',keys:['comparison']})[0]"),'자료들을 함께 생각하기');
 assert.equal(e.run("activityIntent({kind:'answer',keys:['message']})[0]"),'독자에게 보여 줄 결과물 고르기');
 assert.equal(e.run("activityIntent({kind:'answer',keys:['opening']})[0]"),'발표를 준비하기');
 assert.equal(e.run('inquiryGroup'),6,'display guidance must not alter saved position');
 assert.equal(e.run("activityIntent({kind:'answer',keys:['actualPresentation']})[0]"),'실제 수행을 돌아보기');
 const p=setup();let html='',gen=0,images=[],release,printed=0;
 Object.defineProperty(p.node('#report'),'innerHTML',{get:()=>html,set:v=>{html=v;gen++;images=[{decode:()=>new Promise(r=>release=r),complete:true,naturalWidth:10}];}});
 p.node('#report').querySelectorAll=()=>images;p.context.window.print=()=>{printed++;p.winHandlers.beforeprint();};
 const pending=p.node('#print').onclick();const firstRelease=release;p.run('showReport()');firstRelease();assert.equal(await pending,false);assert.equal(printed,0);assert(p.node('#file-status').textContent.includes('준비 중 기록이 바뀌'));
 const retry=p.node('#print').onclick();release();assert.equal(await retry,true);assert.equal(printed,1);
 const direct=p.node('#print').onclick();const directRelease=release;p.run('buildReport()');directRelease();assert.equal(await direct,false);assert.equal(printed,1,'image DOM replacement without generation must also abort');
 console.log('PASS independent v5 regressions: reason in main report; field-aware extended guidance without position mutation; same-data report rebuild aborts print, retry and image identity safe');
})().catch(e=>{console.error(e);process.exit(1)});
`);
