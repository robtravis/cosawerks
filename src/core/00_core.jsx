var CW = CW || {};
CW.VERSION = "0.0.1";

// Run fn inside one undo group; report any error instead of failing silently.
CW.run = function (label, fn) {
    app.beginUndoGroup(label);
    try { return fn(); }
    catch (e) { CW.say("Cosawerks: " + label + "\n" + e.toString() + " (line " + e.line + ")"); }
    finally { app.endUndoGroup(); }
};

// All user-facing messages go through here so tests can capture them.
CW.say = function (msg) { alert(msg); };

// A success message: the panel shows these in the normal colour, errors in orange.
CW.note = function (msg) { CW.say("\u2713 " + msg); };

CW.activeComp = function () {
    var c = app.project.activeItem;
    return (c && c instanceof CompItem) ? c : null;
};

// Entry point for the CEP panel: run fn and return anything the tool wanted to tell the
// user as one string ("" when it simply worked). CW.say is redirected so nothing blocks AE.
CW.rpc = function (fn) {
    var msgs = [], old = CW.say;
    CW.say = function (m) { msgs.push(String(m)); };
    try { fn(); }
    catch (e) { msgs.push("Error: " + e.toString() + " (line " + e.line + ")"); }
    CW.say = old;
    return msgs.join("\n");
};

// The Arrow control is a pseudo effect carried by an animation preset next to the host script (CEP: <panel>/presets, or the
// repo's presets folder when running from src/).
CW.here = (typeof $ !== "undefined" && typeof File !== "undefined") ? File($.fileName).parent : null;      // null when the core is loaded outside After Effects (the node tests)
CW.presetFile = function (name) {
    if (!CW.here) return null;
    var dirs = [CW.here.parent.fsName + "/presets", CW.here.parent.parent.fsName + "/presets"], i;
    for (i = 0; i < dirs.length; i++) { var f = new File(dirs[i] + "/" + name); if (f.exists) return f; }
    return null;
};

// Set a property's value unless you have keyframed it (setValue throws on a keyed property, and your animation should win anyway).
CW.setValue = function (prop, v) {
    if (prop.numKeys > 0) return false;
    prop.setValue(v);
    return true;
};

// Does this After Effects let a script style ranges of a text layer (characterRange and friends)? Asked through reflection, because
// reading a missing member of an AE object raises a dialog that try/catch cannot stop.
CW.hasTextRanges = function (textDocument) {
    var m = textDocument.reflect.methods, i;
    for (i = 0; i < m.length; i++) if (m[i].name === "characterRange") return true;
    return false;
};
CW.NEEDS_TEXT_RANGES = "This version of After Effects cannot style individual lines of a text layer from a script. Update After Effects to use this tool.";
