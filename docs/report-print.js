'use strict';
// Build complete A4 fragments before printing: WebKit can cut a line/image
// when it paginates a multi-column or grid box itself.
(() => {
  const MM = 96 / 25.4;
  const LIMIT = 268 * MM; // A4 minus 12mm margins, with 5mm rounding reserve.
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
    function nextPage() {
      page = document.createElement('article');
      page.className = 'paper print-paper';
      output.append(page);
      containers = new Map();
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
      full.remove();
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
      let split = false;
      for (const child of node.childNodes) {
        if (split) { rest.append(clone(child)); continue; }
        const leftover = take(child, part, reserve);
        if (leftover) { rest.append(leftover); split = true; }
      }
      if (!part.hasChildNodes()) part.remove();
      return split ? rest : null;
    }
    function fullBlock(node, path) {
      let remaining = clone(node), attempts = 0;
      while (remaining) {
        const parent = host(path), oldText = remaining.textContent;
        const before = parent.childNodes.length;
        const rest = take(remaining, parent, /^H[1-6]$/.test(node.tagName) ? 40 : 0);
        if (!rest) break;
        if (parent.childNodes.length === before && ++attempts > 1)
          throw new Error('Report block cannot fit on an A4 page');
        if (rest.textContent !== oldText) attempts = 0;
        remaining = rest; nextPage();
      }
    }
    function grid(node, path) {
      const items = [...node.children];
      for (let i = 0; i < items.length; i += 2) {
        let remaining = [clone(items[i]), items[i + 1] ? clone(items[i + 1]) : null];
        let attempts = 0;
        while (remaining.some(Boolean)) {
          const parent = host([...path, node]);
          const row = document.createElement('div'); row.className = 'print-row';
          parent.append(row);
          let consumed = false;
          remaining = remaining.map(item => {
            const column = document.createElement('div'); row.append(column);
            if (!item) return null;
            const rest = take(item, column);
            if (column.hasChildNodes()) consumed = true;
            return rest;
          });
          if (!consumed) { row.remove(); if (++attempts > 1) throw new Error('Report item cannot fit on an A4 page'); }
          else attempts = 0;
          if (remaining.some(Boolean)) nextPage();
        }
      }
    }
    function visit(node, path) {
      if (node.matches('.evidence-grid, .paper-analysis')) grid(node, path);
      else if (node.querySelector('.evidence-grid, .paper-analysis'))
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
