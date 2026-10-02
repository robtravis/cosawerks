// The settings store, against a fake host and fake localStorage: node tests/prefs.test.js
var assert = require("assert"), makeStore = require("../cep/js/prefs.js");
function fakeLS(init) { var d = Object.assign({}, init || {}); return { get length() { return Object.keys(d).length; }, key: function (i) { return Object.keys(d)[i]; }, getItem: function (k) { return k in d ? d[k] : null; }, setItem: function (k, v) { d[k] = v; }, dump: function () { return d; } }; }
function fakeHost(file) { var h = { inAE: true, file: file, writes: 0, value: function (e) { if (e.indexOf("prefs.read") >= 0) return Promise.resolve(h.file); if (e.indexOf("prefs.write") >= 0) { h.writes++; h.file = JSON.parse(e.slice(e.indexOf("(") + 1, e.lastIndexOf(")"))); return Promise.resolve("ok"); } return Promise.resolve(""); } }; return h; }

(async function () {
  // 1. migrates browser-kept values into a missing file
  var h = fakeHost(""), s = makeStore(h, fakeLS({ "cosawerks.layout.all": '{"mode":"w"}', "cosawerks.other": "1", "unrelated": "x" }));
  await s.load(); await s.flush();
  assert.deepStrictEqual(s.get("layout.all"), { mode: "w" }, "kept value read back");
  assert.deepStrictEqual(JSON.parse(h.file), { "layout.all": { mode: "w" }, other: 1 }, "migrated into the file, unrelated keys left alone");
  // 2. the file wins over the browser's copy
  h = fakeHost(JSON.stringify({ "size.align": { w: 310, h: 280 } })); s = makeStore(h, fakeLS({ "cosawerks.size.align": '{"w":1,"h":1}' }));
  await s.load(); assert.deepStrictEqual(s.get("size.align"), { w: 310, h: 280 }, "file value used");
  // 3. defaults
  assert.strictEqual(s.get("missing", 42), 42, "default for a missing key");
  // 4. two panels do not overwrite each other
  h = fakeHost("{}"); var a = makeStore(h, fakeLS()), b = makeStore(h, fakeLS()); await a.load(); await b.load();
  a.set("size.align", { w: 300, h: 300 }); b.set("size.trim", { w: 240, h: 220 }); await a.flush(); await b.flush();
  assert.deepStrictEqual(JSON.parse(h.file), { "size.align": { w: 300, h: 300 }, "size.trim": { w: 240, h: 220 } }, "both panels' changes kept");
  // 5. only changed keys are sent, and nothing is written when nothing changed
  var before = h.writes; await a.flush(); assert.strictEqual(h.writes, before, "no write when nothing is dirty");
  // 6. unreadable file falls back to the browser's copy instead of throwing
  h = fakeHost("not json {"); s = makeStore(h, fakeLS({ "cosawerks.k": "7" })); await s.load(); assert.strictEqual(s.get("k"), 7, "fallback to localStorage");
  // 7. in a plain browser (no AE) it just uses localStorage
  var ls = fakeLS({ "cosawerks.k": '"v"' }); s = makeStore({ inAE: false }, ls); await s.load(); assert.strictEqual(s.get("k"), "v"); s.set("z", 1); assert.strictEqual(ls.dump()["cosawerks.z"], "1");
  // 8. debounce: several sets, one write
  h = fakeHost("{}"); s = makeStore(h, fakeLS()); await s.load(); s.set("a", 1); s.set("b", 2); s.set("c", 3); await new Promise(function (r) { setTimeout(r, 400); }); await s.flush();
  assert.strictEqual(h.writes, 1, "debounced to one write"); assert.deepStrictEqual(JSON.parse(h.file), { a: 1, b: 2, c: 3 });
  console.log("prefs tests passed");
})().catch(function (e) { console.error(e); process.exit(1); });
