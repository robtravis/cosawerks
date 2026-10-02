var SP=Folder.temp.fsName+"/";   // results land in result.txt here
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }

function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+String(d))); }
function near(a,b,t){ return Math.abs(a-b)<(t||0.02); }
try {
  if (app.project.file && app.project.file.name.indexOf("Scratch")!==0) throw new Error("not a scratch project: "+app.project.file.name+". These tests add and delete items. Open an unsaved or Scratch* project.");
  var files=["core/00_core.jsx","core/10_math.jsx","core/20_layers.jsx","modules/anchor.jsx","modules/align.jsx"];
  for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));

  CW.say=function(m){ log("  SAY: "+String(m).replace(/\n/g," | ")); };
  var comp=null;
  for (var q=1;q<=app.project.numItems;q++) if (app.project.item(q) instanceof CompItem && app.project.item(q).name==="CW-TEST") comp=app.project.item(q);
  if (!comp) comp=app.project.items.addComp("CW-TEST",1000,600,1,5,30);
  comp.openInViewer();

  function clear(){   // keep one probe null: addNull leaves an orphan solid in the project every time
    for (var i=comp.numLayers;i>=1;i--) if (comp.layer(i).name!=="probe") comp.layer(i).remove();
    var has=false; for (var j=1;j<=comp.numLayers;j++) if (comp.layer(j).name==="probe") has=true;
    if (!has){ var n=comp.layers.addNull(); n.name="probe"; n.enabled=false; }
  }
  function desel(){ for (var i=1;i<=comp.numLayers;i++) comp.layer(i).selected=false; }
  function sel(arr){ desel(); for (var i=0;i<arr.length;i++) arr[i].selected=true; }
  function solid(name,w,h,pos,rot,scale,parent){ var s=comp.layers.addSolid([0.5,0.5,0.5],name,w,h,1); s.transform.position.setValue(pos); if(rot) s.transform.rotation.setValue(rot); if(scale) s.transform.scale.setValue(scale); if(parent) s.parent=parent; return s; }
  // independent measurement through AE's own toComp, not through our math
  function evalProbe(body){ var p=comp.layer("probe").transform.position; p.expression='var out=[-999,-999]; try{ '+body+' }catch(err){ out=[-998,-998]; } out'; var v=p.value; p.expression=""; return [v[0],v[1]]; }
  function measure(L){
    var xs=[],ys=[], cs=[[0,0],[1,0],[0,1],[1,1]];
    for (var i=0;i<4;i++){
      var v=evalProbe('var L=thisComp.layer("'+L.name+'");var r=L.sourceRectAtTime(time,false);var p=L.toComp([r.left+'+cs[i][0]+'*r.width,r.top+'+cs[i][1]+'*r.height]);out=[p[0],p[1]];');
      xs.push(v[0]); ys.push(v[1]);
    }
    return { l:Math.min.apply(null,xs), r:Math.max.apply(null,xs), t:Math.min.apply(null,ys), b:Math.max.apply(null,ys) };
  }
  function anchorComp(L){ return evalProbe('var L=thisComp.layer("'+L.name+'");var A=L.anchorPoint;var p=L.toComp([A[0],A[1]]);out=[p[0],p[1]];'); }
  function posOf(L){ var v=L.transform.position.value; return [v[0],v[1]]; }
  function sameBox(a,b){ return near(a.l,b.l)&&near(a.r,b.r)&&near(a.t,b.t)&&near(a.b,b.b); }
  function fmt(b){ return "["+b.l.toFixed(2)+","+b.t.toFixed(2)+","+b.r.toFixed(2)+","+b.b.toFixed(2)+"]"; }

  // ---------- A: anchor move on a rotated, scaled solid, all 9 spots
  log("== A anchor move: rotated+scaled solid");
  var spots=[[0,0],[.5,0],[1,0],[0,.5],[.5,.5],[1,.5],[0,1],[.5,1],[1,1]];
  for (var k=0;k<spots.length;k++){
    clear(); var S=solid("S",200,100,[300,250],30,[150,80]); sel([S]);
    var before=measure(S);
    CW.anchor.move(spots[k][0],spots[k][1]);
    var after=measure(S), a=anchorComp(S), p=posOf(S), ap=S.transform.anchorPoint.value;
    T("A"+k+" visual unchanged", sameBox(before,after), fmt(before)+" vs "+fmt(after));
    T("A"+k+" anchor at "+spots[k].join(","), near(ap[0],spots[k][0]*200)&&near(ap[1],spots[k][1]*100), ap.toString());
    T("A"+k+" anchor sits on position", near(a[0],p[0])&&near(a[1],p[1]), a.join(",")+" vs "+p.join(","));
  }
  // ---------- B: anchor move on a parent with a child
  log("== B anchor move: parent with child");
  clear(); var P=solid("P",300,200,[500,300],20,[120,90]); var C=solid("C",100,60,[40,-30],0,null,P);
  sel([P]); var bp=measure(P), bc=measure(C);
  CW.anchor.move(0,0);
  T("B parent unchanged", sameBox(bp,measure(P)), fmt(bp)+" vs "+fmt(measure(P)));
  T("B child unchanged", sameBox(bc,measure(C)), fmt(bc)+" vs "+fmt(measure(C)));
  // ---------- C: text and shape layers
  log("== C anchor move: text and shape");
  clear(); var tx=comp.layers.addText("Hello Cosa"); tx.transform.position.setValue([400,300]); tx.transform.rotation.setValue(10);
  sel([tx]); var bt=measure(tx); CW.anchor.move(0.5,0.5); T("C text unchanged", sameBox(bt,measure(tx)), fmt(bt)+" vs "+fmt(measure(tx)));
  var ar=tx.transform.anchorPoint.value; var rr=tx.sourceRectAtTime(0,false);
  T("C text anchor at rect center", near(ar[0],rr.left+rr.width/2)&&near(ar[1],rr.top+rr.height/2), ar.join(",")+" rect "+rr.left+","+rr.top+","+rr.width+","+rr.height);
  var sh=comp.layers.addShape(); sh.name="shp"; var g=sh.property("Contents").addProperty("ADBE Vector Group");
  var rc=g.property("Contents").addProperty("ADBE Vector Shape - Rect"); rc.property("ADBE Vector Rect Size").setValue([180,90]);
  g.property("Contents").addProperty("ADBE Vector Graphic - Fill");
  sh.transform.position.setValue([600,350]); sh.transform.rotation.setValue(-25);
  sel([sh]); var bs=measure(sh); CW.anchor.move(1,1); T("C shape unchanged", sameBox(bs,measure(sh)), fmt(bs)+" vs "+fmt(measure(sh)));
  // ---------- G: keyframed position
  log("== G keyframed position");
  clear(); var K=solid("K",100,100,[200,200]); var pr=K.transform.position; pr.setValueAtTime(0,[200,200]); pr.setValueAtTime(1,[600,300]);
  sel([K]); comp.time=0; var k0=measure(K); comp.time=1; var k1=measure(K);
  comp.time=0.5; CW.anchor.move(0,0);
  comp.time=0; T("G t=0 unchanged", sameBox(k0,measure(K)), fmt(k0)+" vs "+fmt(measure(K)));
  comp.time=1; T("G t=1 unchanged", sameBox(k1,measure(K)), fmt(k1)+" vs "+fmt(measure(K)));
  T("G still 2 keys", K.transform.position.numKeys===2, K.transform.position.numKeys);
  comp.time=0;

  // ---------- D: align / distribute
  log("== D align");
  function three(){ clear();
    var a=solid("S1",100,50,[100,100]); var b=solid("S2",100,50,[400,250],15,[120,100]); var c=solid("S3",100,50,[700,450],-30);
    return [a,b,c]; }
  var st=CW.align.state, L, bx;
  L=three(); sel(L); st.mode="comp"; st.group=false; st.anchors=false;
  CW.align.run({kind:"align",op:"left"});
  T("D comp left", near(measure(L[0]).l,0)&&near(measure(L[1]).l,0)&&near(measure(L[2]).l,0), fmt(measure(L[0]))+fmt(measure(L[1]))+fmt(measure(L[2])));
  L=three(); sel(L); st.mode="outside"; CW.align.run({kind:"align",op:"right"});
  T("D outside right (left edge at 1000)", near(measure(L[0]).l,1000)&&near(measure(L[2]).l,1000), fmt(measure(L[0]))+fmt(measure(L[2])));
  L=three(); sel(L); st.mode="comp"; CW.align.run({kind:"align",op:"bottom"});
  T("D comp bottom", near(measure(L[1]).b,600), fmt(measure(L[1])));
  L=three(); sel(L); st.mode="sel"; CW.align.run({kind:"align",op:"hc"});
  var c0=measure(L[0]), c1=measure(L[1]), c2=measure(L[2]);
  T("D selection hc", near((c0.l+c0.r)/2,(c1.l+c1.r)/2)&&near((c1.l+c1.r)/2,(c2.l+c2.r)/2), (c0.l+c0.r)/2+" "+(c1.l+c1.r)/2+" "+(c2.l+c2.r)/2);
  L=three(); sel(L); st.mode="key"; var keyL=L[0]; var kb=measure(keyL); // key = the first layer selected
  CW.align.run({kind:"align",op:"left"});
  T("D key left: key unmoved", sameBox(kb,measure(keyL)), fmt(kb)+" vs "+fmt(measure(keyL)));
  T("D key left: others match", near(measure(L[1]).l,kb.l)&&near(measure(L[2]).l,kb.l), fmt(measure(L[1]))+" key "+fmt(kb));
  L=three(); sel([L[2],L[0],L[1]]); kb=measure(L[2]); CW.align.run({kind:"align",op:"left"});
  T("D key follows selection order, not stack order", sameBox(kb,measure(L[2])) && near(measure(L[0]).l,kb.l), fmt(kb)+" vs "+fmt(measure(L[2])));
  L=three(); sel(L); st.mode="comp"; st.group=true; var u0=measure(L[0]), u1=measure(L[1]), u2=measure(L[2]);
  CW.align.run({kind:"align",op:"left"});
  var m0=measure(L[0]), m1=measure(L[1]), m2=measure(L[2]);
  T("D group left: union at 0", near(Math.min(m0.l,m1.l,m2.l),0), Math.min(m0.l,m1.l,m2.l));
  T("D group left: offsets kept", near(m1.l-m0.l,u1.l-u0.l)&&near(m2.l-m0.l,u2.l-u0.l), "");
  st.group=false;
  L=three(); sel(L); st.mode="sel"; st.anchors=true; CW.align.run({kind:"align",op:"left"});
  var a0=anchorComp(L[0]),a1=anchorComp(L[1]),a2=anchorComp(L[2]);
  T("D anchors left", near(a0[0],a1[0])&&near(a1[0],a2[0]), a0.join(",")+" "+a1.join(",")+" "+a2.join(",")); st.anchors=false;

  log("== E distribute / spacing");
  L=three(); sel(L); CW.align.run({kind:"dist",op:"hc"});
  var d0=measure(L[0]),d1=measure(L[1]),d2=measure(L[2]);
  function cx(b){return (b.l+b.r)/2;}
  T("E dist hc even", near(cx(d1)-cx(d0),cx(d2)-cx(d1)), (cx(d1)-cx(d0))+" vs "+(cx(d2)-cx(d1)));
  L=three(); sel(L); var o0=measure(L[0]), o2=measure(L[2]); CW.align.run({kind:"space",axis:"h",gap:null});
  d0=measure(L[0]);d1=measure(L[1]);d2=measure(L[2]);
  T("E space h even gaps", near(d1.l-d0.r,d2.l-d1.r), (d1.l-d0.r)+" vs "+(d2.l-d1.r));
  T("E space h ends fixed", sameBox(o0,d0)&&sameBox(o2,d2), "");
  L=three(); sel(L); st.mode="sel"; var f0=measure(L[0]); CW.align.run({kind:"space",axis:"h",gap:10});
  d0=measure(L[0]);d1=measure(L[1]);d2=measure(L[2]);
  T("E space h gap 10", near(d1.l-d0.r,10)&&near(d2.l-d1.r,10), (d1.l-d0.r)+" , "+(d2.l-d1.r)); T("E fixed-gap first stays", sameBox(f0,d0), fmt(f0)+" vs "+fmt(d0));
  L=three(); sel(L); CW.align.run({kind:"space",axis:"v",gap:null});
  d0=measure(L[0]);d1=measure(L[1]);d2=measure(L[2]);
  T("E space v even gaps", near(d1.t-d0.b,d2.t-d1.b), (d1.t-d0.b)+" vs "+(d2.t-d1.b));

  log("== F parent + child both selected");
  clear(); var PP=solid("PP",200,100,[500,300],10,[110,100]); var CC=solid("CC",80,40,[100,-60],0,null,PP);
  sel([PP,CC]); st.mode="comp"; st.group=false; CW.align.run({kind:"align",op:"left"});
  T("F parent left=0", near(measure(PP).l,0), fmt(measure(PP))); T("F child left=0 (not double moved)", near(measure(CC).l,0), fmt(measure(CC)));
  clear(); PP=solid("PP",200,100,[500,300]); CC=solid("CC",80,40,[100,-60],0,null,PP);
  sel([PP,CC]); CW.align.run({kind:"align",op:"top"});
  T("F top both", near(measure(PP).t,0)&&near(measure(CC).t,0), fmt(measure(PP))+fmt(measure(CC)));

  log("== H skips");
  clear(); var cam=comp.layers.addCamera("cam",[500,300]); var X=solid("X",100,100,[300,300]); X.threeDLayer=true; X.transform.yRotation.setValue(30);
  sel([cam,X]); st.mode="comp"; CW.align.run({kind:"align",op:"left"}); 
  T("H rotated 3D layer left alone", near(posOf(X)[0],300), posOf(X));

  clear();
  log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
