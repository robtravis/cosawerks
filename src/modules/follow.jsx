// Follow Path (the Wayfinder idea): layers ride a path. One set of controls on the path's layer drives them all.
CW.follow = {};
CW.follow.MARK = "// CW Follow";
CW.follow.FX = ["CW Path Offset", "CW Path Spacing", "CW Path Orient", "CW Path Angle", "CW Path Loop"];
CW.follow.LINK = "CW Path Link";

// n followers: spread evenly along an open path (first at the start, last at the end), or around a closed one.
CW.follow.defaultSpacing = function (n, closed) {
    if (n <= 1) return 0;
    return closed ? 100 / n : 100 / (n - 1);
};

CW.follow.posExpr = function (ref, index) {
    return CW.follow.MARK + " position\n" + CW.pathx.prelude(ref, CW.pathx.linkExpr(CW.follow.LINK)) +
        'var off = L.effect("CW Path Offset")("Slider") / 100, sp = L.effect("CW Path Spacing")("Slider") / 100;\n' +
        'var loop = L.effect("CW Path Loop")("Checkbox") == 1;\n' +
        'var u = off + ' + index + ' * sp;\n' +
        'u = loop ? ((u % 1) + 1) % 1 : Math.max(0, Math.min(1, u));\n' +
        CW.pathx.placeExpr +
        'thisLayer.threeDLayer ? [pos[0], pos[1], value[2]] : [pos[0], pos[1]];';
};

CW.follow.rotExpr = function (ref, index) {
    return CW.follow.MARK + " rotation\n" + CW.pathx.prelude(ref, CW.pathx.linkExpr(CW.follow.LINK)) +
        'if (L.effect("CW Path Orient")("Checkbox") != 1) { value; } else {\n' +
        'var off = L.effect("CW Path Offset")("Slider") / 100, sp = L.effect("CW Path Spacing")("Slider") / 100;\n' +
        'var loop = L.effect("CW Path Loop")("Checkbox") == 1;\n' +
        'var u = off + ' + index + ' * sp;\n' +
        'u = loop ? ((u % 1) + 1) % 1 : Math.max(0, Math.min(1, u));\n' +
        CW.pathx.angleExpr +
        'ang + L.effect("CW Path Angle")("Slider");\n}';
};

// opts: { orient: bool, loop: bool, angle: degrees }. Followers = selected layers except the path's, in selection order.
CW.follow.run = function (opts) {
    CW.run("Follow path", function () {
        var comp = CW.activeComp();
        if (!comp) { CW.say("Open a composition, select a path, then the layers that should follow it."); return; }
        var ref = CW.pathx.selectedPath(comp);
        if (!ref) { CW.say("Select a path first (a shape path, or a mask) along with the layers that should follow it."); return; }
        var followers = [], i;
        for (i = 0; i < comp.selectedLayers.length; i++) {
            var l = comp.selectedLayers[i];
            if (l.index !== ref.layer.index && l.matchName !== "ADBE Camera Layer" && l.matchName !== "ADBE Light Layer") followers.push(l);
        }
        if (followers.length === 0) { CW.say("Also select the layers that should follow the path."); return; }

        var closed = false;
        try { closed = ref.prop.value.closed; } catch (e) {}
        var spacing = CW.follow.defaultSpacing(followers.length, closed);
        // controls first: adding an effect changes the selection and invalidates handles
        CW.pathx.ensureControls(ref.layer, [
            { name: CW.follow.FX[0], value: 0 }, { name: CW.follow.FX[1], value: spacing },
            { name: CW.follow.FX[2], value: opts.orient ? 1 : 0, checkbox: true }, { name: CW.follow.FX[3], value: opts.angle || 0 },
            { name: CW.follow.FX[4], value: opts.loop ? 1 : 0, checkbox: true }
        ]);
        for (i = 0; i < followers.length; i++) {
            var f = followers[i];
            CW.pathx.link(f, CW.follow.LINK, ref.layer);
            f.property("ADBE Transform Group").property("ADBE Position").expression = CW.follow.posExpr(ref, i);
            f.property("ADBE Transform Group").property("ADBE Rotate Z").expression = CW.follow.rotExpr(ref, i);
        }
        CW.note("Placed " + followers.length + " layer" + (followers.length === 1 ? "" : "s") + " on " + ref.layer.name);
    });
};

// Update the shared controls on the path layer(s) of the selection (live, no rebuild).
CW.follow.update = function (opts) {
    CW.run("Update follow", function () {
        var comp = CW.activeComp();
        if (!comp) return;
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var fx = comp.selectedLayers[i].property("ADBE Effect Parade");
            if (!fx.property(CW.follow.FX[0])) continue;
            if (opts.orient !== undefined) fx.property(CW.follow.FX[2]).property(1).setValue(opts.orient ? 1 : 0);
            if (opts.loop !== undefined) fx.property(CW.follow.FX[4]).property(1).setValue(opts.loop ? 1 : 0);
            if (opts.angle !== undefined) fx.property(CW.follow.FX[3]).property(1).setValue(opts.angle);
        }
    });
};

CW.follow._clear = function (layer) {
    var n = 0, tr = layer.property("ADBE Transform Group"), names = ["ADBE Position", "ADBE Rotate Z"];
    for (var k = 0; k < names.length; k++) {
        var p = tr.property(names[k]);
        if (p.canSetExpression && p.expression && p.expression.indexOf(CW.follow.MARK) === 0) { p.expression = ""; n++; }
    }
    return n;
};

// Selected followers lose their expressions; selected path layers lose the controls.
CW.follow.removeSelected = function () {
    CW.run("Remove follow", function () {
        var comp = CW.activeComp();
        if (!comp || comp.selectedLayers.length === 0) { CW.say("Select the layers to release, or the path layer."); return; }
        var cleared = 0, controls = 0;
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            cleared += CW.follow._clear(comp.selectedLayers[i]);
            controls += CW.pathx.removeControls(comp.selectedLayers[i], CW.follow.FX.concat([CW.follow.LINK]));
        }
        CW.note("Released " + cleared + " expression" + (cleared === 1 ? "" : "s") + (controls ? " and removed the controls" : ""));
    });
};
