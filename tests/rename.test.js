// Pure renaming logic (no AE needed): node tests/rename.test.js
var fs = require("fs"), assert = require("assert");
var CW = {};
new Function("CW", fs.readFileSync(__dirname + "/../src/modules/rename.jsx", "utf8"))(CW);
var T = CW.rename.transform, eq = function (a, b, m) { assert.strictEqual(a, b, m); };

eq(T("Title Text", 0, { mode: "replace", find: "text", replace: "Copy" }), "Title Copy", "case-insensitive by default");
eq(T("Title Text", 0, { mode: "replace", find: "text", replace: "Copy", matchCase: true }), "Title Text", "match case");
eq(T("a.b.c", 0, { mode: "replace", find: ".", replace: "-" }), "a-b-c", "plain text, not a regex");
eq(T("price", 0, { mode: "replace", find: "price", replace: "$1.00" }), "$1.00", "dollar in plain replacement stays literal");
eq(T("Layer 12", 0, { mode: "replace", find: "(\\d+)", replace: "[$1]", regex: true }), "Layer [12]", "regex with group");
eq(T("x", 0, { mode: "replace", find: "", replace: "y" }), "x", "empty find does nothing");
assert.throws(function () { T("x", 0, { mode: "replace", find: "(", replace: "", regex: true }); }, "bad regex throws");
eq(T("BG", 0, { mode: "affix", prefix: "01_", suffix: "_v2" }), "01_BG_v2", "prefix and suffix");
eq(T("BG", 0, { mode: "affix", suffix: "-A" }), "BG-A", "suffix only");
eq(T("Solid", 0, { mode: "number", start: 1, step: 1, pad: 2 }), "Solid 01", "number suffix");
eq(T("Solid", 4, { mode: "number", start: 1, step: 1, pad: 2 }), "Solid 05", "index 4 -> 05");
eq(T("Solid", 2, { mode: "number", start: 10, step: 5, pad: 3, where: "prefix", sep: "_" }), "020_Solid", "prefix, step, pad, separator");
eq(T("Solid", 0, { mode: "number", base: "Dot", start: 1, pad: 2, sep: "" }), "Dot01", "base name replaces, empty separator");
eq(T("hello WORLD_foo-bar", 0, { mode: "case", kind: "upper" }), "HELLO WORLD_FOO-BAR");
eq(T("Hello World", 0, { mode: "case", kind: "lower" }), "hello world");
eq(T("hello WORLD_foo-bar", 0, { mode: "case", kind: "title" }), "Hello World_Foo-Bar", "title case across separators");
eq(T("hELLO wORLD", 0, { mode: "case", kind: "sentence" }), "Hello world", "sentence case");
eq(CW.rename.pad(7, 3), "007"); eq(CW.rename.pad(1234, 2), "1234", "padding never truncates");
console.log("rename tests passed");
