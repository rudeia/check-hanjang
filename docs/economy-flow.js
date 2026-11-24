'use strict';

const ECONOMY_STEPS = ['초기 자료 해석', '입장과 첫 의견', '보충 자료 조사', '자료 정리와 개념 비교', '최종 의견·보고서 완성'];
const economyPhase = set => set ? guidedKey(set,'phaseV3') : 'economyPhaseV3';
const economyQuestionKey = set => set ? guidedKey(set,'inquiryV2') : 'inquiry';
const economyTitleKey = set => set ? guidedKey(set,'topicTitle') : 'posterTitle';
const economyFactRecorded = source => filled(sourceFact(source)) && filled(source.url || source.author);

function economyInput(key, label, hint, limit, value = work().answers[key]) {
  return input(key,label,'자료에서 확인한 내용과 내 생각을 적어 보세요.',value,{area:true,limit,hint});
}

function economyTitle(set) {
  const a = work().answers;
  return a[economyTitleKey(set)] || (set ? set.label : a.topic) || '';
}

function economyTitleInput(set, final = false) {
  const key = economyTitleKey(set);
  const label = final ? '최종 보고서 제목' : '탐구 보고서 제목';
  const example = (final && economyTitle(set)) || set?.label || '예: 우리 동네 상권의 변화와 선택';
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
const economyJudgmentEvidence = set => work().answers[set ? guidedKey(set,'supplementAnalysis') : 'economyEvidenceImpact'];

function economyInitialEditor(set) {
  const a = work().answers;
  return `<div class="economy-initial">` + heading(ECONOMY_STEPS[0], '첫 자료에서 사실 한 가지를 찾아 해석해요.') +
    `<section class="economy-write economy-identity">
      ${economyTitleInput(set)}
      ${set ? `<p class="economy-topic-location"><strong>조사 지역</strong> ${esc(activeGuidedRegion(set).region)}</p>` : input('topic','탐구 주제','예: 전통시장 방문객과 점포 매출',a.topic,{limit:60})}
      <div class="field-grid student-fields">
        ${input('number','학번','예: 20513',a.number,{limit:10})}
        ${input('name','이름','예: 김하늘',a.name,{limit:10})}
        ${input('team','모둠','예: 3모둠',a.team,{limit:20})}
      </div>
      ${set ? '' : `<div class="field-grid economy-place-fields">${prompt('region')}${prompt('economicPeriod')}</div>`}
    </section>` + (set ? guidedInitialMaterials(set) :
      `<section class="economy-write economy-source-list"><h2>처음 읽을 자료</h2>
        ${economyResearchBar()}${economySourceCard(sourceSlots()[0],0,true)}</section>`) + '</div>';
}

function economyOpinionEditor(set) {
  const a = work().answers;
  const source = work().sources[0] || {};
  const initialFact = set ? guidedSourceAnswer(set,guidedSourceGroups(set)[0].storageId,'excerpt') : sourceFact(source);
  const initialRead = set ? a[guidedKey(set,'read')] : sourceThought(source);
  const reminder = economyQuestionSummary('확인한 사실',initialFact) + economyQuestionSummary('내 해석',initialRead);
  const questionKey = economyQuestionKey(set);
  const guidedQuestionEdit = set ? `<details class="supplement"${filled(a[questionKey]) ? ' open' : ''}>
    <summary>탐구 질문 좁히기 (선택)</summary>
    ${economyInput(questionKey,'내 탐구 질문','살펴볼 사람, 지역, 시점 중 하나를 더 구체적으로 써요.',150)}
  </details>` : '';
  return heading(ECONOMY_STEPS[1], '첫 자료를 읽었으니, 이제 누구의 입장에서 무엇을 결정할지 생각해요.') +
    (reminder ? `<div class="economy-reminder economy-supplement-review">
      ${economyReviewSnippet('1단계에서 읽은 점',filled(initialRead) ? initialRead : initialFact)}
      ${economyReviewDetails('1단계에서 쓴 사실과 해석 보기',reminder)}
    </div>` : '') +
    (set ? `<section class="economy-context"><h2>${esc(economyInquiry())}</h2></section>` : '') +
    `<section class="economy-write">
      ${set ? guidedRolePicker(set) + guidedDecisionInputs(set,['criterion','initialOpinionV3']) + guidedQuestionEdit :
        economyInput(questionKey,'탐구 질문','읽은 자료를 바탕으로 누구의 어떤 선택을 살펴볼지 적어요. 예: 시장 상인이라면 주말 영업을 늘릴까요?',150) +
        economyInput('economyPerspective','누구의 입장에서 볼까요?','소비자, 상인, 노동자, 기업 중 어떤 입장에서 살펴볼지 적어요.',150) +
        economyInput('economyCriterion','판단 기준과 이유','예를 들어 비용이나 혜택을 받는 사람의 범위 중 하나를 골라, 내 입장에서 왜 중요한지 적어요.',180) +
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
  const opinion = work().answers[economyOpinionKey(set)];
  const criterion = economyCriterion(set);
  const context = economyQuestionSummary('탐구 질문',economyInquiry()) +
    economyQuestionSummary('입장과 기준',[economyPerspective(set),criterion].filter(filled).join(' · ')) +
    economyQuestionSummary('첫 의견',opinion);
  const count = '<p id="source-count" class="field-hint" role="status"></p>';
  const instruction = set ? '지역 표를 읽고 내 기준과 관련된 근거를 찾아요.' : '내 기준으로 첫 의견을 다시 살펴볼 자료를 한 곳에서 더 찾아요.';
  return heading(ECONOMY_STEPS[2],instruction) +
    (context ? `<div class="economy-reminder economy-supplement-review">
      ${economyReviewSnippet('내 기준',criterion)}
      ${economyReviewSnippet('첫 의견',opinion)}
      ${economyReviewDetails('탐구 질문과 첫 의견 보기',context)}
    </div>` : '') +
    (set ? guidedSupplementMaterials(set) + count +
      `<details class="supplement economy-source-list" id="extra-sources"${(work().sources.length > 1 || work().sources.some(hasSource)) ? ' open' : ''}>
        <summary>직접 찾은 자료 (선택)</summary>${research}</details>` :
      `<section class="economy-write economy-source-list" id="extra-sources"><h2>직접 찾은 추가 자료</h2>${count}${research}</section>`);
}

function economyReviewSnippet(label, value) {
  return filled(value) ? `<p class="economy-review-snippet"><strong>${esc(label)}</strong> ${esc(value)}</p>` : '';
}

function economyReviewDetails(label, content) {
  return content ? `<details class="supplement economy-review-details"><summary>${esc(label)}</summary><div>${content}</div></details>` : '';
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
  const context = heading(ECONOMY_STEPS[3], '지역 경제가 달라진 이유와 영향을 자료로 설명해요.') + economyFactsList(set);
  if (!set) return context + economyTermGuide(set) +
    `<section class="economy-write"><h2>변화의 원인과 경제 주체별 영향</h2>
      ${economyQuestionSummary('2단계에서 정한 기준',economyCriterion(set))}
      ${prompt('economicChange')}${prompt('economicCause')}${prompt('economicImpact')}
      ${economyInput('economyEvidenceImpact','내 판단에 영향을 준 추가 근거','2단계에서 정한 기준으로 새로 확인한 사실을 살펴보고, 첫 의견에 어떤 영향을 주었는지 적어요.',250)}</section>`;
  return context +
    `<details class="supplement"><summary>자료 표 다시 보기</summary>${guidedInitialMaterials(set,false)}${guidedSupplementMaterials(set,false)}</details>
    <section class="economy-write"><h2>${esc(activeGuidedRegion(set).region)}의 변화 원인과 영향</h2>
      ${guidedDecisionInputs(set,['regionalCause','regionalImpact'])}</section>` +
    economyTermGuide(set) +
    `<section class="economy-write"><h2>같은 기준으로 다시 판단하기</h2>
      ${economyQuestionSummary('탐구 질문',economyInquiry())}
      ${economyQuestionSummary('2단계에서 정한 기준',economyCriterion(set))}
      ${guidedDecisionInputs(set,['supplementAnalysis'])}</section>
    <details class="supplement economy-simulation"><summary>두 대안 비교 · 가상 상황 (선택)</summary>
      ${guidedDecisionPrompt(set)}
      ${guidedReviewCase(set)}
      ${guidedDecisionInputs(set,['optionFirst','optionSecond'])}</details>`;
}

const ECONOMY_PRACTICE_STATUS = { plan:'아직 실천 전', done:'실제로 실천함' };

function economyConclusionEditor(set) {
  const a = work().answers;
  const opinion = a[economyOpinionKey(set)];
  const evidence = economyJudgmentEvidence(set);
  const options = set ? ['optionFirst','optionSecond'].map((part,index)=>
    economyQuestionSummary(set.decision.options[index],a[guidedKey(set,part)])).join('') :
    economyQuestionSummary('경제 주체별 영향',answer('economicImpact'));
  const review = economyQuestionSummary('탐구 질문',economyInquiry()) +
    economyQuestionSummary('판단 기준',economyCriterion(set)) +
    economyQuestionSummary('첫 의견',opinion) +
    economyQuestionSummary('판단에 영향을 준 근거',evidence) +
    (set ? economyQuestionSummary('지역에서 확인한 변화',a[guidedKey(set,'regionalChange')]) +
      economyQuestionSummary('지역 경제 주체별 영향',a[guidedKey(set,'regionalImpact')]) : '') +
    economyQuestionSummary('적용한 경제 개념',a[economyTermKey(set)]) + options;
  const summary = economyReviewSnippet('첫 의견',opinion) + economyReviewSnippet('핵심 근거',evidence);
  return '<div class="economy-final">' + heading(ECONOMY_STEPS[4], '첫 의견을 유지했는지, 바꿨다면 어떤 근거 때문인지 적어요.') +
    `<section class="economy-reminder economy-conclusion-review" aria-label="첫 의견과 근거">
      <div class="economy-review-columns">
        ${summary}
      </div>
      ${economyReviewDetails('앞 단계 기록 전체 보기',review)}
    </section>
    <section class="economy-write"><h2>최종 결론과 조건</h2>
      ${set ? guidedDecisionInputs(set,['finalChoice','changeCondition']) :
        prompt('economicConclusion') + economyInput('limits','판단이 바뀔 수 있는 조건과 자료의 한계','어떤 자료나 상황이 바뀌면 다른 판단을 할지 적어요.',200)}
    </section>
    <section class="economy-write"><h2>지역사회 변화 방안과 실천</h2>
      ${set ? `<p class="field-hint">실천 예시 · ${esc(ECONOMY_REGION_INQUIRIES[set.id].practice)}</p>` : ''}
      ${prompt('economicPlan')}
      <fieldset class="checklist"><legend>실천 상태</legend>${Object.entries(ECONOMY_PRACTICE_STATUS).map(([key,label])=>
        `<label><input type="radio" name="practice-status" data-key="practiceStatus" value="${key}"${a.practiceStatus===key ? ' checked' : ''}> <span>${label}</span></label>`).join('')}</fieldset>
      ${prompt('practicePlan')}${prompt('practiceResult')}</section>
    <section class="economy-write"><h2>협업과 탐구 성찰</h2>
      ${prompt('reflection')}${prompt('role')}${prompt('peerLearning')}
      <a href="listening.html?task=economy" target="_blank" rel="noopener">친구 발표 듣고 기록하기 (새 탭)</a></section>
    <div class="economy-write">${economyTitleInput(set,true)}</div>
    <details class="supplement"><summary>인쇄·공유 전 점검</summary>
      ${checklist('인쇄 전 확인할 내용',CHECKLIST.map(text=>text.replace('포스터','보고서')))}
      ${checklist('경제 탐구 공유 전 점검',taskRehearsal(),CHECKLIST.length)}</details></div>`;
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
    [a.topic,a.region,a.economicPeriod].every(filled) && economyFactRecorded(first) && filled(sourceThought(first));
  const officialReview = set && guidedWrittenSources(set).some(group=>group.storageId!==groups[0].storageId && filled(group.excerpt) && filled(group.use));
  const recordedSupplement = sources.slice(set ? 0 : 1).some(source=>economyFactRecorded(source) && filled(sourceThought(source)));
  const term = a[economyTermKey(set)];
  const explained = set ? a[guidedKey(set,'explain')] || a.concepts : a.concepts;
  return [
    Boolean(filled(economyTitle(set)) && initial),
    [economyInquiry(),economyPerspective(set),economyCriterion(set),a[economyOpinionKey(set)]].every(filled),
    Boolean(set ? filled(a[guidedKey(set,'regionalChange')]) && (officialReview || recordedSupplement) : recordedSupplement && economySourceCount(null)>=2),
    Boolean(filled(term) && filled(explained) && (set ? ['regionalCause','regionalImpact','supplementAnalysis'].every(part=>filled(a[guidedKey(set,part)])) :
      [answer('economicCause'),answer('economicImpact')].every(filled))),
    [set ? a[guidedKey(set,'finalChoice')] || a.economicConclusion : a.economicConclusion,
      set ? a[guidedKey(set,'changeCondition')] : a.limits,answer('economicPlan'),
      a.practiceStatus==='done' ? a.practiceResult : a.practicePlan,a.reflection].every(filled)
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
    (set ? economyPaperItem('조사 지역',activeGuidedRegion(set).region) : '') +
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
  const comparisons = (set ? guidedReportAnswers(set,['regionalCause','regionalImpact']) : '') + concept +
    (set ? guidedReadingReport(set,['compare']) + guidedComparisonReport(set) :
    economyPaperFields(['economicChange','economicCause','economicImpact']) +
    economyPaperItem('내 판단에 영향을 준 추가 근거',economyJudgmentEvidence(set)));
  const conclusion = economyPaperFields(['economicConclusion']);
  const opinions = (set ? guidedReportAnswers(set,['finalChoice','changeCondition']) +
    (filled(a[guidedKey(set,'finalChoice')]) ? '' : conclusion) :
    conclusion + economyPaperItem('판단이 바뀔 수 있는 조건과 자료의 한계',a.limits)) +
    economyPaperFields(['economicPlan']) +
    (Object.hasOwn(ECONOMY_PRACTICE_STATUS,a.practiceStatus) ?
      economyPaperItem('실천 상태',ECONOMY_PRACTICE_STATUS[a.practiceStatus]) : '') +
    economyPaperFields(['practicePlan','practiceResult']);
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
