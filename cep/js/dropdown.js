// A dropdown the page draws itself, in place of <select>. Native select popups are unreliable inside CEP panels (long lists in a
// short panel hesitate or never open), so this one opens a scrollable menu sized to the room there is.
//
//   var dd = CWDropdown(parent, items, value);
//   items: [[value, label], ...] and/or { group: "Mine", items: [[value, label], ...] }
//   dd.value (read/write, always a string), dd.setItems(items), and a bubbling "change" event when the user picks something.
(function () {
  var open = null;                                   // the one menu that can be showing

  function close() {
    if (!open) return;
    open.menu.parentNode && open.menu.parentNode.removeChild(open.menu);
    open.el.classList.remove("open");
    document.removeEventListener("mousedown", open.away, true);
    window.removeEventListener("blur", close);
    open = null;
  }

  window.CWDropdown = function (parent, items, value) {
    var el = document.createElement("div"), lbl = document.createElement("span"), state = { items: [], value: String(value === undefined ? "" : value) };
    el.className = "dd"; el.tabIndex = 0; el.setAttribute("role", "button"); lbl.className = "ddl"; el.appendChild(lbl);

    function flat() {
      var out = [];
      state.items.forEach(function (it) { if (it.group) it.items.forEach(function (x) { out.push(x); }); else out.push(it); });
      return out;
    }
    function labelFor(v) { var f = flat(); for (var i = 0; i < f.length; i++) if (String(f[i][0]) === v) return f[i][1]; return v; }
    function render() { lbl.textContent = labelFor(state.value); }
    function pick(v) {
      var changed = v !== state.value;
      state.value = v; render(); close();
      if (changed) el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    Object.defineProperty(el, "value", { get: function () { return state.value; }, set: function (v) { state.value = String(v); render(); } });
    el.setItems = function (list) { state.items = list || []; render(); };

    function show() {
      if (open && open.el === el) { close(); return; }
      close();
      var menu = document.createElement("div"), cur = null;
      menu.className = "ddmenu";
      function addItem(x) {
        var row = document.createElement("div"); row.className = "ddi" + (String(x[0]) === state.value ? " on" : ""); row.textContent = x[1];
        row.addEventListener("mousedown", function (e) { e.preventDefault(); });          // keep focus where it is
        row.addEventListener("click", function (e) { e.stopPropagation(); pick(String(x[0])); });
        menu.appendChild(row); if (String(x[0]) === state.value) cur = row;
      }
      state.items.forEach(function (it) {
        if (it.group) { var g = document.createElement("div"); g.className = "ddg"; g.textContent = it.group; menu.appendChild(g); it.items.forEach(addItem); }
        else addItem(it);
      });
      document.body.appendChild(menu);
      var r = el.getBoundingClientRect(), below = window.innerHeight - r.bottom - 6, above = r.top - 6;
      var h = Math.min(menu.scrollHeight + 2, 320, Math.max(below, above));
      var useBelow = menu.scrollHeight + 2 <= below || below >= above;
      menu.style.width = Math.max(r.width, 120) + "px";
      menu.style.left = Math.max(4, Math.min(r.left, window.innerWidth - Math.max(r.width, 120) - 4)) + "px";
      menu.style.maxHeight = Math.max(60, h) + "px";
      menu.style.top = (useBelow ? r.bottom + 2 : Math.max(4, r.top - Math.min(menu.offsetHeight, h) - 2)) + "px";
      if (cur) menu.scrollTop = Math.max(0, cur.offsetTop - menu.clientHeight / 2 + cur.offsetHeight / 2);
      el.classList.add("open");
      var away = function (e) { if (!menu.contains(e.target) && !el.contains(e.target)) close(); };
      document.addEventListener("mousedown", away, true);
      window.addEventListener("blur", close);
      open = { el: el, menu: menu, away: away };
    }
    // Open on click, like the buttons: the first press in a panel that is not yet active only activates it, and does not always deliver a mousedown.
    el.addEventListener("mousedown", function (e) { e.preventDefault(); });
    el.addEventListener("click", function () { el.focus(); show(); });
    el.addEventListener("keydown", function (e) {
      var f = flat(), i = 0;
      for (; i < f.length; i++) if (String(f[i][0]) === state.value) break;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var n = Math.max(0, Math.min(f.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
        if (open && open.el === el) { state.value = String(f[n][0]); render(); [].forEach.call(open.menu.querySelectorAll(".ddi"), function (r, k) { r.classList.toggle("on", f[k] && String(f[k][0]) === state.value); }); el.dispatchEvent(new Event("change", { bubbles: true })); }
        else pick(String(f[n][0]));
      }
    });

    el.setItems(items || []);
    if (parent) parent.appendChild(el);
    return el;
  };
})();
