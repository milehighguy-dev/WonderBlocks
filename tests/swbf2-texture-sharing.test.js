import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {exportMaterial,nativeLeafTexture,textureFilename} from '../src/swbf2/swbf2-textures.js';
import {writeTGA} from '../src/swbf2/swbf2-binary.js';
import {textureContentId} from '../src/swbf2/swbf2-texture-names.js';
import {SURFACES,surfaceTexture} from '../src/materials/surfaces.js';
const project=(name,parts)=>({format:'open-building-studio',version:1,name,parts});
const settings={output:'object',includeCollision:false,aiNavigation:false,lowDetail:false,shadows:false};
const textures=result=>[...result.files].filter(([name])=>name.endsWith('.tga'));

test('independently exported objects share one texture filename despite names, IDs, dimensions and UV repeats',()=>{
 const finish={color:'#287ed4',surface:{preset:'white-bf1-naboo-brick',scale:.5}},a=createSWBF2Package(project('Blue wall',[makePart('block',{...finish,name:'Wall',scale:[20,4,.3]})]),settings),b=createSWBF2Package(project('Blue tower',[makePart('round',{...finish,name:'Tower',scale:[3,12,3],surface:{...finish.surface,scale:2}})]),settings);
 assert.notEqual(a.manifest.asset.mesh,b.manifest.asset.mesh);
 assert.equal(textures(a).length,1);assert.equal(textures(b).length,1);
 const [name,bytes]=textures(a)[0];assert.equal(textures(b)[0][0],name);assert.deepEqual(textures(b)[0][1],bytes);
 assert.match(name,/^msh\/wb_white_brickwork_blue_[a-f0-9]{8}\.tga$/);
 for(const result of [a,b])assert.ok(Buffer.from(result.files.get(result.manifest.asset.mesh)).includes(Buffer.from(name.slice(4))),'both meshes reference the shared texture');
 const combined=new Map([...textures(a),...textures(b)]);assert.equal(combined.size,1,'one file when packages are copied into the same msh folder');
 const changed=createSWBF2Package(project('Red wall',[makePart('block',{...finish,color:'#bc6848'})]),settings);assert.notEqual(textures(changed)[0][0],name,'a different baked tint needs a different resource');
});

test('material flags and leaf-atlas conversions do not create aliases for identical pixels',()=>{
 const data=new Uint8Array(16*16*4);for(let i=0;i<data.length;i+=4)data.set([120,180,210,255],i);
 const map=new T.DataTexture(data,16,16);map.colorSpace=T.SRGBColorSpace;
 const a=exportMaterial(new T.MeshStandardMaterial({map})),b=exportMaterial(new T.MeshBasicMaterial({map,side:T.DoubleSide}));
 assert.notEqual(a.flags,b.flags);assert.equal(a.texture,b.texture);assert.deepEqual(a.bytes,b.bytes);
 for(const atlas of [1,2]){const leaves=nativeLeafTexture(a,atlas,16);assert.deepEqual(leaves.bytes,a.bytes);assert.equal(leaves.texture,a.texture);}
});

test('ordinary, foliage and invisible support textures have one content name across packages',()=>{
 const tree=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree')),a=createSWBF2Package(project('Woodland scene',[tree,makePart('stair-route')]),{aiNavigation:false,shadows:false,lowDetail:false}),b=createSWBF2Package(project('Another woodland',[makePart('flora',instantiateFloraTreePreset('endor-woodland-tree'))]),{includeCollision:false,aiNavigation:false,shadows:false,lowDetail:false}),names=new Map();
 for(const result of [a,b])for(const [name,bytes] of textures(result)){
  assert.ok(name.endsWith('_'+textureContentId(bytes)+'.tga'));assert.match(name,/^msh\/wb_[a-z][a-z0-9_]+_[a-f0-9]{8}\.tga$/);const hash=createHash('sha256').update(bytes).digest('hex');if(names.has(hash))assert.equal(name,names.get(hash),'identical image data must not have multiple names');names.set(hash,name);
 }
 const invisible='msh/'+textureFilename(writeTGA(16,16,new Uint8Array(16*16*4)));
 assert.ok(a.manifest.assets.some(x=>x.carrierTriangles));
 for(const result of [a,b]){
  assert.ok(result.files.has(invisible));assert.equal(result.files.get(invisible+'.option'),'-maps 1 -format a8r8g8b8\n');assert.ok(Buffer.from(result.files.get('msh/wb_leaf_anchor.msh')).includes(Buffer.from(invisible.slice(4))));
 }
 assert.ok(![...a.files.keys()].some(p=>/wb_leaftex_|wb_leaf_anchor\.tga|wb_invisible_collision\.tga/.test(p)));
});

test('library image aliases share descriptive names independently of material/object labels',()=>{
 const names=new Map();
 for(const surface of SURFACES)for(const color of ['#ffffff','#287ed4']){
  const m=new T.MeshStandardMaterial({map:surfaceTexture(surface.id),color}),result=exportMaterial(m),key=createHash('sha256').update(result.bytes).digest('hex');
  if(names.has(key))assert.equal(result.texture,names.get(key),surface.id+' shares identical pixels');names.set(key,result.texture);assert.ok(result.texture.length<=54);m.dispose();
  assert.ok(!result.textureLabel.startsWith('surface'),surface.id+' has a catalog description');
 }
 const original=surfaceTexture('white-bf1-naboo-brick'),copy=original.clone();copy.userData={surfacePreset:'unrelated-object-label'};copy.name='My second tower';
 const a=exportMaterial(new T.MeshStandardMaterial({map:original,color:'#287ed4'})),b=exportMaterial(new T.MeshStandardMaterial({map:copy,color:'#287ed4'}));assert.equal(a.texture,b.texture);
 assert.throws(()=>textureFilename(new Uint8Array(3)),/generated RGB\/RGBA/);
});
