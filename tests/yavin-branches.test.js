import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {YAVIN_BRANCH_SOURCE as source} from '../src/flora/data/yavin-branch-source.js';
import {YAVIN_BRANCH_PARTS,withYavinBranchPlanes} from '../src/flora/yavin-branches.js';
import {floraAsset,floraPaletteCategory,floraPlacementCategory} from '../src/flora/flora-palette.js';
import {defaultFlora,addFloraAsset,floraOrganMatrix,floraMorphPositions,updateFloraPreview,validateFlora} from '../src/flora/flora.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';

test('Yavin twig planes retain their stock alpha pixels, UVs and rooted two/four triangle construction',()=>{
 assert.match(source.source,/yav_prop_leaftree3.msh.*branch26/);assert.deepEqual(source.materialFlags,[24,0,0,0]);
 assert.deepEqual(source.stockBranchPlanes.map(s=>s.triangles),[2,2,2,4,4]);
 assert.equal(source.texture.width,128);assert.equal(source.texture.height,128);
 const original=Uint8Array.from(atob(source.texture.rgba),c=>c.charCodeAt(0));
 for(const [j,part] of YAVIN_BRANCH_PARTS.entries()){
  assert.equal(floraAsset(part.id),part);assert.equal(floraPaletteCategory(part),'Branches');assert.equal(floraPlacementCategory(part),'Surface parts');
  assert.equal(part.billboard,undefined);assert.equal(part.walkCollision,false);assert.equal(part.triangles,j?4:2);assert.equal(part.lowDetailMeshes,part.meshes);assert.ok(fs.existsSync(new URL(part.iconUrl)));
  const diffuse=part.textureMap().image,mask=part.alphaMap().image;
  for(let i=0;i<original.length;i+=4){assert.deepEqual([...diffuse.data.slice(i,i+3)],[...original.slice(i,i+3)]);assert.equal(mask.data[i],original[i+3]);}
  assert.ok(mask.data.some((v,i)=>i%4===0&&v===0));assert.ok(mask.data.some((v,i)=>i%4===0&&v===255));
  assert.deepEqual(part.meshes[0].uv.slice(0,8),source.uv);
  let roots=0;for(let i=0;i<part.meshes[0].positions.length;i+=3)if(part.meshes[0].positions.slice(i,i+3).every(v=>Math.abs(v)<1e-7))roots++;
  assert.equal(roots,j?2:1,'each plane mounts at the opaque stem base');
 }
});

test('fixed twig planes follow edited wood and retain independent spread/length through save/load',()=>{
 const f=defaultFlora(),b=addFloraAsset(f,f.branches[0].id,'flora-basic-branch'),o=addFloraAsset(f,b.id,'yavin-branch-cross',.8);o.morphs={width:.8,length:.25};
 const part=makePart('flora',{flora:f}),root=buildPart(part,{floraEditing:true,floraLive:true});
 try{
  const before=floraOrganMatrix(f,o);b.points.at(-1)[0]+=.6;validateFlora(f);updateFloraPreview(root,f,b.id);
  assert.ok(!before.equals(floraOrganMatrix(f,o)));const organ=root.children.find(c=>c.userData.floraOrgan===o.id);
  assert.ok(organ.matrix.equals(floraOrganMatrix(f,o)));assert.ok(organ.children.every(m=>!m.userData.floraBillboard));
  const asset=floraAsset(o.asset),positions=floraMorphPositions(o,asset.meshes[0].positions);assert.notDeepEqual(positions,asset.meshes[0].positions);
  const project={format:'open-building-studio',version:1,name:'Yavin twig planes',parts:[part]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);
 }finally{disposePart(root);}
});

test('native twig exports use fixed cutout geometry at both LODs without leafpatch objects or collision',()=>{
 for(const part of YAVIN_BRANCH_PARTS){
  const flora=defaultFlora();addFloraAsset(flora,flora.branches[0].id,part.id,0);
  const {files,manifest}=createSWBF2Package({format:'open-building-studio',version:1,name:'twig_'+part.triangles,parts:[makePart('flora',{flora})]},{output:'object',includeCollision:true,shadows:false,aiNavigation:false},{packZip:false});
  assert.equal(manifest.assets[0].triangles,part.triangles);assert.equal(manifest.assets[0].lowDetailTriangles,part.triangles);assert.equal(manifest.assets[0].nativeLeafPatches,0);
  assert.ok(![...files.values()].some(v=>typeof v==='string'&&v.includes('ClassLabel = "leafpatch"')));
  assert.ok(manifest.assets.every(a=>!a.collisionTriangles&&!a.primitiveCollision&&a.role!=='collision'));
  assert.match(files.get('msh/'+manifest.assets[0].name+'.msh.option'),/-nocollision/);
  const images=[...files].filter(([p])=>p.endsWith('.tga'));assert.ok(images.length);for(const [,bytes] of images){const b=Buffer.from(bytes);assert.equal(b.readUInt16LE(12),128);assert.equal(b.readUInt16LE(14),128);assert.ok(b.subarray(18).some((v,i)=>i%4===3&&v===0));}
 }
});

test('Yavin presets include sparse fixed twig planes without replacing modeled wood or camera-facing leaves',()=>{
 for(const id of ['yavin-temple-broadleaf','yavin-slender-grove']){
  const a=instantiateFloraTreePreset(id),b=instantiateFloraTreePreset(id),planes=a.flora.organs.filter(o=>o.asset.startsWith('yavin-branch-'));
  assert.ok(planes.length>=2&&planes.length<=4);assert.ok(a.flora.organs.some(o=>o.billboard?.facing==='camera'));assert.ok(planes.every(o=>!o.billboard&&o.kind==='leaf'));
  assert.ok(planes.every(o=>!b.flora.organs.some(n=>n.id===o.id)));validateFlora(a.flora);
 }
 const other={id:'biome-oak'};assert.equal(withYavinBranchPlanes(other),other);
});

test('adding Yavin twig planes leaves the original physical wood collision byte-identical',()=>{
 const part=makePart('flora',instantiateFloraTreePreset('yavin-temple-broadleaf')),bare=structuredClone(part);
 bare.flora.organs=bare.flora.organs.filter(o=>!o.asset.startsWith('yavin-branch-'));
 const project=p=>({format:'open-building-studio',version:1,name:'yavin_collision',parts:[p]}),options={output:'object',classLabel:'prop',includeCollision:true,shadows:false,aiNavigation:false,compactTrees:false};
 const a=createSWBF2Package(project(part),options,{packZip:false}),b=createSWBF2Package(project(bare),options,{packZip:false});
 const collision=result=>result.manifest.assets.filter(a=>a.role==='collision');
 assert.ok(collision(a).length);assert.deepEqual(collision(a),collision(b));
 for(const helper of collision(a))assert.deepEqual(a.files.get('msh/'+helper.name+'.msh'),b.files.get('msh/'+helper.name+'.msh'));
 assert.equal(a.manifest.assets[0].nativeLeafPatches,b.manifest.assets[0].nativeLeafPatches);
});
