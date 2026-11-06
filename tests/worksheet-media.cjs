// Current worksheet path, isolated synthetic bytes and storage only.
// Browser image decoding/encoding are mocked: this is not physical-device QA.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const core = fs.readFileSync('docs/workbook-storage.js', 'utf8');
const app = ['cases', 'topic-ideas', 'workbook-storage', 'economy-data', 'economy-activity', 'worksheet'].map(name => fs.readFileSync(`docs/${name}.js`, 'utf8')).join('\n');
const photo = 'data:image/jpeg;base64,AAAA';
const seed = () => ({ schema: 'assessment-one', version: 1, step: 1, worksheetStep: 1,
  answers: { topic: 'Synthetic topic', reflection: 'KEEP MY ANSWER' }, sources: [{ title: 'KEEP SOURCE', _photo: photo }], checks: [] });
function png(w = 4000, h = 3000) {
  const b = Buffer.alloc(45); Buffer.from([137,80,78,71,13,10,26,10]).copy(b);
  b.writeUInt32BE(13, 8); b.write('IHDR', 12); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); b.write('IDAT', 37); return b;
}
function jpeg(w = 4000, h = 3000, progressive = false) {
  const b = Buffer.from([255,216,255,224,0,4,0,0,255,progressive ? 194 : 192,0,17,8,0,0,0,0,3,1,17,0,2,17,0,3,17,0,255,217]);
  b.writeUInt16BE(h, 13); b.writeUInt16BE(w, 15); return b;
}
function webp(type, w = 4000, h = 3000) {
  const b = Buffer.alloc(30); b.write('RIFF'); b.writeUInt32LE(22, 4); b.write('WEBP', 8); b.write(type, 12); b.writeUInt32LE(10, 16);
  if (type === 'VP8X') { b.writeUIntLE(w - 1, 24, 3); b.writeUIntLE(h - 1, 27, 3); }
  if (type === 'VP8 ') { b[23] = 157; b[24] = 1; b[25] = 42; b.writeUInt16LE(w, 26); b.writeUInt16LE(h, 28); }
  if (type === 'VP8L') { b[20] = 47; const a = w - 1, z = h - 1; b[21] = a & 255; b[22] = (a >> 8) | ((z & 3) << 6); b[23] = z >> 2; b[24] = (z >> 10) & 15; }
  return b;
}
function file(bytes = png(), options = {}) {
  return { type: 'image/png', size: 8 * 1024 * 1024, name: 'synthetic.png',
    slice(start, end) { return new Blob([bytes.subarray(start, end)]); }, ...options };
}
function environment(full = false, initial = seed()) {
  const state = { width: 4000, height: 3000, decodeFail: false, encodeFail: false,
    outputs: [], calls: [], canvases: [], made: 0, revoked: 0, decoded: 0, detached: 0,
    disk: JSON.stringify(initial), writes: 0, failSave: false };
  const nodes = {};
  const node = selector => nodes[selector] ??= { innerHTML: '', textContent: '', hidden: false, dataset: {}, style: {}, handlers: {},
    classList: { toggle() {} }, setAttribute() {}, getAttribute() {}, focus() {}, click() {}, scrollIntoView() {},
    addEventListener(name, fn) { this.handlers[name] = fn; }, querySelectorAll() { return []; }, querySelector() { return node('child'); } };
  class MockImage {
    get naturalWidth() { return state.width; } get naturalHeight() { return state.height; }
    async decode() { state.decoded++; if (state.decodeFail) throw Error('decode failure'); }
    removeAttribute() { state.detached++; }
  }
  class MockReader {
    readAsDataURL(blob) { blob.arrayBuffer().then(bytes => { this.result = 'data:image/jpeg;base64,' + Buffer.from(bytes).toString('base64'); this.onload(); }); }
  }
  const context = { Blob, Uint8Array, DataView, FileReader: MockReader, Image: MockImage, console, URL: {
    createObjectURL() { state.made++; return 'blob:synthetic'; }, revokeObjectURL() { state.revoked++; } },
    document: { querySelector: node, querySelectorAll() { return []; }, body: node('body'), createElement(tag) {
      assert.equal(tag, 'canvas'); const canvas = { width: 0, height: 0,
        getContext() { return { fillRect() {}, drawImage() {} }; },
        toBlob(callback, type, quality) {
          state.calls.push({ width: this.width, height: this.height, type, quality });
          callback(state.encodeFail ? null : new Blob([new Uint8Array(state.outputs.shift() ?? 100000)], { type }));
        } }; state.canvases.push(canvas); return canvas;
    } }, localStorage: { getItem() { return state.disk; }, setItem(key, value) { if (state.failSave) throw Error('quota'); state.writes++; state.disk = value; } },
    matchMedia() { return { matches: false, addEventListener() {} }; }, window: { addEventListener() {} }, setTimeout, clearTimeout,
    confirm() { throw Error('Unexpected dialog'); } };
  vm.createContext(context); vm.runInContext(full ? app : core, context);
  return { state, context, node, run: source => vm.runInContext(source, context), async convert(f) { context.testInput = f; return this.run('convertStudentPhoto(testInput)'); },
    async attach(index, f = file()) { context.testInput = { files: [f], value: 'chosen', dataset: { photo: String(index) } }; return this.run('attachPhoto(testInput)'); } };
}
(async () => {
  for (const bytes of [png(), jpeg(), jpeg(4000, 3000, true), webp('VP8X'), webp('VP8 '), webp('VP8L')]) {
    const e = environment(); e.context.testInput = file(bytes); const header = await e.run('studentPhotoHeader(testInput)');
    assert.equal(header.width, 4000); assert.equal(header.height, 3000);
  }
  const e = environment(); await e.convert(file(png(), { size: 20 * 1024 * 1024 }));
  assert.deepEqual(e.state.calls[0], { width: 1200, height: 900, type: 'image/jpeg', quality: .86 });
  await assert.rejects(() => e.convert(file(png(), { size: 20 * 1024 * 1024 + 1 })), /20MB/);
  await assert.rejects(() => e.convert(file(png(), { size: 0 })), /20MB/);
  for (const f of [file(png(), { type: 'image/heic', name: 'a.heic' }), file(png(), { type: '', name: 'a.HEIF' })]) await assert.rejects(() => e.convert(f), /HEIC/);
  await assert.rejects(() => e.convert(file(png(), { type: 'image/gif' })), /JPEG/);
  for (const bytes of [Buffer.from('garbage'), png(0, 100), png(5001, 5000), png(20000, 10), jpeg(65535, 65535), webp('VP8X', 10000, 10000)]) {
    const before = e.state.decoded; await assert.rejects(() => e.convert(file(bytes))); assert.equal(e.state.decoded, before, 'reject unsafe header before decode');
  }
  const animatedPng = png(); animatedPng.write('acTL', 37);
  const animatedWebp = webp('VP8X'); animatedWebp[20] = 2;
  for (const bytes of [animatedPng, animatedWebp]) {
    const before = e.state.decoded; await assert.rejects(() => e.convert(file(bytes)), /움직이는/); assert.equal(e.state.decoded, before);
  }
  await e.convert(file(png(5000, 5000), { type: '' }));
  await e.convert(file(png(5712, 4284))); // 24MP-class phone dimensions remain under 25 million.
  e.state.outputs = [374982]; assert.equal((await e.convert(file())).length, 499999);
  e.state.outputs = [374983, 100000]; e.state.calls = []; await e.convert(file()); assert.equal(e.state.calls.length, 2, 'base64 byte boundary');
  e.state.width = 3000; e.state.height = 4000; e.state.calls = [];
  await e.convert(file(jpeg())); assert.equal(e.state.calls[0].width, 900); assert.equal(e.state.calls[0].height, 1200, 'EXIF-oriented dimensions');
  e.state.width = 5001; e.state.height = 5000; await assert.rejects(() => e.convert(file()), /2,500만/);
  e.state.width = 800; e.state.height = 600; e.state.calls = []; e.state.outputs = [400000, 400000, 400000, 200000];
  const reduced = await e.convert(file()); assert(reduced.length <= 500000);
  assert.deepEqual(e.state.calls.map(call => [call.width, call.quality]), [[800,.86],[800,.78],[800,.7],[737,.86]], 'no upscale, bounded dimension retry');
  e.state.width = 4000; e.state.height = 3000; e.state.calls = [];
  e.state.outputs = Array(15).fill(400000); await assert.rejects(() => e.convert(file()), /자동/);
  assert.equal(e.state.calls.length, 15, 'bounded maximum encoder attempts');
  e.state.outputs = []; e.state.decodeFail = true; await assert.rejects(() => e.convert(file()), /읽을 수/); e.state.decodeFail = false;
  e.state.encodeFail = true; await assert.rejects(() => e.convert(file()), /변환/); e.state.encodeFail = false;
  assert.equal(e.state.made, e.state.revoked); assert.equal(e.state.made, e.state.detached);
  assert(e.state.canvases.every(c => c.width === 1 && c.height === 1), 'release canvas backing stores');
  console.log('PASS current image core: JPEG/PNG/WebP headers, 20MiB boundary, 25MP pre-decode guard, malformed/animated inputs, HEIC guidance, EXIF/no enlargement, quality/size retries, failure cleanup. Decoder/encoder mocked.');

  const a = environment(true); assert.equal(a.state.writes, 0, 'reading existing records is non-mutating');
  const before = a.state.disk; a.state.failSave = true; await a.attach(0);
  assert.equal(a.state.disk, before); assert.equal(a.run('work().sources[0]._photo'), photo); assert.equal(a.run('work().answers.reflection'), 'KEEP MY ANSWER');
  assert(a.node('#message').textContent.includes('기존 글과 사진은 그대로'));
  a.state.failSave = false; await a.attach(0); assert.notEqual(a.run('work().sources[0]._photo'), photo);
  assert.equal(a.run('work().answers.reflection'), 'KEEP MY ANSWER'); assert(a.run('valid(data)'));
  const snapshot = a.run('JSON.stringify(data)'); a.state.decodeFail = true; await a.attach(0); assert.equal(a.run('JSON.stringify(data)'), snapshot);
  a.state.decodeFail = false; a.run("work().answers.reflection='x'.repeat(5*1024*1024)"); const large = a.run('JSON.stringify(data)'), disk = a.state.disk;
  await a.attach(1); assert.equal(a.run('JSON.stringify(data)'), large); assert.equal(a.state.disk, disk); assert(a.node('#message').textContent.includes('전체 보관 용량'));
  const count = environment(true, { ...seed(), sources: Array.from({ length: 4 }, () => ({ _photo: photo })) });
  await count.attach(4); assert.equal(count.state.decoded, 0); assert.equal(count.run('work().sources.length'), 4); await count.attach(0); assert.equal(count.run('work().sources.length'), 4);
  const legacy = environment(true, { ...seed(), attachments: Array.from({ length: 4 }, (_, i) => ({ id: String(i), caption: '', credit: '', source: '', dataUrl: photo })) });
  await legacy.attach(1); assert.equal(legacy.run('work().attachments.length'), 4); assert(legacy.run('valid(data)'), 'do not invalidate or discard legacy photos');
  const race = environment(true); race.run('let releasePhoto; convertStudentPhoto = () => new Promise(resolve => releasePhoto = resolve)');
  const pending = race.attach(1); race.run('switchTask("economy")'); race.run(`releasePhoto(${JSON.stringify(photo)})`); await pending;
  assert(!race.run('work().sources[1]?._photo')); assert.equal(race.run('data.sources[0]._photo'), photo); assert(race.node('#message').textContent.includes('자료가 바뀌었어요'));
  const answerRace = environment(true); answerRace.run('let releasePhoto; convertStudentPhoto = () => new Promise(resolve => releasePhoto = resolve)');
  const answerPending = answerRace.attach(1); answerRace.run("editAnswer('reflection', 'NEW ANSWER WHILE PROCESSING')");
  answerRace.run(`releasePhoto(${JSON.stringify(photo)})`); await answerPending;
  assert.equal(answerRace.run('work().answers.reflection'), 'NEW ANSWER WHILE PROCESSING'); assert(answerRace.run('work().sources[1]._photo'));
  const sourceRace = environment(true); sourceRace.run('let releasePhoto; convertStudentPhoto = () => new Promise(resolve => releasePhoto = resolve)');
  const sourcePending = sourceRace.attach(1); sourceRace.run("change(editSource(1, {title:'SOURCE EDIT WHILE PROCESSING'}))");
  sourceRace.run(`releasePhoto(${JSON.stringify(photo)})`); await sourcePending;
  assert.equal(sourceRace.run('work().sources[1].title'), 'SOURCE EDIT WHILE PROCESSING'); assert(!sourceRace.run('work().sources[1]._photo'));
  const busy = environment(true); busy.run('let releasePhoto; convertStudentPhoto = () => new Promise(resolve => releasePhoto = resolve)');
  const first = busy.attach(1); await busy.attach(2); assert(busy.node('#message').textContent.includes('앞에서 고른')); busy.run(`releasePhoto(${JSON.stringify(photo)})`); await first;
  assert(busy.run('work().sources[1]._photo')); assert(!busy.run('work().sources[2]._photo'));
  busy.state.width = 1200; busy.state.height = 900; busy.context.restored = JSON.parse(busy.state.disk);
  assert(busy.run('valid(restored)')); await busy.run('validateRestoredPhotos(restored.sources.filter(s => s._photo).map(s => ({ dataUrl: s._photo })))');
  console.log('PASS current worksheet integration: existing/legacy answers preserved, quota failure atomic, 5MiB backup safety, four-photo cap/replacement, task/source-switch races, concurrent answer edits, backup photo validation, concurrent uploads, successful persisted attachment. Isolated DOM/storage.');
})().catch(error => { console.error(error); process.exitCode = 1; });
