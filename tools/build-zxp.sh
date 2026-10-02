#!/bin/zsh
# Build and sign dist/release/Cosawerks-<version>.zxp, then check the signature.
# Needs tools/bin/ZXPSignCmd (tools/fetch-zxpsigncmd.sh) and certs/cosawerks.p12 + certs/.password (tools/make-cert.sh).
# Sign on the platform the package is for: a Mac-signed zxp is for Macs (Adobe's 2024 cross-platform signing note).
set -e
cd "$(dirname "$0")/.."
source tools/_sign.sh
CERT="${CW_CERT:-certs/cosawerks.p12}"
[ -f "$CERT" ] || { echo "certificate not found at $CERT (run tools/make-cert.sh)"; exit 2; }
PASS="${CW_CERT_PASSWORD:-$(cat certs/.password 2> /dev/null)}"
[ -n "$PASS" ] || { echo "no certificate password: certs/.password is missing (or set CW_CERT_PASSWORD)"; exit 2; }
VER=$(node -e 'console.log(require("fs").readFileSync("cep/CSXS/manifest.xml","utf8").match(/ExtensionBundleVersion="([^"]+)"/)[1])')
./tools/stage-cep.sh dist/stage/Cosawerks
mkdir -p dist/release
OUT="dist/release/Cosawerks-$VER.zxp"
rm -f "$OUT"
sign_cmd -sign dist/stage/Cosawerks "$OUT" "$CERT" "$PASS" -tsa http://timestamp.digicert.com
sign_cmd -verify "$OUT" -certinfo
echo "built $OUT ($(du -h "$OUT" | cut -f1))"
