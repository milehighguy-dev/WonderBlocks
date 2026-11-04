import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {swbfTreesDemo} from '../examples/generators/swbf-trees-demo.js';
import {floraWeldGeometry,validateFlora,defaultFlora,addFloraAsset,floraOrganMatrix} from '../src/flora/flora.js';
import {PROCEDURAL_FLORA} from '../src/flora/flora-palette.js';
import {floraBodyJointIds} from '../src/flora/flora-body.js';
import {skinBone,skinSolid,floraSkinGeometry} from '../src/flora/flora-skin.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {FLORA_TREE_PRESETS,instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';

function topology(g){
 const p=g.attributes.position,index=g.index,edges=new Map(),adj=new Map();let volume=0;
 for(let i=0;i<index.count;i+=3){const ids=[0,1,2].map(j=>index.getX(i+j)),[a,b,c]=ids.map(i=>new T.Vector3().fromBufferAttribute(p,i));assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()>1e-16);volume+=a.dot(b.clone().cross(c))/6;
  for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)||0)+1);if(!adj.has(a))adj.set(a,new Set());if(!adj.has(b))adj.set(b,new Set());adj.get(a).add(b);adj.get(b).add(a);}}
 const visited=new Set();let components=0;for(const start of adj.keys())if(!visited.has(start)){components++;const queue=[start];visited.add(start);while(queue.length)for(const next of adj.get(queue.pop()))if(!visited.has(next)){visited.add(next);queue.push(next);}}
 return {components,volume,closed:[...edges.values()].every(n=>n===2)};
}

test('SWBF2 tree surfaces reduce wood while preserving closed connected silhouettes and foliage',()=>{
 for(const part of swbfTreesDemo().parts){
  const before=JSON.stringify(part),original=floraWeldGeometry({...part.flora,detail:'low'}),a=topology(original),low=structuredClone(part);low.flora.detail='swbf2';validateFlora(low.flora);
  const reduced=floraWeldGeometry(low.flora),b=topology(reduced);
  try{
   assert.ok(reduced.index.count<original.index.count*.3,part.name+' reduces wood by at least 70%');
   assert.equal(b.closed,true,part.name+' has no cracks or loose edges');assert.equal(b.components,a.components,part.name+' retains its connected parts');
   assert.ok(b.volume/a.volume>.85&&b.volume/a.volume<1.1,part.name+' retains its trunk/root volume');
   const tolerance=original.boundingBox.getSize(new T.Vector3()).length()*.01;
   assert.ok(original.boundingBox.min.distanceTo(reduced.boundingBox.min)<tolerance);assert.ok(original.boundingBox.max.distanceTo(reduced.boundingBox.max)<tolerance);
   assert.deepEqual(low.flora.branches,part.flora.branches);assert.deepEqual(low.flora.organs,part.flora.organs);assert.equal(JSON.stringify(part),before);
   const first=buildPart(low,{collision:false}),second=buildPart(low,{collision:false});
   try{const bark=g=>{let n=0;g.traverse(m=>{if(m.isMesh&&m.userData.floraComponent==='bark')n+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});return n;};assert.equal(bark(first),reduced.index.count/3);assert.equal(bark(second),bark(first));}finally{disposePart(first);disposePart(second);}
  }finally{original.dispose();reduced.dispose();}
 }
});

test('SWBF2 simplification preserves a long thin branch rather than crunching it into the trunk',()=>{
 const trunk=new T.BoxGeometry(4,28,4).translate(0,14,0),branch=new T.CylinderGeometry(.08,.08,8,12,10).rotateZ(-Math.PI/2).translate(5,14,0),bone=skinBone(new T.Vector3(1,14,0),new T.Vector3(9,14,0),.02,.02,'branch');bone.reinforcement=true;
 const shapes=[skinSolid([trunk],'trunk'),skinSolid([branch],'branch'),bone],g=floraSkinGeometry(shapes,'swbf2');
 try{const info=topology(g);assert.equal(info.closed,true);assert.equal(info.components,1);assert.ok(g.boundingBox.max.x>8.8,'branch tip remains');let middle=0;for(let i=0;i<g.attributes.position.count;i++){const p=new T.Vector3().fromBufferAttribute(g.attributes.position,i);if(p.x>3&&p.x<8){assert.ok(Math.hypot(p.y-14,p.z)<.12,'limb stays thin');middle++;}}assert.ok(middle>3);}finally{g.dispose();trunk.dispose();branch.dispose();}
});

test('SWBF2 detail retains the small terminal limbs on every authored branching body',()=>{
 for(const asset of PROCEDURAL_FLORA.filter(a=>a.assembly)){
  const flora=defaultFlora();flora.detail='swbf2';const organ=addFloraAsset(flora,flora.branches[0].id,asset.id);
  const before=JSON.stringify(flora),geometry=floraWeldGeometry(flora),surface=skinSolid([geometry],'result'),matrix=floraOrganMatrix(flora,organ),wood=floraBodyJointIds(asset.id);
  try{
   const tips=asset.skeleton.filter(n=>n.parent&&wood.has(n.id)&&!asset.skeleton.some(child=>child.parent===n.id&&wood.has(child.id)));
   assert.ok(tips.length,asset.name);
   for(const tip of tips){
    const point=new T.Vector3(...tip.point).applyMatrix4(matrix);
    assert.ok(surface.distance(point)<0,asset.name+' retains wood around '+tip.id);
   }
   assert.ok(geometry.index.count/3<geometry.userData.sourceTriangles*(tips.length>1?.5:1),asset.name+' still reduces faces while preserving its limbs');
   if(['flora-antler-base','flora-twin-bough-base','flora-heavy-sapling-base'].includes(asset.id)){
    const info=topology(geometry);assert.equal(info.closed,true);assert.equal(info.components,1);
   }
   assert.equal(JSON.stringify(flora),before,'detail generation preserves the editable joints');
  }finally{geometry.dispose();}
 }
});

test('SWBF2 detail works for a single stem and survives project save/load without changing joints',()=>{
 const flora=defaultFlora();addFloraAsset(flora,flora.branches[0].id,'flora-basic-branch');flora.detail='swbf2';const p=makePart('flora',{flora}),project=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Surface detail',parts:[p]}))),g=buildPart(project.parts[0],{collision:false});
 try{assert.equal(project.parts[0].flora.detail,'swbf2');const wood=g.children.find(m=>m.userData.floraComponent==='bark');assert.equal(topology(wood.geometry).closed,true);assert.equal(wood.geometry.userData.floraSurfaceDetail,'swbf2');}finally{disposePart(g);}
});

test('other flora presets keep complete closed wood and unchanged attached details in SWBF2 mode',()=>{
 for(const preset of FLORA_TREE_PRESETS.filter(p=>p.planet)){
  const {flora}=instantiateFloraTreePreset(preset.id),organs=JSON.stringify(flora.organs);flora.detail='swbf2';validateFlora(flora);
  const g=floraWeldGeometry(flora);if(!g)continue;
  try{const info=topology(g);assert.equal(info.closed,true,preset.name);assert.ok(info.volume>0,preset.name);assert.equal(JSON.stringify(flora.organs),organs,preset.name);assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));}finally{g.dispose();}
 }
});

test('SWBF2 export uses the chosen reduced surface for the visible model, shadow and LOD',()=>{
 const project=swbfTreesDemo();project.parts=project.parts.filter(p=>p.name==='Endor · Forest Redwood');project.parts[0].flora.detail='swbf2';
 const output=createSWBF2Package(project,{aiNavigation:false}),wood=output.manifest.assets.find(a=>a.role==='exterior');
 const visible=floraWeldGeometry(project.parts[0].flora);try{assert.equal(wood.triangles,visible.index.count/3+660);assert.equal(wood.shadowTriangles,visible.index.count/3);}finally{visible.dispose();}assert.ok(wood.lowDetailTriangles<wood.triangles);assert.equal(output.manifest.assets.filter(a=>a.role!=='collision').length,1,'wood and foliage belong to one plant resource');
 const source=[...output.files.entries()].find(([name])=>name.startsWith('source/')&&name.endsWith('.building.json'));
 assert.equal(JSON.parse(typeof source[1]==='string'?source[1]:new TextDecoder().decode(source[1])).parts[0].flora.detail,'swbf2');
});
