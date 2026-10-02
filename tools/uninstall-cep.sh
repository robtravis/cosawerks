#!/bin/zsh
# Remove the Cosawerks extension from your user-level CEP folder. Your saved presets and buttons
# (~/Library/Application Support/Cosawerks) are kept; delete that folder too for a full clean-out.
set -e
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/Cosawerks"
if [ -d "$DEST" ]; then rm -rf "$DEST" && echo "removed $DEST"; else echo "not installed at $DEST"; fi
echo "Restart After Effects. Your presets are still in ~/Library/Application Support/Cosawerks"
