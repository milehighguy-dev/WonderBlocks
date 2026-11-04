# February 2008 prototype investigation

## Outcome

The user-supplied ISO is substantially more useful for editor research because it includes a **matching debug PDB with named symbols and class-member information**, plus editor automation scripts. It still contains protected code, so this is not an entirely unobstructed executable or a source-code release.

The prototype was inspected statically and was not installed or launched. The key-disc MDF/MDS was left untouched. No prototype code or assets were added to Wonderblocks.

## Identity and integrity

Source: `<local prototype ISO>`, 3,258,482,688 bytes.

The InstallShield archive includes:

| Item | Verified value |
|---|---|
| Executable version | `1.0.0.11318` |
| Packaged build description | `1.ML-0.0.11318`, changelist `302205`, timestamp `2008-02-19-0605` |
| EXE size | 32,616,448 bytes |
| EXE SHA-256 | `e727848cdfe83d7e2b01eb83577b720399f0fdbea65a9e2ee658c87188a3709a` |
| PDB size | 134,269,952 bytes |
| PDB SHA-256 | `cb240f33a07dc7531229e14af9f13504ba40f77df90843dd9c6eb4f650d8d214` |
| EXE CodeView / PDB GUID | `24bd1794-4420-4aa0-b245-85886000d392` |
| EXE CodeView / PDB age | Both `1` |
| Embedded original PDB path | `<local debug symbols>` |

The selected archive files passed checks against their stored expanded lengths and MD5 values. Matching GUID and age establish that the PDB belongs to this EXE; they do not make its addresses applicable to the installed retail build.

A focused parser found 200,102 public-symbol records, of which 6,649 matched editor-related name filters. These counts include data, template machinery, and other symbols; they are not counts of unique editor functions. PDB type records also contain field names, offsets, and types.

## Paint data is more specific than a single texture per object

The PDB describes `SP::tSPEditorPaint` with:

| Member | Offset | Type evidence |
|---|---|---|
| `mPaint` | `0x00` | 32-bit unsigned integer type |
| `mColor1` | `0x04` | `cSPColorRGB` |
| `mColor2` | `0x10` | `cSPColorRGB` |

`SP::cSPEditorBlock` has an `mPaintMap` member at offset `0x3e4`, typed as an integer-keyed map of `tSPEditorPaint` values. This independently strengthens the retail runtime finding of paint IDs and two color triples. The type records identify RGB colors, but do not establish color space or shader blending behavior.

Named methods and properties include:

- `cSPEditorBlock::GetPaint`, `SetPaint`, and `CopyPaint`.
- `cSPEditorPaintTheme::ExtractRegionPaintData` and `ExtractSkinPaintData`.
- `GetClosestRegions`, `GetBestPaint`, and `GetMostFrequentPaintForRegion`.
- `kPropPaintRegionMapping`, `kPropPaintThemeRegionFilter`, `kPropPaintThemePaints`, `kPropPaintThemeColor1s`, and `kPropPaintThemeColor2s`.

These names and types establish a richer paint-related interface and data model. They do not prove the exact fallback, matching, or theme-application algorithms. Several corresponding code entries are protection stubs, as discussed below.

**Wonderblocks implication:** independently paintable part regions, two editable preset colors, and reusable multi-region themes are stronger directions than just expanding the single-material preset list. The mapping and theme-selection behavior should be designed and validated independently.

## One symmetry-snap calculation is readable and corroborated by types

`cSPEditorBlock::IsDistanceWithinSymmetrySnapDelta` is at preferred VA `0x00c54170` in this prototype. Focused Ghidra disassembly/decompilation recovered a coherent body.

The routine multiplies the block's `mSymmetrySnapDelta` by `mUniformScale`, clamps that result between approximately `0.01` and `0.13`, multiplies by its second float argument, and compares the absolute value of its first float argument against the resulting threshold using a strict less-than comparison.

The PDB provides the corresponding member offsets:

- `mUniformScale`: `0x1c4`.
- `mSymmetrySnapDelta`: `0x20c`.

Those offsets match the loads in the inspected code. The bounds are read from floats at `0x01b05318` and `0x01b05314` respectively.

This is actual function-level behavior, not a deduction from a name. However, the caller's choice of the second argument, the coordinate units, and Building Creator-specific use were not traced. It is **not** evidence for a camera-zoom formula.

Other corroborating members include `mSymmetricBlock`, `mSymmetrySign`, `mSymmetryRotationSnapAngle`, `mSnapAxes`, and separate lists of types to snap onto, snap down to, or replace. Named methods include `EditorUtils::SnapPositionToParent`, `BreakSymmetricReferences`, and `MoveBlockAndTranslateSnappedBlocksIgnoreHistory`. Their full behavior was not recovered in this pass.

**Wonderblocks implication:** snapping can account for part scale while bounding the snap tolerance, and symmetry can be represented as an explicit relationship. The prototype constants should not be copied blindly into our different coordinate system.

## Building-specific evidence in the test scripts

`editor_generate_building_editor_thumbs.txt` explicitly enters `BuildingEditor`, generates previews using a building-block group, switches into paint mode, and then uses a building-paint group. It also uses different framing settings for the two preview passes.

`editor_save_buildings.txt` explicitly enters `BuildingEditor`, loads models in a loop, switches to paint mode before saving, and returns to parts mode before continuing. Some comments in that script incorrectly refer to cells or creatures; the executable commands are the evidence for its building-oriented intent.

Other included scripts target creature skin-paint generation. Those were not treated as proof of the building paint pipeline. No test script was executed.

**Wonderblocks implication:** give materials meaningful previews on suitable sample geometry and support consistent themed paint application across the building's parts. The scripts alone do not reveal texture projection or material baking algorithms.

## Protection and analysis limits

The prototype's `.text` entropy is about 6.274 bits/byte, and some code is directly readable. Nevertheless, the executable also includes `.securom` and other added sections. The inspected entries for `SetPaint`, `CopyPaint`, `GetPaint`, `IsRegionPaintType`, `GetClosestRegions`, `GetBestPaint`, and one `Apply` overload perform indirect jumps through protection-related storage. Their actual implementations were not recovered by this static pass.

Ghidra was used with full automatic analysis disabled, selected symbol labels from the matching PDB, and focused disassembly/decompilation. Full PDB type application, complete executable analysis, and runtime tracing were not performed. Finding a function name in the PDB must not be reported as having decompiled its implementation.

The highest-value next step is to use the symbols and types to build a focused map of editor paint, attachment, symmetry, and deformation systems. If the prototype can run normally, a read-only runtime snapshot may reveal the redirected functions, as happened with the retail build. A prototype-to-retail comparison must establish correspondence function by function; addresses and layouts differ.

## Local artifacts and tooling

Research artifacts remain in `<external research workspace>`, outside the app repository:

- `<local reference executable>`, `<local debug symbols>`, and selected editor scripts.
- `prototype-evidence.json`: hashes, PE sections, and EXE/PDB identity comparison.
- `public-symbols.json`, `editor-symbols.tsv`, and `selected-types.json`.
- `focused-decompilation.txt`: output from eight selected function entry points.
- `inspect-symbols.cjs`, `extract-selected.cjs`, and `PrototypeFocus.java`: research helpers.

The ISO was read with Windows `tar`. [UnshieldSharp](https://github.com/mnadareski/UnshieldSharp) was used to inventory the installer; a partial bulk extraction was stopped and removed. A focused extractor used the archive layout documented by the [Unshield implementation](https://github.com/twogood/unshield/tree/main/lib), verified each selected file's MD5, and avoided unpacking the remaining game assets. The temporary 3.2 GB cabinet copy was removed after extraction; it can be re-extracted from the user's unchanged ISO if needed.

The PDB parser used its MSF streams, CodeView identity, public symbol records, and selected type records. The DBI layout was checked against [Microsoft's PDB implementation](https://github.com/microsoft/microsoft-pdb/blob/master/PDB/dbi/dbi.h). Raw game files and decompiler output are research inputs, not distributable Wonderblocks content.
