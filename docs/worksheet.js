'use strict';

const STEPS = ['문제 찾기', '근거 자료 모으기', '내 생각 정리하기', '포스터 완성 및 인쇄'];
const TASKS = { human: '보이는 탐구, 말하는 사회 · 인권과 불평등', economy: '경제 탐구 보고서 · 자료와 개념으로 경제 읽기' };
const taskSteps = () => activeTask() === 'economy' ? ECONOMY_STEPS : STEPS;

const productName = () => activeTask() === 'economy' ? '보고서' : '포스터';
const CHECKLIST = [
  '조사할 문제를 구체적인 질문으로 적었어요.',
  '자료에서 확인한 사실과 출처를 적었어요.',
  '자료를 비교하고 내 입장과 해결책을 적었어요.',
  '포스터에 나온 이름, 출처, 사진을 확인했어요.'
];
const REHEARSAL = [
  '시작(문제) - 본론(자료) - 끝(해결책) 순서로 이야기가 자연스럽게 이어지나요?',
  '친구들이 듣기 편한 목소리 크기와 속도로, 쉬운 단어를 써서 설명할 수 있나요?',
  '발표할 때 화면만 보지 않고 친구들과 눈을 맞추며 이야기할 준비가 되었나요?',
  '친구들이 질문했을 때 내가 조사한 자료를 근거로 답할 수 있나요?'
];
const taskRehearsal = () => activeTask() === 'economy' ? [
  '경제 탐구 질문 → 비교 자료 → 경제 개념을 적용한 설명 → 결론과 시사점이 연결되나요?',
  '자료의 기간·지역·단위와 수치를 정확히 설명할 수 있나요?',
  guidedCaseAnalysis(economyGuided()) ? '같은 기준으로 두 상황을 비교하고 판단 이유를 설명할 수 있나요?' :
    guidedPhenomenon(economyGuided()) ? '현상이 달라진 이유와 경제 주체에 미칠 영향을 자료로 설명할 수 있나요?' :
    '제안의 기대 효과와 비용·부담을 자료에 근거해 설명할 수 있나요?',
  '친구의 질문에 답할 때 자료로 확인한 내용과 더 확인할 내용을 구분할 수 있나요?'
] : REHEARSAL;
const SOURCE_GOAL = 3;
const SOURCE_TYPES = ['통계·그래프', '뉴스 기사', '보고서·책', '직접 찍은 사진·인터뷰'];
const SOURCE_SCALES = ['우리 동네(지역)', '우리나라', '세계 여러 나라'];
const OLD_TYPES = new Map([['보고서·논문', '보고서·책'], ['교과서·도서', '보고서·책'], ['직접 촬영·조사', '직접 찍은 사진·인터뷰']]);
const OLD_SCALES = new Map([['우리 지역', '우리 동네(지역)'], ['국내(국가)', '우리나라'], ['해외·세계', '세계 여러 나라']]);
const sourceType = source => OLD_TYPES.get(source.type) ?? source.type;
const sourceScale = source => OLD_SCALES.get(source.scale) ?? source.scale;

const PROMPTS = {
  reason: ['주제를 고른 이유', '이 주제를 조사하고 싶었던 이유를 적어요.'],
  inquiry: ['어디에서, 누구에게, 어떤 문제가 생기고 있나요?', '예: 우리 동네와 옆 동네는 노인복지관을 이용하기 얼마나 편할까?'],
  current: ['지금 무슨 일이 일어나고 있나요?', '예: 우리 동네는 고령화율이 25%인데 노인복지관이 1곳뿐이다.', '어디에서, 누구에게 어떤 불평등이나 인권 문제가 생겼나요?'],
  cause: ['왜 이런 일이 생겼나요?', '예: 마을이 흩어져 있고 외곽에서 복지관까지 가는 버스가 적다.', '조사한 자료를 보고 이유를 적어 보세요.'],
  valueJudgment: ['무엇이 가장 중요할까요?', '예: 교통이 불편한 주민부터 도와야 복지관을 이용할 기회가 공평해진다.', '이 문제에서 누구의 어떤 권리를 지켜야 할까요? 자유, 안전, 공정함, 서로를 위한 배려 등에서 중요하다고 생각한 기준을 고르고 자료와 연결해 이유를 적어 보세요.'],
  policy: ['법·제도 바꾸기', '예: 구청이 복지관과 외곽 마을을 잇는 셔틀을 주 2회 운영한다.', '정부, 시청, 학교에서 어떤 규칙이나 제도를 만들면 좋을까요?'],
  action: ['우리가 직접 해보기', '예: 친구들과 버스 이용이 어려운 정류장을 조사해 주민 제안 게시판에 개선안을 올린다.', '나와 친구들이 일상에서 바로 할 수 있는 일은 무엇인가요?'],
  region: ['어느 지역을 조사했나요?', '예: 전남 순천시 원도심의 중앙시장 주변'],
  economicPeriod: ['언제와 언제, 무엇을 비교하나요?', '예: 2023년과 2024년의 관광객 수와 소매 판매액', '기간·지역·지표·단위를 확인하고 비교 기준을 적어요.'],
  economicImpact: ['각 경제 주체는 어떤 영향을 받나요?', '소비자·생산자·근로자·정부 중 이 변화와 관련된 주체를 골라 적어요.', '편익과 부담이 누구에게 생기는지 자료와 연결해 설명해요. 자료로 확인한 영향과 예상한 영향을 구분해요.'],
  economicConclusion: ['내 탐구 질문에 어떤 답을 얻었나요?', '내가 고른 근거와 적용한 경제 용어를 연결해 결론을 써요.', '자료로 판단할 수 있는 범위와 더 알아봐야 할 점도 적어요.'],
  practiceResult: ['실제로 해 본 일과 확인한 결과 (실행한 경우)', '실행한 날짜, 나의 행동, 확인한 결과를 적어요.', '아직 실행 전이면 비워 두거나 준비 상태를 적어요.'],
  economicChange: ['무엇이 달라졌나요?', '예: 주말 관광객이 늘면서 시장 주변에 음식점이 많아졌다.', '예전과 지금을 비교해 보세요.'],
  economicCause: ['왜 달라졌나요?', '예: 관광지와 시장을 잇는 버스가 생겨 방문하기 쉬워졌다.'],
  concepts: ['수업 시간에 배운 경제 원리로 설명한다면?', '예: 자가용과 버스의 요금·이동 시간·편리함을 비교해 관광객이 버스를 선택한 이유를 설명한다.', '합리적 선택, 시장실패, 금융 자산과 자산 관리, 분업과 무역, 지속가능발전 등에서 관련 개념을 골라 이 변화를 설명해 보세요.'],
  economicPlan: ['우리 지역에 어떤 아이디어가 도움이 될까요?', '예: 시장 상인회와 시청이 주민과 관광객이 함께 이용할 수 있는 공동 배송을 운영한다.'],
  practicePlan: ['내가 직접 할 수 있는 일은 무엇인가요?', '예: 다음 주에 모둠과 시장 이용 안내 지도를 만들어 상인회에 전달한다.'],
  role: ['함께하며 내가 한 역할과 배려', '예: 자료를 정리하는 역할을 맡았다. 의견이 갈렸을 때 친구의 이유를 먼저 듣고 함께 결정했다.', '내가 맡은 역할은 무엇이었고, 친구의 의견을 어떻게 존중하고 도왔나요?'],
  reflection: ['탐구를 마치고 느낀 점', '예: 조사 전에는 관광객이 늘면 모든 가게에 좋다고 생각했다. 다음에는 가게마다 어떤 차이가 있는지 알아보고 싶다.', '조사 전후로 생각이 어떻게 달라졌나요? 새롭게 알게 된 점이나 다음에 더 알아보고 싶은 점을 적어 보세요.'],
  peerLearning: ['친구에게 배운 점', '예: 2모둠은 그래프의 기간과 단위를 먼저 알려 줘서 비교하기 쉬웠다.', '함께 활동하거나 발표를 들은 친구 중 누가 인상 깊었나요? 그 친구에게 배운 점을 한 줄로 적어 보세요.'],
  proposal: ['이전에 작성한 제안', '예: 구청이 복지관과 외곽 마을을 잇는 셔틀을 운영한다.'],
  comparison: ['이전에 작성한 비교', '예: 옆 동네에는 복지관이 3곳이다.'],
  interpretation: ['이전에 작성한 해석', '예: 외곽 주민은 복지관을 이용하기 어렵다.'],
  posterTitle: ['포스터 제목을 정해 볼까요?', '예: 복지관으로 가는 길, 동네마다 얼마나 다를까?']
};

const RUBRIC = {
  human: { analysis: ['current', 'cause', 'valueJudgment'], solutions: ['policy', 'action'] },
  economy: { analysis: ['region', 'economicPeriod', 'economicChange', 'economicCause', 'concepts', 'economicImpact', 'economicConclusion'], solutions: ['economicPlan', 'practicePlan'] }
};
const REFLECTION_KEYS = ['role', 'reflection'];
const PRIOR_KEYS = ['comparison', 'interpretation', 'proposal'];

let data = blank();
let openIdeaId = '';
let originalRaw = null;
let storageBlocked = false;
let memoryDirty = false;
let revision = 0;
let photoBusy = false;
let restoreBusy = false;
let printBusy = false;
let economyView = 'write';
let economyTopicFilter = 'all';
const mobile = matchMedia('(max-width: 839px)');
const activeTask = () => data.inquiry?.active || 'human';
const work = () => activeTask() === 'economy' ? data.economy : data;
function stage() {
  const previous = work().worksheetStep ?? [0, 0, 1, 1, 2, 3, 3, 3, 3][work().step];
  if (activeTask() !== 'economy') return previous;
  return economySavedPhase(economyGuided(),work().answers,previous);
}
const filled = value => Boolean(value?.trim());
const sourceFact = source => source.fact ?? source.evidence ?? '';
const hasSource = source => Object.entries(source).some(([key, value]) => key !== '_id' && filled(value));
const sourceThought = source => source.thought ?? source.meaning ?? '';
const completeSource = source => [sourceType(source), sourceScale(source), sourceFact(source), sourceThought(source)].every(filled)
  && filled(source.url || source.author);
const rubric = () => RUBRIC[activeTask()];
const reflectionKeys = () => activeTask() === 'economy' ? ['practiceResult', ...REFLECTION_KEYS, 'peerLearning'] : REFLECTION_KEYS;
const answer = (key, a = work().answers) => a[key] ?? ({
  region: a.scope,
  economicChange: a.current,
  economicCause: a.cause,
  economicPlan: a.policy
})[key] ?? '';
const previewButton = $('#mobile-preview');
const previewPrint = $('#preview-print');
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
    const latestRaw = localStorage.getItem(KEY);
    if (latestRaw !== originalRaw) {
      const latest = latestRaw === null ? blank() : JSON.parse(latestRaw);
      const baseline = originalRaw === null ? blank() : JSON.parse(originalRaw);
      if (!valid(latest) || JSON.stringify(activityRecord(latest, activeTask())) !== JSON.stringify(activityRecord(baseline, activeTask()))) throw new Error('conflict');
      const merged = replaceActivity(latest, activityRecord(candidate, activeTask()), activeTask());
      Object.keys(candidate).forEach(key => delete candidate[key]);
      Object.assign(candidate, merged);
    }
    const encoded = JSON.stringify(candidate);
    localStorage.setItem(KEY, encoded);
    originalRaw = encoded;
    storageBlocked = false;
    memoryDirty = false;
    $('#save-status').textContent = '이 기기에 저장됨';
    notice('#storage-warning', '');
    $('#recover-raw').hidden = true;
    return true;
  } catch {
    $('#save-status').textContent = '자동 저장 실패';
    notice('#storage-warning', '기기에 저장하지 못했거나 다른 창에서 같은 활동이 바뀌었어요. 이 창의 기록을 파일로 보관한 뒤 새로고침해 주세요. 기존 저장 기록은 유지돼요.');
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

function countText(value, limit) {
  return `${[...value].length} / ${limit}자 권장`;
}

function input(key, label, example, value = '', options = {}) {
  const { area = false, source, limit = 120, hint } = options;
  const id = source === undefined ? key : `source-${source}-${key}`;
  const attributes = `id="${id}" data-key="${key}" ${source === undefined ? '' : `data-source="${source}"`} placeholder="${esc(example)}"
    data-limit="${limit}" aria-describedby="${hint ? `${id}-hint ` : ''}${id}-count"`;
  return `<div class="field"><label for="${id}">${label}</label>
    ${hint ? `<small class="field-hint" id="${id}-hint">${hint}</small>` : ''}
    ${area ? `<textarea ${attributes}>${esc(value)}</textarea>`
      : `<input type="text" ${attributes} value="${esc(value)}" autocomplete="off">`}
    <small class="character-count" id="${id}-count">${countText(value, limit)}</small></div>`;
}

function promptDefinition(key) {
  if (activeTask() !== 'economy') return PROMPTS[key];
  return ({
    inquiry: ['어떤 지역의 경제 변화를 왜 알아보려 하나요?', '지역·경제 현상·비교 기준을 담은 질문을 적어요.'],
    economicCause: ['경제 변화의 원인은 무엇인가요?', '변화를 설명하는 원인과 이를 뒷받침하는 자료를 연결해요.', '함께 변한 지표만으로 원인을 확정하지 않고, 다른 가능한 원인과 확인할 자료도 살펴요.'],
    economicPlan: ['지역사회에 어떤 대응 방안을 제안하나요?', '누가 무엇을 실행하면 좋을지 적어요.', '앞의 경제 분석을 근거로 기대 효과와 필요한 비용·부담을 비교해요.'],
    practicePlan: ['나는 어떤 일을 실천할 계획인가요?', '언제, 누구와, 무엇을 하고 결과를 어떻게 확인할지 적어요.'],
    economicConclusion: ['내 탐구 질문에 어떤 답을 얻었나요?', '첫 의견과 추가로 확인한 근거, 비교 결과를 연결해 결론을 적어요.', '처음 생각을 유지했는지, 바꿨다면 어떤 근거 때문인지 밝혀요.'],
    reflection: ['경제 탐구를 통해 생각이 어떻게 달라졌나요?', '탐구 과정에서 잘한 점과 보완할 점, 자료를 보고 달라진 생각을 적어요.']
  })[key] || PROMPTS[key];
}

function prompt(key) {
  const [label, example, hint] = promptDefinition(key);
  const area = !['posterTitle', 'region'].includes(key);
  const economics = activeTask() === 'economy';
  const examples = {
    economicChange: '지역 자료에서 비교한 두 시점의 값과 달라진 모습을 적어요.',
    economicCause: '원인이라고 생각한 점을 자료와 연결하고, 확인할 점도 적어요.',
    posterTitle: '예: 시장의 변화, 우리 동네의 선택',
    region: '예: 전남 목포시 원도심 상권'
  };
  const contextualExample = economics ? examples[key] : selectedIdea()?.examples?.[key];
  const fallbackExample = key === 'reflection' && !economics
    ? '예: 처음에는 시설 수만 살폈다. 조사 후에는 누가 실제로 이용하기 어려운지도 생각하게 됐다.' : example;
  return input(key, label, contextualExample || fallbackExample, answer(key), { area, hint, limit: area ? economyPromptLimit(key) : 50 });
}

function economyPromptLimit(key) {
  if (activeTask() !== 'economy') return 120;
  return ({economicConclusion:320,economicChange:250,economicCause:250,economicImpact:250,
    economicPlan:250,practicePlan:200,practiceResult:200,reflection:250,role:200,peerLearning:150})[key] || 120;
}

function heading(title, description) {
  const set = economyGuided();
  const context = activeTask() === 'economy' ? `<div class="guided-context">${set ? `<strong>${esc(guidedTopicLabel(set))}</strong>` : '<strong>직접 정한 주제</strong>'}<a href="#economy">주제 목록으로</a></div>` : '';
  return `${context}<div class="step-heading"><span class="step-kicker">Step ${stage() + 1} / ${taskSteps().length}</span><h1 id="step-title" tabindex="-1">${title}</h1>${description ? `<p>${description}</p>` : ''}</div>`;
}

function caseGuide(title) {
  const example = activeTask() === 'human' && INQUIRY_CASES.find(item => item.title === title);
  if (!example) return '';
  return `<details class="supplement"><summary>이 주제의 조사 방법과 자료 보기</summary><p>${esc(example.context)}</p><p>${esc(example.method)}</p><ul>${example.sources.map(source =>
    `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a><br>${esc(source.find)}</li>`
  ).join('')}</ul></details>`;
}

function selectedIdea() {
  if (economyGuided()) return undefined;
  return TOPIC_IDEAS[activeTask()].find(idea => idea.id === work().answers.ideaId);
}

function ideaExplorer() {
  const chosen = selectedIdea();
  const ideas = TOPIC_IDEAS[activeTask()];
  const open = ideas.find(idea => idea.id === openIdeaId) || chosen;
  return `<section class="idea-explorer" aria-labelledby="idea-title">
    <h3 id="idea-title">💡 어떤 주제를 할지 고민되나요?</h3>
    <p>내가 겪거나 주변에서 본 일과 닮은 장면을 골라 보세요.</p>
    <ul class="idea-cards">${ideas.map(idea => `<li>
      <button type="button" data-idea="${idea.id}" aria-pressed="${idea === open}" ${open ? 'aria-controls="idea-story"' : ''}>
        <span><span aria-hidden="true">${idea.icon}</span> ${esc(idea.label)}<small>${esc(idea.hook)}</small></span>
      </button></li>`).join('')}</ul>
    ${open ? `<article class="idea-story" id="idea-story" aria-labelledby="idea-story-title">
      <h4 id="idea-story-title" tabindex="-1">${esc(open.hook)}</h4>
      <p class="idea-story-label">이런 상황이라고 상상해 보세요</p>
      <p>${esc(open.scene)}</p>
      <p><strong>나라면 무엇이 궁금할까요?</strong> ${esc(open.starter)}</p>
      ${open !== chosen ? `<button type="button" class="primary" data-use-idea="${open.id}">이 사례로 주제와 질문 바꾸기</button>`
        : '<button type="button" id="edit-idea-topic">내 탐구 주제 고치기</button>'}
    </article>` : ''}
  </section>`;
}

function ideaHints() {
  const idea = selectedIdea();
  if (!idea) return '';
  return `<aside class="idea-hints" aria-labelledby="hint-title">
    <h3 id="hint-title">🔍 추천 검색 키워드 &amp; 찾아볼 자료 힌트</h3>
    <p>${esc(idea.label)}</p>
    ${idea.concepts ? `<p><strong>수업 시간에 배운 개념</strong> ${esc(idea.concepts)}</p>` : ''}
    <ol>${idea.hints.map(hint => `<li>${esc(hint)}</li>`).join('')}</ol>
  </aside>`;
}

function applyIdea(id, replace = false) {
  const idea = TOPIC_IDEAS[activeTask()].find(item => item.id === id);
  if (!idea) return;
  openIdeaId = id;
  const answers = work().answers;
  const replacesDraft = (filled(answers.topic) && answers.topic !== idea.title)
    || (filled(answers.inquiry) && answers.inquiry !== idea.question);
  if (answers.ideaId !== id && (replace || !replacesDraft)) {
    change(patchTask({ answers: { ...answers, ideaId: id, guidedSetId: '', economyPackId: '', topic: idea.title, inquiry: idea.question } }));
  }
  render();
  $('#idea-story-title').focus();
}

function problemEditor() {
  const a = work().answers;
  const identifiers = `<div class="field-grid student-fields">
      ${input('number', '학번', '예: 20513', a.number, { limit: 10 })}
      ${input('name', '이름', '예: 김하늘', a.name, { limit: 10 })}
      ${input('team', '모둠', '예: 3모둠', a.team, { limit: 20 })}
    </div>`;
  return heading(taskSteps()[0], '내 정보를 적고 조사할 주제를 골라요.') + identifiers + `
    <div class="worksheet-section topic-section">
      <h2>무엇을 조사할까요?</h2>
      <p class="activity-context">${TASKS[activeTask()]} · <a href="#home">다른 활동 선택</a></p>
      <p class="topic-choice-note">사례에서 주제를 가져오거나 아래에 직접 적어도 좋아요.</p>
      ${ideaExplorer()}
      ${input('topic', '내 탐구 주제', '예: 우리 동네 노인복지관 이용의 어려움', a.topic, { limit: 60 })}
      <div id="case-guide">${caseGuide(a.topic)}</div>
    </div>
    <div class="worksheet-section question-section">
      ${input('inquiry', '출발 질문', promptDefinition('inquiry')[1], a.inquiry, { area: true, hint: promptDefinition('inquiry')[0] })}
      ${ideaHints()}
      ${a.reason ? input('reason', '이 주제를 고른 이유는 무엇인가요?', '예: 할머니가 복지관까지 두 번 환승하는 것을 봤다.', a.reason, { area: true }) : ''}
    </div>`;
}

function awaitingEconomyTopic() {
  return activeTask() === 'economy' && typeof location !== 'undefined' && location.hash === '#economy';
}

function sourceChips(key, label, options, value, index) {
  const name = `source-${index}-${key}`;
  return `<fieldset class="source-chips"><legend>${label}</legend>
    <div class="chip-options">${options.map(option => `<label>
      <input type="radio" name="${name}" data-key="${key}" data-source="${index}" value="${option}" ${value === option ? 'checked' : ''}>
      <span>${option}</span></label>`).join('')}</div></fieldset>`;
}

function minimumSourceSlots() {
  return activeTask() === 'economy' ? (economyGuided() ? 1 : 2) : SOURCE_GOAL;
}

function sourceSlots() {
  const sources = work().sources;
  return [...sources, ...Array.from({ length: Math.max(0, minimumSourceSlots() - sources.length) }, () => ({}))];
}

function sourceCard(source, i) {
  if (activeTask() === 'economy') return economySourceCard(source,i);
  const stat = officialStat(source);
  const title = `근거 자료 ${i + 1}`;
  return `<section class="source-card" aria-labelledby="card-${i}">
    <div class="card-head"><h2 id="card-${i}" tabindex="-1">${title}</h2><button type="button" data-delete="${i}" aria-label="${title} 삭제" ${hasSource(source) || i >= minimumSourceSlots() ? '' : 'hidden'}>삭제</button></div>
    ${stat ? officialGraph(source.statId) : ''}
    <div class="photo-row">
      ${source._photo ? `<img class="card-image" src="${source._photo}" alt="${title} 이미지"><button type="button" data-remove-photo="${i}">이미지 제거</button>` : ''}
      <label class="upload-button" for="photo-${i}">${source._photo ? '이미지 바꾸기' : '+ 이미지 첨부'}<input id="photo-${i}" type="file" data-photo="${i}" accept="image/jpeg,image/png,image/webp"></label>
      <small>선택 사항 · 원본 20MB까지 · 과제당 4장 · 자동 용량 줄이기<br>JPEG·PNG·WebP, 2,500만 화소 이하. HEIC는 JPEG로 바꿔 주세요.</small>
    </div>
    ${sourceChips('type', '어떤 자료인가요?', SOURCE_TYPES, sourceType(source), i)}
    ${sourceChips('scale', '어디의 이야기인가요?', SOURCE_SCALES, sourceScale(source), i)}
    ${input('title', '자료 제목이 무엇인가요?', selectedIdea() ? `예: ${selectedIdea().label} 조사 기록` : '예: 우리 구 노인복지시설 현황', source.title, { source: i })}
    ${input('url', '어디에서 찾았나요?', '예: ○○시청 자료 제목과 링크 / 직접 조사한 장소', source.url, { source: i })}
    ${input('fact', '팩트 체크 (자료에 나온 사실)', selectedIdea()?.examples?.fact || '예: 2025년 ○○동에 등록된 노인복지관은 1곳이다.', sourceFact(source),
      { source: i, area: true, limit: 100, hint: '자료에 나온 숫자나 사실을 있는 그대로 적어 보세요.' })}
    ${input('thought', '내 생각 한 줄 (해석)', selectedIdea()?.examples?.thought || '예: 복지관이 한 곳에 몰려 외곽 주민은 이동하기 어려울 수 있다.', sourceThought(source),
      { source: i, area: true, limit: 100, hint: '이 자료를 보면 어떤 문제나 원인을 알 수 있나요?' })}
    ${source._photo ? input('photoCaption', '이미지에서 무엇을 볼 수 있나요?', '예: ○○동에서 직접 조사한 모습, 11월 7일 촬영', source.photoCaption, { source: i }) : ''}
    <details class="supplement"><summary>자료를 만든 곳과 날짜 적기</summary>
      ${input('author', '누가 만들거나 조사했나요?', '예: ○○구청 / 직접 촬영(김하늘)', source.author, { source: i })}
    ${input('date', '언제 만들거나 조사했나요?', '예: 2026년 11월 7일 촬영 / 2025년 12월 발행', source.date, { source: i })}</details>
  </section>`;
}

const researchLink = '<a class="research-link" href="https://www.bigkinds.or.kr/" target="_blank" rel="noopener noreferrer">빅카인즈에서 뉴스 찾기 <small>(새 탭)</small></a>';
const sourceCards = (start = 0) => sourceSlots().slice(start).map((source, index)=>sourceCard(source,index+start)).join('') +
  '<button type="button" id="add-source" class="add-source">+ 근거 자료 카드 추가</button>';

function evidenceEditor() {
  return heading(taskSteps()[1], '믿을 만한 자료를 찾아 비교해요. 자료 3개 이상은 탐구를 충실히 하기 위한 목표예요.') +
    researchLink + ideaHints() +
    `<div class="evidence-status"><span id="source-count" class="rubric-badge" role="status"></span>
      <p>자료를 찾은 곳, 자료 종류와 범위, 사실과 내 생각을 모두 채우면 작성한 자료 수에 반영돼요.</p>
    </div>` + sourceCards();
}

function analysisKeys() {
  return rubric().analysis;
}

function priorAnswerKeys() {
  return PRIOR_KEYS.filter(key => filled(answer(key)));
}

function thinkingEditor() {
  const prior = priorAnswerKeys();
  return heading(taskSteps()[2], '찾은 자료를 보면서 왜 이런 일이 생겼는지, 무엇을 바꿀 수 있을지 적어요.') +
    `<section class="worksheet-section thought"><h2>무슨 일이 왜 일어나고 있나요?</h2>${analysisKeys().map(prompt).join('')}</section>
    <section class="worksheet-section thought"><h2>어떻게 바꿀 수 있을까요? (해결책 2가지)</h2>${rubric().solutions.map(prompt).join('')}</section>` +
    (prior.length ? `<details class="supplement"><summary>전에 적은 비교, 생각과 제안</summary>${prior.map(prompt).join('')}</details>` : '');
}

function isChecked(index) {
  return index < CHECKLIST.length
    ? work().worksheetChecks?.[index]
    : work().rehearsalChecks?.[index - CHECKLIST.length];
}

function checklist(title, labels, offset = 0) {
  return `<fieldset class="checklist"><legend>${title}</legend>${labels.map((label, i) =>
    `<label><input type="checkbox" data-check="${offset + i}" ${isChecked(offset + i) ? 'checked' : ''}> <span>${label}</span></label>`).join('')}</fieldset>`;
}

function finalEditor() {
  return heading(taskSteps()[3], '발표를 연습하고, 친구들과 함께한 일과 조사에서 배운 점을 적어요.') +
    prompt('posterTitle') + checklist('인쇄 전 확인할 내용', CHECKLIST) +
    checklist('발표 전 스스로 점검하기', taskRehearsal(), CHECKLIST.length) +
    `<section class="worksheet-section thought"><h2>활동 돌아보기</h2>${reflectionKeys().map(prompt).join('')}</section>` +
    `<p class="print-note">돌아보기에서 쓴 글도 ${productName()} 아래에 함께 인쇄돼요. 내용이 길면 다음 장으로 이어져요.</p>`;
}

function renderProgress() {
  const { answers:a,sources } = work();
  const economics = activeTask() === 'economy';
  const count = $('#source-count');
  const set = economyGuided();
  const sourceCount = economics ? economySourceCount(set) : sources.filter(completeSource).length;
  if (count) count.textContent = economics
    ? `기록한 출처 ${sourceCount}곳 · 서로 다른 출처 3곳 이상에서 근거를 찾아봐요.`
    : `모은 자료: ${sourceCount} / ${SOURCE_GOAL}개 (자료 조사 목표: 3개 이상)`;
  const completed = economics ? economyCompleted(set) : [
    [a.number,a.name,a.team,a.topic,a.inquiry].every(filled),
    sourceCount >= SOURCE_GOAL,
    [...analysisKeys(),...rubric().solutions].every(key=>filled(answer(key))),
    [...CHECKLIST,...taskRehearsal()].every((_,i)=>isChecked(i)) && reflectionKeys().every(key=>filled(answer(key)))
  ];
  $('#steps').innerHTML = taskSteps().map((title,i)=>
    `<li><button type="button" data-stage="${i}" ${stage() === i ? 'aria-current="step"' : ''}>
      <span class="step-number" aria-hidden="true">${completed[i] ? '✓' : i + 1}</span><span>${title}</span>
      ${completed[i] ? '<span class="sr-only"> 완료</span>' : ''}
    </button></li>`).join('');
}

function posterFields(keys) {
  return keys.map(key => {
    const value = answer(key);
    return `<section><h4>${promptDefinition(key)[0]}</h4><p${filled(value) ? '' : ' class="paper-empty"'}>${esc(value || '작성할 내용')}</p></section>`;
  }).join('');
}

function reportEvidenceFigures(evidence, attachments, economics = false) {
  return evidence.length || attachments.length ? `<div class="evidence-grid">${evidence.map((source, i) =>
        `<figure><figcaption><strong>${i + 1}. ${esc(source.title || '근거 자료')}</strong></figcaption>
        ${[sourceType(source), sourceScale(source)].some(filled)
          ? `<span class="rubric-badge">${esc([sourceType(source), sourceScale(source)].filter(filled).join(' · '))}</span>` : ''}
        ${officialStat(source) ? officialGraph(source.statId, true) : ''}
        ${source._photo ? `<img src="${source._photo}" alt="${esc(source.photoCaption || source.title || '첨부한 근거 이미지')}">` : ''}
        ${source._photo && source.photoCaption ? `<small>${esc(source.photoCaption)}</small>` : ''}
        <p><strong class="evidence-label">사실</strong> ${esc(sourceFact(source) || '작성할 내용')}</p>
        <p><strong class="evidence-label">내 생각</strong> ${esc(sourceThought(source) || '작성할 내용')}</p>
        <small><strong>출처</strong> ${economics ?
          [esc(source.author),esc(source.date),economyPaperSource(source.url)].filter(filled).join(' · ') :
          esc([source.author, source.date, source.url].filter(filled).join(' / ') || '출처를 적어 주세요.')}</small></figure>`).join('')}
        ${attachments.map(photo => `<figure><img src="${esc(photo.dataUrl)}" alt="${esc(photo.caption || '이전에 첨부한 이미지')}"><figcaption>${esc(photo.caption)} <small>${economics ?
          [esc(photo.credit),economyPaperSource(photo.source)].filter(filled).join(' · ') :
          esc([photo.credit, photo.source].filter(filled).join(' / '))}</small></figcaption></figure>`).join('')}</div>` : '';
}

function renderPoster() {
  if (activeTask() === 'economy') {
    $('#poster').innerHTML = economyPoster(economyGuided());
    return;
  }
  const { answers:a,sources,attachments=[] } = work();
  const prior = priorAnswerKeys();
  const author = [a.classroom,a.number,a.name,a.team].filter(filled).join('  /  ');
  const title = a.posterTitle || a.topic || '나의 탐구 주제';
  const evidence = reportEvidenceFigures(sources.filter(hasSource),attachments);
  $('#poster').innerHTML = `<article class="paper">
    <header class="paper-header"><span class="paper-label">통합사회2 포스터 · ${TASKS.human}</span>
      <h2>${esc(title)}</h2><p class="paper-author">${esc(author || '학번 / 이름 / 모둠')}</p></header>
    <section class="paper-question"><h3>1. 시작하며 (우리가 찾은 문제)</h3>
      ${a.posterTitle && a.topic ? `<p><strong>주제</strong> ${esc(a.topic)}</p>` : ''}
      <p>${esc(a.inquiry || '탐구 질문을 적으면 여기에 보여요.')}</p>
      ${filled(a.reason) ? `<p>${esc(a.reason)}</p>` : ''}</section>
    <section class="paper-evidence"><h3>2. 살펴보기 (자료로 본 사실과 원인)</h3>
      ${evidence || '<p class="paper-empty">모은 자료와 이미지가 여기에 들어가요.</p>'}
      <div class="paper-analysis">${posterFields([...analysisKeys(),...prior.filter(key=>key !== 'proposal')])}</div></section>
    <section class="paper-section"><h3>3. 제안하기 (우리가 찾은 해결책)</h3>
      <div class="paper-analysis">${posterFields([...rubric().solutions,...prior.filter(key=>key === 'proposal')])}</div></section>
    <section class="paper-section paper-rehearsal"><h3>발표 전 스스로 점검하기</h3>
      <ul>${taskRehearsal().map((label,i)=>`<li>${isChecked(CHECKLIST.length + i) ? '✓' : '□'} ${label}</li>`).join('')}</ul></section>
    <section class="paper-section paper-reflection"><h3>활동 돌아보기</h3>
      <div class="paper-analysis">${posterFields(reflectionKeys())}</div></section></article>`;
}

function applyEconomyView() {
  const tabs = $('#economy-view-tabs');
  const economics = activeTask() === 'economy';
  const canPreview = economics && !awaitingEconomyTopic();
  const preview = canPreview && economyView === 'preview';
  tabs.hidden = !canPreview;
  for (const tab of tabs.querySelectorAll('[data-view]')) {
    const selected = tab.dataset.view === economyView;
    tab.setAttribute('aria-selected',String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  $('#workspace').hidden = preview;
  $('#preview-panel').hidden = economics && !preview;
  if (canPreview) {
    $('#workspace').setAttribute('role','tabpanel');
    $('#workspace').setAttribute('aria-labelledby','tab-write step-title');
    $('#preview-panel').setAttribute('role','tabpanel');
    $('#preview-panel').setAttribute('aria-labelledby','tab-preview preview-title');
  } else {
    $('#workspace').removeAttribute('role');
    $('#workspace').setAttribute('aria-labelledby','step-title');
    $('#preview-panel').removeAttribute('role');
    $('#preview-panel').setAttribute('aria-labelledby','preview-title');
  }
  previewButton.hidden = economics;
  previewPrint.hidden = economics ? !preview : stage() !== taskSteps().length - 1;
  $('#preview-title').textContent = economics ? '경제 탐구 보고서 미리보기' : '포스터 미리보기';
  $('#preview-description').textContent = economics ? '작성한 내용이 반영됩니다.' : '쓰는 내용이 여기에 바로 보여요.';
}

function setEconomyView(view) {
  if (activeTask() !== 'economy' || awaitingEconomyTopic() || !['write','preview'].includes(view)) return;
  economyView = view;
  applyEconomyView();
  $('#tab-'+view).focus();
}

function render(focus = false) {
  const index = stage();
  const economics = activeTask() === 'economy';
  const steps = taskSteps();
  const waiting = awaitingEconomyTopic();
  const editors = economics ? ECONOMY_EDITORS : [problemEditor,evidenceEditor,thinkingEditor,finalEditor];
  if (economics) showMobilePreview(false);
  document.body.classList.toggle('economy-workspace',economics);
  $('#steps').hidden = waiting;
  $('#editor').innerHTML = waiting
    ? '<div class="step-heading"><h1 id="step-title" tabindex="-1">경제 탐구 보고서</h1><p>탐구할 경제 주제를 골라요.</p></div>' + guidedExplorer(economyTopicFilter)
    : editors[index](economyGuided());
  $('#actions').innerHTML = waiting ? '' :
    (index ? '<button type="button" data-back>← 이전 단계</button>' : '') +
    (index < steps.length - 1 ? `<button type="button" class="primary" data-next>다음 단계 ${steps[index + 1]} →</button>`
      : (economics ? '<button type="button" data-open-preview>보고서 미리보기 확인</button>' : '') +
        '<button type="button" id="print" class="primary">PDF로 저장 / 인쇄하기</button>');
  applyEconomyView();
  renderProgress();
  renderPoster();
  if (focus) {
    if (economics && !waiting && mobile.matches) $('#steps [aria-current="step"]')?.scrollIntoView?.({block:'nearest',inline:'nearest'});
    (economics && !waiting && economyView === 'preview' ? $('#tab-preview') : $('#step-title')).focus();
  }
}

function move(index) {
  if (awaitingEconomyTopic()) return;
  if (!Number.isInteger(index) || index < 0 || index >= taskSteps().length) return;
  if (index === stage()) {
    if (activeTask() === 'economy' && economyView === 'preview') setEconomyView('write');
    if (previewButton.getAttribute('aria-expanded') === 'true') {
      showMobilePreview(false);
      $('#step-title').focus();
    }
    return;
  }
  openIdeaId = '';
  const set = economyGuided();
  economyView = 'write';
  if (activeTask() === 'economy') editAnswer(economyPhase(set),String(index));
  else change(patchTask({ worksheetStep: index }));
  showMobilePreview(false);
  notice('#message', '');
  render(true);
}

function switchTask(task) {
  if (!Object.hasOwn(TASKS, task) || task === activeTask()) return;
  if (memoryDirty) {
    notice('#storage-warning', '아직 저장되지 않은 글이 있어요. 현재 활동을 파일로 보관한 뒤 새로고침하고 다른 활동을 열어 주세요.');
    return false;
  }
  openIdeaId = '';
  economyView = 'write';
  if (task === 'economy' && !data.economy) data.economy = blank();
  data.inquiry = {version: 1, active: task};
  revision++;
  render(true);
}
function selectActivityRoute() {
  const hash = typeof location === 'undefined' ? '' : location.hash;
  const answers = data.economy?.answers;
  if (hash === '#economy-work' && !answers?.guidedSetId && !answers?.economyPackId &&
      !answers?.ideaId && !filled(answers?.topic) && !filled(answers?.inquiry)) {
    location.replace('#economy');
    return;
  }
  const task = hash === '#human' ? 'human' : ['#economy','#economy-work'].includes(hash) ? 'economy' : null;
  if (!task) return;
  if (hash === '#economy') economyView = 'write';
  if (task === activeTask()) render(true);
  else if (switchTask(task) === false) location.hash = activeTask() === 'economy' ? '#economy-work' : '#human';
}

function editAnswer(key, value) {
  change(patchTask({ answers: { ...work().answers, [key]: value } }));
}

function editSource(i, updates) {
  const sources = sourceSlots().map((source, index) => index === i ? { ...source, ...updates } : source);
  return patchTask({ sources });
}

function focusSourceField(field) {
  const details = field?.closest?.('#extra-sources');
  if (details) details.open = true;
  field?.focus();
}

function removeSource(index) {
  const removed = work().sources[index];
  if (hasSource(removed) && !confirm(`근거 자료 ${index + 1}의 글과 이미지를 지울까요?`)) return;
  const sources = activeTask() === 'economy' && !economyGuided() && index === 0
    ? [{},...work().sources.slice(1)] : work().sources.filter((_, i) => i !== index);
  // Older bookmarks index cards by position. Fall back to the saved worksheet step.
  const patch = { sources: sources.length ? sources : [{}] };
  if (work().position?.group === 1) deletePosition(patch);
  else change(patchTask(patch));
  render();
  focusSourceField($('#card-' + Math.min(index, sources.length - 1)) || $('#add-source') || $('#step-title'));
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
  notice('#message', '이미지 용량을 줄이고 있어요. 잠시 기다려 주세요.');
  try {
    const photoCount = work().sources.filter(source => source._photo).length;
    if (!work().sources[index]?._photo && photoCount >= MEDIA_LIMIT.count) {
      throw new Error('이 과제의 자료 카드에는 이미지를 최대 4장까지 넣을 수 있어요.');
    }
    const dataUrl = await convertStudentPhoto(file);
    if (activeTask() !== task || work().sources !== sourcesAtStart) {
      throw new Error('자료가 바뀌었어요. 이미지를 다시 골라 주세요.');
    }
    const candidate = editSource(index, { _photo: dataUrl });
    if (!valid(candidate)) throw new Error('이 과제에는 이미지를 최대 4장까지 넣을 수 있어요.');
    const backupBytes = new Blob([JSON.stringify({ ...candidate, exportedAt: new Date().toISOString() }, null, 2)]).size;
    if (backupBytes > BACKUP_LIMIT_BYTES) throw new Error('전체 보관 용량을 넘어서 이미지를 추가하지 않았어요. 기존 글과 사진은 그대로 있어요. 작업을 파일로 보관한 뒤 필요 없는 사진을 정리해 주세요.');
    if (!change(candidate, true)) throw new Error('기기 저장 공간이 부족하거나 저장이 허용되지 않아 이미지를 추가하지 않았어요. 기존 글과 사진은 그대로 있어요. 작업을 파일로 보관해 주세요.');
    if (task === 'economy' ? [0,2].includes(stage()) : stage() === 1) {
      render();
      $('#photo-' + index)?.focus();
    }
    notice('#message', activeTask() === 'economy' ? '이미지를 첨부했어요. 자료 카드에서 사진을 확인해 주세요.' : '이미지를 첨부했어요. 글자가 있는 사진은 미리보기에서 선명도를 확인해 주세요.');
  } catch (error) {
    notice('#message', error.message);
  } finally {
    photoBusy = false;
  }
}

function showMobilePreview(open) {
  open = open && activeTask() === 'human';
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
  if (event.target.matches('[data-open-preview]')) setEconomyView('preview');
  if (event.target.id === 'print') printPoster();
});
$('#editor').addEventListener('input', event => {
  const field = event.target;
  const { key, source } = field.dataset;
  if (!key) return;
  if (source !== undefined) {
    const index = Number(source);
    change(editSource(index, { [key]: field.value }));
    const remove = $(`[data-delete="${index}"]`);
    remove.hidden = index < minimumSourceSlots() && !hasSource(work().sources[index]);
  } else editAnswer(key, field.value);
  const count = $('#' + field.id + '-count');
  if (count) count.textContent = countText(field.value, field.dataset.limit);
  if (key === 'topic') {
    const guide = $('#case-guide');
    if (guide) guide.innerHTML = caseGuide(field.value);
  }
});
$('#editor').addEventListener('change', event => {
  const field = event.target;
  if (field.name === 'practice-status' && Object.hasOwn(ECONOMY_PRACTICE_STATUS,field.value)) {
    editAnswer('practiceStatus',field.value);
    render();
    $('#editor input[name="practice-status"]:checked')?.focus();
  }
  if (field.dataset.guidedRole !== undefined) {
    const set = economyGuided();
    if (set && (!field.value || guidedRoles(set).includes(field.value))) editAnswer(guidedKey(set,'position'),field.value);
  }
  if (field.dataset.termKey) {
    editAnswer(field.dataset.termKey, field.value);
    $('#economy-term-method').textContent = ECONOMY_TERM_METHODS[field.value] || '';
  }
  if (field.id === 'task') switchTask(field.value);
  if (field.dataset.photo !== undefined) attachPhoto(field);
  if (field.dataset.check !== undefined) {
    const index = Number(field.dataset.check);
    const rehearsal = index >= CHECKLIST.length;
    const key = rehearsal ? 'rehearsalChecks' : 'worksheetChecks';
    const offset = rehearsal ? CHECKLIST.length : 0;
    const labels = rehearsal ? taskRehearsal() : CHECKLIST;
    const checks = labels.map((_, i) => i + offset === index ? field.checked : Boolean(isChecked(i + offset)));
    change(patchTask({ [key]: checks }));
  }
});
$('#editor').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.topicTab && awaitingEconomyTopic() && Object.hasOwn(ECONOMY_TOPIC_GROUPS,button.dataset.topicTab)) {
    economyTopicFilter = button.dataset.topicTab;
    render();
    $('#editor [data-topic-tab][aria-pressed="true"]')?.focus();
    return;
  }
  if (button.dataset.guidedSet) {
    if (!awaitingEconomyTopic()) return;
    const id = button.dataset.guidedSet;
    if (id === 'custom' || (typeof ECONOMY_GUIDED_SETS !== 'undefined' && ECONOMY_GUIDED_SETS.some(set => set.id === id))) {
      const answers = { ...work().answers, guidedSetId: id === 'custom' ? '' : id, economyPackId: 'custom' };
      if (id !== 'custom') {
        const topic = ECONOMY_GUIDED_SETS.find(set=>set.id===id);
        answers[guidedQuestionVersionKey(topic)] = nextGuidedQuestionVersion(topic,answers);
        if (['phase','phaseV2','phaseV3'].every(part=>answers[guidedKey(topic,part)] === undefined))
          answers[economyPhase(topic)] ??= '0';
      }
      economyView = 'write';
      if (!change(patchTask({answers}), true)) return;
      location.hash = '#economy-work';
    }
    return;
  }
  if (button.dataset.idea) applyIdea(button.dataset.idea);
  if (button.dataset.useIdea) applyIdea(button.dataset.useIdea, true);
  if (button.id === 'edit-idea-topic') $('#topic').focus();
  if (button.id === 'add-source') {
    const sources = sourceSlots();
    const index = sources.length;
    change(patchTask({ sources: [...sources, {}] }));
    render();
    focusSourceField($('#source-' + index + '-title'));
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
    focusSourceField($('#photo-' + index));
  }
});

$('#economy-view-tabs').addEventListener('click',event=>{
  const tab = event.target.closest('[data-view]');
  if (tab) setEconomyView(tab.dataset.view);
});
$('#economy-view-tabs').addEventListener('keydown',event=>{
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  setEconomyView(event.key === 'Home' ? 'write' : event.key === 'End' ? 'preview' : economyView === 'write' ? 'preview' : 'write');
});

let editorScroll = 0;
previewButton.addEventListener('click', () => {
  const open = previewButton.getAttribute('aria-expanded') !== 'true';
  if (open) editorScroll = window.scrollY;
  showMobilePreview(open);
  if (open) {
    $('#preview-title').focus();
  } else {
    previewButton.focus({ preventScroll: true });
    window.scrollTo(0, editorScroll);
  }
});
mobile.addEventListener('change', () => showMobilePreview(false));
previewPrint.addEventListener('click', printPoster);

async function printPoster() {
  if (printBusy) return;
  printBusy = true;
  const buttons = [$('#print'), previewPrint].filter(Boolean);
  buttons.forEach(button => { button.disabled = true; });
  notice('#message', '');
  try {
    const snapshot = revision;
    await Promise.all([...$('#poster').querySelectorAll('img')].map(img => img.decode()));
    if (snapshot !== revision) throw new Error('작성 내용이 바뀌었어요. 인쇄 버튼을 다시 눌러 주세요.');
    await document.fonts?.ready;
    if (snapshot !== revision) throw new Error('작성 내용이 바뀌었어요. 인쇄 버튼을 다시 눌러 주세요.');
    window.prepareReportPrint?.();
    window.print();
  } catch {
    notice('#message', `인쇄를 준비하지 못했어요. ${productName()}의 이미지와 내용을 확인한 뒤 다시 눌러 주세요.`);
    $('#message').scrollIntoView({ block: 'nearest' });
  } finally {
    printBusy = false;
    buttons.forEach(button => { button.disabled = false; });
  }
}

$('#open-files').onclick = () => {
  notice('#file-status', '');
  fileDialog.showModal();
};
$('#open-help').onclick = () => $('#help-dialog').showModal();
$('#backup').onclick = () => {
  const bytes = downloadJSON({ schema: 'check-hanjang-activity', version: 1, activity: activeTask(), task: activityRecord(data, activeTask()), exportedAt: new Date().toISOString() }, `체크한장-${activeTask() === 'economy' ? '경제보고서' : '인권탐구'}-보관.json`);
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
    const incoming = JSON.parse(await file.text());
    const imported = restoreActivity(data, incoming, activeTask());
    if (!valid(imported)) throw new Error('체크 한장에서 보관한 파일을 선택해 주세요.');
    for (const task of [imported, imported.economy].filter(Boolean)) {
      await validateRestoredPhotos([...(task.attachments || []), ...task.sources.filter(s => s._photo).map(s => ({ dataUrl: s._photo }))]);
    }
    if (snapshot !== revision) throw new Error('작성 내용이 바뀌었어요. 파일을 다시 선택해 주세요.');
    if (!confirm(`${TASKS[activeTask()]} 기록만 파일의 내용으로 바꿀까요? 다른 활동은 그대로 유지돼요.`)) return;
    if (!persist(imported, true)) throw new Error('기기에 저장하지 못했어요. 현재 기록을 유지했어요.');
    openIdeaId = '';
    data = imported;
    originalRaw = JSON.stringify(imported);
    revision++;
    showMobilePreview(false);
    fileDialog.close();
    economyView = 'write';
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
  if (storageBlocked) {
    notice('#storage-warning', '저장 기록을 읽지 못해 활동별로 안전하게 지울 수 없어요. 작업 저장·불러오기에서 원래 파일을 보관하고 정상 보관 파일을 불러와 주세요.');
    return;
  }
  if (!confirm(`${TASKS[activeTask()]} 기록과 사진만 지울까요? 다른 활동은 그대로 유지돼요. 필요한 기록은 먼저 보관하세요.`)) return;
  const candidate = replaceActivity(data, blank(), activeTask());
  if (!change(candidate, true)) return;
  openIdeaId = '';
  notice('#message', '현재 활동의 기록을 초기화했어요.');
  showMobilePreview(false);
  if (activeTask() === 'economy' && typeof location !== 'undefined' && location.hash === '#economy-work') location.hash = '#economy';
  render(true);
};

window.addEventListener('beforeunload', event => {
  if (memoryDirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});

selectActivityRoute();
render();
