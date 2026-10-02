// Transform math on plain "snapshots" so it can be tested outside AE.
// snapshot = { pos:[x,y], anchor:[x,y], scale:[sx,sy] (percent), rot:deg, parent:snapshot|null }
// AE conventions: y is down, positive rotation is clockwise, and a child's position is
// in its parent's LAYER coordinates (origin at the parent's top-left, the same space the
// parent's anchor point lives in). Verified in AE: setting .parent offsets position by
// -(parent.position - parent.anchor).
CW.m = {};

// Own linear part, rotation * scale, as [a,b,c,d]: x' = a*x + b*y, y' = c*x + d*y
CW.m.lin = function (s) {
    var r = s.rot * Math.PI / 180, co = Math.cos(r), si = Math.sin(r);
    var sx = s.scale[0] / 100, sy = s.scale[1] / 100;
    return [co * sx, -si * sy, si * sx, co * sy];
};

CW.m.mul = function (A, B) {
    return [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3],
            A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]];
};

CW.m.apply = function (M, v) {
    return [M[0] * v[0] + M[1] * v[1], M[2] * v[0] + M[3] * v[1]];
};

// Inverse, or null when the matrix is singular (a layer scaled to 0).
CW.m.inv = function (M) {
    var det = M[0] * M[3] - M[1] * M[2];
    if (Math.abs(det) < 1e-9) return null;
    return [M[3] / det, -M[1] / det, -M[2] / det, M[0] / det];
};

// Layer-space point -> parent space (the parent's layer coordinates, or the comp if no parent).
CW.m.toParent = function (s, p) {
    var d = [p[0] - s.anchor[0], p[1] - s.anchor[1]];
    var v = CW.m.apply(CW.m.lin(s), d);
    return [s.pos[0] + v[0], s.pos[1] + v[1]];
};

// Layer-space point -> composition space, walking up the parent chain.
CW.m.toComp = function (s, p) {
    var q = CW.m.toParent(s, p);
    if (!s.parent) return q;
    return CW.m.toComp(s.parent, q);
};

// Linear map taking a vector in s's parent space to composition space.
CW.m.parentLin = function (s) {
    if (!s.parent) return [1, 0, 0, 1];
    return CW.m.mul(CW.m.parentLin(s.parent), CW.m.lin(s.parent));
};

// A composition-space move expressed in s's parent space, or null if not invertible.
CW.m.compDeltaToParent = function (s, dx, dy) {
    var inv = CW.m.inv(CW.m.parentLin(s));
    return inv ? CW.m.apply(inv, [dx, dy]) : null;
};

// Composition-space axis-aligned box [l,t,r,b] of a layer-space rect {left,top,width,height}.
CW.m.rectBox = function (s, rect) {
    var xs = [rect.left, rect.left + rect.width], ys = [rect.top, rect.top + rect.height];
    var l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
        var c = CW.m.toComp(s, [xs[i], ys[j]]);
        if (c[0] < l) l = c[0]; if (c[0] > r) r = c[0];
        if (c[1] < t) t = c[1]; if (c[1] > b) b = c[1];
    }
    return [l, t, r, b];
};
