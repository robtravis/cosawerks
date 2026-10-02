# Panel UI: broken on first real run (2026-10-01)

Found when Rob ran dist/Cosawerks.jsx as a floating palette in AE 26.5:

- Panel is far too large. Likely the icon palettes' minimumSize/preferredSize and the
  `button` used as a canvas are being laid out at full width x tall; check sizes.
- Does not resize well.
- NO buttons work, for Anchor or Align. The logic is tested and passes (54 checks in AE,
  see tests/), so the fault is in src/ui: the custom `button` + onDraw + addEventListener
  approach has never been verified to draw or receive clicks.

Next time: build the smallest possible version first (one custom-drawn button that logs a
click), screenshot it, and grow from there. Consider plain `iconbutton`s with PNG icons,
or a `group` with onDraw, before another full custom canvas. Do not trust UI code that
has not been seen on screen.
