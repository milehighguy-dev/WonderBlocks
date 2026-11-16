import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {defaultFlora,addFloraAsset,floraCurve} from '../src/flora/flora.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
const triangleCount=root=>{let n=0;root.traverse(m=>{if(m.isMesh&&m.userData.floraComponent==='bark')n+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});return n;};

test('lower-detail wood follows the same trunk and thin branch curves without editing the plant',()=>{
 const f=defaultFlora(),trunk=addFloraAsset(f,f.branches[0].id,'flora-basic-branch');trunk.points=[[0,0,0],[0,2,0],[.3,4,0]];trunk.radii=[.5,.4,.2];
 const branch=addFloraAsset(f,trunk.id,'flora-basic-branch',.7);branch.points=[[0,0,0],[.6,1.2,0],[1,2,.2]];branch.radii=[.14,.1,.06];
 const part=makePart('flora',{flora:f}),before=JSON.stringify(part),full=buildPart(part,{collision:false}),low=buildPart(part,{collision:false,lowDetail:true});
 try{
  low.updateMatrixWorld(true);const wood=[];low.traverse(m=>{if(m.isMesh&&m.userData.floraComponent==='bark')wood.push(m);});
  assert.ok(triangleCount(low)<=triangleCount(full));
  for(const b of f.branches.filter(b=>!b.anchor))for(const t of [.2,.5,.8]){
   const curve=floraCurve(f,b.id),point=curve.getPointAt(t),axis=curve.getTangentAt(t).cross(new T.Vector3(0,0,1)).normalize(),radius=Math.max(...b.radii);
   const ray=new T.Raycaster(point.clone().addScaledVector(axis,radius*3),axis.clone().negate(),0,radius*6);
   assert.ok(ray.intersectObjects(wood,false).length,'wood survives on '+b.id+' at '+t);
  }
  assert.equal(JSON.stringify(part),before);
 }finally{disposePart(full);disposePart(low);}
});

test('a distant tree keeps the same foliage cards and attachment transforms',()=>{
 const part=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree')),full=buildPart(part,{collision:false}),low=buildPart(part,{collision:false,lowDetail:true});
 const foliage=root=>{root.updateMatrixWorld(true);const result=[];root.traverse(m=>{if(m.isMesh&&m.userData.floraComponent!=='bark')result.push({positions:Array.from(m.geometry.attributes.position.array),matrix:m.matrixWorld.toArray()});});return result;};
 try{assert.deepEqual(foliage(low),foliage(full));assert.ok(triangleCount(low)<=triangleCount(full));}
 finally{disposePart(full);disposePart(low);}
});

test('a continuous vine uses fewer longitudinal samples of the same curve',()=>{
 const f=defaultFlora(),branch=addFloraAsset(f,f.branches[0].id,'flora-basic-branch');branch.points=[[0,0,0],[1,2,0],[-.5,4,1],[1,6,0]];branch.radii=[.3,.25,.2,.15];
 const part=makePart('flora',{flora:f}),full=buildPart(part,{collision:false}),low=buildPart(part,{collision:false,lowDetail:true});
 try{assert.ok(triangleCount(low)<triangleCount(full));const hi=full.children.find(m=>m.userData.floraBranch),lo=low.children.find(m=>m.userData.floraBranch);assert.ok(lo.geometry.userData.floraSampleRings<hi.geometry.userData.floraSampleRings);}
 finally{disposePart(full);disposePart(low);}
});

test('distant branch attachment frames survive the scene doorway cutting pass',()=>{
 const f=defaultFlora(),trunk=addFloraAsset(f,f.branches[0].id,'flora-basic-branch');trunk.points=[[0,0,0],[0,6,0],[1,12,0]];trunk.radii=[1,.8,.5];
 const branch=addFloraAsset(f,trunk.id,'flora-basic-branch',1);branch.points=[[0,0,0],[4,4,0],[8,7,1]];branch.radii=[.5,.35,.15];
 const part=makePart('flora',{flora:f}),room=makePart('interior',{position:[200,0,200]}),alone=buildPart(part,{collision:false,lowDetail:true}),scene=buildPart(part,{collision:false,lowDetail:true,parts:[part,room]});
 const wood=root=>{root.updateMatrixWorld(true);const vertices=[];root.traverse(m=>{if(m.isMesh&&m.userData.floraComponent==='bark'){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)vertices.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).toArray());}});return vertices;};
 try{assert.deepEqual(wood(scene),wood(alone));assert.ok(scene.children.some(m=>m.userData.floraBranch!==trunk.id&&m.userData.floraComponent==='bark'));}
 finally{disposePart(alone);disposePart(scene);}
});
