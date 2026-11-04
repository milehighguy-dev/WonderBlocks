# Prototype editor types and package data

**Audience:** Contributors and coding agents. Historical research and asset notes, not a user guide; details may no longer match the current app.

Investigation date: 2026-09-27. Target: the user-supplied February 19, 2008 prototype, version `1.0.0.11318`, with the matching PDB verified in [PROTOTYPE-FINDINGS.md](./PROTOTYPE-FINDINGS.md).

## Main result

The building painter has evidence for **both individual block regions and building-wide style categories**. These are two different levels of control. The package connects building configuration to its paint palette, default theme, preview building, and category filters; actual saved building examples contain multiple paint-region entries per block.

This resolves an earlier uncertainty: per-block region painting is now supported by building-specific data and tutorial text, not just shared creation-system code. Tutorial instructions are evidence of intended prototype behavior; the UI was not run or tested in this pass.

Wonderblocks was not modified. All binary, localization, and decoded-resource inputs remain in the task's `<external research workspace>` directory.

## Extraction and checks

- Read `Editors.package` directly from the ISO's InstallShield cabinet using the ISO file extent and cabinet file offset. No mounting, installing, launching, or multi-gigabyte temporary cabinet was required.
- Checked the package's expanded size, 7,371,216 bytes, and its MD5 against the installer metadata.
- Parsed DBPF version 2: 4,126 resource entries. Validated index length, resource bounds, RefPack output sizes, and backreference bounds.
- Structurally parsed all 2,460 property-list resources, consuming each record exactly with no trailing data. Common types were decoded; less relevant types were retained as opaque bytes. Structural success does not establish the semantics of every property.
- Property encoding is mixed-endian: numeric property headers and integer/float scalar values are big-endian, while resource keys, RGB vectors, and UTF-16 text payloads use their respective little-endian representations. The initial numeric interpretation was corrected before drawing conclusions.
- Resolved property names using the community registry, and independently matched the five key paint-theme property IDs to constants located by this prototype's PDB symbols. Community names elsewhere remain annotations, not proof of compatibility across builds.

## A concrete building-paint configuration chain

The property `40600100!d817cd63.00b1b104`, described as Building Editor Setup, includes these links:

| Setting | Referenced resource |
|---|---|
| Paint palette | `406b6a00!00000029.00b1b104` — Building Editor Texture Palette |
| Parts palette | `406b6a00!00000028.00b1b104` — Building Editor Palette |
| Default theme | Instance `0af81426`, group `406a0200`; resolves to the property described as `BE_Theme_Default` |
| Paint preview model | `40636200!cd363887.2399be55` — saved model named `BuildingPaintSwatch` |

The setup also explicitly disables `editorUseSkin` and `editorUseSymmetry`. These are configuration values in this record, not proof that all prototype building modes or runtime overrides behave identically. In particular, shared symmetry machinery must not automatically be described as enabled in the Building Creator.

The default theme stores 18 paint keys, 18 primary RGB colors, and 18 secondary RGB colors. Matching list lengths support an indexed theme representation. The separate category filters below contain 20 positions; the treatment of absent theme entries is not yet established.

## Partial styles select sets of regions

The category property records, filter references, and English localization IDs form a concrete chain:

| Category label | Category instance | Filter instance | Enabled filter positions |
|---|---|---|---|
| Walls & Roofs | `5a5831dc` | `c862f28f` | 5, 6, 7, 9, 13, 14, 15 |
| Windows & Doors | `06326fa2` | `3a53cb54` | 0, 1, 2, 3, 8 |
| Details | `b6b48d32` | `b833bbda` | 4, 10, 11, 12, 16, 17, 18, 19 |

Category records are in group `406b6e29`; filter properties are in group `406a6f00`. Each filter is a 20-element boolean array under `paintThemeRegionFilter`. Their enabled positions partition 0–19 without overlap. Treating those positions as the corresponding region indices is consistent with the saved-model and theme data, but the complete application routine remains protected.

All three filter descriptions misleadingly say `RegionFilter BE Structure`. The category links and localization keys, rather than those copied descriptions, establish which filter belongs to which category.

The building partial-style tutorial describes applying a style and colors to these larger categories. Its windows/doors category description additionally mentions connectors and functional parts, while its details description includes effects.

This is separate from the four `paintRegionMapping` resources also present in the package. Those contain integer sequences separated by `-1`. The PDB's `mClosestRegions` member and matching method names are leads to their use, but this pass did not prove their selection rules or assign each mapping table to a particular editor. They should not be presented as a recovered fallback algorithm.

## Individual building blocks also have paintable regions

The building paint-brush tutorial describes selecting a pattern with primary and secondary colors, hovering over a region to preview the affected area, and clicking to paint it. It also describes applying paint to similar blocks or similar regions and using an eyedropper for paint, color, or both. Some shortcut descriptions are repetitive or inconsistent; they were not treated as tested key bindings.

The package includes two XML building resources of type `2399be55`:

| Saved model | Block entries | Observed per-block paint counts |
|---|---:|---|
| `BLE_TooComplex` (`a54be5f7`) | 4 | 4, 2, 2, 2 |
| `BuildingPaintSwatch` (`cd363887`) | 10 | First eight: 4, 3, 2, 3, 3, 3, 3, 3 |

Each paint entry uses the familiar region ID, paint ID, primary color, and secondary color fields. The preview model is directly referenced by the building setup, making it a building-specific example rather than an inferred creature analogy.

This does not yet show how triangles are assigned to regions, how the two colors blend in a shader, or how UVs are generated. Those require model/material-resource analysis.

## Type information supports more targeted editing tools

Selected CodeView class/member records from the matching PDB add detail:

- `cSPEditorPaintTheme::mPropTheme` is a map of integer keys to paint records; `mModelTheme` contains maps of paint records grouped in a more complex model-related container. `mClosestRegions` is an integer vector. The names support a distinction between stored themes and themes obtained from models; exact algorithms remain unverified.
- `cModelDeformationHandle` contains a handle type, transform, animation ID, start/end points, and rest value.
- `cSPEditorHandleDeform` carries local and world start/end positions, an axis, a symmetric handle reference, pinning information, current delta, and preview delta.
- `cSPEditorManipulationDeformHandle` has target and actual delta values and explicit minimum/maximum handle deltas.
- `cSPEditorBlock` contains collections of deformation handles, saved handle deltas/animation IDs, and separate allowed-type lists for different snapping operations.

These are type/layout observations. They do not recover the deformation interpolation, animation curves, or attachment solver. They support independently designing meaningful per-part controls, such as roof pitch and column proportions, instead of treating universal mesh modifiers as a faithful reconstruction.

## Recommended Wonderblocks design

1. **Part regions:** named, separately selectable surfaces on our original parts, with hover highlighting and a preset plus two colors per region.
2. **Style categories:** semantic groups spanning multiple parts, so users can recolor roofs, walls, openings, or details consistently.
3. **Reusable themes:** assignments across those categories, with per-region overrides and an eyedropper. Define our own behavior when a theme lacks a category.
4. **Part-specific handles:** meaningful parameters with explicit bounds and defaults, backed by our procedural geometry.

Our categories, identifiers, geometry, presets, and implementation should remain original. There is no need to reproduce the reference editor’s region numbers, three-category limit, default colors, or prototype quirks. Live linked symmetry can still be a useful Wonderblocks feature, but this package does not justify calling it the prototype Building Creator's default behavior.

## Artifacts and sources

Local research files under `<external research workspace>`:

- `editor-extraction.json`, `editor-data/Editors.package`, and selected English tutorial text.
- `package-index.json`, `package-resources/`, `decoded-props.json`, and `prop-failures.json`.
- `property-ids.json`: prototype symbol-backed property ID checks.
- `selected-types.json`: expanded selection of PDB type/member observations.
- `extract-editor-data.cjs`, `read-editor-package.cjs`, and `decode-props.cjs`: local research helpers.

Community DBPF readers, property readers and a property-name registry were used as format references, with actual package contents and the prototype PDB used for build-specific evidence. Reference sources and research helpers were not added to the application code.
