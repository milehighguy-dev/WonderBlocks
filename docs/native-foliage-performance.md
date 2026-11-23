# Native foliage performance in Battlefront II PC

## Reusable exporter corrections

Native leaf compaction no longer depends on `includeCollision`, the presence
of tree-skin collision, or `lowDetail`. It operates on the authored foliage
itself. Spatial merges require overlapping sampling envelopes and limit the
replacement cylinder to 1.35 times the sum of source sampling volumes. The
192-particle bound remains. Hanging/upright sprays and single fixed baked
cards retain their frames. The target of four is advisory, not permission to
inflate a crown, bridge disconnected regions, or mix incompatible textures.
Native random sampling can still differ from the authored preview.

Every export includes `source/render-cost.json` and `manifest.renderCost`.
The accounting walks actual emitted ODF attachment graphs, counts repeated
references as repeated entities, and multiplies scene roots by placement
count. It reports leaf objects/cards, collision helpers, foliage carriers,
and source definitions separately. Cycles and missing dependencies fail.
An assets-only update explicitly reports source-layout counts; existing
WorldEdit placements are unknown. The eight-leaf-object review threshold is
an authoring guideline. The 1,024-entry reference transparent queue is not a
loaded-instance cap, and totals are not per-frame visibility estimates.
Reports explicitly leave runtime performance and foliage distance culling
unverified. Native validation retains that distinction in
`render-cost-checks.json`; it does not turn compilation into a performance pass.

### Optional whole-canopy prototype

`nativeTreeCanopy` accepts a bake tied to the source crown, with 1–8 regions, each represented
by one native camera-facing leafpatch. Unlike per-spray cloud baking, it
reduces independent leaf objects as well as cards. Each original patch must
belong to exactly one region. Duplicate/missing source indices and stale
geometry/texture signatures fail export. Region textures retain the source
cards, colours, gaps and 256-pixel views in a 512-pixel 2×2 atlas. The native
sampler chooses atlas tiles; these are approximate camera-facing regions,
not view-dependent impostors or an exact silhouette from every angle.
Physical tree surfaces and attachment ownership are independent of this bake.
Modeled palm fronds are left modeled.

For a fresh offline prototype:

```text
node tools/bake-tree-canopy.mjs biome-oak NEW_BAKE_FOLDER --zones=4
node tools/export-tree-canopy-prototype.mjs NEW_BAKE_FOLDER NEW_PACKAGE_FOLDER
```

The first argument may instead be a saved single-plant `.building.json`.
The baker partitions actual local crown patches spatially, renders four
transparent views of each region, and writes the source project and signature.
The exporter writes a standalone native source package and the internal
validation script. Neither tool installs assets or launches the game.
Use six zones for the pine prototype to retain more separate bough regions.
The biome-library exporter optionally accepts `--canopies=FOLDER`, with each
plant's bake in `FOLDER/SHORT_PRESET_NAME/canopy.json`; canopy bakes take
precedence over individual cloud bakes for that plant. Native performance,
atlas orientation in game and canopy transitions still require a small
playtest before map-wide adoption. This mode is not enabled by default.
