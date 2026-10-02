#!/bin/zsh
# Assemble the finished extension folder (what a user ends up with) into the folder you name.
# One recipe shared by the dev install, the ZXP build and the manual-install zip, so they cannot drift apart.
#   tools/stage-cep.sh dist/stage/Cosawerks
set -e
cd "$(dirname "$0")/.."
DEST="${1:?usage: stage-cep.sh <destination folder>}"
./build.sh > /dev/null
node tools/gen-ease-presets.js > /dev/null
node tools/gen-arrow-shapes.js > /dev/null
node tools/gen-version.js > /dev/null
rm -rf "$DEST"
mkdir -p "$DEST/jsx" "$DEST/presets"
rsync -a cep/ "$DEST/" --exclude jsx --exclude presets --exclude .DS_Store
cp dist/host.jsx "$DEST/jsx/host.jsx"
cp presets/*.ffx "$DEST/presets/"
cp THIRD-PARTY-NOTICES.md "$DEST/"
[ -f LICENSE.txt ] && cp LICENSE.txt "$DEST/"
# CEP's signature check chokes on these (Adobe's 2024 cross-platform signing note): no symlinks, no Finder litter
find "$DEST" \( -name .DS_Store -o -name __MACOSX \) -prune -exec rm -rf {} +
if [ -n "$(find "$DEST" -type l)" ]; then echo "error: the package contains symlinks:"; find "$DEST" -type l; exit 1; fi
for need in CSXS/manifest.xml index.html jsx/host.jsx presets/Cosawerks\ Arrow.ffx presets/Cosawerks\ Type.ffx js/version.js; do
  [ -f "$DEST/$need" ] || { echo "error: missing $need"; exit 1; }
done
echo "staged $(du -sh "$DEST" | cut -f1) in $DEST"
