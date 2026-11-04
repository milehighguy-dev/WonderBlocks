// Editable palm assembled from the existing neutral trunk and palm frond parts.
export const PALM_PRESETS=[{
 id:'palm-tree',name:'Palm Tree',sourceName:'Editable palm with a curved trunk and layered frond crown',planet:'Earth',category:'Tree presets',paletteCategory:'Tree presets',
 floraPreset:{
  branches:[{
   id:'palm-trunk',name:'Palm curved trunk',parent:null,at:0,profile:'flora-basic-branch',nativeShape:true,
   points:[[0,0,0],[.04,1.5,-.02],[.24,3.2,-.08],[.64,5,-.13],[1.10,6.6,-.14],[1.36,7.6,-.10],[1.48,8.05,-.02]],
   radii:[.27,.215,.19,.175,.16,.15,.145]
  }],
  organs:[
   {id:'palm-lower-fronds',name:'Palm drooping fronds',branch:'palm-trunk',kind:'leaf',asset:'flora-palm-whorl',at:1,offset:[0,0,0],rotation:[Math.PI,.27,0],scale:[2.8,2.2,2.8]},
   {id:'palm-upper-fronds',name:'Palm upright new fronds',branch:'palm-trunk',kind:'leaf',asset:'flora-palm-canopy',at:1,offset:[0,0,0],rotation:[.10,.7,-.07],scale:[1.85,1.25,1.85]}
  ],
  colors:{bark:'#b8a17c',leaf:'#ffffff'},detail:'swbf2',finishes:{}
 }
}];
