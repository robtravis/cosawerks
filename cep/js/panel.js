(function () {
  var $ = function (id) { return document.getElementById(id); };
  var PANEL = window.CW_PANEL || "all";          // "all", or one pop-out panel: "anchor" | "align"
  var EXT = { anchor: "com.vivinel.cosawerks.anchor", align: "com.vivinel.cosawerks.align", trim: "com.vivinel.cosawerks.trim", ease: "com.vivinel.cosawerks.ease", comps: "com.vivinel.cosawerks.comps", strip: "com.vivinel.cosawerks.strip", arrows: "com.vivinel.cosawerks.arrows", type: "com.vivinel.cosawerks.type", stagger: "com.vivinel.cosawerks.stagger" };
  var GROUP_NAME = { anchor: "Anchor Point", align: "Align", trim: "Trim Paths", ease: "Ease", comps: "Comps", strip: "Buttons", arrows: "Arrows", type: "Type", stagger: "Stagger" };

  // Settings live in a file shared by every panel and survive restarts (see prefs.js); nothing is built until they are loaded.
  var store = makeStore(host, window.localStorage);

  function main(initError) {
  var state = store.get("alignState", { mode: "sel", group: false, anchors: false });
  function saveState() { store.set("alignState", state); }

  var statusEl = $("status"), clearTimer = null;
  function say(msg, isErr) {
    statusEl.textContent = msg;
    statusEl.className = "status" + (isErr ? " err" : "");
    clearTimeout(clearTimer);
    if (msg) clearTimer = setTimeout(function () { statusEl.textContent = ""; }, 6000);
  }
  // Messages starting with a tick are success notes (normal colour); anything else is a problem.
  function done(m) { say(m, !!m && m.charAt(0) !== "\u2713"); }

  function button(parent, svg, tip, onClick, extraClass) {
    var b = document.createElement("button");
    b.className = "ib " + (extraClass || "");
    b.setAttribute("data-tip", tip);
    b.setAttribute("aria-label", tip);
    b.innerHTML = svg;
    b.addEventListener("click", onClick);
    parent.appendChild(b);
    return b;
  }
  function div(parent, cls) { var d = document.createElement("div"); d.className = cls; parent.appendChild(d); return d; }
  function alignRun(spec) { return host.setAlignState(state).then(function () { return host.call("align.run", [spec]); }).then(done); }

  // ---- Sections. Each builds its own controls into a body element.
  function buildAnchor(body) {
    var grid = div(body, "anchor-grid");
    var names = [["top left", "top", "top right"], ["left", "center", "right"], ["bottom left", "bottom", "bottom right"]];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) (function (r, c) {
      button(grid, anchorIcon(r, c), "Move anchor point to " + names[r][c], function () {
        host.call("anchor.move", [c / 2, r / 2]).then(done);
      }, "cell");
    })(r, c);
  }

  function pair(body, left, right) {      // two groups, pushed to opposite sides like Align Pro
    var row = div(body, "groups"), a = div(row, "group"), b = div(row, "group");
    left(a); right(b);
  }
  function op(g, defs, kind) {
    defs.forEach(function (d) { button(g, icon(d[0]), d[2], function () { alignRun({ kind: kind, op: d[1] }); }); });
  }

  // One evenly spread row, like Illustrator's Align panel.
  function row(body, defs, kind) {
    var g = div(div(body, "groups"), "group");
    op(g, defs, kind);
  }

  function buildAlign(body) {
    row(body, [["alignLeft", "left", "Align left edges"], ["alignHC", "hc", "Align horizontal centers"], ["alignRight", "right", "Align right edges"],
               ["alignCenter", "center", "Center on both axes"],
               ["alignTop", "top", "Align top edges"], ["alignVC", "vc", "Align vertical centers"], ["alignBottom", "bottom", "Align bottom edges"]], "align");
  }

  function buildDist(body) {
    row(body, [["distTop", "top", "Distribute top edges"], ["distVC", "vc", "Distribute vertical centers"], ["distBottom", "bottom", "Distribute bottom edges"],
               ["distLeft", "left", "Distribute left edges"], ["distHC", "hc", "Distribute horizontal centers"], ["distRight", "right", "Distribute right edges"]], "dist");
  }

  function buildSpace(body) {
    var row = div(body, "groups"), g = div(row, "group");
    var field = div(row, "field"), input = document.createElement("input");
    input.type = "text"; input.placeholder = "Auto"; input.className = "gap";
    input.setAttribute("data-tip", "Gap in px. Empty evens out the current gaps; a number keeps the key (or first) layer and sets that exact gap.");
    var unit = document.createElement("span"); unit.className = "unit"; unit.textContent = "px";
    field.appendChild(input); field.appendChild(unit);
    function run(axis) {
      var txt = input.value.replace(/\s+/g, ""), gap = txt === "" ? null : parseFloat(txt);
      if (txt !== "" && isNaN(gap)) { say("Spacing must be a number, or empty to even out the current gaps.", true); return; }
      alignRun({ kind: "space", axis: axis, gap: gap });
    }
    button(g, icon("spaceV"), "Equal vertical gaps", function () { run("v"); });
    button(g, icon("spaceH"), "Equal horizontal gaps", function () { run("h"); });
  }

  function buildTo(body) {
    var modeButtons = {};
    pair(body, function (g) {
      [["sel", "toSelection", "Selection bounds"], ["comp", "toComp", "Composition frame"],
       ["outside", "toOutside", "Just outside the composition"], ["key", "toKey", "Key layer (the first layer you selected)"]
      ].forEach(function (d) {
        modeButtons[d[0]] = button(g, icon(d[1]), d[2], function () {
          state.mode = d[0]; saveState();
          for (var k in modeButtons) modeButtons[k].classList.toggle("on", k === state.mode);
        });
      });
      (modeButtons[state.mode] || modeButtons.sel).classList.add("on");
    }, function (g) {
      var gb = button(g, icon("asGroup"), "Move the selection as one block", function () { state.group = !state.group; saveState(); gb.classList.toggle("on", state.group); });
      var ab = button(g, icon("toAnchors"), "Use anchor points instead of layer bounds", function () { state.anchors = !state.anchors; saveState(); ab.classList.toggle("on", state.anchors); });
      gb.classList.toggle("on", state.group); ab.classList.toggle("on", state.anchors);
    });
  }

  // One combined panel, like Align Pro: its four blocks always travel together.
  function buildAlignPanel(body) {
    [["Align Layers", buildAlign], ["Distribute Layers", buildDist], ["Distribute Spacing", buildSpace], ["Align To", buildTo]].forEach(function (d) {
      var lab = div(body, "sub"); lab.textContent = d[0];
      d[1](div(body, "block"));
    });
  }

  // ---- Trim: build staggered trim paths on the selected shape layers, driven by one controller
  function buildTrim(body) {
    var t = store.get("trimState", { mode: "in", frames: 30, overlap: 50, random: false, seed: 1 });
    if (t.easeName === undefined) t.easeName = "50-80";
    function save() { store.set("trimState", t); }
    function clamp(v, lo, hi, dflt) { v = parseFloat(v); if (isNaN(v)) return dflt; return Math.max(lo, Math.min(hi, v)); }

    function formRow(label) {
      var r = div(body, "form"), l = document.createElement("label"); l.textContent = label; r.appendChild(l); return r;
    }
    function numField(parent, value, width) {
      var i = document.createElement("input"); i.type = "text"; i.className = "num"; i.value = value; i.style.width = width + "px"; parent.appendChild(i); return i;
    }
    function unit(parent, text) { var u = document.createElement("span"); u.className = "unit"; u.textContent = text; parent.appendChild(u); }

    // direction: how each path animates
    var dirRow = formRow("Animate");
    var seg = div(dirRow, "seg"), segBtns = {};
    [["in", "In", "Draw each path on"], ["out", "Out", "Draw each path off"], ["inout", "In & Out", "Draw on, then off"]].forEach(function (d) {
      var b = document.createElement("button"); b.textContent = d[1]; b.setAttribute("data-tip", d[2]);
      b.className = "segbtn" + (t.mode === d[0] ? " on" : "");
      b.addEventListener("click", function () { t.mode = d[0]; save(); for (var k in segBtns) segBtns[k].classList.toggle("on", k === t.mode); });
      seg.appendChild(b); segBtns[d[0]] = b;
    });

    var lenRow = formRow("Length");
    var len = numField(lenRow, t.frames, 44); unit(lenRow, "frames");
    len.setAttribute("data-tip", "Total length of the whole build, from the playhead");
    len.addEventListener("change", function () { t.frames = clamp(len.value, 1, 9999, 30); len.value = t.frames; save(); });

    // the ease on the build (the 50-80 ease by default; Linear for none), from the Ease panel's presets and your own
    var easeRow = formRow("Ease"), easeSel = CWDropdown(easeRow, [], t.easeName);
    function easeList() { return [{ name: "Linear", v: null }].concat(EASE_PRESETS.RT, store.get("easeMine", [])); }
    function easeVec(n) { var l = easeList(); for (var i = 0; i < l.length; i++) if (l[i].name === n) return l[i].v; return null; }
    easeSel.setItems(easeList().map(function (p) { return [p.name, p.name]; })); easeSel.value = t.easeName;
    easeSel.setAttribute("data-tip", "How the build eases. Applied to the build keyframes when you press Apply");
    easeSel.addEventListener("change", function () { t.easeName = easeSel.value; save(); });

    var ovRow = formRow("Overlap");
    var ov = numField(ovRow, t.overlap, 44); unit(ovRow, "%");
    ov.setAttribute("data-tip", "0 = one path after another, 100 = all at once. Updates the selected layer live.");
    ov.addEventListener("change", function () { t.overlap = clamp(ov.value, 0, 100, 50); ov.value = t.overlap; save(); host.call("trim.update", [{ overlap: t.overlap }]).then(done); });

    var rndRow = formRow("Order");
    var rnd = document.createElement("button"); rnd.className = "segbtn solo" + (t.random ? " on" : ""); rnd.textContent = "Random";
    rnd.setAttribute("data-tip", "Shuffle which path goes first (repeatable with the seed). Updates the selected layer live.");
    rnd.addEventListener("click", function () { t.random = !t.random; save(); rnd.classList.toggle("on", t.random); host.call("trim.update", [{ random: t.random }]).then(done); });
    rndRow.appendChild(rnd);
    var seed = numField(rndRow, t.seed, 36); seed.setAttribute("data-tip", "Seed: the same number always gives the same order");
    seed.addEventListener("change", function () { t.seed = Math.round(clamp(seed.value, 0, 99999, 1)); seed.value = t.seed; save(); host.call("trim.update", [{ seed: t.seed }]).then(done); });
    var dice = button(rndRow, icon("dice"), "New random order", function () {
      t.seed = 1 + Math.floor(Math.random() * 999); seed.value = t.seed; save();
      host.call("trim.update", [{ seed: t.seed, random: true }]).then(done);
      t.random = true; save(); rnd.classList.add("on");
    }, "small");

    // ---- Path direction: which end every trim draws from
    var revRow = formRow("Direction");
    button(revRow, '<svg viewBox="0 0 24 24" class="cap" aria-hidden="true"><path class="cl2" d="M4 8H20M16 4L20 8L16 12M20 16H4M8 12L4 16L8 20"/></svg>',
           "Reverse path direction: the selected paths (or every path in the selected shape layers) run the other way, so trims draw from the other end",
           function () { host.call("shape.reversePath", []).then(done); });
    var rl = document.createElement("span"); rl.className = "unit"; rl.textContent = "Reverse"; revRow.appendChild(rl);

    var acts = div(body, "actions");
    function mk(text, cls, tip, fn) { var b = document.createElement("button"); b.className = "btn " + cls; b.textContent = text; b.setAttribute("data-tip", tip); b.addEventListener("click", fn); acts.appendChild(b); return b; }
    mk("Apply", "primary", "Add the staggered trim to the selected shape layers (Alt-click to draw from the other end)", function (e) {
      t.frames = clamp(len.value, 1, 9999, 30); t.overlap = clamp(ov.value, 0, 100, 50); t.seed = Math.round(clamp(seed.value, 0, 99999, 1)); save();
      host.call("trim.run", [{ mode: t.mode, reverse: !!e.altKey, frames: t.frames, overlap: t.overlap, random: t.random, seed: t.seed, ease: easeVec(t.easeName) }]).then(done);
    });
    mk("Remove", "", "Remove the trims and the controller from the selected shape layers", function () {
      host.call("trim.removeSelected", []).then(done);
    });

  }

  // ---- Ease: a grid of curves to click onto selected keyframes, plus overshoot and bounce
  function curveIcon(v) {
    // 30x30 box; y is flipped so 1 is up. Overshoot curves are allowed to leave the box.
    var x0 = 4, y0 = 26, w = 22, h = 22;
    var P = function (x, y) { return [(x0 + x * w).toFixed(1), (y0 - y * h).toFixed(1)]; };
    var a = P(0, 0), b = P(v[0], v[1]), c = P(v[2], v[3]), d = P(1, 1);
    return '<svg viewBox="0 0 30 30" class="curve" aria-hidden="true">' +
      '<path class="h" d="M' + a.join(" ") + 'L' + b.join(" ") + 'M' + d.join(" ") + 'L' + c.join(" ") + '"/>' +
      '<path class="c" d="M' + a.join(" ") + 'C' + b.join(" ") + " " + c.join(" ") + " " + d.join(" ") + '"/>' +
      '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="1.6"/><circle cx="' + c[0] + '" cy="' + c[1] + '" r="1.6"/></svg>';
  }

  function buildEase(body) {
    var libs = { rt: "RT", mw: "Motion", mine: "Mine" };
    var st = store.get("easeState", { lib: "rt" });
    var mine = store.get("easeMine", []);
    function saveMine() { store.set("easeMine", mine); }

    var tabs = div(body, "seg tabs"), tabBtns = {}, grid = div(body, "tiles");
    function listFor(lib) { return lib === "rt" ? EASE_PRESETS.RT : lib === "mw" ? EASE_PRESETS.MW : mine; }

    function apply(v) { host.call("ease.run", [v]).then(done); }

    function draw() {
      grid.innerHTML = "";
      var list = listFor(st.lib);
      if (!list.length) {
        var hint = div(grid, "hint");
        hint.textContent = st.lib === "mine" ? "Nothing saved yet. Select two keyframes you have eased, then press +." : "";
      }
      list.forEach(function (p, i) {
        var t = document.createElement("div"); t.className = "tile";
        t.setAttribute("data-tip", p.name + "  (" + p.v.join(", ") + ")");
        t.innerHTML = curveIcon(p.v) + '<span class="nm"></span>';
        t.querySelector(".nm").textContent = p.name;
        t.addEventListener("click", function () { apply(p.v); });
        if (st.lib === "mine") {
          var x = document.createElement("button"); x.className = "del"; x.textContent = "\u00d7"; x.setAttribute("data-tip", "Delete this preset");
          x.addEventListener("click", function (e) { e.stopPropagation(); mine.splice(i, 1); saveMine(); draw(); });
          t.appendChild(x);
        }
        grid.appendChild(t);
      });
    }

    Object.keys(libs).forEach(function (k) {
      var b = document.createElement("button"); b.className = "segbtn" + (st.lib === k ? " on" : ""); b.textContent = libs[k];
      b.addEventListener("click", function () { st.lib = k; store.set("easeState", st); for (var j in tabBtns) tabBtns[j].classList.toggle("on", j === k); draw(); });
      tabs.appendChild(b); tabBtns[k] = b;
    });
    var plus = button(tabs.parentNode, icon("plus"), "Save the ease of the selected keyframes as a preset", function () {
      saveRow.style.display = "flex"; nameIn.focus();
    }, "small plus");
    tabs.parentNode.insertBefore(plus, grid);   // keep it right under the tabs
    plus.style.marginLeft = "6px";

    // copy the ease of the selected keyframes, paste it onto others
    var clip = store.get("easeClip", null);
    var copyBtn = btn(tabs.parentNode, "Copy", "Copy the ease of the selected keyframes", "", function () {
      host.value("CW.ease.captureSelected()").then(function (r) {
        var parts = String(r).split(",").map(parseFloat);
        if (r === "null" || r === "" || parts.length !== 4 || parts.some(isNaN)) { say("Select two neighbouring keyframes that have different values.", true); return; }
        clip = parts; store.set("easeClip", clip); syncPaste(); say("\u2713 Copied " + parts.map(function (n) { return Math.round(n * 100) / 100; }).join(", "), false);
      });
    });
    var pasteBtn = btn(tabs.parentNode, "Paste", "Apply the copied ease to the selected keyframes", "", function () { if (clip) apply(clip); });
    function syncPaste() { pasteBtn.style.opacity = clip ? "1" : "0.45"; }
    syncPaste();
    copyBtn.classList.add("mini"); pasteBtn.classList.add("mini");
    tabs.parentNode.insertBefore(copyBtn, grid); tabs.parentNode.insertBefore(pasteBtn, grid);

    // save row: appears when + is pressed
    var saveRow = div(body, "saverow"); saveRow.style.display = "none";
    var nameIn = document.createElement("input"); nameIn.type = "text"; nameIn.className = "num txt"; nameIn.style.width = "110px"; nameIn.placeholder = "Preset name";
    saveRow.appendChild(nameIn);
    function mkb(text, cls, fn) { var b = document.createElement("button"); b.className = "btn " + cls; b.textContent = text; b.addEventListener("click", fn); saveRow.appendChild(b); return b; }
    function doSave() {
      host.value("CW.ease.captureSelected()").then(function (r) {
        var parts = String(r).split(",").map(parseFloat);
        if (r === "null" || r === "" || parts.length !== 4 || parts.some(isNaN)) { say("Select two neighbouring keyframes that have different values.", true); return; }
        var name = nameIn.value.replace(/\s+/g, " ").trim() || ("Mine " + (mine.length + 1));
        for (var i = 0; i < mine.length; i++) if (mine[i].name === name) { mine[i].v = parts; name = null; break; }
        if (name) mine.push({ name: name, v: parts });
        saveMine(); nameIn.value = ""; saveRow.style.display = "none";
        st.lib = "mine"; store.set("easeState", st); for (var j in tabBtns) tabBtns[j].classList.toggle("on", j === "mine"); draw();
      });
    }
    mkb("Save", "primary", doSave);
    mkb("Cancel", "", function () { nameIn.value = ""; saveRow.style.display = "none"; });
    nameIn.addEventListener("keydown", function (e) { if (e.key === "Enter") doSave(); if (e.key === "Escape") saveRow.style.display = "none"; });

    var sub = div(body, "sub"); sub.textContent = "Bounce";
    var acts = div(body, "actions");
    function ab(text, tip, fn) { var b = document.createElement("button"); b.className = "btn"; b.textContent = text; b.setAttribute("data-tip", tip); b.addEventListener("click", fn); acts.appendChild(b); }
    ab("Overshoot", "Ring around each keyframe of the selected properties", function () { host.call("bounce.run", ["overshoot"]).then(done); });
    ab("Bounce", "Rebound one way after each keyframe of the selected properties", function () { host.call("bounce.run", ["bounce"]).then(done); });
    ab("Remove", "Remove bounce expressions and controls from the selected layers", function () { host.call("bounce.removeSelected", []).then(done); });
    draw();
  }

  // ---- Comps: textless duplicates and batch renaming
  function textInput(parent, value, width, placeholder) {
    var i = document.createElement("input"); i.type = "text"; i.className = "num txt"; i.value = value || ""; i.style.width = width + "px";
    if (placeholder) i.placeholder = placeholder; parent.appendChild(i); return i;
  }
  function check(parent, text, value, onChange) {
    var l = document.createElement("label"); l.className = "chk";
    var i = document.createElement("input"); i.type = "checkbox"; i.checked = !!value;
    var b = document.createElement("span"); b.className = "box";
    var t = document.createElement("span"); t.textContent = text;
    l.appendChild(i); l.appendChild(b); l.appendChild(t); parent.appendChild(l);
    i.addEventListener("change", function () { onChange(i.checked); });
    return i;
  }
  function segmented(parent, options, current, onPick) {
    var seg = div(parent, "seg"), btns = {};
    options.forEach(function (o) {
      var b = document.createElement("button"); b.className = "segbtn" + (current === o[0] ? " on" : ""); b.textContent = o[1];
      if (o[2]) b.setAttribute("data-tip", o[2]);
      b.addEventListener("click", function () { for (var k in btns) btns[k].classList.toggle("on", k === o[0]); onPick(o[0]); });
      seg.appendChild(b); btns[o[0]] = b;
    });
    return seg;
  }
  function frow(parent, label) { var r = div(parent, "form"), l = document.createElement("label"); l.textContent = label; r.appendChild(l); return r; }
  function btn(parent, text, tip, cls, fn) { var b = document.createElement("button"); b.className = "btn " + (cls || ""); b.textContent = text; if (tip) b.setAttribute("data-tip", tip); b.addEventListener("click", fn); parent.appendChild(b); return b; }

  function buildComps(body) {
    var cs = store.get("compsState", {
      suffix: "-TEXTLESS", disableText: true, deep: true, folder: "",
      target: "layers", mode: "replace", find: "", replace: "", matchCase: false, regex: false,
      prefix: "", affix: "", base: "", start: 1, step: 1, pad: 2, where: "suffix", sep: " ", kind: "title"
    });
    function save() { store.set("compsState", cs); }

    // ---- Duplicate comps
    var d = div(body, "block");
    var lab1 = div(d, "sub"); lab1.textContent = "Duplicate Comps";
    var r1 = frow(d, "Suffix"); var suffix = textInput(r1, cs.suffix, 120);
    suffix.setAttribute("data-tip", "Added to the end of every duplicated comp's name"); suffix.addEventListener("input", function () { cs.suffix = suffix.value; save(); });
    check(d, "Turn off text layers", cs.disableText, function (v) { cs.disableText = v; save(); }).parentNode.setAttribute("data-tip", "Switch off every text layer in the copies (the originals are not touched)");
    check(d, "Duplicate nested comps", cs.deep, function (v) { cs.deep = v; save(); }).parentNode.setAttribute("data-tip", "Also copy the comps nested inside, once each, so the originals are never changed. Without it, text inside nested comps stays on.");
    var r2 = frow(d, "Folder"); var folder = textInput(r2, cs.folder, 120, "Optional");
    folder.setAttribute("data-tip", "Put the copies in this project folder (created if needed)"); folder.addEventListener("input", function () { cs.folder = folder.value; save(); });
    var a1 = div(d, "actions");
    btn(a1, "Duplicate", "Duplicate the comps selected in the Project panel", "primary", function () {
      host.call("comps.duplicate", [{ suffix: suffix.value || "-TEXTLESS", disableText: cs.disableText, deep: cs.deep, folder: folder.value.trim() }]).then(done);
    });

    // ---- Rename
    var lab2 = div(body, "sub"); lab2.textContent = "Rename";
    var rn = div(body, "block");
    var rt = frow(rn, "Rename");
    segmented(rt, [["layers", "Layers", "Selected layers in the active comp"], ["comps", "Comps", "Comps selected in the Project panel"], ["items", "Items", "Anything selected in the Project panel"]], cs.target, function (v) { cs.target = v; save(); });
    var rm = frow(rn, "How");
    var panes = {};
    function showPane() { for (var k in panes) panes[k].style.display = (k === cs.mode) ? "block" : "none"; }
    segmented(rm, [["replace", "Replace"], ["affix", "Add"], ["number", "Number"], ["case", "Case"]], cs.mode, function (v) { cs.mode = v; save(); showPane(); });

    // Replace
    var p1 = panes.replace = div(rn, "pane");
    var fr1 = frow(p1, "Find"); var find = textInput(fr1, cs.find, 130); find.addEventListener("input", function () { cs.find = find.value; save(); });
    var fr2 = frow(p1, "With"); var repl = textInput(fr2, cs.replace, 130); repl.addEventListener("input", function () { cs.replace = repl.value; save(); });
    var opts = div(p1, "checks");
    check(opts, "Match case", cs.matchCase, function (v) { cs.matchCase = v; save(); });
    check(opts, "Regular expression", cs.regex, function (v) { cs.regex = v; save(); }).parentNode.setAttribute("data-tip", "Treat Find as a regular expression; $1 in With is the first group");
    // Add
    var p2 = panes.affix = div(rn, "pane");
    var ar1 = frow(p2, "Prefix"); var pre = textInput(ar1, cs.prefix, 130); pre.addEventListener("input", function () { cs.prefix = pre.value; save(); });
    var ar2 = frow(p2, "Suffix"); var suf = textInput(ar2, cs.affix, 130); suf.addEventListener("input", function () { cs.affix = suf.value; save(); });
    // Number
    var p3 = panes.number = div(rn, "pane");
    var nr1 = frow(p3, "Name"); var base = textInput(nr1, cs.base, 130, "Keep current names"); base.addEventListener("input", function () { cs.base = base.value; save(); });
    var nr2 = frow(p3, "Count");
    function numIn(label, key, w) { var l = document.createElement("span"); l.className = "unit"; l.textContent = label; nr2.appendChild(l); var i = textInput(nr2, cs[key], w); i.classList.remove("txt"); i.addEventListener("change", function () { var v = parseInt(i.value, 10); cs[key] = isNaN(v) ? cs[key] : v; i.value = cs[key]; save(); }); }
    numIn("from", "start", 34); numIn("by", "step", 28); numIn("pad", "pad", 28);
    var nr3 = frow(p3, "Place");
    segmented(nr3, [["suffix", "After"], ["prefix", "Before"]], cs.where, function (v) { cs.where = v; save(); });
    var sepIn = textInput(nr3, cs.sep, 30); sepIn.setAttribute("data-tip", "Separator between the name and the number"); sepIn.addEventListener("input", function () { cs.sep = sepIn.value; save(); });
    // Case
    var p4 = panes.case = div(rn, "pane");
    var cr = frow(p4, "Style");
    segmented(cr, [["upper", "UPPER"], ["lower", "lower"], ["title", "Title"], ["sentence", "Sentence"]], cs.kind, function (v) { cs.kind = v; save(); });
    showPane();

    var a2 = div(rn, "actions");
    btn(a2, "Rename", "Rename the selected layers, comps or items (Cmd+Z undoes it)", "primary", function () {
      var op;
      if (cs.mode === "replace") op = { mode: "replace", find: find.value, replace: repl.value, matchCase: cs.matchCase, regex: cs.regex };
      else if (cs.mode === "affix") op = { mode: "affix", prefix: pre.value, suffix: suf.value };
      else if (cs.mode === "number") op = { mode: "number", base: base.value, start: cs.start, step: cs.step, pad: cs.pad, where: cs.where, sep: sepIn.value };
      else op = { mode: "case", kind: cs.kind };
      host.call("rename.run", [cs.target, op]).then(done);
    });
  }

  // ---- Arrows: ONE shape layer, live editable. Controls here change the selected arrow at once.
  // Arrow presets: head shape (1..7 as in the effect's Shape menu), size, tail and so on. Picking one restyles the selected
  // arrow live and sets what the next new arrow gets. Everything else lives in the Arrow effect's own controls.
  var ARROW_PRESETS = [
    { name: "Classic",       v: { shape: 2, size: 40, tail: false, reverse: false, mode: 1, animate: false, grow: 0 } },
    { name: "Open",          v: { shape: 5, size: 40, tail: false, reverse: false, mode: 1, animate: false, grow: 0 } },
    { name: "Bold",          v: { shape: 2, size: 80, tail: false, reverse: false, mode: 1, animate: false, grow: 0 } },
    { name: "Pointer",       v: { shape: 3, size: 50, tail: false, reverse: false, mode: 1, animate: false, grow: 0 } },
    { name: "Double Ended",  v: { shape: 2, size: 40, tail: true, tailSame: true, reverse: false, mode: 1, animate: false, grow: 0 } },
    { name: "Open Double",   v: { shape: 5, size: 40, tail: true, tailSame: true, reverse: false, mode: 1, animate: false, grow: 0 } },
    { name: "Feathered",     v: { shape: 3, size: 50, tail: true, tailSame: false, tailShape: 4, reverse: false, mode: 1, animate: false, grow: 0 } },
    { name: "Heart",         v: { shape: 6, size: 50, tail: false, reverse: false, mode: 1, animate: false, grow: 0 } },
    { name: "Dot",           v: { shape: 1, size: 30, polygonPoints: 12, tail: false, reverse: false, mode: 1, animate: false, grow: 0 } },
    { name: "Build On",      v: { shape: 2, size: 40, tail: false, reverse: false, mode: 1, animate: true, grow: 25 } },
    { name: "Travelling",    v: { shape: 2, size: 40, tail: false, reverse: false, mode: 3, animate: true, length: 25, grow: 0 } }
  ];

  function buildArrows(body) {
    var a = store.get("arrowState", {});
    var dflt = { preset: "Classic", animate: false, frames: 30, orient: true, loop: false, angle: 0 };
    for (var dk in dflt) if (a[dk] === undefined) a[dk] = dflt[dk];
    function save() { store.set("arrowState", a); }
    function clampN(v, lo, hi, d) { v = parseFloat(v); if (isNaN(v)) return d; return Math.max(lo, Math.min(hi, v)); }
    function row(parent, label) { var r = div(parent, "form"), l = document.createElement("label"); l.textContent = label; r.appendChild(l); return r; }
    function num(parent, value, w) { var i = document.createElement("input"); i.type = "text"; i.className = "num"; i.value = value; i.style.width = w + "px"; parent.appendChild(i); return i; }
    function unit(parent, t) { var u = document.createElement("span"); u.className = "unit"; u.textContent = t; parent.appendChild(u); }
    function live(patch) { return host.call("arrow.update", [patch]).then(done); }     // changes the selected arrow, if one is selected
    var TYPES = ARROW_SHAPES.types;

    var blk = div(body, "block");

    var userPresets = store.get("arrowUser", []);
    function saveUser() { store.set("arrowUser", userPresets); }
    function allPresets() { return ARROW_PRESETS.concat(userPresets); }
    function presetByName(n) { var l = allPresets(); for (var i = 0; i < l.length; i++) if (l[i].name === n) return l[i]; return ARROW_PRESETS[0]; }
    function isUser(n) { for (var i = 0; i < userPresets.length; i++) if (userPresets[i].name === n) return true; return false; }

    var pr = row(blk, "Preset"); var sel = CWDropdown(pr, [], a.preset);
    sel.setAttribute("data-tip", "Restyles the selected arrow, and sets the look of the next new one");
    var addBtn = button(pr, icon("plus"), "Save the selected arrow's settings as a preset", function () { saveRow.style.display = "flex"; nameIn.focus(); }, "small");
    var delBtn = button(pr, "\u00d7", "Delete this preset", function () {
      for (var i = 0; i < userPresets.length; i++) if (userPresets[i].name === a.preset) { userPresets.splice(i, 1); break; }
      saveUser(); a.preset = "Classic"; save(); fillSel();
    }, "small");
    function fillSel() {
      var items = ARROW_PRESETS.map(function (p) { return [p.name, p.name]; });
      if (userPresets.length) items.push({ group: "Mine", items: userPresets.map(function (p) { return [p.name, p.name]; }) });
      sel.setItems(items); sel.value = a.preset;
      delBtn.style.display = isUser(a.preset) ? "" : "none";
    }
    sel.addEventListener("change", function () {
      a.preset = sel.value; var v = presetByName(a.preset).v; a.animate = !!v.animate; animBox.checked = a.animate; durRow.style.display = a.animate ? "flex" : "none"; save();
      delBtn.style.display = isUser(a.preset) ? "" : "none";
      live(v);
    });

    // save row: appears when + is pressed
    var saveRow = div(blk, "saverow"); saveRow.style.display = "none";
    var nameIn = document.createElement("input"); nameIn.type = "text"; nameIn.className = "num txt"; nameIn.placeholder = "Preset name"; saveRow.appendChild(nameIn);
    function doSaveArrow() {
      host.value("CW.arrow.readString()").then(function (r) {
        r = String(r);
        if (r === "null" || r === "") { say("Select an arrow layer to copy its settings from.", true); return; }
        var v = {}; r.split(";").forEach(function (kv) { var p = kv.split("="); v[p[0]] = parseFloat(p[1]); });
        ["tail", "tailSame", "reverse", "animate"].forEach(function (k) { v[k] = v[k] === 1; });
        var name = nameIn.value.replace(/\s+/g, " ").trim() || ("Mine " + (userPresets.length + 1)), found = false;
        for (var i = 0; i < ARROW_PRESETS.length; i++) if (ARROW_PRESETS[i].name === name) name += " 2";
        for (var j = 0; j < userPresets.length; j++) if (userPresets[j].name === name) { userPresets[j].v = v; found = true; }
        if (!found) userPresets.push({ name: name, v: v });
        saveUser(); a.preset = name; a.animate = v.animate; animBox.checked = a.animate; durRow.style.display = a.animate ? "flex" : "none"; save();
        nameIn.value = ""; saveRow.style.display = "none"; fillSel();
      });
    }
    var okBtn = btn(saveRow, "Save", "", "primary", doSaveArrow), noBtn = btn(saveRow, "Cancel", "", "", function () { nameIn.value = ""; saveRow.style.display = "none"; });
    nameIn.addEventListener("keydown", function (e) { if (e.key === "Enter") doSaveArrow(); if (e.key === "Escape") saveRow.style.display = "none"; });

    var animBox;
    var chk = check(blk, "Animate (build the arrow on)", a.animate, function (v) { a.animate = v; save(); durRow.style.display = v ? "flex" : "none"; live({ animate: v }); });
    animBox = chk;
    var durRow = row(blk, "Duration"); var frames = num(durRow, a.frames, 44); unit(durRow, "frames");
    frames.setAttribute("data-tip", "How long the build takes. Retimes the selected arrow live, and sets the length of new ones");
    frames.setAttribute("data-min", "1");
    frames.addEventListener("change", function () { a.frames = Math.round(clampN(frames.value, 1, 9999, 30)); frames.value = a.frames; save(); live({ frames: a.frames }); });
    durRow.style.display = a.animate ? "flex" : "none";

    fillSel();
    var acts = div(blk, "actions");
    function opts() {
      var v = presetByName(a.preset).v;
      return { type: TYPES[(v.shape || 2) - 1][0], mode: ["draw", "drawoff", "travel"][(v.mode || 1) - 1], animate: a.animate, grow: v.grow || 0, frames: a.frames,
               size: v.size || 40, length: v.length || 30, reverse: !!v.reverse, tail: !!v.tail, tailSame: v.tailSame !== false,
               tailType: TYPES[(v.tailShape || 4) - 1][0], polygonPoints: v.polygonPoints || 5, angle: v.angle || 0, asNew: false };
    }
    btn(acts, "Arrow", "A shape layer selected: add an arrow head to its path. Nothing selected: make a new arrow", "primary", function () { host.call("arrow.run", [opts()]).then(done); });
    btn(acts, "Remove", "Remove the arrow from the selected layer, keeping its line", "", function () { host.call("arrow.removeSelected", []).then(done); });

    var lab2 = div(body, "sub"); lab2.textContent = "Follow Path";
    var blk2 = div(body, "block");
    var checks = div(blk2, "checks"); checks.style.margin = "2px 0 4px 0";
    check(checks, "Face the way it travels", a.orient, function (v) { a.orient = v; save(); host.call("follow.update", [{ orient: v }]).then(done); });
    check(checks, "Loop", a.loop, function (v) { a.loop = v; save(); host.call("follow.update", [{ loop: v }]).then(done); });
    var ar = row(blk2, "Angle"); var ang = num(ar, a.angle, 44); unit(ar, "degrees");
    ang.setAttribute("data-tip", "Extra turn added to the direction. Updates the selected path layer live");
    ang.addEventListener("change", function () { a.angle = clampN(ang.value, -360, 360, 0); ang.value = a.angle; save(); host.call("follow.update", [{ angle: a.angle }]).then(done); });
    var acts2 = div(blk2, "actions");
    btn(acts2, "Follow Path", "Place the selected layers along the selected path", "primary", function () { host.call("follow.run", [{ orient: a.orient, loop: a.loop, angle: a.angle }]).then(done); });
    btn(acts2, "Release", "Free the selected layers, or remove the controls from the selected path layer", "", function () { host.call("follow.removeSelected", []).then(done); });

    var lab3 = div(body, "sub"); lab3.textContent = "Path Nulls";
    var blk3 = div(body, "block");
    var acts3 = div(blk3, "actions"); acts3.style.marginTop = "0";
    btn(acts3, "Drive Path", "A null on every point of the selected path: move a null and the path follows", "primary", function () { host.call("nulls.run", [{ kind: "drive" }]).then(done); });
    btn(acts3, "Follow Path", "A null on every point that follows the path, to parent things to", "", function () { host.call("nulls.run", [{ kind: "follow" }]).then(done); });
    btn(acts3, "Release", "Make a driven path an ordinary path again, as it is now", "", function () { host.call("nulls.release", []).then(done); });
  }

  var SECTIONS = [
    { id: "anchor", title: "Anchor Point", group: "anchor", build: buildAnchor, fixed: true, basis: 96 },
    { id: "align", title: "Align", group: "align", build: buildAlignPanel, fixed: true },
    { id: "trim", title: "Trim Paths", group: "trim", build: buildTrim, fixed: true },
    { id: "arrows", title: "Arrows", group: "arrows", build: buildArrows, basis: 270 },
    { id: "type", title: "Type", group: "type", build: buildType, basis: 250 },
    { id: "stagger", title: "Stagger", group: "stagger", build: buildStagger, basis: 250 },
    { id: "ease", title: "Ease", group: "ease", build: buildEase, basis: 250 },
    { id: "comps", title: "Comps", group: "comps", build: buildComps, basis: 270 },
    { id: "strip", title: "Buttons", group: "strip", build: function (body) { buildStrip(body, { div: div, btn: btn, say: say, done: done }); }, basis: 230 }
  ];

  // ---- Type: staggered text animation with looks. The timing lives in the layer's Type effect; these controls build it and follow it live.
  var TYPE_LOOKS = [
    ["fade", "Fade"], ["fadeup", "Fade Up"], ["fadedown", "Fade Down"], ["slideleft", "Slide Left"], ["slideright", "Slide Right"],
    ["pop", "Pop"], ["rotate", "Rotate In"], ["blur", "Blur In"], ["spread", "Spread"], ["typeon", "Type On"]
  ];
  var TYPE_MASKS = [["mask:right", "Wipe Right"], ["mask:left", "Wipe Left"], ["mask:up", "Wipe Up"], ["mask:down", "Wipe Down"], ["mask:center", "Open from Centre"]];
  var TYPE_TIMING = { typeon: { delay: 2, dur: 1 }, "mask:right": { delay: 8, dur: 20 }, "mask:left": { delay: 8, dur: 20 }, "mask:up": { delay: 8, dur: 20 }, "mask:down": { delay: 8, dur: 20 }, "mask:center": { delay: 8, dur: 20 } };      // a look can suggest its own timing
  function buildType(body) {
    var t = store.get("typeState", {});
    var dflt = { look: "fadeup", by: 1, ease: "50-80", delay: 3, dur: 15, shift: 0, rev: false, rnd: false, anIn: true, out: false, feather: 0 };
    for (var dk in dflt) if (t[dk] === undefined) t[dk] = dflt[dk];
    // By used to be 1 / 3 / 4 (the animator's Based On); it is now the effect's own 1 / 2 / 3 dropdown
    if (!t.byFx) { if (t.by === 3) t.by = 2; else if (t.by === 4) t.by = 3; t.byFx = true; store.set("typeState", t); }
    var uls = store.get("typeUser", []), moved = false;
    uls.forEach(function (u) { if (u.timing && !u.byFx) { if (u.timing.by === 3) u.timing.by = 2; else if (u.timing.by === 4) u.timing.by = 3; u.byFx = true; moved = true; } });
    if (moved) store.set("typeUser", uls);
    function save() { store.set("typeState", t); }
    function clampN(v, lo, hi, d) { v = parseFloat(v); if (isNaN(v)) return d; return Math.max(lo, Math.min(hi, v)); }
    function row(parent, label) { var r = div(parent, "form"), l = document.createElement("label"); l.textContent = label; r.appendChild(l); return r; }
    function num(parent, value, w) { var i = document.createElement("input"); i.type = "text"; i.className = "num"; i.value = value; i.style.width = w + "px"; parent.appendChild(i); return i; }
    function unit(parent, tx) { var u = document.createElement("span"); u.className = "unit"; u.textContent = tx; parent.appendChild(u); }
    function live(patch) { return host.call("typefx.update", [patch]).then(done); }
    function select(parent, items, current, onPick) {
      var el = CWDropdown(parent, items, current);
      el.addEventListener("change", function () { onPick(el.value); }); return el;
    }
    var blk = div(body, "block");

    // looks: built in, plus your own (the look and timing of a layer you saved)
    var userLooks = store.get("typeUser", []);
    function saveUser() { store.set("typeUser", userLooks); }
    function userByName(n) { for (var i = 0; i < userLooks.length; i++) if (userLooks[i].name === n) return userLooks[i]; return null; }
    var lr = row(blk, "Look"); var delayIn, durIn, shiftIn, bySel, easeSel, revBox, rndBox, inBox, outBox;
    var lookSel = CWDropdown(lr, [], t.look); lookSel.setAttribute("data-tip", "What each character does as it arrives");
    var addBtn = button(lr, icon("plus"), "Save the selected layer's look and timing", function () { saveRow.style.display = "flex"; nameIn.focus(); }, "small");
    var delBtn = button(lr, "\u00d7", "Delete this saved look", function () {
      for (var i = 0; i < userLooks.length; i++) if (("u:" + userLooks[i].name) === t.look) { userLooks.splice(i, 1); break; }
      saveUser(); t.look = "fadeup"; save(); fillLook();
    }, "small");
    function fillLook() {
      var items = TYPE_LOOKS.map(function (it) { return [it[0], it[1]]; });
      items.push({ group: "Mask (per line)", items: TYPE_MASKS });
      if (userLooks.length) items.push({ group: "Mine", items: userLooks.map(function (u) { return ["u:" + u.name, u.name]; }) });
      lookSel.setItems(items);
      lookSel.value = t.look; delBtn.style.display = t.look.indexOf("u:") === 0 ? "" : "none"; showFeather();
    }
    // the options that say which look to build or switch to
    function lookOpts() {
      if (t.look.indexOf("u:") === 0) { var u = userByName(t.look.substr(2)); if (u) return { props: u.props, lookName: u.name }; }
      return { preset: t.look.indexOf("u:") === 0 ? "fadeup" : t.look };
    }
    function applyTiming(m) {      // set the state and the controls from saved timing
      for (var k in m) t[k] = m[k];
      delayIn.value = t.delay; durIn.value = t.dur; shiftIn.value = t.shift; bySel.value = t.by; easeSel.value = t.ease;
      revBox.checked = t.rev; rndBox.checked = t.rnd; inBox.checked = t.anIn; outBox.checked = t.out;
    }
    lookSel.addEventListener("change", function () {
      t.look = lookSel.value; delBtn.style.display = t.look.indexOf("u:") === 0 ? "" : "none"; showFeather();
      var patch = lookOpts(), tm = null; if (t.look.indexOf("mask:") === 0) patch.feather = t.feather;
      if (t.look.indexOf("u:") === 0) { var u = userByName(t.look.substr(2)); if (u) tm = u.timing; }
      else if (TYPE_TIMING[t.look]) tm = TYPE_TIMING[t.look];
      if (tm) {
        applyTiming(tm);
        patch.delay = t.delay; patch.dur = t.dur; patch.shift = t.shift; patch.ease = t.ease; patch.animIn = t.anIn; patch.animOut = t.out; patch.reverse = t.rev; patch.random = t.rnd; patch.by = t.by;
      }
      save(); live(patch);
    });

    // save row: appears when + is pressed
    var saveRow = div(blk, "saverow"); saveRow.style.display = "none";
    var nameIn = document.createElement("input"); nameIn.type = "text"; nameIn.className = "num txt"; nameIn.placeholder = "Look name"; saveRow.appendChild(nameIn);
    function doSaveLook() {
      host.value("CW.typefx.readString()").then(function (r) {
        r = String(r);
        if (r === "null" || r === "" || r.indexOf(";;") < 0) { say("Select a text layer that has a Type animation to copy its look from.", true); return; }
        var halves = r.split(";;"), head = {}, props = [];
        halves[0].split(";").forEach(function (kv) { var i = kv.indexOf("="); head[kv.substr(0, i)] = kv.substr(i + 1); });
        halves[1].split("|").forEach(function (kv) {
          if (!kv) return; var i = kv.indexOf("="), vals = kv.substr(i + 1).split(",").map(parseFloat);
          props.push([kv.substr(0, i), vals.length === 1 ? vals[0] : vals]);
        });
        if (!props.length) { say("That look has nothing set (every value is at its default).", true); return; }
        var name = nameIn.value.replace(/\s+/g, " ").trim() || ("Mine " + (userLooks.length + 1)), found = false, i;
        for (i = 0; i < TYPE_LOOKS.length; i++) if (TYPE_LOOKS[i][1] === name) name += " 2";
        var entry = { name: name, props: props, timing: { delay: parseFloat(head.delay), dur: parseFloat(head.dur), shift: parseFloat(head.shift), ease: head.ease, anIn: head.in !== "0" && head.dir !== "2", out: head.out === "1" || head.dir === "2",
                                                          rev: head.rev === "1", rnd: head.rnd === "1", by: parseInt(head.by, 10) } };
        for (i = 0; i < userLooks.length; i++) if (userLooks[i].name === name) { userLooks[i] = entry; found = true; }
        if (!found) userLooks.push(entry);
        saveUser(); t.look = "u:" + name; save(); nameIn.value = ""; saveRow.style.display = "none"; fillLook();
      });
    }
    btn(saveRow, "Save", "", "primary", doSaveLook); btn(saveRow, "Cancel", "", "", function () { nameIn.value = ""; saveRow.style.display = "none"; });
    nameIn.addEventListener("keydown", function (e) { if (e.key === "Enter") doSaveLook(); if (e.key === "Escape") saveRow.style.display = "none"; });

    var br = row(blk, "By");
    bySel = select(br, [[1, "Character"], [2, "Word"], [3, "Line"]], t.by, function (v) { t.by = parseInt(v, 10); save(); live({ by: t.by }); });
    bySel.setAttribute("data-tip", "Animate by character, word or line");
    var er = row(blk, "Ease");
    var easeItems = [["Linear", "Linear"]].concat(EASE_PRESETS.RT.map(function (p) { return [p.name, p.name]; }));
    easeSel = select(er, easeItems, t.ease, function (v) { t.ease = v; save(); live({ ease: v }); });
    easeSel.setAttribute("data-tip", "The ease each character follows");
    var dr = row(blk, "Delay"); delayIn = num(dr, t.delay, 44); unit(dr, "frames");
    delayIn.setAttribute("data-tip", "Frames between one character and the next"); delayIn.setAttribute("data-min", "0");
    delayIn.addEventListener("change", function () { t.delay = clampN(delayIn.value, 0, 1000, 3); delayIn.value = t.delay; save(); live({ delay: t.delay }); });
    var ur = row(blk, "Duration"); durIn = num(ur, t.dur, 44); unit(ur, "frames");
    durIn.setAttribute("data-tip", "How long each character takes"); durIn.setAttribute("data-min", "1");
    durIn.addEventListener("change", function () { t.dur = clampN(durIn.value, 1, 10000, 15); durIn.value = t.dur; save(); live({ dur: t.dur }); });
    var sr = row(blk, "Shift"); shiftIn = num(sr, t.shift, 44); unit(sr, "frames");
    shiftIn.setAttribute("data-tip", "Slide the whole animation earlier or later");
    shiftIn.addEventListener("change", function () { t.shift = clampN(shiftIn.value, -100000, 100000, 0); shiftIn.value = t.shift; save(); live({ shift: t.shift }); });
    // soft edge for the mask looks (shown only for those)
    var feRow = row(blk, "Feather"); var feIn = num(feRow, t.feather, 44); unit(feRow, "px");
    feIn.setAttribute("data-tip", "Soften the moving edge of each line's mask. Also on each mask's own Mask Feather"); feIn.setAttribute("data-min", "0");
    feIn.addEventListener("change", function () { t.feather = clampN(feIn.value, 0, 2000, 0); feIn.value = t.feather; save(); live({ feather: t.feather }); });
    function showFeather() { feRow.style.display = t.look.indexOf("mask:") === 0 ? "flex" : "none"; }
    showFeather();
    var checks = div(blk, "checks"); checks.style.margin = "2px 0 2px 0";
    revBox = check(checks, "Reverse", t.rev, function (v) { t.rev = v; save(); live({ reverse: v }); });
    rndBox = check(checks, "Random", t.rnd, function (v) { t.rnd = v; save(); live({ random: v }); });
    inBox = check(checks, "In", t.anIn, function (v) { t.anIn = v; save(); live({ animIn: v }); });
    outBox = check(checks, "Out", t.out, function (v) { t.out = v; save(); live({ animOut: v }); });
    fillLook();

    var acts = div(blk, "actions");
    btn(acts, "Apply", "Animate the selected text layers", "primary", function () {
      host.call("typefx.run", [(function () { var o = lookOpts(); o.by = t.by; o.ease = t.ease; o.delay = t.delay; o.dur = t.dur; o.shift = t.shift; o.reverse = t.rev; o.random = t.rnd; o.animIn = t.anIn; o.animOut = t.out; o.feather = t.feather; return o; })()]).then(done);
    });
    btn(acts, "Remove", "Remove the animation from the selected text layers", "", function () { host.call("typefx.removeSelected", []).then(done); });

    // ---- Slab: make every line the same width (point text; lines separated by Enter)
    var sl = store.get("slabState", {});
    var sd = { width: "Auto", threshold: 60, oneWord: true, leading: 100, recolor: false, c1: "#ff7338", c2: "#4db3ff" };
    for (var sk in sd) if (sl[sk] === undefined) sl[sk] = sd[sk];
    function saveSlab() { store.set("slabState", sl); }
    function hexRgb(h) { var m = /^#?([0-9a-f]{6})$/i.exec(h || ""); var n = m ? parseInt(m[1], 16) : 0xffffff; return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
    function slabOpts() {
      var w = parseFloat(sl.width); if (isNaN(w) || w < 0) w = 0;
      return { width: w, threshold: sl.threshold, oneWord: sl.oneWord, leading: sl.leading, recolor: sl.recolor, c1: hexRgb(sl.c1), c2: hexRgb(sl.c2) };
    }
    function slabLive() { return host.call("slab.update", [slabOpts()]).then(done); }       // re-applies to selected layers that are already slabbed

    var slabTitle = div(body, "sub"); slabTitle.textContent = "Slab";
    var sb = div(body, "block");
    var swRow = row(sb, "Width"); var swIn = document.createElement("input"); swIn.type = "text"; swIn.className = "num"; swIn.value = sl.width; swIn.style.width = "54px"; swRow.appendChild(swIn);
    var swU = document.createElement("span"); swU.className = "unit"; swU.textContent = "px, or Auto"; swRow.appendChild(swU);
    swIn.setAttribute("data-tip", "The width every line is fitted to. Auto uses the widest line");
    swIn.addEventListener("change", function () { sl.width = swIn.value.trim() || "Auto"; swIn.value = sl.width; saveSlab(); slabLive(); });
    var thRow = row(sb, "Threshold"); var thIn = num(thRow, sl.threshold, 44); unit(thRow, "%");
    thIn.setAttribute("data-tip", "Lines narrower than this share of the width are scaled up; wider lines are tracked out"); thIn.setAttribute("data-min", "0"); thIn.setAttribute("data-max", "100");
    thIn.addEventListener("change", function () { sl.threshold = clampN(thIn.value, 0, 100, 60); thIn.value = sl.threshold; saveSlab(); slabLive(); });
    var ldRow = row(sb, "Leading"); var ldIn = num(ldRow, sl.leading, 44); unit(ldRow, "%");
    ldIn.setAttribute("data-tip", "Space between lines, as a percentage of the text's original leading"); ldIn.setAttribute("data-min", "10");
    ldIn.addEventListener("change", function () { sl.leading = clampN(ldIn.value, 10, 1000, 100); ldIn.value = sl.leading; saveSlab(); slabLive(); });
    var sc = div(sb, "checks"); sc.style.margin = "2px 0 2px 0";
    check(sc, "One word scales", sl.oneWord, function (v) { sl.oneWord = v; saveSlab(); slabLive(); }).parentNode.setAttribute("data-tip", "A line with a single word is always scaled, never tracked");
    var rcBox = check(sc, "Recolour", sl.recolor, function (v) { sl.recolor = v; colRow.style.display = v ? "flex" : "none"; saveSlab(); slabLive(); });
    rcBox.parentNode.setAttribute("data-tip", "Colour each line from Start to End by how much it was scaled");
    var colRow = row(sb, "Colour"); colRow.style.display = sl.recolor ? "flex" : "none";
    var cpHolder = null;
    function swatch(key, tip) {
      var b = document.createElement("button"); b.className = "colbtn"; b.style.background = sl[key]; b.setAttribute("data-tip", tip); colRow.appendChild(b);
      b.addEventListener("click", function () {
        if (cpHolder) { var same = cpHolder.key === key; cpHolder.el.parentNode.removeChild(cpHolder.el); cpHolder = null; if (same) return; }
        if (!window.cwColorPicker) return;
        var el = window.cwColorPicker(sb, sl[key], function (hex) { if (!hex) return; sl[key] = hex; b.style.background = hex; saveSlab(); slabLive(); });
        sb.insertBefore(el, colRow.nextSibling); cpHolder = { el: el, key: key };
      });
      return b;
    }
    swatch("c1", "Start colour: the least scaled line"); swatch("c2", "End colour: the most scaled line");
    var sa = div(sb, "actions");
    btn(sa, "Slab", "Fit the lines of the selected text layers to one width", "primary", function () { host.call("slab.run", [slabOpts()]).then(done); });
    btn(sa, "Clear", "Put the selected text layers back to their original size, tracking, leading and colour", "", function () { host.call("slab.clearSelected", []).then(done); });
  }

  // ---- Stagger: offset layers, trim points or keyframes one after another
  function buildStagger(body) {
    var g = store.get("staggerState", {});
    var dflt = { mode: "layers", amount: "2", ease: 0, power: 0, shiftOnly: false, additive: false };
    for (var dk in dflt) if (g[dk] === undefined) g[dk] = dflt[dk];
    function save() { store.set("staggerState", g); }
    function row(parent, label) { var r = div(parent, "form"), l = document.createElement("label"); l.textContent = label; r.appendChild(l); return r; }
    var blk = div(body, "block");

    var acts = div(blk, "actions"); acts.style.margin = "0 0 8px 0";      // the order buttons lead the section
    function go(dir, e) {
      host.call("stagger.run", [{ mode: g.mode, dir: dir, amount: amt.value, ease: g.ease, power: g.power, shiftOnly: g.shiftOnly || !!(e && e.shiftKey), additive: g.additive || !!(e && e.altKey) }]).then(done);
    }
    // stair steps: four layer bars, each starting a step after the one before (top first), the other way round (bottom first), or scrambled
    function stairs(xs) {
      var bars = "";
      for (var i = 0; i < xs.length; i++) bars += '<rect x="' + xs[i] + '" y="' + (3.5 + i * 5) + '" width="10" height="3" rx="1"/>';
      return '<svg viewBox="0 0 24 24" aria-hidden="true">' + bars + '</svg>';
    }
    button(acts, stairs([2, 5, 8, 11]), "Top: stagger from the top layer down. Shift: shift only. Alt: add to current timing", function (e) { go(1, e); });
    button(acts, stairs([11, 8, 5, 2]), "Bottom: stagger from the bottom layer up. Shift: shift only. Alt: add to current timing", function (e) { go(-1, e); });
    button(acts, stairs([8, 2, 11, 5]), "Random order. Shift: random jitter of plus or minus the amount. Alt: add to current timing", function (e) { go(0, e); });

    var mr = row(blk, "Mode");
    var modeSel = CWDropdown(mr, [["layers", "Layers"], ["trimin", "Trim In"], ["trimout", "Trim Out"], ["keys", "Keys"], ["sequence", "Sequence"]], g.mode);
    modeSel.setAttribute("data-tip", "What gets staggered. Sequence puts layers end to end, and the amount is the gap (negative overlaps)");

    var ar = row(blk, "Amount"); var amt = document.createElement("input"); amt.type = "text"; amt.className = "num"; amt.value = g.amount; amt.style.width = "54px"; ar.appendChild(amt);
    var au = document.createElement("span"); au.className = "unit"; au.textContent = "frames, or 0.5s"; ar.appendChild(au);
    amt.setAttribute("data-tip", "Frames per step. Add s for seconds (0.5s). Up and Down nudge, Shift x10");
    amt.addEventListener("change", function () { g.amount = amt.value; save(); });
    amt.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      var sv = String(amt.value), secs = /s\s*$/i.test(sv), v = parseFloat(sv.replace(/[sf\s]/gi, "")); if (isNaN(v)) v = 0;
      v = Math.round((v + (secs ? 0.1 : 1) * (e.shiftKey ? 10 : 1) * (e.key === "ArrowUp" ? 1 : -1)) * 1000) / 1000;
      amt.value = v + (secs ? "s" : ""); g.amount = amt.value; save(); e.preventDefault();
    });

    var er = row(blk, "Ease"), strRow = row(blk, "Strength");
    var easeSel = CWDropdown(er, [["0", "Linear"], ["1", "Ease In"], ["2", "Ease Out"], ["3", "In-Out"]], g.ease);
    var powSel = CWDropdown(strRow, [["0", "Quad"], ["1", "Cubic"], ["2", "Quart"], ["3", "Quint"], ["4", "Expo"]], g.power);
    easeSel.setAttribute("data-tip", "How the steps are spaced across the stagger"); powSel.setAttribute("data-tip", "Ease strength");
    function refresh() { var off = g.mode === "sequence" || g.ease === 0; strRow.style.opacity = off ? "0.45" : "1"; strRow.style.pointerEvents = off ? "none" : "auto"; er.style.opacity = g.mode === "sequence" ? "0.45" : "1"; er.style.pointerEvents = g.mode === "sequence" ? "none" : "auto"; }
    modeSel.addEventListener("change", function () { g.mode = modeSel.value; save(); refresh(); });
    easeSel.addEventListener("change", function () { g.ease = parseInt(easeSel.value, 10); save(); refresh(); });
    powSel.addEventListener("change", function () { g.power = parseInt(powSel.value, 10); save(); });
    refresh();

    var checks = div(blk, "checks"); checks.style.margin = "2px 0 2px 0";
    check(checks, "Shift only", g.shiftOnly, function (v) { g.shiftOnly = v; save(); }).parentNode.setAttribute("data-tip", "Move everything by the amount instead of lining the items up first");
    check(checks, "Add to current", g.additive, function (v) { g.additive = v; save(); }).parentNode.setAttribute("data-tip", "Add the stagger to the timing the items already have");

  }

  // ---- Layout: order and collapsed state, remembered between sessions
  var container = $("sections"), layoutKey = "layout." + PANEL;
  var layout = store.get(layoutKey, { order: [], collapsed: {}, mode: "v" });
  if (!layout.mode) layout.mode = "v";
  // Arrows and Follow Path are a sibling of Trim Paths: move a saved Arrows section up beside it, once
  if (!layout.arrowsByTrim) {
    var oa = layout.order.indexOf("arrows"), ot = layout.order.indexOf("trim");
    if (oa >= 0 && ot >= 0) { layout.order.splice(oa, 1); layout.order.splice(layout.order.indexOf("trim") + 1, 0, "arrows"); }
    layout.arrowsByTrim = true; store.set(layoutKey, layout);
  }
  if (!layout.typeByArrows) {      // Type sits right after Arrows, once, for layouts saved before it existed
    var ar = layout.order.indexOf("arrows");
    if (ar >= 0 && layout.order.indexOf("type") < 0) layout.order.splice(ar + 1, 0, "type");
    layout.typeByArrows = true; store.set(layoutKey, layout);
  }
  if (!layout.staggerByType) {     // Stagger sits right after Type, once
    var ty = layout.order.indexOf("type");
    if (ty >= 0 && layout.order.indexOf("stagger") < 0) layout.order.splice(ty + 1, 0, "stagger");
    layout.staggerByType = true; store.set(layoutKey, layout);
  }
  container.className = layout.mode;
  function saveLayout() {
    layout.order = [].map.call(container.children, function (s) { return s.getAttribute("data-id"); });
    store.set(layoutKey, layout);
  }
  // The main panel and Cosawerks 2 to 4 are "instances": each shows whichever sections you tick in Sections,
  // and keeps its own order, arrangement and size. The pop-outs (Anchor Point, Align, ...) show one group.
  var IS_INSTANCE = PANEL === "all" || /^i\d$/.test(PANEL);
  // Stored as the sections you HID (not the ones you showed), so a section added later appears by default. A list saved the
  // old way is converted once, strictly: whatever it left out stays hidden.
  var hiddenIds = [];
  if (IS_INSTANCE) {
    hiddenIds = store.get("hide." + PANEL, null);
    if (hiddenIds === null) {
      var legacy = store.get("show." + PANEL, null);
      hiddenIds = legacy ? SECTIONS.filter(function (x) { return legacy.indexOf(x.id) < 0; }).map(function (x) { return x.id; }) : [];
      store.set("hide." + PANEL, hiddenIds);
    }
  }
  // Instances build every section and just hide the unticked ones, so ticking in Settings applies live.
  var visible = SECTIONS.filter(function (s) { return IS_INSTANCE || s.group === PANEL; });
  visible.sort(function (a, b) {
    var ia = layout.order.indexOf(a.id), ib = layout.order.indexOf(b.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  var dragged = null;
  function clearDrop() { [].forEach.call(container.children, function (c) { c.classList.remove("drop-before", "drop-after"); }); }

  visible.forEach(function (def) {
    var sec = document.createElement("section");
    sec.setAttribute("data-id", def.id);
    sec.style.setProperty("--sw", def.basis + "px");
    if (def.fixed) sec.classList.add("fixed");
    if (IS_INSTANCE && hiddenIds.indexOf(def.id) >= 0) sec.classList.add("off");
    var head = div(sec, "sh");
    head.draggable = true;
    var chev = document.createElement("span"); chev.className = "chev"; chev.innerHTML = '<svg viewBox="0 0 10 10"><path d="M2 3.5h6L5 7z"/></svg>';
    head.appendChild(chev);
    var h = document.createElement("h2"); h.textContent = def.title; head.appendChild(h);
    var spacer = div(head, "spacer");
    if (IS_INSTANCE) {
      var pop = button(head, icon("pop"), "Open " + GROUP_NAME[def.group] + " in its own panel", function (e) {
        e.stopPropagation(); host.openPanel(EXT[def.group]);
      }, "pop");
    }
    var body = div(sec, "body");
    def.build(body);
    if (layout.collapsed[def.id]) sec.classList.add("collapsed");

    head.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".pop")) return;
      sec.classList.toggle("collapsed");
      layout.collapsed[def.id] = sec.classList.contains("collapsed");
      saveLayout();
    });
    head.addEventListener("dragstart", function (e) { dragged = sec; e.dataTransfer.setData("text/plain", def.id); e.dataTransfer.effectAllowed = "move"; sec.classList.add("dragging"); });
    head.addEventListener("dragend", function () { sec.classList.remove("dragging"); dragged = null; clearDrop(); });
    sec.addEventListener("dragover", function (e) {
      if (!dragged || dragged === sec) return;
      e.preventDefault();
      var r = sec.getBoundingClientRect(), before = layout.mode === "v" ? e.clientY < r.top + r.height / 2 : e.clientX < r.left + r.width / 2;
      clearDrop(); sec.classList.add(before ? "drop-before" : "drop-after");
    });
    sec.addEventListener("drop", function (e) {
      if (!dragged || dragged === sec) return;
      e.preventDefault();
      var r = sec.getBoundingClientRect(), before = layout.mode === "v" ? e.clientY < r.top + r.height / 2 : e.clientX < r.left + r.width / 2;
      container.insertBefore(dragged, before ? sec : sec.nextSibling);
      clearDrop(); saveLayout(); if (window.markFirst) window.markFirst();
    });
    container.appendChild(sec);
  });

  // exposed so layout can be driven (and tested) without a mouse drag
  window.cwLayout = {
    move: function (id, beforeId) {
      var el = container.querySelector('[data-id="' + id + '"]'), ref = beforeId ? container.querySelector('[data-id="' + beforeId + '"]') : null;
      if (el) { container.insertBefore(el, ref); saveLayout(); }
    },
    order: function () { return [].map.call(container.children, function (s) { return s.getAttribute("data-id"); }); }
  };

  // Arrange: stack sections vertically, side by side, or let them wrap to fit the width
  var arrange = {};
  [["v", "stackV", "Stack sections vertically"], ["h", "stackH", "Place sections side by side (scrolls sideways)"], ["w", "stackW", "Wrap sections to fit the panel width"]].forEach(function (d) {
    arrange[d[0]] = button($("arrange"), icon(d[1]), d[2], function () {
      layout.mode = d[0]; container.className = d[0]; saveLayout();
      for (var k in arrange) arrange[k].classList.toggle("on", k === layout.mode);
    }, "small");
    arrange[d[0]].classList.toggle("on", d[0] === layout.mode);
  });

  $("reset").addEventListener("click", function () {
    layout = { order: [], collapsed: {}, mode: "v" }; store.set(layoutKey, layout); if (IS_INSTANCE) { store.set("hide." + PANEL, []); store.set("show." + PANEL, null); }
    store.flush().then(function () { location.reload(); });
  });

  // ---- Settings gear: Arrange, Remember size, Sections and Reset Layout live in one popover
  var gear = $("gear"), settings = $("settings");
  gear.addEventListener("click", function (e) { e.stopPropagation(); settings.style.display = settings.style.display === "none" ? "block" : "none"; gear.classList.toggle("on", settings.style.display === "block"); });
  document.addEventListener("mousedown", function (e) {
    if (settings.style.display === "none") return;
    if (settings.contains(e.target) || gear.contains(e.target)) return;
    settings.style.display = "none"; gear.classList.remove("on");
  });

  // Buttons group (only while this panel shows the Buttons section): Edit, Add, Restore Defaults
  function updateStripRow() {
    var el = container.querySelector('[data-id="strip"]');
    $("strip-row").style.display = (el && !el.classList.contains("off")) ? "block" : "none";
  }
  $("strip-edit").addEventListener("click", function () { if (window.cwStrip) window.cwStrip.toggleEdit(); });
  $("strip-add").addEventListener("click", function () { if (window.cwStrip) { window.cwStrip.add(); settings.style.display = "none"; gear.classList.remove("on"); } });
  var restoreBtn = $("strip-restore"), restoreTimer;
  restoreBtn.addEventListener("click", function () {
    if (restoreBtn.getAttribute("data-armed")) { clearTimeout(restoreTimer); restoreBtn.removeAttribute("data-armed"); restoreBtn.textContent = "Restore Defaults"; if (window.cwStrip) window.cwStrip.restore(); }
    else { restoreBtn.setAttribute("data-armed", "1"); restoreBtn.textContent = "Click again to replace all"; restoreTimer = setTimeout(function () { restoreBtn.removeAttribute("data-armed"); restoreBtn.textContent = "Restore Defaults"; }, 3000); }
  });

  // Hide headers: titles, collapse arrows and pop-out icons go away; every section shows its content.
  var hideKey = "hideHeaders." + PANEL, hideBox = $("hide-headers");
  container.classList.toggle("nohead", !!store.get(hideKey, false));
  hideBox.checked = !!store.get(hideKey, false);
  hideBox.addEventListener("change", function () { store.set(hideKey, hideBox.checked); container.classList.toggle("nohead", hideBox.checked); });

  // The gear floats over the top-right corner; the first visible header leaves it room.
  function markFirst() {
    [].forEach.call(container.children, function (c) { c.classList.remove("first"); });
    for (var i = 0; i < container.children.length; i++) { if (!container.children[i].classList.contains("off")) { container.children[i].classList.add("first"); break; } }
  }
  markFirst(); updateStripRow(); window.markFirst = markFirst;

  // Sections: tick which sections this panel shows (instances only)
  var secBox = $("sections-box");
  if (!IS_INSTANCE) $("sections-row").style.display = "none";
  else {
    SECTIONS.forEach(function (def) {
      var l = document.createElement("label"); l.className = "chk";
      var i = document.createElement("input"); i.type = "checkbox"; i.checked = hiddenIds.indexOf(def.id) < 0; i.setAttribute("data-id", def.id);
      var b = document.createElement("span"); b.className = "box"; var t = document.createElement("span"); t.textContent = def.title;
      l.appendChild(i); l.appendChild(b); l.appendChild(t); secBox.appendChild(l);
      i.addEventListener("change", function () {
        var hidden = SECTIONS.map(function (x) { return x.id; }).filter(function (id) { var el = secBox.querySelector('input[data-id="' + id + '"]'); return el ? !el.checked : false; });
        if (hidden.length >= SECTIONS.length) { i.checked = true; say("Keep at least one section.", true); return; }
        hiddenIds = hidden; store.set("hide." + PANEL, hidden);
        var secEl = container.querySelector('[data-id="' + def.id + '"]');
        if (secEl) secEl.classList.toggle("off", !i.checked);
        markFirst(); updateStripRow();
      });
    });
  }

  var verEl = $("cw-version"); if (verEl) verEl.textContent = "Cosawerks " + (window.CW_VERSION || "");

  // ---- Sharing presets: your saved arrow presets, Type looks and eases as one .cwpresets file
  (function () {
    var KEYS = [["arrowUser", "arrows", "arrow preset"], ["typeUser", "types", "Type look"], ["easeMine", "eases", "ease"]];
    function count(o) { var n = 0; KEYS.forEach(function (k) { n += (o[k[1]] || []).length; }); return n; }
    function validName(x) { return x && typeof x.name === "string" && x.name.length > 0; }
    $("share-export").addEventListener("click", function () {
      var data = { format: "cosawerks-presets", version: 1 };
      KEYS.forEach(function (k) { data[k[1]] = store.get(k[0], []); });
      if (!count(data)) { say("Nothing to export yet. Save an arrow preset, a Type look or an ease first.", true); return; }
      host.value("CW.share.save(" + JSON.stringify(JSON.stringify(data, null, 1)) + ")").then(function (r) {
        r = String(r);
        if (r === "" || r === "undefined") return;                        // cancelled
        if (/^Error/.test(r) || r === "EvalScript error.") { say("Could not save the file. " + r, true); return; }
        say("\u2713 Exported " + count(data) + " preset" + (count(data) === 1 ? "" : "s") + " to " + r.split(/[\\/]/).pop(), false);
      });
      $("settings").style.display = "none"; $("gear").classList.remove("on");
    });
    $("share-import").addEventListener("click", function () {
      $("settings").style.display = "none"; $("gear").classList.remove("on");
      host.value("CW.share.open()").then(function (r) {
        r = String(r);
        if (r === "" || r === "undefined") return;                        // cancelled
        var data;
        try { data = JSON.parse(r); } catch (e) { say("That file is not a Cosawerks presets file.", true); return; }
        if (!data || data.format !== "cosawerks-presets") { say("That file is not a Cosawerks presets file.", true); return; }
        var added = 0, replaced = 0;
        KEYS.forEach(function (k) {
          var incoming = (data[k[1]] || []).filter(validName), mine = store.get(k[0], []);
          if (k[0] === "easeMine") incoming = incoming.filter(function (x) { return x.v && x.v.length === 4 && x.v.every(function (n) { return typeof n === "number"; }); });
          if (k[0] === "typeUser") incoming = incoming.filter(function (x) { return x.props && x.props.length; });
          if (k[0] === "arrowUser") incoming = incoming.filter(function (x) { return x.v && typeof x.v === "object"; });
          incoming.forEach(function (x) {
            var at = -1; for (var i = 0; i < mine.length; i++) if (mine[i].name === x.name) at = i;
            if (at >= 0) { mine[at] = x; replaced++; } else { mine.push(x); added++; }
          });
          store.set(k[0], mine);
        });
        if (!added && !replaced) { say("That file has no presets in it.", true); return; }
        say("\u2713 Imported " + added + " new" + (replaced ? ", replaced " + replaced : "") + ". Reopen any other Cosawerks panels to see them.", false);
        setTimeout(function () { location.reload(); }, 1200);
      });
    });
  })();

  // ---- Tooltips: native title tooltips do not reliably appear in CEP panels
  var tipEl = $("tip"), tipTimer = null;
  function hideTip() { clearTimeout(tipTimer); tipEl.style.display = "none"; }
  document.addEventListener("mouseover", function (e) {
    var t = e.target.closest ? e.target.closest("[data-tip]") : null;
    hideTip();
    if (!t) return;
    tipTimer = setTimeout(function () {
      tipEl.textContent = t.getAttribute("data-tip");
      tipEl.style.display = "block";
      var r = t.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
      var x = Math.max(4, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 4));
      var y = r.bottom + 6; if (y + h > window.innerHeight - 2) y = r.top - h - 6;
      tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
    }, 350);
  });
  document.addEventListener("mouseout", function (e) { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest("[data-tip]")) hideTip(); });
  document.addEventListener("mousedown", hideTip);

  // ---- Follow AE's panel colour and its UI font, so the panel reads as native
  function applySkin() {
    var s = host.skin();
    if (!s) return;
    var root = document.documentElement.style;
    if (s.panelBackgroundColor) {
      var c = s.panelBackgroundColor.color;
      root.setProperty("--bg", "rgb(" + Math.round(c.red) + "," + Math.round(c.green) + "," + Math.round(c.blue) + ")");
    }
    if (s.baseFontFamily) root.setProperty("--font", '"' + s.baseFontFamily + '", "Adobe Clean", -apple-system, "Helvetica Neue", sans-serif');
    if (s.baseFontSize) root.setProperty("--size", s.baseFontSize + "px");
  }
  applySkin();
  host.onThemeChange(applySkin);

  // ---- Remember the panel's size. Floating panels and pop-outs reopen at the size you left them; a
  // docked panel's width is kept by AE's workspace (Window > Workspace > Save Changes to this Workspace).
  var sizeKey = "size." + PANEL, wanted = store.get(sizeKey, null), remember = store.get("rememberSize", true), startedAt = Date.now();
  var clampSize = function (n) { return Math.max(100, Math.min(3000, Math.round(n))); };
  if (remember && wanted && wanted.w >= 100 && wanted.h >= 100 && (Math.abs(wanted.w - window.innerWidth) > 8 || Math.abs(wanted.h - window.innerHeight) > 8)) host.resize(clampSize(wanted.w), clampSize(wanted.h));
  var sizeTimer;
  window.addEventListener("resize", function () {
    if (!store.get("rememberSize", true) || Date.now() - startedAt < 1500) return;      // ignore the startup layout settling
    clearTimeout(sizeTimer);
    sizeTimer = setTimeout(function () { if (window.innerWidth >= 100 && window.innerHeight >= 100) store.set(sizeKey, { w: window.innerWidth, h: window.innerHeight }); }, 600);
  });
  var rs = document.getElementById("remember");
  if (rs) { rs.checked = !!remember; rs.addEventListener("change", function () { store.set("rememberSize", rs.checked); if (rs.checked) store.set(sizeKey, { w: window.innerWidth, h: window.innerHeight }); }); }

  if (initError) say(initError, true);
  }   // end main

  host.init().then(function (err) { return store.load().then(function () { main(err); }); });
})();
