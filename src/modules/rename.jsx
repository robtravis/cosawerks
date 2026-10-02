// Rename layers, comps or any project items: find/replace, prefix/suffix, numbering, case.
CW.rename = {};

CW.rename.pad = function (n, width) {
    var s = String(n);
    while (s.length < width) s = "0" + s;
    return s;
};

CW.rename.escapeRegex = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };

// op: { mode: "replace", find, replace, matchCase, regex }
//     { mode: "affix", prefix, suffix }
//     { mode: "number", base, start, step, pad, where: "suffix"|"prefix", sep }
//     { mode: "case", kind: "upper"|"lower"|"title"|"sentence" }
// index is the item's position in the batch (for numbering). Throws on a bad regular expression.
CW.rename.transform = function (name, index, op) {
    var m = op.mode;
    if (m === "replace") {
        if (!op.find) return name;
        var re = new RegExp(op.regex ? op.find : CW.rename.escapeRegex(op.find), "g" + (op.matchCase ? "" : "i"));
        if (op.regex) return name.replace(re, op.replace || "");
        var rep = op.replace || "";
        return name.replace(re, function () { return rep; });      // plain text: "$" means a dollar sign
    }
    if (m === "affix") return (op.prefix || "") + name + (op.suffix || "");
    if (m === "number") {
        var step = (op.step === undefined || op.step === null) ? 1 : op.step;
        var label = CW.rename.pad((op.start || 0) + index * step, op.pad || 0);
        var base = op.base ? op.base : name, sep = (op.sep === undefined || op.sep === null) ? " " : op.sep;
        return op.where === "prefix" ? label + sep + base : base + sep + label;
    }
    if (m === "case") {
        if (op.kind === "upper") return name.toUpperCase();
        if (op.kind === "lower") return name.toLowerCase();
        if (op.kind === "sentence") return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        return name.toLowerCase().replace(/(^|[\s_\-.\/])([a-z])/g, function (all, a, b) { return a + b.toUpperCase(); });
    }
    return name;
};

// kind: "layers" (selected layers of the active comp), "comps" (selected comps), "items" (everything
// selected in the Project panel). Returns the objects whose .name will be changed, in order.
CW.rename.targets = function (kind) {
    var out = [], i;
    if (kind === "layers") {
        var comp = CW.activeComp();
        if (comp) for (i = 0; i < comp.selectedLayers.length; i++) out.push(comp.selectedLayers[i]);
        // selectedLayers is not in stack order, so sort: numbering must run top to bottom
        out.sort(function (a, b) { return a.index - b.index; });
    } else {
        var sel = app.project.selection;
        for (i = 0; i < sel.length; i++) if (kind === "items" || sel[i] instanceof CompItem) out.push(sel[i]);
    }
    return out;
};

CW.rename.LABEL = { layers: "layer", comps: "comp", items: "item" };

CW.rename.run = function (kind, op) {
    CW.run("Rename", function () {
        if (op.mode === "replace" && !op.find) { CW.say("Enter the text to find."); return; }
        try { CW.rename.transform("x", 0, op); } catch (e) { CW.say("That is not a valid regular expression."); return; }
        var t = CW.rename.targets(kind);
        if (t.length === 0) {
            CW.say(kind === "layers" ? "Select one or more layers in the active composition." : "Select " + (kind === "comps" ? "compositions" : "items") + " in the Project panel.");
            return;
        }
        var changed = 0;
        for (var i = 0; i < t.length; i++) {
            var next = CW.rename.transform(t[i].name, i, op);
            if (next === "" || next === t[i].name) continue;    // an empty name would reset layers to their source name
            t[i].name = next;
            changed++;
        }
        var word = CW.rename.LABEL[kind];
        CW.note("Renamed " + changed + " of " + t.length + " " + word + (t.length === 1 ? "" : "s"));
    });
};
