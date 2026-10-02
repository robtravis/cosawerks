// CW.nulls in AE. SCRATCH PROJECTS ONLY: makes its own comp "CW-TEST" and clears its layers.
var SP=Folder.temp.fsName+"/";
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"nulls-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+String(d))); }
function near(a,b,t){ return Math.abs(a-b)<(t===undefined?0.05:t); }
function J(a){ return (a instanceof Array)? a.join(",") : String(a); }
try {
  if (app.project.file && app.project.file.name.indexOf("Scratch")!==0) throw new Error("not a scratch project: "+app.project.file.name);
  var files=["core/00_core.jsx","core/10_math.jsx","core/20_layers.jsx","modules/pathx.jsx","modules/nulls.jsx"];
  for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));
  CW.say=function(m){ log("  SAY: "+String(m).replace(/\n/g," | ")); };
  var comp=null; for (var q=1;q<=app.project.numItems;q++) if (app.project.item(q) instanceof CompItem && app.project.item(q).name==="CW-TEST") comp=app.project.item(q);
  if (!comp) comp=app.project.items.addComp("CW-TEST",1000,600,1,5,30);
  comp.openInViewer();
  function clear(){ for (var i=comp.numLayers;i>=1;i--) comp.layer(i).remove(); }
  function desel(){ for (var i=1;i<=comp.numLayers;i++) comp.layer(i).selected=false; }
  // a shape layer "Shape" at (500,300) holding group "G" (optionally transformed) with an open 3 point path with handles
  function shapeLayer(grpPos,grpScale,grpRot){
    var L=comp.layers.addShape(); L.name="Shape"; L.property("ADBE Transform Group").property("ADBE Position").setValue([500,300]);
    L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").name="G";
    var inner=function(){ return L.property("ADBE Root Vectors Group").property("G").property("ADBE Vectors Group"); };
    inner().addProperty("ADBE Vector Shape - Group").name="Path 1";
    var sh=new Shape(); sh.vertices=[[-200,50],[0,-100],[200,50]]; sh.inTangents=[[0,0],[-60,0],[-40,-30]]; sh.outTangents=[[40,-30],[60,0],[0,0]]; sh.closed=false;
    inner().property("Path 1").property("ADBE Vector Shape").setValue(sh);
    inner().addProperty("ADBE Vector Graphic - Stroke");
    if (grpPos){ var tg=L.property("ADBE Root Vectors Group").property("G").property("ADBE Vector Transform Group"); tg.property("ADBE Vector Position").setValue(grpPos); if (grpScale) tg.property("ADBE Vector Scale").setValue(grpScale); if (grpRot) tg.property("ADBE Vector Rotation").setValue(grpRot); }
    return L;
  }
  function pathProp(L){ return L.property("ADBE Root Vectors Group").property("G").property("ADBE Vectors Group").property("Path 1").property("ADBE Vector Shape"); }
  function pick(L){ desel(); pathProp(L).selected=true; }
  function nullNamed(n){ return comp.layer(n); }
  function nullPos(n){ var v=nullNamed(n).property("ADBE Transform Group").property("ADBE Position").value; return [v[0],v[1]]; }

  log("== A Nulls Drive Path");
  clear(); var L=shapeLayer(); pick(L); CW.nulls.run({kind:"drive"});
  T("three nulls, above the layer", comp.numLayers===4 && comp.layer(4).name==="Shape" && comp.layer(1).name==="Shape pt 1", comp.numLayers+" "+comp.layer(1).name);
  T("each null sits on its vertex in comp space", near(nullPos("Shape pt 1")[0],300)&&near(nullPos("Shape pt 1")[1],350)&&near(nullPos("Shape pt 2")[0],500)&&near(nullPos("Shape pt 2")[1],200)&&near(nullPos("Shape pt 3")[0],700), J(nullPos("Shape pt 1"))+" "+J(nullPos("Shape pt 2")));
  var sp=pathProp(L), v0=sp.valueAtTime(0,false);
  T("the path is unchanged while the nulls sit still", near(v0.vertices[0][0],-200)&&near(v0.vertices[1][1],-100)&&near(v0.vertices[2][0],200), J(v0.vertices));
  T("handles keep their shape", near(v0.outTangents[1][0],60)&&near(v0.inTangents[2][0],-40)&&near(v0.inTangents[2][1],-30), J(v0.inTangents));
  T("no expression errors", !sp.expressionError, sp.expressionError);
  nullNamed("Shape pt 2").property("ADBE Transform Group").property("ADBE Position").setValue([560,150]);
  var v1=pathProp(L).valueAtTime(0,false);
  T("moving a null moves its vertex (500,200 -> 560,150 is +60,-50)", near(v1.vertices[1][0],60)&&near(v1.vertices[1][1],-150), J(v1.vertices[1]));
  T("the other vertices stay", near(v1.vertices[0][0],-200)&&near(v1.vertices[2][0],200), "");
  pick(L); CW.nulls.release();
  T("release makes it an ordinary path where it is now", !pathProp(L).expression && near(pathProp(L).value.vertices[1][0],60), pathProp(L).expression);
  nullNamed("Shape pt 2").property("ADBE Transform Group").property("ADBE Position").setValue([500,200]);
  T("after release the nulls no longer move it", near(pathProp(L).value.vertices[1][0],60), "");

  log("== B Nulls Follow Path");
  clear(); L=shapeLayer(); pick(L); CW.nulls.run({kind:"follow"});
  T("nulls land on the vertices", near(nullPos("Shape pt 1")[0],300)&&near(nullPos("Shape pt 3")[0],700)&&near(nullPos("Shape pt 3")[1],350), J(nullPos("Shape pt 3")));
  var nv=pathProp(L).value; nv.vertices=[[-200,50],[0,-100],[250,0]]; pathProp(L).setValue(nv);
  T("editing the path moves the nulls", near(nullPos("Shape pt 3")[0],750)&&near(nullPos("Shape pt 3")[1],300), J(nullPos("Shape pt 3")));
  T("the path itself has no expression", !pathProp(L).expression, "");
  T("no expression errors on the nulls", !nullNamed("Shape pt 1").property("ADBE Transform Group").property("ADBE Position").expressionError, nullNamed("Shape pt 1").property("ADBE Transform Group").property("ADBE Position").expressionError);

  log("== C a transformed group");
  clear(); L=shapeLayer([100,40],[50,50],30); pick(L); CW.nulls.run({kind:"drive"});
  var sp2=pathProp(L), vv=sp2.valueAtTime(0,false);
  T("the path is unchanged even through a moved, scaled and rotated group", near(vv.vertices[0][0],-200,0.1)&&near(vv.vertices[1][1],-100,0.1)&&near(vv.vertices[2][0],200,0.1) && !sp2.expressionError, J(vv.vertices)+" "+sp2.expressionError);
  var p2=nullPos("Shape pt 2"), before=nullPos("Shape pt 2");
  nullNamed("Shape pt 2").property("ADBE Transform Group").property("ADBE Position").setValue([before[0]+20,before[1]]);
  var vm=pathProp(L).valueAtTime(0,false);
  T("a null moved 20 px right moves the vertex 40 (the group is at 50%)", near(vm.vertices[1][0],40,0.2)||near(vm.vertices[1][0],40*Math.cos(0.5236),0.5), J(vm.vertices[1]));

  log("== D guards");
  clear(); L=shapeLayer(); desel(); T("nothing selected: says so, makes nothing", (function(){ CW.nulls.run({kind:"drive"}); return comp.numLayers===1; })(), comp.numLayers);
  pick(L); CW.nulls.release(); T("release on a normal path is refused", comp.numLayers===1, "");
  clear(); log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
