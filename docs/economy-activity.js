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

function officialGraph(id, compact = false, printContext = compact, showTable = true) {
  const chart = ECONOMY_DATA.charts[id];
  if (!chart) return '';
  return `<div class="official-graph">
    <p class="stat-meta">${esc(chart.region)} · ${esc(chart.period)} · 단위 ${esc(chart.unit)}</p>
    <img class="stat-image" src="assets/economy/${id}.svg" width="700" height="360" alt="${esc(chart.title)}. 정확한 값은 바로 아래 표에서 확인할 수 있어요.">
    ${showTable ? officialTable(chart, compact) + `
    <p class="stat-citation">${printContext ? economyPaperLink(chart.publisher + ' · ' + chart.sourceTitle,chart.sourceUrl) :
      `<a href="${esc(chart.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(chart.publisher)} · ${esc(chart.sourceTitle)}</a>`}
      <span>${esc(chart.sourcePage)} · 발표 ${esc(chart.published)}</span></p>` : ''}
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

const guidedQuestionVersionKey = set => guidedKey(set,'decisionGuideVersion');
const guidedUsesStarter = set => Boolean(set && work().answers[guidedQuestionVersionKey(set)] === '5');
const guidedStarterGuide = set => {
  const caseGuide = ECONOMY_CASE_INQUIRY_GUIDES[set.id];
  return {...(caseGuide || ECONOMY_PHENOMENON_GUIDES[set.id]), ...ECONOMY_START_GUIDES[set.id], regionalFirst: !caseGuide};
};
const guidedCaseAnalysis = set => {
  const caseGuide = set && ECONOMY_CASE_INQUIRY_GUIDES[set.id];
  if (!caseGuide) return null;
  return guidedUsesStarter(set) ? guidedStarterGuide(set) :
    work().answers[guidedQuestionVersionKey(set)] === '4' ? caseGuide : null;
};
const guidedPhenomenon = set => guidedCaseAnalysis(set) || (guidedUsesStarter(set) ? guidedStarterGuide(set) :
  set && work().answers[guidedQuestionVersionKey(set)] === '3' ? ECONOMY_PHENOMENON_GUIDES[set.id] : null);
const guidedInquiryGuide = set => guidedPhenomenon(set) || ECONOMY_REGION_INQUIRIES[set.id];
const guidedTopicLabel = set => guidedPhenomenon(set)?.label || set.label;

function usesPreviousGuidedQuestion(set, answers = work().answers) {
  const version = answers[guidedQuestionVersionKey(set)];
  if (version) return version === '1';
  return ['initialOpinionV3','criterion','finalChoice'].some(part=>filled(answers[guidedKey(set,part)]));
}

function guidedHasDraft(set, answers) {
  const prefix = guidedKey(set,'');
  const navigation = ['phase','phaseV2','phaseV3','phaseV4','decisionGuideVersion'];
  return Object.entries(answers).some(([key,value]) =>
    key.startsWith(prefix) && !navigation.includes(key.slice(prefix.length)) && filled(value));
}

function nextGuidedQuestionVersion(set, answers) {
  if (!guidedHasDraft(set,answers)) return '5';
  return answers[guidedQuestionVersionKey(set)] || (usesPreviousGuidedQuestion(set,answers) ? '1' : '2');
}

function guidedQuestion(set) {
  const guide = guidedInquiryGuide(set);
  return usesPreviousGuidedQuestion(set) ? guide.previousQuestion : guide.focus;
}

function economyInquiry() {
  const set = economyGuided();
  const a = work().answers;
  const current = a[economyQuestionKey(set)];
  return filled(current) ? current : (set ? guidedQuestion(set) : a.refinedInquiry || a.inquiry);
}

function economyInquiryLabel(set) {
  return !set || filled(work().answers[economyQuestionKey(set)]) || usesPreviousGuidedQuestion(set) ? '탐구 질문' : '탐구 과제';
}

function economyQuestionSummary(heading, question) {
  return filled(question) ? `<p class="field-hint"><strong>${heading}</strong> ${esc(question)}</p>` : '';
}

const ECONOMY_TERM_METHODS = {
  '경제 주체': '자료 속 소비자, 기업, 노동자, 정부 중 관련 있는 주체를 골라요. 이 변화로 누가 이익을 얻고 누가 비용을 부담하는지 각각 살펴보세요.',
  '구매력': '같은 돈으로 서비스를 얼마나 이용할 수 있는지 생각하세요. 가격이 오를 때 구매력이 달라지는 이유와 실제 이용 횟수를 확인하는 데 필요한 자료를 쓰세요.',
  '환율': '같은 달러 금액을 변동 전후의 환율로 원화로 바꿔요. 내 역할에서 그 돈을 받는지, 내는지 구분하고 환율이 판단을 바꾸는지 적어 보세요.',
  '분산투자': '한 종목에 넣었을 때와 여러 업종에 나눴을 때 손익을 계산해요. 투자 대상이 같은 사건에 함께 영향을 받을 수도 있는지 살펴보세요.',
  '대출 금리': '대출액에 연 금리를 곱해 한 해 이자를 구해요. 금리가 오르기 전과 후의 이자를 영업이익에서 빼서 두 기업을 비교해요.',
  '정보의 비대칭': '기업이 공개한 정보와 시장에 퍼진 소문을 구분해요. 결정하기 전에 누가 어떤 정보를 알고 있는지, 무엇을 더 확인할지 적어요.',
  '관세': '관세율이 바뀌면 수입 비용이 어떻게 달라지는지 살펴요. 비용 변화가 매장 가격에 얼마나 반영되는지에 따라 각 주체의 입장을 비교해요.',
  '수요 변화': '누가 어떤 상품을 더 찾거나 덜 찾았는지 살펴요. 소비액만 보인다면 가격과 구매량 중 무엇이 달라졌는지 확인할 자료를 찾아보세요.',
  '공급 변화': '생산량, 저장량, 시장에 내보내는 양을 구분해요. 어느 때에 가게가 얼마만큼 들여올 수 있는지 설명해 보세요.',
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
  const phenomenon = guidedPhenomenon(set);
  const terms = phenomenon ? [...new Set([phenomenon.concept,...set.concepts,...(guidedUsesStarter(set) ? ['비용과 편익', ...GENERAL_ECONOMY_TERMS] : [])])] :
    set?.concepts || [...GENERAL_ECONOMY_TERMS,'비용과 편익','수요 변화','공급 변화','구매력','외부 효과','환율','관세'];
  const selected = work().answers[key];
  const reason = set && guidedInquiryGuide(set).cause;
  return `<section class="economy-write"><h2>경제 개념으로 현상 설명하기</h2>
    <p>비교한 자료를 설명하는 데 필요한 개념을 골라 보세요. 아직 확인하지 못한 이유는 가능성으로 표현하세요.</p>
    <div class="field"><label for="economy-term">적용할 경제 개념</label><select id="economy-term" data-term-key="${key}">
      <option value="">경제 용어를 골라 보세요</option>${terms.map(term => `<option${term === selected ? ' selected' : ''}>${esc(term)}</option>`).join('')}</select>
      <p id="economy-term-method" class="field-hint" role="status">${terms.includes(selected) ? esc(ECONOMY_TERM_METHODS[selected]) : ''}</p></div>
    ${economyInput(set ? guidedKey(set,'explain') : 'concepts','자료에서 확인한 변화를 경제 개념으로 설명하기',
      reason || '자료의 숫자나 조건 한 가지를 고르고, 결과가 달라진 이유를 선택한 개념으로 설명해요.',300,
      (set ? work().answers[guidedKey(set,'explain')] : undefined) ?? work().answers.concepts)}</section>`;
}

const ECONOMY_TOPIC_GROUPS = {
  all:'전체', local:'생활·지역 경제', trade:'국제 무역·환율'
};

function economyTopicGroup(set) {
  if (set.id === 'stock-news-surge' || set.id === 'cocoa-buying') return 'local';
  if (set.id === 'exchange-positions') return 'trade';
  return set.group === '국제 무역' ? 'trade' : 'local';
}

const economyTopicSelectable = set => !Object.hasOwn(ECONOMY_CASE_INQUIRY_GUIDES,set.id);

function guidedExplorer(activeGroup = 'all') {
  if (activeTask() !== 'economy' || typeof ECONOMY_GUIDED_SETS === 'undefined') return '';
  const answers = work().answers;
  const groups = {local:[],trade:[]};
  const selectable=ECONOMY_GUIDED_SETS.filter(economyTopicSelectable);
  const previousOnly=ECONOMY_GUIDED_SETS.filter(set=>!economyTopicSelectable(set) && guidedHasDraft(set,answers));
  for (const set of selectable) groups[economyTopicGroup(set)].push(set);
  const tabs = Object.entries(ECONOMY_TOPIC_GROUPS).map(([id,label])=>
    `<button type="button" data-topic-tab="${id}" aria-pressed="${id === activeGroup}" aria-controls="economy-topic-results">${label} <span>${id === 'all' ? selectable.length : groups[id].length}</span></button>`).join('');
  const visible = Object.entries(groups).filter(([id])=>activeGroup === 'all' || id === activeGroup);
  return `<div class="economy-category-tabs" role="group" aria-label="경제 주제 영역">${tabs}</div>
    <div class="economy-topics" id="economy-topic-results">${visible.map(([group,sets]) => `<section><h2>${ECONOMY_TOPIC_GROUPS[group]}</h2>
    <ul class="economy-topic-grid">${sets.map(set => {
      const guide = guidedStarterGuide(set);
      const resuming = guidedHasDraft(set,answers);
      const previous = resuming && !guidedUsesStarter(set);
      const previousLabel = previous ? guidedTopicLabel(set) : '';
      const region = previousLabel ? activeGuidedRegion(set)?.region :
        ECONOMY_START_REGIONS[set.id]?.region || ECONOMY_LOCAL_SIMULATIONS[set.id]?.split(' ')[0];
      return `<li><button type="button" data-guided-set="${esc(set.id)}">
    <span class="topic-badges">${region ? `<span class="badge-region">${esc(region)}</span>` : ''}<span class="badge-concept">${esc((previous && guidedPhenomenon(set)?.concept) || guide.concept)}</span>
      ${resuming ? '<span class="topic-resume">이어서</span>' : ''}</span>
    <strong>${esc(previousLabel || guide.label)}</strong><small>${esc(previousLabel ? guidedInquiryGuide(set).focus : guide.cardFocus || guide.focus)}</small></button></li>`;
    }).join('')}</ul></section>`).join('')}</div>
    <button type="button" data-guided-set="custom">+ 직접 정한 우리 지역 주제로 탐구하기</button>
    ${previousOnly.length ? `<details class="supplement"><summary>이전에 쓰던 주제 이어 쓰기</summary>
      <p>아래 주제는 새로 고를 수 없지만, 전에 작성한 글은 열 수 있어요.</p>
      <ul class="economy-topic-grid">${previousOnly.map(set=>`<li><button type="button" data-guided-set="${esc(set.id)}">${esc(guidedStarterGuide(set).label)}</button></li>`).join('')}</ul></details>` : ''}`;
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
  const existing = [...groups.values()];
  if (original || !guidedUsesStarter(set)) return existing;
  const starterSources = ECONOMY_START_SUPPLEMENTS[set.id] || [];
  const additions = starterSources.map(({title,headers,rows,unit,source,date,page},index)=>{
    const [publisher,sourceTitle,sourceUrl] = source;
    const table = {title,headers,rows,unit,publisher,sourceTitle,sourceUrl,published:date,sourcePage:page};
    return {table,entries:[{table}],sourceNumber:index+1,storageId:'start_'+index};
  });
  const sourceOrder = ECONOMY_START_SOURCE_ORDER[set.id] ?? guidedCaseAnalysis(set)?.sources;
  return [...additions,...sourceOrder.map(index=>existing[index])];
}

const guidedSourceKey = (set,id,part) => guidedKey(set,`source_${id}_${part}`);
const guidedCaseFactKey = set => guidedKey(set,'caseFact');
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

function guidedSource(set, {table,entries,sourceNumber,storageId}, editable, initial = false) {
  return `<div class="guided-source" data-source-number="${sourceNumber}">
    ${entries.map(({table})=>guidedReferenceTable(table)).join('')}
    <p class="stat-citation">${esc(table.publisher)} · <a href="${esc(table.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(table.sourceTitle)}</a> · ${studyDate(table)}
      ${entries.map(({table})=>esc(table.sourcePage)).filter((location,index,all)=>all.indexOf(location)===index).join(' · ')}</p>
    ${editable ? economyInput(guidedSourceKey(set,storageId,'excerpt'),'자료에서 확인한 사실','수치라면 비교한 대상·시점·단위도 적어요.',220) : ''}
    ${editable && !initial ? economyInput(guidedSourceKey(set,storageId,'use'),'이 자료로 더 설명할 수 있는 점 (선택)','처음 읽은 자료와 비교해 새로 알 수 있는 점을 적어요.',180) : ''}
    </div>`;
}

const activeGuidedRegion = set => (guidedUsesStarter(set) ? ECONOMY_START_REGIONS : ECONOMY_LOCAL_CASES)[set.id];
const guidedRegionWasUsed = set => !guidedCaseAnalysis(set) && ['regionalChange','regionalCause'].some(part=>filled(work().answers[guidedKey(set,part)]));
const guidedChartIds = set => guidedUsesStarter(set) ? [] : ECONOMY_GUIDED_CHARTS[set.id] || [];
const guidedInitialCharts = (set, source) => guidedChartIds(set).filter(id=>ECONOMY_DATA.charts[id].sourceUrl === source.table.sourceUrl);
const guidedSupplementCharts = (set, source) => guidedChartIds(set).filter(id=>!guidedInitialCharts(set,source).includes(id));
const guidedChartNoteKey = (set, id) => guidedKey(set,'chart_'+id+'_fact');
const guidedChartNotes = set => guidedSupplementCharts(set,guidedSourceGroups(set)[0]).flatMap(id=>{
  const note = work().answers[guidedChartNoteKey(set,id)];
  return filled(note) ? [{id,note,chart:ECONOMY_DATA.charts[id]}] : [];
});

function guidedResearchVisuals(set, forReport = false, charts = guidedChartIds(set)) {
  if (forReport && !guidedWrittenSources(set).some(group=>filled(group.excerpt)) && !guidedRegionWasUsed(set) &&
      !filled(work().answers[guidedKey(set,'read')]) && !guidedChartNotes(set).length) return '';
  return forReport ? (charts.length ? `<div class="evidence-grid">${charts.map(id=>
    `<figure class="paper-official-figure"><figcaption>${esc(ECONOMY_DATA.charts[id].title)}</figcaption>${officialGraph(id,true)}</figure>`).join('')}</div>` : '') :
    charts.map(id=>officialGraph(id)).join('');
}

const ECONOMY_INITIAL_CLUES = {
  'tourism-consumption':'전체 관광 소비가 늘었는데 어느 집단의 소비는 줄었나요?',
  'production-income':'전국 수치와 비교해 더 높은 지역과 더 낮은 지역을 찾아봐요.',
  'renewable-sharing':'발전 수익이 누구에게 돌아가는지 찾아봐요.',
  'online-choice':'전체 온라인 거래액과 모바일 거래액이 어떻게 달라졌나요?',
  'fruit-purchasing':'사과 생산량이 가장 크게 달라진 두 해를 비교해요.',
  'aging-employment':'65세 이상 인구 비율이 가장 크게 바뀐 곳을 찾아봐요.',
  'cocoa-buying':'코코아 가격이 어느 해에 가장 많이 올랐나요?',
  'household-budget':'가구당 소비지출이 어느 해에 얼마나 달라졌나요?',
  'childcare-choice':'맞벌이 비율이 가장 높은 곳과 낮은 곳을 비교해요.',
  'saving-goal':'가구가 매달 쓰는 돈이 가장 크게 달라진 두 해를 비교해요.',
  'exchange-positions':'원·달러 환율이 오르면 같은 1달러에 필요한 원화는 어떻게 달라지나요?',
  'domestic-global-stocks':'달러를 원화로 바꿀 때 환율 숫자는 무엇을 뜻하나요?',
  'stock-diversification':'자산을 여러 곳에 나누면 한 자산의 손실이 전체에 미치는 영향은 어떻게 달라지나요?',
  'stock-rate-news':'금리 변화가 회사의 어떤 비용에 영향을 주나요?',
  'stock-news-surge':'기업은 평소에 공개하는 정보와 중요한 사건이 생겼을 때 공개하는 정보를 어떻게 구분하나요?',
  'tariff-choices':'관세를 계산할 때 사용하는 가격을 찾아 매장 가격과 구분해요.',
  'trade-suppliers':'필요한 물품을 안정적으로 구하려면 어떤 상황을 살펴봐야 하나요?'
};

function guidedInitialMaterials(set, editable = true) {
  const caseGuide = guidedCaseAnalysis(set);
  if (caseGuide) return `<section class="card-fact"><h2>${guidedUsesStarter(set) ? '처음 읽을 자료' : '먼저 볼 비교 자료'}</h2>
    <p>${esc(caseGuide.prompt)}</p>
    ${guidedReviewCase(set)}
    ${editable ? economyInput(guidedCaseFactKey(set),'상황에서 확인한 수치와 조건',caseGuide.read,220) +
      economyInput(guidedKey(set,'read'),'자료를 읽고 해석한 점','두 상황에서 달라지는 점과 그 변화가 판단에 어떤 영향을 줄지 쓰세요.',220) : ''}
    </section>`;
  if (guidedUsesStarter(set)) {
    const data = activeGuidedRegion(set);
    const answers = editable ? guidedDecisionInputs(set,['regionalChange']) +
      economyInput(guidedKey(set,'read'),'자료를 읽고 해석한 점','표에서 찾은 변화나 차이가 무엇을 보여 주는지 적으세요.',220) : '';
    return guidedRegionMaterial(data,answers,data.task,true);
  }
  const [first] = guidedSourceGroups(set);
  const charts = guidedInitialCharts(set,first);
  const key = guidedKey(set,'read');
  const regionGuide = guidedPhenomenon(set);
  if (regionGuide?.regionalFirst) return guidedRegionMaterial(activeGuidedRegion(set),
    editable ? guidedDecisionInputs(set,['regionalChange']) +
      economyInput(key,'자료를 읽고 해석한 점',regionGuide.cause,220) : '',regionGuide.cause);
  const part = first.entries[regionGuide?.initialPart || 0];
  return `<section class="card-fact"><h2>처음 읽을 자료</h2>
    <p>${esc(regionGuide?.read || ECONOMY_INITIAL_CLUES[set.id])}</p>
    ${charts.map(id=>officialGraph(id,false,false,false)).join('')}
    ${guidedSource(set,{...first,entries:[part]},editable,true)}
    ${editable ? economyInput(key,'자료를 읽고 해석한 점','확인한 사실은 어떤 변화나 차이를 보여 주나요?',220) : ''}
  </section>`;
}

function guidedSupplementMaterials(set, editable = true) {
  if (guidedUsesStarter(set)) {
    const [first,...more] = guidedSourceGroups(set);
    const render = group => `<section class="card-fact"><h2>${esc(group.table.title.replace(/^(주요 주제|비교 주제):\s*/,''))}</h2>${guidedSource(set,group,editable)}</section>`;
    return `<div class="economy-facts">${render(first)}
      ${more.length ? `<details class="supplement"><summary>더 살펴볼 자료 ${more.length}개</summary>${more.map(render).join('')}</details>` : ''}</div>`;
  }
  const caseGuide = guidedCaseAnalysis(set);
  if (caseGuide) {
    const groups = guidedSourceGroups(set);
    return `<div class="economy-facts">
      ${caseGuide.sources.map(index=>`<section class="card-fact"><h2>${esc(groups[index].table.title.replace(/^(주요 주제|비교 주제):\s*/,''))}</h2>${guidedSource(set,groups[index],editable)}</section>`).join('')}
      <details class="supplement"><summary>이전에 제공한 참고 자료</summary>
        ${groups.filter((_,index)=>!caseGuide.sources.includes(index)).map(group=>guidedSource(set,group,false)).join('')}
        ${guidedChartIds(set).map(id=>officialGraph(id)).join('')}
        ${guidedRegionMaterial(activeGuidedRegion(set),'','아래 표의 지역 경제 변화는 별도로 살펴볼 수 있습니다.')}
      </details></div>`;
  }
  const groups = guidedSourceGroups(set);
  const [first,...supplements] = groups;
  const regionalGuide = guidedPhenomenon(set);
  const regionFirst = regionalGuide?.regionalFirst;
  const [main,...otherSources] = regionalGuide?.sources ? regionalGuide.sources.map(index=>groups[index]) : supplements;
  const archived = regionFirst ? groups.filter((_,index)=>!regionalGuide.sources.includes(index)) : [];
  const region = activeGuidedRegion(set);
  const readingTask = guidedPhenomenon(set)?.cause || region?.task;
  const charts = regionFirst ? guidedChartIds(set) : guidedSupplementCharts(set,first);
  const moreFromFirst = first.entries.filter((_,index)=>index!==(regionalGuide?.initialPart || 0));
  return `<div class="economy-facts">
    ${region && !regionFirst ? guidedRegionMaterial(region,editable ? guidedDecisionInputs(set,['regionalChange']) : '',readingTask) : ''}
    ${main ? `<section class="card-fact"><h2>첫 의견을 다시 살펴볼 자료</h2>
      ${guidedSource(set,main,editable)}
    </section>` : ''}
    ${otherSources.length ? `<details class="supplement"><summary>다른 출처 자료 ${otherSources.length}개</summary>${otherSources.map(group=>guidedSource(set,group,editable)).join('')}</details>` : ''}
    ${!regionFirst && moreFromFirst.length ? `<details class="supplement"><summary>처음 출처에서 더 읽을 부분</summary>${guidedSource(set,{...first,entries:moreFromFirst},false)}</details>` : ''}
    ${archived.length ? `<details class="supplement"><summary>이전에 제공한 참고 자료</summary>
      ${archived.map(group=>guidedSource(set,group,editable && guidedSourceRecorded(set,group))).join('')}</details>` : ''}
    ${charts.length ? `<details class="supplement"><summary>추가 그래프 보기</summary>${charts.map(id=>
      `<section><h3>${esc(ECONOMY_DATA.charts[id].title)}</h3>${officialGraph(id)}
        ${editable ? economyInput(guidedChartNoteKey(set,id),'그래프에서 확인한 사실 (선택)','내 판단에 쓸 수치나 차이를 골라 적어요.',220) : ''}</section>`
    ).join('')}</details>` : ''}
    </div>`;
}

function guidedReviewCase(set, paper = false) {
  const review = guidedUsesStarter(set) && set.id === 'saving-goal' ? {
    title:'1년 뒤 필요한 금액과 남는 돈 비교',
    common:'지금 가진 돈은 100만 원이에요. A는 전액 예금, B는 예금 80만 원과 펀드 20만 원이에요. 예금 이자와 수수료는 계산하지 않아요. 1년 뒤 목표 금액은 80만 원과 100만 원으로 나누어 비교해요.',
    rows:[
      ['펀드 값이 20% 내려갈 때','방법 B에서 펀드에 넣은 20만 원에만 하락률을 적용해요.'],
      ['펀드 값이 20% 올라갈 때','방법 B에서 펀드에 넣은 20만 원에만 상승률을 적용해요.']
    ],
    prompt:'두 방법에서 1년 뒤 남는 돈을 각각 구한 뒤, 목표 금액을 채우는지 비교하세요.'
  } : guidedUsesStarter(set) && set.id === 'stock-news-surge' ? {
    title:'운송 장비를 사는 경우와 빌리는 경우',
    common:'가상 운송회사가 늘어난 주문을 처리할 장비가 필요해요. 현재 주문은 있으나 다음 계약이 얼마나 이어질지는 확정되지 않았어요.',
    rows:[
      ['장비를 사는 경우','처음 지출이 크고 유지비가 들어요. 오래 쓴다면 매번 빌리는 비용을 줄일 수 있어요.'],
      ['장비를 빌리는 경우','쓰는 기간만 비용을 내요. 장기간 계속 빌리면 구입하는 것보다 비용이 커질 수 있어요.']
    ],
    prompt:'다음 계약이 오래 이어질 때와 그렇지 않을 때 각각 어느 방식이 나은지 비교하세요.'
  } : ECONOMY_REVIEW_CASES[set.id];
  if (!review) return '';
  const extra = guidedUsesStarter(set) && set.id === 'saving-goal' ? null : ECONOMY_REVIEW_ADDENDA[set.id];
  const caseGuide = guidedCaseAnalysis(set);
  const context = guidedUsesStarter(set) && caseGuide ? ECONOMY_LOCAL_SIMULATIONS[set.id] : '';
  const prompt = guidedUsesStarter(set) && set.id === 'tariff-choices'
    ? '두 경우의 매장 가격을 비교하세요. 수입 과일과 국내 배를 비슷한 용도로 산다면 소비자와 배 농가에 어떤 영향이 갈지 예상하세요.' : review.prompt;
  const title = guidedUsesStarter(set) && set.id === 'domestic-global-stocks' ? review.title : caseGuide?.reviewTitle || review.title;
  const table = `<table class="${paper ? 'paper-picked' : 'stat-table'}">
      ${paper ? '' : `<caption class="sr-only">${esc(title)} 모의 자료</caption>`}
      <thead><tr><th scope="col">모의 상황</th><th scope="col">상황별로 주어진 정보</th></tr></thead>
      <tbody>${review.rows.map(([label,detail]) => `<tr><th scope="row">${esc(label)}</th><td>${esc(detail)}</td></tr>`).join('')}</tbody>
    </table>`;
  const materials = `
    ${caseGuide?.glossary ? `<p>${esc(caseGuide.glossary)}</p>` : ''}
    <p>${esc(review.common)}</p>
    ${paper ? table : `<div class="stat-table-wrap">${table}</div>`}
    ${extra ? `<p class="guided-review-support"><strong>${esc(extra[0])}</strong> ${esc(extra[1])}</p>` : ''}`;
  const scenario = context ? `<p class="field-hint">가상 상황 · ${esc(context)}</p>` : '';
  if (paper) return `<section><h4>모의 비교 자료 · ${esc(title)}</h4>${scenario}${materials}</section>`;
  return `<section class="card-simulation guided-review-case"><span class="economy-card-label">가상 비교 조건</span><h2>${esc(title)}</h2>
    ${scenario}${materials}
    ${caseGuide ? '' : `<p class="field-hint">${esc(prompt)}</p>`}
    </section>`;
}

function guidedRegionTable(data, forReport = false) {
  return `<table class="${forReport ? 'paper-picked paper-local-table' : 'stat-table'}">
    ${forReport ? '' : `<caption class="sr-only">${esc(data.title)}</caption>`}
    <thead><tr><th scope="col">지표</th>${data.periods.map((period,index)=>`<th scope="col"${data.rows.every(row=>typeof row[index+1] === 'number') ? ' class="num"' : ''}>${esc(period)}</th>`).join('')}</tr></thead>
    <tbody>${data.rows.map(([label,...cells])=>`<tr><th scope="row">${esc(label)}</th>${cells.map(cell=>`<td${numericCell(cell)}>${esc(guidedValue(cell))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
}

function guidedRegionSources(data, forReport = false) {
  return data.sources.map(([publisher,title,url,section]) =>
    `<p>${esc(publisher)} · ${forReport ? economyPaperLink(title,url) : `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`} · ${esc(section)}</p>`).join('');
}

function guidedRegionGraph(data) {
  const series = data.rows.find(([, ...values])=>values.every(value=>Number.isFinite(value) && value >= 0) && values.some(value=>value > 0));
  if (!series) return '';
  const [label,...values] = series;
  const maximum = Math.max(...values);
  return `<figure class="guided-region-graph economy-evidence-graph">
    <figcaption>${esc(label)} <span>0부터 비교</span></figcaption>
    ${values.map((value,index)=>`<div class="guided-region-bar">
      <span>${esc(data.periods[index])}</span>
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <rect class="economy-graph-track" width="100" height="8"></rect>
        <rect class="economy-graph-bar" width="${(value / maximum * 100).toFixed(2)}" height="8"></rect>
      </svg><strong>${esc(guidedValue(value))}</strong>
      </div>`).join('')}
    </figure>`;
}

function guidedRegionMaterial(data, answers = '', task = data.task, starter = false) {
  const graph = guidedRegionGraph(data);
  if (starter) return `<section class="card-fact guided-region-material">
    <h2>처음 읽을 자료</h2>
    <p><strong>${esc(data.region)} · ${esc(data.title)}</strong></p>
    <div class="stat-table-wrap">${guidedRegionTable(data)}</div>
    ${graph}
    <p class="field-hint">${esc(data.clue)}</p>
    <div class="stat-citation">${guidedRegionSources(data)}</div>
    ${answers}</section>`;
  return `<section class="card-fact guided-region-material"><span class="economy-card-label">실제 지역 자료</span>
    <h2>${esc(data.region)} · ${esc(data.title)}</h2>
    <div class="stat-table-wrap">${guidedRegionTable(data)}</div>${answers}
    ${graph}
    <div class="stat-citation">${guidedRegionSources(data)}</div>
    <details class="supplement"><summary>자료를 읽는 단서</summary><p>${esc(task)}</p><p>${esc(data.clue)}</p></details></section>`;
}

function guidedRegionReport(set, data = activeGuidedRegion(set)) {
  if (!data) return '';
  const answers = work().answers;
  const change = answers[guidedKey(set,'regionalChange')];
  const starter = guidedUsesStarter(set);
  if (!starter && !guidedRegionWasUsed(set)) return '';
  return `<section class="paper-local-analysis"><h4>${starter ? '제공 자료' : '실제 지역의 변화'} · ${esc(data.region)}
      <small class="paper-caption">${esc(data.title)}</small></h4>
    ${guidedRegionTable(data,true)}
    ${starter ? guidedRegionGraph(data) : ''}
    ${starter ? `<p>${esc(data.clue)}</p>` : ''}
    ${filled(change) ? `<section><h5>지역 변화</h5><p>${esc(change)}</p></section>` : ''}
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

function guidedEvidenceTable(groups, extra = [], noteLabel = '판단에 쓴 점') {
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
      ${url ? `<p class="paper-source-link">${economyPaperSource(url)}</p>` : ''}`,
      sourceFact(source),sourceThought(source),source.judgmentUse
    ]);
  }
  const written = rows.length ? `<table class="paper-picked paper-evidence-table">
    <thead><tr><th scope="col">자료와 출처</th><th scope="col">${'확인한 근거와 내 해석'}</th></tr></thead>
    <tbody>${rows.map(([citation,excerpt,use,judgmentUse],index)=>`<tr><th scope="row">${citation}</th><td>
      ${filled(excerpt) ? `<p>${esc(excerpt)}</p>` : ''}
      ${filled(use) ? `<p class="paper-evidence-use"><strong>${index < groups.length ? noteLabel : '내 말로 요약'}</strong> ${esc(use)}</p>` : ''}
      ${filled(judgmentUse) ? `<p class="paper-evidence-use"><strong>판단에 쓴 점</strong> ${esc(judgmentUse)}</p>` : ''}
      </td></tr>`).join('')}</tbody></table>` : '';
  return written;
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

const guidedRoles = set => {
  const saved=work().answers[guidedKey(set,'position')];
  return [...new Set([...(guidedPhenomenon(set)?.roles || set.roles),'지역 주민','지역 소상공인',...(filled(saved) ? [saved] : [])])];
};

function guidedRole(set) {
  const role = work().answers[guidedKey(set,'position')];
  return guidedRoles(set).includes(role) ? role : '';
}

function guidedRolePicker(set) {
  const selected = guidedRole(set);
  return `<div class="field"><label for="economy-role">${guidedCaseAnalysis(set) ? '누구의 입장에서 판단할까요?' : '이 지역의 변화를 누구의 입장에서 볼까요?'}</label>
    <select id="economy-role" data-guided-role><option value="">입장 고르기</option>${guidedRoles(set).map(role =>
      `<option value="${esc(role)}"${role === selected ? ' selected' : ''}>${esc(role)}</option>`).join('')}</select></div>`;
}

function guidedDecisionFields(set) {
  const phenomenon = guidedPhenomenon(set);
  const caseGuide = guidedCaseAnalysis(set);
  const {cause,impact,conclusion,conclusionLimits} = guidedInquiryGuide(set);
  const [first, second] = set.decision.options;
  return {
    criterion: ['판단 기준과 이유', caseGuide ? '어떤 결과를 가장 중요하게 보는지, 내 입장에서 왜 중요한지 쓰세요.' :
      phenomenon ? '어떤 자료와 조건을 맞춰 봐야 믿을 만한 설명인지, 내 기준과 이유를 쓰세요.' :
      '내 입장에서 무엇을 가장 중요하게 볼지 정하고, 왜 중요한지 적어요.'],
    initialOpinionV3: ['첫 의견과 이유', caseGuide ? '처음 확인한 조건에서 어느 쪽이 유리하다고 보는지, 무엇을 더 계산할지 쓰세요.' :
      phenomenon ? '첫 자료를 바탕으로 무엇이 달라졌는지, 그 이유나 영향을 어떻게 생각하는지 쓰세요.' :
      '첫 자료를 보고 탐구 질문에 대한 지금 생각을 적어요. 판단하기 어렵다면 더 확인할 점을 써요.'],
    supplementAnalysis: ['내 판단에 영향을 준 추가 근거', '앞에서 정한 기준으로 첫 의견을 다시 봐요. 새 자료에서 판단에 도움이 된 점이나 더 확인할 점을 적어요.'],
    optionFirst: phenomenon?.explanations[0] || [`대안 1 · ${first}`, '주어진 상황에서 이 방안을 택하면 내 입장에서 무엇을 얻고 무엇을 부담하나요? 자료의 수치나 조건을 넣어요.'],
    optionSecond: phenomenon?.explanations[1] || [`대안 2 · ${second}`, '같은 기준으로 이 방법의 이익과 부담을 쓰세요. 첫 번째 방법과 어떤 차이가 있는지 설명하세요.'],
    regionalChange: ['지역에서 무엇이 얼마나 달라졌나요?', '같은 지표의 두 시점 값과 단위를 넣어 한 줄로 적어요.'],
    regionalCause: ['어떤 이유로 지역 경제가 달라졌나요?', cause],
    regionalImpact: ['지역에서 누가 어떤 영향을 받나요?', impact],
    finalChoice: [phenomenon ? '내가 내린 최종 분석' : '최종 의견과 지역에 주는 시사점', conclusion || '자료를 근거로 자신의 생각과 예상되는 영향을 쓰세요. 판단하기 어렵다면 그 이유를 쓰세요.'],
    changeCondition: [phenomenon && !caseGuide ? '자료의 한계와 설명을 바꿀 근거' : '판단이 바뀔 조건과 자료의 한계', conclusionLimits || '판단이 바뀔 수 있는 조건이나, 판단하려면 더 확인해야 할 내용을 쓰세요.'],
    applicationJudgment: ['모의 상황에서의 판단 (선택)', phenomenon?.applicationConclusion],
    decisionSummary: ['탐구 내용 한 줄 정리', '처음 생각과 비교해 무엇이 달라졌거나 더 분명해졌나요?']
  };
}

const GUIDED_PLACEHOLDERS = {
  criterion: '내가 중요하게 보는 기준과 그 이유를 적어요.',
  initialOpinionV3: '예: 지금은 ○○ 방안이 더 낫다고 생각한다. 그 이유는 …',
  supplementAnalysis: '예: 추가 자료를 보니 앞 자료에서 보이지 않던 ○○의 차이가 드러났다.',
  optionFirst: '이 대안에서 얻는 점과 부담을 자료의 수치나 조건과 연결해요.',
  optionSecond: '같은 기준으로 얻는 점과 부담을 적고 대안 1과 비교해요.',
  regionalChange: '예: ○○년 ○○에서 △△년 △△로 바뀌었다. 차이는 □□이다.',
  regionalCause: '예: 자료는 ○○의 영향을 짚었다. 이 설명을 확인하려면 △△ 자료가 필요하다.',
  regionalImpact: '예: ○○는 이익을 얻지만 △△는 이 비용을 부담할 수 있다.',
  finalChoice: '자료에서 확인한 사실을 들어 자신의 생각을 설명하세요.',
  changeCondition: '예: ○○ 비용이 △△보다 높아지면 다른 방안을 고르겠다.',
  applicationJudgment: '주어진 상황의 수치나 조건으로 판단을 설명하세요.',
  decisionSummary: '예: 처음에는 전체 증가를 봤고, 자료를 읽으면서 업종별 차이도 확인했다.'
};

const PHENOMENON_PLACEHOLDERS = {
  initialOpinionV3: '자료에서 확인한 사실을 바탕으로 현재 생각을 쓰세요.',
  optionFirst: '이 설명을 뒷받침하는 자료와 더 필요한 자료를 쓰세요.',
  optionSecond: '같은 기준으로 두 번째 설명을 검토하세요.',
  changeCondition: '어떤 자료가 새로 확인되면 지금 설명이 달라지는지 쓰세요.'
};

function guidedDecisionInputs(set, parts) {
  const fields = guidedDecisionFields(set);
  const guide = guidedInquiryGuide(set);
  const placeholders = guidedPhenomenon(set) ? {...GUIDED_PLACEHOLDERS,...PHENOMENON_PLACEHOLDERS} : GUIDED_PLACEHOLDERS;
  return parts.map(part => {
    const key = guidedKey(set,part);
    const [title,hint] = fields[part];
    const limit = ({criterion:180,initialOpinionV3:220,finalChoice:320,changeCondition:200,decisionSummary:100})[part] || 250;
    const previousCriterion = part === 'criterion' && usesPreviousGuidedQuestion(set) && !filled(work().answers[economyQuestionKey(set)]);
    const examples = part === 'criterion' && !previousCriterion
      ? `<span class="economy-criterion-examples"><strong>기준 예시</strong>${guide.criteria.map(item=>`<span>${esc(item)}?</span>`).join('')}</span>`
      : '';
    const help = previousCriterion ? set.decision.criterionHint || '내가 맡은 역할에서 무엇을 가장 중요하게 보는지, 그 이유와 함께 적어요.' : hint;
    return input(key,esc(title),placeholders[part],work().answers[key],{area:part !== 'decisionSummary',limit,hint:esc(help)+examples});
  }).join('');
}

function guidedReportAnswers(set, parts) {
  const fields = guidedDecisionFields(set);
  const conditionLabel = guidedPhenomenon(set) ? fields.changeCondition[0] :
    guidedInquiryGuide(set).conclusionLimits ? '자료의 한계와 판단이 바뀌는 조건' : '판단이 바뀌는 조건';
  const reportLabels = {
    criterion:'판단 기준', supplementAnalysis:'내 판단에 영향을 준 추가 근거',
    regionalCause:'지역 변화의 원인과 자료의 범위', regionalImpact:'지역 경제 주체별 영향',
    applicationJudgment:'모의 상황에서의 판단',
    finalChoice:guidedPhenomenon(set) ? '최종 분석' : '최종 판단', changeCondition:conditionLabel, decisionSummary:'탐구를 통해 달라진 생각'
  };
  const written = parts.filter(part => filled(work().answers[guidedKey(set,part)]));
  return written.map(part =>
    `<section><h4>${esc(reportLabels[part] || fields[part][0])}</h4><p>${esc(work().answers[guidedKey(set,part)])}</p></section>`).join('');
}

function guidedComparisonReport(set) {
  const phenomenon = guidedPhenomenon(set);
  const labels = phenomenon ? phenomenon.explanations.map(([label])=>label) : set.decision.options;
  const options = ['optionFirst','optionSecond'].flatMap((part,index)=>{
    const value = work().answers[guidedKey(set,part)];
    return filled(value) ? [[labels[index],value]] : [];
  });
  const own = guidedOwnComparison(set);
  const rows = own ? [...options,own] : options;
  const comparison = rows.length ? `<table class="paper-picked paper-comparison-table">
    <thead><tr><th scope="col">${guidedCaseAnalysis(set) ? '모의 상황' : phenomenon?.application ? '설명·적용 상황' : phenomenon ? '현상에 대한 설명' : '대안'}</th><th scope="col">내 판단 기준으로 비교한 결과</th></tr></thead>
    <tbody>${rows.map(([label,value])=>`<tr><th scope="row">${esc(label)}</th><td>${esc(value)}</td></tr>`).join('')}</tbody>
    </table>` : '';
  const conditions = (!phenomenon || phenomenon.application) &&
    (options.length || filled(work().answers[guidedKey(set,'applicationJudgment')])) && ECONOMY_REVIEW_CASES[set.id]?.common;
  const model = conditions ? `<p class="paper-caption"><strong>${phenomenon ? '모의 적용 조건' : '모의 비교 조건'}</strong> ${esc(conditions)}</p>` : '';
  return model + guidedReportAnswers(set,['supplementAnalysis']) + comparison;
}

function guidedOwnComparison(set) {
  const a = work().answers;
  const name = a[guidedKey(set,'ownOptionName')];
  const analysis = a[guidedKey(set,'ownOptionAnalysis')];
  const label = guidedPhenomenon(set) && !guidedCaseAnalysis(set) ? '내가 생각한 설명' : '내가 생각한 방법';
  return filled(name) || filled(analysis) ? [filled(name) ? name : label,analysis || ''] : null;
}

function guidedReadingReport(set, kinds = ['read','compare']) {
  const fields=guidedFields(set).filter(f=>kinds.includes(f.kind) && filled(work().answers[f.key]));
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
  const notes = [['initialOpinion','이전 활동에서 쓴 첫 의견'],['initialInquiry','이전에 쓴 출발 질문'],['refinedInquiry','이전에 다듬은 질문'],
    ['evidenceReason','근거를 고른 이유'],['evidenceQuestion','먼저 확인하려던 단서']]
    .map(([part,label])=>economyQuestionSummary(label,a[guidedKey(set,part)])).join('');
  const oldFields = guidedFields(set).filter(field=>['check','local'].includes(field.kind) && filled(a[field.key]));
  const selected = selections.length ? `<table class="paper-picked"><thead><tr><th>이전에 표시한 자료</th><th>내용</th></tr></thead>
    <tbody>${selections.map(({label,sourceNumber,detail})=>`<tr><th scope="row">${label}<span>출처 ${sourceNumber}</span></th><td>${detail}</td></tr>`).join('')}</tbody></table>
    <div class="paper-sources">${cited.map(table=>`<p>${esc(table.publisher)} · ${economyPaperLink(table.sourceTitle,table.sourceUrl)}</p>`).join('')}</div>` : '';
  return notes + guidedEvidenceTable(archive) + selected + guidedReportFields(oldFields);
}
