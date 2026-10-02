// Cosawerks Toggle: fires Window > Extensions > Cosawerks, so a key assigned to this script shows and
// hides the panel (a Blender "N panel" for After Effects). Install: copy this file into
// the Scripts folder of your After Effects (macOS: /Applications/Adobe After Effects <version>/Scripts/) and restart AE.
// After Effects cannot bind a key to a script itself; on macOS use System Settings > Keyboard > Keyboard Shortcuts >
// App Shortcuts, add After Effects, and give the menu title "Cosawerks Toggle.jsx" a shortcut.
(function () {
    var id = app.findMenuCommandId("Cosawerks");
    if (!id) { alert("Cosawerks is not installed: it should be listed under Window > Extensions."); return; }
    app.executeCommand(id);
})();
