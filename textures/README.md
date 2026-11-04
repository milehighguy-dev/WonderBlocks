# Material textures

Each folder here is a category in the material picker. Add an image to an existing folder, or create a folder and put images in it. Save any current edits, then refresh Wonderblocks to see the changes. No code changes, manifest, conversion command or server restart is needed.

Supported source images: PNG, JPEG, WebP, TIFF, GIF (first frame), AVIF and TGA (raw or RLE true-color/grayscale). Use images that tile in both directions. The library does not make a non-tiling image seamless.

The folder name becomes the category name. The image filename becomes its texture name and saved ID: `Alien Forest/Silver Bark.png` becomes the **Alien Forest** category and **Silver Bark** texture (`silver-bark`). Keep filenames stable when replacing an image so existing scenes retain their material. Different textures need different filenames, even across categories. Identical textures may appear in multiple folders.

Images work by themselves. The existing JSON companions preserve display names, finishes and source information. For an optional custom label or finish, place `Silver Bark.json` beside `Silver Bark.png`:

```json
{"name":"Pale silver bark","roughness":0.9,"metalness":0}
```

An optional `_category.json` can set a category's display name, numeric order and preview texture IDs. Neither kind of JSON is required when adding textures or categories.

Source proportions and resolution are retained up to 2048 pixels on the longest side. The exporter applies its selected texture-size limit and power-of-two sizing. Binary transparency uses cutout materials; partial transparency uses blending. Switching to an opaque image restores opaque material settings. Source files remain unchanged. Files over 64 MB and images over 16 million pixels are rejected without stopping the rest of the library. Unreadable images appear as disabled checker previews with an explanation; an export using one stops with its texture name so placeholders cannot silently reach the game.

**Remove texture** clears the material's texture while keeping its color. Untextured materials are not entries in the category folders. **All textures** is generated automatically.

The image cache checks file contents, so replacing a file is detected even when Windows keeps its old size and timestamps. Identical source pixels under different image names use one descriptive exported texture name.
