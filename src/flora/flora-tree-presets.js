// Saved editable game-reference trees and botanical presets.
import {FELUCIA_PRESETS} from './data/felucia-presets-data.js';
import {KAPOK_PRESETS} from './data/kapok-presets-data.js';
import {ASPEN_PRESETS} from './data/aspen-presets-data.js';
import {WETLAND_PRESETS} from './data/wetland-presets-data.js';
import {PALM_PRESETS} from './data/palm-presets-data.js';
const savedTrees=[
 {
  "id": "yavin-temple-broadleaf",
  "name": "Yavin · Temple Broadleaf",
  "sourceName": "Yavin · Temple Broadleaf",
  "category": "Tree presets",
  "paletteCategory": "Tree presets",
  "floraPreset": {
   "branches": [
    {
     "id": "node-0",
     "name": "Yavin · Temple Broadleaf",
     "parent": null,
     "at": 0,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.5,
       5,
       0.2
      ],
      [
       1.1,
       10,
       0.8
      ],
      [
       1.7,
       16,
       1.3
      ],
      [
       0.7,
       21,
       1.1
      ],
      [
       1.1,
       23.5,
       1
      ]
     ],
     "radii": [
      1.85,
      1.2,
      0.94,
      0.7,
      0.48,
      0.25
     ]
    },
    {
     "id": "node-1",
     "name": "Crown fork 1",
     "parent": "node-0",
     "at": 0.72,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -1.8111123159730271,
       3.2745449303483354,
       1.3965244006758204
      ],
      [
       -3.6222246319460543,
       5.549089860696671,
       2.793048801351641
      ]
     ],
     "radii": [
      0.55,
      0.385,
      0.1925
     ]
    },
    {
     "id": "node-2",
     "name": "Crown fork 2",
     "parent": "node-0",
     "at": 0.7999999999999999,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -1.3304196923592395,
       2.552384003149964,
       -2.499904538471848
      ],
      [
       -2.660839384718479,
       4.104768006299928,
       -4.999809076943696
      ]
     ],
     "radii": [
      0.48,
      0.385,
      0.1925
     ]
    },
    {
     "id": "node-3",
     "name": "Crown fork 3",
     "parent": "node-0",
     "at": 0.88,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       2.390400087761048,
       2.4769920596603354,
       -1.9293198224653443
      ],
      [
       4.780800175522096,
       3.953984119320671,
       -3.8586396449306886
      ]
     ],
     "radii": [
      0.55,
      0.385,
      0.1925
     ]
    }
   ],
   "organs": [
    {
     "id": "node-4",
     "branch": "node-1",
     "kind": "leaf",
     "at": 1,
     "offset": [
      -3.552713678800501e-15,
      0,
      1.7763568394002505e-15
     ],
     "rotation": [
      -0.4086492082930659,
      0.1033459642956252,
      -0.8705311875098193
     ],
     "scale": [
      0.9826715104980394,
      0.9412285113940014,
      0.9650703397113829
     ],
     "asset": "yavin-leaves",
     "billboard": {
      "count": 30,
      "radius": 12,
      "height": 1,
      "minSize": 7,
      "maxSize": 8,
      "heightScale": 0.5,
      "darknessMin": 0.5,
      "darknessMax": 1,
      "seed": 11,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    },
    {
     "id": "node-5",
     "branch": "node-2",
     "kind": "leaf",
     "at": 1,
     "offset": [
      1.7763568394002505e-15,
      -1.7763568394002505e-15,
      -3.552713678800501e-15
     ],
     "rotation": [
      0.950097957211818,
      -0.2369964599932064,
      -0.6249665041242265
     ],
     "scale": [
      0.8045155129861086,
      0.7341418219963088,
      0.7748289941810071
     ],
     "asset": "yavin-leaves",
     "billboard": {
      "count": 30,
      "radius": 12,
      "height": 1,
      "minSize": 7,
      "maxSize": 8,
      "heightScale": 0.5,
      "darknessMin": 0.5,
      "darknessMax": 1,
      "seed": 12,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    },
    {
     "id": "node-6",
     "branch": "node-3",
     "kind": "leaf",
     "at": 1,
     "offset": [
      7.105427357601e-15,
      -1.77635683940025e-15,
      -3.5527136788005e-15
     ],
     "rotation": [
      0.6553688827893134,
      0.31169449014649114,
      0.9942094979250337
     ],
     "scale": [
      0.7263579896418377,
      0.7270536067429929,
      0.7845830710837617
     ],
     "asset": "yavin-leaves",
     "billboard": {
      "count": 30,
      "radius": 12,
      "height": 1,
      "minSize": 7,
      "maxSize": 8,
      "heightScale": 0.5,
      "darknessMin": 0.5,
      "darknessMax": 1,
      "seed": 13,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    }
   ],
   "colors": {
    "bark": "#a29373",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {
    "bark": {
     "preset": "forest-bark",
     "scale": 0.5
    }
   }
  }
 },
 {
  "id": "yavin-slender-grove",
  "name": "Yavin · Slender Grove Tree",
  "sourceName": "Yavin · Slender Grove Tree",
  "category": "Tree presets",
  "paletteCategory": "Tree presets",
  "floraPreset": {
   "branches": [
    {
     "id": "node-0",
     "name": "Yavin · Slender Grove Tree",
     "parent": null,
     "at": 0,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.15,
       4,
       -0.2
      ],
      [
       0.4,
       8,
       -0.1
      ],
      [
       0.9,
       12,
       0.4
      ],
      [
       0.5,
       16,
       0.2
      ],
      [
       0.3,
       18,
       0
      ]
     ],
     "radii": [
      0.95,
      0.75,
      0.6,
      0.4,
      0.25,
      0.13
     ]
    },
    {
     "id": "node-1",
     "name": "Slender crown 1",
     "parent": "node-0",
     "at": 0.75,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -0.8707234705402727,
       2.323359517011032,
       -0.3948820062795425
      ],
      [
       -1.7414469410805453,
       3.6467190340220643,
       -0.789764012559085
      ]
     ],
     "radii": [
      0.35,
      0.24499999999999997,
      0.12249999999999998
     ]
    },
    {
     "id": "node-2",
     "name": "Slender crown 2",
     "parent": "node-0",
     "at": 0.85,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       1.0696676222732204,
       0.823032215895207,
       1.0632834193450524
      ],
      [
       2.139335244546441,
       0.646064431790414,
       2.126566838690105
      ]
     ],
     "radii": [
      0.35,
      0.24499999999999997,
      0.12249999999999998
     ]
    }
   ],
   "organs": [
    {
     "id": "node-3",
     "branch": "node-1",
     "kind": "leaf",
     "at": 1,
     "offset": [
      -3.552713678800501e-15,
      -7.105427357601002e-15,
      -1.7763568394002505e-15
     ],
     "rotation": [
      0.31098807402433576,
      -0.1191243377681089,
      -0.6928632197168731
     ],
     "scale": [
      0.723982553067617,
      0.7900810320628806,
      0.7601950527867302
     ],
     "asset": "yavin-fine-leaves",
     "billboard": {
      "count": 20,
      "radius": 10,
      "height": 2,
      "minSize": 5,
      "maxSize": 6,
      "heightScale": 0.5,
      "darknessMin": 0.5,
      "darknessMax": 1,
      "seed": 22,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    },
    {
     "id": "node-4",
     "branch": "node-2",
     "kind": "leaf",
     "at": 1,
     "offset": [
      -1.2434497875801756e-14,
      -2.6645352591003765e-15,
      -1.0658141036401506e-14
     ],
     "rotation": [
      -0.943073259475744,
      -0.5141324140418676,
      0.9469865587133794
     ],
     "scale": [
      0.7458250296767801,
      0.7829912909073755,
      0.7699506554985419
     ],
     "asset": "yavin-fine-leaves",
     "billboard": {
      "count": 20,
      "radius": 10,
      "height": 2,
      "minSize": 5,
      "maxSize": 6,
      "heightScale": 0.5,
      "darknessMin": 0.5,
      "darknessMax": 1,
      "seed": 23,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    }
   ],
   "colors": {
    "bark": "#a29373",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {
    "bark": {
     "preset": "forest-bark",
     "scale": 0.5
    }
   }
  }
 },
 {
  "id": "dagobah-grand-swamp",
  "name": "Dagobah · Grand Swamp Tree",
  "sourceName": "Dagobah · Grand Swamp Tree",
  "category": "Tree presets",
  "paletteCategory": "Tree presets",
  "floraPreset": {
   "branches": [
    {
     "id": "node-0",
     "name": "Dagobah · Grand Swamp Tree",
     "parent": null,
     "at": 0,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.4,
       3,
       0.4
      ],
      [
       0.8,
       6,
       -0.1
      ],
      [
       1.6,
       10,
       -1.2
      ],
      [
       0.4,
       14,
       -2
      ],
      [
       0.3,
       17,
       -2.6
      ]
     ],
     "radii": [
      2.5,
      1.75,
      1.35,
      0.94,
      0.55,
      0.28
     ]
    },
    {
     "id": "node-1",
     "name": "Swamp crown 1",
     "parent": "node-0",
     "at": 0.44,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.6010470367512213,
       2.1024037851440576,
       -0.1161974073733657
      ],
      [
       1.2020940735024426,
       3.204807570288115,
       -0.2323948147467314
      ]
     ],
     "radii": [
      0.6,
      0.42,
      0.21
     ]
    },
    {
     "id": "node-2",
     "name": "Swamp crown 2",
     "parent": "node-0",
     "at": 0.6,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -1.2848417062694077,
       3.941643990933735,
       0.0609537211204355
      ],
      [
       -2.5696834125388155,
       6.88328798186747,
       0.121907442240871
      ]
     ],
     "radii": [
      0.94,
      0.42,
      0.21
     ]
    },
    {
     "id": "node-3",
     "name": "Swamp crown 3",
     "parent": "node-0",
     "at": 0.76,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -0.4486670909000763,
       0.14256314144820514,
       0.931787060688591
      ],
      [
       -0.8973341818001526,
       -0.7148737171035897,
       1.863574121377182
      ]
     ],
     "radii": [
      0.6,
      0.42,
      0.21
     ]
    },
    {
     "id": "node-4",
     "name": "Buttress root 1",
     "parent": "node-0",
     "at": 0.015,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       2.9662805466689663,
       0.23614909340461943,
       -0.037678750471959024
      ],
      [
       5.932561093337933,
       0.6722981868092387,
       -0.07535750094391805
      ]
     ],
     "radii": [
      1.1,
      0.77,
      0.385
     ]
    },
    {
     "id": "node-5",
     "name": "Buttress root 2",
     "parent": "node-0",
     "at": 0.015,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.882932904265221,
       0.3937209999164064,
       2.803540670202893
      ],
      [
       1.765865808530442,
       0.9874419998328128,
       5.607081340405786
      ]
     ],
     "radii": [
      1.1,
      0.77,
      0.385
     ]
    },
    {
     "id": "node-6",
     "name": "Buttress root 3",
     "parent": "node-0",
     "at": 0.015,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -2.43144717046751,
       -0.20819068152394365,
       1.7593753819408995
      ],
      [
       -4.86289434093502,
       -0.21638136304788735,
       3.518750763881799
      ]
     ],
     "radii": [
      1.1,
      0.77,
      0.385
     ]
    },
    {
     "id": "node-7",
     "name": "Buttress root 4",
     "parent": "node-0",
     "at": 0.015,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -2.3964990658840097,
       -0.7377644653914665,
       -1.727173676752697
      ],
      [
       -4.7929981317680195,
       -1.275528930782933,
       -3.454347353505394
      ]
     ],
     "radii": [
      1.1,
      0.77,
      0.385
     ]
    },
    {
     "id": "node-8",
     "name": "Buttress root 5",
     "parent": "node-0",
     "at": 0.015,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.9394801253237111,
       -0.4631473819321361,
       -2.837814210207298
      ],
      [
       1.8789602506474221,
       -0.7262947638642723,
       -5.675628420414596
      ]
     ],
     "radii": [
      1.1,
      0.77,
      0.385
     ]
    }
   ],
   "organs": [
    {
     "id": "node-9",
     "branch": "node-1",
     "kind": "leaf",
     "at": 1,
     "offset": [
      2.6645352591003765e-15,
      0,
      0
     ],
     "rotation": [
      0.30310412608085247,
      0.1714136427767822,
      0.7272343840354804
     ],
     "scale": [
      0.7652920697117225,
      0.7389320268062874,
      0.7553167140344158
     ],
     "asset": "dagobah-canopy",
     "billboard": {
      "count": 30,
      "radius": 12,
      "height": 1,
      "minSize": 7,
      "maxSize": 8,
      "heightScale": 0.5,
      "darknessMin": 1,
      "darknessMax": 1,
      "seed": 33,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    },
    {
     "id": "node-10",
     "branch": "node-2",
     "kind": "leaf",
     "at": 1,
     "offset": [
      1.7763568394002505e-15,
      0,
      -1.1102230246251565e-15
     ],
     "rotation": [
      0.23315639945555952,
      -0.07723581980901043,
      -0.20851517210927417
     ],
     "scale": [
      0.7871360722463577,
      0.8318453374551609,
      0.7650753685738891
     ],
     "asset": "dagobah-canopy",
     "billboard": {
      "count": 30,
      "radius": 12,
      "height": 1,
      "minSize": 7,
      "maxSize": 8,
      "heightScale": 0.5,
      "darknessMin": 1,
      "darknessMax": 1,
      "seed": 34,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    },
    {
     "id": "node-11",
     "branch": "node-3",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      -3.552713678800501e-15,
      -2.6645352591003757e-15
     ],
     "rotation": [
      -1.8376417964855687,
      0.5840894083674839,
      -0.8722341413093644
     ],
     "scale": [
      0.8089770229998976,
      0.824757122155279,
      0.7748294454067945
     ],
     "asset": "dagobah-canopy",
     "billboard": {
      "count": 30,
      "radius": 12,
      "height": 1,
      "minSize": 7,
      "maxSize": 8,
      "heightScale": 0.5,
      "darknessMin": 1,
      "darknessMax": 1,
      "seed": 35,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    }
   ],
   "colors": {
    "bark": "#667065",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {
    "bark": {
     "preset": "forest-bark",
     "scale": 0.5
    }
   }
  }
 },
 {
  "id": "dagobah-twisted-elder",
  "name": "Dagobah · Twisted Elder",
  "sourceName": "Dagobah · Twisted Elder",
  "category": "Tree presets",
  "paletteCategory": "Tree presets",
  "floraPreset": {
   "branches": [
    {
     "id": "node-0",
     "name": "Dagobah · Twisted Elder",
     "parent": null,
     "at": 0,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -0.5,
       3,
       0.4
      ],
      [
       -2.5,
       6,
       1
      ],
      [
       -3.8,
       10,
       -0.4
      ],
      [
       -1.8,
       14,
       -1.2
      ],
      [
       -0.6,
       18,
       -2
      ]
     ],
     "radii": [
      3,
      2.4,
      1.9,
      1.2,
      0.65,
      0.32
     ]
    },
    {
     "id": "node-1",
     "name": "Crooked arm 1",
     "parent": "node-0",
     "at": 0.46,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -1.433702882146174,
       4.639306262488484,
       -0.19058291971367725
      ],
      [
       -2.867405764292348,
       8.278612524976968,
       -0.3811658394273545
      ]
     ],
     "radii": [
      0.9,
      0.63,
      0.315
     ]
    },
    {
     "id": "node-2",
     "name": "Crooked arm 2",
     "parent": "node-0",
     "at": 0.62,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       4.238542554890227,
       3.302529440022597,
       2.8666102214802076
      ],
      [
       8.477085109780454,
       5.605058880045194,
       5.733220442960415
      ]
     ],
     "radii": [
      0.9,
      0.63,
      0.315
     ]
    },
    {
     "id": "node-3",
     "name": "Crooked arm 3",
     "parent": "node-0",
     "at": 0.78,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.8799318332963051,
       -0.9851593550589952,
       0.3854364247282669
      ],
      [
       1.7598636665926102,
       -2.9703187101179904,
       0.7708728494565338
      ]
     ],
     "radii": [
      0.9,
      0.63,
      0.315
     ]
    },
    {
     "id": "node-4",
     "name": "Buttress root 1",
     "parent": "node-0",
     "at": 0.015,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       2.981973485066801,
       -0.5619101363469134,
       0.01821362798944332
      ],
      [
       5.963946970133602,
       -0.923820272693827,
       0.03642725597888664
      ]
     ],
     "radii": [
      1.1,
      0.77,
      0.385
     ]
    },
    {
     "id": "node-5",
     "name": "Buttress root 2",
     "parent": "node-0",
     "at": 0.015,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.9529221670835287,
       0.08146980367485923,
       2.8301003794463497
      ],
      [
       1.9058443341670575,
       0.36293960734971853,
       5.6602007588926995
      ]
     ],
     "radii": [
      1.1,
      0.77,
      0.385
     ]
    },
    {
     "id": "node-6",
     "name": "Buttress root 3",
     "parent": "node-0",
     "at": 0.015,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -2.379682040441616,
       0.3965484312097892,
       1.720069408839064
      ],
      [
       -4.759364080883232,
       0.9930968624195783,
       3.440138817678128
      ]
     ],
     "radii": [
      1.1,
      0.77,
      0.385
     ]
    },
    {
     "id": "node-7",
     "name": "Buttress root 4",
     "parent": "node-0",
     "at": 0.015,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -2.410293393759792,
       -0.05210220786672837,
       -1.7778542110181808
      ],
      [
       -4.820586787519584,
       0.09579558426654322,
       -3.5557084220363615
      ]
     ],
     "radii": [
      1.1,
      0.77,
      0.385
     ]
    },
    {
     "id": "node-8",
     "name": "Buttress root 5",
     "parent": "node-0",
     "at": 0.015,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.9033919569730883,
       -0.6444621794253079,
       -2.8296589275337394
      ],
      [
       1.8067839139461765,
       -1.088924358850616,
       -5.659317855067479
      ]
     ],
     "radii": [
      1.1,
      0.77,
      0.385
     ]
    }
   ],
   "organs": [
    {
     "id": "node-9",
     "branch": "node-1",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      -1.7763568394002505e-15,
      4.440892098500626e-16
     ],
     "rotation": [
      0.31861200904596126,
      -0.18485251189958282,
      -0.776350867967118
     ],
     "scale": [
      0.8055577867897227,
      0.7609631847590207,
      0.7626329218503087
     ],
     "asset": "dagobah-canopy",
     "billboard": {
      "count": 24,
      "radius": 7,
      "height": 1,
      "minSize": 5,
      "maxSize": 7,
      "heightScale": 0.5,
      "darknessMin": 1,
      "darknessMax": 1,
      "seed": 44,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    },
    {
     "id": "node-10",
     "branch": "node-1",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      -1.7763568394002505e-15,
      4.440892098500626e-16
     ],
     "rotation": [
      0.31861200904596126,
      -0.18485251189958282,
      -0.776350867967118
     ],
     "scale": [
      0.7468688293127342,
      0.8098157053813337,
      0.7577576348790899
     ],
     "asset": "dagobah-vines",
     "billboard": {
      "count": 14,
      "radius": 5,
      "height": 1,
      "minSize": 2,
      "maxSize": 2,
      "heightScale": 4,
      "darknessMin": 0.5,
      "darknessMax": 1,
      "seed": 55,
      "facing": "upright",
      "atlas": 2,
      "anchor": "top"
     }
    },
    {
     "id": "node-11",
     "branch": "node-2",
     "kind": "leaf",
     "at": 1,
     "offset": [
      -5.329070518200751e-15,
      -1.7763568394002505e-15,
      -8.881784197001252e-16
     ],
     "rotation": [
      -0.4371724182084703,
      -0.07225538452699035,
      1.1694363573679003
     ],
     "scale": [
      0.8274017892777918,
      0.753876495338045,
      0.7723915763432159
     ],
     "asset": "dagobah-canopy",
     "billboard": {
      "count": 24,
      "radius": 7,
      "height": 1,
      "minSize": 5,
      "maxSize": 7,
      "heightScale": 0.5,
      "darknessMin": 1,
      "darknessMax": 1,
      "seed": 45,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    },
    {
     "id": "node-12",
     "branch": "node-2",
     "kind": "leaf",
     "at": 1,
     "offset": [
      -5.329070518200751e-15,
      -1.7763568394002505e-15,
      -8.881784197001252e-16
     ],
     "rotation": [
      -0.4371724182084703,
      -0.07225538452699035,
      1.1694363573679003
     ],
     "scale": [
      0.7687113059684634,
      0.8027259642491117,
      0.7675132376374676
     ],
     "asset": "dagobah-vines",
     "billboard": {
      "count": 14,
      "radius": 5,
      "height": 1,
      "minSize": 2,
      "maxSize": 2,
      "heightScale": 4,
      "darknessMin": 0.5,
      "darknessMax": 1,
      "seed": 56,
      "facing": "upright",
      "atlas": 2,
      "anchor": "top"
     }
    },
    {
     "id": "node-13",
     "branch": "node-3",
     "kind": "leaf",
     "at": 1,
     "offset": [
      -2.220446049250313e-15,
      -3.552713678800501e-15,
      -1.7763568394002505e-15
     ],
     "rotation": [
      -0.455752356603151,
      -0.701903298865673,
      2.8738452253496782
     ],
     "scale": [
      0.8492442658869549,
      0.8467867541825398,
      0.7821456531761214
     ],
     "asset": "dagobah-canopy",
     "billboard": {
      "count": 24,
      "radius": 7,
      "height": 1,
      "minSize": 5,
      "maxSize": 7,
      "heightScale": 0.5,
      "darknessMin": 1,
      "darknessMax": 1,
      "seed": 46,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    }
   ],
   "colors": {
    "bark": "#727970",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {
    "bark": {
     "preset": "forest-bark",
     "scale": 0.5
    }
   }
  }
 },
 {
  "id": "endor-forest-redwood",
  "name": "Endor · Forest Redwood",
  "sourceName": "END/msh/end_prop_tree01.msh",
  "paletteCategory": "Tree presets",
  "category": "Tree presets",
  "source": "END/msh/end_prop_tree01.msh",
  "floraPreset": {
   "branches": [
    {
     "id": "node-0",
     "name": "Endor · Forest Redwood",
     "parent": null,
     "at": 0,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.1,
       6,
       -0.1
      ],
      [
       0.25,
       13,
       -0.25
      ],
      [
       0.1,
       20,
       -0.4
      ],
      [
       -0.2,
       27,
       -0.5
      ],
      [
       -0.1,
       34,
       -0.25
      ],
      [
       0,
       39,
       0
      ]
     ],
     "radii": [
      1.65,
      1.15,
      0.85,
      0.65,
      0.42,
      0.25,
      0.04
     ]
    },
    {
     "id": "node-1",
     "name": "Redwood root 1",
     "parent": "node-0",
     "at": 0.008,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       1.2414771668490436,
       0.07031098152026949,
       0.3846365376739856
      ],
      [
       2.4829543336980873,
       -0.219378036959461,
       0.7692730753479712
      ]
     ],
     "radii": [
      0.62,
      0.403,
      0.124
     ]
    },
    {
     "id": "node-2",
     "name": "Redwood root 2",
     "parent": "node-0",
     "at": 0.008,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -0.38430077998511897,
       0.029473073808461342,
       1.2420619471886654
      ],
      [
       -0.7686015599702379,
       -0.3010538523830773,
       2.4841238943773307
      ]
     ],
     "radii": [
      0.62,
      0.403,
      0.124
     ]
    },
    {
     "id": "node-3",
     "name": "Redwood root 3",
     "parent": "node-0",
     "at": 0.008,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -1.2421658092129173,
       0.04210571902193597,
       -0.3839478953101119
      ],
      [
       -2.4843316184258346,
       -0.27578856195612805,
       -0.7678957906202238
      ]
     ],
     "radii": [
      0.62,
      0.403,
      0.124
     ]
    },
    {
     "id": "node-4",
     "name": "Redwood root 4",
     "parent": "node-0",
     "at": 0.008,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.3836121376212452,
       0.08294362673374411,
       -1.2413733048247921
      ],
      [
       0.7672242752424904,
       -0.19411274653251176,
       -2.4827466096495843
      ]
     ],
     "radii": [
      0.62,
      0.403,
      0.124
     ]
    }
   ],
   "organs": [
    {
     "id": "node-5",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.32871794871794874,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -3.120046193701154,
      -0.000026761417770785803,
      -1.0182845684062862
     ],
     "scale": [
      1.44,
      1.44,
      1.44
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-6",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.3333333333333333,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -0.01567568768545791,
      1.04702961840543,
      2.224360413326571
     ],
     "scale": [
      1.44,
      1.44,
      1.44
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-7",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.33794871794871795,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0.018573901330273708,
      -1.0472138555509476,
      2.1222808695342437
     ],
     "scale": [
      1.44,
      1.44,
      1.44
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-8",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.40051282051282056,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -3.139091028202309,
      0.7700258744890531,
      -0.9869878787192781
     ],
     "scale": [
      1.4,
      1.4,
      1.4
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-9",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.40512820512820513,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0.028686614922705432,
      0.2768859882727691,
      2.1589418509027065
     ],
     "scale": [
      1.4,
      1.4,
      1.4
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-10",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.40974358974358976,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -3.029207389167947,
      -1.3231183187649416,
      -0.923047432019207
     ],
     "scale": [
      1.4,
      1.4,
      1.4
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-11",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.4723076923076924,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      2.3641670252006293,
      1.5271519594386478,
      -0.2179658764492925
     ],
     "scale": [
      1.3199999999999998,
      1.3199999999999998,
      1.3199999999999998
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-12",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.47692307692307695,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0.002699836268435394,
      -0.4928449898635441,
      2.1457556471091412
     ],
     "scale": [
      1.3199999999999998,
      1.3199999999999998,
      1.3199999999999998
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-13",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.4815384615384616,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -3.1026592229692693,
      -0.5537773505901571,
      -0.9784925757248781
     ],
     "scale": [
      1.3199999999999998,
      1.3199999999999998,
      1.3199999999999998
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-14",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.5441025641025641,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0.07783509044237154,
      0.8296344090924856,
      2.0512556154156885
     ],
     "scale": [
      1.2,
      1.2,
      1.2
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-15",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.5487179487179487,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -0.13716970365007503,
      -1.2592781853259745,
      2.0136095061885944
     ],
     "scale": [
      1.2,
      1.2,
      1.2
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-16",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.5533333333333333,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -3.130310262773763,
      0.21589841801817872,
      -0.9625472108960972
     ],
     "scale": [
      1.2,
      1.2,
      1.2
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-17",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.6158974358974358,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0.014346471774665118,
      0.06127224915578867,
      2.081049217771358
     ],
     "scale": [
      1.06,
      1.06,
      1.06
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-18",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.6205128205128205,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -3.0458495983277145,
      -1.1067397483134855,
      -0.8643223026069978
     ],
     "scale": [
      1.06,
      1.06,
      1.06
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-19",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.6251282051282051,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      3.088575881455143,
      0.9845237344963649,
      -0.9420723602090444
     ],
     "scale": [
      1.06,
      1.06,
      1.06
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-20",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.6876923076923077,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -0.022328682001305153,
      -0.7083906768290212,
      2.123825978343876
     ],
     "scale": [
      0.9400000000000001,
      0.9400000000000001,
      0.9400000000000001
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-21",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.6923076923076923,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      3.1182434769624536,
      -0.33877950047404976,
      -0.9610424657216025
     ],
     "scale": [
      0.9400000000000001,
      0.9400000000000001,
      0.9400000000000001
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-22",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.6969230769230769,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -0.04197892791978927,
      1.3859207369605264,
      2.1431619443507874
     ],
     "scale": [
      0.9400000000000001,
      0.9400000000000001,
      0.9400000000000001
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-23",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.7594871794871795,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0.1939733176422048,
      -1.476246809399052,
      2.362608776815909
     ],
     "scale": [
      0.8,
      0.8,
      0.8
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-24",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.7641025641025642,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      3.109569231583097,
      0.4315737815287778,
      -0.9850921156170293
     ],
     "scale": [
      0.8,
      0.8,
      0.8
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-25",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.7687179487179487,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -0.059479030613554314,
      0.6152979191890999,
      2.1541941857476825
     ],
     "scale": [
      0.8,
      0.8,
      0.8
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-26",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.8312820512820513,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      3.0764859513695506,
      -0.8926083071041093,
      -1.0440507399353975
     ],
     "scale": [
      0.6799999999999999,
      0.6799999999999999,
      0.6799999999999999
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-27",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.8358974358974359,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -3.1401858628687687,
      1.2011976307950922,
      -1.0079353917935743
     ],
     "scale": [
      0.6799999999999999,
      0.6799999999999999,
      0.6799999999999999
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-28",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.8405128205128205,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -0.04120554124978087,
      -0.1543742733986496,
      2.1435719281248105
     ],
     "scale": [
      0.6799999999999999,
      0.6799999999999999,
      0.6799999999999999
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-29",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.897948717948718,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      3.0883556474455642,
      -0.12264527233189174,
      -1.036237236760926
     ],
     "scale": [
      0.5599999999999999,
      0.5599999999999999,
      0.5599999999999999
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-30",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.9025641025641027,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -0.09921993566779197,
      1.1693694874078426,
      2.2338080804541702
     ],
     "scale": [
      0.5599999999999999,
      0.5599999999999999,
      0.5599999999999999
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-31",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.9071794871794873,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -0.024166642351308217,
      -0.9242606275353195,
      2.1599033981653912
     ],
     "scale": [
      0.5599999999999999,
      0.5599999999999999,
      0.5599999999999999
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-32",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.9543589743589743,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      3.10494281855222,
      0.6471995764860523,
      -1.0421196330925384
     ],
     "scale": [
      0.42000000000000004,
      0.42000000000000004,
      0.42000000000000004
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-33",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.9589743589743589,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -0.06127711574510983,
      0.3997406428778547,
      2.2042722569926934
     ],
     "scale": [
      0.42000000000000004,
      0.42000000000000004,
      0.42000000000000004
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-34",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.9635897435897436,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      2.9228522306998093,
      -1.4452901601175456,
      -1.1835506684486892
     ],
     "scale": [
      0.42000000000000004,
      0.42000000000000004,
      0.42000000000000004
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-35",
     "branch": "node-0",
     "kind": "leaf",
     "at": 0.9953846153846154,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -3.062524323186635,
      1.4160168541189122,
      -1.1467876883320207
     ],
     "scale": [
      0.4,
      0.4,
      0.4
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-36",
     "branch": "node-0",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -0.0422098423281416,
      -0.37003877476293173,
      2.202944907436341
     ],
     "scale": [
      0.4,
      0.4,
      0.4
     ],
     "asset": "endor-redwood-foliage"
    },
    {
     "id": "node-37",
     "branch": "node-0",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      3.0755819867154295,
      -0.6769210850198335,
      -1.0414235878966964
     ],
     "scale": [
      0.4,
      0.4,
      0.4
     ],
     "asset": "endor-redwood-foliage"
    }
   ],
   "colors": {
    "bark": "#8c7964",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {
    "bark": {
     "preset": "forest-bark",
     "scale": 0.5
    }
   }
  }
 },
 {
  "id": "endor-woodland-tree",
  "name": "Endor · Woodland Tree",
  "sourceName": "END/odf/end_prop_leaftree3.odf",
  "paletteCategory": "Tree presets",
  "category": "Tree presets",
  "source": "END/odf/end_prop_leaftree3.odf",
  "floraPreset": {
   "branches": [
    {
     "id": "node-0",
     "name": "Endor · Woodland Tree",
     "parent": null,
     "at": 0,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -0.1,
       3,
       -0.2
      ],
      [
       0.35,
       7,
       -0.35
      ],
      [
       0.8,
       10,
       -0.55
      ],
      [
       1.2,
       14,
       -0.65
      ],
      [
       1.7,
       18,
       -0.75
      ]
     ],
     "radii": [
      0.7,
      0.48,
      0.38,
      0.3,
      0.2,
      0.12
     ]
    },
    {
     "id": "node-1",
     "name": "Woodland crown 1",
     "parent": "node-0",
     "at": 0.63,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.7204992690762253,
       1.7951901023027503,
       -0.8054426956934679
      ],
      [
       1.4409985381524506,
       3.230380204605501,
       -1.6108853913869359
      ]
     ],
     "radii": [
      0.23,
      0.14950000000000002,
      0.046000000000000006
     ]
    },
    {
     "id": "node-2",
     "name": "Woodland crown 2",
     "parent": "node-0",
     "at": 0.87,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -0.026257634873376685,
       1.5249251383844995,
       0.05726703234933812
      ],
      [
       -0.05251526974675337,
       2.689850276768999,
       0.11453406469867625
      ]
     ],
     "radii": [
      0.23,
      0.14950000000000002,
      0.046000000000000006
     ]
    },
    {
     "id": "node-3",
     "name": "Woodland crown 3",
     "parent": "node-0",
     "at": 0.63,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -0.7487444253583074,
       1.5837448567531773,
       0.7256690088643987
      ],
      [
       -1.4974888507166149,
       2.807489713506355,
       1.4513380177287973
      ]
     ],
     "radii": [
      0.23,
      0.14950000000000002,
      0.046000000000000006
     ]
    }
   ],
   "organs": [
    {
     "id": "node-4",
     "branch": "node-1",
     "kind": "leaf",
     "at": 1,
     "offset": [
      -1.7763568394002505e-15,
      1.7763568394002505e-15,
      1.7763568394002505e-15
     ],
     "rotation": [
      0.4980803043183851,
      0.11549337363972727,
      0.5192745162497041
     ],
     "scale": [
      0.8505743769463152,
      0.8569379661465064,
      0.8187297438504174
     ],
     "asset": "endor-leaves",
     "billboard": {
      "count": 20,
      "radius": 10,
      "height": 2,
      "minSize": 5,
      "maxSize": 6,
      "heightScale": 0.5,
      "darknessMin": 0.5,
      "darknessMax": 1,
      "seed": 101,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    },
    {
     "id": "node-5",
     "branch": "node-2",
     "kind": "leaf",
     "at": 1,
     "offset": [
      2.7755575615628907e-17,
      -1.06581410364015e-14,
      4.440892098500625e-16
     ],
     "rotation": [
      -0.02427819339743631,
      0.0015427408193603178,
      0.10220138120959131
     ],
     "scale": [
      0.872415327723138,
      0.8498482250375673,
      0.8284838207531721
     ],
     "asset": "endor-leaves",
     "billboard": {
      "count": 20,
      "radius": 10,
      "height": 2,
      "minSize": 5,
      "maxSize": 6,
      "heightScale": 0.5,
      "darknessMin": 0.5,
      "darknessMax": 1,
      "seed": 102,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    },
    {
     "id": "node-6",
     "branch": "node-3",
     "kind": "leaf",
     "at": 1,
     "offset": [
      1.7763568394002505e-15,
      -3.552713678800501e-15,
      8.881784197001252e-16
     ],
     "rotation": [
      -0.44079646833803643,
      0.10521850914747184,
      -0.384019600014761
     ],
     "scale": [
      0.8942608560901135,
      0.8427615356165915,
      0.8382424752227962
     ],
     "asset": "endor-leaves",
     "billboard": {
      "count": 20,
      "radius": 10,
      "height": 2,
      "minSize": 5,
      "maxSize": 6,
      "heightScale": 0.5,
      "darknessMin": 0.5,
      "darknessMax": 1,
      "seed": 103,
      "facing": "camera",
      "atlas": 2,
      "anchor": "center"
     }
    }
   ],
   "colors": {
    "bark": "#958365",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {
    "bark": {
     "preset": "forest-bark",
     "scale": 0.5
    }
   }
  }
 }
];
export const FLORA_TREE_PRESETS=[...savedTrees,...FELUCIA_PRESETS,...KAPOK_PRESETS,...ASPEN_PRESETS,...WETLAND_PRESETS,...PALM_PRESETS].map(p=>({...p,floraPreset:{...p.floraPreset,detail:'swbf2'},iconUrl:new URL('../../assets/flora-tree-presets/'+p.id+'.png',import.meta.url).href}));
export function instantiateFloraTreePreset(id){
 const preset=FLORA_TREE_PRESETS.find(p=>p.id===id);if(!preset)throw Error('Unknown tree preset.');
 const flora=structuredClone(preset.floraPreset),nodes=[...flora.branches,...flora.organs],ids=new Map(nodes.map(n=>[n.id,crypto.randomUUID()]));
 for(const node of nodes)for(const key of ['id','parent','branch','parentOrgan'])if(ids.has(node[key]))node[key]=ids.get(node[key]);
 return {name:preset.name,flora};
}
