// Independent trunk studies. These control points and field sections are
// authored here; no source catalogue meshes or sampled skeletons are used.
const joint=(id,parent,point,girth)=>({id:'joint:'+id,parent:parent===null?null:'joint:'+parent,point,radius:girth*.5});
const sample=(t,offset=[0,0,0],radius=1)=>({t,offset,radius});
const edge=(start,end,radii,sections,additional=[])=>({start:'joint:'+start,end:'joint:'+end,radii,groups:[sections,...additional]});

export const TRUNK_BASE_DESIGNS=[
 {
  id:'temp-base-stem',name:'Rooted Stem',
  skeleton:[
   joint(0,null,[0,.30,0],.30),
   joint(1,0,[.06,.92,.025],.24),
   joint(2,1,[-.06,1.90,.08],.18),
   joint(3,2,[.13,3.10,-.04],.14),
   joint(4,0,[-.78,.12,.16],.12),
   joint(5,0,[.65,.10,.37],.10),
   joint(6,0,[.25,.11,-.74],.11)
  ],
  edges:[
   edge(0,1,[.30,.24],[sample(0),sample(.27,[-.010,.005,.006],1.12),sample(.65,[.006,.002,-.006],1.03),sample(1)]),
   edge(1,2,[.24,.18],[sample(0),sample(.30,[-.008,.002,.009],1.08),sample(.71,[.004,0,-.004],.97),sample(1)]),
   edge(2,3,[.18,.14],[sample(0),sample(.39,[.014,.002,.008],1.08),sample(.77,[.006,0,-.007],.96),sample(1)]),
   edge(0,4,[.30,.12],[sample(0),sample(.24,[-.008,.016,.012],1.08),sample(.62,[.009,.012,-.007],.94),sample(1)]),
   edge(0,5,[.30,.10],[sample(0),sample(.31,[.006,.015,-.014],1.06),sample(.68,[-.006,.012,.007],.92),sample(1)]),
   edge(0,6,[.30,.11],[sample(0),sample(.29,[-.014,.015,-.005],1.07),sample(.73,[.007,.010,.005],.93),sample(1)])
  ]
 },
 {
  id:'temp-base-fork',name:'Forked Trunk',
  skeleton:[
   joint(0,null,[0,.34,0],.34),
   joint(1,0,[.08,1.05,-.06],.30),
   joint(2,1,[-.13,1.80,.05],.27),
   joint(3,2,[-.62,2.57,.12],.19),
   joint(4,3,[-.53,3.35,.33],.12),
   joint(5,2,[.59,2.37,-.21],.20),
   joint(6,5,[.86,2.94,-.12],.13),
   joint(7,0,[-.65,.12,-.36],.12),
   joint(8,0,[.60,.12,.45],.12)
  ],
  edges:[
   edge(0,1,[.34,.30],[sample(0),sample(.33,[-.009,.009,.006],1.11),sample(.73,[.004,0,-.006],1.02),sample(1)]),
   edge(1,2,[.30,.27],[sample(0),sample(.30,[-.011,.006,-.008],1.03),sample(.66,[.007,.003,.011],1.08),sample(1)]),
   edge(2,3,[.27,.19],[sample(0),sample(.29,[-.018,.010,.012],1.09),sample(.70,[-.011,.003,-.005],.98),sample(1)]),
   edge(3,4,[.19,.12],[sample(0),sample(.38,[-.014,.003,.009],1.08),sample(.76,[-.005,0,-.008],.94),sample(1)]),
   edge(2,5,[.27,.20],[sample(0),sample(.32,[.011,.008,-.018],1.10),sample(.72,[.007,.002,.007],.98),sample(1)]),
   edge(5,6,[.20,.13],[sample(0),sample(.38,[-.010,.004,.012],1.07),sample(.78,[.006,0,.005],.96),sample(1)]),
   edge(0,7,[.34,.12],[sample(0),sample(.31,[-.006,.016,-.009],1.07),sample(.70,[.007,.011,.005],.94),sample(1)]),
   edge(0,8,[.34,.12],[sample(0),sample(.29,[.005,.017,.012],1.09),sample(.69,[-.006,.012,-.004],.93),sample(1)])
  ]
 },
 {
  id:'temp-base-crooked',name:'Crooked Trunk',
  skeleton:[
   joint(0,null,[0,.32,0],.32),
   joint(1,0,[-.25,.98,.06],.29),
   joint(2,1,[.09,1.66,.15],.25),
   joint(3,2,[.55,2.44,-.13],.19),
   joint(4,3,[1.0,3.14,.10],.12),
   joint(5,2,[-.58,1.69,.19],.15),
   joint(6,0,[-.66,.11,-.35],.11),
   joint(7,0,[.59,.13,.49],.13)
  ],
  edges:[
   edge(0,1,[.32,.29],[sample(0),sample(.30,[-.013,.008,-.008],1.10),sample(.73,[.004,.004,.011],1.03),sample(1)]),
   edge(1,2,[.29,.25],[sample(0),sample(.33,[-.016,.004,.010],1.07),sample(.70,[-.010,0,-.008],.96),sample(1)]),
   edge(2,3,[.25,.19],[sample(0),sample(.32,[.011,.005,-.015],1.10),sample(.72,[-.006,.002,-.007],.95),sample(1)]),
   edge(3,4,[.19,.12],[sample(0),sample(.38,[.015,.002,-.008],1.06),sample(.76,[.004,0,.012],.94),sample(1)]),
   edge(2,5,[.25,.15],[sample(0),sample(.30,[-.008,.010,.011],1.08),sample(.72,[.006,.012,-.007],.90),sample(1)]),
   edge(0,6,[.32,.11],[sample(0),sample(.29,[-.012,.016,.005],1.08),sample(.70,[.006,.011,-.009],.92),sample(1)]),
   edge(0,7,[.32,.13],[sample(0),sample(.33,[.010,.016,.007],1.08),sample(.73,[-.006,.012,.005],.93),sample(1)])
  ]
 },
 {
  id:'temp-base-bulbous',name:'Bulbous Trunk',
  skeleton:[
   joint(0,null,[0,.49,0],.49),
   joint(1,0,[.03,1.05,.04],.60),
   joint(2,1,[-.12,1.85,-.06],.30),
   joint(3,2,[-.62,2.42,.13],.23),
   joint(4,3,[-.45,2.95,.38],.13),
   joint(5,2,[.47,2.48,-.25],.22),
   joint(6,5,[.71,2.92,-.05],.13),
   joint(7,2,[-.05,2.38,.54],.20),
   joint(8,7,[.12,2.70,.72],.12)
  ],
  edges:[
   edge(0,1,[.49,.60],
    [sample(0),sample(.29,[-.014,.006,.008],1.10),sample(.66,[-.009,.002,.003],1.07),sample(1)],
    [
     [sample(0,[.070,-.014,.020],.80),sample(.24,[.038,-.008,.025],.85),sample(.62,[.014,.003,.009],.92),sample(1)],
     [sample(0,[-.065,-.010,-.035],.80),sample(.28,[-.031,-.006,-.021],.87),sample(.65,[-.011,.003,-.007],.93),sample(1)]
    ]),
   edge(1,2,[.60,.30],[sample(0),sample(.25,[-.005,.003,.010],1.05),sample(.62,[-.012,.002,-.005],.84),sample(1)]),
   edge(2,3,[.30,.23],[sample(0),sample(.34,[-.014,.008,.015],1.10),sample(.75,[-.007,.002,-.006],.96),sample(1)]),
   edge(3,4,[.23,.13],[sample(0),sample(.39,[-.011,.004,.010],1.08),sample(.77,[.006,.002,.008],.94),sample(1)]),
   edge(2,5,[.30,.22],[sample(0),sample(.33,[.012,.009,-.013],1.10),sample(.71,[.007,.002,.005],.98),sample(1)]),
   edge(5,6,[.22,.13],[sample(0),sample(.39,[.009,.002,.013],1.07),sample(.78,[-.005,0,.006],.94),sample(1)]),
   edge(2,7,[.30,.20],[sample(0),sample(.35,[-.012,.010,.014],1.08),sample(.73,[.006,.002,.009],.97),sample(1)]),
   edge(7,8,[.20,.12],[sample(0),sample(.38,[-.009,.003,.012],1.07),sample(.77,[.005,0,.006],.94),sample(1)])
  ]
 }
];
