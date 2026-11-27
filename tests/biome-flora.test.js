import test from 'node:test';
import assert from 'node:assert/strict';
import {BIOME_PRESETS} from '../src/flora/data/biome-presets-data.js';
import {BIOME_MODELED_PARTS,BIOME_CUTOUT_PARTS} from '../src/flora/biome-flora-parts.js';
import {FLORA_ASSETS} from '../src/flora/flora-palette.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {validateFlora} from '../src/flora/flora.js';
import {billboardCards,buildBillboardMesh} from '../src/flora/flora-billboards.js';
import {staticFoliageMesh} from '../src/swbf2/swbf2-static-foliage.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createSWBF2Package,planSWBF2} from '../src/swbf2/export-swbf2.js';
import * as T from '../vendor/three.module.js';

test('biome plants and their reusable parts have unique selectable identities',()=>{
 assert.equal(new Set(FLORA_ASSETS.map(a=>a.id)).size,FLORA_ASSETS.length);
 assert.equal(BIOME_PRESETS.length,121);
 for(const family of new Set(BIOME_PRESETS.filter(p=>p.family).map(p=>p.family)))assert.equal(BIOME_PRESETS.filter(p=>p.family===family).length,3,family);
 const habitats=new Set(BIOME_PRESETS.flatMap(p=>p.biomes));
 for(const habitat of ['woodland','foothill','tundra','alpine','prairie','rainforest','swamp','marsh','riparian','desert','oasis','tropical-coast','marine','volcanic-margin','thermal-margin'])assert.ok(habitats.has(habitat),habitat);
 for(const p of BIOME_PRESETS){assert.equal(p.paletteCategory,p.family?'Tree presets':'Biomes');validateFlora(instantiateFloraTreePreset(p.id).flora);}
 for(const id of ['biome-vined-mangrove','biome-vined-fig']){
  const f=instantiateFloraTreePreset(id).flora;
  assert.ok(f.branches.some(b=>b.name==='Climbing trunk vine'));
  assert.ok(f.branches.filter(b=>b.name.startsWith('Hanging liana')).length>=3);
  assert.ok(f.branches.filter(b=>/vine|liana/.test(b.name)).every(b=>b.parent));
 }
});

test('new mesh parts use the same construction with fewer samples for distance',()=>{
 for(const part of BIOME_MODELED_PARTS){
  const high=part.meshes[0],low=part.lowDetailMeshes[0];
  assert.ok(low.indices.length<=high.indices.length,part.id);
  for(const mesh of [high,low]){
   assert.ok(mesh.positions.every(Number.isFinite));assert.equal(mesh.uv.length,mesh.positions.length/3*2);
   assert.ok(mesh.indices.every(i=>i>=0&&i<mesh.positions.length/3));
  }
  const texture=part.textureMap();assert.equal(texture.image.width,256);assert.equal(texture.image.height,256);
 }
 for(const part of BIOME_CUTOUT_PARTS){const texture=part.textureMap();assert.equal(texture.image.width,256);assert.equal(texture.image.height,256);}
});

test('native biome exports retain cutout foliage in the far model at stock-sized resolution',()=>{
 for(const id of ['biome-fescue','biome-oak','biome-vined-mangrove','biome-cattail','biome-prickly-pear']){
  const project={format:'open-building-studio',version:1,name:'fixture_'+id,parts:[makePart('flora',instantiateFloraTreePreset(id))]};
  const {manifest,files}=createSWBF2Package(project,{output:'object',classLabel:'prop',foliage:'static',includeCollision:false,shadows:false,aiNavigation:false,maxTextureSize:256},{packZip:false});
  const main=manifest.assets[0];assert.ok(main.lowDetailTriangles>0);assert.ok(main.lowDetailTriangles<main.triangles,id);
  assert.equal(manifest.asset.foliage,'static-cards');assert.equal(main.nativeLeafPatches,0);
  for(const [name,bytes] of files)if(name.endsWith('.tga')){
   const data=Buffer.from(bytes),w=data.readUInt16LE(12),h=data.readUInt16LE(14);
   assert.ok(w<=256&&h<=256);assert.ok(w%4===0&&h%4===0);
  }
 }
});

test('a standalone asymmetric plant stays anchored at its planted base',()=>{
 const part=makePart('flora',{...instantiateFloraTreePreset('biome-date-palm'),position:[13,4,-7],rotation:[0,.7,0],scale:[1.4,1.1,1.4]}),project={format:'open-building-studio',version:1,name:'Rooted palm',parts:[part]};
 const options={output:'object',classLabel:'prop',includeCollision:false,shadows:false,aiNavigation:false},plan=planSWBF2(project,options);
 assert.deepEqual(plan.assets[0].pivot,part.position);assert.equal(plan.objectOriginKind,'plant-base');
 const {manifest,files}=createSWBF2Package(project,options,{packZip:false});assert.deepEqual(manifest.asset.origin,part.position);assert.equal(manifest.asset.originKind,'plant-base');assert.match(files.get('README.txt'),/Origin: plant base/);
 // A moved root control, including object rotation and scale, is the anchor too.
 const base=part.flora.branches[0].points[0];base[0]=.5;base[1]=.2;base[2]=-.4;
 const expected=new T.Vector3(...base).applyMatrix4(new T.Matrix4().compose(new T.Vector3(...part.position),new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),new T.Vector3(...part.scale)));
 const moved=planSWBF2(project,options);assert.ok(new T.Vector3(...moved.assets[0].pivot).distanceTo(expected)<1e-9);
});

test('fern rosettes use metre-sized fronds and spread around their planted base',()=>{
 for(const [id,maxHeight,minWidth] of [['biome-wood-fern',1.1,.7],['biome-giant-fern',2.8,2],['biome-pioneer-fern',.6,.35]]){
  const group=buildPart(makePart('flora',instantiateFloraTreePreset(id)),{collision:false});
  try{const box=new T.Box3().setFromObject(group),size=box.getSize(new T.Vector3());assert.ok(size.y<maxHeight,id+' was scaled in native source units');assert.ok(size.x>minWidth&&size.z>minWidth,id+' has a spreading three-dimensional rosette');}
  finally{disposePart(group);}
 }
});

test('distant groundcover retains the seeded patch outline with fewer actual cards',()=>{
 for(const id of ['biome-fescue','biome-tussock','biome-alpine-grass','biome-saxifrage']){
  const f=instantiateFloraTreePreset(id).flora,settings=f.organs.find(o=>o.billboard).billboard;
  const high=billboardCards(settings),low=billboardCards(settings,{lowDetail:true});
  assert.equal(low.length,settings.lowDetailCount);assert.deepEqual(low,billboardCards(settings,{lowDetail:true}));
  for(const card of low)assert.ok(high.some(c=>JSON.stringify(c)===JSON.stringify(card)),'reuses a real leaf card');
  const bound=cards=>{const b=new T.Box3();for(const c of cards){const r=Math.hypot(c.width,c.height)/2;b.expandByPoint(new T.Vector3(...c.center).addScalar(-r));b.expandByPoint(new T.Vector3(...c.center).addScalar(r));}return b;};
  const a=bound(high),b=bound(low),full=a.getSize(new T.Vector3()),far=b.getSize(new T.Vector3());
  for(const axis of ['x','y','z'])assert.ok(far[axis]/full[axis]>.8,id+' keeps its '+axis+' footprint');
 }
});

test('retained native foliage cards keep their positions and orientations at distance',()=>{
 const f=instantiateFloraTreePreset('biome-fescue').flora,settings=f.organs.find(o=>o.billboard).billboard;
 const material=new T.MeshStandardMaterial(),full=buildBillboardMesh(settings,material),far=buildBillboardMesh(settings,material,{lowDetail:true}),sources=[full,far],baked=[];
 try{
  for(const mesh of sources){mesh.position.set(3,1,-2);mesh.rotation.set(.1,.7,-.2);mesh.scale.set(1.3,.8,1.1);baked.push(staticFoliageMesh(mesh));}
  for(const [i,card] of far.geometry.userData.billboard.cards.entries())for(let corner=0;corner<4;corner++)for(const name of ['position','normal','uv','color']){
   const a=baked[0].geometry.attributes[name],b=baked[1].geometry.attributes[name];
   for(let k=0;k<a.itemSize;k++)assert.ok(Math.abs(a.array[(card.ordinal*4+corner)*a.itemSize+k]-b.array[(i*4+corner)*b.itemSize+k])<1e-6,name+' stays attached to the same card');
  }
 }finally{for(const mesh of [...sources,...baked])mesh.geometry.dispose();full.material.dispose();far.material.dispose();material.dispose();}
});
