// The only file that knows how the panel talks to After Effects. A UXP build would replace
// this one file; panel.js only ever calls host.call("namespace.fn", [args]).
(function () {
  var cep = window.__adobe_cep__ || null;
  var host = { ready: false, inAE: !!cep };

  function rawEval(code) {
    return new Promise(function (resolve) {
      if (!cep) { resolve("(not running inside After Effects)"); return; }
      cep.evalScript(code, function (res) { resolve(res === undefined ? "" : String(res)); });
    });
  }

  function extensionPath() {
    var p = cep.getSystemPath("extension");              // file:///Users/... possibly encoded
    return decodeURI(p).replace(/^file:\/\//, "");
  }

  // Load the ExtendScript modules (core + logic, no ScriptUI) into AE once.
  host.init = function () {
    if (!cep) { host.ready = true; return Promise.resolve(""); }
    var path = extensionPath() + "/jsx/host.jsx";
    return rawEval('try { $.evalFile(File("' + path.replace(/"/g, '\\"') + '")); "ok" } catch (e) { "load failed: " + e.toString() }')
      .then(function (r) { host.ready = (r === "ok"); return host.ready ? "" : r; });
  };

  // host.call("anchor.move", [0.5, 0]) runs CW.anchor.move(0.5, 0) and resolves to the
  // messages the tool wanted to show the user ("" when it simply worked).
  host.call = function (name, args) {
    var a = (args || []).map(function (x) { return JSON.stringify(x); }).join(", ");
    return rawEval("CW.rpc(function () { CW." + name + "(" + a + "); })");
  };

  // Run an ExtendScript expression and resolve to its raw string result (for reading values back).
  host.value = function (expr) { return rawEval(expr); };

  // Panel state that every call needs, set right before it (keeps the host stateless).
  host.setAlignState = function (st) {
    return rawEval("CW.align.state.mode=" + JSON.stringify(st.mode) + ";CW.align.state.group=" + !!st.group + ";CW.align.state.anchors=" + !!st.anchors + ";'ok'");
  };

  // Resize this panel (works for floating panels; a docked panel's size belongs to AE's workspace).
  host.resize = function (w, h) { if (cep && cep.resizeContent) cep.resizeContent(w, h); };

  // Open one of the other Cosawerks panels (a section "popping out").
  host.openPanel = function (extensionId) {
    if (cep && cep.requestOpenExtension) cep.requestOpenExtension(extensionId, "");
  };

  host.skin = function () {
    if (!cep) return null;
    try { return JSON.parse(cep.getHostEnvironment()).appSkinInfo; } catch (e) { return null; }
  };
  host.onThemeChange = function (fn) {
    if (cep) cep.addEventListener("com.adobe.csxs.events.ThemeColorChanged", fn);
  };

  window.host = host;
})();
