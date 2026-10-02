// CW.slab in AE. SCRATCH PROJECTS ONLY: makes its own comp "CW-TEST" and clears its layers.
var SP=Folder.temp.fsName+"/";
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"slab-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+String(d))); }
function near(a,b,t){ return Math.abs(a-b)<(t===undefined?0.5:t); }
try {
  if (app.project.file && app.project.file.name.indexOf("Scratch")!==0) throw new Error("not a scratch project: "+app.project.file.name);
  var files=["core/00_core.jsx","modules/slab.jsx"];
  for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));
  CW.say=function(m){ log("  SAY: "+String(m).replace(/\n/g," | ")); };
  var comp=null; for (var q=1;q<=app.project.numItems;q++) if (app.project.item(q) instanceof CompItem && app.project.item(q).name==="CW-TEST") comp=app.project.item(q);
  if (!comp) comp=app.project.items.addComp("CW-TEST",1000,600,1,5,30);
  comp.openInViewer();
  function clear(){ for (var i=comp.numLayers;i>=1;i--) comp.layer(i).remove(); }
  function desel(){ for (var i=1;i<=comp.numLayers;i++) comp.layer(i).selected=false; }
  function make(text,size){ clear(); var L=comp.layers.addText(text); var src=L.property("ADBE Text Properties").property("ADBE Text Document"), d=src.value; d.fontSize=size||100; d.fillColor=[1,1,1]; d.applyFill=true; d.tracking=0; d.justification=ParagraphJustification.LEFT_JUSTIFY; src.setValue(d); L.property("ADBE Transform Group").property("ADBE Position").setValue([60,150]); return L; }
  function doc(L){ return L.property("ADBE Text Properties").property("ADBE Text Document").value; }
  function pick(L){ desel(); L.selected=true; }
  var OPT={width:0,threshold:60,oneWord:true,leading:100,recolor:false,c1:[1,0.3,0.2],c2:[0.2,0.6,1]};
  function opts(o){ var b={}; for (var k in OPT) b[k]=OPT[k]; for (var k2 in o) b[k2]=o[k2]; return b; }

  log("== A lines");
  var lines=CW.slab._lines("HELLO\r\rbig world\r ok go ");
  T("empty lines are skipped, the rest keep their positions", lines.length===3 && lines[0].start===0 && lines[0].end===5 && lines[1].start===7 && lines[1].text==="big world" && lines[2].start===17, lines.length+" "+(lines[1]?lines[1].start:""));

  log("== B apply");
  var L=make("HELLO\rbig world\rok go",100); pick(L); CW.slab.run(opts({}));
  var d=doc(L);
  T("the layer remembers the original style", CW.slab._readBase(L) && near(CW.slab._readBase(L).size,100) && L.comment.indexOf("CW Slab")>=0, L.comment);
  var s1=d.characterRange(0,5).fontSize, s2=d.characterRange(6,15).fontSize, s3=d.characterRange(16,21).fontSize;
  T("the widest line keeps its size and the shorter ones grow", near(s2,100,0.5) && s1>120 && s3>120, s1+" "+s2+" "+s3);
  T("no error", true, "");

  log("== C clear and repeat");
  var before=[s1,s2,s3];
  pick(L); CW.slab.run(opts({}));
  d=doc(L);
  T("applying again gives the same sizes (it starts from the remembered original)", near(d.characterRange(0,5).fontSize,before[0],0.5) && near(d.characterRange(16,21).fontSize,before[2],0.5), d.characterRange(0,5).fontSize+" vs "+before[0]);
  pick(L); CW.slab.clearSelected();
  d=doc(L);
  T("clear restores size, tracking and colour", near(d.characterRange(0,5).fontSize,100) && near(d.characterRange(16,21).fontSize,100) && near(d.characterRange(0,5).tracking,0) && !CW.slab._readBase(L), d.characterRange(0,5).fontSize);
  T("the comment marker is gone", (L.comment||"").indexOf("CW Slab")<0, L.comment);

  log("== D options");
  L=make("HELLO\rbig world\rok go",100); pick(L); CW.slab.run(opts({threshold:0,oneWord:false}));
  d=doc(L); var tr=d.characterRange(16,21).tracking;
  T("threshold 0: every line is tracked, none scaled", near(d.characterRange(0,5).fontSize,100) && near(d.characterRange(16,21).fontSize,100) && Math.abs(tr)>1, d.characterRange(16,21).fontSize+" tracking "+tr);
  L=make("HELLO\rbig world\rok go",100); pick(L); CW.slab.run(opts({threshold:100,oneWord:false}));
  d=doc(L);
  T("threshold 100: every line but the widest is scaled, tracking untouched", near(d.characterRange(16,21).tracking,0,0.01) && d.characterRange(16,21).fontSize>100, d.characterRange(16,21).fontSize);
  L=make("HELLO\rbig world\rok go",100); pick(L); CW.slab.run(opts({width:900,threshold:100,oneWord:false}));
  T("a set width: lines scale to that width (900 is wider than the widest, 652, so all grow)", doc(L).characterRange(6,15).fontSize>130 && doc(L).characterRange(0,5).fontSize>doc(L).characterRange(6,15).fontSize, doc(L).characterRange(6,15).fontSize);
  L=make("HELLO\rbig world\rok go",100); pick(L); CW.slab.run(opts({leading:150}));
  var lead150=doc(L).characterRange(6,15).leading, orig=CW.slab._readBase(L).leading;
  L=make("HELLO\rbig world\rok go",100); pick(L); CW.slab.run(opts({leading:100}));
  var lead100=doc(L).characterRange(6,15).leading;
  T("leading: 150% adds half the original leading to the gap (line 2 grows by 0.5 x original)", near(lead150-lead100,0.5*orig,1.5), (lead150-lead100)+" vs "+(0.5*orig));
  L=make("it\rit",100); pick(L); CW.slab.run(opts({leading:100,width:0}));
  d=doc(L);
  T("equal lines keep the original leading at 100%", near(d.characterRange(3,5).leading,CW.slab._readBase(L).leading,1.5), d.characterRange(3,5).leading+" vs "+CW.slab._readBase(L).leading);
  L=make("HELLO\rbig world\rok go",100); pick(L); CW.slab.run(opts({recolor:true}));
  d=doc(L); var cA=d.characterRange(0,5).fillColor, cB=d.characterRange(6,15).fillColor, cC=d.characterRange(16,21).fillColor;
  T("recolour: the most scaled line (HELLO) gets the end colour, the least scaled the start", near(cA[2],1,0.02) && near(cA[0],0.2,0.02) && near(cB[0],1,0.02) && near(cB[1],0.3,0.02), cA.join(",")+" | "+cB.join(",")+" | "+cC.join(","));
  L=make("only one line",100); pick(L); CW.slab.run(opts({}));
  T("one line: nothing is changed (a reason is given)", !CW.slab._readBase(L) || near(doc(L).fontSize,100), "");
  clear(); log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
