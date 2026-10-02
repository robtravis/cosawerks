// CW.share: the file round trip (the dialogs themselves are AE's).
var SP=Folder.temp.fsName+"/";
var SRC="/Users/rob/Projects/cosawerks/src/";
var LOG=new File(SP+"share-result.txt"); LOG.open("w"); LOG.lineFeed="Unix";
function log(s){ LOG.writeln(s); }
function T(n,c,d){ log((c?"PASS ":"FAIL ")+n+(c?"":"  :: "+String(d))); }
try {
  var files=["core/00_core.jsx","modules/share.jsx"];
  for (var fi=0; fi<files.length; fi++) $.evalFile(new File(SRC+files[fi]));
  var text='{"format":"cosawerks-presets","version":1,"types":[{"name":"Café → Rise","props":[["ADBE Text Opacity",0],["ADBE Text Position 3D",[0,30,0]]]}]}\n';
  var tmp=SP+"cw-share-test";
  var written=CW.share.save(text,tmp);
  T("adds the extension", written.indexOf(".cwpresets")===written.length-10, written);
  var back=CW.share.open(written);
  T("the text comes back exactly, accents and arrows included", back===text, back.length+" vs "+text.length);
  T("reading a missing file throws", (function(){ try { CW.share.open(SP+"nope-"+(new Date().getTime())+".cwpresets"); return false; } catch(e){ return true; } })(), "");
  new File(written).remove();
  log("DONE");
} catch(e){ log("EXCEPTION: "+e.toString()+" line "+e.line); }
LOG.close();
