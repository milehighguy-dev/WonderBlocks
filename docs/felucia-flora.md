# Felucia plants

The local SWBF2 Mod Tools `assets/worlds/FEL/msh` meshes were imported into an isolated Blender reference scene and inspected as complete plants and individual mesh sections. The added pieces retain the native UVs, normals, diffuse textures and material cutout flags. Coordinates convert from Blender Z-up to Wonderblocks Y-up with `(-x,z,y)`, preserving winding.

Six **Tree presets** recreate the main plant families using editable, connected stalks: Flared Pitcher, Slender Pitcher, Bladder Pair, Segmented Spore Stalk, Golden Whisker and Scarlet Bloom. These are reconstructed plants, not exact whole-mesh imports. Stalk joints use the current Flora branch mechanics. Moving and rotating them carries their attached native organs. Cups, pods and decorations remain separate selectable, joint-free pieces that can be moved, rotated and scaled. Pitcher interiors retain their authored hollow shape instead of passing through the solid merged-body skin.

Sixteen reusable cards are available:

| Group | Parts |
| --- | --- |
| Flora | Flared Pitcher, Slender Pitcher, Inflated Pod, Spore Bulb, Flower Pod, Flower Calyx, Golden Whisker Trunk |
| Leaves | Frilled Collar, Basal Frill, Ground Fronds, Mottled Leaves |
| Details | Scarlet Petals, Vent Rosette, Pitcher Feeler, Whisker Crown, Hanging Whisker |

The inflated pod is separated from the native paired mesh; the flower pod is a connected native mesh section. The spore bulb is separated at the segmented plant's narrow upper neck and its cut end is sealed. Whisker crown and feeler sections are clipped at a neck plane with interpolated UVs and sealed cut ends; crossing triangles are retained. The remaining sections are taken directly from their corresponding mesh objects. Native pieces contain 13–314 triangles each. Texture resolution is retained up to 512px. Diffuse textures and cutout masks repeat in both directions: native UVs outside 0–1 must never clamp to an edge texel. Opaque skins ignore native alpha channels containing other data; leaf/frill/pitcher cutouts use separate alpha masks.

Vessel skins can host additional surface decorations using triangle pins. Their transparent texels are excluded from picking. The pins follow a vessel's movement, rotation and scale, and deleting the host removes its dependent decorations. This does not add skeleton sockets or editable joints to those surface parts.

Place the Felucia plants from **Flora → Tree presets**.

Golden Whisker is an editable textured base trunk with a separately selectable crown and five hanging details. The crown is clipped at its narrow attachment neck; each detail is pinned directly to its own trunk triangle. The pins retain the full triangle frame so twists carry the details as well as their roots. The palette offers a single reusable hanging strand rather than a rigid bundle with several disconnected roots. Crown and whiskers are in **Details**. No Felucia preset includes ground fronds or mottled base grass.

Pitchers, bladder pods, flower buds, calyx and feelers omit the original cropped stem stubs. Their cut necks have an explicit origin and retain interpolated native UVs. Presets mount them on actual stalk-end triangles with a small insertion depth, rather than a guessed offset from an abstract joint. Scarlet Bloom combines its native green calyx and petals in their original shared frame; the petals are pinned to the calyx and follow its movement, rotation and scale. Both bud and open flower use stalk-end attachments.

The pitcher feeler stalks are pinned to the vessel's bottom skin and grow through its interior. Their joint curves follow the original `stem3` and `stem5` ring centers in vessel coordinates; they are not sibling branches at the supporting stalk joint. Moving, rotating or scaling a cup carries its complete feeler and orange tip. Full-frame branch-surface pins retain the host's affine scale as well as translation and rotation. Browser verification includes Move/Rotate/Scale on both cups, immediate descendant updates, Undo/Redo and Finish/reopen; save/load and host deletion are also covered by regression tests.
