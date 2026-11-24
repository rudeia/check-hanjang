const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:8769/') + '#economy');
    const results = await page.evaluate(async () => {
      const poster = document.querySelector('#poster');
      const longBody = '첫 문장: ' + '어떤 조건이 바뀌면 선택도 달라지는지 설명해요.\n'.repeat(90) + '마지막 문장';
      const examples = [
        {
          name: 'analysis',
          content: '<section class="paper-section"><div class="paper-analysis"><section><h4 data-heading>경제 용어를 적용한 설명</h4>\n<p data-body>첫 문장과 근거를 함께 읽어요.</p></section></div></section>'
        },
        {
          name: 'long analysis',
          content: `<section class="paper-section"><h3 data-heading>긴 비교를 시작하는 제목</h3><section><h4 data-heading>비교 기준</h4><p data-body>${longBody}</p></section></section>`
        },
        {
          name: 'evidence table',
          content: '<section class="paper-section"><h3 data-heading>고른 근거</h3><table class="paper-picked"><thead><tr><th>고른 항목</th><th>확인한 내용</th></tr></thead><tbody><tr data-body><th>첫 근거</th><td>첫 문장<br>다른 체계<br>비교 기준<br>마지막 문장</td></tr></tbody></table></section>'
        }
      ];
      const normalize = text => text.replace(/\s+/g, '');
      const measurements = [];
      await document.fonts.ready;
      for (const example of examples) {
        for (let height = 885; height <= 985; height += 5) {
          poster.innerHTML = `<article class="paper"><div style="height:${height}px">앞 문단</div>${example.content}</article>`;
          window.prepareReportPrint();
          const pages = [...document.querySelectorAll('.print-pages .print-paper')];
          const heading = pages.findIndex(sheet => sheet.querySelector('[data-heading]'));
          const body = pages.findIndex(sheet => {
            const element = sheet.querySelector('[data-body]');
            return element?.textContent.trim().length > 0;
          });
          measurements.push({
            name: example.name,
            height,
            heading,
            body,
            headingCount: pages[heading]?.querySelectorAll('[data-heading]').length,
            firstBodyText: pages[body]?.querySelector('[data-body]')?.textContent.trim().slice(0, 70),
            totalPages: pages.length,
            contentPreserved: normalize(pages.map(sheet => sheet.textContent).join('')) === normalize(poster.textContent)
          });
        }
      }
      poster.innerHTML = `<article class="paper"><h2>자료 정리 보고서</h2>
        <table class="paper-picked paper-evidence-table"><thead><tr><th>자료와 출처</th><th>확인한 근거</th></tr></thead>
        <tbody><tr><th scope="row"><a href="https://example.com/source">자료 원문</a></th><td data-long-evidence><p>${longBody}</p></td></tr>
        <tr><th scope="row">다음 자료</th><td>다음 행의 근거</td></tr></tbody></table></article>`;
      window.prepareReportPrint();
      const sheets = [...document.querySelectorAll('.print-pages .print-paper')];
      const tables = sheets.flatMap(sheet=>[...sheet.querySelectorAll('table')]);
      const longRow = {
        parts:tables.flatMap(table=>[...table.querySelectorAll('[data-long-evidence]')]).map(cell=>cell.textContent),
        expected:longBody,
        keyCells:tables.flatMap(table=>[...table.tBodies[0].rows]).map(row=>row.cells.length),
        heads:tables.map(table=>table.tHead?.textContent),
        sourceCount:document.querySelectorAll('.print-pages a[href="https://example.com/source"]').length,
        nextRow:sheets.at(-1).textContent.includes('다음 행의 근거')
      };
      const references = Array.from({length:12},(_, i) =>
        `<p>발행 기관 · 참조한 자료 ${i+1} · 보고서에 사용한 자료입니다.</p>`).join('');
      poster.innerHTML = `<article class="paper"><div style="height:930px">앞의 긴 분석</div>
        <section class="paper-section paper-inquiry-section"><h3 data-closing-heading>최종 의견과 성찰</h3>
        <section data-closing><h4>탐구 성찰</h4><p>비교한 조건을 돌아봤습니다.</p></section>
        <section class="paper-sources paper-references"><h4>참고 출처</h4>${references}</section></section></article>`;
      window.prepareReportPrint();
      const citedPages = [...document.querySelectorAll('.print-pages .print-paper')];
      const last = citedPages.at(-1);
      const closingWithSources = {
        pages:citedPages.length,
        hasClosing:!!last.querySelector('[data-closing]'),
        hasHeading:!!last.querySelector('[data-closing-heading]'),
        referenceCount:document.querySelectorAll('.print-pages .paper-references p').length,
        contentPreserved:normalize(citedPages.map(sheet=>sheet.textContent).join(''))===normalize(poster.textContent)
      };
      return {measurements,longRow,closingWithSources};
    });
    assert(results.longRow.parts.length>1);
    assert.equal(results.longRow.parts.join(''),results.longRow.expected);
    assert(results.longRow.keyCells.every(length=>length===2));
    assert(results.longRow.heads.every(heading=>heading==='자료와 출처확인한 근거'));
    assert.equal(results.longRow.sourceCount,1);
    assert(results.longRow.nextRow);
    assert.deepEqual(results.closingWithSources,{pages:2,hasClosing:true,hasHeading:true,referenceCount:12,contentPreserved:true});
    for (const result of results.measurements) {
      assert.equal(result.heading, result.body, 'Heading separated from its body: ' + JSON.stringify(result));
      assert.equal(result.headingCount, result.name === 'long analysis' ? 2 : 1);
      assert(result.contentPreserved, 'Printed content changed: ' + result.name + ' ' + result.height);
      if (result.name === 'long analysis') assert(result.totalPages >= 3);
    }
    assert(results.measurements.some(result => result.heading === 1), 'fixture must exercise the next-page path');
    assert(results.measurements.some(result => result.heading === 0), 'short sections should also use available space');
    console.log('PASS page boundaries, oversized evidence row, and closing response kept with references');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
