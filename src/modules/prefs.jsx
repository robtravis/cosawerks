// Panel settings: one JSON text file shared by every Cosawerks panel (the panel parses it).
CW.prefs = {};

CW.prefs.file = function () {
    var d = new Folder(Folder.userData.fsName + "/Cosawerks");
    if (!d.exists) d.create();
    return new File(d.fsName + "/prefs.json");
};

CW.prefs.read = function () {
    var f = CW.prefs.file();
    if (!f.exists) return "";
    f.encoding = "UTF-8";
    f.open("r");
    var t = f.read();
    f.close();
    return t;
};

CW.prefs.write = function (text) {
    var f = CW.prefs.file();
    f.encoding = "UTF-8";
    f.open("w");
    f.lineFeed = "Unix";
    f.write(text);
    f.close();
    return "ok";
};
