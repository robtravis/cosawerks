// Settings store for the panels. Values live in a file written by the AE host (so every panel shares them
// and they survive restarts), mirrored to localStorage as a fallback. Each flush re-reads the file and
// merges only the keys this panel changed, so two open panels do not overwrite each other.
(function (root) {
  function makeStore(host, ls) {
    var prefs = {}, dirty = {}, timer = null, chain = Promise.resolve();

    function lsRead() {
      var out = {};
      try {
        for (var i = 0; i < ls.length; i++) {
          var k = ls.key(i);
          if (k && k.indexOf("cosawerks.") === 0) { try { out[k.slice(10)] = JSON.parse(ls.getItem(k)); } catch (e) {} }
        }
      } catch (e) {}
      return out;
    }
    function lsWrite(k, v) { try { ls.setItem("cosawerks." + k, JSON.stringify(v)); } catch (e) {} }
    function parse(txt) { try { var o = JSON.parse(txt); return (o && typeof o === "object" && !(o instanceof Array)) ? o : null; } catch (e) { return null; } }

    var api = {
      // Resolves once the saved settings are in memory. Call before building any UI.
      load: function () {
        if (!host.inAE) { prefs = lsRead(); return Promise.resolve(); }
        return host.value("CW.prefs.read()").then(function (txt) {
          txt = String(txt);
          var parsed = parse(txt);
          if (parsed) prefs = parsed;
          else {
            prefs = lsRead();                                  // no file yet (or unreadable): carry over what the browser kept
            for (var k in prefs) dirty[k] = true;
            if (Object.keys(dirty).length) api.flush();
          }
        });
      },
      get: function (k, d) { return Object.prototype.hasOwnProperty.call(prefs, k) ? prefs[k] : d; },
      set: function (k, v) {
        prefs[k] = v; dirty[k] = true; lsWrite(k, v);
        if (!host.inAE) return;
        clearTimeout(timer); timer = setTimeout(function () { api.flush(); }, 250);
      },
      // Writes the changed keys now. Returns a promise.
      flush: function () {
        clearTimeout(timer);
        chain = chain.then(function () {
          var keys = Object.keys(dirty);
          if (!keys.length || !host.inAE) return;
          var send = {}; keys.forEach(function (k) { send[k] = prefs[k]; }); dirty = {};
          return host.value("CW.prefs.read()").then(function (txt) {
            var cur = parse(String(txt)) || {};
            for (var k in send) cur[k] = send[k];
            return host.value("CW.prefs.write(" + JSON.stringify(JSON.stringify(cur)) + ")");
          });
        });
        return chain;
      }
    };
    return api;
  }
  root.makeStore = makeStore;
  if (typeof module !== "undefined") module.exports = makeStore;
})(typeof window !== "undefined" ? window : this);
