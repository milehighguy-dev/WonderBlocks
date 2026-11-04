import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {levantine} from '../examples/generators/levantine-demo.js';
import {validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {moveWalker,groundAt,verticalWalker} from '../src/walk/walk-physics.js';

test('vine passage and its saved example use Mos Eisley rooms and parts beneath the editable vines',()=>{
 assert.deepEqual(levantine(),JSON.parse(fs.readFileSync(new URL('../examples/projects/levantine-vine-passage.building.json',import.meta.url))));
 for(const p of [levantine(),JSON.parse(fs.readFileSync(new URL('../examples/projects/levantine-vine-passage.building.json',import.meta.url)))]){
  validateProject(p);
  assert.equal(p.parts.filter(p=>p.type==='interior').length,8);
  assert.ok(p.parts.filter(p=>p.type==='interior').every(p=>p.interior.buildingStyle.type==='mos-eisley'));
  for(const type of ['mos-entry-a-open','mos-entry-b-open','mos-buttress','mos-dome','mos-vent','mos-arch','mos-canopy'])assert.ok(p.parts.some(p=>p.type===type),type);
  assert.ok(!p.parts.some(p=>['archbody','door','dome'].includes(p.type)),'house details use the Mos Eisley collection');
  const vines=p.parts.filter(p=>p.type==='flora');assert.equal(vines.length,16);
  assert.ok(vines.every(p=>p.flora.branches.some(b=>!b.anchor)&&p.flora.organs.length>=12));
  assert.ok(p.parts.every(p=>p.assemblyId&&p.assemblyName));
 }
});

test('a standing character can walk the passage and enter all eight Mos Eisley houses',()=>{
 const project=levantine(),openingCuts=prepareInteriorCuts(project.parts),roots=project.parts.filter(p=>!p.flora).map(p=>buildPart(p,{parts:project.parts,openingCuts,batch:true,collision:'sync'}));
 try{
  const collision=createWalkCollision(roots);
  const walk=(start,target,label)=>{
   let feet=new T.Vector3(...start),velocity=0;feet.y=groundAt(collision,feet).point.y;
   const end=new T.Vector3(...target);
   for(let steps=0;Math.hypot(end.x-feet.x,end.z-feet.z)>.05;steps++){
    assert.ok(steps<1000,label+' reached');const delta=end.clone().sub(feet).setY(0);delta.setLength(Math.min(.08,delta.length()));
    const next=verticalWalker(collision,moveWalker(collision,feet,delta),velocity,.03,false);velocity=next.velocity;
    assert.ok(next.feet.distanceTo(feet)>1e-5,label+' blocked at '+feet.toArray());feet=next.feet;
    assert.ok(groundAt(collision,feet,.2,.6),label+' footing');
   }
  };
  walk([0,.1,-14],[0,.1,19],'covered walkway');
  for(const house of project.parts.filter(p=>p.type==='interior')){
   const z=house.position[2]-.45,side=Math.sign(house.position[0]);
   walk([0,.1,z],[side*4,.1,z],house.assemblyName);
  }
 }finally{roots.forEach(disposePart);}
});

test('pergola leaves a continuous walking lane and safe headroom within a modest geometry budget',()=>{
 const project=levantine(),root=new T.Group();
 try{
  for(const p of project.parts)root.add(buildPart(p,{batch:true,collision:false}));root.updateMatrixWorld(true);
  const stats=geometryStats(root);assert.ok(stats.triangles<60000);assert.ok(stats.meshes<1000);
  root.traverse(m=>{if(m.isMesh)for(const name of ['position','normal','uv'])assert.ok(m.geometry.attributes[name].array.every(Number.isFinite));});
  const solids=[];root.traverse(m=>{if(m.isMesh&&m.material.userData.walkCollision!==false)solids.push(m);});
  for(const x of [-.65,0,.65]){
   const forward=new T.Raycaster(new T.Vector3(x,1.7,-14),new T.Vector3(0,0,1),0,26);
   assert.equal(forward.intersectObjects(solids,false).length,0,'central lane must stay open');
   for(let z=-12;z<=12;z+=3){
    const up=new T.Raycaster(new T.Vector3(x,1.7,z),new T.Vector3(0,1,0),0,1.05);
    assert.equal(up.intersectObjects(solids,false).length,0,'timber must clear a standing character');
   }
  }
 }finally{disposePart(root);}
});
