import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {meshSegments,weldSurface,insetShadow,surfaceSegment} from '../src/swbf2/swbf2-geometry.js';
import {closedShadow} from '../src/swbf2/swbf2-binary.js';
import {simplifySurface,simplifySegment} from '../src/parts/surface-simplify.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
const surface=g=>{const m=new T.Mesh(g,new T.MeshStandardMaterial());m.updateMatrixWorld();const s=meshSegments(m,new T.Matrix4(),()=>0);return {s,mesh:weldSurface(s)};};
test('tree collision precision takes priority over the requested face budget',()=>{
 const {mesh}=surface(new T.SphereGeometry(20,24,16)),before=JSON.stringify(mesh),coarse=simplifySurface(mesh,100),precise=simplifySurface(mesh,100,{maximumError:.05});
 assert.ok(precise.triangles.length>coarse.triangles.length);assert.doesNotThrow(()=>closedShadow(precise.positions,precise.triangles));assert.equal(JSON.stringify(mesh),before);
});
test('collision simplification retains a closed sphere and reduces its triangle cost',()=>{const {mesh}=surface(new T.SphereGeometry(3,32,16));const simple=simplifySurface(mesh,250);assert.ok(simple.triangles.length<=250);assert.doesNotThrow(()=>closedShadow(simple.positions,simple.triangles));assert.ok(simple.positions.every(p=>p.every(Number.isFinite)));});
test('simplification retains a torus hole and closed topology',()=>{const {mesh}=surface(new T.TorusGeometry(3,.4,12,32)),simple=simplifySurface(mesh,180);assert.ok(simple.triangles.length<=180);assert.doesNotThrow(()=>closedShadow(simple.positions,simple.triangles));assert.ok(simple.positions.every(p=>Math.hypot(p[0],p[1])>2.3));});
test('simplified shadow vertices are inset into the original faceted silhouette',()=>{
 const center=[76,84,40],{mesh}=surface(new T.SphereGeometry(2,24,12).translate(...center)),simple=simplifySurface(mesh,180),inflated={...simple,positions:simple.positions.map(p=>p.map((v,i)=>center[i]+(v-center[i])*1.08))},before=JSON.stringify(mesh),shadow=insetShadow(inflated,mesh);assert.ok(shadow);assert.equal(shadow.triangles.length,simple.triangles.length);assert.ok(shadow.positions.every(p=>p.every(v=>v===Math.fround(v))));assert.doesNotThrow(()=>closedShadow(shadow.positions,shadow.triangles));
 const segment=surfaceSegment(mesh),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(segment.positions.flat(),3));geometry.setIndex(segment.triangles.flat());const visible=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide})),ray=new T.Raycaster();visible.updateMatrixWorld();for(const p of shadow.positions){ray.set(new T.Vector3(...p),new T.Vector3(1,.173205,.271828).normalize());assert.equal(ray.intersectObject(visible).length%2,1,'shadow vertex must be inside the visible shell');}assert.equal(JSON.stringify(mesh),before);geometry.dispose();visible.material.dispose();
});
test('open boundaries and UV seams stay fixed while planar interiors can simplify',()=>{const {s,mesh}=surface(new T.PlaneGeometry(4,4,8,8)),simple=simplifySurface(mesh,70);assert.ok(simple.triangles.length<mesh.triangles.length);for(const p of mesh.positions.filter(p=>Math.abs(p[0])===2||Math.abs(p[1])===2))assert.ok(simple.positions.some(q=>q.every((v,i)=>Math.abs(v-p[i])<1e-6)));const low=simplifySegment(s[0],70);assert.equal(low.positions.length,low.uvs.length);assert.equal(low.positions.length,low.normals.length);assert.ok(low.uvs.every(p=>p.every(Number.isFinite)));});

test('thin swept spire triangles retain an inward closed shadow without flipping faces',()=>{
 for(const scale of [[1,1,1],[-2,3,.4]]){const part=makePart('cor-swept-spire',{scale}),root=buildPart(part);root.updateMatrixWorld(true);try{
  const source=weldSurface(meshSegments(root.children[0],new T.Matrix4(),()=>0)),before=JSON.stringify(source),shadow=insetShadow(source,source);assert.ok(shadow);assert.equal(JSON.stringify(source),before);assert.doesNotThrow(()=>closedShadow(shadow.positions,shadow.triangles));
  for(const t of source.triangles){const [a,b,c]=t.map(i=>new T.Vector3(...source.positions[i])),normal=b.sub(a).cross(c.sub(a)),[x,y,z]=t.map(i=>new T.Vector3(...shadow.positions[i]));assert.ok(normal.dot(y.sub(x).cross(z.sub(x)))>0);}
  const ray=new T.Raycaster();root.traverse(m=>{if(m.isMesh)m.material.side=T.DoubleSide;});for(const p of shadow.positions){ray.set(new T.Vector3(...p),new T.Vector3(1,.173205,.271828).normalize());assert.equal(ray.intersectObject(root,true).length%2,1,'inset remains inside the visible spire');}
  const output=createSWBF2Package({format:'open-building-studio',version:1,name:'Thin spire',parts:[part]},{aiNavigation:false});assert.ok(output.manifest.assets.some(a=>a.shadowTriangles>0));
 }finally{disposePart(root);}}
});
