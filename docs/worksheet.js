'use strict';

const STEPS = ['문제 찾기', '근거 자료 모으기', '내 생각 정리하기', '포스터 완성 및 인쇄'];
const TASKS = { human: '인권과 불평등', economy: '우리 지역의 경제 변화' };
const ECONOMY_TOPICS = ['전통시장과 온라인 쇼핑', '관광객이 늘어난 동네의 상권 변화', '산업단지와 지역 일자리'];
const CHECKLIST = [
  '조사할 문제를 구체적인 질문으로 적었어요.',
  '자료에서 확인한 사실과 출처를 적었어요.',
  '자료를 비교하고 내 입장과 해결책을 적었어요.',
  '포스터에 나온 이름, 출처, 사진을 확인했어요.'
];
const PROMPTS = {
  inquiry: ['어디에서, 누구에게, 어떤 문제가 생기고 있나요?', '예: 우리 동네와 옆 동네는 노인복지관을 이용하기 얼마나 편할까?'],
  current: ['자료에서 확인한 정확한 수치나 사실은 무엇인가요?', '예: 우리 동네 고령화율은 25%인데 노인복지관은 1곳뿐이다.'],
  comparison: ['다른 지역이나 사례와 비교하면 어떤 차이가 있나요?', '예: 옆 동네에는 복지관이 3곳이고, 집에서 걸어갈 수 있는 곳도 더 많다.'],
  interpretation: ['왜 이런 차이가 생겼을까요?', '예: 우리 동네는 마을이 흩어져 있고 복지관으로 가는 버스도 적다.'],
  valueJudgment: ['가장 중요하게 지켜야 할 가치는 무엇이고, 왜 그렇게 생각하나요?', '예: 형평성이 중요하다. 사는 곳에 따라 복지관을 이용할 기회가 달라지기 때문이다.'],
  proposal: ['누가 무엇을 하면 이 문제가 나아질까요?', '예: 구청이 복지관과 외곽 마을을 잇는 셔틀을 주 2회 운영한다.'],
  posterTitle: ['포스터 제목을 정해 볼까요?', '예: 복지관으로 가는 길, 동네마다 얼마나 다를까?']
};

let data = blank();
let originalRaw = null;
let storageBlocked = false;
let memoryDirty = false;
let revision = 0;
let photoBusy = false;
let restoreBusy = false;
let printBusy = false;
const mobile = matchMedia('(max-width: 839px)');
const activeTask = () => data.inquiry?.active || 'human';
const work = () => activeTask() === 'economy' ? data.economy : data;
const stage = () => work().worksheetStep ?? [0, 0, 1, 1, 2, 3, 3, 3, 3][work().step];
const filled = value => Boolean(value?.trim());
const sourceFact = source => source.fact ?? source.evidence ?? '';
const hasSource = source => Object.entries(source).some(([key, value]) => key !== '_id' && filled(value));
const proposal = answers => answers.proposal ?? [answers.policy, answers.action].filter(filled).join('\n');
const previewButton = $('#mobile-preview');
const fileDialog = $('#file-dialog');

function notice(selector, message) {
  const element = $(selector);
  element.textContent = message;
  element.hidden = !message;
}

try {
  originalRaw = localStorage.getItem(KEY);
  if (originalRaw !== null) {
    const saved = JSON.parse(originalRaw);
    if (!valid(saved)) throw new Error();
    data = saved;
    $('#save-status').textContent = '이 기기에 저장됨';
  }
} catch {
  storageBlocked = true;
  $('#save-status').textContent = '자동 저장 중지';
  notice('#storage-warning', '기존 기록을 읽지 못했어요. 작업 저장·불러오기에서 원래 파일을 보관할 수 있어요.');
  $('#recover-raw').hidden = originalRaw === null;
}

function persist(candidate, replace = false) {
  if (storageBlocked && !replace) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(candidate));
    storageBlocked = false;
    memoryDirty = false;
    $('#save-status').textContent = '이 기기에 저장됨';
    notice('#storage-warning', '');
    $('#recover-raw').hidden = true;
    return true;
  } catch {
    $('#save-status').textContent = '자동 저장 실패';
    notice('#storage-warning', '기기에 저장할 수 없어요. 화면을 닫기 전에 작업 저장·불러오기에서 파일로 보관하세요.');
    return false;
  }
}

function patchTask(patch) {
  return activeTask() === 'economy'
    ? { ...data, economy: { ...work(), ...patch } }
    : { ...data, ...patch };
}

function change(candidate, requireStorage = false) {
  const stored = persist(candidate);
  if (!stored && requireStorage) return false;
  memoryDirty = !stored;
  data = candidate;
  revision++;
  renderPoster();
  renderProgress();
  return true;
}

function input(key, label, example, value = '', options = {}) {
  const { area = false, source, count = false } = options;
  const id = source === undefined ? key : `source-${source}-${key}`;
  const attributes = `id="${id}" data-key="${key}" ${source === undefined ? '' : `data-source="${source}"`} placeholder="${esc(example)}"`;
  return `<div class="field"><label for="${id}">${label}</label>${
    area ? `<textarea ${attributes}${count ? ` aria-describedby="${id}-count"` : ''}>${esc(value)}</textarea>`
      : `<input type="text" ${attributes} value="${esc(value)}" autocomplete="off">`
  }${count ? `<small class="character-count" id="${id}-count">${[...value].length}자</small>` : ''}</div>`;
}

function prompt(key) {
  const [question, example] = PROMPTS[key];
  return input(key, question, example, key === 'proposal' ? proposal(work().answers) : work().answers[key],
    { area: key !== 'posterTitle', count: key !== 'posterTitle' });
}

function heading(title, description) {
  return `<div class="step-heading"><span class="step-kicker">Step ${stage() + 1} / 4</span><h1 id="step-title" tabindex="-1">${title}</h1><p>${description}</p></div>`;
}

function topicOptions() {
  return activeTask() === 'human' ? INQUIRY_CASES.map(item => item.title) : ECONOMY_TOPICS;
}

function caseGuide(title) {
  const example = activeTask() === 'human' && INQUIRY_CASES.find(item => item.title === title);
  if (!example) return '';
  return `<details class="supplement"><summary>이 주제의 조사 방법과 자료 보기</summary><p>${esc(example.context)}</p><p>${esc(example.method)}</p><ul>${example.sources.map(source =>
    `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a><br>${esc(source.find)}</li>`
  ).join('')}</ul></details>`;
}

function problemEditor() {
  const a = work().answers;
  const topics = topicOptions();
  return heading(STEPS[0], '내 정보를 적고 조사할 주제를 골라요.') +
    `<div class="field-grid student-fields">
      ${input('number', '학번', '예: 20513', a.number)}
      ${input('name', '이름', '예: 김하늘', a.name)}
      ${input('team', '모둠', '예: 3모둠', a.team)}
    </div>
    <div class="worksheet-section topic-section">
      <h2>무엇을 조사할까요?</h2>
      <div class="field-grid topic-fields">
        <div class="field"><label for="task">수업 과제</label><select id="task">${Object.entries(TASKS).map(([key, label]) =>
          `<option value="${key}" ${key === activeTask() ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
        <div class="field"><label for="topic-picker">탐구 주제 선택</label><select id="topic-picker">
          <option value="">주제를 골라 보세요</option>
          ${topics.map((title, index) => `<option value="${index}" ${title === a.topic ? 'selected' : ''}>${esc(title)}</option>`).join('')}
          <option value="custom" ${filled(a.topic) && !topics.includes(a.topic) ? 'selected' : ''}>직접 정하기</option>
        </select></div>
      </div>
      <div id="custom-topic" ${filled(a.topic) && !topics.includes(a.topic) ? '' : 'hidden'}>
        ${input('topic', '내 탐구 주제', '예: 우리 동네 노인복지관 이용의 어려움', a.topic)}
      </div>
      <div id="case-guide">${caseGuide(a.topic)}</div>
      <button type="button" class="primary" id="start">탐구 시작하기</button>
    </div>
    <div class="worksheet-section question-section">${prompt('inquiry')}
      ${a.reason ? input('reason', '이 주제를 고른 이유는 무엇인가요?', '예: 할머니가 복지관까지 두 번 환승하는 것을 봤다.', a.reason, { area: true }) : ''}
    </div>`;
}

function sourceCard(source, i) {
  const title = `근거 자료 ${i + 1}`;
  return `<section class="source-card" aria-labelledby="card-${i}">
    <div class="card-head"><h2 id="card-${i}" tabindex="-1">${title}</h2><button type="button" data-delete="${i}" aria-label="${title} 삭제">삭제</button></div>
    <div class="photo-row">
      ${source._photo ? `<img class="card-image" src="${source._photo}" alt="${title} 이미지"><button type="button" data-remove-photo="${i}">이미지 제거</button>` : ''}
      <label class="upload-button" for="photo-${i}">${source._photo ? '이미지 바꾸기' : '+ 이미지 첨부'}<input id="photo-${i}" type="file" data-photo="${i}" accept="image/jpeg,image/png,image/webp"></label>
      ${source._photo ? '' : '<small>선택 사항</small>'}
    </div>
    ${input('title', '자료 이름', '예: 우리 구 노인복지시설 현황', source.title, { source: i })}
    ${input('url', '자료 출처', '예: ○○구청 복지시설 현황(2025) 또는 자료 링크', source.url, { source: i })}
    ${input('fact', '자료에서 확인한 핵심 사실 한 줄', '예: 2025년 ○○동에 등록된 노인복지관은 1곳이다.', sourceFact(source), { source: i })}
    ${source._photo ? input('photoCaption', '이미지 설명', '예: ○○동과 △△동의 복지관 위치 지도', source.photoCaption, { source: i }) : ''}
    ${source.author || source.date ? `<details class="supplement"><summary>자료를 만든 곳과 날짜</summary>
      ${input('author', '작성자 또는 기관', '예: ○○구청 복지과', source.author, { source: i })}
      ${input('date', '자료 기준 날짜', '예: 2025년 12월', source.date, { source: i })}</details>` : ''}
  </section>`;
}

function evidenceEditor() {
  const sources = work().sources;
  return heading(STEPS[1], '기사, 통계, 지도에서 확인한 사실과 출처를 함께 남겨요.') +
    sources.map(sourceCard).join('') + '<button type="button" id="add-source" class="add-source">+ 근거 자료 카드 추가</button>';
}

function thinkingEditor() {
  return heading(STEPS[2], '확인한 사실에서 출발해 내 입장과 해결책을 적어요.') +
    [['팩트 체크', ['current']], ['비교 및 분석', ['comparison', 'interpretation']],
      ['나의 입장', ['valueJudgment']], ['최종 제안', ['proposal']]]
      .map(([title, keys]) => `<section class="worksheet-section thought"><h2>${title}</h2>${keys.map(prompt).join('')}</section>`).join('');
}

function checklist() {
  return `<fieldset class="checklist"><legend>인쇄 전 확인할 내용</legend>${CHECKLIST.map((label, i) =>
    `<label><input type="checkbox" data-check="${i}" ${work().worksheetChecks?.[i] ? 'checked' : ''}> <span>${label}</span></label>`).join('')}</fieldset>`;
}

function finalEditor() {
  return heading(STEPS[3], '포스터 미리보기를 살펴보고 빠진 내용이 있으면 해당 단계에서 고쳐요.') +
    prompt('posterTitle') + checklist() +
    '<p class="print-note">인쇄 창에서 프린터를 고르거나 PDF로 저장할 수 있어요. 작성한 내용이 길면 여러 장으로 이어져요.</p>';
}

function renderProgress() {
  const { answers: a, sources } = work();
  const completed = [
    [a.number, a.name, a.team, a.topic, a.inquiry].every(filled),
    sources.some(hasSource) && sources.filter(hasSource).every(s => filled(s.url || s.author) && filled(sourceFact(s))),
    [a.current, a.comparison, a.interpretation, a.valueJudgment, proposal(a)].every(filled),
    CHECKLIST.every((_, i) => work().worksheetChecks?.[i])
  ];
  $('#steps').innerHTML = STEPS.map((title, i) =>
    `<li><button type="button" data-stage="${i}" ${stage() === i ? 'aria-current="step"' : ''}>
      <span class="step-number" aria-hidden="true">${completed[i] ? '✓' : i + 1}</span><span>${title}</span>
      ${completed[i] ? '<span class="sr-only"> 완료</span>' : ''}
    </button></li>`
  ).join('');
}

function renderPoster() {
  const { answers: a, sources, attachments = [] } = work();
  const author = [a.classroom, a.number, a.name, a.team].filter(filled).join('  /  ');
  const blocks = [
    ['확인한 사실', a.current], ['비교 및 분석', [a.comparison, a.interpretation, a.cause, a.impact].filter(filled).join('\n')],
    ['나의 입장', [a.valueCriterion, a.valueJudgment].filter(filled).join('\n')],
    ['최종 제안', proposal(a) || a.conclusion]
  ];
  const evidence = sources.filter(hasSource);
  $('#poster').innerHTML = `<article class="paper">
    <header class="paper-header"><span class="paper-label">통합사회2 탐구 포스터</span>
      <h2>${esc(a.posterTitle || a.topic || '나의 탐구 주제')}</h2>
      <p class="paper-author">${esc(author || '학번 / 이름 / 모둠')}</p>
    </header>
    <section class="paper-question"><h3>내가 던진 질문</h3><p>${esc(a.inquiry || '탐구 질문을 적으면 여기에 보여요.')}</p></section>
    <section class="paper-evidence"><h3>근거 자료</h3>
      ${evidence.length || attachments.length ? `<div class="evidence-grid">${evidence.map((source, i) =>
        `<figure><figcaption><strong>${i + 1}. ${esc(source.title || '근거 자료')}</strong></figcaption>
        ${source._photo ? `<img src="${source._photo}" alt="${esc(source.photoCaption || source.title || '첨부한 근거 이미지')}">` : ''}
        ${source._photo && source.photoCaption ? `<small>${esc(source.photoCaption)}</small>` : ''}
        ${sourceFact(source) ? `<p>${esc(sourceFact(source))}</p>` : ''}
        <small>${esc([source.author, source.date, source.url].filter(filled).join(' / ') || '출처를 적어 주세요.')}</small></figure>`).join('')}
        ${attachments.map(photo => `<figure><img src="${esc(photo.dataUrl)}" alt="${esc(photo.caption || '이전에 첨부한 이미지')}"><figcaption>${esc(photo.caption)} <small>${esc([photo.credit, photo.source].filter(filled).join(' / '))}</small></figcaption></figure>`).join('')}</div>`
        : '<p class="paper-empty">모은 자료와 이미지가 여기에 들어가요.</p>'}
    </section>
    <div class="paper-analysis">${blocks.map(([title, value]) =>
      `<section><h3>${title}</h3><p${filled(value) ? '' : ' class="paper-empty"'}>${esc(value || '작성할 내용')}</p></section>`).join('')}</div>
  </article>`;
}

function render(focus = false) {
  const index = stage();
  $('#editor').innerHTML = [problemEditor, evidenceEditor, thinkingEditor, finalEditor][index]();
  $('#actions').innerHTML =
    (index ? '<button type="button" data-back>← 이전 단계</button>' : '') +
    (index < 3 ? `<button type="button" class="primary" data-next>다음 단계: ${STEPS[index + 1]} →</button>`
      : '<button type="button" id="print" class="primary">PDF로 저장 / 인쇄하기</button>');
  renderProgress();
  renderPoster();
  if (focus) $('#step-title').focus();
}

function move(index) {
  if (index === stage()) {
    if (previewButton.getAttribute('aria-expanded') === 'true') {
      showMobilePreview(false);
      $('#step-title').focus();
    }
    return;
  }
  change(patchTask({ worksheetStep: index }));
  showMobilePreview(false);
  notice('#message', '');
  render(true);
}

function switchTask(task) {
  if (!Object.hasOwn(TASKS, task) || task === activeTask()) return;
  const candidate = { ...data, inquiry: { version: 1, active: task } };
  if (task === 'economy' && !candidate.economy) {
    const { number = '', name = '', team = '' } = work().answers;
    candidate.economy = { ...blank(), answers: { number, name, team } };
  }
  change(candidate);
  notice('#message', '');
  render(true);
}

function editAnswer(key, value) {
  change(patchTask({ answers: { ...work().answers, [key]: value } }));
}

function editSource(i, updates) {
  const sources = work().sources.map((source, index) => index === i ? { ...source, ...updates } : source);
  return patchTask({ sources });
}

function removeSource(index) {
  const removed = work().sources[index];
  if (hasSource(removed) && !confirm(`근거 자료 ${index + 1}의 글과 이미지를 지울까요?`)) return;
  const sources = work().sources.filter((_, i) => i !== index);
  // Older bookmarks index cards by position. Fall back to the saved worksheet step.
  const patch = { sources: sources.length ? sources : [{}] };
  if (work().position?.group === 1) deletePosition(patch);
  else change(patchTask(patch));
  render();
  ($('#card-' + Math.min(index, sources.length - 1)) || $('#add-source')).focus();
}

function deletePosition(patch) {
  const candidate = patchTask(patch);
  delete (candidate.inquiry?.active === 'economy' ? candidate.economy : candidate).position;
  change(candidate);
}

async function attachPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  if (photoBusy) {
    notice('#message', '앞에서 고른 이미지를 처리하고 있어요. 잠시 후 다시 골라 주세요.');
    return;
  }
  const index = Number(input.dataset.photo);
  const task = activeTask();
  const sourcesAtStart = work().sources;
  photoBusy = true;
  try {
    const dataUrl = await convertStudentPhoto(file);
    if (activeTask() !== task || work().sources !== sourcesAtStart) {
      throw new Error('자료가 바뀌었어요. 이미지를 다시 골라 주세요.');
    }
    const candidate = editSource(index, { _photo: dataUrl });
    if (!valid(candidate)) throw new Error('이 과제에는 이미지를 최대 4장까지 넣을 수 있어요.');
    if (!change(candidate, true)) throw new Error('이미지를 저장하지 못했어요. 기기 저장 상태를 확인해 주세요.');
    if (stage() === 1) {
      render();
      $('#photo-' + index).focus();
    }
    notice('#message', '이미지를 첨부했어요.');
  } catch (error) {
    notice('#message', error.message);
  } finally {
    photoBusy = false;
  }
}

function showMobilePreview(open) {
  document.body.classList.toggle('show-preview', open && mobile.matches);
  previewButton.setAttribute('aria-expanded', String(open && mobile.matches));
  previewButton.textContent = open && mobile.matches ? '작성 화면으로 돌아가기' : '포스터 미리보기';
}

$('#steps').addEventListener('click', event => {
  const button = event.target.closest('[data-stage]');
  if (button) move(Number(button.dataset.stage));
});
$('#actions').addEventListener('click', event => {
  if (event.target.matches('[data-back]')) move(stage() - 1);
  if (event.target.matches('[data-next]')) move(stage() + 1);
  if (event.target.id === 'print') printPoster();
});
$('#editor').addEventListener('input', event => {
  const field = event.target;
  const { key, source } = field.dataset;
  if (!key) return;
  if (source !== undefined) change(editSource(Number(source), { [key]: field.value }));
  else editAnswer(key, field.value);
  const count = $('#' + field.id + '-count');
  if (count) count.textContent = `${[...field.value].length}자`;
  if (key === 'topic') {
    const i = topicOptions().indexOf(field.value);
    $('#topic-picker').value = i >= 0 ? String(i) : 'custom';
    $('#case-guide').innerHTML = caseGuide(field.value);
  }
});
$('#editor').addEventListener('change', event => {
  const field = event.target;
  if (field.id === 'task') switchTask(field.value);
  if (field.id === 'topic-picker') {
    if (field.value === 'custom') {
      $('#custom-topic').hidden = false;
      $('#topic').focus();
      $('#topic').select();
    } else if (field.value !== '') {
      const title = topicOptions()[Number(field.value)];
      $('#custom-topic').hidden = true;
      $('#topic').value = title;
      editAnswer('topic', title);
      $('#case-guide').innerHTML = caseGuide(title);
    } else {
      $('#custom-topic').hidden = true;
      $('#topic').value = '';
      editAnswer('topic', '');
      $('#case-guide').innerHTML = '';
    }
  }
  if (field.dataset.photo !== undefined) attachPhoto(field);
  if (field.dataset.check !== undefined) {
    const worksheetChecks = CHECKLIST.map((_, i) => i === Number(field.dataset.check) ? field.checked : Boolean(work().worksheetChecks?.[i]));
    change(patchTask({ worksheetChecks }));
  }
});
$('#editor').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.id === 'start') {
    (filled(work().answers.topic) ? $('#inquiry') : $('#topic-picker')).focus();
  }
  if (button.id === 'add-source') {
    const index = work().sources.length;
    change(patchTask({ sources: [...work().sources, {}] }));
    render();
    $('#source-' + index + '-title').focus();
  }
  if (button.dataset.delete !== undefined) removeSource(Number(button.dataset.delete));
  if (button.dataset.removePhoto !== undefined) {
    const index = Number(button.dataset.removePhoto);
    const sources = work().sources.map((source, i) => {
      if (i !== index) return source;
      const { _photo, photoCaption, ...rest } = source;
      return rest;
    });
    change(patchTask({ sources }));
    render();
    $('#photo-' + index).focus();
  }
});

previewButton.addEventListener('click', () => {
  const open = previewButton.getAttribute('aria-expanded') !== 'true';
  showMobilePreview(open);
  if (open) $('#preview-title').focus();
  else $('#step-title').focus();
});
mobile.addEventListener('change', () => showMobilePreview(false));

async function printPoster() {
  if (printBusy) return;
  printBusy = true;
  $('#print').disabled = true;
  notice('#message', '');
  try {
    const snapshot = revision;
    await Promise.all([...$('#poster').querySelectorAll('img')].map(img => img.decode()));
    if (snapshot !== revision) throw new Error('작성 내용이 바뀌었어요. 인쇄 버튼을 다시 눌러 주세요.');
    window.print();
  } catch {
    notice('#message', '인쇄를 준비하지 못했어요. 포스터의 이미지와 내용을 확인한 뒤 다시 눌러 주세요.');
  } finally {
    printBusy = false;
    if ($('#print')) $('#print').disabled = false;
  }
}

$('#open-files').onclick = () => {
  notice('#file-status', '');
  fileDialog.showModal();
};
$('#open-help').onclick = () => $('#help-dialog').showModal();
$('#backup').onclick = () => {
  const bytes = downloadJSON({ ...data, exportedAt: new Date().toISOString() }, '체크한장-보관.json');
  notice('#file-status', bytes > BACKUP_LIMIT_BYTES
    ? '전체 파일을 내려받았어요. 5MB를 넘는 파일은 여기에서 다시 열 수 없어요.'
    : '내려받기 폴더에서 보관 파일을 확인해 주세요.');
};
$('#recover-raw').onclick = () => {
  if (originalRaw !== null) downloadJSON(originalRaw, '체크한장-원래기록.json');
};
$('#restore').onclick = () => $('#file').click();
$('#file').onchange = async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file || restoreBusy) return;
  restoreBusy = true;
  $('#restore').disabled = true;
  const snapshot = revision;
  try {
    if (file.size > BACKUP_LIMIT_BYTES) throw new Error('5MB 이하의 보관 파일만 불러올 수 있어요.');
    const imported = JSON.parse(await file.text());
    if (!valid(imported)) throw new Error('체크 한장에서 보관한 파일을 선택해 주세요.');
    for (const task of [imported, imported.economy].filter(Boolean)) {
      await validateRestoredPhotos([...(task.attachments || []), ...task.sources.filter(s => s._photo).map(s => ({ dataUrl: s._photo }))]);
    }
    if (snapshot !== revision) throw new Error('작성 내용이 바뀌었어요. 파일을 다시 선택해 주세요.');
    if (!confirm('지금 화면의 기록을 보관 파일의 내용으로 바꿀까요?')) return;
    if (!persist(imported, true)) throw new Error('기기에 저장하지 못했어요. 현재 기록을 유지했어요.');
    data = imported;
    originalRaw = JSON.stringify(imported);
    revision++;
    showMobilePreview(false);
    fileDialog.close();
    render(true);
    notice('#message', '보관한 파일을 불러왔어요.');
  } catch (error) {
    const message = error instanceof SyntaxError ? '파일을 읽을 수 없어요. 체크 한장에서 보관한 파일을 골라 주세요.' : error.message;
    notice(fileDialog.open ? '#file-status' : '#message', message);
  } finally {
    restoreBusy = false;
    $('#restore').disabled = false;
  }
};

$('#reset').onclick = () => {
  if (!confirm('이 브라우저의 두 과제 기록과 첨부 이미지를 모두 지울까요? 필요한 기록은 먼저 파일로 보관하세요.')) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    notice('#storage-warning', '기기에서 기록을 지우지 못했어요. 현재 기록을 유지했어요.');
    return;
  }
  data = blank();
  originalRaw = null;
  storageBlocked = memoryDirty = false;
  revision++;
  $('#recover-raw').hidden = true;
  $('#save-status').textContent = '이 기기에 자동 저장';
  notice('#storage-warning', '');
  notice('#message', '기록을 초기화했어요.');
  showMobilePreview(false);
  render(true);
};

window.addEventListener('beforeunload', event => {
  if (memoryDirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});

render();
