# Reference editor investigation — 2026-09-27

**Audience:** Contributors and coding agents. Historical research and asset notes, not a user guide; details may no longer match the current app.

Follow-up: [Runtime findings](./RUNTIME-FINDINGS.md) supersede this pass's readable-code limitation. Launching the game enabled function-level analysis of a read-only memory snapshot.

## Scope and outcome

Wonderblocks was committed first as `0b2f179` (20 tests passing). This investigation then examined the original installed executable with Ghidra 12.1.3 and a read-only PE/data-table parser. No game binaries or assets were changed, executed, or copied into Wonderblocks.

This pass recovered useful **data structures and diagnostic vocabulary**, but **did not recover the building editor's executable algorithms**. The findings below are design evidence, not a claim that Wonderblocks now implements reference internals.

## Exact target and analysis obstacle

- Original target: `<local reference executable>`, version 1.3.0.29.
- SHA-256: `e75cbb34396050b15fb1302600968075455eeb0bb1bd6386f8bd7fabebe892c6`.
- x86 PE, preferred image base `0x00400000`; entry RVA `0x014d3000`, inside `.ooa`.
- `.text` and `.data` have approximately 8 bits/byte entropy. Readable strings remain in `.rdata`.
- Ghidra completed its automatic analysis in approximately 21 seconds, recognizing 1,314 candidate functions and reporting numerous exception-data disassembly failures. The selected editor strings had no direct Ghidra references to useful editor functions.
- A separate raw-pointer scan likewise found no literal pointers to several sampled editor strings. This does not prove no references exist: encoded or relative references are possible.

Together, these observations suggest a protected/transformed on-disk code image. **High entropy alone is not proof of encryption**, and Ghidra's candidate functions must not be mistaken for recovered editor logic. No protection removal or runtime unpacking was attempted.

The installed Galactic Adventures executable was checked as a possible alternate target: version 3.1.0.29, SHA-256 `eae65dd8b02b0cbb9768836c3a233aff4ae3ff7dccd9a5e72f7d61152e7cb886`. Its entry RVA is `0x0190f000` in another `.ooa` section, and its initial code bytes likewise do not resemble ordinary function code. It was not substituted for the original target or analyzed as if its addresses were interchangeable.

## Verified observations and bounded interpretations

Addresses below are preferred-image VAs, not live process addresses.

### 1. Paint settings distinguish multiple material channels

A contiguous table of 32 ASCII-string pointers begins at `0x013f3958` (file offset `0x00ff2758`). Entries include:

- `diffuseHue`, `diffuseSat`, `diffuseVal`, `diffuseAlpha`
- `bumpScale`, `bumpAlpha`
- `specularScale`, `specularAlpha`
- `rotation`, `aspect`, `size`, `spacing`
- `region`, `paintMask`, position/bone/limb variables, and user variables

These are actual decoded pointers to readable strings, rather than simply a list of matching words. Their order is recorded in the evidence JSON; **the table indices are not asserted to be public API identifiers**.

Nearby six integer/string pairs begin at `0x013f39e4`:

| Value | Label |
|---|---|
| 0 | alpha |
| 1 | add |
| 2 | subtract |
| 3 | multiply |
| 4 | screen |
| 5 | inherit |

`SPSkinPaintFlood`, `bumpBlend`, `specularBlend`, and `diffuseBlend` appear in the surrounding data. The layout is consistent with named paint parameters and blend-mode definitions. No executing parser or shader was recovered, so exact behavior is unverified.

**Important scope limit:** this neighborhood explicitly refers to SkinPaint and contains creature-related variables. It is evidence of a reference paint subsystem, **not proof that the Building Creator uses that same pipeline**.

**Wonderblocks inspiration:** independently authored material presets should have separate color, bump/normal, and reflectance controls instead of reusing the same grayscale pattern for color and bump. Texture rotation, offsets, and regional masks would make presets more flexible. Specular controls should be adapted to our renderer, not equated mechanically with Three.js metalness.

### 2. Creation diagnostics describe relationships between blocks

The same executable contains these diagnostic format strings:

| Preferred VA | Diagnostic field |
|---|---|
| `0x013effa1` | `symmetricIndex %d` |
| `0x013effb5` | `parentIndex %d` |
| `0x013eff71` | `submeshIndex %d` |
| `0x013efee9` | `orientation %f %f %f %f` |
| `0x013efe45` | `deformChannel 0x%8.8x %f` |

Nearby fields include position, bounds, block count, and root-block index. These are consistent with a creation/debug serialization vocabulary for transforms, hierarchy, symmetry, and deformation values. Four orientation values could represent a quaternion, but that representation was **not confirmed**. The presence of plant/bone fields shows this is broader than buildings alone.

**Wonderblocks inspiration:** parent-child groups for moving a column with its capital and base; explicitly linked symmetry partners; named deformation parameters per part, such as roof pitch or column taper. Our current independent mirror copies and universal deformation sliders are simpler concepts.

### 3. Separate baked image outputs are named

The executable contains diagnostic output paths for `BakeInfoMap.tga`, `NormalMap.tga`, and `Diffuse.tga` at `0x013efd58`, `0x013efd70`, and `0x013efd88`, followed nearby by the labels `<source-specific label omitted>` and `<source-specific label omitted>`.

This is evidence that such outputs are named by the program, not proof of their formats, dimensions, UV packing, or editor-specific call paths.

**Wonderblocks inspiration:** bake our own textures and UVs into exportable material assets. That would be more valuable to a future Battlefront II workflow than adding more viewport-only patterns. Native game texture/collision formats still need separate investigation.

### 4. Avoid overinterpreting tempting names

`SnapDistanceZoomFactor` occurs next to city/tribe camera settings; that does not establish a building-editor snap algorithm. `Simulator/cMorphHandle` and its arrow/target variants are explicitly Simulator-labeled; they have not been tied to building-part deformation. These remain leads, not findings about the Building Creator.

## Recommended direction

1. Separate material color, bump, and reflectance settings; add texture rotation/offset.
2. Give multi-material parts editable regions (roof, pediment, trim) with original masks/material slots.
3. Add groups and optionally linked symmetry so structural assemblies stay together.
4. Add meaningful part-specific controls, starting with roof pitch and column proportions.
5. Bake/export materials using our geometry and textures, then build the game-specific conversion profile.

These are proposals inspired by observed data. No speculative engine algorithms or proprietary source have been added to the application.

## Reproduction and artifacts

- `inspect-editor-data.cjs`: original read-only parser. Run `node research/inspect-editor-data.cjs <reference-executable>`. The fixed table offsets are enabled only for the verified SHA-256.
- `reference-editor-1.3.0.29-evidence.json`: extracted section metadata, string addresses, and decoded tables, excluding executable code.
- `ReferenceEditorSurvey.java`: original Ghidra script that searches specific strings, enumerates references, and attempts decompilation of containing functions. This build yielded no such editor functions.
- Ghidra project, logs, and raw survey are retained in the task's `<external research workspace>` folder; they are not included in the distributable application.

The next step toward actual function-level recovery would be an authorized readable runtime image or a legitimately available analysis-friendly build with a verified version. Until then, these data observations should not be presented as a decompiled Building Creator.
