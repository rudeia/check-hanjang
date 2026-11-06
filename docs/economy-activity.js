'use strict';

function economyPack() {
  if (activeTask() !== 'economy') return null;
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
    <p class="stat-note">${esc(chart.note)}</p>
    <p class="stat-citation"><a href="${esc(chart.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(chart.publisher)} · ${esc(chart.sourceTitle)}</a>
      <span>${esc(chart.sourcePage)} · 발표 ${esc(chart.published)}</span></p>
  </div>`;
}

function economyMaterials() {
  if (activeTask() !== 'economy') return '';
  const pack = economyPack();
  return `<section class="economy-materials" aria-labelledby="economy-materials-title">
    <h2 id="economy-materials-title">실제 숫자와 그래프를 읽어 봐요</h2>
    <p class="field-hint">수업에서 비교할 수 있도록 시점을 고정한 공식 자료예요. 최신 현황과는 다를 수 있어요. 날짜·단위·지역을 먼저 확인하세요.</p>
    <div class="field"><label for="economy-pack">어떤 사례의 자료를 볼까요?</label>
      <select id="economy-pack"><option value="" disabled>자료 묶음을 골라 보세요</option>
        ${TOPIC_IDEAS.economy.map(idea => `<option value="${idea.id}" ${idea.id === pack?.id ? 'selected' : ''}>${esc(idea.label)}</option>`).join('')}
      </select>
      <small class="field-hint">여기서는 연습할 자료만 바뀌어요. 내 탐구 주제와 출발 질문은 1단계에서 고쳐요.</small>
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
  const pack = economyPack();
  if (!pack) return '';
  return `<section class="worksheet-section thought"><h2>숫자 비교부터 내 설명까지</h2>
    <p class="field-hint">여기에 답을 쓰면 읽은 자료의 그래프와 출처도 포스터에 함께 들어가요.</p>
    <details class="supplement"><summary>표와 그래프 다시 보기</summary>${pack.charts.map(id => officialGraph(id)).join('')}</details>
    ${readingFields(pack).map(field => input(field.key, field.title, '그래프의 수치, 단위와 이유를 내 말로 적어 보세요.',
      work().answers[field.key], { area: true, limit: 200, hint: field.hint })).join('')}
  </section>`;
}

function economyReadingReport() {
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
