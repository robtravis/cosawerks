// Shared pieces for "ride along a path": finding the selected path and writing the expression
// that maps a percentage along it to a point (and a direction) in composition space.
CW.pathx = {};

CW.pathx.q = function (s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; };

// From the selected properties, the first path: a shape path or a mask path. Returns
// { layer, kind: "shape"|"mask", chain: 'content("A").content("B").path', groups: [outer..inner group chains] } or null.
CW.pathx.selectedPath = function (comp) {
    var sp = comp.selectedProperties, i;
    for (i = 0; i < sp.length; i++) {
        var p = sp[i], m = p.matchName;
        if (m === "ADBE Vector Shape - Group") return CW.pathx.describe(p.property("ADBE Vector Shape"));   // the path item: use its path
        if (m === "ADBE Vector Shape" || m === "ADBE Mask Shape") return CW.pathx.describe(p);
        // a selected mask: use its path
        if (m === "ADBE Mask Atom") return CW.pathx.describe(p.property("ADBE Mask Shape"));
    }
    // no path picked: a selected shape layer offers its first path
    var layers = comp.selectedLayers;
    for (i = 0; i < layers.length; i++) {
        if (layers[i].matchName !== "ADBE Vector Layer") continue;
        var found = (function walk(group) {
            for (var j = 1; j <= group.numProperties; j++) {
                var it = group.property(j);
                if (it.matchName === "ADBE Vector Shape - Group") return it;
                if (it.matchName === "ADBE Vector Group") { var r = walk(it.property("ADBE Vectors Group")); if (r) return r; }
            }
            return null;
        })(layers[i].property("ADBE Root Vectors Group"));
        if (found) return CW.pathx.describe(found.property("ADBE Vector Shape"));
    }
    return null;
};

CW.pathx.describe = function (p) {
    var layer = p.propertyGroup(p.propertyDepth), parts = [], groups = [], node = p, chain;
    if (p.matchName === "ADBE Mask Shape") {
        return { layer: layer, kind: "mask", prop: p, chain: "mask(" + CW.pathx.q(p.parentProperty.name) + ").maskPath", groups: [] };
    }
    // shape path: collect the group/path item names from the layer down to this path
    while (node && node.propertyDepth > 0) {
        if (node.matchName === "ADBE Vector Group" || node.matchName === "ADBE Vector Shape - Group") parts.unshift({ name: node.name, group: node.matchName === "ADBE Vector Group" });
        node = node.parentProperty;
    }
    chain = "";
    var gchain = "";
    for (var i = 0; i < parts.length; i++) {
        chain += "content(" + CW.pathx.q(parts[i].name) + ").";
        if (parts[i].group) { gchain += "content(" + CW.pathx.q(parts[i].name) + ")."; groups.push("content(" + CW.pathx.q(parts[i].name) + ")"); }
    }
    return { layer: layer, kind: "shape", prop: p, chain: chain + "path", groups: groups, itemParts: parts };
};

// Expression prelude defining: L (the path layer, found by layerExpr), path, mapPt(p), at(u) -> comp-space point at u (0..1).
// Group transforms between the path and the layer are applied, innermost first, so moved or scaled
// groups still line up.
CW.pathx.prelude = function (ref, layerExpr, local) {
    var s = 'var L = ' + layerExpr + ';\n' +
            'var path = L.' + ref.chain + ';\n' +
            'function ag(g, p) {\n' +
            '  var t = g.transform, q = p - t.anchorPoint;\n' +
            '  q = [q[0] * t.scale[0] / 100, q[1] * t.scale[1] / 100];\n' +
            '  var r = degreesToRadians(t.rotation), c = Math.cos(r), s = Math.sin(r);\n' +
            '  return [q[0] * c - q[1] * s, q[0] * s + q[1] * c] + t.position;\n' +
            '}\n' +
            'function mapPt(p) {\n';
    // build the group chain: each nested group is reached through its parent's content()
    var prefix = "L", gs = [], i;
    for (i = 0; i < ref.groups.length; i++) { prefix += "." + ref.groups[i]; gs.push(prefix); }
    for (i = gs.length - 1; i >= 0; i--) s += '  p = ag(' + gs[i] + ', p);\n';
    s += (local ? '  return [p[0], p[1]];\n}\n' : '  return L.toComp([p[0], p[1]]);\n}\n') +
         'function at(u) { return mapPt(path.pointOnPath(u)); }\n' +
         'function dir(u) {\n' +
         '  var u2 = u < 0.998 ? u + 0.002 : u - 0.002, a = at(u), b = at(u2);\n' +
         '  return u2 > u ? b - a : a - b;\n' +
         '}\n';
    return s;
};

// The follower's position (in its parent's space) and angle for a point at u in the expression.
CW.pathx.placeExpr = 'var wp = at(u);\nvar pos = (thisLayer.hasParent) ? thisLayer.parent.fromComp(wp) : wp;\n';
// Same, for expressions on the same layer as the path (no layer-to-comp step, no parent).
CW.pathx.angleExprLocal = 'var a0 = at(u), d0 = dir(u);\nvar ang = radiansToDegrees(Math.atan2(d0[1], d0[0]));\n';
CW.pathx.angleExpr = 'var a0 = at(u), d0 = dir(u);\n' +
                    'var dd = (thisLayer.hasParent) ? thisLayer.parent.fromComp(a0 + d0) - thisLayer.parent.fromComp(a0) : d0;\n' +
                    'var ang = radiansToDegrees(Math.atan2(dd[1], dd[0]));\n';

// Slider/checkbox controls on a layer. Adding an effect invalidates earlier effect handles, so each is configured at once.
// defs: { name, value, checkbox: true } | { name, value }.
// Expressions read any of them with effect("name")(1), whatever the control type.
CW.pathx.ensureControls = function (layer, defs) {
    var fxp = layer.property("ADBE Effect Parade"), made = 0;
    for (var i = 0; i < defs.length; i++) {
        var d = defs[i];
        if (fxp.property(d.name)) continue;
        // Dropdown controls are avoided: a script cannot fill in their items. Pickers are sliders.
        var e = layer.property("ADBE Effect Parade").addProperty(d.checkbox ? "ADBE Checkbox Control" : "ADBE Slider Control");
        e.name = d.name;
        layer.property("ADBE Effect Parade").property(d.name).property(1).setValue(d.value);
        made++;
    }
    return made;
};

CW.pathx.removeControls = function (layer, names) {
    var fx = layer.property("ADBE Effect Parade"), n = 0;
    for (var i = fx.numProperties; i >= 1; i--) {
        for (var k = 0; k < names.length; k++) if (fx.property(i).name === names[k]) { fx.property(i).remove(); n++; break; }
    }
    return n;
};

// The container (a group's Contents) that holds the selected path item, re-found by name so it is
// safe to call after other changes have invalidated earlier handles.
CW.pathx.container = function (ref) {
    var c = ref.layer.property("ADBE Root Vectors Group"), parts = ref.itemParts || [];
    for (var i = 0; i < parts.length; i++) {
        if (parts[i].group) c = c.property(parts[i].name).property("ADBE Vectors Group");
    }
    return c;
};

// A Layer Control effect named `name` on `layer`, pointing at `target`. The link survives renaming and
// re-ordering the target, which referring to it by name would not.
CW.pathx.link = function (layer, name, target) {
    var fx = layer.property("ADBE Effect Parade"), e = fx.property(name);
    if (!e) { e = layer.property("ADBE Effect Parade").addProperty("ADBE Layer Control"); e.name = name; e = layer.property("ADBE Effect Parade").property(name); }
    e.property(1).setValue(target.index);
};
CW.pathx.linkExpr = function (name) { return 'thisLayer.effect(' + CW.pathx.q(name) + ')("Layer")'; };
