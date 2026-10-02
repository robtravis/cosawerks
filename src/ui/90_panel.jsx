// Panel v0: plain ScriptUI controls only, grown one section at a time.
CW.buildPanel = function (thisObj) {
    var w = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Cosawerks", undefined, { resizeable: true });
    w.orientation = "column";
    w.alignChildren = ["left", "top"];
    w.margins = 8;
    w.spacing = 4;

    // ---- Anchor point: 3x3 grid, top-left to bottom-right
    w.add("statictext", undefined, "Anchor");
    var grid = w.add("group");
    grid.orientation = "column";
    grid.spacing = 2;
    var names = [["top left", "top", "top right"], ["left", "center", "right"], ["bottom left", "bottom", "bottom right"]];
    for (var r = 0; r < 3; r++) {
        var row = grid.add("group");
        row.orientation = "row";
        row.spacing = 2;
        for (var c = 0; c < 3; c++) {
            var b = row.add("button", undefined, (r === 1 && c === 1) ? "●" : "·");
            b.preferredSize = [28, 24];
            b.helpTip = "Move the anchor point to " + names[r][c];
            b.hx = c / 2;
            b.vy = r / 2;
            b.onClick = function () { CW.anchor.move(this.hx, this.vy); };
        }
    }

    // ---- Align: one row of seven, same order as Illustrator's panel
    w.add("statictext", undefined, "Align");
    var st = CW.align.state;
    var alignRow = w.add("group");
    alignRow.orientation = "row";
    alignRow.spacing = 2;
    var defs = [["alignLeft", "left", "Align left edges"], ["alignHC", "hc", "Align horizontal centers"], ["alignRight", "right", "Align right edges"],
                ["alignCenter", "center", "Center on both axes"],
                ["alignTop", "top", "Align top edges"], ["alignVC", "vc", "Align vertical centers"], ["alignBottom", "bottom", "Align bottom edges"]];
    for (var d = 0; d < defs.length; d++) {
        var ico = CW.ICONS[defs[d][0]];
        var ab = alignRow.add("iconbutton", undefined, ScriptUI.newImage(ico[0], undefined, ico[1]), { style: "toolbutton" });
        ab.preferredSize = [30, 28];
        ab.helpTip = defs[d][2];
        ab.op = defs[d][1];
        ab.onClick = function () { CW.align.run({ kind: "align", op: this.op }); };
    }

    // ---- What to align to, and the two modifiers
    var toRow = w.add("group");
    toRow.orientation = "row";
    toRow.alignChildren = ["left", "center"];
    toRow.add("statictext", undefined, "To:");
    var modes = [["Selection", "sel"], ["Composition", "comp"], ["Outside comp", "outside"], ["Key layer", "key"]];
    var dd = toRow.add("dropdownlist", undefined, ["Selection", "Composition", "Outside comp", "Key layer"]);
    dd.selection = 0;
    dd.helpTip = "Key layer is the first layer you selected.";
    dd.onChange = function () { if (this.selection) st.mode = modes[this.selection.index][1]; };
    st.mode = "sel";

    var grp = w.add("checkbox", undefined, "As group");
    grp.helpTip = "Move the selection as one block (not used for Selection).";
    grp.onClick = function () { st.group = this.value; };
    var anc = w.add("checkbox", undefined, "Use anchor points");
    anc.helpTip = "Align anchor points instead of layer bounds.";
    anc.onClick = function () { st.anchors = this.value; };
    st.group = false;
    st.anchors = false;

    w.layout.layout(true);
    w.onResizing = w.onResize = function () { this.layout.resize(); };
    return w;
};

var cwPanel = CW.buildPanel(this);
if (cwPanel instanceof Window) { cwPanel.center(); cwPanel.show(); }
