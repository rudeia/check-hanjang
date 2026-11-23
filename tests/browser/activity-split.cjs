const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('assert');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const c=await b.newContext({viewport:{width:390,height:844}});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:8769/';const key='pyeongga-hanjang-social2-v1';
await p.goto(base);
assert(await p.locator('#home').isVisible());
for(const width of [320,390,701,768,1024,1440]){
 await p.setViewportSize({width,height:900});
 const layout=await p.locator('.home-card').evaluateAll(cards=>cards.map(card=>{
  const nodes=[card,card.querySelector('.card-category'),card.querySelector('h2'),card.querySelector('p'),...card.querySelectorAll('.card-link')];
  return nodes.map(node=>{const {top,left,bottom,height}=node.getBoundingClientRect();return {top,left,bottom,height};});
 }));
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const [card,...content] of layout){
  assert(content.every(item=>Math.abs(item.left-content[0].left)<1));
  assert(content.slice(-2).every(link=>link.height>=44));
  assert(content.at(-1).bottom<=card.bottom);
 }
 if(width>700)assert(layout[0].every((item,i)=>Math.abs(item.top-layout[1][i].top)<1),`unaligned cards at ${width}px`);
 else assert(layout[0][0].bottom<layout[1][0].top);
}
await p.setViewportSize({width:390,height:844});
await p.click('a[href="#human"]');await p.fill('#topic','인권 원본 보존');await p.fill('#inquiry','누구의 이동권?');
await p.click('#mobile-preview');assert(await p.locator('#preview-panel').isVisible());await p.click('#mobile-preview');
const homeLink=p.getByRole('link',{name:'체크 한장 대문으로 가기'});
assert.equal(await p.getByRole('link',{name:'대문',exact:true}).count(),0);
await homeLink.focus();
await p.keyboard.press('Enter');
await p.locator('#home').waitFor();
await p.click('a[href="#economy"]');await p.waitForFunction(()=>activeTask()==='economy');
await p.click('[data-guided-set="custom"]');
assert(await p.locator('#preview-panel').isHidden());assert(await p.locator('#mobile-preview').isHidden());
assert.equal(await p.inputValue('#topic'),'');assert(!(await p.getAttribute('#topic','placeholder')).includes('복지관'));assert((await p.getAttribute('#inquiry','placeholder')).includes('경제'));
await p.fill('#topic','지역 고용의 변화');await p.fill('#inquiry','고용은 왜 변화했나?');await p.click('[data-stage="2"]');await p.fill('#economicImpact','기업과 노동자의 영향 차이');
await p.click('[data-stage="3"]');assert.equal(await p.locator('#step-title').textContent(),'결과 도출');await p.fill('#economicConclusion','경제적 결론 끝문장');
await p.getByText('우리 지역에 적용하고 돌아보기',{exact:true}).click();await p.fill('#practiceResult','자료 조사 실행');
assert(!(await p.locator('#poster').textContent()).includes('탐구 포스터'));await p.screenshot({path:'/tmp/check-economy-mobile.png',fullPage:true});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await p.reload();assert.equal(await p.inputValue('#practiceResult'),'자료 조사 실행');
await homeLink.click();
await p.locator('#home').waitFor();
await p.click('a[href="#economy"]');await p.click('[data-guided-set="custom"]');
assert.equal(await p.inputValue('#economicConclusion'),'경제적 결론 끝문장');
const before=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(before.answers.topic,'인권 원본 보존');assert.equal(before.economy.answers.topic,'지역 고용의 변화');
await p.evaluate(async()=>{await document.fonts.ready; window.prepareReportPrint();});await p.pdf({path:'/tmp/check-economy-report.pdf',format:'A4',printBackground:true});
// Scoped reset
p.once('dialog',d=>d.accept());await p.click('#reset');const after=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(after.answers.topic,'인권 원본 보존');assert.equal(after.economy.answers.topic,undefined);
// independent simultaneous task edits and same-activity conflict
await p.goto(base+'#human');await p.waitForFunction(()=>activeTask()==='human');const q=await c.newPage();await q.goto(base+'#economy');await q.click('[data-guided-set="custom"]');await q.fill('#topic','경제 별도 창');await p.fill('#topic','인권 두 번째');let saved=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(saved.economy.answers.topic,'경제 별도 창');assert.equal(saved.answers.topic,'인권 두 번째');
const r=await c.newPage();await r.goto(base+'#human');await r.fill('#topic','인권 최신 창');await p.fill('#topic','인권 오래된 창');saved=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(saved.answers.topic,'인권 최신 창');assert((await p.locator('#storage-warning').textContent()).includes('다른 창'));
// Unsaved conflicted draft must not disappear when switching activities.
await p.evaluate(()=>{location.hash='#economy'});await p.waitForFunction(()=>location.hash==='#human');assert.equal(await p.inputValue('#topic'),'인권 오래된 창');assert.equal(await p.evaluate(()=>activeTask()),'human');
// distinct listening record for same number
for(const [task,topic] of [['human','인권 공유'],['economy','경제 공유']]){await q.goto(base+'listening.html?task='+task);await q.fill('#presenter','101');await q.click('#open-note button');await q.fill('#topic',topic);await q.fill('#problem',topic+' 기록');await q.click('#note-form button[type=submit]');}
await q.goto(base+'listening.html?task=human');await q.fill('#presenter','101');await q.click('#open-note button');assert.equal(await q.inputValue('#topic'),'인권 공유');
await q.getByRole('link',{name:'체크 한장 대문으로 가기'}).click();
await q.locator('#home').waitFor();
await q.click('a[href="listening.html?task=economy"]');await q.fill('#presenter','101');await q.click('#open-note button');assert.equal(await q.inputValue('#topic'),'경제 공유');assert(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await q.screenshot({path:'/tmp/check-economy-listening.png',fullPage:true});await q.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await q.pdf({path:'/tmp/check-economy-listening.pdf',format:'A4'});
assert.deepEqual(errors,[]);await b.close();console.log('PASS routes, scoped reset, separate drafts, refresh, concurrent task merge, stale same-task guard, listening isolation, mobile, PDF');})().catch(e=>{console.error(e);process.exit(1)});
