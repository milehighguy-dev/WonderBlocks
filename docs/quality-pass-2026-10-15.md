# Quality pass, 15 October 2026

**Audience:** Contributors and coding agents. Historical research and asset notes, not a user guide; details may no longer match the current app.

The working baseline was committed as `ed3e025` before this pass. The installed WBX map was kept intact; no game session was launched.

## Corrections

- Native dialogs protect scene/editor shortcuts. Walk preview also clears held movement keys while a dialog is open.
- Painting route/platform components and changing foliage alone reuse prepared collision. Physical edits still replace it.
- New and merged PC level requests load planning before their world. Malformed scopes and native-incompatible comments are rejected before writes; existing valid navigation and backups are preserved.
- Timber and thatched Kashyyyk platforms retain closed body shadows independently of their open decorations. Rendering hints do not create collision. Cuts invalidate affected construction and shadow hints.
- Thin swept spires retry a smaller inward shadow offset, preserving containment and triangle winding.
- Larger project and library backups reopen without the old byte-size gates. Object-count validation, malformed-data rejection and browser-storage error handling remain.
- Package validation identifies stale source assets before compilation rather than reporting misleading collision-budget failures.
- Graphics-context recovery redraws an idle viewport and refreshes its cached shadows automatically.

## Verification

- Full automated suite: 1,006 passing tests, with focused editor/export checks after subsequent changes.
- Native compilation covered all 123 exposed building parts, all 16 tree presets, 30 transformed route/platform variants and the full Wroshyr export.
- The Wroshyr package passed 572 native-model checks, 414 compiled deck-shadow coverage probes and 28 native route distant-model checks. Its planning has 251 hubs, 255 connections and one connected group. Native primitive and collision-mesh counts remain within their reserved budgets.
- Merge checks run in Windows PowerShell 5.1 and PowerShell 7. Four existing-world cases also compile through WorldMunge, PathPlanningMunge and LevelPack, preserving graph counts, barrier names and packed load order.
- Isolated browser checks cover modal shortcuts, cancellation/retry, undo/redo, project and library roundtrips, autosave, invalid imports and desktop viewport sizes. A 2.1 MB painted project and a 5.4 MB formatted library backup roundtrip successfully.
- Forty plant-edit cycles and 30 elevated-tree cycles retained placement and stable geometry/texture counts.
- A binary comparison of all 572 Wroshyr source models and 27 textures confirmed unchanged visible/LOD geometry, collision, textures and compiler options. Only two shadow payloads changed.
- An 18-minute Wroshyr orbit/collision-outline soak preserved the project and showed stable resource use. Its graphics-reset investigation identified the idle recovery bug above. After the fix, editor and standalone-preview recovery screenshots match their pre-reset images exactly, including the smaller example's shadows.
- Ten subsequent, spaced graphics resets restored the same 702 geometry buffers and 12 textures each time, preserved the project and produced a final image identical to the initial image.

These checks do not establish in-game AI movement. Open decorative surfaces may still omit solid shadow volumes. Shadow simplification remains an approximation for very fine ornamentation; an additional catalogue probe measured deviations up to about 11 mm. Collision does not use these shadow meshes.

## Repeatable integration checks

From the repository, create a fresh two-hub package. Replace the example output path with a new folder:

```powershell
node tests/swbf2-integration-fixture.mjs C:/temp/wonderblocks-navigation-check
./tests/swbf2-validation-preflight.ps1 -PackagePath C:/temp/wonderblocks-navigation-check
./tests/swbf2-navigation-merge.ps1 -PackagePath C:/temp/wonderblocks-navigation-check -NativeToolsPath C:/SWBF2_ModTools/BF2_ModTools/ToolsFL/bin
```

Omit `-NativeToolsPath` to run merge checks without the SDK. The preflight test never invokes a compiler. Tests create separate fixture/output directories and do not install or launch a map.
