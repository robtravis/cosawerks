# Cosawerks

A set of After Effects panels (a CEP extension) that replaces a pile of scattered scripts: anchor point, align, trim paths, arrows,
text animation, slab type and mask reveals, stagger, eases, comps and renaming, and a strip of one-click buttons. Panels follow After
Effects' own look and update the selected layer live.

Named for CoSA, the Company of Science and Art that made the original After Effects.

- **Install:** [docs/INSTALL.md](docs/INSTALL.md)
- **Use:** [docs/USER-GUIDE.md](docs/USER-GUIDE.md)
- **What changed:** [CHANGELOG.md](CHANGELOG.md)
- **Make a release:** [docs/RELEASING.md](docs/RELEASING.md)

Built and tested on After Effects 26.5 for macOS.

## Licence

MIT. Copyright (c) 2026 Rob Travis. See [LICENSE.txt](LICENSE.txt); third-party components are listed in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). Issues and pull requests are welcome.

## For developers

- `src/core/`, `src/modules/` ExtendScript (ES3): one file per feature, plain functions; `build.sh` concatenates them into `dist/host.jsx`.
- `cep/` the panel (HTML, CSS, JS) and `CSXS/manifest.xml`; `presets/` the Arrow and Type effect presets (`tools/gen-ffx.py`).
- `./install-cep.sh` stages the extension and copies it to your CEP folder. `tools/release.sh` builds the signed `.zxp` and the release zip.
- Tests: `node tests/*.test.js`, and the `tests/ae-*.jsx` suites run inside After Effects. **Scratch projects only**: they make and clear a
  comp named `CW-TEST`, add solids, and refuse to run unless the open project is unsaved or named `Scratch*`. Every new suite must start with that guard. Each file starts with a `SRC` path to the `src/` folder: set it to your checkout. Run one with
  `osascript -e 'tell application "After Effects" to DoScript (read POSIX file "/path/to/tests/ae-type.jsx" as «class utf8»)'`
  and read the result file named in its header (in the temp folder).
- After Effects traps worth knowing are in the memory notes and the test headers (no `Array.indexOf`, stale effect handles after
  `addProperty`, reading a missing member of an AE object raises an uncatchable dialog: use `obj.reflect` to list members).
