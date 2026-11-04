export const JAPANESE_WALL={plaster:'#eee9d8',timber:'#403e35',roof:'#61958b',roofSurface:{preset:'roof-tiles',scale:1},postWidth:.16,bayWidth:4,roofOverhang:.35};
export const japaneseRoofCurve=t=>.08+.58*(1-t)**1.35+.10*t**8;
export function japaneseWallProfile(height,lintel=height*.074/1.2){
 const sill=height*.49/1.2,beam=Math.min(lintel,height*.4);
 return {sill,beam,opening:height-sill-beam};
}
export const japaneseOpenWallDefaults=()=>({style:'japanese-open',sides:'left',height:2.4,panelThickness:.18,railHeight:.148,postWidth:JAPANESE_WALL.postWidth,spacing:JAPANESE_WALL.bayWidth,color:JAPANESE_WALL.plaster,surface:{preset:'plain',scale:1}});
