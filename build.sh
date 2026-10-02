#!/bin/zsh
# Concatenate src into the ScriptUI panel (dist/Cosawerks.jsx) and the CEP host script
# (dist/host.jsx: core + modules only, no ScriptUI). Order: core, modules, ui.
set -e
cd "$(dirname "$0")"
mkdir -p dist
stamp="// Cosawerks, built $(date '+%Y-%m-%d %H:%M')"
{
  echo "$stamp"
  for d in core modules ui; do
    for f in src/$d/*.jsx(N); do echo "// ---- $f"; cat "$f"; echo; done
  done
} > dist/Cosawerks.jsx
{
  echo "$stamp (CEP host)"
  for d in core modules; do
    for f in src/$d/*.jsx(N); do echo "// ---- $f"; cat "$f"; echo; done
  done
} > dist/host.jsx
echo "built dist/Cosawerks.jsx ($(wc -l < dist/Cosawerks.jsx) lines), dist/host.jsx ($(wc -l < dist/host.jsx) lines)"
