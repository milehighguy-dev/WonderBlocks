# Verification

## Repeatable test gates

Install the pinned test dependencies with `pnpm install --frozen-lockfile` (or install the dev dependencies with npm). Production/editor code remains dependency-free. Browser tests use bundled Playwright Chromium when installed, otherwise an installed Chrome. To install the pinned browser, use `pnpm exec playwright install chromium --no-shell`. You can explicitly select a browser with `WONDERBLOCKS_BROWSER_CHANNEL` (for example `chrome`).

| Command | Checks |
| --- | --- |
| `pnpm test` / `npm test` | All unit/geometry tests, real browser integration, and PowerShell preflight/merge tests |
| `pnpm run test:unit` | Node unit/geometry tests, including every saved example and independent ZIP extraction |
| `pnpm run test:browser` | Real editor UI, isolated downloads/storage, and actual module workers |
| `pnpm run test:integration` | Browser plus fresh-package PowerShell preflight/merge checks |
| `pnpm run test:native` | Native planning merge plus model/texture/ODF/world compilation and compiled-data checks |
| `pnpm run test:release` | Unit, browser, PowerShell and native gates in sequence; stops at the first failure |

The combined/integration gates require Windows PowerShell. Unit and browser checks can run separately on other systems. Native tests require the BF2 PC SDK; set `SWBF2_TOOLS_PATH` if it is not at `C:/SWBF2_ModTools/BF2_ModTools/ToolsFL/bin`. Missing compilers fail explicitly as unavailable; they never count as a pass. They generate new short temporary directories and preserve compiler logs for inspection. Each external integration stage has a bounded timeout, which stops its owned process tree on Windows. No test installs an addon or launches the game.

Browser tests start a temporary server on a free port and a fresh headless browser context, preserving open user tabs and storage. They check palette placement and keyboard Undo, selection/duplicate/history, object group rename/search/hiding, project download/import/reload, invalid import preservation, Flora draft save/finish, route/platform/interior scope transitions, real curved-room controls and cancel, exporter validation/reopen, downloaded packages for all four collision/AI navigation combinations, with identical physical assets when only AI changes, scoped standalone asset downloads and preview counts, yellow selection feedback, blocked autosave, and narrow layout. The actual collision/flora worker scripts run success/error/subsequent-edit jobs. Existing fast worker-controller tests retain stale-result/cancellation coverage. Failed browser runs save a screenshot; artifact directories are printed even on failure. In restricted execution environments, localhost/browser/native process access may need approval.

The ZIP test uses JSZip's independent parser with CRC verification, compares every filename and payload, and explicitly checks local and central UTF-8 flags and directory offsets. It rejects damaged payloads. Both audit mutations (zero archive CRCs and missing Unicode flags) now fail. Saved project tests enumerate the real example directory rather than reconstructing examples through their generators.

Standalone native fixtures cover a combined MSH + ODF with collision attachments, a tree baked into an MSH without ODFs, and a 66-primitive object group requiring a collision helper. Their validators accept packages without world or ODF folders. Native scene fixtures include an Endor tree, curved KOTOR stairs/railings, an interior doorway, and enough interior objects to exercise primitive-budget fallback. The existing generated package validator checks compiled collision, rendering/texture data, file dependencies and planning. Successful compilation does not establish game loading, spawning or AI behavior.

## Meridian route editor performance

216 route, platform and wall checks pass, along with all 15 browser integration checks. The Meridian browser case opens the real 278-part district and its 13-section East continuous tenement mass. Changing sections and hovering must dispose no model geometry; the 250 snap rings must share one reusable instance batch. Length changes, dragging the live gold endpoint, Undo and Redo must still update the route. Cancel returns to the unchanged scene. The suite also confirms editor transitions, save/load, exports, workers and cutout rendering remain functional.

Standalone measurements on this machine reduced destination-guide calculation from 5,239 ms to about 35 ms while preserving all 250 targets; fitting endpoint candidates fell from 5,689 ms to about 265 ms. These are CPU measurements, not an FPS guarantee. Guides inspect host landing geometry directly, and snap probes resolve only their dependency chains. Lightweight flat rings use one sixth of the former torus triangle count. Hover only refreshes handles; section selection reuses preview geometry; actual shape, transform, gesture-state and context changes invalidate the preview. Only changed neighboring routes and connected platforms rebuild. Tests check transformed ancestors, width limits, hidden targets, cyclic links, input preservation, ring resources and camera sizing. The browser fixture uses the visible top Finish action and waits for the specific validation error rather than matching progress counts.

## Japanese defensive wall builder, 2026-10-18

The corrected roof mapping passes 59 focused surface, pattern, material, route-finish and wall checks. The first unwrap incorrectly kept equal UV stations at diagonal corner ends, shearing all the rows along a straight run. Straight sections now project each vertex along its ridge; curves keep radial stations. A regression checks physical tile alignment on 60- and 90-degree corners rather than requiring artificial UV continuity across the corner cut. Other cases cover rotated/nonuniformly scaled walls, usable UV area on every face, continuous clockwise/counterclockwise curves, repaint density and exported UV preservation. Visually verified the failure and correction in an isolated in-app browser, using top and angled views of `tests/integration/fixtures/japanese-wall-roof.html`; the user's scene was untouched. The full browser suite now also passes, including the Wall builder and separate Roof painting.

The roofed version passes 65 focused wall, arch, Japan, material and finish checks; the earlier unroofed addition also passed 94 related model, material, route and railing checks. New cases compare the gallery proportions and clear openings, check primitive collision at the sill/posts, cover curve sampling and shared corner posts, roundtrip separate component finishes, reject the style on stair routes, and verify the standalone export retains five exact collision primitives. Roof cases verify closed swept caps, matching mitred rings at corners and curved panels, preserved open bays, independent roof colors/textures, save/load and SWBF package output. The browser regression exercises both wall choices, draft undo/redo, Finish, reopen and painting the Roof target.

## Standalone asset exports and selection, 2026-10-18

All 1,079 unit/geometry tests pass. Thirteen isolated browser checks cover scoped object group downloads, both standalone formats, all collision/AI combinations, the export preview at desktop and narrow widths, preserved scenes/selections, and tree cutouts without shader errors. Visual inspection confirmed yellow geometry highlights on object groups and foliage. Focused checks also cover mirrored static cards, bottom-center origins, long asset-name uniqueness, and safe overlay disposal.

The existing native gate passes, including the 292-model scene fixture and native planning/barrier merge checks. Three additional standalone packages compile and pass native collision/render checks: an object group with attached collision helpers (two models), an MSH-only tree with baked foliage and collision excluded (one model), and a 66-primitive object group retaining overflow in an attached helper (two models). No addon was installed or game session launched; attached helper gameplay remains a separate in-game check.

## Test consolidation, 2026-10-16

The unit suite now has 1,072 passing tests (previously 1,075), with no failures, skips or cancellations. Tapered walkway and Bespin seam checks share a style table while retaining both measured profiles and all four turn directions. Whole-route width checks share the original stepped-route widening/narrowing and oversized-corner fixtures, retaining endpoint, override and source-immutability assertions. Flora save contracts use add/replace and empty/invalid case tables; the editor keeps a focused delegation check for morphs and deletion. The 37 affected tests and the complete unit suite pass. This cleanup changes tests only; it does not remove distinct geometry fixtures or change application behavior.

## Audit fixes verified, 2026-10-16

The combined release command passed 1,075 unit tests with no failures/skips, ten real-browser checks, package preflight/merge tests, four native planning merge cases and a 292-model asset package through the SDK. The model fixture covers trees, curved KOTOR routes, doorways and primitive-budget mesh fallback. The two deliberately damaged ZIP mutations now fail the independent-reader test. The actual worker results are compared against finished geometry, including a changed second edit and recovery after an error. All tests use separate browser contexts and temporary packages; user scenes and installed maps were untouched.

## Current-format cleanup, 2026-10-16

All 1,044 automated tests pass. Retired URL aliases return 404. Exporters import shared collision and simplification functions directly; the compatibility entry modules and redirect map are removed. Wall projects reject obsolete turn-based segments, and the retired separate temple roof and pediment parts are rejected. Interiors require an explicit roof finish, including on each floor. All 28 bundled projects validate with these rules; 55 saved plans now store their existing roof appearance explicitly. Browser checks created and finished a new room and loaded the current KOTOR example.

## Folder organization, 2026-10-16

The existing 1,040 automated tests pass after moving source modules, examples, previews and styles into their feature folders. `tests/project-layout.test.js` verifies local module and asset paths and the serverâ€™s canonical paths, query strings and entry page. Retired URL aliases are rejected. Run all tests from the project root with `npm test`.

Browser checks loaded the tree example, opened the Flora editor, checked the palette for missing images. The tree example rendered without browser errors. All 28 relocated saved scenes were compared with their previous versions and retain identical project data. Personal character geometry and textures remain local and ignored by Git under `assets/character/`.

## Initial verification, 2026-09-27

`node --test tests/model.test.js`: 6 passing tests.

- Example project JSON round trip.
- Rejection of malformed projects, duplicate IDs, invalid colors/transforms, and excessive part counts.
- Undo/redo restoration and redo invalidation after a new edit.
- World-space X reflection of rotated, nonuniformly scaled geometry.
- Finite, nonempty geometry for all 12 parts.
- Mirrored OBJ triangle winding and valid vertex indices.

Browser checks in the Codex in-app browser:

- Visible WebGL scene and original example building.
- Object group selection, duplicate, and undo (part count increases then returns).
- Keyboard numeric position edit to X=1.25 and mirrored copy at X=-1.25; undo restored prior project.
- Save project and Export OBJ actions invoked; export success status displayed.
- Desktop and narrow preview layouts inspected; narrow layout adjusted to avoid horizontal overflow.
- No browser errors reported during these checks.

Project import validation is unit-tested; the native file-picker import flow was not exercised end-to-end. The Windows double-click launcher is provided but was not launched during testing; the editor was served with `node server.cjs`. No claim of reference compatibility or behavioral parity is made.

## Version 0.2 verification

10 automated tests pass, including all 40 part geometries, extreme deformation settings, deformation serialization/validation, bulge behavior.

Browser checks: original 18-part project restored on reload; new roof thumbnails rendered; bulge and twist sliders changed by keyboard and were undone; two placements with repeat and mirroring enabled changed counts 18 â†’ 20 â†’ 22, kept placement active, and two undos restored 18. No browser errors were reported. Wall alignment is implemented but has not received exhaustive interactive coverage on all shapes. Game fidelity remains an independent approximation.

## Classical kit verification

13 automated tests pass. Checks cover finite geometry and normals for all 52 parts at extreme shape settings, shared three-unit column height, a ray passing through the center of the temple doorway but hitting its jamb, and temple project serialization/OBJ export. Browser inspection confirmed the Classical thumbnails and 40-piece temple example render without reported browser errors. Undo restored the prior 18-part project.

Roof cleanup: 15 tests pass, including roof/pediment envelope checks and solid-corner/open-center frame checks. Browser preview of the 25-part temple showed the smooth shallow roof and continuous molding without reported console errors.


Smooth columns: all 16 tests pass. Circular shaft cross-sections are checked against the retained fluted variants; all six column types share ground level and three-unit height. Browser verification confirmed all three smooth variants alongside the original columns.


Half temple roof: all 17 tests pass, including matching full-roof bounds after mirroring, project round trip, and extreme deformation checks. Browser verification confirmed the new Classical part is available.


Surfaces: all 20 tests pass. Added deterministic/distinct texture generation, surface validation and project round-trip tests, mirror/history preservation, and projected-UV/accent-material checks. Browser checks confirmed Brickwork on the temple foundation, repeat adjustment, preservation on duplication, and undo back to Plain with 123 original parts. Desktop rendering and the narrow preset picker were inspected; no browser errors reported.


## Rebuilt castle compound

The generator and saved `examples/projects/castle-compound.building.json` now contain the same 310-part Gate, Garden & Keep scene. Thirty-one focused compound, geometry-budget, human-scale, Japanese-kit and Japanese-wall checks pass. They cover native builder serialization, finite OBJ geometry, actual gate and room-door clearance, platform edge anchors, foundation support and exposed treads on all four ascents, including the curved return. Obsolete checks tied to the former arrangement of loose curtain-wall pieces were replaced.

The isolated browser suite also opens the compound from `?demo=castle-compound`, enters its wall, platform and interior editors, cancels each and verifies the saved project remains unchanged. The complete suite has 16 browser checks. The user's open project and browser storage are not modified.

Stair connection regression: endpoint fitting now captures the existing tread depth before changing the run, including implicit `run / steps` dimensions. It no longer replaces omitted tread depth with 0.3 m. Tests cover platform and route endpoints, explicit and implicit pitch, longer fitted runs and repeated resolution. Both courtyard approaches in the generator and saved castle must retain six steps in each flight, with matching 0.6 m treads and 0.2 m risers. All 233 route/platform/wall/compound/human-scale/budget checks pass. The browser check also verifies the saved six-step flights and captures their close-up.

Export file summary: the dialog lists placement, object, mesh, texture, compiler-option and optional AI file types before download. Existing browser export checks compare every advertised extension with the downloaded ZIP for all four collision / AI combinations, verify renamed ZIP and world paths, and check that asset-only and MSH-only modes omit world / AI files and ODFs as appropriate. The complete 16-check browser suite passes, including the narrow layout check. Export file generation itself is unchanged.

View fog control: an isolated browser check observes fog on the rendered scene, verifies the original 50% range and the stronger 100% range, turns fog off, frames the scene while it is off, then restores 50% without adding project Undo entries. The menu is captured in `view-fog.png`. The slider is editor-only and is retained across framing, including scene-specific fog ranges.


Asterfall showcase: three scene checks cover saved/native project parity, finite geometry and an 80,000-triangle / 750-batch ceiling; connected platform endpoints, two independent route loops and short human-scale flights; sampled bridge floors, 2.3 m headroom and unblocked railing connections. These checks found and corrected the wheel clearance and an elliptical island trim overhanging a stair approach. The complete 18-check browser suite passes, including opening Asterfall, entering/cancelling its route/platform/room editors without changing the downloaded project, and all six presentation views. The presentation builds the saved project with the same native geometry and prepared interior-cut cache as the editor. No game installation or native map munging was performed for this scene.


Asterfall surface regression: a fourth scene check compares projected triangle overlap on shared planes across native objects, above sea level. It covers the dressed cliff caps, decks, rims, cliff tiers, abutment collars and spillways; submerged internal faces are excluded. Structural caps now terminate inside deck thickness instead of sharing the walking surface. Cliff tier tops and bronze trim also have separate heights. The browser presentation check captures the harbor deck close-up in `asterfall-harbor.png`.

Cinderlock: five focused scene checks verify the saved generator output, finite native geometry, a modest geometry budget, real soldier movement through all three terraces and both control-booth stair approaches, sheltered spawn sightlines, and separate route footprints. They include gravity on descents. The complete 19-check isolated browser suite passes: native room/route editing can be cancelled without changing the saved map, all six presentation views render, and blockout/cutaway toggles work without shader or page errors. The separate CLF game package also passes SDK compilation, packed planning/barrier/texture/collision audits, all 20 spawn footprint/headroom checks, native CP/path transform checks and preservation of six localization tables. These are static and editor checks; game loading, spawning and combat need a user playtest.


Yavin aqueduct and broad-bridge correction: 111 focused checks pass. The mixed aqueduct route is tested for floor continuity, soldier headroom, open sky between enclosed piers, complete wall/roof/pier faces, independent finishes, save/load and native collision export. Broad-bridge supports are tested as solid full-width slabs with transverse underpasses between them, including split-span spacing and closed curved/corner geometry. Isolated browser checks cover eight palette choices, adding/switching both aqueduct section types, pier dimensions, independent roof painting, broad bridge controls and saving/reopening. Source measurements, native slab renders, browser results and the focused test log are recorded in the Yavin inspection work state.


Aqueduct ground-fill follow-up: 126 focused checks pass after replacing fixed-depth covered piers with identical open/covered default undersides and an optional aqueduct fill. Checks cover exact default underside parity, dynamic ground anchoring before/after moves, ramps, turns, minimum-radius curves, mirrored/rotated/nonuniform scale, closed support meshes, non-collapsed UV triangles and persistent texture density through height changes and repainting. Isolated browser verification covers default fill-off, the aqueduct-specific toggle, undo/redo, cover switching, section extension and saving/reopening after height changes. The comparison and corner screenshots are in the Yavin inspection state.


Aqueduct ramp mapping follow-up: 129 focused checks pass. Three new regression checks verify a uniform soffit through flat/ramp/flat joins, texture courses following rising and descending ramp faces on walls/roof/curbs/underside, actual route-distance tiling, and shared UV phase at grade boundaries. Browser screenshots reproduce the user’s floating descent example and inspect a covered version from above. The aqueduct fill/default/undo/save browser checks also pass with the obsolete underside-depth control removed.


Yavin · Temple of the Rainwell: four scene checks pass. The saved native project equals the generator output and builds finite geometry within a 55,000-triangle / 600-batch limit. Soldier walking checks traverse the main stair/bridge/sanctuary entrance, the entire high aqueduct and terrace return, the east creek flank and the west creek stair/transverse bridge underpass. All six browser presentation views, foliage/cutaway controls, editor save parity and walk preparation/exit pass without browser exceptions. Final scene: 245 parts and 38,217 triangles. The work state and screenshots are in the Rainwell work folder. No game deployment was requested.


Scene loading: `node tests/integration/scene-loading.mjs` (or `npm run test:loading`) verifies the startup bar before imports, progress across animation frames, completion after the first frame and editor controls are ready, file imports, empty scenes, invalid-file preservation, example switching and Undo, startup failure/retry, queued requests, and Rainwell preview loading. Scene construction yields between batches. The loading checks are included in all/integration/release test runs. All 20 existing browser checks also pass after waiting for scene readiness before interacting with loaded fixtures; module/asset and canonical-server checks pass. Screenshots and results are recorded in the scene-loading work state.


Example cleanup: the saved project folder and generator directory are checked against the same 15-entry catalogue. Production modules and previews cannot import test fixtures. Geometry, room, connection, collision and export regressions use reduced test-only inputs rather than retained demo scenes.
