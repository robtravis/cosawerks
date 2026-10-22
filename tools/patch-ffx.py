#!/usr/bin/env python3
"""Make a draft of an effect preset by patching one that After Effects wrote (Animation > Save Animation Preset): change the effect's
match name and/or the item lists of its dropdown menus. No other file is needed. The draft is for developing and testing; the file that
ships is always one After Effects saved itself (see docs/RELEASING.md).

  python3 tools/patch-ffx.py presets/"Cosawerks Arrow.ffx" dist/gen/"Cosawerks Arrow.ffx" \\
      --match Pseudo/cwArrow0002 Pseudo/cwArrow0003 \\
      --popup "Animation=Draw|Draw & Off|Travel|From Center" --popup "Shape=Polygon|Triangle|..."

Adding or removing controls cannot be done this way: that needs tools/gen-ffx.py (or building them by hand in After Effects' own tools).
"""
import struct, sys, os, argparse

def parse(d, o, end):
    out = []
    while o < end:
        t = d[o:o + 4]; n = struct.unpack(">I", d[o + 4:o + 8])[0]
        if t == b"LIST": out.append(["LIST", d[o + 8:o + 12], parse(d, o + 12, o + 8 + n)])
        else: out.append([t, d[o + 8:o + 8 + n]])
        o += 8 + n + (n & 1)
    return out

def ser(c):
    if c[0] == "LIST":
        body = c[1] + b"".join(ser(x) for x in c[2])
        return b"LIST" + struct.pack(">I", len(body)) + body
    pad = b"\0" if len(c[1]) & 1 else b""
    return c[0] + struct.pack(">I", len(c[1])) + c[1] + pad

def patch(children, match, popups, log):
    for i, c in enumerate(children):
        if c[0] == "LIST":
            patch(c[2], match, popups, log)
        elif c[0] == b"tdmn" and match and match[0] in c[1]:
            c[1] = c[1].replace(match[0], match[1]); log["match"] += 1
        elif c[0] == b"pard":
            name = c[1][16:48].split(b"\0")[0].decode("latin1")
            if name in popups and c[1][15] == 7 and i + 1 < len(children) and children[i + 1][0] == b"pdnm":
                items = popups[name]
                n = len(items.split("|"))
                b = bytearray(c[1]); struct.pack_into(">H", b, 60, n)
                if struct.unpack(">H", b[62:64])[0] > n: struct.pack_into(">H", b, 62, 1)       # a default past the end would be invalid
                if b[59] > n: b[59] = 1
                c[1] = bytes(b)
                txt = items.encode("utf-8")
                children[i + 1][1] = b"Utf8" + struct.pack(">I", len(txt)) + txt
                log["popups"].append("%s: %d items" % (name, n))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--match", nargs=2, metavar=("OLD", "NEW"))
    ap.add_argument("--popup", action="append", default=[], metavar="NAME=a|b|c")
    a = ap.parse_args()
    d = open(a.src, "rb").read()
    size = struct.unpack(">I", d[4:8])[0]
    end = 8 + size
    top = parse(d, 12, end)
    popups = dict(p.split("=", 1) for p in a.popup)
    match = (a.match[0].encode(), a.match[1].encode()) if a.match else None
    if match and len(match[0]) != len(match[1]): sys.exit("the new match name must be the same length as the old one")
    log = {"match": 0, "popups": []}
    patch(top, match, popups, log)
    body = d[8:12] + b"".join(ser(c) for c in top)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    open(a.out, "wb").write(b"RIFX" + struct.pack(">I", len(body)) + body + d[end:])      # keep the trailing metadata packet
    print("wrote %s: %d match-name fields, popups %s" % (a.out, log["match"], "; ".join(log["popups"]) or "none"))
    missing = [n for n in popups if not any(n in x for x in log["popups"])]
    if missing: sys.exit("no such dropdown: " + ", ".join(missing))

main()
