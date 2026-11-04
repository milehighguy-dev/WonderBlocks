# Exporting a scene to Battlefront II (2005)

Click **Export SWBF2** in the top bar, choose the export options, then **Download SWBF2 package**. Extract the ZIP before using its files. The exporter takes a copy of your scene and preserves its geometry, selection and undo steps. Export preferences are remembered with the project. Finish a route, platform, or interior edit before exporting; an active Flora draft is included.

If the export button is disabled, the message immediately above it explains why. Preparation and collision checks finish automatically; missing settings and failed checks offer an action such as **Choose world folder…** or **Retry check**. Enabling planning merge requires selecting the existing world folder; turn the merge option off when downloading a separate scene package without an existing world.

The download contains source assets for the PC Mod Tools. It does not start the game or install a map.

## Export directly to a world folder

Set **Export to → World folder**, then **Choose world folder…** and select the folder containing `msh`, `odf` and `world1`, for example `C:\SWBF2_ModTools\BF2_ModTools\data_WON\Worlds\WON`. The local Windows app opens a folder chooser and remembers that destination for the project or asset. The selected path is registered locally; other websites cannot use the folder API. Where the local folder service is unavailable, Chrome or Edge can use its own permission-based folder chooser. If you already selected this world root for planning, the same folder is reused. Selecting `world1` alone is sufficient for ZIP planning merges; direct export needs its parent world folder.

Meshes, textures and their option files go in `msh`; object definitions go in `odf`. For scene exports, **Target world** selects an existing `.wld` / `.ldx` pair. Each scene receives its own descriptively named layer, `WORLD_wb_<scene>_<identity>.lyr`. The exporter registers it in the existing `.ldx` and adds it to the PC world `.req` for the game build. It uses a free layer ID, reuses that scene’s prior registration and places it under **Common** so the scenery is shared by the game modes. Object sequence numbers avoid the existing world and other layers. **Reopen the world in WorldEdit** after exporting; no layer import is needed. Direct export preserves the base `.wld`, terrain, lighting, missions and unrelated authored layer entries. It does not munge the map or launch the game.

Export names, options and destinations are saved with the Wonderblocks project, separately for the whole scene and each object or group. A renamed project keeps its export identity; object and scene profiles do not replace each other’s choices. Automatic collision-helper and class-label recommendations are recalculated unless you explicitly override them. Save the project to carry its choices to another session; moving it to another computer requires choosing the destination folder there.

For scene exports, **Scene export** offers placements and assets, or assets only. Direct exports label these choices:

- **Replace scene placements** updates only this scene’s registered layer. Other Wonderblocks scenes and authored layers stay separate.
- **Update assets only** writes mesh, texture and ODF updates while leaving all WorldEdit placements, layer registration and planning untouched. Export placements once before using it. If resource names or the required object resources change, the exporter asks you to replace scene placements instead.

ZIP scene exports can also include assets only, with no world, layer or planning files. Scene layers in ZIP packages have the same unique naming as direct exports; assign an unused layer ID when importing into an existing world.

Single-object exports always update resources without touching scene layers. If changed MSH or ODF filenames belong to another asset or are not yet owned by this export, saving stops before writing. Choose another name, enable **Unique names**, or explicitly check **Replace these existing assets**. Identical shared files and ordinary updates of this export need no confirmation. Superseded helper and foliage resources are archived only when no remaining world or ODF references need them. A compact completion summary shows updated, unchanged and retired files, with expandable notes and **Open output folder** for direct exports.

An existing unnamed Wonderblocks layer is adopted only when its saved source objects match this project. New scenes get separate identities. Keep user-authored layers separate from generated layers if their placements should survive **Replace scene placements**.

With AI generation off, **Generated planning cleanup** defaults to **Keep existing planning**. The optional remove choice deletes only this scene’s previously generated records. It preserves authored records and refuses cleanup if WorldEdit connections still reference the generated hubs or connections. Asset-only updates never change planning.

WorldEdit uses the `.ldx` to discover layer files and their game-mode membership, just as WorldEdit does. The `.req` update is separately needed to include the layer in the compiled game bundle. Existing layer-index and request files receive the same backups and rollback protection as meshes and planning. If these files or the existing objects used for sequence allocation change during saving, the export stops rather than overwrite the edits.

The world folder also supplies the **Keep world filenames** choices. With AI generation enabled, direct scene export requires **Merge with existing world planning**; choosing a world with planning enables it automatically. The exporter rereads the selected `.pln`, `.bar` and matching `.req` files each time, merges the latest authored data and writes the merged files into `world1`. If those files change again during preparation, saving stops and asks you to export again. Turn AI generation off to save assets without touching planning.

Re-export with the same names to replace matching files. Originals are copied into `_wonderblocks/backups/<export-time>/` with their folder structure and a `.wbbackup` suffix. Remove that suffix when manually restoring a file. This prevents recursive Mod Tools scans from compiling backups. Older raw backups are converted automatically. Canceled or failed writes restore changed files after all in-flight writes finish. Recovery first compares the current contents: newer outside edits are preserved and named in the error message, with originals still available in the backup. Planning and registration are checked again after the final write. Obsolete managed mesh/ODF sources from this same export are archived unless another export or authored source references them. Textures and unrelated assets are retained. Editable snapshots and reports remain under `_wonderblocks/exports/<export-identity>/`.

Direct export generates files without constructing a ZIP. Independent comparisons, backups and asset writes run in batches of up to six operations, sharing directory handles. Placement, planning and registration updates remain ordered and retain their concurrent-edit checks. A failed or canceled batch finishes its in-flight operations before restoring originals. Completed backup folders have a small format marker so later exports can skip their deep scans; previously unmarked backups are checked once.

A local Chrome private-filesystem comparison with all 1,079 Rainwell files reduced the writing stage from 2.16 to 0.67 seconds for a first export, 2.91 to 0.93 seconds for an update, and 1.19 to 0.33 seconds for an unchanged repeat. These timings exclude common geometry/texture generation and will vary with the destination disk and browser.

Texture filenames are shared across exports by baked image content. Different object names, object identities, dimensions and ordinary tiling repeats do not produce separate copies of the same image. Copy exports into the same Mod Tools `msh/` folder using their original filenames; both meshes then reference the same texture file. Each ZIP remains self-contained, so it includes shared textures needed when used by itself. Changed baked tint, alpha or image dimensions can legitimately require a different texture. Ordinary materials, native foliage atlas images and invisible support textures use the same content-based naming convention. Invisible leaf anchors and collision carriers share one transparent texture with compatible compiler options.

Names now include a readable surface description and, when applicable, a tint family: for example `wb_white_brickwork_blue_1234abcd.tga`. A short baked-image checksum distinguishes variants. Library image fingerprints supply a stable description even when an identical image is used under a different object or material label. Solid colors and invisible images receive content-derived descriptions. Native foliage atlas conversion retains the source description. Names use lowercase ASCII, remain within 54 characters including `.tga`, and never include scene object names. `tools/build-texture-name-catalog.mjs` regenerates the small fingerprint/name index when library textures change; the index contains no image pixels.

Extract each download into a fresh folder so obsolete models, textures and companions from earlier exports do not get mixed into the current package. Development validation rejects stale sources in test fixtures. Extra `.msh.option` settings for current models remain allowed.

While the export dialog is open, scene editing shortcuts are paused. Closing the dialog cancels its current export; reopen it to start another download.

Large scenes reuse the visible scene geometry for the preview. Collision recommendations, geometry preparation, texture baking, distant models, shadows, navigation and ZIP packing run in background workers so the interface and Close button remain responsive. The progress indicator includes object and texture preparation. This preserves the export settings and geometry quality; a large download still takes time to build.

**Unique mesh / ODF names** is off by default. A standalone export named **Acorn Tower** produces `acorn_tower.msh`, `acorn_tower.odf` and `acorn_tower.msh.option`. Re-export with the same export name and overwrite the matching files when copying them into the Mod Tools project; changing geometry or recreating the object does not change these paths. Collision helpers use numbered names such as `acorn_tower_collision_1`. Their mesh, ODF and mesh-option filenames match. Scene exports use readable scene/object/component names and numeric suffixes to disambiguate repeated names within one package. Native leaf ODFs use their owner name plus a leaf number.

Enable the option to add stable object-identity suffixes when keeping similarly named exports separate. Texture names and their `.tga.option` companions remain shared by baked image content in either mode. All option filenames always match their owning mesh or texture; there is no separate random ID for an option file. This controls filenames inside the download, not the browser's handling of an existing ZIP in Downloads. Copying a new export over an old one updates matching files but does not automatically delete obsolete helpers or textures.

## Selected objects and standalone assets

**Duplicate** (including Ctrl+D) creates a shared copy automatically. The object list marks the duplicated object **COPY**; duplicated groups also carry the badge while all their members remain copies. Moving, rotating or renaming preserves sharing. Changing shape, scale or materials makes only the edited copy unique and removes its badge. Copy status, families and resource names survive save/load, undo/redo and deletion of the original placement. Geometry, materials and prepared collision must match; contextual cuts or world-dependent route geometry can require distinct resources.

Scene exports keep each Flora plant independent, including plants from older projects grouped as a forest. Matching trees reuse one mesh and main ODF, with separate placements. Native leafpatch and collision dependencies are shared with the plant resource. Rainwell now authors plants individually and identifies repeated trees as instance families. Standalone MSH exports still combine the requested selection explicitly.

Select the objects or object group, click **Export SWBF2** in the top bar, then choose **Selected objects / group** under **Export scope**. Expanding an object group in the Scene list lets you select and export a single member.

The preview highlights the included geometry in yellow; faded objects show the rest of the scene for context. **Frame export** fits the included objects, **Frame scene** shows their surroundings, and **Show rest of scene** hides or reveals the context. Orbit and zoom in this preview independently of the main viewport. The count beneath it identifies how much of the scene is included.

Choose an export format:

- **Scene package** retains placements, route splitting and the optional AI navigation files for the chosen scope.
- **Single asset — MSH + ODF** combines all included geometry into one main MSH and one placeable ODF. Its origin is the bottom center of the exported geometry. Collision resources requiring separate native masks or contact partitions remain separate helper files attached by the main ODF; keep those dependencies together.
- **Single asset — MSH only** contains one combined MSH without ODFs. Textures and compiler options still accompany it in the ZIP. Collision can stay in the MSH when **Separate collision helpers** is off and its profiles are compatible. If helpers are required, choose MSH + ODF or uncheck **Include collision**.

**Class label** appears for Single asset — MSH + ODF. It starts with the recommendation: `prop` when the largest exported dimension is at most 2 metres, `building` for larger assets. Trees and other Flora-only assets default to `prop` regardless of size. You can select either label; attached collision helpers follow the main object's label. Scene packages calculate the recommendation for each exported object/group or route section automatically and have no class selector. MSH-only downloads have no ODF class to choose. The export report records the chosen label and recommendation; native foliage attachments retain `leafpatch`.

These labels organize scenery. In the inspected Mod Tools executable, `prop` and `building` both register `EntityPropClass` and share its rendering, LOD and collision paths. Choosing one does not enable destruction or alter distance fading.

**Separate collision helpers** controls whether extra collision meshes and ODFs are emitted. The exporter checks the current scope and format, shows its recommendation beside the switch, and starts with that setting. You can override it. The check uses prepared collision faces, sampled local contact density, collision masks, and native model limits; object size alone does not trigger it. It does not rebuild render geometry or textures to make this recommendation.

Off combines compatible collision inside each main MSH, retaining the prepared faces and masks. Boxes beyond the per-model primitive limit become exact twelve-triangle box surfaces. Separate mesh collision masks, or too many non-box analytic shapes for one model, require helpers; incompatible exports are blocked rather than changing their collision.

The recommendation distinguishes three cases:

- **Required: On** means collision masks or analytic primitive limits cannot be preserved in one main model.
- **Recommended: On** means infantry-sized samples exceed the native candidate-storage estimate and existing partitions can reduce it. This is a conservative recommendation, not a proven runtime failure. Off remains available.
- **Recommended: Off** keeps compatible collision embedded. Vehicle-only density flags produce an in-game-test advisory, not an automatic recommendation to add helpers. The same kind of flag occurs on the stock Mygeeto central building.

**Collision check details** shows infantry and vehicle candidate counts separately. Preflight measures source triangles using a soldier box with half sizes 0.35 × 1.1 × 0.35 m and vehicle boxes 2 × 2 × 4 m and 4 × 2 × 2 m. It respects each mesh's category mask. The inspected PC contact container accepts at most 100 polygons and strictly fewer than 300 polygon vertices; the object's 64-triangle partition target is a separate safety margin. Large 6 m cubes and total object size do not decide the recommendation. Queries are sampled broad-phase estimates: terrain, reachable poses, moving contacts, analytic blockers and compiler polygon merging are not simulated. Counts therefore do not certify collision or performance in game.

Calibration used 23 stock Mod Tools models across Mygeeto, Naboo, Yavin, Tatooine and Coruscant, compiled with their original options. Twenty-one contain physical collision; two Naboo palace pieces explicitly use `-nocollision`. All sampled stock infantry profiles remained below native candidate capacity; Mygeeto's central building produced vehicle-only flags. Numeric metadata and compiled hashes are retained in `tests/fixtures/stock-collision-review.json`; no stock geometry or textures are included. `tools/review-native-collision.mjs` can repeat the mask-aware review on compiled models. The Acorn Tower regression now recommends Off, retains all collision faces in one main MSH, and reports vehicle uncertainty separately. The export report records recommendation rule version 2, profile counts, reasons and affected assets.

Standalone foliage is baked into deterministic, varied textured cards, preserving its atlas, distribution, dimensions and colour. It does not need attached leaf-patch ODFs and does not face the camera at runtime. Leaf cards stay intact in distant models. Scene packages retain the game's native camera-facing foliage. Standalone assets contain no world files or AI navigation. Every download retains the editable scoped snapshot and an export report.

Selection and export do not change the source scene. Yellow selection overlays are temporary editor feedback and are excluded from exported geometry, collision and triangle counts. When a selected route references an object outside the export scope, that external connection is detached in the copied export snapshot.

## What is in the package

| Folder or file | Purpose |
| --- | --- |
| `msh/*.msh` | Static geometry, material groups, hardpoints, collision, distant models, and closed shadow volumes |
| `msh/*.tga` | Local diffuse textures, with tint baked into the image and alpha where needed |
| `msh/*.msh.option` | One per mesh; collision and vertex-lighting flags where needed, otherwise a blank file using native defaults |
| `msh/*.tga.option` | One per texture; native compressed format, with uncompressed single-mip overrides for tiny or invisible helper textures |
| `odf/*.odf` | Prop and native leaf-patch definitions |
| `world1/*_wonderblocks.lyr` | Placements for importing into an existing world |
| `world1/*.wld` and `*.ldx` | An alternative placement-only world scaffold |
| `world1/*.pln` and `*.bar` | Automatically estimated infantry planning and AI barriers |
| `world1/*.req` | New-world bundle request including the world and its planning graph |
| `source/ai-navigation.json` | Navigation coordinates, object provenance, connected groups, and coverage notes |
| `ai-navigation-preview.html` | Offline, read-only planning and barrier preview with height and group filters |
| `merge-ai-navigation.ps1` | Merge generated navigation into an existing world's companion files, with backups |
| `source/*.building.json` | The editable Wonderblocks scene snapshot |
| `export-report.json` | Asset counts, collision categories, route sections, bounds, notes, and a complete file inventory |

Coordinates use metres and Y up. Object scale, reflected geometry, and relative transforms are baked into local mesh geometry. Placements retain their position and rotation. The exporter accounts for SWBF2's different model and world axis conventions so independently placed objects remain aligned after compilation. With Unique mesh / ODF names off, readable names use numeric suffixes for repeated labels within the package; enabling it adds stable object-identity suffixes.

Object groups become logical objects, with separate meshes for **exterior**, **interior**, and **details**. Independent parts remain independent objects. Routes, internal stair routes, and individual highway paths are split after six original sections by default; the setting accepts 1–24. Splitting retains section boundaries, textures, and original placement. A section itself is not subdivided merely because it is long.

## Add the export to a map

1. Copy the contents of `msh/` and `odf/` into the corresponding folders of your Mod Tools world.
2. Import the supplied `*_wonderblocks.lyr` in WorldEdit. Alternatively, rename it to `YOURWORLD_wonderblocks.lyr` and declare it in your existing `YOURWORLD.ldx`.
3. Choose an unused layer ID. The exported layer uses `Layer(1)` on its objects. If ID 1 is occupied, change those placements to your chosen ID, declare `Layer("wonderblocks",ID,0)` in the layer index, and add ID to the appropriate `GameMode` block.
4. Use your normal world munge process.

Use either the `.lyr` placements **or** the `.wld` scaffold. Loading both places every object twice. The supplied `.ldx` enables only the new `.wld` base layer and is not a replacement for an existing map's layer index.

The `.wld` includes object placements and extents. Terrain, lighting, sky, mission scripts, terrain paths, regions, hints, game modes, portals, and visibility volumes are not generated. Keep those from your existing world, or author them in the Mod Tools. Source compilation does not establish that AI can navigate the scene.

## Optional collision

**Include collision** is enabled by default. Uncheck it to omit all physical collision primitives, meshes and helper objects. Every exported model then uses `-nocollision` to prevent the Mod Tools from generating collision from visible geometry. Render meshes, distant models, leaf patches and shadows still export normally. The scene's collision and walk view remain unchanged.

AI planning and barriers are a separate option. If enabled, they still use the scene's prepared collision to estimate navigation, even when physical collision is excluded from the download.

## Automatic AI planning and barriers

**Generate AI planning and barriers** is enabled by default. Uncheck it to skip navigation generation and omit the `.pln`, `.bar`, navigation report, preview, merge helper and planning bundle request. Meshes and scene placements are still exported; physical collision follows the separate **Include collision** checkbox. This choice applies to the downloaded package; it does not remove navigation already installed in an existing map. The exporter creates `.pln` planning hubs and connections, plus `.bar` AI steering rectangles, from the scene. No navigation is authored into individual example projects. Navigation generation consumes the prepared object collision; it neither creates nor changes collision.

For an existing map, enable **Merge with existing world planning** beneath that option. Click **Choose world folder…**, select the folder containing the current `.pln` and `.bar` files, and choose the target under **Keep world filenames** if more than one world is present. Matching `.req` files are read too. The browser reads source files locally; it does not upload them or change the selected folder.

The ZIP contains already-merged planning and barriers using the selected existing filenames, plus updated matching requests and an import layer named `WORLD_wonderblocks.lyr`. Copy those companions into the existing project, import the layer at its original coordinates and re-munge normally. A merged download omits the replacement `.wld` / `.ldx` scaffold and the manual merge script. Existing record names and branch weights are retained; the prior generated entries for this same export name are replaced on repeat exports. Keep the same export name when updating a scene. Existing and generated graphs are not automatically connected: join them in WorldEdit where needed. Native graph limits, missing references and malformed sources block the download with an explanation. `source/ai-merge-report.json` records omitted generated barriers and conflicts; the navigation preview includes both graphs. If no matching `.req` was selected, the export notes identify the planning request needed in the original project. Disabling AI generation also disables merging without forgetting the selected folder during the current session.

Leaving **Merge with existing world planning** off retains the standalone scaffold and optional PowerShell helper described below.

Routes receive planning along their walking surfaces, including curved stairs, their ramp collision, turns, and branch junctions. Lateral samples let a route pass beside an embedded tree or other obstacle. Platforms and interior floors receive additional hubs, with samples through actual door openings. Nearby block surfaces can join the graph; foliage, roofs, and distant ground decorations do not consume the route budget. Connections require support for an infantry footprint, headroom, and an acceptable rise. Only small construction seams up to 0.25 metres can be bridged by footprint support on both sides. Nearby floors at different heights are not joined just because their footprints touch. Hub radii leave room for the entire infantry footprint at walls and drop-offs, including random targets near their perimeter. Small standalone floors receive a short verified connection because native hub flags come from incident connections.

Straight route chains are simplified even when the scene is below the native hub limit. Overlapping collinear shortcut links are removed first; intermediate route hubs are removed only when the replacement retains the same corridor width profile and passes the full floor/body-clearance check. Turns, junctions, doors, physical width transitions, source seams and changes of grade remain. Wider routes can retain extra hubs near their ends because their fitted clearance narrows there. The report records `compactedRouteSamples` and `removedRedundantConnections`.

Containment checks use prepared solids without changing them. Spatial collision partitions are rejoined only for a read-only solid query; their original small collision bodies remain intact. Open bark requires agreeing signed crossings, with the existing room and hallway cut volumes excluded. These exclusions read the same saved shape rules that created the passage, rather than cutting or repairing collision during export.

Native connections interpolate their endpoint radii into a walking corridor. The generator checks that corridor's lateral floor support and body clearance, reducing shared hub radii when a wider corridor could cut a curved corner, enter a wall, or cross an unsupported opening. The report records how many hubs needed this adjustment. Barrier checks protect the connection width as well as its centre line.

The current estimate reserves a 0.5-metre infantry radius and 1.8 metres of headroom, with extra room for the barrier footprint. Native AI radius varies by unit: `Navigator::GetMyRadius` (`005a4c20`) calls `AIUtil::GetCollisionRadius` (`0058f630`), which uses a class override or derives clearance from model bounds. The stock `rep_inf_ep3trooper.msh` bounds imply approximately 0.48 metres under the normal quarter-diagonal fallback; this informed the estimate's 0.5-metre profile. Different unit models and `AICollisionRadius` overrides can require different clearance. These are source and executable findings, not measurements from a running game.

Barriers follow exposed floor edges and nearby physical walls, including sloping sides, tree skins, and continuous railing guards. Whole-scene probes remove internal floor seams and preserve openings. Touching, nearly collinear rectangles can combine across source objects without spanning doorway gaps. Contained footprints are removed, and overlapping front/back wall estimates can become one exact rectangular union. Approximate combinations are capped at 0.44 metres wide; exact unions add no blocked footprint and can be wider. Every proposal is checked again against verified planning, including the full extent of long simplified arcs. Reports and preview tooltips retain all source objects, source kinds and height ranges. Native barriers have horizontal footprints; the generator omits any rectangle that would block a verified hub or connection at another height. Physical railing collision continues to prevent falls in those locations. The navigation report records omitted candidates and disconnected groups rather than inventing crossings through obstacles.

Infantry planning uses native **SOLDIER `1` and HOVER `2` flags**, combined as `3`. Stock jet troopers, many heroes, and some mobile creatures use HOVER; this is not a vehicle-only class. It does not infer clearance for SMALL, MEDIUM, HUGE or FLYER units, jump links, dynamic groups, command posts, or mission goals. The result is a conservative starting estimate and needs an AI playtest, especially for stacked surfaces and large open areas. Sampling adapts to the native limit of **255 hubs and 255 connections**, and the graph allows at most **eight connections per hub**. A short spanning forest preserves reachability before adding local loops. Generated names fit the native compiler's 15-character limit. Routes keep the same graph when their render export is split into different batches. The browser computes navigation in an export worker so its interface remains responsive and canceling an export terminates that work.

The native engine classifies node circles in X/Z without checking height. Where another physical walking surface overlaps the circle at a different elevation, the exporter uses a zero-radius point hub. Unplanned ground can trigger this protection without receiving planning samples. Native graph following then falls back to the nearest 3D arc, and native random waypoint selection clamps the point radius to zero. This avoids a cylinder on the upper floor capturing a unit on the lower floor. The report records those point hubs and their fitted physical clearance. Very constrained floors can also use point hubs. This behavior is confirmed in the labeled engine code and native source compilation; a gameplay test is still needed.

For the new `.wld` scaffold, keep its matching `.pln` and `.bar` beside it. `WorldMunge` reads the barrier companion; `PathPlanningMunge` produces the `.congraph`. For an existing map imported using the `.lyr`, run `./merge-ai-navigation.ps1 -WorldFile 'C:/path/to/YOURWORLD.wld'` from the extracted package. Layer import alone does not merge these companion files. The helper preserves existing navigation, replaces the previous export's generated entries for the same project name, and backs up the original companions. `-WhatIf` previews the operation. It refuses a merge that would leave missing hub references or exceed the combined native planning limits. The helper also adds the graph request to matching level `.req` files in the world folder; pass `-LevelReq` if the bundle request is elsewhere. The package includes a matching `.req` for the new scaffold. Then re-munge normally. Use distinct project names when adding multiple independent exports to one map.

The scaffold's bounds include each native barrier's horizontal bounding circle with a margin. The report and README also give `navigation.minimumWorldExtent`: use at least this value for the mission script's `SetWorldExtents`, retaining any larger value your existing map requires. Native `PathFinder::AddObstacle` (`005d7400`) warns that barriers outside that runtime extent cause incorrect pathing and collision. The exporter reports the requirement and does not rewrite mission scripts.

The helper protects existing planning corridors by omitting generated barriers that would obstruct their unit classes. It retains authored barriers and hub radii, reporting any conflicts with the new planning or floor overlaps in `YOURWORLD_wonderblocks-ai-PREFIX.json`. It validates `BranchWeight` references as well as connection endpoints. A line-commented graph request does not prevent the required live request from being inserted. Existing map geometry and terrain outside the exported scene remain unknown to the generator, so inspect merge warnings and re-munge before testing AI.

Planning requests must precede their world request in the PC bundle. The generated request follows this order. The merge helper moves an existing late PC graph request before the world, preserves console-only requests, and rejects malformed request scopes before writing anything. Packed-level validation checks the resulting order.

Native `PathPlanningMunge` and `WorldMunge` do not accept comments in `.pln` and `.bar` source. `LevelPack` rejects comments before or inside the `ucft` scope; trailing `//` comments after that scope are harmless and retained. The merge helper also rejects C-style `/* ... */` block comments. These checks run before changing any files, rather than accepting source that the native tools cannot compile.

Open `ai-navigation-preview.html` from the extracted package to inspect the estimate without loading a game or editing the project. It supports top, front and side views, height ranges, connected groups, and source-object labels. Barriers remain visible across height filters because their native footprints have no height limit; front and side views display their source height. The preview has no network or external-library dependencies.

The development validation utility compiles planning and checks native hub/connection counts, preserved names, coordinates and radii, connection endpoints and infantry flags, the world's barrier count, its runtime footprints and flags, and inclusion of the graph in the packed level, in addition to geometry and collision. Barrier checks account for the native world loader's translation-Z conversion. It does not run the game.

### AI validation, 14 October 2026

The final rule version is 5. The full regression suite passed **992 tests**. A further focused check covers native obstacle circles and mission extent reporting. Fresh native planning, world, and level-pack checks completed with zero errors and zero warnings for these automatically generated fixtures:

| Fixture | Hubs | Connections | AI barriers | Connected groups |
| --- | ---: | ---: | ---: | ---: |
| Small standalone floor | 2 | 1 | 4 | 1 |
| Gallery with doors and interior stairs | 29 | 49 | 41 | 1 |
| KOTOR Kashyyyk walkway/platform set | 23 | 39 | 125 | 2 |
| Highway intersection and separate overpass | 100 | 180 | 143 | 2 |
| Saved Wroshyr village | 251 | 255 | 1,508 | 1 |

Native binary comparisons retained names, positions, radii, connection endpoints, unit flags, and all generated barrier footprints. Each packed level included its planning graph. The largest Wroshyr barrier-corner difference was approximately 0.000015 metres from source rounding and native floats. Its graph has no isolated hubs or source-limit omissions; 84 point hubs protect stacked floors and 34 hub radii were tightened for corridor clearance. The generator preserved the saved project.

The Wroshyr density audit found at most 28 generated barrier bounding boxes overlapping a connection's padded horizontal query box, counting all heights. The engine's obstacle-list callback accepts at most 300 entries. Existing map obstacles and broadphase cell false positives are outside this source audit, so it is not an in-game performance measurement.

Browser checks passed responsive worker export, cancellation, immediate dialog reopening, restored controls, unchanged scene data, desktop/mobile preview rendering, height filters, and escaped source labels. Merge checks passed backups, repeatability, commented source handling, preservation of existing planning, suppression of conflicting generated barriers, and rejection of unsafe references or native-limit violations. A separate copied stock Kashyyyk graph merged and compiled with 61 hubs and 81 connections. These checks do not establish gameplay AI behavior; no game was launched or installed.

## Collision

The native loaders have separate fixed tables of **1,024 primitive resources and 1,024 mesh resources**, shared across all loaded assets. A full table can freeze its lookup loop before any world objects or AI barriers load. The exporter budgets 768 of each, reserving 256 for mission and side assets. Excess prepared boxes use exact mesh faces with the same transforms and masks, in batches of at most five boxes (60 triangles), without fitting or changing the object's collision. Native validation checks aggregate counts as well as each model's 64-body limit. Imported packages share these limits with an existing world's assets; their combined counts must also fit.

Collision is automatic when you create or edit an object. Walk view, **View → Collision outlines**, and export use the same prepared physical data. The normal export flow has no collision settings. See [Automatic collision](./automatic-collision.md) for the shape rules and engine investigation.

Rectangular blocks and closed interior construction pieces use oriented boxes. Nearly spherical small solids can use inscribed spheres; cylinder primitives are excluded. Doorways, windows and stairwell cuts retain their openings and real slab thickness. Exact primitives serve movement and projectiles together, without a redundant projectile mesh.

Stairs use a closed ramp for movement and the actual steps for projectiles. Curved and sloping routes follow their deck surfaces. Open railings have continuous movement guards along their semantic guarded edges, preserving entrances, unguarded sides and branch junctions; projectile collision keeps the actual rail gaps. Small irregular railing profiles can use conservative movement primitives with separate projectile surfaces.

Trees use a bark skin mesh shared by movement and projectiles. Internal bulk primitives are omitted. Mesh reduction prioritizes the shape's physical tolerance and topology over a nominal triangle target. Transparent leaves and native leaf patches have no collision. Editor cutaways do not remove physical walls or ceilings.

The object service checks local contact density as well as total triangles. Crowded regions can split into spatially coherent collision profiles before export; no caps or faces across holes are added. The exporter preserves their ownership, category masks and source-body identities. It splits native models to respect the engine's limit of **64 total collision bodies**, including meshes. One mesh leaves room for 63 primitives. Collision helpers have a fully cutout render carrier and bounds covering their physical bodies so they load correctly as placed world geometry.

Names use `p_-svbo-*` / `collision_-svbo-*` for shared solids, `-svb-` for movement-only guards and ramps, and `-o-` for projectile-only details. ModelMunge merges mesh collision inside one MSH, so different category profiles and separate crowded movement profiles are emitted as separate native assets automatically.

Trees, spatial partitions, concave coplanar faces, faces with holes and faces that could merge beyond the engine's 100-vertex polygon limit receive `-donotmergecollision`. Safe convex faces retain normal compiler optimization. The report records the physical categories, sampled surface error, protected faces and any contact partitions. Collision is derived from saved shape data when a project reloads; there is no manual scene-specific collision authoring step.

## Shadows, distant models, and leaves

Shadow volumes must have paired edges, consistent winding, and no loose edges. The exporter simplifies closed visible shells and checks the inset vertices against the original shell at the precision stored in the MSH. It rejects collapsed or inverted faces and checks topology again. Where material splits leave a shell open, it uses closed construction volumes or primitives. Unsafe volumes are omitted and listed in the report rather than closing a doorway or inventing a solid sheet across foliage.

The **simpler distant models** option targets approximately one third of the visible triangles. Original texture projections are transferred onto the reduced surface. Open boundaries and topology can prevent reaching that target; the report records the resulting count. These are `_lowrez` meshes, separate from collision and shadows.

Flora leaf patches use the game's native `leafpatch` class, attached to exported hardpoints. Leaf size, spread, height, density, tint, and atlas are carried into the ODF and texture. Single-image leaves are repeated into the native 2×2 atlas. Larger atlases use four tiles and produce a note. Runtime leaf placement is generated by the game and can differ from Wonderblocks. Mesh-based foliage remains a static alpha-textured mesh.

Textures are powers of two, capped at the selected size. Opaque textures use 24-bit TGA and textures with transparency use 32-bit TGA. Material tint is baked because the native compiler does not preserve the editor's diffuse color in the same way. Independently transformed color and cutout maps are baked together over the mesh's UV range; this preserves the mask on painted leaves. Clamped and mirrored regions outside the first texture tile are baked too, while ordinary repeating textures keep their tiling. A large UV range spreads the selected texture resolution over a larger area. Bump and normal maps are not exported as native bump-map materials; the report notes that limitation. Vertex colors are retained and their models enable vertex lighting.

## Development validation

Native compiler checks belong to the exporter’s development tests. They do not run during normal exports and no validation utility is included in downloaded packages.

The test runner stages the internal checker in fresh test fixtures. It verifies package inventories and ODF references, runs ModelMunge, TextureMunge, OdfMunge and WorldMunge, and checks compiler error counts and expected outputs. It inspects compiled collision masks, body limits, primitive dimensions, polygon buffers, shadow volumes, distant models and native texture formats. Scene fixtures also check planning graphs, barriers and packed-level ordering when included. These checks do not prove in-game movement or AI behavior.

Run `npm run test:native` when developing export changes. Test artifacts and compiler logs remain in the temporary fixture directory printed by the runner, outside the downloaded ZIP. The default compiler location is `C:/SWBF2_ModTools/BF2_ModTools/ToolsFL/bin`; set `SWBF2_TOOLS_PATH` if the tools are installed elsewhere. Tests do not install a map or launch the game.

The native compiler can issue a generic "NO COLLISION GEOMETRY" warning for a large decorative mesh even with `-nocollision`. The compiled collision check is the useful evidence in that case. Missing optional `.RGN`, `.BAR`, and `.HNT` files are expected for a placement-only scaffold.

## Validation run, 11 October 2026

The full regression suite passed 903 tests. Separate browser checks exercised downloads, cancellation, invalid settings, an unsaved Flora draft, empty scenes, and a small viewport without changing project data.

| Export fixture | Compiled models | Native compiler errors |
| --- | ---: | ---: |
| Complete building parts catalog | 217 | 0 |
| Connected gallery and interior stairs | 7 | 0 |
| Felucia plants | 13 | 0 |
| Highway network | 15 | 0 |
| Mature kapok tree | 5 | 0 |
| KOTOR Kashyyyk walkways and platforms | 15 | 0 |
| Leaf patches without a trunk | 2 | 0 |
| Wroshyr village scene | 46 | 0 |
| All 13 saved flora presets | 25 | 0 |
| Collision, shadow, and distant models disabled | 15 | 0 |
| All collision faces preserved; one section per mesh | 30 | 0 |
| Routes split after 24 sections; 1,024 texture limit | 11 | 0 |

The 401-model total includes six invisible leaf anchors. All packages passed ModelMunge, TextureMunge, OdfMunge, and WorldMunge. Wroshyr produced two generic decorative-mesh collision warnings; compiled checks confirmed those meshes remained free of collision.

An independent Blender MSH reader verified geometry, finite unit normals, UVs, local textures, primitive counts, distant models, and paired shadow edges. Background renders inspected the assembled tree scenes, gallery openings, and stair collision. Native collision vertices matched the source; primitive dimensions and rotations differed by less than one millionth from float rounding. All 24 compiled world/layer alternatives retained their 790 placements, including rotated objects. A separate 45,000-triangle indexed mesh also compiled successfully. A separate ray audit found no exposed collision-box corners across all saved flora presets and the Wroshyr scene.

Collision surface comparisons exposed incorrect native merging on the gallery roof and cornice frame. Automatic protection now retains their authored concavities and openings. Curved and very small faces can still differ under normal compiler optimization; the later automatic collision rules supersede the optional preservation setting described by this historical validation run. No game was launched, and gameplay, vehicle handling, AI navigation, and final map lighting remain to be checked in a playable map.

Compiled render buffers also retained the exported normals and texture coordinates, allowing equivalent whole-tile UV offsets. Four additional texture probes covered repeating, clamped, mirrored, and rotated cutout images; their compiled pixels matched the source exactly.

An independent shadow audit checked 16,013 vertices against 153 closed visible shells, including the kapok, all saved flora presets, and Wroshyr, with no exposed vertices. All source volumes had positive enclosed volume and no zero-area triangles. The compiled half-edge checks confirmed closed faces and reciprocal twins after the native compiler removed some coplanar diagonals.

The first playable Wroshyr test exposed an additional runtime requirement: a placed `building` asset needs a native `modl` record. Skeleton and collision records alone can compile successfully but fail to load as world geometry. Collision helpers now include a fully cutout two-triangle carrier spanning their collision bounds. Native comparisons verified that the original collision records remain byte-for-byte unchanged, and validation rejects any model without a `modl` record.

The 14 October AI-map load test exposed a renderer requirement that the legacy texture compiler does not validate. A 2×2 compressed helper texture compiled successfully but Direct3D 11 rejected its creation with `0x80070057`, matching the Shader Patch log. The helper now uses a fully transparent 16×16 A8R8G8B8 texture with one mip. Other exported images smaller than a compression block also request uncompressed output. Native validation rejects DXT base dimensions that are not multiples of four. A direct GPU check reproduced the old failure and successfully created all 27 corrected Wroshyr textures with their actual mip data, without starting the game. Only the helper texture record changed in the packed map; geometry, collision, navigation, mission and localization were unchanged. Runtime loading still needs a user retest.

The separate playable-map setup also needs spawn paths before its world in the level requirements. Empty config blocks must put their braces on separate lines: the legacy ConfigMunge parser misreads `Properties(0) { }`, omits its scope and produces a configuration that crashes the engine. The example build checks native path scope structure and load order after packing. The editable placement scaffold itself does not generate mission or spawn paths.

## Automatic tree export corrections, 12 October 2026

Opaque bark now exports as a single-sided opaque material. The editor uses double-sided bark, but ModelMunge turns that flag into native transparency as well as double-sided rendering. Exporting it unchanged allowed geometry behind the trunk to show through. Cutout foliage retains its own material flags.

The exporter derives soldier/vehicle surface collision from the bark geometry automatically. It omits internal tree primitives because the bark surface already encloses them; structural parts sharing the same object group retain their own primitives. A maximum accumulated plane-error tolerance of 0.05 metres restricts simplification, and `-donotmergecollision` preserves the generated faces. No collision meshes are manually authored for individual scenes. If preserving the surface requires more triangles than the requested target, the export report says so.

In the generated Wroshyr fixture, native bark material flags changed from `0x10005` to `1`. The automatically generated skin uses collision mask `7`. An independent audit of 24,776 bark vertices and face centres measured a maximum distance of 0.0255 metres to the compiled collision; native compilation did not move its surface. This large tree retains 10,474 collision triangles to meet the tolerance. The exporter regression suite passed 42 tests. In-game visuals and collision still need a retest.

## Automatic bridge export corrections

Joined deck sections retain separate closed shadow shells when their combined visible surface is nonmanifold. Stair flights use their generated closed ramp profile for the deck shadow; dense step tessellation can otherwise leave open edges. Each shell is inset before object group, and the native compiler's paired-edge checks still apply.

Walking collision for route and platform railings follows the guarded boundary spans automatically. Flat spans use box primitives; sloping or curved spans use closed surface collision. The spans preserve unguarded sides, route entrances and branch junction openings. These barriers use soldier/vehicle/building mask `7`; ordnance collision continues to use the actual rail geometry. Barrier primitives are excluded from shadow generation so gaps in the visible railing do not cast solid-panel shadows.

The rebuilt Wroshyr output passed 147 deck-coverage probes against compiled shadow volumes and 2,055 probes against compiled railing collision, with no misses. All 46 exporter regression tests passed. These are exporter changes; the example receives its meshes and placements directly from the generated package. No map collision is manually authored.

KOTOR deck material splits retain a shared closed construction shell, so top, fascia and underside contribute one deck shadow alongside the rails. Curved stairs reuse their single prepared movement ramp; painting the top and underside does not duplicate that ramp. Undersides use horizontal texture projection at two metres per repeat, while vertical fascia retains its separate projection. Every visible asset receives a distant model when low detail is enabled, including already minimal meshes that cannot be reduced further. Reduced meshes interpolate the source shading normals.

Tree welding uses a finer bounded grid for imported surfaces and projects thin-limb sampling reinforcement back onto the authored wood. This keeps thin tips represented without exporting the grid's inflated, scalloped sampling envelope. Object collision is prepared from the resulting tree skin as usual; the exporter does not author a separate tree collider.

Timber and thatched Kashyyyk platforms use a separate closed shadow shell, excluding open decorative straps and alpha fringe. Native circular underbodies close only their known horizontal end rings; other footprints use their generated deck and base. These rendering hints never become collision. Geometry cuts discard affected hints. Very thin closed shapes retry a smaller inward shadow offset while retaining float-precision containment and face-winding checks.

## References

The implementation follows the installed **Battlefront II Mod Tools Art Guide**, especially its prop, transparency, shadow-volume, collision, and BFII collision-name appendices. Stock Yavin temple, interior, and ruin meshes informed the separation of building shells and interior collision.

Binary-format and interchange checks also used the independent [SWBF MSH Blender IO reference manual](https://github.com/PrismaticFlower/SWBF-msh-Blender-IO/blob/master/docs/reference_manual.md) and [XSIZETools guidelines](https://schlechtwetterfront.github.io/xsizetools/guidelines.html). The exporter is original JavaScript and does not require Blender to create a package.
