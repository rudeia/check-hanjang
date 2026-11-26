const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:8769/';
const archiveKey='pyeongga-hanjang-social2-v1';
const expected=['tourism-consumption','online-choice','aging-employment','childcare-choice','stock-news-surge','tariff-choices','production-income','renewable-sharing','fruit-purchasing','household-budget','exchange-positions','trade-suppliers'];
const walkthroughs={
  'childcare-choice':{
    facts:['A 지역 맞벌이 비율은 56.6%에서 55.8%로 0.8%p 낮아졌다.','B 지역은 51.6%에서 53.7%로 2.1%p 높아졌다.'],
    compare:'2025년 비율은 A가 높지만, 전년 대비 변화 방향은 서로 반대였다.',
    investigate:'가구 수가 줄어든 곳에서도 등원 전 돌봄이 필요한지 운영시간과 수요 자료를 찾는다.',
    source:['시간제 돌봄 이용 안내','https://www.idolbom.go.kr/front/biz/srvcGuide','등·하원 동행을 시간제로 신청할 수 있다.','가구 비율과 별도로 돌봄 이용에 필요한 조건을 안내한다.','가구 수만으로 필요한 시간대를 알 수 없어 운영시간을 확인해야 한다는 근거다.'],
    concept:'비용과 편익', explanation:'출근 시간을 그대로 지킬 수 있는 편익과, 시간제 이용료 및 신청에 드는 부담을 비교한다.',
    impacts:['보호자는 출근 전 비는 시간대를 줄일 수 있지만 이용료를 내야 한다.','운영자는 아침 시간대 인력을 확보해야 추가 운영이 가능하다.'],
    conclusion:'맞벌이 비율과 돌봄 공백은 같은 지표가 아니다. 통계의 변화 방향과 서비스가 제공하는 시간을 구분해 판단한다.',
    limit:'A만 봤으면 모든 지역의 맞벌이 비율이 줄었다고 생각했을 수 있다. B는 반대로 올랐다.',
    proposals:['가정은 필요한 시간을 한 주 기록하고, 등원 동행을 신청할 수 있는지 확인한다.','담당 기관은 등원 시간대 대기 인원을 먼저 조사하고, 인력 확보가 되면 짧게 시범 운영한다.'],
  },
  'renewable-sharing':{
    facts:['A 지역은 발전 이익을 주민과 나누며 실제 지급이 보고되었다.','B 지역은 인근 주민 쪽이 투자에 참여하고 사업 수익을 지역에 돌리는 방식이다.'],
    compare:'두 지역 모두 수익을 주민과 나누지만 참여 자격과 수익을 확인할 수 있는 자료가 다르다.',
    investigate:'주민이 참여할 때 내는 비용과 수익 변동을 어떤 자료로 확인할 수 있는지 조사한다.',
    source:['에너지공단의 전국 제도 검토','https://www.energy.or.kr/energy_issue/mail_vol278/pdf/issue_381_03_all.pdf','정부가 주민 참여형 사업의 표준모델 마련을 위한 연구를 시작했다.','두 지역 외에도 참여형 이익 공유를 확대하려는 정책이 있다는 뜻이다.','사업 확대를 제안하더라도 지역별 참여 조건을 따로 확인해야 한다고 판단했다.'],
    concept:'비용과 편익', explanation:'발전 이익이 생겨도 참여 비용이나 배분 기준이 다르면 주민에게 돌아가는 실제 편익이 다르다.',
    impacts:['주민은 소득을 얻을 수 있지만 참여 조건과 위험을 확인해야 한다.','운영자는 주민의 신뢰를 얻을 수 있지만 정산과 공개에 인력과 비용을 써야 한다.'],
    conclusion:'주민 참여 조건과 수익·비용의 공개를 우선해야 한다. 실제 지급과 전망은 따로 읽는다.',
    limit:'지급 실적만 봤으면 투자나 참여 자격을 놓쳤을 것이다. 두 자료를 보니 배분 방식을 함께 비교해야 했다.',
    proposals:['주민 대표는 자격, 부담과 수익 변동 여부를 질문 목록에 넣는다.','사업 운영자는 지급 전망과 실제 정산을 나누고 계산 기준을 정기적으로 공개한다.'],
  },
};
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE || undefined});
  const faults=[];
  try {
    const page=await browser.newPage({viewport:{width:390,height:850}});
    page.on('pageerror',e=>faults.push(e.message));
    await page.goto(base+'#economy');
    assert.equal(await page.locator('#economy-topic-results [data-guided-set]').count(),12);
    assert.equal(await page.locator('#economy-topic-results [data-guided-set=cocoa-buying]').count(),0);
    assert.deepEqual(await page.evaluate(()=>Object.keys(ECONOMY_PAIRED_START).sort()),expected.sort());
    for(const id of expected){
      const context=await browser.newContext({viewport:{width:390,height:850}});
      const tab=await context.newPage();
      tab.on('pageerror',e=>faults.push(id+': '+e.message));
      await tab.goto(base+'#economy');
      await tab.locator(`[data-guided-set="${id}"]`).click();
      const field = suffix=>tab.locator(`#guided_${id}_${suffix}`);
      const stages=tab.locator('#steps [data-stage]');
      const stage=i=>stages.nth(i).click();
      const cards=tab.locator('#editor .economy-pair-card');
      await cards.nth(1).waitFor();
      assert.equal(await cards.count(),2);
      assert.equal(await cards.locator('table').count(),2);
      for(const card of await cards.all()) assert(await card.locator('a').count()>0);
      assert(await tab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const original=await cards.first().locator('a').first().getAttribute('href');
      const model=walkthroughs[id];
      await field('pair_fact_0').fill(model?.facts[0] || '자료 A의 지표와 단위를 확인했다.');
      await field('initialOpinionV3').fill(model?.compare || '같은 기준에서 두 자료의 공통점과 차이를 확인했다.');
      await field('questionToCheckV7').fill(model?.investigate || '판단에 필요한 보충 근거를 조사한다.');
      assert(!(await stages.nth(0).textContent()).includes('✓'));
      await field('pair_fact_1').fill(model?.facts[1] || '자료 B에서 같은 지표를 확인했다.');
      assert((await stages.nth(0).textContent()).includes('✓'));
      await tab.fill('#number','10501');
      await tab.fill('#name','검증용 학생');
      await stage(1);
      assert.equal(await tab.locator('#economy-role').count(),0);
      assert.equal(await tab.locator('#editor .economy-pair-card:visible').count(),0);
      await tab.getByText('초기 자료 A·B 다시 보기',{exact:true}).click();
      assert.equal(await tab.locator('#editor .economy-pair-card:visible').count(),2);
      const [title,url,fact,thought,use]=model?.source || ['별도로 찾은 자료','https://example.org/own','자료의 핵심 사실과 단위를 적었다.','내용을 요약했다.','처음 설명의 한계를 확인했다.'];
      for (const [name,value] of Object.entries({title,url:original,fact,thought,judgmentUse:use})) await tab.fill('#source-0-'+name,value);
      assert.match(await tab.locator('#source-count').textContent(),/보충 자료 0건.*초기 자료와 같은 출처/);
      await tab.fill('#source-0-url',url);
      assert.match(await tab.locator('#source-count').textContent(),/보충 자료 1건/);
      const term=model?.concept || (await tab.locator('#economy-term option').nth(1).textContent()).trim();
      await tab.selectOption('#economy-term',term);
      await field('explain').fill(model?.explanation || '이 경제 개념으로 비용과 편익이 사람마다 다른 이유를 설명했다.');
      await field('pair_impact_0').fill(model?.impacts[0] || '첫 주체가 얻는 이익을 설명했다.');
      await field('pair_impact_1').fill(model?.impacts[1] || '둘째 주체가 부담하는 비용을 설명했다.');
      assert((await stages.nth(1).textContent()).includes('✓'));
      await stage(2);
      assert(await tab.getByRole('heading',{name:'두 입장에 제안하기'}).isVisible());
      assert.equal(await tab.locator('#editor .guided-review-case').count(),0);
      await field('finalChoice').fill(model?.conclusion || '초기 자료와 보충 자료를 함께 검토한 결론을 썼다.');
      await field('pair_proposal_0').fill(model?.proposals[0] || '첫 주체가 실행할 일과 조건을 제시한다.');
      await field('pair_proposal_1').fill(model?.proposals[1] || '둘째 주체가 맡을 일과 부담을 제시한다.');
      await tab.fill('#practicePlan','자료와 제안 두 개를 모둠에 공유한다.');
      await tab.fill('#economyActionFeasibility','공개 자료와 수업 시간 10분을 쓴다.');
      assert(!(await stages.nth(2).textContent()).includes('✓'));
      await field('changeCondition').fill(model?.limit || '한 자료만 보면 다른 지역의 변화 방향을 놓칠 수 있다.');
      assert((await stages.nth(2).textContent()).includes('✓'));
      await stage(3);
      assert(await tab.getByText(/선생님에게 자동 제출되지는 않아요/).isVisible());
      assert((await tab.locator('#economy-ready').textContent()).includes('핵심 항목'));
      await tab.reload();
      assert((await tab.locator('#economy-ready').textContent()).includes('핵심 항목'));
      await tab.locator('#tab-preview').click();
      const paper=tab.locator('#poster');
      assert.equal(await paper.locator('.economy-pair-card').count(),2);
      assert.equal(await paper.locator('.paper-inquiry-section').count(),3);
      assert(!(await paper.locator('.paper-header').textContent()).includes('(초안)'));
      if (model) {
        const contents=await paper.textContent();
        for(const item of [...model.facts,...model.impacts,...model.proposals,model.limit]) assert(contents.includes(item),item);
        await tab.evaluate(()=>{window.print=()=>{window.printRequested=true}});
        await tab.locator('#preview-print').click();
        await tab.waitForFunction(()=>window.printRequested);
        assert.equal(await tab.locator('.print-pages .economy-pair-card').count(),2);
        if(process.env.QA_OUTPUT) await tab.pdf({path:process.env.QA_OUTPUT+'/'+id+'.pdf',format:'A4',printBackground:true});
      }
      await context.close();
    }
    const old=await browser.newPage();
    await old.addInitScript(key=>{
      if(localStorage.getItem(key))return;
      const draft={schema:'assessment-one',version:1,step:0,answers:{},sources:[{}],checks:[]};
      localStorage.setItem(key,JSON.stringify({...draft,inquiry:{version:1,active:'economy'},economy:{...draft,
        answers:{guidedSetId:'custom','guided_cocoa-buying_decisionGuideVersion':'5','guided_cocoa-buying_phaseV4':'0','guided_production-income_decisionGuideVersion':'5'},
        economyDrafts:{'cocoa-buying':{answers:{practicePlan:'이전에 쓴 초콜릿 조사'},sources:[{}]},'production-income':{answers:{},sources:[{title:'기존 생산 자료'}]}}}}));
    },archiveKey);
    old.on('pageerror',e=>faults.push(e.message));
    await old.goto(base+'#economy');
    await old.getByText('이전에 쓰던 주제 이어 쓰기',{exact:true}).click();
    await old.locator('[data-guided-set=cocoa-buying]').click();
    assert.equal(await old.locator('#editor .economy-pair-card').count(),0);
    assert.match(await old.locator('#editor').textContent(),/코코아/);
    await old.goto(base+'#economy');
    await old.locator('[data-guided-set=production-income]').click();
    assert.match(await old.locator('#editor').textContent(),/울산/);
    assert.equal(await old.locator('#editor .economy-pair-card').count(),0);
    assert.deepEqual(faults,[]);
    console.log('PASS 12 paired mobile flows; both facts, distinct extra source, two roles, conclusion limit, reload, print and stored legacy drafts.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
