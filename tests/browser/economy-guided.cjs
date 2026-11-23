const assert = require('node:assert/strict');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8769/';
const output = process.env.QA_OUTPUT;
const useWebkit = process.env.BROWSER === 'webkit';
const chapters = ['Ⅰ. 탐구 주제와 질문','Ⅱ. 자료로 확인한 경제 변화','Ⅲ. 경제 개념 적용과 비교 분석','Ⅳ. 결론 및 지역사회 변화 방안','Ⅴ. 탐구 성찰 및 참고 출처'];
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
  const key=part=>'#guided_'+topic.id+'_'+part;
  const write=(part,value)=>page.fill(key(part),value);
  const title='탐구 검수 '+topic.id;
  assert.equal(await page.locator('#steps button').count(),4);
  const mobile = page.viewportSize().width <= 440;
  const columns = selector => page.locator(selector).evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length);
  assert.equal(await columns('.student-fields'),mobile ? 2 : 3);
  assert.equal(await page.locator('#economy-view-tabs').evaluate(node=>getComputedStyle(node).position),'sticky');
  assert.notEqual(await page.locator('#economy-view-tabs').evaluate(node=>getComputedStyle(node).boxShadow),'none');
  assert((await page.getAttribute(key('criterion'),'placeholder')).trim());
  await page.getByRole('heading',{name:topic.decision.question,exact:true}).waitFor();
  await write('topicTitle',title);
  for (const [field,value] of Object.entries({number:'20513',name:'시연 학생',team:'2모둠'})) await page.fill('#'+field,value);
  assert.equal(await page.evaluate(()=>economyInquiry()),topic.decision.question);
  await write('inquiryV2','자료가 두 방안의 판단에 어떤 영향을 줄까요?');
  await page.selectOption('#economy-role',topic.roles[0]);
  await write('criterion','내 입장에서 비교한 비용과 편익');
  await write('initialOpinion','자료를 보기 전에는 첫 대안을 생각했다.');
  await preview(page,title,index===0);
  const intro = page.locator('#poster .paper-inquiry-section').first();
  const introItems = await intro.locator(':scope > section').evaluateAll(sections=>sections.map(section=>({
    label:section.querySelector('h4').textContent,
    bodyColor:getComputedStyle(section.querySelector('p')).color,
    ink:getComputedStyle(section.closest('.paper')).color
  })));
  assert.deepEqual(introItems.slice(0,4).map(item=>item.label),[
    '탐구 질문',topic.decision.scenario ? '모의 상황' : '문제 상황','나의 관점','판단 기준'
  ]);
  assert(introItems.every(item=>item.bodyColor===item.ink));

  await page.locator('[data-next]').click();
  assert.equal(await page.locator('#step-title').textContent(),'자료로 사실 확인');
  assert.equal(await page.locator('#economy-pack').count(),0);
  assert.equal(await page.locator('#extra-sources .source-card').count(),1);
  assert.equal(await page.locator('.economy-research-links a').count(),3);
  assert.match(await page.locator('#source-count').textContent(),/0 \/ 1곳 이상 권장/);
  if (!mobile) assert.equal(await columns('#extra-sources .field-grid'),2);
  const {groups,charts,region}=await page.evaluate(()=>{
    const set=economyGuided();
    return {groups:guidedSourceGroups(set),charts:ECONOMY_GUIDED_CHARTS[set.id] || [],region:activeGuidedRegion(set)};
  });
  const cards=page.locator('.economy-facts > .card-fact');
  const labels=region ? ['공식 자료 1','실제 지역 자료','공식 자료 3'] : ['공식 자료 1','공식 자료 2'];
  assert.deepEqual(await cards.locator('.economy-card-label').allTextContents(),labels);
  for(const card of await cards.all()){
    assert.equal(await card.locator('h2').count(),1);
    assert.equal(await card.locator('textarea').count(),2);
  }
  if(sharedChartSources.has(topic.id)){
    const first=cards.first();
    assert.equal(await first.locator('.stat-image').count(),1);
    assert.equal(await first.locator('table').count(),1);
    assert.equal(await first.locator('.stat-citation a').count(),1);
  }
  for(const chart of charts) assert(await page.locator('img[src="assets/economy/'+chart+'.svg"]').isVisible());
  assert.equal(await page.locator('.guided-region-material').count(),Number(Boolean(region)));
  if (region) {
    assert(await page.locator('.guided-region-material table').isVisible());
    if (typeof region.rows[0][2]==='number') assert(await page.locator('.guided-region-graph').isVisible());
    await write('regionalChange','실제 지역 자료의 두 시점을 비교했다.');
    if(topic.id==='tourism-consumption'){
      await page.locator('[data-next]').click();
      assert.equal(await page.locator('.guided-evidence-list li').count(),1);
      assert.equal(await page.locator('.guided-evidence-list li strong').textContent(),'제주 지역 자료');
      await page.locator('[data-stage="1"]').click();
    }
    await write('regionalCause','자료에서 설명할 수 있는 범위를 따졌다.');
  }
  for(const [position,group] of groups.entries()){
    if(position===2)await page.getByText('보충 발췌 자료',{exact:true}).click();
    const card=page.locator('[data-source-number="'+group.sourceNumber+'"]');
    assert.equal(await card.getByRole('link',{name:group.table.sourceTitle,exact:true}).getAttribute('href'),group.table.sourceUrl);
    const value=group.entries[0].table.rows[0][1];
    assert.equal(await card.locator('td').first().evaluate(node=>getComputedStyle(node).textAlign),typeof value==='number' ? 'right' : 'left');
    await write('source_'+group.storageId+'_excerpt','출처에서 기록한 근거 '+position);
    await write('source_'+group.storageId+'_use','내 판단과 근거의 연결 '+position);
  }
  const isTourism = topic.id==='tourism-consumption';
  const sourceLocation = isTourism ? fieldPlace : 'https://example.com/student-research-'+index;
  for (const [field,value] of Object.entries({title:'직접 조사한 자료',url:sourceLocation,author:'시연 기관',date:'2026년 11월',fact:'직접 확인한 수치와 범위',thought:'추가 자료를 예상 비용에 반영했다.'}))
    await page.fill('#source-0-'+field,value);
  assert.match(await page.locator('#source-count').textContent(),/1 \/ 1곳 이상 권장/);
  await preview(page,'직접 확인한 수치와 범위');
  if (isTourism) {
    assert.equal(await page.locator('#poster .paper-evidence-table').getByText(fieldPlace,{exact:true}).count(),1);
    assert.equal(await page.locator('#poster .paper-inquiry-section').nth(4).getByText(fieldPlace).count(),1);
  }

  await page.locator('[data-next]').click();
  assert.equal(await page.locator('#step-title').textContent(),'경제 개념과 대안 비교');
  assert((await page.locator('#editor').textContent()).includes('출처에서 기록한 근거'));
  if(region) assert.equal(await page.locator('.guided-evidence-list').getByText(region.region+' 지역 자료',{exact:true}).count(),1);
  assert(await page.locator('.card-simulation').isVisible());
  assert(await page.locator('.card-simulation').evaluate(node=>Boolean(node.compareDocumentPosition(document.querySelector('textarea[id$="_optionFirst"]')) & Node.DOCUMENT_POSITION_FOLLOWING)));
  await page.selectOption('#economy-term',topic.concepts[0]);
  assert.equal(await page.locator('#poster h4').filter({hasText:'경제 개념 적용'}).count(),0);
  await write('explain','경제 개념을 실제 자료와 비교 조건에 적용했다.');
  await write('supplementAnalysis','처음 자료와 보충 자료의 범위를 구분했다.');
  await write('optionFirst','첫 대안의 이익과 부담');
  await write('optionSecond','둘째 대안의 이익과 부담');
  await preview(page,'경제 개념을 실제 자료와 비교 조건에 적용했다.');
  assert.equal(await page.locator('#poster .paper-inquiry-section').nth(2).locator('.paper-comparison-table tbody tr').count(),2);

  await page.locator('[data-next]').click();
  assert.equal(await page.locator('#step-title').textContent(),'결론·방안·보고서 완성');
  await write('finalChoice','자료에 근거해 선택한 최종 결론');
  await write('changeCondition','비용이 편익보다 커질 때 선택을 바꾼다.');
  assert.match(await page.locator('label[for="practiceResult"]').textContent(),/실행한 경우/);
  for (const [field,value] of Object.entries({economicPlan:'관련 주체와 실천 방안',practicePlan:'모둠과 조사할 내 계획',practiceResult:'조사에 참여한 기록',reflection:'비교하며 달라진 생각',role:'모둠에서 자료 정리',peerLearning:'친구의 근거 제시 방식'}))
    await page.fill('#'+field,value);
  for (const step of await page.locator('#steps button').allTextContents()) assert(step.includes('✓'));
  await page.reload();
  assert.equal(await page.inputValue(key('finalChoice')),'자료에 근거해 선택한 최종 결론');
  await preview(page,'관련 주체와 실천 방안');

  await page.evaluate(()=>{
    const set=economyGuided();
    editAnswer(guidedKey(set,'calculation'),'검수용 퀴즈 수치');
    editAnswer(guidedKey(set,'interpretation'),'1');
    window.print=()=>{window.printRequested=true;};
  });
  await page.locator('#tab-preview').click();
  await page.locator('#preview-print').click();
  await page.waitForFunction(()=>window.printRequested);
  const report=await page.locator('.print-pages').textContent();
  for(const value of [title,...chapters,'내 계획','최종 결론','친구의 근거','비용이 편익보다']) assert(report.includes(value));
  assert(!/내 계산:|내 선택:|검수용 퀴즈|[A-F] 지역/.test(report));
  assert.equal(await page.locator('.print-pages .paper-evidence-table tbody tr').count(),groups.length+1);
  if(isTourism) assert.equal(report.split(fieldPlace).length-1,2);
  assert.equal(await page.locator('.print-pages .paper-official-figure').count(),charts.length);
  for(const figure of await page.locator('.print-pages .paper-official-figure').all()){
    assert.equal(await figure.locator('figcaption, img, table, .stat-citation').count(),4);
    assert(!(await figure.evaluate(node=>Boolean(node.closest('.print-row')))));
    assert(await figure.locator('img').evaluate(node=>parseFloat(getComputedStyle(node).maxHeight) > 250));
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
        'guided_stock-diversification_source_1_excerpt':'기존 미국 자료에서 쓴 근거',
        'guided_stock-diversification_regionalChange':'이전에 쓴 제주 지역 변화',
        'guided_stock-diversification_evidenceQuestion':'이전에 확인하려던 정보',
        'reading_global-prices_compare':'이전 통계 팩 답안'
      }};
      if(!localStorage.getItem('pyeongga-hanjang-social2-v1'))
        localStorage.setItem('pyeongga-hanjang-social2-v1',JSON.stringify({...draft,economy,inquiry:{version:1,active:'economy'}}));
    });
    await page.goto(base+'#economy-work');
    await page.getByRole('heading',{name:'결론·방안·보고서 완성',level:1,exact:true}).waitFor();
    await page.locator('[data-stage="1"]').click();
    assert.equal(await page.inputValue('#guided_stock-diversification_source_ko_primary_excerpt'),'');
    await page.reload();
    assert.equal(await page.locator('#step-title').textContent(),'자료로 사실 확인');
    await page.locator('#tab-preview').click();
    const archive=page.locator('#poster .paper-inquiry-section').filter({has:page.getByRole('heading',{name:'부록. 이전 활동에서 쓴 기록',exact:true})});
    const history=await archive.textContent();
    for(const value of ['기존 미국 자료에서 쓴 근거','이전에 쓴 제주 지역 변화','이전에 확인하려던 정보','이전 통계 팩 답안'])assert(history.includes(value));
    assert.equal(await archive.locator('a[href*="investor.gov"]').count(),1);
    if(!useWebkit) {
      await page.locator('#open-files').click();
      const started=page.waitForEvent('download');
      await page.locator('#backup').click();
      const download=await started;
      const file=await download.path();
      const backup=JSON.parse(fs.readFileSync(file,'utf8'));
      assert.equal(backup.task.answers['guided_stock-diversification_phaseV2'],'1');
      assert.equal(backup.task.answers['guided_stock-diversification_source_1_excerpt'],'기존 미국 자료에서 쓴 근거');
      page.once('dialog',dialog=>dialog.accept());
      await page.locator('#file').setInputFiles(file);
      await page.getByText('보관한 파일을 불러왔어요.',{exact:true}).waitFor();
      assert.equal(await page.locator('#step-title').textContent(),'자료로 사실 확인');
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
    console.log('PASS four-stage topics, desktop and mobile previews, report chapters, source routing, versioned legacy drafts');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
