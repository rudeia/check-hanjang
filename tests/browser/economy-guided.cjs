const assert = require('node:assert/strict');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8769/';
const output = process.env.QA_OUTPUT;
const useWebkit = process.env.BROWSER === 'webkit';
const storageKey = 'pyeongga-hanjang-social2-v1';
const steps = ['주제와 자료 읽기','경제 개념 분석','판단과 지역사회 실천','협업·성찰 및 완성'];
const chapters = ['Ⅰ. 주제와 근거 자료','Ⅱ. 경제 개념과 영향 분석','Ⅲ. 최종 판단과 지역사회 실천','Ⅳ. 협업과 성찰'];

async function preview(page) {
  await page.locator('#tab-preview').click();
  assert(await page.locator('#workspace').isHidden());
  assert(await page.locator('#preview-print').isVisible());
  assert.deepEqual((await page.locator('#poster .paper-inquiry-section > h3').allTextContents()).slice(0,4),chapters);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
  await page.locator('#tab-write').click();
}

async function topicFilters(browser) {
  const page = await browser.newPage({viewport:{width:360,height:800}});
  try {
    await page.goto(base+'#economy');
    const tabs = page.locator('.economy-category-tabs');
    assert.equal(await tabs.locator('button').count(),4);
    let topics;
    for (const [id,count] of Object.entries({local:10,finance:5,trade:2,all:17})) {
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
  const {factKey,region,role,concept,groups,chart} = await page.evaluate(()=>{
    const set = economyGuided();
    const region = activeGuidedRegion(set);
    return {factKey:economyInitialFactKey(set),region,role:guidedRoles(set)[0],
      concept:guidedInquiryGuide(set).concept,groups:guidedSourceGroups(set),
      chart:Boolean(region && guidedRegionGraph(region))};
  });

  assert.equal(await heading.textContent(),steps[0]);
  assert.equal(await page.locator('#steps button').count(),4);
  assert.equal(await page.locator('#editor .card-fact table:visible').count(),1);
  assert.equal(Boolean(await page.locator('#editor .economy-evidence-graph svg:visible').count()),chart);
  assert(!/제주|조수입/.test(await page.locator('#editor').textContent()));
  assert.equal(await page.locator('#editor textarea:visible').count(),2);
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
  const fact = region ? `${region.periods[0]}과 ${region.periods[1]}을 비교하면 첫 수치는 ${firstValue}입니다.` :
    '두 모의 상황에서 바뀌는 조건과 공통 조건을 확인했다.';
  const limit = '두 자료의 조사 대상이 다르면 그대로 비교하기 어렵다.';
  await page.fill(key('topicTitle'),title);
  for (const [name,value] of Object.entries({number:'20513',name:'시연 학생',team:'2모둠'})) await page.fill('#'+name,value);
  await page.fill('#'+factKey,fact);
  await page.fill(key('changeCondition'),limit);
  if (id === 'tourism-consumption') {
    await page.getByText('추가 비교 자료 보기 (선택)',{exact:true}).click();
    await page.fill(key('source_'+groups[0].storageId+'_excerpt'),'체류 시간도 공식 자료에서 확인했다.');
    await page.fill(key('source_'+groups[0].storageId+'_use'),'체류 시간의 비교 범위를 확인했다.');
    if (output) await page.screenshot({path:path.join(output,'tourism-worksheet.png'),fullPage:true});
  }

  await next();
  assert.equal(await heading.textContent(),steps[1]);
  assert((await page.locator('.guided-evidence-list').textContent()).includes(fact));
  await page.selectOption('#economy-role',role);
  await page.selectOption('#economy-term',concept);
  assert((await page.locator('#economy-term-method').textContent()).trim());
  const explanation = '비교 조건에 따라 사람들의 선택과 비용이 달라질 수 있다.';
  await page.fill(key('explain'),explanation);
  await page.fill(key('regionalImpact'),'소비자와 가게가 겪는 변화가 다르다.');
  assert.equal(await page.locator('#editor textarea:visible').count(),2);

  await next();
  assert.equal(await heading.textContent(),steps[2]);
  assert(await page.getByRole('heading',{name:'지역사회 변화 방안과 실천'}).isVisible());
  assert((await page.locator('.economy-reminder').textContent()).includes(explanation));
  const judgment = '자료의 조건을 맞추고 비용 차이를 비교한 뒤 결정한다.';
  await page.fill(key('finalChoice'),judgment);
  await page.getByText('실천 아이디어 보기',{exact:true}).click();
  const idea = await page.locator('details[open] p').last().textContent();
  assert(idea.trim() && !idea.includes('제주'));
  const change = '지역에서 필요한 정보를 한 장으로 정리해 제공한다.';
  await page.fill('#economicPlan',change);
  const planned = '다음 주 모둠과 같은 기준으로 조사한다.';
  await page.fill('#practicePlan',planned);
  let result = '';
  if (id === 'tariff-choices') {
    await page.getByRole('radio',{name:'실제로 실천함'}).check();
    assert.equal(await page.locator('#practicePlan').count(),0);
    result = '가게 두 곳에서 조사 조건을 맞추었고 마지막에 가격 차이를 기록했다.';
    await page.fill('#practiceResult',result);
    await page.getByRole('radio',{name:'아직 실천 전'}).check();
    assert.equal(await page.inputValue('#practicePlan'),planned);
    await page.getByRole('radio',{name:'실제로 실천함'}).check();
    assert.equal(await page.inputValue('#practiceResult'),result);
    await page.reload();
    assert.equal(await heading.textContent(),steps[2]);
    assert.equal(await page.inputValue('#practiceResult'),result);
    if (output) await page.screenshot({path:path.join(output,'practice-worksheet.png'),fullPage:true});
  }

  await next();
  assert.equal(await heading.textContent(),steps[3]);
  assert.equal(await page.getByRole('link',{name:/친구 발표 듣고 기록하기/}).getAttribute('href'),'listening.html?task=economy');
  await page.fill('#reflection','자료의 범위를 확인하고 처음 생각을 수정했다.');
  await page.fill('#role','모둠에서 자료 출처를 확인하고 설명했다.');
  await page.fill('#peerLearning','다른 모둠에게서 조사 범위를 설명하는 방법을 배웠다.');
  await page.getByText('인쇄·공유 전 점검',{exact:true}).click();
  assert(await page.getByRole('group',{name:'발표 전 확인할 내용'}).isVisible());
  await page.locator('#steps [data-stage="0"]').click();
  assert.equal(await page.inputValue(key('topicTitle')),title);
  await page.locator('#steps [data-stage="3"]').click();
  const finalTitle = title+' 최종';
  await page.fill(key('topicTitle'),finalTitle);
  for (const step of await page.locator('#steps button').allTextContents()) assert(step.includes('✓'));
  await preview(page);
  const report = page.locator('#poster');
  const contents = await report.textContent();
  for (const value of [firstValue,fact,limit,role,concept,explanation,judgment,change,planned,'조사 범위를 설명하는 방법']) assert(contents.includes(value),value);
  assert(!/제주|조수입/.test(contents));
  assert.equal(await report.locator('.paper-inquiry-section').count(),result ? 5 : 4);
  if (result) assert(contents.includes(result));
  await page.evaluate(()=>{window.print=()=>{window.printRequested=true;};});
  await page.locator('#tab-preview').click();
  await page.locator('#preview-print').click();
  await page.waitForFunction(()=>window.printRequested);
  const printed=page.locator('.print-pages');
  assert.equal(await printed.locator('.paper-header h2').textContent(),finalTitle);
  const text=await printed.textContent();
  for(const value of [...chapters,firstValue,change,result || planned]) assert(text.includes(value));
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
    for (const text of ['이전의 첫 의견','오래된 자료 해석','이전 보충 자료 판단','기존에 비교한 첫 설명','직접 적은 이전 비교'])
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
      assert((await archive.textContent()).includes('이전의 첫 의견'));
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

async function direct(browser) {
  const page = await browser.newPage({viewport:{width:360,height:800}});
  try {
    await page.goto(base+'#economy');
    await page.locator('[data-guided-set="custom"]').click();
    await page.getByText('자료 읽기 예시 · 전남 외식 물가',{exact:true}).click();
    assert(await page.getByRole('row',{name:/외식 물가지수.*119.9.*123.3/}).isVisible());
    await page.fill('#topic','목포 전통시장 이용');
    await page.fill('#source-0-title','시장 방문 관찰 기록');
    await page.fill('#source-0-fact','직접 조사한 시장 방문객 수');
    await page.fill('#source-0-url','목포 시장 현장 조사');
    await page.getByText('내 자료 더 추가하기 (선택)',{exact:true}).click();
    await page.locator('#add-source').click();
    assert(await page.locator('#source-2-title').isVisible());
    assert(await page.locator('#source-2-title').evaluate(item=>item===document.activeElement));
    await page.fill('#source-2-title','삭제할 테스트 자료');
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('[data-delete="2"]').click();
    assert.equal(await page.locator('#source-2-title').count(),0);
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/k1YAAAAASUVORK5CYII=','base64');
    await page.locator('#photo-0').setInputFiles({name:'test-market.png',mimeType:'image/png',buffer:png});
    await page.locator('#editor .card-image').waitFor();
    assert(await page.locator('#poster img').count());
    await preview(page);
    const contents = await page.locator('#poster').textContent();
    assert(contents.includes('직접 조사한 시장 방문객 수') && !/119\.9|123\.3/.test(contents));
  } finally { await page.close(); }
}

(async()=>{
  if(output)fs.mkdirSync(output,{recursive:true});
  const browser=useWebkit ? await webkit.launch({executablePath:process.env.WEBKIT_EXECUTABLE}) :
    await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
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
    await legacy(browser);
    await direct(browser);
    console.log('PASS topic filters, four-stage worksheets and A4 print, direct source operations and legacy backup');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
