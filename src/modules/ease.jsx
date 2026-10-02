// Ease presets: cubic-bezier curves applied to selected keyframes as temporal ease.
// A curve is [x1, y1, x2, y2] (the same as CSS cubic-bezier and Flow's export):
//   out handle of the first key = (x1, y1), in handle of the second key = (x2, y2).
// AE stores a handle as influence (its x extent, in %) and speed (its slope in value/s).
CW.ease = {};

CW.ease._inf = function (x) {
    var p = x * 100;
    if (p < 0.1) p = 0.1;      // AE will not take less than 0.1%
    if (p > 100) p = 100;
    return p;
};

// Per-ease-element value change across a segment: spatial properties use one ease along
// the path (we use the straight-line distance), everything else one ease per dimension.
CW.ease._deltas = function (prop, k1, k2) {
    var n = prop.keyOutTemporalEase(k1).length, a = prop.keyValue(k1), b = prop.keyValue(k2), out = [], j;
    if (!(a instanceof Array)) return [b - a];
    if (n === 1 && a.length > 1) {
        var sum = 0;
        for (j = 0; j < a.length; j++) sum += (b[j] - a[j]) * (b[j] - a[j]);
        return [Math.sqrt(sum)];
    }
    for (j = 0; j < n; j++) out.push(b[j] - a[j]);
    return out;
};

// Apply one curve to the segment k1 -> k2 (adjacent keys) of a property.
CW.ease.applySegment = function (prop, k1, k2, v) {
    var dt = prop.keyTime(k2) - prop.keyTime(k1);
    if (dt <= 0) return false;
    var dv = CW.ease._deltas(prop, k1, k2), n = dv.length, j;
    var x1 = Math.max(v[0], 0.001), x2 = Math.min(v[2], 0.999);
    var infOut = CW.ease._inf(x1), infIn = CW.ease._inf(1 - x2);
    var slopeOut = v[1] / x1, slopeIn = (1 - v[3]) / (1 - x2);

    // The side of each key we are NOT changing is left alone, but it has to be Bezier.
    prop.setInterpolationTypeAtKey(k1, prop.keyInInterpolationType(k1), KeyframeInterpolationType.BEZIER);
    prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, prop.keyOutInterpolationType(k2));

    var outArr = [], inArr = [];
    for (j = 0; j < n; j++) {
        outArr.push(new KeyframeEase(slopeOut * dv[j] / dt, infOut));
        inArr.push(new KeyframeEase(slopeIn * dv[j] / dt, infIn));
    }
    prop.setTemporalEaseAtKey(k1, prop.keyInTemporalEase(k1), outArr);
    prop.setTemporalEaseAtKey(k2, inArr, prop.keyOutTemporalEase(k2));
    return true;
};

// keys: ascending key indices. Several keys: every ADJACENT pair among them. One key: that
// key and the next. Returns how many segments were eased.
CW.ease.applyToProp = function (prop, keys, v) {
    var done = 0, i;
    if (keys.length === 1) {
        if (keys[0] < prop.numKeys && CW.ease.applySegment(prop, keys[0], keys[0] + 1, v)) done++;
        return done;
    }
    for (i = 0; i < keys.length - 1; i++) {
        if (keys[i + 1] === keys[i] + 1 && CW.ease.applySegment(prop, keys[i], keys[i + 1], v)) done++;
    }
    return done;
};

// Read the curve back from a segment, or null when the values do not change (no slope to read).
CW.ease.capture = function (prop, k1, k2) {
    var dt = prop.keyTime(k2) - prop.keyTime(k1), dv = CW.ease._deltas(prop, k1, k2), j, pick = -1;
    for (j = 0; j < dv.length; j++) if (Math.abs(dv[j]) > 1e-9) { pick = j; break; }
    if (pick < 0 || dt <= 0) return null;
    var o = prop.keyOutTemporalEase(k1)[pick], i = prop.keyInTemporalEase(k2)[pick], full = dv[pick] / dt;
    var x1 = o.influence / 100, y1 = (o.speed / full) * x1;
    var dx = i.influence / 100, x2 = 1 - dx, y2 = 1 - (i.speed / full) * dx;
    var r = function (n) { return Math.round(n * 1000) / 1000; };
    return [r(x1), r(y1), r(x2), r(y2)];
};

// Selected properties that have selected keyframes: [{prop, keys}].
CW.ease.targets = function (comp) {
    var sp = comp.selectedProperties, out = [], i, k;
    for (i = 0; i < sp.length; i++) {
        var p = sp[i];
        if (p.propertyType !== PropertyType.PROPERTY || p.numKeys === 0) continue;
        var sk = p.selectedKeys;
        if (!sk || sk.length === 0) continue;
        var keys = [];
        for (k = 0; k < sk.length; k++) keys.push(sk[k]);
        keys.sort(function (a, b) { return a - b; });
        out.push({ prop: p, keys: keys });
    }
    return out;
};

CW.ease.run = function (v) {
    CW.run("Apply ease", function () {
        var comp = CW.activeComp();
        if (!comp) { CW.say("Open a composition and select keyframes."); return; }
        var t = CW.ease.targets(comp), segs = 0, i;
        if (t.length === 0) { CW.say("Select two or more keyframes."); return; }
        for (i = 0; i < t.length; i++) segs += CW.ease.applyToProp(t[i].prop, t[i].keys, v);
        if (segs === 0) CW.say("Select two neighbouring keyframes, or one keyframe that has a next key.");
    });
};

// Read the curve of the first selected segment (for "save as preset").
CW.ease.captureSelected = function () {
    var comp = CW.activeComp();
    if (!comp) return null;
    var t = CW.ease.targets(comp);
    for (var i = 0; i < t.length; i++) {
        var k = t[i].keys, first = k.length === 1 ? k[0] : k[0], second = k.length === 1 ? k[0] + 1 : k[1];
        if (second > t[i].prop.numKeys || second !== first + 1) continue;
        var c = CW.ease.capture(t[i].prop, first, second);
        if (c) return c;
    }
    return null;
};

// ---- Your own presets: one line each, "name<TAB>x1,y1,x2,y2", in the user data folder.
CW.ease.userFile = function () {
    var d = new Folder(Folder.userData.fsName + "/Cosawerks");
    if (!d.exists) d.create();
    return new File(d.fsName + "/ease-user.txt");
};

CW.ease.loadUser = function () {
    var f = CW.ease.userFile(), out = [];
    if (!f.exists) return out;
    f.open("r");
    var txt = f.read();
    f.close();
    var lines = txt.split(/\r\n|\r|\n/);
    for (var i = 0; i < lines.length; i++) {
        var p = lines[i].split("\t");
        if (p.length !== 2) continue;
        var n = p[1].split(",");
        if (n.length !== 4) continue;
        out.push({ name: p[0], v: [parseFloat(n[0]), parseFloat(n[1]), parseFloat(n[2]), parseFloat(n[3])] });
    }
    return out;
};

CW.ease._writeUser = function (list) {
    var f = CW.ease.userFile(), lines = [];
    for (var i = 0; i < list.length; i++) lines.push(list[i].name + "\t" + list[i].v.join(","));
    f.open("w");
    f.lineFeed = "Unix";
    f.write(lines.join("\n"));
    f.close();
};

CW.ease.saveUser = function (name, v) {
    name = name.replace(/[\t\r\n]/g, " ");
    var list = CW.ease.loadUser(), found = false;
    for (var i = 0; i < list.length; i++) if (list[i].name === name) { list[i].v = v; found = true; }
    if (!found) list.push({ name: name, v: v });
    CW.ease._writeUser(list);
};

CW.ease.deleteUser = function (name) {
    var list = CW.ease.loadUser(), keep = [];
    for (var i = 0; i < list.length; i++) if (list[i].name !== name) keep.push(list[i]);
    CW.ease._writeUser(keep);
};
