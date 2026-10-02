// Sharing presets as a file. The panel gathers your saved arrow presets, Type looks and eases into one JSON text; these two
// functions only ask where to save it and where to read it from (AE's own file dialogs).
CW.share = {};
CW.share.EXT = ".cwpresets";

// Ask for a file name (or use `path`, for tests) and write `text` to it. Returns the path written, or "" when cancelled.
CW.share.save = function (text, path0) {
    var f = path0 ? new File(path0) : File.saveDialog("Export Cosawerks presets");
    if (!f) return "";
    var path = f.fsName;
    if (path.toLowerCase().indexOf(CW.share.EXT) !== path.length - CW.share.EXT.length) f = new File(path + CW.share.EXT);
    f.encoding = "UTF-8";
    if (!f.open("w")) throw new Error("Could not write " + f.fsName);
    f.write(text);
    f.close();
    return f.fsName;
};

// Ask for a presets file (or use `path`, for tests) and return its text, or "" when cancelled.
CW.share.open = function (path0) {
    var f = path0 ? new File(path0) : File.openDialog("Import Cosawerks presets");
    if (!f) return "";
    f.encoding = "UTF-8";
    if (!f.open("r")) throw new Error("Could not read " + f.fsName);
    var t = f.read();
    f.close();
    return t;
};
