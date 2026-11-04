import {buildingContours} from '../src/interiors/building-contours.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {defaultInterior,validateInterior,interiorFromShell} from '../src/interiors/interior.js';
import {applyBuildingStyle} from '../src/interiors/building-style.js';
import {addStorey} from '../src/interiors/interior-storeys.js';
import {polygonRoom} from '../src/interiors/polygon-plan.js';
import {assertClosedSurface} from '../src/collision/collision-geometry.js';
import {createObjectCollision} from '../src/collision/object-collision.js';

const styled=()=>{const part=makePart('interior');part.interior=defaultInterior();applyBuildingStyle(part.interior,'mos-eisley');return part;};
function check(part,fn){const g=buildPart(part);try{g.updateMatrixWorld(true);fn(g);}finally{disposePart(g);}}
const hits=(g,origin,direction,filter)=>new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,3).intersectObjects(g.children,true).filter(h=>filter(h.object));

test('building style preserves the room layout and openings, paints all floors, and round trips',()=>{
 let p=defaultInterior();p.doors=[{axis:'x',line:0,offset:3,width:1.6,height:2.5,kind:'door'}];p=addStorey(p);
 const topology=structuredClone(p);applyBuildingStyle(p,'mos-eisley');
 assert.deepEqual(p.rooms,topology.rooms);assert.deepEqual(p.doors,topology.doors);assert.deepEqual(p.storeys[0].plan.rooms,topology.storeys[0].plan.rooms);
 for(const level of [p,p.storeys[0].plan])assert.equal(level.finishes.outside.preset,'mos-worn-stucco');
 const part=makePart('interior');part.interior=p;const project={format:'open-building-studio',version:1,name:'Style',parts:[part]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))).parts[0].interior,p);
 applyBuildingStyle(p,'default');assert.equal(p.buildingStyle,undefined);assert.equal(p.finishes.wall.preset,'stone');assert.deepEqual(p.doors,topology.doors);
 for(const value of [{type:'unknown'},{...styled().interior.buildingStyle,rimHeight:-1},{...styled().interior.buildingStyle,baseProjection:9},{...styled().interior.buildingStyle,extra:true}])assert.throws(()=>validateInterior({...p,buildingStyle:value}),/style/);
});

test('room-built trim follows an L outline, leaves shared walls bare, and has closed finite geometry',()=>{
 const part=styled(),p=part.interior;p.rooms=[{id:'a',x:0,z:0,w:6,d:5},{id:'b',x:6,z:0,w:4,d:3}];
 const loops=buildingContours(p);assert.equal(loops.length,1);assert.equal(loops[0].length,7);
 check(part,g=>{const trim=g.children.filter(m=>m.userData.roofParapet||m.userData.baseSlope);assert.ok(trim.length>=6);assert.ok(!g.children.some(m=>m.userData.baseSlope),'the wall itself flares; no separate base wedges');
  for(const m of trim){assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));assert.ok(m.geometry.attributes.normal.array.every(Number.isFinite));assert.ok(m.userData.structuralVolume);}
  // The shared x=6 wall is interior; there must be no rim there.
  assert.equal(hits(g,[5,4.4,1.5],[1,0,0],m=>m.userData.roofParapet).length,0);
  const box=new T.Box3().setFromObject(g);assert.ok(Math.abs(box.min.x+.4)<1e-5);assert.ok(Math.abs(box.max.y-4.6)<1e-5);
 });
});

test('sloped feet leave exterior doors clear while retaining the neighboring base',()=>{
 const part=styled();part.interior.doors=[{axis:'x',line:0,offset:3,width:1.6,height:2.5,kind:'door'}];
 check(part,g=>{assert.equal(hits(g,[3,.25,-1],[0,0,1],m=>m.material?.userData.interiorRole==='outside').length,0);assert.ok(hits(g,[1,.25,-1],[0,0,1],m=>m.material?.userData.interiorRole==='outside').length>0);});
 const shell=makePart('block');shell.scale=[8,5,7];const converted=interiorFromShell(shell);applyBuildingStyle(converted.interior,'mos-eisley');converted.interior.doors=[{axis:'x',line:-3.1,offset:0,width:1.6,height:2.5,kind:'door'}];
 check(converted,g=>{assert.equal(hits(g,[0,.25,-4.5],[0,0,1],m=>m.material?.userData.interiorRole==='outside').length,0);assert.ok(hits(g,[2,.25,-4.5],[0,0,1],m=>m.material?.userData.interiorRole==='outside').length>0);});
});

test('upper floors suppress buried rims, while polygon footprints keep their corners',()=>{
 const part=styled();part.interior=addStorey(part.interior);
 check(part,g=>{const rims=g.children.filter(m=>m.userData.roofParapet);assert.equal(rims.length,4);assert.ok(rims.every(m=>m.userData.interiorStorey!=='ground'));});
 const p=styled();p.interior.rooms=[polygonRoom('angled',[{x:0,z:0},{x:6,z:0},{x:7,z:4},{x:3,z:6},{x:0,z:4}])];
 check(p,g=>assert.equal(g.children.filter(m=>m.userData.roofParapet).length,5));
});

test('the slope is the wall surface, with one exterior skin and no added base meshes',()=>{
 const part=styled();part.interior.buildingStyle.rimHeight=0;
 const straight=structuredClone(part);straight.interior.buildingStyle.baseHeight=0;
 const original=buildPart(straight,{collision:false}),profiled=buildPart(part,{collision:false});
 try{
  original.updateMatrixWorld(true);profiled.updateMatrixWorld(true);
  assert.equal(profiled.children.length,original.children.length,'profiling changes existing wall geometry, not the mesh count');
  for(const [y,z] of [[.1,-.2831168831],[.2,-.1734265734],[.4,-.1314685315],[.55,-.1],[1,-.1]]){
   const ray=new T.Raycaster(new T.Vector3(2.9,y,-1),new T.Vector3(0,0,1),0,1.3),faces=ray.intersectObject(profiled,true);
   assert.equal(faces.length,1,'no hidden upright wall behind the slope');
   assert.ok(Math.abs(faces[0].point.z-z)<1e-6);
  }
  // Interior wall faces stay vertical and the floor stays at its authored elevation.
  const interior=new T.Raycaster(new T.Vector3(3,.2,1),new T.Vector3(0,0,-1),0,2).intersectObject(profiled,true)[0];
  assert.ok(Math.abs(interior.point.z-.1)<1e-6);
  for(const mesh of profiled.children)if(mesh.userData.structuralVolume)assert.doesNotThrow(()=>assertClosedSurface(mesh.userData.structuralVolume));
  const collision=createObjectCollision(part,profiled,{simplify:false});assert.ok(collision.bodies.some(b=>b.surface?.positions.some(v=>v[2]<-.35)),'collision follows the flared wall');
 }finally{disposePart(original);disposePart(profiled);}
});

test('steep wall slopes keep the original vertical UV projection and scaled profiles retain metre dimensions',()=>{
 const part=styled();part.interior.buildingStyle.baseProjection=1.2;
 check(part,g=>{
  let slopeVertices=0;
  for(const mesh of g.children){if(mesh.material?.userData.interiorRole!=='outside'||mesh.userData.interiorCeiling||mesh.userData.interiorFloor)continue;const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,n=mesh.geometry.attributes.normal;
   for(let i=0;i<p.count;i++)if(p.getZ(i)<-.1&&p.getY(i)>=0&&p.getY(i)<.55&&n.getZ(i)<-.1){assert.ok(Math.abs(uv.getY(i)-p.getY(i)*.25)<1e-6);slopeVertices++;}
  }assert.ok(slopeVertices>0);
 });
 part.interior.buildingStyle.baseProjection=.3;part.scale=[-1.5,2,.75];
 check(part,g=>{const face=new T.Raycaster(new T.Vector3(-4.35,.25,-1),new T.Vector3(0,0,1),0,1.3).intersectObject(g,true)[0];assert.ok(Math.abs(face.point.z+.1379370629)<1e-6);});
});
