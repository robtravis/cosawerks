// Custom-drawn icon palettes. Everything is a rect on a 20-unit grid, so one tiny
// renderer draws every icon. Layout is fixed (like Illustrator): icons keep their size
// and spread across the width, they never reflow when the panel is resized.
CW.ui = {};
CW.ui.C = {
    fg: [0.80, 0.80, 0.80, 1], dim: [0.80, 0.80, 0.80, 0.30],
    hover: [1, 1, 1, 0.10], on: [0.27, 0.52, 0.96, 1], onBg: [0.27, 0.52, 0.96, 0.22]
};

// ["f",x,y,w,h] filled rect, ["o",x,y,w,h] 1.5-unit outline.
CW.ui.icons = (function () {
    var I = {};
    I.alignLeft   = [["f",2,2,2,16],["f",6,4,11,5],["f",6,11,7,5]];
    I.alignHC     = [["f",9,2,2,16],["f",3,4,14,5],["f",5,11,10,5]];
    I.alignRight  = [["f",16,2,2,16],["f",3,4,11,5],["f",7,11,7,5]];
    I.alignTop    = [["f",2,2,16,2],["f",4,6,5,11],["f",11,6,5,7]];
    I.alignVC     = [["f",2,9,16,2],["f",4,3,5,14],["f",11,5,5,10]];
    I.alignBottom = [["f",2,16,16,2],["f",4,3,5,11],["f",11,7,5,7]];
    I.alignCenter = [["f",9,2,2,16],["f",2,9,16,2],["o",6,6,8,8]];
    var bv = [["f",4,3,12,3],["f",4,9,12,3],["f",4,15,12,3]];
    I.distTop     = bv.concat([["f",2,2,16,1],["f",2,8,16,1],["f",2,14,16,1]]);
    I.distVC      = bv.concat([["f",2,4,16,1],["f",2,10,16,1],["f",2,16,16,1]]);
    I.distBottom  = bv.concat([["f",2,6,16,1],["f",2,12,16,1],["f",2,18,16,1]]);
    var bh = [["f",3,4,3,12],["f",9,4,3,12],["f",15,4,3,12]];
    I.distLeft    = bh.concat([["f",2,2,1,16],["f",8,2,1,16],["f",14,2,1,16]]);
    I.distHC      = bh.concat([["f",4,2,1,16],["f",10,2,1,16],["f",16,2,1,16]]);
    I.distRight   = bh.concat([["f",6,2,1,16],["f",12,2,1,16],["f",18,2,1,16]]);
    I.spaceV      = [["f",3,2,14,4],["f",3,14,14,4],["f",9,7,2,6],["f",6,7,8,1],["f",6,12,8,1]];
    I.spaceH      = [["f",2,3,4,14],["f",14,3,4,14],["f",7,9,6,2],["f",7,6,1,8],["f",12,6,1,8]];
    I.toComp      = [["o",2,2,16,16],["f",8,8,4,4]];
    I.toOutside   = [["o",6,6,8,8],["f",9,1,2,3],["f",9,16,2,3],["f",1,9,3,2],["f",16,9,3,2]];
    I.toSelection = [["o",2,2,16,16],["f",5,5,5,5],["f",11,9,4,6]];
    I.toKey       = [["o",2,2,16,16],["f",4,4,8,8],["o",12,12,4,4]];
    I.asGroup     = [["o",1,3,18,14],["f",4,6,5,8],["f",11,6,5,8]];
    I.toAnchors   = [["f",9,3,2,14],["f",3,9,14,2],["f",8,8,4,4]];
    return I;
})();

CW.ui.drawIcon = function (g, spec, x, y, size, color) {
    var k = size / 20, brush = g.newBrush(g.BrushType.SOLID_COLOR, color);
    var rect = function (rx, ry, rw, rh) {
        g.newPath();
        g.rectPath(x + rx * k, y + ry * k, rw * k, rh * k);
        g.fillPath(brush);
    };
    for (var i = 0; i < spec.length; i++) {
        var o = spec[i];
        if (o[0] === "f") rect(o[1], o[2], o[3], o[4]);
        else {   // outline = four thin rects
            var t = 1.5;
            rect(o[1], o[2], o[3], t); rect(o[1], o[2] + o[4] - t, o[3], t);
            rect(o[1], o[2], t, o[4]); rect(o[1] + o[3] - t, o[2], t, o[4]);
        }
    }
};

// A row-based palette. spec = {
//   rows: [[ {id, icon, tip}, ... ], ...], icon: 22, gap: 6,
//   onClick: function(id), isOn: function(id) -> bool, spread: true|false }
CW.ui.palette = function (parent, spec) {
    var size = spec.icon || 22, pad = 4, rows = spec.rows;
    var cellW = size + 8, cellH = size + 8;
    var b = parent.add("button", undefined, "");
    b.alignment = [spec.spread === false ? "left" : "fill", "top"];
    var widest = 0;
    for (var r = 0; r < rows.length; r++) if (rows[r].length > widest) widest = rows[r].length;
    b.minimumSize = [widest * cellW + pad * 2, rows.length * cellH + pad * 2];
    b.preferredSize = [spec.spread === false ? b.minimumSize[0] : -1, b.minimumSize[1]];
    b.hot = null;

    // Where each cell sits for the current width.
    b.cells = function () {
        var w = this.size.width, out = [];
        for (var r = 0; r < rows.length; r++) {
            var n = rows[r].length, usable = w - pad * 2;
            var step = spec.spread === false ? cellW : Math.max(cellW, usable / n);
            var rowW = step * n, x0 = spec.spread === false ? pad : pad + (usable - rowW) / 2;
            for (var c = 0; c < n; c++) {
                out.push({ item: rows[r][c], x: x0 + c * step + (step - cellW) / 2, y: pad + r * cellH, w: cellW, h: cellH });
            }
        }
        return out;
    };

    b.onDraw = function () {
        var g = this.graphics, cells = this.cells(), C = CW.ui.C;
        for (var i = 0; i < cells.length; i++) {
            var c = cells[i], on = spec.isOn ? spec.isOn(c.item.id) : false;
            if (on || this.hot === c.item.id) {
                g.newPath(); g.rectPath(c.x, c.y, c.w, c.h);
                g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, on ? C.onBg : C.hover));
            }
            CW.ui.drawIcon(g, CW.ui.icons[c.item.icon], c.x + (c.w - size) / 2, c.y + (c.h - size) / 2, size, on ? C.on : C.fg);
        }
    };

    var hit = function (self, e) {
        var cells = self.cells();
        for (var i = 0; i < cells.length; i++) {
            var c = cells[i];
            if (e.clientX >= c.x && e.clientX < c.x + c.w && e.clientY >= c.y && e.clientY < c.y + c.h) return c.item;
        }
        return null;
    };
    b.addEventListener("mousemove", function (e) {
        var it = hit(this, e), id = it ? it.id : null;
        if (id !== this.hot) { this.hot = id; this.helpTip = it ? it.tip : ""; this.notify("onDraw"); }
    });
    b.addEventListener("mouseout", function () { this.hot = null; this.notify("onDraw"); });
    b.addEventListener("click", function (e) {
        var it = hit(this, e);
        if (it && spec.onClick) { spec.onClick(it.id); this.notify("onDraw"); }
    });
    return b;
};

// 3x3 grid for the anchor point: click a dot to move the anchor to that spot.
CW.ui.anchorGrid = function (parent, onPick) {
    var cell = 18, pad = 4;
    var b = parent.add("button", undefined, "");
    b.alignment = ["left", "top"];
    b.minimumSize = b.preferredSize = [cell * 3 + pad * 2, cell * 3 + pad * 2];
    b.hot = -1;
    var names = ["top left", "top", "top right", "left", "center", "right", "bottom left", "bottom", "bottom right"];
    b.onDraw = function () {
        var g = this.graphics, C = CW.ui.C;
        for (var i = 0; i < 9; i++) {
            var x = pad + (i % 3) * cell, y = pad + Math.floor(i / 3) * cell;
            if (i === this.hot) { g.newPath(); g.rectPath(x, y, cell, cell); g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, C.hover)); }
            var d = (i === 4) ? 6 : 4;
            g.newPath(); g.rectPath(x + (cell - d) / 2, y + (cell - d) / 2, d, d);
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, i === this.hot ? C.on : C.fg));
        }
    };
    var which = function (e) {
        var cx = Math.floor((e.clientX - pad) / cell), cy = Math.floor((e.clientY - pad) / cell);
        return (cx < 0 || cx > 2 || cy < 0 || cy > 2) ? -1 : cy * 3 + cx;
    };
    b.addEventListener("mousemove", function (e) {
        var i = which(e);
        if (i !== this.hot) { this.hot = i; this.helpTip = i < 0 ? "" : "Anchor point: " + names[i]; this.notify("onDraw"); }
    });
    b.addEventListener("mouseout", function () { this.hot = -1; this.notify("onDraw"); });
    b.addEventListener("click", function (e) { var i = which(e); if (i >= 0) onPick((i % 3) / 2, Math.floor(i / 3) / 2); });
    return b;
};
