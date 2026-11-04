import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {TEMP_BASE_PARTS,TEMP_BASE_DESIGNS} from '../src/flora/temp-bases.js';
import {floraAsset,floraPaletteCategory,floraPlacementCategory,FLORA_PALETTE_ASSETS} from '../src/flora/flora-palette.js';
import {defaultFlora,addFloraAsset,validateFlora,floraConnectionSockets,floraSocketPose,floraCurve,deformFloraStemControl,floraOrganMatrix} from '../src/flora/flora.js';
import {floraBodyGeometry,floraBodyField} from '../src/flora/flora-body.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {exportOBJ} from '../src/export/export.js';

function inspect(m,label){
 const positions=m.positions||Array.from(m.attributes.position.array),indices=m.indices||Array.from(m.index.array),count=positions.length/3;
 assert.ok(positions.every(Number.isFinite),label+' finite positions');
 const keys=Array.from({length:count},(_,i)=>positions.slice(i*3,i*3+3).map(n=>Math.round(n*1e6)).join(',')),edges=new Map(),neighbours=new Map();let volume=0;
 for(let i=0;i<indices.length;i+=3){const ids=indices.slice(i,i+3);assert.ok(ids.every(i=>Number.isInteger(i)&&i>=0&&i<count));const [a,b,c]=ids.map(i=>new T.Vector3().fromArray(positions,i*3));assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()>1e-24,label+' nonzero face');volume+=a.dot(b.clone().cross(c))/6;
  for(let j=0;j<3;j++){const a=keys[ids[j]],b=keys[ids[(j+1)%3]],key=[a,b].sort().join('|'),edge=edges.get(key)||[0,0];edge[0]++;edge[1]+=a<b?1:-1;edges.set(key,edge);if(!neighbours.has(a))neighbours.set(a,new Set());if(!neighbours.has(b))neighbours.set(b,new Set());neighbours.get(a).add(b);neighbours.get(b).add(a);}
 }
 assert.ok([...edges.values()].every(([n,d])=>n===2&&d===0),label+' closed outward surface');assert.ok(volume>0,label+' positive volume');
 const seen=new Set(),queue=[neighbours.keys().next().value];while(queue.length){const id=queue.pop();if(seen.has(id))continue;seen.add(id);for(const n of neighbours.get(id)||[])if(!seen.has(n))queue.push(n);}assert.equal(seen.size,neighbours.size,label+' one joined exterior');
}
test('Bases offers the six approved trunks plus Crown Base and Basic Trunk',()=>{
 assert.equal(TEMP_BASE_PARTS.length,6);assert.deepEqual(TEMP_BASE_PARTS.map(a=>a.id),['temp-base-stem','temp-base-fork','temp-base-crooked','temp-base-bulbous','temp-base-buttress','temp-base-stilt']);
 assert.deepEqual(FLORA_PALETTE_ASSETS.filter(a=>floraPaletteCategory(a)==='Bases').map(a=>a.id).sort(),['flora-basic-trunk','flora-crown-base',...TEMP_BASE_PARTS.map(a=>a.id)].sort());
 for(const a of TEMP_BASE_PARTS){assert.equal(floraAsset(a.id),a);assert.equal(floraPaletteCategory(a),'Bases');assert.equal(floraPlacementCategory(a),'Body presets');assert.ok(existsSync(new URL(a.iconUrl)));assert.equal(floraConnectionSockets(a.id).length,a.skeleton.length);assert.ok(a.skeleton.length>=3&&a.skeleton.length<=14);}
 for(const file of ['temp-base-trunks','temp-base-roots'])assert.doesNotMatch(readFileSync(new URL('../src/flora/'+file+'.js',import.meta.url),'utf8'),/from\s*['"][^'"]*(?:bf2-flora-forms|procedural-flora)/);
});
test('the six baked base meshes are closed connected volumes with useful three-dimensional depth',()=>{
 for(const a of TEMP_BASE_PARTS){const m=a.meshes[0];inspect(m,a.name);assert.ok(m.indices.length/3<2400,a.name+' source budget');assert.equal(m.uv.length,m.positions.length/3*2);assert.ok(m.uv.every(Number.isFinite));assert.equal(m.normals.length,m.positions.length);assert.ok(m.normals.every(Number.isFinite));const normalAt=new Map();for(let i=0;i<m.positions.length;i+=3){const key=m.positions.slice(i,i+3).join(',');if(normalAt.has(key))assert.deepEqual(m.normals.slice(i,i+3),normalAt.get(key),'texture-chart seams keep continuous shading');else normalAt.set(key,m.normals.slice(i,i+3));}const box=new T.Box3();for(let i=0;i<m.positions.length;i+=3)box.expandByPoint(new T.Vector3().fromArray(m.positions,i));const size=box.getSize(new T.Vector3());assert.ok(size.y>2.5&&size.z>.8);assert.ok(box.min.y>-.05&&box.min.y<.05,a.name+' reaches the ground');}
 const f=defaultFlora(),stilt=addFloraAsset(f,f.branches[0].id,'temp-base-stilt');assert.ok(floraBodyField(stilt).distance(0,.22,0)>.2,'stilt roots leave open space below their raised hub');
});
test('body joints reshape their solid base and carry attached branches through saved reload',()=>{
 for(const a of TEMP_BASE_PARTS){const f=defaultFlora(),root=addFloraAsset(f,f.branches[0].id,a.id),tip=a.skeleton.filter(n=>n.parent&&!a.skeleton.some(c=>c.parent===n.id)).sort((a,b)=>b.point[1]-a.point[1])[0],child=addFloraAsset(f,root.branch,'flora-basic-branch',0,0,{organ:root.id,socket:tip.id}),before=floraCurve(f,child.id).getPoint(0),old=structuredClone(root),pose=floraSocketPose(root,tip);
  deformFloraStemControl(root,old,tip.id,new T.Vector3(...pose.point).add(new T.Vector3(.35,.3,-.2)).toArray(),[.1,.2,0],[1.15,1.15,1.15],'translate');
  const expected=new T.Vector3(...floraSocketPose(root,tip).point).applyMatrix4(floraOrganMatrix(f,root));assert.ok(floraCurve(f,child.id).getPoint(0).distanceTo(expected)<1e-6);assert.ok(expected.distanceTo(before)>.1);
  const g=floraBodyGeometry(root);try{inspect(g,a.name+' edited');assert.ok(floraBodyField(root).distance(...floraSocketPose(root,tip).point)<0);}finally{g.dispose();}
  validateFlora(f);const p=makePart('flora',{flora:f}),project={format:'open-building-studio',version:1,name:'Base review',parts:[p]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);
  const baked=buildPart(p,{collision:false,batch:true});try{assert.ok(!/NaN|Infinity/.test(exportOBJ(baked)));}finally{disposePart(baked);}
 }
});
test('SWBF2 detail preserves each base without shipping dense field meshes',()=>{
 for(const design of TEMP_BASE_DESIGNS){const f=defaultFlora();addFloraAsset(f,f.branches[0].id,design.id);const group=buildPart(makePart('flora',{flora:f}),{collision:false});try{let triangles=0;group.traverse(m=>{if(m.isMesh)triangles+=m.geometry.index.count/3;});assert.ok(triangles>100&&triangles<2400,design.name+' bounded rendered geometry');}finally{disposePart(group);}}
});
