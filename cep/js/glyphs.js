// Line glyphs for strip buttons, drawn on a 24 grid with a 2px stroke.
(function () {
  var G = {
    camera:      'M4 8h3l2-3h6l2 3h3v11H4z M12 13.5m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
    reload:      'M19 12a7 7 0 1 1-2.2-5.1 M19 4v5h-5',
    "void":      'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M6.5 17.5L17.5 6.5',
    matte:       'M4 4h10v10H4z M10 10h10v10H10z',
    chalk:       'M4 20l1-4L16 5l3 3L8 19z M14 7l3 3',
    dissolveIn:  'M5 12m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0 M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M19 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    dissolveOut: 'M5 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M19 12m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0',
    unprecomp:   'M4 4h9v9 M4 4v9h5 M13 13l7 7 M20 14v6h-6',
    group:       'M3 5h18v14H3z M7 9h4v6H7z M13 9h4v6h-4z',
    explode:     'M9 9h6v6H9z M12 3v3 M12 18v3 M3 12h3 M18 12h3',
    bolt:        'M13 3L5 14h6l-1 7 8-11h-6z',
    layers:      'M12 4l9 5-9 5-9-5z M3 14l9 5 9-5',
    wand:        'M5 19L15 9 M14 4v3 M19 9h-3 M17 5l-2 2 M11 5l1 1',
    star:        'M12 4l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z',
    tag:         'M4 4h8l8 8-8 8-8-8z M8.5 8.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0'
  };
  window.GLYPH_NAMES = Object.keys(G);
  window.glyph = function (name) {
    var d = G[name] || G.tag;
    return '<svg viewBox="0 0 24 24" class="gl" aria-hidden="true"><path d="' + d + '"/></svg>';
  };
})();
