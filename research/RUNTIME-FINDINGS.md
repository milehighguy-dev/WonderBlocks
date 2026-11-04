# Reference runtime investigation — 2026-09-27

**Audience:** Contributors and coding agents. Historical research and asset notes, not a user guide; details may no longer match the current app.

## Outcome

Launching the installed game made a substantial difference: its loaded executable contains readable x86 code. A read-only snapshot allowed actual function decompilation, including a shared model writer and paint-field readers. This supersedes the earlier static-only limitation in [EDITOR-FINDINGS.md](./EDITOR-FINDINGS.md).

This is function-level evidence about a shared creation format. It is not yet a reconstruction of the Building Creator, a verified building-file importer, or a trace of actions performed in its UI. Wonderblocks application code was not changed by this investigation.

## Capture and reproducibility

- Installed executable: `<local reference executable>`, version 1.3.0.29.
- On-disk SHA-256 remained `e75cbb34396050b15fb1302600968075455eeb0bb1bd6386f8bd7fabebe892c6`.
- Capture time: 2026-09-27 20:42:20 UTC; process 26120; loaded base `0x00860000`.
- Read 21,839,872 bytes from the main executable's mapped image in 4 KiB pages, with no unread pages. No other process or arbitrary heap range was captured.
- Used `OpenProcess` with query/read rights and `ReadProcessMemory`. No writes, injected code, debugger attachment, process suspension, or installation changes were used.
- The snapshot was captured without suspending the game, so mutable data is not guaranteed to represent a single instant.
- `.text` entropy changed from 7.999989 bits/byte on disk to 6.632755 in memory. More decisively, Ghidra successfully disassembled and decompiled coherent routines and their helpers.
- An analysis-only PE reconstruction mapped runtime section bytes to file sections and used the actual loaded base. It was never executed. It retains limitations such as omitted virtual-only section tails and runtime-resolved imports; it is not a restored distributable executable.
- Ghidra 12.1.3 recognized 52,456 candidate functions before its 240-second automatic-analysis limit. Analysis was incomplete; this number is not a count of validated functions. Focused decompilation then completed for the functions discussed below.
- Automatic string cross-references were not populated in the initial survey. Literal address occurrences were located in the runtime code and the containing functions inspected directly. A literal match alone was not treated as proof of behavior.

Raw memory, reconstructed binary, Ghidra project, and decompiler output remain under the task's `<external research workspace>` directory, outside the application repository and distributable. This report includes findings and addresses, not recovered executable code.

## 1. Per-block paint entries include regions and two colors

The writer at runtime VA `0x0091d750` (RVA `0x000bd750`) produces a `<source-specific label omitted>` document containing `blockref` entries. Within each block it conditionally writes a `paintlist`, then iterates its paint count and writes:

| Field | Observed representation |
|---|---|
| `paintregion` | A 32-bit value formatted as hexadecimal |
| `paintid` | A separate 32-bit value formatted as hexadecimal |
| `color1` | Three components |
| `color2` | Three components |

The IDs are emitted by helper `0x0091f9c0`; three-component values by `0x0091fa80`. The color labels come from UTF-16 strings at `0x0185104c` and `0x0185103c`. Their color space, range, and shader interpretation have not been established.

The writer reads a paint count at block offset `0xd4`; its region IDs begin at `0xd8`, paint IDs at `0xf8`, and the two color arrays at `0x118` and `0x178`. These are observations for this captured build and routine, not a stable public API.

Corresponding read helpers at `0x0091f670` and `0x0091f6d0` check that the current paint-entry count is below eight. The completion helper at `0x0091f730` increments it only below eight. This validates an eight-entry bound in this particular parser path. It does **not** prove that every part offers eight user-visible paint regions.

**Independent Wonderblocks direction:** use a list of region assignments per part, each with a preset and editable colors. A temple roof could expose roof surface, pediment, and trim as separately paintable regions. Our current single primary-material preset is a simpler model. An eight-entry limit need not be copied into Wonderblocks.

## 2. Symmetry and hierarchy are serialized relationships

The same writer includes:

- `snapped`, written through a boolean helper.
- `childlist` containing `childid` values.
- `symmetric`, written only when its index is in range and differs from the current block's index.
- `isasymmetric`, written as a separate boolean.
- `handles` containing `weight` entries.

The distinct symmetry index and asymmetry flag show that this model carries relationship information beyond merely storing a second object at a reflected position. They do not by themselves establish live propagation rules, snap tolerances, attachment constraints, or the mathematical meaning of the handle weights.

**Independent Wonderblocks direction:** keep a mirror relationship with an explicit unlink action; allow assemblies to retain parent/child relationships. Confirm expected interaction behavior separately before implementing it.

## 3. The named baked outputs have a code path

Function `0x008c6cb0` (RVA `0x00066cb0`) constructs paths ending in `_Diffuse.tga`, `_NormalMap.tga`, and `_BakeInfoMap.tga`. It obtains separate resource values and passes them with those paths to the same output helper at `0x00c11cf0`.

This strengthens the earlier string-only finding: there is an output routine using these names. The output helper and baking algorithm were not fully analyzed, and this routine was not observed executing. Image layout, channel packing, UV generation, and Building Creator ownership remain unverified.

**Independent Wonderblocks direction:** export our own material images and UVs with geometry. Viewport texture presets alone do not provide a usable textured export.

## 4. A tempting editor name was less useful than the model writer

The `BuildingEditor` reference occurs in function `0x00f7e220` (RVA `0x0071e220`), in a switch that also selects labels for other editors and game transitions. It is a naming/dispatch lead, not the building-editing algorithm itself. The paint serialization functions supplied more concrete evidence.

## Limits and next investigations

Recovered function names are Ghidra-generated labels. Full types and calling conventions have not been reconstructed. The shared model also includes skin-effect fields, so its use cannot be narrowed to buildings from these functions alone.

The most useful next validation would be to compare two legitimate building saves that differ in exactly one paint region or symmetry setting, and correlate those changes with the recovered model fields. Package inspection could then identify how region and paint IDs refer to preset resources. Neither save comparison nor preset-resource decoding was performed in this pass.

Local reproduction artifacts:

- `<external research workspace>`: main-module read-only capture.
- `<external research workspace>`: section comparison, analysis-image reconstruction, literal-address survey.
- `<external research workspace>`: focused Ghidra survey and decompilation.
- `<external research workspace>` and `runtime-evidence.json`: capture metadata and section measurements.
- `<external research workspace>` and `runtime-helpers.txt`: decompiler output used to check the observations above.

No game binary, asset, or decompiled implementation has been added to Wonderblocks. Its existing implementation remains independently authored; this is not a claim of a formally separated clean-room process.
