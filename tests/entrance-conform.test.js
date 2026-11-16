import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {defaultHallway} from '../src/routes/hallway.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {physicalSurface} from '../src/collision/object-collision.js';
import {assertClosedSurface} from '../src/collision/collision-geometry.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {groundAt,moveWalker} from '../src/walk/walk-physics.js';
import {copyParts} from '../src/core/assemblies.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';
import {kashyyykPlatformDefaults} from '../src/platforms/kashyyyk-platforms.js';
import {partMatrix} from '../src/interiors/entrances.js';

function fixture(end='start'){
 const host=makePart('round',{id:'host',scale:[10,10,10],parameters:{sides:24}}),hall=makePart('stair-route',{id:'hall',position:[0,2,end==='start'?-7:0],route:{width:3,thickness:.2,gap:0,segments:[{kind:'landing',run:7,rise:0,steps:1,turn:'straight',hallway:{...defaultHallway(),entranceFit:{partId:host.id,end}}}]}});return {host,hall,parts:[host,hall]};
}
test('curved entrances trim walls, roof and threshold to the facade while retaining the far end and closed volumes',()=>{
 for(const end of ['start','end']){const {host,hall,parts}=fixture(end),plain=structuredClone(hall);delete plain.route.segments[0].hallway.entranceFit;const original=buildPart(plain),fitted=buildPart(hall,{parts,collision:'sync'});
  try{assert.equal(fitted.userData.entranceFits[0].status,'fitted');const floor=fitted.children.find(m=>m.userData.routeFloor),range=new T.Box3().setFromBufferAttribute(floor.geometry.attributes.position);assert.equal(floor.userData.conformedEntrance,true);if(end==='start')assert.ok(range.min.z>1.9);else assert.ok(range.max.z<5.1);
   for(const mesh of fitted.children.filter(m=>m.userData.conformedEntrance)){const surface=physicalSurface(mesh,new T.Matrix4());assert.doesNotThrow(()=>assertClosedSurface(surface));const range=new T.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);if(end==='start'){assert.ok(range.min.z>1.9);assert.ok(Math.abs(range.max.z-7)<1e-5);}else{assert.ok(Math.abs(range.min.z)<1e-5);assert.ok(range.max.z<5.1);}}
   const collision=createWalkCollision([fitted]),direction=new T.Vector3(0,0,1),start=new T.Vector3(0,2,end==='start'?-4.8:.1);let feet=start;for(let i=0;i<112;i++)feet=moveWalker(collision,feet,direction.clone().multiplyScalar(.04));assert.ok(Math.abs(feet.z-(start.z+4.48))<.01);assert.ok(groundAt(collision,feet));
  }finally{disposePart(original);disposePart(fitted);}
 }
});
test('fitted entrances follow a moved host and safely retain a hallway when the host is absent',()=>{
 const {host,hall,parts}=fixture(),first=buildPart(hall,{parts});host.position[2]=1;const moved=buildPart(hall,{parts}),missing=buildPart(hall,{parts:[hall]});
 try{const ceiling=r=>new T.Box3().setFromBufferAttribute(r.children.find(m=>m.userData.hallwayCeiling).geometry.attributes.position).min.z;assert.ok(Math.abs(ceiling(moved)-ceiling(first)-1)<1e-4);assert.equal(missing.userData.entranceFits,undefined);assert.ok(Math.abs(ceiling(missing))<1e-5);}finally{[first,moved,missing].forEach(disposePart);}
});
test('mirrored entrances on rotated hosts keep the shaped wall volumes closed',()=>{
 const {host,hall,parts}=fixture(),angle=.7,rotation=new T.Matrix4().makeRotationY(angle),offset=new T.Vector3(20,3,-8);for(const part of parts){part.position=new T.Vector3(...part.position).applyMatrix4(rotation).add(offset).toArray();part.rotation[1]=angle;}hall.scale[0]=-1;
 const root=buildPart(hall,{parts,collision:'sync'});try{assert.equal(root.userData.entranceFits[0].status,'fitted');for(const mesh of root.children.filter(m=>m.userData.conformedEntrance))assert.doesNotThrow(()=>assertClosedSurface(physicalSurface(mesh,new T.Matrix4())));}finally{disposePart(root);}
});
test('a facade too short for the aperture leaves the original enclosure intact',()=>{
 const {host,hall,parts}=fixture();host.scale[1]=5;const root=buildPart(hall,{parts});try{assert.equal(root.userData.entranceFits[0].status,'incomplete-surface');assert.ok(!root.children.some(m=>m.userData.conformedEntrance));}finally{disposePart(root);}
});
test('entrance surface references follow complete copies and detach from isolated copied hallways',()=>{
 const {host,hall,parts}=fixture(),all=copyParts(parts,new Set(parts.map(p=>p.id))),solo=copyParts(parts,new Set([hall.id]));assert.equal(all.find(p=>p.route).route.segments[0].hallway.entranceFit.partId,all.find(p=>!p.route).id);assert.equal(solo[0].route.segments[0].hallway.entranceFit,undefined);assert.doesNotThrow(()=>validateProject({format:'open-building-studio',version:1,name:'Fitted',parts}));hall.route.segments[0].hallway.entranceFit.end='other';assert.throws(()=>validateProject({format:'open-building-studio',version:1,name:'Invalid',parts}),/entrance end/);
});

test('a cropped exit preserves the adjoining balcony deck and underside across its full mouth',()=>{
 for(const style of ['plain','kashyyyk-timber','kashyyyk-thatched'])for(const offset of [0,-.02]){
  const {host,hall}=fixture('end'),deck=makePart('platform',{position:[0,2+offset,6.5],rotation:[0,.2,0]});
  if(style!=='plain')Object.assign(deck.platform,kashyyykPlatformDefaults(style,8));
  Object.assign(deck.platform.sections[0],{kind:'circle',width:8,depth:8,z:0});deck.platform.railing='none';
  const angle=.6,rotation=new T.Matrix4().makeRotationY(angle),translation=new T.Vector3(40,12,-20),parts=[host,hall,deck];
  for(const p of parts){p.position=new T.Vector3(...p.position).applyMatrix4(rotation).add(translation).toArray();p.rotation[1]+=angle;}hall.scale[0]=-1;
  for(const cached of [false,true]){
   const roots=parts.map(p=>buildPart(p,{parts,collision:'sync',...(cached?{openingCuts:prepareInteriorCuts(parts)}:{})})),balcony=roots[2],uncut=buildPart(deck,{parts:[deck],collision:false});
   try{
    const signature=root=>root.children.filter(m=>m.isMesh).map(m=>Array.from(m.geometry.attributes.position.array));
    assert.deepEqual(signature(balcony),signature(uncut),'the supporting deck and underside are not excavated');
    const collision=createWalkCollision(roots),matrix=partMatrix(hall);
    for(const x of [-1.4,0,1.4])for(const z of [5.2,5.5,6,6.8]){
     const point=new T.Vector3(x,0,z).applyMatrix4(matrix),ground=groundAt(collision,point,.1,.2);
     assert.ok(ground,'the entire doorway-to-balcony junction supports walking');assert.ok(Math.abs(ground.point.y-point.y)<.05);
     assert.ok(new T.Raycaster(point.clone().add(new T.Vector3(0,.1,0)),new T.Vector3(0,-1,0),0,.2).intersectObject(balcony,true).length,'the visible deck has no missing triangles beyond the cropped floor');
    }
   }finally{roots.forEach(disposePart);disposePart(uncut);}
  }
 }
});

test('a platform above a hallway still opens where it obstructs the passage',()=>{
 const {host,hall}=fixture('end'),deck=makePart('platform',{position:[0,4,6],platform:{thickness:.2,supports:false,railing:'none',railHeight:1.1,sections:[{id:'deck',kind:'rectangle',x:0,z:0,width:8,depth:8,radius:0,rotation:0}]}}),parts=[host,hall,deck],root=buildPart(deck,{parts,collision:false});
 try{root.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(0,4.1,6),new T.Vector3(0,-1,0),0,.3);assert.equal(ray.intersectObject(root,true).length,0);}finally{disposePart(root);}
});
