// Type animation: staggered per-character (or word, or line) animation on text layers, with look presets.
//
// A text layer gets one animator ("Cosawerks Type") holding the look (opacity, position, scale, ...) and an Expression Selector
// that decides, for each character, how far along the animation it is. The timing lives in a "Type" effect on the layer, so delay,
// duration, ease, order and direction stay editable (and live) after the build. Nothing is baked.
CW.typefx = {};
CW.typefx.NAME = "Cosawerks Type";
CW.typefx.MARK = "// CW Type";
CW.typefx.FX = "Pseudo/cwType0003";             // bump with tools/gen-ffx.py whenever the effect layout changes
CW.typefx.PRESET = "Cosawerks Type.ffx";
CW.typefx.C = { animIn: "Animate In", animOut: "Animate Out", by: "By", ease: "Ease", delay: "Delay", dur: "Duration", shift: "Shift", rev: "Reverse Order", rnd: "Random Order" };

// The looks. props: [animator property match name, value]. dly / dur: the timing this look wants by default (frames).
CW.typefx.PRESETS = [
    { id: "fade",       name: "Fade",        props: [["ADBE Text Opacity", 0]] },
    { id: "fadeup",     name: "Fade Up",     props: [["ADBE Text Position 3D", [0, 30, 0]], ["ADBE Text Opacity", 0]] },
    { id: "fadedown",   name: "Fade Down",   props: [["ADBE Text Position 3D", [0, -30, 0]], ["ADBE Text Opacity", 0]] },
    { id: "slideleft",  name: "Slide Left",  props: [["ADBE Text Position 3D", [60, 0, 0]], ["ADBE Text Opacity", 0]] },
    { id: "slideright", name: "Slide Right", props: [["ADBE Text Position 3D", [-60, 0, 0]], ["ADBE Text Opacity", 0]] },
    { id: "pop",        name: "Pop",         props: [["ADBE Text Scale 3D", [0, 0, 0]], ["ADBE Text Opacity", 0]] },
    { id: "rotate",     name: "Rotate In",   props: [["ADBE Text Rotation", 90], ["ADBE Text Opacity", 0]] },
    { id: "blur",       name: "Blur In",     props: [["ADBE Text Blur", [20, 20]], ["ADBE Text Opacity", 0]] },
    { id: "spread",     name: "Spread",      props: [["ADBE Text Tracking Amount", 60], ["ADBE Text Opacity", 0]] },
    { id: "typeon",     name: "Type On",     props: [["ADBE Text Opacity", 0]], dly: 2, dur: 1 }
];
// The animator properties a look can use.
CW.typefx.PROPS = [["ADBE Text Position 3D", "0,0,0"], ["ADBE Text Anchor Point 3D", "0,0,0"], ["ADBE Text Scale 3D", "100,100,100"], ["ADBE Text Rotation", "0"],
                   ["ADBE Text Opacity", "100"], ["ADBE Text Blur", "0,0"], ["ADBE Text Tracking Amount", "0"], ["ADBE Text Skew", "0"], ["ADBE Text Skew Axis", "0"],
                   ["ADBE Text Rotation X", "0"], ["ADBE Text Rotation Y", "0"], ["ADBE Text Fill Opacity", "100"], ["ADBE Text Stroke Opacity", "100"]];   // [match name, default]
// Looks that reveal with masks instead of an animator: "mask:right" / "left" / "up" / "down" / "center" (see reveal.jsx).
CW.typefx.MASK_LOOKS = [["mask:right", "Mask Wipe Right"], ["mask:left", "Mask Wipe Left"], ["mask:up", "Mask Wipe Up"], ["mask:down", "Mask Wipe Down"], ["mask:center", "Mask Open from Centre"]];
CW.typefx.maskStyle = function (id) { return (typeof id === "string" && id.indexOf("mask:") === 0) ? id.substr(5) : null; };
CW.typefx.preset = function (id) {
    var P = CW.typefx.PRESETS;
    for (var i = 0; i < P.length; i++) if (P[i].id === id) return P[i];
    return P[1];
};

// "Linear" first, then the RT eases: the order of the Ease dropdown in the effect.
CW.typefx.easeNames = function () {
    var out = ["Linear"], R = CW.ease && CW.ease.RT ? CW.ease.RT : [];
    for (var i = 0; i < R.length; i++) out.push(R[i].name);
    return out;
};
CW.typefx.easeIndex = function (name) {
    var n = CW.typefx.easeNames();
    for (var i = 0; i < n.length; i++) if (n[i] === name) return i + 1;
    return 1;
};

CW.typefx._ctl = function (name) { return 'thisLayer.effect(' + CW.pathx.q(CW.typefx.FX) + ')(' + CW.pathx.q(name) + ')'; };

// Which unit this character belongs to and how many units there are, for By = 1 character, 2 word, 3 line. The selector always works
// on characters (spaces included); words and lines are worked out from the text, so By can be a dropdown in the effect.
// Uses: by, s (the layer's text), textIndex, textTotal. Sets: i (1-based unit number) and T (unit count).
CW.typefx.unitCode = function () {
    return 'var i = textIndex, T = textTotal;\n' +
        'if (by != 1) {\n' +
        '  var k, ch, brk, inU = false, cnt = 0;\n' +
        '  i = 0;\n' +
        '  for (k = 0; k < s.length; k++) {\n' +
        '    ch = s.charAt(k);\n' +
        '    brk = by == 2 ? (ch == " " || ch == "\\t" || ch == "\\r" || ch == "\\n" || ch == "\\u0003") : (ch == "\\r" || ch == "\\n" || ch == "\\u0003");\n' +
        '    if (!brk && !inU) { cnt++; inU = true; }\n' +
        '    if (brk) inU = false;\n' +
        '    if (k == textIndex - 1) i = cnt;\n' +
        '  }\n' +
        '  T = Math.max(1, cnt); i = Math.max(1, i);\n' +
        '}\n';
};

// How far along (0..1 applied) each character is: delay by index, then an eased run of `Duration` frames.
// The timing every Type tool shares (the selector and the mask reveals). Expects `i` (1-based unit number) and `T` (unit count) to be
// defined first; leaves `a`: 0 when the unit has fully arrived and 1 when it has not started (or has fully left).
CW.typefx.timingCode = function () {
    var C = CW.typefx.C, c = CW.typefx._ctl, R = CW.ease && CW.ease.RT ? CW.ease.RT : [], tab = ["[0, 0, 1, 1]"], i;
    for (i = 0; i < R.length; i++) tab.push("[" + R[i].v.join(", ") + "]");
    return 'var dl = ' + c(C.delay) + ', du = Math.max(1, ' + c(C.dur) + '), sh = ' + c(C.shift) + ', anIn = ' + c(C.animIn) + ' == 1, anOut = ' + c(C.animOut) + ' == 1, ez = Math.round(' + c(C.ease) + ');\n' +
        'var rev = ' + c(C.rev) + ' == 1, rnd = ' + c(C.rnd) + ' == 1;\n' +
        'var EZ = [' + tab.join(", ") + '];\n' +
        'function bez(x1, y1, x2, y2, x) {\n' +
        '  if (x <= 0) return 0; if (x >= 1) return 1;\n' +
        '  var lo = 0, hi = 1, t = x, k, m;\n' +
        '  for (k = 0; k < 24; k++) { m = 1 - t; var xt = 3 * m * m * t * x1 + 3 * m * t * t * x2 + t * t * t; if (xt < x) lo = t; else hi = t; t = (lo + hi) / 2; }\n' +
        '  m = 1 - t; return 3 * m * m * t * y1 + 3 * m * t * t * y2 + t * t * t;\n}\n' +
        'if (rev) i = T + 1 - i;\n' +
        'var idx = i - 1;\n' +
        'if (rnd) { seedRandom(i * 7 + 3, true); idx = Math.floor(random() * T); }\n' +
        'var fd = thisComp.frameDuration;\n' +
        'var span = ((T - 1) * dl + du) * fd;\n' +
        'function amount(base) {\n' +
        '  var p = Math.max(0, Math.min(1, (time - base - (sh + idx * dl) * fd) / (du * fd)));\n' +
        '  var q = EZ[Math.max(1, Math.min(EZ.length, ez)) - 1];\n' +
        '  return bez(q[0], q[1], q[2], q[3], p);\n}\n' +
        'var aIn = anIn ? 1 - amount(inPoint) : 0;\n' +
        'var aOut = anOut ? amount(outPoint - span) : 0;\n' +
        'var a = Math.max(aIn, aOut);\n';
};

// How far along (0..1 applied) each character is: delay by index, then an eased run of `Duration` frames.
CW.typefx.expr = function () {
    var C = CW.typefx.C, c = CW.typefx._ctl;
    return CW.typefx.MARK + " selector\n" +
        'var by = ' + c(C.by) + ', s = "" + thisLayer.text.sourceText;\n' + CW.typefx.unitCode() +
        CW.typefx.timingCode() +
        'a * value;';
};

CW.typefx.isText = function (layer) { return layer.matchName === "ADBE Text Layer"; };
CW.typefx.fx = function (layer) { var p = layer.property("ADBE Effect Parade"); return p ? p.property(CW.typefx.FX) : null; };
CW.typefx.isTyped = function (layer) { return CW.typefx.isText(layer) && !!CW.typefx.fx(layer); };
CW.typefx.ctl = function (layer, key) { return CW.typefx.fx(layer).property(CW.typefx.C[key]); };

// the animator's index in the layer's animators group, or 0
CW.typefx._animIndex = function (layer) {
    var g = layer.property("ADBE Text Properties").property("ADBE Text Animators"), i;
    for (i = 1; i <= g.numProperties; i++) if (g.property(i).name.indexOf(CW.typefx.NAME) === 0) return i;
    return 0;
};
CW.typefx._anim = function (layer) {
    return layer.property("ADBE Text Properties").property("ADBE Text Animators").property(CW.typefx._animIndex(layer));
};

// (Re)build just the animator: the look, the Based On unit, and the selector expression.
CW.typefx._buildAnimator = function (layer, look) {
    var groups = function () { return layer.property("ADBE Text Properties").property("ADBE Text Animators"); };
    var at = CW.typefx._animIndex(layer);
    if (at) groups().property(at).remove();
    groups().addProperty("ADBE Text Animator");
    var n = groups().numProperties;
    groups().property(n).name = CW.typefx.NAME + " - " + look.name;
    var an = function () { return groups().property(n); };
    an().property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
    var sel = function () { var s = an().property("ADBE Text Selectors"); return s.property(s.numProperties); };
    sel().property("ADBE Text Range Type2").setValue(1);
    sel().property("ADBE Text Expressible Amount").expression = CW.typefx.expr();
    var P = look.props, i;
    for (i = 0; i < P.length; i++) {
        an().property("ADBE Text Animator Properties").addProperty(P[i][0]);
        an().property("ADBE Text Animator Properties").property(P[i][0]).setValue(P[i][1]);
    }
};

// A look from build/update options: your own saved one (props + lookName) or a built-in (preset id).
CW.typefx._look = function (opts) {
    if (opts.props) return { name: opts.lookName || "Custom", props: opts.props };
    var pr = CW.typefx.preset(opts.preset);
    return { name: pr.name, props: pr.props };
};

// opts: { preset, by (1 character, 2 word, 3 line), delay, dur, shift, ease (name), animIn (default true), animOut, reverse, random }
// Put the Type effect on the layer (or bring an existing one to these settings), without touching any animator.
CW.typefx._ensureEffect = function (comp, layer, opts) {
    // already there: keep the effect (and any keyframes on its controls) and bring it to these settings
    if (!CW.typefx.isTyped(layer)) {
        var pf = CW.presetFile(CW.typefx.PRESET);
        if (!pf) throw new Error("Cosawerks Type.ffx is missing from the panel's presets folder. Run ./install-cep.sh again");
        for (var k = 1; k <= comp.numLayers; k++) comp.layer(k).selected = false;
        layer.selected = true;
        layer.applyPreset(pf);
    }
    var pr = opts.props ? {} : CW.typefx.preset(opts.preset);
    var set = function (key, v) { CW.setValue(CW.typefx.ctl(layer, key), v); };
    set("animIn", opts.animIn === false ? 0 : 1); set("animOut", opts.animOut ? 1 : 0); set("by", opts.by || 1); set("ease", CW.typefx.easeIndex(opts.ease || "50-80"));
    set("delay", opts.delay !== undefined ? opts.delay : (pr.dly !== undefined ? pr.dly : 3));
    set("dur", opts.dur !== undefined ? opts.dur : (pr.dur !== undefined ? pr.dur : 15));
    set("shift", opts.shift || 0); set("rev", opts.reverse ? 1 : 0); set("rnd", opts.random ? 1 : 0);
};

CW.typefx._removeAnimator = function (layer) {
    var at = CW.typefx._animIndex(layer);
    if (at) layer.property("ADBE Text Properties").property("ADBE Text Animators").property(at).remove();
    return at ? 1 : 0;
};

// opts.preset is a look id; "mask:..." ids build masks (opts.feather px) instead of an animator.
CW.typefx.build = function (comp, layer, opts) {
    var ms = CW.typefx.maskStyle(opts.preset);
    if (!CW.typefx.isTyped(layer)) CW.typefx.remove(layer);
    CW.typefx._ensureEffect(comp, layer, opts);
    if (ms) {
        CW.typefx._removeAnimator(layer);
        CW.reveal.build(comp, layer, { style: ms, feather: opts.feather || 0 });
    } else {
        CW.reveal.removeMasks(layer);
        CW.typefx._buildAnimator(layer, CW.typefx._look(opts));
    }
};

CW.typefx.remove = function (layer) {
    var n = 0, at = CW.typefx._animIndex(layer);
    if (CW.reveal) n += CW.reveal.removeMasks(layer);          // the reveal masks read this effect
    if (at) { layer.property("ADBE Text Properties").property("ADBE Text Animators").property(at).remove(); n++; }
    if (CW.typefx.fx(layer)) { CW.typefx.fx(layer).remove(); n++; }
    return n;
};

CW.typefx._textLayers = function (comp) {
    var out = [], i;
    for (i = 0; i < comp.selectedLayers.length; i++) if (CW.typefx.isText(comp.selectedLayers[i])) out.push(comp.selectedLayers[i]);
    return out;
};

CW.typefx.run = function (opts) {
    CW.run("Type animation", function () {
        var comp = CW.activeComp();
        if (!comp) { CW.say("Open a composition first."); return; }
        var layers = CW.typefx._textLayers(comp), i;
        if (!layers.length) { CW.say("Select one or more text layers."); return; }
        for (i = 0; i < layers.length; i++) CW.typefx.build(comp, layers[i], opts);
        for (i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        for (i = 0; i < layers.length; i++) layers[i].selected = true;
        CW.note("Animated " + layers.length + " text layer" + (layers.length === 1 ? "" : "s"));
    });
};

// Live changes to the selected typed layers. opts: preset, by, delay, dur, shift, ease (name), animIn, animOut, reverse, random. Returns the count.
CW.typefx.update = function (opts) {
    var n = 0;
    CW.run("Update type animation", function () {
        var comp = CW.activeComp();
        if (!comp) return;
        var layers = CW.typefx._textLayers(comp), i;
        for (i = 0; i < layers.length; i++) {
            var L = layers[i];
            if (!CW.typefx.isTyped(L)) continue;
            var map = [["by", "by"], ["delay", "delay"], ["dur", "dur"], ["shift", "shift"], ["animIn", "animIn"], ["animOut", "animOut"], ["reverse", "rev"], ["random", "rnd"]];
            for (var k = 0; k < map.length; k++) {
                var v = opts[map[k][0]];
                if (v === undefined) continue;
                if (typeof v === "boolean") v = v ? 1 : 0;
                CW.setValue(CW.typefx.ctl(L, map[k][1]), v);
            }
            if (opts.ease !== undefined) CW.setValue(CW.typefx.ctl(L, "ease"), CW.typefx.easeIndex(opts.ease));
            if (opts.preset !== undefined || opts.props) {
                var mstyle = CW.typefx.maskStyle(opts.preset), hasAnim = CW.typefx._animIndex(L) > 0, hasMask = CW.reveal.hasMasks(L);
                if (mstyle) {
                    CW.typefx._removeAnimator(L);
                    CW.reveal.build(comp, L, { style: mstyle, feather: opts.feather !== undefined ? opts.feather : CW.reveal.featherOf(L) });
                } else if (hasAnim || hasMask) {
                    if (hasMask) CW.reveal.removeMasks(L);
                    CW.typefx._buildAnimator(L, CW.typefx._look(opts));
                }
            } else if (opts.feather !== undefined && CW.reveal.hasMasks(L)) {
                CW.reveal.setFeather(L, opts.feather);
            }
            n++;
        }
    });
    return n;
};

// The look and timing of the first selected typed layer as "look name;timing...;props", for saving as a preset, or "null".
// Props are "matchName=v1,v2" joined by "|".
CW.typefx.readString = function () {
    var comp = CW.activeComp(), i, k;
    if (!comp) return "null";
    var layers = CW.typefx._textLayers(comp);
    for (i = 0; i < layers.length; i++) {
        var L = layers[i];
        if (!CW.typefx.isTyped(L) || !CW.typefx._animIndex(L)) continue;
        // The animator's property group reports every possible property (103), so ask for each one we support by name.
        var an = CW.typefx._anim(L), ap = an.property("ADBE Text Animator Properties"), props = [];
        for (k = 0; k < CW.typefx.PROPS.length; k++) {
            // every supported property answers, added or not, so keep the ones that differ from their default
            var v = ap.property(CW.typefx.PROPS[k][0]).value, txt = (v instanceof Array ? v.join(",") : String(v));
            if (txt !== CW.typefx.PROPS[k][1]) props.push(CW.typefx.PROPS[k][0] + "=" + txt);
        }
        var nm = an.name.substr(CW.typefx.NAME.length + 3), names = CW.typefx.easeNames();
        var t = ["name=" + nm, "delay=" + CW.typefx.ctl(L, "delay").value, "dur=" + CW.typefx.ctl(L, "dur").value, "shift=" + CW.typefx.ctl(L, "shift").value,
                 "ease=" + names[CW.typefx.ctl(L, "ease").value - 1], "in=" + CW.typefx.ctl(L, "animIn").value, "out=" + CW.typefx.ctl(L, "animOut").value, "rev=" + CW.typefx.ctl(L, "rev").value,
                 "rnd=" + CW.typefx.ctl(L, "rnd").value, "by=" + CW.typefx.ctl(L, "by").value];
        return t.join(";") + ";;" + props.join("|");
    }
    return "null";
};

CW.typefx.removeSelected = function () {
    CW.run("Remove type animation", function () {
        var comp = CW.activeComp();
        if (!comp) return;
        var layers = CW.typefx._textLayers(comp), i, n = 0;
        for (i = 0; i < layers.length; i++) n += CW.typefx.remove(layers[i]);
        CW.note("Removed " + n + " part" + (n === 1 ? "" : "s"));
    });
};
