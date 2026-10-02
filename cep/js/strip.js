// The button strip: tiles you click, and an editor to build them from your selection.
// Buttons are stored by the ExtendScript host in one shared file, so every panel sees the same ones.
(function () {
  // Starter buttons: standard After Effects menu commands, so they work on any machine. (Your own buttons live in your prefs, not here.)
  var cmd = function (name, target, label, icon) { var b = { name: name, type: "command", target: target }; if (icon) b.icon = icon; else b.label = label; return b; };
  var SEED = [
    cmd("Pre-compose", "Pre-compose...", "PC"),
    cmd("Reveal in Project", "Reveal Layer Source in Project", "RP"),
    cmd("Reload Footage", "Reload Footage", "", "reload"),
    cmd("Trim Comp to Work Area", "Trim Comp to Work Area", "TW"),
    cmd("Create Shapes from Text", "Create Shapes from Text", "CS"),
    cmd("Sequence Layers", "Sequence Layers...", "SQ"),
    cmd("Increment and Save", "Increment and Save", "IS"),
    cmd("Expression to Keyframes", "Convert Expression to Keyframes", "EK")
  ];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---- Icons: a built-in glyph, a Lucide shape (stored with the button), or a custom image
  function dataUrl(c) {
    return c.kind === "svg" ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(c.data) : "data:image/png;base64," + c.data;
  }
  // Returns an element showing the button's icon at 22px, drawn in the current text colour when it can be.
  function iconNode(b) {
    var wrap = document.createElement("span"); wrap.className = "ico";
    if (b.custom) {
      if (b.custom.mono) { var m = document.createElement("span"); m.className = "cicon"; m.style.webkitMaskImage = 'url("' + dataUrl(b.custom) + '")'; wrap.appendChild(m); }
      else { var im = document.createElement("img"); im.className = "cimg"; im.src = dataUrl(b.custom); wrap.appendChild(im); }
    } else if (b.svgInner) wrap.innerHTML = '<svg viewBox="0 0 24 24" class="gl" aria-hidden="true">' + b.svgInner + "</svg>";
    else wrap.innerHTML = glyph(b.icon);
    return wrap;
  }

  // ---- Colour: hue slider + saturation/brightness square + a row of presets. No hex typing.
  function hsvToHex(h, s, v) {
    var f = function (n) { var k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    var x = function (n) { var t = Math.round(f(n) * 255).toString(16); return t.length < 2 ? "0" + t : t; };
    return "#" + x(5) + x(3) + x(1);
  }
  function hexToHsv(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || ""); if (!m) return [210, 0.6, 0.95];
    var h6 = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1];
    var r = parseInt(h6.substr(0, 2), 16) / 255, g = parseInt(h6.substr(2, 2), 16) / 255, b = parseInt(h6.substr(4, 2), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, h = 0;
    if (d) h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, max ? d / max : 0, max];
  }
  var PRESETS = ["#e8e8e8", "#8e8e8e", "#4b9cf5", "#3dd5c8", "#5cc46a", "#e6c619", "#f5a623", "#f0603a", "#e0507a", "#a56cf0"];

  function colorPicker(parent, initial, onChange) {
    var hsv = hexToHsv(initial), W = 168, H = 96;
    var box = document.createElement("div"); box.className = "cpop";
    var sv = document.createElement("canvas"); sv.width = W; sv.height = H; sv.className = "cpsv";
    var hue = document.createElement("canvas"); hue.width = W; hue.height = 12; hue.className = "cphue";
    var sw = document.createElement("div"); sw.className = "cpsw";
    box.appendChild(sv); box.appendChild(hue); box.appendChild(sw);

    function drawSV() {
      var c = sv.getContext("2d"), g;
      c.fillStyle = hsvToHex(hsv[0], 1, 1); c.fillRect(0, 0, W, H);
      g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
      g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "#000"); c.fillStyle = g; c.fillRect(0, 0, W, H);
      var x = hsv[1] * W, y = (1 - hsv[2]) * H;
      c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 5, 0, 6.2832); c.stroke();
      c.strokeStyle = "#000"; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 6.5, 0, 6.2832); c.stroke();
    }
    function drawHue() {
      var c = hue.getContext("2d"), g = c.createLinearGradient(0, 0, W, 0), i;
      for (i = 0; i <= 6; i++) g.addColorStop(i / 6, hsvToHex(i * 60, 1, 1));
      c.fillStyle = g; c.fillRect(0, 0, W, 12);
      var x = hsv[0] / 360 * W; c.fillStyle = "#fff"; c.fillRect(x - 2, 0, 4, 12); c.strokeStyle = "#000"; c.strokeRect(x - 2.5, 0.5, 5, 11);
    }
    function changed() { drawSV(); drawHue(); onChange(hsvToHex(hsv[0], hsv[1], hsv[2])); }
    function drag(canvas, fn) {
      function at(e) { var r = canvas.getBoundingClientRect(); fn(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))); changed(); }
      canvas.addEventListener("mousedown", function (e) { at(e); var mv = function (ev) { at(ev); }, up = function () { document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); }; document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up); });
    }
    drag(sv, function (x, y) { hsv[1] = x; hsv[2] = 1 - y; });
    drag(hue, function (x) { hsv[0] = x * 360; });
    PRESETS.forEach(function (c) {
      var b = document.createElement("button"); b.className = "swatch"; b.style.background = c; b.setAttribute("data-tip", "Use this colour");
      b.addEventListener("click", function () { hsv = hexToHsv(c); changed(); }); sw.appendChild(b);
    });
    var none = document.createElement("button"); none.className = "swatch none"; none.setAttribute("data-tip", "Back to the panel's normal icon colour");
    none.addEventListener("click", function () { drawSV(); drawHue(); onChange(""); }); sw.appendChild(none);
    drawSV(); drawHue(); parent.appendChild(box);
    return box;
  }

  window.cwColorPicker = colorPicker;          // reused by the Type section (Slab recolour)

  var lucidePromise = null;
  function loadLucide() {
    if (window.LUCIDE) return Promise.resolve();
    if (!lucidePromise) lucidePromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script"); s.src = "js/lucide-icons.js"; s.onload = resolve; s.onerror = function () { reject(new Error("The icon library could not be loaded.")); }; document.head.appendChild(s);
    });
    return lucidePromise;
  }
  function looksColoured(svg) {
    var m = svg.match(/(?:fill|stroke)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,8}|rgb[a]?\([^)]*\)|[a-z]+)/gi) || [], i;
    for (i = 0; i < m.length; i++) {
      var v = m[i].replace(/^(?:fill|stroke)\s*[:=]\s*["']?\s*/i, "").toLowerCase();
      if (v === "none" || v === "currentcolor" || v === "black" || v === "white" || v === "#000" || v === "#000000" || v === "#fff" || v === "#ffffff") continue;
      return true;
    }
    return false;
  }

  window.buildStrip = function (body, H) {
    var list = [], editing = false, loaded = false;
    var grid = H.div(body, "strip"), editorHost = H.div(body, "editor");

    // ---- storage (a text file written by the host, shared by all panels)
    function save() {
      return host.value("CW.strip.writeStore(" + JSON.stringify(JSON.stringify(list, null, 1)) + ")");
    }
    function load() {
      if (!host.inAE) { list = clone(SEED); loaded = true; render(); return; }    // preview in a browser: no host, show the defaults
      host.value("CW.strip.readStore()").then(function (txt) {
        txt = String(txt);
        if (txt === "" || txt === "undefined") { list = clone(SEED); save(); }
        else {
          try { list = JSON.parse(txt); if (!(list instanceof Array)) throw 0; }
          catch (e) { list = clone(SEED); H.say("The saved buttons file could not be read, so the defaults are shown. It was not overwritten.", true); }
        }
        loaded = true; render();
      });
    }

    // ---- tiles
    function tip(b) {
      var t = b.name, m = [];
      if (b.ctrl) m.push("Ctrl: " + (b.ctrl.name || "alternate"));
      if (b.alt) m.push("Alt: " + (b.alt.name || "alternate"));
      if (b.shift) m.push("Shift: " + (b.shift.name || "alternate"));
      return m.length ? t + "  (" + m.join(", ") + ")" : t;
    }
    var dragIndex = -1;
    function render() {
      grid.innerHTML = "";
      grid.classList.toggle("editing", editing);
      list.forEach(function (b, i) {
        var t = document.createElement("div");
        t.className = "stile";
        t.setAttribute("data-tip", editing ? "Edit " + b.name : tip(b));
        if (b.label) { var s = document.createElement("span"); s.className = "lbl"; s.textContent = b.label; t.appendChild(s); }
        else t.appendChild(iconNode(b));
        if (b.color) t.style.color = b.color;
        t.addEventListener("click", function (e) {
          if (editing) { openEditor(i); return; }
          var spec = b;
          if ((e.ctrlKey || e.metaKey) && b.ctrl) spec = b.ctrl;
          else if (e.altKey && b.alt) spec = b.alt;
          else if (e.shiftKey && b.shift) spec = b.shift;
          host.call("strip.run", [{ type: spec.type, target: spec.target }]).then(H.done);
        });
        t.draggable = editing;
        t.addEventListener("dragstart", function (e) { dragIndex = i; e.dataTransfer.setData("text/plain", String(i)); t.classList.add("dragging"); });
        t.addEventListener("dragend", function () { t.classList.remove("dragging"); dragIndex = -1; });
        t.addEventListener("dragover", function (e) { if (editing && dragIndex >= 0) e.preventDefault(); });
        t.addEventListener("drop", function (e) {
          if (!editing || dragIndex < 0 || dragIndex === i) return;
          e.preventDefault();
          var moved = list.splice(dragIndex, 1)[0]; list.splice(i, 0, moved); save(); render();
        });
        grid.appendChild(t);
      });
      if (loaded && list.length === 0) { var h = H.div(grid, "hint"); h.textContent = "No buttons yet. Use the gear menu: Add."; }
    }

    // ---- Edit / Add / Restore Defaults live in the panel's gear menu; this is what that menu calls
    function syncEditButton() {
      var eb = document.getElementById("strip-edit");
      if (eb) { eb.classList.toggle("on", editing); eb.textContent = editing ? "Done" : "Edit"; }
    }
    window.cwStrip = {
      toggleEdit: function () { editing = !editing; syncEditButton(); closeEditor(); render(); },
      add: function () { editing = true; syncEditButton(); render(); openEditor(-1); },
      restore: function () { list = clone(SEED); save(); closeEditor(); render(); }
    };

    // ---- editor
    function closeEditor() { editorHost.innerHTML = ""; }
    function openEditor(index) {
      closeEditor();
      var isNew = index < 0, b = isNew ? { name: "", icon: "bolt", type: "script", target: "" } : clone(list[index]);
      var box = H.div(editorHost, "ebox");
      function row(label, el) { var r = H.div(box, "form"), l = document.createElement("label"); l.textContent = label; r.appendChild(l); if (el) r.appendChild(el); return r; }
      function input(value, w, ph) { var i = document.createElement("input"); i.type = "text"; i.className = "num txt"; i.value = value || ""; i.style.width = w + "px"; if (ph) i.placeholder = ph; return i; }

      var name = input(b.name, 140, "Button name"); row("Name", name);

      var typeRow = H.div(box, "form"); var tl = document.createElement("label"); tl.textContent = "Does"; typeRow.appendChild(tl);
      var seg = H.div(typeRow, "seg"), segBtns = {};
      var targetBox = H.div(box, "etarget");
      [["script", "Script"], ["preset", "Preset"], ["effect", "Effect"], ["expression", "Expr"], ["command", "Menu"]].forEach(function (o) {
        var s = document.createElement("button"); s.className = "segbtn" + (b.type === o[0] ? " on" : ""); s.textContent = o[1];
        s.addEventListener("click", function () { b.type = o[0]; for (var k in segBtns) segBtns[k].classList.toggle("on", k === b.type); drawTarget(); });
        seg.appendChild(s); segBtns[o[0]] = s;
      });

      function chooser(kind, setTo) {
        host.value("CW.strip.chooseFile(" + JSON.stringify(kind) + ")").then(function (p) { p = String(p); if (p && p !== "EvalScript error.") setTo(p); });
      }
      function tilde(p) { return p; }
      function drawTarget() {
        targetBox.innerHTML = "";
        function trow(label) { var r = H.div(targetBox, "form"), l = document.createElement("label"); l.textContent = label; r.appendChild(l); return r; }
        if (b.type === "script" || b.type === "preset") {
          var r = trow(b.type === "script" ? "File" : "Preset"), path = input(b.target, 120, b.type === "script" ? ".jsx / .jsxbin" : ".ffx"); r.appendChild(path);
          path.addEventListener("input", function () { b.target = path.value; });
          var ch = document.createElement("button"); ch.className = "btn"; ch.textContent = "Choose"; r.appendChild(ch);
          ch.addEventListener("click", function () { chooser(b.type, function (p) { b.target = p; path.value = p; if (!name.value) name.value = p.split("/").pop().replace(/\.[^.]+$/, ""); }); });
        } else if (b.type === "effect") {
          var r2 = trow("Effect"), mn = input(b.target, 120, "Effect match name"); r2.appendChild(mn);
          mn.addEventListener("input", function () { b.target = mn.value; });
          var us = document.createElement("button"); us.className = "btn"; us.textContent = "Use Selected"; us.setAttribute("data-tip", "Select an effect in the timeline first");
          us.addEventListener("click", function () { host.value("CW.strip.selectedEffect()").then(function (r) { r = String(r); if (!r || r.indexOf("\t") < 0) { H.say("Select an effect in the Effect Controls or timeline first.", true); return; } var p = r.split("\t"); b.target = p[0]; mn.value = p[0]; if (!name.value) name.value = p[1]; }); });
          r2.appendChild(us);
        } else if (b.type === "expression") {
          var r3 = trow("Expr"), ta = document.createElement("textarea"); ta.className = "num txt"; ta.rows = 3; ta.style.width = "150px"; ta.style.height = "54px"; ta.style.padding = "4px 6px"; ta.value = b.target || "";
          ta.addEventListener("input", function () { b.target = ta.value; }); r3.appendChild(ta);
          var r3b = trow(""), us2 = document.createElement("button"); us2.className = "btn"; us2.textContent = "Use Selected"; us2.setAttribute("data-tip", "Copy the expression from the selected property");
          us2.addEventListener("click", function () { host.value("CW.strip.selectedExpression()").then(function (r) { r = String(r); if (!r || r === "EvalScript error.") { H.say("Select a property that has an expression.", true); return; } b.target = r; ta.value = r; }); });
          r3b.appendChild(us2);
        } else {
          var r4 = trow("Menu"), cm = input(b.target, 150, "Exact menu text, e.g. Flip Horizontal"); r4.appendChild(cm);
          cm.addEventListener("input", function () { b.target = cm.value; });
        }
      }
      drawTarget();

      // modifier actions: a file each (type follows the extension)
      var modsLabel = H.div(box, "sub"); modsLabel.textContent = "With a key held:";
      [["ctrl", "Ctrl"], ["alt", "Alt"], ["shift", "Shift"]].forEach(function (m) {
        var r = H.div(box, "form"), l = document.createElement("label"); l.textContent = m[1]; r.appendChild(l);
        var p = input(b[m[0]] ? b[m[0]].target : "", 120, "Optional file"); r.appendChild(p);
        function apply() { var v = p.value.trim(); if (!v) { delete b[m[0]]; return; } b[m[0]] = { name: (b[m[0]] && b[m[0]].name) || v.split("/").pop().replace(/\.[^.]+$/, ""), type: /\.ffx$/i.test(v) ? "preset" : "script", target: v }; }
        p.addEventListener("input", apply);
        var c = document.createElement("button"); c.className = "btn"; c.textContent = "Choose"; r.appendChild(c);
        c.addEventListener("click", function () { chooser(/\.ffx$/i.test(p.value) ? "preset" : "script", function (path) { p.value = path; apply(); }); });
      });

      // ---- icon: pick from the built-in set, the Lucide library, or your own images; or type up to three letters
      var iconRow = H.div(box, "form"); var il = document.createElement("label"); il.textContent = "Icon"; iconRow.appendChild(il);
      var preview = document.createElement("span"); preview.className = "ipreview"; iconRow.appendChild(preview);
      function showPreview() {
        preview.innerHTML = ""; preview.style.color = b.color || "";
        if (b.label) { var t = document.createElement("span"); t.className = "lbl"; t.textContent = b.label; preview.appendChild(t); } else preview.appendChild(iconNode(b));
      }
      var chooseIcon = H.btn(iconRow, "Choose Icon", "Pick an icon from the built-in set, the Lucide library, or your own images", "", function () { picker.style.display = picker.style.display === "none" ? "block" : "none"; if (picker.style.display === "block") showTab(tab); });
      var picker = H.div(box, "ipicker"); picker.style.display = "none";
      var tabs = H.div(picker, "seg itabs"), tabBtns = {}, tab = "built";
      var search = document.createElement("input"); search.type = "text"; search.className = "num txt isearch"; search.placeholder = "Search icons";
      var grid2 = H.div(picker, "igrid"), foot = H.div(picker, "ifoot");
      picker.insertBefore(search, grid2);
      var shown = 0, results = [], mineList = null;

      function choose(patch) {
        delete b.svgInner; delete b.custom; b.label = ""; label.value = "";
        for (var k in patch) b[k] = patch[k];
        showPreview(); showTab(tab);
      }
      function gbtn(node, tipText, on, onClick, extra) {
        var g = document.createElement("button"); g.className = "gbtn" + (on ? " on" : ""); g.setAttribute("data-tip", tipText); g.appendChild(node); g.addEventListener("click", onClick);
        if (extra) g.appendChild(extra); grid2.appendChild(g); return g;
      }
      function svgNode(inner) { var w = document.createElement("span"); w.className = "ico"; w.innerHTML = '<svg viewBox="0 0 24 24" class="gl" aria-hidden="true">' + inner + "</svg>"; return w; }
      function more() {
        results.slice(shown, shown + 96).forEach(function (r) {
          gbtn(svgNode(window.LUCIDE[r][0]), r.replace(/-/g, " "), b.icon === "lucide:" + r, function () { choose({ icon: "lucide:" + r, svgInner: window.LUCIDE[r][0] }); });
        });
        shown = Math.min(results.length, shown + 96);
        foot.innerHTML = "";
        var info = document.createElement("span"); info.textContent = results.length + " icon" + (results.length === 1 ? "" : "s") + (shown < results.length ? ", showing " + shown : ""); foot.appendChild(info);
        if (shown < results.length) H.btn(foot, "Show More", "", "", more);
      }
      function lucideSearch() {
        var q = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean), names = Object.keys(window.LUCIDE);
        results = names.filter(function (n) { return q.every(function (w) { return n.indexOf(w) >= 0 || window.LUCIDE[n][1].indexOf(w) >= 0; }); });
        if (q.length) results.sort(function (a, c) { var sa = a.indexOf(q[0]) === 0 ? 0 : a.indexOf(q[0]) > 0 ? 1 : 2, sc = c.indexOf(q[0]) === 0 ? 0 : c.indexOf(q[0]) > 0 ? 1 : 2; return sa - sc || a.length - c.length; });
        grid2.innerHTML = ""; shown = 0; more();
      }
      function saveIcons() { return host.value("CW.strip.writeIcons(" + JSON.stringify(JSON.stringify(mineList)) + ")"); }
      function drawMine() {
        grid2.innerHTML = ""; foot.innerHTML = "";
        mineList.forEach(function (c, i) {
          var del = document.createElement("span"); del.className = "idel"; del.textContent = "×"; del.setAttribute("data-tip", "Remove from My Icons");
          del.addEventListener("click", function (e) { e.stopPropagation(); mineList.splice(i, 1); saveIcons(); drawMine(); });
          gbtn(iconNode({ custom: c }), c.name, b.custom && b.custom.id === c.id, function () { choose({ icon: "custom:" + c.id, custom: clone(c) }); }, del);
        });
        H.btn(foot, "Add Your Own", "Choose an .svg or .png file (up to 400 KB)", "", importIcon);
        var mono = document.createElement("label"); mono.className = "chk"; var mi = document.createElement("input"); mi.type = "checkbox"; mi.checked = !b.custom || b.custom.mono !== false;
        var mb = document.createElement("span"); mb.className = "box"; var mt = document.createElement("span"); mt.textContent = "Match panel colour";
        mono.appendChild(mi); mono.appendChild(mb); mono.appendChild(mt); mono.setAttribute("data-tip", "Draw the selected image in the panel's icon colour instead of its own colours");
        mi.addEventListener("change", function () { if (b.custom) { b.custom.mono = mi.checked; for (var i2 = 0; i2 < mineList.length; i2++) if (mineList[i2].id === b.custom.id) mineList[i2].mono = mi.checked; saveIcons(); showPreview(); drawMine(); } });
        foot.appendChild(mono);
        if (!mineList.length) { var h = document.createElement("div"); h.className = "hint"; h.textContent = "Nothing here yet. Add an .svg or .png and it appears here to reuse."; grid2.appendChild(h); }
      }
      function importIcon() {
        host.value("CW.strip.chooseIconFile()").then(function (p) {
          p = String(p); if (!p || p === "EvalScript error.") return;
          return host.value("CW.strip.readIcon(" + JSON.stringify(p) + ")").then(function (r) {
            r = String(r); var i = r.indexOf("\t"), kind = r.slice(0, i), data = r.slice(i + 1);
            if (kind === "error") { H.say(data, true); return; }
            if (kind === "svg" && (/<script/i.test(data) || /javascript:/i.test(data) || !/<svg[\s>]/i.test(data))) { H.say("That does not look like a plain SVG icon.", true); return; }
            var c = { id: "c" + Date.now().toString(36), name: p.split("/").pop().replace(/\.[^.]+$/, ""), kind: kind, data: data, mono: kind === "svg" ? !looksColoured(data) : false };
            mineList.push(c); saveIcons(); choose({ icon: "custom:" + c.id, custom: clone(c) }); showTab("mine");
          });
        });
      }
      function showTab(t) {
        tab = t; for (var k in tabBtns) tabBtns[k].classList.toggle("on", k === t);
        search.style.display = t === "lucide" ? "block" : "none"; foot.innerHTML = "";
        if (t === "built") {
          grid2.innerHTML = "";
          GLYPH_NAMES.forEach(function (g) { var w = document.createElement("span"); w.className = "ico"; w.innerHTML = glyph(g); gbtn(w, g, b.icon === g && !b.svgInner && !b.custom && !b.label, function () { choose({ icon: g }); }); });
        } else if (t === "lucide") {
          grid2.innerHTML = '<div class="hint">Loading icons...</div>';
          loadLucide().then(function () { lucideSearch(); }, function (e) { grid2.innerHTML = ""; H.say(e.message, true); });
        } else {
          if (mineList) drawMine();
          else { grid2.innerHTML = '<div class="hint">Loading...</div>';
            host.value("CW.strip.readIcons()").then(function (txt) { try { mineList = txt && txt !== "undefined" ? JSON.parse(txt) : []; if (!(mineList instanceof Array)) mineList = []; } catch (e) { mineList = []; } drawMine(); }); }
        }
      }
      [["built", "Built-in"], ["lucide", "Lucide"], ["mine", "My Icons"]].forEach(function (o) {
        var tb = document.createElement("button"); tb.className = "segbtn" + (o[0] === tab ? " on" : ""); tb.textContent = o[1];
        tb.addEventListener("click", function () { showTab(o[0]); }); tabs.appendChild(tb); tabBtns[o[0]] = tb;
      });
      var tick; search.addEventListener("input", function () { clearTimeout(tick); tick = setTimeout(function () { if (tab === "lucide" && window.LUCIDE) lucideSearch(); }, 120); });

      var textRow = H.div(box, "form"); var xl = document.createElement("label"); xl.textContent = "Or text"; textRow.appendChild(xl);
      var label = input(b.label || "", 40, "AB"); label.maxLength = 3; label.setAttribute("data-tip", "Up to three letters instead of an icon");
      label.addEventListener("input", function () { b.label = label.value; showPreview(); }); textRow.appendChild(label);

      var colRow = H.div(box, "form"); var cl = document.createElement("label"); cl.textContent = "Colour"; colRow.appendChild(cl);
      var swatch = document.createElement("button"); swatch.className = "colbtn"; swatch.setAttribute("data-tip", "Pick a colour for this icon"); colRow.appendChild(swatch);
      function paintSwatch() { swatch.style.background = b.color || ""; swatch.classList.toggle("none", !b.color); }
      paintSwatch(); showPreview();
      var cp = null;
      swatch.addEventListener("click", function () {
        if (cp) { cp.parentNode.removeChild(cp); cp = null; return; }
        cp = colorPicker(box, b.color, function (hex) { b.color = hex; paintSwatch(); showPreview(); });
        box.insertBefore(cp, colRow.nextSibling);
      });

      var acts = H.div(box, "actions");
      H.btn(acts, "Save", "", "primary", function () {
        b.name = name.value.trim() || "Button";
        if (!b.target) { H.say("Give the button something to do: choose a file, effect, expression or menu command.", true); return; }
        if (!b.label) delete b.label; if (!b.color) delete b.color;
        if (isNew) list.push(b); else list[index] = b;
        save(); closeEditor(); render();
      });
      H.btn(acts, "Cancel", "", "", closeEditor);
      if (!isNew) H.btn(acts, "Delete", "Remove this button", "", function () { list.splice(index, 1); save(); closeEditor(); render(); });
      name.focus();
    }

    // ---- wait for the host (it reads the file), then draw
    var waiter = setInterval(function () { if (host.ready) { clearInterval(waiter); load(); } }, 80);
    setTimeout(function () { clearInterval(waiter); if (!loaded && !host.inAE) { list = clone(SEED); loaded = true; render(); } }, 600);
  };
})();
