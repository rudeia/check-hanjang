const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({Intl});
vm.runInContext(['economy-data','economy-guided-data','economy-local-data','economy-activity'].map(name=>fs.readFileSync(`docs/${name}.js`,'utf8')).join('\n')+`
let draft={answers:{}};const activeTask=()=> 'economy';const work=()=>draft;
const esc=x=>String(x??'').replaceAll('<','&lt;');const filled=x=>Boolean(x?.trim());
const input=(key,title)=>'<textarea id="'+key+'" aria-label="'+title+'"></textarea>';
this.sets=ECONOMY_GUIDED_SETS;this.regions=ECONOMY_LOCAL_CASES;this.clues=ECONOMY_THINKING_CLUES;this.stakes=ECONOMY_INQUIRY_STAKES;this.draft=draft;
`,ctx);
assert(ctx.sets.length>=10);
assert.deepEqual(Object.keys(ctx.regions).sort(),Array.from(ctx.sets, set=>set.id).sort());
assert.deepEqual(Object.keys(ctx.clues).sort(),Object.keys(ctx.regions).sort());
assert.deepEqual(Object.keys(ctx.stakes).sort(),Object.keys(ctx.regions).sort());
for(const set of ctx.sets){
 assert(set.id && set.label && set.decision.options.length===2 && set.roles.length>=2);
 assert(ctx.clues[set.id].length===2 && ctx.clues[set.id].every(clue=>clue.length>20));
 const regional=ctx.regions[set.id];
 assert(regional.region&&regional.clue&&regional.task);
 assert.equal(new Set(regional.periods).size,2);
 assert(regional.rows.length&&regional.rows.every(row=>row.length===3&&row[1]!==row[2]));
 assert(regional.sources.length&&regional.sources.every(([name,title,url,section])=>name&&title&&url.startsWith('https://')&&section));
 const sources=[set.primary,set.comparison,...set.additional];
 assert(new Set(sources.map(source=>source.sourceUrl)).size>=3);
 assert(new Set(sources.map(source=>source.publisher)).size>=3);
 assert.equal(new Set(set.additional.map(source=>source.id)).size,set.additional.length);
 for(const source of sources){
  assert(source.sourceUrl.startsWith('https://'));assert(source.publisher&&source.published&&source.sourcePage);
  assert(source.rows.every(row=>row.length===source.headers.length));
 }
 ctx.draft.answers.guidedSetId=set.id;
 if(set.interpretation){
  assert(set.interpretation.correctIndex>=0 && set.interpretation.correctIndex<set.interpretation.options.length);
  ctx.draft.answers[`guided_${set.id}_interpretation`]=String(set.interpretation.correctIndex);
 }
 if(set.numeric) ctx.draft.answers[`guided_${set.id}_calculation`]=String(set.numeric.answer);
 if(set.interpretation)assert(vm.runInContext('guidedCheckFeedback(economyGuided())',ctx).includes('적절해요'));
 const initial=vm.runInContext("guidedMaterials(economyGuided(),'initial')",ctx);
 assert(initial.includes(set.primary.sourceTitle)&&!initial.includes('data-evidence'));
 for(const kind of ['primary','comparison',...set.additional.map(source=>source.id)])ctx.draft.answers[`guided_${set.id}_evidence_${kind}_0`]='yes';
 assert.equal(vm.runInContext('guidedSourceCount(economyGuided(),true)',ctx),0);
 for(let sourceNumber=1;sourceNumber<=3;sourceNumber++){
  ctx.draft.answers[`guided_${set.id}_source_${sourceNumber}_excerpt`]='원문 표에서 옮긴 수치';
  ctx.draft.answers[`guided_${set.id}_source_${sourceNumber}_use`]='수치와 판단의 관계';
 }
 assert.equal(vm.runInContext('guidedSourceCount(economyGuided(),true)',ctx),3);
 if(set.numeric){ctx.draft.answers[`guided_${set.id}_calculation`]='0x10';assert(vm.runInContext('guidedCheckFeedback(economyGuided())',ctx).includes('숫자만'));}
}
console.log('PASS independent sources, topic clues, student-written evidence, arithmetic and interpretation');

ctx.draft.answers.guidedSetId='renewable-sharing';
ctx.draft.answers['guided_renewable-sharing_read']='학생이 직접 쓴 신안 기록';assert(vm.runInContext('guidedReadingReport(economyGuided())',ctx).includes('학생이 직접 쓴 신안 기록'));
