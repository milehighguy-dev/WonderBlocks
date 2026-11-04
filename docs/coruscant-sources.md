# Coruscant theme sources

**Audience:** Contributors and coding agents. Historical research and asset notes, not a user guide; details may no longer match the current app.

The curated palette contains two complete procedural modules: Skyscraper blade and Scalloped terrace. Experimental shapes, including the oculus crown inferred from an incomplete backdrop mesh, were removed. General tower construction uses existing bodies.

The four texture presets were sampled at 128 × 128 from the user's loaded STAR WARS Bounty Hunter Coruscant assets:
- cor-windows: b_window13.dds
- cor-panels: b1_metalwall02a.dds
- cor-ribs: b1_silobasea.dds
- cor-slots: b1_designwindowb.dds

These textures retain their original third-party provenance; they are not original Wonderblocks artwork or covered by the project's code license. Blender source images and scene objects were not modified. Encoded RGBA data is bundled locally in coruscant-textures.js for offline previews and deterministic texture generation.

## Second scene: B3 exterior skyline
The B3 scene contributed six additional texture samples. Its partial backdrop silhouettes are not treated as reliable complete building shapes.

Additional 128 × 128 texture samples:
- cor-ivory-windows: b3_extbuildingaopq.dds
- cor-column-windows: b3_extbuildingcopq.dds
- cor-crown-trim: b3_extbuildingdtop.dds
- cor-plating: b3_extbuildingpanels.dds
- cor-concrete: b3_extbuilding_concrete.dds
- cor-landing-pad: b3_landingpada.dds
These retain the same third-party provenance as the initial texture set.

Skyscraper blade (cor-skyscraper-blade) is a procedural lengthwise half-almond inspired by the original tower silhouette. It has a planar cut back, bowed outer face, flat capped bottom and a truncated flat top. Default dimensions are approximately 1.7 × 1.8 × 8 m. All faces are closed. The Blender scene was not modified.

## User-supplied image references (September 29)
Five procedural modules interpret clear features in the supplied images: the rounded setback wings in the sunset tower (Curved tower shoulder), the animation's hooked vertical fins (Swept spire), its broad flat mushroom platform (Raised landing deck), and the bulb on exposed supporting struts in the realistic skyline (separate Acorn cap and Curved support strut pieces). The lantern is assembled by repeating the individual strut beneath the cap on an existing round base. They are modular pieces, not complete copies of the pictured buildings. Each has closed back and underside faces. No new textures were extracted from these images.

## Rooftop scene texture selection (September 29)
The open Blender scene supplied these 12 architectural base-color textures from its loaded `textures/rooftop` folder. They were sampled to 128 × 128 opaque RGBA with filtered resizing, preserving the source RGB colors, and bundled offline in coruscant-rooftop-textures.js. The scene and source files were not changed. These third-party textures retain their original provenance and are not covered by the project code license. Lightmaps, glow masks, sky images and prop atlases were excluded.

- Blue night windows (`cor-night-blue`): `textures/rooftop/building_ext2test.jpg`
- Teal window bands (`cor-night-teal`): `textures/rooftop/building_ext3.jpg`
- Recessed blue window ribs (`cor-window-ribs`): `textures/rooftop/building_ext6.jpg`
- Warm apartment windows (`cor-night-warm`): `textures/rooftop/window_building.jpg`
- Louvered service panels (`cor-louver-panels`): `textures/rooftop/building_ext5b.jpg`
- Weathered steel cladding (`cor-weathered-cladding`): `textures/rooftop/grey_rusty_wall1.jpg`
- Riveted wall panels (`cor-riveted-wall`): `textures/rooftop/wall4b.jpg`
- Circular floor plates (`cor-floor-plates`): `textures/rooftop/office_floor1.jpg`
- Inset ivory wall panel (`cor-interior-panel`): `textures/rooftop/office_wall2.jpg`
- Rounded ceiling panels (`cor-ceiling-panels`): `textures/rooftop/office_ceiling.jpg`
- Walkway grate (`cor-walkway-grate`): `textures/rooftop/walkway.jpg`
- Angular tower plating (`cor-angular-plating`): `textures/rooftop/twin_tower1.jpg`


## Circular industrial sinkhole reference pass (October 4, 2026)

The Meridian district now uses a 48-sided ring body as its hollow cylindrical retaining shell, with a flat annular street rim, five service bands, radial structural piers, coolant risers and wall-mounted machinery. The existing editable routes remain connected and the enclosed tunnel automatically carves the north wall. Reference images informed the large circular void, layered infrastructure and industrial rhythm; no reference images or meshes were imported.

- [Star Wars 1313: Coruscant Underworld, Creative Uncut](https://www.creativeuncut.com/gallery-22/sw1313-coruscant-underworld.html): circular skylight and dense suspended infrastructure.
- [Brian Recktenwald's cancelled Star Wars 1313 art, GameWatcher](https://www.gamewatcher.com/news/2017-01-11-ex-lucasarts-artist-posts-concept-art-of-the-cancelled-star-wars-1313): deep cylindrical chamber, structural bays and catwalks.
- [Pat Presley: Coruscant Underworld, ArtStation](https://phattro.artstation.com/projects/XdD1y?album_id=20626): mechanical lower-city language and warm accents.

Google Images was attempted but inaccessible through the available browser tools; references were found with the image search tool and their source pages checked directly.


## Rebuilt rim-neighborhood layout (October 4, 2026)

The scene was rebuilt around shared vertical building footprints rather than retaining the original chain of destinations. The penthouse, residential galleries, market access and basement occupy the Meridian tower; a neighboring stacked transit building creates an alternate descent. The courtyard sits above the undercity arrival atrium. Curved inhabited streets run toward the sinkhole rim, ending directly at a freight building whose internal stairs reach the loading apron. All external connectors join neighboring spaces within 24 m. The hollow industrial shaft retains its 248 m diameter and 108 m retaining height.

The street-level activity and integrated industrial architecture draw on these references. No source images or meshes were imported.

- [Street Corner, Star Wars 1313, Creative Uncut](https://www.creativeuncut.com/gallery-22/sw1313-street-corner.html)
- [Food Shop Order Window, Star Wars 1313, Creative Uncut](https://www.creativeuncut.com/gallery-22/sw1313-food-shop-order-window.html)
- [Pat Presley, Coruscant Underworld](https://phattro.artstation.com/projects/XdD1y?album_id=20626)
- [Brian Recktenwald, LucasArts Work](https://brianrecktenwald.artstation.com/projects/8dlDR)
