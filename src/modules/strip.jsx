// The button strip: run a script, apply a preset or effect, set an expression, or run a menu
// command. Buttons live in a plain text file shared by every Cosawerks panel.
CW.strip = {};

CW.strip.storeFile = function () {
    var d = new Folder(Folder.userData.fsName + "/Cosawerks");
    if (!d.exists) d.create();
    return new File(d.fsName + "/strip.json");
};

// The saved button list as text ("" when there is none yet). The panel parses it.
CW.strip.readStore = function () {
    var f = CW.strip.storeFile();
    if (!f.exists) return "";
    f.encoding = "UTF-8";
    f.open("r");
    var t = f.read();
    f.close();
    return t;
};

CW.strip.writeStore = function (text) {
    var f = CW.strip.storeFile();
    f.encoding = "UTF-8";
    f.open("w");
    f.lineFeed = "Unix";
    f.write(text);
    f.close();
    return "ok";
};

// File chooser for the editor. kind: "preset" or "script". Returns a path, or "" if cancelled.
CW.strip.chooseFile = function (kind) {
    var re = kind === "preset" ? /\.ffx$/i : /\.(jsx|jsxbin|js)$/i;
    var f = File.openDialog(kind === "preset" ? "Choose an animation preset (.ffx)" : "Choose a script (.jsx, .jsxbin)",
                            function (x) { return (x instanceof Folder) || re.test(x.name); });
    return f ? f.fsName : "";
};

// The first selected effect, as "matchName<TAB>name", for building a button from it.
CW.strip.selectedEffect = function () {
    var comp = CW.activeComp();
    if (!comp) return "";
    var sp = comp.selectedProperties;
    for (var i = 0; i < sp.length; i++) {
        var p = sp[i];
        if (p.parentProperty && p.parentProperty.matchName === "ADBE Effect Parade") return p.matchName + "\t" + p.name;
    }
    return "";
};

// The expression of the first selected property that has one.
CW.strip.selectedExpression = function () {
    var comp = CW.activeComp();
    if (!comp) return "";
    var sp = comp.selectedProperties;
    for (var i = 0; i < sp.length; i++) {
        var p = sp[i];
        if (p.propertyType === PropertyType.PROPERTY && p.canSetExpression && p.expression) return p.expression;
    }
    return "";
};

// ---- Custom icons: the library file, and reading an .svg or .png the user picked.
CW.strip.iconsFile = function () {
    var d = new Folder(Folder.userData.fsName + "/Cosawerks");
    if (!d.exists) d.create();
    return new File(d.fsName + "/icons.json");
};

CW.strip.readIcons = function () {
    var f = CW.strip.iconsFile();
    if (!f.exists) return "";
    f.encoding = "UTF-8";
    f.open("r");
    var t = f.read();
    f.close();
    return t;
};

CW.strip.writeIcons = function (text) {
    var f = CW.strip.iconsFile();
    f.encoding = "UTF-8";
    f.open("w");
    f.lineFeed = "Unix";
    f.write(text);
    f.close();
    return "ok";
};

CW.strip.chooseIconFile = function () {
    var f = File.openDialog("Choose an icon (.svg or .png)", function (x) { return (x instanceof Folder) || /\.(svg|png)$/i.test(x.name); });
    return f ? f.fsName : "";
};

CW.strip.base64 = function (bin) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", out = "", i = 0, n = bin.length;
    while (i < n) {
        var a = bin.charCodeAt(i++) & 255, hasB = i < n, b = hasB ? bin.charCodeAt(i++) & 255 : 0, hasC = i < n, c = hasC ? bin.charCodeAt(i++) & 255 : 0;
        out += chars.charAt(a >> 2) + chars.charAt(((a & 3) << 4) | (b >> 4)) +
               (hasB ? chars.charAt(((b & 15) << 2) | (c >> 6)) : "=") + (hasC ? chars.charAt(c & 63) : "=");
    }
    return out;
};

// "svg<TAB>text", "png<TAB>base64", or "error<TAB>message".
CW.strip.readIcon = function (path) {
    var f = new File(path);
    if (!f.exists) return "error\tThat file was not found.";
    if (f.length > 400 * 1024) return "error\tThat file is larger than 400 KB. Use a smaller icon.";
    if (/\.svg$/i.test(f.name)) {
        f.encoding = "UTF-8"; f.open("r"); var t = f.read(); f.close();
        return "svg\t" + t;
    }
    if (/\.png$/i.test(f.name)) {
        f.encoding = "BINARY"; f.open("r"); var b = f.read(); f.close();
        return "png\t" + CW.strip.base64(b);
    }
    return "error\tOnly .svg and .png icons are supported.";
};

// 0 when the menu command is unknown.
CW.strip.menuId = function (name) { return app.findMenuCommandId(name); };

// spec: { type: "script" | "preset" | "effect" | "expression" | "command", target }
CW.strip.run = function (spec) {
    CW.run("Button", function () {
        var t = spec.target, i, f;
        if (!t) { CW.say("This button has nothing to run. Edit it and set a target."); return; }

        if (spec.type === "script") {
            f = new File(t);
            if (!f.exists) { CW.say("Script not found:\n" + f.fsName); return; }
            $.evalFile(f);
        } else if (spec.type === "preset") {
            f = new File(t);
            if (!f.exists) { CW.say("Preset not found:\n" + f.fsName); return; }
            var comp = CW.activeComp();
            if (!comp || comp.selectedLayers.length === 0) { CW.say("Select one or more layers first."); return; }
            // capture first: applying a preset can change the selection
            var layers = [];
            for (i = 0; i < comp.selectedLayers.length; i++) layers.push(comp.selectedLayers[i]);
            for (i = 0; i < layers.length; i++) layers[i].applyPreset(f);
        } else if (spec.type === "effect") {
            var c2 = CW.activeComp();
            if (!c2 || c2.selectedLayers.length === 0) { CW.say("Select one or more layers first."); return; }
            var made = 0, ls = [];
            for (i = 0; i < c2.selectedLayers.length; i++) ls.push(c2.selectedLayers[i]);
            for (i = 0; i < ls.length; i++) {
                try { ls[i].property("ADBE Effect Parade").addProperty(t); made++; } catch (e) {}
            }
            if (made === 0) CW.say("That effect could not be added to the selected layers.");
        } else if (spec.type === "expression") {
            var c3 = CW.activeComp();
            if (!c3) { CW.say("Open a composition and select properties."); return; }
            var sp = c3.selectedProperties, set = 0, targets = [];
            for (i = 0; i < sp.length; i++) if (sp[i].propertyType === PropertyType.PROPERTY && sp[i].canSetExpression) targets.push(sp[i]);
            for (i = 0; i < targets.length; i++) { targets[i].expression = t; set++; }
            if (set === 0) CW.say("Select one or more properties to put the expression on.");
        } else if (spec.type === "command") {
            var id = app.findMenuCommandId(t);
            if (!id) { CW.say("No menu command named \"" + t + "\". Use the exact menu text."); return; }
            app.executeCommand(id);
        } else {
            CW.say("Unknown button type: " + spec.type);
        }
    });
};
