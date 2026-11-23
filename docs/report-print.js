'use strict';
// Build complete A4 fragments before printing: WebKit can cut a line/image
// when it paginates a multi-column or grid box itself.
(() => {
  const MM = 96 / 25.4;
  const LIMIT = 268 * MM; // A4 minus 12mm margins, with 5mm rounding reserve.
  const isHeading = node => /^H[1-6]$/.test(node?.tagName);
  let output;
  function clear() {
    output?.remove(); output = null;
    document.documentElement.classList.remove('has-print-pages');
  }
  function prepare() {
    clear();
    const source = document.querySelector('#poster .paper');
    if (!source) return;
    if (document.fonts?.status === 'loading' || [...source.querySelectorAll('img')].some(img => !img.complete || !img.naturalWidth))
      throw new Error('Report fonts or images are not ready');
    output = document.createElement('div');
    output.className = 'print-pages';
    output.setAttribute('aria-hidden', 'true');
    document.body.append(output);
    let page, containers;
    function moveTrailingHeadings(from, to) {
      let tail = from.lastChild;
      while (tail?.nodeType === 3 && !tail.textContent.trim()) tail = tail.previousSibling;
      while (isHeading(tail)) {
        const heading = tail;
        for (let current = from.lastChild; current !== heading; current = from.lastChild) to.prepend(current);
        tail = heading.previousSibling;
        to.prepend(heading);
        while (tail?.nodeType === 3 && !tail.textContent.trim()) tail = tail.previousSibling;
      }
    }
    function trimEmptyContainers() {
      [...page.querySelectorAll('section, .paper-analysis, .evidence-grid')].reverse().forEach(node => {
        if (!node.textContent.trim() && !node.querySelector('img')) node.remove();
      });
    }
    function nextPage() {
      const carried = document.createDocumentFragment();
      const path = [];
      if (page) {
        trimEmptyContainers();
        // A table or a separate analysis block can start on the next page.
        // Carry any heading left at the end of its layout container.
        let parent = page;
        for (const [original, fragment] of containers) {
          if (fragment !== parent.lastElementChild) continue;
          parent = fragment;
          path.push(original);
        }
        moveTrailingHeadings(parent, carried);
        trimEmptyContainers();
      }
      page = document.createElement('article');
      page.className = 'paper print-paper';
      output.append(page);
      containers = new Map();
      if (carried.hasChildNodes()) host(path).append(carried);
    }
    function fits(reserve = 0) { return page.getBoundingClientRect().height <= LIMIT - reserve; }
    function host(path) {
      let parent = page;
      for (const original of path) {
        if (!containers.has(original)) {
          const copy = original.cloneNode(false);
          parent.append(copy); containers.set(original, copy);
        }
        parent = containers.get(original);
      }
      return parent;
    }
    const segments = text => typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter('ko', {granularity: 'grapheme'}).segment(text)].map(s => s.segment)
      : Array.from(text);
    function clone(node) {
      const copy = node.cloneNode(true);
      const originals = node.nodeType === 1 ? [node, ...node.querySelectorAll('img')] : [];
      const copies = copy.nodeType === 1 ? [copy, ...copy.querySelectorAll('img')] : [];
      originals.forEach((img, i) => {
        if (img.tagName === 'IMG' && img.naturalWidth && img.naturalHeight)
          copies[i].style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
      });
      return copy;
    }
    // Consume the largest rendered prefix that fits. DOM cloning preserves
    // labels, Unicode graphemes, whitespace, URLs, and every original character.
    function take(node, parent, reserve = 0) {
      const full = clone(node); parent.append(full);
      if (fits(reserve)) return null;
      const moveIntact = isHeading(node) && full.getBoundingClientRect().height <= LIMIT / 2;
      full.remove();
      if (moveIntact) return full;
      if (node.nodeType === 3) {
        const chars = segments(node.textContent);
        const text = document.createTextNode(''); parent.append(text);
        let low = 0, high = chars.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          text.textContent = chars.slice(0, mid).join('');
          if (fits(reserve)) low = mid; else high = mid - 1;
        }
        text.textContent = chars.slice(0, low).join('');
        if (!low) text.remove();
        return document.createTextNode(chars.slice(low).join(''));
      }
      if (node.nodeType !== 1 || /^(IMG|BR)$/.test(node.tagName)) return clone(node);
      const part = node.cloneNode(false); parent.append(part);
      const rest = node.cloneNode(false);
      let split = false, splitHeading = false;
      for (const child of node.childNodes) {
        if (split) { rest.append(clone(child)); continue; }
        const lastChild = part.lastChild;
        const leftover = take(child, part, reserve);
        if (leftover) {
          rest.append(leftover);
          split = true;
          splitHeading = isHeading(child) && part.lastChild !== lastChild;
        }
      }
      // Keep the heading with the start of the continuation if no body
      // content made it into this fragment.
      if (split && !splitHeading && (rest.textContent.trim() || rest.querySelector('img')))
        moveTrailingHeadings(part, rest);
      if (!part.hasChildNodes()) part.remove();
      return split ? rest : null;
    }
    function fullBlock(node, path) {
      let remaining = clone(node), attempts = 0;
      const officialFigure = node.classList.contains('paper-official-figure');
      if (officialFigure || node.matches('.paper-sources, .paper-local-analysis > section')) {
        const parent = host(path);
        parent.append(remaining);
        if (fits()) return;
        const height = remaining.getBoundingClientRect().height;
        remaining.remove();
        const intactLimit = officialFigure ? LIMIT - 60 : LIMIT / 2;
        if (height <= intactLimit && page.textContent.trim()) nextPage();
      }
      while (remaining) {
        const parent = host(path), oldText = remaining.textContent;
        const before = parent.childNodes.length;
        const rest = take(remaining, parent, isHeading(node) ? 40 : 0);
        if (!rest) break;
        if (parent.childNodes.length === before && ++attempts > 1)
          throw new Error('Report block cannot fit on an A4 page');
        if (rest.textContent !== oldText) attempts = 0;
        remaining = rest; nextPage();
      }
    }
    function grid(node, path) {
      const items = [...node.children];
      for (let i = 0; i < items.length;) {
        const a = items[i], b = items[i + 1];
        if (!b || !compactPair(a, b)) { fullBlock(a, [...path, node]); i++; continue; }
        const parent = host([...path, node]);
        const row = document.createElement('div'); row.className = 'print-row';
        [a, b].forEach(item => { const column = document.createElement('div'); column.append(clone(item)); row.append(column); });
        parent.append(row);
        // Only short comparable cards stay together. Never create a blank
        // continuation column: a pair that cannot fit moves as one short unit.
        if (!fits()) { row.remove(); nextPage(); host([...path, node]).append(row); }
        i += 2;
      }
    }
    function pickedTable(node, path) {
      let table, body;
      function openTable() {
        table = node.cloneNode(false);
        if (node.tHead) table.append(clone(node.tHead));
        body = table.createTBody();
        host(path).append(table);
      }
      openTable();
      for (const row of [...node.tBodies].flatMap(group => [...group.rows])) {
        const copy = clone(row);
        body.append(copy);
        if (fits()) continue;
        copy.remove();
        if (!body.rows.length) table.remove();
        nextPage();
        openTable();
        body.append(copy);
        if (fits()) continue;
        copy.remove();
        let remaining = copy;
        while (remaining) {
          const previous = body.lastElementChild;
          const rest = take(remaining, body);
          if (!rest) break;
          const part = body.lastElementChild;
          if (part === previous || rest.textContent === remaining.textContent)
            throw new Error('Evidence row cannot fit on an A4 page');
          // Keep the fragments under their original columns.
          const blankCell = cell => {
            const blank = cell.cloneNode(false);
            blank.setAttribute('aria-hidden', 'true');
            return blank;
          };
          for (const cell of [...remaining.cells].slice(part.cells.length))
            part.append(blankCell(cell));
          const firstContinuedColumn = remaining.cells.length - rest.cells.length;
          for (const cell of [...remaining.cells].slice(0, firstContinuedColumn).reverse())
            rest.prepend(blankCell(cell));
          nextPage();
          openTable();
          remaining = rest;
        }
      }
    }
    function visit(node, path) {
      if (node.matches('.evidence-grid')) grid(node, path);
      else if (node.matches('.paper-picked')) pickedTable(node, path);
      else if (node.matches('.paper-analysis')) [...node.children].forEach(child => fullBlock(child, [...path, node]));
      else if (node.querySelector('.evidence-grid, .paper-analysis, .paper-picked'))
        [...node.children].forEach(child => visit(child, [...path, node]));
      else fullBlock(node, path);
    }
    try {
      nextPage();
      [...source.children].forEach(node => visit(node, []));
      if ([...output.children].some(p => p.getBoundingClientRect().height > LIMIT + 1))
        throw new Error('Report page overflow');
      document.documentElement.classList.add('has-print-pages');
    } catch (error) { clear(); throw error; }
  }
  function compactPair(a, b) {
    if ([a,b].some(n => n.matches('.paper-official-figure') || n.textContent.length > 450)) return false;
    const probe = document.createElement('article');
    probe.className = 'paper print-paper';
    probe.style.cssText = 'position:absolute;left:-20000px;visibility:hidden;border:0;padding:0';
    probe.innerHTML = '<div class="evidence-grid"><div class="print-row"><div></div><div></div></div></div>';
    const slots = [...probe.querySelector('.print-row').children];
    [a,b].forEach((n,i) => slots[i].append(n.cloneNode(true)));
    document.body.append(probe);
    const heights = slots.map(c => c.firstElementChild.getBoundingClientRect().height);
    probe.remove();
    return Math.max(...heights) <= 260 && Math.abs(heights[0] - heights[1]) <= 100;
  }
  function previewLayout() {
    const grid = document.querySelector('#poster .evidence-grid');
    if (!grid) return;
    const items = [...grid.children];
    items.forEach(n => n.classList.remove('compact-evidence'));
    for (let i=0; i<items.length;) {
      if (items[i+1] && compactPair(items[i],items[i+1])) {
        items[i].classList.add('compact-evidence'); items[i+1].classList.add('compact-evidence'); i+=2;
      } else i++;
    }
  }
  // Preview classification changes layout only, never saved student answers.
  const poster = document.querySelector('#poster');
  if (poster && document.querySelector('#workspace')) {
    new MutationObserver(previewLayout).observe(poster, {childList:true, subtree:true});
    poster.addEventListener('load', previewLayout, true);
    document.fonts?.ready.then(previewLayout); previewLayout();
  }
  window.prepareReportPrint = prepare;
  function beforePrint() {
    try { prepare(); }
    catch {
      // A beforeprint exception cannot cancel Cmd-P. Never silently fall back
      // to the original WebKit layout that can clip the report.
      clear();
      output = document.createElement('div');
      output.className = 'print-pages';
      const error = document.createElement('p');
      error.textContent = '인쇄를 준비하지 못했어요. 이 창을 닫고 이미지가 모두 표시된 뒤 보고서의 PDF로 저장 / 인쇄하기 버튼을 다시 눌러 주세요.';
      output.append(error); document.body.append(output);
      document.documentElement.classList.add('has-print-pages');
    }
  }
  window.addEventListener('beforeprint', beforePrint);
  window.addEventListener('afterprint', clear);
})();
