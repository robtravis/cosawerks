// Illustrator-style align and distribute. Boxes are [l,t,r,b] in composition space.
CW.align = {};
CW.align.state = { mode: "sel", group: false, anchors: false };   // mode: comp | outside | sel | key

CW.align.union = function (boxes) {
    var u = [Infinity, Infinity, -Infinity, -Infinity];
    for (var i = 0; i < boxes.length; i++) {
        var b = boxes[i];
        if (b[0] < u[0]) u[0] = b[0]; if (b[1] < u[1]) u[1] = b[1];
        if (b[2] > u[2]) u[2] = b[2]; if (b[3] > u[3]) u[3] = b[3];
    }
    return u;
};

// Moves that put each box on ref. op: left hc right top vc bottom center.
// outside: left/right/top/bottom put the box beyond that edge of ref instead of against it.
CW.align.alignDeltas = function (boxes, op, ref, outside) {
    var out = [];
    for (var i = 0; i < boxes.length; i++) {
        var b = boxes[i], dx = 0, dy = 0;
        var cx = (ref[0] + ref[2]) / 2 - (b[0] + b[2]) / 2, cy = (ref[1] + ref[3]) / 2 - (b[1] + b[3]) / 2;
        if (op === "left") dx = outside ? ref[0] - b[2] : ref[0] - b[0];
        else if (op === "right") dx = outside ? ref[2] - b[0] : ref[2] - b[2];
        else if (op === "top") dy = outside ? ref[1] - b[3] : ref[1] - b[1];
        else if (op === "bottom") dy = outside ? ref[3] - b[1] : ref[3] - b[3];
        else if (op === "hc") dx = cx;
        else if (op === "vc") dy = cy;
        else if (op === "center") { dx = cx; dy = cy; }
        out.push([dx, dy]);
    }
    return out;
};

// Spread edges (or centers) evenly between the two extremes; the extremes stay put.
// op: left hc right (horizontal) or top vc bottom (vertical).
CW.align.distDeltas = function (boxes, op) {
    var horiz = (op === "left" || op === "hc" || op === "right"), n = boxes.length, keys = [], i;
    for (i = 0; i < n; i++) {
        var b = boxes[i], k;
        if (horiz) k = op === "left" ? b[0] : op === "right" ? b[2] : (b[0] + b[2]) / 2;
        else k = op === "top" ? b[1] : op === "bottom" ? b[3] : (b[1] + b[3]) / 2;
        keys.push({ i: i, k: k });
    }
    keys.sort(function (a, c) { return a.k - c.k; });
    var first = keys[0].k, last = keys[n - 1].k, out = [];
    for (i = 0; i < n; i++) out.push([0, 0]);
    for (i = 0; i < n; i++) {
        var want = first + i * (last - first) / (n - 1), d = want - keys[i].k;
        out[keys[i].i] = horiz ? [d, 0] : [0, d];
    }
    return out;
};

// Equal gaps between boxes along an axis ("h" or "v"). gap null = even out the current span.
// With a fixed gap, boxes[anchorIdx] stays put and the rest are laid out around it in order.
CW.align.spaceDeltas = function (boxes, axis, gap, anchorIdx) {
    var lo = axis === "h" ? 0 : 1, hi = axis === "h" ? 2 : 3, n = boxes.length, i;
    var order = [];
    for (i = 0; i < n; i++) order.push(i);
    order.sort(function (a, b) { return boxes[a][lo] - boxes[b][lo]; });
    var out = [];
    for (i = 0; i < n; i++) out.push([0, 0]);
    var put = function (idx, d) { out[idx] = axis === "h" ? [d, 0] : [0, d]; };
    var p, cursor;
    if (gap === null) {
        var sizes = 0;
        for (i = 0; i < n; i++) sizes += boxes[i][hi] - boxes[i][lo];
        var span = boxes[order[n - 1]][hi] - boxes[order[0]][lo];
        var g = (span - sizes) / (n - 1);
        cursor = boxes[order[0]][lo];
        for (i = 0; i < n; i++) {
            put(order[i], cursor - boxes[order[i]][lo]);
            cursor += (boxes[order[i]][hi] - boxes[order[i]][lo]) + g;
        }
    } else {
        var pos = 0;
        for (i = 0; i < n; i++) if (order[i] === anchorIdx) pos = i;
        cursor = boxes[anchorIdx][hi] + gap;
        for (i = pos + 1; i < n; i++) {
            p = order[i];
            put(p, cursor - boxes[p][lo]);
            cursor += (boxes[p][hi] - boxes[p][lo]) + gap;
        }
        cursor = boxes[anchorIdx][lo] - gap;
        for (i = pos - 1; i >= 0; i--) {
            p = order[i];
            put(p, cursor - boxes[p][hi]);
            cursor -= (boxes[p][hi] - boxes[p][lo]) + gap;
        }
    }
    return out;
};

// ---- AE-facing ---------------------------------------------------------

// spec: { kind:"align", op } | { kind:"dist", op } | { kind:"space", axis, gap }
CW.align.run = function (spec) {
    CW.run("Align", function () {
        var comp = CW.activeComp();
        if (!comp || comp.selectedLayers.length === 0) { CW.say("Select one or more layers."); return; }
        var st = CW.align.state, t = comp.time, sel = comp.selectedLayers;
        var items = [], skipped = [], i;

        for (i = 0; i < sel.length; i++) {
            var layer = sel[i], why = CW.unsupported(layer);
            if (!why && !CW.canShift(layer)) why = "position has an expression";
            if (why) { skipped.push(layer.name + ": " + why); continue; }
            var s = CW.snap(layer, t), box;
            if (st.anchors) {
                var a = CW.m.toComp(s, s.anchor);
                box = [a[0], a[1], a[0], a[1]];
            } else {
                var rect = CW.rectOf(layer, t);
                if (!rect) { skipped.push(layer.name + ": no bounds"); continue; }
                box = CW.m.rectBox(s, rect);
            }
            items.push({ layer: layer, snap: s, box: box, dx: 0, dy: 0 });
        }

        var need;   // plain if/else: the nested ?: version evaluated to 3 for every kind in AE
        if (spec.kind === "align") need = (st.mode === "comp" || st.mode === "outside") ? 1 : 2;
        else if (spec.kind === "dist") need = 3;
        else need = (spec.gap === null) ? 3 : 2;
        if (items.length < need) {
            CW.say("This needs at least " + need + " usable layer(s)." + (skipped.length ? "\n\nSkipped:\n" + skipped.join("\n") : ""));
            return;
        }

        // Key layer = the first layer you selected: selectedLayers comes back in selection order
        // (verified in AE), and items keeps that order.
        var keyIdx = 0;

        var movers = [], boxes = [], deltas, j;
        if (spec.kind === "align") {
            var ref, outside = false;
            if (st.mode === "comp" || st.mode === "outside") { ref = [0, 0, comp.width, comp.height]; outside = st.mode === "outside"; }
            else if (st.mode === "key") ref = items[keyIdx].box;
            else {
                var all = [];
                for (i = 0; i < items.length; i++) all.push(items[i].box);
                ref = CW.align.union(all);
            }
            for (i = 0; i < items.length; i++) {
                if (st.mode === "key" && i === keyIdx) continue;
                movers.push(items[i]); boxes.push(items[i].box);
            }
            if (st.group && st.mode !== "sel") {
                var one = CW.align.alignDeltas([CW.align.union(boxes)], spec.op, ref, outside)[0];
                deltas = [];
                for (j = 0; j < movers.length; j++) deltas.push(one);
            } else deltas = CW.align.alignDeltas(boxes, spec.op, ref, outside);
        } else {
            movers = items;
            for (i = 0; i < items.length; i++) boxes.push(items[i].box);
            deltas = spec.kind === "dist" ? CW.align.distDeltas(boxes, spec.op)
                   : CW.align.spaceDeltas(boxes, spec.axis, spec.gap, st.mode === "key" ? keyIdx : CW.align._firstIdx(boxes, spec.axis));
        }

        for (j = 0; j < movers.length; j++) { movers[j].dx = deltas[j][0]; movers[j].dy = deltas[j][1]; }
        CW.applyCompDeltas(movers);
        if (skipped.length) CW.say("Skipped " + skipped.length + " layer(s):\n" + skipped.join("\n"));
    });
};

// Index of the box that starts first along an axis (the one that stays put with a fixed gap).
CW.align._firstIdx = function (boxes, axis) {
    var lo = axis === "h" ? 0 : 1, best = 0;
    for (var i = 1; i < boxes.length; i++) if (boxes[i][lo] < boxes[best][lo]) best = i;
    return best;
};
