import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {vesperRift,VESPER_SITES,VESPER_REFERENCE_VIEW} from '../examples/generators/vesper-rift-demo.js';
import {validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {moveWalker,groundAt,verticalWalker} from '../src/walk/walk-physics.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {generateSWBF2Navigation} from '../src/swbf2/swbf2-navigation.js';
import {roomPorts} from '../src/interiors/room-route.js';
const project=JSON.parse(readFileSync(new URL('../examples/projects/vesper-rift.building.json',import.meta.url),'utf8'));
let roots,collision;
before(()=>{const cuts=prepareInteriorCuts(project.parts);roots=project.parts.filter(p=>p.type!=='character-reference').map(p=>buildPart(p,{parts:project.parts,openingCuts:cuts,batch:true,collision:'sync'}));collision=createWalkCollision(roots);});
after(()=>roots?.forEach(disposePart));
function walk(points,label){
 let feet=new T.Vector3(...points[0]),velocity=0;const floor=groundAt(collision,feet,.4,.6);assert.ok(floor,label+' starting floor');feet.y=floor.point.y;
 for(const point of points.slice(1)){const target=new T.Vector3(...point);let steps=0;
  while(Math.hypot(target.x-feet.x,target.z-feet.z)>.04){const direction=target.clone().sub(feet).setY(0),length=direction.length();direction.multiplyScalar(Math.min(.07,length)/length);let next=moveWalker(collision,feet,direction,1.8,.5);const vertical=verticalWalker(collision,next,velocity,.03,false,1.8,.5);next=vertical.feet;velocity=vertical.velocity;
   assert.ok(next.distanceTo(feet)>1e-5,label+' blocked at '+feet.toArray()+' aiming '+point);feet=next;assert.ok(++steps<2500,label+' reaches waypoint');assert.ok(groundAt(collision,feet,.12,.4),label+' continuous floor '+feet.toArray());
  }
  for(let i=0;i<20;i++){const v=verticalWalker(collision,feet,velocity,.03,false);feet=v.feet;velocity=v.velocity;}
  assert.ok(Math.abs(feet.y-target.y)<.15,label+' expected floor '+target.y+' actual '+feet.y);
 }
}
test('Vesper Rift is native, finite and within an infantry map geometry budget',()=>{
 assert.deepEqual(vesperRift(),project);assert.deepEqual(validateProject(project),project);assert.ok(project.parts.length<=500);
 let triangles=0,meshes=0;for(const root of roots){const stats=geometryStats(root);triangles+=stats.triangles;meshes+=stats.meshes;root.traverse(m=>{if(m.isMesh)for(const a of Object.values(m.geometry.attributes))assert.ok(a.array.every(Number.isFinite));});}
 assert.ok(triangles<85000,'triangles '+triangles);assert.ok(meshes<1000,'batches '+meshes);
});
test('each street and short stair flight has continuous native soldier collision in both directions',()=>{
 for(const p of project.parts.filter(p=>p.type==='stair-route')){
  const matrix=new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion().setFromEuler(new T.Euler(...p.rotation)),new T.Vector3(...p.scale));
  const layout=routeLayout(p.route);let points=[new T.Vector3(...layout[0].start).applyMatrix4(matrix).toArray(),...layout.map(l=>new T.Vector3(...l.end).applyMatrix4(matrix).toArray())];
  // Start/end on the adjoining street: test the junction, not a ray exactly on
  // the floating-point boundary of the ramp's first/last triangle.
  const tangent=new T.Vector3(...points.at(-1)).sub(new T.Vector3(...points[0])).setY(0).normalize().multiplyScalar(.25);
  points[0]=new T.Vector3(...points[0]).sub(tangent).toArray();points[points.length-1]=new T.Vector3(...points.at(-1)).add(tangent).toArray();
  // Broad crossings deliberately contain a central refuge. Walk its clear
  // side aisle; requiring a straight path through cover would defeat its use.
  if(['Arrival arch crossing','High aqueduct crossing'].includes(p.name)){
   const [,y,z]=points[0];points=[points[0],[-4,y,z],[-3,y,z+2],[3,y,z+2],[4,y,z],points.at(-1)];
  }
  walk(points,p.name);walk([...points].reverse(),p.name+' descent');
  for(const s of p.route.segments)if(s.kind==='stairs'){assert.ok(Math.abs(s.rise/s.steps)<=.17);assert.ok(s.run/s.steps>=.3);assert.ok(Math.abs(s.rise)<=2.01,'rest after short flights');}
 }
});
test('all five objective locations have supported playable floors',()=>{
 assert.deepEqual(VESPER_SITES.map(s=>s.team),[1,0,0,0,2],'Deployment CP0 starts with Republic and CP4 with CIS');
 for(const site of VESPER_SITES){const p=new T.Vector3(...site.position);const hit=groundAt(collision,p,.4,.6);assert.ok(hit,site.label+' floor');assert.ok(Math.abs(hit.point.y-p.y)<.02,site.label+' floor height');}
});

test('bridge arches meet the deck undersides along their full spans',()=>{
 assert.ok(project.parts.filter(p=>p.name.startsWith('Great flared mineral shaft')).length>=8);
 assert.ok(!project.parts.some(p=>p.type==='archbody'));
 for(const p of project.parts.filter(p=>p.type==='flat-arch')){
  const root=roots.find(r=>r.userData.partId===p.id),matrix=root.matrixWorld;
  for(const t of [-.58,-.3,0,.3,.58]){
   const point=new T.Vector3(t,1.3,.2).applyMatrix4(matrix),ray=new T.Raycaster(point.clone().add(new T.Vector3(0,-.03,0)),new T.Vector3(0,1,0),0,.08);
   const neighbours=roots.filter(r=>r!==root),hit=ray.intersectObjects(neighbours,true)[0];
   assert.ok(hit,p.name+' touches the deck at '+t);
  }
 }
});
test('every sanctuary, market, council and utility doorway admits a full-width infantry agent',()=>{
 for(const p of project.parts.filter(p=>p.interior))for(const port of roomPorts(p)){
  const normal=new T.Vector3(Math.sin(port.angle),0,Math.cos(port.angle)),outside=port.point.clone().addScaledVector(normal,1.5),inside=port.point.clone().addScaledVector(normal,-1.5);
  walk([outside.toArray(),inside.toArray()],p.name+' doorway '+port.ref.roomDoorId);
 }
});

test('reference viewpoint is a reachable character-height position on the playable street',()=>{
 const {feet,eye}=VESPER_REFERENCE_VIEW;
 assert.equal(eye[0],feet[0]);assert.equal(eye[2],feet[2]);assert.ok(Math.abs(eye[1]-feet[1]-1.7)<1e-6);
 const hit=groundAt(collision,new T.Vector3(...feet),.1,.2);assert.ok(hit);assert.ok(Math.abs(hit.point.y-feet[1])<.02);
 walk([VESPER_SITES[0].position,feet],'arrival to reference overlook');
 walk([feet,VESPER_SITES[0].position],'reference overlook to arrival');
});

test('the CIS starting post sits between the village houses and connects to the crossing',()=>{
 const target=VESPER_SITES[4].position;
 assert.deepEqual(target,[-3,38,-168.5]);
 const approach=[[-5,38,-140],[-3,38,-148],target];
 walk(approach,'crossing to village CIS post');walk([...approach].reverse(),'CIS post to crossing');
});

test('the inhabited banks and village fit one automatically generated native AI network',()=>{
 const nav=generateSWBF2Navigation(project.parts,roots);
 assert.ok(nav.hubs.length<=255);assert.ok(nav.connections.length<=255);
 assert.equal(nav.components.length,1);assert.equal(nav.stats.isolatedHubs,0);
 for(const p of project.parts.filter(p=>p.interior))assert.ok(nav.components[0].partIds.includes(p.id),p.name+' reachable by AI');
 const hubs=new Map(nav.hubs.map(h=>[h.name,h])),links=new Map(nav.hubs.map(h=>[h.name,[]]));
 for(const c of nav.connections){const a=hubs.get(c.start),b=hubs.get(c.end),cost=new T.Vector3(...a.position).distanceTo(new T.Vector3(...b.position));links.get(a.name).push([b.name,cost]);links.get(b.name).push([a.name,cost]);}
 const nearest=p=>[...nav.hubs].sort((a,b)=>new T.Vector3(...a.position).distanceToSquared(new T.Vector3(...p))-new T.Vector3(...b.position).distanceToSquared(new T.Vector3(...p)))[0].name;
 for(const sign of [-1,1])for(const [start,end] of [[[sign*50,28,40],[sign*50,32,-50]],[[sign*50,32,-50],[sign*50,38,-140]]]){
  const first=nearest(start),last=nearest(end),distances=new Map([[first,0]]),pending=[first];
  while(pending.length){pending.sort((a,b)=>distances.get(b)-distances.get(a));const name=pending.pop();for(const [next,cost] of links.get(name)){if(hubs.get(next).position[0]*sign<=25)continue;const distance=distances.get(name)+cost;if(distance>=(distances.get(next)??Infinity))continue;distances.set(next,distance);pending.push(next);}}
  assert.ok((distances.get(last)??Infinity)<200,`${sign<0?'West':'East'} bank keeps its own stair/street path instead of a whole-map detour`);
 }
});
