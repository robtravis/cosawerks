// CW.stagger in AE. SCRATCH PROJECTS ONLY: makes its own comp "CW-TEST" and clears its layers.
var SP=Folder.temp.fsName+"/";
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"stagger-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+String(d))); }
function near(a,b,t){ return Math.abs(a-b)<(t===undefined?0.001:t); }
try {
  if (app.project.file && app.project.file.name.indexOf("Scratch")!==0) throw new Error("not a scratch project: "+app.project.file.name);
  var files=["core/00_core.jsx","modules/stagger.jsx"];
  for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));
  CW.say=function(m){ log("  SAY: "+String(m).replace(/\n/g," | ")); };
  var comp=null; for (var q=1;q<=app.project.numItems;q++) if (app.project.item(q) instanceof CompItem && app.project.item(q).name==="CW-TEST") comp=app.project.item(q);
  if (!comp) comp=app.project.items.addComp("CW-TEST",1000,600,1,10,30);
  comp.openInViewer();
  var FD=comp.frameDuration;
  function clear(){ for (var i=comp.numLayers;i>=1;i--) comp.layer(i).remove(); }
  function desel(){ for (var i=1;i<=comp.numLayers;i++){ comp.layer(i).selected=false; } }
  // n shape layers named L1..Ln top to bottom, each running 0..len seconds, all selected
  function make(n,len){ clear(); for (var i=n;i>=1;i--){ var L=comp.layers.addShape(); L.name="L"+i; L.startTime=0; L.inPoint=0; L.outPoint=len||1; } desel(); for (var j=1;j<=comp.numLayers;j++) comp.layer(j).selected=true; }
  function starts(){ var o=[]; for (var i=1;i<=comp.numLayers;i++) o.push(Math.round(comp.layer(i).startTime/FD)); return o.join(","); }
  function ins(){ var o=[]; for (var i=1;i<=comp.numLayers;i++) o.push(Math.round(comp.layer(i).inPoint/FD)); return o.join(","); }
  function outs(){ var o=[]; for (var i=1;i<=comp.numLayers;i++) o.push(Math.round(comp.layer(i).outPoint/FD)); return o.join(","); }
  function go(o){ var b={mode:"layers",dir:1,amount:"3",ease:0,power:0,shiftOnly:false,additive:false}; for (var k in o) b[k]=o[k]; return CW.stagger.run(b); }

  log("== A amount parsing");
  T("frames", near(CW.stagger.parseAmount("3",FD),3*FD), "");
  T("seconds", near(CW.stagger.parseAmount("0.5s",FD),0.5), "");
  T("a frame suffix", near(CW.stagger.parseAmount(" 4 f",FD),4*FD), "");
  T("junk is null", CW.stagger.parseAmount("abc",FD)===null, "");

  log("== B layers");
  make(4); go({});
  T("top first: 0, 3, 6, 9 frames", starts()==="0,3,6,9", starts());
  make(4); go({dir:-1});
  T("bottom first: the lowest layer goes first", starts()==="9,6,3,0", starts());
  make(4); go({shiftOnly:true});
  T("shift only moves every layer by the amount", starts()==="3,3,3,3", starts());
  make(4); go({shiftOnly:true,dir:-1});
  T("shift only, bottom first: earlier", starts()==="-3,-3,-3,-3", starts());
  make(4); comp.layer(1).startTime=2; comp.layer(1).inPoint=2; go({additive:true});
  T("add to current: keeps what was there", Math.round(comp.layer(1).startTime/FD)===60 && Math.round(comp.layer(2).startTime/FD)===3, starts());
  make(4); go({ease:1,power:0,amount:"6"});
  T("ease in (quad) bunches the first steps: 0, 2, 8, 18 frames", starts()==="0,2,8,18", starts());
  make(4); go({ease:2,power:0,amount:"6"});
  T("ease out (quad) spreads the first steps: 0, 10, 16, 18", starts()==="0,10,16,18", starts());
  make(4); go({dir:0});
  var ss=starts().split(","), sorted=ss.slice(0).sort(function(a,b){return a-b;});
  T("random uses each slot once", sorted.join(",")==="0,3,6,9", starts());
  make(4); go({dir:0,shiftOnly:true});
  var rs=starts().split(","), okR=true; for (var ri=0; ri<rs.length; ri++) if (Math.abs(parseInt(rs[ri],10))>3) okR=false;
  T("random shift-only jitters within the amount", okR, starts());
  make(4); comp.layer(2).locked=true; go({});
  T("locked layers are skipped", Math.round(comp.layer(2).startTime/FD)===0 && ss.length===4, starts());
  comp.layer(2).locked=false;
  make(4); desel(); T("nothing selected: nothing moves", go({})===0, "");

  log("== C trim in / out");
  make(4,2); go({mode:"trimin"});
  T("trim in staggers the in points", ins()==="0,3,6,9", ins());
  make(4,2); go({mode:"trimout"});
  T("trim out staggers the out points", outs()==="60,63,66,69", outs());

  log("== D sequence");
  make(3,1); go({mode:"sequence",amount:"0.5s"});
  T("end to end with a half second gap", starts()==="0,45,90", starts());
  make(3,1); go({mode:"sequence",amount:"-0.5s"});
  T("a negative gap overlaps", starts()==="0,15,30", starts());

  log("== E keyframes");
  clear();
  var A=comp.layers.addShape(); A.name="A"; var B=comp.layers.addShape(); B.name="B";
  var pa=A.property("ADBE Transform Group").property("ADBE Opacity"), pb=B.property("ADBE Transform Group").property("ADBE Opacity");
  pa.setValueAtTime(0,0); pa.setValueAtTime(1,100); pb.setValueAtTime(0,0); pb.setValueAtTime(1,100);
  desel(); pa.selected=true; pb.selected=true; pa.setSelectedAtKey(1,true); pa.setSelectedAtKey(2,true); pb.setSelectedAtKey(1,true); pb.setSelectedAtKey(2,true);
  go({mode:"keys",amount:"6"});
  var ka=A.property("ADBE Transform Group").property("ADBE Opacity"), kb=B.property("ADBE Transform Group").property("ADBE Opacity");
  T("keyframes: B is on top so its keys stay, A's move 6 frames later and keep their values", near(kb.keyTime(1),0) && near(ka.keyTime(1),6*FD) && ka.numKeys===2 && near(ka.keyTime(2),1+6*FD) && near(ka.keyValue(2),100), ka.keyTime(1)+" "+ka.numKeys);
  clear(); log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
