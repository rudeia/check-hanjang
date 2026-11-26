const fs=require('fs'),vm=require('vm'),assert=require('assert');
const script=fs.readFileSync('docs/listening.js','utf8').replace(/\}\)\(\);\s*$/, 'globalThis.testApi={valid,openNote,save,preparePrint,getState:()=>state};})();');
const legacy={version:1,listener:'synthetic',records:[{number:'01',topic:'old rights',problem:'right',evidence:'source',explanation:'reason',solution:'plan',learning:'learn',question:''}],draft:null};
const stores=new Map([['check-hanjang-listening-v1',JSON.stringify(legacy)]]);
function setup(task){
 const nodes=new Map(),handlers={};let confirms=0,fail=false,writes=0;
 const node=k=>{if(!nodes.has(k))nodes.set(k,{value:'',textContent:'',innerHTML:'',hidden:false,style:{},addEventListener(t,f){this[t]=f},focus(){},reset(){},replaceChildren(){},click(){}});return nodes.get(k)};
 const c={URLSearchParams,location:{search:task?'?task='+task:''},document:{title:'',getElementById:node,querySelector:node,querySelectorAll:()=>[]},localStorage:{getItem:k=>stores.get(k)||null,setItem(k,v){if(fail)throw Error('quota');writes++;stores.set(k,v)},removeItem:k=>stores.delete(k)},window:{addEventListener:(k,f)=>handlers[k]=f,print(){}},confirm:()=>{confirms++;return true},console};
 vm.createContext(c);vm.runInContext(script,c);return {c,node,api:c.testApi,confirms:()=>confirms,writes:()=>writes,setFail:v=>fail=v};
}
(async()=>{
 const h=setup(); assert.equal(h.api.getState().records[0].topic,'old rights');assert.equal(h.writes(),0,'read-only legacy remains untouched');
 const oldRaw=stores.get('check-hanjang-listening-v1');const e=setup('economy');assert.equal(e.api.getState().records.length,0);assert(e.node('note-fields').innerHTML.includes('경제 개념'));
 e.api.openNote('01');e.node('topic').value='economy report';e.node('explanation').value='opportunity cost';e.node('evidence').value='친구의 수치';e.node('learning').value='새로 배운 점';e.node('opinion').value='내 의견과 이유';e.node('collaboration').value='대화에서 한 일';e.api.save();
 assert.equal(setup('economy').api.getState().records[0].opinion,'내 의견과 이유');
 assert.equal(stores.get('check-hanjang-listening-v1'),oldRaw);assert.equal(JSON.parse(stores.get('check-hanjang-economy-reading-v1')).activity,'economy');assert.equal(setup('economy').api.getState().records[0].topic,'economy report');
 const humanTagged={...legacy,activity:'human'}; const before=stores.get('check-hanjang-economy-reading-v1');
 await e.node('notes-file').onchange({target:{files:[{size:10,text:async()=>JSON.stringify(humanTagged)}],value:'x'}});assert.equal(e.confirms(),0);assert.equal(stores.get('check-hanjang-economy-reading-v1'),before);
 await e.node('notes-file').onchange({target:{files:[{size:10,text:async()=>JSON.stringify(legacy)}],value:'x'}});assert.equal(e.confirms(),0,'untyped legacy is human only');
 assert(!h.api.valid({...legacy,activity:'economy'}));
 e.api.preparePrint();assert(e.node('notes-print').innerHTML.includes('경제 탐구 보고서'));assert(!e.node('notes-print').innerHTML.includes('old rights'));
 assert(e.node('notes-print').innerHTML.includes('내 의견과 이유'));assert(e.node('notes-print').innerHTML.includes('대화에서 한 일'));
 e.setFail(true);const prev=e.api.getState();await e.node('notes-file').onchange({target:{files:[{size:10,text:async()=>JSON.stringify({...legacy,activity:'economy'})}],value:'x'}});assert.equal(e.api.getState(),prev,'quota restore rolls back in memory');assert.equal(stores.get('check-hanjang-economy-reading-v1'),before);e.setFail(false);
 e.node('clear-notes').onclick();assert(!stores.has('check-hanjang-economy-reading-v1'));assert.equal(stores.get('check-hanjang-listening-v1'),oldRaw);
 // A second window must not overwrite newer edits from the same activity.
 const a=setup('economy'),b=setup('economy');a.api.openNote('01');a.node('topic').value='newer';a.api.save();const fresh=stores.get('check-hanjang-economy-reading-v1');b.api.openNote('01');b.node('topic').value='stale';b.api.save();assert.equal(stores.get('check-hanjang-economy-reading-v1'),fresh);
 console.log('PASS: legacy retained, activity-separated same-number records, reload, cross-import blocked, scoped print/reset, restore failure rollback, stale-tab protection. DOM mocked.');
})().catch(e=>{console.error(e);process.exit(1)});
