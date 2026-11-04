# Changelog

## Unreleased

- Removed the Wroshyr example, its saved scene and preview. New routes and hallway extensions start at 3.75 metres wide, half the previous default; authored widths are preserved.

- Added a Windows desktop application with a bundled runtime, native folder picker, project-download dialogs and a persistent writable texture library. Version-tag pushes build, test and publish a portable ZIP, per-user installer and checksums through GitHub Actions; pull requests and manual runs produce build artifacts. Local character references and development files are excluded.

- Added project and per-asset export profiles with remembered names, choices and world folders. Scene identities own separate descriptive layers and survive renaming; an assets-only scene update preserves WorldEdit placements and planning. Added conflict-only overwrite confirmation, targeted optional planning cleanup, safe adoption of matching previous exports, compact completion counts and Open output folder. Local folder capabilities persist across app restarts and are restricted to user-selected world folders.

- Simplified AI planning on verified straight routes at every scene size: remove overlapping collinear links and intermediate hubs while retaining corridor width, bends, junctions, doors and changes of grade. Barrier estimates combine across objects, discard contained duplicates and join touching spans without closing door gaps. Long-arc spatial checks still protect crossings at other heights; reports retain all merged barrier sources.
- Reviewed all retained examples for copy reuse. Rainwell now groups individual lamps, piers, buttresses and roof sections instead of whole districts, with 100 parts marked as copies and all authored shapes/placements retained. Other representative examples mark matching standalone objects and complete groups as copies; different arrangements remain independent.
- Removed redundant scene rebuilds during commits and label edits. Deleting a fitted hallway's host now clears the dangling fit reference and Undo restores it. Early flora-weld requests queue while asynchronous dependencies load instead of being dropped.
- Copied plants reuse joined-wood geometry even when their internal node IDs differ. Shape edits still generate an independent result; repeated copies avoid repeating the expensive join.
- Hardened directory-driven textures: unreadable images and malformed metadata no longer stop the whole library; errors identify the file and placeholders cannot export. Preserve custom image transparency, share export names across identical added images, and validate the pixel cache by source content so rapid same-size overwrites are noticed.
- Export split settings validate while typing and recover without leaving the field; preview preparation has a timer fallback when animation frames are suspended. Folder recovery preserves newer outside edits and checks world metadata again at completion.

- Faster direct world-folder exports: skip ZIP construction, reuse directory handles and guarded originals, batch independent file operations, and skip deep scans of verified backups. Keep ordered world registration, planning checks and rollback after in-flight writes drain. Rainwell's 1,079-file browser writing benchmark was roughly three times faster; scene and standalone file bytes are unchanged.

- Material textures and categories now come from image folders under textures/. Existing tiles retain their IDs and appearance; new source images need no registry edit or build step. Removed repeated Plain cards in favor of one Remove texture button. Browser checks cover adding images, save/reload and worker export.

- Duplicate and Ctrl+D now create shared copies implicitly. COPY badges identify unedited duplicated objects and groups in the scene list; shape, scale or material edits make the edited copy unique and remove its badge. Save/load and undo/redo preserve copy status. Rainwell plants are individual authored objects, with repeats copied rather than merged into one forest asset.
- Enforced the native 64-bone limit including the root, and split unusually large foliage attachment sets safely. The Rainwell forest passed ModelMunge with every plant retained. Direct re-export archives obsolete managed MSH/ODF sources; backups use .wbbackup extensions so recursive Mod Tools scans cannot compile old broken models.

- Explain disabled SWBF2 export buttons beside the action, with collision-check progress, validation errors and missing-folder guidance. Added retry/fix actions, cleared stale check errors after recovery, and restored a planning selection when switching back to ZIP export.

- Direct scene export now registers its Wonderblocks layer automatically in the existing world .ldx and PC world .req. It chooses a free layer ID, reuses prior registrations, loads shared scenery through Common, remaps object sequences, and uses the target world's layer filename even with AI generation off. Updated WorldEdit instructions; browser and native compiler/package checks cover the workflow.

- Added direct SWBF2 export to an existing world source folder. The same folder supplies planning for merges; assets/options go to msh and odf, placements and merged navigation to world1. Replaced files are backed up, canceled/failed writes roll back, and planning is reread before each export and checked for concurrent edits. Existing world/terrain/layer declarations remain untouched.

- Keep large SWBF2 exports responsive. Reuse live scene geometry for the export preview, run collision recommendations and the full package pipeline in background workers, show preparation progress, and stop work immediately when closing the exporter. Added a full Yavin Rainwell export/cancellation regression and browser byte-parity checks.

- Added optional export-time merging under Generate AI planning and barriers. Choose the existing world folder and filenames; downloads preserve authored planning, replace this scene's prior generated entries, update matching requests and include merged companions plus an import layer. Original files stay untouched and merged downloads need no script or replacement world scaffold.

- Anchor group scaling at the bottom center of the selection, keeping its base elevation fixed when enlarging or shrinking with either the scale handle or numeric multiplier.

- Added a recommended Prop / Building class label to standalone MSH + ODF exports, with a manual override. Scene packages classify automatically using a 2 m largest-dimension cutoff; Flora-only assets remain props and native foliage remains leafpatch. Collision helpers inherit their owner's label. This changes organization, not geometry or engine behavior.

- Removed the validation script and post-download validation instructions from every export package. Native compiler checks remain in development tests and do not run during normal exports.

- Made Unique mesh / ODF names optional and off by default. Object exports use the export name for mesh, ODF and matching mesh-option paths so repeat exports replace the same files. Helpers use numbered names; scene-name duplicates are disambiguated within the package. Texture sharing and matching texture-option names are retained.

- Added descriptive export texture filenames using stable library surface names, tint families and a short content checksum. Shared images retain one name across object exports, material aliases and native foliage conversions; solid colors and invisible helper textures also have readable names.

- Unified exported texture names across ordinary materials, foliage atlases and invisible support meshes. Separate object exports reuse the same texture filename for identical baked image data; leaf anchors and collision carriers also share one transparent texture. Added cross-export sharing checks.

- Added ten light neutral variants of imported masonry, brick, plaster, paving, carved stone, panels, louvers, tiles, wood and bark. White / tintable groups them for recoloring; related setting categories also include them. Pointwise luminance conversion preserves the source tile layout, grooves and grain.

- Refined collision-helper recommendations against 23 compiled stock models. Separated hard format requirements, crowded infantry samples and vehicle-only test advisories; removed oversized cubes and the 64-triangle preparation margin from the recommendation. Acorn Tower now recommends embedded collision. Added profile details, stock numeric regression data and a repeatable native-model review tool.

- Added Separate collision helpers to the SWBF2 exporter, with an automatic recommendation based on collision density, profiles and native limits. Helpers can be disabled to keep compatible collision in the main MSH; dense overrides retain the geometry and show a warning. Incompatible collision profiles require helpers. Verified browser downloads and compiled helper, embedded-tree and primitive-overflow samples with the Mod Tools.

- Moved Object group tools directly below the scene object list.

- Enabled proportional scaling for object groups and multi-selections. The center scale handle grows all members and their spacing around the selection center; a Scale group by field supports precise multipliers. Shared limits prevent thin members from flattening, and rotated/reflected parts, save, undo and redo remain intact.
- Added an independent Floor on/off toggle beside Grid on/off. It hides only the editor ground plane and does not alter project geometry.

- Restyled Wonderblocks as a compact graphite workbench with amber tool states, a smaller title bar, docked viewport controls, flatter libraries and consistent fields across object, material, flora, route and room editing. Added a shared design guide and browser layout checks for desktop, compact and narrow widths.
- Replaced texture theme dropdowns with preview cards for settings such as Urban, Tatooine, Rhen Var, Yavin, Hoth, Flora and Industrial. Shared browsing includes category navigation, cross-category search and selected texture highlighting in Material mode and the surface inspector.
- Added four tiling Kashyyyk bark finishes and eight KOTOR metal, stone, wood, floor and sand textures. All twelve appear under KOTOR; the bark finishes also appear under Flora. Read-only import records the original high-quality ERF resource hashes.
- Added eight repeating bark, root and moss finishes from Endor, Naboo, Dagobah and Jedi Academy's Yavin. The Flora material theme groups them with the existing bark finishes for painting created trunks and branches.
- Added 20 tiling wall, floor, rock, snow, plaster and metal textures from the SWBF1/SWBF2 Mod Tools and Jedi Academy, grouped by source game. Includes source records and a repeated-tile review sheet.
- Moved Move with mouse from the Flora sidebar to the overhead Move, Rotate and Scale controls.

- Promoted the six reviewed temp bases into Bases alongside Crown Base and Basic Trunk. Removed the temp tab and other bases from the selector.
- Removed Split Trunk, Smooth Trunk and Knotted Trunk, including their source meshes and thumbnails.
- Finishing tree edits with Done returns to Flora browsing and keeps the Flora tools active. Removed Leafy Fork from Branches, including its mesh, skeleton, built-in foliage assembly and thumbnail.
- Added Basic Trunk to Bases: a straight, gently tapered primitive with three editable joints, using the same attachment workflow as Basic Branch.
- Added six independently authored trunk/root bases in a new temp review category: Rooted Stem, Forked Trunk, Crooked Trunk, Bulbous Trunk, Buttress Base and Stilt Base. Each has editable structural joints; the buttress has broad root fins and the stilt base has open curved root arches. The existing 25 base choices remain available pending selection. Includes baked thumbnails and multiview inspection.
- Added Palm Tree to Tree presets, assembled from the existing editable trunk and palm frond parts. Includes a curved trunk, drooping outer crown, upright new fronds and a baked thumbnail.
- Replaced the five on-bark branches and fifteen modeled leaf parts with the approved independently authored geometry and textures, using their familiar names and catalogue IDs. Removed the twenty former reference meshes, fifteen retired leaf texture records, duplicate review parts and empty temp section. Refreshed canonical thumbnails and excluded approved parts from reference regeneration. The standalone Flora review viewer shows the current parts with orbit, clay, wireframe and shape controls. Bark rendering uses shape UVs after edits so grain follows changed branch length and bend.

- New plants now start with SWBF2 surface detail, matching tree presets. Saved plants retain their chosen detail setting.

- Preserve small branches when switching authored plant bodies to SWBF2 detail. Sample around each limb at full field detail before reducing faces; keep the existing reinforced budgets for imported tree meshes. Added coverage for all 30 branching bodies and worker/finished mesh parity.

- Moved Coral Leaf into Coral with a red textured finish and matching thumbnail. Removed Oak Leaf, Oval Leaf, Curled Leaf and Lance Leaf, including their unused meshes, textures and icons.

- Removed the standalone Steps and Castle stone stairs pieces; stairs remain available through Route. Added a vermilion torii gate to Medieval Japan with leaning round posts, a swept black cap and an open passage.

- Hide the Object, Material and Flora mode choices while editing rooms; keep floor selection and settings available, and restore scene mode choices on exit.

- Deleted remaining retired scene generators and standalone previews, including the embedded Suncrest starter. Fresh sessions start with an empty project. The 15-entry catalogue now exactly matches both the generator directory and saved projects. Reduced shared geometry/connection setups to test-only fixtures, and kept only the castle keep used by Castle Compound.

- Stabilized scale dragging at distant zoom levels. Uniform and planar scaling preserve proportions through relative snapping and shared limits, the center handle has a clearer target, and Shift provides fine control. Collision rebuilding waits until a transform finishes.
- Curated Load examples and the bundled project folder to the same 15 scenes. Kept all four gameplay maps, two building kits, Wroshyr/SWBF2 flora, Aurelia/Meridian and five architectural representatives. Removed unwanted scene builders, snapshots and previews, including Nine Skies and Sky Temples; retained the underlying part libraries and direct asset tests.
- Removed three obsolete Wroshyr revision builders and the superseded Sky Palace example. Wroshyr checks now use the current saved scene. Removed import-time Japanese finish restoration, the old unscaled castle-generation option and implicit window sill defaults.
- Removed the Openings palette category and its eight standalone decorative parts, including their geometry and placement defaults. Updated the affected example generators and saved scenes.
- Moved Load examples from the inspector to a grouped dropdown between Open and Save project in the top bar. The menu closes on selection, Escape or leaving it, and scrolls on smaller screens.
- Completed the Mos Eisley roof vent's hood surrounds and shaft ends while preserving its inset grilles. Rebuilt the Levantine vine passage with Mos Eisley room styles and collection parts; kept the pergola and sixteen editable vines, with walking access to all eight houses.
- Limited block base slope controls to the Mos Eisley building preset; ordinary blocks no longer show them. Shape reset preserves the preset's available controls.
- Added scene-loading progress with percentage and object counts for startup, saved projects, examples and the Rainwell preview. Scene construction yields between batches, keeps the current scene until the new one is ready, and handles failed loads and retry.
- Added Yavin · Temple of the Rainwell: an editable jungle temple scene with a broad bridge, high aqueduct loop, creek flank, ruined galleries and an explorable sanctuary. Includes a saved project, example-menu entry and six-view preview.
- Restored the aqueduct’s substantial underside body at constant depth. Only the repeated end deepening is removed.
- Fixed aqueduct masonry mapping along ramp grades and across flat/ramp joints. Floating spans now have a uniform underside, without repeated section-end flares or an underside-depth setting.
- Changed aqueduct defaults to matching open/covered spans, with optional section-specific fill to world ground instead of fixed-depth piers. Ground support follows route height and turns. Corrected masonry UVs over filled supports and curved/turned sections.
- Corrected the Yavin aqueduct to use the stock open trough spans and enclosed, tapered passages on tall piers. Both section types can be mixed and extended in one route. Corrected the broad bridge supports to continuous transverse slabs with flared caps and feet.
- Added the complete Large Yavin bridge route, with tapered side blocks, carved cap beams and independent bridge/block/trim texture controls. Carved cap UVs continue around corners. Material workspace controls now refresh immediately after painting.

- Fixed Yavin ruined-wall turns skewing the broken courses across the entire straight section.

- Added the Yavin blocking kit, informed by the BF2 Temple and original BF1 Arena: adjustable gallery bays, an editable stair approach group, splayed passage routes, a tall aqueduct with open spans and enclosed pier passages, a stepped wall with trapezoidal openings, and a solid ruined wall with broken courses. Includes a saved workshop and player-height/clay preview.
- Completed the backs, undersides and inner reveals of both Mos Eisley recessed entry sizes, including their doorless variants.
- Added the Levantine vine passage: a stone lane under a continuous leafy timber pergola, with editable vines, courtyard houses and a saved project plus three-view preview.
- Removed the Root Block flora part, its geometry and thumbnail.

- Added Cinderlock · Foundry Crossfire: a gameplay-first infantry map with three terrain terraces, protected three-exit workshops, nine editable interiors, low control booths and separate stair/ramp footprints. Includes a blockout toggle, cutaway and six-view presentation.

- Added Asterfall · City of the Tide Engine: an editable cliffside city with a monumental wheel, harbor, gardens, market, archive, aqueduct and two connected district loops. Includes a saved project and six-view presentation.

- Fixed scene shortcuts acting behind export dialogs and verified cancellation followed by a fresh export.
- Restored idle viewport rendering and cached shadows after graphics-context recovery.
- Retained prepared collision when recoloring route/platform components or changing foliage alone; actual shape edits still refresh collision.
- Loaded SWBF2 planning before its world, including existing request files updated by the navigation merge helper.
- Restored closed shadows for timber/thatched Kashyyyk platforms and thin swept spires. Doorway cuts invalidate affected construction/shadow hints.
- Removed obsolete project/library import size limits so formatted backups can reopen; object counts and browser storage limits remain enforced.
- Added Summer, Fall and Winter aspen tree presets.
- Added a Classical category with 12 original temple parts, including three column styles, a stepped platform, beams, frieze, cornice, pediment, pitched roof, open doorway, and palmette ornament.
- Added an editable Sunstone Temple example and project file.
- Expanded geometry/deformation checks to all 52 parts and added temple object group tests.

## 1.0.0 — 2026-09-27

Initial versioned release of Wonderblocks.

- 40 original procedural building parts, searchable categories, and 3D thumbnails.
- Placement previews, repeated and mirrored placement, and wall alignment for details.
- Move, rotate, scale, snap, taper, bulge, and twist controls.
- Per-part colors, undo/redo, JSON project saving/loading, and browser autosave.
- OBJ geometry export with mirrored triangle winding handled correctly.
- Observatory and sky-palace examples, bundled offline dependencies, and Windows launchers.
- MIT-licensed project source and ten automated tests.

This release does not include compatibility with legacy creation files or Battlefront II-specific collision/export integration.

- Combined temple roof and both pediments into one editable part; retained legacy component loading for older projects.


- Simplified the combined temple roof to a lower-pitched shell with flush pediments; added a continuous cornice frame and removed overlapping corner object groups from the example.


- Added three separate smooth-shaft Classical columns while retaining all fluted variants.


- Added Duplicate to the top toolbar for easier access; Ctrl+D and the inspector button remain available.


- Added Half temple roof alongside the full roof, with matching pitch, depth, and half-pediments.


- Added Aurelia, a 123-piece layered fantasy temple project and example loader using existing parts.


- Added eight offline procedural surface finishes plus Plain, thumbnail selection, tinting, adjustable repeats, and project persistence with undo/redo.

