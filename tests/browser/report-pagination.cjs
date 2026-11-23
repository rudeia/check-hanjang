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
      return measurements;
    });
    for (const result of results) {
      assert.equal(result.heading, result.body, 'Heading separated from its body: ' + JSON.stringify(result));
      assert.equal(result.headingCount, result.name === 'long analysis' ? 2 : 1);
      assert(result.contentPreserved, 'Printed content changed: ' + result.name + ' ' + result.height);
      if (result.name === 'long analysis') assert(result.totalPages >= 3);
    }
    assert(results.some(result => result.heading === 1), 'fixture must exercise the next-page path');
    assert(results.some(result => result.heading === 0), 'short sections should also use available space');
    console.log('PASS analysis headings, nested headings, table heading, and long body at 63 page boundaries');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
