#!/bin/zsh
# One-time, per machine: copy the files the default buttons run into a Cosawerks-owned folder, so the
# strip does not depend on KBar's folders or AE's Scripts folder. Safe to re-run.
set -e
DEST="$HOME/Library/Application Support/Cosawerks/buttons"
KB="$HOME/Documents/KBar-Imports/RT-KBar"
AE="/Applications/Adobe After Effects 2026/Scripts/ScriptUI Panels"
mkdir -p "$DEST"
for f in "$KB/presets/FTF-2D-ChalkLine.ffx" "$KB/presets/Dissolve-In.ffx" "$KB/presets/Dissolve-Out.ffx" "$KB/presets/Set-Matte.ffx" \
         "$KB/scripts/Reload Source.jsxbin" "$KB/scripts/Quick Save Frame.jsx" \
         "$AE/RT_Unprecomp.jsx" "$AE/RT_GroupShapes.jsx" "$AE/RT_ExplodeShapes.jsx" \
         "$AE/Void_newVoid.jsx" "$AE/Void_newVolume.jsx" "$AE/Void_newVariant.jsx"; do
  if [ -f "$f" ]; then cp "$f" "$DEST/"; echo "copied: $(basename "$f")"; else echo "MISSING: $f"; fi
done
ls -la "$DEST" | tail -n +2
