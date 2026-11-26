const assert = require('node:assert/strict');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8769/';
const output = process.env.QA_OUTPUT;
const useWebkit = process.env.BROWSER === 'webkit';
const storageKey = 'pyeongga-hanjang-social2-v1';
const steps = ['질문과 첫 자료','추가 조사와 경제 분석','결론과 제안','제출과 공유'];
const chapters = ['Ⅰ. 질문과 첫 자료','Ⅱ. 추가 조사와 경제 분석','Ⅲ. 결론과 제안'];

async function preview(page) {
  await page.locator('#tab-preview').click();
  assert(await page.locator('#workspace').isHidden());
  assert(await page.locator('#preview-print').isVisible());
  assert.deepEqual((await page.locator('#poster .paper-inquiry-section > h3').allTextContents()).slice(0,3),chapters);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
  await page.locator('#tab-write').click();
}

async function topicFilters(browser) {
  const page = await browser.newPage({viewport:{width:360,height:800}});
  try {
    await page.goto(base+'#economy');
    const tabs = page.locator('.economy-category-tabs');
    assert.equal(await tabs.locator('button').count(),3);
    let topics;
    for (const [id,count] of Object.entries({local:10,trade:3,all:13})) {
      const button = tabs.locator(`[data-topic-tab="${id}"]`);
      await button.focus();
      await page.keyboard.press('Enter');
      assert.equal(await button.getAttribute('aria-pressed'),'true');
      assert(await button.evaluate(node=>node===document.activeElement));
      assert.equal(await page.locator('#economy-topic-results [data-guided-set]').count(),count);
      assert.equal(await page.locator('#economy-topic-results .badge-region').count(),count);
      assert.equal(await page.locator('#economy-topic-results .badge-concept').count(),count);
      assert(!/제주/.test(await page.locator('#economy-topic-results').innerText()));
      topics = await page.locator('#economy-topic-results [data-guided-set]').evaluateAll(items=>items.map(x=>x.dataset.guidedSet));
      if (output && id === 'local') await page.screenshot({path:path.join(output,'topic-filter.png')});
    }
    for (const id of ['saving-goal','domestic-global-stocks','stock-diversification','stock-rate-news']) assert(!topics.includes(id));
    assert(topics.includes('exchange-positions'));
    return topics;
  } finally { await page.close(); }
}

async function guided(page, id) {
  await page.goto(base+'#economy');
  await page.locator(`[data-guided-set="${id}"]`).click();
  await page.getByRole('heading',{name:steps[0],level:1,exact:true}).waitFor();
  const heading = page.locator('#step-title');
  const next = () => page.locator('[data-next]').click();
  const key = part => '#guided_'+id+'_'+part;
  const {factKey,region,role,concept,groups,chart,calculation} = await page.evaluate(()=>{
    const set = economyGuided();
    const region = activeGuidedRegion(set);
    return {factKey:economyInitialFactKey(set),region,role:guidedRoles(set)[0],
      concept:guidedInquiryGuide(set).concept,groups:guidedSourceGroups(set),calculation:Boolean(guidedCaseAnalysis(set)),
      chart:Boolean(region && guidedRegionGraph(region))};
  });

  assert.equal(await heading.textContent(),steps[0]);
  assert.equal(await page.locator('#steps button').count(),4);
  assert.equal(await page.locator('#editor .card-fact table:visible').count(),1);
  assert.equal(Boolean(await page.locator('#editor .economy-evidence-graph svg:visible').count()),chart);
  assert(!/제주|조수입/.test(await page.locator('#editor').textContent()));
  assert.equal(await page.locator('#source-0-judgmentUse').count(),0);
  await preview(page);
  const initial = page.locator('#poster .paper-inquiry-section').first();
  assert.equal(await initial.locator('table').count(),1);
  assert.equal(Boolean(await initial.locator('.economy-evidence-graph svg').count()),chart);
  const firstValue = await initial.locator('tbody td').first().textContent();
  if (region) {
    assert.equal(await initial.locator('a').first().getAttribute('href'),region.sources[0][2]);
    assert((await page.locator('#editor .card-fact table:visible').textContent()).includes(firstValue));
  } else {
    assert((await initial.textContent()).includes('모의 비교 자료'));
  }

  const title = '경제 탐구 · '+id;
  const fact = region ? firstValue :
    '두 모의 상황에서 바뀌는 조건과 공통 조건을 확인했다.';
  const limit = '두 자료의 조사 대상이 다르면 그대로 비교하기 어렵다.';
  await page.fill(key('topicTitle'),title);
  for (const [name,value] of Object.entries({number:'20513',name:'시연 학생',team:'2모둠'})) await page.fill('#'+name,value);
  if (region && id !== 'tourism-consumption') {
    await page.getByText('비교 수치 메모 (선택)',{exact:true}).click();
    const cells=page.locator('.economy-reading-table input');
    assert.equal(await cells.count(),region.rows.length*region.periods.length);
    for (const [i,col] of region.periods.entries()) await cells.nth(i).fill((await page.locator('#editor .card-fact tbody tr').first().locator('td').nth(i).textContent()).trim());
  } else if (!region) await page.fill('#'+factKey,fact);
  await page.fill(key('initialOpinionV3'),'표에서 비교한 두 조건의 차이를 확인했다. '+fact);
  const openQuestion='같은 지역과 기간으로 확인할 지표를 더 찾아본다.';
  await page.fill(key('questionToCheckV7'),openQuestion);
  if(calculation) await page.fill(key('calculation'),'먼저 단위를 맞추고 두 경우의 차이를 구했다.');
  await next();
  assert.equal(await heading.textContent(),steps[1]);
  assert(await page.locator('#source-0-judgmentUse').isVisible());
  assert((await page.locator('#editor').textContent()).includes(openQuestion));
  await page.fill('#source-0-title','비교를 위한 별도 조사');
  await page.fill('#source-0-period','2024년~2025년');
  await page.fill('#source-0-url','https://example.org/student-collected');
  await page.fill('#source-0-fact','같은 조건의 수치에서 5만큼 차이가 났다.');
  await page.fill('#source-0-thought','두 시점의 변화가 달랐다.');
  await page.fill('#source-0-judgmentUse','같은 단위로 비교해 첫 의견의 범위를 좁혔다.');
  assert.match(await page.locator('#source-count').textContent(),/직접 찾은 보충 자료 1건/);
  if (id === 'tourism-consumption') {
    await page.getByText('교사가 제공한 참고 자료 (선택)',{exact:true}).click();
    await page.fill(key('source_'+groups[0].storageId+'_excerpt'),'체류 시간도 공식 자료에서 확인했다.');
    await page.fill(key('source_'+groups[0].storageId+'_use'),'체류 시간의 비교 범위를 확인했다.');
    if (output) await page.screenshot({path:path.join(output,'tourism-worksheet.png'),fullPage:true});
  }

  if (id !== 'tourism-consumption') assert((await page.locator('.guided-evidence-list').textContent()).includes(fact));
  await page.selectOption('#economy-role',role);
  await page.selectOption('#economy-term',concept);
  assert((await page.locator('#economy-term-method').textContent()).trim());
  const explanation = '비교 조건에 따라 사람들의 선택과 비용이 달라질 수 있다.';
  await page.fill(key('explain'),explanation);
  await page.fill(key('regionalImpact'),'소비자와 가게가 겪는 변화가 다르다.');
  assert.equal(await page.locator(key('changeCondition')).count(),0);

  await next();
  assert.equal(await heading.textContent(),steps[2]);
  assert(await page.getByRole('heading',{name:'두 방안 비교와 제안'}).isVisible());
  assert((await page.locator('.economy-reminder').textContent()).includes(explanation));
  const application=['tariff-choices','exchange-positions','trade-suppliers','stock-news-surge'].includes(id);
  if (application) assert(await page.locator('details[open] > summary').getByText('대안을 비교할 가상 상황').isVisible());
  const judgment = '자료의 조건을 맞추고 비용 차이를 비교한 뒤 결정한다.';
  await page.fill(key('finalChoice'),judgment);
  assert(await page.getByRole('textbox',{name:'자료 한 건만 봤다면 무엇을 놓쳤을까요?'}).isVisible());
  await page.fill(key('changeCondition'),limit);
  await page.fill(key('tradeoffV6'),'같은 기준으로 비용과 편익을 비교했다.');
  const change = '지역에서 필요한 정보를 한 장으로 정리해 제공한다.';
  await page.fill('#economicPlan',change);
  await page.getByText('내가 할 수 있는 일의 예',{exact:true}).click();
  const idea = await page.locator('details[open] p').last().textContent();
  assert(idea.trim() && !idea.includes('제주'));
  const planned = '다음 주 모둠과 같은 기준으로 조사한다.';
  const feasibility = '수업 시간 15분과 공개 자료를 쓰면 추가 비용 없이 할 수 있다.';
  await page.fill('#practicePlan',planned);
  await page.fill('#economyActionFeasibility',feasibility);
  if (id === 'tariff-choices') {
    await page.reload();
    assert.equal(await heading.textContent(),steps[2]);
    assert.equal(await page.inputValue('#economyActionFeasibility'),feasibility);
  }
  await next();
  assert.equal(await heading.textContent(),steps[3]);
  assert.equal(await page.getByRole('link',{name:/경제 탐구 공유 기록하기/}).getAttribute('href'),'listening.html?task=economy');
  for (const field of ['#practicePlan','#practiceResult','#role','#reflection','#peerLearning']) assert.equal(await page.locator(field).count(),0);
  await page.getByText('인쇄 전 점검',{exact:true}).click();
  assert(await page.getByRole('group',{name:'인쇄 전 확인할 내용'}).isVisible());
  await page.locator('#steps [data-stage="0"]').click();
  assert.equal(await page.inputValue(key('topicTitle')),title);
  await page.locator('#steps [data-stage="3"]').click();
  const finalTitle = title+' 최종';
  await page.fill(key('topicTitle'),finalTitle);
  for (const step of await page.locator('#steps button').allTextContents()) assert(step.includes('✓'));
  await preview(page);
  const report = page.locator('#poster');
  const contents = await report.textContent();
  for (const value of [firstValue,fact,limit,role,concept,explanation,judgment,change,planned,feasibility,'두 시점의 변화가 달랐다.','같은 단위로 비교해 첫 의견의 범위를 좁혔다.','2024년~2025년','같은 기준으로 비용과 편익을 비교했다.',openQuestion]) assert(contents.includes(value),value);
  assert(!/제주|조수입/.test(contents));
  assert.equal(await report.locator('.paper-inquiry-section').count(),3);
  assert(!(await report.textContent()).includes('실천·발표 기록'));
  assert((await report.locator('.paper-inquiry-section').nth(2).textContent()).includes(feasibility));
  if(calculation) assert.match(await report.locator('.paper-inquiry-section').nth(2).textContent(),/경제적 선택 기준/);
  assert(!(await report.locator('.paper-inquiry-section').nth(1).textContent()).includes(limit));
  assert((await report.locator('.paper-inquiry-section').nth(2).textContent()).includes(limit));
  if (application) assert.match(await report.locator('.paper-inquiry-section').nth(2).textContent(),/모의 비교 자료/);
  if (['cocoa-buying','renewable-sharing','stock-news-surge'].includes(id)) assert.match(await report.locator('.paper-inquiry-section').first().textContent(),/자료 2/);
  if (id === 'tourism-consumption') {
    assert.match(await report.locator('.paper-inquiry-section').first().textContent(),/숙박·음식점업 생산지수/);
    assert(await report.locator('.paper-references a').count()>=2);
  }
  await page.evaluate(()=>{window.print=()=>{window.printRequested=true;};});
  await page.locator('#tab-preview').click();
  await page.locator('#preview-print').click();
  await page.waitForFunction(()=>window.printRequested);
  const printed=page.locator('.print-pages');
  assert.equal(await printed.locator('.paper-header h2').textContent(),finalTitle);
  const text=await printed.textContent();
  for(const value of [...chapters,firstValue,change,planned,feasibility]) assert(text.includes(value));
  assert.equal(Boolean(await printed.locator('.economy-evidence-graph svg').count()),chart);
  if (output && !useWebkit) await page.pdf({path:path.join(output,id+'.pdf'),format:'A4',printBackground:true});
}

async function legacy(browser) {
  const page = await browser.newPage();
  try {
    await page.addInitScript(key=>{
      if (localStorage.getItem(key)) return;
      const draft={schema:'assessment-one',version:1,step:0,answers:{},sources:[{}],checks:[]};
      const economy={...draft,answers:{guidedSetId:'online-choice',
        guided_online_choice_placeholder:'이전 임의 필드',
        'guided_online-choice_decisionGuideVersion':'3',
        'guided_online-choice_phaseV3':'3',
        'guided_online-choice_initialOpinionV3':'이전의 첫 의견',
        'guided_online-choice_read':'오래된 자료 해석',
        'guided_online-choice_regionalChange':'이전에 쓴 제주 판매 변화',
        'guided_online-choice_supplementAnalysis':'이전 보충 자료 판단',
        'guided_online-choice_optionFirst':'기존에 비교한 첫 설명',
        'guided_online-choice_ownOptionAnalysis':'직접 적은 이전 비교',
      }};
      localStorage.setItem(key,JSON.stringify({...draft,economy,inquiry:{version:1,active:'economy'}}));
    },storageKey);
    await page.goto(base+'#economy-work');
    assert.equal(await page.locator('#step-title').textContent(),steps[1]);
    const storedBefore = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
    assert.equal(storedBefore.economy.answers['guided_online-choice_phaseV4'],undefined);
    await page.locator('#steps [data-stage="0"]').click();
    assert.equal(await page.inputValue('#guided_online-choice_regionalChange'),'이전에 쓴 제주 판매 변화');
    const report = page.locator('#poster');
    assert((await report.textContent()).includes('이전에 쓴 제주 판매 변화'));
    const archive = report.locator('.paper-inquiry-section').last();
    assert((await archive.textContent()).includes('부록'));
    assert((await report.textContent()).includes('이전의 첫 의견'));
    for (const text of ['오래된 자료 해석','이전 보충 자료 판단','기존에 비교한 첫 설명','직접 적은 이전 비교'])
      assert((await archive.textContent()).includes(text),text);
    if (!useWebkit) {
      await page.locator('#open-files').click();
      const started=page.waitForEvent('download');
      await page.locator('#backup').click();
      const backup=await (await started).path();
      const data=JSON.parse(fs.readFileSync(backup,'utf8'));
      assert.equal(data.task.answers['guided_online-choice_phaseV3'],'3');
      assert.equal(data.task.answers['guided_online-choice_phaseV4'],'0');
      assert.equal(data.task.answers.guided_online_choice_placeholder,'이전 임의 필드');
      page.once('dialog',dialog=>dialog.accept());
      await page.locator('#file').setInputFiles(backup);
      await page.getByText('보관한 파일을 불러왔어요.',{exact:true}).waitFor();
      assert.equal(await page.locator('#step-title').textContent(),steps[0]);
      assert((await report.textContent()).includes('이전의 첫 의견'));
      for (const [id,version,phase,value,target] of [
        ['stock-diversification','1','phase','4',2],
        ['online-choice','2','phaseV2','2',1],
        ['stock-diversification','4','phaseV3','0',0],
        ['tariff-choices','5','phaseV3','4',2]
      ]) {
        const restored = structuredClone(data);
        const prefix = 'guided_'+id+'_';
        restored.task.answers = {guidedSetId:id,[prefix+'decisionGuideVersion']:version,
          [prefix+phase]:value,[prefix+'read']:'백업 버전 '+version+'의 자료 해석',
          [prefix+'criterion']:'백업 버전 '+version+'의 판단 기준'};
        await page.locator('#open-files').click();
        page.once('dialog',dialog=>dialog.accept());
        await page.locator('#file').setInputFiles({name:'economy-v'+version+'.json',mimeType:'application/json',
          buffer:Buffer.from(JSON.stringify(restored))});
        await page.getByRole('heading',{name:steps[target],level:1,exact:true}).waitFor();
        assert((await archive.textContent()).includes('백업 버전 '+version+'의 자료 해석'));
        assert((await archive.textContent()).includes('백업 버전 '+version+'의 판단 기준'));
      }
    }
  } finally { await page.close(); }
}

async function topicIsolation(browser) {
  const page = await browser.newPage({viewport:{width:390,height:800}});
  const a='tourism-consumption', b='exchange-positions';
  const start=async id=>{
    await page.goto(base+'#economy');
    await page.locator(`[data-guided-set="${id}"]`).click();
  };
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/k1YAAAAASUVORK5CYII=','base64');
  try {
    await start(a);
    await page.locator('#steps [data-stage="1"]').click();
    assert.match(await page.locator('#source-count').textContent(),/최소 1건/);
    await page.locator('#tab-preview').click();
    assert.match(await page.locator('#economy-preview-ready').textContent(),/보충 자료/);
    await page.evaluate(()=>{window.print=()=>{window.auditPrinted=true}});
    page.once('dialog',d=>d.dismiss());
    await page.locator('#preview-print').click();
    assert(!await page.evaluate(()=>window.auditPrinted));
    await page.locator('#tab-write').click();
    await page.fill('#source-0-title','관광 전용 자료');
    await page.fill('#source-0-url','https://example.org/tourism');
    await page.fill('#source-0-fact','관광 조사에서 확인한 내용');
    await page.fill('#source-0-thought','관광 자료 요약');
    await page.fill('#source-0-judgmentUse','관광 판단에 쓴 근거');
    await page.getByText('그래프·표·사진 첨부 (선택)',{exact:true}).first().click();
    await page.locator('#photo-0').setInputFiles({name:'tourism-test.png',mimeType:'image/png',buffer:png});
    await page.locator('#editor .card-image').waitFor();
    assert.equal(await page.locator('#poster img').count(),1);
    assert((await page.locator('#poster').textContent()).includes('관광 판단에 쓴 근거'));
    await page.locator('#steps [data-stage="2"]').click();
    await page.fill('#economicPlan','관광 전용 대책');
    await page.fill('#practicePlan','관광 전용 실천 계획');
    await page.fill('#economyActionFeasibility','관광 전용 가능성');
    await start(b);
    await page.locator('#steps [data-stage="1"]').click();
    assert.equal(await page.inputValue('#source-0-title'),'');
    assert(!(await page.locator('#poster').textContent()).includes('관광 전용'));
    assert.equal(await page.locator('#poster img').count(),0);
    await page.locator('#steps [data-stage="2"]').click();
    assert.equal(await page.inputValue('#economicPlan'),'');
    await page.fill('#economicPlan','투자 전용 기준');
    await page.reload();
    assert.equal(await page.inputValue('#economicPlan'),'투자 전용 기준');
    await start(a);
    await page.locator('#steps [data-stage="2"]').click();
    assert.equal(await page.inputValue('#economicPlan'),'관광 전용 대책');
    assert.equal(await page.inputValue('#practicePlan'),'관광 전용 실천 계획');
    assert.equal(await page.inputValue('#economyActionFeasibility'),'관광 전용 가능성');
    assert.equal(await page.locator('#poster img').count(),1);
    assert(!(await page.locator('#poster').textContent()).includes('투자 전용 기준'));
  } finally { await page.close(); }
}

async function hiddenFinanceDraft(browser) {
  const page=await browser.newPage();
  try {
    await page.addInitScript(key=>{
      if (localStorage.getItem(key)) return;
      const blank={schema:'assessment-one',version:1,step:0,answers:{},sources:[{}],checks:[]};
      const economy={...blank,answers:{guidedSetId:'saving-goal',
        'guided_saving-goal_decisionGuideVersion':'5','guided_saving-goal_initialOpinionV3':'이미 써 둔 금융 초안'}};
      localStorage.setItem(key,JSON.stringify({...blank,economy,inquiry:{version:1,active:'economy'}}));
    },storageKey);
    await page.goto(base+'#economy');
    assert.equal(await page.locator('#economy-topic-results [data-guided-set="saving-goal"]').count(),0);
    await page.getByText('이전에 쓰던 주제 이어 쓰기',{exact:true}).click();
    await page.locator('[data-guided-set="saving-goal"]').click();
    assert.equal(await page.inputValue('#guided_saving-goal_initialOpinionV3'),'이미 써 둔 금융 초안');
    assert.match(await page.locator('#editor').textContent(),/예금 80만 원과 펀드 20만 원/);
  } finally {await page.close();}
}

async function direct(browser) {
  const page = await browser.newPage({viewport:{width:360,height:800}});
  try {
    await page.goto(base+'#economy');
    await page.locator('[data-guided-set="custom"]').click();
    await page.getByText('자료 읽기 예시 · 전남 외식 물가',{exact:true}).click();
    assert(await page.getByRole('row',{name:/외식 물가지수.*119.9.*123.3/}).isVisible());
    await page.fill('#topic','목포 전통시장에 주말 손님이 더 많이 올까?');
    await page.fill('#economyQuestionToCheckV7','같은 시간에 평일 방문객도 조사한다.');
    await page.fill('#source-0-title','시장 방문 관찰 기록');
    await page.fill('#source-0-fact','직접 조사한 시장 방문객 수');
    await page.fill('#source-0-url','목포 시장 현장 조사');
    await page.locator('#steps [data-stage="1"]').click();
    assert(await page.getByRole('heading',{name:'내 설명을 확인할 자료 찾기'}).isVisible());
    await page.locator('#add-source').click();
    assert(await page.locator('#source-2-title').isVisible());
    assert(await page.locator('#source-2-title').evaluate(item=>item===document.activeElement));
    await page.fill('#source-2-title','삭제할 테스트 자료');
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('[data-delete="2"]').click();
    assert.equal(await page.locator('#source-2-title').count(),0);
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/k1YAAAAASUVORK5CYII=','base64');
    await page.locator('#steps [data-stage="0"]').click();
    await page.getByText('그래프·표·사진 첨부 (선택)',{exact:true}).first().click();
    await page.locator('#photo-0').setInputFiles({name:'test-market.png',mimeType:'image/png',buffer:png});
    await page.locator('#editor .card-image').waitFor();
    assert(await page.locator('#poster img').count());
    await preview(page);
    const contents = await page.locator('#poster').textContent();
    assert.match(await page.locator('#poster .paper-inquiry-section').first().textContent(),/탐구 질문목포 전통시장에 주말 손님이 더 많이 올까\?/);
    assert(contents.includes('같은 시간에 평일 방문객도 조사한다.'));
    assert(contents.includes('직접 조사한 시장 방문객 수') && !/119\.9|123\.3/.test(contents));
  } finally { await page.close(); }
}

(async()=>{
  if(output)fs.mkdirSync(output,{recursive:true});
  const browser=useWebkit ? await webkit.launch({executablePath:process.env.WEBKIT_EXECUTABLE}) :
    await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const topics = await topicFilters(browser);
    for (const [index,id] of topics.entries()) {
      if (process.env.TOPIC_FILTER && !process.env.TOPIC_FILTER.split(',').includes(id)) continue;
      const page = await browser.newPage({viewport:{width:index%2===0 ? 375 : 1024,height:812}});
      page.setDefaultTimeout(6000);
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      try { await guided(page,id); assert.deepEqual(errors,[]); }
      catch (error) { throw new Error(id+': '+error.message,{cause:error}); }
      finally { await page.close(); }
    }
    await topicIsolation(browser);
    await legacy(browser);
    await direct(browser);
    await hiddenFinanceDraft(browser);
    console.log('PASS topic filters, four-stage worksheets and A4 print, direct source operations and legacy backup');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
