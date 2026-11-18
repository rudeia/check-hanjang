const fs=require('fs'),vm=require('vm'),assert=require('assert');
const c=vm.createContext({});vm.runInContext(fs.readFileSync('docs/workbook-storage.js','utf8'),c);
vm.runInContext(`globalThis.test={blank,valid,activityRecord,replaceActivity,restoreActivity}`,c);
const {blank,valid,activityRecord,replaceActivity,restoreActivity}=c.test;
let human=blank(),economy=blank();human.answers={topic:'human',legacy:'keep'};economy.answers={topic:'economy',economicConclusion:'keep conclusion'};
const original={...human,economy,inquiry:{version:1,active:'human'}};const raw=JSON.stringify(original);
let restored=restoreActivity(original,{schema:'check-hanjang-activity',version:1,activity:'economy',task:{...blank(),answers:{topic:'new economy'}}},'economy');
assert.equal(restored.answers.topic,'human');assert.equal(restored.answers.legacy,'keep');assert.equal(restored.economy.answers.topic,'new economy');assert(valid(restored));assert.equal(JSON.stringify(original),raw);
assert.throws(()=>restoreActivity(original,{schema:'check-hanjang-activity',version:1,activity:'human',task:human},'economy'));
assert.throws(()=>restoreActivity(original,human,'economy'));
restored=restoreActivity(original,{...human,answers:{topic:'legacy import'},economy,inquiry:{version:1,active:'human'}},'human');assert.equal(restored.answers.topic,'legacy import');assert.equal(restored.economy.answers.topic,'economy');
for(const task of ['human','economy']){const reset=replaceActivity(original,blank(),task);assert(valid(reset));assert.equal(activityRecord(reset,task).answers.topic,undefined);assert.equal(activityRecord(reset,task==='human'?'economy':'human').answers.topic,task==='human'?'economy':'human');}
console.log('PASS scoped backups, cross-task rejection, legacy import, reset, unknown answers preservation');
