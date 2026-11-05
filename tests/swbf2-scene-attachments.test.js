import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {createInstanceCopies} from '../src/core/instances.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {createSWBF2Package,planSWBF2} from '../src/swbf2/export-swbf2.js';

const project=parts=>({format:'open-building-studio',version:1,name:'Attached collision',parts});
const settings={aiNavigation:false,shadows:false,lowDetail:false};
function checkAttachments(result){
 const helpers=result.manifest.assets.filter(a=>a.role==='collision'),mains=result.manifest.assets.filter(a=>a.role!=='collision');
 assert.ok(helpers.length);
 const byName=new Map(result.manifest.assets.map(a=>[a.name,a]));
 for(const helper of helpers){
  const parent=byName.get(helper.attachedTo);assert.ok(parent,'each helper has an exported parent');
  assert.ok(result.files.get('odf/'+parent.name+'.odf').includes(`AttachOdf = "${helper.name}"\nAttachToHardPoint = "${helper.attachmentHardpoint}"`));
  assert.ok(result.files.has('msh/'+helper.name+'.msh'));
  const visited=new Set([helper.name]);let ancestor=parent;
  while(ancestor.role==='collision'){assert.ok(!visited.has(ancestor.name),'attachment graph is acyclic');visited.add(ancestor.name);ancestor=byName.get(ancestor.attachedTo);assert.ok(ancestor);}
  assert.ok(ancestor.collisionHelpers.includes(helper.name),'every helper reaches its owning render asset');
 }
 for(const asset of result.manifest.assets){
  const collisionAttachments=[...result.files.get('odf/'+asset.name+'.odf').matchAll(/AttachOdf = "([^"]+)"/g)].filter(m=>byName.get(m[1])?.role==='collision');
  assert.ok(collisionAttachments.length<=16,'native prop attachment limit');
 }
 if(result.manifest.settings.output==='scene'){
  const placements=mains.reduce((n,a)=>n+(a.instanceCount||1),0);assert.equal(result.manifest.objects,placements);
  for(const [name,text] of result.files)if(/\.(wld|lyr)$/.test(name)){
   const placed=[...text.matchAll(/Object\("[^"]+",\s*"([^"]+)"/g)].map(m=>m[1]);
   assert.equal(placed.length,placements);
   assert.ok(placed.every(name=>byName.get(name)?.role!=='collision'),'helpers have no independent world placements');
  }
 }
 return {helpers,mains};
}

test('scene helpers follow rotated instance copies without independent layer placements or changed geometry',()=>{
 const route=makePart('stair-route',{position:[20,7,-12],rotation:[0,.6,0]}),parts=[route];
 parts.push(...createInstanceCopies(parts,new Set([route.id])));parts[1].position=[-40,11,30];parts[1].rotation=[0,-.8,0];
 const p=project(parts),before=JSON.stringify(p),result=createSWBF2Package(p,settings),{helpers,mains}=checkAttachments(result);
 assert.ok(mains.every(a=>a.instanceCount===2));assert.ok(helpers.every(a=>a.instanceCount===2&&a.attachmentHardpoint==='root'));
 const single=createSWBF2Package(project([route]),settings);
 for(const helper of helpers){const other=single.manifest.assets.find(a=>a.name===helper.name);assert.ok(other);assert.deepEqual(helper.collisionBodies,other.collisionBodies);assert.deepEqual(result.files.get('msh/'+helper.name+'.msh'),single.files.get('msh/'+other.name+'.msh'));}
 assert.equal(JSON.stringify(p),before);
});

test('native tree leaves retain all hardpoints when collision is attached at the existing root',()=>{
 const p=project([makePart('flora',instantiateFloraTreePreset('endor-woodland-tree'))]),plan=planSWBF2(p,settings),result=createSWBF2Package(p,settings),{mains}=checkAttachments(result);
 assert.equal(mains.reduce((n,a)=>n+a.nativeLeafPatches,0),plan.assets.reduce((n,a)=>n+a.leaves.length,0));
 for(const main of mains){const source=new TextDecoder().decode(result.files.get('msh/'+main.name+'.msh'));assert.ok(source.includes('root\0'));assert.ok(!source.includes('hp_collision_'));for(let i=0;i<main.nativeLeafPatches;i++)assert.ok(source.includes('hp_leaf_'+i+'\0'));}
});

test('large helper sets stay attached within the 16-prop limit in scene and single-asset exports',()=>{
 const parts=Array.from({length:150},(_,i)=>makePart('interior',{position:[i%15*12,0,Math.floor(i/15)*12],assemblyId:'bridge',assemblyName:'Bridge'})),p=project(parts);
 for(const output of ['scene','object']){
  const result=createSWBF2Package(p,{...settings,output}),{helpers,mains}=checkAttachments(result);
  assert.ok(mains.length);assert.ok(helpers.length>16);assert.ok(helpers.some(a=>helpers.some(parent=>parent.name===a.attachedTo)));
  assert.equal(result.manifest.assets.reduce((n,a)=>n+(a.primitiveCollision||0)+(a.meshSerializedBoxes||0),0),900,'all primitive and mesh-serialized boxes survive');
 }
});
