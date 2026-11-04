import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {CURLED_FERN as fern,curledFernMesh} from '../src/flora/curled-fern.js';
import {floraAsset,floraPaletteCategory,floraPlacementCategory,floraIconUrl,createFloraPalette} from '../src/flora/flora-palette.js';
import {addFloraAsset,defaultFlora,floraSockets,floraOrganMatrix,floraDeformPositions,updateFloraPreview,validateFlora} from '../src/flora/flora.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {testStem} from './flora-fixtures.js';

test('curled fern is a searchable Flora surface piece with a continuous closed spiral',()=>{
 assert.equal(floraAsset(fern.id).id,fern.id);assert.equal(floraPaletteCategory(fern),'Flora');assert.equal(floraPlacementCategory(fern),'Surface parts');assert.deepEqual(floraSockets(fern.id),[]);assert.ok(fs.existsSync(new URL(floraIconUrl(fern))));assert.ok(fern.triangles<=1280);
 const m=fern.meshes[0],edges=new Map(),p=i=>new T.Vector3().fromArray(m.positions,i*3);let volume=0;
 assert.ok(m.positions.every(Number.isFinite));assert.ok(m.uv.every(Number.isFinite));assert.equal(m.uv.length,m.positions.length/3*2);
 for(let i=0;i<m.indices.length;i+=3){const ids=m.indices.slice(i,i+3),[a,b,c]=ids.map(p);assert.ok(ids.every(i=>Number.isInteger(i)&&i>=0&&i<m.positions.length/3));assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).length()>1e-10);volume+=a.dot(b.clone().cross(c))/6;for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=[a,b].sort((a,b)=>a-b).join(':');const e=edges.get(key)||{count:0,direction:0};e.count++;e.direction+=a<b?1:-1;edges.set(key,e);}}
 assert.ok([...edges.values()].every(e=>e.count===2&&e.direction===0),'stalk and folded leaflets have no open or inverted edges');assert.ok(volume>0);
 const bounds=new T.Box3().setFromArray(m.positions),size=bounds.getSize(new T.Vector3());assert.ok(size.y>.9&&size.y<1.2);assert.ok(size.x>.4&&size.x<.6);assert.ok(size.z<.18);
 const tubeRings=51,centers=Array.from({length:tubeRings},(_,i)=>Array.from({length:6},(_,j)=>p(i*6+j)).reduce((a,b)=>a.add(b),new T.Vector3()).divideScalar(6));
 assert.ok(centers[0].length()<1e-8,'mount sits at the stalk base');let turns=0;for(let i=10;i<tubeRings;i++){const a=centers[i-1],b=centers[i];let d=Math.atan2(b.y-.78,b.x+.08)-Math.atan2(a.y-.78,a.x+.08);d=Math.atan2(Math.sin(d),Math.cos(d));turns+=d;}assert.ok(turns>Math.PI*2&&turns<Math.PI*3,'maximum curl wraps one broad crozier around the folded head');
 assert.ok(Math.hypot(centers.at(-1).x+.08,centers.at(-1).y-.78)<.025,'tip closes into the centre of the coil');
 const old=globalThis.document;class El{constructor(tag){this.tag=tag;this.children=[];this.attrs={};}append(...e){this.children.push(...e);}replaceChildren(...e){this.children=e;}setAttribute(k,v){this.attrs[k]=v;}}
 globalThis.document={createElement:tag=>new El(tag)};try{const palette=createFloraPalette(()=>{}),all=e=>[e,...e.children.flatMap(all)];all(palette).find(e=>e.tag==='button'&&e.textContent==='Flora').onclick();const search=all(palette).find(e=>e.tag==='input');search.value='curled fern';search.oninput();assert.deepEqual(all(palette).filter(e=>e.attrs['data-flora-part']).map(e=>e.attrs['data-flora-part']),[fern.id]);}finally{globalThis.document=old;}
});

test('fern keeps its spiral and texture when attached, edited, finished and saved',()=>{
 const f=testStem(),branch=f.branches[0],o=addFloraAsset(f,branch.id,fern.id,.7),part=makePart('flora',{flora:f}),before=floraOrganMatrix(f,o),group=buildPart(part,{floraEditing:true,floraLive:true});
 try{const surface=group.children.find(g=>g.userData.floraOrgan===o.id),m=surface.children[0];assert.equal(m.material.map,fern.textureMap());assert.equal(m.material.alphaMap,null);assert.equal(m.material.userData.walkCollision,false);assert.equal(m.userData.floraBillboard,undefined);assert.ok(Array.from(m.geometry.attributes.normal.array).every(Number.isFinite));assert.deepEqual([...m.geometry.attributes.position.array],Array.from(Float32Array.from(fern.meshes[0].positions)));
 branch.points[1][0]+=.5;validateFlora(f);updateFloraPreview(group,f,branch.id);assert.ok(!floraOrganMatrix(f,o).equals(before));assert.ok(surface.matrix.equals(floraOrganMatrix(f,o)));
 const saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Fiddlehead',parts:[part]})));assert.deepEqual(saved.parts[0].flora,f);const finished=buildPart(saved.parts[0]);try{let organ;finished.traverse(mesh=>{if(mesh.isMesh&&mesh.material.map===fern.textureMap())organ=mesh;});assert.ok(organ);const expected=m.geometry.clone().applyMatrix4(floraOrganMatrix(f,o));try{assert.deepEqual([...organ.geometry.attributes.position.array],[...expected.attributes.position.array]);assert.deepEqual([...organ.geometry.index.array],[...m.geometry.index.array]);assert.deepEqual([...organ.geometry.attributes.uv.array],[...m.geometry.attributes.uv.array]);}finally{expected.dispose();}}finally{disposePart(finished);}
 }finally{disposePart(group);}
});

test('a standalone fern exports as one textured plant without wood collision',()=>{
 const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,fern.id);o.morphs={curl:.2,budding:.8};const output=createSWBF2Package({format:'open-building-studio',version:1,name:'Fern',parts:[makePart('flora',{flora:f})]},{aiNavigation:false}),details=output.manifest.assets.filter(a=>a.role!=='collision');
 assert.equal(details.length,1);assert.equal(details[0].triangles,fern.triangles);assert.ok(!output.manifest.assets.some(a=>a.role==='collision'));assert.ok([...output.files.keys()].some(name=>name.endsWith('.tga')));
 const source=[...output.files].find(([name])=>name.endsWith('.building.json'));assert.deepEqual(JSON.parse(source[1]).parts[0].flora.organs[0].morphs,o.morphs);
});

test('curl unrolls by angle, keeping stalk length, fixed roots and closed attached buds at every setting',()=>{
 const centers=m=>Array.from({length:51},(_,i)=>Array.from({length:6},(_,j)=>new T.Vector3().fromArray(m.positions,(i*6+j)*3)).reduce((a,b)=>a.add(b),new T.Vector3()).divideScalar(6)),original=curledFernMesh(),rest=centers(original),leafStart=(51*6+2)*3;
 for(const curl of [0,.25,.5,.75,1])for(const budding of [0,.5,1]){
  const mesh=curledFernMesh(curl,budding),points=centers(mesh);assert.equal(mesh.positions.length,original.positions.length);assert.deepEqual(mesh.indices,original.indices);assert.ok(mesh.uv.slice(0,leafStart/3*2).every((v,i)=>Math.abs(v-original.uv[i])<1e-12));assert.ok(mesh.positions.every(Number.isFinite));assert.deepEqual(mesh.positions.slice(0,8*6*3),original.positions.slice(0,8*6*3));
  for(let i=1;i<points.length;i++)assert.ok(Math.abs(points[i].distanceTo(points[i-1])-rest[i].distanceTo(rest[i-1]))<1e-10,'uncurling retains rachis length');
  for(let i=0;i<mesh.indices.length;i+=3){const [a,b,c]=mesh.indices.slice(i,i+3).map(i=>new T.Vector3().fromArray(mesh.positions,i*3));assert.ok(b.sub(a).cross(c.sub(a)).length()>1e-10,'no collapsed triangles');}
  // Each nine-vertex fold keeps the centre of its root inside the stem ring.
  for(let at=leafStart,i=4;at<mesh.positions.length-8*3;at+=54,i+=2)for(let side=0;side<2;side++){const base=Array.from({length:3},(_,j)=>new T.Vector3().fromArray(mesh.positions,at+side*27+j*3)).reduce((a,b)=>a.add(b),new T.Vector3()).divideScalar(3);assert.ok(base.distanceTo(points[i])<.04);}
  if(curl===0){assert.ok(points[50].y>1.8);assert.ok(Math.abs(points[50].x-points[8].x)<1e-10);}
 }
 const open=curledFernMesh(.5,1),closed=curledFernMesh(.5,0);assert.deepEqual(open.positions.slice(0,leafStart),closed.positions.slice(0,leafStart));assert.ok(new T.Box3().setFromArray(open.positions).getSize(new T.Vector3()).z>new T.Box3().setFromArray(closed.positions).getSize(new T.Vector3()).z*3);
});

test('custom fern shapes follow live edits and surface pins, and persist through Finish and reload',()=>{
 const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,fern.id),child=addFloraAsset(f,o.branch,fern.id,0,0,{organ:o.id,surface:{mesh:0,triangle:300,bary:[.2,.3,.5]}}),part=makePart('flora',{flora:f}),group=buildPart(part,{floraEditing:true,floraLive:true}),before=floraOrganMatrix(f,child);
 try{const mesh=group.children.find(g=>g.userData.floraOrgan===o.id).children[0],buffer=mesh.geometry.attributes.position.array;o.morphs={curl:.3,budding:.85};validateFlora(f);updateFloraPreview(group,f,null,o.id);assert.equal(mesh.geometry.attributes.position.array,buffer);assert.deepEqual([...buffer],Array.from(Float32Array.from(floraDeformPositions(o,fern.meshes[0].positions))));assert.ok(!floraOrganMatrix(f,child).equals(before));assert.deepEqual([...mesh.geometry.attributes.uv.array],Array.from(Float32Array.from(curledFernMesh(.3,.85).uv)));assert.notDeepEqual([...mesh.geometry.attributes.uv.array],Array.from(Float32Array.from(fern.meshes[0].uv)));
  const saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Open fern',parts:[part]})));assert.deepEqual(saved.parts[0].flora.organs[0].morphs,o.morphs);const done=buildPart(saved.parts[0],{collision:false});try{const expected=mesh.geometry.clone().applyMatrix4(floraOrganMatrix(f,o));try{assert.ok(done.children.some(m=>m.isMesh&&m.geometry.attributes.position.array.every((x,i)=>x===expected.attributes.position.array[i])));}finally{expected.dispose();}}finally{disposePart(done);}
  for(const morphs of [{curl:1.1},{budding:-.1},{curl:NaN},{unexpected:.5}]){o.morphs=morphs;assert.throws(()=>validateFlora(f));}
 }finally{disposePart(group);}
});


test('the closed fiddlehead has a filled folded head instead of an open wire spiral',()=>{
 const mesh=curledFernMesh(1,0),triangles=[];
 for(let i=0;i<mesh.indices.length;i+=3)triangles.push(mesh.indices.slice(i,i+3).map(j=>mesh.positions.slice(j*3,j*3+3)));
 const contains=(x,y,triangle)=>{const [a,b,c]=triangle,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-12)return false;const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den;return u>=0&&v>=0&&u+v<=1;};
 let samples=0,filled=0;
 for(let x=-.18;x<=.18;x+=.006)for(let y=-.18;y<=.18;y+=.006){if(x*x+y*y>.18**2)continue;samples++;if(triangles.some(t=>contains(x-.08,y+.78,t)))filled++;}
 assert.ok(filled/samples>.85,'folded pinnae fill the circular head while retaining small natural creases');
 assert.ok(triangles.some(t=>contains(-.08,.78,t)),'a developing central bud closes the heart of the fiddlehead');
});
