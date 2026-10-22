// Arrowhead outlines, drawn 100 units long with the TIP at the origin pointing along +x (the body extends to -x).
// Plain data plus one small generator, so the panel can draw its icons from exactly the same shapes.
CW.arrowShapes = {};
CW.arrowShapes.TYPES = [
    ["polygon", "Polygon"], ["triangle", "Triangle"], ["arrowhead", "Arrow Head"], ["arrowtail", "Arrow Tail"],
    ["open", "Open Arrow"], ["heart", "Heart"], ["line", "Flat Line"], ["custom", "Custom"]
];

// Returns { kind:"path"|"polygon", vertices, inTangents, outTangents, closed, stroked } for a type.
CW.arrowShapes.get = function (type) {
    var z = function (n) { var o = []; for (var i = 0; i < n; i++) o.push([0, 0]); return o; };
    var poly = function (v, closed, stroked) { return { kind: "path", vertices: v, inTangents: z(v.length), outTangents: z(v.length), closed: closed, stroked: !!stroked }; };
    if (type === "triangle") return poly([[0, 0], [-100, -50], [-100, 50]], true, false);
    if (type === "arrowhead") return poly([[0, 0], [-100, -55], [-72, 0], [-100, 55]], true, false);
    // the fletching: narrow where it meets the shaft, forked and flaring AWAY (so it extends along +x, unlike the heads)
    if (type === "arrowtail") return poly([[0, 0], [60, -34], [118, -44], [86, 0], [118, 44], [60, 34]], true, false);
    if (type === "open") return poly([[-90, -60], [0, 0], [-90, 60]], false, true);
    if (type === "line") return poly([[0, -50], [0, 50]], false, true);
    if (type === "polygon") return { kind: "polygon", points: 5, radius: 50, center: [-50, 0], stroked: false };
    if (type === "heart") {
        // the classic parametric heart, turned so its point is the tip, with exact bezier handles
        var N = 16, v = [], inT = [], outT = [], s = 100 / 29, i, t, dt = 2 * Math.PI / N;
        for (i = 0; i < N; i++) {
            t = Math.PI + i * dt;                       // start at the point of the heart
            var x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            var dx = 48 * Math.pow(Math.sin(t), 2) * Math.cos(t), dy = -13 * Math.sin(t) + 10 * Math.sin(2 * t) + 6 * Math.sin(3 * t) + 4 * Math.sin(4 * t);
            v.push([-(y + 17) * s, x * s]);
            var tx = -dy * s * dt / 3, ty = dx * s * dt / 3;
            outT.push([tx, ty]); inT.push([-tx, -ty]);
        }
        return { kind: "path", vertices: v, inTangents: inT, outTangents: outT, closed: true, stroked: false };
    }
    // "custom" starts as a plain triangle; the head you save from a drawn path replaces it on each arrow that uses it
    return poly([[0, 0], [-100, -50], [-100, 50]], true, false);
};

// Turn a drawn path into a head: tip at the origin pointing +x (the path is read as pointing right, its right-most point is the tip),
// centred on the line, scaled so its longest side is 100 units like the built-in heads. shape: { vertices, inTangents, outTangents, closed }.
CW.arrowShapes.normalize = function (shape) {
    var v = shape.vertices, n = v.length, i, minX = v[0][0], maxX = v[0][0], minY = v[0][1], maxY = v[0][1];
    for (i = 1; i < n; i++) {
        if (v[i][0] < minX) minX = v[i][0]; if (v[i][0] > maxX) maxX = v[i][0];
        if (v[i][1] < minY) minY = v[i][1]; if (v[i][1] > maxY) maxY = v[i][1];
    }
    var big = Math.max(maxX - minX, maxY - minY), k = big > 0 ? 100 / big : 1, cy = (minY + maxY) / 2, out = { vertices: [], inTangents: [], outTangents: [], closed: !!shape.closed };
    for (i = 0; i < n; i++) {
        out.vertices.push([(v[i][0] - maxX) * k, (v[i][1] - cy) * k]);
        out.inTangents.push([shape.inTangents[i][0] * k, shape.inTangents[i][1] * k]);
        out.outTangents.push([shape.outTangents[i][0] * k, shape.outTangents[i][1] * k]);
    }
    return out;
};

// A head as one short text (no ';' '=' '|' so it can sit inside other strings): "c:x,y,x,y:inx,iny,...:outx,outy,..." with c 1 closed, 0 open.
CW.arrowShapes.pack = function (h) {
    var flat = function (a) { var o = [], i; for (i = 0; i < a.length; i++) { o.push(Math.round(a[i][0] * 1000) / 1000); o.push(Math.round(a[i][1] * 1000) / 1000); } return o.join(","); };
    return (h.closed ? "1" : "0") + ":" + flat(h.vertices) + ":" + flat(h.inTangents) + ":" + flat(h.outTangents);
};
CW.arrowShapes.unpack = function (txt) {
    var parts = String(txt).split(":"), pairs = function (s) { var f = s.split(","), o = [], i; for (i = 0; i + 1 < f.length; i += 2) o.push([parseFloat(f[i]), parseFloat(f[i + 1])]); return o; };
    if (parts.length !== 4) return null;
    var h = { closed: parts[0] === "1", vertices: pairs(parts[1]), inTangents: pairs(parts[2]), outTangents: pairs(parts[3]) };
    return (h.vertices.length > 0 && h.inTangents.length === h.vertices.length && h.outTangents.length === h.vertices.length) ? h : null;
};
