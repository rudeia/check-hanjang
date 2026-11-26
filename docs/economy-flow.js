'use strict';

const ECONOMY_STEPS = ['주제와 자료 읽기', '경제 개념 분석', '판단과 지역사회 실천', '협업·성찰 및 완성'];
const economyPhase = (set, version = 'V4') => set ? guidedKey(set,'phase'+version) : 'economyPhase'+version;
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

function economyStep1Editor(set) {
  const a = work().answers;
  const example = ECONOMY_START_REGIONS['household-budget'];
  const initial = set ? guidedInitialMaterials(set,false) +
    economyInput(economyInitialFactKey(set),'자료에서 확인한 사실',
      guidedCaseAnalysis(set) ? '두 상황에서 달라지는 수치와 조건을 적어요.' : '같은 항목의 두 시점 수치와 단위를 써요.',220) :
    `<section class="economy-write economy-source-list"><h2>처음 읽을 자료</h2>
      <p>내 주제와 지역을 다룬 기사나 통계표, 직접 조사한 기록을 골라요.</p>
      <details class="supplement"><summary>자료 읽기 예시 · 전남 외식 물가</summary>
        <div class="stat-table-wrap">${guidedRegionTable(example)}</div>
        <p>${esc(example.clue)} ${esc(example.task)}</p>
        <div class="stat-citation">${guidedRegionSources(example)}</div>
      </details>
      ${economyResearchBar()}${economySourceCard(sourceSlots()[0],0,true)}</section>`;
  const limits = guidedCaseAnalysis(set) ? '이 비교에서 뺀 비용이나 조건 중 하나를 적어요.' :
    '이 자료만으로 알 수 없는 점과 더 확인할 자료를 적어요.';
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
    `<section class="economy-write">${economyInput(economyLimitKey(set),'자료의 한계',limits,220)}</section>
    <p id="source-count" class="field-hint" role="status"></p>
    ${set ? `<details class="supplement economy-source-list"><summary>추가 비교 자료 보기 (선택)</summary>${guidedSupplementMaterials(set)}</details>` : ''}
    ${set && guidedPhenomenon(set)?.application ? `<details class="supplement"><summary>자료를 적용한 모의 상황 (선택)</summary>${guidedReviewCase(set)}</details>` : ''}
    <details class="supplement economy-source-list" id="extra-sources"${work().sources.slice(set ? 0 : 1).some(hasSource) ? ' open' : ''}>
      <summary>${set ? '직접 찾은 자료 (선택)' : '내 자료 더 추가하기 (선택)'}</summary>${economyResearchBar()}${sourceCards(set ? 0 : 1)}
    </details></div>`;
}

const economyResearchLinks = [
  ['빅카인즈 뉴스','https://www.bigkinds.or.kr/'],
  ['국가통계포털 KOSIS','https://kosis.kr/'],
  ['한국은행 경제통계 ECOS','https://ecos.bok.or.kr/']
];

function economySourceCard(source,i,initial = false) {
  const title = '근거 자료 '+(i+1);
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
    </div>
    ${input('fact','자료에서 확인한 사실','수치, 단위, 시점과 함께 적어요.',sourceFact(source),{source:i,area:true,limit:220})}
    ${!initial || filled(sourceThought(source)) ? `<details class="supplement"><summary>자료를 읽고 해석한 점 (선택)</summary>
      ${input('thought','자료가 보여 주는 점','처음 자료와 비교해 알 수 있는 점을 적어요.',sourceThought(source),{source:i,area:true,limit:180})}</details>` : ''}
    <details class="supplement"${source.scale ? ' open' : ''}><summary>자료의 범위</summary>
      ${sourceChips('scale','어느 범위의 자료인가요?',SOURCE_SCALES,sourceScale(source),i)}</details>
    <details class="supplement"${source._photo ? ' open' : ''}><summary>이미지 첨부 (선택)</summary>
      <div class="photo-row">
        ${source._photo ? `<img class="card-image" src="${source._photo}" alt="${title} 이미지"><button type="button" data-remove-photo="${i}">이미지 제거</button>` : ''}
        <label class="upload-button" for="photo-${i}">${source._photo ? '이미지 바꾸기' : '+ 이미지 첨부'}<input id="photo-${i}" type="file" data-photo="${i}" accept="image/jpeg,image/png,image/webp"></label>
        <small>JPEG·PNG·WebP · 원본 20MB까지 · 과제당 최대 4장</small>
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
  const direct = work().sources.filter(source=>filled(sourceFact(source))).map(source=>[source.title || source.author || '직접 찾은 자료',sourceFact(source)]);
  const initialCaseFact = guidedCaseAnalysis(set) ? work().answers[guidedCaseFactKey(set)] : '';
  const guided = set ? guidedWrittenSources(set).filter(group=>filled(group.excerpt)).map(group=>[group.table.publisher,group.excerpt]) : [];
  const region = set && !guidedCaseAnalysis(set) && activeGuidedRegion(set);
  const regionChange = region ? work().answers[guidedKey(set,'regionalChange')] : '';
  const regional = filled(regionChange) ? [[region.region+' 지역 자료',regionChange]] : [];
  const charts = set ? guidedChartNotes(set).map(({chart,note})=>[chart.title,note]) : [];
  const facts = [...(filled(initialCaseFact) ? [['모의 비교 자료',initialCaseFact]] : []),...guided,...regional,...charts,...direct];
  return facts.length ? `<section class="economy-reminder"><h2>내가 정리한 사실</h2>
    <ul class="guided-evidence-list">${facts.map(([title,fact])=>`<li><strong>${esc(title)}</strong> ${esc(fact)}</li>`).join('')}</ul></section>` : '';
}

function economyStep2Editor(set) {
  const guide = set && guidedInquiryGuide(set);
  const perspective = set ? guidedRolePicker(set) :
    economyInput('economyPerspective','누구의 입장에서 볼까요?','소비자, 가게 운영자, 노동자 등 이 변화와 관련된 사람을 골라요.',100);
  const impact = set ? economyInput(economyImpactKey(set),'이 변화는 누구에게 어떤 영향을 줄까요?',
    guide.impact || '이 변화로 이익을 얻거나 부담이 늘어날 사람이 누구인지 적어요.',250) : prompt('economicImpact');
  return heading(ECONOMY_STEPS[1], '앞에서 찾은 사실을 경제 개념으로 설명해요.') + economyFactsList(set) +
    `<section class="economy-write">${perspective}</section>` + economyTermGuide(set) +
    `<section class="economy-write">${impact}</section>`;
}

const ECONOMY_PRACTICE_STATUS = { plan:'아직 실천 전', done:'실제로 실천함' };

function economyStep3Editor(set) {
  const a = work().answers;
  const status = a.practiceStatus === 'done' ? 'done' : 'plan';
  const guide = set && guidedInquiryGuide(set);
  const hint = set && (guidedUsesStarter(set) ? ECONOMY_CURRENT_PRACTICES[set.id] : ECONOMY_REGION_INQUIRIES[set.id].practice);
  const term = a[economyTermKey(set)];
  const explanation = set ? a[guidedKey(set,'explain')] ?? a.concepts : a.concepts;
  const analysis = economyQuestionSummary('경제 개념을 적용한 설명',[term,explanation].filter(filled).join(' · ')) +
    economyQuestionSummary('이 변화가 사람들에게 미칠 영향',a[economyImpactKey(set)]);
  const task = guide?.conclusion || '자료에서 확인한 사실과 경제 개념을 함께 써서 내 판단을 설명해요.';
  const comparisons = set && (guidedCaseAnalysis(set) || guidedPhenomenon(set)?.application) ?
    `<details class="supplement"><summary>모의 상황 다시 보기</summary>${guidedReviewCase(set)}
      ${guide.applicationConclusion ? `<p class="field-hint">${esc(guide.applicationConclusion)} 실제 지역 자료에서 얻은 판단과 구분해 적어요.</p>` : ''}
    </details>` : '';
  return heading(ECONOMY_STEPS[2], '변화 방안과 실천 30점 · 내 판단을 지역에서 할 수 있는 일로 이어 봐요.') +
    (analysis ? `<section class="economy-reminder"><h2>앞에서 쓴 분석</h2>${analysis}</section>` : '') +
    `<section class="economy-write">
      ${comparisons}${economyInput(economyConclusionKey(set),'최종 판단과 근거',task,320,a[economyConclusionKey(set)] ?? a.economicConclusion)}
    </section>
    <section class="economy-write"><h2>지역사회 변화 방안과 실천</h2>
      ${hint ? `<details class="supplement"><summary>실천 아이디어 보기</summary><p>${esc(hint)}</p></details>` : ''}
      ${prompt('economicPlan')}
      <fieldset class="checklist"><legend>실천 상태</legend>${Object.entries(ECONOMY_PRACTICE_STATUS).map(([key,label])=>
        `<label><input type="radio" name="practice-status" value="${key}"${status === key ? ' checked' : ''}> <span>${label}</span></label>`).join('')}</fieldset>
      ${status === 'done' ? economyInput('practiceResult','실제로 해 본 일과 결과','언제 무엇을 했고, 어떤 결과를 확인했는지 적어요.',200) : prompt('practicePlan')}
    </section>`;
}

function economyStep4Editor(set) {
  const checks = [
    '자료의 출처와 비교한 수치를 적었어요.',
    '경제 개념으로 원인과 영향을 설명했어요.',
    '지역사회 변화 방안과 내가 할 일을 적었어요.',
    '보고서 제목과 학번, 이름, 모둠을 확인했어요.'
  ];
  return heading(ECONOMY_STEPS[3], '발표·협업·성찰 30점 · 함께한 과정과 조사하며 달라진 생각을 돌아봐요.') +
    `<section class="economy-write">
      ${prompt('reflection')}${prompt('role')}${prompt('peerLearning')}
      <a href="listening.html?task=economy" target="_blank" rel="noopener">친구 발표 듣고 기록하기 (새 탭)</a>
    </section>
    <section class="economy-write">${economyTitleInput(set,true)}</section>
    <details class="supplement"><summary>인쇄·공유 전 점검</summary>
      ${checklist('인쇄 전 확인할 내용',checks)}
      ${checklist('발표 전 확인할 내용',taskRehearsal(),CHECKLIST.length)}
    </details>`;
}

const ECONOMY_EDITORS = [economyStep1Editor,economyStep2Editor,economyStep3Editor,economyStep4Editor];

function economySourceCount(set) {
  const own = work().sources.filter(economyFactRecorded).map(source=>source.url?.trim() || [source.author,source.title].join(' · '));
  if (!set) return new Set(own).size;
  const official = guidedWrittenSources(set).filter(group=>filled(group.excerpt)).map(group=>group.table.sourceUrl);
  official.push(...guidedChartNotes(set).map(({chart})=>chart.sourceUrl));
  const region = activeGuidedRegion(set);
  if (region && !guidedCaseAnalysis(set) && filled(work().answers[guidedKey(set,'regionalChange')]))
    official.push(...region.sources.map(([, ,url])=>url));
  return new Set([...official,...own]).size;
}

function economyCompleted(set) {
  const {answers:a,sources} = work();
  const first = sources[0] || {};
  const initial = set ? filled(a[economyInitialFactKey(set)]) :
    [a.topic,answer('region'),a.economicPeriod].every(filled) && economyFactRecorded(first);
  const explain = set ? a[guidedKey(set,'explain')] ?? a.concepts : a.concepts;
  const practice = a.practiceStatus === 'done' ? a.practiceResult : a.practicePlan;
  return [
    Boolean(filled(economyTitle(set)) && initial && filled(a[economyLimitKey(set)])),
    [economyPerspective(set),a[economyTermKey(set)],explain,a[economyImpactKey(set)]].every(filled),
    [a[economyConclusionKey(set)] ?? a.economicConclusion,answer('economicPlan'),practice].every(filled),
    [a.reflection,a.role].every(filled)
  ];
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
    if (guidedRegionWasUsed(set)) {
      const region = activeGuidedRegion(set);
      for (const [publisher,title,url] of region?.sources || []) add(esc(publisher),title,url,'');
    }
  }
  for (const source of sources) {
    const title = source.title || source.author || '직접 찾은 자료';
    if (filled(sourceFact(source)) || source._photo) add(esc(source.author),title,source.url,esc(source.date));
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
  const question = economyPaperItem(economyInquiryLabel(set),economyInquiry());
  const limits = economyPaperItem('자료의 한계',a[economyLimitKey(set)]);
  const term = a[economyTermKey(set)];
  const explanation = set ? a[guidedKey(set,'explain')] ?? a.concepts : a.concepts;
  const analysis = economyPaperItem('나의 관점',economyPerspective(set)) +
    economyPaperItem(['경제 개념 적용',term].filter(filled).join(' · '),explanation) +
    economyPaperItem('경제 주체별 영향',a[economyImpactKey(set)]);
  const judgment = economyPaperItem('최종 판단과 근거',a[economyConclusionKey(set)] ?? a.economicConclusion);
  const practiceStatus = Object.hasOwn(ECONOMY_PRACTICE_STATUS,a.practiceStatus) ?
    ECONOMY_PRACTICE_STATUS[a.practiceStatus] : filled(a.practicePlan) ? ECONOMY_PRACTICE_STATUS.plan : '';
  const practice = economyPaperFields(['economicPlan']) + economyPaperItem('실천 상태',practiceStatus) +
    economyPaperFields(a.practiceStatus === 'done' ? ['practiceResult'] : ['practicePlan']);
  const reflections = economyPaperFields(['reflection','role','peerLearning']) + economyPaperReference(set,sources);
  const originalPractice = economyPaperFields(a.practiceStatus === 'done' ? ['practicePlan'] : ['practiceResult']);
  const previous = originalPractice + (set ?
    economyPaperItem('판단 기준',economyCriterion(set)) +
    economyPaperItem('첫 의견과 이유',a[economyOpinionKey(set)]) +
    guidedReportAnswers(set,['regionalCause','applicationJudgment','decisionSummary']) +
    guidedReadingReport(set,['read','compare']) + guidedComparisonReport(set) :
    economyPaperFields(['economicChange','economicCause']) +
    economyPaperItem('내 판단에 영향을 준 추가 근거',a.economyEvidenceImpact));
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
    ${economyPaperChapter('Ⅰ. 주제와 근거 자료',question + firstChapter + limits + facts)}
    ${economyPaperChapter('Ⅱ. 경제 개념과 영향 분석',analysis)}
    ${economyPaperChapter('Ⅲ. 최종 판단과 지역사회 실천',judgment + practice)}
    ${economyPaperChapter('Ⅳ. 협업과 성찰',reflections)}
    ${economyLegacyReport(set,previous)}
  </article>`;
}
