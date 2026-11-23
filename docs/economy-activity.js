'use strict';

function economyPack() {
  if (activeTask() !== 'economy' || economyGuided() || work().answers.economyPackId === 'custom') return null;
  const id = work().answers.economyPackId || work().answers.ideaId;
  return ECONOMY_DATA.packs[id] ? { id, ...ECONOMY_DATA.packs[id] } : null;
}

function officialStat(source) {
  return source.statId ? ECONOMY_DATA.charts[source.statId] : null;
}

function officialTable(chart, compact = false) {
  return `<div class="stat-table-wrap"><table class="stat-table"><caption>${compact ? '값 확인' : esc(chart.title)} · ${esc(chart.unit)}</caption>
    <thead><tr><th scope="col">구분</th>${chart.series.map(series => `<th scope="col">${esc(series.name)}</th>`).join('')}</tr></thead>
    <tbody>${chart.labels.map((label, index) => `<tr><th scope="row">${esc(label)}</th>
      ${chart.series.map(series => `<td>${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(series.values[index])}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function officialGraph(id, compact = false) {
  const chart = ECONOMY_DATA.charts[id];
  if (!chart) return '';
  return `<div class="official-graph">
    <p class="stat-meta">${esc(chart.region)} · ${esc(chart.period)} · 단위 ${esc(chart.unit)}</p>
    <img class="stat-image" src="assets/economy/${id}.svg" width="700" height="360" alt="${esc(chart.title)}. 정확한 값은 바로 아래 표에서 확인할 수 있어요.">
    ${officialTable(chart, compact)}
    <p class="stat-citation"><a href="${esc(chart.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(chart.publisher)} · ${esc(chart.sourceTitle)}</a>
      <span>${esc(chart.sourcePage)} · 발표 ${esc(chart.published)}</span></p>
  </div>`;
}

function economyMaterials() {
  if (activeTask() !== 'economy') return '';
  const guided = economyGuided();
  if (guided) return guidedMaterials(guided);
  const pack = economyPack();
  return `<section class="economy-materials" aria-labelledby="economy-materials-title">
    <h2 id="economy-materials-title">실제 숫자와 그래프를 읽어 봐요</h2>
    <p class="field-hint">날짜·단위·지역을 먼저 확인해요. 이 활동은 표에 적힌 시점의 공식 통계를 사용해요.</p>
    <div class="field"><label for="economy-pack">어떤 사례의 자료를 볼까요?</label>
      <select id="economy-pack"><option value="" disabled>자료 묶음을 골라 보세요</option>
        ${TOPIC_IDEAS.economy.map(idea => `<option value="${idea.id}" ${idea.id === pack?.id ? 'selected' : ''}>${esc(idea.label)}</option>`).join('')}
      </select>
      <small class="field-hint">참고할 통계를 골라요. 주제와 출발 질문을 고치려면 1단계로 가요.</small>
    </div>
    ${pack ? pack.charts.map((id, index) => {
      const chart = ECONOMY_DATA.charts[id];
      const used = work().sources.some(source => source.statId === id);
      return `<article class="official-card"><h3>자료 ${index + 1}. ${esc(chart.title)}</h3>
        ${officialGraph(id)}
        <button type="button" data-use-stat="${id}">${used ? '이 자료의 내 기록으로 이동' : '이 자료로 내 기록 시작하기'}</button>
      </article>`;
    }).join('') + `<p class="field-hint">공식 자료를 골라도 사실과 내 생각은 직접 적어요. ${pack.charts.length > 1 ? '이 그래프들은 같은 보고서에서 가져왔어요. 자료 개수에는 1개로 세어요. ' : ''}다른 출처의 기사·지역 자료도 함께 찾아요.</p>`
      : '<p>사례를 골라 표와 그래프를 읽고, 필요한 자료를 내 기록에 가져와 보세요.</p>'}
  </section>`;
}

function readingFields(pack) {
  return [
    ['compare', '그래프의 숫자를 비교하면?', pack.compare],
    ['explain', '배운 경제 원리로 설명하면?', pack.explain],
    ['check', '이 자료로 어디까지 알 수 있나요?', pack.check],
    ['local', '우리 지역과 연결해 보면?', pack.local]
  ].map(([kind, title, hint]) => ({
    key: `reading_${pack.id}_${kind}`, title, hint
  }));
}

function economyReadingEditor() {
  const guided = economyGuided();
  if (guided) return guidedReadingEditor(guided);
  const pack = economyPack();
  if (!pack) return '';
  return `<section class="worksheet-section thought"><h2>숫자 비교부터 내 설명까지</h2>
    <p class="field-hint">여기에 답을 쓰면 읽은 자료의 그래프와 출처도 보고서에 함께 들어가요.</p>
    <details class="supplement"><summary>표와 그래프 다시 보기</summary>${pack.charts.map(id => officialGraph(id)).join('')}</details>
    ${readingFields(pack).map(field => input(field.key, field.title, '그래프의 수치, 단위와 이유를 내 말로 적어 보세요.',
      work().answers[field.key], { area: true, limit: 200, hint: field.hint })).join('')}
  </section>`;
}

function economyReadingReport() {
  const guided = economyGuided();
  if (guided) return guidedReadingReport(guided);
  const pack = economyPack();
  if (!pack) return '';
  const fields = readingFields(pack).filter(field => filled(work().answers[field.key]));
  if (!fields.length) return '';
  const missingCharts = pack.charts.filter(id => !work().sources.some(source => source.statId === id));
  return `<section class="paper-section"><h3>공식 자료를 읽고 생각한 점</h3>
    <p class="stat-meta">${esc(TOPIC_IDEAS.economy.find(idea => idea.id === pack.id).label)}</p>
    ${missingCharts.length ? `<div class="evidence-grid">${missingCharts.map(id =>
      `<figure><figcaption><strong>${esc(ECONOMY_DATA.charts[id].title)}</strong></figcaption>${officialGraph(id, true)}</figure>`).join('')}</div>` : ''}
    <div class="paper-analysis">${fields.map(field =>
      `<section><h4>${field.title}</h4><p>${esc(work().answers[field.key])}</p></section>`).join('')}</div></section>`;
}

function useOfficialStat(id) {
  const chart = ECONOMY_DATA.charts[id];
  const pack = economyPack();
  if (!chart || !pack?.charts.includes(id)) return;
  let index = work().sources.findIndex(source => source.statId === id);
  if (index < 0) {
    const sources = [...work().sources];
    index = sources.findIndex(source => !hasSource(source));
    if (index < 0) index = sources.length;
    sources[index] = { ...sources[index], title: chart.title, author: chart.publisher, url: chart.sourceUrl, date: chart.published,
      type: '통계·그래프', scale: chart.scope, statId: id, statEdition: ECONOMY_DATA.version };
    change(patchTask({ sources }));
    render();
  }
  $(`#source-${index}-fact`).focus();
}

// Guided source sets are optional: legacy packs and every existing answer stay intact.
function economyGuided() {
  if (activeTask() !== 'economy' || typeof ECONOMY_GUIDED_SETS === 'undefined') return null;
  return ECONOMY_GUIDED_SETS.find(set => set.id === work().answers.guidedSetId) || null;
}
const GUIDED_REGION_NAMES = [
  ['여주 구양리','F 지역'], ['구양리','F 지역'], ['여주','F 지역'],
  ['제주관광공사','A 지역 관광공사'], ['제주관광협회','A 지역 관광협회'], ['제주사무소','A 지역 사무소'],
  ['제주','A 지역'], ['전라남도','B 지역'], ['전남','B 지역'], ['울산','C 지역'], ['서울','D 지역'],
  ['신안군','E 지역 지자체'], ['신안','E 지역']
];
function anonymizeGuidedText(value) {
  return GUIDED_REGION_NAMES.reduce((text,[name,alias]) => text.replaceAll(name,alias),String(value ?? ''));
}
const guidedEsc = value => esc(anonymizeGuidedText(value));
function guidedKey(set, part) { return `guided_${set.id}_${part}`; }

function economyRefinementKey(part) {
  const set = economyGuided();
  if (set) return guidedKey(set, part);
  const pack = economyPack();
  return pack ? `reading_${pack.id}_${part}` : part;
}

function economyInquiry() {
  const guided = economyGuided();
  if (guided) return guided.decision.question;
  const refined = work().answers[economyRefinementKey('refinedInquiry')];
  const original = economyOriginalInquiry();
  return filled(refined) ? refined : original;
}

function economyOriginalInquiry() {
  const set = economyGuided();
  return work().answers[set ? guidedKey(set,'initialInquiry') : 'inquiry'];
}

function economyEvidenceReason() {
  return work().answers[economyRefinementKey('evidenceReason')];
}

function economyRefinementEditor() {
  const { answers } = work();
  const original = economyOriginalInquiry() || anonymizeGuidedText(economyGuided()?.decision.question);
  const inquiryKey = economyRefinementKey('refinedInquiry');
  const reasonKey = economyRefinementKey('evidenceReason');
  return `<section class="worksheet-section thought"><h2>자료를 보고 질문 다듬기</h2>
    ${filled(original) ? `<p class="field-hint"><strong>출발 질문</strong> ${esc(original)}</p>` : ''}
    ${input(inquiryKey, '자료를 읽고 다듬은 질문', '비교할 대상과 기준을 넣어 질문을 써 보세요.', answers[inquiryKey],
      { area: true, hint: '자료에서 비교할 수 있는 범위로 질문을 좁혀 보세요. 빈칸으로 두면 출발 질문을 그대로 써요.' })}
    ${input(reasonKey, '이 근거를 고른 이유 한 줄', '이 정보가 내 질문에 답하는 데 어떻게 도움이 되나요?', answers[reasonKey], { limit: 100 })}
    </section>`;
}

function economyQuestionSummary(heading, question) {
  return filled(question) ? `<p class="field-hint"><strong>${heading}</strong> ${esc(question)}</p>` : '';
}

const ECONOMY_TERM_METHODS = {
  '경제 주체': '자료 속 소비자, 기업, 노동자, 정부 중 관련 있는 주체를 골라요. 이 변화로 누가 이익을 얻고 누가 비용을 부담하는지 각각 살펴보세요.',
  '환율': '같은 달러 금액을 변동 전후의 환율로 원화로 바꿔요. 내 역할에서 그 돈을 받는지, 내는지 구분하고 환율이 판단을 바꾸는지 적어 보세요.',
  '분산투자': '한 종목에 넣었을 때와 여러 업종에 나눴을 때 손익을 계산해요. 투자 대상이 같은 사건에 함께 영향을 받을 수도 있는지 살펴보세요.',
  '대출 금리': '대출액에 연 금리를 곱해 한 해 이자를 구해요. 금리가 오르기 전과 후의 이자를 영업이익에서 빼서 두 기업을 비교해요.',
  '정보의 비대칭': '기업이 공개한 정보와 시장에 퍼진 소문을 구분해요. 결정하기 전에 누가 어떤 정보를 알고 있는지, 무엇을 더 확인할지 적어요.',
  '관세': '관세율이 바뀌면 수입 비용이 어떻게 달라지는지 살펴요. 비용 변화가 매장 가격에 얼마나 반영되는지에 따라 각 주체의 입장을 비교해요.',
  '수요 변화': '누가 어떤 상품을 더 찾거나 덜 찾았는지 살펴요. 소비액만 보인다면 가격과 구매량 중 무엇이 달라졌는지 확인할 자료를 찾아보세요.',
  '합리적 선택': '누가 어떤 선택지 중에서 골라야 하는지 정해요. 각 선택의 비용과 편익을 비교하고 어떤 조건에서 판단이 달라지는지 설명해 보세요.',
  '생산과 분배': '어디에서 생산했는지와 그 소득이 누구에게 돌아가는지 구분해요. 두 지표의 범위를 확인하고 소득이 전달되는 경로를 설명해 보세요.',
  '지속 가능한 지역 경제': '선택이 주민 생활, 지역 일자리, 환경에 미칠 영향을 나누어 살펴요. 효과가 지속되려면 어떤 조건이 필요한지 적어 보세요.',
  '외부 효과': '거래나 사업에 직접 참여하지 않은 사람이 받는 이익이나 피해를 찾아요. 자료 속에서 누가 어떤 영향을 받는지 설명해 보세요.',
  '지속가능발전': '지역 경제, 주민 생활, 환경에 미치는 영향을 함께 살펴요. 지금과 앞으로 필요한 조건을 나누어 설명해 보세요.',
  '비용과 편익': '대안별로 얻는 것과 부담하는 것을 적어요. 같은 기준으로 비교하고 그 비용과 편익이 누구에게 돌아가는지 살펴보세요.',
  '시장실패': '시장 거래만으로 해결하기 어려운 문제가 무엇인지 찾아요. 자료에서 비용이나 피해를 누가 부담하는지 살펴보세요.',
  '금융 자산과 자산 관리': '수익, 위험, 필요할 때 현금으로 바꿀 수 있는 정도를 비교해요. 선택이 목적과 기간에 맞는지 설명해 보세요.',
  '분업과 무역': '지역마다 어떤 상품을 생산하고 교환하는지 찾아요. 생산을 맡는 방식이 바뀌면 비용과 이익이 어떻게 달라질지 비교해 보세요.'
};
const GENERAL_ECONOMY_TERMS = ['합리적 선택', '시장실패', '금융 자산과 자산 관리', '분업과 무역', '지속가능발전', '경제 주체'];
const economyTermKey = set => set ? guidedKey(set, 'term') : 'economicTerm';

function economyTermGuide(set, optionalWriting = false) {
  const key = economyTermKey(set);
  const terms = set?.concepts || GENERAL_ECONOMY_TERMS;
  const selected = work().answers[key];
  return `<section class="worksheet-section thought"><h2>경제 용어 적용 방법</h2>
    <p>고른 정보에서 확인한 사실을 어떤 경제 용어로 설명할 수 있을까요?</p>
    <div class="field"><label for="economy-term">적용 방법을 알아볼 용어</label><select id="economy-term" data-term-key="${key}">
      <option value="">경제 용어를 골라 보세요</option>${terms.map(term => `<option${term === selected ? ' selected' : ''}>${esc(term)}</option>`).join('')}</select>
      <p id="economy-term-method" class="field-hint" role="status">${terms.includes(selected) ? esc(ECONOMY_TERM_METHODS[selected]) : ''}</p></div>
    ${set ? optionalWriting ? `<details class="supplement"><summary>경제 용어를 적용한 설명 더 쓰기</summary>${guidedWriting(set,['explain'])}</details>` : guidedWriting(set,['explain']) : ''}</section>`;
}

function guidedExplorer() {
  if (activeTask() !== 'economy' || typeof ECONOMY_GUIDED_SETS === 'undefined') return '';
  const selected = economyGuided();
  const groups = new Map(['생활·지역 경제','환율·투자','국제 무역'].map(group => [group, []]));
  for (const set of ECONOMY_GUIDED_SETS) {
    const group = set.group || '생활·지역 경제';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(set);
  }
  return `<div class="economy-topics">${[...groups].map(([group,sets]) => `<section><h2>${esc(group)}</h2>
    <ul class="economy-topic-grid">${sets.map(set => `<li><button type="button" data-guided-set="${esc(set.id)}">
    <span><strong>${esc(set.label)}</strong><small>${esc(set.decision.question)}</small></span>
    ${set.id === selected?.id ? '<span class="topic-resume">이어서</span>' : ''}</button></li>`).join('')}</ul></section>`).join('')}</div>
    <button type="button" data-guided-set="custom">직접 정한 주제로 탐구하기</button>`;
}
const guidedEvidenceKey = (set, kind, index) => guidedKey(set, `evidence_${kind}_${index}`);

function guidedSourceEntries(set) {
  const entries = [
    { kind: 'primary', title: '주요 자료', table: set.primary },
    { kind: 'comparison', title: '비교 자료', table: set.comparison },
    ...(set.additional || []).map((table, index) => ({ kind: table.id, title: `자료 ${index + 3}`, table }))
  ];
  const sourceNumbers = new Map();
  return entries.map(entry => {
    const url = entry.table.sourceUrl;
    if (!sourceNumbers.has(url)) sourceNumbers.set(url, sourceNumbers.size + 1);
    return { ...entry, sourceNumber: sourceNumbers.get(url) };
  });
}

const guidedRowPicked = (set, kind, index) => work().answers[guidedEvidenceKey(set,kind,index)] === 'yes';
const guidedSourcePicked = (set, { kind, table }) => table.rows.some((_, index) => guidedRowPicked(set,kind,index));

function guidedSourceGroups(set) {
  const groups = new Map();
  for (const entry of guidedSourceEntries(set)) {
    const { sourceNumber, table, kind } = entry;
    if (!groups.has(sourceNumber)) groups.set(sourceNumber,{
      sourceNumber, table, first:kind === 'primary' || kind === 'comparison', entries:[]
    });
    groups.get(sourceNumber).entries.push(entry);
  }
  return [...groups.values()];
}

const guidedSourceKey = (set, sourceNumber, part) => guidedKey(set,`source_${sourceNumber}_${part}`);
const guidedSourceAnswer = (set, sourceNumber, part) => work().answers[guidedSourceKey(set,sourceNumber,part)];
const guidedSourceRecorded = (set, { sourceNumber }) =>
  ['excerpt','use'].every(part=>filled(guidedSourceAnswer(set,sourceNumber,part)));

function guidedSourceCount(set, recorded = false) {
  return guidedSourceGroups(set).filter(group=>!recorded || guidedSourceRecorded(set,group)).length;
}

const guidedNumberFormat = new Intl.NumberFormat('ko-KR');
const guidedValue = value => typeof value === 'number' ? guidedNumberFormat.format(value) : value;

function guidedReferenceTable(table) {
  return `<div class="stat-table-wrap"><table class="stat-table"><caption>${esc(table.title)}</caption>
    <thead><tr>${table.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${table.rows.map(([label,...values])=>`<tr><th scope="row">${esc(label)}</th>${values.map(value=>`<td>${esc(guidedValue(value))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
}

function guidedSource(set, { table, entries, sourceNumber }, editable) {
  const excerpt = guidedSourceKey(set,sourceNumber,'excerpt');
  const use = guidedSourceKey(set,sourceNumber,'use');
  const reading = ECONOMY_SOURCE_READING[table.sourceUrl];
  return `<article class="official-card" data-source-number="${sourceNumber}">
    <h3>${sourceNumber}. ${esc(table.sourceTitle)}</h3>
    <p class="stat-meta">${esc(table.publisher)} · ${esc(table.dateLabel || '발표')} ${esc(table.published)}</p>
    <a href="${esc(table.sourceUrl)}" target="_blank" rel="noopener noreferrer">원문 열기</a>
    ${reading?.pdf ? ` · <a href="${esc(reading.pdf)}" target="_blank" rel="noopener noreferrer">원문 PDF</a>` : ''}
    <ul class="guided-source-locations">${[...new Set(entries.map(({table})=>table.sourcePage))].map(location=>`<li>${esc(location)}</li>`).join('')}
      ${reading?.find ? `<li>원문 검색어 <strong lang="en">${esc(reading.find)}</strong></li>` : ''}</ul>
    ${editable ? input(excerpt,'원문에서 찾은 근거','쪽수·표 이름과 함께 숫자나 문장을 적어요.',guidedSourceAnswer(set,sourceNumber,'excerpt'),{area:true,limit:210}) +
      input(use,'이 근거로 설명할 점','내 판단에 이 정보가 왜 필요한지 한 줄로 적어요.',guidedSourceAnswer(set,sourceNumber,'use'),{area:true,limit:150}) : ''}
    <details class="supplement"><summary>찾은 근거 대조하기</summary>${entries.map(({table})=>guidedReferenceTable(table)).join('')}</details>
    </article>`;
}

function guidedMaterials(set, part = 'all') {
  const editable = part !== 'all';
  const groups = guidedSourceGroups(set).filter(group=>part === 'all' || group.first === (part === 'initial'));
  const title = part === 'initial' ? '원문에서 첫 근거 찾기' : part === 'supplement' ? '첫 의견을 확인할 원문' : '원문 자료';
  return `<section class="economy-materials"><h2>${guidedEsc(title)}</h2>
    ${editable ? `<p>원문을 열고 안내된 쪽이나 표에서 근거를 찾아요.</p><p class="field-hint">제공 원문 ${guidedSourceCount(set)}곳 · <strong id="guided-source-count" role="status">근거를 기록한 원문 ${guidedSourceCount(set,true)}곳</strong></p>` : ''}
    ${groups.map(group=>guidedSource(set,group,editable)).join('')}
    </section>`;
}

function guidedReviewCase(set) {
  const review = ECONOMY_REVIEW_CASES[set.id];
  if (!review) return '';
  const extra = ECONOMY_REVIEW_ADDENDA[set.id];
  return `<section class="economy-materials guided-review-case"><h2>첫 의견을 다시 볼 자료</h2>
    <h3>${guidedEsc(review.title)}</h3>
    <p>${guidedEsc(review.common)}</p>
    <div class="stat-table-wrap"><table class="stat-table">
      <caption class="sr-only">${guidedEsc(review.title)} 모의 자료</caption>
      <thead><tr><th scope="col">모의 상황</th><th scope="col">상황별로 주어진 정보</th></tr></thead>
      <tbody>${review.rows.map(([label,detail]) => `<tr><th scope="row">${guidedEsc(label)}</th><td>${guidedEsc(detail)}</td></tr>`).join('')}</tbody>
    </table></div>
    ${extra ? `<p class="guided-review-support"><strong>${guidedEsc(extra[0])}</strong> ${guidedEsc(extra[1])}</p>` : ''}
    <p class="field-hint">${guidedEsc(review.prompt)}</p>
    </section>`;
}

function guidedRegionTable(data, forReport = false) {
  return `<table class="${forReport ? 'paper-picked paper-local-table' : 'stat-table'}">
    ${forReport ? '' : `<caption>${esc(data.title)}</caption>`}
    <thead><tr><th scope="col">지표</th>${data.periods.map(period=>`<th scope="col">${esc(period)}</th>`).join('')}</tr></thead>
    <tbody>${data.rows.map(([label,...cells])=>`<tr><th scope="row">${esc(label)}</th>${cells.map(cell=>`<td>${esc(guidedValue(cell))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
}

function guidedRegionSources(data) {
  return data.sources.map(([publisher,title,url,section]) =>
    `<p>${esc(publisher)} · <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a> · ${esc(section)}</p>`).join('');
}

function guidedRegionMaterial(data) {
  return `<section class="economy-materials guided-region-material"><h2>실제 지역 자료 · ${esc(data.region)}</h2>
    <h3>${esc(data.title)}</h3>
    <p>${esc(data.task)}</p>
    <div class="stat-citation">${guidedRegionSources(data)}</div>
    <details class="supplement"><summary>찾은 수치 대조하기</summary>
      <div class="stat-table-wrap">${guidedRegionTable(data)}</div>
      <p>${esc(data.clue)}</p></details></section>`;
}

function guidedRegionAnalysis(set) {
  const data = ECONOMY_LOCAL_CASES[set.id];
  return `<section class="worksheet-section thought guided-region-analysis"><h2>${esc(data.region)}의 변화 분석</h2>
    <details class="supplement"><summary>실제 지역 자료 다시 보기</summary>${guidedRegionMaterial(data)}</details>
    ${guidedDecisionInputs(set,['regionalChange','regionalCause'])}</section>`;
}

function guidedRegionReport(set) {
  const data = ECONOMY_LOCAL_CASES[set.id];
  const fields = guidedDecisionFields(set);
  const answers = work().answers;
  const parts = ['regionalChange','regionalCause'].filter(part=>filled(answers[guidedKey(set,part)]));
  if (!parts.length) return '';
  return `<section class="paper-section paper-local-analysis"><h3>실제 지역의 변화와 이유 · ${esc(data.region)}</h3>
    <h4>${esc(data.title)}</h4>
    ${guidedRegionTable(data,true)}
    ${parts.map(part=>`<section><h4>${esc(fields[part][0])}</h4><p>${esc(answers[guidedKey(set,part)])}</p></section>`).join('')}
    <section class="paper-sources"><h4>지역 자료 출처</h4>${guidedRegionSources(data)}</section></section>`;
}

function guidedSelectedRows(set) {
  return guidedSourceEntries(set).flatMap(({ kind, title, table, sourceNumber }) =>
    table.rows.flatMap((row,index) => guidedRowPicked(set,kind,index)
      ? [{ label:`${title} · ${guidedEsc(row[0])}`, sourceNumber, detail:
        row.slice(1).map((value,i)=>`${guidedEsc(table.headers[i+1])}: ${guidedEsc(guidedValue(value))}`).join(' · ') +
        (typeof row[1] === 'number' ? ` (단위 ${guidedEsc(table.unit)})` : '') }] : []));
}

function guidedEvidenceSummary(set, forReport = false) {
  const groups = guidedWrittenSources(set);
  const selected = guidedSelectedRows(set);
  const count = `<p class="field-hint">근거를 기록한 원문 ${guidedSourceCount(set,true)}곳</p>`;
  if (forReport) {
    const written = groups.length ? count + `<table class="paper-picked">
      <thead><tr><th scope="col">원문</th><th scope="col">찾은 근거와 활용</th></tr></thead><tbody>
      ${groups.map(({sourceNumber,table,excerpt,use})=>`<tr><th scope="row">${sourceNumber}. ${esc(table.publisher)}</th><td>
        ${esc(excerpt)}${filled(use) ? `<span><strong>이 근거로 설명할 점</strong> ${esc(use)}</span>` : ''}</td></tr>`).join('')}</tbody></table>` : '';
    const legacy = selected.length ? `<h4>이전에 표시한 자료</h4><table class="paper-picked">
      <thead><tr><th scope="col">표시한 항목</th><th scope="col">자료 내용</th></tr></thead><tbody>
      ${selected.map(({label,sourceNumber,detail})=>`<tr><th scope="row">${label}<span>출처 ${sourceNumber}</span></th><td>${detail}</td></tr>`).join('')}</tbody></table>` : '';
    return written + legacy;
  }
  const written = groups.length ? count + `<ul class="guided-evidence-list">${groups.map(({sourceNumber,table,excerpt,use}) =>
    `<li><a href="${esc(table.sourceUrl)}" target="_blank" rel="noopener noreferrer">${sourceNumber}. ${esc(table.publisher)}</a>
      <span>${esc(excerpt)}</span>${filled(use) ? `<span><strong>이 근거로 설명할 점</strong> ${esc(use)}</span>` : ''}</li>`).join('')}</ul>` : '';
  const legacy = selected.length ? `<details class="supplement"><summary>이전에 표시한 자료</summary>
    <ul class="guided-evidence-list">${selected.map(({label,sourceNumber,detail}) =>
    `<li><strong>${label}</strong><span>출처 ${sourceNumber} · ${detail}</span></li>`).join('')}</ul></details>` : '';
  return written + legacy;
}

function guidedWrittenSources(set) {
  return guidedSourceGroups(set).map(group=>({
    ...group,
    excerpt:guidedSourceAnswer(set,group.sourceNumber,'excerpt'),
    use:guidedSourceAnswer(set,group.sourceNumber,'use')
  })).filter(({excerpt,use})=>filled(excerpt) || filled(use));
}

function guidedThinkingClue(set, revisit = false) {
  const [first,second] = ECONOMY_THINKING_CLUES[set.id];
  return economyQuestionSummary(revisit ? '첫 의견을 다시 볼 단서' : '원문에서 찾을 단서',revisit ? second : first);
}
function guidedFields(set) {
  return [
    ['read','고른 정보에서 확인한 사실','어느 지역의 어느 시점 자료인지 밝히고, 질문과 관련 있는 수치나 제도 내용을 적어요.'],
    ['compare','정보를 비교하면 무엇이 보이나요?','비교 기준을 정하고 공통점이나 차이를 적어요. 자료의 기간·대상·지표가 서로 다르면 어디까지 비교할 수 있는지도 밝혀요.'],
    ['explain','고른 경제 용어를 내 자료에 적용해요','어떤 사실을 근거로 삼았는지 밝히고, 그 용어로 설명할 수 있는 현상이나 선택을 적어요.'],
    ['check','내 설명에서 더 확인할 점','고른 정보로 판단할 수 있는 범위와, 설명을 확인하려면 어떤 근거가 더 필요한지 적어요.'],
    ['local','내가 조사할 지역에 적용하면?',set.localPrompt]
  ].map(([kind,title,hint])=>({kind,key:guidedKey(set,kind),title:anonymizeGuidedText(title),hint:anonymizeGuidedText(hint)}));
}
function guidedWriting(set, kinds) {
  return guidedFields(set).filter(field => kinds.includes(field.kind)).map(field =>
    input(field.key,field.title,'내 답을 적어요.',work().answers[field.key],{area:true,limit:250,hint:field.hint})).join('');
}

function guidedDecisionPrompt(set) {
  return `<p><strong>${esc(set.decision.question)}</strong></p>
    ${set.decision.scenario ? economyQuestionSummary('모의 상황',set.decision.scenario) : ''}
    <ul class="guided-evidence-list">${set.decision.options.map(option => `<li>${guidedEsc(option)}</li>`).join('')}</ul>`;
}

function guidedRole(set) {
  const role = work().answers[guidedKey(set,'position')];
  return set.roles.includes(role) ? role : '';
}

function guidedRolePicker(set) {
  const selected = guidedRole(set);
  return `<div class="field"><label for="economy-role">나는 어떤 입장에서 의견을 낼까요?</label>
    <select id="economy-role" data-guided-role><option value="">경제 주체 고르기</option>${set.roles.map(role =>
      `<option value="${esc(role)}"${role === selected ? ' selected' : ''}>${esc(role)}</option>`).join('')}</select></div>`;
}

function guidedDecisionFields(set) {
  const [first, second] = set.decision.options;
  return {
    criterion: ['내 입장에서 가장 중요한 기준', set.decision.criterionHint || '내가 맡은 역할에서 무엇을 가장 중요하게 볼지 정해요.'],
    initialOpinion: ['지금 내 의견과 그 이유', '내 입장에서 무엇을 선택할지, 그 이유를 처음 읽은 자료와 연결해요.'],
    evidenceQuestion: ['먼저 확인할 단서', '위 단서에서 먼저 찾아볼 수치나 내용을 하나 적어요.'],
    supplementAnalysis: ['새 자료에서 알게 된 점', '새 자료에서 확인한 수치나 조건이 첫 의견을 유지하거나 바꾸는 데 어떻게 도움이 됐나요?'],
    optionFirst: [first, '내가 정한 기준으로 이 방안에서 얻는 점과 부담을 적어요. 근거가 된 수치나 조건을 넣어요.'],
    optionSecond: [second, '같은 기준으로 이 방안과 앞의 방안을 비교해요. 어느 조건에서 이 방안이 나은지 살펴봐요.'],
    regionalChange: ['지역에서 무엇이 얼마나 달라졌나요?', '원문 쪽수나 표 이름, 같은 지표의 두 시점 값과 단위를 적고 차이를 구해요.'],
    regionalCause: ['무엇이 이 변화를 설명하나요?', '원문의 설명이나 표의 다른 수치를 근거로 써요. 이유를 확인하기 어렵다면 어떤 정보가 더 필요한지 적어요.'],
    finalChoice: ['내 최종 의견과 그 이유', '지역에서 확인한 변화가 내 선택에 어떤 영향을 주었는지 써요. 다른 경제 주체에게 미칠 영향도 생각해요.'],
    changeCondition: ['언제 내 판단이 바뀔까요?', '어떤 사실이 확인되면 다른 방안을 고를지, 누가 무엇을 확인하면 좋을지 적어요.'],
    decisionSummary: ['탐구 내용 한 줄 정리', '처음 생각과 비교해 무엇이 달라졌거나 더 분명해졌나요?']
  };
}

function guidedDecisionInputs(set, parts) {
  const fields = guidedDecisionFields(set);
  return parts.map(part => {
    const key = guidedKey(set,part);
    const [title,hint] = fields[part];
    return input(key,guidedEsc(title),'',work().answers[key],{area:part !== 'decisionSummary',limit:part === 'decisionSummary' ? 100 : 250,hint:guidedEsc(hint)});
  }).join('');
}

function guidedDecisionSummary(set, part) {
  return economyQuestionSummary(guidedEsc(guidedDecisionFields(set)[part][0]),work().answers[guidedKey(set,part)]);
}

function guidedDecisionReport(set, title, parts) {
  const fields = guidedDecisionFields(set);
  const written = parts.filter(part => filled(work().answers[guidedKey(set,part)]));
  if (!written.length) return '';
  return `<section class="paper-section"><h3>${esc(title)}</h3>${written.map(part =>
    `<section><h4>${guidedEsc(fields[part][0])}</h4><p>${esc(work().answers[guidedKey(set,part)])}</p></section>`).join('')}</section>`;
}
function guidedCheckFeedback(set) {
  const a=work().answers, messages=[];
  if(set.numeric) {
    const raw=(a[guidedKey(set,'calculation')]||'').trim().replaceAll(',','');
    if(!raw) messages.push('계산 결과를 먼저 입력해 주세요.');
    else if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) messages.push('계산 칸에는 단위 없이 숫자만 적어 주세요.');
    else messages.push(Math.abs(Number(raw)-set.numeric.answer)<=(set.numeric.tolerance ?? 0.01) ? `계산값이 맞아요. ${set.numeric.formula} (단위: ${set.numeric.unit})` : `계산을 다시 확인해요. ${set.numeric.formula} (단위: ${set.numeric.unit}). 차이와 변화율, %와 %포인트를 구분해요.`);
  }
  const choice=a[guidedKey(set,'interpretation')];
  if(choice===undefined || choice==='') messages.push('자료 해석 문항의 답을 선택해 주세요.');
  else messages.push((Number(choice)===set.interpretation.correctIndex ? '자료 해석이 적절해요. ' : '자료의 범위를 다시 살펴요. ') + set.interpretation.explanation);
  return anonymizeGuidedText(messages.join('\n'));
}
function guidedReadingEditor(set) {
  const a=work().answers, choiceKey=guidedKey(set,'interpretation');
  const selected = guidedEvidenceSummary(set);
  return `<details class="supplement guided-comparison-evidence"><summary>고른 근거 다시 보기</summary>
    ${economyQuestionSummary('탐구 질문', economyInquiry())}
    ${selected || '<p>앞 단계에서 원문을 읽고 찾은 근거를 적으면 여기에 모여요.</p>'}
    ${economyQuestionSummary('근거를 고른 이유', economyEvidenceReason())}
    <details class="supplement"><summary>자료 전체 다시 보기</summary>${guidedMaterials(set)}</details>
    ${set.interpretation ? `<details class="supplement"><summary>계산과 자료 해석 연습</summary>
    ${set.numeric ? input(guidedKey(set,'calculation'),anonymizeGuidedText(set.numeric.question),`숫자만 입력 · ${set.numeric.unit}`,a[guidedKey(set,'calculation')]) : ''}
    <fieldset class="checklist" id="${choiceKey}"><legend>${guidedEsc(set.interpretation.question)}</legend>${set.interpretation.options.map((opt,i)=>`<label><input type="radio" name="${choiceKey}" data-key="${choiceKey}" value="${i}" ${a[choiceKey]===String(i)?'checked':''}><span>${guidedEsc(opt)}</span></label>`).join('')}</fieldset>
    <button type="button" id="guided-check">내 풀이 확인하기</button><p id="guided-feedback" role="status" aria-live="polite" style="white-space:pre-line"></p></details>` : ''}</details>`;
}
function guidedReadingReport(set) {
  const fields=guidedFields(set).filter(f=>['read','compare'].includes(f.kind) && filled(work().answers[f.key]));
  return fields.length ? guidedReportFields(fields) : '';
}

function guidedReportFields(fields) {
  return `<div class="paper-analysis">${fields.map(f=>`<section><h4>${guidedEsc(f.title)}</h4><p>${esc(work().answers[f.key])}</p></section>`).join('')}</div>`;
}

function guidedSupplementReport(set) {
  const fields=guidedFields(set).filter(f=>!['read','compare'].includes(f.kind) && filled(work().answers[f.key]));
  const calculation=work().answers[guidedKey(set,'calculation')];
  const choice=work().answers[guidedKey(set,'interpretation')];
  const evidence=guidedEvidenceSummary(set,true);
  const term=work().answers[economyTermKey(set)];
  if(!fields.length && !filled(calculation) && !filled(choice) && !evidence && !filled(term)) return '';
  const recorded = guidedWrittenSources(set);
  const legacy = guidedSourceEntries(set).filter(entry=>guidedSourcePicked(set,entry));
  const sources = new Map([...recorded,...legacy].map(entry=>[entry.sourceNumber,entry.table]));
  return `<section class="paper-section"><h3>자료 근거와 경제 용어</h3>
    ${set.numeric && filled(calculation)?`<section><h4>${guidedEsc(set.numeric.question)}</h4><p>내 계산: ${esc(calculation)} ${guidedEsc(set.numeric.unit)}</p></section>`:''}
    ${set.interpretation && filled(choice)?`<section><h4>${guidedEsc(set.interpretation.question)}</h4><p>내 선택: ${guidedEsc(set.interpretation.options[Number(choice)] || '')}</p></section>`:''}
    ${evidence}
    ${set.concepts.includes(term) ? `<p><strong>적용한 경제 용어</strong> ${esc(term)}</p>` : ''}
    ${guidedReportFields(fields)}
    ${sources.size ? `<section class="paper-sources"><h4>원문 출처</h4>${[...sources].sort(([a],[b])=>a-b).map(([number,table]) =>
      `<p>${number}. ${esc(table.publisher)} · <a href="${esc(table.sourceUrl)}">${esc(table.sourceTitle)}</a></p>`).join('')}</section>` : ''}</section>`;
}

function guidedVoiceReport(set) {
  const role = guidedRole(set);
  const opinion = work().answers[guidedKey(set,'finalChoice')];
  if (!filled(opinion) && !role) return '';
  return `<section class="paper-stance">
    ${role ? `<p class="paper-perspective">${esc(role)}의 입장</p>` : ''}
    ${filled(opinion) ? `<h3>나의 최종 의견</h3><p>${esc(opinion)}</p>` : ''}
    </section>`;
}
