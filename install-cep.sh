#!/bin/zsh
# Developer install: stage the extension and copy it into your user-level CEP folder (no admin needed).
# Restart After Effects once after the FIRST install (and after the manifest changes);
# later edits to the HTML/JS/CSS reload when you close and reopen the panel.
set -e
cd "$(dirname "$0")"
./tools/stage-cep.sh dist/stage/Cosawerks > /dev/null
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/Cosawerks"
mkdir -p "$DEST"
rsync -a --delete dist/stage/Cosawerks/ "$DEST/"
echo "installed to $DEST"
