// Runs CW.comps and CW.rename in AE. SCRATCH PROJECTS ONLY (it creates and removes items named CWC_*).
var SP=Folder.temp.fsName+"/";
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"comps-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+String(d))); }
try {
  if (app.project.file && app.project.file.name.indexOf("Scratch")!==0) throw new Error("not a scratch project: "+app.project.file.name+". These tests add and delete items. Open an unsaved or Scratch* project.");
  var files=["core/00_core.jsx","core/20_layers.jsx","modules/comps.jsx","modules/rename.jsx"];
  for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));
  var said=[]; CW.say=function(m){ said.push(String(m)); log("  SAY: "+String(m).replace(/\n/g," | ")); };

  function byName(name){ var out=[]; for (var i=1;i<=app.project.numItems;i++) if (app.project.item(i).name===name) out.push(app.project.item(i)); return out; }
  function cleanup(){ for (var i=app.project.numItems;i>=1;i--){ var it=app.project.item(i); if (it.name.indexOf("CWC_")===0) { try{ it.remove(); }catch(e){} } } }
  function deselectAll(){ for (var i=1;i<=app.project.numItems;i++) app.project.item(i).selected=false; }
  function build(){
    cleanup();
    var inner=app.project.items.addComp("CWC_Inner",640,360,1,5,30); inner.layers.addSolid([.2,.4,.6],"CWC_s1",640,360,1); inner.layers.addText("inner text");
    var mid=app.project.items.addComp("CWC_Mid",640,360,1,5,30); mid.layers.addText("mid text"); mid.layers.add(inner);
    var main=app.project.items.addComp("CWC_Main",640,360,1,5,30); var t=main.layers.addText("main text"); main.layers.add(mid); main.layers.add(inner);
    t.transform.position.expression='comp("CWC_Mid").layer(1).transform.position';
    return {inner:inner, mid:mid, main:main};
  }
  function textStates(comp){ var o=[]; for (var i=1;i<=comp.numLayers;i++) if (comp.layer(i).matchName==="ADBE Text Layer") o.push(comp.layer(i).enabled?"on":"off"); return o.join(","); }
  function srcNames(comp){ var o=[]; for (var i=1;i<=comp.numLayers;i++){ var s=CW.comps.sourceComp(comp.layer(i)); if (s) o.push(s.name); } return o.join(","); }

  log("== A deep duplicate with textless");
  var c=build(); deselectAll(); c.main.selected=true; said=[];
  CW.comps.duplicate({suffix:"-TEXTLESS", disableText:true, deep:true, folder:""});
  var dm=byName("CWC_Main-TEXTLESS"), dmid=byName("CWC_Mid-TEXTLESS"), din=byName("CWC_Inner-TEXTLESS");
  T("one copy of each: Main, Mid, Inner (shared nesting duplicated once)", dm.length===1 && dmid.length===1 && din.length===1, dm.length+","+dmid.length+","+din.length);
  T("summary message", said.join("|")==="✓ Duplicated 3 comps (2 nested), turned off 3 text layers, updated 1 expression", said.join("|"));
  T("all text layers in the copies are off", textStates(dm[0])==="off" && textStates(dmid[0])==="off" && textStates(din[0])==="off", textStates(dm[0])+" "+textStates(dmid[0])+" "+textStates(din[0]));
  T("copies nest the copies, not the originals", srcNames(dm[0])==="CWC_Inner-TEXTLESS,CWC_Mid-TEXTLESS" && srcNames(dmid[0])==="CWC_Inner-TEXTLESS", srcNames(dm[0])+" / "+srcNames(dmid[0]));
  var innerFromMain=null; for (var k=1;k<=dm[0].numLayers;k++){ var sc=CW.comps.sourceComp(dm[0].layer(k)); if (sc && sc.name==="CWC_Inner-TEXTLESS") innerFromMain=sc; }
  var innerFromMid=null; for (var k3=1;k3<=dmid[0].numLayers;k3++){ var s3=CW.comps.sourceComp(dmid[0].layer(k3)); if (s3) innerFromMid=s3; }
  T("the shared Inner copy is one item", innerFromMain && innerFromMid && innerFromMain.id===innerFromMid.id, "");
  T("originals untouched: text on, still nest originals", textStates(c.main)==="on" && textStates(c.mid)==="on" && textStates(c.inner)==="on" && srcNames(c.main)==="CWC_Inner,CWC_Mid" && srcNames(c.mid)==="CWC_Inner", textStates(c.main)+" "+srcNames(c.main));
  var ex=null; for (var k2=1;k2<=dm[0].numLayers;k2++) if (CW.comps.isText(dm[0].layer(k2))) ex=dm[0].layer(k2).transform.position.expression;
  T("comp(\"...\") references in expressions follow the copies", ex==='comp("CWC_Mid-TEXTLESS").layer(1).transform.position', ex);
  T("original expression unchanged", c.main.layer(c.main.numLayers).transform.position.expression==='comp("CWC_Mid").layer(1).transform.position' || c.main.layer(1).transform.position.expression.indexOf('CWC_Mid")')>0, "");

  log("== B shallow duplicate");
  c=build(); deselectAll(); c.main.selected=true; said=[];
  CW.comps.duplicate({suffix:"-S", disableText:true, deep:false, folder:""});
  var sh=byName("CWC_Main-S");
  T("only the selected comp is duplicated", sh.length===1 && byName("CWC_Mid-S").length===0 && byName("CWC_Inner-S").length===0, "");
  T("nested comps still point at the originals", srcNames(sh[0])==="CWC_Inner,CWC_Mid", srcNames(sh[0]));
  T("its own text is off", textStates(sh[0])==="off", textStates(sh[0]));
  T("it warns that nested text is still on", said.join("|").indexOf("still on")>0, said.join("|"));

  log("== C text switch off is optional, folder option");
  c=build(); deselectAll(); c.mid.selected=true; said=[];
  CW.comps.duplicate({suffix:"-KEEP", disableText:false, deep:true, folder:"CWC_Textless"});
  var kp=byName("CWC_Mid-KEEP");
  T("text stays on when not asked to turn it off", kp.length===1 && textStates(kp[0])==="on", kp.length?textStates(kp[0]):"none");
  T("copies go into the named folder", kp.length===1 && kp[0].parentFolder && kp[0].parentFolder.name==="CWC_Textless" && byName("CWC_Inner-KEEP")[0].parentFolder.name==="CWC_Textless", "");

  log("== D rename layers");
  cleanup(); var rc=app.project.items.addComp("CWC_R",640,360,1,5,30);
  var ls=[], nm4=["A","B","C","D"]; for (var q4=0;q4<4;q4++) ls.push(rc.layers.addSolid([.5,.5,.5],nm4[q4],100,100,1));
  rc.openInViewer(); function selLayers(arr){ for (var i=1;i<=rc.numLayers;i++) rc.layer(i).selected=false; for (var j=0;j<arr.length;j++) arr[j].selected=true; }
  function names(){ var o=[]; for (var i=1;i<=rc.numLayers;i++) o.push(rc.layer(i).name); return o.join(","); }
  selLayers(ls); said=[];
  CW.rename.run("layers",{mode:"number",base:"Dot",start:1,step:1,pad:2,where:"suffix",sep:" "});
  T("numbering runs top to bottom", names()==="Dot 01,Dot 02,Dot 03,Dot 04", names());
  T("reports the count", said.join("|")==="✓ Renamed 4 of 4 layers", said.join("|"));
  CW.rename.run("layers",{mode:"replace",find:"dot",replace:"Pt"});
  T("find/replace (case-insensitive)", names()==="Pt 01,Pt 02,Pt 03,Pt 04", names());
  CW.rename.run("layers",{mode:"affix",prefix:"fx_",suffix:"_a"}); T("prefix and suffix", names()==="fx_Pt 01_a,fx_Pt 02_a,fx_Pt 03_a,fx_Pt 04_a", names());
  CW.rename.run("layers",{mode:"case",kind:"upper"}); T("upper case", names()==="FX_PT 01_A,FX_PT 02_A,FX_PT 03_A,FX_PT 04_A", names());
  selLayers([rc.layer(2)]); CW.rename.run("layers",{mode:"case",kind:"lower"}); T("only the selected layer changes", names()==="FX_PT 01_A,fx_pt 02_a,FX_PT 03_A,FX_PT 04_A", names());
  said=[]; CW.rename.run("layers",{mode:"replace",find:"(",replace:"",regex:true}); T("a bad regular expression is reported, nothing renamed", said.join("|").indexOf("valid regular expression")>=0 && names()==="FX_PT 01_A,fx_pt 02_a,FX_PT 03_A,FX_PT 04_A", said.join("|"));
  said=[]; CW.rename.run("layers",{mode:"replace",find:"",replace:"x"}); T("empty find is reported", said.join("|").indexOf("Enter the text")>=0, said.join("|"));

  log("== E rename comps and project items");
  var c2=app.project.items.addComp("CWC_Alpha",320,180,1,2,30), c3=app.project.items.addComp("CWC_Beta",320,180,1,2,30), fol=app.project.items.addFolder("CWC_Fol");
  deselectAll(); c2.selected=true; c3.selected=true; said=[];
  CW.rename.run("comps",{mode:"replace",find:"CWC_",replace:"CWC_Z-"});
  T("renames the selected comps", c2.name==="CWC_Z-Alpha" && c3.name==="CWC_Z-Beta", c2.name+","+c3.name);
  deselectAll(); c2.selected=true; fol.selected=true; said=[];
  CW.rename.run("comps",{mode:"affix",suffix:"_C"}); T("comps target skips folders", c2.name==="CWC_Z-Alpha_C" && fol.name==="CWC_Fol", c2.name+","+fol.name);
  CW.rename.run("items",{mode:"affix",suffix:"_I"}); T("items target renames everything selected", c2.name==="CWC_Z-Alpha_C_I" && fol.name==="CWC_Fol_I", c2.name+","+fol.name);
  deselectAll();
  said=[]; CW.rename.run("comps",{mode:"affix",suffix:"_N"});
  T("comps target with nothing selected asks for a selection", said.join("|").indexOf("Select compositions")>=0, said.join("|"));

  cleanup(); log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
