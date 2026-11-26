'use strict';

const ECONOMY_STEPS = ['질문과 첫 자료', '추가 조사와 경제 분석', '결론과 제안', '제출과 공유'];
const economyPhase = (set, version = 'V4') => set ? guidedKey(set,'phase'+version) : 'economyPhase'+version;
const ECONOMY_SINGLE_SOURCE_LABEL = '자료 한 건만 봤다면 무엇을 놓쳤을까요?';
const economyLimitKey = set => set ? guidedKey(set,'changeCondition') : 'limits';
const economyConclusionKey = set => set ? guidedKey(set,'finalChoice') : 'economicConclusion';
const economyImpactKey = set => set ? guidedKey(set,'regionalImpact') : 'economicImpact';

function economySavedPhase(set, answers, previous) {
  const current = answers[economyPhase(set)];
  if (/^[0-3]$/.test(current)) return Number(current);
  const v3 = answers[economyPhase(set,'V3')];
  if (/^[0-4]$/.test(v3)) return [0,1,0,1,2][Number(v3)];
  if (set) {
    const v2 = answers[guidedKey(set,'phaseV2')];
    if (/^[0-3]$/.test(v2)) return [0,0,1,2][Number(v2)];
    const v1 = answers[guidedKey(set,'phase')];
    if (/^[0-4]$/.test(v1)) return [0,1,0,1,2][Number(v1)];
  }
  return [0,0,1,2][previous] ?? 0;
}

function economyInitialFactKey(set) {
  if (guidedCaseAnalysis(set)) return guidedCaseFactKey(set);
  if (guidedPhenomenon(set)?.regionalFirst) return guidedKey(set,'regionalChange');
  return guidedSourceKey(set,guidedSourceGroups(set)[0].storageId,'excerpt');
}
const economyQuestionKey = set => set ? guidedKey(set,'inquiryV2') : 'inquiry';
const economyTitleKey = set => set ? guidedKey(set,'topicTitle') : 'posterTitle';
const economyFactRecorded = source => filled(sourceFact(source)) && filled(source.url || source.author);

function economyInput(key, label, hint, limit, value = work().answers[key]) {
  return input(key,label,'자료에서 확인한 내용과 내 생각을 적어 보세요.',value,{area:true,limit,hint});
}

function economyTitle(set) {
  const a = work().answers;
  return a[economyTitleKey(set)] || (set ? guidedTopicLabel(set) : a.topic) || '';
}

function economyTitleInput(set, final = false) {
  const key = economyTitleKey(set);
  const label = final ? '최종 보고서 제목' : '탐구 보고서 제목';
  const example = (final && economyTitle(set)) || (set ? guidedTopicLabel(set) : '예: 우리 동네 상권의 변화와 선택');
  const hint = final ? '내 판단이 드러나는 제목인지 확인해요. 여기서 고치면 1단계 제목도 바뀌어요.' : '';
  return input(key,label,example,work().answers[key],{limit:60,hint});
}

function economyPerspective(set) {
  return set ? guidedRole(set) : work().answers.economyPerspective;
}

function economyCriterion(set) {
  return work().answers[set ? guidedKey(set,'criterion') : 'economyCriterion'];
}

const economyOpinionKey = set => set ? guidedKey(set,'initialOpinionV3') : 'economyInitialOpinion';
const economyCalculationKey = set => guidedKey(set,'calculation');
const economyToCheckKey = set => set ? guidedKey(set,'questionToCheckV7') : 'economyQuestionToCheckV7';
const economyToCheckPrompt = set => (set && ECONOMY_INQUIRY_CHECKS[set.id]) ||
  '처음 읽은 자료를 보고 떠올린 설명이나 의문을 하나 적으세요. 확인하려면 어떤 자료를 찾아야 할까요?';
const economyStarterBridge = set => set && guidedUsesStarter(set) ? ECONOMY_START_BRIDGES[set.id] : null;

function economyBridgeMaterial(set,paper=false) {
  const bridge=economyStarterBridge(set);
  if (!bridge) return '';
  const tag=paper ? 'h4' : 'h2';
  return `<section class="${paper ? 'paper-local-analysis' : 'card-fact'}"><${tag}>${esc(bridge.label)}</${tag}>
    <p>${esc(bridge.note)}</p><p class="stat-citation">${economyPaperLink(bridge.publisher+' · '+bridge.sourceTitle,bridge.url)}</p></section>`;
}
const ECONOMY_CALC_METHOD = {
  'saving-goal':'예금 이자와 수수료는 따로 계산하지 않아요. 펀드 부분의 손익을 전체 금액에 더하거나 빼고, 필요한 금액과 비교하세요.',
  'domestic-global-stocks':'외화 금액에 각 시점의 환율을 곱해 원화 기준으로 비교해요.',
  'stock-diversification':'각 종목 수익률에 투자 비중을 곱한 뒤 더해요.',
  'stock-rate-news':'대출 원금에 연이율을 곱해 연간 이자를 구한 뒤 영업이익에서 빼요.'
};
const economyOwnSourceOrigin = source => (source.url || '').trim().replace(/#.*$/,'').replace(/\/$/,'').toLowerCase();
const economyOwnSourceComplete = source => [source.title,sourceFact(source),sourceThought(source),source.judgmentUse].every(filled) &&
  (filled(source.url) || [source.author,source.date].every(filled));

const economySourceText = value => (value || '').normalize('NFKC').toLowerCase().replace(/[\s·.,:()「」“”]/g,'');
function economyProvidedSource(source,provided) {
  const origin=economyOwnSourceOrigin(source);
  const title=economySourceText(source.title);
  const author=economySourceText(source.author || (!/^https?:\/\//i.test(origin) ? source.url : ''));
  return provided.some(([publisher,sourceTitle,url])=>
    (origin && origin===economyOwnSourceOrigin({url})) ||
    (title && author && title===economySourceText(sourceTitle) && author===economySourceText(publisher))
  );
}
function economyOwnEvidence(set) {
  const sources = work().sources;
  const first = sources[0] || {};
  const bridge = economyStarterBridge(set);
  const provided = set ? [
    ...(activeGuidedRegion(set)?.sources || []),
    ...guidedSourceGroups(set).map(({table})=>[table.publisher,table.sourceTitle,table.sourceUrl]),
    ...(bridge ? [[bridge.publisher,bridge.sourceTitle || bridge.publisher,bridge.url]] : [])
  ] : [[first.author,first.title,first.url]];
  return sources.slice(set ? 0 : 1).filter(source => economyOwnSourceComplete(source) && !economyProvidedSource(source,provided));
}

const economyGuidePrompts = set => set && guidedUsesStarter(set) ? ECONOMY_WORKSHEET_PROMPTS[set.id] : null;
const economyChoiceKey = set => set ? guidedKey(set,'tradeoffV6') : 'economyTradeoffV6';
const economyStarterSimulation = set => Boolean(set && guidedUsesStarter(set) &&
  ['tariff-choices','exchange-positions','trade-suppliers','stock-news-surge'].includes(set.id));
const economyDisplayQuestion = set => set ? economyInquiry() : economyInquiry() || work().answers.topic;
const economyRegionSheet = set => set && guidedUsesStarter(set) && !guidedCaseAnalysis(set) ? activeGuidedRegion(set) : null;
const economySheetKey = (set,row,col) => guidedKey(set,'figureV6_'+row+'_'+col);
function economySheetValues(set,a=work().answers) {
  const sheet=economyRegionSheet(set);
  return sheet ? sheet.rows.map((_,row)=>sheet.periods.map((_,col)=>a[economySheetKey(set,row,col)]||'')) : [];
}
function economyInitialRecorded(set,a=work().answers) {
  return filled(a[economyInitialFactKey(set)]) || economySheetValues(set,a).some(row=>row.every(filled)) ||
    Boolean(economyRegionSheet(set) && filled(a[economyOpinionKey(set)]));
}
function economySheetAnswer(set,paper=false) {
  const sheet=economyRegionSheet(set);
  if (!sheet) return '';
  const values=economySheetValues(set);
  if (paper && !values.flat().some(filled)) return '';
  const rows=sheet.rows.map(([label],row)=>{
    if (paper && !values[row].some(filled)) return '';
    return '<tr><th scope="row">'+esc(label)+'</th>'+sheet.periods.map((period,col)=>'<td>'+(paper ? esc(values[row][col]||'—') :
      '<input type="text" inputmode="text" maxlength="24" autocomplete="off" id="'+economySheetKey(set,row,col)+'" data-key="'+economySheetKey(set,row,col)+'" aria-label="'+esc(label+' '+period)+'" value="'+esc(values[row][col])+'">')+'</td>').join('')+'</tr>';
  }).join('');
  return '<div class="'+(paper ? '' : 'stat-table-wrap')+'"><table class="'+(paper ? 'paper-picked' : 'stat-table economy-reading-table')+'"><caption '+(paper ? '' : 'class="sr-only"')+'>내가 비교에 쓴 수치</caption><thead><tr><th scope="col">지표</th>'+
    sheet.periods.map(period=>'<th scope="col">'+esc(period)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function economyInitialFields(set) {
  const a=work().answers, fact=economyInitialFactKey(set);
  const sheet=economyRegionSheet(set);
  if (!sheet) return guidedCaseAnalysis(set) ? economyInput(fact,'두 상황의 조건 비교','계산에 쓸 금액·비율과 두 상황에서 달라진 조건을 적으세요.',180) :
    economyInput(fact,'비교에 쓴 수치나 사실','판단에 쓸 수치 또는 사실을 자료에서 골라 적으세요.',180);
  return '<details class="supplement"><summary>비교 수치 메모 (선택)</summary><p>필요한 경우 표의 값을 메모해 두세요.</p>'+economySheetAnswer(set)+
    (filled(a[fact]) ? economyInput(fact,'이전에 적은 비교 기록','필요하면 기존 기록을 고칠 수 있어요.',220) : '')+'</details>';
}
function economyResearchBlock(set) {
  const search=economyGuidePrompts(set)?.[1] || '조사 지역 + 비교 기간 + 확인할 지표(가격, 생산량, 고용률 등)';
  const route = set && ECONOMY_SEARCH_ROUTES[set.id];
  return `<section class="economy-write economy-source-list" id="extra-sources">
      <h2>내 설명을 확인할 자료 찾기</h2>
      <p>처음 읽은 자료와 다른 자료를 한 건 이상 찾으세요. 내 설명과 다른 사실이 나오면 그 차이를 적으세요.</p>
      <p>딱 맞는 통계를 못 찾았다면 찾은 자료의 지역·기간·대상이 어떻게 다른지 쓰고, 그 자료로 판단할 수 있는 범위를 밝혀요.</p>
      ${route ? `<p class="field-hint">${economyPaperLink(route[0],route[1])} · ${esc(route[2])}</p>` : ''}
      <p class="field-hint"><strong>검색어 예시</strong> ${esc(search)}</p>
      <p id="source-count" class="field-hint" role="status"></p>
      ${economyResearchBar()}${sourceCards(set ? 0 : 1)}
      ${set ? `<details class="supplement economy-source-list"><summary>교사가 제공한 참고 자료 (선택)</summary>${guidedSupplementMaterials(set)}</details>` : ''}
    </section>`;
}

function economyStep1Editor(set) {
  const a = work().answers;
  const example = ECONOMY_START_REGIONS['household-budget'];
  const initial = set ? guidedInitialMaterials(set,false) + economyBridgeMaterial(set) + economyInitialFields(set) :
    `<section class="economy-write economy-source-list"><h2>처음 읽을 자료</h2>
      <p>내 주제와 지역을 다룬 기사나 통계표, 직접 조사한 기록을 골라요.</p>
      <details class="supplement"><summary>자료 읽기 예시 · 전남 외식 물가</summary>
        <div class="stat-table-wrap">${guidedRegionTable(example)}</div>
        <p>${esc(example.clue)} ${esc(example.task)}</p>
        <div class="stat-citation">${guidedRegionSources(example)}</div>
      </details>
      ${economyResearchBar()}${economySourceCard(sourceSlots()[0],0,true)}</section>`;
  return '<div class="economy-initial">' + heading(ECONOMY_STEPS[0], '탐구 40점 · 비교할 자료를 읽고 수치와 출처를 확인해요.') +
    `<section class="economy-write economy-identity">
      ${economyTitleInput(set)}
      ${set ? economyQuestionSummary('탐구 질문',economyInquiry()) :
        input('topic','내 탐구 질문 또는 주제','예: 목포 전통시장에 주말 손님이 더 많이 올까?',a.topic,{limit:85})}
      <div class="field-grid student-fields">
        ${input('number','학번','예: 20513',a.number,{limit:10})}
        ${input('name','이름','예: 김하늘',a.name,{limit:10})}
        ${input('team','모둠','예: 3모둠',a.team,{limit:20})}
      </div>
      ${set ? '' : `<div class="field-grid economy-place-fields">${prompt('region')}${prompt('economicPeriod')}</div>`}
    </section>` + initial +
    (guidedCaseAnalysis(set) ? `<section class="economy-write">${economyInput(economyCalculationKey(set),'계산식과 결과',
      (ECONOMY_CALC_METHOD[set.id] || '두 상황을 같은 단위로 계산해요.')+' 사용한 식과 두 결과를 남기세요.',250)}</section>` : '') +
    `<section class="economy-write"><h2>자료에서 확인한 사실과 내 설명</h2>
      ${economyInput(economyOpinionKey(set),economyGuidePrompts(set)?.[0] || '처음 자료에서 무엇을 확인했나요?',
        '근거가 되는 수치나 조건을 들어 비교 결과를 한두 문장으로 쓰세요.',220)}
      ${economyInput(economyToCheckKey(set),'더 조사해서 확인할 점',economyToCheckPrompt(set),220)}
    </section></div>`;
}

const economyResearchLinks = [
  ['빅카인즈 뉴스','https://www.bigkinds.or.kr/'],
  ['국가통계포털 KOSIS','https://kosis.kr/'],
  ['한국은행 경제통계 ECOS','https://ecos.bok.or.kr/']
];

function economySourceCard(source,i,initial = false) {
  const title = initial ? '근거 자료 1' : '보충 근거 자료 '+(economyGuided() ? i+1 : i);
  const existing = hasSource(source);
  return `<section class="source-card" aria-labelledby="card-${i}">
    <div class="card-head"><h3 id="card-${i}" tabindex="-1">${title}</h3>
      <button type="button" data-delete="${i}" aria-label="${title} 삭제" ${existing || i >= minimumSourceSlots() ? '' : 'hidden'}>삭제</button></div>
    ${officialStat(source) ? officialGraph(source.statId) : ''}
    ${sourceChips('type','자료 종류',SOURCE_TYPES,sourceType(source),i)}
    ${input('title','자료 제목','예: 우리 시 상가 공실률 통계',source.title,{source:i})}
    ${input('url','출처 링크 또는 조사한 곳','예: 통계표 링크나 직접 조사한 장소',source.url,{source:i})}
    <div class="field-grid">
      ${input('author','만든 곳 또는 조사한 사람','예: 국가데이터처',source.author,{source:i})}
      ${input('date','발표일 또는 조사일','예: 2026년 11월',source.date,{source:i})}
      ${input('period','자료가 다루는 기간','예: 2024년 1월~2025년 12월',source.period,{source:i,limit:72})}
    </div>
    ${input('fact','자료에서 확인한 핵심 내용','비교에 쓸 수치·단위·기간 또는 원문의 핵심 사실을 적으세요.',sourceFact(source),{source:i,area:true,limit:220})}
    ${input('thought','내 말로 요약','위 수치나 사실이 어떤 변화를 보여 주는지 내 말로 한 문장에 설명하세요.',sourceThought(source),{source:i,area:true,limit:180})}
    ${initial ? '' : input('judgmentUse','이 자료로 내 설명의 어느 부분을 확인했나요?','뒷받침하는 점, 다르게 보게 된 점, 판단하기 어려운 점 중 해당하는 내용을 적으세요.',source.judgmentUse,{source:i,area:true,limit:190})}
    <details class="supplement"${source.scale ? ' open' : ''}><summary>자료의 범위</summary>
      ${sourceChips('scale','어느 범위의 자료인가요?',SOURCE_SCALES,sourceScale(source),i)}</details>
    <details class="supplement"${source._photo ? ' open' : ''}><summary>그래프·표·사진 첨부 (선택)</summary>
      <div class="photo-row">
        ${source._photo ? `<img class="card-image" src="${source._photo}" alt="${title} 이미지"><button type="button" data-remove-photo="${i}">이미지 제거</button>` : ''}
        <label class="upload-button" for="photo-${i}">${source._photo ? '이미지 바꾸기' : '+ 이미지 첨부'}<input id="photo-${i}" type="file" data-photo="${i}" accept="image/jpeg,image/png,image/webp"></label>
        <small>JPEG·PNG·WebP · 원본 20MB까지 · 이 보고서에 최대 4장 · 아이폰 HEIC는 JPEG 또는 화면 캡처로 첨부하세요.</small>
      </div>
      ${source._photo ? input('photoCaption','이미지 설명','예: 시장 점포를 직접 조사한 사진',source.photoCaption,{source:i}) : ''}
    </details>
  </section>`;
}

function economyResearchBar() {
  return `<div class="economy-research-links">${economyResearchLinks.map(([title,url])=>
    `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`).join('')}</div>`;
}

function economyFactsList(set) {
  const direct = work().sources.filter(source=>filled(sourceFact(source))).map(source=>[source.title || source.author || '직접 찾은 자료',[sourceFact(source),source.judgmentUse && '판단에 쓴 점: '+source.judgmentUse].filter(filled).join(' · ')]);
  const initialCaseFact = guidedCaseAnalysis(set) ? work().answers[guidedCaseFactKey(set)] : '';
  const guided = set ? guidedWrittenSources(set).filter(group=>filled(group.excerpt)).map(group=>[group.table.publisher,group.excerpt]) : [];
  const region = set && !guidedCaseAnalysis(set) && activeGuidedRegion(set);
  const regionChange = region ? work().answers[guidedKey(set,'regionalChange')] : '';
  const regional = filled(regionChange) ? [[region.region+' 지역 자료',regionChange]] : [];
  const charts = set ? guidedChartNotes(set).map(({chart,note})=>[chart.title,note]) : [];
  const recorded = economySheetValues(set).flat().some(filled) ? [['내가 비교에 쓴 수치',economySheetValues(set).map((row,index)=>row.some(filled) ? economyRegionSheet(set).rows[index][0]+' '+row.filter(filled).join(' → ') : '').filter(filled).join(' · ')]] : [];
  const facts = [...recorded,...(filled(initialCaseFact) ? [['모의 비교 자료',initialCaseFact]] : []),...guided,...regional,...charts,...direct];
  return facts.length ? `<section class="economy-reminder"><h2>내가 정리한 사실</h2>
    <ul class="guided-evidence-list">${facts.map(([title,fact])=>`<li><strong>${esc(title)}</strong> ${esc(fact)}</li>`).join('')}</ul></section>` : '';
}

function economyStep2Editor(set) {
  const guide = set && guidedInquiryGuide(set);
  const perspective = set ? guidedRolePicker(set) :
    economyInput('economyPerspective','누구의 입장에서 볼까요?','소비자, 가게 운영자, 노동자 등 이 변화와 관련된 사람을 골라요.',100);
  const impact = set ? economyInput(economyImpactKey(set),'이 변화는 누구에게 어떤 영향을 줄까요?',
    (guide.impact || '이 변화로 이익을 얻거나 부담이 늘어날 사람이 누구인지 적어요.') + ' 가능하면 서로 다른 경제 주체 두 쪽의 이익과 부담을 비교하세요.',250) : prompt('economicImpact');
  const a=work().answers;
  return heading(ECONOMY_STEPS[1], '탐구 40점 · 내 설명을 자료로 확인하고 경제 개념으로 설명해요.') +
    economyQuestionSummary('처음 확인한 사실',a[economyOpinionKey(set)]) +
    economyQuestionSummary('더 조사해서 확인할 점',a[economyToCheckKey(set)]) + economyResearchBlock(set) +
    `<details class="supplement"><summary>내가 기록한 근거 모아 보기</summary>${economyFactsList(set)}</details>` +
    `<section class="economy-write">${perspective}</section>` + economyTermGuide(set) +
    `<section class="economy-write">${impact}</section>`;
}

const ECONOMY_ACTION_LABEL = '이 상황에서 내가 할 수 있는 일은 무엇인가요?';
const ECONOMY_FEASIBILITY_LABEL = '그 일을 하려면 어떤 조건이 필요한가요?';

function economyStep3Editor(set) {
  const a = work().answers;
  const guide = set && guidedInquiryGuide(set);
  const term = a[economyTermKey(set)];
  const explanation = set ? a[guidedKey(set,'explain')] ?? a.concepts : a.concepts;
  const analysis = economyQuestionSummary('경제 개념을 적용한 설명',[term,explanation].filter(filled).join(' · ')) +
    economyQuestionSummary('이 변화가 사람들에게 미칠 영향',a[economyImpactKey(set)]);
  const task = '처음 질문에 답하고, 직접 찾은 자료에서 근거를 하나 들어 보세요. 확인하지 못한 점은 단정하지 말고 어떤 조건에서 답이 달라질지 쓰세요.';
  const choice = economyGuidePrompts(set);
  const starterScenario = economyStarterSimulation(set);
  const comparisons = set && (guidedCaseAnalysis(set) || guidedPhenomenon(set)?.application || starterScenario) ?
    `<details class="supplement"${starterScenario ? ' open' : ''}><summary>${starterScenario ? '대안을 비교할 가상 상황' : '모의 상황 다시 보기'}</summary>
      ${starterScenario ? '<p>아래는 선택을 비교하기 위한 가상 조건이에요. 앞의 실제 통계와 구분하세요.</p>' : ''}
      ${guidedReviewCase(set)}
      ${guide.applicationConclusion ? `<p class="field-hint">${esc(guide.applicationConclusion)}</p>` : ''}
    </details>` : '';
  return heading(ECONOMY_STEPS[2], guidedCaseAnalysis(set)
    ? '탐구 결론을 쓰고 비용과 위험을 비교해 선택 기준을 제안해요.'
    : '탐구 결론을 쓰고 지역이나 생활에 적용할 방안을 비교해요.') +
    economyQuestionSummary('처음 탐구 질문',economyDisplayQuestion(set)) +
    (analysis ? `<section class="economy-reminder"><h2>앞에서 쓴 분석</h2>${analysis}</section>` : '') +
    `<section class="economy-write">
      ${economyInput(economyConclusionKey(set),'최종 판단과 근거',task,320,a[economyConclusionKey(set)] ?? a.economicConclusion)}
      ${economyInput(economyLimitKey(set),ECONOMY_SINGLE_SOURCE_LABEL,
        '살펴본 자료 중 한 건을 골라, 그 자료만 봤다면 놓치거나 잘못 판단할 수 있었던 점을 쓰세요. 다른 자료를 함께 보니 판단이 어떻게 달라졌나요?',220)}
    </section>
    <section class="economy-write"><h2>두 방안 비교와 제안</h2>
      ${comparisons}
      ${economyInput(economyChoiceKey(set),choice?.[2] || '고려한 두 방안을 같은 기준으로 비교해 보세요.',
        (choice?.[3] || '누가 이익을 얻고 누가 비용을 부담하는지 비교하세요.')+' 근거가 부족하면 어떤 조건에서 선택이 달라질지 쓰세요.',300)}
      ${economyInput('economicPlan',guidedCaseAnalysis(set) ? '어떤 선택 기준을 제안하나요?' : '어떤 방안을 제안하나요?',
        guidedCaseAnalysis(set) ? '비교에서 얻은 기준과 그 이유, 실제 결정을 내리기 전에 확인할 정보를 적으세요.' :
          '고른 방안과 이유, 실행할 주체, 효과를 확인할 방법을 적으세요.',250,a.economicPlan ?? a.policy)}
    </section>${economyPracticeEditor(set)}`;
}

function economyPracticeEditor(set) {
  const hint=set && (guidedUsesStarter(set) ? ECONOMY_CURRENT_PRACTICES[set.id] : ECONOMY_REGION_INQUIRIES[set.id].practice);
  return `<section class="economy-write"><h2>내가 할 수 있는 일과 가능성</h2>
      <p>기업이나 지자체에 한 제안을 그대로 실행할 필요는 없어요. 지금 내 상황에서 할 수 있는 일을 생각해 보세요. 금융 모의 주제는 실제 투자나 대출을 하지 않아요.</p>
      ${hint ? `<details class="supplement"><summary>내가 할 수 있는 일의 예</summary><p>${esc(hint)}</p></details>` : ''}
      ${economyInput('practicePlan',ECONOMY_ACTION_LABEL,'내 판단이나 제안과 연결되는 작은 행동을 하나 쓰세요. 아직 하지 않은 일도 제안할 수 있어요.',220)}
      ${economyInput('economyActionFeasibility',ECONOMY_FEASIBILITY_LABEL,'시간, 비용, 자료, 도움을 받을 사람을 생각해 보세요. 지금 하기 어렵다면 무엇을 줄이거나 바꾸면 가능할지 쓰세요.',220)}
    </section>`;
}

function economyStep4Editor(set) {
  const checks = [
    '자료의 출처와 비교한 수치를 적었어요.',
    '경제 개념으로 자료에서 확인한 점과 예상한 영향을 나눠 설명했어요.',
    '내가 할 수 있는 일과 그 일을 하려면 필요한 조건을 적었어요.',
    '보고서 제목과 학번, 이름, 모둠을 확인했어요.'
  ];
  const a=work().answers;
  const old = [
    ['실제로 해 본 일과 결과',a.practiceResult], ['발표·토의와 돌아보기',a.reflection],
    ['함께하며 내가 한 역할과 배려',a.role], ['친구에게 배운 점',a.peerLearning]
  ].filter(([,value])=>filled(value)).map(([label,value])=>economyPaperItem(label,value)).join('');
  return heading(ECONOMY_STEPS[3], '보고서와 친구에게 남길 피드백은 각각 작성하고 저장해요.') +
    `<section class="economy-write">${economyTitleInput(set,true)}
      <p id="economy-ready" class="field-hint" aria-live="polite"></p></section>
    <section class="economy-write"><h2>친구 보고서 읽고 피드백 남기기</h2>
      <p>친구 보고서를 읽고 새로 알게 된 점과 내 생각을 공유 기록에 적어요. 함께 이야기했다면 내가 한 역할과 배려도 그곳에 기록해요.</p>
      <a href="listening.html?task=economy" target="_blank" rel="noopener">경제 탐구 공유 기록하기 (새 탭)</a>
    </section>
    ${old ? `<details class="supplement"><summary>이 보고서에 이전에 쓴 실천·공유 기록</summary><p>기존 기록은 그대로 보관되어 있어요. 이번 보고서 PDF에는 넣지 않아요.</p>${old}</details>` : ''}
    <details class="supplement"><summary>인쇄 전 점검</summary>
      ${checklist('인쇄 전 확인할 내용',checks)}
    </details>`;
}

const ECONOMY_EDITORS = [economyStep1Editor,economyStep2Editor,economyStep3Editor,economyStep4Editor];

function economySourceCount(set) {
  const own = work().sources.filter(economyFactRecorded).map(source=>source.url?.trim() || [source.author,source.title].join(' · '));
  if (!set) return new Set(own).size;
  const official = guidedWrittenSources(set).filter(group=>filled(group.excerpt)).map(group=>group.table.sourceUrl);
  official.push(...guidedChartNotes(set).map(({chart})=>chart.sourceUrl));
  const region = activeGuidedRegion(set);
  if (region && !guidedCaseAnalysis(set) && economyInitialRecorded(set))
    official.push(...region.sources.map(([, ,url])=>url));
  return new Set([...official,...own]).size;
}

function economyCompleted(set) {
  const {answers:a,sources} = work();
  const first = sources[0] || {};
  const initial = set ? economyInitialRecorded(set,a) :
    [a.topic,answer('region'),a.economicPeriod].every(filled) && economyFactRecorded(first);
  const explain = set ? a[guidedKey(set,'explain')] ?? a.concepts : a.concepts;
  return [
    Boolean(filled(economyTitle(set)) && initial && filled(a[economyOpinionKey(set)]) && filled(a[economyToCheckKey(set)]) && (!guidedCaseAnalysis(set) || filled(a[economyCalculationKey(set)]))),
    Boolean(economyOwnEvidence(set).length && [economyPerspective(set),a[economyTermKey(set)],explain,a[economyImpactKey(set)]].every(filled)),
    [a[economyConclusionKey(set)] ?? a.economicConclusion,a[economyChoiceKey(set)],answer('economicPlan'),a.practicePlan,a.economyActionFeasibility].every(filled),
    [a.number,a.name].every(filled)
  ];
}

function economyMissing(set) {
  const a = work().answers;
  return [
    [filled(a.number) && filled(a.name),'학번·이름'],
    [set ? economyInitialRecorded(set,a) : Boolean(filled(a.topic) && filled(answer('region')) && filled(a.economicPeriod) && economyFactRecorded(work().sources[0] || {})),'초기 자료의 핵심 사실'],
    [filled(a[economyOpinionKey(set)]),'처음 확인한 사실'],
    [filled(a[economyToCheckKey(set)]),'더 조사해서 확인할 점'],
    [economyOwnEvidence(set).length,'직접 찾은 보충 자료(출처·핵심 내용·요약·의견에 쓴 점)'],
    [!guidedCaseAnalysis(set) || filled(a[economyCalculationKey(set)]),'비교·계산 과정'],
    [filled(economyPerspective(set)),'분석할 사람이나 기업의 입장'],
    [filled(a[economyTermKey(set)]) && filled(set ? a[guidedKey(set,'explain')] ?? a.concepts : a.concepts),'경제 개념과 근거 연결'],
    [filled(a[economyImpactKey(set)]),'경제 주체별 영향'],
    [filled(a[economyConclusionKey(set)] ?? a.economicConclusion),'최종 판단'],
    [filled(a[economyChoiceKey(set)]),'두 방안 비교'],
    [filled(answer('economicPlan')),'해결 방안·경제적 선택 기준'],
    [filled(a.practicePlan),'내가 할 수 있는 일'],
    [filled(a.economyActionFeasibility),'실현에 필요한 조건']
  ].filter(([done])=>!done).map(([,label])=>label);
}

function economyPaperChapter(title, content) {
  return `<section class="paper-section paper-inquiry-section"><h3>${title}</h3>${content || '<p class="paper-empty">작성한 내용이 여기에 들어가요.</p>'}</section>`;
}

function economyPaperFields(keys) {
  return keys.filter(key=>filled(answer(key))).map(key=>posterFields([key])).join('');
}

function economyPaperItem(heading, text) {
  return filled(text) ? `<section><h4>${esc(heading)}</h4><p>${esc(text)}</p></section>` : '';
}

function economyLegacyReport(set, details = '') {
  const a = work().answers;
  const includedCharts = new Set(work().sources.map(source=>source.statId));
  const startsWithSource = set && !guidedCaseAnalysis(set) && !guidedPhenomenon(set)?.regionalFirst;
  if (set) {
    const first = guidedSourceGroups(set)[0];
    const initialCharts = startsWithSource ? guidedInitialCharts(set,first) : [];
    for (const id of [...initialCharts,...guidedChartNotes(set).map(item=>item.id)]) includedCharts.add(id);
  }
  const packs = Object.keys(ECONOMY_DATA.packs).map(id=>{
    const pack = {id,...ECONOMY_DATA.packs[id]};
    const answers = readingFields(pack).filter(field=>filled(a[field.key]));
    const prefix = 'reading_'+id+'_';
    const notes = [['refinedInquiry','자료를 읽고 다듬은 질문'],['evidenceReason','근거를 고른 이유']]
      .map(([key,label])=>economyQuestionSummary(label,a[prefix+key])).join('');
    if (!answers.length && !notes) return '';
    const title = TOPIC_IDEAS.economy.find(idea=>idea.id===id)?.label || id;
    const charts = answers.length ? pack.charts.filter(id=>!includedCharts.has(id)) : [];
    charts.forEach(id=>includedCharts.add(id));
    const visuals = charts.length ? `<div class="evidence-grid">${charts.map(id=>`<figure>${officialGraph(id,true)}</figure>`).join('')}</div>` : '';
    return `<section><h4>${esc(title)}</h4>${notes}${visuals}${guidedReportFields(answers)}</section>`;
  }).join('');
  const direct = ['refinedInquiry','evidenceReason'].map((key,index)=>
    economyQuestionSummary(index ? '근거를 고른 이유' : '다듬은 질문',a[key])).join('');
  const previousFirstUse = startsWithSource ? guidedWrittenSources(set).find(group=>group.storageId===guidedSourceGroups(set)[0].storageId && filled(group.use)) : null;
  const guided = set ? guidedArchivedReport(set) + (previousFirstUse ? guidedEvidenceTable([{...previousFirstUse,excerpt:''}]) : '') + economyPaperFields(['region','economicPeriod','economicChange','economicCause','economicImpact']) : '';
  const archive = details + direct + packs + guided + economyPaperFields(['reason','comparison','interpretation','proposal']);
  return archive ? economyPaperChapter('부록. 이전 활동에서 쓴 기록',archive) : '';
}

function economyPaperLink(title, url) {
  if (!/^https?:\/\//i.test(url || '')) return esc(title);
  return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`;
}

function economyPaperSource(source) {
  return /^https?:\/\//i.test(source || '') ? economyPaperLink('원문',source) : esc(source);
}

function economyPaperReference(set, sources) {
  const listed = new Map();
  const add = (publisher,title,url,date) => {
    const origin = url?.trim() || '';
    const isLink = /^https?:\/\//i.test(origin);
    const key = isLink ? origin : JSON.stringify([publisher,title,origin]);
    if (!filled(title) || listed.has(key)) return;
    const place = !isLink && origin !== title.trim() ? esc(origin) : '';
    listed.set(key,`<p>${[publisher,economyPaperLink(title,origin),place,date].filter(filled).join(' · ')}</p>`);
  };
  if (set) {
    for (const {table} of guidedWrittenSources(set))
      add(esc(table.publisher),table.sourceTitle,table.sourceUrl,studyDate(table));
    for (const {chart} of guidedChartNotes(set))
      add(esc(chart.publisher),chart.sourceTitle,chart.sourceUrl,studyDate(chart));
    if (economyRegionSheet(set) || guidedRegionWasUsed(set)) {
      const region = activeGuidedRegion(set);
      for (const [publisher,title,url] of region?.sources || []) add(esc(publisher),title,url,'');
    }
    const bridge = economyStarterBridge(set);
    if (bridge) add(esc(bridge.publisher),bridge.sourceTitle,bridge.url,'');
  }
  for (const source of sources) {
    const title = source.title || source.author || '직접 찾은 자료';
    if (filled(sourceFact(source)) || source._photo) add(esc(source.author),title,source.url,[source.date,source.period && '자료 기간: '+source.period].filter(filled).map(esc).join(' · '));
  }
  return listed.size ? `<section class="paper-sources paper-references"><h4>참고 출처</h4>${[...listed.values()].join('')}</section>` : '';
}

function economyPoster(set) {
  const {answers:a,sources,attachments=[]} = work();
  const phenomenon = guidedPhenomenon(set);
  const caseGuide = guidedCaseAnalysis(set);
  const regionFirst = phenomenon?.regionalFirst;
  const [first] = set ? guidedSourceGroups(set) : [];
  const written = set ? guidedWrittenSources(set) : [];
  const initial = first ? written.find(group=>group.storageId===first.storageId) : null;
  const additional = caseGuide || regionFirst ? written : first ? written.filter(group=>group.storageId!==first.storageId) : [];
  const initialSources = !set && sources[0] && hasSource(sources[0]) ? [sources[0]] : [];
  const supplementSources = sources.slice(set ? 0 : 1).filter(hasSource);
  const supplementText = guidedTextSources(supplementSources);
  const initialText = guidedTextSources(initialSources);
  const charts = first ? guidedInitialCharts(set,first) : [];
  const firstChapter = caseGuide ?
    guidedReviewCase(set,true) + economyPaperItem('상황에서 확인한 수치와 조건',a[guidedCaseFactKey(set)]) :
    regionFirst ? guidedRegionReport(set) : set ?
    guidedEvidenceTable(filled(initial?.excerpt) ? [{...initial,use:''}] : []) +
    guidedResearchVisuals(set,true,charts) :
    economyPaperFields(['region','economicPeriod']) + guidedEvidenceTable([],initialText,'자료 해석') +
    reportEvidenceFigures(initialSources.filter(source=>!initialText.includes(source)),[],true);
  const chartNotes = set ? guidedChartNotes(set) : [];
  const facts = guidedEvidenceTable(additional,supplementText,'자료로 설명한 점') +
    (set ? (regionFirst ? '' : guidedRegionReport(set)) + chartNotes.map(({id,note,chart})=>
      economyPaperItem(chart.title,note) + guidedResearchVisuals(set,true,[id])).join('') : '') +
    reportEvidenceFigures(supplementSources.filter(source=>!supplementText.includes(source)),attachments,true);
  const question = economyPaperItem(economyInquiryLabel(set),economyDisplayQuestion(set));
  const limits = economyPaperItem(ECONOMY_SINGLE_SOURCE_LABEL,a[economyLimitKey(set)]);
  const term = a[economyTermKey(set)];
  const explanation = set ? a[guidedKey(set,'explain')] ?? a.concepts : a.concepts;
  const analysis = economyPaperItem('나의 관점',economyPerspective(set)) +
    economyPaperItem(['경제 개념 적용',term].filter(filled).join(' · '),explanation) +
    economyPaperItem('경제 주체별 영향',a[economyImpactKey(set)]);
  const judgment = economyPaperItem('최종 판단과 근거',a[economyConclusionKey(set)] ?? a.economicConclusion);
  const practice = economyPaperItem(ECONOMY_ACTION_LABEL,a.practicePlan) + economyPaperItem(ECONOMY_FEASIBILITY_LABEL,a.economyActionFeasibility);
  const proposal = economyPaperItem(caseGuide ? '경제적 선택 기준' : '제안하는 방안',a.economicPlan ?? a.policy);
  const previous = set ?
    economyPaperItem('판단 기준',economyCriterion(set)) +
    guidedReportAnswers(set,['regionalCause','applicationJudgment','decisionSummary']) +
    guidedReadingReport(set,['read','compare']) + guidedComparisonReport(set) :
    economyPaperFields(['economicChange','economicCause']) +
    economyPaperItem('내 판단에 영향을 준 추가 근거',a.economyEvidenceImpact);
  const topic = set ? guidedTopicLabel(set) : a.topic;
  return `<article class="paper">
    <header class="paper-header paper-inquiry-header">
      <h2>${esc(economyTitle(set) || '경제 탐구 보고서')}</h2>
      ${filled(topic) ? `<p class="paper-topic"><strong>탐구 주제</strong> ${esc(topic)}</p>` : ''}
      <p class="paper-author">
        <span><strong>학번</strong> ${esc(a.number || '________')}</span>
        <span><strong>이름</strong> ${esc(a.name || '________')}</span>
        <span><strong>모둠</strong> ${esc(a.team || '________')}</span>
        ${filled(a.classroom) ? `<span>${esc(a.classroom)}</span>` : ''}</p>
    </header>
    ${economyPaperChapter('Ⅰ. 질문과 첫 자료',question + firstChapter + economyBridgeMaterial(set,true) + economySheetAnswer(set,true) +
      (guidedCaseAnalysis(set) ? economyPaperItem('비교·계산 과정',a[economyCalculationKey(set)]) : '') +
      economyPaperItem('처음 확인한 사실·의견',a[economyOpinionKey(set)]) +
      economyPaperItem('더 조사해서 확인할 점',a[economyToCheckKey(set)]))}
    ${economyPaperChapter('Ⅱ. 추가 조사와 경제 분석',facts + analysis)}
    ${economyPaperChapter('Ⅲ. 결론과 제안',judgment + limits + (economyStarterSimulation(set) ? guidedReviewCase(set,true) : '') + economyPaperItem('두 방안 비교',a[economyChoiceKey(set)]) + proposal + practice)}
    ${economyPaperReference(set,sources)}
    ${economyLegacyReport(set,previous)}
  </article>`;
}
