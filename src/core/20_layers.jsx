// Reading layers into snapshots, and moving them.

CW.PROP = { pos: "ADBE Position", anchor: "ADBE Anchor Point", scale: "ADBE Scale", rot: "ADBE Rotate Z" };

// Snapshot of a layer's 2D transform at time t, parents included.
CW.snap = function (layer, t) {
    var tr = layer.transform, pos;
    var pp = tr.property(CW.PROP.pos);
    if (pp.dimensionsSeparated) {
        pos = [tr.property("ADBE Position_0").valueAtTime(t, false), tr.property("ADBE Position_1").valueAtTime(t, false)];
    } else {
        var pv = pp.valueAtTime(t, false);
        pos = [pv[0], pv[1]];
    }
    var av = tr.property(CW.PROP.anchor).valueAtTime(t, false);
    var sv = tr.property(CW.PROP.scale).valueAtTime(t, false);
    return {
        layer: layer, pos: pos, anchor: [av[0], av[1]], scale: [sv[0], sv[1]],
        rot: tr.property(CW.PROP.rot).valueAtTime(t, false),
        parent: layer.parent ? CW.snap(layer.parent, t) : null
    };
};

// null when the layer is fine to move or align, otherwise a short reason it is skipped.
CW.unsupported = function (layer) {
    // instanceof AVLayer is false for text and shape layers, so test by matchName instead.
    if (layer.matchName === "ADBE Camera Layer" || layer.matchName === "ADBE Light Layer") return "camera or light";
    if (layer.hasVideo === false) return "audio only";
    var L = layer;
    while (L) {
        if (L.threeDLayer) {
            var tr = L.transform;
            var names = ["ADBE Orientation", "ADBE Rotate X", "ADBE Rotate Y"];
            for (var i = 0; i < names.length; i++) {
                var v = tr.property(names[i]).value;
                var n = (v instanceof Array) ? Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]) : Math.abs(v);
                if (n > 1e-6) return "3D layer with rotation";
            }
        }
        L = L.parent;
    }
    return null;
};

// Tight source bounds in layer space, or null for layers with no area.
CW.rectOf = function (layer, t) {
    var r = layer.sourceRectAtTime(t, false);
    if (!r || (r.width === 0 && r.height === 0)) return null;
    return r;
};

CW.depth = function (layer) {
    var d = 0, p = layer.parent;
    while (p) { d++; p = p.parent; }
    return d;
};

// Can this property be shifted without destroying an expression?
CW.canShift = function (layer) {
    var pp = layer.transform.property(CW.PROP.pos);
    if (pp.dimensionsSeparated) {
        return !layer.transform.property("ADBE Position_0").expressionEnabled &&
               !layer.transform.property("ADBE Position_1").expressionEnabled;
    }
    return !pp.expressionEnabled;
};

CW._shiftProp = function (prop, dx, dy, scalarIndex) {
    var i, v;
    if (prop.numKeys > 0) {
        for (i = 1; i <= prop.numKeys; i++) {
            v = prop.keyValue(i);
            if (scalarIndex === undefined) { v = v.slice(0); v[0] += dx; v[1] += dy; }
            else v += (scalarIndex === 0 ? dx : dy);
            prop.setValueAtKey(i, v);
        }
    } else {
        v = prop.value;
        if (scalarIndex === undefined) { v = v.slice(0); v[0] += dx; v[1] += dy; }
        else v += (scalarIndex === 0 ? dx : dy);
        prop.setValue(v);
    }
};

// Shift a layer's position by (dx,dy) in its parent space. Keyframes move with it.
CW.shift = function (layer, dx, dy) {
    var tr = layer.transform, pp = tr.property(CW.PROP.pos);
    if (pp.dimensionsSeparated) {
        CW._shiftProp(tr.property("ADBE Position_0"), dx, dy, 0);
        CW._shiftProp(tr.property("ADBE Position_1"), dx, dy, 1);
    } else {
        CW._shiftProp(pp, dx, dy);
    }
};

// Apply composition-space moves to layers without double-moving parented selections.
// items: [{layer, snap, dx, dy}] where dx,dy are the wanted TOTAL move in comp space.
// A selected parent carries its selected children, so a child only needs the difference.
CW.applyCompDeltas = function (items) {
    var byIndex = {}, i;
    for (i = 0; i < items.length; i++) byIndex[items[i].layer.index] = items[i];
    items.sort(function (a, b) { return CW.depth(a.layer) - CW.depth(b.layer); });
    for (i = 0; i < items.length; i++) {
        var it = items[i], ax = 0, ay = 0, p = it.layer.parent;
        while (p) {
            var a = byIndex[p.index];
            if (a) { ax += a.sx; ay += a.sy; }
            p = p.parent;
        }
        it.sx = it.dx - ax;
        it.sy = it.dy - ay;
        if (Math.abs(it.sx) < 1e-9 && Math.abs(it.sy) < 1e-9) continue;
        var dp = CW.m.compDeltaToParent(it.snap, it.sx, it.sy);
        if (dp) CW.shift(it.layer, dp[0], dp[1]);
    }
};
