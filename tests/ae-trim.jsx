// Runs CW.trim against a scratch comp (CW-TEST). SCRATCH PROJECTS ONLY.
var SP=Folder.temp.fsName+"/";
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"trim-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+String(d))); }
try {
  if (app.project.file && app.project.file.name.indexOf("Scratch")!==0) throw new Error("not a scratch project: "+app.project.file.name+". These tests add and delete items. Open an unsaved or Scratch* project.");
  var files=["core/00_core.jsx","core/10_math.jsx","core/20_layers.jsx","modules/ease.jsx","modules/trim.jsx"];
  for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));
  CW.say=function(m){ log("  SAY: "+String(m).replace(/\n/g," | ")); };
  var comp=null; for (var q=1;q<=app.project.numItems;q++) if (app.project.item(q) instanceof CompItem && app.project.item(q).name==="CW-TEST") comp=app.project.item(q);
  if (!comp) comp=app.project.items.addComp("CW-TEST",1000,600,1,5,30);
  comp.openInViewer();
  function clear(){   // keep one probe null: addNull leaves an orphan solid in the project every time
    for (var i=comp.numLayers;i>=1;i--) if (comp.layer(i).name!=="probe") comp.layer(i).remove();
    var has=false; for (var j=1;j<=comp.numLayers;j++) if (comp.layer(j).name==="probe") has=true;
    if (!has){ var n=comp.layers.addNull(); n.name="probe"; n.enabled=false; }
  }
  var YS=[-150,-50,50,150];
  function lines(){
    clear();
    var sh=comp.layers.addShape(); sh.name="LN"; sh.transform.position.setValue([500,300]);
    for (var i=0;i<YS.length;i++){
      var g=sh.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); g.name="g"+i;
      var gi=sh.property("ADBE Root Vectors Group").property(i+1);
      gi.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
      var s=new Shape(); s.vertices=[[-300,YS[i]],[300,YS[i]]]; s.inTangents=[[0,0],[0,0]]; s.outTangents=[[0,0],[0,0]]; s.closed=false;
      sh.property("ADBE Root Vectors Group").property(i+1).property("ADBE Vectors Group").property(1).property("ADBE Vector Shape").setValue(s);
      var st=sh.property("ADBE Root Vectors Group").property(i+1).property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
      sh.property("ADBE Root Vectors Group").property(i+1).property("ADBE Vectors Group").property("ADBE Vector Graphic - Stroke").property("ADBE Vector Stroke Width").setValue(10);
    }
    return sh;
  }
  // alpha of the rendered line at its left and right ends, through AE's own renderer.
  // sampleImage on a shape layer takes comp-sized image coordinates (the layer sits at 500,300 here).
  function ends(i,t){
    var p=comp.layer("probe").transform.position;
    p.expression='var out=[-9,-9]; try{ var L=thisComp.layer("LN"); var a=L.sampleImage([205,'+(300+YS[i])+'],[3,3],true,'+t+')[3]; var b=L.sampleImage([795,'+(300+YS[i])+'],[3,3],true,'+t+')[3]; out=[a,b]; }catch(err){ out=[-8,-8]; } out';
    var v=p.value; p.expression=""; return [v[0],v[1]];
  }
  function state(i,t){ var e=ends(i,t); var l=e[0]>0.5, r=e[1]>0.5; return (l&&r)?"full":(l?"left":(r?"right":"none")); }
  function states(t){ var o=[]; for (var i=0;i<4;i++) o.push(state(i,t)); return o.join(","); }
  var base={mode:"in",reverse:false,frames:60,overlap:0,random:false,seed:1,startTime:0};
  function opt(o){ var r={}; for (var k in base) r[k]=base[k]; for (var k2 in o) r[k2]=o[k2]; return r; }

  log("== T1 sequential, in");
  var L=lines(); T("built 4", CW.trim.build(L,opt({}))===4, "");
  T("t=0 none drawn", states(0)==="none,none,none,none", states(0));
  T("t=0.75", states(0.75)==="full,left,none,none", states(0.75));
  T("t=1.0", states(1.0)==="full,full,none,none", states(1.0));
  T("t=2.0 all drawn", states(2.0)==="full,full,full,full", states(2.0));
  var fx=L.property("ADBE Effect Parade"), names=[]; for (var f=1;f<=fx.numProperties;f++) names.push(fx.property(f).name);
  T("controller present", names.join("|")===CW.trim.FX.join("|"), names.join("|"));
  T("progress has 2 keys", fx.property(CW.trim.FX[0]).property(1).numKeys===2, "");

  log("== T2 overlap 100");
  L=lines(); CW.trim.build(L,opt({overlap:100}));
  T("t=1.0 all half", states(1.0)==="left,left,left,left", states(1.0));
  log("== T2b overlap 50 (n=4: w=0.4, step 0.2)");
  L=lines(); CW.trim.build(L,opt({overlap:50}));
  T("t=1.0 (P=.5): 0 full, 1 and 2 partly drawn, 3 none", states(1.0)==="full,left,left,none", states(1.0));

  log("== T3 random");
  var sets={}, det=true;
  for (var sd=1; sd<=6; sd++){
    L=lines(); CW.trim.build(L,opt({random:true,seed:sd}));
    var s1=states(1.0); sets[s1]=true;
    var cnt=0, parts=s1.split(","); for (var z=0;z<4;z++) if (parts[z]==="full") cnt++;
    T("seed "+sd+" -> 2 full, 2 none", cnt===2 && s1.indexOf("left")<0, s1);
    L=lines(); CW.trim.build(L,opt({random:true,seed:sd})); if (states(1.0)!==s1) det=false;
  }
  var distinct=0; for (var kk in sets) distinct++;
  T("random is repeatable", det, ""); T("different seeds give different orders", distinct>1, distinct);

  log("== T4 out / reverse / inout");
  L=lines(); CW.trim.build(L,opt({mode:"out"}));
  T("out t=0 all drawn", states(0)==="full,full,full,full", states(0));
  T("out t=1.0", states(1.0)==="none,none,full,full", states(1.0));
  T("out t=2.0 all gone", states(2.0)==="none,none,none,none", states(2.0));
  L=lines(); CW.trim.build(L,opt({reverse:true}));
  T("in reversed t=0.75 draws from the right", states(0.75)==="full,right,none,none", states(0.75));
  L=lines(); CW.trim.build(L,opt({mode:"inout",overlap:100}));
  T("inout P=.25 drawing on", states(0.5)==="left,left,left,left", states(0.5));
  T("inout P=.75 drawing off", states(1.5)==="right,right,right,right", states(1.5));
  T("inout P=1 gone", states(2.0)==="none,none,none,none", states(2.0));

  log("== T5 remove / rebuild / run()");
  L=lines(); CW.trim.build(L,opt({})); CW.trim.build(L,opt({}));
  fx=L.property("ADBE Effect Parade"); T("rebuild keeps one controller set", fx.numProperties===4, fx.numProperties);
  var trims=0; for (var gi=1;gi<=4;gi++) if (L.property("ADBE Root Vectors Group").property(gi).property("ADBE Vectors Group").property(CW.trim.NAME)) trims++;
  T("rebuild keeps 4 trims", trims===4, trims);
  var rm=CW.trim.remove(L); T("remove returns 4", rm===4, rm);
  T("controller gone", L.property("ADBE Effect Parade").numProperties===0, "");
  T("lines fully drawn again", states(0)==="full,full,full,full", states(0));
  L=lines(); for (var ii=1;ii<=comp.numLayers;ii++) comp.layer(ii).selected=false; L.selected=true; comp.time=0;
  CW.trim.run({mode:"in",reverse:false,frames:60,overlap:0,random:false,seed:1});
  T("run() on selection", states(1.0)==="full,full,none,none", states(1.0));
  CW.trim.removeSelected(); T("removeSelected", L.property("ADBE Effect Parade").numProperties===0, "");
  log("== T6 live update of the controller");
  L=lines(); for (var u1=1;u1<=comp.numLayers;u1++) comp.layer(u1).selected=false; L.selected=true; comp.time=0;
  CW.trim.run({mode:"in",reverse:false,frames:60,overlap:0,random:false,seed:1});
  T("before update", states(1.0)==="full,full,none,none", states(1.0));
  var nUp=CW.trim.update({overlap:100});
  T("update reports 1 layer", nUp===1, nUp);
  T("overlap 100 live: all half drawn", states(1.0)==="left,left,left,left", states(1.0));
  fx=L.property("ADBE Effect Parade"); T("keyframes survive an update", fx.property(CW.trim.FX[0]).property(1).numKeys===2, "");
  CW.trim.update({overlap:0,random:true,seed:3});
  var r3=states(1.0), cnt3=0, pp3=r3.split(","); for (var z3=0;z3<4;z3++) if (pp3[z3]==="full") cnt3++;
  T("random + seed applied live", cnt3===2 && r3.indexOf("left")<0, r3);
  var other=lines(); for (var u2=1;u2<=comp.numLayers;u2++) comp.layer(u2).selected=false; other.selected=true;
  T("update skips a layer with no controller", CW.trim.update({overlap:50})===0, "");
  log("== T9 trim ease");
  L=lines(); CW.trim.build(L,opt({ease:[0.5,0,0.2,1]}));
  var pk=L.property("ADBE Effect Parade").property(CW.trim.FX[0]).property(1);
  T("the build is eased 50-80 when asked", Math.abs(pk.keyOutTemporalEase(1)[0].influence-50)<1 && Math.abs(pk.keyInTemporalEase(2)[0].influence-80)<1, pk.keyOutTemporalEase(1)[0].influence+" / "+pk.keyInTemporalEase(2)[0].influence);
  L=lines(); CW.trim.build(L,opt({}));
  pk=L.property("ADBE Effect Parade").property(CW.trim.FX[0]).property(1);
  T("no ease given: the build stays linear", Math.abs(pk.keyOutTemporalEase(1)[0].influence-50)>1, pk.keyOutTemporalEase(1)[0].influence);
  clear(); log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
