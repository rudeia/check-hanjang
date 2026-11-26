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
await p.locator('#tab-preview').click();assert(await p.locator('#preview-panel').isVisible());await p.locator('#tab-write').click();
assert.equal(await p.inputValue('#topic'),'');
assert.equal(await p.locator('#editor .source-card:visible').count(),1);
assert.equal(await p.locator('#inquiry').count(),0);
await p.fill('#topic','지역 고용의 변화');
await p.fill('#region','전남 목포');await p.fill('#economicPeriod','2024년과 2025년');
const fieldPlace='목포시 동부시장 직접 방문';
for(const [name,value] of Object.entries({title:'가게 방문 기록',url:fieldPlace,fact:'점포 두 곳에서 주말 일손이 더 필요했다.'}))
 await p.fill('#source-0-'+name,value);
await p.fill('#limits','점포 두 곳의 관찰로 시장 전체를 설명하기 어렵다.');
assert.match(await p.locator('#source-count').textContent(),/기록한 출처 1곳/);
await p.getByText('내 자료 더 추가하기 (선택)',{exact:true}).click();
for(const [name,value] of Object.entries({title:'추가 근무표',url:'시장 상인회 면담',fact:'기존 직원의 추가 근무가 이뤄졌다.'}))
 await p.fill('#source-1-'+name,value);
assert.match(await p.locator('#source-count').textContent(),/기록한 출처 2곳/);
await p.click('[data-next]');
assert((await p.locator('#editor .economy-reminder').textContent()).includes('점포 두 곳에서 주말 일손'));
await p.fill('#economyPerspective','노동자');
await p.selectOption('#economy-term','경제 주체');await p.fill('#concepts','구인 비용과 노동자의 근무 조건이 달라진다.');
await p.fill('#economicImpact','기업과 노동자의 영향 차이');
await p.click('[data-next]');
assert.equal(await p.locator('#step-title').textContent(),'판단과 지역사회 실천');
assert((await p.locator('.economy-reminder').textContent()).includes('기업과 노동자의 영향 차이'));
await p.fill('#economicConclusion','경제적 결론 끝문장');
await p.fill('#economicPlan','상인회가 참여 점포를 모집한다.');
await p.fill('#practicePlan','다음 주에 필요한 인력 수를 조사한다.');
await p.getByRole('radio',{name:'실제로 실천함'}).check();
await p.fill('#practiceResult','자료 조사 실행');
await p.click('[data-next]');
assert.equal(await p.locator('#step-title').textContent(),'협업·성찰 및 완성');
const titleInput=p.getByRole('textbox',{name:'최종 보고서 제목'});
assert.equal(await titleInput.getAttribute('placeholder'),'지역 고용의 변화');
await titleInput.fill('주말 일손 수요와 실제 신규 고용');
await p.locator('#steps [data-stage="0"]').click();
assert.equal(await p.inputValue('#posterTitle'),'주말 일손 수요와 실제 신규 고용');
assert.equal(await p.inputValue('#topic'),'지역 고용의 변화');
await p.locator('#steps [data-stage="3"]').click();
const opinions=p.locator('#poster .paper-inquiry-section').nth(2);
assert.deepEqual(await opinions.locator(':scope > section p').allTextContents(),['경제적 결론 끝문장','상인회가 참여 점포를 모집한다.','실제로 실천함','자료 조사 실행']);
assert(await opinions.locator(':scope > section p').evaluateAll(items=>items.every(item=>getComputedStyle(item).color===getComputedStyle(item.closest('.paper')).color)));
assert.equal(await p.locator('#poster .paper-evidence-table').getByText(fieldPlace,{exact:true}).count(),1);
assert.equal(await p.locator('#poster .paper-inquiry-section').nth(3).getByText(fieldPlace).count(),1);
assert(!(await p.locator('#poster').textContent()).includes('탐구 포스터'));await p.screenshot({path:'/tmp/check-economy-mobile.png',fullPage:true});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await p.reload();assert.equal(await titleInput.inputValue(),'주말 일손 수요와 실제 신규 고용');
await homeLink.click();
await p.locator('#home').waitFor();
await p.click('a[href="#economy"]');await p.click('[data-guided-set="custom"]');
await titleInput.waitFor();
assert.equal(await p.evaluate(()=>work().answers.economyPhaseV4),'3');
await p.locator('#steps [data-stage="2"]').click();
assert.equal(await p.inputValue('#economicConclusion'),'경제적 결론 끝문장');
assert.equal(await p.inputValue('#practiceResult'),'자료 조사 실행');
const before=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(before.answers.topic,'인권 원본 보존');assert.equal(before.economy.answers.topic,'지역 고용의 변화');
await p.evaluate(async()=>{await document.fonts.ready; window.prepareReportPrint();});
assert.equal((await p.locator('.print-pages').textContent()).split(fieldPlace).length-1,2);
assert.equal(await p.locator('.print-pages .paper-header h2').textContent(),'주말 일손 수요와 실제 신규 고용');
await p.pdf({path:process.env.CUSTOM_PDF || '/tmp/check-economy-report.pdf',format:'A4',printBackground:true});
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
