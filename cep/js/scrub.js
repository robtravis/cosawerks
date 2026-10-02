// After Effects style number fields: hover a value and drag sideways to change it (Shift = coarse, Ctrl/Alt = fine),
// click to type. Works on every text input with the "num" class whose value is a number, so each panel gets it for free.
// While dragging, a "change" event is fired about every 120 ms and again on release, so live panels follow the drag.
(function () {
  var drag = null, DEAD = 3;

  function numeric(el) { return el && el.tagName === "INPUT" && el.classList.contains("num") && !el.classList.contains("txt") && /^\s*-?\d+(\.\d+)?\s*$/.test(el.value); }
  function decimals(s) { var m = /\.(\d+)/.exec(s); return m ? m[1].length : 0; }
  function fire(el) { el.dispatchEvent(new Event("change", { bubbles: true })); }

  document.addEventListener("mousedown", function (e) {
    var el = e.target;
    if (e.button !== 0 || !numeric(el) || document.activeElement === el) return;   // already typing: normal editing
    e.preventDefault();                                                              // no text selection while scrubbing
    var d = decimals(el.value);
    drag = { el: el, x: e.clientX, start: parseFloat(el.value), d: d, step: parseFloat(el.getAttribute("data-step")) || (d ? Math.pow(10, -d) : 1),
             min: el.hasAttribute("data-min") ? parseFloat(el.getAttribute("data-min")) : -Infinity,
             max: el.hasAttribute("data-max") ? parseFloat(el.getAttribute("data-max")) : Infinity, moved: false, last: 0 };
  });

  document.addEventListener("mousemove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < DEAD) return;
    if (!drag.moved) { drag.moved = true; document.body.style.cursor = "ew-resize"; }
    var mult = e.shiftKey ? 10 : (e.ctrlKey || e.altKey || e.metaKey) ? 0.1 : 1;
    var v = drag.start + Math.round(dx / 2) * drag.step * mult;                       // 2 px per step
    v = Math.max(drag.min, Math.min(drag.max, v));
    var places = Math.max(drag.d, mult < 1 ? decimals(String(drag.step * mult)) : 0);
    drag.el.value = v.toFixed(places);
    var now = Date.now();
    if (now - drag.last > 120) { drag.last = now; fire(drag.el); }
  });

  // if the first press only activated the panel and no mousedown arrived, the click still starts editing
  document.addEventListener("click", function (e) {
    if (numeric(e.target) && document.activeElement !== e.target && !drag) { e.target.focus(); e.target.select(); }
  });

  document.addEventListener("mouseup", function () {
    if (!drag) return;
    var el = drag.el, moved = drag.moved;
    drag = null; document.body.style.cursor = "";
    if (moved) fire(el); else { el.focus(); el.select(); }                            // a plain click edits the number
  });
})();
