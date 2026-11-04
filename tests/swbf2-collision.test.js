import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {defaultHighway} from '../src/highways/highway.js';
import {defaultInterior} from '../src/interiors/interior.js';
import {storeysFixture} from './fixtures/storeys-fixture.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {planSWBF2,createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {closedShadow} from '../src/swbf2/swbf2-binary.js';
import {prismVolume,boxVolume,invalidateStructuralVolume,transformStructuralVolume} from '../src/collision/structural-volumes.js';
import {meshSegments,fitBox,fitSphere,fitDetailBox,insetSurface,weldSurface,structuralSegments,collisionNeedsPreservation,modelToSWBF,boxContainment} from '../src/swbf2/swbf2-geometry.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {buildKotorRails} from '../src/routes/kotor-kashyyyk.js';
import {buildEntrances} from '../src/interiors/entrances.js';
import {addFloraAsset} from '../src/flora/flora.js';
const project=parts=>({format:'open-building-studio',version:1,name:'Collision checks',parts});
const segments=geometry=>{const m=new T.Mesh(geometry,new T.MeshStandardMaterial());m.updateMatrixWorld();return meshSegments(m,new T.Matrix4(),()=>0);};
const signedVolume=surface=>surface.triangles.reduce((sum,t)=>{const [a,b,c]=t.map(v=>new T.Vector3(...surface.positions[v]));return sum+a.dot(b.cross(c))/6;},0);

test('model and world coordinate conventions preserve rotated mesh, primitive and hardpoint placement',()=>{
 const worldRotation=new T.Quaternion().setFromEuler(new T.Euler(.3,.7,-.2)),worldPosition=new T.Vector3(7,4,-9),world=new T.Matrix4().compose(worldPosition,worldRotation,new T.Vector3(1,1,1)),localRotation=new T.Quaternion().setFromEuler(new T.Euler(.1,-.5,.4)),localPosition=new T.Vector3(2,1,3),local=new T.Matrix4().compose(localPosition,localRotation,new T.Vector3(1,1,1)),primitive=fitBox(segments(new T.BoxGeometry(2,1,3))),surface=weldSurface(segments(new T.BoxGeometry(2,1,3))),model={name:'visible',position:localPosition.toArray(),rotation:localRotation.toArray(),segments:segments(new T.BoxGeometry(2,1,3)),primitive,shadow:closedShadow(surface.positions,surface.triangles)},before=JSON.stringify(model),converted=modelToSWBF(model);
 // Native WorldMunge's quaternion mapping: source (w,x,y,z) -> (-z,w,-x,y).
 const nativeRotation=new T.Quaternion(-worldRotation.z,worldRotation.w,-worldRotation.x,worldRotation.y),nativeWorld=new T.Matrix4().compose(new T.Vector3(worldPosition.x,worldPosition.y,-worldPosition.z),nativeRotation,new T.Vector3(1,1,1)),nativeLocal=new T.Matrix4().compose(new T.Vector3(...converted.position),new T.Quaternion(...converted.rotation),new T.Vector3(1,1,1));
 for(let i=0;i<model.segments[0].positions.length;i++){const expected=new T.Vector3(...model.segments[0].positions[i]).applyMatrix4(local).applyMatrix4(world);expected.z*=-1;const actual=new T.Vector3(...converted.segments[0].positions[i]).applyMatrix4(nativeLocal).applyMatrix4(nativeWorld);assert.ok(actual.distanceTo(expected)<1e-10);}
 for(const t of converted.segments[0].triangles){const [a,b,c]=t.map(i=>new T.Vector3(...converted.segments[0].positions[i])),n=b.sub(a).cross(c.sub(a)).normalize();assert.ok(n.dot(new T.Vector3(...converted.segments[0].normals[t[0]]))>.999);}
 assert.deepEqual(converted.primitive.dimensions,primitive.dimensions);assert.deepEqual(converted.primitive.position,[-primitive.position[0],primitive.position[1],primitive.position[2]]);assert.doesNotThrow(()=>closedShadow(converted.shadow.positions,Array.from({length:converted.shadow.edges.length/3},(_,i)=>[0,1,2].map(j=>converted.shadow.edges[i*3+j][0]))));assert.equal(JSON.stringify(model),before);
});

test('subdivided rectangular faces use boxes, while a planar opening stays open',()=>{const rectangle=segments(new T.PlaneGeometry(6,4,8,8));assert.ok(fitBox(rectangle));const box=segments(new T.BoxGeometry(2,3,4,4,5,6));assert.ok(fitBox(box));const shape=new T.Shape([new T.Vector2(-3,-2),new T.Vector2(3,-2),new T.Vector2(3,2),new T.Vector2(-3,2)]);shape.holes.push(new T.Path([new T.Vector2(-1,-1),new T.Vector2(-1,1),new T.Vector2(1,1),new T.Vector2(1,-1)]));assert.equal(fitBox(segments(new T.ShapeGeometry(shape))),null);});

test('concave faces and floor openings request native collision face preservation',()=>{
 assert.equal(collisionNeedsPreservation(weldSurface(segments(new T.BoxGeometry(4,2,3)))),false);
 assert.equal(collisionNeedsPreservation(weldSurface(segments(new T.PlaneGeometry(4,3,8,8)))),false);
 const l=prismVolume([{x:0,z:0},{x:3,z:0},{x:3,z:1},{x:1,z:1},{x:1,z:3},{x:0,z:3}],0,.2);assert.equal(collisionNeedsPreservation(l),true);
 const shape=new T.Shape([new T.Vector2(-3,-2),new T.Vector2(3,-2),new T.Vector2(3,2),new T.Vector2(-3,2)]);shape.holes.push(new T.Path([new T.Vector2(-1,-1),new T.Vector2(-1,1),new T.Vector2(1,1),new T.Vector2(1,-1)]));assert.equal(collisionNeedsPreservation(weldSurface(segments(new T.ShapeGeometry(shape)))),true);
 const output=createSWBF2Package(storeysFixture()),protectedAssets=output.manifest.assets.filter(a=>a.collisionFacesPreserved);assert.ok(protectedAssets.some(a=>a.role==='exterior'));for(const a of protectedAssets)assert.match(output.files.get('msh/'+a.name+'.msh.option'),/-donotmergecollision/);
});

test('sphere primitives stay inside the faceted surface and cannot fill a torus',()=>{const sphere=segments(new T.SphereGeometry(2,16,8)),primitive=fitSphere(sphere);assert.equal(primitive.shape,0);assert.ok(primitive.dimensions[0]<2&&primitive.dimensions[0]>1.8);assert.equal(fitSphere(segments(new T.TorusGeometry(2,.3,8,16))),null);assert.equal(fitSphere(segments(new T.PlaneGeometry(2,2))),null);});

test('primitive containment checks faces and edges, including holes between inside corners',()=>{
 const contains=boxContainment(weldSurface(segments(new T.TorusGeometry(3,1,16,64))));
 assert.equal(contains({position:[0,3,0],rotation:[0,0,0,1],dimensions:[.2,.2,.2]}),true);
 assert.equal(contains({position:[0,0,0],rotation:[0,0,0,1],dimensions:[.2,.2,.2]}),false);
 // All eight corners are in the ring, but the middle of the lower edge
 // crosses the hole. A corner-only test would accept this solid blocker.
 assert.equal(contains({position:[0,2.7,0],rotation:[0,0,0,1],dimensions:[1.5,.8,.05]}),false);
});

test('curved tapered trees use their bark surface without redundant bulk primitives',()=>{
 const part=makePart('flora'),branch=addFloraAsset(part.flora,part.flora.branches[0].id,'flora-basic-branch');branch.points=[[0,0,0],[.5,2,0],[-1,4,.2],[1.5,6,0],[0,8,0]];branch.radii=[1,.5,.7,.35,.06];
 const plan=planSWBF2(project([part])),asset=plan.assets.find(a=>a.preciseTreeCollision),group=buildPart(plan.project.parts[0]),bark=[];group.updateMatrixWorld(true);
 try{group.traverse(m=>{if(m.isMesh&&m.userData.floraComponent==='bark')bark.push(...meshSegments(m,asset.inverse,()=>0));});assert.equal(asset.primitives.length,0);const collision=weldSurface(asset.fallback),visible=weldSurface(bark),distance=(point,surface)=>{const query=new T.Vector3(...point),closest=new T.Vector3();return Math.min(...surface.triangles.map(t=>new T.Triangle(...t.map(v=>new T.Vector3(...surface.positions[v]))).closestPointToPoint(query,closest).distanceTo(query)));};for(const [source,target] of [[visible,collision],[collision,visible]]){for(const point of source.positions)assert.ok(distance(point,target)<=.050001);for(const t of source.triangles){const center=t.reduce((p,v)=>p.add(new T.Vector3(...source.positions[v])),new T.Vector3()).divideScalar(3);assert.ok(distance(center.toArray(),target)<=.050001);}}assert.ok(signedVolume(collision)>0);}finally{disposePart(group);}
});

test('native railing collision helpers are closed, with conservative boxes inside their profiles',()=>{
 const group=new T.Group();buildKotorRails(group,[[new T.Vector3(0,0,0),new T.Vector3(0,1,9)]]);group.updateMatrixWorld(true);
 const profiles=group.children.filter(m=>m.userData.structuralVolume);assert.ok(profiles.length);
 for(const mesh of profiles){const s=structuralSegments(mesh,new T.Matrix4()),surface=weldSurface(s);assert.doesNotThrow(()=>closedShadow(surface.positions,surface.triangles));const box=fitDetailBox(s);assert.ok(box,mesh.userData.routePost?'post':'rail');const transform=new T.Matrix4().compose(new T.Vector3(...box.position),new T.Quaternion(...box.rotation),new T.Vector3(1,1,1));
  for(const t of surface.triangles){const [a,b,c]=t.map(v=>new T.Vector3(...surface.positions[v])),normal=b.sub(a).cross(c.sub(a)).normalize();for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const corner=new T.Vector3(x*box.dimensions[0],y*box.dimensions[1],z*box.dimensions[2]).applyMatrix4(transform);assert.ok(normal.dot(corner.sub(a))<=1e-6);}}
 }
 assert.equal(fitDetailBox(segments(new T.TorusGeometry(2,.3,8,16))),null);
});

test('stretched and mirrored trees retain the exact transformed bark collision surface',()=>{
 for(const scale of [[3,1,.2],[-3,1,.2]]){const part=makePart('flora',{position:[5,2,-3],rotation:[.2,.3,.1],scale}),branch=addFloraAsset(part.flora,part.flora.branches[0].id,'flora-basic-branch');branch.points=[[0,0,0],[0,4,0],[0,8,0]];branch.radii=[1,1,1];const plan=planSWBF2(project([part])),asset=plan.assets.find(a=>a.preciseTreeCollision),surface=weldSurface(asset.fallback);
  assert.equal(asset.primitives.length,0);const visible=weldSurface(asset.segments);assert.deepEqual(surface.triangles,visible.triangles);assert.equal(surface.positions.length,visible.positions.length);for(let i=0;i<surface.positions.length;i++)assert.ok(new T.Vector3(...surface.positions[i]).distanceTo(new T.Vector3(...visible.positions[i]))<1e-10);assert.ok(surface.triangles.length);assert.ok(signedVolume(surface)>0,'mirrored surface still has outward winding');
 }
});

test('grouped trees export independently while structural members retain their primitives',()=>{
 const tree=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree')),block=makePart('block',{position:[4,0,0]});tree.assemblyId=block.assemblyId='mixed';const plan=planSWBF2(project([tree,block])),asset=plan.assets.find(a=>a.preciseTreeCollision);
 assert.equal(asset.primitives.length,0);assert.ok(asset.fallback.length);const structure=plan.assets.find(a=>a.partIds.includes(block.id));assert.notEqual(structure,asset);assert.equal(structure.primitives.length,1);assert.ok(!asset.primitives.some(p=>p.source==='tree limb'));
});

test('construction volumes are closed with outward faces and their actual thickness',()=>{for(const v of [boxVolume(3,.2,4),prismVolume([{x:0,z:0},{x:3,z:0},{x:0,z:2}],0,1)]){assert.doesNotThrow(()=>closedShadow(v.positions,v.triangles));assert.ok(signedVolume(v)>0);}assert.ok(Math.abs(signedVolume(boxVolume(3,.2,4))-2.4)<1e-8);const interior=defaultInterior(),plan=planSWBF2(project([makePart('interior',{interior})]));const floors=plan.assets.filter(a=>a.role==='interior').flatMap(a=>a.primitives).filter(p=>Math.abs(p.dimensions[1]-.1)<1e-6||Math.abs(p.dimensions[2]-.1)<1e-6);assert.ok(floors.length);});

test('window cuts retain distant floor thickness but invalidate a construction volume they enter',()=>{
 const mesh=new T.Mesh();mesh.userData.structuralVolume=boxVolume(4,.2,4,[0,-.1,0]);transformStructuralVolume(mesh,new T.Matrix4().makeTranslation(5,3,0));const original=mesh.userData.structuralVolume;
 invalidateStructuralVolume(mesh,new T.Matrix4(),{bounds:[3,7,4,5,-2,2]});assert.equal(mesh.userData.structuralVolume,original);
 invalidateStructuralVolume(mesh,new T.Matrix4(),{bounds:[4,6,2.8,3.2,-1,1]});assert.equal(mesh.userData.structuralVolume,undefined);
});

test('render-only shadow hints follow transforms and are invalidated independently by cuts',()=>{
 const mesh=new T.Mesh();mesh.userData.structuralVolume=boxVolume(4,.2,4,[0,-.1,0]);mesh.userData.shadowVolume=boxVolume(4,2,4,[0,1,0]);transformStructuralVolume(mesh,new T.Matrix4().makeTranslation(5,3,0));const original=mesh.userData.structuralVolume;
 invalidateStructuralVolume(mesh,new T.Matrix4(),{bounds:[4,6,4,4.5,-1,1]});assert.equal(mesh.userData.structuralVolume,original);assert.equal(mesh.userData.shadowVolume,undefined);
 mesh.userData.shadowVolume=boxVolume(4,1,4);invalidateStructuralVolume(mesh,new T.Matrix4());assert.equal(mesh.userData.structuralVolume,undefined);assert.equal(mesh.userData.shadowVolume,undefined);
});

test('building entrance cuts discard uncut construction and shadow hints',()=>{
 const part=makePart('block'),group=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(6,5,4),new T.MeshStandardMaterial());mesh.position.y=2.5;mesh.userData.structuralVolume=boxVolume(6,5,4);mesh.userData.shadowVolume=boxVolume(6,5,4);group.add(mesh);part.entrances=[{id:'door',anchor:[0,0,2],yaw:0,width:2,height:3,landingWidth:3,depth:1}];
 try{buildEntrances(group,part);assert.equal(mesh.userData.structuralVolume,undefined);assert.equal(mesh.userData.shadowVolume,undefined);assert.ok(mesh.geometry.attributes.position.count>0);}finally{disposePart(group);}
});

test('shadow inset moves a torus into its solid body without narrowing the hole',()=>{const surface=weldSurface(segments(new T.TorusGeometry(3,.5,8,16))),inset=insetSurface(surface);assert.doesNotThrow(()=>closedShadow(inset.positions,inset.triangles));for(let i=0;i<surface.positions.length;i++){const p=surface.positions[i],q=inset.positions[i],r=Math.hypot(p[0],p[1]);if(r<2.6)assert.ok(Math.hypot(q[0],q[1])>r);if(r>3.4)assert.ok(Math.hypot(q[0],q[1])<r);}});

test('long highways split at original control spans and retain closed deck volumes',()=>{const highway=defaultHighway();highway.nodes=Array.from({length:15},(_,i)=>({point:[0,0,i*15],tangent:[0,0,5]}));highway.barrierHeight=0;const part=makePart('highway',{highway,position:[10,8,-4],rotation:[0,.4,0]}),plan=planSWBF2(project([part]));assert.deepEqual(plan.assets.map(a=>a.routeIndices),[Array.from({length:6},(_,i)=>i),Array.from({length:6},(_,i)=>i+6),[12,13]]);for(const a of plan.assets){assert.deepEqual(a.pivot,part.position);const surface=weldSurface(a.segments);assert.doesNotThrow(()=>closedShadow(surface.positions,surface.triangles));}assert.ok(Math.abs(plan.assets.reduce((n,a)=>n+signedVolume(weldSurface(a.segments)),0)-12*.5*210)<1e-5);});


test('interior stair collision uses the ramp and retains the upper-floor stairwell',()=>{const plan=planSWBF2(storeysFixture()),stairs=plan.assets.find(a=>a.key.includes('|stair:'));assert.ok(stairs);const profiles=stairs.fallback.filter(s=>s.positions.length>4);assert.ok(profiles.length);for(const s of profiles){const heights=new Set(s.positions.map(p=>Number(p[1].toFixed(5))));assert.ok(heights.size<=4,'ramp has only endpoint top and bottom heights');}const output=createSWBF2Package(storeysFixture());assert.ok(output.manifest.assets.some(a=>a.role==='interior'&&a.shadowTriangles>0));});

test('native leaf-only objects have useful world bounds and no authored collision',()=>{const tree=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree'));tree.flora.branches=[{...tree.flora.branches[0],anchor:true}];tree.flora.organs=tree.flora.organs.filter(o=>o.billboard);for(const o of tree.flora.organs){o.branch=tree.flora.branches[0].id;for(const key of ['parentOrgan','branchSurface','pin','socket'])delete o[key];}const output=createSWBF2Package(project([tree])),asset=output.manifest.assets[0];assert.ok(asset.nativeLeafPatches>0);assert.ok(asset.nativeLeafTriangles>0);assert.equal(asset.primitiveCollision,0);assert.equal(asset.ordnanceCollision,false);assert.equal(output.files.get('msh/'+asset.name+'.msh.option'),'-nocollision\n');assert.ok(output.manifest.worldBounds.max.some((v,i)=>v-output.manifest.worldBounds.min[i]>1));});

test('asset identities survive part reordering and collision limits create separate helpers',()=>{const parts=Array.from({length:70},(_,i)=>makePart('block',{position:[i*2,0,0]}));parts.forEach(p=>p.assemblyId='large-assembly');const output=createSWBF2Package(project(parts));assert.ok(output.manifest.assets.filter(a=>a.role==='collision').length);assert.ok(output.manifest.assets.every(a=>a.primitiveCollision<=64));const small=parts.slice(0,3).map(p=>{const q=structuredClone(p);delete q.assemblyId;return q;}),first=planSWBF2(project(small)),second=planSWBF2(project([...small].reverse()));assert.deepEqual(first.assets.map(a=>a.name).sort(),second.assets.map(a=>a.name).sort());});
