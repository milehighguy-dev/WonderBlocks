# Add textures

**Audience:** Users.

1. In WonderBlocks, click **Open textures folder** below the material library.
2. Add a tiling image to a category folder, or create a folder for a new category.
3. Save your project and refresh or restart the app.

The folder name becomes the category; the image filename becomes the texture name. Use unique filenames across categories. Keep a filename unchanged when replacing a texture used by saved projects.

Supported images: PNG, JPEG, WebP, TIFF, GIF (first frame), AVIF and TGA. Images must already tile seamlessly. Files above 64 MB or 16 million pixels are rejected.

Images work without metadata. Optionally, put a matching JSON file beside an image to customize its label or finish:

```json
{"name":"Pale silver bark","roughness":0.9,"metalness":0}
```

In the desktop app, edit the library opened by the button; it lives under `%APPDATA%\Wonderblocks\textures`. In the source version, edit this repository's `textures/` folder.
