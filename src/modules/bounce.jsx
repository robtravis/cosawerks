// Overshoot and bounce expressions for animated properties (what BOUNCr did).
// A decaying sine after each keyframe, scaled by the average speed of the segment that arrived
// there (so it still works after an ease, which always arrives at zero speed). One shared control set per layer drives every bounced property.
CW.bounce = {};
CW.bounce.FX = ["CW Bounce Amplitude", "CW Bounce Frequency", "CW Bounce Decay"];
CW.bounce.MARK = "// CW Bounce";

// kind: "overshoot" rings both ways around the key; "bounce" only ever rebounds one way.
//
// Each arrival (key m, m >= 2) rings by the AVERAGE speed of the segment that reached it. Not the
// speed at the key: an ease arrives at zero speed, which would leave nothing to ring with.
// The ring also starts when the motion has VISUALLY settled (within 2% of the key's value), not at
// the key's exact time: an ease slows to a stop several frames early, and starting at the key
// time left a dead gap. Linear moves settle on the key, so they behave as before.
CW.bounce.expr = function (kind) {
    var wave = kind === "bounce" ? "-Math.abs(Math.sin(freq * t * 2 * Math.PI))" : "Math.sin(freq * t * 2 * Math.PI)";
    return CW.bounce.MARK + " " + kind + "\n" +
        'var amp = effect("CW Bounce Amplitude")("Slider") / 1000;\n' +
        'var freq = effect("CW Bounce Frequency")("Slider");\n' +
        'var decay = effect("CW Bounce Decay")("Slider");\n' +
        'var fd = thisComp.frameDuration;\n' +
        'function dist(a, b) { return (a instanceof Array) ? length(a, b) : Math.abs(a - b); }\n' +
        'function arrive(m) {\n' +
        '  if (m < 2 || m > numKeys) return 0;\n' +
        '  var kt = key(m).time, endV = key(m).value, startV = key(m - 1).value;\n' +
        '  var span = dist(endV, startV), t0 = kt;\n' +
        '  var maxBack = Math.min(Math.round((kt - key(m - 1).time) / fd), 90);\n' +
        '  for (var i = 1; i <= maxBack; i++) {\n' +
        '    var tt = kt - i * fd;\n' +
        '    if (dist(valueAtTime(tt), endV) > 0.02 * span) break;\n' +
        '    t0 = tt;\n' +
        '  }\n' +
        '  if (time < t0) return 0;\n' +
        '  var t = time - t0;\n' +
        '  var v = (endV - startV) / (kt - key(m - 1).time);\n' +
        '  return v * amp * (' + wave + ') / Math.exp(decay * t);\n' +
        '}\n' +
        'var n = 0;\n' +
        'if (numKeys > 0) {\n' +
        '  n = nearestKey(time).index;\n' +
        '  if (key(n).time > time) n--;\n' +
        '}\n' +
        'value + arrive(n) + arrive(n + 1);';
};

// Make sure the layer has the three controls. Returns true when it added them.
CW.bounce.ensureControls = function (layer, d) {
    var fx = layer.property("ADBE Effect Parade");
    if (fx.property(CW.bounce.FX[0])) return false;
    var vals = [d.amp, d.freq, d.decay], e;
    for (var i = 0; i < 3; i++) {
        // configure at once: adding an effect invalidates earlier effect references
        e = layer.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
        e.name = CW.bounce.FX[i];
        e.property(1).setValue(vals[i]);
    }
    return true;
};

// Starting values for a layer's controls. Only used when the controls are first created; layers
// that already have them keep their own numbers.
CW.bounce.DEFAULTS = { amp: 50, freq: 2, decay: 10 };

// Where a property lives, as {layer, steps:[...]}, so it can be found again after the layer's
// effects change (adding an effect invalidates handles and moves the selection). A step is an
// index inside an indexed group (effects, masks) and a matchName everywhere else, because
// propertyIndex is undefined for things like Transform properties.
CW.bounce._path = function (prop) {
    var steps = [], g = prop;
    while (g && g.propertyDepth > 0) {   // the layer itself sits at depth 0 and is not a step
        var parent = g.parentProperty;
        steps.unshift(parent && parent.propertyType === PropertyType.INDEXED_GROUP ? g.propertyIndex : g.matchName);
        g = parent;
    }
    return { layer: prop.propertyGroup(prop.propertyDepth), steps: steps };
};

CW.bounce._resolve = function (path) {
    var p = path.layer;
    for (var i = 0; i < path.steps.length; i++) p = p.property(path.steps[i]);
    return p;
};

// Selected animated properties get the expression; their layers get the controls.
CW.bounce.run = function (kind) {
    CW.run("Add " + kind, function () {
        var comp = CW.activeComp();
        if (!comp) { CW.say("Open a composition and select animated properties."); return; }
        var sp = comp.selectedProperties, paths = [], skipped = 0, i;
        for (i = 0; i < sp.length; i++) {
            var p = sp[i];
            if (p.propertyType !== PropertyType.PROPERTY || !p.canSetExpression) continue;
            if (p.numKeys < 2) { skipped++; continue; }
            paths.push(CW.bounce._path(p));
        }
        if (paths.length === 0) { CW.say("Select properties that have two or more keyframes."); return; }
        for (i = 0; i < paths.length; i++) CW.bounce.ensureControls(paths[i].layer, CW.bounce.DEFAULTS);
        for (i = 0; i < paths.length; i++) CW.bounce._resolve(paths[i]).expression = CW.bounce.expr(kind);
        if (skipped) CW.say(skipped + " selected propert" + (skipped === 1 ? "y has" : "ies have") + " fewer than 2 keyframes and was skipped.");
    });
};

// Clear this tool's expressions from a property tree.
CW.bounce._clear = function (group) {
    var n = 0;
    for (var i = 1; i <= group.numProperties; i++) {
        var p = group.property(i);
        if (p.propertyType === PropertyType.PROPERTY) {
            if (p.canSetExpression && p.expression && p.expression.indexOf(CW.bounce.MARK) === 0) { p.expression = ""; n++; }
        } else n += CW.bounce._clear(p);
    }
    return n;
};

// Remove every bounce from a layer, controls included. Returns how many expressions cleared.
CW.bounce.removeFromLayer = function (layer) {
    var n = CW.bounce._clear(layer);
    var fx = layer.property("ADBE Effect Parade");
    for (var i = fx.numProperties; i >= 1; i--) {
        var name = fx.property(i).name;
        for (var k = 0; k < 3; k++) if (name === CW.bounce.FX[k]) { fx.property(i).remove(); break; }
    }
    return n;
};

CW.bounce.removeSelected = function () {
    CW.run("Remove bounce", function () {
        var comp = CW.activeComp();
        if (!comp || comp.selectedLayers.length === 0) { CW.say("Select one or more layers."); return; }
        for (var i = 0; i < comp.selectedLayers.length; i++) CW.bounce.removeFromLayer(comp.selectedLayers[i]);
    });
};
