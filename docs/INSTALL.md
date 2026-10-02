# Installing Cosawerks

Cosawerks is a set of panels for Adobe After Effects (a CEP extension). It was built and tested on **After Effects 26.5 for macOS**.
Windows is untested. The Slab and Mask Reveal tools need an After Effects that lets scripts style ranges of a text layer
(it says so in the panel if yours cannot); everything else uses long-standing features.

## Install the .zxp (recommended)

1. Get a ZXP installer. [ZXPInstaller](https://aescripts.com/learn/zxp-installer/) is free, or use aescripts + aeplugins.
2. Open it and drop `Cosawerks-<version>.zxp` onto it.
3. **Quit and relaunch After Effects.**
4. Open **Window > Extensions > Cosawerks**. The tools are also available as separate panels (Window > Extensions >
   Cosawerks Anchor Point, Align, Trim Paths, Ease, Comps, Buttons, Arrows, Type, Stagger, and three spare "Cosawerks 2 / 3 / 4"
   panels you can set up with any mix of sections).

The package is signed by Rob Travis with a self-signed certificate, so the installer may say the publisher is unverified. That is expected.

## Install by hand

Use this if you have no installer. After Effects only loads unsigned extensions when debug mode is on.

1. Unzip `Cosawerks-<version>-manual.zip`. You get a folder named `Cosawerks`.
2. Copy that folder into your CEP extensions folder:
   - **macOS:** `~/Library/Application Support/Adobe/CEP/extensions/` (press Cmd-Shift-G in Finder and paste it)
   - **Windows:** `%APPDATA%\Adobe\CEP\extensions\`
3. Turn on debug mode for unsigned extensions (once):
   - **macOS**, in Terminal (run all four so every After Effects version is covered):
     ```
     defaults write com.adobe.CSXS.9 PlayerDebugMode 1
     defaults write com.adobe.CSXS.10 PlayerDebugMode 1
     defaults write com.adobe.CSXS.11 PlayerDebugMode 1
     defaults write com.adobe.CSXS.12 PlayerDebugMode 1
     ```
   - **Windows:** run `regedit`, open `HKEY_CURRENT_USER\Software\Adobe\CSXS.12`, add a **String** value named `PlayerDebugMode`
     with the value `1`. Repeat for `CSXS.9`, `CSXS.10` and `CSXS.11` if you use older versions.
4. Quit and relaunch After Effects, then open Window > Extensions > Cosawerks.

## If something is wrong

- **The panel is blank after installing the .zxp.** This is a known Adobe issue with some installers (the signature check fails).
  Either turn on debug mode as in step 3 above, or launch After Effects once **as administrator** (Windows) and open the panel.
- **It is not in the Window > Extensions menu.** Quit and relaunch After Effects fully. Check the folder is named exactly
  `Cosawerks` and contains `CSXS/manifest.xml`.
- **A tool says it needs a newer After Effects.** Slab and Mask Reveal use text-range scripting that older versions lack.
- **Panels look cut off or too tight.** Drag the panel wider, or use the gear menu: Arrange, Hide headers, Remember size.
- **A script permission message from After Effects.** Cosawerks needs *Preferences > Scripting & Expressions > Allow Scripts to
  Write Files and Access Network* switched on, because it saves your presets and buttons.

## Show and hide with a key (optional)

`Cosawerks Toggle.jsx` (in the download) opens the panel with one key press. Copy it into After Effects'
`Scripts` folder and restart. After Effects cannot bind a key to a script itself, but macOS can: System Settings > Keyboard >
Keyboard Shortcuts > App Shortcuts > add the shortcut for the menu title `Cosawerks Toggle.jsx` in After Effects.

## Your settings

Saved arrow presets, Type looks, eases, panel layouts and your Buttons are kept in:

- **macOS:** `~/Library/Application Support/Cosawerks`
- **Windows:** `%APPDATA%\Cosawerks`

Updating Cosawerks does not touch that folder. To share presets with someone, use the gear menu > **Export** and send them the
`.cwpresets` file; they use **Import**.

## Updating

Install the new `.zxp` over the old one (or replace the `Cosawerks` folder) and restart After Effects.

## Uninstalling

Remove it in your ZXP installer, or delete the `Cosawerks` folder from the extensions folder above, then restart After
Effects. Delete the settings folder as well if you want a full clean-out.
