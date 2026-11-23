# Biome flora collection

The **Biomes** tab in Flora parts contains 97 editable whole plants, including three crown variations for each of twenty tree families. Search by plant name or habitat. The reusable leaf, stem, succulent and seed-head parts are also available individually. Plants use ordinary WonderBlocks branches and attached organs, so their shapes can be edited by hand and saved normally.

This collection interprets a geography teaching illustration containing several climates. It uses representative plant forms for those habitats; it does not represent one real location or claim that every named species naturally occurs together.

| Community and reference landforms | Plants in the collection | Placement |
| --- | --- | --- |
| Temperate woodland: forest, cape, wooded hill, lake slopes | Spreading oak, silver birch, hazel, woodland sword fern | Mixed, irregular groves; shrubs and ferns beneath and along edges |
| Mountain foothills and the base of the tundra range | Scots pine, mountain spruce, rowan, low juniper, sword fern | Tree groups on lower sheltered slopes; taper to shrubs toward exposed ground |
| Tundra | Dwarf willow, dwarf birch, heather, cotton sedge, tussock sedge | Low vegetation; cotton sedge in damp ground; no tall forest across the main tundra |
| Alpine mountain shelves, fjord ledges, glacier margins | Cushion flowers, alpine bunchgrass, lichen, low juniper | Sparse soil pockets and sheltered ledges; permanent snow and glacier ice remain bare |
| Open plain, prairie, valley and grassy basin | Fescue, tall bluestem, meadow wildflowers, broom | Grasses dominate; flowers and small shrub patches interrupt the grass without closing the plain |
| Rainforest and jungle | Kapok, spreading fig, understory palm, banana, giant fern, fig with lianas | Layered canopy and understory; lianas grow on a supporting tree |
| Swamp | Red mangrove, mangrove with tangled vines, swamp cypress, stilt-root pandanus | Mangrove roots along sheltered coastal swamp margins; cypress and pandanus on wetter wooded margins |
| Marsh and isthmus wet ground | Cattail, bulrush, reed, glasswort | Reeds and rushes form patches; glasswort belongs on coastal saline margins |
| Freshwater lake, riverbank, waterfall margins, delta channels | Weeping willow, alder, poplar, horsetail, waterlily, moss | Trees on supported banks; herbs in damp gaps; lily pads at the water surface in enclosed freshwater |
| Desert, dune, mesa, plateau, butte and canyon | Creosote bush, sagebrush, yucca, barrel cactus, prickly pear, columnar cactus | Widely spaced plants on suitable ground and drainage pockets; exposed vertical walls remain bare |
| Oasis | Date palm, tamarisk | Small groups around the oasis; preserve open access to the water |
| Beach, coast, bay, gulf, peninsula, island, archipelago and atoll | Sea oats, dune grass, creeping beach groundcover, sea grape, coconut palm | Grasses and creepers on the upper beach; shrubs and palms behind it; leave the active waterline open |
| Sheltered sound, lagoon, strait and channel shallows | Eelgrass, ribbon seagrass | Rooted in shallow, protected marine beds; absent from deep open water |
| Cool volcanic and thermal margins | Pioneer fern, moss | Only cooled, moist peripheral ground; active vents and fresh lava remain bare |
| Iceberg, permanent glacier/snow, open ocean, deep cave | No terrestrial planting | Keep these surfaces clear; vegetation at entrances or ice margins belongs to the adjacent community |

## Asset sources and new work

Existing BF2 Yavin, Endor, Naboo, Kashyyyk and Dagobah cutouts supply compatible leaf, needle, grass, flower, fern and vine material. The BF1 Kashyyyk reed and BF1 Naboo meadow sheets fill additional gaps. The texture source manifest is `assets/biome-flora/sources.json`.

Seven new transparent cutouts supply heather, sagebrush, fine fescue, bluestem, sea oats, a low sedge tussock and pale hanging Spanish moss. Stock Dagobah hanging moss and root curtains are also reusable parts. Every working foliage sprite is **256 × 256**, with transparency retained. The larger image-generation originals are not used as game textures.

The swamp trees include slender mangroves with twelve arching prop roots, a vined variant, and taller cypress with flared bases and hanging moss. The swamp lily bed uses a new 256-pixel transparent lily cluster on three horizontal sheets: six triangles in both its normal and distant meshes, without modeled pads or submerged stems. An individual waterlily uses one sheet and two triangles.

Modeled parts provide folded ribbon, banana, yucca and sedge leaves; slender herb stems; succulent pads and ribbed barrels; cattail and cotton-sedge heads; and lichen lobes. Their distant meshes follow the same shape builders with fewer samples. Palm fronds retain their modeled construction. Broadleaf and conifer crown clusters use camera-facing leaves; their three variants vary crown width, height, clumps and attachment heights while sharing the same woody scaffold and physical collision.

Billboard plants can specify a smaller `lowDetailCount`. The distant version keeps actual cards from the same seeded distribution, selecting cards around the patch outline to avoid shrinking a tuft into one corner. Native exports preserve each retained card's position, orientation, color and atlas tile. Existing presets that do not request this reduction retain their established foliage behavior.

## Game export

Use **Object** export for an individual plant. MSH + ODF and scene exports retain native camera-facing leafpatch attachments. Keep the main ODF, attached foliage and collision dependencies, textures and option files together. MSH-only exports bake the cards because they cannot attach leafpatch ODFs. Modeled fronds and horizontal lily sheets remain mesh geometry in either format. Small groundcover does not need solid movement collision; substantial woody plants retain bark collision. Export textures at 256 pixels for this collection.

The library exporter uses native leafpatches for woody plants and baked cards for small groundcover, which can be placed directly through a PRP Mesh entry. The native attachment hierarchy respects the game's sixteen attached props per parent. Crown variants share matching collision resources instead of spending the native model budget three times.

A single plant exports around its planted base. An asymmetric crown does not move that anchor, and rounded root caps can remain below the soil. Other standalone object selections retain their bottom-center origin.

The generation and export tools are `tools/generate-biome-presets.mjs` and `tools/export-biome-library.mjs`. The latter requires a new destination directory and creates the native asset library plus a separate editable specimen project. It does not alter a currently open scene.

## Habitat references

- Grass and herb dominated open prairie follows [UC Berkeley's grassland overview](https://ucmp.berkeley.edu/exhibits/biomes/grasslands.php).
- Coastal mangrove placement follows [NOAA's mangrove habitat description](https://oceanservice.noaa.gov/facts/mangroves.html).
- Dune and wetland plant groupings draw on [Cape Hatteras plant communities](https://www.nps.gov/caha/learn/nature/plants.htm).
- Low alpine growth forms follow the [British Columbia alpine tundra overview](https://www.env.gov.bc.ca/thompson/esd/hab/alpine_tundra.html).
- Sparse desert shrubs and succulents follow the [National Park Service's Sonoran Desert ecosystems](https://home.nps.gov/im/sodn/ecosystems.htm).
- Rainforest understory forms draw on the [National Park Service's tropical rainforest material](https://www.nps.gov/teachers/classrooms/our-tropical-rainforest.htm).
- Sheltered marine planting follows [NOAA Fisheries' seagrass habitat description](https://www.fisheries.noaa.gov/west-coast/habitat-conservation/seagrass-west-coast).
