// Shape layer helpers: path direction.
CW.shape = {};

// Every path (shape paths and masks) under a group.
CW.shape._paths = function (group, out) {
    for (var i = 1; i <= group.numProperties; i++) {
        var p = group.property(i);
        if (p.matchName === "ADBE Vector Shape - Group") out.push(p.property("ADBE Vector Shape"));
        else if (p.matchName === "ADBE Vector Group") CW.shape._paths(p.property("ADBE Vectors Group"), out);
    }
    return out;
};

CW.shape._isShapeLayer = function (l) { return l.matchName === "ADBE Vector Layer"; };

CW.shape._isShapeLayer = function (l) { return l.matchName === "ADBE Vector Layer"; };

// The same shape travelling the other way: vertices in reverse order, and each vertex's in and out handles swap.
CW.shape.reverseShape = function (sh) {
    var n = sh.vertices.length, v = [], it = [], ot = [], k;
    for (k = 0; k < n; k++) {
        v.push(sh.vertices[n - 1 - k]);
        it.push(sh.outTangents[n - 1 - k]);
        ot.push(sh.inTangents[n - 1 - k]);
    }
    var out = new Shape();
    out.vertices = v; out.inTangents = it; out.outTangents = ot; out.closed = sh.closed;
    return out;
};

CW.shape._reverseProp = function (prop) {
    var i;
    if (prop.numKeys > 0) { for (i = 1; i <= prop.numKeys; i++) prop.setValueAtKey(i, CW.shape.reverseShape(prop.keyValue(i))); }
    else prop.setValue(CW.shape.reverseShape(prop.value));
};

// Reverse the selected paths (shape paths and masks), animated ones included. With no path selected, every path
// in the selected shape layers.
CW.shape.reversePath = function () {
    CW.run("Reverse path direction", function () {
        var comp = CW.activeComp();
        if (!comp) { CW.say("Open a composition and select paths."); return; }
        var sp = comp.selectedProperties, targets = [], i, j;
        for (i = 0; i < sp.length; i++) {
            var p = sp[i], m = p.matchName;
            if (m === "ADBE Vector Shape" || m === "ADBE Mask Shape") targets.push(p);
            else if (m === "ADBE Vector Shape - Group") targets.push(p.property("ADBE Vector Shape"));
            else if (m === "ADBE Mask Atom") targets.push(p.property("ADBE Mask Shape"));
            else if (m === "ADBE Vector Group") CW.shape._paths(p.property("ADBE Vectors Group"), targets);
        }
        if (targets.length === 0) {
            for (i = 0; i < comp.selectedLayers.length; i++) if (CW.shape._isShapeLayer(comp.selectedLayers[i])) CW.shape._paths(comp.selectedLayers[i].property("ADBE Root Vectors Group"), targets);
        }
        if (targets.length === 0) { CW.say("Select one or more paths (or a shape layer) first."); return; }
        // de-duplicate: a path reached through both a selected group and a selected item must only flip once
        var seen = {}, unique = [];
        for (j = 0; j < targets.length; j++) {
            var key = CW.shape._key(targets[j]);
            if (!seen[key]) { seen[key] = true; unique.push(targets[j]); }
        }
        for (j = 0; j < unique.length; j++) CW.shape._reverseProp(unique[j]);
        CW.note("Reversed " + unique.length + " path" + (unique.length === 1 ? "" : "s"));
    });
};

// A stable identity for a property: its layer index plus its chain of names.
CW.shape._key = function (prop) {
    var parts = [], n = prop, layer = prop.propertyGroup(prop.propertyDepth);
    while (n && n.propertyDepth > 0) { parts.unshift(n.name + "#" + n.propertyIndex); n = n.parentProperty; }
    return layer.index + ":" + parts.join("/");
};
