// Editable Felucia stalks with joint-free reference organs.
export const FELUCIA_PRESETS=[
 {
  "id": "felucia-flared-pitcher-plant",
  "name": "Felucia · Flared Pitcher",
  "sourceName": "SWBF2 Felucia Flared Pitcher",
  "category": "Tree presets",
  "paletteCategory": "Tree presets",
  "planet": "Felucia",
  "floraPreset": {
   "branches": [
    {
     "id": "fb290ea1-6348-4f8f-99e2-a2d5d9e79124",
     "name": "Pitcher stalk",
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
       0,
       0.45,
       0
      ],
      [
       0,
       1.4,
       0
      ]
     ],
     "radii": [
      0.34,
      0.3,
      0.24
     ]
    },
    {
     "id": "42e71594-ca8e-4cbe-8619-7d526c4f59d6",
     "name": "Pitcher feeler",
     "parent": "fb290ea1-6348-4f8f-99e2-a2d5d9e79124",
     "at": 1,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.028032350763451598,
       -0.6529999999999998,
       0.0022474872482661154
      ],
      [
       -1.3639676492365485,
       -3.931,
       0.16424748724826613
      ],
      [
       -2.9849676492365482,
       -5.6049999999999995,
       0.2742474872482661
      ],
      [
       -3.470028236236548,
       -6.875,
       0.4886890252482662
      ]
     ],
     "radii": [
      0.09,
      0.09,
      0.075,
      0.07,
      0.045
     ],
     "parentOrgan": "48a144c6-03e5-40eb-bd98-7ad930b28f96",
     "pin": {
      "mesh": 0,
      "triangle": 230,
      "bary": [
       0,
       0,
       1
      ]
     },
     "mounted": true,
     "depth": 0.025
    }
   ],
   "organs": [
    {
     "id": "48a144c6-03e5-40eb-bd98-7ad930b28f96",
     "branch": "fb290ea1-6348-4f8f-99e2-a2d5d9e79124",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      2.84138027037828,
      0,
      2.7830791084933413
     ],
     "scale": [
      0.85,
      0.85,
      0.85
     ],
     "asset": "felucia-flared-pitcher",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 288,
       "bary": [
        0,
        0,
        1
       ]
      },
      "followFrame": true
     },
     "mounted": true,
     "depth": 0.035
    },
    {
     "id": "b96b6551-26cf-40c0-a0fa-c11f8e93af45",
     "branch": "42e71594-ca8e-4cbe-8619-7d526c4f59d6",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      2.6913207809564144,
      -0.804833373431018,
      -3.132703769791363
     ],
     "scale": [
      1,
      1,
      1
     ],
     "asset": "felucia-pitcher-feeler",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 288,
       "bary": [
        0,
        0,
        1
       ]
      },
      "followFrame": true
     },
     "mounted": true,
     "depth": 0.035
    }
   ],
   "colors": {
    "bark": "#68a5a2",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {}
  }
 },
 {
  "id": "felucia-slender-pitcher-plant",
  "name": "Felucia · Slender Pitcher",
  "sourceName": "SWBF2 Felucia Slender Pitcher",
  "category": "Tree presets",
  "paletteCategory": "Tree presets",
  "planet": "Felucia",
  "floraPreset": {
   "branches": [
    {
     "id": "300cabd6-a414-48e2-b73f-06f4adaabd80",
     "name": "Slender pitcher stalk",
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
       0.45,
       0
      ],
      [
       0.1,
       1.05,
       0
      ]
     ],
     "radii": [
      0.22,
      0.18,
      0.15
     ]
    },
    {
     "id": "0146e61b-41cd-4a53-a69e-a274f661d96d",
     "name": "Slender feeler",
     "parent": "300cabd6-a414-48e2-b73f-06f4adaabd80",
     "at": 1,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.15540360451047672,
       -0.7789999999999999,
       0.013683959700795036
      ],
      [
       0.6504036045104765,
       -2.4539999999999997,
       0.25868395970079505
      ],
      [
       1.2344036045104765,
       -3.1489999999999996,
       0.42068395970079503
      ]
     ],
     "radii": [
      0.07,
      0.07,
      0.055,
      0.04
     ],
     "parentOrgan": "a6b821e5-1388-4636-9990-7ccb5036fae0",
     "pin": {
      "mesh": 0,
      "triangle": 198,
      "bary": [
       0,
       0,
       1
      ]
     },
     "mounted": true,
     "depth": 0.025
    }
   ],
   "organs": [
    {
     "id": "a6b821e5-1388-4636-9990-7ccb5036fae0",
     "branch": "300cabd6-a414-48e2-b73f-06f4adaabd80",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      2.8413796440001704,
      0,
      2.783058729065682
     ],
     "scale": [
      1.1,
      1.1,
      1.1
     ],
     "asset": "felucia-slender-pitcher",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 288,
       "bary": [
        0,
        0,
        1
       ]
      },
      "followFrame": true
     },
     "mounted": true,
     "depth": 0.035
    },
    {
     "id": "b65f23da-09d8-4837-b189-6187886910c5",
     "branch": "0146e61b-41cd-4a53-a69e-a274f661d96d",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -3.0880776246004285,
      0.3696764027503136,
      1.9743638841284672
     ],
     "scale": [
      0.6,
      0.6,
      0.6
     ],
     "asset": "felucia-pitcher-feeler",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 288,
       "bary": [
        0,
        0,
        1
       ]
      },
      "followFrame": true
     },
     "mounted": true,
     "depth": 0.035
    }
   ],
   "colors": {
    "bark": "#55938e",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {}
  }
 },
 {
  "id": "felucia-inflated-pod-plant",
  "name": "Felucia · Bladder Pair",
  "sourceName": "SWBF2 Felucia Bladder Pair",
  "category": "Tree presets",
  "paletteCategory": "Tree presets",
  "planet": "Felucia",
  "floraPreset": {
   "branches": [
    {
     "id": "2d30ad02-94be-4594-891d-42400783fe1e",
     "name": "Bladder base",
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
       0,
       0.636622593702242,
       0
      ],
      [
       0,
       1.6204938748784337,
       0
      ]
     ],
     "radii": [
      0.4861481624635302,
      0.3472486874739501,
      0.19677425623523845
     ]
    },
    {
     "id": "496be65f-0074-4a17-b4c0-2905f87ba286",
     "name": "Pod stalk",
     "parent": "2d30ad02-94be-4594-891d-42400783fe1e",
     "at": 1,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -0.7523721561935587,
       0.7639471124426903,
       0
      ],
      [
       -1.273245187404484,
       1.3889947498958004,
       0
      ]
     ],
     "radii": [
      0.19677425623523845,
      0.2662239937300284,
      0.2430740812317651
     ]
    },
    {
     "id": "33ce69f1-f35e-417a-89d1-db65568e129b",
     "name": "Pod stalk",
     "parent": "2d30ad02-94be-4594-891d-42400783fe1e",
     "at": 1,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.7523721561935587,
       1.0822584092938115,
       0
      ],
      [
       1.273245187404484,
       1.967742562352384,
       0
      ]
     ],
     "radii": [
      0.19677425623523845,
      0.2662239937300284,
      0.2430740812317651
     ]
    }
   ],
   "organs": [
    {
     "id": "ccef82b4-454f-4cf6-9219-20b65f3383bf",
     "branch": "496be65f-0074-4a17-b4c0-2905f87ba286",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      2.8413798738137688,
      -2.0816681711721685e-17,
      2.783087793064127
     ],
     "scale": [
      0.9259964999305338,
      0.9259964999305338,
      0.9259964999305338
     ],
     "asset": "felucia-inflated-pod",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 288,
       "bary": [
        0,
        0,
        1
       ]
      },
      "followFrame": true
     },
     "mounted": true,
     "depth": 0.02808936798622151
    },
    {
     "id": "6ed07cff-8942-40a8-ac48-bdcff3228e27",
     "branch": "33ce69f1-f35e-417a-89d1-db65568e129b",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -0.3002128648153347,
      -1.249000902703301e-16,
      0.3585211434234288
     ],
     "scale": [
      1.1574956249131672,
      1.1574956249131672,
      1.1574956249131672
     ],
     "asset": "felucia-inflated-pod",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 288,
       "bary": [
        0,
        0,
        1
       ]
      },
      "followFrame": true
     },
     "mounted": true,
     "depth": 0.02808936798622151
    }
   ],
   "colors": {
    "bark": "#719d86",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {}
  }
 },
 {
  "id": "felucia-segmented-spore-stalk",
  "name": "Felucia · Segmented Spore Stalk",
  "sourceName": "SWBF2 Felucia Segmented Spore Stalk",
  "category": "Tree presets",
  "paletteCategory": "Tree presets",
  "planet": "Felucia",
  "floraPreset": {
   "branches": [
    {
     "id": "1542464b-4390-487f-a0f3-4e677b31e146",
     "name": "Segmented spine",
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
       0,
       3.2,
       0
      ],
      [
       -0.2,
       6,
       0
      ],
      [
       -0.55,
       8.3,
       0
      ],
      [
       -1.2,
       10.15,
       0
      ],
      [
       -2.2,
       11.65,
       0
      ],
      [
       -3.3,
       12.8,
       0
      ],
      [
       -4.2,
       13.65,
       0
      ]
     ],
     "radii": [
      0.65,
      0.55,
      0.4,
      0.3,
      0.23,
      0.17,
      0.1,
      0.06
     ]
    }
   ],
   "organs": [
    {
     "id": "367e5c2b-af39-4d64-8f2f-70d187ed77f0",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      1,
      1,
      1
     ],
     "asset": "felucia-spore-bulb"
    },
    {
     "id": "0027b8ff-a120-4e9f-9314-cb39c5b0ba3b",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      1.05,
      1.05,
      1.05
     ],
     "asset": "felucia-basal-frill"
    },
    {
     "id": "a70d6c80-69fa-4df7-ad90-f72620eee0a9",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0.14285714285714285,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      0.83,
      0.83,
      0.83
     ],
     "asset": "felucia-spore-bulb"
    },
    {
     "id": "ed56832f-6dc1-4975-89b5-ef0b369497d6",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0.14285714285714285,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      0.8714999999999999,
      0.8714999999999999,
      0.8714999999999999
     ],
     "asset": "felucia-frilled-collar"
    },
    {
     "id": "4dd90f04-a157-407a-9ca4-beefe0591f86",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0.2857142857142857,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      0.69,
      0.69,
      0.69
     ],
     "asset": "felucia-spore-bulb"
    },
    {
     "id": "c777410b-631b-4138-a95a-94a3807163ff",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0.2857142857142857,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      0.7244999999999999,
      0.7244999999999999,
      0.7244999999999999
     ],
     "asset": "felucia-frilled-collar"
    },
    {
     "id": "2eae9316-5835-4b5e-91ed-3649ba761f6d",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0.42857142857142855,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      0.55,
      0.55,
      0.55
     ],
     "asset": "felucia-spore-bulb"
    },
    {
     "id": "b8918f14-3b78-47f2-9e1e-0d4d5f65d04b",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0.42857142857142855,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      0.5775000000000001,
      0.5775000000000001,
      0.5775000000000001
     ],
     "asset": "felucia-frilled-collar"
    },
    {
     "id": "76ed33db-e43a-4cc9-9cee-f92219e3b201",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0.5714285714285714,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      0.44,
      0.44,
      0.44
     ],
     "asset": "felucia-spore-bulb"
    },
    {
     "id": "f40a812a-7ae1-4e3b-a351-514bb0234ab7",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0.5714285714285714,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      0.462,
      0.462,
      0.462
     ],
     "asset": "felucia-frilled-collar"
    },
    {
     "id": "dbf602a4-07b0-4a7d-8577-37d90a98ec28",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0.7142857142857143,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      0.32,
      0.32,
      0.32
     ],
     "asset": "felucia-spore-bulb"
    },
    {
     "id": "523c6dcc-2da6-47b8-8bd6-e4be2b2c8b4b",
     "branch": "1542464b-4390-487f-a0f3-4e677b31e146",
     "kind": "leaf",
     "at": 0.8571428571428571,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      0,
      0
     ],
     "scale": [
      0.23,
      0.23,
      0.23
     ],
     "asset": "felucia-spore-bulb"
    }
   ],
   "colors": {
    "bark": "#508f8d",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {}
  }
 },
 {
  "id": "felucia-golden-whisker-plant",
  "name": "Felucia · Golden Whisker",
  "sourceName": "SWBF2 Felucia Golden Whisker",
  "category": "Tree presets",
  "paletteCategory": "Tree presets",
  "planet": "Felucia",
  "floraPreset": {
   "branches": [
    {
     "id": "602c6a39-c45d-40e2-95f4-abdbab657749",
     "name": "Felucia Golden Whisker Trunk",
     "parent": null,
     "at": 0,
     "profile": "felucia-whisker-stalk",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0,
       1.1,
       0.3
      ],
      [
       0,
       2.4,
       0.3
      ],
      [
       0,
       3.5,
       0.5
      ],
      [
       0.0017965603638097978,
       4.3,
       1.9033572379851547
      ]
     ],
     "radii": [
      0.86,
      0.86,
      0.86,
      0.86,
      0.86
     ]
    }
   ],
   "organs": [
    {
     "id": "62d34782-302e-47dc-ad9f-c2e529c6ab71",
     "branch": "602c6a39-c45d-40e2-95f4-abdbab657749",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      0,
      -1.2620439964653158,
      0
     ],
     "scale": [
      1,
      1,
      1
     ],
     "asset": "felucia-whisker-crown",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 253,
       "bary": [
        0.9999997596214162,
        4.6718849906412734e-8,
        1.9365973392252504e-7
       ]
      },
      "followFrame": true
     },
     "mounted": true,
     "depth": 0.012
    },
    {
     "id": "df7e36c4-b833-4c53-aa16-22ea169455ea",
     "branch": "602c6a39-c45d-40e2-95f4-abdbab657749",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -2.5540885948163017,
      0.6956869074882305,
      -1.3716353917098374
     ],
     "scale": [
      1,
      1,
      1
     ],
     "asset": "felucia-hanging-whiskers",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 200,
       "bary": [
        0.3944882989073397,
        0.19545240251840543,
        0.4100592985742548
       ]
      },
      "followFrame": true
     },
     "mounted": true
    },
    {
     "id": "b9371323-f52f-4584-9bd6-ecaea1010fe6",
     "branch": "602c6a39-c45d-40e2-95f4-abdbab657749",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -2.6348180279692706,
      0.8046320704742492,
      -1.178574138250448
     ],
     "scale": [
      1,
      1,
      1
     ],
     "asset": "felucia-whisker-strand-2",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 186,
       "bary": [
        0.41256342493584075,
        0.15280886584740017,
        0.4346277092167591
       ]
      },
      "followFrame": true
     },
     "mounted": true
    },
    {
     "id": "a3a85ca0-a3df-4a1c-a4ff-6a3d77382b65",
     "branch": "602c6a39-c45d-40e2-95f4-abdbab657749",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -2.5892087734139237,
      -0.3118464491328426,
      -0.6825912820615615
     ],
     "scale": [
      1,
      1,
      1
     ],
     "asset": "felucia-whisker-strand-3",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 198,
       "bary": [
        0.8419909628377462,
        0.07873193772218813,
        0.07927709944006563
       ]
      },
      "followFrame": true
     },
     "mounted": true
    },
    {
     "id": "d43181d9-da63-4f06-9f93-86ed49a8e7d7",
     "branch": "602c6a39-c45d-40e2-95f4-abdbab657749",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -2.6308799636193885,
      0.8466977426807083,
      -1.2988630554456075
     ],
     "scale": [
      1,
      1,
      1
     ],
     "asset": "felucia-whisker-strand-4",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 223,
       "bary": [
        0.6579439064365493,
        0.25566954236771744,
        0.0863865511957332
       ]
      },
      "followFrame": true
     },
     "mounted": true
    },
    {
     "id": "c516e5b6-103e-4408-ab4a-2261bd43d218",
     "branch": "602c6a39-c45d-40e2-95f4-abdbab657749",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      -2.5849253782853383,
      -0.5170408061020024,
      -0.705610702557914
     ],
     "scale": [
      1,
      1,
      1
     ],
     "asset": "felucia-whisker-strand-5",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 228,
       "bary": [
        0.6213802154721946,
        0.3156507540726529,
        0.06296903045515255
       ]
      },
      "followFrame": true
     },
     "mounted": true
    }
   ],
   "colors": {
    "bark": "#ffffff",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {}
  }
 },
 {
  "id": "felucia-scarlet-bloom-plant",
  "name": "Felucia · Scarlet Bloom",
  "sourceName": "SWBF2 Felucia Scarlet Bloom",
  "category": "Tree presets",
  "paletteCategory": "Tree presets",
  "planet": "Felucia",
  "floraPreset": {
   "branches": [
    {
     "id": "ccddb703-1663-48ee-9ca9-cefc1a278d56",
     "name": "Flower base",
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
       0,
       0.7573643852683176,
       0
      ],
      [
       0,
       1.5147287705366352,
       0
      ]
     ],
     "radii": [
      0.4544186311609905,
      0.2903230143528551,
      0.1893410963170794
     ]
    },
    {
     "id": "d54d1e10-c4a6-48d8-a2b3-5dc702c2c748",
     "name": "Bud stalk",
     "parent": "ccddb703-1663-48ee-9ca9-cefc1a278d56",
     "at": 1,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       -0.6942506864959578,
       0.8835917828130372,
       0
      ],
      [
       -1.1360465779024764,
       2.0196383607155135,
       0
      ]
     ],
     "radii": [
      0.1893410963170794,
      0.2903230143528551,
      0.2650775348439111
     ]
    },
    {
     "id": "0e00ccbe-b86a-4f22-bcf6-5ec9e5838c01",
     "name": "Flower stalk",
     "parent": "ccddb703-1663-48ee-9ca9-cefc1a278d56",
     "at": 0.5,
     "profile": "flora-basic-branch",
     "nativeShape": true,
     "points": [
      [
       0,
       0,
       0
      ],
      [
       0.8204780840406775,
       1.2622739754471959,
       0
      ],
      [
       1.5147287705366352,
       3.15568493861799,
       0
      ]
     ],
     "radii": [
      0.2903230143528551,
      0.2903230143528551,
      0.2524547950894392
     ]
    }
   ],
   "organs": [
    {
     "id": "d6df5d7d-e18b-4192-8cdb-a99cafe73e8a",
     "branch": "d54d1e10-c4a6-48d8-a2b3-5dc702c2c748",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      2.8413794431525945,
      -6.938893903907228e-18,
      2.783107845424242
     ],
     "scale": [
      1.0729328791301167,
      1.0729328791301167,
      1.0729328791301167
     ],
     "asset": "felucia-flower-pod",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 288,
       "bary": [
        0,
        0,
        1
       ]
      },
      "followFrame": true
     },
     "mounted": true,
     "depth": 0.02570349088124353
    },
    {
     "id": "92fa15bb-6267-49ad-a821-7f31a4c8b620",
     "branch": "0e00ccbe-b86a-4f22-bcf6-5ec9e5838c01",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      2.841378403908341,
      1.3877787807814457e-17,
      2.78305884372425
     ],
     "scale": [
      1.1360465779024764,
      1.1360465779024764,
      1.1360465779024764
     ],
     "asset": "felucia-flower-calyx",
     "branchSurface": {
      "angle": 0,
      "pin": {
       "triangle": 288,
       "bary": [
        0,
        0,
        1
       ]
      },
      "followFrame": true
     },
     "mounted": true,
     "depth": 0.02570349088124353
    },
    {
     "id": "9a06cb0c-527a-4d1d-a9e7-127f3ac3bc9f",
     "branch": "0e00ccbe-b86a-4f22-bcf6-5ec9e5838c01",
     "kind": "leaf",
     "at": 1,
     "offset": [
      0,
      0,
      0
     ],
     "rotation": [
      2.4651903288156624e-32,
      8.349367203107291e-66,
      -3.141592653589793
     ],
     "scale": [
      1,
      1,
      1
     ],
     "asset": "felucia-scarlet-flower",
     "parentOrgan": "92fa15bb-6267-49ad-a821-7f31a4c8b620",
     "pin": {
      "mesh": 0,
      "triangle": 58,
      "bary": [
       0,
       0,
       1
      ]
     },
     "mounted": true
    }
   ],
   "colors": {
    "bark": "#559476",
    "leaf": "#ffffff"
   },
   "detail": "low",
   "finishes": {}
  }
 }
];
