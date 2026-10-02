// Icons are rects on a 24 grid: ["f",x,y,w,h] filled (blocks with w,h>=4 get slightly rounded
// corners, like Align Pro's), ["o",x,y,w,h] 2px outline, ["d",x,y,w,h] dashed outline.
(function () {
  var I = {
    // align: a thin guide bar plus two rounded blocks (the longer one first)
    alignLeft:   [["f",2,1,2,22],["f",6,2,16,8],["f",6,13,10,8]],
    alignHC:     [["f",11,1,2,22],["f",1,2,22,8],["f",5,13,14,8]],
    alignRight:  [["f",20,1,2,22],["f",2,2,16,8],["f",8,13,10,8]],
    alignCenter: [["f",11,0,2,24],["f",0,11,24,2],["f",7,7,10,10]],
    alignTop:    [["f",1,2,22,2],["f",3,6,8,17],["f",13,6,8,11]],
    alignVC:     [["f",1,11,22,2],["f",3,3,8,17],["f",13,6,8,11]],
    alignBottom: [["f",1,20,22,2],["f",3,9,8,11],["f",13,3,8,17]],
    // distribute: three blocks with a guide through the edge or centre being spaced
    distTop:     [["f",6,4,12,4],["f",8,10,8,4],["f",6,16,12,4],["f",3,3,18,1],["f",3,9,18,1],["f",3,15,18,1]],
    distVC:      [["f",6,4,12,4],["f",8,10,8,4],["f",6,16,12,4],["f",3,6,18,1],["f",3,12,18,1],["f",3,18,18,1]],
    distBottom:  [["f",6,4,12,4],["f",8,10,8,4],["f",6,16,12,4],["f",3,8,18,1],["f",3,14,18,1],["f",3,20,18,1]],
    distLeft:    [["f",4,6,4,12],["f",10,8,4,8],["f",16,6,4,12],["f",3,3,1,18],["f",9,3,1,18],["f",15,3,1,18]],
    distHC:      [["f",4,6,4,12],["f",10,8,4,8],["f",16,6,4,12],["f",6,3,1,18],["f",12,3,1,18],["f",18,3,1,18]],
    distRight:   [["f",4,6,4,12],["f",10,8,4,8],["f",16,6,4,12],["f",8,3,1,18],["f",14,3,1,18],["f",20,3,1,18]],
    spaceV:      [["f",4,3,16,4],["f",4,17,16,4],["f",11,8,2,8],["f",8,8,8,1],["f",8,15,8,1]],
    spaceH:      [["f",3,4,4,16],["f",17,4,4,16],["f",8,11,8,2],["f",8,8,1,8],["f",15,8,1,8]],
    // align to: every mode is a dashed frame with its own glyph inside
    toSelection: [["d",2,2,20,20],["f",6,6,7,5],["f",11,13,7,5]],
    toComp:      [["d",2,2,20,20],["f",9,9,6,6]],
    toOutside:   [["d",6,6,12,12],["f",10,1,4,3],["f",10,20,4,3],["f",1,10,3,4],["f",20,10,3,4]],
    toKey:       [["d",2,2,20,20],["f",5,5,8,8],["o",12,12,7,7]],
    asGroup:     [["o",2,4,20,16],["f",5,8,6,8],["f",13,8,6,8]],
    toAnchors:   [["f",11,3,2,18],["f",3,11,18,2],["f",9,9,6,6]],
    plus:        [["f",11,5,2,14],["f",5,11,14,2]],
    // trim
    dice:        [["o",3,3,18,18],["f",7,7,3,3],["f",14,7,3,3],["f",10,10,3,3],["f",7,14,3,3],["f",14,14,3,3]],
    // chrome
    stackV:      [["f",3,4,18,6],["f",3,14,18,6]],
    stackH:      [["f",4,3,6,18],["f",14,3,6,18]],
    stackW:      [["f",3,3,8,8],["f",13,3,8,8],["f",3,13,8,8],["f",13,13,8,8]],
    pop:         [["f",13,3,8,2],["f",19,3,2,8],["f",3,7,2,14],["f",3,19,14,2],["f",3,7,6,2],["f",15,13,2,6]]
  };
  function rects(spec) {
    var s = "";
    for (var i = 0; i < spec.length; i++) {
      var o = spec[i], x = o[1], y = o[2], w = o[3], h = o[4];
      if (o[0] === "f") {
        var r = (w >= 4 && h >= 4) ? ' rx="1.6"' : "";
        s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + r + "/>";
      } else if (o[0] === "o") {
        s += '<path fill-rule="evenodd" d="M' + x + ' ' + y + 'h' + w + 'v' + h + 'h-' + w + 'z M' + (x + 2) + ' ' + (y + 2) + 'v' + (h - 4) + 'h' + (w - 4) + 'v-' + (h - 4) + 'z"/>';
      } else {   // dashed outline: a gap-spaced run of short bars on each side
        var d = "", n, k;
        for (k = x; k < x + w; k += 4) { var len = Math.min(2, x + w - k); d += 'M' + k + ' ' + y + 'h' + len + 'v2h-' + len + 'z M' + k + ' ' + (y + h - 2) + 'h' + len + 'v2h-' + len + 'z '; }
        for (k = y + 4; k < y + h - 2; k += 4) { var l2 = Math.min(2, y + h - 2 - k); d += 'M' + x + ' ' + k + 'h2v' + l2 + 'h-2z M' + (x + w - 2) + ' ' + k + 'h2v' + l2 + 'h-2z '; }
        s += '<path d="' + d + '"/>';
      }
    }
    return s;
  }
  window.icon = function (name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + rects(I[name]) + "</svg>";
  };

  // Anchor target: a marker in the accent colour showing where the anchor will go.
  // Corners are L brackets, edges are T shapes, the centre is a plus.
  window.anchorIcon = function (r, c) {
    var X = [6, 13, 20], Y = [6, 13, 20], x = X[c], y = Y[r], d = "";
    if (r === 1 && c === 1) d = "M8 13H18M13 8V18";
    else if (r !== 1 && c !== 1) { var dx = c === 0 ? 8 : -8, dy = r === 0 ? 8 : -8; d = "M" + x + " " + (y + dy) + "V" + y + "H" + (x + dx); }
    else if (r === 0 || r === 2) d = "M8 " + y + "H18M13 " + y + "V" + (r === 0 ? 11 : 15);
    else d = "M" + x + " 8V18M" + x + " 13H" + (c === 0 ? 11 : 15);
    return '<svg viewBox="0 0 26 26" aria-hidden="true"><path class="mk" d="' + d + '"/></svg>';
  };
})();
