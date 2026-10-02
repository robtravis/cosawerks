// Mask reveals: each line of a text layer is uncovered by its own mask, wiped open on the same timing as the Type tool
// (delay between lines, duration, ease, order, In and Out, all read live from the layer's Type effect).
//
// Every line gets a rectangular mask just around that line, so lines never show through one another. The masks are expressions, so
// the timing stays editable. Styles: right, left, up, down (the edge that moves), and center (opens out from the middle).
// Lines are the paragraphs you separated with Enter.
CW.reveal = {};
CW.reveal.NAME = "CW Reveal";
CW.reveal.STYLES = ["right", "left", "up", "down", "center"];
CW.reveal.PAD = 3;               // px of room around each line

// ---- where each line is --------------------------------------------------------------------------------------------------
// One band per non-empty paragraph, in layer coordinates: { x0, x1, y0, y1 }. Baselines come from each line's leading (the distance
// from the line above's baseline), and each line's own box is measured on a short-lived copy of the layer.
CW.reveal._bands = function (layer) {
    var src = layer.property("ADBE Text Properties").property("ADBE Text Document"), d = src.value, text = d.text;
    if (!CW.hasTextRanges(d)) throw new Error(CW.NEEDS_TEXT_RANGES);
    var parts = text.split("\r"), pos = 0, p, bands = [], baseline = 0, lastLead = d.leading;
    var tmp = layer.duplicate();
    tmp.enabled = false;
    try {
        // the copy carries this tool's own masks, which do not change what we measure (the source rect ignores masks)
        for (p = 0; p < parts.length; p++) {
            var len = parts[p].length, start = pos, lead = lastLead, size = d.fontSize, tracking = d.tracking, hs = d.horizontalScale;
            if (len > 0) {
                var r = d.characterRange(start, start + 1);
                size = r.fontSize; tracking = r.tracking; hs = r.horizontalScale;
                lead = r.autoLeading ? size * 1.2 : r.leading;
            }
            if (p > 0) baseline += lead;
            lastLead = lead;
            if (parts[p].replace(/\s/g, "").length) {
                var tsrc = tmp.property("ADBE Text Properties").property("ADBE Text Document"), td = tsrc.value;
                td.text = parts[p];
                tsrc.setValue(td);
                td = tsrc.value;
                var tr = td.characterRange(0, td.text.length);
                tr.fontSize = size; tr.tracking = tracking; tr.horizontalScale = hs;
                tsrc.setValue(td);
                var rect = tmp.sourceRectAtTime(0, false), pad = CW.reveal.PAD;
                bands.push({ x0: rect.left - pad, x1: rect.left + rect.width + pad, y0: baseline + rect.top - pad, y1: baseline + rect.top + rect.height + pad });
            }
            pos += len + 1;
        }
    } finally { tmp.remove(); }
    return bands;
};

// ---- the mask expression ------------------------------------------------------------------------------------------------
// The feather is read from the mask itself (so it can be changed in AE's own UI too). Only the moving edge is soft: horizontal wipes
// feather across, vertical wipes feather down, and the rectangle is pushed out by the feather on the other sides and at both ends of
// the travel, so a line still opens completely and is fully hidden at the start.
CW.reveal._expr = function (style, band, k, n) {
    var edge = "var x0 = " + band.x0 + ", x1 = " + band.x1 + ", y0 = " + band.y0 + ", y1 = " + band.y1 + ", w = x1 - x0, h = y1 - y0, r = 1 - a;\n" +
               "var fe = thisProperty.propertyGroup(1).maskFeather, fx = fe[0], fy = fe[1];\n";
    var box;
    if (style === "left")        box = "var l = (x1 + fx) - (w + 2 * fx) * r, rt = x1 + 2 * fx, t = y0, b = y1;";
    else if (style === "up")     box = "var l = x0, rt = x1, t = (y1 + fy) - (h + 2 * fy) * r, b = y1 + 2 * fy;";
    else if (style === "down")   box = "var l = x0, rt = x1, t = y0 - 2 * fy, b = (y0 - fy) + (h + 2 * fy) * r;";
    else if (style === "center") box = "var cx = (x0 + x1) / 2, hw = (w / 2 + 2 * fx) * r, l = cx - hw, rt = cx + hw, t = y0, b = y1;";
    else                         box = "var l = x0 - 2 * fx, rt = (x0 - fx) + (w + 2 * fx) * r, t = y0, b = y1;";
    return "// " + CW.reveal.NAME + " " + style + "\n" + "var i = " + k + ", T = " + n + ";\n" + CW.typefx.timingCode() + edge + box + "\n" +
        "createPath([[l, t], [rt, t], [rt, b], [l, b]], [[0, 0], [0, 0], [0, 0], [0, 0]], [[0, 0], [0, 0], [0, 0], [0, 0]], true);";
};

// the feather as [x, y] for a style: soft across horizontal wipes, soft down vertical ones
CW.reveal._featherFor = function (style, f) { return (style === "up" || style === "down") ? [0, f] : [f, 0]; };

CW.reveal.removeMasks = function (layer) {
    var g = layer.property("ADBE Mask Parade"), i, n = 0;
    if (!g) return 0;
    for (i = g.numProperties; i >= 1; i--) if (g.property(i).name.indexOf(CW.reveal.NAME) === 0) { g.property(i).remove(); n++; }
    return n;
};

// Build the masks (the Type effect must already be on the layer: it carries the timing). opts: { style, feather (px, default 0) }
CW.reveal.build = function (comp, layer, opts) {
    var bands = CW.reveal._bands(layer), i, style = opts.style || "right", f = opts.feather || 0;
    if (bands.length === 0) throw new Error("There is no text to reveal.");
    CW.reveal.removeMasks(layer);
    var parade = function () { return layer.property("ADBE Mask Parade"); };
    for (i = 0; i < bands.length; i++) {
        parade().addProperty("ADBE Mask Atom");
        var at = parade().numProperties;
        parade().property(at).name = CW.reveal.NAME + " " + (i + 1);
        parade().property(at).property("ADBE Mask Feather").setValue(CW.reveal._featherFor(style, f));
        parade().property(at).property("ADBE Mask Shape").expression = CW.reveal._expr(style, bands[i], i + 1, bands.length);
    }
    return bands.length;
};

// The feather the layer's masks have now (px), 0 when there are none.
CW.reveal.featherOf = function (layer) {
    var g = layer.property("ADBE Mask Parade"), i;
    if (!g) return 0;
    for (i = 1; i <= g.numProperties; i++) if (g.property(i).name.indexOf(CW.reveal.NAME) === 0) { var v = g.property(i).property("ADBE Mask Feather").value; return Math.max(v[0], v[1]); }
    return 0;
};
CW.reveal.hasMasks = function (layer) {
    var g = layer.property("ADBE Mask Parade"), i;
    if (!g) return false;
    for (i = 1; i <= g.numProperties; i++) if (g.property(i).name.indexOf(CW.reveal.NAME) === 0) return true;
    return false;
};
// Change the feather of this layer's reveal masks.
CW.reveal.setFeather = function (layer, f) {
    var g = layer.property("ADBE Mask Parade"), i, style = "right";
    for (i = 1; i <= g.numProperties; i++) {
        if (g.property(i).name.indexOf(CW.reveal.NAME) !== 0) continue;
        var ex = g.property(i).property("ADBE Mask Shape").expression, m = /^\/\/ CW Reveal (\w+)/.exec(ex);
        if (m) style = m[1];
        g.property(i).property("ADBE Mask Feather").setValue(CW.reveal._featherFor(style, f));
    }
};

CW.reveal._textLayers = function (comp) { return CW.typefx._textLayers(comp); };

CW.reveal.run = function (opts) {
    CW.run("Mask reveal", function () {
        var comp = CW.activeComp();
        if (!comp) { CW.say("Open a composition first."); return; }
        var layers = CW.reveal._textLayers(comp), i, n = 0;
        if (!layers.length) { CW.say("Select one or more text layers."); return; }
        for (i = 0; i < layers.length; i++) {
            try {
                CW.typefx._ensureEffect(comp, layers[i], { delay: opts.delay, dur: opts.dur, shift: opts.shift, ease: opts.ease, animIn: opts.animIn, animOut: opts.animOut,
                                                           reverse: opts.reverse, random: opts.random, by: 3, preset: "fade" });
                n = CW.reveal.build(comp, layers[i], opts);
            } catch (e) { CW.say(layers[i].name + ": " + e.toString().replace(/^Error: /, "")); return; }
        }
        for (i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        for (i = 0; i < layers.length; i++) layers[i].selected = true;
        CW.note("Revealing " + (layers.length === 1 ? n + " line" + (n === 1 ? "" : "s") : layers.length + " text layers"));
    });
};

// a new style on layers that are already revealed (the timing is live through the Type effect, so only the shapes change)
CW.reveal.update = function (opts) {
    var n = 0;
    CW.run("Mask reveal", function () {
        var comp = CW.activeComp(), i;
        if (!comp) return;
        var layers = CW.reveal._textLayers(comp);
        for (i = 0; i < layers.length; i++) {
            var g = layers[i].property("ADBE Mask Parade"), has = false, k;
            for (k = 1; k <= g.numProperties; k++) if (g.property(k).name.indexOf(CW.reveal.NAME) === 0) has = true;
            if (has && CW.typefx.isTyped(layers[i])) { CW.reveal.build(comp, layers[i], opts); n++; }
        }
    });
    return n;
};

CW.reveal.removeSelected = function () {
    CW.run("Remove mask reveal", function () {
        var comp = CW.activeComp();
        if (!comp) return;
        var layers = CW.reveal._textLayers(comp), i, n = 0;
        for (i = 0; i < layers.length; i++) {
            var m = CW.reveal.removeMasks(layers[i]);
            if (m && CW.typefx.isTyped(layers[i]) && !CW.typefx._animIndex(layers[i])) CW.typefx.fx(layers[i]).remove();      // the effect only served the masks
            n += m;
        }
        CW.note("Removed " + n + " reveal mask" + (n === 1 ? "" : "s"));
    });
};
