# Wonderblocks geometry budget

**Audience:** Contributors and coding agents. Historical research and asset notes, not a user guide; details may no longer match the current app.

Counts are triangles, measured from generated geometry. Default parts use default shape parameters. Scaling alone does not change counts; sculpting and specialized controls can. Counts include hidden/intersecting faces. Mesh batches group components sharing a material within each editable part; they are not a measurement of GPU draw calls including shadow passes.

## Castle compound

The rebuilt **Shirogane · Gate, Garden & Keep** example uses 310 editable parts. Its three courts are platforms; four roofed wall paths replace separate curtain wall and coping pieces. Three inhabited halls use room plans with actual openings. Four ascent routes include a curved garden return and two approaches with resting landings.

| Metric | Current scene |
| --- | ---: |
| Visual triangles | 15,920 |
| Material batches | 480 |
| Editable parts | 310 |

These counts include the character reference, gallery, garden, rooms, and detailed keep. Tests cap the complete example at 20,000 triangles and 550 material batches; individual parts stay below 1,000 triangles, except roofed wall paths which may contain up to 2,500. Wall segments retain separate editor metadata, so a logical wall path can contain several material batches.

Original opaque 128 × 128 detail maps replace gable lattice, window bars, and timber trim meshes. This is the full visual geometry count, not a distance LOD. The viewport renders on changes instead of continuously at idle. Performance also depends on shadows, overdraw, collision, and culling; these counts are not a verified hardware budget. OBJ contains geometry only, so surface detail needs a separate material/texture workflow.

## Default parts

| Part | ID | Triangles | Material batches |
| --- | --- | ---: | ---: |
| Doric column | doric | 612 | 1 |
| Ionic column | ionic | 1204 | 1 |
| Corinthian column | corinthian | 1040 | 1 |
| Smooth Doric column | doric-smooth | 332 | 1 |
| Smooth Ionic column | ionic-smooth | 924 | 1 |
| Smooth Corinthian column | corinthian-smooth | 760 | 1 |
| Fluted shaft drum | column-drum | 400 | 1 |
| Temple platform | temple-base | 36 | 1 |
| Architrave beam | architrave | 24 | 1 |
| Triglyph frieze | triglyph | 156 | 1 |
| Dentil cornice | cornice | 108 | 1 |
| Temple roof & pediments | temple-roof-complete | 168 | 2 |
| Temple cornice frame | temple-entablature | 240 | 1 |
| Half temple roof | temple-roof-half | 116 | 2 |
| Temple doorway | temple-door | 48 | 1 |
| Palmette ornament | acroterion | 1652 | 1 |
| Battered stone foundation | jp-base | 12 | 1 |
| Stone rampart | jp-stone-wall | 12 | 1 |
| Stone rampart corner | jp-stone-corner | 12 | 1 |
| Castle stone stairs | jp-stair | 96 | 1 |
| Plaster keep story | jp-story | 48 | 1 |
| Keep entrance story | jp-entry-story | 72 | 1 |
| Timber keep story | jp-dark-story | 48 | 1 |
| Plaster wall panel | jp-wall | 12 | 1 |
| Timber wall panel | jp-timber-wall | 12 | 1 |
| Swept hip roof | jp-hip-roof | 552 | 2 |
| Open tier roof | jp-tier-roof | 560 | 2 |
| Swept gable roof | jp-gable-roof | 68 | 1 |
| Half swept roof | jp-half-roof | 36 | 1 |
| Hip-and-gable roof | jp-irimoya | 684 | 3 |
| Swept roof gable face | jp-swept-gable | 28 | 1 |
| Triangular dormer gable | jp-chidori | 336 | 3 |
| Curved entrance gable | jp-karahafu | 344 | 3 |
| Straight eave canopy | jp-eave | 36 | 1 |
| Roof ridge cap | jp-ridge | 12 | 1 |
| Barred castle window | jp-window | 12 | 1 |
| Bell-shaped window | jp-katomado | 444 | 2 |
| Arrow-slit panel | jp-arrow | 20 | 2 |
| Open timber gate | jp-gate | 72 | 2 |
| Studded double doors | jp-gate-doors | 384 | 3 |
| Observation balcony frame | jp-balcony | 384 | 1 |
| Balcony railing | jp-railing | 84 | 1 |
| Eave bracket | jp-bracket | 36 | 1 |
| Golden fish roof ornament | jp-shachi | 76 | 2 |
| Golden floral crest | jp-crest | 384 | 1 |
| Golden tiger relief | jp-tiger | 56 | 1 |
| Courtyard wall cap | jp-wall-cap | 36 | 1 |
| Body | block | 12 | 1 |
| Round tower | round | 96 | 1 |
| Tapered tower | taper | 48 | 1 |
| Dome | dome | 132 | 1 |
| Spire | cone | 24 | 1 |
| Hip roof | roof | 8 | 1 |
| Column | pillar | 120 | 1 |
| Crown ring | ring | 192 | 1 |
| Steps | stairs | 48 | 1 |
| Foundation | slab | 12 | 1 |
| Capsule | capsule | 816 | 1 |
| Hexagonal hall | hex | 48 | 1 |
| Orb chamber | orb | 168 | 1 |
| Bell tower | bell | 144 | 1 |
| Hourglass tower | waist | 192 | 1 |
| Archway | archbody | 148 | 1 |
| Buttress | buttress | 12 | 1 |
| Onion dome | onion | 168 | 1 |
| Saucer roof | saucer | 120 | 1 |
| Pagoda roof | pagoda | 288 | 1 |
| Gable roof | gable | 8 | 1 |
| Stepped pyramid | pyramid | 60 | 1 |
| Swept fin | fin | 20 | 1 |
| Battlements | crown | 144 | 1 |
| Balcony | balcony | 84 | 1 |
| Chimney | chimney | 36 | 2 |
| Antenna | antenna | 592 | 1 |
| Banner | flag | 64 | 1 |
| Gear ornament | gear | 336 | 1 |
| Crystal | crystal | 8 | 1 |
| Elbow pipe | pipe | 224 | 1 |
| Awning | awning | 36 | 1 |

## New York collection

Empire State block: 133 parts, 5,608 triangles, 164 material batches. Building masses and shopfronts use textured generic cubes; streets, sidewalks, and roof finishes use generic slabs.

| Part | Triangles | Batches |
| --- | ---: | ---: |
| City cornice | 24 | 1 |
| Rooftop parapet | 48 | 1 |
| Art Deco mooring mast | 88 | 1 |
| Broadcast antenna | 100 | 1 |
| Deco entrance portal | 48 | 1 |
| Rooftop water tower | 96 | 2 |
| Rooftop plant unit | 60 | 2 |
| Fire escape landing | 144 | 1 |
| Shop awning | 24 | 1 |
| Zebra crossing | 72 | 1 |
| Street lamp | 56 | 2 |
| Yellow taxi | 132 | 3 |

Additional New York toppers: Mansard 124; Fluted Deco crown 148; Terraced crown 180; Octagonal cupola 112; Open rooftop lantern 76; Barrel vault 32; Sawtooth factory roof 32; Corner pinnacle crown 128 triangles.
