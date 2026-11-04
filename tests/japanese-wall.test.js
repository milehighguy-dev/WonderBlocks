import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {japaneseOpenWallDefaults,japaneseWallProfile,JAPANESE_WALL} from '../src/parts/japanese-wall-profile.js';
import {materialTargets,editMaterial,readMaterial} from '../src/editor/material-editing.js';
import {assertClosedSurface,weldSurface} from '../src/collision/collision-geometry.js';
import {routeMeshPart} from '../src/routes/route-finishes.js';
import {meshSegments} from '../src/swbf2/swbf2-geometry.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {curvePoint} from '../src/routes/curved-route.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {applySurface} from '../src/materials/surfaces.js';

const wall=()=>{const p=makePart('wall-route');p.route.segments[0].run=8;p.route.segments[0].railing=japaneseOpenWallDefaults();return p;};
const project=p=>({format:'open-building-studio',version:1,name:'Japanese wall',parts:[p]});
const hits=(g,y,z,side=1)=>new T.Raycaster(new T.Vector3(side,y,z),new T.Vector3(-side,0,0),0,2).intersectObject(g,true);

test('Japanese wall builder matches the defensive gallery proportions and preserves real open bays and collision',()=>{
 const p=wall(),g=buildPart(p),stock=buildPart(makePart('jp-gallery-wall',{scale:[4,2,1]}));g.updateMatrixWorld(true);stock.updateMatrixWorld(true);
 try{
  const physical=createWalkCollision([g]),profile=japaneseWallProfile(2.4);assert.equal(profile.sill,.98);
  for(const z of [2,6])for(const side of [-1,1]){
   for(const y of [1.35,1.95]){assert.equal(hits(g,y,z,side).length,0);assert.equal(physical.containsPoint(new T.Vector3(0,y,z)),false);assert.equal(new T.Raycaster(new T.Vector3(z-4,y,side),new T.Vector3(0,0,-side),0,2).intersectObject(stock,true).length,0);}
   assert.ok(hits(g,.6,z,side).length);assert.ok(hits(g,2.35,z,side).length);
  }
  for(const z of [.08,4,7.92]){assert.ok(hits(g,1.5,z).length);assert.equal(physical.containsPoint(new T.Vector3(0,1.5,z)),true);}
  assert.equal(g.children.filter(m=>m.userData.routePost).length,3);assert.ok(g.children.every(m=>!m.userData.routeFloor));
  assert.ok(g.userData.collision.bodies.every(b=>b.primitive),'straight parapet, beam and posts use primitive collision');
 }finally{disposePart(g);disposePart(stock);}
});

test('Japanese walls bend without adding a post at each curve panel and share posts at corner joins',()=>{
 const p=wall(),s=p.route.segments[0];s.curveAngle=Math.PI/2;const curved=buildPart(p);curved.updateMatrixWorld(true);
 try{
  assert.equal(curved.children.filter(m=>m.userData.routePost).length,3);assert.ok(curved.children.every(m=>[...m.geometry.attributes.position.array].every(Number.isFinite)));
  for(const z of [2,6]){const pt=new T.Vector3(...curvePoint(0,1.5,z,8,Math.PI/2)),angle=z*Math.PI/16,normal=new T.Vector3(Math.cos(angle),0,-Math.sin(angle));assert.equal(new T.Raycaster(pt.clone().add(normal),normal.negate(),0,2).intersectObject(curved,true).length,0);}
 }finally{disposePart(curved);}
 delete s.curveAngle;s.run=4;p.route.segments.push({...structuredClone(s),pathStart:{point:[0,0,4],heading:Math.PI/2}});const corner=buildPart(p);
 try{assert.equal(corner.children.filter(m=>m.userData.routePost).length,3);assert.doesNotThrow(()=>validateProject(project(p)));}finally{disposePart(corner);}
});

test('plaster, timber posts and top beam paint independently and survive a project roundtrip',()=>{
 const p=wall();assert.equal(readMaterial(p,'posts').color,JAPANESE_WALL.timber);assert.equal(readMaterial(p,'rails').color,JAPANESE_WALL.timber);assert.equal(readMaterial(p,'walls').color,JAPANESE_WALL.plaster);
 assert.deepEqual(materialTargets(p).map(([key])=>key),['all','walls','posts','rails']);
 for(const [key,color] of [['walls','#112233'],['posts','#445566'],['rails','#778899']])assert.ok(editMaterial(p,key,{color}));
 const saved=validateProject(JSON.parse(JSON.stringify(project(p)))).parts[0],g=buildPart(saved);
 try{for(const mesh of g.children)assert.equal(mesh.material.color.getHexString(),mesh.userData.wallLayer==='wall'?'112233':mesh.userData.routePost?'445566':'778899');}finally{disposePart(g);}
 const route=makePart('stair-route');route.route.segments[0].railing=japaneseOpenWallDefaults();assert.throws(()=>validateProject(project(route)),/standalone wall/);
});

test('SWBF export retains open Japanese wall bays rather than filling them with a bulk collision box',()=>{
 const result=createSWBF2Package(project(wall()),{output:'object',shadows:false,lowDetail:false});assert.ok(result.manifest.asset);assert.ok(result.manifest.assets.every(a=>a.collisionBodies.every(b=>b.mask===23)));
 assert.equal(result.manifest.assets[0].primitiveCollision,5);
});


test('roofed defensive wall adds a closed tile cap above the lintel while preserving the open bays',()=>{
 const p=wall();p.route.segments[0].railing.style='japanese-roofed';const g=buildPart(p);g.updateMatrixWorld(true);
 try{
  const roofs=g.children.filter(m=>routeMeshPart(m)==='roof');assert.equal(roofs.length,1);assert.ok(roofs[0].material.map);assert.equal(roofs[0].material.color.getHexString(),'61958b');
  for(const z of [2,6]){assert.equal(hits(g,1.5,z).length,0);assert.ok(new T.Raycaster(new T.Vector3(.3,4,z),new T.Vector3(0,-1,0),0,4).intersectObject(g,true).length);}
  const bounds=new T.Box3().setFromObject(roofs[0]);assert.ok(bounds.min.y>=2.4-1e-5);assert.ok(bounds.min.x<-.4&&bounds.max.x>.4);assert.ok(bounds.max.y>2.65);
  assert.doesNotThrow(()=>assertClosedSurface(weldSurface(meshSegments(roofs[0],new T.Matrix4(),()=>0))));
  assert.equal(createWalkCollision([g]).containsPoint(new T.Vector3(0,1.5,2)),false);
 }finally{disposePart(g);}
});

test('roof caps follow curves and meet on the same mitred cross section at corners',()=>{
 for(const curved of [false,true]){
  const p=wall(),s=p.route.segments[0];s.railing.style='japanese-roofed';if(curved)s.curveAngle=Math.PI/2;else{ s.run=4;p.route.segments.push({...structuredClone(s),pathStart:{point:[0,0,4],heading:Math.PI/2}});}
  const g=buildPart(p);g.updateMatrixWorld(true);
  try{
   const roofs=g.children.filter(m=>routeMeshPart(m)==='roof');assert.ok(roofs.length>1);
   for(const mesh of roofs)assert.doesNotThrow(()=>assertClosedSurface(weldSurface(meshSegments(mesh,new T.Matrix4(),()=>0))));
   const vertices=mesh=>new Set(Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).toArray().map(v=>v.toFixed(5)).join(','))),a=vertices(roofs[0]),b=vertices(roofs[1]);
   assert.equal([...a].filter(v=>b.has(v)).length,11,'adjoining caps share the complete roof ring');
  }finally{disposePart(g);}
 }
});

test('roof material paints independently, saves, reloads and exports separately from plaster and timber',()=>{
 const p=wall();p.route.segments[0].railing.style='japanese-roofed';assert.ok(materialTargets(p).some(([key,label])=>key==='roof'&&label==='Roof'));
 assert.equal(readMaterial(p,'roof').preset,'roof-tiles');assert.equal(readMaterial(p,'roof').color,JAPANESE_WALL.roof);
 assert.ok(editMaterial(p,'roof',{color:'#4455aa',preset:'metal',scale:2}));const saved=validateProject(JSON.parse(JSON.stringify(project(p)))).parts[0],g=buildPart(saved);g.updateMatrixWorld(true);
 try{for(const mesh of g.children){const key=routeMeshPart(mesh);if(key==='roof'){assert.equal(mesh.material.color.getHexString(),'4455aa');assert.ok(mesh.material.map);}else assert.equal(mesh.material.color.getHexString(),key==='walls'?'eee9d8':'403e35');}}finally{disposePart(g);}
 assert.equal(readMaterial(saved,'roof').preset,'metal');const output=createSWBF2Package(project(saved),{output:'object'});assert.ok(output.manifest.asset);assert.ok(output.manifest.assets.some(a=>a.shadowTriangles>0));assert.ok([...output.files.keys()].some(n=>n.endsWith('.tga')));
 const route=makePart('stair-route');route.route.segments[0].railing={...japaneseOpenWallDefaults(),style:'japanese-roofed'};assert.throws(()=>validateProject(project(route)),/standalone wall/);
});

test('roof tiles unwrap along rotated walls and down their slopes, including painted and exported finishes',()=>{
 const p=wall();p.rotation[1]=.43;p.scale=[1.7,1.2,.8];const s=p.route.segments[0];s.railing.style='japanese-roofed';s.pathStart={point:[2,0,3],heading:.71};
 const g=buildPart(p);g.updateMatrixWorld(true);
 try{
  const roof=g.children.find(m=>routeMeshPart(m)==='roof'),pos=roof.geometry.attributes.position,uv=roof.geometry.attributes.uv,world=i=>new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(roof.matrixWorld),tangent=world(7).sub(world(6)).normalize();
  // The first roof strip begins at the eave; its ridgeward vertices have
  // the same longitudinal coordinate, regardless of the wall's heading.
  for(let strip=1;strip<=8;strip++){
   const i=strip*6;assert.ok(Math.abs(uv.getX(i)-uv.getX(i+5))<1e-5);assert.ok(Math.abs(uv.getX(i+1)-uv.getX(i+2))<1e-5);
   assert.ok(Math.abs(uv.getX(i+1)-uv.getX(i)-world(i+1).sub(world(i)).dot(tangent))<1e-5);
   assert.ok(Math.abs(Math.abs(uv.getY(i+2)-uv.getY(i+1))-world(i+2).distanceTo(world(i+1)))<1e-5);
  }
  for(let i=0;i<uv.count;i+=3){const area=(uv.getX(i+1)-uv.getX(i))*(uv.getY(i+2)-uv.getY(i))-(uv.getY(i+1)-uv.getY(i))*(uv.getX(i+2)-uv.getX(i));assert.ok(Math.abs(area)>1e-7,'roof, underside and end caps all have usable UV area');}
  const before=Array.from(uv.array);applySurface(g,roof.material,{...p,surface:{preset:'wood',scale:2}});const painted=roof.geometry.attributes.uv;
  for(let i=0;i<before.length;i++)assert.ok(Math.abs(painted.array[i]-before[i]*2)<1e-5,'painting retains the unwrap and changes only density');
  const expected=new Set(Array.from({length:painted.count},(_,i)=>[painted.getX(i),painted.getY(i)].join(','))),exported=meshSegments(roof,new T.Matrix4(),()=>0,{uvTransform:(_m,u,v)=>[u,v]});
  for(const segment of exported)for(const uv of segment.uvs)assert.ok(expected.has(uv.join(',')),'model export preserves the aligned UVs');
 }finally{disposePart(g);}
});

test('curved tile courses remain continuous at every clockwise and counterclockwise panel',()=>{
 for(const angle of [Math.PI/2,-Math.PI/2]){
  const p=wall(),s=p.route.segments[0];s.railing.style='japanese-roofed';s.curveAngle=angle;
  const g=buildPart(p);
  try{
   const roofs=g.children.filter(m=>routeMeshPart(m)==='roof'),ring=(mesh,end)=>{const pos=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,result=new Set();for(let strip=1;strip<=8;strip++)for(const j of end?[1,2]:[0,5]){const i=strip*6+j;result.add([pos.getX(i),pos.getY(i),pos.getZ(i),uv.getX(i),uv.getY(i)].map(n=>n.toFixed(5)).join(','));}return result;};
   for(let i=1;i<roofs.length;i++)assert.deepEqual(ring(roofs[i-1],true),ring(roofs[i],false),'joined slopes share position and tile phase');
  }finally{disposePart(g);}
 }
});

test('mitred roof ends do not shear tile rows across straight wall runs',()=>{
 for(const angle of [Math.PI/2,-Math.PI/2,Math.PI/3]){
  const p=wall(),s=p.route.segments[0];s.railing.style='japanese-roofed';s.run=4;p.route.segments.push({...structuredClone(s),pathStart:{point:[0,0,4],heading:angle}});
  const g=buildPart(p);
  try{
   const roofs=g.children.filter(m=>routeMeshPart(m)==='roof');
   for(const [index,roof] of roofs.entries()){
    const pos=roof.geometry.attributes.position,uv=roof.geometry.attributes.uv,tangent=new T.Vector3(Math.sin(index?angle:0),0,Math.cos(index?angle:0)),point=i=>new T.Vector3().fromBufferAttribute(pos,i),reference=point(6),u=uv.getX(6);
    for(let i=6;i<54;i++)assert.ok(Math.abs(uv.getX(i)-u-point(i).sub(reference).dot(tangent))<1e-5,'tile channels must remain perpendicular to the ridge, even beside a diagonal end');
   }
  }finally{disposePart(g);}
 }
});
