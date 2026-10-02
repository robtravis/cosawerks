// CW.reveal in AE. SCRATCH PROJECTS ONLY: makes its own comp "CW-TEST" and clears its layers.
var SP=Folder.temp.fsName+"/";
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"reveal-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+String(d))); }
function near(a,b,t){ return Math.abs(a-b)<(t===undefined?0.5:t); }
try {
  if (app.project.file && app.project.file.name.indexOf("Scratch")!==0) throw new Error("not a scratch project: "+app.project.file.name);
  var files=["core/00_core.jsx","core/10_math.jsx","core/20_layers.jsx","modules/pathx.jsx","modules/ease.jsx","modules/ease_presets.jsx","modules/typefx.jsx","modules/reveal.jsx"];
  for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));
  CW.say=function(m){ log("  SAY: "+String(m).replace(/\n/g," | ")); };
  var comp=null; for (var q=1;q<=app.project.numItems;q++) if (app.project.item(q) instanceof CompItem && app.project.item(q).name==="CW-TEST") comp=app.project.item(q);
  if (!comp) comp=app.project.items.addComp("CW-TEST",1000,600,1,5,30);
  comp.openInViewer();
  var FD=comp.frameDuration;
  function clear(){ for (var i=comp.numLayers;i>=1;i--) comp.layer(i).remove(); }
  function desel(){ for (var i=1;i<=comp.numLayers;i++) comp.layer(i).selected=false; }
  function make(text,size){ clear(); var L=comp.layers.addText(text); var src=L.property("ADBE Text Properties").property("ADBE Text Document"), d=src.value; d.fontSize=size||70; d.fillColor=[1,1,1]; d.applyFill=true; d.tracking=0; d.justification=ParagraphJustification.LEFT_JUSTIFY; src.setValue(d); L.property("ADBE Transform Group").property("ADBE Position").setValue([80,120]); return L; }
  function pick(L){ desel(); L.selected=true; }
  function masks(L){ var g=L.property("ADBE Mask Parade"), n=0; for (var i=1;i<=g.numProperties;i++) if (g.property(i).name.indexOf("CW Reveal")===0) n++; return n; }
  function mpath(L,i,t){ return L.property("ADBE Mask Parade").property(i).property("ADBE Mask Shape").valueAtTime(t,false); }
  function errs(L){ var g=L.property("ADBE Mask Parade"), bad=[]; for (var i=1;i<=g.numProperties;i++){ var p=g.property(i).property("ADBE Mask Shape"); if (p.expressionError) bad.push(p.expressionError); } return bad; }
  function width(sh){ var v=sh.vertices; return Math.max(v[0][0],v[1][0],v[2][0],v[3][0])-Math.min(v[0][0],v[1][0],v[2][0],v[3][0]); }
  function height(sh){ var v=sh.vertices; return Math.max(v[0][1],v[1][1],v[2][1],v[3][1])-Math.min(v[0][1],v[1][1],v[2][1],v[3][1]); }
  var OPT={feather:0,style:"right",delay:10,dur:10,shift:0,ease:"Linear",animIn:true,animOut:false,reverse:false,random:false};
  function opts(o){ var b={}; for (var k in OPT) b[k]=OPT[k]; for (var k2 in o) b[k2]=o[k2]; return b; }

  log("== A bands");
  var L=make("HELLO\r\rbig world\rok",70); var bands=CW.reveal._bands(L);
  T("one band per non-empty line (the blank one is skipped)", bands.length===3, bands.length);
  T("bands go down the layer without overlapping much", bands[1].y0>bands[0].y0 && bands[2].y0>bands[1].y0, bands[0].y0+" "+bands[1].y0+" "+bands[2].y0);
  T("each band is wider than its text, and the widest line has the widest band", (bands[1].x1-bands[1].x0)>(bands[0].x1-bands[0].x0) && (bands[0].x1-bands[0].x0)>(bands[2].x1-bands[2].x0), "");

  log("== B build");
  L=make("HELLO\rbig world\rok",70); pick(L); CW.reveal.run(opts({}));
  T("one mask per line", masks(L)===3, masks(L));
  T("the Type effect is on the layer (it carries the timing)", CW.typefx.isTyped(L), "");
  T("no animator was added", !CW.typefx._animIndex(L), "");
  T("no expression errors", errs(L).length===0, errs(L).join(" | "));
  var b1=CW.reveal._bands(L)[0];
  T("at the start every mask is closed", width(mpath(L,1,0))<0.01 && width(mpath(L,2,0))<0.01 && width(mpath(L,3,0))<0.01, width(mpath(L,1,0)));
  T("line 1 is fully open after delay 0 + duration 10 frames", near(width(mpath(L,1,10*FD+0.001)),b1.x1-b1.x0,1), width(mpath(L,1,10*FD+0.001))+" vs "+(b1.x1-b1.x0));
  T("line 2 has not started when line 1 finishes (10 frame delay)", width(mpath(L,2,10*FD))<1 && width(mpath(L,2,15*FD))>1 && width(mpath(L,2,15*FD))<(b1.x1-b1.x0)*3, width(mpath(L,2,10*FD))+" "+width(mpath(L,2,15*FD)));
  T("every line is fully open by the end of the stagger (3 lines)", width(mpath(L,3,3.5))>0 && near(mpath(L,3,3.5).vertices[1][0]-mpath(L,3,3.5).vertices[0][0],CW.reveal._bands(L)[2].x1-CW.reveal._bands(L)[2].x0,1), "");

  log("== C styles");
  var heights={}, i2, styles=CW.reveal.STYLES;
  for (i2=0;i2<styles.length;i2++){ L=make("HELLO\rbig world\rok",70); pick(L); CW.reveal.run(opts({style:styles[i2],delay:0,dur:30})); heights[styles[i2]]=[width(mpath(L,1,15*FD)),height(mpath(L,1,15*FD)),width(mpath(L,1,1.5)),height(mpath(L,1,1.5))]; if (errs(L).length) T("style "+styles[i2]+" has errors", false, errs(L).join(";")); }
  T("right and left wipe the width, up and down wipe the height, centre opens the width", heights.right[0]>1 && heights.right[0]<heights.right[2]-1 && heights.left[0]>1 && heights.up[1]>1 && heights.up[1]<heights.up[3]-1 && heights.down[1]>1 && heights.center[0]>1 && near(heights.center[1],heights.center[3],0.5), JSON_ish(heights));
  function JSON_ish(o){ var s=[]; for (var k in o) s.push(k+"="+o[k].join("/")); return s.join(" "); }

  log("== D timing is live from the effect");
  L=make("HELLO\rbig world\rok",70); pick(L); CW.reveal.run(opts({}));
  var wBefore=width(mpath(L,2,15*FD));
  CW.typefx.update({delay:0});
  var wAfter=width(mpath(L,2,15*FD));
  T("changing Delay on the Type effect moves the masks", wAfter>wBefore+1, wBefore+" -> "+wAfter);
  CW.typefx.update({delay:10,reverse:true});
  T("reverse order: the last line goes first", width(mpath(L,3,5*FD))>width(mpath(L,1,5*FD)), width(mpath(L,3,5*FD))+" vs "+width(mpath(L,1,5*FD)));
  pick(L); T("a new style rebuilds in place", CW.reveal.update(opts({style:"up"}))===1 && masks(L)===3, masks(L));
  var bad=errs(L); T("still no errors", bad.length===0, bad.join(";"));

  log("== E Out and remove");
  L=make("HELLO\rbig world\rok",70); pick(L); CW.reveal.run(opts({animIn:true,animOut:true,delay:2,dur:6}));
  T("with Out on, lines close again at the end of the layer", width(mpath(L,1,4.99))<width(mpath(L,1,2.5)), width(mpath(L,1,4.99))+" vs "+width(mpath(L,1,2.5)));
  pick(L); CW.reveal.removeSelected();
  T("remove takes off the masks and the effect it only used for itself", masks(L)===0 && !CW.typefx.isTyped(L), masks(L));
  L=make("HELLO\rbig world\rok",70); pick(L); CW.typefx.run({preset:"fadeup",by:1,delay:3,dur:15,ease:"50-80",animIn:true,animOut:false,reverse:false,random:false});
  pick(L); CW.reveal.run(opts({})); pick(L); CW.reveal.removeSelected();
  T("on a layer that also has a Type animation, remove keeps the effect and the animator", CW.typefx.isTyped(L) && CW.typefx._animIndex(L)>0 && masks(L)===0, "");
  log("== F feather");
  L=make("HELLO\rbig world\rok",70); pick(L); CW.reveal.run(opts({feather:20,delay:0,dur:30}));
  var fb=CW.reveal._bands(L)[0], fv=L.property("ADBE Mask Parade").property(1).property("ADBE Mask Feather").value;
  T("a horizontal wipe feathers across only ([20, 0])", near(fv[0],20,0.01) && near(fv[1],0,0.01), fv.join(","));
  var m0=mpath(L,1,0).vertices, m1=mpath(L,1,2).vertices;
  T("closed: the soft edge starts left of the text (and out of its reach)", Math.max(m0[0][0],m0[1][0])<=fb.x0-20+0.5, Math.max(m0[0][0],m0[1][0])+" vs "+(fb.x0-20));
  T("open: the soft edge ends beyond the text by the feather, so nothing is left half-hidden", Math.max(m1[0][0],m1[1][0])>=fb.x1+20-0.5 && Math.min(m1[0][0],m1[3][0])<=fb.x0-40+0.5, Math.max(m1[0][0],m1[1][0])+" vs "+(fb.x1+20));
  pick(L); CW.reveal.update(opts({style:"down",feather:12}));
  var fv2=L.property("ADBE Mask Parade").property(1).property("ADBE Mask Feather").value;
  T("a vertical wipe feathers down ([0, 12])", near(fv2[0],0,0.01) && near(fv2[1],12,0.01), fv2.join(","));
  T("feather is read live from the mask (change it in AE and the shape follows)", (function(){ L.property("ADBE Mask Parade").property(1).property("ADBE Mask Feather").setValue([0,30]); var a=mpath(L,1,0).vertices; return Math.abs(a[0][1]-a[3][1])>=0; })(), "");
  var errs2=errs(L); T("no expression errors with feather", errs2.length===0, errs2.join(";"));

  log("== G masks as Type looks");
  L=make("HELLO\rbig world\rok",70); pick(L); CW.typefx.run({preset:"mask:right",by:1,delay:10,dur:12,ease:"Linear",animIn:true,animOut:false,reverse:false,random:false,feather:8});
  T("a mask look builds masks and no animator", masks(L)===3 && !CW.typefx._animIndex(L) && CW.typefx.isTyped(L), masks(L));
  T("its feather came from the options", near(L.property("ADBE Mask Parade").property(1).property("ADBE Mask Feather").value[0],8,0.01), "");
  T("the Type timing drives it (Duration 12: open at 12 frames)", width(mpath(L,1,12*FD+0.001))>width(mpath(L,1,4*FD)) && width(mpath(L,1,4*FD))>1, "");
  CW.typefx.update({preset:"fadeup"});
  T("switching to an animator look removes the masks and adds the animator", masks(L)===0 && CW.typefx._animIndex(L)>0 && CW.typefx._anim(L).name==="Cosawerks Type - Fade Up", masks(L)+" "+(CW.typefx._anim(L)?CW.typefx._anim(L).name:""));
  CW.typefx.update({preset:"mask:up",feather:5});
  T("and back: masks return, the animator goes", masks(L)===3 && !CW.typefx._animIndex(L) && near(L.property("ADBE Mask Parade").property(1).property("ADBE Mask Feather").value[1],5,0.01), masks(L));
  CW.typefx.update({feather:25});
  T("a feather change alone updates the masks", near(L.property("ADBE Mask Parade").property(2).property("ADBE Mask Feather").value[1],25,0.01), "");
  var e3=errs(L); T("no errors", e3.length===0, e3.join(";"));
  pick(L); CW.typefx.removeSelected();
  T("Remove takes the masks and the effect off", masks(L)===0 && !CW.typefx.isTyped(L), masks(L));
  clear(); log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
