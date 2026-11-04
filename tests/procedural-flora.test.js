import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {PROCEDURAL_FLORA} from '../src/flora/procedural-flora.js';
import {BF2_FLORA_FORMS} from '../src/flora/data/bf2-flora-forms.js';
import {BF2_FLORA_LEAVES} from '../src/flora/data/bf2-flora-leaves.js';
import {MODELED_LEAF_PARTS} from '../src/flora/modeled-leaves.js';
import {defaultFlora,addFloraAsset,buildFlora,branchGeometry,floraOrganPosition} from '../src/flora/flora.js';
import {makePart} from '../src/core/model.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';

test('authored modeled leaves stay opaque and replace the retired reference geometry and textures',()=>{
 const modeled=PROCEDURAL_FLORA.filter(a=>a.category==='Leaves'&&!/Sprig|Spray|Canopy|Crown|Whorl|Tuft|Frond/.test(a.name));
 assert.equal(modeled.length,15);
 for(const part of modeled){
  assert.equal(part.alphaMap(),null,part.name+' is a solid modeled surface, not a cutout card');
  assert.equal(MODELED_LEAF_PARTS.find(a=>a.id===part.id),part,part.name+' uses the approved authored surface');
  assert.ok(!Object.hasOwn(BF2_FLORA_FORMS,part.id),part.name+' retired mesh is removed');assert.ok(!Object.hasOwn(BF2_FLORA_LEAVES,part.id),part.name+' retired texture is removed');
  const flora=defaultFlora(),trunk=addFloraAsset(flora,flora.branches[0].id,'flora-basic-branch'),leaf=addFloraAsset(flora,trunk.id,part.id,.5,0,{at:.5,branchSurface:{angle:0}}),group=new T.Group();
  try{buildFlora(group,flora,{}, {editable:true,live:true});const organ=group.children.find(g=>g.userData.floraOrgan===leaf.id),meshes=organ.children.filter(m=>m.isMesh);
   assert.equal(meshes.length,part.meshes.length,'no additional stalk draw calls');
   for(const mesh of meshes){assert.equal(mesh.material.alphaTest,0);assert.equal(mesh.material.alphaMap,null);assert.equal(mesh.material.transparent,false);assert.ok(mesh.material.map.image.data.every((value,i)=>i%4!==3||value===255),'diffuse alpha cannot erase a stalk either');}
  }finally{group.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});}
 }
 for(const id of ['flora-starburst-leaf','flora-blade-leaf','flora-shield-leaf','flora-paddle-leaf','flora-notched-leaf'])assert.ok(modeled.some(a=>a.id===id),'covers split-stalk regressions: '+id);
});

test('non-fern cutout foliage retains opaque modeled stalks without filling its leafy gaps',()=>{
 for(const part of PROCEDURAL_FLORA.filter(a=>a.category==='Leaves'&&a.alphaMap()&&!/Palm|Willow|Fern Frond/.test(a.name))){
  const alpha=part.alphaMap().image;
  assert.ok(alpha.data.some((v,i)=>i%4===0&&v===0),part.name+' leafy cutouts remain available');
  for(const mesh of part.meshes){
   assert.ok(mesh.stemVertices.length>=3,part.name+' has a retained stalk');
   const stem=new Set(mesh.stemVertices);assert.ok(mesh.indices.some((i,j)=>j%3===0&&stem.has(i)&&stem.has(mesh.indices[j+1])&&stem.has(mesh.indices[j+2])),part.name+' stalk has faces');
   const heights=mesh.stemVertices.map(i=>mesh.positions[i*3+1]);assert.ok(Math.min(...heights)<0&&Math.max(...heights)>0,part.name+' stalk crosses the mounting plane');
   for(const i of mesh.stemVertices){const u=mesh.uv[i*2],v=mesh.uv[i*2+1],x=Math.floor(u*alpha.width),y=Math.floor(v*alpha.height);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)assert.ok(alpha.data[((y+dy)*alpha.width+x+dx)*4]>=250,part.name+' stalk survives alpha testing and filtering');}
  }
  for(const value of [0,1]){const changed=part.shapeMesh({width:value,curl:value});for(const i of changed.stemVertices)assert.deepEqual(changed.uv.slice(i*2,i*2+2),part.meshes[0].uv.slice(i*2,i*2+2),part.name+' morph keeps opaque stalk UVs');}
 }
});

test('fern sprites keep their textured midribs without modeled stalks through the fronds',()=>{
 const parts=PROCEDURAL_FLORA.filter(a=>a.category==='Leaves'&&a.alphaMap()&&/Palm|Willow|Fern Frond/.test(a.name));
 assert.ok(parts.some(a=>a.id==='flora-fern-frond'));assert.ok(parts.some(a=>a.id==='flora-willow-frond'));
 for(const part of parts){
  assert.ok(part.alphaMap(),part.name+' keeps its fern cutout');
  for(const mesh of part.meshes){
   assert.ok(mesh.attachmentVertices.length>0);
   const mask=part.alphaMap().image;
   for(const i of mesh.attachmentVertices){assert.deepEqual(mesh.positions.slice(i*3,i*3+3),[0,0,0],part.name+' visible root is its attachment origin');const x=Math.floor(mesh.uv[i*2]*mask.width),y=Math.floor(mesh.uv[i*2+1]*mask.height);assert.ok(mask.data[(y*mask.width+x)*4]>180,part.name+' attachment is on the opaque stem, not transparent padding');for(const value of [0,1])assert.deepEqual(part.shapeMesh({width:value,curl:value}).positions.slice(i*3,i*3+3),[0,0,0],part.name+' shaping keeps its root anchored');}
   assert.equal(mesh.stemVertices,undefined,part.name+' has no extra stalk geometry');
   // Every face belongs to a folded textured card, with area in its UV map.
   for(let j=0;j<mesh.indices.length;j+=3){const [a,b,c]=mesh.indices.slice(j,j+3).map(i=>mesh.uv.slice(i*2,i*2+2));assert.ok(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))>1e-8,part.name+' has no constant-UV stalk faces');}
  }
 }
});

test('fern attachment roots meet the rendered tree bark',()=>{
 const f=defaultFlora(),stem=addFloraAsset(f,f.branches[0].id,'flora-sinuous-branch');stem.points=[[0,0,0],[.3,2,0],[-.2,4.5,.1]];stem.radii=[.23,.18,.12];
 for(let i=0;i<8;i++)addFloraAsset(f,stem.id,i%2?'flora-willow-frond':'flora-fern-frond',.98,0,{branch:stem.id,at:.98,branchSurface:{angle:i*Math.PI/4}});
 const g=branchGeometry(f,f.branches[0]),positions=g.attributes.position,indices=g.index.array;
 try{for(const o of f.organs){const root=floraOrganPosition(f,o);let distance=Infinity;for(let j=0;j<indices.length;j+=3){const tri=new T.Triangle(...Array.from(indices.slice(j,j+3),i=>new T.Vector3().fromBufferAttribute(positions,i)));distance=Math.min(distance,tri.closestPointToPoint(root,new T.Vector3()).distanceTo(root));}assert.ok(distance<.01,o.asset+' root lies on the tree, not out in the frond');}}finally{g.dispose();}
});

test('every adapted shape control changes its mesh while preserving finite topology and triangle pins',()=>{
 for(const part of PROCEDURAL_FLORA){
  for(const control of part.shapeControls||[]){
   const a=part.shapeMesh({[control.id]:0}),b=part.shapeMesh({[control.id]:1});
   assert.deepEqual(a.indices,b.indices,part.name+' stable triangle pins');assert.equal(a.positions.length,b.positions.length);assert.notDeepEqual(a.positions,b.positions,part.name+' '+control.name+' does something');
   for(const mesh of [a,b]){
    const edges=new Map(),vertex=i=>mesh.positions.slice(i*3,i*3+3).map(x=>Math.round(x*1e6)).join(',');let volume=0;
    for(let i=0;i<mesh.indices.length;i+=3){const ids=mesh.indices.slice(i,i+3),[p,q,r]=ids.map(j=>new T.Vector3().fromArray(mesh.positions,j*3));assert.ok(q.clone().sub(p).cross(r.clone().sub(p)).lengthSq()>1e-22,part.name+' nonzero faces');volume+=p.dot(q.clone().cross(r))/6;
     for(let j=0;j<3;j++){const pair=[vertex(ids[j]),vertex(ids[(j+1)%3])].sort().join('|');edges.set(pair,(edges.get(pair)||0)+1);}
    }
    assert.ok(mesh.positions.every(Number.isFinite));assert.ok(mesh.uv.every(Number.isFinite));assert.ok(mesh.indices.every(i=>Number.isInteger(i)&&i>=0&&i<mesh.positions.length/3));
   }
  }
 }
 assert.equal(fs.readdirSync(new URL('../assets/',import.meta.url)).includes('native-flora'),false,'removed source catalogue is not shipped');
});

test('procedural foliage exports generated textures and edited geometry to SWBF2',()=>{
 const flora=defaultFlora(),trunk=addFloraAsset(flora,flora.branches[0].id,'flora-basic-branch'),leaf=addFloraAsset(flora,trunk.id,'flora-ginkgo-leaf');leaf.morphs={width:.8,curl:.9};
 const project={format:'open-building-studio',version:1,name:'Original botanical export',parts:[makePart('flora',{flora})]},output=createSWBF2Package(project);
 assert.ok([...output.files.keys()].some(p=>p.endsWith('.msh')));assert.ok([...output.files.keys()].some(p=>p.endsWith('.tga')));assert.ok(output.manifest.assets.every(a=>a.triangles>0));assert.ok(output.manifest.assets.some(a=>a.collisionTriangles>0||a.ordnanceCollision||a.primitiveCollision>0));
});
