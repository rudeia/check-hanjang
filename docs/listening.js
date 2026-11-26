'use strict';
(() => {
  const activity = new URLSearchParams(location.search).get('task') === 'economy' ? 'economy' : 'human';
  const economy = activity === 'economy';
  // Keep the original human-rights store intact; never infer or move old notes.
  const KEY = economy ? 'check-hanjang-economy-reading-v1' : 'check-hanjang-listening-v1';
  const activityLabel = economy ? '경제 탐구 보고서' : '보이는 탐구, 말하는 사회 · 인권';
  const itemLabel = economy ? '보고서' : '발표';
  const $ = id => document.getElementById(id);
  const notesTitle = economy ? '경제 탐구 공유 기록하기' : '친구의 발표, 내 말로 한 장';
  const fields = economy ? [
    ['evidence', '01 어느 부분을 보고 의견을 쓰나요?', '친구 보고서에서 살펴본 수치, 설명 또는 제안을 한 가지 짚어 주세요.'],
    ['learning', '02 새로 알게 된 점은 무엇인가요?', '그 부분을 읽고 새롭게 이해한 경제 현상이나 생각이 달라진 점을 적어요.'],
    ['opinion', '03 나는 어떻게 생각하나요?', '어떤 점에 동의하는지, 또는 다르게 생각하는지 이유를 쓰세요. 자료나 보고서의 내용을 근거로 들어 보세요.'],
    ['question', '04 친구에게 남길 질문이나 제안은 무엇인가요? (선택)', '설명이 더 필요한 점, 같이 확인해 볼 자료, 보완하면 좋을 점 중 하나를 남겨요.'],
    ['collaboration', '05 함께 이야기하며 내가 한 일은 무엇인가요? (선택)', '발표나 토의를 함께했다면 내가 한 일과 다른 의견을 듣거나 상대를 배려한 행동을 기록해요. 아직 대화하지 않았다면 비워 두세요.']
  ] : [
    ['problem', '01 어떤 문제나 변화를 다뤘나요?', '발표자가 주목한 문제·변화와 영향을 받는 사람이나 지역을 적어요.'],
    ['evidence', '02 어떤 자료가 근거였나요?', '기억에 남는 수치·사례와 자료의 출처를 함께 적어요. 확인하지 못한 내용은 그렇게 표시해요.'],
    ['explanation', '03 발표자는 어떻게 설명했나요?', '문제의 원인이나 변화의 과정을 내 말로 연결해 정리해요.'],
    ['solution', '04 어떤 해결 방안을 제안했나요?', '누가 무엇을 어떻게 바꾸자는 제안인지 적어요. 발표에 없었다면 “제시하지 않음”으로 적어도 돼요.'],
    ['learning', '05 새롭게 알게 된 점은 무엇인가요?', '발표를 듣기 전과 비교해 새로 알게 된 점이나 달라진 생각을 적어요.'],
    ['question', '06 더 묻고 싶은 점이 있나요? (선택)', '이해가 안 된 부분이나 함께 생각해 보고 싶은 질문을 남겨요.']
  ];
  const legacyFields = economy ? [
    ['problem','이전에 쓴 경제 현상',''],['explanation','이전에 쓴 경제 개념 설명',''],['solution','이전에 쓴 제안 정리','']
  ] : [];
  const allFields = [...fields,...legacyFields];
  const fieldKeys = ['topic',...allFields.map(f=>f[0])];
  const optKeys = new Set(['opinion','collaboration',...legacyFields.map(f=>f[0])]);
  const completeFeedback = n => !economy || Boolean(n.evidence?.trim() && n.learning?.trim() && n.opinion?.trim());
  document.title = `${activityLabel} · 공유 기록 · 체크 한장`;
  document.querySelector('[data-activity-title]').textContent = activityLabel;
  document.querySelector('[data-notes-title]').textContent = notesTitle;
  document.querySelector('[data-notes-intro]').textContent = economy
    ? '친구의 경제 보고서를 읽고, 새로 알게 된 점과 내 생각을 근거와 함께 남겨요. 함께 이야기를 나눴다면 그 과정도 기록해요.'
    : '친구의 인권 발표를 듣고 핵심 내용과 내 생각을 정리해요. 기존 발표 기록은 옮기거나 바꾸지 않고 이곳에 보관해요.';
  const blank = () => ({version: 1, activity, listener: '', records: [], draft: null});
  let state = blank(), active = null, blocked = false, raw = '';
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validNote(n) {
    return n && typeof n.number === 'string' && n.number.trim() && n.number.length <= 30 &&
      fieldKeys.every(k => (economy && optKeys.has(k) && n[k] === undefined) ||
        (typeof n[k] === 'string' && n[k].length <= (k === 'topic' ? 200 : 6000)));
  }
  function valid(s) {
    return s && s.version === 1 && (s.activity === activity || (s.activity === undefined && !economy)) && typeof s.listener === 'string' && s.listener.length <= 30 && Array.isArray(s.records) && s.records.length <= 500 &&
      s.records.every(validNote) && new Set(s.records.map(n => n.number)).size === s.records.length && (!s.draft || validNote(s.draft));
  }
  function status(text) { $('feedback-status').textContent = text; }
  try {
    raw = localStorage.getItem(KEY) || '';
    if (raw) { const parsed = JSON.parse(raw); if (!valid(parsed)) throw Error('invalid'); state = parsed; }
  } catch { blocked = true; status('저장된 기록을 읽을 수 없어요. 원래 기록은 덮어쓰지 않습니다. “기록 파일 보관”으로 먼저 보관한 뒤 기록 비우기를 선택해 주세요.'); }
  function persist() {
    if (blocked) return false;
    try {
      const current = localStorage.getItem(KEY) || '';
      if (current !== raw) { status('다른 창에서 이 활동의 기록이 바뀌었어요. 현재 내용을 파일로 보관한 뒤 새로고침해 주세요. 다른 창의 기록은 덮어쓰지 않았어요.'); return false; }
      const serialized = JSON.stringify({...state, activity});
      localStorage.setItem(KEY, serialized); raw = serialized; return true;
    }
    catch { status('기기 저장 공간이나 브라우저 설정 때문에 저장하지 못했어요. 이 창을 닫기 전에 기록 파일 또는 PDF로 보관하세요.'); return false; }
  }
  function readForm() {
    return {number: active, ...Object.fromEntries(fieldKeys.map(k => [k, $(k).value]))};
  }
  function saveDraft() { if (active) { state.draft = readForm(); return persist(); } return true; }
  function list() {
    $('record-count').textContent = state.records.length;
    $('empty-list').hidden = state.records.length > 0;
    $('record-list').innerHTML = state.records.map((n, i) => `<li><button type="button" data-open="${i}" ${n.number === active ? 'aria-current="true"' : ''}><strong>${esc(n.number)}</strong><span>${esc(n.topic || `제목 없는 ${itemLabel}`)}</span></button></li>`).join('');
    document.querySelectorAll('[data-export-pdf]').forEach(button => { button.disabled = !state.records.length && !active; });
  }
  function openNote(number) {
    if (blocked) { status('원래 저장 기록을 먼저 보관해 주세요. 덮어쓰기를 막기 위해 새 작성을 잠시 막았습니다.'); return; }
    if (!state.records.some(n => n.number === number) && state.records.length >= 500) { status('한 기록 파일에 최대 500개 탐구를 보관할 수 있어요. 기존 기록을 파일로 보관한 뒤 새로 시작해 주세요.'); return; }
    saveDraft();
    if (active && state.draft && state.draft.number !== number) {
      if (hasContent(state.draft)) { upsert(state.draft); state.draft = null; persist(); }
    }
    const note = state.draft?.number === number ? state.draft : state.records.find(n => n.number === number);
    active = number;
    $('presenter').value = number;
    $('active-number').textContent = number; $('edit-presenter').value = number;
    $('editor-empty').hidden = true; $('note-form').hidden = false;
    for (const key of fieldKeys) $(key).value = note?.[key] || '';
    if (economy) $('legacy-note-fields').hidden = !legacyFields.some(([key])=>note?.[key]?.trim());
    $('draft-status').textContent = note ? '기록 이어 쓰기' : '새 기록';
    list(); resizeFields(); $('topic').focus(); status(`${number} ${itemLabel}를 정리하고 있어요.`);
  }
  const hasContent = n => fieldKeys.some(k => n[k]?.trim());
  function upsert(n) {
    const i = state.records.findIndex(x => x.number === n.number);
    if (i >= 0) state.records[i] = n; else state.records.push(n);
  }
  function save() {
    if (!active || blocked) return false;
    const note = readForm();
    if (!hasContent(note)) { status('읽은 내용이나 주제를 한 가지 이상 적어 주세요.'); $('topic').focus(); return false; }
    upsert(note); state.draft = null;
    const ok = persist(); list();
    $('draft-status').textContent = ok ? '이 기기에 저장됨' : '기기 저장 실패';
    if (ok && !completeFeedback(note)) status('초안으로 저장했어요. 읽은 부분, 새로 알게 된 점, 내 생각을 모두 쓰면 피드백이 완성돼요.');
    else if (ok) status(`${active} ${itemLabel} 기록을 저장했어요. 다음 친구 학번을 입력하거나 목록에서 다른 기록을 열어 보세요.`);
    return ok;
  }
  function resizeFields() {
    document.querySelectorAll('#note-form textarea').forEach(el => {
      el.style.height = 'auto';
      el.style.height = Math.min(420, el.scrollHeight + 2) + 'px';
    });
  }
  $('rename-presenter').onclick = () => {
    if (!active || blocked) return;
    const number = $('edit-presenter').value.trim();
    if (!number) { status('변경할 학번을 입력해 주세요.'); $('edit-presenter').focus(); return; }
    if (number === active) { status('현재 학번과 같아요.'); return; }
    if (state.records.some(n => n.number === number)) {
      status(`${number} 학번의 기록이 이미 있어요. 두 기록을 보호하기 위해 변경하지 않았어요. 다른 학번을 입력해 주세요.`);
      $('edit-presenter').focus(); return;
    }
    const oldState = state, oldNumber = active;
    const note = {...readForm(), number};
    const records = state.records.map(n => n.number === oldNumber ? {...note} : n);
    state = {...state, records, draft: note};
    if (!persist()) { state = oldState; return; }
    active = number; $('presenter').value = number; $('active-number').textContent = number;
    list(); $('draft-status').textContent = '학번 변경됨';
    status(`${oldNumber} → ${number}(으)로 학번을 바꿨어요. 작성 내용은 그대로 보관했어요.`);
  };
  window.addEventListener('resize', resizeFields);
  const renderFields = list => list.map(([key, title, hint]) =>
    `<div class="field"><label for="${key}">${title}</label>${hint ? `<p id="${key}-hint" class="field-hint">${hint}</p>` : ''}
    <textarea id="${key}" name="${key}" maxlength="6000"${hint ? ` aria-describedby="${key}-hint"` : ''} rows="3"></textarea></div>`).join('');
  $('note-fields').innerHTML = renderFields(fields) +
    (economy ? `<details id="legacy-note-fields" class="supplement" hidden><summary>이전에 쓴 보고서 정리</summary>${renderFields(legacyFields)}</details>` : '');
  if (economy) {
    document.querySelector('#open-note button').textContent = '피드백 작성하기';
    document.querySelector('#editor-empty .step-kicker').textContent = '01 보고서 읽기 → 02 피드백 쓰기 → 03 모아 저장';
    document.querySelector('#note-form .note-title-row .step-kicker').textContent = '친구 보고서 읽고 피드백 남기기';
    document.querySelector('#note-form button[type="submit"]').textContent = '피드백 저장하기';
    $('next-note').textContent = '다음 보고서 읽기';
  }

  $('listener').value = state.listener;
  $('listener').addEventListener('input', () => { if (!blocked) { state.listener = $('listener').value; persist(); } });
  $('open-note').addEventListener('submit', e => { e.preventDefault(); const n = $('presenter').value.trim(); if (n) openNote(n); });
  $('record-list').addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openNote(state.records[Number(b.dataset.open)].number); });
  $('note-form').addEventListener('input', e => { if (e.target.id === 'edit-presenter') return; resizeFields(); $('draft-status').textContent = saveDraft() ? '임시 저장됨' : '기기 저장 실패'; });
  $('note-form').addEventListener('submit', e => { e.preventDefault(); save(); });
  $('next-note').addEventListener('click', () => {
    if (!save()) return;
    active = null; $('note-form').hidden = true; $('editor-empty').hidden = false; $('presenter').value = ''; list(); $('presenter').focus();
  });
  function download(content, name) {
    const url = URL.createObjectURL(new Blob([content], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  $('backup-notes').onclick = () => { if (!blocked) saveDraft(); download(blocked ? raw : JSON.stringify({...state, activity}, null, 2), `체크한장-${activity}-기록.json`); };
  $('restore-notes').onclick = () => $('notes-file').click();
  $('notes-file').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      if (f.size > 20 * 1024 * 1024) throw Error('size');
      const incoming = JSON.parse(await f.text());
      if (incoming.activity !== activity && !(incoming.activity === undefined && !economy)) {
        status('다른 활동의 기록 파일이에요. 해당 활동에서 불러와 주세요. 활동 구분이 없는 이전 파일은 인권 활동에서만 불러올 수 있어요.'); return;
      }
      if (!valid(incoming)) throw Error('format');
      if (!confirm(`${activityLabel}의 현재 기록을 불러온 파일로 바꿀까요? 필요한 기록은 먼저 보관하세요. 다른 활동의 기록과 탐구 활동지는 바뀌지 않습니다.`)) return;
      const previous = state, wasBlocked = blocked;
      state = incoming; blocked = false;
      if (!persist()) { state = previous; blocked = wasBlocked; return; }
      active = null; $('listener').value = state.listener;
      $('note-form').hidden = true; $('editor-empty').hidden = false; list();
      if (state.draft) openNote(state.draft.number); else status('이 활동의 기록을 불러왔어요.');
    } catch { status('현재 활동의 체크 한장 기록 파일인지 확인해 주세요. 기존 기록은 유지됩니다.'); }
  };
  $('clear-notes').onclick = () => {
    if (!confirm(`${activityLabel}의 공유 기록과 작성자 학번을 비울까요? 필요한 파일을 먼저 보관하세요. 다른 활동의 기록과 탐구 활동지는 그대로 유지됩니다.`)) return;
    try { localStorage.removeItem(KEY); } catch { status('기록을 비우지 못했어요. 브라우저 저장 설정을 확인해 주세요.'); return; }
    state = blank(); active = null; blocked = false; raw = ''; $('listener').value = ''; $('presenter').value = ''; $('note-form').reset(); $('note-form').hidden = true; $('editor-empty').hidden = false; $('notes-print').replaceChildren(); list(); status('이 활동의 공유 기록을 비웠어요.');
  };
  function preparePrint() {
    if (blocked) return;
    if (active && hasContent(readForm())) { upsert(readForm()); state.draft = null; persist(); list(); }
    $('notes-print').innerHTML = `<header class="print-intro"><p>체크 한장 · ${activityLabel}</p><h1>${notesTitle}</h1><p>작성자 학번: ${esc(state.listener || '미입력')} · ${itemLabel} ${state.records.length}건</p></header>` + state.records.map((n, i) => `<article class="printed-note"><header><p>${itemLabel} ${i+1} / ${state.records.length} · 친구 학번 ${esc(n.number)}${completeFeedback(n) ? '' : ' · 초안'}</p><h2>${esc(n.topic || `제목 없는 ${itemLabel}`)}</h2></header>${allFields.filter(([k])=>!economy || n[k]?.trim() || ['evidence','learning','opinion'].includes(k)).map(([k,title]) => `<section><h3>${title}</h3><p>${esc(n[k] || '작성하지 않음')}</p></section>`).join('')}</article>`).join('');
  }
  function exportAll() {
    preparePrint();
    if (!state.records.length) { status('읽은 내용을 저장한 뒤 PDF로 모을 수 있어요.'); return; }
    status('인쇄창에서 대상을 “PDF로 저장”으로 선택하세요. 이 활동의 모든 기록이 하나의 PDF에 들어갑니다.');
    window.print();
  }
  document.querySelectorAll('[data-export-pdf]').forEach(button => { button.onclick = exportAll; });
  window.addEventListener('beforeprint', preparePrint);
  list();
  if (!blocked && state.draft) { const n = state.draft.number; openNote(n); status(`${n} ${itemLabel}의 임시 기록을 복원했어요.`); }
})();
