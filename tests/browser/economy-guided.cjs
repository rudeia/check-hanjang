const assert = require('node:assert/strict');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8769/';
const output = process.env.QA_OUTPUT;
const useWebkit = process.env.BROWSER === 'webkit';
const chapters = ['Ⅰ. 초기 자료 해석','Ⅱ. 나의 입장과 첫 의견','Ⅲ. 보충 자료와 근거','Ⅳ. 경제 개념 적용과 비교','Ⅴ. 최종 의견·방안·성찰'];
const sharedChartSources = new Set(['online-choice','fruit-purchasing','aging-employment','household-budget','childcare-choice','cocoa-buying','saving-goal']);
const fieldPlace = '제주시 중앙시장 직접 방문';

async function preview(page, phrase, keyboard = false) {
  await page.locator('#tab-write').focus();
  if (keyboard) await page.keyboard.press('End');
  else await page.locator('#tab-preview').click();
  await page.locator('#preview-panel').waitFor();
  assert(await page.locator('#workspace').isHidden());
  assert(await page.locator('#preview-print').isVisible());
  assert.deepEqual((await page.locator('#poster .paper-inquiry-section > h3').allTextContents()).slice(0,5),chapters);
  assert((await page.locator('#poster').textContent()).includes(phrase));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if (keyboard) await page.keyboard.press('Home');
  else await page.locator('#tab-write').click();
  assert(await page.locator('#workspace').isVisible());
}

async function guided(page, topic, index) {
  await page.goto(base+'#economy');
  await page.locator('[data-guided-set="'+topic.id+'"]').click();
  await page.waitForURL(/#economy-work$/);
  await page.getByRole('heading',{name:'초기 자료 해석',level:1,exact:true}).waitFor();
  const key=part=>'#guided_'+topic.id+'_'+part;
  const write=(part,value)=>page.fill(key(part),value);
  const next=()=>page.locator('[data-next]').click();
  const title='탐구 검수 '+topic.id;
  const tourism=topic.id==='tourism-consumption';
  const {groups,charts,region}=await page.evaluate(()=>{
    const set=economyGuided();
    return {groups:guidedSourceGroups(set),charts:guidedChartIds(set),region:activeGuidedRegion(set)};
  });
  const [first,second,third]=groups;
  const firstFact='첫 자료에서 확인한 사실';
  const initialRead='첫 자료에 나타난 변화와 집단 차이';
  const opinion='자료를 읽고 첫 대안이 더 낫다고 판단했다.';
  const decisive='추가 자료의 수치가 첫 판단을 보완한다.';
  const conclusion='자료를 비교해 최종 대안을 선택했다.';

  assert.equal(await page.locator('#steps button').count(),5);
  assert.equal(await page.locator('#step-title').textContent(),'초기 자료 해석');
  assert.equal(await page.locator('#economy-role').count(),0);
  assert(!(await page.locator('#editor').textContent()).includes(topic.decision.options[0]));
  assert.equal(await page.locator('#editor .card-fact').count(),1);
  assert.equal(await page.locator('#editor .card-fact table').count(),1);
  assert.equal(await page.locator('#editor .card-fact textarea').count(),2);
  const mobile=page.viewportSize().width<=440;
  assert.equal(await page.locator('.student-fields').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),mobile ? 2 : 3);
  assert.equal(await page.locator('#economy-view-tabs').evaluate(node=>getComputedStyle(node).position),'sticky');
  assert.equal(await page.locator('#editor .stat-image').count(),Number(sharedChartSources.has(topic.id)));
  if(tourism) assert((await page.locator('#editor .card-fact').textContent()).includes('어느 집단의 소비는 줄었나요?'));
  await write('topicTitle',title);
  for(const [field,value] of Object.entries({number:'20513',name:'시연 학생',team:'2모둠'})) await page.fill('#'+field,value);
  await write('source_'+first.storageId+'_excerpt',firstFact);
  await write('read',initialRead);
  await preview(page,title,index===0);

  await next();
  assert.equal(await page.locator('#step-title').textContent(),'입장과 첫 의견');
  assert((await page.locator('#editor .economy-reminder').textContent()).includes(initialRead));
  await page.getByRole('heading',{name:topic.decision.question,exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>economyInquiry()),topic.decision.question);
  await page.selectOption('#economy-role',topic.roles[0]);
  await write('criterion','내 입장에서 비교한 비용과 편익');
  await write('initialOpinionV3',opinion);
  await preview(page,opinion);
  const intro=page.locator('#poster .paper-inquiry-section').nth(1);
  assert(await intro.locator(':scope > section p').evaluateAll(items=>items.every(item=>getComputedStyle(item).color===getComputedStyle(item.closest('.paper')).color)));

  await next();
  assert.equal(await page.locator('#step-title').textContent(),'보충 자료 조사');
  assert((await page.locator('#editor .economy-reminder').textContent()).includes(opinion));
  assert(await page.locator('#extra-sources').evaluate(details=>!details.open));
  assert.equal(await page.locator('#extra-sources .source-card').count(),1);
  const cards=page.locator('.economy-facts > .card-fact');
  assert.deepEqual(await cards.locator('.economy-card-label').allTextContents(),region ? ['실제 지역 자료','추가 공식 자료'] : ['추가 공식 자료']);
  for(const card of await cards.all()) assert.equal(await card.locator('textarea').count(),2);
  if(region) {
    await write('regionalChange','실제 지역 자료의 두 시점을 비교했다.');
    await write('regionalCause','자료의 설명이 내 판단 기준에 영향을 주었다.');
  }
  const supplement=page.locator('.economy-facts');
  for(const group of [second,third]){
    if(group===third) await page.getByText('다른 출처 자료 1개',{exact:true}).click();
    const card=supplement.locator('.guided-source').filter({has:page.locator(key('source_'+group.storageId+'_excerpt'))});
    assert.equal(await card.getByRole('link',{name:group.table.sourceTitle,exact:true}).getAttribute('href'),group.table.sourceUrl);
    assert.equal(await card.locator('td').first().evaluate(node=>getComputedStyle(node).textAlign),typeof group.table.rows[0][1]==='number' ? 'right' : 'left');
    await write('source_'+group.storageId+'_excerpt','자료에서 기록한 근거 '+group.storageId);
    await write('source_'+group.storageId+'_use','첫 의견을 다시 검토한 이유 '+group.storageId);
  }
  assert(await page.evaluate(()=>economySourceCount(economyGuided())>=3));
  assert((await page.locator('#steps button').nth(2).textContent()).includes('✓'));
  if(tourism){
    await page.getByText('추가 그래프 보기',{exact:true}).click();
    for(const chart of charts) await write('chart_'+chart+'_fact','그래프에서 확인한 변화 '+chart);
    await page.getByText('직접 찾은 자료 (선택)',{exact:true}).click();
    const values={title:'직접 조사한 자료',url:fieldPlace,author:'시연 기관',fact:'직접 확인한 수치',thought:'추가 자료의 범위를 확인했다.'};
    for(const [field,value] of Object.entries(values)) await page.fill('#source-0-'+field,value);
  }
  await preview(page,'첫 의견을 다시 검토한 이유');

  await next();
  assert.equal(await page.locator('#step-title').textContent(),'자료 정리와 개념 비교');
  assert((await page.locator('.guided-evidence-list').textContent()).includes(firstFact));
  if(region) assert.equal(await page.locator('.guided-evidence-list').getByText(region.region+' 지역 자료',{exact:true}).count(),1);
  assert(await page.locator('.card-simulation').isVisible());
  await page.selectOption('#economy-term',topic.concepts[0]);
  await write('explain','경제 개념을 실제 자료와 비교 조건에 적용했다.');
  await write('supplementAnalysis',decisive);
  await write('optionFirst','첫 대안에서 얻는 점과 부담');
  await write('optionSecond','둘째 대안에서 얻는 점과 부담');
  await preview(page,'경제 개념을 실제 자료와 비교 조건에 적용했다.');
  assert.equal(await page.locator('#poster .paper-inquiry-section').nth(3).locator('.paper-comparison-table tbody tr').count(),2);

  await next();
  assert.equal(await page.locator('#step-title').textContent(),'최종 의견·보고서 완성');
  const review=await page.locator('.economy-conclusion-review').textContent();
  for(const phrase of [opinion,decisive,'첫 대안에서 얻는 점과 부담','둘째 대안에서 얻는 점과 부담']) assert(review.includes(phrase));
  await write('finalChoice',conclusion);
  await write('changeCondition','비용이 편익보다 커질 때 선택을 바꾼다.');
  for(const [field,value] of Object.entries({economicPlan:'관련 주체와 실천 방안',practicePlan:'모둠과 조사할 내 계획',reflection:'비교하며 달라진 생각'})) await page.fill('#'+field,value);
  for(const step of await page.locator('#steps button').allTextContents()) assert(step.includes('✓'));
  await page.reload();
  assert.equal(await page.inputValue(key('finalChoice')),conclusion);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await preview(page,conclusion);
  if(tourism) {
    assert.equal(await page.locator('#poster .paper-inquiry-section').nth(2).getByText(fieldPlace,{exact:true}).count(),1);
    assert.equal(await page.locator('#poster .paper-inquiry-section').nth(4).getByText(fieldPlace).count(),1);
  }

  await page.evaluate(()=>{window.print=()=>{window.printRequested=true;};});
  await page.locator('#tab-preview').click();
  await page.locator('#preview-print').click();
  await page.waitForFunction(()=>window.printRequested);
  const report=await page.locator('.print-pages').textContent();
  for(const value of [title,...chapters,initialRead,opinion,decisive,conclusion,'비용이 편익보다']) assert(report.includes(value));
  assert(!/내 계산:|내 선택:|[A-F] 지역/.test(report));
  assert.equal(await page.locator('.print-pages .paper-evidence-table tbody tr').count(),groups.length+Number(tourism));
  if(tourism) assert.equal(report.split(fieldPlace).length-1,2);
  const expectedCharts = tourism || sharedChartSources.has(topic.id) ? charts.length : 0;
  assert.equal(await page.locator('.print-pages .paper-official-figure').count(),expectedCharts);
  for(const figure of await page.locator('.print-pages .paper-official-figure').all()){
    assert.equal(await figure.locator('figcaption, img, table, .stat-citation').count(),4);
    assert(!(await figure.evaluate(node=>Boolean(node.closest('.print-row')))));
  }
  if(output && !useWebkit) await page.pdf({path:path.join(output,topic.id+'.pdf'),format:'A4',printBackground:true});
}

async function legacy(browser) {
  const context=await browser.newContext({viewport:{width:375,height:844}});
  try {
    const page=await context.newPage();
    await page.addInitScript(()=>{
      const draft={schema:'assessment-one',version:1,step:0,answers:{},sources:[{}],checks:[]};
      const economy={...draft,answers:{
        guidedSetId:'stock-diversification',
        'guided_stock-diversification_phase':'4',
        'guided_stock-diversification_phaseV2':'1',
        'guided_stock-diversification_initialOpinion':'자료를 읽기 전에 쓴 의견',
        'guided_stock-diversification_source_1_excerpt':'기존 미국 자료에서 쓴 근거',
        'guided_stock-diversification_regionalChange':'이전에 쓴 제주 지역 변화',
        'guided_stock-diversification_evidenceQuestion':'이전에 확인하려던 정보',
        'reading_global-prices_compare':'이전 통계 팩 답안'
      }};
      if(!localStorage.getItem('pyeongga-hanjang-social2-v1'))
        localStorage.setItem('pyeongga-hanjang-social2-v1',JSON.stringify({...draft,economy,inquiry:{version:1,active:'economy'}}));
    });
    await page.goto(base+'#economy-work');
    await page.getByRole('heading',{name:'보충 자료 조사',level:1,exact:true}).waitFor();
    await page.locator('[data-stage="0"]').click();
    assert.equal(await page.inputValue('#guided_stock-diversification_source_ko_primary_excerpt'),'');
    await page.reload();
    assert.equal(await page.locator('#step-title').textContent(),'초기 자료 해석');
    await page.locator('#tab-preview').click();
    const archive=page.locator('#poster .paper-inquiry-section').filter({has:page.getByRole('heading',{name:'부록. 이전 활동에서 쓴 기록',exact:true})});
    const history=await archive.textContent();
    for(const value of ['기존 미국 자료에서 쓴 근거','이전에 쓴 제주 지역 변화','이전에 확인하려던 정보','이전 통계 팩 답안','자료를 읽기 전에 쓴 의견'])assert(history.includes(value));
    assert.equal(await archive.locator('a[href*="investor.gov"]').count(),1);
    if(!useWebkit) {
      await page.locator('#open-files').click();
      const started=page.waitForEvent('download');
      await page.locator('#backup').click();
      const download=await started;
      const file=await download.path();
      const backup=JSON.parse(fs.readFileSync(file,'utf8'));
      assert.equal(backup.task.answers['guided_stock-diversification_phaseV3'],'0');
      assert.equal(backup.task.answers['guided_stock-diversification_source_1_excerpt'],'기존 미국 자료에서 쓴 근거');
      page.once('dialog',dialog=>dialog.accept());
      await page.locator('#file').setInputFiles(file);
      await page.getByText('보관한 파일을 불러왔어요.',{exact:true}).waitFor();
      assert.equal(await page.locator('#step-title').textContent(),'초기 자료 해석');
    }
  } finally {await context.close();}
}

(async()=>{
  if(output)fs.mkdirSync(output,{recursive:true});
  const browser=useWebkit ? await webkit.launch({executablePath:process.env.WEBKIT_EXECUTABLE}) : await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disk-cache-size=16777216']});
  try{
    const initial=await browser.newPage();
    await initial.goto(base+'#economy');
    const topics=await initial.evaluate(()=>ECONOMY_GUIDED_SETS);
    assert.equal(topics.length,17);
    assert.equal(await initial.locator('[data-guided-set]').count(),18);
    assert(await initial.locator('#economy-view-tabs').isHidden());
    await initial.close();
    for(const [index,topic] of topics.entries()){
      if(process.env.TOPIC_FILTER && !process.env.TOPIC_FILTER.split(',').includes(topic.id))continue;
      const context=await browser.newContext({viewport:{width:index%2===0 ? 375 : 1024,height:844}});
      try{
        const page=await context.newPage();
        page.setDefaultTimeout(9000);
        const errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await guided(page,topic,index);
        assert.deepEqual(errors,[]);
      }catch(error){throw new Error(topic.id+': '+error.message,{cause:error});}
      finally{await context.close();}
    }
    await legacy(browser);
    console.log('PASS five-stage topics, desktop and mobile previews, report chapters, source routing, versioned legacy drafts');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
