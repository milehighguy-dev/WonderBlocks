# Reference building editor: preliminary reconnaissance

**Audience:** Contributors and coding agents. Historical research and asset notes, not a user guide; details may no longer match the current app.

Follow-up: [Ghidra and data-table investigation](../research/EDITOR-FINDINGS.md) records the subsequent analysis, protection-related limitations, verified paint tables, and suggested independent improvements.

Latest: [Runtime investigation](../research/RUNTIME-FINDINGS.md) records a readable snapshot of the user-launched game and function-level findings about paint regions, color pairs, hierarchy, and symmetry. The static-only limitations below describe the earlier pass.

Prototype follow-up: [February 2008 prototype findings](../research/PROTOTYPE-FINDINGS.md) verifies a matching PDB, named editor methods and member types, building test scripts, and one readable symmetry-snap calculation. Several paint methods still have protected entry points.

Package/type follow-up: [Editor data findings](../research/EDITOR-DATA-FINDINGS.md) connects building palettes, default themes, region filters, saved building paint entries, and deformation-handle types. It distinguishes individual part regions from building-wide style categories.

Inspected read-only on 2026-09-27:

- File: `<local reference executable>`
- File/product version: 1.3.0.29
- Size: 20,460,352 bytes
- SHA-256: `e75cbb34396050b15fb1302600968075455eeb0bb1bd6386f8bd7fabebe892c6`
- PE machine: `0x14c` (x86), preferred image base `0x00400000`.

## Direct observations

The following ASCII strings occur in the executable. Addresses are preferred-image virtual addresses calculated from PE sections, not verified function entry points or runtime addresses.

| String | File offset | Preferred VA |
|---|---|---|
| `>editor_sym_snap` | 0xFEAF9B | 0x013EC19B |
| `editor_sym_unsnap` | 0xFEAFAC | 0x013EC1AC |
| `Editor/cEditorResource` | 0xFEF6F8 | 0x013F08F8 |
| `BuildingHouse` | 0xFFBCDD | 0x013FCEDD |
| `BuildingEditor` | 0x105D7F8 | 0x0145E9F8 |

The installation also contains game, content, graphics and expansion resource packages. These were inventoried, not extracted. The installation was not modified.

These strings provide candidate starting points for cross-reference analysis. They do not establish the exact snapping algorithm, editor ownership, file encoding, or deformation behavior. No function decompilation or runtime tracing was completed in this prototype pass.

## Community documentation consulted

- A community C++ modding SDK.
- Shared editor API documentation covering rigblock parts, edit history and `.bld` creation resources.
- Editor setup documentation, including BuildingHouse.

No ModAPI implementation was copied into this application. Community information may target other reference builds; symbol addresses must not be assumed compatible with this 1.3.0.29 binary.

## Implementation decision

The requested first priority is a standalone editor with original parts. Wonderblocks therefore uses an original scene/project model and procedural geometry, with Three.js handling rendering and manipulation controls. Similar high-level tools do not imply that the original reference algorithms have been recovered. This is an independent functional prototype, not an exact reconstruction or formally separated clean-room effort.

Future fidelity work would require observed editor interaction tests, cross-references from the strings above, function-level analysis, and carefully validated specifications for deformation and attachment behavior. File compatibility is a separate workstream requiring known-good creation samples and format round-trip tests.
