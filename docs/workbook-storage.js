'use strict';
const KEY='pyeongga-hanjang-social2-v1';
const BACKUP_LIMIT_BYTES=5*1024*1024;
const $=s=>document.querySelector(s);
const LEGACY_STEP_COUNT = 9;
const LEGACY_FIELDS = ['school', 'classroom', 'number', 'name', 'team', 'topic', 'reason', 'inquiry', 'scope', 'current', 'cause', 'impact', 'policy', 'action', 'format', 'message', 'visual', 'visualSource', 'opening', 'body', 'closing', 'qa', 'role', 'cooperation', 'reflection', 'improve', 'aiUse'];
const blank=()=>({schema:'assessment-one',version:1,step:0,answers:{},sources:[{}],checks:[]});
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function validAttachments(items){return items===undefined||(Array.isArray(items)&&items.length<=4&&items.every(p=>p&&typeof p==='object'&&['id','caption','credit','source','dataUrl'].every(k=>typeof p[k]==='string')&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(p.dataUrl)&&p.dataUrl.length<=500000)&&items.reduce((n,p)=>n+p.dataUrl.length,0)<=2000000);}
function stringRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every(item => typeof item === 'string');
}
function validWorksheet(task) {
  const { worksheetStep, worksheetChecks, rehearsalChecks } = task;
  const photos = task.sources.filter(source => source._photo !== undefined);
  return (worksheetStep === undefined || (Number.isInteger(worksheetStep) && worksheetStep >= 0 && worksheetStep < 4))
    && [worksheetChecks, rehearsalChecks].every(checks => checks === undefined
      || (Array.isArray(checks) && checks.length === 4 && checks.every(value => typeof value === 'boolean')))
    && photos.length <= MEDIA_LIMIT.count
    && photos.every(source => source._photo.length <= MEDIA_LIMIT.dataChars
      && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(source._photo))
    && photos.reduce((sum, source) => sum + source._photo.length, 0) <= MEDIA_LIMIT.totalChars;
}
function baseValid(task) {
  return task && task.schema === 'assessment-one' && task.version === 1
    && Number.isInteger(task.step) && task.step >= 0 && task.step < LEGACY_STEP_COUNT
    && stringRecord(task.answers)
    && Array.isArray(task.sources) && task.sources.length > 0 && task.sources.every(stringRecord)
    && Array.isArray(task.checks) && task.checks.every(value => typeof value === 'boolean')
    && validAttachments(task.attachments) && validWorksheet(task);
}
// v1 is retained; extensions are opt-in and never written during loading.
function validLearning(x){return x===undefined||(x&&x.version===1&&x.links&&typeof x.links==='object'&&!Array.isArray(x.links)&&Object.values(x.links).every(ids=>Array.isArray(ids)&&ids.every(id=>typeof id==='string')));}
function validPosition(p,d,economy=false){if(p===undefined)return true;const counts=[3,d.sources.length*(p?.version===2?2:5),4,4,economy?3:2,5,economy?4:3];const extras=[...LEGACY_FIELDS,'comparison','interpretation','valueCriterion','valueJudgment','conclusion','limits','concepts','generalization','conditions','transfer','method','practicePlan','practiceResult','chosenEvidence','actualPresentation','actualQuestions','posterTitle','topicLens','rightsConnection','sourceReview','presentationPrep','checks'];return p&&[1,2].includes(p.version)&&Number.isInteger(p.group)&&p.group>=0&&p.group<counts.length&&Number.isInteger(p.index)&&p.index>=0&&p.index<counts[p.group]&&(p.extra===undefined||(typeof p.extra==='string'&&extras.includes(p.extra)&&(economy||!['practicePlan','practiceResult'].includes(p.extra))));}
function validTransfer(x){const context=c=>c&&['preset','student'].includes(c.kind)&&typeof c.text==='string';return x===undefined||(x&&x.version===1&&context(x)&&(x.studentDraft===undefined||typeof x.studentDraft==='string')&&(x.answerContext===undefined||context(x.answerContext)));}
function validMission(m){return m===undefined||(m&&m.version===1&&typeof m.enabled==='boolean'&&['none','policy','advocate','journalist','researcher','specialist','custom'].includes(m.choice)&&['customRole','audience','purpose'].every(k=>typeof m[k]==='string')&&['task','product'].every(k=>m[k]===undefined||typeof m[k]==='string'));}
function validTask(d,economy=false){return baseValid(d)&&validLearning(d.learning)&&validPosition(d.position,d,economy)&&validTransfer(d.transferContext)&&validMission(d.mission)&&new Set(d.sources.filter(s=>s._id).map(s=>s._id)).size===d.sources.filter(s=>s._id).length;}
function valid(d){return validTask(d)&&(d.inquiry===undefined?d.economy===undefined:(d.inquiry&&d.inquiry.version===1&&['human','economy'].includes(d.inquiry.active)&&(d.economy===undefined?d.inquiry.active==='human':validTask(d.economy,true)&&d.economy.inquiry===undefined&&d.economy.economy===undefined)));}
const MEDIA_LIMIT={count:4,inputBytes:2*1024*1024,dataChars:500000,totalChars:2000000};
async function convertStudentPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MEDIA_LIMIT.inputBytes) {
    throw new Error('2MB 이하의 JPEG, PNG, WebP 이미지를 골라 주세요.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error('이미지를 읽을 수 없어요. 다른 파일을 골라 주세요.'); });
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 16000000) {
      throw new Error('이미지가 너무 커요. 더 작은 이미지로 바꿔 주세요.');
    }
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서 이미지를 처리할 수 없어요.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const jpeg = canvas.toDataURL('image/jpeg', .8);
    const result = jpeg.length <= MEDIA_LIMIT.dataChars ? jpeg : canvas.toDataURL('image/jpeg', .55);
    if (result.length > MEDIA_LIMIT.dataChars) throw new Error('더 작은 이미지로 바꿔 주세요.');
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function validateRestoredPhotos(items) {
  for (const { dataUrl } of items) {
    const image = new Image();
    image.src = dataUrl;
    await image.decode().catch(() => { throw new Error('보관 파일의 이미지를 읽을 수 없어요.'); });
    if (!image.naturalWidth || !image.naturalHeight || Math.max(image.naturalWidth, image.naturalHeight) > 1200) {
      throw new Error('보관 파일에 앱에서 열 수 없는 크기의 이미지가 있어요.');
    }
  }
}

function downloadJSON(value,name){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return blob.size;}
