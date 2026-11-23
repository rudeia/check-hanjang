'use strict';

const ECONOMY_STEPS = ['주제와 탐구 질문', '자료로 사실 확인', '경제 개념과 대안 비교', '결론·방안·보고서 완성'];
const economyPhase = set => guidedKey(set,'phaseV2');
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

function economyQuestionEditor(set) {
  const a = work().answers;
  const titleKey = set ? guidedKey(set,'topicTitle') : 'posterTitle';
  const questionKey = economyQuestionKey(set);
  return heading(ECONOMY_STEPS[0]) +
    (set ? `<section class="economy-context"><h2>${esc(set.decision.question)}</h2>${guidedDecisionPrompt(set)}</section>` : '') +
    `<section class="economy-write">
      ${input(titleKey,'탐구 보고서 제목',set?.label || '예: 우리 동네 상권의 변화와 선택',a[titleKey],{limit:60})}
      ${set ? `<p><strong>탐구 주제</strong> ${esc(set.label)}</p>` : input('topic','탐구 주제','예: 전통시장 방문객과 점포 매출',a.topic,{limit:60})}
      <div class="field-grid student-fields">
        ${input('number','학번','예: 20513',a.number,{limit:10})}
        ${input('name','이름','예: 김하늘',a.name,{limit:10})}
        ${input('team','모둠','예: 3모둠',a.team,{limit:20})}
      </div>
      ${economyInput(questionKey,'내가 정한 탐구 질문',set ? esc('기본 질문은 “'+set.decision.question+'”예요. 그대로 써도 좋아요.') : '어떤 경제 현상이 왜 달라졌는지 구체적으로 물어보세요.',150)}
      ${set ? guidedRolePicker(set) + guidedDecisionInputs(set,['criterion','initialOpinion']) :
        prompt('region') + prompt('economicPeriod') +
        economyInput('economyPerspective','나의 관점과 관련 경제 주체','소비자, 상인, 노동자, 기업 등 누구의 입장에서 살펴볼지 적어요.',150) +
        economyInput('economyCriterion','가장 중요한 판단 기준','예: 같은 비용으로 도움을 받는 사람이 얼마나 늘어나는가.',180)}
    </section>`;
}

const economyResearchLinks = [
  ['빅카인즈 뉴스','https://www.bigkinds.or.kr/'],
  ['국가통계포털 KOSIS','https://kosis.kr/'],
  ['한국은행 경제통계 ECOS','https://ecos.bok.or.kr/']
];

function economySourceCard(source,i) {
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
    ${input('thought','내 질문과 연결해 읽은 점','이 근거가 내 판단에 주는 영향을 적어요.',sourceThought(source),{source:i,area:true,limit:180})}
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

function economyFactsEditor(set) {
  return heading(ECONOMY_STEPS[1]) +
    `<div class="economy-reminder">
      ${economyQuestionSummary('탐구 질문',economyInquiry())}
      ${economyQuestionSummary('관점과 기준',[economyPerspective(set),economyCriterion(set)].filter(filled).join(' · '))}
    </div>` +
    (set ? guidedResearchCards(set) : '') +
    `<section class="economy-write" id="extra-sources"><h2>내가 직접 찾은 자료</h2>
      <div class="economy-research-links">${economyResearchLinks.map(([title,url])=>
        `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`).join('')}</div>
      <p id="source-count" class="field-hint" role="status"></p>${sourceCards()}</section>`;
}

function economyFactsList(set) {
  const direct = work().sources.filter(source=>filled(sourceFact(source))).map(source=>[source.title || source.author || '직접 찾은 자료',sourceFact(source)]);
  const guided = set ? guidedWrittenSources(set).filter(group=>filled(group.excerpt)).map(group=>[group.table.publisher,group.excerpt]) : [];
  const region = set && activeGuidedRegion(set);
  const regionChange = region && work().answers[guidedKey(set,'regionalChange')];
  const regional = filled(regionChange) ? [[region.region+' 지역 자료',regionChange]] : [];
  const facts = [...guided,...regional,...direct];
  return facts.length ? `<section class="economy-reminder"><h2>내가 정리한 사실</h2>
    <ul class="guided-evidence-list">${facts.map(([title,fact])=>`<li><strong>${esc(title)}</strong> ${esc(fact)}</li>`).join('')}</ul></section>` : '';
}

function economyAnalysisEditor(set) {
  return heading(ECONOMY_STEPS[2]) + economyFactsList(set) +
    (set ? `<details class="supplement"><summary>자료 표 다시 보기</summary>${guidedResearchCards(set,false)}</details>` : '') +
    economyTermGuide(set) +
    (set ? guidedReviewCase(set) +
      `<section class="economy-write"><h2>두 대안의 이익과 부담</h2>
        ${economyQuestionSummary('판단 기준',economyCriterion(set))}
        ${guidedDecisionInputs(set,['supplementAnalysis','optionFirst','optionSecond'])}</section>` :
      `<section class="economy-write"><h2>변화의 원인과 경제 주체별 영향</h2>
        ${prompt('economicChange')}${prompt('economicCause')}${prompt('economicImpact')}</section>`);
}

function economyConclusionEditor(set) {
  return heading(ECONOMY_STEPS[3]) +
    `<section class="economy-write"><h2>최종 결론과 조건</h2>
      ${economyQuestionSummary('탐구 질문',economyInquiry())}
      ${economyQuestionSummary('판단 기준',economyCriterion(set))}
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

const ECONOMY_EDITORS = [economyQuestionEditor,economyFactsEditor,economyAnalysisEditor,economyConclusionEditor];

function economyCompleted(set) {
  const a = work().answers;
  const direct = work().sources.filter(economyFactRecorded);
  const own = new Set(direct.map(source=>filled(source.url) ? source.url.trim() : [source.author,source.title].join(' · ')));
  const term = a[economyTermKey(set)];
  const explained = set ? a[guidedKey(set,'explain')] || a.concepts : a.concepts;
  const recorded = set && (guidedSourceGroups(set).some(group=>guidedSourceRecorded(set,group)) ||
    (activeGuidedRegion(set) && filled(a[guidedKey(set,'regionalChange')])));
  return [
    [economyTitle(set),economyInquiry(),economyPerspective(set),economyCriterion(set)].every(filled),
    set ? recorded && own.size >= 1 : own.size >= 2,
    Boolean(filled(term) && filled(explained) && (set ? ['optionFirst','optionSecond'].every(part=>filled(a[guidedKey(set,part)])) :
      [answer('economicCause'),answer('economicImpact')].every(filled))),
    Boolean(filled((set && a[guidedKey(set,'finalChoice')]) || a.economicConclusion) && filled(answer('economicPlan')) &&
      filled(a.practicePlan) && filled(a.reflection))
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
  for (const id of (set && guidedResearchVisuals(set,true) ? ECONOMY_GUIDED_CHARTS[set.id] : []) || []) includedCharts.add(id);
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
  const guided = set ? guidedArchivedReport(set) + economyPaperFields(['region','economicPeriod','economicChange','economicCause','economicImpact']) : '';
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
  const extra = guidedTextSources(sources);
  const media = sources.filter(source=>hasSource(source) && !extra.includes(source));
  const question = economyPaperItem('탐구 질문',economyInquiry());
  const situation = set ? economyPaperItem(set.decision.scenario ? '모의 상황' : '문제 상황',
    set.decision.scenario || ECONOMY_INQUIRY_STAKES[set.id]) : economyPaperFields(['region','economicPeriod']);
  const context = question + situation +
    economyPaperItem('나의 관점',economyPerspective(set)) +
    economyPaperItem('판단 기준',economyCriterion(set)) +
    (set ? guidedReportAnswers(set,['initialOpinion']) : '');
  const facts = (set ? guidedEvidenceSummary(set,extra) + guidedRegionReport(set) +
    guidedResearchVisuals(set,true) + guidedReadingReport(set) : guidedEvidenceSummary(null,extra)) +
    reportEvidenceFigures(media,attachments,true);
  const term = a[economyTermKey(set)];
  const explanation = (set && a[guidedKey(set,'explain')]) || a.concepts;
  const concept = filled(explanation) ? `<section><h4>경제 개념 적용${filled(term) ? ' · '+esc(term) : ''}</h4><p>${esc(explanation)}</p></section>` : '';
  const comparisons = concept + (set ? guidedComparisonReport(set) : economyPaperFields(['economicChange','economicCause','economicImpact']));
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
    ${economyPaperChapter('Ⅰ. 탐구 주제와 질문',context)}
    ${economyPaperChapter('Ⅱ. 자료로 확인한 경제 변화',facts)}
    ${economyPaperChapter('Ⅲ. 경제 개념 적용과 비교 분석',comparisons)}
    ${economyPaperChapter('Ⅳ. 결론 및 지역사회 변화 방안',opinions)}
    ${economyPaperChapter('Ⅴ. 탐구 성찰 및 참고 출처',reflections)}
    ${economyLegacyReport(set)}
  </article>`;
}
