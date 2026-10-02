var fs=require('fs'), assert=require('assert');
var CW={}; var src=__dirname+"/../src/";
["core/00_core.jsx","core/10_math.jsx","modules/align.jsx"].forEach(function(f){ new Function("CW", fs.readFileSync(src+f,"utf8")).call(null,CW); });
// ^ each file starts with `var CW = CW || {}` in 00 only; others use the passed CW
function near(a,b,m){ assert(Math.abs(a-b)<1e-6, (m||"")+" "+a+" != "+b); }
function nearV(a,b,m){ near(a[0],b[0],m); near(a[1],b[1],m); }
var S=function(o){return Object.assign({pos:[0,0],anchor:[0,0],scale:[100,100],rot:0,parent:null},o)};

nearV(CW.m.toComp(S({pos:[100,50],anchor:[10,10]}),[10,10]),[100,50],"identity anchor->pos");
nearV(CW.m.toComp(S({rot:90}),[10,0]),[0,10],"90deg cw");
var par=S({pos:[200,200],anchor:[50,50]}), kid=S({pos:[0,0],parent:par});
nearV(CW.m.toComp(kid,[0,0]),[150,150],"child origin at parent layer top-left: pos - anchor");

// anchor move leaves every point where it was
for (var n=0;n<200;n++){
  var r=function(a,b){return a+Math.random()*(b-a)};
  var pp=S({pos:[r(0,500),r(0,500)],anchor:[r(0,100),r(0,100)],scale:[r(-200,200)||50,r(20,200)],rot:r(-180,180)});
  var s=S({pos:[r(0,500),r(0,500)],anchor:[r(0,100),r(0,100)],scale:[r(20,200),r(-200,-20)],rot:r(-180,180),parent:n%2?pp:null});
  var na=[r(0,100),r(0,100)], p=[r(0,100),r(0,100)];
  var before=CW.m.toComp(s,p);
  var dp=CW.m.apply(CW.m.lin(s),[na[0]-s.anchor[0],na[1]-s.anchor[1]]);
  var s2=S({pos:[s.pos[0]+dp[0],s.pos[1]+dp[1]],anchor:na,scale:s.scale,rot:s.rot,parent:s.parent});
  nearV(CW.m.toComp(s2,p),before,"anchor move invariant #"+n);
  // comp delta -> parent delta -> comp delta
  var d=CW.m.compDeltaToParent(s,13,-7); var back=CW.m.apply(CW.m.parentLin(s),d); nearV(back,[13,-7],"delta roundtrip");
  var moved=S({pos:[s.pos[0]+d[0],s.pos[1]+d[1]],anchor:s.anchor,scale:s.scale,rot:s.rot,parent:s.parent});
  var a0=CW.m.toComp(s,p), a1=CW.m.toComp(moved,p); nearV([a1[0]-a0[0],a1[1]-a0[1]],[13,-7],"moves layer by delta in comp");
}
// align
var B=[[10,10,30,20],[50,40,90,60],[0,100,20,140]];
var d=CW.align.alignDeltas(B,"left",[0,0,200,200],false); nearV(d[0],[-10,0]); nearV(d[1],[-50,0]);
d=CW.align.alignDeltas(B,"right",[0,0,200,200],true); nearV(d[0],[190,0],"outside right"); 
d=CW.align.alignDeltas(B,"center",[0,0,200,200]); nearV(d[1],[100-70,100-50]);
// distribute centers: centers x = 20,70,10 -> sorted 10,20,70 ; middle should be 40
d=CW.align.distDeltas(B,"hc"); nearV(d[0],[20,0],"dist hc mid"); nearV(d[1],[0,0]); nearV(d[2],[0,0]);
// even spacing horizontally: sorted by left: B2(0-20), B0(10-30), B1(50-90): sizes 20+20+40=80, span 90, gap 5
d=CW.align.spaceDeltas(B,"h",null,0); nearV(d[2],[0,0]); // box 2 first stays
var x0=B[0][0]+d[0][0], x1=B[1][0]+d[1][0], x2=B[2][0]+d[2][0];
near(x0-(x2+20),5,"gap A"); near(x1-(x0+20),5,"gap B");
// fixed gap 10 around anchor index 0 (10-30): after: box1 left=40 ; before: box2 right=0 -> left=-20
d=CW.align.spaceDeltas(B,"h",10,0); near(B[1][0]+d[1][0],40,"fixed after"); near(B[2][2]+d[2][0],0,"fixed before");
console.log("all math tests passed");
