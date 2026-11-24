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
const analysisChapters = [...chapters.slice(0,-1),'Ⅴ. 최종 분석·성찰'];

async function preview(page, phrase, keyboard = false) {
  await page.locator('#tab-write').focus();
  if (keyboard) await page.keyboard.press('End');
  else await page.locator('#tab-preview').click();
  await page.locator('#preview-panel').waitFor();
  assert(await page.locator('#workspace').isHidden());
  assert(await page.locator('#preview-print').isVisible());
  const expected = await page.evaluate(()=>Boolean(guidedPhenomenon(economyGuided()))) ? analysisChapters : chapters;
  assert.deepEqual((await page.locator('#poster .paper-inquiry-section > h3').allTextContents()).slice(0,5),expected);
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
  const compareSimulated=topic.id==='renewable-sharing';
  const {groups,charts,region,guide,phenomenon,roles,scenario}=await page.evaluate(()=>{
    const set=economyGuided();
    return {groups:guidedSourceGroups(set),charts:guidedChartIds(set),region:activeGuidedRegion(set),
      guide:guidedInquiryGuide(set),phenomenon:Boolean(guidedPhenomenon(set)),roles:guidedRoles(set),scenario:Boolean(guidedCaseAnalysis(set))};
  });
  const [first,...defaultSupplements]=groups;
  const selectedGroups=guide.sources ? guide.sources.map(index=>groups[index]) : defaultSupplements;
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
  const startsOnScreen = selector => page.locator(selector).first().evaluate(node=>node.getBoundingClientRect().top+scrollY<innerHeight);
  assert.equal(await page.locator('.student-fields').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),mobile ? 2 : 3);
  if(mobile){
    assert(await startsOnScreen('#editor .card-fact h2'));
    assert(await page.locator('.economy-identity .character-count').first().isHidden());
  }
  assert.equal(await page.locator('#economy-view-tabs').evaluate(node=>getComputedStyle(node).position),'sticky');
  assert.equal(await page.locator('#editor .stat-image').count(),Number(!scenario && !guide.regionalFirst && sharedChartSources.has(topic.id)));
  if(tourism) {
    assert((await page.locator('#editor .card-fact').textContent()).includes('중화권 관광객의 카드 소비'));
    assert((await page.locator('#editor .card-fact table').textContent()).includes('55.8'));
  }
  await write('topicTitle',title);
  for(const [field,value] of Object.entries({number:'20513',name:'시연 학생',team:'2모둠'})) await page.fill('#'+field,value);
  await write(scenario ? 'caseFact' : guide.regionalFirst ? 'regionalChange' : 'source_'+first.storageId+'_excerpt',firstFact);
  await write('read',initialRead);
  await preview(page,title,index===0);

  await next();
  assert.equal(await page.locator('#step-title').textContent(),'입장과 첫 의견');
  assert((await page.locator('#editor .economy-reminder').textContent()).includes(initialRead));
  await page.getByRole('heading',{name:'탐구 과제',exact:true}).waitFor();
  assert(await page.getByText(guide.prompt,{exact:true}).isVisible());
  assert.equal(await page.evaluate(()=>economyInquiry()),guide.focus);
  assert(await page.locator(key('inquiryV2')).isHidden());
  const criteria = page.locator('.economy-criterion-examples > span');
  assert.deepEqual(await criteria.allTextContents(),guide.criteria.map(item=>item+'?'));
  await page.selectOption('#economy-role',roles[0]);
  const criterion='내 입장에서 비교한 비용과 편익';
  await write('criterion',criterion);
  await write('initialOpinionV3',opinion);
  await preview(page,opinion);
  const intro=page.locator('#poster .paper-inquiry-section').nth(1);
  assert(await intro.locator(':scope > section p').evaluateAll(items=>items.every(item=>getComputedStyle(item).color===getComputedStyle(item.closest('.paper')).color)));

  await next();
  assert.equal(await page.locator('#step-title').textContent(),'보충 자료 조사');
  assert((await page.locator('#editor .economy-reminder').textContent()).includes(opinion));
  assert((await page.locator('.economy-supplement-review > .economy-review-snippet').first().textContent()).includes(criterion));
  assert(await page.locator('#extra-sources').evaluate(details=>!details.open));
  assert.equal(await page.locator('#extra-sources .source-card').count(),1);
  const regionField=page.locator(key('regionalChange'));
  assert.equal(await regionField.count(),Number(Boolean(region && !scenario && !guide.regionalFirst)));
  if(await regionField.count()) {
    await write('regionalChange','실제 지역 자료의 두 시점을 비교했다.');
  }
  const supplement=page.locator('.economy-facts');
  for(const [index,group] of selectedGroups.entries()){
    if(index===1 && !scenario) await page.getByText(`다른 출처 자료 ${selectedGroups.length-1}개`,{exact:true}).click();
    const card=supplement.locator('.guided-source').filter({has:page.locator(key('source_'+group.storageId+'_excerpt'))});
    assert.equal(await card.getByRole('link',{name:group.table.sourceTitle,exact:true}).getAttribute('href'),group.table.sourceUrl);
    assert.equal(await card.locator('td').first().evaluate(node=>getComputedStyle(node).textAlign),typeof group.table.rows[0][1]==='number' ? 'right' : 'left');
    await write('source_'+group.storageId+'_excerpt','자료에서 기록한 근거 '+group.storageId);
    await write('source_'+group.storageId+'_use','첫 의견을 다시 검토한 이유 '+group.storageId);
  }
  assert(await page.evaluate(()=>economySourceCount(economyGuided())>=2));
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
  const comparison=page.locator('.economy-write').filter({has:page.getByRole('heading',{name:'같은 기준으로 다시 판단하기'})});
  assert((await comparison.textContent()).includes(criterion) && (await comparison.textContent()).includes(guide.focus));
  const factList=page.locator('.economy-reminder .guided-evidence-list');
  assert((await factList.textContent()).includes(firstFact));
  if(region && !scenario) assert.equal(await factList.getByText(region.region+' 지역 자료',{exact:true}).count(),1);
  assert(await page.locator('.card-simulation').isHidden());
  if(scenario) {
    await write('optionFirst','첫 상황에서 계산한 두 가지 결과');
    await write('optionSecond','둘째 상황에서 계산한 두 가지 결과');
  } else {
    await write('regionalCause','지표의 변화에서 확인한 지역 경제 변화의 원인과 한계');
    await write('regionalImpact','주민과 지역 사업자가 받는 영향의 차이');
  }
  await page.selectOption('#economy-term',topic.concepts[0]);
  await write('explain','경제 개념을 실제 자료와 비교 조건에 적용했다.');
  await write('supplementAnalysis',decisive);
  const ownComparison=page.getByText(phenomenon && !scenario ? '내가 생각한 설명 비교 (선택)' : '내가 생각한 방법 비교 (선택)',{exact:true});
  assert(await ownComparison.isVisible());
  if(mobile) assert(await ownComparison.evaluate(node=>node.getBoundingClientRect().bottom+scrollY<=innerHeight));
  if(guide.judgmentClue) assert(await comparison.locator('.economy-comparison-context').getByText(guide.judgmentClue,{exact:false}).isVisible());
  assert(await page.locator(key('ownOptionName')).isHidden());
  const ownName='병원 예약 택시비 지원';
  const ownResult='병원에 갈 시간에 예약할 수 있다면 같은 예산에서 이동이 어려운 가구의 왕복 요금을 지원한다.';
  if (compareSimulated) {
    await ownComparison.click();
    await write('ownOptionName',ownName);
    await write('ownOptionAnalysis',ownResult);
    await page.reload();
    assert(await page.locator(key('ownOptionName')).isVisible());
    assert.equal(await page.inputValue(key('ownOptionName')),ownName);
    assert.equal(await page.inputValue(key('ownOptionAnalysis')),ownResult);
    await page.getByText('제시된 설명 비교 (선택)',{exact:true}).click();
    assert.equal(await page.locator('.card-simulation').count(),0);
    await write('optionFirst','첫 대안에서 얻는 점과 부담');
    await write('optionSecond','둘째 대안에서 얻는 점과 부담');
  }
  await preview(page,'경제 개념을 실제 자료와 비교 조건에 적용했다.');
  const comparisonRows=page.locator('#poster .paper-inquiry-section').nth(3).locator('.paper-comparison-table tbody tr');
  assert.equal(await comparisonRows.count(),compareSimulated ? 3 : scenario ? 2 : 0);
  if(compareSimulated) assert.deepEqual(await comparisonRows.last().locator('th,td').allTextContents(),[ownName,ownResult]);

  await next();
  assert.equal(await page.locator('#step-title').textContent(),'최종 의견·보고서 완성');
  const review=page.locator('.economy-conclusion-review');
  const snippets=await review.locator('.economy-review-snippet').allTextContents();
  assert.equal(snippets.length,2);
  assert(snippets[0].includes(opinion) && snippets[1].includes(decisive));
  if(mobile && !compareSimulated && !scenario) assert(await startsOnScreen(key('finalChoice')));
  if(guide.conclusion) {
    assert.equal(await page.locator(key('finalChoice')+'-hint').textContent(),guide.conclusion);
    assert.equal(await page.locator(key('changeCondition')+'-hint').textContent(),guide.conclusionLimits);
  }
  if (guide.application || scenario) {
    await page.getByText('비교한 상황 다시 보기',{exact:true}).click();
    assert(await page.locator('.card-simulation').isVisible());
  }
  const details=review.locator('details');
  assert(await details.evaluate(node=>!node.open));
  if(compareSimulated) assert(await review.locator('.economy-final-comparison').getByText(ownResult,{exact:false}).isVisible());
  await details.locator('summary').click();
  assert(await details.getByText(scenario ? decisive : '주민과 지역 사업자가 받는 영향의 차이',{exact:false}).isVisible());
  await details.locator('summary').click();
  await write('finalChoice',conclusion);
  const condition=scenario ? '모의 조건이 달라질 때 같은 기준으로 다시 계산한다.' :
    phenomenon ? '같은 시기 지역 자료를 확인해 기존 설명을 다시 판단한다.' : '비용이 편익보다 커질 때 선택을 바꾼다.';
  await write('changeCondition',condition);
  if(guide.applicationConclusion) await write('applicationJudgment','모의 상황에서 조건을 계산한 뒤 내린 별도 판단');
  if(phenomenon) {
    assert.equal(await page.locator('#economicPlan').count(),0);
    assert.equal(await page.locator('#practicePlan').count(),0);
  } else {
    await page.getByRole('radio',{name:'아직 실천 전'}).check();
    await page.fill('#economicPlan','관련 주체와 실천 방안');
    await page.fill('#practicePlan','모둠과 조사할 내 계획');
  }
  await page.fill('#reflection','비교하며 달라진 생각');
  for(const step of await page.locator('#steps button').allTextContents()) assert(step.includes('✓'));
  const finalTitleInput=page.getByRole('textbox',{name:'최종 보고서 제목'});
  assert.equal(await finalTitleInput.inputValue(),title);
  const finalTitle=compareSimulated ? '신안 발전 수익으로 마을 이동을 돕는 조건' : title;
  if(compareSimulated) {
    await finalTitleInput.fill(finalTitle);
    await page.locator('#steps [data-stage="0"]').click();
    assert.equal(await page.getByRole('textbox',{name:'탐구 보고서 제목'}).inputValue(),finalTitle);
    await page.locator('#steps [data-stage="4"]').click();
  }
  await page.reload();
  assert.equal(await finalTitleInput.inputValue(),finalTitle);
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
  assert.equal(await page.locator('.print-pages .paper-header h2').textContent(),finalTitle);
  if(guide.conclusionLimits) {
    const heading=scenario ? '판단이 바뀔 조건과 자료의 한계' :
      phenomenon ? '자료의 한계와 설명을 바꿀 근거' : '자료의 한계와 판단이 바뀌는 조건';
    const limits=page.locator('.print-pages section').filter({has:page.getByRole('heading',{name:heading,exact:true,includeHidden:true})});
    assert((await limits.last().textContent()).includes(condition));
  }
  if(compareSimulated) assert.deepEqual(await page.locator('.print-pages .paper-comparison-table tbody tr').last().locator('th,td').allTextContents(),[ownName,ownResult]);
  if(compareSimulated) assert(!report.includes(title));
  for(const value of [...(phenomenon ? analysisChapters : chapters),initialRead,opinion,decisive,conclusion,condition]) assert(report.includes(value));
  for(const label of ['지역 변화의 원인과 자료의 범위','지역 경제 주체별 영향']) assert.equal(report.includes(label),!scenario);
  if(guide.applicationConclusion) assert(report.includes('모의 상황에서 조건을 계산한 뒤 내린 별도 판단'));
  assert.equal(report.includes('아직 실천 전'),!phenomenon);
  assert(!/내 계산:|내 선택:|[A-F] 지역/.test(report));
  assert.equal(await page.locator('.print-pages .paper-evidence-table tbody tr').count(),selectedGroups.length+Number(!scenario && !guide.regionalFirst)+Number(tourism));
  if(tourism) assert.equal(report.split(fieldPlace).length-1,2);
  const expectedCharts = tourism || !scenario && !guide.regionalFirst && sharedChartSources.has(topic.id) ? charts.length : 0;
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
    for(const value of ['기존 미국 자료에서 쓴 근거','이전에 확인하려던 정보','이전 통계 팩 답안','자료를 읽기 전에 쓴 의견'])assert(history.includes(value));
    assert((await page.locator('#poster .paper-inquiry-section').nth(2).textContent()).includes('이전에 쓴 제주 지역 변화'));
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
      const context=await browser.newContext({viewport:{width:index%2===0 ? 375 : 1024,height:812}});
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
