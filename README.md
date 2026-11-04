# Wonderblocks 1.0.0

An independent, open-source 3D building editor with original procedural building geometry and a BF2-style botanical construction kit. Botanical forms are adapted from the user-supplied part references, with stock BF2 materials. Source assets retain their original ownership.

## Run

**Windows release:** download the installer or portable ZIP from GitHub Releases. Extract the complete ZIP and launch **Wonderblocks.exe**, or run the installer. The desktop app includes its runtime; users do not need Node.js or a separate browser. See [desktop builds and automated releases](docs/desktop-release.md).

**Run from source:** install Node.js 24 and the pinned pnpm version, run `pnpm install --frozen-lockfile` once, then double-click **Start.cmd** to open the editor in your browser. The launcher starts a loopback-only server on http://127.0.0.1:4178. On this development computer it can also use the existing Codex runtime. After installation the editor works offline. Use a current browser with WebGL enabled.

The launcher leaves the server running in the background. To stop it, use **Stop.ps1** (right-click, Run with PowerShell); it verifies the recorded process command before stopping it. A manually launched server stops with Ctrl+C in its terminal.

## Folder guide

The top level contains the editor entry page, launchers, package information and project overview. Files used by the application live in these folders:

| Folder | Contents |
| --- | --- |
| `src/` | Application code, grouped by feature: editor, flora, interiors, routes, platforms, highways, collision, SWBF2 export, materials, parts and walking. `src/app.js` connects the editor. |
| `styles/` | Editor stylesheets. |
| `textures/` | Material categories and source images. Add a folder or image and refresh the editor; see [texture instructions](textures/README.md). |
| `assets/` | Textures, icons and converted asset data. Optional personal character files belong in `assets/character/` and remain excluded from Git. |
| `examples/projects/` | Editable saved scenes (`.building.json`). |
| `examples/generators/` | The 15 retained scene builders; no archived demos. |
| `previews/` | Standalone scene previews and their scripts. |
| `tests/` | Automated tests and small geometry/connection fixtures, separate from the example scenes. |
| `tools/` | Asset conversion and generation utilities. |
| `docs/` | Usage, implementation, source and licensing notes. |
| `research/` | Investigation files; route reference inventories and sample textures are under `research/route-assets/`. |
| `vendor/` | Bundled third-party libraries used offline. |

Keep new feature code in its matching `src/` folder, saved scenes in `examples/projects/`, and investigation output in `research/`. Use relative module imports and `new URL(..., import.meta.url)` for module-owned assets. Start the server from this folder as before. The server serves the paths shown here directly; retired preview, module and asset URLs are not redirected.

Scenes show a loading bar with a percentage and object count while they are built. The scene becomes available after its first frame is drawn. Opening another project builds it before replacing the current scene; failed opens leave the current project available.

## Example scenes

A fresh editor opens with an empty project. **Load examples** in the top bar contains 15 curated scenes:

- **Gameplay maps:** Yavin Rainwell, Vesper Rift, Cinderlock and Relay District.
- **Building kits:** Yavin blocking workshop and Mos Eisley collection.
- **Organic shapes:** SWBF2 flora.
- **Coruscant:** Aurelia Gate and Meridian.
- **Architecture:** Levantine vine passage, Asterfall, Classical temple, Empire State block and Castle Compound.

## Yavin · Temple of the Rainwell

Open **Load examples → Gameplay maps → Yavin · Temple of the Rainwell**, or `index.html?demo=yavin-rainwell`. A stepped jungle sanctuary overlooks a jade creek, with a carved broad bridge, a high aqueduct approach, a lower ford and an underpass between the bridge slabs. Ruined galleries, courtyard cover and native Yavin trees remain editable. The sanctuary has a real interior, side doors and a central basin. [Six-view preview](./previews/yavin-rainwell-preview.html) · [Saved scene](./examples/projects/yavin-rainwell.building.json).

## Yavin blocking kit

Open `index.html?demo=yavin` or **Load examples > Building kits > Yavin blocking workshop**. The **Yavin** category provides an adjustable arena gallery with a lower passage and upper fighting lane, a gallery-and-stairs object group, a temple passage route, a tall aqueduct with open spans and enclosed pier passages mixed in one route, the complete large Temple bridge with independently textured side blocks, carved caps and solid transverse support slabs, a stepped wall with trapezoidal openings, and a solid ruined wall with broken masonry courses. These are reusable blocking tools based on inspection of BF2 Temple and original BF1 Arena architecture. Use [the seven-view preview](./previews/yavin-kit-preview.html) to inspect them at player height or in clay view. See [the kit notes](./docs/yavin-blocking-kit.md) for controls and source comparisons.

## Mos Eisley collection review

Open `previews/mos-eisley-review.html` for the five selected building collections with orbit controls and stock-building comparisons. Open `index.html?demo=mos-eisley` or **Load examples > Building kits > Mos Eisley** to edit the selected kits. The collection is under **Mos Eisley** in the part library and material themes. Choose its first tile, **Mos Eisley building block**, to place the stucco building body with its beveled base and roof rim already applied. Its finishes also appear in the interior wall/floor finish selectors. The building samples use a built-in roof rim on the block, with height and thickness controls, plus a sloped base with height and projection controls. Recessed entries include closed-door and doorless versions; the canopy contains cloth and supports only. Use the wall creator for adjoining stucco walls. Both follow the block and survive adding an interior. The saved project is `examples/projects/mos-eisley-review.building.json`.

Collections 1–5 are selected; the unused utility, market-shade and salvage collections have been removed. They use the local PC Mod Tools' `assets/worlds/TAT/world2/tat2.wld` sources. Retained stock geometry keeps its authored UVs; whole stock buildings appear only as preview references. Blocks, rooms, parapets and furniture in the proposed examples remain native editable parts. See `docs/mos-eisley-review.md` and `assets/mos-eisley/sources.json` for the candidate list and provenance. No map installation or SDK source files are changed.

## Levantine vine passage

Open `index.html?demo=levantine` or choose **Load examples > Architecture > Levantine vine passage**. The ground-level stone lane runs beneath a timber pergola covered by sixteen editable vines, between eight room-built Mos Eisley houses and a cistern courtyard. The houses use integrated beveled bases and roof rims, stock doorless entries, domes, buttresses and roof vents; cloth shades and a street arch frame the courtyard. All 262 parts are organized into named object groups, and each house can be entered in walk mode. The saved scene is `examples/projects/levantine-vine-passage.building.json`; `previews/levantine-preview.html` offers walking-height, courtyard and overview views.

## Cinderlock gameplay map

**Load examples → Gameplay maps → Cinderlock · Foundry Crossfire** opens a compact infantry block with cooling at 4.8 m, foundry street at 2.4 m and freight at ground level. Separate stairs and ramps connect the terraces without overhead path crossings. Both workshops have three sheltered exits. Nine interiors, cover, short sightlines and two-access control booths support several attack routes.

Open `previews/cinderlock-preview.html` for six views, a roof cutaway and a **Blockout** toggle that hides cosmetic detail. The presentation uses the same saved native project as the editor. The BF2 CLF addon is a separate game build; the example keeps its editable objective markers.

## Asterfall showcase

**Load examples → Architecture → Asterfall · City of the Tide Engine** opens a 369-part cliffside city. A 68 m bronze tide wheel overlooks the lantern harbor, aspen conservatory, saffron market and observatory acropolis. Two outer return paths connect the districts, with short stair flights, resting landings and linked platform rail openings. The arched aqueduct feeds two stylized waterfalls. Nine native room plans remain editable.

Open `index.html?demo=asterfall`, use the [six-view presentation](./previews/asterfall-preview.html), or load [the saved scene](./examples/projects/asterfall.building.json). Every visible structure, vessel and water ribbon is in the project. The presentation adds lighting only; the water and engine are static geometry. This is a Wonderblocks scene, not an installed game map.

## Build

**Scale (R):** Drag an axis handle to resize along that axis, or use the center cube to scale all axes together. Drag right or upward from the center cube to grow the object. Hold **Shift** for fine control or **Alt** to bypass snapping. Scale snapping uses relative 10% steps, keeping the object's proportions intact. Size limits stop uniform scaling across all axes together.

### Flora

Choose **Flora** beside Object and Material. Drag parts from the botanical catalogue from the left palette into the scene to start an empty plant. **Joint parts** (including Basic branch) attach to body joints; **Body presets** provide authored root and trunk object groups; **Surface parts** sit on bark without adding joints. Clicking a card also lets you choose where to place it. No starter trees or generic Add Branch / Add Leaf controls are used.

Select a joint to bend or thicken it. Move, Rotate and Scale stay in the shared toolbar; rotation rings appear only in Rotate, and extension arrows only for the selected part in Scale. Native part-shape handles preserve the authored shapes. Body joints regenerate a smooth volume when moved, while attached branches merge into a shared skin. Leaves and surface decorations retain their own meshes. Children follow their attachment when the plant changes.

Flora uses the same rotation gizmo as Object mode. **Move with mouse** is checked by default for direct dragging and sliding over bark; uncheck it to use the standard object move gizmo.

**Finish plant** saves one scene object as one undo step; **Cancel** discards edits. Local Undo/Redo works during editing. Current plants support project save/load, library storage, mirroring, duplication, textures and OBJ export. The botanical catalogue adapts the expressive reference trunk and root forms to reduced geometry and BF2 bark. Compound foliage uses folded BF2 cutout cards with the reference arrangements; individual leaves retain their characteristic outlines. [Flora construction notes](./docs/flora-reference-notes.md) describes the original parts and editing system.

**Billboard foliage:** Leaves now includes Yavin Broadleaf Canopy, Yavin Fineleaf Canopy, Dagobah Swamp Canopy, Endor Woodland Canopy and Endor Needle Bough and Dagobah Hanging Vines. Drag a canopy onto bark, select it, then open **Selected part settings** to change card count, spread, cluster height, card size, brightness, arrangement, facing and attachment edge. These decorations have no joints; they follow their host while their cutout cards face the camera on the GPU. Each card uses two triangles and each cluster uses one mesh. Vines can stay upright and hang from their top edge. Transparent leaf gaps remain click-through. Settings survive Undo/Redo and project save/load. Geometry-only OBJ export freezes the current view; it cannot carry camera-facing behavior or alpha textures. Try **Load examples → Organic shapes → SWBF2 · Yavin, Dagobah & Endor trees**, `index.html?demo=swbf-trees`, or the orbitable [tree preview](./previews/swbf-trees-preview.html). [Source notes](./docs/swbf-tree-billboards.md) describe the native references and recreation.

The Flora editor’s **Tree presets** group contains six editable SWBF2 trees: Yavin Temple Broadleaf, Yavin Slender Grove Tree, Dagobah Grand Swamp Tree, Dagobah Twisted Elder, Endor Forest Redwood and Endor Woodland Tree. Drag one onto the ground to place a whole tree, then tweak its joints and attached foliage. Each copy keeps its own wood, canopy and vine settings and supports Undo/Redo and project saving. Preset canopies include the original game’s smaller, varied leaf-cluster scales; their physical dimensions remain the same in edit and walk views. The distant tree silhouette is excluded. **Endor Redwood Foliage** in **Leaves** adds an attached group of native folded leaf planes. The Forest Redwood preset attaches overlapping groups directly to the trunk, with a broad, tapered canopy that stays leafy to the tip and no modeled wooden boughs.

**Kapok tree:** **Flora → Tree presets → Kapok · Mature Rainforest Tree** adds a mature tree about 40 m tall with a broad spreading crown and tall, thin buttress roots. Its wood and attached canopies remain editable. **Kapok Buttress Roots** is also available in **Bases**. [Scale and construction notes](./docs/kapok-tree.md).

**Aspen seasons:** **Flora → Tree presets** includes Summer, Fall and Winter aspens, each about 18 m tall. They share an editable pale trunk and fine branching crown; summer has green leaves, fall has golden leaves, and winter retains the bare branches.

### Metaballs


Choose **Metaballs → Metaballs** to place one organic cluster. Select the whole cluster and choose **Edit blobs**. Sculpt controls open in the left workspace and the object is framed automatically. Every blob has a clickable sphere overlay at its center; the selected sphere is gold. Use Move, Scale, or Rotate (W/E/R) to transform that blob. Scaling individual axes makes ellipsoids, which can be rotated. **Add blob to this cluster** creates and selects another blob in the current editing session. Radius and exact transform fields affect the selected blob; Blend and Mesh detail affect the cluster. The editor shows triangle counts and supports local undo/redo. **Done** saves the cluster as one project undo step and removes all markers; **Cancel** discards the session. Clusters support up to 32 blobs and preserve their editable data through saving, duplication, mirroring, and library storage. Material mode paints the whole cluster, and OBJ exports its generated mesh without editor overlays.

**Keep surface size when scaling** is a global toolbar setting for the current project. Enabled, textures add repeats as parts grow; disabled, the pattern stretches with the part. Switching modes preserves the current appearance. The setting applies to every existing part and newly placed parts or library object groups, survives saving, and can be undone. It defaults to enabled when opening older projects. Texture coordinates update while dragging the scale gizmo.

**Castle masonry** is a surface preset available on any part. Stone foundations and ramparts are plain battered primitives with this preset selected by default; their joints are no longer baked into geometry. Apply Plain, Wood grain, Marble, or any other preset to replace their finish. Older untextured castle foundations/ramparts receive the default masonry preset on import; an explicitly chosen Plain finish stays plain. As with other surface presets, OBJ export remains geometry-only.

### Medieval Japan castle collection

The **Wall / fence** builder also offers **Japanese open defensive wall** under **Wall style**. It follows straight and curved paths with the same plaster parapet, open bays, timber posts and top beam as the Japan kit. Set wall height, thickness, post spacing and beam thickness in the builder; Material mode paints the plaster, posts and top beam independently. Choose **Japanese open defensive wall with roof** for a swept tiled cap that follows the wall, then paint its separate **Roof** material in Material mode.

**Load examples → Castle compound** opens *Shirogane · Gate, Garden & Keep*, a 310-part scene built with editable tools: three terraced courtyard platforms, roofed Japanese wall paths, gatehouses, watchtowers, inhabited barracks/storehouse/audience rooms, a dry garden, a covered gallery and the detailed keep. Its four ascent routes include two-flight approaches with resting landings and a curved garden return. Object groups keep the buildings easy to select; expand **Object group tools** to group or ungroup parts. The courtyard approaches use matching 20 cm risers and 60 cm treads. Open the bundled `examples/projects/castle-compound.building.json` directly or use `?demo=castle-compound`. This is an editable scene, not an installed playable map.

The **Medieval Japan** category contains 32 original procedural parts for stylized Japanese castles and variations:

- Battered stone foundation, straight rampart, and corner block.
- Hollow plaster and timber keep stories, an entrance story with a clear front passage, and separate plaster/timber wall panels.
- Swept hip, open tier, gable, half, and hip-and-gable roofs; straight eave canopy, ridge cap, and courtyard wall cap.
- Swept roof gable face, triangular dormer and curved entrance gables, barred and bell-shaped windows, and arrow-slit panels.
- Open timber gate, red torii gate, separate studded doors, observation balcony, railing, and eave bracket.
- Gold fish roof ornament, floral crest, and stylized tiger relief.

At scale 1, keep stories are 2 × 1.2 × 2 units and foundations are 2 × 1.2 × 2, narrowing toward the top. Roofs span 2 × 2 units; the tier roof has a 1 × 1 central opening. Scale roof X/Z for overhang, Y for rise, and overlap the inner edge inside the upper story. Half roofs combine with independent gables and ridge pieces for different silhouettes. Their Inner edge width control narrows the high edge for mitered corner joins; 1 keeps the panel rectangular. The new swept gable face follows the same roof profile. Story shells and balcony frames have open centers; add floor slabs separately. Windows, slit panels, and reliefs are decorative surface pieces rather than wall-cutting tools. Castle parts support existing colors, surface presets, sculpting, mirroring, library saving, and geometry export.

These are artistic approximations, not a measured reconstruction or a complete navigable map. The example takes its five visible tiers, gold ornaments, and upper balcony from the familiar present-day Osaka silhouette. References: [Osaka tourism](https://osaka-info.jp/en/spot/osaka-castle-main-keep/) and [Japan Tourism Agency](https://www.mlit.go.jp/tagengo-db/en/R1-01758.html). All meshes are generated locally from original code.

- Shift-click parts in the scene or Scene list to select several, then expand **Object group tools** and click **Group objects**. Clicking a member selects its object group. Move, rotate, duplicate, mirror, or delete the selected set together. Copies are independent object groups.
- **Edit this part only** selects one member for scaling or appearance edits; **Ungroup** releases its entire object group. Group scaling is deliberately unavailable to avoid distorting rotated parts. Position fields translate the whole selection; appearance and shape controls edit the named active member.
- Combined and half temple roofs have **Roof pitch** and **Roof thickness** controls. Classical columns and drums have **Shaft fullness**, plus **Flute depth** on fluted variants. These retain the original defaults and save in project files.
- Select a single supported part and choose **Adjust shape in scene**. Drag the vertical arrow for roof pitch or the horizontal arrow for shaft fullness. **Finish shape handle** returns to normal transforms. The other dimensions are available as sliders. Undo restores shape edits.

- Choose Bodies, Roofs, or Details, click a part, then click the ground or another part to place it. Escape cancels placement. Surface placement uses the hit point as the part's base. Wall details automatically face vertical surfaces when Align details to walls is enabled.
- Click a part in the scene or Scene list. Drag the gizmo, or enter precise position, rotation, and scale in the inspector.
- W / E / R select Move / Rotate / Scale. Snap uses 0.25-unit translation, 15-degree rotation, and 0.1 scale steps.
- Duplicate offsets an independent copy along X. Mirror X reflects a copy across the world X=0 plane; subsequent edits are independent.
- Choose a surface color or preset swatch. Detail glass remains a fixed dark color.
- Drag empty space to orbit, right-drag to pan, scroll to zoom. Use View → Frame all to see the whole scene.
- Delete removes the selected part. Ctrl+Z / Ctrl+Y undo/redo. Ctrl+D duplicates. Ctrl+S downloads the project.
- F frames your selection; Shift+F frames the visible scene. Framing leaves space for the top controls. F2 renames a selected part. Double-click an editable object to open its editor. Undo and Redo restore the relevant selection.
- / focuses the part search. Search words can be in either order. Enter picks a unique result; with several results, use arrow keys and Enter to choose. Escape clears the search, then releases keyboard focus.
- The top strip identifies the selected object and current editing mode. **Done** keeps the current editing session; **Cancel** discards it. A separate **Cancel placement** stops a picked-up part without discarding the plant. Escape closes an open View or Placement menu first.
- **Save project** (Ctrl+S / Cmd+S) downloads current edits even while editing a plant, room, route, platform, highway, or cluster. Saving keeps the editor open. Text and number fields keep their normal text-editing shortcuts; sliders and dropdowns use editor Undo/Redo directly.

## Keep and export your work

**Export SWBF2** downloads a source package for Battlefront II (2005): MSH geometry, TGA textures, ODF objects, and LYR/WLD placements. Object groups are grouped by exterior, interior, and details; long routes split every six sections by default. Collision uses boxes and spheres where safe, ramps for stairs, and separate detailed projectile meshes. The package includes closed shadow volumes, simpler distant models, native leaf patches, an editable scene snapshot, and a validation script that never starts the game. See [the SWBF2 export guide](./docs/swbf2-export.md) for map integration and limitations.

### Reusable object group library

Shift-click parts (or select an existing object group), enter a name under **My object groups** in the toolbox, and click **Save selection to library**. Single parts can be saved too. The library keeps the geometry settings, colors, textures, and relative arrangement, with an anchor at the bottom center of the selected geometry.

Click a saved preview and then click the scene to place it. Q rotates it by 90 degrees; Escape cancels. Keep placing, Shift-repeat, and Mirror placement also work. Each placement is an independent object group and a single project undo step; editing it does not alter the library item or other copies. Object groups remain available when switching projects and after reloads in the same browser.

**Export library** downloads a separate `.object-groups.json` backup. **Import library** adds entries to your library without replacing existing entries or changing the current project. Repeated imports create independent entries. **Remove** only removes the saved template; **Undo library change** reverses library saves, imports, and removals during the current session. Library history is separate from project history and resets on reload.

The library lives in browser storage, not inside project files. Export a backup before clearing browser data or changing computers. Limits: 100 saved object groups, 5,000 total saved parts, 500 parts per object group/project. Browser storage may impose a smaller limit; failed saves report an error and retain the previous library.

Save project downloads an editable `.building.json` file. Open restores it. The app also attempts to autosave in this browser's local storage; use downloaded project files for reliable backups and moving between browsers. New, Open, and Load examples can be undone during the session. History retains up to 80 snapshots and is not persisted across reloads.

Export OBJ saves mesh geometry for other 3D applications. It does not include colors/material files. Parts remain separate intersecting meshes, not a watertight printable solid. Project imports are validated, limited to 500 parts and 2 MB. OBJ is export-only.

## Scope and next steps

Included: 40 parts, surface placement preview, transforms, snapping, duplication, reflection, per-part colors, selection, project import/export, local autosave, undo/redo, and mesh export.

Not implemented: legacy `.bld`/PNG import or export, direct loading of reference assets, original deformation handles, linked symmetry, attachment hierarchy, texture painting, procedural mesh blending, or exact interaction parity with the reference editor. The binary research is a preliminary PE/string inventory, not function-level reverse engineering. See [the research notes](docs/RESEARCH.md) for evidence and limitations.

## Development

### Geometry and viewport performance

The viewport displays total triangle and mesh-batch counts; the inspector displays the selected part's triangle count. See [POLYGON-BUDGET.md](./docs/POLYGON-BUDGET.md) for all default parts and compound measurements. Ordinary boxes and ramparts use 12 triangles. Sculpted boxes gain subdivisions to support deformation. Curves use modest segment counts, and Japanese roof tile ribs now come from the replaceable Roof tiles surface preset rather than individual cylinders.

Components sharing a material are combined within each editable part. Individual parts and object group members remain editable. Rendering pauses when the view is idle; scene edits invalidate cached shadows. The current castle compound uses 15,920 visual triangles and 480 material batches across 310 parts. Windows, gable lattice, and timber trim use original opaque 128 × 128 detail maps; custom surface presets replace these maps, and Plain clears them. Roofed wall paths include their tile caps. These are geometry budgets, not measured PS2 performance; collision, visibility, and LOD work remain part of game integration. OBJ exports geometry only and does not carry the procedural roof or stone textures.

Files: `src/core/model.js` (project schema/history), `src/core/geometry.js` (original parts), `src/app.js` (editing/scene/UI), `server.cjs` (local static server), `styles/style.css` and `index.html` (interface).

Run `node --test tests/*.test.js`. No build step. Three.js 0.180.0 is bundled in `vendor/` under its own MIT license; see `vendor/LICENSE`. Original project code is MIT licensed. This project is unaffiliated with EA or Maxis. Source is provided locally; it has not been published to a public repository.

The [15 October quality record](./docs/quality-pass-2026-10-15.md) includes native compiler checks, browser verification and repeatable SWBF2 integration tests.


## New in 0.2

- Core parts organized into Bodies, Roofs, and Details, with rendered 3D thumbnails and search across categories.
- New forms include onion domes, pagoda and saucer roofs, an hourglass tower, archways, balconies, chimneys, banners, and ornaments.
- Select a part and use Shape sculpting: taper, bulge, and twist. These change mesh geometry rather than only scaling it. Slider edits are undoable and saved in project files. Reset shape removes the deformation.
- Keep placing lets you stamp repeated parts. Holding Shift while placing repeats for that click too. Q turns a pending part 90 degrees; Escape ends placement.
- Mirror placement creates an independent reflected partner across world X=0, except on the center plane. The pair is one undo operation. This is not live linked symmetry.
- Align details to walls rotates opening/detail parts around the vertical axis to face a hit wall. It does not attach them to the parent; manually orient parts on sloping surfaces. Turn alignment off to use Q rotation on walls.
- Existing version-1 project files remain readable. A best-effort one-time browser backup is kept under open-building-studio-backup-before-v02 before loading the previous autosave. The old editor cannot read new part IDs.

## Classical temple kit

The Classical tab adds 12 stylized original parts (52 total): Doric, Ionic, and Corinthian-style columns; a fluted shaft drum; a stepped temple platform; architrave beam; triglyph frieze; dentil cornice; triangular pediment; pitched roof; open temple doorway; and palmette ornament. These are artistic approximations, not archaeological reconstructions.

All three complete columns are 3 units tall at scale 1. The platform is 0.45 units high, architrave 0.34, and cornice 0.22. Match X and Y scale on roof/pediment pieces to preserve their pitch; extend roof depth with Z scale. Use duplicate and snapping to build a colonnade.

Load classical temple opens the editable Sunstone Temple example; Undo restores the previous scene. It is also supplied as classical-temple.building.json. The interior uses separate wall meshes and an open doorway. Collision generation and Battlefront-specific export remain future work. Version 1.0.0 remains tagged in Git; these additions are subsequent working-tree changes.

The roof and both pediments now form one selectable **Temple roof & pediments** part. Move, rotate, scale, duplicate, or sculpt them together. The roof color is editable; the pediment stone is a fixed accent. The Classical palette uses the combined roof instead of the retired separate pieces. Reload the temple example to get the combined object group.


### Simplified temple roof

Temple roof & pediments now uses a shallow pitch (0.28 rise per unit of half-width), smooth planar slopes, and flush stone ends. Raised ribs, the cylindrical ridge, and overlapping end trim have been removed. The example uses a new Temple cornice frame with continuous rectangular moldings, avoiding overlapping corner beams. Existing complete-roof parts update automatically on reload; load the classical temple example for the revised frame layout.

The Classical palette also includes Smooth Doric column, Smooth Ionic column, and Smooth Corinthian column. They retain the matching capitals, bases, taper, and three-unit height, but have circular shafts without fluting. Original fluted columns and existing temple projects remain unchanged.


Half temple roof is available in Classical. It is the positive-X half of the combined roof: one shallow slope and two half-pediments. Its origin sits on the ridge, with the eave one unit along +X; depth and pitch match the full roof. Set position X to zero and use Mirror X to create the other side around the world symmetry plane. The full roof remains available.


## Surface preset library

Select a part, then browse the category cards in the material picker. Texture repeats per unit controls pattern size (lower values mean larger features). Surface color tints the pattern; applying a texture keeps that color. **Remove texture** clears the texture while retaining the color. Categories and images come directly from the `textures/` folders, with optional roughness and metalness settings beside each image. See [adding textures](textures/README.md).

Preset and repeat settings are saved in building JSON and autosave, and are retained by duplication/mirroring. Preset changes and repeat adjustments support undo/redo.  Fixed accent materials and glass retain their finish. Textures use part-space planar projection and can show seams around curved/complex surfaces. They are reprojected after sculpting or scaling. OBJ export still contains geometry only; it does not include materials or texture images.

## New York collection

New York facade styles live under **Surface presets**: Deco window bands, Loft windows & brick, Office curtain wall, and Storefront glazing. Place a normal Body cube, scale it into a building, then apply the desired texture. Window repetition follows the existing global surface-scaling setting. Streets, sidewalks, and roof finishes use generic slabs; setbacks are stacked cubes.

The New York palette contains 20 distinct architectural/detail parts: cornice, parapet, mooring mast, antenna, entrance portal, water tower, rooftop plant, fire escape, awning, crosswalk, streetlight, and taxi. Redundant themed cube and slab types have been removed. The library supports 109 part IDs, with 107 visible.

**Load Empire State block** opens a stylized Midtown example with a separately editable stepped landmark, six neighboring commercial buildings, storefronts, fire escapes, rooftop water towers and equipment, sidewalks, crossings, lamps, and taxis. Each building is grouped as an object group; use Edit this part only to change its components. Loading the example is undoable. An editable `examples/projects/empire-state-block.building.json` is also included.

The example has **133 parts, 5,608 triangles, and 164 material batches**. Tests enforce the 10k scene ceiling and a 3k visual-mesh ceiling for the landmark object group. This is an exterior diorama with simplified neighboring buildings, not a surveyed reconstruction or a navigable interior map. Collision, LODs, shadow volumes, and game-specific export are still unimplemented; OBJ exports geometry without facade textures.

Reference: the [Empire State Building's architecture overview](https://www.esbnyc.com/about/architecture-design) and [New York City landmark designation report](https://s-media.nyc.gov/agencies/lpc/lp/2000.pdf) informed the stepped massing, limestone tone, vertical window bands and mast. All geometry and procedural textures are original; reference imagery is not bundled.

### Texture themes and rooftop silhouettes

The inspector now has a Texture theme selector: All, General, Classical, Medieval Japan, and New York. Themes filter the same interchangeable surface presets; they never restrict which part can receive a texture. Plain stays available in every theme. Changing the filter does not change the selected part.

Eight additional New York toppers provide distinct silhouettes: Mansard roof (124 triangles), Fluted Deco crown (148), Terraced crown (180), Octagonal cupola (112), Open rooftop lantern (76), Barrel vault roof (32), Sawtooth factory roof (32), and Corner pinnacle crown (128). They seat at local Y=0 and support scaling, sculpting, surface presets, duplication and object group saving. The current Empire State example is unchanged at 5,608 triangles.

## Guided stair / ramp workshop

Click **Build stairs / ramp** to enter a dedicated workspace. The preview and controls stay together, and the ordinary editor is inactive until you finish or cancel.

1. **Place the start:** click a floor or surface. Q rotates the starting direction. The view then frames your first flight.
2. **Build your route:** edit width, length, height gained and step count. The selected segment is orange and the final endpoint is green. Drag the gold handle on the selected segment to set its run and rise directly in the view; a landing handle extends its flat surface at a fixed elevation. Click a segment in the route list or directly in the preview to edit it. Continue with More stairs, Ramp, or Flat landing. Turn left/right and Return left/right automatically add a connecting landing plus the next flight. If the route already ends in a landing, the turn reuses it. Extensions continue the selected path; changing an earlier segment moves its downstream sections.
3. **Finish stairs:** save the complete route in one undo step. Cancel or Escape discards the draft and restores the preceding view. Undo draft change reverses workshop edits without touching scene history.

Select an existing route and click **Edit stair route** in the inspector to reopen it. Finish saves its changes; Cancel leaves the original untouched. Width and underside thickness are per-segment settings; new flights inherit the preceding flight. Landings widen to connect adjoining flights. Construction options contain segment thickness, return-flight gap, landing exits and segment removal. Left/right are relative to walking forward up the route, not the camera. Fit route in view frames the draft, and dragging the view orbits it.

Routes remain parametric single parts, with all segment definitions saved in projects and reusable object groups. Duplication, mirroring, surfaces, scaling and geometry export work as with other parts. Width is 0.5–10, flight run is 0.2–30, straight landing depth can be as short as 0.2 independently of width; turning landings retain enough depth to connect neighboring flights, rise is 0–10, steps are integer 1–64, and routes have at most 32 segments. Dimensions describe the unscaled route. The origin is the first walking level; underside thickness extends below it. Ramps have sloping undersides. Stairs are connected closed shells with solid risers, side faces and sloping undersides. Collision, headroom checking and building-code validation are not implemented.

Mouse angle snapping uses the preceding non-flat flight, or the current flight’s angle at drag start for the first flight. Within 3 degrees it holds the same slope; the status reports the lock. Uncheck Match flight angle or hold Alt to bypass snapping. Each complete drag is one draft-undo action; cancelling a pointer drag restores its starting dimensions. Numeric inputs remain available for precise sizes.

Stair extension is quantized to whole treads in real time. Dragging increases or decreases the step count; each tread keeps its depth, width and thickness. Height/angle changes the riser spacing while tread depth stays fixed. Individual tread depth and tread thickness are separate controls. Editing step count changes the flight length, and editing flight length rounds to a whole number of the current treads. Ramps and landings remain continuous. The risers and underside join the entire flight into one continuous mesh. Tread thickness adds to the segment backing thickness.

At zero rise, a flight becomes a flat landing automatically. Raising it restores the stairs with their saved tread settings. **Fill to ground** applies only to the selected segment, adding solid support down to world Y = 0. Each flight, ramp, or landing can be toggled independently. New segments inherit the preceding flight’s setting. Support bottoms stay anchored when the route is moved or scaled; turn it off to return to the normal underside thickness.

In the stair workshop, select a segment and use **Segment railings**. Choose None, Posts and handrail, or Solid wall and handrail; choose both sides, left, or right. Height, handrail width/thickness, post width/spacing, and solid-wall thickness are independent settings in world units, preserved when the route object is scaled. Rail color, surface preset, and texture density are separate from the stairs. New segments inherit the preceding flight’s railing settings. Turn landings fence exposed edges while leaving entry and exit openings. Rails save, duplicate, undo, and export with their route. Geometry export still does not export texture materials.

**Snap endpoint to surfaces** is enabled in the stair workshop. Drag a stair or ramp endpoint near an object's upward-facing top to match its height (0.35 world-unit capture range). A cyan handle and status show the target and height. Surface snapping takes precedence over angle matching; Alt bypasses both, or disable the surface checkbox separately. Stairs retain whole treads and may add/remove one nearby tread to reach a supported endpoint. Flat landings keep their existing elevation. Hidden objects, the edited route, and railing caps are excluded. Surface height snapping currently supports upright routes, including yaw rotation and scaling; tilted routes keep ordinary free dragging.

Choose **Interactive → Room** in the library. The workshop starts with one room:

1. Drag a rectangle on the floor-plan grid to add another room. Rooms snap to 0.25 units and nearby room/shell edges, must be at least 2 × 2, and may be fully nested or touch along edges. Partial overlaps and duplicate footprints are rejected. Touching/nested rooms merge coincident wall sections; nested rooms share the parent floor.
2. Choose **Draw door** or **Draw window** and drag along a wall to set the width. Openings can span multiple collinear room-wall sections, and a wall can have multiple openings. A click uses the configured width. Windows have adjustable sill height and opening height. **Remove opening** deletes the opening you click. These are real geometric openings, without door leaves or glazing.
3. Use **Select / resize**, select a room, and drag any side or gold handle to resize it live. Shared edges resize the adjoining room too. The room selector and numeric fields also edit position and dimensions. Default room height, wall thickness, and slab thickness apply to the storey. The selected room has independent **Room wall height** and **Room ceiling height** fields; **Use default heights** clears its overrides. Doorways follow moved walls and are retained when they still fit. Undo edit restores an entire resize drag in one step.
4. Set independent colors, texture presets, and texture density for the floor, room walls, exterior walls, and ceiling. Orbit the live 3D preview; toggle **Cutaway** to inspect the interior. Existing shells open in the complete enclosed view.
5. **Finish interior** saves one editable part at the current view's ground-level focus. Move it with the normal tools. Select it and choose **Edit interior** to reopen its room plan. Cancel leaves the project unchanged.

The viewport defaults to the complete enclosed building, retaining the full object after Finish. Choose **Show interior cutaway** to hide ceilings and the upper portion of a converted shell. Hidden ceilings remain in saved projects and OBJ exports. Interiors support duplication, object groups, undo, and project save/open. Wall intersections are clipped to remove overlapping faces, and the generated part batches by finish and cutaway visibility.

To use an existing building, select its **Body**, **Round tower**, or **Hexagonal tower** and choose **Add interior** in the inspector. Finish converts that body into an editable hollow shell while preserving its identity, outer dimensions, position, orientation, object group membership, facade color, texture, and texture density. The workshop shows the shell outline and an adjustable **Interior inset**. Exterior room doors cut through the full shell thickness. Cancel leaves the original body intact; project Undo restores it after finishing. This supports those unsculpted bodies at least 2.4 units on every axis, including rotated and mirrored ones. It does not carve tapered/sculpted shapes or a whole multi-part object group, or generate collision. Storey stair connections cut their slab openings automatically. Other facade and roof parts remain independent. Interior finishes are edited in the workshop rather than the general part texture controls.
Cutaway mode displays a persistent notice explaining which geometry is hidden, with a **Show complete building** button. This is only a viewing mode: saved and exported geometry remains complete.

### Connected storeys and stairwells

In the 3D room editor, click a stairwell’s cyan centre handle, or select its stair connection and choose **Edit floor opening**. Drag the centre to move the cutout and the gold edge handles to resize it; width and depth fields give exact dimensions. Alt bypasses quarter-metre snapping. Custom openings change both the upper floor and lower ceiling, remain attached when the stairs move, and support Undo, Redo and Escape to cancel a drag. **Reset automatic opening** restores the stair-shaped cutout.


In the interior workshop:
1. Choose **Add floor above**. A new top floor copies the previous floor’s outer footprint and starts above its ceilings. For an existing shell, increase **Shell height** and choose **Apply floor dimensions** if more space is needed.
2. Use **Editing floor** above the plan to draw rooms and openings on that floor. Elevations are measured from the ground-floor surface. **Apply floor dimensions** updates the selected elevation and connected stairs together.
3. Select the lower floor and choose **Connect to floor above**. The editor searches for a clear straight flight on both floors. Adjust start X/Z, direction, flight length and width, then **Apply stair changes**. Rise and step count follow the floor elevations; slab openings follow the connection automatically unless you customise them with **Edit floor opening** in the 3D room editor.
4. Enable **Cutaway** to inspect the selected floor and those below. Higher floors and ceilings are temporarily hidden. Finish retains the entire building; Undo also restores floors and connections.

This first version supports up to eight storeys, sixteen stair connections, and adjacent-floor connections. It checks room coverage, partition clearance, approach space, stair tread depth and room headroom. Floor elevations cannot intersect ceilings or exceed the shell. Removing a top floor removes its connections. Set shell inset before adding floors. Corner and switchback flights and plan dragging are supported; automatic guards around interior upper-floor stairwells remain future work. Collision meshes are not generated.

### Roof access

Select the highest interior floor and choose **Connect to roof**. This requires an existing supported shell; roof height comes from the shell, so changing its height rebuilds the flight. The connection cuts the top-floor ceiling and roof slab while preserving the surrounding terrace. Adjust the flight using the usual stair fields. **Guards around roof opening** adds three-sided guards with a clear exit; **View roof** restores the complete building and frames the terrace. Removing the connection closes its openings automatically.

### Editing stairs in the plan

Choose **Edit stairs** (or **Select / resize**) and click a blue stair footprint. Drag its body to move the connection, or drag the gold endpoint to change the final flight length. Position and length snap to quarter units. Dashed outlines show reserved approach space; a blocked candidate appears in red with its reason. Release keeps the last valid placement. **Undo edit** restores the entire drag in one action.

**Stair layout** offers Straight, Corner left/right, and Switchback left/right. For turns, set **Flight length**, **Second flight length**, and **Landing depth**, then **Apply stair changes**. Rise is shared between the two flights and still follows the destination floor or roof. Endpoint dragging changes the second flight on a turned route. The generated stairwell is a rectangular opening around the entire route, including its landing; clearance checks reserve this rectangle on both floors. A switchback’s second flight must reach the outer edge of that opening so its exit lands on solid floor.

### Polygon rooms and faceted shells

Rectangular **Draw room** remains available. **Draw walls** creates a room from a closed outline: click its corners, then click the first point or press Enter. Choose 90° (default), 45°, or Free angle snapping; hold Alt to bypass snapping. Escape cancels the unfinished loop. Self-crossing outlines are rejected. Concave rooms are supported, as are nested rooms and shared angled walls. In **Select / resize**, polygon rooms show draggable corner handles; coordinate/dimension fields translate or scale their outline. Doors and windows use distance along the actual wall, including angled walls.

**Follow shell boundary** selects or creates the complete inner perimeter. Polygon wall/floor geometry respects this perimeter, and rooms extending outside it are rejected. Nearby polygon edges magnetize placement. The original Round tower is retained as its 12-sided low-poly shell; the new Hexagonal tower has six sides. Insets offset the shell faces, and exterior openings cut through their thickness. Floors, ceilings, storeys and stairwell cuts use polygon footprints. Stair clearances are checked against real room areas and angled partitions. Tapered towers still need height-dependent footprints and are not supported yet.

### Toolbox menus

**Load examples** opens a grouped dropdown in the top bar. The **Interactive** library section contains the builders for rooms, platforms, routes, walls, and highways. Select a supported shell and choose **Add interior**, or select an existing room building and choose **Edit interior**. Interior storeys are created through the workshop and are not listed as ordinary palette blocks.

### Scene hierarchy

The Scene panel at the top of the inspector lists object groups as collapsible groups, followed by loose parts. Click an object group row to select the group, or expand it and click a child to edit just that part. Shift-click adds or removes objects from the selection. Search filters the hierarchy; Frame selected focuses the camera on the selected objects. Use the pencil beside a group to rename it (Enter saves, Escape cancels). Object group names survive project saves, duplication, undo, and placement from the saved library. This is a single level of object groups, matching the editor's existing grouping model.

### Simple inspector and visibility

Select a single stair route, interior, or eligible shell to see its main editing action first. Exact transforms, sculpting, materials, and object group tools live in expandable sections; irrelevant controls are hidden. Scene-row eye buttons hide a part or a whole object group from the viewport and picking. Show all restores them. Hiding clears affected selections, survives geometry rebuilds and stair editing, and never removes geometry from saved projects or OBJ exports. Visibility resets when loading another project or reloading the editor.

**View → Fog** adjusts the editor fog live from 0–100%. Zero turns fog off; 50% is the original fog level. Framing an object or the whole scene keeps the chosen amount. This is a viewport setting, not a project or game-export setting.

### Walk preview and character reference

**Walk through** opens a third-person preview. Click a floor or terrace to choose the start, then use WASD or arrow keys to move, drag to turn/look, Shift for faster movement, and Escape or Exit walk to return to the original editor camera. Choose start lets you reposition. The preview follows floors, steps up small risers (up to 0.4 units), falls onto lower surfaces, checks walls, and shortens the camera distance around obstructions. It uses visible render geometry for lightweight preview checks, not game collision export or a full character controller. Hold Space to rise continuously at 3.2 units per second, release to fall under gravity. Ceiling checks stop upward travel. The character remains unanimated.

**Place character reference** places a static copy using the usual click-to-place workflow; move, rotate, duplicate, hide, and save it like a part. Its original scale is locked, including the gizmo, keyboard shortcut, numeric fields, and imported reference data. Previously scaled references return to their original dimensions. References are excluded from OBJ exports and the building triangle budget. Project saves store their placement and reference type, not embedded character geometry.

The user's Blender mesh `rep_inf_ep3trooper` was copied at its original metric scale (2.08387 m tall, 1,722 triangles) and current T-pose. Its texture is retained. The Blender source was left unchanged. Geometry and texture live in ignored `assets/character/character.json` and `character.png`, separate from the original open-source part collection. A checkout without those local files uses a simple 1.8 m stand-in. Copy those local files with a project when the same reference is needed on another machine.

### Metre-based scene calibration

One editor unit represents one metre; the fixed local character is 2.08387 m tall. Newly placed architectural doors, gateways, storeys, parapets, lamps and vehicles have human-sized starting transforms. Generic primitives remain unit primitives. These defaults apply to palette placement, not to raw mesh definitions or existing user-authored projects.

The Osaka-style keep is twice its previous size with a rebuilt entrance stair. The castle compound grounds are wider, while the original terrace elevations remain unchanged. Gatehouses, halls, towers and keep are enlarged around their own ground levels rather than globally stretching the stairs. The keep has 2.88–3.26 m wall storeys and a gateway over 2.4 m high. Its approach meets that gateway and clears the retaining foundation. Some applied keep-window accents were removed to offset the added stair geometry; the compound remains at 9,768 triangles. Matching example JSON files were refreshed.

Load an example again to use its calibrated version. Existing open or user-saved layouts are not automatically resized.

### Palette placement sizes
All 113 part types have explicitly reviewed placement scales in `src/walk/human-scale.js`. New architectural parts start at metre-based sizes suited to the fixed 2.08 m reference: passage frames provide at least 2.4 m clearance, supported canopies provide at least 2.4 m headroom, balcony rails are about 1.1 m above their decks, and stepped parts use risers below 0.2 m. Japanese roof panels share a footprint sized for the 6 m storeys; classical and city roof sets start at small-building dimensions. Roof-only parts still need to be placed at the desired elevation. Decorative door/window panels do not cut holes in other parts.

Generic body primitives, component drums and small ornaments retain modelling-unit sizes. These defaults apply when placing a new part; existing projects, examples, saved object groups and the fixed character are not rescaled.

### Hallways and walled paths
Choose **Interactive → Route**, place a start, then set **Sides → Hallway mode** on the selected segment. Choose its **Floor shape**: Stairs, Ramp, or Level floor. Drag the gold endpoint to set length and height; stairs and ramps can rise or descend (negative Height change). The same route workshop provides direction controls, widths, left/right corners and return turns. Each segment can have walls with independent height (3 m default), thickness, color and surface preset; turn off **Add ceiling** for an outdoor walled path. **Peek inside** hides ceilings only while editing, without changing saved/exported geometry.

Under **Continue from the route end**, choose **Next floor shape** (Stairs, Ramp, or Flat landing), then **Continue straight**, **Turn left**, or **Turn right**. Turns reuse the last straight, level section as the corner, preserving its length unless it must grow to fit the turn. After a slope, turns insert a level corner. The chosen floor shape continues from the corner’s side. Return turns use the same choice. To extend existing stairs, select the route, choose **Edit route**, then choose **Sides → Hallway mode**. Turning sections leave openings at both connections, and the ceiling follows rising flights. Choose another Sides option on a segment to use ordinary stair railings there. Width includes wall thickness. Routes remain standalone editable objects: placing one inside a building does not automatically carve doors in existing walls or stair openings in other floors.

### Route branches and junctions
Select a straight flat landing in the route workshop and open **Branches & junctions**. Choose the side and use **Branch from selected landing**; the new branch uses **Next floor shape** and supports the existing stairs, ramps, turns, walls and railings. Continue and turns extend the selected path. Select any section on that path; the green marker and continuation heading identify its endpoint. To merge, aim the final section at a side of an earlier straight landing, choose **Rejoin landing** and **Join side**, and click **Connect selected end**. The connection sets its length and height; disconnect to drag freely. Connections are within one route object. Landing edits that would break alignment are rejected until the end is disconnected. Walls and railings leave junction openings.

### Connecting separate route objects
In the route workshop, cyan snapping bubbles appear on compatible landings of other visible routes. Click a bubble when placing a new start, or drag the final gold endpoint onto a bubble and release. The start aligns the entire route; an end connection fits the final section to the landing it faces. Use stairs or a ramp for different heights. Drag an end away to detach; hold Alt to bypass snapping. No connection form is needed. Both ends may attach to the same existing route to make a bypass. Routes remain separate objects, with persistent connections and automatic wall/railing openings. Moving a target updates dependents; incompatible edits are rejected. Disconnect to move independently. Deleting a target detaches its connections. Connections currently require upright, unmirrored routes and straight flat target landings; circular dependencies are rejected.


### Drawing routes in the viewport

Choose Floor (Flat, Stairs, Ramp), place a start on a surface, and drag its green bubble to draw the first section. Drag an endpoint's green bubble to extend that path; sideways drags create a corner landing automatically. Hover a straight flat section and drag a blue side bubble to branch. Releasing keeps the preview as one undoable change. Clicking a section selects it without choosing a continuation path. Gold handles edit length and stair/ramp height; purple handles edit width. Cyan target bubbles connect compatible routes, and earlier landing bubbles support rejoining while drawing. Hold Alt to bypass connection snapping.

Floor chooses the next section to draw. Sides edits the selected section and is inherited by its extensions. Settings contains precise floor shape, dimensions, step construction, wall finish, ceiling, ground fill, and the collapsible section list. Undo and Finish remain visible. New stair/ramp drawing inherits the preceding slope (or starts at a default slope); use the gold handle to set the desired height/angle.

Route handles use directional arrows for extensions and branches, a plus for the first start, a double arrow for width, a square for length/height editing, and rings for connection targets. Corner and return landings support branching and connections on all four platform edges, using their full footprint.

Ctrl+Z (Cmd+Z on Mac) undoes the last route draft change; Ctrl+Y or Ctrl+Shift+Z redoes it, including its placement, direction and route connections. Each completed drawing or handle drag is one undo step; during a drag it cancels that gesture. Text fields retain native text undo while focused.

All path drawing uses the same green arrow: drag to add path at that edge. The editor chooses continuation or branching automatically. Occupied edges do not show additional draw arrows. Resize squares, width handles and connection rings retain their separate shapes.

Route width is a single editable setting beside Floor and Sides. It sizes all stairs, ramps, landings and branches in the route. Automatic corners resize to fit; deliberately longer landings retain their length. The width drag handle and per-section width editing have been removed. Use separate connected routes when different widths are needed.

Solid railings and hallway walls sit inside the floor boundary: their outer face is flush with the stair/landing edge and thickness reduces clear walking width. Solid wall toppers use the wall thickness and the same mitred corner footprint, with no overhang or inset. Post railing handrail dimensions remain independently editable.

### Coruscant kit
The Coruscant toolbox is curated to two distinctive shapes: Skyscraper blade and Scalloped terrace. Use existing bodies and roofs for general tower construction. The inaccurate oculus crown and redundant experimental modules have been removed. All 10 sampled Coruscant textures remain available; see coruscant-sources.md for provenance.

Five reference-derived Coruscant pieces extend the curated palette: Curved tower shoulder, Swept spire, Raised landing deck, Acorn cap, and Curved support strut. View coruscant-kit-preview.html for labeled individual inspections, character scale references, and an editable sample download. Default heights range from 1.5 to 8 metres; every mesh is closed.

Coruscant also includes Half-round roof and Beveled tower body: a solid rounded roof and a flat-topped body with matching beveled footprints, 6 m wide and 3 m deep. The roof is 3 m high; the body is 4 m high and stacks vertically. Inspect the pair at coruscant-kit-preview.html?roof.

Texture theme → Coruscant now includes 12 rooftop-scene surfaces (22 total): night windows, louvers, weathered and riveted cladding, floor plates, interior wall panels, ceiling panels, walkway grates, and angular plating. Inspect two-by-two repeats at coruscant-texture-preview.html.

Route Sides → Kamino walkway adds a full tapered underbody and low beveled solid rails measured from the reference mesh inspired by the open kam_bldg_bridge1 Blender prop. It supports individual segments, ramps, descending stairs, turns and branch openings. Rail dimensions and finish remain independent of route scaling.

### Interiors connected to entrances

Select a building, choose **Edit entrances**, select an entrance, then **Edit connected interior**. The landing becomes a rectangular room at that entrance’s elevation, without creating floors below it. Use **Select / resize** to expand it, or **Draw room** to add adjoining rooms. The dashed blue line marks the inside of the building. Draw a door on a room wall at that boundary to create another exterior entrance; **Finish interior** saves the shared room layout and its route snap points. Either entrance reopens the same plan. Door sizes remain independent of the connected route. This workflow currently supports rectangular rooms; the regular interior editor still supports polygon rooms.

### Direct 3D interior editing

**Edit connected interior**, **Edit interior**, and **Interactive → Room** open the same 3D room editor. The building becomes a transparent ghost and cannot intercept room selection. Click rooms or select them in the sidebar. Gold handles resize rectangular room sides; the purple ceiling handle changes that room’s wall and ceiling height together. Separate numeric height fields remain available. Click a wall in the viewport to highlight it and enable **Add room beyond selected wall**. **Place door** and **Place window** follow the mouse with an opening outline; click a wall to place. Select an existing opening to drag its gold edge handles or green center. Windows support vertical movement and sill resizing. Escape cancels placement, and Ctrl+Z undoes each completed opening gesture. Windows at the shell boundary cut the exterior without adding route snap points. **Show solid shell** checks the exterior temporarily. **Plan view / openings** opens the same draft for detailed drawing and returns to 3D without saving to the scene. **Finish interior** commits the draft, **Cancel** discards it, and Ctrl+Z / Ctrl+Y undo and redo 3D edits. F frames the room. Polygon room outlines remain editable in Plan view.

To reach the other side of a building entirely in 3D, place or select a door on an outside-facing room wall and choose **Connect door to outside**. A green outline previews the passage to the shell; the action creates the passage and its exterior door together. Small gaps extend the existing room. Finish saves the new route entrance, and either entrance opens the shared interior. This shortcut currently requires a straight passage to a parallel exterior wall and rejects passages that overlap other rooms or leave the shell.

Interiors automatically carve other hull meshes in the scene. Entrance-connected rooms may extend across adjoining supported building hulls; the editor ghosts those neighbors. Entrance-connected rooms can also project beyond the hull to form enclosed overhangs. Room handles snap their outside faces flush to nearby parallel hull walls; continuing to drag releases the snap, and Alt bypasses snapping. Cuts are rebuilt from the room data, so removing an interior restores the underlying hulls. Routes and character references are excluded, and neighboring interior partitions keep their own geometry. Scene builds pass the project parts into buildPart's parts option so rendering, collision, and OBJ export share the same cuts.

Room and route workflow: **Interactive → Room** starts a movable preview anywhere on a surface. The 3D room editor resizes walls and ceilings and raises standalone rooms, ghosts intersecting hulls, and adds adjoining rooms with connecting doors. Select a wall or door and use Continue route to start an enclosed hallway, open path, stair, or ramp. Continue into a room at a route endpoint creates a room with a matching independent doorway, or opens its existing connected room. Door snap targets stay linked when rooms move; deleting a doorway detaches its routes. Editor handoffs keep the camera position.

Drag extensions: selected rectangular rooms show green wall arrows. Choose Room or Hallway, drag outward to preview, and release to create the extension and doorway. Near another room in the same plan, the extension snaps to its near wall and adds a second doorway; Alt bypasses snapping. Overlapping extensions are rejected. At a free route end, drag the purple room box forward to preview a room, or onto an existing entrance/room-door snap target to connect. Release enters room editing. Ctrl+Z reverses each completed extension, including returning from a newly created room to its route draft.

### Platform builder

Choose **Interactive → Platform** and click a surface; upright hull sides orient the initial deck flush to that face. Add rectangular/square, circular or half-circle sections with the green arrows or sidebar controls. **Round both ends** adds joined half-circle caps. Gold diamonds resize the selected section; cyan moves the platform and snaps parallel edges to nearby supported hull faces (Alt bypasses). Attached sections follow their parent when resized. Corner radius rounds rectangles; railings support posts, solid parapets or none. Elevation, thickness and railing height are adjustable. Blue edge rings save the platform and start a linked route; existing routes can also snap to platform edges using their normal cyan bubbles. Railings omit hull-adjacent spans and linked route openings. Finish saves one undoable project edit; Ctrl+Z undoes draft changes, Cancel discards them. Select the saved platform and choose **Edit platform** to reopen it. Platforms save/export as normal project geometry.

Platform sections now support route-style continuation: select a section and Continue straight / Turn left / Turn right, or drag a green edge arrow to preview the next section length. Turns keep the selected strip width and connect at its end, allowing L/U/wraparound paths; section buttons select the branch to extend. The route workshop offers Continue into a platform, preserving the threshold elevation and linking the incoming route. Blue platform edge rings continue with another route. Ctrl+Z in a newly created platform returns to the incoming route when no further draft edits remain.

Platform route connections: hover any exposed platform edge in the platform editor and click to start a route. The blue outline follows the pointer, with magnetic centers and 2-metre intervals; hold Shift for precise placement. Route drafts also snap to platform edges, and preview railing openings before saving.

Route turns: drag the green continuation handle in the desired direction. Headings lightly snap at 15-degree increments; hold Alt to bypass. Non-square turns use a shaped flat landing between straight flights. Select the landing and open Settings to edit Turn angle numerically. Branch from adjacent straight landings; custom-angle corners expose their continuation only.

### Curved route sections

Choose **Curved stairs**, **Curved ramp**, or **Curved flat** in the route editor’s Floor menu, then drag a green endpoint. The gesture fits a circular arc tangent to the incoming route; 15° magnets and Alt work as on straight turns. Select any section and edit **Selected section curve (°)** to bend it (positive left, negative right, 0 straight, up to 270°). The gold handle changes arc length and height; following sections keep a tangent connection. Tight bends retain at least 0.25 m of inner radius.

Curves use the existing width, step dimensions, sides, ground fill, surface snapping, route links, project serialization, export and draft undo. Tread depth is measured along the centreline; outer and inner treads naturally differ in depth. Rail posts are spaced along each side’s arc. Branch junctions remain on adjoining straight landings.

The curved-stair concept was reviewed against [Mark McKay’s Blender Stairs](https://github.com/blackears/blenderStairs/blob/master/source/operators/kitfoxStairsCurved.py) (Apache-2.0). Wonderblocks uses its own route-mesh bending implementation; no Blender Python source is included.

### Bespin walkway route style

Choose **Sides → Bespin walkway** in the route builder. Uses the selected Blender reference `bes1_bldg_ramp_32`’s measured cross-section: source width 4.98109, parapet thickness 0.48156, underbody shoulder 1.98958 below the deck and tapered bottom 3.98958 below it, with 0.54112 inset on each side. Hull proportions follow route width; parapet height and thickness remain editable. Plain parapets have no additional posts or cap trim. Square, return and free-angle corners share the hull profile, and curved sections use the route bend.

### Arched Bespin walkway

**Sides → Bespin arched walkway** retains the Bespin parapets and underbody and repeats the selected `arch30` mesh from `bes1_bldg_walkway_16`. Its 48 measured vertices preserve the flat crown, diagonal shoulders, recessed faces and flared feet. Source outer width 4.94817, height above parapet 2.86818, depth 1.94594; the four selected instances were approximately 6 metres apart. Default route spacing is 3.6 metres, adjustable under **Settings → Railings → Arch spacing**. Bays continue across compatible adjacent sections; corner landings stay clear. Narrow routes retain at least 2.45 metres of central headroom above the continuous floor profile.

Curved routes use a low-poly stepped shell and shared 15° boundary panels. Treads and side profiles follow the same faceted outline to avoid seams; short details no longer receive blanket 3° subdivision. A bare 24-step 90° or 180° flight is 242 triangles.

### Bézier highways

Choose **Interactive → Highway** and click-drag on a surface to draw the first stretch. Drag gold points horizontally and purple grips vertically. Blue tangent handles control bends; hold Shift while dragging a blue handle to change the slope. Drag the green endpoint arrow to extend. Cross-sections stay horizontal without banking. Finish saves the highway; **Edit highway** reopens it. Appearance uses Material mode.

Choose **Draw branch**, then drag from a road to draw an exit ramp or split. A highlight shows the junction; nearby quarter/midpoints snap when Snap is enabled. Branches keep their junctions anchored to the parent curve and inherit its direction. Choose a road using **Road**, or click its deck, to edit it. Width applies to the selected road; deck thickness, barrier height (zero removes barriers), and supports apply to the highway. Move a branch's gold junction point along its parent. A ramp stays level with its parent until it clears the shared carriageway, then follows its elevation curve.

With Snap enabled, dragging an endpoint onto an earlier road in the same highway creates a merge. **Detach merged end** frees its controls. **Remove branch** also removes branches dependent on it; undo restores them. Crossing or touching separate highways automatically joins their deck surfaces and opens barriers at matching elevations. Crossings at different heights remain overpasses. These junctions apply to highways; they do not create room doors or pedestrian-route attachments. Moving a separate highway away removes its intersection.


### Kashyyyk canopy patch

Find **Kashyyyk Canopy Patch** in Flora → **Leaves** and drag it onto bark. It uses layered cards with authored UVs and a cutout atlas at 90 triangles per patch. Patches have no joints, follow their host branch, and can be moved, rotated and scaled as surface parts. Leaf cards do not block the walker.

### Felucia flora

Choose **Flora → Tree presets** for six editable Felucia plants: Flared Pitcher, Slender Pitcher, Bladder Pair, Segmented Spore Stalk, Golden Whisker and Scarlet Bloom. Sixteen reusable native pieces are also available in **Flora**, **Leaves** and **Details**: hollow pitchers, inflated pods, spore bulbs, frills, whiskers, ground foliage, flowers, vent rosettes and feelers. The stalk joints carry their attached pieces when edited; surface pieces have no joints. Decorations can be dragged directly onto pitcher and pod skins and follow their host's movement, rotation and scale. Native diffuse textures and cutout flags preserve the colored skins and thin fringes; both diffuse maps and masks repeat at UV boundaries. Golden Whisker has an editable base trunk with a separate crown and individually skin-pinned hanging details. Native cropped stem stubs are removed, and Scarlet Bloom includes its green calyx with dependent red petals. Pitcher feeler stalks grow through their bulbs in the native model frame and follow the cup itself through movement, rotation and scale. Ground grass is omitted from all six presets.

### Kashyyyk bridge routes

Choose **Sides → Kashyyyk timber bridge** or **Kashyyyk suspension bridge** in the route workshop. These use the measured `kas2_bldg_bridge` and `kas2_bridge_1` geometry from the open Blender scene, original UVs, and the platform-edge/metal texture atlases. The straight samples are 102 and 532 triangles respectively. The rigid timber skin uses one deck datum, retains the authored underside and brings its end tongues flush with the route floor; collapsed end-step faces are removed. Source suspension sag is removed so route elevation and bends control the walking surface. Stairs, corner landings, ground-filled sections and junctions retain the existing route floor footprints; exposed suspension details leave branch entrances open. Deck, cables and supports can be painted separately in Material mode.

The suspension deck uses its original 256px woven-reed atlas, with double-sided alpha-cutout fringe along its ragged edges. The opaque central deck remains solid for walking; decorative fringe is excluded from walk collision even after mesh batching. The timber bridge retains its separate opaque atlas. Suspension ropes and struts retain their exact authored UVs and the original 512px BF1 `kas2_metals` atlas, whose layout differs from the identically named BF2 texture. They use the reference's matte, nonmetallic shading; generated corner cables also sample its rope strip.

Platform builder → **Platform style** now also offers **Kashyyyk timber platform** and **Kashyyyk thatched platform**, measured from the two circular landings in Blender. Single circular or elliptical decks preserve their original atlas UVs, alpha fringes, tapered bodies and supports at 142/210 triangles without pillars. **Body depth** controls the underside independently of deck size; **Supports to ground** is off by default. Enable it to add pillars that meet the actual underside and extend vertically to world ground (y = 0), automatically following elevation and transform edits. Style selection preserves the selected shape and dimensions. Rectangular and half-circle decks extrapolate the source wood/reed flooring, contour metal straps, tapered underside and supports into their chosen footprint; thatched decks also retain a cutout fringe. Extended decks retain one continuous union floor. Route anchors project onto the visible twelve-sided perimeter and follow resizing. Ordinary platform railings remain optional.

In **Material** mode, click a platform's deck, underside, pillar or railing to select that whole component, or choose it from **Apply to**. **Top / deck**, **Base / underside**, **Support pillars** and **Railings / rim** each have independent color, texture and repeat settings across Standard, Bespin and both Kashyyyk styles, including extended decks. Tint changes preserve imported textures and UVs; component finishes survive rebuilding, Undo/Redo and saving.

### KOTOR Kashyyyk walkways and platforms

Choose **Sides → KOTOR Kashyyyk walkway** in the route workshop, or **Platform style → KOTOR Kashyyyk platform** in the platform builder. The set follows the visible `m22ab_10a` Kashyyyk walkway imported from the local KOTOR installation: woven wood flooring, dark transverse timber dividers, a shallow woven fascia and a single uneven wooden handrail on slender six-sided posts. Posts stand on an inset wooden lip, 42 cm wide and 10 cm above the deck. Post spacing, thickness, height and rail attachment heights vary deterministically; beams rise and dip between their neighbouring posts. Corners and open ends stay anchored, curved perimeters are sampled as whole runs and the lip opens at route connections. Original post / rail profiles and wood atlas UVs are retained. Lamps, struts, surrounding tree meshes and collision meshes are excluded. Post spacing and railing dimensions remain adjustable.

Platforms support rectangular, circular, half-circle and combined footprints, with rail openings at route connections. Support pillars are off by default. Walkways follow route slopes, stairs, corners and curves using one closed walkable floor shell. Material mode offers independent platform top, base, pillars and railings, and walkway deck, underside, rails and posts. Tinting preserves the original wood textures; explicit texture choices replace them. Styles and finishes survive Undo/Redo and save/load.

Current interiors store independent floor, wall, exterior, ceiling and roof finishes explicitly; windows store their sill heights. Import does not restore missing Japanese finishes or infer missing window sill heights. Wall paths store straight edges with optional curves. Retired examples and obsolete revision builders are removed from the project.

### Running tests

Install dev dependencies with `pnpm install --frozen-lockfile`, then use installed Chrome or install the pinned browser with `pnpm exec playwright install chromium --no-shell`. `pnpm test` (or `npm test`) runs unit, browser and PowerShell integration checks. `pnpm run test:release` also runs the optional BF2 SDK gate and fails explicitly if the SDK is unavailable. Tests use isolated scenes and never install or launch a game. See [test commands and prerequisites](docs/TESTING.md#repeatable-test-gates).
