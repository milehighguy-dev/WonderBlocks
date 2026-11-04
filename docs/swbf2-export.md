# Export to SWBF2

**Audience:** Users.

Exports are source assets for the **Battlefront II (2005) PC Mod Tools**. You still need to munge them before using them in-game.

## Export one object

1. Select an object or group, then click **Export SWBF2**.
2. Set **Export scope** to **Selected objects / group**.
3. Choose **Single asset — MSH + ODF** for a placeable asset. Choose **MSH only** if you need just the model.
4. Check the name and preview, then download the package or choose a world-folder destination.

For a ZIP, extract it and copy the contents of `msh/` and `odf/` into your world's matching folders. Munge, then place the ODF in WorldEdit.

## Export a scene to an existing world

1. Click **Export SWBF2** and choose the whole scene with **Scene package**.
2. Set **Export to → World folder** and choose the world root containing `msh`, `odf` and `world1`—not just `world1`.
3. Select **Target world**, review the options, and export.
4. Reopen the world in WorldEdit, then munge normally.

WonderBlocks writes the assets and registers this scene's placement layer. Terrain, lighting and mission setup remain your responsibility.

On later exports, **Replace scene placements** replaces this scene's generated layer. Keep hand-edited placements in another layer. **Update assets only** preserves WorldEdit placements and planning; use it after the first placement export.

## Download a scene instead

Choose the ZIP destination, download and extract it. Copy `msh/` and `odf/` into your project, import the `.lyr` in WorldEdit, and register its layer for the game build. Use an unused layer ID. Use the supplied `.wld` scaffold only when starting a separate world; loading it alongside the layer duplicates placements.

## Options worth knowing

- **Separate collision helpers:** Follow the recommendation unless you have a reason to override it. Large size alone does not require helpers.
- **Class label:** Single assets get a suggested `prop` or `building` label. Scene exports choose automatically.
- **Unique mesh / ODF names:** Off by default, so exporting under the same name updates matching assets. Textures are shared when their baked images match.
- **Generate AI planning and barriers:** An optional starting point. Finish real planning in WorldEdit. For an existing world, enable planning merge and keep its world filenames; connect the graphs manually where needed.

If export is disabled, read the message above the export button. It identifies the missing setting or failed check. Direct exports keep replaced originals under `_wonderblocks/backups/` in the destination world.

Implementation details and past compiler investigations are in the [technical reference](reference/swbf2-export.md), intended for contributors and coding agents.
