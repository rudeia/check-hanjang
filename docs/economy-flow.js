'use strict';

const ECONOMY_STEPS = ['초기 자료 해석', '입장과 첫 의견', '보충 자료 조사', '자료 정리와 개념 비교', '최종 의견·보고서 완성'];
const economyPhase = set => set ? guidedKey(set,'phaseV3') : 'economyPhaseV3';
const economyQuestionKey = set => set ? guidedKey(set,'inquiryV2') : 'inquiry';
const economyFactRecorded = source => filled(sourceFact(source)) && filled(source.url || source.author);

function economyInput(key, label, hint, limit, value = work().answers[key]) {
  return input(key,label,'자료에서 확인한 내용과 내 생각을 적어 보세요.',value,{area:true,limit,hint});
}

function economyTitle(set) {
  const a = work().answers;
  return set ? a[guidedKey(set,'topicTitle')] || set.label : a.posterTitle || a.topic || '';
}

function economyPerspective(set) {
  return set ? guidedRole(set) : work().answers.economyPerspective;
}

function economyCriterion(set) {
  return work().answers[set ? guidedKey(set,'criterion') : 'economyCriterion'];
}

const economyOpinionKey = set => set ? guidedKey(set,'initialOpinionV3') : 'economyInitialOpinion';
const economyJudgmentEvidence = set => work().answers[set ? guidedKey(set,'supplementAnalysis') : 'economyEvidenceImpact'];

function economyInitialEditor(set) {
  const a = work().answers;
  const titleKey = set ? guidedKey(set,'topicTitle') : 'posterTitle';
  return heading(ECONOMY_STEPS[0], '자료에서 비교할 사실을 찾고, 어떤 변화나 차이가 보이는지 적어요.') +
    `<section class="economy-write">
      ${input(titleKey,'탐구 보고서 제목',set?.label || '예: 우리 동네 상권의 변화와 선택',a[titleKey],{limit:60})}
      ${set ? `<p><strong>탐구 주제</strong> ${esc(set.label)}</p>` : input('topic','탐구 주제','예: 전통시장 방문객과 점포 매출',a.topic,{limit:60})}
      <div class="field-grid student-fields">
        ${input('number','학번','예: 20513',a.number,{limit:10})}
        ${input('name','이름','예: 김하늘',a.name,{limit:10})}
        ${input('team','모둠','예: 3모둠',a.team,{limit:20})}
      </div>
      ${set ? '' : prompt('region') + prompt('economicPeriod')}
    </section>` + (set ? guidedInitialMaterials(set) :
      `<section class="economy-write economy-source-list"><h2>처음 읽을 자료</h2>
        ${economyResearchBar()}${economySourceCard(sourceSlots()[0],0,true)}</section>`);
}

function economyOpinionEditor(set) {
  const a = work().answers;
  const source = work().sources[0] || {};
  const initialFact = set ? guidedSourceAnswer(set,guidedSourceGroups(set)[0].storageId,'excerpt') : sourceFact(source);
  const initialRead = set ? a[guidedKey(set,'read')] : sourceThought(source);
  const reminder = economyQuestionSummary('확인한 사실',initialFact) + economyQuestionSummary('내 해석',initialRead);
  const question = set ? '기본 질문을 써도 좋아요. 범위를 좁히고 싶을 때만 고쳐 적어요.' :
    '읽은 자료에 나온 지역·시점·경제 현상 중 하나를 바꿔 써도 좋아요. 예: 방문객이 늘면 시장 점포 매출도 늘까요?';
  return heading(ECONOMY_STEPS[1], '방금 읽은 사실을 바탕으로 누구의 입장에서 판단할지 정해요.') +
    (reminder ? `<section class="economy-reminder"><h2>1단계에서 내가 읽은 자료</h2>${reminder}</section>` : '') +
    (set ? `<section class="economy-context"><h2>${esc(set.decision.question)}</h2>${guidedDecisionPrompt(set)}</section>` : '') +
    `<section class="economy-write">
      ${economyInput(economyQuestionKey(set),set ? '다듬은 탐구 질문 (선택)' : '탐구 질문',question,150)}
      ${set ? guidedRolePicker(set) + guidedDecisionInputs(set,['criterion','initialOpinionV3']) :
        economyInput('economyPerspective','나의 관점과 관련 경제 주체','소비자, 상인, 노동자, 기업 중 어떤 입장에서 살펴볼지 적어요.',150) +
        economyInput('economyCriterion','가장 중요한 판단 기준','예: 같은 비용으로 도움을 받는 사람이 얼마나 늘어나는가.',180) +
        economyInput(economyOpinionKey(set),'첫 의견과 이유','1단계 자료에서 확인한 사실을 들어 설명해요.',220)}
      ${set && filled(a[guidedKey(set,'initialOpinion')]) ?
        `<details class="supplement"><summary>이전 활동에서 쓴 첫 의견</summary><p>${esc(a[guidedKey(set,'initialOpinion')])}</p></details>` : ''}
    </section>`;
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
    ${input('thought',initial ? '자료를 읽고 해석한 점' : '이 사실은 내 첫 의견에 어떤 영향을 주나요?',
      initial ? '자료가 보여 주는 변화나 차이를 적어요.' : '첫 의견을 유지하거나 바꾸는 이유를 한 줄로 적어요.',
      sourceThought(source),{source:i,area:true,limit:180})}
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

function economySupplementEditor(set) {
  const ownCards = sourceCards(set ? 0 : 1);
  const research = `${economyResearchBar()}${ownCards}`;
  return heading(ECONOMY_STEPS[2], '새 자료에서 첫 의견을 뒷받침하거나 다시 생각하게 만드는 사실을 찾아요.') +
    `<section class="economy-reminder"><h2>내가 다시 살펴볼 의견</h2>
      ${economyQuestionSummary('탐구 질문',economyInquiry())}
      ${economyQuestionSummary('입장과 기준',[economyPerspective(set),economyCriterion(set)].filter(filled).join(' · '))}
      ${economyQuestionSummary('첫 의견',work().answers[economyOpinionKey(set)])}
    </section>
    <p id="source-count" class="field-hint" role="status"></p>` +
    (set ? guidedSupplementMaterials(set) +
      `<details class="supplement economy-source-list" id="extra-sources"${(work().sources.length > 1 || work().sources.some(hasSource)) ? ' open' : ''}>
        <summary>직접 찾은 자료 (선택)</summary>${research}</details>` :
      `<section class="economy-write economy-source-list" id="extra-sources"><h2>직접 찾은 추가 자료</h2>${research}</section>`);
}

function economyFactsList(set) {
  const direct = work().sources.filter(source=>filled(sourceFact(source))).map(source=>[source.title || source.author || '직접 찾은 자료',sourceFact(source)]);
  const guided = set ? guidedWrittenSources(set).filter(group=>filled(group.excerpt)).map(group=>[group.table.publisher,group.excerpt]) : [];
  const region = set && activeGuidedRegion(set);
  const regionChange = region && work().answers[guidedKey(set,'regionalChange')];
  const regional = filled(regionChange) ? [[region.region+' 지역 자료',regionChange]] : [];
  const charts = set ? guidedChartNotes(set).map(({chart,note})=>[chart.title,note]) : [];
  const facts = [...guided,...regional,...charts,...direct];
  return facts.length ? `<section class="economy-reminder"><h2>내가 정리한 사실</h2>
    <ul class="guided-evidence-list">${facts.map(([title,fact])=>`<li><strong>${esc(title)}</strong> ${esc(fact)}</li>`).join('')}</ul></section>` : '';
}

function economyAnalysisEditor(set) {
  return heading(ECONOMY_STEPS[3], '같은 기준으로 대안이나 경제 주체별 영향을 비교해요.') + economyFactsList(set) +
    (set ? `<details class="supplement"><summary>자료 표 다시 보기</summary>${guidedInitialMaterials(set,false)}${guidedSupplementMaterials(set,false)}</details>` : '') +
    economyTermGuide(set) +
    (set ? guidedReviewCase(set) +
      `<section class="economy-write"><h2>두 대안의 이익과 부담</h2>
        ${economyQuestionSummary('판단 기준',economyCriterion(set))}
        ${guidedDecisionInputs(set,['supplementAnalysis','optionFirst','optionSecond'])}</section>` :
      `<section class="economy-write"><h2>변화의 원인과 경제 주체별 영향</h2>
        ${prompt('economicChange')}${prompt('economicCause')}${prompt('economicImpact')}
        ${economyInput('economyEvidenceImpact','내 판단에 영향을 준 추가 근거','추가로 확인한 사실 중 하나를 골라 내 첫 의견에 어떤 영향을 주었는지 적어요.',250)}</section>`);
}

function economyConclusionEditor(set) {
  const a = work().answers;
  const options = set ? ['optionFirst','optionSecond'].map((part,index)=>
    economyQuestionSummary(set.decision.options[index],a[guidedKey(set,part)])).join('') :
    economyQuestionSummary('경제 주체별 영향',answer('economicImpact'));
  return heading(ECONOMY_STEPS[4], '첫 의견을 유지했는지, 바꿨다면 어떤 근거 때문인지 적어요.') +
    `<section class="economy-reminder economy-conclusion-review"><h2>내 첫 의견과 비교 결과</h2>
      ${economyQuestionSummary('탐구 질문',economyInquiry())}
      ${economyQuestionSummary('판단 기준',economyCriterion(set))}
      <div class="economy-review-columns">
        <div>${economyQuestionSummary('첫 의견',a[economyOpinionKey(set)])}</div>
        <div>
          ${economyQuestionSummary('판단에 영향을 준 근거',economyJudgmentEvidence(set))}
          ${economyQuestionSummary('적용한 경제 개념',a[economyTermKey(set)])}
          ${options}
        </div>
      </div>
    </section>
    <section class="economy-write"><h2>최종 결론과 조건</h2>
      ${set ? guidedDecisionInputs(set,['finalChoice','changeCondition']) :
        prompt('economicConclusion') + economyInput('limits','판단이 바뀔 수 있는 조건과 자료의 한계','어떤 자료나 상황이 바뀌면 다른 판단을 할지 적어요.',200)}
    </section>
    <section class="economy-write"><h2>변화 방안과 실천 계획</h2>
      ${prompt('economicPlan')}${prompt('practicePlan')}${prompt('practiceResult')}</section>
    <section class="economy-write"><h2>협업과 탐구 성찰</h2>
      ${prompt('reflection')}${prompt('role')}${prompt('peerLearning')}</section>
    <details class="supplement"><summary>인쇄·공유 전 점검</summary>
      ${checklist('인쇄 전 확인할 내용',CHECKLIST.map(text=>text.replace('포스터','보고서')))}
      ${checklist('경제 탐구 공유 전 점검',taskRehearsal(),CHECKLIST.length)}</details>`;
}

const ECONOMY_EDITORS = [economyInitialEditor,economyOpinionEditor,economySupplementEditor,economyAnalysisEditor,economyConclusionEditor];

function economySourceCount(set) {
  const own = work().sources.filter(economyFactRecorded).map(source=>source.url?.trim() || [source.author,source.title].join(' · '));
  if (!set) return new Set(own).size;
  const official = guidedWrittenSources(set).filter(group=>filled(group.excerpt)).map(group=>group.table.sourceUrl);
  official.push(...guidedChartNotes(set).map(({chart})=>chart.sourceUrl));
  const region = activeGuidedRegion(set);
  if (region && filled(work().answers[guidedKey(set,'regionalChange')])) official.push(region.sources[0][2]);
  return new Set([...official,...own]).size;
}

function economyCompleted(set) {
  const {answers:a,sources} = work();
  const first = sources[0] || {};
  const groups = set ? guidedSourceGroups(set) : [];
  const initial = set ? guidedSourceRecorded(set,groups[0]) && filled(a[guidedKey(set,'read')]) :
    filled(a.topic) && economyFactRecorded(first) && filled(sourceThought(first));
  const region = set && activeGuidedRegion(set);
  const officialReview = set && (guidedWrittenSources(set).some(group=>group.storageId!==groups[0].storageId && filled(group.excerpt) && filled(group.use)) ||
    (region && ['regionalChange','regionalCause'].every(part=>filled(a[guidedKey(set,part)]))));
  const recordedSupplement = sources.slice(set ? 0 : 1).some(source=>economyFactRecorded(source) && filled(sourceThought(source)));
  const term = a[economyTermKey(set)];
  const explained = set ? a[guidedKey(set,'explain')] || a.concepts : a.concepts;
  return [
    Boolean(filled(economyTitle(set)) && initial),
    [economyInquiry(),economyPerspective(set),economyCriterion(set),a[economyOpinionKey(set)]].every(filled),
    Boolean(set ? officialReview || recordedSupplement : recordedSupplement && economySourceCount(null)>=2),
    Boolean(filled(term) && filled(explained) && (set ? ['optionFirst','optionSecond'].every(part=>filled(a[guidedKey(set,part)])) :
      [answer('economicCause'),answer('economicImpact')].every(filled))),
    [set ? a[guidedKey(set,'finalChoice')] || a.economicConclusion : a.economicConclusion,
      set ? a[guidedKey(set,'changeCondition')] : a.limits,answer('economicPlan'),a.practicePlan,a.reflection].every(filled)
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

function economyLegacyReport(set) {
  const a = work().answers;
  const includedCharts = new Set(work().sources.map(source=>source.statId));
  if (set) {
    const first = guidedSourceGroups(set)[0];
    const initialCharts = guidedResearchVisuals(set,true,guidedInitialCharts(set,first)) ? guidedInitialCharts(set,first) : [];
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
  const previousFirstUse = set ? guidedWrittenSources(set).find(group=>group.storageId===guidedSourceGroups(set)[0].storageId && filled(group.use)) : null;
  const guided = set ? guidedArchivedReport(set) + (previousFirstUse ? guidedEvidenceTable([{...previousFirstUse,excerpt:''}]) : '') + economyPaperFields(['region','economicPeriod','economicChange','economicCause','economicImpact']) : '';
  const archive = direct + packs + guided + economyPaperFields(['reason','comparison','interpretation','proposal']);
  return archive ? economyPaperChapter('부록. 이전 활동에서 쓴 기록',archive) : '';
}

function economyPaperLink(title, url) {
  if (!/^https?:\/\//i.test(url || '')) return esc(title);
  return `<a class="paper-link-screen" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a><span class="paper-link-print">${esc(title)}</span>`;
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
  return listed.size ? `<section class="paper-sources"><h4>참고 출처</h4>${[...listed.values()].join('')}</section>` : '';
}

function economyPoster(set) {
  const {answers:a,sources,attachments=[]} = work();
  const [first] = set ? guidedSourceGroups(set) : [];
  const written = set ? guidedWrittenSources(set) : [];
  const initial = first ? written.find(group=>group.storageId===first.storageId) : null;
  const additional = first ? written.filter(group=>group.storageId!==first.storageId) : [];
  const initialSources = !set && sources[0] && hasSource(sources[0]) ? [sources[0]] : [];
  const supplementSources = sources.slice(set ? 0 : 1).filter(hasSource);
  const supplementText = guidedTextSources(supplementSources);
  const initialText = guidedTextSources(initialSources);
  const charts = first ? guidedInitialCharts(set,first) : [];
  const firstChapter = set ?
    guidedEvidenceTable(filled(initial?.excerpt) ? [{...initial,use:''}] : []) +
    guidedReadingReport(set,['read']) + guidedResearchVisuals(set,true,charts) :
    economyPaperFields(['region','economicPeriod']) + guidedEvidenceTable([],initialText,'자료 해석') +
    reportEvidenceFigures(initialSources.filter(source=>!initialText.includes(source)),[],true);
  const context = economyPaperItem('탐구 질문',economyInquiry()) +
    (set ? economyPaperItem(set.decision.scenario ? '모의 상황' : '문제 상황',set.decision.scenario || ECONOMY_INQUIRY_STAKES[set.id]) : '') +
    economyPaperItem('나의 관점',economyPerspective(set)) +
    economyPaperItem('판단 기준',economyCriterion(set)) +
    economyPaperItem('첫 의견과 이유',a[economyOpinionKey(set)]);
  const chartNotes = set ? guidedChartNotes(set) : [];
  const facts = guidedEvidenceTable(additional,supplementText) +
    (set ? guidedRegionReport(set) + chartNotes.map(({id,note,chart})=>
      economyPaperItem(chart.title,note) + guidedResearchVisuals(set,true,[id])).join('') : '') +
    reportEvidenceFigures(supplementSources.filter(source=>!supplementText.includes(source)),attachments,true);
  const term = a[economyTermKey(set)];
  const explanation = (set && a[guidedKey(set,'explain')]) || a.concepts;
  const concept = filled(explanation) ? `<section><h4>경제 개념 적용${filled(term) ? ' · '+esc(term) : ''}</h4><p>${esc(explanation)}</p></section>` : '';
  const comparisons = concept + (set ? guidedReadingReport(set,['compare']) + guidedComparisonReport(set) :
    economyPaperFields(['economicChange','economicCause','economicImpact']) +
    economyPaperItem('내 판단에 영향을 준 추가 근거',economyJudgmentEvidence(set)));
  const conclusion = economyPaperFields(['economicConclusion']);
  const opinions = (set ? guidedReportAnswers(set,['finalChoice','changeCondition']) +
    (filled(a[guidedKey(set,'finalChoice')]) ? '' : conclusion) :
    conclusion + economyPaperItem('판단이 바뀔 수 있는 조건과 자료의 한계',a.limits)) +
    economyPaperFields(['economicPlan','practicePlan','practiceResult']);
  const reflections = economyPaperFields(['reflection','role','peerLearning']) +
    (set ? guidedReportAnswers(set,['decisionSummary']) : '') + economyPaperReference(set,sources);
  const topic = set?.label || a.topic;
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
    ${economyPaperChapter('Ⅰ. 초기 자료 해석',firstChapter)}
    ${economyPaperChapter('Ⅱ. 나의 입장과 첫 의견',context)}
    ${economyPaperChapter('Ⅲ. 보충 자료와 근거',facts)}
    ${economyPaperChapter('Ⅳ. 경제 개념 적용과 비교',comparisons)}
    ${economyPaperChapter('Ⅴ. 최종 의견·방안·성찰',opinions + reflections)}
    ${economyLegacyReport(set)}
  </article>`;
}
