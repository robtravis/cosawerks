# Cosawerks user guide

Open **Window > Extensions > Cosawerks**. Each section can also be its own panel (the little pop-out icon on a section's header, or
Window > Extensions > Cosawerks Anchor Point / Align / Trim Paths / Ease / Comps / Buttons / Arrows / Type / Stagger).

## Working in the panel

- **Numbers** work like After Effects' own: hover and drag sideways to change, click to type. Shift is coarse, Ctrl or Alt is fine.
- **Tooltips** explain every control; hover for a moment.
- **The gear** (top right): *Arrange* (one column, side by side, or wrapping), *Remember size*, *Hide headers*, which sections show in
  this panel, *Reset Layout*, and **Presets Export / Import**. Drag a section's title to reorder it.
- Most settings **update the selected layer live**. Apply buttons build; Remove buttons take it off again.

## Anchor Point and Align

Anchor Point: a 3 x 3 grid moves the anchor to that point of the layer without moving the layer. Align: align layers, distribute layers or
spacing, and "Align To" (selection, comp, key layer ...). The first layer you select is the key layer.

## Trim Paths

Select shape layers and press **Apply** to build a staggered trim: every path or group in the layer draws in (or out, or in and out) one
after another. Length is the whole build in frames, Overlap is how much the paths overlap, Order can be random (with a seed), Ease shapes the
build, and the Direction button reverses the selected paths. Overlap and Random update live.

## Arrows

- **Arrow** adds an arrow head to the selected shape layer's path, or makes a new curved arrow if no shape layer is selected.
  Everything is one shape layer, driven by an **Arrow** effect (head shape, size, angle, grow-in, tail, travel length, reverse ...).
- Pick a **Preset** (or save your own with +). Tick **Animate** to build it on over *Duration* frames (eased 50-80).
- **Follow Path:** select a path, then the layers that should ride it. **Path Nulls:** *Drive Path* puts a null on every point so you can reshape
  the path by moving nulls; *Follow Path* makes nulls that ride the points; *Release* makes a driven path ordinary again.

## Type

Select text layers and press **Apply**. Choose a **Look** (what each unit does as it arrives), **By** character, word or line, an **Ease**, and the
**Delay** (frames between units), **Duration**, **Shift**, plus Reverse, Random, In and Out. All of it stays live in the layer's **Type**
effect after you apply it. Save a layer's look and timing with +.

- **Mask looks** (Look > Mask): each line is revealed by its own mask: wipe right, left, up, down, or open from the centre. **Feather** softens the moving edge.
- **Slab:** makes every line the same width. Lines narrower than the *Threshold* share of the width are scaled up; wider ones are tracked out; a
  one-word line can always scale. *Leading* is a percentage of the original and keeps the visible gap between lines even. *Recolour* shades
  lines from a start to an end colour by how much they were scaled. **Clear** puts the text back. Lines are the ones you separate with Enter.

## Stagger

Offsets timing one item after another. Mode: **Layers** (start times), **Trim In / Trim Out** (in or out points), **Keys** (selected
keyframes) or **Sequence** (end to end; the amount is the gap). Amount is frames, or add an `s` for seconds. The three stair buttons stagger
from the top layer down, from the bottom up, or at random; Ease and Strength shape the spacing. *Shift only* moves everything by the amount;
*Add to current* adds to the timing the items already have (Shift or Alt on a button do the same).

## Ease

Click a curve to apply it to the selected keyframes (a pair, or a key and the next). RT, Motion and Mine libraries; **+** saves the ease of
the selected keyframes as yours; **Copy** and **Paste** move an ease between keyframes. Overshoot and Bounce add the expression.

## Comps

**Duplicate Comps** makes a duplicate of the selected comps with their text layers turned off (suffix and folder are yours to set). **Rename**
works on layers, comps or project items: replace, add a prefix or suffix, number, or change case.

## Buttons

A strip of one-click actions. The starter buttons run standard After Effects menu commands. In the gear menu: **Edit** (reorder by dragging, click a
button to change or delete it), **Add** (build a button from your selection: run a script, apply an animation preset or effect, set an
expression, or run a menu command), **Restore Defaults**. Hold Ctrl, Alt or Shift while clicking for a button's alternate action.

## Sharing presets

Gear menu > **Export** writes your saved arrow presets, Type looks and eases to one `.cwpresets` file. **Import** adds the ones in a
file someone sent you (a preset with the same name is replaced).
