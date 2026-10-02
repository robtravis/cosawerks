#!/bin/zsh
# Download Adobe's ZXPSignCmd (macOS) into tools/bin. It signs .zxp packages.
# Source: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD/4.1.3/macOS  (about 6.4 MB)
set -e
cd "$(dirname "$0")"
mkdir -p bin
curl -fL "https://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/ZXPSignCMD/4.1.3/macOS/ZXPSignCmd" -o bin/ZXPSignCmd
chmod +x bin/ZXPSignCmd
xattr -d com.apple.quarantine bin/ZXPSignCmd 2> /dev/null || true
echo "saved tools/bin/ZXPSignCmd"
./bin/ZXPSignCmd -help 2>&1 | head -5
