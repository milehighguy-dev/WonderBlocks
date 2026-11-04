import {validateExportProfiles} from './export-profiles.js';
import {YAVIN_PARTS} from '../parts/yavin.js';
import {MOS_EISLEY_PARTS} from '../parts/mos-eisley.js';
import {defaultFlora,validateFlora} from '../flora/flora.js';
import {defaultMetaballs,validateMetaballs} from '../parts/metaballs.js';
import {validateHighwayFinishes} from '../highways/highway-finishes.js';
import {defaultHighway,validateHighwayNetwork} from '../highways/highway.js';
import {validateFaceFinishes} from '../editor/surface-selection.js';
import {defaultPlatform,validatePlatform} from '../platforms/platform.js';
import {validateConnectedInteriors} from '../interiors/connected-interior.js';
import {validateEntrances} from '../interiors/entrances.js';
import {CORUSCANT_PARTS} from '../parts/coruscant.js';
import {resolveRouteLinks} from '../routes/route-links.js';
import {defaultInterior,validateInterior} from '../interiors/interior.js';
import {defaultRoute,validateRoute} from '../routes/stair-route.js';
import {NEW_YORK_PARTS} from '../parts/new-york.js';
import {JAPANESE_PARTS} from '../parts/japanese.js';
import {CLASSICAL_PARTS} from '../parts/classical.js';
import {SURFACES} from '../materials/surfaces.js';
import {validateParameters} from '../editor/part-controls.js';
export const PARTS = [
 {id:'flora',name:'Plant',category:'Flora',icon:'♧',color:'#766044'},
 {id:'highway',name:'Highway',category:'Interactive',icon:'↝',color:'#899596',description:'Draw roads and bridges with bends, slopes, branches and intersections. Adjust their width, railings and ground supports in the highway builder.'},
 {id:'platform',name:'Platform',category:'Interactive',icon:'▱',color:'#a6b6ae',description:'Build connected floor decks, terraces and plazas. Resize or extend sections, shape corners, and add railings or supports.'},
 {id:'character-reference',name:'Character reference',category:'Details',hidden:true,icon:'♙',color:'#ffffff'},
 {id:'interior',name:'Room',category:'Interactive',icon:'▦',color:'#d9d4bd',description:'Draw a building from connected rooms, with editable walls, doors, windows and floors. Add stairs between levels.'},
 {id:'wall-route',name:'Wall / fence',category:'Interactive',icon:'▥',color:'#85734f',description:'Draw a continuous wall or fence along a path. Drag its corners to shape it, extend sections, and choose a wall or railing style.'},
 {id:'stair-route',name:'Route',category:'Interactive',icon:'◇',color:'#c4c1b1',description:'Draw connected paths, stairs and ramps. Extend, turn or branch the route, then add railings or a covered passage.'},
 ...YAVIN_PARTS,...MOS_EISLEY_PARTS,...CLASSICAL_PARTS,...JAPANESE_PARTS,...NEW_YORK_PARTS,...CORUSCANT_PARTS,
 {id:'metaballs',name:'Metaballs',category:'Metaballs',icon:'◉',color:'#92aaa1'},
 {id:'block',name:'Body',category:'Bodies',icon:'▰',color:'#d9d4bd'},
 {id:'hex',name:'Hexagonal tower',category:'Bodies',icon:'⬡',color:'#d9d4bd'},
 {id:'round',name:'Round tower',category:'Bodies',icon:'▥',color:'#d9d4bd'},
 {id:'ring-body',name:'Ring body',category:'Bodies',icon:'◎',color:'#d9d4bd'},
 {id:'taper',name:'Tapered tower',category:'Bodies',icon:'▱',color:'#d9d4bd'},
 {id:'dome',name:'Dome',category:'Roofs',icon:'◠',color:'#609d9b'},
 {id:'cone',name:'Spire',category:'Roofs',icon:'△',color:'#609d9b'},
 {id:'roof',name:'Hip roof',category:'Roofs',icon:'⌂',color:'#609d9b'},
 {id:'pillar',name:'Column',category:'Details',icon:'Ⅰ',color:'#e4dec8'},
 {id:'ring',name:'Crown ring',category:'Details',icon:'◎',color:'#deb66d'},
 {id:'waterfall',name:'Waterfall veil',category:'Details',icon:'≋',color:'#b6d1c8',surface:'waterfall'},
 {id:'slab',name:'Foundation',category:'Bodies',icon:'▬',color:'#b3b7ab'},
 ...[
 ['capsule','Capsule','Bodies'],['orb','Orb chamber','Bodies'],['bell','Bell tower','Bodies'],['waist','Hourglass tower','Bodies'],['archbody','Archway','Bodies'],['flat-arch','Flat-topped arch','Bodies'],['buttress','Buttress','Bodies'],
 ['onion','Onion dome','Roofs'],['saucer','Saucer roof','Roofs'],['pagoda','Pagoda roof','Roofs'],['gable','Gable roof','Roofs'],['pyramid','Stepped pyramid','Roofs'],['fin','Swept fin','Roofs'],['crown','Battlements','Roofs'],
 ['balcony','Balcony','Details'],['chimney','Chimney','Details'],['antenna','Antenna','Details'],['flag','Banner','Details'],['gear','Gear ornament','Details'],['crystal','Crystal','Details'],['pipe','Elbow pipe','Details'],['awning','Awning','Details']
 ].map(([id,name,category])=>({id,name,category,icon:'◇',color:category==='Roofs'?'#609d9b':category==='Bodies'?'#d9d4bd':'#deb66d'}))
];
export function makePart(type, overrides={}) {
 const definition=PARTS.find(p=>p.id===type);
 if(!definition)throw Error('Unknown part type');
 return {id:crypto.randomUUID(),type,name:definition.name,color:definition.color,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],...(type==='highway'?{highway:defaultHighway()}:{}),...(type==='metaballs'?{metaballs:defaultMetaballs()}:{}),...(type==='flora'?{flora:defaultFlora()}:{}),...(type==='platform'?{platform:defaultPlatform()}:{}),...(type==='interior'?{interior:defaultInterior()}:{}),...(type==='stair-route'?{route:defaultRoute()}:{}),...(type==='wall-route'?{route:{width:.5,thickness:.18,gap:.15,segments:[{kind:'landing',run:4,rise:0,steps:1,turn:'straight',railing:{style:'solid',sides:'left',height:2,panelThickness:.2,color:'#85734f',surface:{preset:'plain',scale:1}}}]}}:{}),...(definition.surface?{surface:{preset:definition.surface,scale:definition.surfaceScale??2}}:{}),...(['jp-base','jp-stone-wall','jp-stone-corner'].includes(type)?{surface:{preset:'castle-stone',scale:1},pattern:{mode:'stretch',texture:[.5,1/1.2,.5]}}:{}),...(['jp-half-roof','jp-gable-roof','jp-hip-roof','jp-tier-roof','jp-irimoya','jp-eave','jp-wall-cap'].includes(type)?{surface:{preset:'roof-tiles',scale:1}}:{}),...overrides,...(type==='character-reference'?{scale:(overrides.scale||[1,1,1]).map(v=>Math.sign(v)||1)}:{})};
}
export function validateProject(data){
 if(!data||data.format!=='open-building-studio'||data.version!==1||typeof data.name!=='string'||data.name.length>80||!Array.isArray(data.parts)||data.parts.length>500)throw Error('Not a supported building project (version 1, maximum 500 parts).');
 if(data.surfaceScaling!==undefined&&!['fixed','stretch'].includes(data.surfaceScaling))throw Error('Invalid surface scaling mode.');
 const exportProfiles=data.swbf2Exports===undefined?undefined:validateExportProfiles(data.swbf2Exports);
 const ids=new Set();
 for(const p of data.parts){validateFaceFinishes(p);
  if(!p||typeof p.id!=='string'||p.id.length>100||ids.has(p.id)||!PARTS.some(x=>x.id===p.type)||typeof p.name!=='string'||p.name.length>80||!/^#[0-9a-f]{6}$/i.test(p.color))throw Error('Invalid part data.');
  if(p.interiorProp!==undefined&&typeof p.interiorProp!=='boolean')throw Error('Invalid interior prop setting.');
  ids.add(p.id);if(p.type==='flora')validateFlora(p.flora);else if(p.flora!==undefined)throw Error('Flora data belongs to plants.');if(p.type==='metaballs')validateMetaballs(p.metaballs);else if(p.metaballs!==undefined)throw Error('Metaball data belongs to metaballs.');
  validateEntrances(p);validateConnectedInteriors(p,data.parts);
  if(p.type==='highway'){validateHighwayNetwork(p.highway);validateHighwayFinishes(p);}else if(p.highway!==undefined)throw Error('Highway data belongs to highways.');
  if(p.type==='platform')validatePlatform(p.platform);else if(p.platform!==undefined)throw Error('Platform data belongs to platforms.');
  if(p.type==='interior')validateInterior(p.interior);else if(p.interior!==undefined)throw Error('Interior data belongs to interior parts.');
  if(['stair-route','wall-route'].includes(p.type)){validateRoute(p.route);if(p.type!=='wall-route'&&p.route.segments.some(s=>['buttressed','yavin-stepped','yavin-ruined','arched-recess','arched-openings','japanese-open','japanese-roofed'].includes(s.railing?.style)))throw Error('Decorative wall styles belong to standalone wall paths.');if(p.type!=='wall-route'&&p.route.segments.some(s=>s.wallJoinTo))throw Error('Wall welds belong to wall paths.');if(p.type==='wall-route'&&p.route.segments.some(s=>s.turn!=='straight'))throw Error('Wall paths use explicit edges and curves.');if(p.type==='wall-route'&&(p.route.segments.some(s=>s.kind!=='landing'||s.rise||s.hallway||!['solid','posts','buttressed','yavin-stepped','yavin-ruined','arched-recess','arched-openings','japanese-open','japanese-roofed'].includes(s.railing?.style)||!['left','right'].includes(s.railing?.sides))))throw Error('Walls and fences use flat paths with solid walls or posts.');}else if(p.route!==undefined)throw Error('Route data belongs to stair routes.');
  if(p.assemblyName!==undefined&&(!p.assemblyId||typeof p.assemblyName!=='string'||!p.assemblyName.trim()||p.assemblyName.length>80))throw Error('Invalid object group name.');
  if(p.instanceCopy!==undefined&&(!p.instanceFamily||typeof p.instanceCopy!=='boolean'))throw Error('Invalid copy setting.');
  if(p.instanceName!==undefined&&(!p.instanceFamily||typeof p.instanceName!=='string'||!p.instanceName.trim()||p.instanceName.length>80))throw Error('Invalid instance name.');
  if(p.instanceFamily!==undefined&&(typeof p.instanceFamily!=='string'||!p.instanceFamily.length||p.instanceFamily.length>100))throw Error('Invalid instance family.');
  if(p.assemblyId!==undefined&&(typeof p.assemblyId!=='string'||!p.assemblyId.length||p.assemblyId.length>100))throw Error('Invalid object group.');
  if(p.pattern!==undefined&&(!p.pattern||!['fixed','stretch'].includes(p.pattern.mode)||['texture'].some(k=>!Array.isArray(p.pattern[k])||p.pattern[k].length!==3||p.pattern[k].some(v=>!Number.isFinite(v)||v<=0||v>1e6))))throw Error('Invalid pattern scaling.');
  if(p.parameters!==undefined)validateParameters(p.type,p.parameters);
  if(p.surface!==undefined&&(!p.surface||!SURFACES.some(s=>s.id===p.surface.preset)||typeof p.surface.scale!=='number'||!Number.isFinite(p.surface.scale)||p.surface.scale<.1||p.surface.scale>8))throw Error('Invalid surface preset or texture scale.');
  if(p.shape!==undefined&&(!p.shape||typeof p.shape!=='object'||Object.entries(p.shape).some(([k,v])=>!['taper','bulge','twist'].includes(k)||typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>(k==='twist'?180:.8))))throw Error('Invalid shape settings.');
  for(const key of ['position','rotation','scale'])if(!Array.isArray(p[key])||p[key].length!==3||p[key].some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1000||(key==='scale'&&Math.abs(v)<0.05)))throw Error('Invalid part transform.');
 }
 if(data.parts.some(p=>p.route?.links||p.route?.attachments))resolveRouteLinks(data.parts);
 return {format:data.format,version:1,name:data.name,...(exportProfiles?{swbf2Exports:exportProfiles}:{}),...(data.surfaceScaling?{surfaceScaling:data.surfaceScaling}:{}),parts:data.parts.map(p=>({id:p.id,type:p.type,name:p.name,...(p.instanceFamily?{instanceFamily:p.instanceFamily,...(p.instanceName?{instanceName:p.instanceName}:{}),...(p.instanceCopy?{instanceCopy:true}:{})}:{}),...(p.interiorProp!==undefined?{interiorProp:p.interiorProp}:{}),...(p.faceFinishes?{faceFinishes:structuredClone(p.faceFinishes)}:{}),...(p.highway?{highway:structuredClone(p.highway)}:{}),...(p.metaballs?{metaballs:structuredClone(p.metaballs)}:{}),...(p.flora?{flora:structuredClone(p.flora)}:{}),...(p.platform?{platform:structuredClone(p.platform)}:{}),...(p.entranceInteriors?{entranceInteriors:structuredClone(p.entranceInteriors)}:{}),...(p.entrances?{entrances:structuredClone(p.entrances)}:{}),...(p.interior?{interior:structuredClone(p.interior)}:{}),...(p.route?{route:structuredClone(p.route)}:{}),color:p.color,position:[...p.position],rotation:[...p.rotation],scale:p.type==='character-reference'?p.scale.map(v=>Math.sign(v)||1):[...p.scale],...(p.pattern?{pattern:structuredClone(p.pattern)}:{}),...(p.assemblyId?{assemblyId:p.assemblyId,...(p.assemblyName?{assemblyName:p.assemblyName}:{})}:{}),...(p.parameters?{parameters:{...p.parameters}}:{}),...(p.shape?{shape:{...p.shape}}:{}),...(p.surface?{surface:{preset:p.surface.preset,scale:p.surface.scale}}:{})}))};
}
export function mirrorPart(p){const mirrored={...structuredClone(p),id:crypto.randomUUID(),name:(p.name+' mirror').slice(0,80),position:[-p.position[0],p.position[1],p.position[2]],rotation:[p.rotation[0],-p.rotation[1],-p.rotation[2]],scale:[-p.scale[0],p.scale[1],p.scale[2]]};delete mirrored.instanceFamily;delete mirrored.instanceName;delete mirrored.instanceCopy;return mirrored;}
export class History{
 constructor(initial){this.entries=[JSON.stringify(initial)];this.index=0;}
 push(value){const s=JSON.stringify(value);if(s===this.entries[this.index])return;this.entries=this.entries.slice(0,this.index+1);this.entries.push(s);if(this.entries.length>80)this.entries.shift();this.index=this.entries.length-1;}
 undo(){if(this.index>0)return JSON.parse(this.entries[--this.index]);}
 redo(){if(this.index<this.entries.length-1)return JSON.parse(this.entries[++this.index]);}
}
