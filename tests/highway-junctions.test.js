import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject,mirrorPart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {defaultHighway,highwayCurve,branchHighway,highwayPaths,highwayNetworkSamples,validateHighwayNetwork,nearestHighwayPoint,removeHighwayBranch,syncHighwayJunctions} from '../src/highways/highway.js';
import {exportOBJ} from '../src/export/export.js';
const straight=()=>({...defaultHighway(),nodes:[{point:[0,0,0],tangent:[0,0,100/3]},{point:[0,0,100],tangent:[0,0,100/3]}]});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-4,`${a} != ${b}`);
const root=()=>makePart('highway',{id:'a',highway:straight()});
const ray=(roots,origin,direction)=>new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,100).intersectObjects(roots,true);
const build=parts=>parts.map(p=>{const g=buildPart(p,{parts});g.updateMatrixWorld(true);return g;});
test('curved splits and return merges keep their exposed outside barriers continuous through the mouth',()=>{
 for(const curved of [false,true])for(const sign of [-1,1])for(const merge of [false,true]){
  let h=straight();if(curved)h.nodes=[{point:[0,0,0],tangent:[0,0,35]},{point:[25,0,100],tangent:[25,0,25]}];
  h=branchHighway(h,{path:'main',segment:0,t:.3},[sign*40,0,merge?55:75],6,'exit');
  if(merge){h.branches[0].nodes[1].tangent=[0,0,20];h.branches[0].nodes.push({point:[0,0,95],tangent:[0,0,20]});h.branches[0].end={path:'main',segment:0,t:.95,direction:1,side:sign};syncHighwayJunctions(h);}
  const paths=highwayPaths(h),samples=highwayNetworkSamples(h),g=buildPart(makePart('highway',{highway:h}));g.updateMatrixWorld(true);
  const inside=(point,path)=>{const array=samples.get(path.id);for(let i=1;i<array.length;i++){
   const a=array[i-1],b=array[i],corners=[a.point.clone().addScaledVector(a.side,-path.width/2),a.point.clone().addScaledVector(a.side,path.width/2),b.point.clone().addScaledVector(b.side,path.width/2),b.point.clone().addScaledVector(b.side,-path.width/2)];
   if(new T.Triangle(corners[0],corners[1],corners[2]).containsPoint(point)||new T.Triangle(corners[0],corners[2],corners[3]).containsPoint(point))return true;
  }return false;};
  let checked=0;
  const probes=path=>{const array=samples.get(path.id),out=[];for(let i=1;i<array.length;i++){const a=array[i-1],b=array[i],count=Math.max(1,Math.ceil(a.point.distanceTo(b.point)/1.5));for(let j=0;j<count;j++){const t=(j+.5)/count;out.push({point:a.point.clone().lerp(b.point,t),side:a.side.clone().lerp(b.side,t)});}}return out;};
  for(const path of paths)for(const s of probes(path))for(const side of [-1,1]){
   const edge=s.point.clone().addScaledVector(s.side,side*(path.width/2+.01));
   const origin=edge.clone().addScaledVector(s.side,side*.4);origin.y+=.5;
   const hits=new T.Raycaster(origin,s.side.clone().multiplyScalar(-side),0,.9).intersectObject(g,true);
   if(paths.some(other=>other!==path&&inside(edge,other))){
    const buried=paths.some(other=>other!==path&&[[.4,0],[-.4,0],[0,.4],[0,-.4]].every(([x,z])=>inside(edge.clone().add(new T.Vector3(x,0,z)),other)));
    if(buried)assert.equal(hits.filter(hit=>hit.object.userData.highwayPath===path.id).length,0,'no barrier remains inside the shared driving surface');
    continue;
   }
   assert.ok(hits.length>0,`missing exposed ${path.id} barrier at ${edge.toArray()} (curved=${curved})`);checked++;
  }
  assert.ok(checked>50);disposePart(g);
 }
});
test('branches depart from either side with aligned outside edges and clear central lanes',()=>{
 for(const side of [-1,1]){
  const h=branchHighway(straight(),{path:'main',segment:0,t:.2},[side*35,0,55],6,'exit');
  assert.equal(h.branches[0].start.side,side);
  near(highwayPaths(h)[1].nodes[0].point[0],side*3);
  const g=buildPart(makePart('highway',{highway:h}));g.updateMatrixWorld(true);
  for(const x of [-4,0,4])assert.equal(ray([g],[x,.6,18],[0,0,1]).filter(hit=>hit.distance<38).length,0,'no branch barrier stub crosses a main driving lane');
  h.width=16;h.branches[0].width=4;syncHighwayJunctions(h);
  near(h.branches[0].nodes[0].point[0],side*6);
  const p=makePart('highway',{highway:h}),saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Side split',parts:[p]})));
  assert.equal(saved.parts[0].highway.branches[0].start.side,side);
  assert.equal(mirrorPart(p).highway.branches[0].start.side,side);
  const invalid=structuredClone(h);invalid.branches[0].start.side=0;assert.throws(()=>validateHighwayNetwork(invalid));
  disposePart(g);
 }
});
test('side attachments follow curved parents and merge at the matching edge',()=>{
 let h={...defaultHighway(),nodes:[{point:[0,0,0],tangent:[0,0,30]},{point:[25,0,100],tangent:[15,0,30]}]};
 h=branchHighway(h,{path:'main',segment:0,t:.2},[55,0,55],6,'exit');
 const branch=h.branches[0];branch.nodes.push({point:[0,0,90],tangent:[0,0,15]});branch.end={path:'main',segment:0,t:.9,direction:1,side:1};
 syncHighwayJunctions(h);
 for(const [ref,node] of [[branch.start,branch.nodes[0]],[branch.end,branch.nodes.at(-1)]]){
  const curve=highwayCurve(h.nodes[0],h.nodes[1]),center=curve.getPoint(ref.t),tangent=curve.getTangent(ref.t),side=new T.Vector3(tangent.z,0,-tangent.x).normalize();
  near(new T.Vector3(...node.point).sub(center).dot(side),3);
 }
 // Previously saved centreline junctions keep their existing placement.
 delete branch.start.side;syncHighwayJunctions(h);
 near(new T.Vector3(...branch.nodes[0].point).distanceTo(highwayCurve(h.nodes[0],h.nodes[1]).getPoint(.2)),0);
});
test('same-level separate highways produce a single surface and clear intersection barriers',()=>{const a=root(),b=makePart('highway',{id:'b',position:[-30,0,50],rotation:[0,Math.PI/2,0],highway:{...defaultHighway(),width:6,nodes:[{point:[0,0,0],tangent:[0,0,20]},{point:[0,0,60],tangent:[0,0,20]}]}}),meshes=build([a,b]);for(const [x,z] of [[.317,49.761],[5.5,50.1],[-5.5,49.9]]){const hits=ray(meshes,[x,10,z],[0,-1,0]).filter(h=>Math.abs(h.point.y)<.001);assert.equal(hits.length,1);}
 assert.equal(ray(meshes,[-15,.6,50],[1,0,0]).length,0);for(const x of [-20,20])assert.ok(ray(meshes,[x,.6,40],[0,0,1]).length>0,'barriers remain away from the junction');meshes.forEach(disposePart);});
test('overpasses retain both decks and do not open their barriers',()=>{const a=root(),b=makePart('highway',{id:'b',position:[-30,6,50],rotation:[0,Math.PI/2,0],highway:{...defaultHighway(),width:6,nodes:[{point:[0,0,0],tangent:[0,0,20]},{point:[0,0,60],tangent:[0,0,20]}]}}),meshes=build([a,b]),hits=ray(meshes,[.317,20,49.761],[0,-1,0]);assert.ok(hits.some(h=>Math.abs(h.point.y)<.001));assert.ok(hits.some(h=>Math.abs(h.point.y-6)<.001));assert.ok(ray(meshes,[-15,.6,50],[1,0,0]).length>0);assert.ok(ray(meshes,[0,6.6,40],[0,0,1]).length>0);meshes.forEach(disposePart);});
test('a narrower exit ramp shares its junction and clears the highway before descending',()=>{let h=branchHighway(straight(),{path:'main',segment:0,t:.2},[35,-6,55],6,'exit');validateHighwayNetwork(h);const paths=highwayPaths(h),samples=highwayNetworkSamples(h).get('exit');near(paths[1].nodes[0].point[2],20);assert.ok(samples.some(s=>s.point.x>15&&s.point.y< -1));for(const s of samples.filter(s=>s.point.x<=9))near(s.point.y,0);const p=makePart('highway',{highway:h}),g=buildPart(p);g.updateMatrixWorld(true);for(const x of [4,5,6,7]){const hit=ray([g],[x,10,30],[0,-1,0]).find(h=>h.object.userData.highwayDeck);assert.ok(hit);near(hit.point.y,0);}assert.ok(!/NaN|Infinity/.test(exportOBJ(g)));disposePart(g);});
test('junction references follow parent curve edits and preserve branch identity through saves and mirrors',()=>{const h=branchHighway(straight(),{path:'main',segment:0,t:.2},[35,0,55],6,'exit');h.nodes[0].point[1]=4;h.nodes[1].point[1]=4;syncHighwayJunctions(h);near(h.branches[0].nodes[0].point[1],4);const p=makePart('highway',{highway:h}),project={format:'open-building-studio',version:1,name:'Interchange',parts:[p]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);const reflected=mirrorPart(p);assert.deepEqual(reflected.highway.branches[0].start,h.branches[0].start);const pick=nearestHighwayPoint(h,new T.Vector3(0,4,75),{only:'main'});near(pick.t,.75);assert.equal(pick.path,'main');});
test('an on-ramp can rejoin the main highway and tracks both junctions',()=>{const h=branchHighway(straight(),{path:'main',segment:0,t:.2},[35,0,55],6,'loop'),b=h.branches[0];b.nodes[1].tangent=[0,0,12];b.nodes.push({point:[0,0,90],tangent:[0,0,10]});b.end={path:'main',segment:0,t:.9,direction:1};validateHighwayNetwork(h);h.nodes[1].point[2]=110;const p=highwayPaths(h)[1];near(p.nodes.at(-1).point[2],highwayCurve(h.nodes[0],h.nodes[1]).getPoint(.9).z);const g=buildPart(makePart('highway',{highway:h}));assert.ok(!/NaN|Infinity/.test(exportOBJ(g)));disposePart(g);});
test('invalid junction references and cycles are rejected; removing a branch removes dependent branches',()=>{const h=branchHighway(straight(),{path:'main',segment:0,t:.2},[35,0,55],6,'exit');const child=branchHighway(h,{path:'exit',segment:0,t:.6},[60,0,75],4,'child');assert.equal(removeHighwayBranch(child,'exit').branches.length,0);for(const ref of [{path:'missing',segment:0,t:.2,direction:1},{path:'exit',segment:0,t:.2,direction:1},{path:'main',segment:5,t:.2,direction:1},{path:'main',segment:0,t:2,direction:1}]){const bad=structuredClone(h);bad.branches[0].start=ref;assert.throws(()=>validateHighwayNetwork(bad));}});

test('diagonal T-junctions support different widths without a barrier across the incoming lane',()=>{const a=root(),length=Math.hypot(28,28),b=makePart('highway',{id:'b',position:[-28,0,22],rotation:[0,Math.PI/4,0],surface:{preset:'tile',scale:.5},highway:{...defaultHighway(),width:9,nodes:[{point:[0,0,0],tangent:[0,0,length/3]},{point:[0,0,length],tangent:[0,0,length/3]}]}}),meshes=build([a,b]);assert.equal(ray(meshes,[-15,.6,35],[Math.SQRT1_2,0,Math.SQRT1_2]).filter(h=>h.distance<21).length,0);assert.equal(ray(meshes,[-2.123,10,47.89],[0,-1,0]).filter(h=>Math.abs(h.point.y)<.001).length,1);for(const g of meshes)g.traverse(m=>{if(m.isMesh)for(const attr of Object.values(m.geometry.attributes))assert.ok(Array.from(attr.array).every(Number.isFinite));});meshes.forEach(disposePart);});
test('mirrored highway splits retain their continuous deck and open the reflected side',()=>{const h=branchHighway(straight(),{path:'main',segment:0,t:.2},[35,0,55],6,'exit'),p=mirrorPart(makePart('highway',{highway:h})),g=buildPart(p);g.updateMatrixWorld(true);for(const x of [-4,-5,-6,-7]){const hit=ray([g],[x,10,30],[0,-1,0]).find(h=>h.object.userData.highwayDeck);assert.ok(hit);near(hit.point.y,0);}assert.equal(ray([g],[-6.4,.6,30],[1,0,0]).filter(h=>h.distance<6.4).length,0);assert.ok(!/NaN|Infinity/.test(exportOBJ(g)));disposePart(g);});

test('a ramp point cannot descend inside the shared road and create a hidden elevation jump',()=>{const h=branchHighway(straight(),{path:'main',segment:0,t:.2},[35,0,55],6,'exit');h.branches[0].nodes[1].point=[2,-4,55];assert.throws(()=>validateHighwayNetwork(h),/clear of its parent/);});

test('overpass columns clear the full lower highway width regardless of part ordering or reflection',()=>{
 for(const mirrored of [false,true])for(const id of ['0-upper','z-upper']){
  const lower=makePart('highway',{id:'middle-lower',position:[0,3,0],highway:straight()});
  let upper=makePart('highway',{id,position:[-30,12,50],rotation:[0,Math.PI/2,0],highway:{...defaultHighway(),supports:true,width:8,nodes:[{point:[0,0,0],tangent:[0,0,20]},{point:[0,0,60],tangent:[0,0,20]}]}});
  if(mirrored)upper=mirrorPart(upper);
  const g=buildPart(upper,{parts:[lower,upper]});g.updateMatrixWorld(true);
  const columns=[];g.traverse(m=>{if(m.userData.highwaySupport)columns.push(new T.Box3().setFromObject(m));});
  assert.ok(columns.length>=2,'supports remain on either side of the crossing');
  for(const box of columns)assert.ok(box.max.x< -6.35||box.min.x>6.35,'full column clears the lower road and side margin');
  assert.equal(ray([g],[-5,4,50],[1,0,0]).filter(hit=>hit.object.userData.highwaySupport&&hit.distance<10).length,0);
  disposePart(g);
 }
});

test('finished interchange has no overpass columns penetrating the main road or its curved ramp',async()=>{
 const {highwayJunctionFixture}=await import('./fixtures/highway-junction-fixture.js');const parts=highwayJunctionFixture().parts,upper=parts.find(p=>p.id==='highway-overpass'),g=buildPart(upper,{parts});g.updateMatrixWorld(true);
 const columns=[];g.traverse(m=>{if(m.userData.highwaySupport)columns.push(new T.Box3().setFromObject(m));});
 assert.ok(columns.length>0);
 const lower=buildPart(parts[0],{parts});lower.updateMatrixWorld(true);
 lower.traverse(m=>{if(!m.isMesh||m.userData.highwaySupport)return;const geometry=m.geometry,index=geometry.index,pos=geometry.attributes.position,count=index?.count??pos.count;
  for(let i=0;i<count;i+=3){const vertices=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,index?index.getX(i+j):i+j).applyMatrix4(m.matrixWorld));const triangle=new T.Triangle(...vertices);
   for(const column of columns)assert.equal(column.intersectsTriangle(triangle),false,'overpass column intersects a lower road surface');
  }
 });
 disposePart(lower);disposePart(g);
});
