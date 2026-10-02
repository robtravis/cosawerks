// Runs CW.ease and CW.bounce against a scratch comp (CW-TEST). SCRATCH PROJECTS ONLY.
var SP=Folder.temp.fsName+"/";
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"ease-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+String(d))); }
function near(a,b,t){ return Math.abs(a-b)<(t===undefined?0.02:t); }
try {
  if (app.project.file && app.project.file.name.indexOf("Scratch")!==0) throw new Error("not a scratch project: "+app.project.file.name+". These tests add and delete items. Open an unsaved or Scratch* project.");
  var files=["core/00_core.jsx","modules/ease.jsx","modules/ease_presets.jsx","modules/bounce.jsx"];
  for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));
  CW.say=function(m){ log("  SAY: "+String(m).replace(/\n/g," | ")); };
  var PROD_DEFAULTS=CW.bounce.DEFAULTS;
  CW.bounce.DEFAULTS={amp:100,freq:3,decay:6};   // fixed fixture values so the numeric checks below do not move when the product defaults change
  var comp=null; for (var q=1;q<=app.project.numItems;q++) if (app.project.item(q) instanceof CompItem && app.project.item(q).name==="CW-TEST") comp=app.project.item(q);
  if (!comp) comp=app.project.items.addComp("CW-TEST",1000,600,1,5,30);
  comp.openInViewer();
  function clear(){ for (var i=comp.numLayers;i>=1;i--) comp.layer(i).remove(); }
  function layer(){ clear(); var s=comp.layers.addSolid([0.5,0.5,0.5],"E",200,100,1); return s; }
  // CSS cubic-bezier evaluated at x, to compare against what AE actually renders
  function cb(x1,y1,x2,y2,x){
    var lo=0, hi=1, t=0.5, i;
    for (i=0;i<60;i++){ t=(lo+hi)/2; var bx=3*(1-t)*(1-t)*t*x1+3*(1-t)*t*t*x2+t*t*t; if (bx<x) lo=t; else hi=t; }
    return 3*(1-t)*(1-t)*t*y1+3*(1-t)*t*t*y2+t*t*t;
  }
  function fresh(){ var L=layer(); var r=L.transform.rotation; r.setValueAtTime(0,0); r.setValueAtTime(1,100); return r; }

  log("== A curves actually shape the motion (1D rotation 0->100 over 1s)");
  var tests=[["50-50",[0.5,0,0.5,1]],["0-70",[0,0,0.3,1]],["100-100",[1,0,0,1]],["Standard",[0.4,0,0.2,1]],["Acceleration",[0.4,0,1,1]],
             ["Back out",[0.34,1.56,0.64,1]],["Back in-out",[0.68,-0.6,0.32,1.6]],["Quad in",[0.11,0,0.5,0]]];
  for (var ti=0; ti<tests.length; ti++){
    var r=fresh(), c=tests[ti][1], n=CW.ease.applyToProp(r,[1,2],c), bad="";
    var xs=[0.1,0.25,0.5,0.75,0.9];
    for (var xi=0;xi<xs.length;xi++){ var got=r.valueAtTime(xs[xi],false), want=100*cb(c[0],c[1],c[2],c[3],xs[xi]); if (!near(got,want,1.0)) bad+=" x="+xs[xi]+" got "+got.toFixed(2)+" want "+want.toFixed(2); }
    T(tests[ti][0]+" segments="+n, n===1 && bad==="", bad);
  }

  log("== B multi-dimensional");
  var L=layer(); var sc=L.transform.scale; sc.setValueAtTime(0,[100,100]); sc.setValueAtTime(1,[200,50]);
  CW.ease.applyToProp(sc,[1,2],[0.5,0,0.5,1]);
  var v=sc.valueAtTime(0.25,false), e=cb(0.5,0,0.5,1,0.25);
  T("scale each dimension follows the curve", near(v[0],100+100*e,1.0)&&near(v[1],100-50*e,1.0), v.join(",")+" want "+(100+100*e)+","+(100-50*e));
  L=layer(); var ps=L.transform.position; ps.setValueAtTime(0,[100,100]); ps.setValueAtTime(1,[500,300]);
  CW.ease.applyToProp(ps,[1,2],[0.4,0,0.2,1]);
  v=ps.valueAtTime(0.25,false); e=cb(0.4,0,0.2,1,0.25);
  T("position (spatial) follows the curve", near(v[0],100+400*e,2.0)&&near(v[1],100+200*e,2.0), v.join(",")+" want "+(100+400*e)+","+(100+200*e));
  // AE clamps overshoot on spatial properties: documenting it so nobody expects otherwise
  L=layer(); ps=L.transform.position; ps.setValueAtTime(0,[100,100]); ps.setValueAtTime(1,[500,100]);
  CW.ease.applyToProp(ps,[1,2],[0.34,1.56,0.64,1]);
  var past=false; for (var xx=0.05; xx<1; xx+=0.05) if (ps.valueAtTime(xx,false)[0]>500.5) past=true;
  T("position cannot overshoot its end key (AE limit)", !past, "");
  L=layer(); ps=L.transform.position; ps.dimensionsSeparated=true; var px=L.transform.property("ADBE Position_0");
  px.setValueAtTime(0,100); px.setValueAtTime(1,500); CW.ease.applyToProp(px,[1,2],[0.34,1.56,0.64,1]);
  past=false; for (var yy=0.05; yy<1; yy+=0.05) if (px.valueAtTime(yy,false)>500.5) past=true;
  T("separated X position CAN overshoot", past, "");

  log("== C only the chosen keys change");
  L=layer(); r=L.transform.rotation; r.setValueAtTime(0,0); r.setValueAtTime(1,100); r.setValueAtTime(2,0);
  var k1out=r.keyOutTemporalEase(1)[0], k2in=r.keyInTemporalEase(2)[0], k2out0=r.keyOutTemporalEase(2)[0];
  CW.ease.applyToProp(r,[2,3],[0.5,0,0.5,1]);
  T("key 1 out untouched", near(r.keyOutTemporalEase(1)[0].influence,k1out.influence,0.01)&&near(r.keyOutTemporalEase(1)[0].speed,k1out.speed,0.01), "");
  T("key 2 in untouched", near(r.keyInTemporalEase(2)[0].influence,k2in.influence,0.01), r.keyInTemporalEase(2)[0].influence+" vs "+k2in.influence);
  T("key 2 out now 50%", near(r.keyOutTemporalEase(2)[0].influence,50,0.5), r.keyOutTemporalEase(2)[0].influence);
  T("key 3 in now 50%", near(r.keyInTemporalEase(3)[0].influence,50,0.5), r.keyInTemporalEase(3)[0].influence);
  L=layer(); r=L.transform.rotation; r.setValueAtTime(0,0); r.setValueAtTime(1,100); r.setValueAtTime(2,0);
  T("one key = that key and the next", CW.ease.applyToProp(r,[1],[0.5,0,0.5,1])===1 && near(r.keyInTemporalEase(2)[0].influence,50,0.5), "");
  T("last key alone does nothing", CW.ease.applyToProp(r,[3],[0.5,0,0.5,1])===0, "");
  T("non-adjacent keys skipped", CW.ease.applyToProp(r,[1,3],[0.5,0,0.5,1])===0, "");

  log("== D capture round-trip, every preset");
  var all=CW.ease.RT.concat(CW.ease.MW), badp=[];
  for (var pi=0; pi<all.length; pi++){
    r=fresh(); CW.ease.applyToProp(r,[1,2],all[pi].v); var c2=CW.ease.capture(r,1,2);
    var ok=c2 && near(c2[0],all[pi].v[0],0.01)&&near(c2[1],all[pi].v[1],0.01)&&near(c2[2],all[pi].v[2],0.01)&&near(c2[3],all[pi].v[3],0.01);
    if (!ok) badp.push(all[pi].name+" -> "+(c2?c2.join(","):"null")+" want "+all[pi].v.join(","));
  }
  T("all "+all.length+" presets round-trip", badp.length===0, badp.join(" ; "));
  r=fresh(); r.setValueAtTime(1,0); T("flat segment captures null", CW.ease.capture(r,1,2)===null, "");

  log("== E selection-driven run()");
  L=layer(); r=L.transform.rotation; r.setValueAtTime(0,0); r.setValueAtTime(1,100); r.setValueAtTime(2,50);
  r.setSelectedAtKey(1,true); r.setSelectedAtKey(2,true); r.setSelectedAtKey(3,false); r.selected=true;
  CW.ease.run([0.5,0,0.5,1]);
  T("run() eased the selected pair", near(r.keyOutTemporalEase(1)[0].influence,50,0.5)&&near(r.keyInTemporalEase(2)[0].influence,50,0.5), r.keyOutTemporalEase(1)[0].influence);
  var cap=CW.ease.captureSelected(); T("captureSelected reads it back", cap && near(cap[0],0.5,0.01)&&near(cap[2],0.5,0.01), cap);

  log("== F your own presets");
  var tmp=new File(SP+"ease-user-test.txt"); if (tmp.exists) tmp.remove();
  CW.ease.userFile=function(){ return tmp; };
  T("empty at first", CW.ease.loadUser().length===0, "");
  CW.ease.saveUser("Mine A",[0.1,0.2,0.3,0.4]); CW.ease.saveUser("Mine B",[0.5,0,0.5,1]); CW.ease.saveUser("Mine A",[0.9,0,0.1,1]);
  var ul=CW.ease.loadUser();
  T("saved, overwrite by name", ul.length===2 && ul[0].name==="Mine A" && near(ul[0].v[0],0.9,0.0001), ul.length);
  CW.ease.deleteUser("Mine A"); ul=CW.ease.loadUser(); T("delete", ul.length===1 && ul[0].name==="Mine B", ul.length);
  tmp.remove();

  log("== G bounce");
  L=layer(); r=L.transform.rotation; r.setValueAtTime(0,0); r.setValueAtTime(1,90);
  L.selected=false; r.selected=true;
  CW.bounce.run("overshoot");
  var fx=L.property("ADBE Effect Parade"), names=[]; for (var f=1;f<=fx.numProperties;f++) names.push(fx.property(f).name);
  T("controls added", names.join("|")===CW.bounce.FX.join("|"), names.join("|"));
  r=L.transform.rotation;
  T("expression set, no error", r.expression.indexOf(CW.bounce.MARK)===0 && r.expressionError==="", r.expressionError);
  T("before the last key it is just the animation", near(r.valueAtTime(0.5,false),45,0.01), r.valueAtTime(0.5,false));
  var ov=r.valueAtTime(1.1,false); T("overshoot rings past the key", ov>91, ov);
  CW.bounce.run("bounce"); r=L.transform.rotation;
  var bo=r.valueAtTime(1.1,false); T("bounce rebounds the other way", bo<89 && r.expression.indexOf("bounce")>0, bo);
  T("still one control set", L.property("ADBE Effect Parade").numProperties===3, L.property("ADBE Effect Parade").numProperties);
  L.property("ADBE Effect Parade").property(CW.bounce.FX[0]).property(1).setValue(0);
  T("amplitude 0 = no bounce", near(r.valueAtTime(1.1,false),90,0.001), r.valueAtTime(1.1,false));
  var cleared=CW.bounce.removeFromLayer(L);
  T("remove clears expression and controls", cleared===1 && L.transform.rotation.expression==="" && L.property("ADBE Effect Parade").numProperties===0, cleared);
  log("== H bounce after an ease (the reported bugs: no ring, then a dead gap)");
  // ring = what the expression adds on top of the keyframed animation (valueAtTime(t,true) is pre-expression)
  function ring(prop,t){ return prop.valueAtTime(t,false)-prop.valueAtTime(t,true); }
  function maxRing(prop,t0,t1){ var m=0; for (var tt=t0; tt<=t1+1e-9; tt+=1/30){ var v=Math.abs(ring(prop,tt)); if (v>m) m=v; } return m; }
  var curves=[["50-50",[0.5,0,0.5,1],8],["Standard",[0.4,0,0.2,1],10],["Sharp",[0.4,0,0.6,1],6],["0-100 (long tail)",[0,0,0,1],14]];
  for (var ci=0; ci<curves.length; ci++){
    L=layer(); r=L.transform.rotation; r.setValueAtTime(0,0); r.setValueAtTime(1,90);
    CW.ease.applyToProp(r,[1,2],curves[ci][1]);
    L.selected=false; r.selected=true; CW.bounce.run("overshoot"); r=L.transform.rotation;
    var nm=curves[ci][0];
    T(nm+": no expression error", r.expressionError==="", r.expressionError);
    T(nm+": ring has started by the key (no dead gap)", maxRing(r,1-6/30,1.0)>0.3, maxRing(r,1-6/30,1.0));
    T(nm+": nothing rings long before the move settles", Math.abs(ring(r,1-curves[ci][2]/30))<0.01, ring(r,1-curves[ci][2]/30));
    T(nm+": it peaks after arriving", maxRing(r,1.0,1.5)>1.5, maxRing(r,1.0,1.5));
    CW.bounce.run("bounce"); r=L.transform.rotation;
    var minB=0; for (var tb=1-6/30; tb<=1.5; tb+=1/30){ var rv=ring(r,tb); if (rv<minB) minB=rv; }
    T(nm+": bounce rebounds the other way", minB<-1.5, minB);
  }
  L=layer(); r=L.transform.rotation; r.setValueAtTime(0,0); r.setValueAtTime(1,90); L.selected=false; r.selected=true; CW.bounce.run("overshoot"); r=L.transform.rotation;
  T("linear move: no early ring, exactly as before", near(r.valueAtTime(1.0,false),90,0.05) && near(r.valueAtTime(1.1,false)-90,4.70,0.2), r.valueAtTime(1.0,false)+" / "+(r.valueAtTime(1.1,false)-90));
  L=layer(); var p2=L.transform.position; p2.setValueAtTime(0,[100,100]); p2.setValueAtTime(1,[500,300]); CW.ease.applyToProp(p2,[1,2],[0.5,0,0.5,1]);
  L.selected=false; p2.selected=true; CW.bounce.run("overshoot"); p2=L.transform.position;
  var pv=p2.valueAtTime(1.1,false); T("eased 2D position rings too", Math.abs(pv[0]-500)>1 && p2.expressionError==="", pv.join(","));
  var s3=L.transform.scale; s3.setValueAtTime(0,[100,100]); s3.setValueAtTime(0.5,[150,150]); s3.setValueAtTime(1,[100,100]);
  L.selected=false; s3.selected=true; CW.bounce.run("overshoot"); s3=L.transform.scale;
  T("middle key rings after it passes (linear 3-key scale)", Math.abs(s3.valueAtTime(0.6,false)[0]-(150-(0.1*100)))>0.5, s3.valueAtTime(0.6,false).join(","));
  log("== I product defaults for new controls");
  CW.bounce.DEFAULTS=PROD_DEFAULTS;
  L=layer(); r=L.transform.rotation; r.setValueAtTime(0,0); r.setValueAtTime(1,90); L.selected=false; r.selected=true; CW.bounce.run("overshoot");
  var fx2=L.property("ADBE Effect Parade");
  var dv=[fx2.property(CW.bounce.FX[0]).property(1).value, fx2.property(CW.bounce.FX[1]).property(1).value, fx2.property(CW.bounce.FX[2]).property(1).value];
  T("new controls start at amplitude 50, frequency 2, decay 10", dv[0]===50 && dv[1]===2 && dv[2]===10, dv.join(","));
  fx2.property(CW.bounce.FX[0]).property(1).setValue(77); r=L.transform.rotation; r.selected=true; CW.bounce.run("bounce");
  T("re-applying keeps the layer's own values", L.property("ADBE Effect Parade").property(CW.bounce.FX[0]).property(1).value===77, "");
  T("no expression error with the product defaults", L.transform.rotation.expressionError==="", L.transform.rotation.expressionError);
  clear(); log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
