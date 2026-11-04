# Automatic collision in Wonderblocks

Collision is derived when an object is created or its shape changes. The user
does not need to choose collision categories or draw colliders. The export
helper switch controls packaging of this prepared data. Walk view, **View → Collision outlines**, and SWBF2 export consume the
same object-owned physical representation.

## Shape rules

| Shape | Movement collision | Projectile collision |
| --- | --- | --- |
| Rectangular block, slab, wall, floor, ceiling | Exact oriented box | The same primitive |
| Small, nearly spherical solid | Inscribed sphere when sufficiently accurate | The same primitive |
| Door/window/stairwell opening | Separate construction pieces around the opening | Those pieces or the original cut surface |
| Stair flight | Closed ramp following the flight | Actual treads and risers |
| Sloping or curved route | Its physical deck/ramp surface | The same surface where appropriate |
| Open railing | Continuous barrier on guarded edges; conservative small detail primitives | Actual rails and posts, with their gaps |
| Solid highway barrier | Its closed wall profile | The same primitive or surface |
| Tree trunk, roots, branches | Bark skin mesh, with no internal bulk primitives | The same skin |
| Leaf cards, native leaf patches, leaf decorations | None | None |
| Other irregular solid | Bounded-error surface mesh | Shared surface, or a separate detailed profile |

Boxes and spheres are the only emitted primitive types. Cylinder primitives are
avoided in response to the reported vehicle behavior. This investigation did not
establish a particular cylinder defect in the executable.

The defaults are 1.5 cm of sampled surface deviation for ordinary solids, 5 mm
for irregular guard surfaces, and 5 cm for bark. Small railing details may use an
inscribed movement box with up to 10 cm of vertex deviation; their projectile
surface stays separate. Continuous guards provide the walking boundary. A large
or poorly fitting detail retains mesh movement collision instead. These are
internal rules, not controls the user has to understand.

A plain rectangular sheet uses an inferred slab (8 cm unless structural data
provides its thickness) for both movement and shots. This avoids a one-sided
projectile surface beneath a physically solid floor.

Primitive fitting never replaces a doorway, torus, cut floor or concave shell
with an enclosing box. Structural volumes retain the actual slab thickness.
Primitive unions merge only when their union is exactly rectangular; a gap,
different orientation or change of height prevents merging. Category bits
already covered by another containing primitive are removed. An exact solid box
does not need a duplicate projectile mesh.

## Grouped solids

Making an object group also prepares a shared collision solid for its construction
blocks. Touching rectangular members can collapse to one box. More complex
unions with common box axes use non-overlapping boxes; a concave notch or an air
gap is never filled. Overlapping members with different orientations use their
exposed surface, with buried faces and duplicate coplanar faces removed.

This happens during scene creation and edits, before export. Editable parts and
their render meshes remain separate. The object group keeps its original member
collision alongside the derived solid, so hiding or ungrouping a member restores
the correct independent shapes. Appearance-only rebuilds reuse the derived
state; membership, placement and physical shape changes invalidate it. A full
export snapshot includes hidden members without changing the editor's visible
collision.

Uncut closed convex construction envelopes identify buried faces. Rooms and
entrances are already cut from every intersecting member before the union runs;
their lining, floors, ceilings, props and stairs remain independently owned.
This preserves passages across both touching and overlapping blocks. Surface
reduction and contact partitioning still follow the ordinary mesh rules.

The optimization is conservative: a hollow or concave piece without a verified
convex construction envelope cannot hide another member's faces. Such faces
remain rather than risking a hole in collision. Trees, foliage, platforms,
routes and highway sections keep their existing specialized collision rules.

## Object lifecycle

Straight, level plain hallways can **Conform entrance to outer surface** in the
route editor. Select the tree or building and the route start/end. The enclosure
samples the original facade and trims its mouth to that surface; the floor
retains the outdoor connection. The modifier runs before collision preparation,
so outlines, walk view and export use the same shaped, closed wall volumes.
Copies remap the surface host when it is included, and detach the setting when
it is not. A missing host or a surface that cannot cover the aperture leaves the
original enclosure intact; the workshop explains how to correct the approach.

`src/core/geometry.js` attaches collision before rendering batches can discard component
metadata. `src/collision/object-collision.js` owns the shape rules; `src/collision/collision-service.js` owns
the cache and preparation queue. Collision is expressed in a part's position and
rotation frame, with its scale baked into physical coordinates. Moving or
rotating an ordinary rigid part reuses its shape. Scale changes rebuild it.
World-anchored route supports and guards include placement in their cache key.

The cache uses positions, indices, transforms, structural volumes and semantic
ownership. Tint, texture maps, UV projection and material transparency do not
choose physical categories. Editor cutaways retain the complete collision;
completely hidden objects are excluded from the current walk view.

Mesh reduction and contact-density preparation run in a browser worker. A new
object initially retains its complete physical surface while that work runs.
Superseded queued edits can be skipped, but an explicit walk/export request
requires its particular snapshot to finish. Undo can reuse or resume cached
states. A late worker result cannot replace a newer shape or a synchronously
prepared snapshot. The cache is limited to 512 states and approximately 250,000
surface triangles; one exceptionally large state can exceed that triangle
limit. Derived data is not written into the editable project JSON. Reloading
reconstructs it from the object's saved shape.

Walk mode builds spatial indices over those bodies and raycasts boxes and
spheres analytically. Surface indices are reused across walk sessions. The
walker still has its own movement solver; sharing physical geometry does not
make it an emulation of the game's soldier or vehicle physics.

The normal export UI waits for the prepared scene data. `src/swbf2/export-swbf2.js` applies
coordinate transforms, logical ownership, route splitting, native body limits
and file serialization. It does not fit, simplify or author collision. The
programmatic exporter also accepts a plain project definition; that path
first instantiates runtime objects synchronously through the same object rules.
Supplying a prepared collision map avoids that initialization. Active Flora
drafts and changed export snapshots automatically instantiate the final shape
through this same object builder.

## Engine evidence

The investigation used the existing labeled `BF2_modtools_NoDVD.exe` in the
read-only Ghidra `Boarding` project, with image base `00400000`, and the installed
Mod Tools Art Guide. The following are addresses in that particular Mod Tools
binary, not assumed retail executable addresses. Recovered symbol labels are
useful context; important enum and capacity conclusions were checked against
instructions or concrete loader behavior as well as decompilation.

| Function/address | Observed behavior | Consequence |
| --- | --- | --- |
| `CollisionModel::AddBody`, `00433c10` | Rejects the 65th body; category membership uses two 32-bit body bitsets | Limit is 64 **total bodies**, including meshes |
| Primitive loader, `00428be0` | Reads `MASK`, `XFRM`, `DATA`; file shapes 0/2/4 are sphere/cylinder/box | Emit 0 and 4; file and internal enums differ |
| `SetBox`, `004370a0`; `SetCylinder`, `00437050` | Internal box discriminator is 2 and cylinder is 4 | Do not interpret the internal enum as the MSH file enum |
| Mesh loader, `00431e70`; constructor, `004284f0` | Reads `MASK`, `POSI`, `INFO`, `TREE` and copies the mesh mask into its collision body | Preserve native categories and spatial data |
| `SetCollisionMask`, `00435710`, and `AddBody` instructions | File bits 1/2/4/8/16 select soldier/vehicle/building/terrain/ordnance | Runtime object-type flags are a different enum |
| `I_AddBody`, `0042da60`; TreeGrid `00494ca0`, `00496c70` | Inserts whole objects into an XZ spatial hierarchy, selecting level from horizontal diameter | Oversized or unnecessarily grouped objects worsen broad-phase locality |
| `CheckForCollision`, `00434860` | Filters body pairs with category bitsets and bounding radii before dispatch | Redundant interior primitives still have an iteration cost |
| `InitMeshCollision`, `0043c730` | Transforms the moving object's AABB into the static mesh frame and clears the polygon containers for a fresh query | Local density around a contact matters more than total triangles alone |
| `CollisionObject::CheckForCollision`, `00435f10`; mesh receiver, `004285b0` | Resets the mesh-contact reuse flag for the object pair; the receiver enables reuse within that pair | Separate placed helpers do not accumulate into one unchanged contact container |
| `GetTriHits`, `004336c0`; traversal `00432ed0` | Uses three soldier-local caches of up to 70 polygon leaves; rejects spatial AABBs | Keep contact neighborhoods modest and spatially coherent |
| `PolyListContainer<100>::AddPolygon`, `00432e40` | Silently omits additions at 100 polygons or when accumulated vertices would reach 300 | A triangle-only contact batch admits at most 99 triangles |
| Mesh traversal `00432ed0` | Limits a single polygon to 100 vertices | Validate compiled polygon size, not just source triangle counts |
| `CollisionModel::RayHit`, `004359c0` | The ordnance-filtered path uses the ordnance body bitset | Movement barriers can exclude bullets without losing walking protection |
| Mesh ray traversal, `00432560`, `004327d0` | Traverses the collision tree and tests polygon leaves directly | Detailed projectile meshes do not use the same contact polygon container |
| Terrain queries, `0054c1c0`, `0054c350` | Have a separate heightfield collision path | Object collision should not duplicate the map's terrain |
| `EntityProp` constructor, `00522a10`; `RecalculateAABB`, `00522110` | Uses physical body bounds during initialization and render model bounds during recalculation | Model bounds must cover both rendering and collision |

Static objects use runtime type `0x10`; soft soldier bodies use 2 and rigid
vehicle bodies use 8. Runtime ordnance uses `0x400` in the geometry-category
setter. These values must not be substituted for file mask bits. Wonderblocks
uses mask 7 for movement-only bodies, 16 for projectile-only bodies, and 23 for
solids shared by both. It does not include the terrain bit in ordinary props.

The Art Guide says that ModelMunge merges mesh collision within one model into
one category mesh. Different category profiles therefore require separate
native models. Dense movement profiles also retain their object ownership and
spatial partitions rather than being combined into one crowded object group mesh.
One merged mesh leaves room for 63 primitives in its model. Extra primitive sets
are placed in helpers of at most 64 bodies.

## Surface preparation and native packaging

Reduction checks edge topology and preserves open boundaries. The maximum
plane-error rule limits candidate collapses. Both original-to-reduced and
reduced-to-original distances are sampled at vertices and face centers; a
reduction exceeding the shape's tolerance is rejected. This is a sampled
accuracy check, not a mathematical Hausdorff-distance certificate.

A nominal 1,200-triangle mesh target is not a safety threshold. Locally crowded
surfaces attempt further bounded reduction toward a 64-triangle contact budget.
The object service then measures representative contact neighborhoods using
orientation-independent cubes with half sizes 1.25 m and 6 m, plus soldier
and vehicle AABB profiles. A larger tangent cube does not necessarily enclose
a smaller tangent box at an oblique face, so both kinds of probes are needed. The latter covers
ordinary vehicles but is not a promise for every possible custom vehicle.
Spatially crowded profiles split recursively until the tested neighborhood is
within the budget. Sparse portions can retain larger meshes. A portion with 64
or fewer total triangles stays below the inspected candidate container's vertex capacity for any query
size. Partitions retain the original surface union: no caps, walls across holes,
or manually authored fixture colliders are added.

The 64-triangle target is a conservative preparation margin, not the native
container size. Native PC candidate storage allows at most 100 polygons and
strictly fewer than 300 polygon vertices. The exporter reviews infantry and
vehicle profiles separately when recommending helpers; it does not translate
every preparation partition or oversized-cube flag into a requirement. See
`swbf2-export.md` for the recommendation's stock calibration and limits.

Sub-millimetre intersection slivers are welded or removed from the physical
surface before fitting and reduction. Native compiler testing showed that such
fragments can lose their entire polygon tree and crash ModelMunge when emitted
as separate helpers. Ordinary structural thickness remains intact.

Trees, partitions, concave coplanar faces and faces with holes disable native
collision merging automatically with `-donotmergecollision`. Safe convex faces
remain eligible for normal compiler optimization. This protects physical
geometry while avoiding blanket disabling of all optimization.

Collision helpers carry a fully cutout two-triangle render surface spanning
their bounds. Earlier gameplay testing established that collision/skeleton-only
models could compile but fail as placed world geometry without a native `modl`
record. Helpers are included in the world/layer placements and inventory. Render
bounds include collision extents; nonuniform and mirrored scales are baked before
native rigid transforms are written. A source `SINF` box alone is insufficient:
ModelMunge derives native render bounds from render vertices. If physical bounds
extend beyond them, export adds an invisible carrier to that visible model too.
A native probe confirmed that the compiled bounds cover the original primitive
without changing its transform or dimensions.

Shadow volumes remain separate from collision. They must have reciprocal edge
twins and closed faces. An invisible movement guard must not cast a solid-panel
shadow across visible railing gaps. A stair deck shadow can reuse the object's
closed ramp profile.

## Verification and limits

The exported validator compiles source into a fresh folder with the installed
ModelMunge, TextureMunge, OdfMunge and WorldMunge. It checks assigned native
collision masks, body counts, primitive shapes/dimensions, finite collision
vertices, valid polygon indices and the engine's 100-vertex polygon limit. It
checks preserved small contact partitions, loadable native render records,
source and compiled shadow closure, and distant-model records.

Independent diagnostics sample compiled movement polygons against soldier and
vehicle AABBs, compare source collision to compiled surfaces, and probe bridge
guards, deck shadows and fixture spawn clearances. Browser tests confirm that
ordinary export performs no new collision builds, rapid edits do not publish
stale results, cancellation works, and source project data remains unchanged.

Native compilation and geometric checks cannot establish final game movement,
vehicle handling, projectile edge behavior, AI navigation, or retail executable
equivalence. No game session was launched during this investigation. AI paths,
regions and terrain setup remain responsibilities of the existing Mod Tools map,
not of this object collision system.

Raw read-only research and independent audit scripts are retained in
`../../work/collision-engine-research/` relative to the repository root.


## Verification checkpoint, 13 October 2026

The final implementation uses collision rule version 13. All 935 JavaScript
regression tests passed. Eight complete native fixtures compiled with no errors:

| Fixture | Native models |
| --- | ---: |
| All 126 building styles | 224 |
| Connected gallery and interior stairs | 6 |
| KOTOR Kashyyyk paths and platforms | 50 |
| Mature kapok | 107 |
| Felucia plants | 34 |
| Highway network | 17 |
| All 13 saved flora presets | 243 |
| Wroshyr village scene | 205 |
| **Total** | **886** |

All fixtures retained their assigned collision masks and valid native render
bounds covering physical geometry. Independent compiled-polygon audits reported
no contact-container overflow candidates at the tested soldier and vehicle
contacts. A separate small-orb fixture verified native sphere output, including
its unused dimension fields.

The giant Wroshyr tree retains one shared skin body with 10,479 triangles and no
internal primitives. An independent Blender reader sampled 24,776 bark vertices
and face centers: maximum distance to compiled collision was 0.02544 m, with
99 percent within 0.01106 m. Native compilation moved no collision vertices.
Bark material flags remained opaque (`1`). There were no misses among 147
compiled bridge deck-shadow probes or 2,055 movement-guard probes. All five
fixture spawn points retained floor support and 2.2 m of upward clearance.

Browser checks showed zero new collision builds during normal export, unchanged
project JSON, correct rapid-edit completion, and successful walk preparation
cancellation/restart. Placement ghosts, library thumbnails, OBJ-only drafts and
live route previews skip physical preparation; committed objects own it. Cold
large-tree and long-route construction still has a measurable main-thread cost;
mesh reduction runs in the worker, and geometry cache reuse was about 4–5 ms in
headless browser measurements. These timings are diagnostics, not a game FPS
claim. A 10,000-ray walk-index sample completed in approximately 134 ms during
concurrent browser checks.

The workspace test addon was rebuilt from the generated source package. Its
mission, addme script and localization files remained byte-identical to the
working installed versions. The installed addon was not changed. No game was
launched; gameplay remains an in-game validation step.

Curved routes also bend closed construction volumes with the same panel boundaries as their visible geometry. This includes the native KOTOR rail profiles and hallway shells; their original straight volumes must not remain inside a curved walking lane. Collision rule version 15 invalidates older prepared bodies. The curved-rail regression covers both bend directions, transformed landings, ramps, and ascending/descending stairs.
