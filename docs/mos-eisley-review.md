# Mos Eisley collection review

**Audience:** Contributors and coding agents. Historical research and asset notes, not a user guide; details may no longer match the current app.

Status: **collections 1–5 selected; collections 6–8 removed**.

The stock source level is `C:/SWBF2_ModTools/BF2_ModTools/assets/worlds/TAT/world2/tat2.wld`. Its object references resolve to the TAT ODF and MSH folders, including PC-specific meshes under `msh/PC`. No SDK files or installed addon files were changed.

| Number | Proposal | Intended use |
| --- | --- | --- |
| 01 | Block building kit | Cream stucco on editable blocks with a sloped base and an integrated raised roof rim; separate low dome and buttresses. |
| 02 | Weathered shop kit | Chipped plaster, upper room, inset entry and shaded frontage. |
| 03 | Recessed doorways | Narrow and broad entries, each with closed-door and doorless variants for room openings. |
| 04 | Editable interior style | Three rooms, two exits, plaster finishes, sandy floor, bar and low seating. |
| 05 | Street arch | Broad stock street arch. Adjoining walls come from the wall creator with Mos Eisley finishes. |

## Open and edit

- Review gallery: `previews/mos-eisley-review.html`.
- Native editor: `index.html?demo=mos-eisley`.
- Saved scene: `examples/projects/mos-eisley-review.building.json`.
- Components: **Mos Eisley** in the object palette. Its first tile, **Mos Eisley building block**, places the editable stucco block with its beveled base and roof rim already configured.
- Finishes: **Mos Eisley** in material themes; also available in the room finish selectors.

Each numbered proposal is a separate object group. The building blocks in 01 and 02 own their raised roof rim; it is not a set of separately selectable strips. Use **Roof rim height** and **Roof rim thickness** in the block inspector to adjust it. The same inspector has **Base slope height** and **Base slope projection** for the flared foot of the wall. These dimensions stay in metres after resizing, and converting the block to an interior preserves the rim and base slope. Exterior doorways cut through the widened foot. The gallery opens the room's roof cutaway only for presentation; the saved room still includes its roof. Interior furniture is marked as interior props so the neighboring-room hull cutter preserves it. Whole stock buildings are loaded only in the preview's comparison mode; they are not new building-library objects or part of the editable scene.

## Room-built buildings

In the room builder, choose **Building style → Mos Eisley**. The same choice is available in plan view. It paints all floors with the Mos Eisley plaster and sand finishes, adds a raised roof rim around the exterior, and flares the foot of the ground-floor walls. Expand **Roof rim & sloped base** to change the four dimensions. Selecting Default removes the trim and restores the default finishes; Undo restores the previous style and finishes.

The style follows adjoining rooms and polygon footprints rather than filling a surrounding rectangle. Shared walls stay free of exterior trim, doors cut through the widened base, and upper floors suppress the rim beneath their footprint. The slope is formed by the exterior wall geometry itself: the lower faces and door jambs widen continuously into the upright wall, with interpolated wall UVs and matching closed collision volumes. There is no separate base skirt. This also applies to interiors converted from sloped blocks. The layout and openings remain editable. Sample 04 demonstrates this as a building made from three rooms, not an existing solid block.

## Entry and canopy edits

The narrow entry uses its architectural ground plane, not the bottom of its buried pipe. The pipe extends 0.299562 metres below the building base; using the full model minimum had raised the plaster jambs above the floor. Both narrow variants now place their jambs at ground level.

Doorless narrow and broad variants remove the door leaf, and both variants have a complete rear face around the passage and inner reveals extending through the full depth. Arch, jamb and utility geometry retains its stock UVs. The canopy removes the separate `merch_crate` node and retains both cloth surfaces and support posts. All four entries have modeled rear faces and jamb undersides. Their architectural shells pass a closed-edge topology check, and the doorless variants retain clear rendering and movement collision passages. Extraction records these changes in `sources.json`; SDK files remain untouched.

## Roof vent completion

The roof vent also has completed faces around both inset grilles and caps at the shaft ends. These are actual triangles using the existing sheet-metal atlas; the original louvers and UVs remain intact. The complete 68-triangle vent passes closed-edge and outward-facing ray checks.

## Stock base bevel study

The visible PC mesh `tat2_bldg_small1.msh` has an intermediate base ring, not one straight slope. At its front-left wall the shoulder is at Y=0.692253, the intermediate ring at Y=0.242265, and the toe at Y=0. The intermediate projection is 0.163680 versus 0.669119 at the ground. These give normalized proportions of about 35% height and 24.5% remaining projection.

Editable block and room walls use an economical two-facet approximation: a broad lower flare, then a steeper face meeting the upright wall. Height and projection remain the authored dimensions. Rooms profile their existing wall faces and closed collision volumes; blocks have one additional four-face ring (eight triangles). Wall UV projection continues through both facets, including steep slopes. The stock toe's irregular damage and asymmetry are not reproduced automatically. The two-storey stock building uses a different, simpler slope, so this is a shared style based on the small-building reference, not an exact reproduction of every Tatooine mesh.

Standalone stock wall and wall-end pieces are removed because the wall creator supplies those shapes. The retained roof vent also appears in kits 1 and 4; the rectangular cloth canopy belongs to kit 2. Those shared pieces remain. The moisture vaporator, wall-hung canopy, machinery and cargo pieces were exclusive to the discarded kits and have been removed from the palette and generated assets.

## Asset handling

`tools/extract-mos-eisley.py` reads the local native MSH and TGA sources. It checks chunk bounds, hierarchy cycles and triangle indices; retains visible static geometry, original texture coordinates and source triangle counts; excludes collision, hidden lowrez and shadow-volume models; bakes model transforms; and converts handedness by reflecting Z and reversing triangle winding. Facade pieces are rotated from stock +X facing to editor +Z facing. Stock source files remain untouched.

Stock textures are converted to bounded 256-pixel display textures. The reusable 128-pixel surface swatches use complete stucco sheets or a documented plaster crop. Original doors and service details stay on their authored UV atlases. `assets/mos-eisley/sources.json` records source paths, hashes, dimensions and triangle counts. Source assets retain their original ownership; this review does not establish new ownership or licensing rights.

The SDK's ventilator, junk-bin and cylinder refer to `tat1_prop_droid_rubbish.tga`, which was not present in the inspected TAT source tree. They were excluded rather than assigned an unrelated texture. Retained components and comparison buildings use complete source dependencies.

## Verification

64 focused checks pass after selecting collections 1–5, adding the building-block preset, repairing the entries and removing redundant walls and canopy cargo, covering collection source fidelity, retained and discarded part types, material themes, native scene/export planning, wall styles, organized imports and all saved project validation. Retained stock faces preserve their authored UVs and low triangle counts. Browser checks use a separate headless profile, verify the gallery and 10 palette entries (one editable building preset and nine stock components), exercise the style in both room editors with Undo/Redo, save and reopen edited dimensions, and preserve existing user tabs and scenes. Plan finish controls accept the fractional texture scales used by the style. This pass does not compile or install a BF2 map or claim in-game loading/collision verification.
