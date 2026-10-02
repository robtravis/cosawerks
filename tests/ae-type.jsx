// CW.typefx in AE. SCRATCH PROJECTS ONLY: makes its own comp "CW-TEST" and clears its layers.
var SP=Folder.temp.fsName+"/";
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"type-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+String(d))); }
try {
  if (app.project.file && app.project.file.name.indexOf("Scratch")!==0) throw new Error("not a scratch project: "+app.project.file.name);
  var files=["core/00_core.jsx","core/10_math.jsx","core/20_layers.jsx","modules/pathx.jsx","modules/ease.jsx","modules/ease_presets.jsx","modules/typefx.jsx"];
  for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));
  CW.say=function(m){ log("  SAY: "+String(m).replace(/\n/g," | ")); };
  var comp=null; for (var q=1;q<=app.project.numItems;q++) if (app.project.item(q) instanceof CompItem && app.project.item(q).name==="CW-TEST") comp=app.project.item(q);
  if (!comp) comp=app.project.items.addComp("CW-TEST",1000,600,1,5,30);
  comp.openInViewer();
  function clear(){ for (var i=comp.numLayers;i>=1;i--) comp.layer(i).remove(); }
  function desel(){ for (var i=1;i<=comp.numLayers;i++) comp.layer(i).selected=false; }
  function textLayer(s){ var L=comp.layers.addText(s); L.property("ADBE Transform Group").property("ADBE Position").setValue([500,300]); return L; }
  function errs(L){ var bad=[]; (function walk(g,path){ for (var i=1;i<=g.numProperties;i++){ var p=g.property(i); if (p.propertyType===PropertyType.PROPERTY){ if (p.canSetExpression && p.expression && p.expressionError) bad.push(path+"/"+p.name+": "+p.expressionError); } else walk(p,path+"/"+p.name); } })(L.property("ADBE Text Properties"),"text"); return bad; }
  function run(o){ var base={preset:"fadeup",by:1,delay:3,dur:15,shift:0,ease:"Linear",animIn:true,animOut:false,reverse:false,random:false}; for (var k in o) base[k]=o[k]; CW.typefx.run(base); }
  var ctl=function(L,k){ return CW.typefx.ctl(L,k); };

  log("== A build");
  clear(); var L=textLayer("Hello World"); desel(); L.selected=true; run({});
  T("the Type effect is on the layer", CW.typefx.isTyped(L), "");
  T("dropdowns are real: ease has 19 items, By has 3", ctl(L,"ease").maxValue>=19 && ctl(L,"by").maxValue===3, ctl(L,"ease").maxValue);
  T("one animator, named for its look", L.property("ADBE Text Properties").property("ADBE Text Animators").numProperties===1 && CW.typefx._anim(L).name==="Cosawerks Type - Fade Up", CW.typefx._anim(L).name);
  var an=CW.typefx._anim(L);
  T("animator carries position and opacity", an.property("ADBE Text Animator Properties").property("ADBE Text Position 3D").value[1]===30 && an.property("ADBE Text Animator Properties").property("ADBE Text Opacity").value===0, "");
  T("no expression errors", errs(L).length===0, errs(L).join(" | "));
  T("selector Based On is characters", an.property("ADBE Text Selectors").property(1).property("ADBE Text Range Type2").value===1, "");
  T("delay 3 and duration 15 by default", ctl(L,"delay").value===3 && ctl(L,"dur").value===15, "");

  log("== B every look builds");
  var bad=[]; var P=CW.typefx.PRESETS;
  for (var pi=0; pi<P.length; pi++){ desel(); L.selected=true; run({preset:P[pi].id}); var e=errs(L); if (e.length || !CW.typefx.isTyped(L)) bad.push(P[pi].id+": "+e.join(";")); }
  T("all looks apply with no errors", bad.length===0, bad.join(" | "));

  log("== C live updates");
  desel(); L.selected=true; run({preset:"fadeup"});
  var n=CW.typefx.update({delay:6,dur:20,shift:4,reverse:true,random:true,animIn:false,animOut:true,ease:"50-80"});
  T("update reports 1 layer", n===1, n);
  T("controls changed", ctl(L,"delay").value===6 && ctl(L,"dur").value===20 && ctl(L,"shift").value===4 && ctl(L,"rev").value===1 && ctl(L,"rnd").value===1 && ctl(L,"animIn").value===0 && ctl(L,"animOut").value===1, "");
  T("ease by name maps to its index (50-80)", ctl(L,"ease").value===CW.typefx.easeIndex("50-80") && CW.typefx.easeIndex("50-80")>1, ctl(L,"ease").value);
  CW.typefx.update({by:2});
  T("by words rebuilds and keeps the look", ctl(L,"by").value===2 && CW.typefx._anim(L).name==="Cosawerks Type - Fade Up", CW.typefx._anim(L).name);
  CW.typefx.update({preset:"pop"});
  T("a new look keeps the unit (words)", ctl(L,"by").value===2 && CW.typefx._anim(L).name==="Cosawerks Type - Pop", CW.typefx._anim(L).name);
  T("still no errors after the edits", errs(L).length===0, errs(L).join(" | "));

  log("== C1 By is a dropdown in the effect");
  T("By is a real dropdown with Character, Word, Line", ctl(L,"by").maxValue===3, ctl(L,"by").maxValue);
  function units(by,str,idx){ var s=str, textIndex=idx, textTotal=str.length, i, T; eval(CW.typefx.unitCode()); return i+"/"+T; }
  T("By character: the index and the count pass straight through", units(1,"Hello World",4)==="4/11", units(1,"Hello World",4));
  T("By word: letters and the space after belong to their word", units(2,"Hello World",1)==="1/2" && units(2,"Hello World",5)==="1/2" && units(2,"Hello World",6)==="1/2" && units(2,"Hello World",7)==="2/2" && units(2,"Hello World",11)==="2/2", units(2,"Hello World",6)+" "+units(2,"Hello World",7));
  T("By word: repeated and leading spaces do not make empty words", units(2,"  a  b ",3)==="1/2" && units(2,"  a  b ",6)==="2/2", units(2,"  a  b ",6));
  T("By line: breaks split the lines", units(3,"ab\rcd\ref",1)==="1/3" && units(3,"ab\rcd\ref",4)==="2/3" && units(3,"ab\rcd\ref",8)==="3/3", units(3,"ab\rcd\ref",8));
  T("one line of text is one unit", units(3,"Hello World",5)==="1/1", units(3,"Hello World",5));
  log("== C2 saved looks");
  clear(); L=textLayer("Hello World"); desel(); L.selected=true; run({preset:"fadeup",delay:5,dur:9,ease:"50-80"});
  var rs=CW.typefx.readString();
  T("readString reports look, timing and properties", rs.indexOf("name=Fade Up;delay=5;dur=9;shift=0;ease=50-80;in=1;out=0;rev=0;rnd=0;by=1;;")===0 && rs.indexOf("ADBE Text Opacity=0")>0 && rs.split("|").length===2 && rs.indexOf("ADBE Text Position 3D=0,30,0")>0, rs);
  desel(); T("readString is null with nothing typed selected", CW.typefx.readString()==="null", "");
  desel(); L.selected=true; run({props:[["ADBE Text Opacity",0],["ADBE Text Rotation",45]],lookName:"Spin"});
  an=CW.typefx._anim(L);
  T("a custom look builds from its own properties", an.name==="Cosawerks Type - Spin" && an.property("ADBE Text Animator Properties").property("ADBE Text Rotation").value===45 && errs(L).length===0, an.name+" "+errs(L).join(";"));
  CW.typefx.update({by:2});
  an=CW.typefx._anim(L);
  T("changing By keeps a custom look", an.name==="Cosawerks Type - Spin" && an.property("ADBE Text Animator Properties").property("ADBE Text Rotation").value===45 && ctl(L,"by").value===2, an.name);
  CW.typefx.update({props:[["ADBE Text Scale 3D",[50,50,50]]],lookName:"Shrink"});
  an=CW.typefx._anim(L);
  T("a new custom look replaces it and keeps the unit", an.name==="Cosawerks Type - Shrink" && an.property("ADBE Text Animator Properties").property("ADBE Text Scale 3D").value[0]===50 && an.property("ADBE Text Animator Properties").property("ADBE Text Rotation").value===0 && ctl(L,"by").value===2, an.name+" by="+ctl(L,"by").value);
  log("== C3 Apply again updates in place");
  clear(); L=textLayer("Hello World"); desel(); L.selected=true; run({preset:"fadeup"});
  CW.typefx.ctl(L,"delay").setValueAtTime(0,3); CW.typefx.ctl(L,"delay").setValueAtTime(1,9);
  desel(); L.selected=true; run({preset:"pop",delay:4,ease:"50-80",by:2});
  T("the effect and its keyframes survive Apply", CW.typefx.ctl(L,"delay").numKeys===2 && L.property("ADBE Effect Parade").numProperties===1, CW.typefx.ctl(L,"delay").numKeys);
  T("the look changed and one animator remains", CW.typefx._anim(L).name==="Cosawerks Type - Pop" && L.property("ADBE Text Properties").property("ADBE Text Animators").numProperties===1, CW.typefx._anim(L).name);
  T("controls follow the new settings", ctl(L,"by").value===2 && ctl(L,"ease").value===CW.typefx.easeIndex("50-80"), "");
  log("== D rendered: invisible at the start, all there at the end (In)");
  clear(); L=textLayer("Hello World"); desel(); L.selected=true; run({preset:"fade",delay:3,dur:10,ease:"Linear"});
  var png0=new File(SP+"type0.png"), png1=new File(SP+"type1.png"), png2=new File(SP+"type2.png");
  comp.saveFrameToPng(0,png0); comp.saveFrameToPng(0.5,png1); comp.saveFrameToPng(2,png2);
  log("  frames written to type0/1/2.png in the temp folder (checked by eye)");
  log("== E remove");
  desel(); L.selected=true; CW.typefx.removeSelected();
  T("remove takes off the animator and the effect", !CW.typefx.isTyped(L) && L.property("ADBE Text Properties").property("ADBE Text Animators").numProperties===0, "");
  clear(); log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
