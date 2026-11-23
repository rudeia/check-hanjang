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
assert.equal(await p.locator('#editor .source-card').count(),1);
assert.equal(await p.locator('#inquiry').count(),0);
await p.fill('#topic','지역 고용의 변화');
await p.fill('#region','제주');await p.fill('#economicPeriod','2024년과 2025년');
const fieldPlace='제주시 중앙시장 직접 방문';
for(const [key,value] of Object.entries({title:'가게 방문 기록',url:fieldPlace,fact:'점포 두 곳에서 주말 일손이 더 필요했다.',thought:'첫 자료에는 주말 인력 수요가 나타났다.'}))
 await p.fill('#source-0-'+key,value);
await p.click('[data-next]');
assert((await p.locator('#editor .economy-reminder').textContent()).includes('첫 자료에는 주말 인력 수요가'));
await p.fill('#inquiry','고용은 왜 변화했나?');
await p.fill('#economyPerspective','노동자');
await p.fill('#economyCriterion','실제 추가 고용 인원');
await p.fill('#economyInitialOpinion','일손이 필요한 곳이 늘어 구직 기회가 커졌다고 생각했다.');
await p.click('[data-next]');
assert.equal(await p.locator('#source-0-fact').count(),0);
assert.match(await p.locator('#source-count').textContent(),/기록한 출처 1곳/);
for(const [key,value] of Object.entries({title:'추가 근무표',url:'시장 상인회 면담',fact:'기존 직원의 추가 근무가 이뤄졌다.',thought:'새 채용으로 이어졌는지 판단을 다시 해야 한다.'}))
 await p.fill('#source-1-'+key,value);
assert.match(await p.locator('#source-count').textContent(),/기록한 출처 2곳/);
await p.click('[data-next]');
await p.selectOption('#economy-term','경제 주체');await p.fill('#concepts','구인 비용과 노동자의 근무 조건이 달라진다.');
await p.fill('#economicImpact','기업과 노동자의 영향 차이');await p.fill('#economicCause','주말 방문객이 늘었다.');
await p.fill('#economyEvidenceImpact','기존 직원 근무만 늘었다.');
await p.click('[data-next]');
assert.equal(await p.locator('#step-title').textContent(),'최종 의견·보고서 완성');
const review=await p.locator('.economy-conclusion-review').textContent();
for(const phrase of ['구직 기회가 커졌다고','기업과 노동자의 영향 차이','기존 직원 근무만 늘었다.'])assert(review.includes(phrase));
await p.fill('#economicConclusion','경제적 결론 끝문장');
await p.fill('#practiceResult','자료 조사 실행');
const opinionBodies=['경제적 결론 끝문장','점포 수가 늘면 판단을 다시 검토한다.','상인회가 참여 점포를 모집한다.','다음 주에 필요한 인력 수를 조사한다.','자료 조사 실행'];
await p.fill('#limits',opinionBodies[1]);await p.fill('#economicPlan',opinionBodies[2]);await p.fill('#practicePlan',opinionBodies[3]);
const opinions=p.locator('#poster .paper-inquiry-section').nth(4);
assert.deepEqual(await opinions.locator(':scope > section:not(.paper-sources) p').allTextContents(),opinionBodies);
assert(await opinions.locator(':scope > section:not(.paper-sources) p').evaluateAll(items=>items.every(item=>getComputedStyle(item).color===getComputedStyle(item.closest('.paper')).color)));
assert.equal(await p.locator('#poster .paper-evidence-table').getByText(fieldPlace,{exact:true}).count(),1);
assert.equal(await p.locator('#poster .paper-inquiry-section').nth(4).getByText(fieldPlace).count(),1);
assert(!(await p.locator('#poster').textContent()).includes('탐구 포스터'));await p.screenshot({path:'/tmp/check-economy-mobile.png',fullPage:true});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await p.reload();assert.equal(await p.inputValue('#practiceResult'),'자료 조사 실행');
await homeLink.click();
await p.locator('#home').waitFor();
await p.click('a[href="#economy"]');await p.click('[data-guided-set="custom"]');
assert.equal(await p.inputValue('#economicConclusion'),'경제적 결론 끝문장');
assert.equal(await p.evaluate(()=>work().answers.economyPhaseV3),'4');
const before=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(before.answers.topic,'인권 원본 보존');assert.equal(before.economy.answers.topic,'지역 고용의 변화');
await p.evaluate(async()=>{await document.fonts.ready; window.prepareReportPrint();});
assert.equal((await p.locator('.print-pages').textContent()).split(fieldPlace).length-1,2);
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
