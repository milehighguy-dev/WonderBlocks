import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {cinderlock} from '../examples/generators/cinderlock-demo.js';
import {validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {moveWalker,groundAt,verticalWalker} from '../src/walk/walk-physics.js';

const project=JSON.parse(readFileSync(new URL('../examples/projects/cinderlock.building.json',import.meta.url),'utf8'));
let roots,collision,bullets;
before(()=>{const openingCuts=prepareInteriorCuts(project.parts);roots=project.parts.filter(p=>p.type!=='character-reference').map(p=>buildPart(p,{parts:project.parts,openingCuts,batch:true,collision:'sync'}));collision=createWalkCollision(roots);bullets=createWalkCollision(roots,{mask:16});});
after(()=>roots?.forEach(disposePart));
function walk(points,label){
 let feet=new T.Vector3(...points[0]);const floor=groundAt(collision,feet,.4,.6);assert.ok(floor,label+' starting floor');feet.y=floor.point.y;let distance=0,velocity=0;
 for(const point of points.slice(1)){const target=new T.Vector3(...point);let steps=0;
  while(Math.hypot(target.x-feet.x,target.z-feet.z)>.04){
   const direction=target.clone().sub(feet).setY(0),length=direction.length();direction.multiplyScalar(Math.min(.07,length)/length);
   let next=moveWalker(collision,feet,direction);const vertical=verticalWalker(collision,next,velocity,.03,false);next=vertical.feet;velocity=vertical.velocity;distance+=next.distanceTo(feet);
   assert.ok(next.distanceTo(feet)>1e-5,label+' blocked at '+feet.toArray()+' aiming at '+point);feet=next;assert.ok(++steps<2500,label+' reaches waypoint');
   assert.ok(groundAt(collision,feet,.12,.4),label+' has continuous floor at '+feet.toArray());
  }
  for(let settle=0;settle<20;settle++){const vertical=verticalWalker(collision,feet,velocity,.03,false);feet=vertical.feet;velocity=vertical.velocity;}
  assert.ok(Math.abs(feet.y-target.y)<.15,label+' waypoint '+point+' expected floor '+target.y+' actual '+feet.y);
 }
 return distance;
}
function blocked(a,b){const delta=new T.Vector3(...b).sub(new T.Vector3(...a));return !!bullets.firstHit(new T.Raycaster(new T.Vector3(...a),delta.clone().normalize(),.02,delta.length()-.02));}

test('Cinderlock is a saved native infantry block with finite, modest geometry',()=>{
 assert.deepEqual(validateProject(project),project);assert.deepEqual(cinderlock(),project);
 assert.equal(project.parts.some(p=>p.platform||p.highway),false);assert.equal(project.parts.filter(p=>p.interior).length,9);assert.equal(project.parts.filter(p=>p.route).length,16);
 let triangles=0,meshes=0;for(const root of roots){const stats=geometryStats(root);triangles+=stats.triangles;meshes+=stats.meshes;root.traverse(m=>{if(m.isMesh)for(const a of Object.values(m.geometry.attributes))assert.ok(a.array.every(Number.isFinite));});}
 assert.ok(triangles<45000,'triangles '+triangles);assert.ok(meshes<650,'mesh batches '+meshes);assert.ok(project.parts.length<280);
});

test('both workshops have walkable cooling and freight approaches and usable central crossings',()=>{
 for(const sign of [-1,1]){
  const reflect=points=>points.map(([x,y,z])=>[x*sign,y,z]);
  const north=[[42,2.4,0],[42,2.4,-8],[42,4.8,-16.5],[34,4.8,-23],[30,4.8,-23],[29,4.8,-27.2],[19,4.8,-27.2],[18,4.8,-23],[15,4.8,-23],[12.5,4.8,-21.5],[0,4.8,-21.5],[0,4.8,-20]];
  const south=[[42,2.4,0],[42,2.4,8],[42,0,16.5],[34,0,23],[30,0,23],[29,0,27.2],[19,0,27.2],[18,0,23],[15,0,23],[14,0,21.5],[6,0,21.5],[3,0,22],[3,0,24],[0,0,24]];
  walk(reflect(north),'team '+sign+' cooling flank');walk(reflect(south),'team '+sign+' freight flank');
 }
 walk([[-42,0,0],[-34,0,0],[-34,0,9.5],[-26,0,9.5],[-17.5,0,9.5],[-14,0,6],[-10,0,6],[-10,0,10.6],[-2.5,0,10.6],[-2.5,0,6],[0,0,6]].map(([x,y,z])=>[x,y+2.4,z]),'west foundry entry');
 walk([[42,0,0],[34,0,0],[34,0,-9.5],[26,0,-9.5],[17.5,0,-9.5],[14,0,-6],[10,0,-6],[10,0,-10.6],[0,0,-10.6],[-4.2,0,-6],[-4.2,0,6],[0,0,6]].map(([x,y,z])=>[x,y+2.4,z]),'east foundry entry');
 for(const x of [-14.4,14.4])walk([[x,4.8,-29],[x,4.8,-18.2],[x,2.4,-7.8],[x,2.4,0],[x,2.4,7.8],[x,0,18.2],[x,0,26]],'cross-lane alley '+x);
});

test('control booths have two working stair approaches and cannot survey the outside control sites',()=>{
 for(const x of [-8,8])for(const sign of [-1,1])walk([[x,2.4,sign*10.5],[x,2.4,sign*9.8],[x,4.8,sign*2.6],[x+Math.sign(x)*1.75,4.8,sign*2.6],[x+Math.sign(x)*1.75,4.8,sign*.6],[x,4.8,0]],'booth '+x+' stair '+sign);
 for(const x of [-8,8])for(const z of [-.8,0,.8])for(const target of [[0,6.4,-20],[0,1.6,24]])assert.ok(blocked([x,6.3,z],target),'booth '+x+' cannot watch '+target);
 for(const x of [-8,8])assert.ok([-1.7,-1.2,-.6,0,.6,1.2,1.7].some(z=>[-2,0,2].some(target=>!blocked([x,6.3,z],[target,4,6]))),'booth '+x+' contributes to the center');
});

test('spawn interiors are shielded from opposing approaches and the center has no base-to-base firing line',()=>{
 for(const sign of [-1,1])for(const spawnZ of [-3,0,3])for(const x of [-20,0,20])for(const z of [-28,-18,-6,0,6,18,28])assert.ok(blocked([sign*42,4,spawnZ],[x,z<-14?6.4:z>14?1.6:4,z]),'protected spawn '+sign+','+spawnZ+' from '+[x,z]);
 assert.ok(blocked([-30,4,0],[30,4,0]),'central furnace interrupts the long axis');
});


test('grade connections occupy separate footprints rather than stacking walking paths',()=>{
 const routes=project.parts.filter(p=>p.route),boxes=routes.map(p=>{const g=buildPart(p,{collision:false}),b=new T.Box3().setFromObject(g);disposePart(g);return {p,b};});
 for(let i=0;i<boxes.length;i++)for(const other of boxes.slice(i+1)){const own=boxes[i],width=Math.min(own.b.max.x,other.b.max.x)-Math.max(own.b.min.x,other.b.min.x),depth=Math.min(own.b.max.z,other.b.max.z)-Math.max(own.b.min.z,other.b.min.z);assert.ok(width<=.01||depth<=.01,own.p.name+' overlaps '+other.p.name);}
 const levels=project.parts.filter(p=>p.name.endsWith('solid ground')).map(p=>(Number((p.position[1]+p.scale[1]).toFixed(5))||0)).sort((a,b)=>a-b);assert.deepEqual(levels,[0,2.4,4.8]);
});
