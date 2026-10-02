// Arrowhead outlines, drawn 100 units long with the TIP at the origin pointing along +x (the body extends to -x).
// Plain data plus one small generator, so the panel can draw its icons from exactly the same shapes.
CW.arrowShapes = {};
CW.arrowShapes.TYPES = [
    ["polygon", "Polygon"], ["triangle", "Triangle"], ["arrowhead", "Arrow Head"], ["arrowtail", "Arrow Tail"],
    ["open", "Open Arrow"], ["heart", "Heart"], ["line", "Line"]
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
    return poly([[0, 0], [-100, -50], [-100, 50]], true, false);
};
