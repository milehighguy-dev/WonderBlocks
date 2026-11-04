import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {minimumRun} from '../src/routes/stair-route.js';
import {YAVIN_PRESETS} from '../src/parts/yavin-presets.js';
import {physicalSurface} from '../src/collision/object-collision.js';
import {assertClosedSurface} from '../src/collision/collision-geometry.js';
import {applySurface} from '../src/materials/surfaces.js';
const part=covered=>makePart('stair-route',structuredClone(YAVIN_PRESETS[covered?6:4].preset));
const worldVertices=(g,m)=>{g.updateMatrixWorld(true);const a=m.geometry.attributes.position;return Array.from({length:a.count},(_,i)=>new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld));};
const ray=(g,p,d,max=40)=>new T.Raycaster(new T.Vector3(...p),new T.Vector3(...d),0,max).intersectObject(g,true);

test('covered aqueduct defaults add only a cover to the open span, without a fixed-depth pier',()=>{
 const open=part(false),covered=part(true);assert.equal(covered.route.segments[0].fillToGround??false,false);assert.equal(covered.route.segments[0].railing.supportDepth,undefined);assert.equal(covered.route.segments[0].run,open.route.segments[0].run);
 for(const y of [0,12]){open.position[1]=covered.position[1]=y;const a=buildPart(open,{collision:false}),b=buildPart(covered,{collision:false});try{
  for(const kind of ['underbody','cap'])assert.deepEqual(b.children.filter(m=>m.userData.yavinAqueductPart===kind).map(m=>Array.from(m.geometry.attributes.position.array)),a.children.filter(m=>m.userData.yavinAqueductPart===kind).map(m=>Array.from(m.geometry.attributes.position.array)));
  b.updateMatrixWorld(true);assert.equal(ray(b,[0,y+1.8,-1],[0,0,1],20).length,0);assert.ok(ray(b,[0,y+1.8,9],[0,1,0],6).length);assert.ok(b.children.every(m=>!m.geometry.attributes.aqueductGroundWeight));
 }finally{disposePart(a);disposePart(b);}}
});

test('optional aqueduct fill anchors at world ground on raised, moved, scaled, sloped and curved sections',()=>{
 const variants=[{}, {height:5,ground:-4}, {height:27,rotation:[0,.7,0],scale:[1.4,1.8,.8]}, {height:12,ramp:true}, {height:18,curve:Math.PI/2}, {height:20,rotation:[.08,.6,.06],scale:[-1.2,1.4,1.1]}, {height:20,corner:true}];
 for(const v of variants){const p=part(true),s=p.route.segments[0];p.position=[2,v.height??8,-3];p.rotation=v.rotation??[0,0,0];p.scale=v.scale??[1,1,1];p.route.groundHeight=v.ground??0;s.fillToGround=true;if(v.ramp){s.kind='ramp';s.rise=3;}if(v.curve){s.curveAngle=v.curve;s.run=minimumRun(p.route,0);}if(v.corner){s.turn='right';p.route.segments.push({...structuredClone(s),turn:'straight'});}assert.doesNotThrow(()=>validateProject({format:'open-building-studio',version:1,name:'Filled aqueduct',parts:[p]}));
  for(const dy of [0,7]){p.position[1]+=dy;const g=buildPart(p,{collision:'sync'});try{
   const supports=g.children.filter(m=>m.geometry.attributes.aqueductGroundWeight);assert.ok(supports.length>0);
   for(const m of supports){const points=worldVertices(g,m);assert.ok(Math.abs(Math.min(...points.map(v=>v.y))-p.route.groundHeight)<1e-4,'support ends at world ground after moving');assert.ok(points.every(v=>v.y>=p.route.groundHeight-1e-4),'nothing buried below ground');}
   for(const m of g.children.filter(m=>m.isMesh)){assert.doesNotThrow(()=>assertClosedSurface(physicalSurface(m,new T.Matrix4())),JSON.stringify(v));const a=m.geometry.attributes.position,uv=m.geometry.attributes.uv;for(let i=0;i<a.count;i+=3){const x=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,i+j)),area=x[1].clone().sub(x[0]).cross(x[2].clone().sub(x[0])).length();if(area<1e-7)continue;const u=[0,1,2].map(j=>new T.Vector2().fromBufferAttribute(uv,i+j)),uvArea=Math.abs(u[1].clone().sub(u[0]).cross(u[2].clone().sub(u[0])));assert.ok(uvArea/area>1e-6,'no collapsed or streaked texture triangles');}}
   assert.ok(g.children.filter(m=>m.userData.routeFloor).every(m=>!m.geometry.userData.groundVertices),'aqueduct fill uses its own support instead of a second filled floor');
  }finally{disposePart(g);}}
 }
});

test('aqueduct support UVs tile at consistent density over the actual height and survive repainting',()=>{
 for(const height of [7,23]){const p=part(true);p.position[1]=height;p.route.segments[0].fillToGround=true;const g=buildPart(p,{collision:false}),m=g.children.find(m=>m.geometry.attributes.aqueductGroundWeight),a=m.geometry.attributes.position,n=m.geometry.attributes.normal;
  try{for(const density of [.2,.6]){applySurface(new T.Group().add(m),m.material,{...p,surface:{preset:'yavin-stone',scale:density}});g.add(m);const uv=m.geometry.attributes.uv;let count=0;for(let i=0;i<a.count;i++)if(Math.abs(n.getZ(i))>.999){assert.ok(Math.abs(uv.getX(i)-a.getX(i)*density)<1e-4);assert.ok(Math.abs(uv.getY(i)-a.getY(i)*density)<1e-4);count++;}assert.ok(count>15,'end caps retain a continuous masonry unwrap over their full height');}}
  finally{disposePart(g);}
 }
});
