# Releasing Cosawerks

You need: macOS, Node, After Effects (for the test suites), and once: Adobe's `ZXPSignCmd` and a signing certificate.

## One-time setup

```
tools/fetch-zxpsigncmd.sh     # downloads Adobe's signing tool into tools/bin (not committed)
tools/make-cert.sh            # makes certs/cosawerks.p12 (not committed). Back it up: a new certificate = a new publisher
```

## Each release

1. Bump `ExtensionBundleVersion` in `cep/CSXS/manifest.xml` (three numbers, e.g. 0.9.1) and add a line to `CHANGELOG.md`.
2. If you changed an effect's controls (`tools/gen-ffx.py`), bump its match name there **and** in `src/modules/arrow.jsx` / `typefx.jsx`
   (After Effects caches a pseudo effect by that ID for the whole session), then run `python3 tools/gen-ffx.py`. That writes a first draft to `dist/gen/`. Apply the draft to a layer in After Effects, click the effect,
   use Animation > Save Animation Preset, and put the saved file in `presets/` under the same name: the shipped presets are always
   After Effects-written files.
3. Run the AE suites in `tests/` (scratch project only; see README "Tests") and `node tests/*.test.js`.
4. `tools/release.sh`. It runs the node tests, stages the extension, builds and verifies the signed `.zxp`, makes the
   manual-install zip, and gathers everything into `dist/release/Cosawerks-<version>.zip`.
5. Install the `.zxp` on a clean machine (or a fresh user account) and open every panel before you send it out.

## Notes

- Sign on the platform the package is for (Adobe's 2024 cross-platform signing note). This repo builds for macOS.
- The package must contain no symlinks or `.DS_Store` files; `tools/stage-cep.sh` checks and fails if it finds any.
- The licence is MIT (`LICENSE.txt`).
- ZXPSignCmd for macOS is an Intel binary: on an Apple Silicon Mac install Rosetta once (`softwareupdate --install-rosetta --agree-to-license`).
