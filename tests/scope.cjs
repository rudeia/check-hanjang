const harness=require('fs').readFileSync('tests/inquiry.cjs','utf8').split('(async()=>{')[0];
eval(harness+`
(async()=>{
 const e=setup(),raw=e.disk();assert.equal(e.writes(),0);assert(e.node('#question').innerHTML.includes('인권 문제'));assert(e.node('#question').innerHTML.includes('사회 불평등'));assert(e.node('#question').innerHTML.includes('공간 불평등'));assert(e.run('inquiryItems()[0].keys.includes("topicLens")'));
 e.run('goInquiry(0,1)');assert(e.run('inquiryItems()[1].keys.includes("rightsConnection")'));assert(e.node('#question').innerHTML.includes('예상이나 확인할 질문'));
 e.run("work().answers.topicLens='인권 + 사회·공간 교차';work().answers.rightsConnection='STUDENT_RIGHTS_QUESTION';save();goInquiry(2,2)");assert(e.node('#question').innerHTML.includes('STUDENT_RIGHTS_QUESTION'));e.run('buildReport()');assert(e.node('#report').innerHTML.includes('STUDENT_RIGHTS_QUESTION'));
 const a=e.run('JSON.stringify(work().answers)');e.run("selectedCase=6;goInquiry(0);renderGuide()");assert.equal(e.run('JSON.stringify(work().answers)'),a);assert(e.node('#case-guide').innerHTML.includes('근로계약서'));assert(e.node('#case-guide').innerHTML.includes('조사 결과가 아님'));
 for(const i of [6,7,8]){e.run('selectedCase='+i+';renderGuide()');assert(!e.node('#case-guide').innerHTML.includes('undefined'));}
 assert.equal(e.run('INQUIRY_CASES.length'),9);e.node('#backup').onclick();const copy=setup();await restore(copy,JSON.parse(await e.downloads.at(-1).blob.text()));assert.equal(copy.run('work().answers.rightsConnection'),'STUDENT_RIGHTS_QUESTION');copy.run('selectTask("economy");goInquiry(0,1)');assert(!copy.run('inquiryItems()[1].keys.includes("rightsConnection")'));assert.equal(copy.run('work().answers.rightsConnection'),undefined);copy.run('selectTask("human")');assert.equal(copy.run('work().answers.rightsConnection'),'STUDENT_RIGHTS_QUESTION');
 // Independent transfer regression: new topics versus immutable stored contexts.
 const t=setup();t.run("work().answers.topic='청소년 노동권 <tag>';goInquiry(3,3)");
 const beforeTransfer=t.run('JSON.stringify(work().answers)');
 assert(t.run('transferContext()').includes('청소년 노동권'));assert(!t.run('transferContext()').includes('도서관'));assert(t.run('transferContext()').includes('실제 사건·조사 결과가 아니며'));
 assert.equal(t.run('JSON.stringify(work().answers)'),beforeTransfer,'proposal must not insert student answers');
 t.run("chooseTransfer('preset');work().answers.transfer='OWN_RESPONSE';bindTransferAnswer();save();buildReport()");
 const selected=t.run('chosenTransfer().text');assert(t.node('#report').innerHTML.includes('&lt;tag&gt;'));assert(!t.node('#report').innerHTML.includes('<tag>'));
 t.run("work().answers.topic='다른 주제';save()");assert.equal(t.run('chosenTransfer().text'),selected);assert.equal(t.run('chosenTransfer().answerContext.text'),selected);assert.equal(t.run('work().answers.transfer'),'OWN_RESPONSE');
 const rawTransfer=t.disk(),refreshed=setup(rawTransfer);assert.equal(refreshed.writes(),0);assert.equal(refreshed.disk(),rawTransfer);assert.equal(refreshed.run('chosenTransfer().text'),selected);
 const oldText='짧은 가상 상황 · 도서관 접근성에서 보건소로';
 const oldFixture={...fixture(),answers:{topic:'노동권',transfer:'OLD_RESPONSE'},transferContext:{version:1,kind:'preset',text:oldText,answerContext:{kind:'preset',text:oldText}}};
 const oldRaw=JSON.stringify(oldFixture),old=setup(oldRaw);old.run('renderInquiry();buildReport()');assert.equal(old.writes(),0);assert.equal(old.disk(),oldRaw);assert.equal(old.run('chosenTransfer().text'),oldText);assert.equal(old.run('work().answers.transfer'),'OLD_RESPONSE');assert(old.node('#report').innerHTML.includes(oldText));
 t.run('selectTask("economy")');assert(!t.run('transferContext()').includes('청소년 노동권'));assert(t.run('transferContext()').includes('경제 변화'));t.run('selectTask("human")');assert.equal(t.run('chosenTransfer().text'),selected);
 t.node('#backup').onclick();const tr=setup();await restore(tr,JSON.parse(await t.downloads.at(-1).blob.text()));assert.equal(tr.run('chosenTransfer().answerContext.text'),selected);assert.equal(tr.run('work().answers.transfer'),'OWN_RESPONSE');
 console.log('PASS independent topic-aware transfer: no auto answers; safe display; existing selected/bound/legacy contexts immutable; no-write refresh, task isolation, backup');
 console.log('PASS subject scope: human/social/spatial overlap and free topic; rights question without prefilled verdict; original+new cases no answer insertion; report/backup/task isolation');
})().catch(e=>{console.error(e);process.exit(1)});
`);
