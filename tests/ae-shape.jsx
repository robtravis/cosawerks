// CW.shape (reverse path) in AE. SCRATCH PROJECTS ONLY: it uses its own comp "CW-TEST".
var SP=Folder.temp.fsName+"/";
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"shape-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function J(a){ return (a instanceof Array)? a.join(",") : String(a); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+J(d))); }
try {
  if (app.project.file && app.project.file.name.indexOf("Scratch")!==0) throw new Error("not a scratch project: "+app.project.file.name);
  var files=["core/00_core.jsx","modules/shape.jsx"]; for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));
  CW.say=function(m){ log("  SAY: "+String(m).replace(/\n/g," | ")); };
  var comp=null; for (var q=1;q<=app.project.numItems;q++) if (app.project.item(q) instanceof CompItem && app.project.item(q).name==="CW-TEST") comp=app.project.item(q);
  if (!comp) comp=app.project.items.addComp("CW-TEST",1000,600,1,5,30);
  comp.openInViewer();
  function clear(){ for (var i=comp.numLayers;i>=1;i--) comp.layer(i).remove(); var n=comp.layers.addNull(); n.name="probe"; n.enabled=false; }
  function desel(){ for (var i=1;i<=comp.numLayers;i++) comp.layer(i).selected=false; }
  // a shape layer with groups G1..Gn; each: a path from (100,y) to (900,y) plus a stroke
  function build(n){
    clear(); var L=comp.layers.addShape(); L.name="SH"; L.property("ADBE Transform Group").property("ADBE Position").setValue([0,0]);
    for (var i=1;i<=n;i++){
      L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").name="G"+i;
      var g=function(){ return L.property("ADBE Root Vectors Group").property("G"+i).property("ADBE Vectors Group"); };
      g().addProperty("ADBE Vector Shape - Group").name="Path 1";
      var s=new Shape(); s.vertices=[[100,100+i*100],[500,100+i*100],[900,100+i*100]]; s.inTangents=[[0,0],[-40,0],[-40,0]]; s.outTangents=[[40,0],[40,0],[0,0]]; s.closed=false;
      g().property("Path 1").property("ADBE Vector Shape").setValue(s);
      g().addProperty("ADBE Vector Graphic - Stroke").name="Stroke 1";
      g().property("Stroke 1").property("ADBE Vector Stroke Width").setValue(10);
    }
    return L;
  }
  function grp(L,i){ return L.property("ADBE Root Vectors Group").property("G"+i); }
  function stroke(L,i){ return grp(L,i).property("ADBE Vectors Group").property("Stroke 1"); }
  function pathProp(L,i){ return grp(L,i).property("ADBE Vectors Group").property("Path 1").property("ADBE Vector Shape"); }

  log("== A reverse path");
  var L=build(1); desel(); L.selected=true; pathProp(L,1).selected=true;
  var before=pathProp(L,1).value;
  CW.shape.reversePath();
  var after=pathProp(L,1).value;
  T("vertices come back in the opposite order", J(after.vertices[0])===J(before.vertices[2]) && J(after.vertices[2])===J(before.vertices[0]) && J(after.vertices[1])===J(before.vertices[1]), J(after.vertices[0])+" / "+J(after.vertices[2]));
  T("handles swap with the vertices (out handle of the new first = old in handle of the last)", J(after.outTangents[0])===J(before.inTangents[2]) && J(after.inTangents[2])===J(before.outTangents[0]), J(after.outTangents[0])+" vs "+J(before.inTangents[2]));
  CW.shape.reversePath();
  var again=pathProp(L,1).value;
  T("reversing twice restores it exactly", J(again.vertices[0])===J(before.vertices[0]) && J(again.inTangents[1])===J(before.inTangents[1]) && J(again.outTangents[2])===J(before.outTangents[2]), J(again.vertices[0]));
  desel(); L.selected=true; grp(L,1).selected=true; pathProp(L,1).selected=true; CW.shape.reversePath();
  T("a path reached through a selected group AND selected directly flips once, not twice", J(pathProp(L,1).value.vertices[0])===J(before.vertices[2]), J(pathProp(L,1).value.vertices[0]));
  CW.shape.reversePath();   // back
  L=build(3); desel(); L.selected=true; CW.shape.reversePath();
  T("with only the layer selected, every path in it flips", J(pathProp(L,1).value.vertices[0])==="900,200" && J(pathProp(L,3).value.vertices[0])==="900,400", J(pathProp(L,1).value.vertices[0])+" "+J(pathProp(L,3).value.vertices[0]));
  L=build(1); var pp=pathProp(L,1); var s2=new Shape(); s2.vertices=[[100,300],[300,300]]; s2.inTangents=[[0,0],[0,0]]; s2.outTangents=[[0,0],[0,0]]; s2.closed=false;
  pp.setValueAtTime(0,pp.value); pp.setValueAtTime(1,s2); desel(); L.selected=true; pathProp(L,1).selected=true; CW.shape.reversePath();
  var k1=pathProp(L,1).keyValue(1), k2=pathProp(L,1).keyValue(2);
  T("an animated path reverses every keyframe", J(k1.vertices[0])==="900,200" && J(k2.vertices[0])==="300,300" && pathProp(L,1).numKeys===2, J(k1.vertices[0])+" "+J(k2.vertices[0]));
  clear(); var ML=comp.layers.addSolid([.2,.2,.2],"M",400,200,1); var mk=ML.property("ADBE Mask Parade").addProperty("ADBE Mask Atom"); var ms=new Shape(); ms.vertices=[[0,0],[400,0],[400,200],[0,200]]; ms.inTangents=[[0,0],[0,0],[0,0],[0,0]]; ms.outTangents=[[0,0],[0,0],[0,0],[0,0]]; ms.closed=true; mk.property("ADBE Mask Shape").setValue(ms);
  desel(); ML.selected=true; ML.property("ADBE Mask Parade").property(1).property("ADBE Mask Shape").selected=true; CW.shape.reversePath();
  T("a mask path reverses too (closed stays closed)", J(ML.property("ADBE Mask Parade").property(1).property("ADBE Mask Shape").value.vertices[0])==="0,200" && ML.property("ADBE Mask Parade").property(1).property("ADBE Mask Shape").value.closed===true, J(ML.property("ADBE Mask Parade").property(1).property("ADBE Mask Shape").value.vertices[0]));

  log("== B the draw direction really flips (rendered)");
  L=build(1); grp(L,1).property("ADBE Vectors Group").addProperty("ADBE Vector Filter - Trim"); var tr=grp(L,1).property("ADBE Vectors Group").property("ADBE Vector Filter - Trim"); tr.property("ADBE Vector Trim End").setValue(50);
  function side(){ var p=comp.layer("probe").transform.position; p.expression='var out=[-9,-9]; try{ var Q=thisComp.layer("SH"); var a=Q.sampleImage([200,200],[3,3],true,0)[3]; var b=Q.sampleImage([800,200],[3,3],true,0)[3]; out=[a,b]; }catch(err){ out=[-8,-8]; } out'; var v=p.value; p.expression=""; return (v[0]>0.5?"left":"")+(v[1]>0.5?"right":""); }
  T("trim 0-50% draws the LEFT half of a left-to-right path", side()==="left", side());
  desel(); L.selected=true; pathProp(L,1).selected=true; CW.shape.reversePath();
  T("after reversing, the same trim draws the RIGHT half", side()==="right", side());
  clear(); log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
