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
const MEDIA_LIMIT = {
  count: 4, inputBytes: 20 * 1024 * 1024, inputPixels: 25000000, inputEdge: 16384,
  headerBytes: 1024 * 1024, outputEdge: 1200, dataChars: 500000, totalChars: 2000000
};

// Read dimensions before allocating a decoded bitmap. Large EXIF/metadata headers
// are bounded too; unknown or malformed headers never fall through to decoding.
async function studentPhotoHeader(file) {
  const bytes = new Uint8Array(await file.slice(0, MEDIA_LIMIT.headerBytes).arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start, text) => [...text].every((char, i) => bytes[start + i] === char.charCodeAt(0));
  const little24 = start => bytes[start] + bytes[start + 1] * 256 + bytes[start + 2] * 65536;
  if (bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)
      && view.getUint32(8) === 13 && ascii(12, 'IHDR')) {
    const size = { width: view.getUint32(16), height: view.getUint32(20) };
    let offset = 8;
    while (offset + 8 <= bytes.length) {
      const length = view.getUint32(offset);
      if (ascii(offset + 4, 'acTL')) throw new Error('움직이는 이미지는 지원하지 않아요. 정지 사진으로 저장한 뒤 골라 주세요.');
      if (ascii(offset + 4, 'IDAT')) return size;
      offset += 12 + length;
    }
  }
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218 || offset + 2 > bytes.length) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        if (length < 8) break;
        return { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
      }
      offset += length;
    }
  }
  if (bytes.length >= 20 && ascii(0, 'RIFF') && ascii(8, 'WEBP')) {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const length = view.getUint32(offset + 4, true), body = offset + 8;
      if (ascii(offset, 'VP8X') && length >= 10 && body + 10 <= bytes.length) {
        if (bytes[body] & 2) throw new Error('움직이는 이미지는 지원하지 않아요. 정지 사진으로 저장한 뒤 골라 주세요.');
        return { width: little24(body + 4) + 1, height: little24(body + 7) + 1 };
      }
      if (ascii(offset, 'VP8L') && length >= 5 && body + 5 <= bytes.length && bytes[body] === 47) {
        return { width: 1 + (bytes[body + 1] | (bytes[body + 2] & 63) << 8),
          height: 1 + (bytes[body + 2] >> 6 | bytes[body + 3] << 2 | (bytes[body + 4] & 15) << 10) };
      }
      if (ascii(offset, 'VP8 ') && length >= 10 && body + 10 <= bytes.length
          && bytes[body + 3] === 157 && bytes[body + 4] === 1 && bytes[body + 5] === 42) {
        return { width: view.getUint16(body + 6, true) & 16383, height: view.getUint16(body + 8, true) & 16383 };
      }
      offset = body + length + (length % 2);
    }
  }
  throw new Error('사진 정보를 읽을 수 없어요. JPEG, PNG, WebP로 다시 저장한 파일을 골라 주세요.');
}

function checkStudentPhotoDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
      || Math.max(width, height) > MEDIA_LIMIT.inputEdge || width * height > MEDIA_LIMIT.inputPixels) {
    throw new Error('사진은 2,500만 화소 이하로 골라 주세요. 휴대폰의 일반 화질로 저장하거나 크기를 줄여 주세요.');
  }
}

function photoDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('변환한 이미지를 읽지 못했어요. 다시 골라 주세요.'));
    reader.onabort = () => reject(new Error('이미지 처리가 중단됐어요. 다시 골라 주세요.'));
    reader.readAsDataURL(blob);
  });
}

async function convertStudentPhoto(file) {
  if (/image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name || '')) {
    throw new Error('HEIC·HEIF는 이 앱에서 지원하지 않아요. JPEG로 변환한 뒤 골라 주세요.');
  }
  if (!['image/jpeg', 'image/png', 'image/webp', '', 'application/octet-stream'].includes(file.type)) {
    throw new Error('JPEG, PNG, WebP 이미지를 골라 주세요.');
  }
  if (!file.size || file.size > MEDIA_LIMIT.inputBytes) {
    throw new Error('원본 사진은 장당 20MB(20MiB) 이하로 골라 주세요.');
  }
  const header = await studentPhotoHeader(file);
  checkStudentPhotoDimensions(header.width, header.height);
  const url = URL.createObjectURL(file), image = new Image();
  let canvas;
  try {
    image.src = url;
    await image.decode().catch(() => { throw new Error('이미지를 읽을 수 없어요. 다른 파일을 골라 주세요.'); });
    // The browser applies EXIF orientation. Use its actual dimensions for drawing.
    checkStudentPhotoDimensions(image.naturalWidth, image.naturalHeight);
    canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서 이미지를 처리할 수 없어요.');
    // Keep readable dimensions first; if needed, reduce dimensions rather than
    // immediately dropping JPEG quality to 0.55. No enlargement or cropping.
    const edges = [1200, 1020, 867, 737, 640].filter((edge, i, all) =>
      i === 0 || Math.max(image.naturalWidth, image.naturalHeight) > all[i]);
    for (const edge of edges) {
      const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [.86, .78, .7]) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob || blob.type !== 'image/jpeg') throw new Error('이미지를 변환하지 못했어요. 다른 파일을 골라 주세요.');
        if (23 + 4 * Math.ceil(blob.size / 3) > MEDIA_LIMIT.dataChars) continue;
        const result = await photoDataURL(blob);
        if (typeof result === 'string' && result.startsWith('data:image/jpeg;base64,')
            && result.length <= MEDIA_LIMIT.dataChars) return result;
      }
    }
    throw new Error('자동으로 줄여도 저장 용량을 넘어요. 필요한 부분만 잘라서 다시 골라 주세요.');
  } finally {
    image.removeAttribute('src');
    URL.revokeObjectURL(url);
    if (canvas) canvas.width = canvas.height = 1;
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
