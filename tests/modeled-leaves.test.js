import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {MODELED_LEAF_PARTS} from '../src/flora/modeled-leaves.js';
import {BF2_FLORA_FORMS} from '../src/flora/data/bf2-flora-forms.js';
import {BF2_FLORA_LEAVES} from '../src/flora/data/bf2-flora-leaves.js';
import {PROCEDURAL_FLORA,FLORA_ASSETS,FLORA_PALETTE_ASSETS,floraAsset,floraPaletteCategory} from '../src/flora/flora-palette.js';
import {defaultFlora,addFloraAsset} from '../src/flora/flora.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {exportOBJ} from '../src/export/export.js';

function geometry(mesh){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(mesh.positions,3));g.setIndex(mesh.indices);g.computeVertexNormals();return g;}
test('fifteen approved modeled leaves replace canonical geometry and textures without retired review aliases',()=>{
 const ids=['flora-willow-leaf','flora-starburst-leaf','flora-horned-leaf','flora-coral-leaf','flora-blade-leaf','flora-shield-leaf','flora-notched-leaf','flora-scalloped-leaf','flora-spiral-tendril','flora-paddle-leaf','flora-ginkgo-leaf','flora-maple-leaf','flora-folded-leaf','flora-ruffled-leaf','flora-coin-leaf'];
 assert.equal(MODELED_LEAF_PARTS.length,15);assert.deepEqual(MODELED_LEAF_PARTS.map(a=>a.id).sort(),[...ids].sort());
 for(const file of ['modeled-leaves','leaf-cups','leaf-shapes','leaf-accents']){
  const source=readFileSync(new URL('../src/flora/'+file+'.js',import.meta.url),'utf8');
  assert.ok(!/from ['"].*(?:data\/|procedural-flora)/.test(source),'authored geometry and texture have no source mesh dependency');
 }
 for(const part of MODELED_LEAF_PARTS){
  assert.equal(floraAsset(part.id),part);assert.equal(PROCEDURAL_FLORA.find(a=>a.id===part.id),part);
  assert.equal(FLORA_ASSETS.filter(a=>a.id===part.id).length,1);assert.equal(FLORA_PALETTE_ASSETS.filter(a=>a.id===part.id).length,1);
  assert.equal(part.category,'Leaves');assert.equal(floraPaletteCategory(part),part.id==='flora-coral-leaf'?'Coral':'Leaves');
  assert.ok(existsSync(new URL(part.iconUrl)));assert.ok(part.iconUrl.endsWith('/assets/procedural-flora/'+part.id+'.png'));
  assert.ok(!Object.hasOwn(BF2_FLORA_FORMS,part.id),'retired source mesh is not shipped');assert.ok(!Object.hasOwn(BF2_FLORA_LEAVES,part.id),'retired source texture is not shipped');
 }
 assert.equal(new Set(FLORA_ASSETS.map(a=>a.id)).size,FLORA_ASSETS.length);
 const retired=['temp-willow','temp-star','temp-horned','temp-coral','temp-disc','temp-shield','temp-notched','temp-scalloped','temp-tendril','temp-paddle','temp-fan','temp-maple','temp-folded','temp-ruffled','temp-coin'];
 assert.ok(retired.every(id=>!floraAsset(id)),'approved leaves do not retain temporary aliases');
 const review=FLORA_PALETTE_ASSETS.filter(a=>floraPaletteCategory(a)==='temp');assert.equal(review.length,0,'approved bases and leaves no longer need a temp section');
});

test('modeled leaves have closed three-dimensional surfaces and bounded geometry',()=>{
 for(const part of MODELED_LEAF_PARTS){
  const m=part.meshes[0],p=m.positions,edges=new Map(),vertex=i=>p.slice(i*3,i*3+3).map(v=>Math.round(v*1e6)).join(',');
  assert.ok(m.indices.length/3<=1200,part.name+' face budget');assert.equal(m.uv.length,p.length/3*2);
  for(let i=0;i<m.indices.length;i+=3){
   const ids=m.indices.slice(i,i+3),[a,b,c]=ids.map(j=>new T.Vector3().fromArray(p,j*3));assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()>1e-18,part.name+' nonzero faces');
   for(let j=0;j<3;j++){const a=vertex(ids[j]),b=vertex(ids[(j+1)%3]),key=[a,b].sort().join('|');const e=edges.get(key)||{count:0,winding:0};e.count++;e.winding+=a<b?1:-1;edges.set(key,e);}
  }
  assert.ok([...edges.values()].every(e=>e.count===2&&e.winding===0),part.name+' closed and consistently wound');
  const g=geometry(m);try{g.computeBoundingBox();const size=g.boundingBox.getSize(new T.Vector3());assert.ok(size.z>.15,part.name+' retains side-view depth');if(['flora-starburst-leaf','flora-horned-leaf','flora-folded-leaf','flora-ruffled-leaf','flora-coin-leaf','flora-scalloped-leaf','flora-paddle-leaf'].includes(part.id))assert.ok(size.z>size.x*.4,part.name+' has a substantial body');}finally{g.dispose();}
 }
});
test('cups contain an actual cavity with thick sides rather than a filled or flat cap',()=>{
 for(const id of ['flora-horned-leaf','flora-folded-leaf','flora-ruffled-leaf']){
  const part=floraAsset(id),g=geometry(part.meshes[0]),m=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));m.updateMatrixWorld(true);
  try{g.computeBoundingBox();const bounds=g.boundingBox,h=bounds.max.y-bounds.min.y,hits=new T.Raycaster(new T.Vector3(.04,bounds.max.y+1,.03),new T.Vector3(0,-1,0),0,h+2).intersectObject(m);assert.ok(hits.length);assert.ok(bounds.max.y-hits[0].point.y>h*.2,id+' center sits substantially below the rim');}finally{g.dispose();m.material.dispose();}
 }
});
test('modeled leaves retain their attachment origin and topology through all shape controls and saved projects',()=>{
 for(const a of MODELED_LEAF_PARTS){
  for(const control of a.shapeControls)for(const value of [0,1]){const m=a.shapeMesh({[control.id]:value});assert.deepEqual(m.indices,a.meshes[0].indices,a.name+' stable triangle attachments');assert.ok(m.positions.every(Number.isFinite));assert.ok(m.positions.some((v,i)=>i%3===0&&Math.hypot(...m.positions.slice(i,i+3))<1e-9),a.name+' stays attached at its base');}
  const flora=defaultFlora(),o=addFloraAsset(flora,flora.branches[0].id,a.id);o.morphs={width:.65,length:.6,curl:.7};const part=makePart('flora',{flora}),project={format:'open-building-studio',version:1,name:'Modeled leaf fixture',parts:[part]};assert.deepEqual(validateProject(structuredClone(project)),project);
  const g=buildPart(part,{collision:false});try{assert.ok(!/NaN|Infinity/.test(exportOBJ(g)));}finally{disposePart(g);}
 }
});
