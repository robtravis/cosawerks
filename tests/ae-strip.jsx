// CW.strip checks. Part 1 touches no project (a temp file and menu lookups). Part 2 changes the project, so it
// only runs in a scratch project: unsaved, or a file whose name starts with "Scratch". SCRATCH PROJECTS ONLY.
var SP=Folder.temp.fsName+"/";
var LOG=new File(SP+"strip-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+String(d))); }
try {
  $.evalFile(new File(Folder.userData.fsName+"/../Application Support/Adobe/CEP/extensions/Cosawerks/jsx/host.jsx"));
  var tmp=new File(SP+"strip-test.json"); if (tmp.exists) tmp.remove();
  var realStore=CW.strip.storeFile; CW.strip.storeFile=function(){ return tmp; };
  T("empty store reads as empty text", CW.strip.readStore()==="", CW.strip.readStore());
  var text='[{"name":"Caf\\u00e9 \\u2713 \\"quoted\\"","type":"script","target":"~/a b/c.jsx"}]';
  CW.strip.writeStore(text); T("store round-trips exactly", CW.strip.readStore()===text, CW.strip.readStore());
  tmp.remove(); CW.strip.storeFile=realStore;
  T("menu lookup: real command found, nonsense gives 0", CW.strip.menuId("Save")>0 && !CW.strip.menuId("No Such Menu Command Zzz"), "");
  var msgs=[]; var old=CW.say; CW.say=function(m){ msgs.push(String(m)); };
  CW.strip.run({type:"script",target:"~/nope/missing.jsx"}); CW.strip.run({type:"preset",target:"~/nope/missing.ffx"}); CW.strip.run({type:"command",target:"No Such Menu Command Zzz"}); CW.strip.run({type:"script",target:""}); CW.strip.run({type:"banana",target:"x"});
  CW.say=old;
  T("error paths are reported", msgs[0].indexOf("Script not found")===0 && msgs[1].indexOf("Preset not found")===0 && msgs[2].indexOf("No menu command")===0 && msgs[3].indexOf("nothing to run")>0 && msgs[4].indexOf("Unknown button type")===0, msgs.join(" | "));

  // custom icons: read a real .svg and .png, refuse oversize, library file round-trip (no project touched)
  var svgf=new File(SP+"ic test.svg"); svgf.open("w"); svgf.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>'); svgf.close();
  var rs=CW.strip.readIcon(svgf.fsName); T("custom SVG icon is read", rs.indexOf("svg\t<svg")===0, rs); svgf.remove();
  T("missing and unsupported icon files are reported", CW.strip.readIcon(SP+"nope.svg").indexOf("error\t")===0 && CW.strip.readIcon(SP+"x.txt").indexOf("error\t")===0, "");
  T("base64 encoder handles padding", CW.strip.base64("a")==="YQ==" && CW.strip.base64("ab")==="YWI=" && CW.strip.base64("abc")==="YWJj", CW.strip.base64("ab"));

  var scratch = !app.project.file || app.project.file.name.indexOf("Scratch")===0;
  if (!scratch) { log("SKIPPED part 2: the open project is " + app.project.file.name + ", not a scratch project"); }
  else {
    CW.say=function(m){ log("  SAY: "+String(m).replace(/\n/g," | ")); };
    var comp=null; for (var q=1;q<=app.project.numItems;q++) if (app.project.item(q) instanceof CompItem && app.project.item(q).name==="CW-TEST") comp=app.project.item(q);
    if (!comp) comp=app.project.items.addComp("CW-TEST",1000,600,1,5,30);
    comp.openInViewer(); for (var i=comp.numLayers;i>=1;i--) comp.layer(i).remove();
    var L=comp.layers.addSolid([.5,.5,.5],"S",200,100,1); for (var k=1;k<=comp.numLayers;k++) comp.layer(k).selected=false; L.selected=true;
    CW.strip.run({type:"effect",target:"ADBE Gaussian Blur 2"});
    T("effect button adds the effect", L.property("ADBE Effect Parade").numProperties===1 && L.property("ADBE Effect Parade").property(1).matchName==="ADBE Gaussian Blur 2", L.property("ADBE Effect Parade").numProperties);
    CW.strip.run({type:"preset",target:"~/Library/Application Support/Cosawerks/buttons/Set-Matte.ffx"});
    var names=[]; for (var e=1;e<=L.property("ADBE Effect Parade").numProperties;e++) names.push(L.property("ADBE Effect Parade").property(e).matchName);
    T("preset button applies the .ffx (Set Matte)", L.property("ADBE Effect Parade").numProperties>=2 && names.join(",").indexOf("Set Matte")>=0, names.join(","));
    var r=L.transform.rotation; r.setValueAtTime(0,0); r.setValueAtTime(1,90); L.selected=false; r.selected=true;
    CW.strip.run({type:"expression",target:"value + 5"});
    T("expression button sets the expression", L.transform.rotation.expression==="value + 5", L.transform.rotation.expression);
    var sf=new File(SP+"strip-run-test.jsx"); sf.open("w"); sf.write('$.global.cwStripRan=(($.global.cwStripRan||0)+1);'); sf.close();
    CW.strip.run({type:"script",target:sf.fsName}); T("script button runs the file", $.global.cwStripRan===1, $.global.cwStripRan); sf.remove();
    for (var i2=comp.numLayers;i2>=1;i2--) comp.layer(i2).remove();
  }
  log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
