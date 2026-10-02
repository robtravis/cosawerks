#!/bin/zsh
# Make dist/release/Cosawerks-<version>.zip: the signed .zxp (when the signing tool and certificate are set up),
# a manual-install zip, the Toggle script, and the docs. Run the AE test suites yourself first (see docs/RELEASING.md).
set -e
cd "$(dirname "$0")/.."
VER=$(node -e 'console.log(require("fs").readFileSync("cep/CSXS/manifest.xml","utf8").match(/ExtensionBundleVersion="([^"]+)"/)[1])')
echo "== Cosawerks $VER"
echo "-- node tests"
for t in tests/*.test.js; do
  if node "$t" > /dev/null 2>&1; then echo "   ok  $t"; else echo "   FAILED  $t (run: node $t)"; exit 1; fi
done
echo "-- stage"
./tools/stage-cep.sh dist/stage/Cosawerks
OUT="dist/release/Cosawerks-$VER"
rm -rf "$OUT" "$OUT.zip"
mkdir -p "$OUT"
echo "-- manual-install zip"
( cd dist/stage && ditto -c -k --norsrc --noextattr --noacl --keepParent Cosawerks "../../$OUT/Cosawerks-$VER-manual.zip" )
echo "-- signed .zxp"
if [ -x "${ZXPSIGNCMD:-tools/bin/ZXPSignCmd}" ] && [ -f "${CW_CERT:-certs/cosawerks.p12}" ]; then
  ./tools/build-zxp.sh
  cp "dist/release/Cosawerks-$VER.zxp" "$OUT/"
else
  echo "   skipped: needs tools/bin/ZXPSignCmd and certs/cosawerks.p12 (tools/fetch-zxpsigncmd.sh, tools/make-cert.sh)"
fi
cp docs/INSTALL.md docs/USER-GUIDE.md CHANGELOG.md THIRD-PARTY-NOTICES.md "$OUT/"
[ -f LICENSE.txt ] && cp LICENSE.txt "$OUT/"
cp "scripts/Cosawerks Toggle.jsx" "$OUT/"
find "$OUT" -name .DS_Store -delete
( cd dist/release && ditto -c -k --norsrc --noextattr --noacl --keepParent "Cosawerks-$VER" "Cosawerks-$VER.zip" )
echo "== built dist/release/Cosawerks-$VER.zip"
ls -1 "$OUT"
