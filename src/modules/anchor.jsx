// Move the anchor point to a point on the layer's bounds without moving the layer.
CW.anchor = {};

// hx, vy in {0, 0.5, 1}: left/center/right, top/center/bottom.
CW.anchor.move = function (hx, vy) {
    CW.run("Move Anchor Point", function () {
        var comp = CW.activeComp();
        if (!comp || comp.selectedLayers.length === 0) { CW.say("Select one or more layers."); return; }
        var t = comp.time, sel = comp.selectedLayers, skipped = [], done = 0, i;

        for (i = 0; i < sel.length; i++) {
            var layer = sel[i], why = CW.unsupported(layer);
            var ap = layer.transform.property(CW.PROP.anchor);
            if (!why && (ap.numKeys > 0 || ap.expressionEnabled)) why = "anchor point is animated";
            if (!why && !CW.canShift(layer)) why = "position has an expression";
            var rect = why ? null : CW.rectOf(layer, t);
            if (!why && !rect) why = "no bounds";
            if (why) { skipped.push(layer.name + ": " + why); continue; }

            var s = CW.snap(layer, t);
            var na = [rect.left + hx * rect.width, rect.top + vy * rect.height];
            var d = [na[0] - s.anchor[0], na[1] - s.anchor[1]];
            var dp = CW.m.apply(CW.m.lin(s), d);

            var av = ap.value.slice(0);
            av[0] = na[0]; av[1] = na[1];
            ap.setValue(av);
            CW.shift(layer, dp[0], dp[1]);

            done++;
        }
        if (skipped.length) CW.say("Skipped " + skipped.length + " layer(s):\n" + skipped.join("\n"));
    });
};
