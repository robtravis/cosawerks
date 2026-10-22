// Arrows, all in ONE shape layer and live editable.
//
// The layer keeps your shaft (path, stroke) with a Trim Paths on it, plus groups for the head and the tail, and a hidden
// library of head shapes. Everything is an expression reading controls on the layer, so editing the path, switching the head,
// changing the animation, the size or the direction just updates: nothing is rebuilt.
CW.arrow = {};
CW.arrow.MARK = "// CW Arrow";
CW.arrow.TRIM = "CW Arrow Trim";
CW.arrow.CUSTOM = 8;          // the library slot (and the Shape menu item) that holds a head you drew
CW.arrow.GROUPS = ["CW Head", "CW Head Polygon", "CW Tail", "CW Tail Polygon", "CW Shapes"];
CW.arrow.MODES = [["draw", "Draw"], ["drawoff", "Draw & Off"], ["travel", "Travel"], ["center", "From Center"]];
// The controls are one pseudo effect, "Arrow" (presets/Cosawerks Arrow.ffx), with real dropdowns and Head / Tail groups.
// Expressions find it by match name, so renaming the effect is safe.
CW.arrow.FX = "Pseudo/cwArrow0003";   // bump with tools/gen-ffx.py whenever the effect layout changes
CW.arrow.PRESET = "Cosawerks Arrow.ffx";
CW.arrow.LEGACY_FX = ["Pseudo/cwArrow0002", "Pseudo/cwArrow0001"];      // earlier layouts of the effect
CW.arrow.EASE = [0.5, 0, 0.2, 1];     // the "50-80" ease preset: the build starts gently and settles in
CW.arrow.C = {
    anim: "Animate", progress: "Progress", mode: "Animation", length: "Travel Length", reverse: "Reverse",
    hshow: "Show", hshape: "Shape", hsize: "Size", hangle: "Angle", grow: "Grow In", poly: "Polygon Points",
    tshow: "Show Tail", tsame: "Tail Same As Head", tshape: "Tail Shape", tsize: "Tail Size", tangle: "Tail Angle"
};
// the effect on a layer, or null
CW.arrow.fx = function (layer) { var p = layer.property("ADBE Effect Parade"); return p ? p.property(CW.arrow.FX) : null; };
// a control of that effect (fetched fresh each time, as handles go stale)
CW.arrow.ctl = function (layer, key) { return CW.arrow.fx(layer).property(CW.arrow.C[key]); };

CW.arrow.typeIndex = function (id) {
    var T = CW.arrowShapes.TYPES;
    for (var i = 0; i < T.length; i++) if (T[i][0] === id) return i + 1;
    return 2;
};
CW.arrow.modeIndex = function (id) {
    for (var i = 0; i < CW.arrow.MODES.length; i++) if (CW.arrow.MODES[i][0] === id) return i + 1;
    return 1;
};
CW.arrow.shapeLabels = function () {
    var out = [], T = CW.arrowShapes.TYPES;
    for (var i = 0; i < T.length; i++) out.push(T[i][1]);
    return out;
};

// ---- expressions ---------------------------------------------------------------------------------------------
// The value of a control of the Arrow effect on this layer, inside an expression.
CW.arrow._ctl = function (name) { return 'thisLayer.effect(' + CW.pathx.q(CW.arrow.FX) + ')(' + CW.pathx.q(name) + ')'; };

// Where the visible part of the line starts (s) and ends (e), 0..1, from progress and the live mode and direction.
CW.arrow.windowExpr = function () {
    var C = CW.arrow.C, c = CW.arrow._ctl;
    return 'var an = ' + c(C.anim) + ' == 1, Pg = an ? ' + c(C.progress) + ' / 100 : 1, Ln = ' + c(C.length) + ' / 100, md = ' + c(C.mode) + ', rev = ' + c(C.reverse) + ' == 1;\n' +
           'function c01(x) { return Math.max(0, Math.min(1, x)); }\n' +
           'var e, s;\n' +
           'if (md == 2) { e = c01(Pg * 2); s = c01(Pg * 2 - 1); }\n' +
           'else if (md == 3) { e = Pg * (1 + Ln); s = e - Ln; e = c01(e); s = c01(s); }\n' +
           'else if (md == 4) { e = c01(0.5 + Pg * 0.5); s = c01(0.5 - Pg * 0.5); }\n' +
           'else { e = c01(Pg); s = 0; }\n' +
           'if (!an) { e = 1; s = 0; }\n';
};

// How far a head reaches back along the line from its tip (shape units), so the shaft can stop at the head's base instead of poking
// out past a filled tip. Worked out inside the expression from the head's own outline (so a head you drew counts too): where the back
// edge crosses the centre line, less EMBED. Open shapes (Open Arrow, Flat Line, an open path) sit on the end and need none.
CW.arrow.EMBED = 8;      // shape units the shaft runs into the head, so no hairline shows where flat shaft end meets head base
CW.arrow._lib = 'thisLayer.content("CW Shapes").content("Shapes").path';
// code defining reachOf(group, n, P): how far the head in that group (CW Head / CW Tail), showing library shape n, reaches back from its
// tip. It asks the group's own live path, which already shows the chosen shape (a built-in or one you drew).
CW.arrow._reachCode = function () {
    return 'function reachOf(group, n, P) {\n' +
        '  if (Math.round(n) == 1) return 50 + 50 * (P % 2 == 0 ? 1 : Math.cos(Math.PI / P)) - ' + CW.arrow.EMBED + ';\n' +
        '  var hp = thisLayer.content(group).content("Head Path").path;\n' +
        '  if (!hp.isClosed()) return 0;\n' +
        '  var v = hp.points(), m = v.length, cross = 1e9, mn = 0, j, p, q, x;\n' +
        '  for (j = 0; j < m; j++) if (v[j][0] < mn) mn = v[j][0];\n' +
        '  for (j = 0; j < m; j++) { p = v[j]; q = v[(j + 1) % m]; if ((p[1] <= 0 && q[1] > 0) || (q[1] <= 0 && p[1] > 0)) { x = p[0] + (0 - p[1]) * (q[0] - p[0]) / (q[1] - p[1]); if (x < cross) cross = x; } }\n' +
        '  return Math.max(0, -(cross == 1e9 ? mn : cross) - ' + CW.arrow.EMBED + ');\n}\n';
};

CW.arrow.trimExpr = function (ref, which) {
    var C = CW.arrow.C, c = CW.arrow._ctl, h = CW.arrow._role("head"), t = CW.arrow._role("tail");
    return CW.arrow.MARK + " trim\n" + CW.pathx.prelude(ref, "thisLayer", true) + CW.arrow.windowExpr() +
        CW.arrow._reachCode() + 'var P = Math.max(3, Math.round(' + c(C.poly) + '));\n' +
        'var Ls = 0, prev = at(0), k;\n' +
        'for (k = 1; k <= 40; k++) { var q = at(k / 40); Ls += length(prev, q); prev = q; }\n' +
        'function reach(group, shape, size) { return Ls > 0 ? reachOf(group, shape, P) * size / 100 / Ls : 0; }\n' +
        'var on = e - s > 0.0005;\n' +
        'var hl = (on && ' + h.show + ' == 1) ? reach("CW Head", ' + h.shape + ', ' + h.size + ') : 0;\n' +
        'var tl = (on && ' + t.show + ' == 1) ? reach("CW Tail", ' + t.shape + ', ' + t.size + ') : 0;\n' +
        'var a = rev ? 1 - e : s, b = rev ? 1 - s : e;\n' +
        'if (rev) { a += hl; b -= tl; } else { a += tl; b -= hl; }\n' +
        'if (a > b) a = b;\n' +
        (which === "start" ? 'a * 100;' : 'b * 100;');
};

// Which head shape (1..8) and size this role uses; a tail can simply copy the head.
CW.arrow._role = function (role) {
    var C = CW.arrow.C, c = CW.arrow._ctl;
    if (role === "head") return { show: c(C.hshow), shape: c(C.hshape), size: c(C.hsize), angle: c(C.hangle) };
    return { show: c(C.tshow),
             shape: '(' + c(C.tsame) + ' == 1 ? ' + c(C.hshape) + ' : ' + c(C.tshape) + ')',
             size: '(' + c(C.tsame) + ' == 1 ? ' + c(C.hsize) + ' : ' + c(C.tsize) + ')',
             angle: '(' + c(C.tsame) + ' == 1 ? ' + c(C.hangle) + ' : ' + c(C.tangle) + ')' };
};

// polygon: the polystar group (head shape 1); otherwise the path group (every other shape).
CW.arrow.groupExpr = function (ref, role, polygon, which) {
    var r = CW.arrow._role(role), isHead = role === "head";
    var pre = CW.pathx.prelude(ref, "thisLayer", true) + CW.arrow.windowExpr() +
              'var u = ' + (isHead ? '(rev ? 1 - e : e)' : '(rev ? 1 - s : s)') + ';\n';
    if (which === "pos") return CW.arrow.MARK + " " + role + " position\n" + pre + 'at(u);';
    if (which === "rot") return CW.arrow.MARK + " " + role + " rotation\n" + pre + CW.pathx.angleExprLocal +
        'ang + (rev ? 180 : 0) + ' + (isHead ? '' : '180 + ') + r.angle + ';';
    if (which === "scale") return CW.arrow.MARK + " " + role + " size\n" + CW.arrow.windowExpr() + 'var Gr = ' + CW.arrow._ctl(CW.arrow.C.grow) + ' / 100;\n' +
        'var S = ' + r.size + ' * ((an && Gr > 0) ? c01(Pg / Gr) : 1);\n[S, S];';
    // opacity: only when something is drawn, only when shown, and only for the right kind of shape
    return CW.arrow.MARK + " " + role + " opacity\n" + CW.arrow.windowExpr() +
        'var n = ' + r.shape + ';\n' +
        'var mine = ' + (polygon ? 'n == 1' : 'n != 1') + ';\n' +
        '(mine && ' + r.show + ' == 1 && e - s > 0.0005 && s < 0.9995) ? 100 : 0;';
};

// ---- building ----------------------------------------------------------------------------------------------
CW.arrow._root = function (layer) { return layer.property("ADBE Root Vectors Group"); };

// The first stroke in the shaft's group (name and the chain of group names to reach it), for linking colour and thickness.
CW.arrow.strokeIn = function (container) {
    for (var i = 1; i <= container.numProperties; i++) if (container.property(i).matchName === "ADBE Vector Graphic - Stroke") return container.property(i).name;
    return null;
};

CW.arrow._shapeValue = function (shape) {
    var sh = new Shape();
    if (shape.kind === "polygon") { sh.vertices = [[0.1, 0]]; sh.inTangents = [[0, 0]]; sh.outTangents = [[0, 0]]; sh.closed = false; }
    else { sh.vertices = shape.vertices; sh.inTangents = shape.inTangents; sh.outTangents = shape.outTangents; sh.closed = shape.closed; }
    return sh;
};

// The hidden library: one path holding every head shape as a keyframe, so a control can pick key n.
// head: optional { vertices, inTangents, outTangents, closed } (already normalised) for the Custom slot.
CW.arrow._library = function (layer, head) {
    var root = CW.arrow._root(layer);
    root.addProperty("ADBE Vector Group").name = "CW Shapes";
    var inner = function () { return CW.arrow._root(layer).property("CW Shapes").property("ADBE Vectors Group"); };
    inner().addProperty("ADBE Vector Shape - Group").name = "Shapes";
    var prop = inner().property("Shapes").property("ADBE Vector Shape"), T = CW.arrowShapes.TYPES, i;
    for (i = 0; i < T.length; i++) prop.setValueAtTime(-100 + i, (head && i + 1 === CW.arrow.CUSTOM) ? CW.arrow._headValue(head) : CW.arrow._shapeValue(CW.arrowShapes.get(T[i][0])));
    return prop.numKeys;
};

CW.arrow._headValue = function (head) {
    var sh = new Shape();
    sh.vertices = head.vertices; sh.inTangents = head.inTangents; sh.outTangents = head.outTangents; sh.closed = !!head.closed;
    return sh;
};

// Put a head you drew into the Custom slot of this arrow (head: the packed text, or the normalised object).
CW.arrow.setCustomHead = function (layer, head) {
    var h = typeof head === "string" ? CW.arrowShapes.unpack(head) : head;
    if (!h) throw new Error("That is not a head.");
    var prop = CW.arrow._root(layer).property("CW Shapes").property("ADBE Vectors Group").property("Shapes").property("ADBE Vector Shape");
    prop.setValueAtKey(CW.arrow.CUSTOM, CW.arrow._headValue(h));
};

CW.arrow._style = function (layer, groupName, ref, strokeName, polygon, role) {
    var C = CW.arrow.C, c = CW.arrow._ctl, r = CW.arrow._role(role);
    var g = function () { return CW.arrow._root(layer).property(groupName); };
    var inner = function () { return g().property("ADBE Vectors Group"); };
    var chain = "thisLayer." + (ref.groups.length ? ref.groups.join(".") + "." : "");
    var colorExpr = strokeName ? CW.arrow.MARK + " colour\n" + chain + "content(" + CW.pathx.q(strokeName) + ").color;" : "";
    var widthExpr = CW.arrow.MARK + " thickness\nvar S = " + r.size + ';\nvar w = ' + (strokeName ? chain + "content(" + CW.pathx.q(strokeName) + ").strokeWidth" : "6") + ';\nw / Math.max(S / 100, 0.01);';
    var open = 'var n = ' + r.shape + ';\n';

    if (polygon) {
        inner().addProperty("ADBE Vector Shape - Star");
        var star = inner().property(1);
        star.property("ADBE Vector Star Type").setValue(2);
        star.property("ADBE Vector Star Outer Radius").setValue(50);
        star.property("ADBE Vector Star Position").setValue([-50, 0]);
        star.property("ADBE Vector Star Rotation").setValue(90);
        star.property("ADBE Vector Star Points").expression = CW.arrow.MARK + " points\nMath.max(3, Math.round(" + c(C.poly) + "));";
        inner().addProperty("ADBE Vector Graphic - Fill");
        if (strokeName) inner().property("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").expression = colorExpr;
        return;
    }
    // path-based shape: the library key picks the outline; closed outlines fill, open ones (Open Arrow, Flat Line, a drawn open path) stroke
    inner().addProperty("ADBE Vector Shape - Group").name = "Head Path";
    inner().property("Head Path").property("ADBE Vector Shape").expression = CW.arrow.MARK + " shape\n" + open +
        CW.arrow._lib + '.key(Math.max(1, Math.min(' + CW.arrowShapes.TYPES.length + ', Math.round(n))));';
    // Two strokes, one on at a time: round ends for open heads (Open Arrow, a drawn open path), square ends for the Flat Line (shape 7).
    // (Line Cap itself cannot be driven by an expression.) Both share the shaft's colour and thickness.
    var closedTest = "thisLayer.content(" + CW.pathx.q(groupName) + ").content(\"Head Path\").path.isClosed()";
    var strokes = [["Stroke Round", 2, "Math.round(n) == 7 ? 0 : 100"], ["Stroke Flat", 1, "Math.round(n) == 7 ? 100 : 0"]], si;
    for (si = 0; si < strokes.length; si++) {
        inner().addProperty("ADBE Vector Graphic - Stroke");
        inner().property(inner().numProperties).name = strokes[si][0];
        var st = function () { return inner().property(strokes[si][0]); };
        st().property("ADBE Vector Stroke Line Cap").setValue(strokes[si][1]);
        st().property("ADBE Vector Stroke Line Join").setValue(2);
        st().property("ADBE Vector Stroke Width").expression = widthExpr;
        st().property("ADBE Vector Stroke Opacity").expression = CW.arrow.MARK + " stroke on\n" + open + closedTest + " ? 0 : (" + strokes[si][2] + ");";
        if (strokeName) st().property("ADBE Vector Stroke Color").expression = colorExpr;
    }
    inner().addProperty("ADBE Vector Graphic - Fill");
    var fl = inner().property("ADBE Vector Graphic - Fill");
    fl.property("ADBE Vector Fill Opacity").expression = CW.arrow.MARK + " fill on\n" + closedTest + " ? 100 : 0;";
    if (strokeName) fl.property("ADBE Vector Fill Color").expression = colorExpr;
};

CW.arrow._makeGroup = function (layer, ref, name, role, polygon, strokeName) {
    CW.arrow._root(layer).addProperty("ADBE Vector Group").name = name;
    CW.arrow._style(layer, name, ref, strokeName, polygon, role);
    var tr = CW.arrow._root(layer).property(name).property("ADBE Vector Transform Group");
    tr.property("ADBE Vector Position").expression = CW.arrow.groupExpr(ref, role, polygon, "pos");
    tr.property("ADBE Vector Rotation").expression = CW.arrow.groupExpr(ref, role, polygon, "rot");
    tr.property("ADBE Vector Scale").expression = CW.arrow.groupExpr(ref, role, polygon, "scale");
    tr.property("ADBE Vector Group Opacity").expression = CW.arrow.groupExpr(ref, role, polygon, "opacity");
};

// opts: { type, mode, animate, grow, frames, size, length, reverse, tail, tailSame, tailType, polygonPoints, customHead (packed text) }
// ref: the shaft path (CW.pathx.selectedPath, or from CW.arrow.newShaft). All in ref.layer.
CW.arrow.build = function (comp, ref, opts) {
    var layer = ref.layer, C = CW.arrow.C, labels = CW.arrow.shapeLabels();
    var strokeName = CW.arrow.strokeIn(CW.pathx.container(ref));
    // already an arrow: keep everything (effect, keyframes, trim, groups) and just bring the controls to these settings
    var existing = CW.arrow.isArrow(layer) && !!CW.arrow._root(layer).property("CW Head");
    if (!existing) CW.arrow.remove(layer);

    // the Arrow effect (an animation preset carrying a pseudo effect), then its values
    var k;
    if (!existing) {
        var pf = CW.presetFile(CW.arrow.PRESET);
        if (!pf) throw new Error("Cosawerks Arrow.ffx is missing from the panel's presets folder. Run ./install-cep.sh again");
        for (k = 1; k <= comp.numLayers; k++) comp.layer(k).selected = false;
        layer.selected = true;
        layer.applyPreset(pf);
        // the preset was saved from a built arrow and may carry its Progress keyframes: start from none
        var stale = CW.arrow.ctl(layer, "progress");
        while (stale.numKeys > 0) stale.removeKey(1);
    }
    var set = function (key, v) { CW.setValue(CW.arrow.ctl(layer, key), v); };
    set("anim", opts.animate ? 1 : 0); set("grow", opts.grow || 0); set("hangle", opts.angle || 0);
    set("length", opts.length); set("mode", CW.arrow.modeIndex(opts.mode)); set("reverse", opts.reverse ? 1 : 0);
    set("hshape", CW.arrow.typeIndex(opts.type)); set("hsize", opts.size); set("poly", opts.polygonPoints || 5);
    set("tshow", opts.tail ? 1 : 0); set("tsame", opts.tailSame === false ? 0 : 1);
    set("tshape", CW.arrow.typeIndex(opts.tailType || "arrowtail")); set("tsize", opts.size);
    if (existing) { if (opts.customHead) CW.arrow.setCustomHead(layer, opts.customHead); return layer; }
    var prog = CW.arrow.ctl(layer, "progress");
    var t0 = comp.time, t1 = t0 + opts.frames * comp.frameDuration;
    prog.setValueAtTime(t0, 0); prog.setValueAtTime(t1, 100);
    if (CW.ease) CW.ease.applySegment(CW.arrow.ctl(layer, "progress"), 1, 2, CW.arrow.EASE);

    // the shape library, then the groups that use it (added last so they draw on top)
    CW.arrow._library(layer, opts.customHead ? (typeof opts.customHead === "string" ? CW.arrowShapes.unpack(opts.customHead) : opts.customHead) : null);
    CW.arrow._makeGroup(layer, ref, "CW Tail Polygon", "tail", true, strokeName);
    CW.arrow._makeGroup(layer, ref, "CW Tail", "tail", false, strokeName);
    CW.arrow._makeGroup(layer, ref, "CW Head Polygon", "head", true, strokeName);
    CW.arrow._makeGroup(layer, ref, "CW Head", "head", false, strokeName);

    // the shaft's trim goes in last: its expression reads the head and tail groups, so they have to exist when it is first evaluated
    CW.pathx.container(ref).addProperty("ADBE Vector Filter - Trim").name = CW.arrow.TRIM;
    var trim = CW.pathx.container(ref).property(CW.arrow.TRIM);
    trim.property("ADBE Vector Trim Start").expression = CW.arrow.trimExpr(ref, "start");
    trim.property("ADBE Vector Trim End").expression = CW.arrow.trimExpr(ref, "end");

    return layer;
};

// A fresh arrow: a new shape layer with a curved path and a round-capped stroke.
CW.arrow.newShaft = function (comp) {
    var layer = comp.layers.addShape();
    layer.name = "Arrow";
    layer.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height / 2]);
    layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").name = "Shaft";
    var inner = function () { return layer.property("ADBE Root Vectors Group").property("Shaft").property("ADBE Vectors Group"); };
    inner().addProperty("ADBE Vector Shape - Group").name = "Path 1";
    var sh = new Shape();
    sh.vertices = [[-300, 70], [0, -70], [300, 50]];
    sh.outTangents = [[110, -140], [130, 0], [0, 0]];
    sh.inTangents = [[0, 0], [-130, 0], [-110, -110]];
    sh.closed = false;
    inner().property("Path 1").property("ADBE Vector Shape").setValue(sh);
    inner().addProperty("ADBE Vector Graphic - Stroke").name = "Stroke 1";
    var st = inner().property("Stroke 1");
    st.property("ADBE Vector Stroke Width").setValue(6);
    st.property("ADBE Vector Stroke Color").setValue([1, 1, 1]);
    st.property("ADBE Vector Stroke Line Cap").setValue(2);
    return CW.pathx.describe(inner().property("Path 1").property("ADBE Vector Shape"));
};

// "New arrow" (asNew, or no path selected) or "add a head to the selected path" (same layer).
CW.arrow.run = function (opts) {
    CW.run("Arrow", function () {
        var comp = CW.activeComp();
        if (!comp) { CW.say("Open a composition first."); return; }
        var ref = opts.asNew ? null : CW.pathx.selectedPath(comp);
        if (ref && ref.kind === "mask") { CW.say("Arrows need a shape path, not a mask. Use Follow Path to ride a mask, or select a shape path."); return; }
        var made = false;
        if (!ref) { ref = CW.arrow.newShaft(comp); made = true; }
        CW.arrow.build(comp, ref, opts);
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        ref.layer.selected = true;
        CW.note((made ? "Made a new arrow" : "Added an arrowhead to " + ref.layer.name) + ". Press Space to see it draw on");
    });
};

// ---- live changes ------------------------------------------------------------------------------------------
CW.arrow.isArrow = function (layer) {
    return !!CW.arrow.fx(layer);
};

// Set controls on every selected arrow layer. opts: size, length, shape (1..7), mode (1..3), reverse, tail, tailSame,
// tailShape, tailSize, polygonPoints. Returns how many layers were changed.
CW.arrow.update = function (opts) {
    var n = 0;
    CW.run("Update arrow", function () {
        var comp = CW.activeComp();
        if (!comp) return;
        var C = CW.arrow.C, map = [["size", C.hsize], ["length", C.length], ["animate", C.anim], ["grow", C.grow], ["angle", C.hangle], ["shape", C.hshape], ["mode", C.mode], ["reverse", C.reverse], ["tail", C.tshow],
                                   ["tailSame", C.tsame], ["tailShape", C.tshape], ["tailSize", C.tsize], ["polygonPoints", C.poly]];
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var layer = comp.selectedLayers[i];
            if (!CW.arrow.isArrow(layer)) continue;
            if (opts.customHead) CW.arrow.setCustomHead(layer, opts.customHead);
            if (opts.frames !== undefined) {      // retime the build: the second key moves, the ease is put back
                var pg = CW.arrow.ctl(layer, "progress");
                if (pg.numKeys >= 2) {
                    var tStart = pg.keyTime(1);
                    pg.removeKey(2);
                    CW.arrow.ctl(layer, "progress").setValueAtTime(tStart + opts.frames * comp.frameDuration, 100);
                    if (CW.ease) CW.ease.applySegment(CW.arrow.ctl(layer, "progress"), 1, 2, CW.arrow.EASE);
                }
            }
            for (var k = 0; k < map.length; k++) {
                var v = opts[map[k][0]];
                if (v === undefined) continue;
                if (typeof v === "boolean") v = v ? 1 : 0;
                CW.setValue(CW.arrow.fx(layer).property(map[k][1]), v);
                if (map[k][0] === "size" && !(opts.tailSame === false)) CW.setValue(CW.arrow.fx(layer).property(C.tsize), v);
            }
            n++;
        }
    });
    return n;
};

// The path you have selected, as a head to save: the packed text of the drawn shape read as pointing right with its right-most point
// as the tip, centred and scaled to 100 units; or "null" when no path is selected (a shape path or a mask, picked in the timeline).
CW.arrow.readHead = function () {
    var comp = CW.activeComp(), i;
    if (!comp) return "null";
    for (i = 0; i < comp.selectedProperties.length; i++) {
        var p = comp.selectedProperties[i], m = p.matchName, prop = null;
        if (m === "ADBE Vector Shape - Group") prop = p.property("ADBE Vector Shape");
        else if (m === "ADBE Vector Shape" || m === "ADBE Mask Shape") prop = p;
        else if (m === "ADBE Mask Atom") prop = p.property("ADBE Mask Shape");
        if (prop) {
            var v = prop.value;
            if (!v || !v.vertices || v.vertices.length < 2) return "null";
            return CW.arrowShapes.pack(CW.arrowShapes.normalize(v));
        }
    }
    return "null";
};

// The settings of the first selected arrow as "key=value;..." (for saving a preset), or "null" when none is selected.
CW.arrow.readString = function () {
    var comp = CW.activeComp(), i;
    if (!comp) return "null";
    for (i = 0; i < comp.selectedLayers.length; i++) {
        var L = comp.selectedLayers[i];
        if (!CW.arrow.isArrow(L)) continue;
        var m = [["shape", "hshape"], ["size", "hsize"], ["angle", "hangle"], ["tail", "tshow"], ["tailSame", "tsame"], ["tailShape", "tshape"], ["reverse", "reverse"],
                 ["mode", "mode"], ["animate", "anim"], ["grow", "grow"], ["length", "length"], ["polygonPoints", "poly"]], out = [];
        for (var k = 0; k < m.length; k++) out.push(m[k][0] + "=" + CW.arrow.ctl(L, m[k][1]).value);
        // a head you drew rides along with the preset (only when the arrow uses the Custom slot)
        if (CW.arrow.ctl(L, "hshape").value === CW.arrow.CUSTOM || CW.arrow.ctl(L, "tshape").value === CW.arrow.CUSTOM) {
            var lib = CW.arrow._root(L).property("CW Shapes").property("ADBE Vectors Group").property("Shapes").property("ADBE Vector Shape");
            var cv = lib.keyValue(CW.arrow.CUSTOM);
            out.push("head=" + CW.arrowShapes.pack({ vertices: cv.vertices, inTangents: cv.inTangents, outTangents: cv.outTangents, closed: cv.closed }));
        }
        return out.join(";");
    }
    return "null";
};

// ---- removing ----------------------------------------------------------------------------------------------
CW.arrow.remove = function (layer) {
    var n = 0, root = layer.property("ADBE Root Vectors Group"), i, k;
    for (i = root.numProperties; i >= 1; i--) {
        var g = root.property(i);
        for (k = 0; k < CW.arrow.GROUPS.length; k++) if (g.name === CW.arrow.GROUPS[k]) { g.remove(); n++; break; }
    }
    (function walk(group) {
        for (var j = group.numProperties; j >= 1; j--) {
            var item = group.property(j);
            if (item.matchName === "ADBE Vector Filter - Trim" && item.name === CW.arrow.TRIM) { item.remove(); n++; }
            else if (item.matchName === "ADBE Vector Group") walk(item.property("ADBE Vectors Group"));
        }
    })(layer.property("ADBE Root Vectors Group"));
    if (CW.arrow.fx(layer)) { CW.arrow.fx(layer).remove(); n++; }
    // an earlier version of the effect (arrows made before the layout changed): take it off too, so pressing Arrow again upgrades the layer
    var fxp = layer.property("ADBE Effect Parade"), old, li;
    for (li = 0; li < CW.arrow.LEGACY_FX.length; li++) { old = fxp ? fxp.property(CW.arrow.LEGACY_FX[li]) : null; if (old) { old.remove(); n++; } }
    return n;
};

CW.arrow.removeSelected = function () {
    CW.run("Remove arrow", function () {
        var comp = CW.activeComp();
        if (!comp || comp.selectedLayers.length === 0) { CW.say("Select the arrow's layer."); return; }
        var layers = [], i, n = 0;
        for (i = 0; i < comp.selectedLayers.length; i++) layers.push(comp.selectedLayers[i]);
        for (i = 0; i < layers.length; i++) if (layers[i].matchName === "ADBE Vector Layer") n += CW.arrow.remove(layers[i]);
        CW.note("Removed " + n + " arrow part" + (n === 1 ? "" : "s"));
    });
};
