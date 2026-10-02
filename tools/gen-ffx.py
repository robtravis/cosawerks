#!/usr/bin/env python3
"""DEV TOOL, only needed when an effect's controls change. Writes dist/gen/*.ffx: first drafts of the effect presets. The files in presets/ are
the ones After Effects itself wrote (Animation > Save Animation Preset), which is what ships: apply a draft in AE, save it, replace presets/.

Builds an animation preset holding ONE pseudo effect ("Arrow") with real dropdowns and groups.

An .ffx is an RIFX file of nested chunks. The per-control record layouts (slider, checkbox, popup, angle, group) are taken as
structural templates from a reference preset that uses the same kind of embedded pseudo effect (pass its path); everything the
effect actually says (names, defaults, ranges, dropdown items, order) comes from SPEC below. Output carries no content from the
reference. Run:  python3 tools/gen-ffx.py "/path/to/ArrowHead.ffx"
"""
import struct, sys, os, re

# Bump the number whenever SPEC changes: AE caches a pseudo effect by this ID for the whole session, and two different layouts
# under one ID raise "effect control conversion required". Keep CW.arrow.FX (src/modules/arrow.jsx) in step.
MATCH = b"Pseudo/cwArrow0002"
EFFECT_NAME = "Arrow"
SHAPES = "Polygon|Triangle|Arrow Head|Arrow Tail|Open Arrow|Heart|Line"
EFFECTS = {}

# (kind, name, default, extra)  kind: slider cb popup angle group end
ARROW_SPEC = [
    ("cb", "Animate", 0, {}),
    ("slider", "Progress", 0, dict(vmin=0, vmax=100, smin=0, smax=100, prec=1, pct=True)),
    ("popup", "Animation", 1, dict(items="Draw|Draw & Off|Travel")),
    ("group", "Travel", 0, {}),
    ("slider", "Travel Length", 30, dict(vmin=1, vmax=100, smin=1, smax=100, prec=1, pct=True)),
    ("end", "", 0, {}),
    ("cb", "Reverse", 0, {}),
    ("group", "Head", 0, {}),
    ("cb", "Show", 1, {}),
    ("popup", "Shape", 2, dict(items=SHAPES)),
    ("slider", "Polygon Points", 5, dict(vmin=3, vmax=24, smin=3, smax=12, prec=0, pct=False)),
    ("slider", "Size", 40, dict(vmin=1, vmax=2000, smin=1, smax=200, prec=1, pct=False)),
    ("angle", "Angle", 0, {}),
    ("slider", "Grow In", 0, dict(vmin=0, vmax=100, smin=0, smax=100, prec=0, pct=True)),
    ("end", "", 0, {}),
    ("group", "Tail", 0, {}),
    ("cb", "Show Tail", 0, {}),
    ("cb", "Tail Same As Head", 1, {}),
    ("popup", "Tail Shape", 4, dict(items=SHAPES)),
    ("slider", "Tail Size", 40, dict(vmin=1, vmax=2000, smin=1, smax=200, prec=1, pct=False)),
    ("angle", "Tail Angle", 0, {}),
    ("end", "", 0, {}),
]

def ease_names():
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "modules", "ease_presets.jsx")).read()
    rt = src[src.index("CW.ease.RT"):src.index("];", src.index("CW.ease.RT"))]
    return ["Linear"] + re.findall(r'name: "([^"]+)"', rt)

TYPE_SPEC = lambda: [
    ("cb", "Animate In", 1, {}),
    ("cb", "Animate Out", 0, {}),
    ("popup", "By", 1, dict(items="Character|Word|Line")),
    ("popup", "Ease", 1 + ease_names().index("50-80"), dict(items="|".join(ease_names()))),
    ("slider", "Delay", 3, dict(vmin=0, vmax=1000, smin=0, smax=30, prec=1, pct=False)),
    ("slider", "Duration", 15, dict(vmin=1, vmax=10000, smin=1, smax=120, prec=1, pct=False)),
    ("slider", "Shift", 0, dict(vmin=-100000, vmax=100000, smin=-60, smax=60, prec=1, pct=False)),
    ("cb", "Reverse Order", 0, {}),
    ("cb", "Random Order", 0, {}),
]

# ---- chunk plumbing ---------------------------------------------------------------------------------------------------
def parse(d, o, end):
    out = []
    while o < end:
        t = d[o:o + 4]; n = struct.unpack(">I", d[o + 4:o + 8])[0]
        if t == b"LIST":
            out.append(["LIST", d[o + 8:o + 12], parse(d, o + 12, o + 8 + n)])
        else:
            out.append([t, d[o + 8:o + 8 + n]])
        o += 8 + n + (n & 1)
    return out

def ser(c):
    if c[0] == "LIST":
        body = c[1] + b"".join(ser(x) for x in c[2])
        return b"LIST" + struct.pack(">I", len(body)) + body
    pad = b"\0" if len(c[1]) & 1 else b""
    return c[0] + struct.pack(">I", len(c[1])) + c[1] + pad

def find(chunks, tag):
    return [c for c in chunks if c[0] == tag]

def cstr(s, size=None):
    b = s.encode("latin1") + b"\0"
    return b.ljust(size, b"\0") if size else b

def mname(i):
    return (MATCH + b"-%04d" % i).ljust(40, b"\0")

# ---- templates from the reference ------------------------------------------------------------------------------------
def load_templates(path):
    d = open(path, "rb").read()
    top = parse(d, 12, 8 + struct.unpack(">I", d[4:8])[0])
    besc = [c for c in top if c[0] == "LIST" and c[1] == b"besc"][0][2]
    effects = [c for c in besc if c[0] == "LIST" and c[1] == b"tdgp" and find(c[2], b"tdsn")[0][1].startswith(b"Effects")][0]
    sspc = [c for c in effects[2] if c[0] == "LIST" and c[1] == b"sspc"][0]
    part = [c for c in sspc[2] if c[0] == "LIST" and c[1] == b"parT"][0]
    pards, i, k = [], 0, part[2]
    while i < len(k):
        if k[i][0] == b"tdmn":
            rec = {"pard": k[i + 1][1], "pdnm": None}
            if i + 2 < len(k) and k[i + 2][0] == b"pdnm": rec["pdnm"] = k[i + 2][1]; i += 1
            pards.append(rec); i += 2
        else: i += 1
    inner = [c for c in sspc[2] if c[0] == "LIST" and c[1] == b"tdgp"][0][2]
    tdbs = [c for c in inner if c[0] == "LIST" and c[1] == b"tdbs"]
    by = {}
    for r, t in zip(pards, tdbs): by[r["pard"][16:48].split(b"\0")[0].decode("latin1")] = (r, t)
    first = pards[0], tdbs[0]
    groupend = (pards[18], tdbs[18])        # the blank-named record closing the Head group
    head = [c for c in top if c[0] == b"head"][0]
    return dict(top=top, besc=besc, effects=effects, sspc=sspc, part=part, by=by, first=first, groupend=groupend, head=head,
                tdsp=[c for c in besc if c[0] == "LIST" and c[1] == b"tdsp"], tdsn=[c for c in besc if c[0] == b"tdsn"],
                beso=[c for c in besc if c[0] == b"beso"][0], pgui=[c for c in sspc[2] if c[0] == b"pgui"][0],
                fnam=[c for c in sspc[2] if c[0] == b"fnam"][0], parn=[c for c in part[2] if c[0] == b"parn"][0])

def dbl(b, v): return struct.pack(">d", float(v)) + b[8:]

def make_param(T, kind, name, default, ex):
    src = {"slider": "End", "cb": "Show", "popup": "Shape", "angle": "Angle", "group": "Head"}.get(kind)
    rec, tdb = T["groupend"] if kind == "end" else T["by"][src]
    pard = bytearray(rec["pard"]); pdnm = rec["pdnm"]
    if kind != "end":
        pard[16:48] = cstr(name, 32)
    tdb = [tdb[0], tdb[1], [list(x) if x[0] != "LIST" else x for x in tdb[2]]]
    chunks = tdb[2]
    for c in chunks:
        if c[0] == b"tdsn": c[1] = cstr(name)
    cd = [c for c in chunks if c[0] == b"cdat"]
    if kind == "slider":
        pard[56:64] = struct.pack(">d", float(default))
        pard[104:108] = struct.pack(">f", ex["vmin"]); pard[108:112] = struct.pack(">f", ex["vmax"])
        pard[112:116] = struct.pack(">f", ex["smin"]); pard[116:120] = struct.pack(">f", ex["smax"])
        pard[120:124] = struct.pack(">f", float(default))
        pard[124:128] = bytes([0, ex["prec"], 0, 1 if ex["pct"] else 0])
        cd[0][1] = dbl(cd[0][1], default)
        for c in chunks:
            if c[0] == b"tdum": c[1] = struct.pack(">d", ex["smin"])
            if c[0] == b"tduM": c[1] = struct.pack(">d", ex["smax"])
    elif kind == "cb":
        pard[59] = pard[60] = 1 if default else 0
        cd[0][1] = dbl(cd[0][1], default)
        pdnm = b"\0"
    elif kind == "popup":
        n = len(ex["items"].split("|"))
        pard[59] = default; pard[60:62] = struct.pack(">H", n); pard[62:64] = struct.pack(">H", default)
        cd[0][1] = dbl(cd[0][1], default)
        pdnm = cstr(ex["items"])
    elif kind == "angle":
        cd[0][1] = dbl(cd[0][1], default)
    return bytes(pard), pdnm, tdb

def build(ref_path, out_path, spec, match, name):
    global MATCH, EFFECT_NAME
    MATCH, EFFECT_NAME = match, name
    T = load_templates(ref_path)
    params = [(T["first"][0]["pard"], T["first"][0]["pdnm"], T["first"][1])]
    for kind, pname, default, ex in spec:
        params.append(make_param(T, kind, pname, default, ex))
    # the effect's own tdbs carries its display name
    p0 = params[0]; t0 = [p0[2][0], p0[2][1], [list(x) if x[0] != "LIST" else x for x in p0[2][2]]]
    for c in t0[2]:
        if c[0] == b"tdsn": c[1] = cstr(EFFECT_NAME)
    params[0] = (p0[0], p0[1], t0)

    # control definitions
    part = [b"parn", struct.pack(">I", len(params))]
    plist = [[b"parn", struct.pack(">I", len(params))]]
    for i, (pard, pdnm, _) in enumerate(params):
        plist.append([b"tdmn", mname(i)]); plist.append([b"pard", pard])
        if pdnm is not None: plist.append([b"pdnm", pdnm])
    parT = ["LIST", b"parT", plist]
    # their stored values
    vals = [[b"tdsb", struct.pack(">I", 1)], [b"tdsn", cstr(EFFECT_NAME)]]
    for i, (_, _, tdb) in enumerate(params):
        vals.append([b"tdmn", mname(i)]); vals.append(tdb)
    vals.append([b"tdmn", b"ADBE Group End".ljust(40, b"\0")])
    inner = ["LIST", b"tdgp", vals]
    sspc = ["LIST", b"sspc", [T["fnam"], parT, inner, T["pgui"]]]
    eff = ["LIST", b"tdgp", [[b"tdsb", struct.pack(">I", 1)], [b"tdsn", cstr("Effects")], [b"tdmn", MATCH.ljust(40, b"\0")], sspc,
                              [b"tdmn", b"ADBE Group End".ljust(40, b"\0")]]]
    # path to the effect group (Effect Parade) and the end sentinel, from the reference's own header blocks
    tdsp, tdsn = T["tdsp"], T["tdsn"]
    besc = ["LIST", b"besc", [T["beso"], tdsp[1], tdsn[1], tdsp[2], eff]]
    body = b"FaFX" + ser(T["head"]) + ser(besc)
    open(out_path, "wb").write(b"RIFX" + struct.pack(">I", len(body)) + body)
    print("wrote", out_path, len(body) + 8, "bytes,", len(params) - 1, "controls")

if __name__ == "__main__":
    ref = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Documents/Adobe/After Effects 2026/User Presets/ArrowHead.ffx")
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist", "gen")      # NOT presets/: see docs/RELEASING.md
    os.makedirs(out, exist_ok=True)
    # Bump each ID (and CW.arrow.FX / CW.typefx.FX in src/modules) whenever that effect's SPEC changes.
    build(ref, os.path.join(out, "Cosawerks Arrow.ffx"), ARROW_SPEC, b"Pseudo/cwArrow0002", "Arrow")
    build(ref, os.path.join(out, "Cosawerks Type.ffx"), TYPE_SPEC(), b"Pseudo/cwType0003", "Type")
