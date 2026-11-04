import {DEFAULT_ROUTE_WIDTH,DEFAULT_HALLWAY_HEIGHT} from './route-defaults.js';
import {buildPresetHallways} from './preset-hallway.js';
import {hallwayPreset,HALLWAY_PRESETS} from './hallway-presets.js';
import {buildTantiveHallways} from './tantive-hallway.js';
import {angledTurn,angledFloor} from './angled-landing.js';
import * as THREE from '../../vendor/three.module.js';
import {buildRouteRailings,defaultRailing,validateRailing} from './railings.js';
import {applySurface} from '../materials/surfaces.js';
export const defaultHallway=()=>({height:DEFAULT_HALLWAY_HEIGHT,thickness:.2,ceiling:true,color:'#d9d4bd',surface:{preset:'plain',scale:1}});
export const defaultHallwayRoute=()=>({width:DEFAULT_ROUTE_WIDTH,thickness:.18,gap:.2,segments:[{kind:'landing',run:4,rise:0,steps:1,turn:'straight',hallway:defaultHallway()}]});
export function validateHallway(h){if(h===undefined)return;if(!h||typeof h!=='object'||Array.isArray(h)||typeof h.ceiling!=='boolean'||!['plain','tantive',...HALLWAY_PRESETS.map(p=>p.id)].includes(h.style??'plain')||(h.ribSpacing!==undefined&&(!Number.isFinite(h.ribSpacing)||h.ribSpacing<1||h.ribSpacing>12))||!Number.isFinite(h.height)||h.height<2.4||h.height>6||!Number.isFinite(h.thickness)||h.thickness<.05||h.thickness>.5)throw Error('Invalid hallway dimensions.');validateRailing({...defaultRailing(),color:h.color,surface:h.surface});if(!h.surface||!h.color)throw Error('Invalid hallway finish.');if(h.entranceFit&&(!h.entranceFit.partId||typeof h.entranceFit.partId!=='string'||h.entranceFit.partId.length>100||!['start','end'].includes(h.entranceFit.end)))throw Error('Choose a surface host and entrance end.');}
export function buildRouteHallways(group,part,layout){
 buildTantiveHallways(group,part,layout);
 buildPresetHallways(group,part,layout);
 const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...part.position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation)),new THREE.Vector3(...part.scale)),inverse=matrix.clone().invert();
 const walls=layout.map(l=>({...l,segment:{...l.segment,railing:l.segment.hallway&&l.segment.hallway.style!=='tantive'&&!hallwayPreset(l.segment.hallway.style)?{...defaultRailing(),style:'solid',height:l.segment.hallway.height,railHeight:.02,railWidth:l.segment.hallway.thickness,panelThickness:l.segment.hallway.thickness,color:l.segment.hallway.color,surface:l.segment.hallway.surface}:{style:'none'}}}));
 const before=group.children.length;buildRouteRailings(group,part,walls);for(const m of group.children.slice(before))m.userData.hallway=true;
 layout.forEach((l,index)=>{const h=l.segment.hallway;if(!h?.ceiling||h.style==='tantive'||hallwayPreset(h.style))return;const s=l.segment,returning=s.turn.startsWith('return-'),width=returning?l.width+l.nextWidth+(s.gap??part.route.gap):l.width,shift=returning?(s.turn==='return-right'?-1:1)*(l.nextWidth+(s.gap??part.route.gap))/2:0;
  const custom=angledTurn(s),g=custom?angledFloor(l,h.thickness):new THREE.BoxGeometry(width,h.thickness,s.run),a=g.attributes.position;
  for(let i=0;i<a.count;i++){const x=a.getX(i)+(custom?0:shift),z=a.getZ(i)+(custom?0:s.run/2),y=s.kind==='landing'?0:s.rise*z/s.run,v=new THREE.Vector3(l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[1]+y,l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z).applyMatrix4(matrix);v.y+=h.height+a.getY(i)+(custom?h.thickness:h.thickness/2);v.applyMatrix4(inverse);a.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:h.color,roughness:.8}),mesh=new THREE.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.routeSegment=index;mesh.userData.hallway=true;mesh.userData.hallwayCeiling=true;const holder=new THREE.Group();holder.add(mesh);applySurface(holder,material,{...part,surface:h.surface});group.add(mesh);
 });
}
