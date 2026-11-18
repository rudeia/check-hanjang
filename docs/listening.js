'use strict';
(() => {
  const activity = new URLSearchParams(location.search).get('task') === 'economy' ? 'economy' : 'human';
  const economy = activity === 'economy';
  // Keep the original human-rights store intact; never infer or move old notes.
  const KEY = economy ? 'check-hanjang-economy-reading-v1' : 'check-hanjang-listening-v1';
  const activityLabel = economy ? '경제 탐구 보고서' : '보이는 사회, 말하는 탐구 · 인권';
  const itemLabel = economy ? '보고서' : '발표';
  const $ = id => document.getElementById(id);
  const fields = economy ? [
    ['problem', '01 어떤 경제 현상을 분석했나요?', '분석 대상 지역·기간과 생산, 소비, 고용, 가격 등의 변화를 정리해요.'],
    ['evidence', '02 어떤 자료로 비교했나요?', '자료의 출처·기간·단위를 확인하고, 비교한 수치와 차이를 적어요.'],
    ['explanation', '03 경제 개념으로 어떻게 설명했나요?', '보고서에 사용한 경제 개념과 변화의 원리를 연결해 정리해요. 확인된 사실과 원인에 대한 해석을 구분해요.'],
    ['solution', '04 어떤 방안을 제안했나요?', '누가 실행하는 방안인지, 예상되는 경제적 효과와 부담은 무엇인지 정리해요. 보고서에 없는 내용은 제시하지 않음으로 적어요.'],
    ['learning', '05 새롭게 이해한 경제 원리는 무엇인가요?', '보고서를 읽기 전후에 달라진 생각이나 다른 사례에 적용할 수 있는 점을 적어요.'],
    ['question', '06 더 확인할 자료나 질문이 있나요? (선택)', '설명을 확인하려면 어떤 자료가 더 필요한지, 함께 탐구할 질문을 적어요.']
  ] : [
    ['problem', '01 어떤 문제나 변화를 다뤘나요?', '발표자가 주목한 문제·변화와 영향을 받는 사람이나 지역을 적어요.'],
    ['evidence', '02 어떤 자료가 근거였나요?', '기억에 남는 수치·사례와 자료의 출처를 함께 적어요. 확인하지 못한 내용은 그렇게 표시해요.'],
    ['explanation', '03 발표자는 어떻게 설명했나요?', '문제의 원인이나 변화의 과정을 내 말로 연결해 정리해요.'],
    ['solution', '04 어떤 해결 방안을 제안했나요?', '누가 무엇을 어떻게 바꾸자는 제안인지 적어요. 발표에 없었다면 “제시하지 않음”으로 적어도 돼요.'],
    ['learning', '05 새롭게 알게 된 점은 무엇인가요?', '발표를 듣기 전과 비교해 새로 알게 된 점이나 달라진 생각을 적어요.'],
    ['question', '06 더 묻고 싶은 점이 있나요? (선택)', '이해가 안 된 부분이나 함께 생각해 보고 싶은 질문을 남겨요.']
  ];
  document.title = `${activityLabel} · 읽기 기록 · 체크 한장`;
  document.querySelector('[data-activity-title]').textContent = activityLabel;
  document.querySelector('[data-notes-title]').textContent = `친구의 ${itemLabel}, 내 말로 한 장`;
  document.querySelector('[data-notes-intro]').textContent = economy
    ? '친구의 경제 보고서를 읽고 현상·자료·경제 원리를 정리해요. 인권 발표 기록과 별도로 보관돼요.'
    : '친구의 인권 발표를 듣고 핵심 내용과 내 생각을 정리해요. 이전 발표 기록은 이 활동에 그대로 남아요.';
  const blank = () => ({version: 1, activity, listener: '', records: [], draft: null});
  let state = blank(), active = null, blocked = false, raw = '';
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validNote(n) {
    return n && typeof n.number === 'string' && n.number.trim() && n.number.length <= 30 &&
      ['topic', ...fields.map(f => f[0])].every(k => typeof n[k] === 'string' && n[k].length <= (k === 'topic' ? 200 : 6000));
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
    return {number: active, ...Object.fromEntries(['topic', ...fields.map(f => f[0])].map(k => [k, $(k).value]))};
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
    for (const key of ['topic', ...fields.map(f => f[0])]) $(key).value = note?.[key] || '';
    $('draft-status').textContent = note ? '기록 이어 쓰기' : '새 기록';
    list(); resizeFields(); $('topic').focus(); status(`${number} ${itemLabel}를 정리하고 있어요.`);
  }
  const hasContent = n => ['topic', ...fields.map(f => f[0])].some(k => n[k].trim());
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
    if (ok) status(`${active} ${itemLabel} 기록을 저장했어요. 다음 친구 학번을 입력하거나 목록에서 다른 기록을 열어 보세요.`);
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
  $('note-fields').innerHTML = fields.map(([key, title, hint]) => `<div class="field"><label for="${key}">${title}</label><p id="${key}-hint" class="field-hint">${hint}</p><textarea id="${key}" name="${key}" maxlength="6000" aria-describedby="${key}-hint" rows="3"></textarea></div>`).join('');
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
    if (!confirm(`${activityLabel}의 읽기 기록과 작성자 학번을 비울까요? 필요한 파일을 먼저 보관하세요. 다른 활동의 기록과 탐구 활동지는 그대로 유지됩니다.`)) return;
    try { localStorage.removeItem(KEY); } catch { status('기록을 비우지 못했어요. 브라우저 저장 설정을 확인해 주세요.'); return; }
    state = blank(); active = null; blocked = false; raw = ''; $('listener').value = ''; $('presenter').value = ''; $('note-form').reset(); $('note-form').hidden = true; $('editor-empty').hidden = false; $('notes-print').replaceChildren(); list(); status('이 활동의 읽기 기록을 비웠어요.');
  };
  function preparePrint() {
    if (blocked) return;
    if (active && hasContent(readForm())) { upsert(readForm()); state.draft = null; persist(); list(); }
    $('notes-print').innerHTML = `<header class="print-intro"><p>체크 한장 · ${activityLabel}</p><h1>친구의 ${itemLabel}, 내 말로 한 장</h1><p>작성자 학번: ${esc(state.listener || '미입력')} · ${itemLabel} ${state.records.length}건</p></header>` + state.records.map((n, i) => `<article class="printed-note"><header><p>${itemLabel} ${i+1} / ${state.records.length} · 친구 학번 ${esc(n.number)}</p><h2>${esc(n.topic || `제목 없는 ${itemLabel}`)}</h2></header>${fields.map(([k,title]) => `<section><h3>${title}</h3><p>${esc(n[k] || '작성하지 않음')}</p></section>`).join('')}</article>`).join('');
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
