// Slab: make every line of a text layer fill the same width, like slab typography.
//
// Each line (a paragraph: lines you separated with Enter) is either scaled (its font size changes) or tracked (the space between
// its letters changes) until it is as wide as the target. A line is scaled when it is narrower than the Tracking Threshold
// (a percentage of the target width), tracked when it is wider; a line with a single word can be set to always scale.
// Leading is a percentage of the original, and lines can be recoloured from a start to an end colour by how much they were scaled.
//
// The result is ordinary per-line character formatting, so it needs no expressions and survives anywhere. The layer remembers the
// text's original style (in its Comment) so Clear can put it back and Apply can be repeated with other settings.
CW.slab = {};
CW.slab.TAG = "CW Slab ";

// ---- the remembered original style --------------------------------------------------------------------------------------
CW.slab._readBase = function (layer) {
    var c = layer.comment || "", at = c.indexOf(CW.slab.TAG);
    if (at < 0) return null;
    var body = c.substr(at + CW.slab.TAG.length).split("\n")[0], parts = body.split(";"), out = {}, i;
    for (i = 0; i < parts.length; i++) { var kv = parts[i].split("="); if (kv.length === 2) out[kv[0]] = kv[1]; }
    if (out.size === undefined) return null;
    var f = (out.fill || "1,1,1").split(",");
    return { size: parseFloat(out.size), tracking: parseFloat(out.tracking), leading: parseFloat(out.leading), auto: out.auto === "1",
             fill: [parseFloat(f[0]), parseFloat(f[1]), parseFloat(f[2])], applyFill: out.applyFill !== "0" };
};
CW.slab._writeBase = function (layer, b) {
    var tag = CW.slab.TAG + "size=" + b.size + ";tracking=" + b.tracking + ";leading=" + b.leading + ";auto=" + (b.auto ? 1 : 0) +
              ";fill=" + b.fill.join(",") + ";applyFill=" + (b.applyFill ? 1 : 0);
    var c = layer.comment || "", at = c.indexOf(CW.slab.TAG);
    if (at >= 0) { var end = c.indexOf("\n", at); c = c.substr(0, at) + (end >= 0 ? c.substr(end) : ""); }
    layer.comment = c.length ? c + "\n" + tag : tag;
};
CW.slab._clearBase = function (layer) {
    var c = layer.comment || "", at = c.indexOf(CW.slab.TAG);
    if (at < 0) return;
    var end = c.indexOf("\n", at);
    c = c.substr(0, at) + (end >= 0 ? c.substr(end + 1) : "");
    layer.comment = c.replace(/\n+$/, "");
};

// ---- lines and measuring ------------------------------------------------------------------------------------------------
// [{ text, start, end }] for each non-empty paragraph (end is exclusive, the Enter is not part of the line)
CW.slab._lines = function (text) {
    var out = [], pos = 0, parts = text.split("\r"), i;
    for (i = 0; i < parts.length; i++) {
        if (parts[i].replace(/\s/g, "").length) out.push({ text: parts[i], start: pos, end: pos + parts[i].length });
        pos += parts[i].length + 1;
    }
    return out;
};

// How wide `str` sets at this size and tracking, in the style of `layer`: measured on a short-lived copy of the layer.
CW.slab._measurer = function (layer, base) {
    var tmp = layer.duplicate();
    tmp.enabled = false;
    var rect = function (str, size, tracking) {
        var src = tmp.property("ADBE Text Properties").property("ADBE Text Document"), d = src.value;
        d.text = str;
        src.setValue(d);
        d = src.value;
        var r = d.characterRange(0, d.text.length);
        r.fontSize = size; r.tracking = tracking; r.horizontalScale = base.hs;
        src.setValue(d);
        var q = tmp.sourceRectAtTime(0, false);
        return { w: q.width, top: q.top, h: q.height };
    };
    return {
        width: function (str, size, tracking) { return rect(str, size, tracking).w; },
        rect: rect,              // { w, top, h }: the ink of that line, top measured from its baseline (negative above)
        done: function () { tmp.remove(); }
    };
};

CW.slab._isTextLayer = function (layer) { return layer.matchName === "ADBE Text Layer"; };

// opts: { width (px, 0 = the widest line), threshold (0..100), oneWord (bool), leading (percent), recolor (bool), c1, c2 ([r,g,b] 0..1) }
// Returns a summary string, or throws with a reason.
CW.slab.apply = function (layer, opts) {
    var src = layer.property("ADBE Text Properties").property("ADBE Text Document"), d = src.value, i;
    if (!CW.hasTextRanges(d)) throw new Error(CW.NEEDS_TEXT_RANGES);
    if (d.boxText) { d.pointText = true; src.setValue(d); d = src.value; }          // slab type is point text: lines are separated by Enter
    var base = CW.slab._readBase(layer);
    if (!base) {
        base = { size: d.fontSize, tracking: d.tracking, leading: d.leading, auto: !!d.autoLeading, fill: d.fillColor, applyFill: !!d.applyFill };
        CW.slab._writeBase(layer, base);
    }
    base.hs = d.horizontalScale;
    var lines = CW.slab._lines(d.text);
    if (lines.length < 2) throw new Error("Slab needs at least two lines. Separate them with Enter.");

    var m = CW.slab._measurer(layer, base), plan = [], widest = 0, target;
    try {
        for (i = 0; i < lines.length; i++) { lines[i].w0 = m.width(lines[i].text, base.size, base.tracking); if (lines[i].w0 > widest) widest = lines[i].w0; }
        target = opts.width > 0 ? opts.width : widest;
        for (i = 0; i < lines.length; i++) {
            var L = lines[i], words = L.text.replace(/^\s+|\s+$/g, "").split(/\s+/).length, size = base.size, tracking = base.tracking, scaled;
            scaled = (opts.oneWord && words === 1) || L.w0 < target * (opts.threshold / 100);
            if (scaled) {
                size = base.size * target / L.w0;
            } else {
                var gaps = Math.max(1, L.text.length - 1);
                tracking = Math.round(base.tracking + (target - L.w0) / gaps / base.size * 1000);      // AE only takes whole numbers
            }
            // one correction pass: measure what we got and nudge it onto the target
            var got = m.width(L.text, size, tracking);
            if (got > 0 && Math.abs(got - target) > 0.5) {
                if (scaled) size = size * target / got;
                else tracking = Math.round(tracking + (target - got) / Math.max(1, L.text.length - 1) / size * 1000);
            }
            plan.push({ size: size, tracking: tracking, scale: size / base.size });
        }
    } finally { m.done(); }

    var minS = plan[0].scale, maxS = plan[0].scale;
    for (i = 1; i < plan.length; i++) { if (plan[i].scale < minS) minS = plan[i].scale; if (plan[i].scale > maxS) maxS = plan[i].scale; }

    // Leading. What reads as even is the same visible gap between one line's ink and the next, so each line's leading (the distance
    // from the baseline above) is its own ink height above the baseline, plus how far the line above hangs below its baseline,
    // plus one gap G. G starts as the average gap the original text had, and the Leading percentage moves it by that share of the
    // original leading (so 100 keeps the original look, and equal-size lines come out exactly as they were).
    var origLead = base.auto ? 1.2 * base.size : base.leading, was = [], now = [];
    var ms = CW.slab._measurer(layer, base);
    try {
        for (i = 0; i < lines.length; i++) { was.push(ms.rect(lines[i].text, base.size, base.tracking)); now.push(ms.rect(lines[i].text, plan[i].size, plan[i].tracking)); }
    } finally { ms.done(); }
    var g0 = 0;
    for (i = 1; i < lines.length; i++) g0 += origLead - (-was[i].top) - (was[i - 1].top + was[i - 1].h);
    g0 = g0 / (lines.length - 1);
    var gap = g0 + (opts.leading - 100) / 100 * origLead;
    for (i = 0; i < lines.length; i++) plan[i].lead = i === 0 ? plan[0].size * origLead / base.size : (-now[i].top) + (now[i - 1].top + now[i - 1].h) + gap;

    d = src.value;
    for (i = 0; i < lines.length; i++) {
        var r = d.characterRange(lines[i].start, lines[i].end);
        r.fontSize = plan[i].size;
        r.tracking = plan[i].tracking;
        r.autoLeading = false;
        r.leading = plan[i].lead;
        if (opts.recolor) {
            var t = maxS > minS ? (plan[i].scale - minS) / (maxS - minS) : 0;
            r.applyFill = true;
            r.fillColor = [opts.c1[0] + (opts.c2[0] - opts.c1[0]) * t, opts.c1[1] + (opts.c2[1] - opts.c1[1]) * t, opts.c1[2] + (opts.c2[2] - opts.c1[2]) * t];
        } else {
            r.fillColor = base.fill;
        }
    }
    src.setValue(d);
    return lines.length + " lines to " + Math.round(target) + " px";
};

CW.slab.clear = function (layer) {
    var base = CW.slab._readBase(layer);
    if (!base) return false;
    var src = layer.property("ADBE Text Properties").property("ADBE Text Document"), d = src.value;
    var r = d.characterRange(0, d.text.length);
    r.fontSize = base.size; r.tracking = base.tracking; r.fillColor = base.fill; r.applyFill = base.applyFill;
    if (base.auto) r.autoLeading = true; else { r.autoLeading = false; r.leading = base.leading; }
    src.setValue(d);
    CW.slab._clearBase(layer);
    return true;
};

CW.slab._targets = function (comp) {
    var out = [], i;
    for (i = 0; i < comp.selectedLayers.length; i++) if (CW.slab._isTextLayer(comp.selectedLayers[i])) out.push(comp.selectedLayers[i]);
    return out;
};

CW.slab.run = function (opts) {
    CW.run("Slab", function () {
        var comp = CW.activeComp();
        if (!comp) { CW.say("Open a composition first."); return; }
        var layers = CW.slab._targets(comp), i, msg = "";
        if (!layers.length) { CW.say("Select one or more text layers."); return; }
        for (i = 0; i < layers.length; i++) {
            try { msg = CW.slab.apply(layers[i], opts); }
            catch (e) { CW.say(layers[i].name + ": " + e.toString().replace(/^Error: /, "")); return; }
        }
        CW.note("Slab: " + (layers.length === 1 ? msg : layers.length + " text layers"));
    });
};

// settings changed in the panel: re-apply to selected layers that are already slabbed
CW.slab.update = function (opts) {
    var n = 0;
    CW.run("Slab", function () {
        var comp = CW.activeComp(), i;
        if (!comp) return;
        var layers = CW.slab._targets(comp);
        for (i = 0; i < layers.length; i++) if (CW.slab._readBase(layers[i])) { CW.slab.apply(layers[i], opts); n++; }
    });
    return n;
};

CW.slab.clearSelected = function () {
    CW.run("Clear Slab", function () {
        var comp = CW.activeComp();
        if (!comp) return;
        var layers = CW.slab._targets(comp), i, n = 0;
        for (i = 0; i < layers.length; i++) if (CW.slab.clear(layers[i])) n++;
        if (n) CW.note("Cleared slab on " + n + " text layer" + (n === 1 ? "" : "s"));
        else CW.say("Select a text layer that has been slabbed.");
    });
};
