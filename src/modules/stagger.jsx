// Stagger: offset the timing of selected layers or keyframes one after another.
//
// Modes: layers (move each layer in time), trimin / trimout (move each layer's in or out point), keys (selected keyframes),
// sequence (end to end, the amount is the gap, negative overlaps).
// Direction: 1 top first, -1 bottom first, 0 random. The amount is frames, or seconds when it ends in "s" ("0.5s").
// shiftOnly: move everything by the amount (later for top first, earlier for bottom first, random jitter +/- amount for random).
// additive: add the stagger to the current timing instead of lining the items up first.
CW.stagger = {};
CW.stagger.MODES = ["layers", "trimin", "trimout", "keys", "sequence"];
CW.stagger.EASES = ["linear", "in", "out", "inout"];
CW.stagger.POWERS = [2, 3, 4, 5, "expo"];

// seconds from "2", "0.5s", "3f"; null when it is not a number
CW.stagger.parseAmount = function (str, frameDuration) {
    var s = String(str).replace(/\s/g, "").toLowerCase(), secs = /s$/.test(s), n = parseFloat(s.replace(/[sf]$/, ""));
    if (isNaN(n)) return null;
    return secs ? n : n * frameDuration;
};

// t (0..1) through the spacing curve. type: 0 linear, 1 in, 2 out, 3 in-out. power: index into POWERS.
CW.stagger.ease = function (t, type, power) {
    if (type === 0) return t;
    var p = CW.stagger.POWERS[power];
    var inn = function (x) { return p === "expo" ? (x === 0 ? 0 : (Math.pow(2, 10 * x) - 1) / 1023) : Math.pow(x, p); };
    if (type === 1) return inn(t);
    if (type === 2) return 1 - inn(1 - t);
    return t < 0.5 ? inn(t * 2) / 2 : 1 - inn((1 - t) * 2) / 2;
};

CW.stagger._shuffle = function (a) {
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
};

// ---- keyframes: read everything about a key, then put it back at a new time ----
CW.stagger._grab = function (p, k) {
    var d = { t: p.keyTime(k), v: p.keyValue(k) };
    try { d.ii = p.keyInInterpolationType(k); d.oi = p.keyOutInterpolationType(k); } catch (e1) {}
    try { d.ie = p.keyInTemporalEase(k); d.oe = p.keyOutTemporalEase(k); } catch (e2) {}
    try { d.tc = p.keyTemporalContinuous(k); d.ta = p.keyTemporalAutoBezier(k); } catch (e3) {}
    if (p.isSpatial) {
        try { d.ist = p.keyInSpatialTangent(k); d.ost = p.keyOutSpatialTangent(k); } catch (e4) {}
        try { d.sc = p.keySpatialContinuous(k); d.sa = p.keySpatialAutoBezier(k); d.rv = p.keyRoving(k); } catch (e5) {}
    }
    try { d.lb = p.keyLabel(k); } catch (e6) {}
    return d;
};
CW.stagger._put = function (p, d, t) {
    var k = p.addKey(t);
    p.setValueAtKey(k, d.v);
    if (d.ie) { try { p.setTemporalEaseAtKey(k, d.ie, d.oe); } catch (e1) {} }
    if (d.ii) { try { p.setInterpolationTypeAtKey(k, d.ii, d.oi); } catch (e2) {} }
    if (d.tc !== undefined) { try { p.setTemporalContinuousAtKey(k, d.tc); p.setTemporalAutoBezierAtKey(k, d.ta); } catch (e3) {} }
    if (d.ist) { try { p.setSpatialTangentsAtKey(k, d.ist, d.ost); } catch (e4) {} }
    if (d.sc !== undefined) { try { p.setSpatialContinuousAtKey(k, d.sc); p.setSpatialAutoBezierAtKey(k, d.sa); p.setRovingAtKey(k, d.rv); } catch (e5) {} }
    if (d.lb !== undefined) { try { p.setLabelAtKey(k, d.lb); } catch (e6) {} }
    return k;
};
CW.stagger._moveKeys = function (p, idxs, delta) {
    if (Math.abs(delta) < 1e-9) return;
    var data = [], i, times = [];
    idxs.sort(function (a, b) { return a - b; });
    for (i = 0; i < idxs.length; i++) data.push(CW.stagger._grab(p, idxs[i]));
    for (i = idxs.length - 1; i >= 0; i--) p.removeKey(idxs[i]);
    for (i = 0; i < data.length; i++) times.push(data[i].t + delta);
    for (i = 0; i < data.length; i++) CW.stagger._put(p, data[i], times[i]);
    for (i = 0; i < times.length; i++) { try { p.setSelectedAtKey(p.nearestKeyIndex(times[i]), true); } catch (e) {} }
};

// the units to stagger when working on keyframes: selected keys grouped per property (one layer) or per layer (several)
CW.stagger._keyUnits = function (comp) {
    var props = comp.selectedProperties, list = [], i, j, k;
    for (i = 0; i < props.length; i++) {
        var p = props[i];
        if (p.propertyType !== PropertyType.PROPERTY) continue;
        var sk = p.selectedKeys;
        if (!sk || sk.length === 0) continue;
        list.push({ prop: p, keys: sk.slice(0), layer: p.propertyGroup(p.propertyDepth), order: i });
    }
    if (list.length === 0) return [];
    var oneLayer = true;
    for (i = 1; i < list.length; i++) if (list[i].layer.index !== list[0].layer.index) { oneLayer = false; break; }
    var units = [], byLayer = {};
    if (oneLayer) {
        for (i = 0; i < list.length; i++) units.push({ sort: list[i].order, items: [list[i]] });
    } else {
        for (i = 0; i < list.length; i++) {
            var id = list[i].layer.index;
            if (!byLayer[id]) { byLayer[id] = { sort: id, items: [] }; units.push(byLayer[id]); }
            byLayer[id].items.push(list[i]);
        }
    }
    for (i = 0; i < units.length; i++) {
        var first = null;
        for (j = 0; j < units[i].items.length; j++) {
            var it = units[i].items[j];
            for (k = 0; k < it.keys.length; k++) {
                var t = it.prop.keyTime(it.keys[k]);
                if (first === null || t < first) first = t;
            }
        }
        units[i].first = first;
    }
    return units;
};

// opts: { mode, dir (1, -1, 0), amount ("2" / "0.5s"), ease (0..3), power (0..4), shiftOnly, additive }
// Returns how many items were moved (0 when something was wrong; the reason goes through CW.say).
CW.stagger.run = function (opts) {
    var moved = 0;
    CW.run("Stagger", function () {
        var comp = CW.activeComp();
        if (!comp) { CW.say("Open a composition first."); return; }
        var step = CW.stagger.parseAmount(opts.amount, comp.frameDuration);
        if (step === null) { CW.say("The amount is not a number. Use frames (2) or seconds (0.5s)."); return; }
        var mode = opts.mode, mi;
        if (typeof mode === "string") for (mi = 0; mi < CW.stagger.MODES.length; mi++) if (CW.stagger.MODES[mi] === opts.mode) mode = mi;
        var fd = comp.frameDuration, dir = opts.dir, shiftOnly = !!opts.shiftOnly, additive = !!opts.additive;
        var snap = function (t) { return Math.round(t / fd) * fd; };
        var units = [], i, L, sel;

        if (mode === 3) {
            units = CW.stagger._keyUnits(comp);
            if (units.length === 0) { CW.say("Select some keyframes."); return; }
        } else {
            sel = comp.selectedLayers;
            for (i = 0; i < sel.length; i++) if (!sel[i].locked) units.push({ sort: sel[i].index, layer: sel[i] });
            if (units.length === 0) { CW.say("Select some unlocked layers."); return; }
        }
        units.sort(function (a, b) { return a.sort - b.sort; });
        if (dir === -1) units.reverse();
        if (dir === 0 && !shiftOnly) CW.stagger._shuffle(units);

        var n = units.length, offs = [];
        for (i = 0; i < n; i++) {
            if (shiftOnly) offs.push(dir === 0 ? snap((Math.random() * 2 - 1) * step) : step * dir);
            else offs.push(snap(step * (n - 1) * CW.stagger.ease(n > 1 ? i / (n - 1) : 0, opts.ease || 0, opts.power || 0)));
        }
        var lineUp = !shiftOnly && !additive, base, j;

        if (mode === 0) {
            base = units[0].layer.inPoint;
            for (i = 1; i < n; i++) base = Math.min(base, units[i].layer.inPoint);
            for (i = 0; i < n; i++) { L = units[i].layer; L.startTime += lineUp ? (base + offs[i] - L.inPoint) : offs[i]; moved++; }
        } else if (mode === 1) {
            base = units[0].layer.inPoint;
            for (i = 1; i < n; i++) base = Math.min(base, units[i].layer.inPoint);
            for (i = 0; i < n; i++) {
                L = units[i].layer;
                var ni = lineUp ? base + offs[i] : L.inPoint + offs[i];
                if (ni < L.outPoint) { L.inPoint = ni; moved++; }
            }
        } else if (mode === 2) {
            base = units[0].layer.outPoint;
            for (i = 1; i < n; i++) base = Math.min(base, units[i].layer.outPoint);
            for (i = 0; i < n; i++) {
                L = units[i].layer;
                var no = lineUp ? base + offs[i] : L.outPoint + offs[i];
                if (no > L.inPoint) { L.outPoint = no; moved++; }
            }
        } else if (mode === 3) {
            base = units[0].first;
            for (i = 1; i < n; i++) base = Math.min(base, units[i].first);
            for (i = 0; i < n; i++) {
                var delta = lineUp ? (base + offs[i] - units[i].first) : offs[i];
                for (j = 0; j < units[i].items.length; j++) CW.stagger._moveKeys(units[i].items[j].prop, units[i].items[j].keys, delta);
                moved++;
            }
        } else if (mode === 4) {
            if (shiftOnly) {
                for (i = 0; i < n; i++) { units[i].layer.startTime += offs[i]; moved++; }
            } else {
                // end to end; the amount is the gap (negative overlaps), easing does not apply
                var cursor = units[0].layer.inPoint;
                for (i = 0; i < n; i++) {
                    L = units[i].layer;
                    L.startTime += cursor - L.inPoint;
                    cursor = snap(L.outPoint + step);
                    moved++;
                }
            }
        }
        CW.note("Staggered " + moved + (mode === 3 ? " keyframe group" : " layer") + (moved === 1 ? "" : "s"));
    });
    return moved;
};
