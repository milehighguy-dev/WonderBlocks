import {prepareExampleCopies} from '../../src/editor/example-copies.js';
import {makePart,validateProject} from '../../src/core/model.js';
import {instantiateAssembly} from '../../src/core/library.js';
import {YAVIN_PRESETS} from '../../src/parts/yavin-presets.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';

export function yavinBlocking(){
 const parts=[],pad=(name,x,z,w,d)=>parts.push(makePart('block',{name,position:[x,-.2,z],scale:[w,.2,d],color:'#ffffff',surface:{preset:'yavin-floor',scale:.25}}));
 const group=(p,id,name)=>{p.assemblyId=id;p.assemblyName=name;parts.push(p);return p;};
 pad('Arena bay study ground',-19,-12,23,28);
 parts.push(...instantiateAssembly(YAVIN_PRESETS[0],[-19,0,-17],0));
 pad('Passage route study ground',19,-12,22,28);
 const passage=makePart('stair-route',structuredClone(YAVIN_PRESETS[1].preset));passage.position=[19,0,-23];passage.route.segments.push({...structuredClone(passage.route.segments[0]),run:4,turn:'right'},{...structuredClone(passage.route.segments[0]),run:8});group(passage,'yavin-study-passage','Temple passage · editable route');
 pad('Stepped wall study ground',-19,20,23,20);
 const wall=makePart('wall-route',structuredClone(YAVIN_PRESETS[2].preset));wall.position=[-26,0,13];wall.rotation=[0,Math.PI/2,0];wall.route.segments.push({...structuredClone(wall.route.segments[0]),run:8,pathStart:{point:[0,0,12],heading:-Math.PI/2}});group(wall,'yavin-study-wall','Trapezoidal screens · wall creator');
 pad('Gallery variations study ground',19,20,25,20);
 group(makePart('yavin-gallery',{name:'Tall arena gallery · adjustable underpass',position:[19,0,20],parameters:{bayWidth:20,bayDepth:8,terraceHeight:5.4,passageWidth:4.8,passageHeight:4.2,pierHeight:2}}),'yavin-study-gallery','Arena gallery · adjustable block');
 pad('Ruined wall study ground',-19,41,24,13);
 const ruin=makePart('wall-route',structuredClone(YAVIN_PRESETS[3].preset));ruin.position=[-27,0,41];ruin.rotation=[0,Math.PI/2,0];group(ruin,'yavin-study-ruin','Broken masonry · solid ruin wall');
 pad('Aqueduct study ground',30,74,16,82);
 const walkway=makePart('stair-route',structuredClone(YAVIN_PRESETS[6].preset));walkway.name='Yavin aqueduct · open spans and enclosed piers';walkway.position=[30,20.8,38];const pier=walkway.route.segments[0],open=YAVIN_PRESETS[4].preset.route.segments[0];pier.run=12;pier.fillToGround=true;walkway.route.segments=[pier,structuredClone(open),structuredClone(pier),structuredClone(open),structuredClone(pier)];group(walkway,'yavin-study-walkway','Aqueduct · open spans and enclosed piers');
 pad('Large temple bridge study ground',0,78,26,32);
 const bridge=makePart('stair-route',structuredClone(YAVIN_PRESETS[5].preset));bridge.position=[0,4.7,66];group(bridge,'yavin-study-large-bridge','Large temple bridge · editable route');
 return prepareExampleCopies(validateProject(preparePatternScaling({format:'open-building-studio',version:1,name:'Yavin · blocking workshop',parts})),'yavin-copy');
}
