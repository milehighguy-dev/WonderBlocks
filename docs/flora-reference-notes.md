# BF2-style flora

**Audience:** Contributors and coding agents. Historical research and asset notes, not a user guide; details may no longer match the current app.

The catalogue combines independently authored on-bark branches and modeled leaves with reference-derived structural forms: knotted and forked trunks, twisting stems, irregular root masses, sprays, compound fronds and crowns. The five surface branches and fifteen solid foliage parts use new geometry and textures approved by the user.

`bf2-flora-forms.js` contains the reduced wood, skeletal layouts and reference placement envelopes. Jointed body skins regenerate from the full curved radius fields so editing retains their characteristic shapes. The generic replacement tubes and blade generator have been removed. Source animations and original color maps are not used.

Compound foliage converts reference leaflet placements into folded game-style cards, using complete tiles from the stock BF2 leaf atlases. Palm and willow forms use fern-like cards; Fern Frond uses a curved card with the Yavin fern atlas. Fern-based palm and willow sprays use the textured midribs without additional modeled green stalks. Each frond starts at its attachment origin, with the UV root on the opaque stem rather than the transparent atlas margin. Individual modeled leaves use the approved independently authored closed surfaces and opaque procedural textures; cutout alpha belongs to foliage cards. Other compound card stalks retain opaque UVs so the blade mask cannot erase their attachment. Structural bark uses Yavin, Dagobah and Endor materials; the new surface branches have their own bark/endgrain atlas. New plants default to neutral foliage tint so the texture colors remain visible.

Shape controls, joint controls, triangle attachments, local history, finishing, collision and export use the regular editor pipeline. The curled fiddlehead retains its own Curl and Leaf budding controls. Semantic catalogue IDs remain unchanged from the replacement batch, so its projects continue to load.

Done saves the edited plant and returns to the Flora browsing workspace, with the plant selected and the flora palette available.

**Basic Trunk** is the neutral joint primitive at the start of **Bases**, alongside Basic Branch in **Branches**. It starts as a straight, gently tapered four-metre stem with three editable joints. It uses the same branch attachment, girth, rotation and joint movement tools, without a modeled root flare or prebuilt branching crown. Both basic primitives are generated locally rather than imported from reference geometry.

`tools/adapt-flora-forms.mjs` regenerates the reduced form data when explicitly supplied the reference directory and ID mapping. The app does not ship the old catalogue, extracted animations or the old importer. The old source assets remain in the recovery copy outside the app; source ownership is unchanged.

## Wetland trees and coral

Weeping Willow reuses Forked Bough and the existing Basic Branch profile; Red Mangrove reuses Stilt Base and the same profile. Their saved presets are generated through the normal attachment API by `tools/generate-wetland-presets.mjs`. No new tree base or trunk mesh was introduced. The new willow spray is a narrow-leaf, three-twig cutout on one top-anchored upright card. Its opaque central stalk reaches the mounting point; card width, hanging length and shade remain editable in the existing foliage controls.

Palm Tree is another normal **Tree presets** entry. `data/palm-presets-data.js` assembles a gently leaning Basic Branch trunk with an inverted Palm Whorl for the drooping outer fronds and an upright Palm Canopy for new growth. Both crowns attach directly to the final trunk joint and follow its edits. It uses the existing meshes and materials, defaults to SWBF2 detail, and stays below 1,000 triangles in three drawing passes. Generate its thumbnail with `node tools/generate-flora-icons.mjs --tree=palm-tree`; the same option accepts other tree preset IDs.

The **Coral** palette tab contains four modular growth pieces: Staghorn Fork, Elkhorn Fork, Brain Growth Lobe and a single Shelf Plate. Forks have blunt rounded tips and cylindrical or flattened sections; they do not taper into needles. All pieces use the existing surface attachment workflow and local width and height controls. Native triangle pins let extensions follow their parent shape. No encrusting foundation or generic round branch is included. All pieces have closed opaque geometry. Forks and shelves stay below 600 triangles; the brain growth lobe uses 192 triangles with gentle geometric noise on a rounded lump. Its winding brain detail stays in the texture, with continuous planar UVs to prevent the former wrap strip. The attachment regression fixtures in `tests/fixtures/coral-attachment-fixture.js` build staghorn from ten pieces, elkhorn from four, brain from four and plate coral from five. No complete-colony palette meshes are used.

The contrasting silhouettes follow [NOAA's coral growth forms](https://oceanservice.noaa.gov/education/tutorial_corals/coral03_growth.html), including cylindrical staghorn and flattened elkhorn limbs, ridged [brain coral](https://oceanservice.noaa.gov/facts/brain-coral.html) growth and overlapping scalloped shelf plates.

Repeated billboard patches clone the material template so their shader transform uniforms cannot overwrite one another. The GPU program and texture caches remain shared; this adds no draws. Icons are baked PNGs, generated with `node tools/generate-flora-icons.mjs --wetlands`.


## Approved modeled leaves and on-bark branches

The fifteen approved foliage parts are defined in `src/flora/modeled-leaves.js` and appear under their established names and IDs in **Leaves**, with red Coral Leaf in **Coral**. The authored shape modules `leaf-cups.js`, `leaf-shapes.js` and `leaf-accents.js` supply closed volumes: a spined head, hollow cups, domed canopies, fleshy pads, folded fans, coral branches and a swept coil. Defaults use 456–1088 triangles. Spread, length and bend controls preserve triangle attachment topology.

The five approved surface branches in `src/flora/bark-branches.js` are Tapered Twig, Bent Twig, Thorn Branch, Segmented Branch and Slender Twig. They remain **Branches** → **On bark**, use girth/length/bend controls, and host pinned foliage. `twig-shapes.js` and `branch-accents.js` contain authored centerlines, envelopes and continuous wall outgrowths without source-game mesh dependencies. Thorn wedges are integrated into the stem wall; Segmented Branch has oblique sheath shoulders. Defaults use 480–738 triangles.

The original twenty reference mesh records and fifteen modeled-leaf texture records have been deleted. `tools/adapt-flora-forms.mjs` excludes the approved canonical IDs so regeneration cannot restore those meshes. Catalogue IDs stay the same, so saved plants select the new geometry directly. Their temporary aliases and icons have been removed. The other joint and body parts retain their existing definitions.

The new grayscale bark atlas supplies striations, fissures and scars under the editor's bark color; cut ends use a separate endgrain region. Longitudinal UVs follow deformed arc length, including length and bend edits. Both preview and final bark builds use the shape UVs. Generate thumbnails with `node tools/generate-flora-icons.mjs --branches` or `--leaves`; default generation refreshes the complete procedural catalogue, including compound parts that use the new modeled leaves.

Inspect current parts with `node tools/render-flora-review.mjs --collection=leaves --mode=both --views=quarter,front,side,top,below` or `--collection=branches`. The standalone `previews/flora-review.html` groups all twenty current parts with orbit, clay, wireframe and shape controls. It does not load or alter an editor project and is outside the example-scene catalogue. Tests cover closed surfaces, winding, cavities, morph extremes, mounted origins, foliage pins and project/export round trips.

## Representative trunk-base review

The new **temp** category, next to **Bases**, holds six review candidates covering the main roles among the existing 25 base options: Rooted Stem, Forked Trunk, Crooked Trunk, Bulbous Trunk, Buttress Base and Stilt Base. These are new volumes with independently authored skeletons and radius profiles in `temp-base-trunks.js` and `temp-base-roots.js`. They use the existing BF2 bark material. Existing bases and saved plants are retained while the user chooses replacements.

The six candidates are normal body presets with 7–11 editable joints. Their fields are registered in the regular body system, so moving, rotating or scaling joints reshapes the connected solid and carries attached branches. Buttress fins are filled thin radial webs; stilt roots form curved arches with open space below a raised hub. Their ground-contact toes are authored at ground level. No original base mesh or sampled skeleton is imported by the new shape definitions.

`tools/generate-temp-bases.mjs` bakes closed, reduced source meshes to `data/temp-base-meshes.js`, with dominant-face texture projection and shared smooth normals across UV-chart splits. The source meshes use 1,062–2,082 triangles; the neutral SWBF2 builds currently use 938–1,662. Bake icons with `node tools/generate-flora-icons.mjs --temp`. Inspect all six with `node tools/render-flora-review.mjs --collection=bases --mode=both --views=quarter,front,side,top,below`, or choose **Temp bases** in `previews/flora-review.html`. The standalone viewer inspects neutral geometry; structural joint editing stays in the flora editor.
