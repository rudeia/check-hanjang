const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
const url = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8769/')+'listening.html?task=economy';
const key = 'check-hanjang-economy-reading-v1';
(async()=>{
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const p=await browser.newPage({viewport:{width:390,height:800}});
    const errors=[];p.on('pageerror',e=>errors.push(String(e)));
    await p.goto(url);
    const old={version:1,activity:'economy',listener:'작성 예시',records:[{number:'예시-1',topic:'예전 제목',problem:'가격 변화',evidence:'기존 수치',explanation:'기존 경제 개념',solution:'기존 제안',learning:'기존 배움',question:''}],draft:null};
    await p.evaluate(([key,old])=>localStorage.setItem(key,JSON.stringify(old)),[key,old]);
    await p.reload();
    assert(await p.getByRole('heading',{name:'경제 탐구 공유 기록하기'}).isVisible());
    await p.locator('#record-list button').first().click();
    await p.getByText('이전에 쓴 보고서 정리',{exact:true}).click();
    assert.equal(await p.inputValue('#explanation'),'기존 경제 개념');
    await p.fill('#opinion','친구의 근거가 인상적이었다.');
    await p.locator('#note-form button[type=submit]').click();
    await p.fill('#presenter','예시-2');
    await p.locator('#open-note button').click();
    assert(await p.locator('#legacy-note-fields').isHidden());
    await p.fill('#topic','전남에서 관광객과 가게 이용');
    await p.fill('#learning','방문객 수와 지역 가게 매출은 다르다.');
    await p.locator('#note-form button[type=submit]').click();
    assert.match(await p.locator('#feedback-status').textContent(),/초안/);
    await p.fill('#evidence','서론에서 방문객 수와 생산지수를 비교했다.');
    await p.fill('#opinion','두 지표를 구분해야 한다는 의견에 동의한다.');
    await p.fill('#collaboration','먼저 친구의 설명을 듣고 궁금한 점을 물었다.');
    await p.locator('#note-form button[type=submit]').click();
    await p.reload();
    assert.equal(await p.locator('#record-count').textContent(),'2');
    await p.locator('#record-list button').last().click();
    assert.match(await p.locator('#opinion').inputValue(),/동의/);
    await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
    const printed=await p.locator('#notes-print').textContent();
    for(const t of ['경제 탐구 공유 기록하기','새로 알게 된 점','나는 어떻게 생각','다르다','동의한다','궁금한 점','기존 경제 개념'])
      assert(printed.includes(t),t);
    assert(!printed.includes('· 초안'));
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(process.env.QA_OUTPUT) await p.pdf({path:path.join(process.env.QA_OUTPUT,'경제_친구보고서_피드백.pdf'),format:'A4',printBackground:true});
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
  console.log('PASS old feedback preservation, new peer fields, draft status, mobile width and A4 feedback');
})().catch(e=>{console.error(e);process.exitCode=1});
