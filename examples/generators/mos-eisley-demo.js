import {prepareExampleCopies} from '../../src/editor/example-copies.js';
import {MOS_EISLEY_PRESETS} from '../../src/parts/mos-eisley-presets.js';
import {applyBuildingStyle} from '../../src/interiors/building-style.js';
import {makePart,validateProject} from '../../src/core/model.js';
import {defaultInterior} from '../../src/interiors/interior.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';

export const MOS_CANDIDATES=[
 {id:'01',title:'Block building kit',summary:'Cream stucco blocks with a flared base and built-in raised roof rim, plus separate stock dome roofs and tapered buttresses.',source:'tat2_bldg_set03 + dome1 + pillar1',reference:'reference-small'},
 {id:'02',title:'Weathered shop kit',summary:'Chipped plaster, a recessed entrance and a cloth-covered frontage. A second exterior finish rather than another complete building.',source:'tat2_bldg_set07 + entry2 + tent1',reference:'reference-two-storey'},
 {id:'03',title:'Recessed doorways',summary:'Narrow and broad recessed entries, each with a closed-door version and an open frame for room doorways.',source:'tat2_bldg_entry1 / entry2'},
 {id:'04',title:'Editable interior style',summary:'A real three-room interior with two exits, plaster walls, a sandy floor, a service recess and low seating. Roof hidden here to show the plan.',source:'tat2_bldg_cantina02 + base_grit',reference:'reference-cantina'},
 {id:'05',title:'Street arch',summary:'Stock street arch for courtyard entrances and alleys. Build the adjoining walls with the wall creator and Mos Eisley finishes.',source:'tat2_bldg_arch1'}
];
export function mosEisleyReview(){
 const parts=[];let current,origin;
 const add=(type,name,p,scale=[1,1,1],preset,color='#ffffff',rotation=[0,0,0])=>{
  const part=makePart(type,{id:'mos-review-'+parts.length,name,position:p.map((n,i)=>n+origin[i]),scale,rotation,color,...(preset?{surface:{preset,scale:.25}}:{}),assemblyId:'mos-review-'+current.id,assemblyName:current.id+' · '+current.title});if(current.id==='04'&&type!=='interior')part.interiorProp=true;parts.push(part);return part;
 };
 const block=(name,p,s,finish='mos-stucco')=>add('block',name,p,s,finish);
 const stock=(type,p=[0,0,0],s=[1,1,1],angle=0)=>add(type,type.replace('mos-',''),p,s,undefined,'#ffffff',[0,angle,0]);
 const shell=(w,d,h,finish='mos-stucco')=>{
  const body=block('Mos Eisley building block',[0,0,0],[w,h,d],finish);
  body.parameters=structuredClone(MOS_EISLEY_PRESETS[0].preset.parameters);
  return body;
 };
 for(const [i,c] of MOS_CANDIDATES.entries()){
  const row=Math.floor(i/3),columns=Math.min(3,MOS_CANDIDATES.length-row*3);
  current=c;origin=[(i%3-(columns-1)/2)*20,0,row*22-11];
  block('Sample ground',[0,-.16,0],[17,.16,17],'mos-sand-floor');
  switch(c.id){
   case '01':
    shell(7.5,7,3.4);stock('mos-dome',[-.6,3.42,0],[.7,.55,.7]);
    for(const side of [-1,1])stock('mos-buttress',[side*3.1,0,3.5],[.75,.85,.8]);
    stock('mos-entry-a',[0,0,4],[.7,.76,.7]);stock('mos-vent',[2.4,3.43,-1.7]);break;
   case '02':
    shell(7.5,6.5,4.2,'mos-worn-stucco');block('Stepped upper room',[-1,4.2,-.65],[4,2.4,4],'mos-worn-stucco');stock('mos-dome',[-1,6.58,-.65],[.52,.32,.52]);
    stock('mos-entry-b',[1,0,3.5],[.75,.8,.65]);stock('mos-canopy',[-1,0,5.5],[.8,.8,.55]);break;
   case '03':
    stock('mos-entry-a',[-4,0,3.3]);stock('mos-entry-b',[-4,0,-3.3]);
    stock('mos-entry-a-open',[4,0,3.3]);stock('mos-entry-b-open',[4,0,-3.3]);break;
   case '04':{
    const p=add('interior','Editable cantina-style rooms',[0,0,0]),f=defaultInterior();f.height=3.6;f.thickness=.3;
    f.rooms=[{id:'main',x:-5,z:-4,w:6,d:8},{id:'store',x:1,z:-4,w:4,d:3.5},{id:'side',x:1,z:-.5,w:4,d:4.5}];
    f.doors=[{axis:'x',line:4,offset:-2,width:1.8,height:2.6,kind:'door'},{axis:'x',line:-4,offset:2.8,width:1.6,height:2.6,kind:'door'},
     {axis:'z',line:1,offset:1.6,width:1.5,height:2.6,kind:'door'},{axis:'z',line:1,offset:-2,width:1.3,height:2.6,kind:'door'},
     {axis:'x',line:-.5,offset:3,width:1.2,height:2.6,kind:'door'},
     {axis:'z',line:-5,offset:-1.5,width:1,height:.65,sill:2.3,kind:'window'}];
    f.finishes={floor:{color:'#ffffff',preset:'mos-sand-floor',scale:.25},wall:{color:'#ffffff',preset:'mos-interior-plaster',scale:.3},outside:{color:'#ffffff',preset:'mos-worn-stucco',scale:.25},ceiling:{color:'#ffffff',preset:'mos-interior-plaster',scale:.3},roof:{color:'#ffffff',preset:'mos-stucco',scale:.25}};applyBuildingStyle(f,'mos-eisley');p.interior=f;
    block('Low plaster bar',[-2.9,0,-2.3],[2.9,1.05,.65]);block('Side booth seat',[-4,.08,1.3],[.9,.45,2.9]);block('Back booth seat',[-2.7,.08,-3.2],[2.6,.45,.65]);
    block('Service-wall sample',[4.8,.1,-2.3],[.12,3,2.4],'mos-service-plaster');stock('mos-vent',[2.8,0,-2.7],[.7,.7,.7]);break;
   }
   case '05':
    stock('mos-arch',[0,0,0],[.8,.8,.8]);break;

  }
 }
 return prepareExampleCopies(validateProject(preparePatternScaling({format:'open-building-studio',version:1,name:'Mos Eisley · building collection',parts})),'mos-eisley-copy');
}
