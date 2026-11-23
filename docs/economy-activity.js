'use strict';

function officialStat(source) {
  return source.statId ? ECONOMY_DATA.charts[source.statId] : null;
}

function officialTable(chart, compact = false) {
  return `<div class="stat-table-wrap"><table class="stat-table"><caption>${compact ? '값 확인' : esc(chart.title)} · ${esc(chart.unit)}</caption>
    <thead><tr><th scope="col">구분</th>${chart.series.map(series => `<th class="num" scope="col">${esc(series.name)}</th>`).join('')}</tr></thead>
    <tbody>${chart.labels.map((label, index) => `<tr><th scope="row">${esc(label)}</th>
      ${chart.series.map(series => `<td class="num">${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(series.values[index])}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function officialGraph(id, compact = false, printContext = compact) {
  const chart = ECONOMY_DATA.charts[id];
  if (!chart) return '';
  return `<div class="official-graph">
    <p class="stat-meta">${esc(chart.region)} · ${esc(chart.period)} · 단위 ${esc(chart.unit)}</p>
    <img class="stat-image" src="assets/economy/${id}.svg" width="700" height="360" alt="${esc(chart.title)}. 정확한 값은 바로 아래 표에서 확인할 수 있어요.">
    ${officialTable(chart, compact)}
    <p class="stat-citation">${printContext ? economyPaperLink(chart.publisher + ' · ' + chart.sourceTitle,chart.sourceUrl) :
      `<a href="${esc(chart.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(chart.publisher)} · ${esc(chart.sourceTitle)}</a>`}
      <span>${esc(chart.sourcePage)} · 발표 ${esc(chart.published)}</span></p>
  </div>`;
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

// Guided source sets are optional: legacy packs and every existing answer stay intact.
function economyGuided() {
  if (activeTask() !== 'economy' || typeof ECONOMY_GUIDED_SETS === 'undefined') return null;
  return ECONOMY_GUIDED_SETS.find(set => set.id === work().answers.guidedSetId) || null;
}
function guidedKey(set, part) { return `guided_${set.id}_${part}`; }

function economyInquiry() {
  const set = economyGuided();
  const a = work().answers;
  const current = a[economyQuestionKey(set)];
  return filled(current) ? current : set?.decision.question || a.refinedInquiry || a.inquiry;
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

function economyTermGuide(set) {
  const key = economyTermKey(set);
  const terms = set?.concepts || GENERAL_ECONOMY_TERMS;
  const selected = work().answers[key];
  return `<section class="economy-write"><h2>경제 개념으로 현상 설명하기</h2>
    <p>고른 정보에서 확인한 사실을 어떤 경제 용어로 설명할 수 있을까요?</p>
    <div class="field"><label for="economy-term">적용할 경제 개념</label><select id="economy-term" data-term-key="${key}">
      <option value="">경제 용어를 골라 보세요</option>${terms.map(term => `<option${term === selected ? ' selected' : ''}>${esc(term)}</option>`).join('')}</select>
      <p id="economy-term-method" class="field-hint" role="status">${terms.includes(selected) ? esc(ECONOMY_TERM_METHODS[selected]) : ''}</p></div>
    ${economyInput(set ? guidedKey(set,'explain') : 'concepts','선택한 경제 개념으로 변화와 원인을 설명해 보세요',
      '자료에 적은 사실을 들어 원인이나 경제 주체의 선택을 설명해요.',300,
      (set ? work().answers[guidedKey(set,'explain')] : undefined) ?? work().answers.concepts)}</section>`;
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

function guidedSourceEntries(set, original = false) {
  const entries = [
    { kind: 'primary', title: '주요 자료', table: set.primary },
    { kind: 'comparison', title: '비교 자료', table: set.comparison },
    ...(set.additional || []).map((table, index) => ({ kind: table.id, title: `자료 ${index + 3}`, table }))
  ];
  const sourceNumbers = new Map();
  return entries.map(entry => {
    const url = entry.table.sourceUrl;
    if (!sourceNumbers.has(url)) sourceNumbers.set(url, sourceNumbers.size + 1);
    const sourceNumber = sourceNumbers.get(url);
    const replacement = !original && ECONOMY_KOREAN_SOURCES[set.id]?.[entry.kind];
    return { ...entry, sourceNumber, table: replacement || entry.table,
      storageId: replacement ? 'ko_'+entry.kind : sourceNumber };
  });
}

const guidedRowPicked = (set, kind, index) => work().answers[guidedEvidenceKey(set,kind,index)] === 'yes';
const guidedSourcePicked = (set, { kind, table }) => table.rows.some((_, index) => guidedRowPicked(set,kind,index));

function guidedSourceGroups(set, original = false) {
  const groups = new Map();
  for (const entry of guidedSourceEntries(set,original)) {
    const { sourceNumber, storageId, table, kind } = entry;
    if (!groups.has(storageId)) groups.set(storageId,{sourceNumber,storageId,table,first:kind === 'primary' || kind === 'comparison',entries:[]});
    groups.get(storageId).entries.push(entry);
  }
  return [...groups.values()];
}

const guidedSourceKey = (set,id,part) => guidedKey(set,`source_${id}_${part}`);
const guidedSourceAnswer = (set,id,part) => work().answers[guidedSourceKey(set,id,part)];
const guidedSourceRecorded = (set,group) => filled(guidedSourceAnswer(set,group.storageId,'excerpt'));

const numericCell = value => typeof value === 'number' ? ' class="num"' : '';
const guidedNumberFormat = new Intl.NumberFormat('ko-KR');
const guidedValue = value => typeof value === 'number' ? guidedNumberFormat.format(value) : value;
const studyDate = table => esc([table.dateLabel || '발표',table.published].filter(Boolean).join(' '));

function guidedReferenceTable(table) {
  const numeric = table.rows.some(row=>row.slice(1).some(value=>typeof value === 'number'));
  const scope = numeric ? ` · ${esc(table.unit)}` : '';
  const title = table.title.replace(/^(주요 주제|비교 주제):\s*/,'');
  return `<div class="stat-table-wrap"><table class="stat-table"><caption>${esc(title)}${scope}</caption>
    <thead><tr>${table.headers.map((h,index)=>`<th scope="col"${index && table.rows.every(row=>typeof row[index] === 'number') ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${table.rows.map(([label,...values])=>`<tr><th scope="row">${esc(label)}</th>${values.map(value=>`<td${numericCell(value)}>${esc(guidedValue(value))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
}

function guidedSource(set, {table,entries,sourceNumber,storageId}, editable) {
  return `<div class="guided-source" data-source-number="${sourceNumber}">
    ${entries.map(({table})=>guidedReferenceTable(table)).join('')}
    <p class="stat-citation">${esc(table.publisher)} · <a href="${esc(table.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(table.sourceTitle)}</a> · ${studyDate(table)}
      ${entries.map(({table})=>esc(table.sourcePage)).filter((location,index,all)=>all.indexOf(location)===index).join(' · ')}</p>
    ${editable ? economyInput(guidedSourceKey(set,storageId,'excerpt'),'자료에서 확인한 사실','수치, 단위, 시점이 드러나도록 적어요.',220) +
      economyInput(guidedSourceKey(set,storageId,'use'),'내 질문과 연결해 읽은 점','자료가 내 질문에 답하는 데 어떤 도움이 되나요?',180) : ''}
    </div>`;
}

const activeGuidedRegion = set => ECONOMY_LOCAL_CASES[set.id];
const guidedRegionWasUsed = set => ['regionalChange','regionalCause'].some(part=>filled(work().answers[guidedKey(set,part)]));

function guidedResearchVisuals(set, forReport = false) {
  if (forReport && !guidedWrittenSources(set).some(group=>filled(group.excerpt)) && !guidedRegionWasUsed(set)) return '';
  const charts = ECONOMY_GUIDED_CHARTS[set.id] || [];
  return forReport ? (charts.length ? `<div class="evidence-grid">${charts.map(id=>
    `<figure class="paper-official-figure"><figcaption>${esc(ECONOMY_DATA.charts[id].title)}</figcaption>${officialGraph(id,true)}</figure>`).join('')}</div>` : '') :
    charts.map(id=>officialGraph(id)).join('');
}

function guidedResearchCards(set, editable = true) {
  const [first,second,...extra] = guidedSourceGroups(set);
  const region = activeGuidedRegion(set);
  return `<div class="economy-facts">
    <section class="card-fact"><span class="economy-card-label">공식 자료</span><h2>주제에 관한 자료</h2>
      ${guidedResearchVisuals(set)}
      ${guidedSource(set,first,editable)}
    </section>
    <section class="card-fact"><span class="economy-card-label">공식 자료</span><h2>${region ? '지역 자료와 함께 읽기' : '함께 읽을 자료'}</h2>
      ${region ? guidedRegionMaterial(region,editable ? guidedDecisionInputs(set,['regionalChange','regionalCause']) : '') : ''}
      ${guidedSource(set,second,editable)}
    </section>
    ${extra.length ? `<details class="supplement"><summary>보충 발췌 자료</summary>${extra.map(group=>guidedSource(set,group,editable)).join('')}</details>` : ''}
    ${editable ? `<details class="supplement"><summary>처음 자료를 비교한 메모</summary>${guidedWriting(set,['read'])}</details>` : ''}
    </div>`;
}

function guidedReviewCase(set) {
  const review = ECONOMY_REVIEW_CASES[set.id];
  if (!review) return '';
  const extra = ECONOMY_REVIEW_ADDENDA[set.id];
  return `<section class="card-simulation guided-review-case"><span class="economy-card-label">가상 비교 조건</span><h2>조건이 달라지면</h2>
    <h3>${esc(review.title)}</h3>
    <p>${esc(review.common)}</p>
    <div class="stat-table-wrap"><table class="stat-table">
      <caption class="sr-only">${esc(review.title)} 모의 자료</caption>
      <thead><tr><th scope="col">모의 상황</th><th scope="col">상황별로 주어진 정보</th></tr></thead>
      <tbody>${review.rows.map(([label,detail]) => `<tr><th scope="row">${esc(label)}</th><td>${esc(detail)}</td></tr>`).join('')}</tbody>
    </table></div>
    ${extra ? `<p class="guided-review-support"><strong>${esc(extra[0])}</strong> ${esc(extra[1])}</p>` : ''}
    <p class="field-hint">${esc(review.prompt)}</p>
    </section>`;
}

function guidedRegionTable(data, forReport = false) {
  return `<table class="${forReport ? 'paper-picked paper-local-table' : 'stat-table'}">
    ${forReport ? '' : `<caption>${esc(data.title)}</caption>`}
    <thead><tr><th scope="col">지표</th>${data.periods.map((period,index)=>`<th scope="col"${data.rows.every(row=>typeof row[index+1] === 'number') ? ' class="num"' : ''}>${esc(period)}</th>`).join('')}</tr></thead>
    <tbody>${data.rows.map(([label,...cells])=>`<tr><th scope="row">${esc(label)}</th>${cells.map(cell=>`<td${numericCell(cell)}>${esc(guidedValue(cell))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
}

function guidedRegionSources(data, forReport = false) {
  return data.sources.map(([publisher,title,url,section]) =>
    `<p>${esc(publisher)} · ${forReport ? economyPaperLink(title,url) : `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`} · ${esc(section)}</p>`).join('');
}

function guidedRegionGraph(data) {
  const series = data.rows.find(([, ...values])=>values.every(value=>typeof value === 'number' && value >= 0) && values.some(value=>value > 0));
  if (!series) return '';
  const [label,...values] = series;
  const maximum = Math.max(...values);
  return `<figure class="guided-region-graph">
    <figcaption>${esc(label)}</figcaption>
    ${values.map((value,index)=>`<div class="guided-region-bar">
      <span>${esc(data.periods[index])}</span><span class="guided-region-track" aria-hidden="true"><span style="width:${value / maximum * 100}%"></span></span><strong>${esc(guidedValue(value))}</strong>
      </div>`).join('')}
    </figure>`;
}

function guidedRegionMaterial(data, answers = '') {
  const graph = guidedRegionGraph(data);
  return `<section class="guided-region-material"><h2>실제 지역 자료 · ${esc(data.region)}</h2>
    <p>${esc(data.task)}</p>
    <div class="stat-table-wrap">${guidedRegionTable(data)}</div>
    ${graph}
    <div class="stat-citation">${guidedRegionSources(data)}</div>
    <details class="supplement"><summary>변화의 이유를 찾는 단서</summary><p>${esc(data.clue)}</p></details>${answers}</section>`;
}

function guidedRegionReport(set, data = activeGuidedRegion(set)) {
  if (!data) return '';
  const answers = work().answers;
  const parts = ['regionalChange','regionalCause'].filter(part=>filled(answers[guidedKey(set,part)]));
  if (!parts.length) return '';
  return `<section class="paper-local-analysis"><h4>실제 지역의 변화와 이유 · ${esc(data.region)}
      <small class="paper-caption">${esc(data.title)}</small></h4>
    ${guidedRegionTable(data,true)}
    ${parts.map(part=>`<section><h5>${part === 'regionalChange' ? '지역 변화' : '변화의 이유와 자료의 범위'}</h5><p>${esc(answers[guidedKey(set,part)])}</p></section>`).join('')}
    <section class="paper-sources"><h5>지역 자료 출처</h5>${guidedRegionSources(data,true)}</section></section>`;
}

function guidedSelectedRows(set) {
  return guidedSourceEntries(set,true).flatMap(({ kind, title, table, sourceNumber }) =>
    table.rows.flatMap((row,index) => guidedRowPicked(set,kind,index)
      ? [{ label:`${title} · ${esc(row[0])}`, sourceNumber, detail:
        row.slice(1).map((value,i)=>`${esc(table.headers[i+1])}: ${esc(guidedValue(value))}`).join(' · ') +
        (typeof row[1] === 'number' ? ` (단위 ${esc(table.unit)})` : '') }] : []));
}

function guidedTextSources(sources) {
  return sources.filter(source=>hasSource(source) && !source._photo && !officialStat(source));
}

function guidedEvidenceTable(groups, extra = []) {
  const rows = groups.map(({table,excerpt,use})=>[
    `${esc(table.publisher)}<p class="paper-source-link">${economyPaperLink(table.sourceTitle,table.sourceUrl)} · ${studyDate(table)}</p>`,
    excerpt,use
  ]);
  for (const source of extra) {
    const origin = [source.author,source.date,sourceType(source),sourceScale(source)].filter(filled);
    const url = source.url?.trim();
    rows.push([
      `${esc(source.title || '직접 찾은 자료')}
      ${origin.length ? `<p class="paper-source-link">${esc(origin.join(' · '))}</p>` : ''}
      ${url ? `<p class="paper-source-link">${economyPaperLink('원문',url)}</p>` : ''}`,
      sourceFact(source),sourceThought(source)
    ]);
  }
  const written = rows.length ? `<table class="paper-picked paper-evidence-table">
    <thead><tr><th scope="col">자료와 출처</th><th scope="col">${'확인한 근거와 내 해석'}</th></tr></thead>
    <tbody>${rows.map(([citation,excerpt,use])=>`<tr><th scope="row">${citation}</th><td>
      ${filled(excerpt) ? `<p>${esc(excerpt)}</p>` : ''}
      ${filled(use) ? `<p class="paper-evidence-use"><strong>판단에 쓴 점</strong> ${esc(use)}</p>` : ''}
      </td></tr>`).join('')}</tbody></table>` : '';
  return written;
}

function guidedEvidenceSummary(set, extra = []) {
  return guidedEvidenceTable(set ? guidedWrittenSources(set) : [],extra);
}

function guidedWrittenSources(set, original = false) {
  return guidedSourceGroups(set,original).map(group=>({
    ...group,
    excerpt:guidedSourceAnswer(set,group.storageId,'excerpt'),
    use:guidedSourceAnswer(set,group.storageId,'use')
  })).filter(({excerpt,use})=>filled(excerpt) || filled(use));
}

function guidedFields(set) {
  return [
    ['read','자료를 읽고 해석한 점','두 수치나 내용을 비교해요. 어떤 차이가 있고, 그 차이가 무엇을 보여 주나요?'],
    ['compare','정보를 비교하면 무엇이 보이나요?','비교 기준을 정하고 공통점이나 차이를 적어요. 자료의 기간·대상·지표가 서로 다르면 어디까지 비교할 수 있는지도 밝혀요.'],
    ['explain','고른 경제 용어를 내 자료에 적용해요','어떤 사실을 근거로 삼았는지 밝히고, 그 용어로 설명할 수 있는 현상이나 선택을 적어요.'],
    ['check','내 설명에서 더 확인할 점','고른 정보로 판단할 수 있는 범위와, 설명을 확인하려면 어떤 근거가 더 필요한지 적어요.'],
    ['local','내가 조사할 지역에 적용하면?',set.localPrompt]
  ].map(([kind,title,hint])=>({kind,key:guidedKey(set,kind),title,hint}));
}
function guidedWriting(set, kinds) {
  return guidedFields(set).filter(field => kinds.includes(field.kind)).map(field =>
    input(field.key,field.title,'내 답을 적어요.',work().answers[field.key],{area:true,limit:250,hint:field.hint})).join('');
}

function guidedDecisionPrompt(set) {
  return `<p>${esc(ECONOMY_INQUIRY_STAKES[set.id])}</p>
    ${set.decision.scenario ? economyQuestionSummary('모의 상황',set.decision.scenario) : ''}
    <ul class="guided-evidence-list">${set.decision.options.map(option => `<li>${esc(option)}</li>`).join('')}</ul>`;
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
    criterion: ['가장 중요한 판단 기준', set.decision.criterionHint || '내가 맡은 역할에서 무엇을 가장 중요하게 볼지 정해요.'],
    initialOpinion: ['자료 보기 전 첫 생각 (선택)', '지금은 어느 쪽에 마음이 가나요? 자료를 읽은 후 바뀔 수 있어요.'],
    supplementAnalysis: ['처음 자료와 추가 자료를 비교한 결과', '자료 정리표를 보며 내 판단에 영향을 주는 수치나 조건을 골라요. 처음 자료와 비교했을 때 무슨 점이 더 분명해졌나요?'],
    optionFirst: [`대안 1 · ${first}`, '주어진 상황에서 이 방안을 택하면 내 입장에서 무엇을 얻고 무엇을 부담하나요? 자료의 수치나 조건을 넣어요.'],
    optionSecond: [`대안 2 · ${second}`, '같은 기준으로 이 방안의 이익과 부담을 따져요. 어느 조건에서 앞의 방안보다 유리한가요?'],
    regionalChange: ['지역에서 무엇이 얼마나 달라졌나요?', '같은 지표의 두 시점 값과 단위를 적고 차이를 구해요.'],
    regionalCause: ['무엇이 이 변화를 설명하나요?', '발췌 표의 다른 수치나 자료의 설명을 근거로 써요. 이유를 확인하기 어렵다면 어떤 정보가 더 필요한지 적어요.'],
    finalChoice: ['최종 결론과 핵심 근거', '주어진 상황에서 내 입장이라면 무엇을 선택하겠어요? 처음 의견과 추가 근거를 연결해, 그 선택으로 얻는 점과 감수할 부담을 설명해요.'],
    changeCondition: ['판단이 바뀔 조건과 자료의 한계', '어떤 사실이 확인되면 다른 방안을 고를지, 누가 무엇을 확인하면 좋을지 적어요.'],
    decisionSummary: ['탐구 내용 한 줄 정리', '처음 생각과 비교해 무엇이 달라졌거나 더 분명해졌나요?']
  };
}

function guidedDecisionInputs(set, parts) {
  const fields = guidedDecisionFields(set);
  return parts.map(part => {
    const key = guidedKey(set,part);
    const [title,hint] = fields[part];
    const limit = ({criterion:180,initialOpinion:150,finalChoice:300,changeCondition:200,decisionSummary:100})[part] || 250;
    return input(key,esc(title),'',work().answers[key],{area:part !== 'decisionSummary',limit,hint:esc(hint)});
  }).join('');
}

function guidedReportAnswers(set, parts) {
  const fields = guidedDecisionFields(set);
  const reportLabels = {
    criterion:'판단 기준', initialOpinion:'첫 판단', supplementAnalysis:'처음 자료와 추가 자료를 비교한 결과',
    finalChoice:'최종 판단', changeCondition:'판단이 바뀌는 조건', decisionSummary:'탐구를 통해 달라진 생각'
  };
  const written = parts.filter(part => filled(work().answers[guidedKey(set,part)]));
  return written.map(part =>
    `<section><h4>${esc(reportLabels[part] || fields[part][0])}</h4><p>${esc(work().answers[guidedKey(set,part)])}</p></section>`).join('');
}

function guidedComparisonReport(set) {
  const options = ['optionFirst','optionSecond'].flatMap((part,index)=>{
    const value = work().answers[guidedKey(set,part)];
    return filled(value) ? [[set.decision.options[index],value]] : [];
  });
  const comparison = options.length ? `<table class="paper-picked paper-comparison-table">
    <thead><tr><th scope="col">대안</th><th scope="col">내 판단 기준으로 비교한 결과</th></tr></thead>
    <tbody>${options.map(([label,value])=>`<tr><th scope="row">${esc(label)}</th><td>${esc(value)}</td></tr>`).join('')}</tbody>
    </table>` : '';
  const conditions = options.length && ECONOMY_REVIEW_CASES[set.id]?.common;
  const model = conditions ? `<p class="paper-caption"><strong>모의 비교 조건</strong> ${esc(conditions)}</p>` : '';
  return model + guidedReportAnswers(set,['supplementAnalysis']) + comparison;
}

function guidedReadingReport(set) {
  const fields=guidedFields(set).filter(f=>['read','compare'].includes(f.kind) && filled(work().answers[f.key]));
  return fields.length ? guidedReportFields(fields) : '';
}

function guidedReportFields(fields) {
  return fields.length ? `<div class="paper-analysis">${fields.map(f=>`<section><h4>${esc(f.title)}</h4><p>${esc(work().answers[f.key])}</p></section>`).join('')}</div>` : '';
}

function guidedArchivedReport(set) {
  const live = new Set(guidedSourceGroups(set).map(group=>group.storageId));
  const archive = guidedWrittenSources(set,true).filter(group=>!live.has(group.storageId));
  const selections = guidedSelectedRows(set);
  const sources = guidedSourceEntries(set,true).filter(entry=>guidedSourcePicked(set,entry));
  const cited = [...new Map(sources.map(entry=>[entry.sourceNumber,entry.table])).values()];
  const a = work().answers;
  const notes = [['initialInquiry','이전에 쓴 출발 질문'],['refinedInquiry','이전에 다듬은 질문'],
    ['evidenceReason','근거를 고른 이유'],['evidenceQuestion','먼저 확인하려던 단서']]
    .map(([part,label])=>economyQuestionSummary(label,a[guidedKey(set,part)])).join('');
  const oldFields = guidedFields(set).filter(field=>['check','local'].includes(field.kind) && filled(a[field.key]));
  const selected = selections.length ? `<table class="paper-picked"><thead><tr><th>이전에 표시한 자료</th><th>내용</th></tr></thead>
    <tbody>${selections.map(({label,sourceNumber,detail})=>`<tr><th scope="row">${label}<span>출처 ${sourceNumber}</span></th><td>${detail}</td></tr>`).join('')}</tbody></table>
    <div class="paper-sources">${cited.map(table=>`<p>${esc(table.publisher)} · ${economyPaperLink(table.sourceTitle,table.sourceUrl)}</p>`).join('')}</div>` : '';
  return notes + guidedEvidenceTable(archive) + selected + guidedReportFields(oldFields) +
    (ARCHIVED_ECONOMY_REGIONS.has(set.id) ? guidedRegionReport(set,ECONOMY_REGIONAL_SERIES[set.id]) : '');
}
