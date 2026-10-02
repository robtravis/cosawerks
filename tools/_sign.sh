# Shared by make-cert.sh and build-zxp.sh (sourced, not run). Finds ZXPSignCmd and runs it, under Rosetta on Apple Silicon.
SIGN="${ZXPSIGNCMD:-tools/bin/ZXPSignCmd}"
[ -x "$SIGN" ] || { echo "ZXPSignCmd not found at $SIGN (run tools/fetch-zxpsigncmd.sh)"; exit 2; }
sign_cmd() {
  if [ "$(uname -m)" = "arm64" ]; then
    arch -x86_64 /usr/bin/true 2> /dev/null || { echo "ZXPSignCmd is an Intel binary and this Mac has no Rosetta."; echo "Install it once:  softwareupdate --install-rosetta --agree-to-license"; exit 3; }
    arch -x86_64 "$SIGN" "$@"
  else
    "$SIGN" "$@"
  fi
}
