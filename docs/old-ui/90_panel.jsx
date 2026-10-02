CW.buildPanel = function (thisObj) {
    var w = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Cosawerks", undefined, { resizeable: true });
    w.orientation = "column";
    w.alignChildren = ["fill", "top"];
    w.margins = 8;
    w.spacing = 2;

    var label = function (text) {
        var s = w.add("statictext", undefined, text);
        s.alignment = ["fill", "top"];
        return s;
    };
    var st = CW.align.state;
    var A = function (id, icon, tip) { return { id: id, icon: icon, tip: tip }; };

    // ---- Anchor
    label("Anchor Point");
    CW.ui.anchorGrid(w, function (hx, vy) { CW.anchor.move(hx, vy); });

    // ---- Align
    label("Align Layers");
    CW.ui.palette(w, {
        rows: [[A("left", "alignLeft", "Align left"), A("hc", "alignHC", "Align horizontal center"), A("right", "alignRight", "Align right"),
                A("center", "alignCenter", "Center on both axes"),
                A("top", "alignTop", "Align top"), A("vc", "alignVC", "Align vertical center"), A("bottom", "alignBottom", "Align bottom")]],
        onClick: function (id) { CW.align.run({ kind: "align", op: id }); }
    });

    label("Distribute Layers");
    CW.ui.palette(w, {
        rows: [[A("top", "distTop", "Distribute top edges"), A("vc", "distVC", "Distribute vertical centers"), A("bottom", "distBottom", "Distribute bottom edges"),
                A("left", "distLeft", "Distribute left edges"), A("hc", "distHC", "Distribute horizontal centers"), A("right", "distRight", "Distribute right edges")]],
        onClick: function (id) { CW.align.run({ kind: "dist", op: id }); }
    });

    label("Distribute Spacing");
    var row = w.add("group");
    row.orientation = "row";
    row.alignment = ["fill", "top"];
    row.alignChildren = ["left", "center"];
    var gap = null;   // set below, read by the buttons
    CW.ui.palette(row, {
        rows: [[A("v", "spaceV", "Equal vertical gaps"), A("h", "spaceH", "Equal horizontal gaps")]], spread: false,
        onClick: function (id) {
            var txt = gap.text.replace(/\s+/g, ""), v = txt === "" ? null : parseFloat(txt);
            if (txt !== "" && isNaN(v)) { alert("Spacing must be a number, or leave it empty to even out the current gaps."); return; }
            CW.align.run({ kind: "space", axis: id, gap: v });
        }
    });
    gap = row.add("edittext", undefined, "");
    gap.characters = 5;
    gap.helpTip = "Gap in px. Empty = even out the current gaps. A number keeps the key (or first) layer in place and sets that exact gap.";

    label("Align To");
    var palette;
    palette = CW.ui.palette(w, {
        rows: [[A("comp", "toComp", "Composition frame"), A("outside", "toOutside", "Just outside the composition frame"),
                A("sel", "toSelection", "Selection bounds"), A("key", "toKey", "Key layer (top-most selected)"),
                A("group", "asGroup", "Move the selection as one block"), A("anchors", "toAnchors", "Use anchor points instead of bounds")]],
        isOn: function (id) {
            if (id === "group") return st.group;
            if (id === "anchors") return st.anchors;
            return st.mode === id;
        },
        onClick: function (id) {
            if (id === "group") st.group = !st.group;
            else if (id === "anchors") st.anchors = !st.anchors;
            else st.mode = id;
        }
    });

    w.layout.layout(true);
    w.onResizing = w.onResize = function () { this.layout.resize(); };
    return w;
};

var cwPanel = CW.buildPanel(this);
if (cwPanel instanceof Window) { cwPanel.center(); cwPanel.show(); }
