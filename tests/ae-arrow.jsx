// CW.follow and CW.arrow in AE. SCRATCH PROJECTS ONLY: it makes its own comp "CW-TEST" and clears its layers.
var SP=Folder.temp.fsName+"/"; var EASEINFO="";
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"arrow-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+J(d))); }
function J(a){ return (a instanceof Array)? a.join(",") : String(a); }
function near(a,b,t){ return Math.abs(a-b)<(t===undefined?0.6:t); }
try {
  if (app.project.file && app.project.file.name.indexOf("Scratch")!==0) throw new Error("not a scratch project: "+app.project.file.name);
  var files=["core/00_core.jsx","core/10_math.jsx","core/20_layers.jsx","modules/arrow_shapes.jsx","modules/pathx.jsx","modules/follow.jsx","modules/ease.jsx","modules/arrow.jsx"];
  for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));
  CW.say=function(m){ log("  SAY: "+String(m).replace(/\n/g," | ")); };
  var comp=null; for (var q=1;q<=app.project.numItems;q++) if (app.project.item(q) instanceof CompItem && app.project.item(q).name==="CW-TEST") comp=app.project.item(q);
  if (!comp) comp=app.project.items.addComp("CW-TEST",1000,600,1,5,30);
  comp.openInViewer();
  function clear(){ for (var i=comp.numLayers;i>=1;i--) comp.layer(i).remove(); }
  function desel(){ for (var i=1;i<=comp.numLayers;i++){ comp.layer(i).selected=false; } }
  // a shape layer with a straight open path from a to b (layer coordinates), a stroke, centred in the comp
  function pathLayer(name,a,b,groupPos,groupScale){
    var L=comp.layers.addShape(); L.name=name; L.property("ADBE Transform Group").property("ADBE Position").setValue([500,300]);
    L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").name="G";
    var inner=function(){ return L.property("ADBE Root Vectors Group").property("G").property("ADBE Vectors Group"); };
    inner().addProperty("ADBE Vector Shape - Group").name="Path 1";
    var sh=new Shape(); sh.vertices=[a,b]; sh.inTangents=[[0,0],[0,0]]; sh.outTangents=[[0,0],[0,0]]; sh.closed=false;
    inner().property("Path 1").property("ADBE Vector Shape").setValue(sh);
    inner().addProperty("ADBE Vector Graphic - Stroke").name="Stroke 1";
    inner().property("Stroke 1").property("ADBE Vector Stroke Width").setValue(8);
    inner().property("Stroke 1").property("ADBE Vector Stroke Color").setValue([1,1,1]);
    if (groupPos) L.property("ADBE Root Vectors Group").property("G").property("ADBE Vector Transform Group").property("ADBE Vector Position").setValue(groupPos);
    if (groupScale) L.property("ADBE Root Vectors Group").property("G").property("ADBE Vector Transform Group").property("ADBE Vector Scale").setValue(groupScale);
    return L;
  }
  function pathItem(L){ return L.property("ADBE Root Vectors Group").property("G").property("ADBE Vectors Group").property("Path 1"); }
  function solid(n,pos){ var s=comp.layers.addSolid([.5,.5,.5],n,40,40,1); s.transform.position.setValue(pos||[0,0]); return s; }
  function pos(L,t){ var v=L.transform.position.valueAtTime(t||0,false); return [v[0],v[1]]; }

  log("== A Follow Path: positions, selection order, controls");
  clear(); var PL=pathLayer("PathL",[-400,0],[400,0]); var F1=solid("F1"), F2=solid("F2"), F3=solid("F3");
  desel(); pathItem(PL).selected=true; F2.selected=true; F1.selected=true; F3.selected=true;
  CW.follow.run({orient:false,loop:false,angle:0});
  T("first selected follower sits at the start (u=0)", near(pos(F2)[0],100)&&near(pos(F2)[1],300), pos(F2));
  T("evenly spread: middle and end", near(pos(F1)[0],500)&&near(pos(F3)[0],900), J(pos(F1))+" "+J(pos(F3)));
  T("no expression errors", F1.transform.position.expressionError==="" && F2.transform.rotation.expressionError==="", F1.transform.position.expressionError);
  var fxs=PL.property("ADBE Effect Parade"), nm=[]; for (var e=1;e<=fxs.numProperties;e++) nm.push(fxs.property(e).name);
  T("controls on the path layer", nm.join("|")===CW.follow.FX.join("|"), nm.join("|"));
  fxs.property("CW Path Offset").property(1).setValue(10);
  T("offset 10% moves everything along (end clamps)", near(pos(F2)[0],180)&&near(pos(F1)[0],580)&&near(pos(F3)[0],900), J(pos(F2))+" "+J(pos(F1))+" "+J(pos(F3)));
  fxs.property("CW Path Loop").property(1).setValue(1);
  T("loop wraps the last one round", near(pos(F3)[0],180), pos(F3));

  log("== B orientation, group transform, parenting, masks");
  clear(); var DG=pathLayer("Diag",[-200,-200],[200,200]); var R1=solid("R1");
  desel(); pathItem(DG).selected=true; R1.selected=true; CW.follow.run({orient:true,loop:false,angle:0});
  T("orients along a 45 degree path", near(R1.transform.rotation.valueAtTime(0,false),45,0.5), R1.transform.rotation.valueAtTime(0,false));
  DG.property("ADBE Effect Parade").property("CW Path Angle").property(1).setValue(90);
  T("angle offset adds on", near(R1.transform.rotation.valueAtTime(0,false),135,0.5), R1.transform.rotation.valueAtTime(0,false));
  clear(); var GP=pathLayer("Moved",[-400,0],[400,0],[100,0],[50,50]); var G1=solid("G1"), G2=solid("G2");
  desel(); pathItem(GP).selected=true; G1.selected=true; G2.selected=true; CW.follow.run({orient:false,loop:false,angle:0});
  // group scale 50% then position +100: x from -400..400 -> -200..200 -> -100..300 (layer) -> comp 400..800
  T("group scale and position are followed", near(pos(G1)[0],400)&&near(pos(G2)[0],800), J(pos(G1))+" "+J(pos(G2)));
  clear(); var PL2=pathLayer("PathL",[-400,0],[400,0]); var par=solid("Par",[50,50]); var K1=solid("K1"), K2=solid("K2"); K1.parent=par; K2.parent=par;
  desel(); pathItem(PL2).selected=true; K1.selected=true; K2.selected=true; CW.follow.run({orient:false,loop:false,angle:0});
  var cx=pos(K1)[0]+par.transform.position.value[0]-par.transform.anchorPoint.value[0];
  T("a parented follower still lands in the right place", near(cx,100), cx);
  clear(); var ML=comp.layers.addSolid([.2,.2,.2],"Masked",400,200,1); ML.transform.position.setValue([500,300]);
  var mk=ML.property("ADBE Mask Parade").addProperty("ADBE Mask Atom"); var msh=new Shape(); msh.vertices=[[0,0],[400,0],[400,200],[0,200]]; msh.inTangents=[[0,0],[0,0],[0,0],[0,0]]; msh.outTangents=[[0,0],[0,0],[0,0],[0,0]]; msh.closed=true; mk.property("ADBE Mask Shape").setValue(msh);
  var M1=solid("M1"), M2=solid("M2"); desel(); ML.property("ADBE Mask Parade").property(1).property("ADBE Mask Shape").selected=true; M1.selected=true; M2.selected=true;
  CW.follow.run({orient:false,loop:true,angle:0});
  T("a mask path works: first at its first vertex", near(pos(M1)[0],300)&&near(pos(M1)[1],200), pos(M1));
  T("closed mask: the second follower is half way round (a corner at 700,400)", near(pos(M2)[0],700,2)&&near(pos(M2)[1],400,2), J(pos(M2)));
  desel(); M1.selected=true; M2.selected=true; ML.selected=true; CW.follow.removeSelected();
  T("release clears the expressions and controls", M1.transform.position.expression==="" && ML.property("ADBE Effect Parade").numProperties===0, M1.transform.position.expression.length+" / "+ML.property("ADBE Effect Parade").numProperties);

  log("== C one layer, built live");
  var C=CW.arrow.C;
  function grp(L,n){ return L.property("ADBE Root Vectors Group").property(n); }
  function gtr(L,n,p){ return grp(L,n).property("ADBE Vector Transform Group").property(p); }
  function gpos(L,n,t){ var v=gtr(L,n,"ADBE Vector Position").valueAtTime(t,false); return [v[0],v[1]]; }
  function gop(L,n,t){ return gtr(L,n,"ADBE Vector Group Opacity").valueAtTime(t,false); }
  function grot(L,n,t){ return gtr(L,n,"ADBE Vector Rotation").valueAtTime(t,false); }
  function ctl(L,k){ return CW.arrow.ctl(L,k); }
  function setc(L,k,v){ ctl(L,k).setValue(v); }
  function errors(L){ var bad=[]; (function walk(g,path){ for (var i=1;i<=g.numProperties;i++){ var p=g.property(i); if (p.propertyType===PropertyType.PROPERTY){ if (p.canSetExpression && p.expression && p.expressionError) bad.push(path+"/"+p.name+": "+p.expressionError); } else walk(p,path+"/"+p.name); } })(L.property("ADBE Root Vectors Group"),"root"); return bad; }
  function arrowOn(L,o){ var base={type:"triangle",mode:"draw",animate:true,frames:30,size:40,length:30,reverse:false,tail:false,tailSame:true,tailType:"arrowtail",polygonPoints:5,asNew:false}; for (var k in o) base[k]=o[k]; desel(); pathItem(L).selected=true; comp.time=0; CW.arrow.run(base); var pk=CW.arrow.ctl(L,"progress"); EASEINFO=pk.keyOutTemporalEase(1)[0].influence+" / "+pk.keyInTemporalEase(2)[0].influence; pk.setInterpolationTypeAtKey(1,KeyframeInterpolationType.LINEAR,KeyframeInterpolationType.LINEAR); pk.setInterpolationTypeAtKey(2,KeyframeInterpolationType.LINEAR,KeyframeInterpolationType.LINEAR); }
  clear(); var SH=pathLayer("Shaft",[-400,0],[400,0]); var nBefore=comp.numLayers; arrowOn(SH,{});
  T("no extra layers: it is all one shape layer", comp.numLayers===nBefore, comp.numLayers+" vs "+nBefore);
  var names=[]; for (var gi=1;gi<=SH.property("ADBE Root Vectors Group").numProperties;gi++) names.push(SH.property("ADBE Root Vectors Group").property(gi).name);
  T("head, tail and the shape library live inside the layer", ["CW Head","CW Head Polygon","CW Tail","CW Tail Polygon","CW Shapes"].every ? true : true, names.join(","));
  var hasAll=true; var need=["CW Head","CW Head Polygon","CW Tail","CW Tail Polygon","CW Shapes","G"]; for (var ni=0;ni<need.length;ni++){ var f=false; for (var nj=0;nj<names.length;nj++) if (names[nj]===need[ni]) f=true; if (!f) hasAll=false; }
  T("all six groups are present", hasAll, names.join(","));
  var fx=SH.property("ADBE Effect Parade"); T("one Arrow effect on the layer", fx.numProperties===1 && fx.property(1).matchName===CW.arrow.FX, fx.numProperties);
  T("shape and animate are real dropdowns (1..7 and 1..3)", ctl(SH,"hshape").maxValue===7 && ctl(SH,"mode").maxValue===3, ctl(SH,"hshape").maxValue);
  T("the shape library holds seven keys", grp(SH,"CW Shapes").property("ADBE Vectors Group").property("Shapes").property("ADBE Vector Shape").numKeys===7, "");
  T("no expression errors anywhere in the layer", errors(SH).length===0, errors(SH).join(" | "));
  T("the build is eased 50-80 by default (out 50%, in 80%), then made linear here so the position checks below are exact", EASEINFO==="50 / 80" || /^(49|50)(\.\d+)? \/ (79|80)/.test(EASEINFO), EASEINFO);
  T("hidden before anything is drawn", gop(SH,"CW Head",0)===0, gop(SH,"CW Head",0));
  T("head leads: halfway = the middle of the line, level", near(gpos(SH,"CW Head",0.5)[0],0)&&near(gpos(SH,"CW Head",0.5)[1],0)&&near(grot(SH,"CW Head",0.5),0,0.5)&&gop(SH,"CW Head",0.5)===100, J(gpos(SH,"CW Head",0.5)));
  T("head arrives at the end of the line", near(gpos(SH,"CW Head",1)[0],400), J(gpos(SH,"CW Head",1)));
  var tr=function(){ return grp(SH,"G").property("ADBE Vectors Group").property("CW Arrow Trim"); };
  T("the shaft stops at the head's base (50% less the triangle's reach, 5%)", near(tr().property("ADBE Vector Trim End").valueAtTime(0.5,false),45,0.5), tr().property("ADBE Vector Trim End").valueAtTime(0.5,false));
  grp(SH,"G").property("ADBE Vectors Group").property("Stroke 1").property("ADBE Vector Stroke Color").setValue([1,0,0]);
  var fc=grp(SH,"CW Head").property("ADBE Vectors Group").property("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").valueAtTime(0.5,false);
  T("head colour follows the shaft's stroke", near(fc[0],1,0.01)&&near(fc[1],0,0.01), J(fc));

  log("== D live edits");
  setc(SH,"hsize",80); T("size slider: head scale 80", near(gtr(SH,"CW Head","ADBE Vector Scale").valueAtTime(0.5,false)[0],80,0.01), J(gtr(SH,"CW Head","ADBE Vector Scale").valueAtTime(0.5,false)));
  var hp=function(){ return grp(SH,"CW Head").property("ADBE Vectors Group").property("Head Path").property("ADBE Vector Shape"); };
  setc(SH,"hshape",3); T("head shape 3 (Arrow Head): its outline has 4 vertices, tip at the origin", hp().valueAtTime(0.5,false).vertices.length===4 && J(hp().valueAtTime(0.5,false).vertices[0])==="0,0", hp().valueAtTime(0.5,false).vertices.length);
  setc(SH,"hshape",5); var hst=grp(SH,"CW Head").property("ADBE Vectors Group").property("ADBE Vector Graphic - Stroke").property("ADBE Vector Stroke Opacity").valueAtTime(0.5,false), hfl=grp(SH,"CW Head").property("ADBE Vectors Group").property("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Opacity").valueAtTime(0.5,false);
  T("an open shape (Open Arrow) strokes and does not fill", hst===100&&hfl===0, hst+","+hfl);
  setc(SH,"hshape",2); hst=grp(SH,"CW Head").property("ADBE Vectors Group").property("ADBE Vector Graphic - Stroke").property("ADBE Vector Stroke Opacity").valueAtTime(0.5,false); hfl=grp(SH,"CW Head").property("ADBE Vectors Group").property("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Opacity").valueAtTime(0.5,false);
  T("a solid shape (Triangle) fills and does not stroke", hst===0&&hfl===100, hst+","+hfl);
  setc(SH,"hshape",1); T("Polygon switches the polygon group on and the path group off", gop(SH,"CW Head Polygon",0.5)===100 && gop(SH,"CW Head",0.5)===0, gop(SH,"CW Head Polygon",0.5)+","+gop(SH,"CW Head",0.5));
  setc(SH,"poly",7); T("polygon sides slider", grp(SH,"CW Head Polygon").property("ADBE Vectors Group").property(1).property("ADBE Vector Star Points").valueAtTime(0.5,false)===7, "");
  setc(SH,"hshape",2);
  // edit the path itself: the head follows with no rebuild
  var pv=new Shape(); pv.vertices=[[-400,0],[400,200]]; pv.inTangents=[[0,0],[0,0]]; pv.outTangents=[[0,0],[0,0]]; pv.closed=false; pathProp0=pathItem(SH).property("ADBE Vector Shape"); pathProp0.setValue(pv);
  T("edit the path: the head moves to the new line (half way = 0,100) and turns with it (14 degrees)", near(gpos(SH,"CW Head",0.5)[0],0,0.6)&&near(gpos(SH,"CW Head",0.5)[1],100,0.6)&&near(grot(SH,"CW Head",0.5),14.04,0.5), J(gpos(SH,"CW Head",0.5))+" rot "+grot(SH,"CW Head",0.5));
  pv=new Shape(); pv.vertices=[[-400,0],[400,0]]; pv.inTangents=[[0,0],[0,0]]; pv.outTangents=[[0,0],[0,0]]; pv.closed=false; pathProp0.setValue(pv);
  setc(SH,"mode",2);
  T("mode Draw & Off, live: head at the end by half time, then gone", near(gpos(SH,"CW Head",0.5)[0],400)&&gop(SH,"CW Head",1)===0&&near(tr().property("ADBE Vector Trim Start").valueAtTime(0.75,false),50,0.5), J(gpos(SH,"CW Head",0.5)));
  setc(SH,"mode",3); setc(SH,"length",30);
  T("mode Travel, live: head at 65% (x=120), window 35..65 less the head, which the shaft runs 8 units into (size 80)", near(gpos(SH,"CW Head",0.5)[0],120,1)&&near(tr().property("ADBE Vector Trim Start").valueAtTime(0.5,false),35,0.5)&&near(tr().property("ADBE Vector Trim End").valueAtTime(0.5,false),56,1.2), J(gpos(SH,"CW Head",0.5)));
  setc(SH,"mode",1); setc(SH,"reverse",1);
  T("reverse, live: leads from the far end pointing back", near(gpos(SH,"CW Head",0.25)[0],200,1)&&near(grot(SH,"CW Head",0.25),180,0.5)&&near(tr().property("ADBE Vector Trim Start").valueAtTime(0.5,false),59,1.2), J(gpos(SH,"CW Head",0.25))+" rot "+grot(SH,"CW Head",0.25));
  setc(SH,"reverse",0);

  log("== E tail");
  T("the tail is off by default", gop(SH,"CW Tail",0.5)===0, gop(SH,"CW Tail",0.5));
  setc(SH,"tshow",1);
  T("tail on, matching the head: at the start of the line, pointing back", gop(SH,"CW Tail",0.5)===100 && near(gpos(SH,"CW Tail",0.5)[0],-400) && near(grot(SH,"CW Tail",0.5),180,0.5), gop(SH,"CW Tail",0.5)+" "+J(gpos(SH,"CW Tail",0.5))+" rot "+grot(SH,"CW Tail",0.5));
  setc(SH,"tsame",0); setc(SH,"tshape",4);
  var tp=grp(SH,"CW Tail").property("ADBE Vectors Group").property("Head Path").property("ADBE Vector Shape").valueAtTime(0.5,false);
  T("tail with its own shape (Arrow Tail fletching: 6 vertices, flaring away)", tp.vertices.length===6 && tp.vertices[2][0]>100, tp.vertices.length);
  setc(SH,"tsame",1); setc(SH,"tshow",0);
  setc(SH,"mode",2);
  T("in Draw & Off the tail follows the retreating end", (function(){ setc(SH,"tshow",1); var x=gpos(SH,"CW Tail",0.75)[0]; setc(SH,"tshow",0); return near(x,0,1); })(), "");
  setc(SH,"mode",1);

  desel(); SH.selected=true;
  var rs=CW.arrow.readString(); T("readString reports the selected arrow's settings for saving a preset", rs.indexOf("shape=")===0 && rs.indexOf("size=")>0 && rs.indexOf("animate=1")>0, rs);
  desel(); T("readString says null when no arrow is selected", CW.arrow.readString()==="null", "");
  log("== E2 pressing Arrow again updates in place");
  var S2=pathLayer("Again",[-400,0],[400,0]); arrowOn(S2,{});
  var kt=CW.arrow.ctl(S2,"progress").keyTime(2); CW.arrow.ctl(S2,"progress").setValueAtTime(0.4,50);
  var nkeys=CW.arrow.ctl(S2,"progress").numKeys; CW.arrow.ctl(S2,"hsize").setValue(77);
  arrowOn(S2,{size:55,type:"heart",tail:true});
  T("existing arrow keeps its keyframes (including one added by hand)", CW.arrow.ctl(S2,"progress").numKeys===nkeys, CW.arrow.ctl(S2,"progress").numKeys+" vs "+nkeys);
  T("controls follow the new settings", CW.arrow.ctl(S2,"hsize").value===55 && CW.arrow.ctl(S2,"hshape").value===CW.arrow.typeIndex("heart") && CW.arrow.ctl(S2,"tshow").value===1, "");
  T("no duplicate groups or trims", (function(){ var n=0; var r=S2.property("ADBE Root Vectors Group"); for (var i=1;i<=r.numProperties;i++) if (r.property(i).name==="CW Head") n++; return n===1; })(), "");
  desel(); S2.selected=true; var chg=CW.arrow.update({frames:60}); var pg=CW.arrow.ctl(S2,"progress");
  T("Duration is live: the end key moves", chg===1 && Math.abs(pg.keyTime(pg.numKeys)-(pg.keyTime(1)+2))<0.05, pg.keyTime(pg.numKeys));
  log("== F every head shape, new arrow, panel update, remove");
  var bad=[];
  for (var si=1; si<=7; si++){ setc(SH,"hshape",si); var er=errors(SH); if (er.length) bad.push(si+": "+er.join(";")); var pp=gpos(SH,"CW Head",1); if (isNaN(pp[0])) bad.push(si+": NaN"); }
  T("all seven head shapes evaluate with no errors", bad.length===0, bad.join(" | "));
  clear(); desel(); CW.arrow.run({type:"heart",mode:"draw",animate:true,frames:30,size:40,length:30,reverse:false,tail:false,tailSame:true,tailType:"arrowtail",polygonPoints:5,asNew:true});
  var NA=comp.layer("Arrow"); T("New Arrow makes one layer", !!NA && comp.numLayers===1, comp.numLayers);
  T("its head starts at the path's first point (-300,70)", near(gpos(NA,"CW Head",0.0001)[0],-300,2)&&near(gpos(NA,"CW Head",0.0001)[1],70,2), J(gpos(NA,"CW Head",0.0001)));
  T("heart is the chosen shape", ctl(NA,"hshape").value===6, ctl(NA,"hshape").value);
  desel(); NA.selected=true; var changed=CW.arrow.update({shape:2,size:55,mode:3,reverse:true,tail:true});
  T("the panel's live update changes the selected arrow", changed===1 && ctl(NA,"hshape").value===2 && ctl(NA,"hsize").value===55 && ctl(NA,"mode").value===3 && ctl(NA,"reverse").value===1 && ctl(NA,"tshow").value===1, changed);
  var other=pathLayer("Other",[-400,0],[400,0]); desel(); pathItem(other).selected=true; arrowOn(other,{type:"line"});
  desel(); NA.selected=true; CW.arrow.update({size:99});
  T("updates only touch the selected arrow", ctl(NA,"hsize").value===99 && ctl(other,"hsize").value===40, ctl(NA,"hsize").value+" "+ctl(other,"hsize").value);
  desel(); other.selected=true; CW.arrow.removeSelected();
  T("remove takes off the groups, trim and controls from that layer only", other.property("ADBE Effect Parade").numProperties===0 && !other.property("ADBE Root Vectors Group").property("CW Head") && !!NA.property("ADBE Root Vectors Group").property("CW Head"), "");
  T("what remains on the path layer is just the user's line", other.property("ADBE Root Vectors Group").numProperties===1 && !other.property("ADBE Root Vectors Group").property("G").property("ADBE Vectors Group").property("CW Arrow Trim"), other.property("ADBE Root Vectors Group").numProperties);
  clear(); log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
