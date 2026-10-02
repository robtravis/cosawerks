// Staggered Trim Paths driven by ONE controller on the layer.
//
// Every top-level group of a shape layer gets its own Trim Paths ("CW Trim"). Their
// Start/End are expressions that read four controls on the layer, so the overlap, the
// order and the timing are sliders you can still change after building, and the only
// keyframes are the two on "CW Trim Progress". Remove all = delete the trims + controller.
CW.trim = {};
CW.trim.NAME = "CW Trim";
CW.trim.FX = ["CW Trim Progress", "CW Trim Overlap", "CW Trim Random", "CW Trim Seed"];

CW.trim.isShapeLayer = function (layer) { return layer.matchName === "ADBE Vector Layer"; };

// Top-level groups, in stack order (these are what get staggered).
CW.trim.groups = function (layer) {
    var out = [], c = layer.property("ADBE Root Vectors Group");
    for (var i = 1; i <= c.numProperties; i++) {
        if (c.property(i).matchName === "ADBE Vector Group") out.push(i);
    }
    return out;
};

// Remove everything this tool added to a layer. Returns how many trims were removed.
CW.trim.remove = function (layer) {
    var removed = 0, root = layer.property("ADBE Root Vectors Group"), i;
    for (i = 1; i <= root.numProperties; i++) {
        var g = root.property(i);
        if (g.matchName !== "ADBE Vector Group") continue;
        var contents = g.property("ADBE Vectors Group"), t = contents.property(CW.trim.NAME);
        if (t) { t.remove(); removed++; }
    }
    var fx = layer.property("ADBE Effect Parade");
    for (i = fx.numProperties; i >= 1; i--) {
        var name = fx.property(i).name, k;
        for (k = 0; k < CW.trim.FX.length; k++) if (name === CW.trim.FX[k]) { fx.property(i).remove(); break; }
    }
    return removed;
};

// The expression for one group. Local progress L (0..1) is this group's slice of the
// controller's progress; "overlap" is how much of its slice it shares with its neighbours.
CW.trim.expr = function (mode, reverse, n, index) {
    var head =
        'var P = effect("CW Trim Progress")("Slider") / 100;\n' +
        'var ov = effect("CW Trim Overlap")("Slider") / 100;\n' +
        'var rnd = effect("CW Trim Random")("Checkbox") == 1;\n' +
        'var seed = effect("CW Trim Seed")("Slider");\n' +
        'var n = ' + n + ', i = ' + index + ', rank = i;\n' +
        'if (rnd) {\n' +
        '  var k = [];\n' +   // not random(): AE mixes layer/property into it, so each group would get a different shuffle
        '  for (var j = 0; j < n; j++) { var x = Math.sin((j + 1) * 12.9898 + seed * 78.233) * 43758.5453; k.push(x - Math.floor(x)); }\n' +
        '  rank = 0;\n' +
        '  for (var j = 0; j < n; j++) if (k[j] < k[i] || (k[j] == k[i] && j < i)) rank++;\n' +
        '}\n' +
        'var w = 1 / (1 + (n - 1) * (1 - ov));\n' +
        'var L = (P - rank * w * (1 - ov)) / w;\n' +
        'L = Math.max(0, Math.min(1, L));\n';
    var startE, endE;
    if (mode === "in") {
        if (reverse) { startE = "100 - L * 100"; endE = null; } else { startE = null; endE = "L * 100"; }
    } else if (mode === "out") {
        if (reverse) { startE = null; endE = "100 - L * 100"; } else { startE = "L * 100"; endE = null; }
    } else {   // inout: draw on over the first half, draw off over the second
        if (reverse) { startE = "L < 0.5 ? 100 - L * 200 : 0"; endE = "L < 0.5 ? 100 : 100 - (L - 0.5) * 200"; }
        else { startE = "L < 0.5 ? 0 : (L - 0.5) * 200"; endE = "L < 0.5 ? L * 200 : 100"; }
    }
    return { start: startE ? head + startE : null, end: endE ? head + endE : null };
};

// opts: { mode: "in"|"out"|"inout", reverse: bool, frames: overall length, overlap: 0..100,
//         random: bool, seed: number, startTime: seconds }
CW.trim.build = function (layer, opts) {
    var comp = layer.containingComp, n = CW.trim.groups(layer).length;
    if (n === 0) return 0;
    CW.trim.remove(layer);

    // Controller. Adding an effect invalidates earlier effect references on the layer, so
    // each one is configured the moment it is added and never touched through that handle again.
    var fxp = layer.property("ADBE Effect Parade"), fx;
    fx = fxp.addProperty("ADBE Slider Control"); fx.name = CW.trim.FX[0];
    fx = fxp.addProperty("ADBE Slider Control"); fx.name = CW.trim.FX[1]; fx.property(1).setValue(opts.overlap);
    fx = fxp.addProperty("ADBE Checkbox Control"); fx.name = CW.trim.FX[2]; fx.property(1).setValue(opts.random ? 1 : 0);
    fx = fxp.addProperty("ADBE Slider Control"); fx.name = CW.trim.FX[3]; fx.property(1).setValue(opts.seed);

    var prog = layer.property("ADBE Effect Parade").property(CW.trim.FX[0]).property(1);
    var t0 = opts.startTime, t1 = t0 + opts.frames * comp.frameDuration;
    prog.setValueAtTime(t0, 0);
    prog.setValueAtTime(t1, 100);
    // the trim ease: an [x1, y1, x2, y2] curve on the build; absent or null leaves it linear
    if (opts.ease && CW.ease) CW.ease.applySegment(layer.property("ADBE Effect Parade").property(CW.trim.FX[0]).property(1), 1, 2, opts.ease);

    var idx = CW.trim.groups(layer);
    for (var g = 0; g < idx.length; g++) {
        var grp = layer.property("ADBE Root Vectors Group").property(idx[g]);
        var trim = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Filter - Trim");
        trim.name = CW.trim.NAME;
        var e = CW.trim.expr(opts.mode, opts.reverse, idx.length, g);
        // Re-fetch through the group each time rather than reusing the handle.
        var t = layer.property("ADBE Root Vectors Group").property(idx[g]).property("ADBE Vectors Group").property(CW.trim.NAME);
        if (e.start) t.property("ADBE Vector Trim Start").expression = e.start;
        if (e.end) t.property("ADBE Vector Trim End").expression = e.end;
    }
    return idx.length;
};

// Apply to every selected shape layer, starting at the playhead.
CW.trim.run = function (opts) {
    CW.run("Staggered trim", function () {
        var comp = CW.activeComp();
        if (!comp || comp.selectedLayers.length === 0) { CW.say("Select one or more shape layers."); return; }
        var sel = comp.selectedLayers, skipped = [], i;
        // Capture first: building adds effects, which can change what is "selected".
        var layers = [];
        for (i = 0; i < sel.length; i++) layers.push(sel[i]);
        for (i = 0; i < layers.length; i++) {
            if (!CW.trim.isShapeLayer(layers[i])) { skipped.push(layers[i].name + ": not a shape layer"); continue; }
            var o = { mode: opts.mode, reverse: opts.reverse, frames: opts.frames, overlap: opts.overlap,
                      random: opts.random, seed: opts.seed, ease: opts.ease, startTime: comp.time };
            if (CW.trim.build(layers[i], o) === 0) skipped.push(layers[i].name + ": no groups to trim");
        }
        if (skipped.length) CW.say("Skipped " + skipped.length + " layer(s):\n" + skipped.join("\n"));
    });
};

CW.trim.removeSelected = function () {
    CW.run("Remove staggered trim", function () {
        var comp = CW.activeComp();
        if (!comp || comp.selectedLayers.length === 0) { CW.say("Select one or more shape layers."); return; }
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            if (CW.trim.isShapeLayer(comp.selectedLayers[i])) CW.trim.remove(comp.selectedLayers[i]);
        }
    });
};

// Change the controller on every selected layer that already has one, without rebuilding
// (so keyframes on Progress survive). opts may hold overlap, random, seed. Layers without a
// controller are skipped quietly. Returns how many layers were updated.
CW.trim.update = function (opts) {
    var n = 0;
    CW.run("Update trim", function () {
        var comp = CW.activeComp();
        if (!comp) return;
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var layer = comp.selectedLayers[i];
            if (!CW.trim.isShapeLayer(layer)) continue;
            var fx = layer.property("ADBE Effect Parade");
            if (!fx.property(CW.trim.FX[0])) continue;
            if (opts.overlap !== undefined) fx.property(CW.trim.FX[1]).property(1).setValue(opts.overlap);
            if (opts.random !== undefined) fx.property(CW.trim.FX[2]).property(1).setValue(opts.random ? 1 : 0);
            if (opts.seed !== undefined) fx.property(CW.trim.FX[3]).property(1).setValue(opts.seed);
            n++;
        }
    });
    return n;
};
