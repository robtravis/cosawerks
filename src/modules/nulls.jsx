// Nulls and paths, both ways.
//   Nulls Drive Path:  a null on every vertex of the selected path; move a null and the path follows it (the path's points are
//                      expressions reading the nulls). Handles keep the shape they had.
//   Nulls Follow Path: a null on every vertex that follows the path as it changes, so anything can be parented to the points.
//   Release:           turn a driven path back into an ordinary path, where it is now.
// Works on shape paths (groups and their transforms included) and masks. Select the path, or a shape layer for its first path.
CW.nulls = {};
CW.nulls.MARK = "// CW Nulls";

CW.nulls._q = function (s) { return CW.pathx.q(s); };

// Make a null named `name` just above `above`, with its anchor at `target` (a comp-space point).
CW.nulls._makeNull = function (comp, above, name, target) {
    var n = comp.layers.addNull();
    n.name = name;
    n.moveBefore(above);
    n.property("ADBE Transform Group").property("ADBE Position").setValue([target[0], target[1]]);
    n.label = 9;                       // green, so they stand out from the layers they belong to
    return n;
};

// The comp-space position of vertex i of the path, worked out by AE itself (so parenting, groups and 3D are all respected).
CW.nulls._compPoint = function (ref, comp, i) {
    var probe = comp.layers.addShape();          // a shape layer, not a null: nulls leave a solid behind in the project
    var pos = probe.property("ADBE Transform Group").property("ADBE Position");
    pos.expression = CW.pathx.prelude(ref, "thisComp.layer(" + CW.nulls._q(ref.layer.name) + ")", false) + "mapPt(path.points()[" + i + "]);";
    var v = pos.value;
    pos.expression = "";
    probe.remove();
    return [v[0], v[1]];
};

// opts: { kind: "drive" | "follow" }
CW.nulls.run = function (opts) {
    CW.run("Nulls from path", function () {
        var comp = CW.activeComp();
        if (!comp) { CW.say("Open a composition first."); return; }
        var ref = CW.pathx.selectedPath(comp);
        if (!ref) { CW.say("Select a path (or a shape layer, to use its first path)."); return; }
        var shape = ref.prop.value, n = shape.vertices.length, layer = ref.layer, i;
        if (n === 0) { CW.say("That path has no points."); return; }
        var drive = opts.kind !== "follow";
        var base = layer.name;
        // a driven path is rebuilt from the nulls, so the points must not be moved by group transforms we cannot undo cleanly
        // (they are undone below; this only guards against an expression already on the path)
        if (drive && ref.prop.expression && ref.prop.expression.indexOf(CW.nulls.MARK) !== 0) { CW.say("That path already has an expression. Remove it first."); return; }

        var names = [], pts = [];
        for (i = 0; i < n; i++) pts.push(CW.nulls._compPoint(ref, comp, i));
        for (i = 0; i < n; i++) {
            names.push(base + " pt " + (i + 1));
            CW.nulls._makeNull(comp, layer, names[i], pts[i]);
        }

        if (drive) {
            var tin = [], tout = [];
            for (i = 0; i < n; i++) {
                tin.push("[" + shape.inTangents[i][0] + ", " + shape.inTangents[i][1] + "]");
                tout.push("[" + shape.outTangents[i][0] + ", " + shape.outTangents[i][1] + "]");
            }
            var nm = [];
            for (i = 0; i < n; i++) nm.push(CW.nulls._q(names[i]));
            // comp point -> this layer's space -> back through each group, outermost first
            var gs = [], prefix = "thisLayer";
            for (i = 0; i < ref.groups.length; i++) { prefix += "." + ref.groups[i]; gs.push(prefix); }
            var undo = "";
            for (i = 0; i < gs.length; i++) undo += "  p = agi(" + gs[i] + ", p);\n";
            var expr = CW.nulls.MARK + " drive\n" +
                "var names = [" + nm.join(", ") + "], tin = [" + tin.join(", ") + "], tout = [" + tout.join(", ") + "];\n" +
                "function agi(g, p) {\n" +
                "  var t = g.transform, q = p - t.position;\n" +
                "  var r = -degreesToRadians(t.rotation), c = Math.cos(r), s = Math.sin(r);\n" +
                "  q = [q[0] * c - q[1] * s, q[0] * s + q[1] * c];\n" +
                "  return [q[0] * 100 / t.scale[0], q[1] * 100 / t.scale[1]] + t.anchorPoint;\n}\n" +
                "function unmap(i) {\n" +
                "  var N = thisComp.layer(names[i]), p = fromComp(N.toComp(N.anchorPoint));\n" + undo +
                "  return [p[0], p[1]];\n}\n" +
                "var pts = [], i;\nfor (i = 0; i < names.length; i++) pts.push(unmap(i));\n" +
                "createPath(pts, tin, tout, " + (shape.closed ? "true" : "false") + ");";
            ref.prop.expression = expr;
        } else {
            for (i = 0; i < n; i++) {
                var nl = comp.layer(names[i]);
                nl.property("ADBE Transform Group").property("ADBE Position").expression = CW.nulls.MARK + " follow\n" +
                    CW.pathx.prelude(ref, "thisComp.layer(" + CW.nulls._q(layer.name) + ")", false) +
                    "var pts = path.points();\nmapPt(pts[Math.min(" + i + ", pts.length - 1)]);";
            }
        }
        CW.note((drive ? "Nulls now drive " : "Nulls follow ") + n + " point" + (n === 1 ? "" : "s") + " of " + layer.name);
    });
};

// Turn the selected driven path back into an ordinary path, as it is now. Leaves the nulls where they are.
CW.nulls.release = function () {
    CW.run("Release path from nulls", function () {
        var comp = CW.activeComp();
        if (!comp) { CW.say("Open a composition first."); return; }
        var ref = CW.pathx.selectedPath(comp);
        if (!ref || !ref.prop.expression || ref.prop.expression.indexOf(CW.nulls.MARK) !== 0) { CW.say("Select a path that nulls drive."); return; }
        var now = ref.prop.value;
        ref.prop.expression = "";
        ref.prop.setValue(now);
        CW.note("Released " + ref.layer.name + ": it is an ordinary path again");
    });
};
