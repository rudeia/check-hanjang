// Isolated source-level DOM simulation; never uses a user's browser/storage.
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const seed={schema:'assessment-one',version:1,step:1,answers:{name:'가상 학생',topic:'기존 탐구 제목',reason:'보존할 이유'},sources:[{title:'기존 자료',url:'https://example.org'}],checks:[true,false]};
let saved=JSON.stringify(seed), writes=0;
const nodes={};
function node(sel){return nodes[sel]??= {innerHTML:'',textContent:'',style:{},dataset:{},classList:{toggle(){}},handlers:{},addEventListener(type,fn){const old=this.handlers[type];this.handlers[type]=old?e=>{old(e);return fn(e)}:fn},setAttribute(){},focus(){},scrollIntoView(){},querySelector(){return node('field-input')}};}
const document={querySelector:node,querySelectorAll(sel){if(sel==='#question .primary-fields > .field')return Array.from({length:((node('#question').innerHTML.split('<div class="primary-fields">')[1]||'').split('<details class="optional-fields">')[0].match(/class="field"/g)||[]).length},(_,i)=>node('field-'+i));return []},body:node('body')};
const context={document,localStorage:{getItem(){return saved},setItem(k,v){saved=v;writes++},removeItem(){throw Error('Unexpected reset')}},window:{addEventListener(){}},console,Date,JSON,Number,String,Object,Array,Math,setTimeout(){},confirm(){throw Error('Backup/reset approval must not be triggered')},INQUIRY_CASES:[]};
vm.createContext(context);
vm.runInContext(fs.readFileSync('docs/cases.js','utf8')+'\n'+fs.readFileSync('docs/help.js','utf8')+'\n'+fs.readFileSync('docs/media.js','utf8')+'\n'+fs.readFileSync('docs/app.js','utf8'),context);
const run=x=>vm.runInContext(x,context);
assert.equal(writes,0,'Loading old data does not overwrite it');
assert.equal(run('data.answers.topic'),seed.answers.topic);assert.equal(run('data.sources[0].title'),seed.sources[0].title);
assert.equal(run('KEY'),'pyeongga-hanjang-social2-v1');assert.equal(run('valid(data)'),true);
assert.equal(run('fieldIndex'),0);node('#next').onclick();assert.equal(run('fieldIndex'),1);assert.equal(run('data.step'),1);
node('#next').onclick();assert.equal(run('data.step'),3);
node('#prev').onclick();assert.equal(run('data.step'),1);assert.equal(run('fieldIndex'),1);
node('#focus-toggle').onclick();assert.equal(run('focused'),false);node('#focus-toggle').onclick();assert.equal(run('focused'),true);
for(let i=0;i<9;i++){run(`data.step=${i};fieldIndex=0;render()`);assert(node('#question').innerHTML.length>50);}
run('data.step=1;render();selectedCase=0;renderGuide()');assert(node('#case-guide').innerHTML.includes('target="_blank"'));assert.equal(run('data.answers.topic'),seed.answers.topic);
run("data.answers.inquiry='내가 직접 쓴 질문';save();buildReport()");assert(node('#report').innerHTML.includes('내가 직접 쓴 질문'));assert(!node('#report').innerHTML.includes('이번 단계의 생각 힌트'));
const result=JSON.parse(saved);assert.equal(result.version,1);assert.equal(result.answers.name,seed.answers.name);assert.deepEqual(result.sources,seed.sources);assert.deepEqual(result.checks,seed.checks);
assert.equal(run("valid({schema:'assessment-one',version:2,step:0,answers:{},sources:[{}],checks:[]})"),false);
assert.equal(run('INQUIRY_CASES.length'),9);assert(run('INQUIRY_CASES.every(c=>c.sources.length>0&&c.sources.every(s=>s.url.startsWith("https://")))'));
assert(!/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/.test(fs.readFileSync('docs/app.js','utf8')));
console.log('PASS: v1 untouched load, preserved fields/sources/checks, forward/back focus navigation, 5 flows / 9 legacy step values, focus toggle, 9 cases, own-writing report, no network submission. Browser visual QA not performed.');
assert.equal(run('INQUIRY_CASES.filter(c=>c.photo).length'),4);
for(const id of ['mobility','digital','library','heat']){
 const html=run(`renderPhoto(INQUIRY_CASES.find(c=>c.id==='${id}').photo)`);
 assert(html.includes('data-photo-src='));assert(!/<img[^>]*\ssrc=/.test(html),'Original image must not load until expanded');
 assert(html.includes('Wikimedia Commons'));assert(html.includes('creativecommons.org/licenses/'));assert(html.includes('원본 무수정'));assert(html.includes('촬영'));
}
const img={dataset:{photoSrc:'https://example.org/test.jpg'},getAttribute(){return null}};
node('#case-guide').handlers.toggle({target:{classList:{contains:x=>x==='case-photo'},open:true,querySelector:()=>img}});
assert.equal(img.src,'https://example.org/test.jpg');
console.log('PASS: four photo metadata records, attribution/license/original links, no initial image src, expand-only source assignment. Actual image network/rendering not tested.');
run('data=blank();started=false;introExpanded=false;render()');assert.equal(run('started'),false);assert.equal(node('#intro-toggle').hidden,true);
node('#question').handlers.focusin({target:{matches:()=>true}});assert.equal(run('started'),true);assert.equal(node('#intro-toggle').hidden,false);
node('#intro-toggle').onclick();assert.equal(run('introExpanded'),true);node('#intro-toggle').onclick();assert.equal(run('introExpanded'),false);
run('data.step=0;render()');assert.equal(run('started'),true,'Returning to start does not reopen introduction');
run("data=blank();data.answers.name='기존 기록';started=false;introExpanded=false;render()");assert.equal(run('started'),true,'Existing answers collapse introduction even in step zero');
console.log('PASS: empty first visit, first-field focus collapse, reversible intro toggle, start-step return, existing-answer resume.');
run("data=blank();data.step=1;data.sources=[{title:'이전 제목',author:'보존 기관',date:'2025',trust:'보존 판단'}];render()");
run('renderTopicResearch()');assert(node('#topic-research').innerHTML.includes('https://www.bigkinds.or.kr/'));
assert(node('#topic-research').innerHTML.includes('id="quick0-evidence"'));
for(const [key,value] of [['title','새 자료 제목'],['url','https://example.org/news'],['evidence','학생이 직접 쓴 짧은 요약']])node('#topic-research').handlers.input({target:{dataset:{key},value,closest:()=>({dataset:{source:'0'}})}});
assert.equal(run('data.sources[0].author'),'보존 기관');assert.equal(run('data.sources[0].trust'),'보존 판단');assert.equal(run('data.sources[0].evidence'),'학생이 직접 쓴 짧은 요약');
node('#topic-research').handlers.click({target:{id:'add-source',dataset:{}}});assert.equal(run('data.sources.length'),2);
context.confirm=()=>true;node('#topic-research').handlers.click({target:{dataset:{remove:'1'}}});assert.equal(run('data.sources.length'),1);
node('#topic-research').handlers.click({target:{id:'go-sources',dataset:{}}});assert.equal(run('data.step'),3);assert(run('renderSources()').includes('학생이 직접 쓴 짧은 요약'));assert(run('renderSources()').includes('보존 기관'));assert.equal(node('#topic-research').innerHTML,'');
node('#question').handlers.input({target:{dataset:{key:'evidence'},value:'자료 수집에서 수정',closest:()=>({dataset:{source:'0'}})}});
run('data.step=1;render();renderTopicResearch()');assert(node('#topic-research').innerHTML.includes('자료 수집에서 수정'));assert.equal(run('valid(data)'),true);
console.log('PASS: shared source list bidirectional editing, quick title/link/summary, add/delete, preserved old metadata, jump to full source step, schema v1 validity.');
run("data.step=1;data.answers.topic='이전에 쓴 주제';data.attachments=[{id:'virtual',caption:'가상 사진',credit:'직접 제작',source:'테스트',dataUrl:'data:image/jpeg;base64,QQ=='}];selectedCase=2;fieldIndex=2;render()");
const beforeChoice=run('JSON.stringify(data)');
node('#case-guide').handlers.click({target:{closest:s=>s==='[data-custom-topic]'?{}:null}});
assert.equal(run('JSON.stringify(data)'),beforeChoice,'Choice never rewrites student data');assert.equal(run('fieldIndex'),0);assert.equal(run('selectedCase'),-1);assert.equal(run('customTopic'),true);assert(node('#question').innerHTML.includes('내가 정한 탐구 주제'));
node('#question').handlers.input({target:{dataset:{key:'topic'},value:'내가 정한 가상 생활권 문제',closest:()=>null}});
assert.equal(run('data.answers.topic'),'내가 정한 가상 생활권 문제');assert.equal(run('data.attachments[0].caption'),'가상 사진');assert.equal(run('data.sources[0].author'),'보존 기관');
run('buildReport()');assert(node('#report').innerHTML.includes('내가 정한 가상 생활권 문제'));assert.equal(JSON.parse(saved).answers.topic,'내가 정한 가상 생활권 문제');
node('#next').onclick();node('#next').onclick();assert.equal(run('data.step'),3);assert.equal(run('data.answers.topic'),'내가 정한 가상 생활권 문제');
console.log('PASS: custom-topic choice returns to single existing field without changing data; own text saves/reports/continues while sources/photos remain intact.');
const originalKeys=run('steps.flatMap(s=>s.slice(3).map(f=>f[0]))');
const visibleKeys=run('flows.flatMap(f=>[...f.primary,...f.extras.flatMap(x=>x[1])])');
assert.deepEqual([...originalKeys].sort(),[...visibleKeys].sort());assert.equal(new Set(visibleKeys).size,visibleKeys.length);
run("data=blank();for(const s of steps)for(const f of s.slice(3))data.answers[f[0]]='KEEP_'+f[0];data.sources=[Object.fromEntries(sourceFields.map(f=>[f[0],'SOURCE_'+f[0]]))];data.checks=checks.map(()=>true);data.attachments=[{id:'retained',caption:'PHOTO_KEPT',credit:'AUTHOR_KEPT',source:'SOURCE_KEPT',dataUrl:'data:image/jpeg;base64,QQ=='}]");
for(let i=0;i<9;i++){run(`data.step=${i}`);const snapshot=run('JSON.stringify(data)');run('render()');assert.equal(run('JSON.stringify(data)'),snapshot);assert.equal((node('#steps').innerHTML.match(/data-step=/g)||[]).length,5);}
run('focused=false');let html='';for(const step of [1,3,4,5,6]){run(`data.step=${step};render()`);html+=node('#question').innerHTML;}
for(const key of originalKeys)assert(html.includes('KEEP_'+key),key+' is still accessible');
run('buildReport()');for(const key of originalKeys)assert(node('#report').innerHTML.includes('KEEP_'+key));for(const [key] of run('sourceFields'))assert(node('#report').innerHTML.includes('SOURCE_'+key));assert(node('#report').innerHTML.includes('PHOTO_KEPT'));
run('data=blank();fieldIndex=0;focused=true;render()');let visited=new Set([run('flowIndex()')]);for(let i=0;i<20;i++){node('#next').onclick();visited.add(run('flowIndex()'));}assert.deepEqual([...visited],[0,1,2,3,4]);assert.equal(run('data.step'),6);
for(let i=0;i<20;i++)node('#prev').onclick();assert.equal(run('flowIndex()'),0);assert.equal(run('fieldIndex'),0);
console.log('PASS: all '+originalKeys.length+' legacy answer keys covered once, 9 legacy saved positions map to 5 flows without mutation, all values/photos in report, full forward/back journey. Primary prompts: '+run('flows.reduce((n,f)=>n+f.primary.length,0)'));
run("data=blank();data.answers.topic='포스터 제목';data.answers.current='확인한 사실';data.answers.cause='내가 쓴 원인';data.answers.policy='내가 쓴 제안';data.answers.name='부록 이름';buildReport()");
assert(node('#report').innerHTML.includes('class="poster-sheet"'));assert(node('#report').innerHTML.includes('포스터 제목'));assert(node('#report').innerHTML.includes('확인한 사실'));assert(node('#report').innerHTML.includes('내가 쓴 제안'));
assert(node('#report').innerHTML.includes('class="report-appendix" hidden'));node('#include-appendix').checked=true;node('#include-appendix').onchange();assert(!node('#report').innerHTML.includes('class="report-appendix" hidden'));assert(node('#report').innerHTML.includes('부록 이름'));
run("data.step=5;focused=false;render()");assert(node('#question').innerHTML.includes('id="open-media"'));assert(node('#question').innerHTML.includes('PDF·PPT·영상 파일은 직접 첨부할 수 없어요'));
console.log('PASS: poster layout uses only student content, optional complete-record appendix toggle, image-only visual-artifact upload guidance.');
run('data=blank();focused=true;fieldIndex=0;extraActivity=null;render()');assert(node('#question').innerHTML.includes('빅카인즈 뉴스 찾기'));assert(node('#question').innerHTML.includes('id="go-sources"'));
for(const step of [1,3,4,5,6]){run(`data.step=${step};extraActivity=null`);const activities=run('activityList()');for(let i=0;i<activities.length;i++){run(`fieldIndex=${i};render()`);const a=activities[i];if(['field','source'].includes(a.kind))assert.equal((node('#question').innerHTML.match(/data-key=/g)||[]).length,1,'only one student input rendered');assert.equal(node('#student-media').hidden,a.kind!=='media');}}
run("data.step=3;data.sources=[{title:'남길 자료'},{title:'삭제 가상 자료',author:'가상 기관'}];fieldIndex=4;extraActivity={kind:'source',source:1,key:'author',title:'기관'};render()");
node('#question').handlers.click({target:{dataset:{remove:'1'}}});assert.equal(run('data.sources.length'),1);assert.equal(run('extraActivity'),null);assert.equal(run('fieldIndex'),0);assert(node('#question').innerHTML.includes('남길 자료'));
node('#question').handlers.click({target:{id:'add-source',dataset:{}}});assert.equal(run('data.sources.length'),2);assert.equal(run('fieldIndex'),3);assert(node('#question').innerHTML.includes('data-source="1"'));
run("data.step=1;fieldIndex=1;extraActivity=null;render()");node('#question').handlers.click({target:{dataset:{extraKey:'reason'}}});assert.equal(run('extraActivity.key'),'reason');assert.equal((node('#question').innerHTML.match(/data-key=/g)||[]).length,1);node('#next').onclick();assert.equal(run('extraActivity'),null);assert.equal(run('fieldIndex'),1);
console.log('PASS: one input per field/source activity; photos only in photo activity; topic search connection; optional activity return; last-source deletion and new-source jump.');
