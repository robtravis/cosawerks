// Duplicate comps, optionally with every text layer switched off (a "textless" version).
// A lean take on True Comp Duplicator's idea: nested comps are duplicated ONCE and shared, so
// the originals are never touched.
CW.comps = {};

CW.comps.selected = function () {
    var out = [], sel = app.project.selection;
    for (var i = 0; i < sel.length; i++) if (sel[i] instanceof CompItem) out.push(sel[i]);
    if (out.length === 0 && app.project.activeItem instanceof CompItem) out.push(app.project.activeItem);
    return out;
};

CW.comps.folderNamed = function (name) {
    var root = app.project.rootFolder;
    for (var i = 1; i <= root.numItems; i++) {
        var it = root.item(i);
        if (it instanceof FolderItem && it.name === name) return it;
    }
    return app.project.items.addFolder(name);
};

CW.comps.isText = function (layer) { return layer.matchName === "ADBE Text Layer"; };

// Source comp of a layer, or null (text, shape, camera and light layers have none).
CW.comps.sourceComp = function (layer) {
    try { if (layer.source instanceof CompItem) return layer.source; } catch (e) {}
    return null;
};

// Rewrite comp("Old") to comp("New") in every expression under a property group. Returns the count.
CW.comps._fixExpressions = function (group, pairs) {
    var n = 0;
    for (var i = 1; i <= group.numProperties; i++) {
        var p = group.property(i);
        if (p.propertyType === PropertyType.PROPERTY) {
            if (!p.canSetExpression || !p.expression) continue;
            var e = p.expression, before = e;
            for (var k = 0; k < pairs.length; k++) {
                e = e.split('comp("' + pairs[k][0] + '")').join('comp("' + pairs[k][1] + '")');
                e = e.split("comp('" + pairs[k][0] + "')").join("comp('" + pairs[k][1] + "')");
            }
            if (e !== before) { p.expression = e; n++; }
        } else n += CW.comps._fixExpressions(p, pairs);
    }
    return n;
};

// opts: { suffix: "-TEXTLESS", disableText: true, deep: true, folder: "" }
CW.comps.duplicate = function (opts) {
    CW.run("Duplicate comps", function () {
        var roots = CW.comps.selected();
        if (roots.length === 0) { CW.say("Select one or more compositions in the Project panel."); return; }
        var suffix = opts.suffix, map = {}, copies = [], nested = 0, i, j;
        var folder = opts.folder ? CW.comps.folderNamed(opts.folder) : null;

        function dup(c, isRoot) {
            if (map[c.id]) return map[c.id];
            var d = c.duplicate();
            d.name = c.name + suffix;
            map[c.id] = d;
            copies.push({ orig: c, copy: d });
            if (!isRoot) nested++;
            if (folder) d.parentFolder = folder;
            if (opts.deep) {
                for (var k = 1; k <= d.numLayers; k++) {
                    var l = d.layer(k), src = CW.comps.sourceComp(l);
                    if (src) l.replaceSource(dup(src, false), false);
                }
            }
            return d;
        }
        for (i = 0; i < roots.length; i++) dup(roots[i], true);

        var turnedOff = 0, fixed = 0, pairs = [];
        for (i = 0; i < copies.length; i++) pairs.push([copies[i].orig.name, copies[i].copy.name]);
        for (i = 0; i < copies.length; i++) {
            var cp = copies[i].copy;
            for (j = 1; j <= cp.numLayers; j++) {
                var layer = cp.layer(j);
                if (opts.disableText && CW.comps.isText(layer) && layer.enabled) { layer.enabled = false; turnedOff++; }
                if (opts.deep) fixed += CW.comps._fixExpressions(layer, pairs);
            }
        }

        var msg = "Duplicated " + copies.length + " comp" + (copies.length === 1 ? "" : "s");
        if (nested) msg += " (" + nested + " nested)";
        if (opts.disableText) msg += ", turned off " + turnedOff + " text layer" + (turnedOff === 1 ? "" : "s");
        if (fixed) msg += ", updated " + fixed + " expression" + (fixed === 1 ? "" : "s");
        CW.note(msg);
        if (!opts.deep && opts.disableText) CW.say("Nested comps were not duplicated, so text inside them is still on.");
    });
};
