import {SURFACES,applySurface} from '../materials/surfaces.js';
import {hallwayPreset} from './hallway-presets.js';
export const ROUTE_PARTS={deck:'Deck / steps',underbody:'Underbody',rails:'Handrails / parapets',posts:'Posts',arches:'Arches',walls:'Walls',ceiling:'Ceiling',details:'Corridor details',ribs:'Tantive ribs',roof:'Roof',cap:'Wall toppers',recesses:'Arch interiors'};
export function routeFinishParts(s){
 const parts=['deck'];if(s.hallway)return [...parts,'walls',...(s.hallway.ceiling?['ceiling']:[]),...(hallwayPreset(s.hallway.style)&&!['hoth-natural','hoth'].includes(s.hallway.style)?['details']:[]),...(s.hallway.style==='tantive'?['ribs']:[])];
 const style=s.railing?.style;
 if(['walkway','bespin','bespin-arches'].includes(style))parts.push('underbody','rails');
 if(style==='yavin-temple-bridge')parts.push('underbody','posts','rails','cap');if(style==='yavin-aqueduct')parts.push('underbody','cap',...(s.railing.enclosed?['walls','ceiling']:[]));
 if(style==='walkway'||style==='posts')parts.push('posts');
 if(style==='posts')parts.push('rails');
 if(style==='kotor-kashyyyk')parts.push('underbody','rails','posts');
 if(style==='bespin-arches')parts.push('arches');if(style==='kashyyyk-suspension')parts.push('rails','posts');
 if(['japanese-open','japanese-roofed'].includes(style))parts.push('walls','posts','rails');if(style==='japanese-roofed')parts.push('roof');
 if(style==='yavin-ruined')parts.push('walls');if(style==='solid')parts.push('walls','cap');if(style==='buttressed')parts.push('walls','posts');if(['yavin-stepped','arched-recess','arched-openings'].includes(style))parts.push('walls','recesses');return parts;
}
export function routeMeshPart(m){
 const d=m.userData;if(d.yavinTempleBridgePart)return d.yavinTempleBridgePart;if(d.yavinBridgePart)return d.yavinBridgePart;if(d.yavinAqueductPart)return d.yavinAqueductPart;if(m.geometry?.userData.bridgePart)return m.geometry.userData.bridgePart;if(d.routeFloor)return 'deck';
 if(d.hallway)return d.hallwayDetail?'details':d.tantivePart==='rib'?'ribs':d.hallwayCeiling?'ceiling':'walls';
 const tag=m.geometry?.userData.walkwayProfile;
 if(tag)return ({hull:'underbody',rail:'rails',post:'posts','bespin-parapet':'rails','bespin-arch':'arches'})[tag];
 if(d.wallLayer==='recesses')return 'recesses';if(d.wallLayer)return ['cap','roof'].includes(d.wallLayer)?d.wallLayer:'walls';
 if(d.railing)return d.routePost?'posts':'rails';
}
export function validateRouteFinishes(finishes){
 if(finishes===undefined)return;
 if(!finishes||typeof finishes!=='object'||Array.isArray(finishes))throw Error('Invalid route part finishes.');
 for(const [key,f] of Object.entries(finishes)){
 if(!Object.hasOwn(ROUTE_PARTS,key)||!f||typeof f!=='object'||Array.isArray(f)||f.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(f.color)||f.surface!==undefined&&(!f.surface||!SURFACES.some(s=>s.id===f.surface.preset)||!Number.isFinite(f.surface.scale)||f.surface.scale<.1||f.surface.scale>8))throw Error('Invalid route part finish.');
 }
}
export function applyRouteFinishes(group,part){
 const materials=new Map();
 for(const m of group.children){if(!m.isMesh)continue;const key=routeMeshPart(m),finish=part.route.segments[m.userData.routeSegment]?.componentFinishes?.[key];if(!finish)continue;
 const cacheKey=m.material.uuid+JSON.stringify(finish);let entry=materials.get(cacheKey);
 if(!entry){const material=m.material.clone();if(finish.color)material.color.set(finish.color);entry={material,finish};materials.set(cacheKey,entry);}m.material=entry.material;
 }
 for(const {material,finish} of materials.values())if(finish.surface)applySurface(group,material,{...part,surface:finish.surface});
}
