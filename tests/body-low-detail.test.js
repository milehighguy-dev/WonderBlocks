import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {PARTS,makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {lowDetailRule} from '../src/core/detail-level.js';
import {planSWBF2} from '../src/swbf2/export-swbf2.js';
import {selectSurface} from '../src/editor/surface-selection.js';
import {defaultHighway,highwaySamples} from '../src/highways/highway.js';
import {highwayJunctionFixture} from './fixtures/highway-junction-fixture.js';
const count=root=>{let n=0;root.traverse(m=>{if(m.isMesh)n+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});return n;};
const eachPair=(part,check)=>{const before=JSON.stringify(part),full=buildPart(part,{collision:false}),low=buildPart(part,{collision:false,lowDetail:true});try{full.updateMatrixWorld(true);low.updateMatrixWorld(true);check(full,low);assert.equal(JSON.stringify(part),before);}finally{disposePart(full);disposePart(low);}};
const clear=(root,point,direction)=>new T.Raycaster(new T.Vector3(...point),new T.Vector3(...direction),0,10).intersectObject(root,true).length===0;

test('every catalog builder supplies a finite construction LOD without adding triangles or changing the definition',()=>{
 for(const def of PARTS.filter(p=>!['character-reference','flora'].includes(p.id))){const part=makePart(def.id);assert.ok(lowDetailRule(part),def.id);
  eachPair(part,(full,low)=>{
   assert.ok(count(low)>0,def.id+' remains visible');assert.ok(count(low)<=count(full),def.id+' does not increase its budget');
   low.traverse(m=>{if(!m.isMesh)return;for(const a of Object.values(m.geometry.attributes))for(const n of a.array)assert.ok(Number.isFinite(n),def.id+' finite attributes');});
   const hi=new T.Box3().setFromObject(full),lo=new T.Box3().setFromObject(low),size=hi.getSize(new T.Vector3());
   for(const axis of ['x','y','z'])assert.ok(Math.max(Math.abs(hi.min[axis]-lo.min[axis]),Math.abs(hi.max[axis]-lo.max[axis]))<=Math.max(.025,size[axis]*.12),def.id+' keeps its '+axis+' extent');
  });
 }
});

test('curved architectural bodies lower their own profile subdivisions',()=>{
 for(const type of ['ring-body','archbody','flat-arch','bell','waist','onion','saucer','pagoda','pipe','antenna','gear','rock','metaballs','doric','ionic','corinthian','acroterion','temple-roof-complete','temple-entablature','jp-hip-roof','jp-tier-roof','jp-irimoya','jp-gable-roof','jp-karahafu','jp-katomado','jp-torii','ny-barrel','cor-skyscraper-blade','cor-half-round-roof','cor-shoulder','cor-bulb-cap'])eachPair(makePart(type),(full,low)=>assert.ok(count(low)<count(full),type));
});

test('lower-detail arches, shafts, roof openings and entrance stories stay open',()=>{
 for(const type of ['archbody','flat-arch'])eachPair(makePart(type),(full,low)=>{for(const root of [full,low])assert.ok(clear(root,[0,.35,-2],[0,0,1]),type+' arch passage');});
 eachPair(makePart('ring-body',{parameters:{sides:32,wallThickness:15}}),(full,low)=>{for(const root of [full,low])assert.ok(clear(root,[0,2,0],[0,-1,0]),'hollow shaft stays hollow');});
 eachPair(makePart('jp-tier-roof'),(full,low)=>{for(const root of [full,low])assert.ok(clear(root,[0,2,0],[0,-1,0]),'tier roof keeps its central opening');});
 eachPair(makePart('jp-entry-story'),(full,low)=>{for(const root of [full,low])assert.ok(clear(root,[0,.4,2],[0,0,-1])===false,'back wall remains present');for(const root of [full,low])assert.ok(new T.Raycaster(new T.Vector3(0,.4,2),new T.Vector3(0,0,-1),0,1.8).intersectObject(root,true).length===0,'front door stays open');});
});

test('fluted columns keep their circumferential profile and roofs keep their joining footprint',()=>{
 eachPair(makePart('doric'),(full,low)=>{
  const section=root=>{const mesh=root.children.find(m=>m.name==='shaft'),p=mesh.geometry.attributes.position,y=mesh.geometry.boundingBox??(mesh.geometry.computeBoundingBox(),mesh.geometry.boundingBox),set=new Set();for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-y.min.y)<1e-5)set.add([p.getX(i),p.getZ(i)].map(n=>n.toFixed(5)).join(','));return [...set].sort();};assert.deepEqual(section(low),section(full));
 });
 eachPair(makePart('cor-half-round-roof'),(full,low)=>{
  const foot=root=>{const result=new Set();root.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i))<1e-6)result.add([p.getX(i),p.getZ(i)].map(n=>n.toFixed(5)).join(','));});return [...result].sort();};assert.deepEqual(foot(low),foot(full));
 });
});

test('rock LOD vertices retain the same seeded strata instead of rerolling the rock',()=>{
 for(const seed of [1,4,19])eachPair(makePart('rock',{parameters:{roughness:.22,seed,taper:.3}}),(full,low)=>{const points=new Set(Array.from({length:full.children[0].geometry.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(full.children[0].geometry.attributes.position,i).toArray().join(',')));const p=low.children[0].geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(points.has(new T.Vector3().fromBufferAttribute(p,i).toArray().join(',')));});
});

test('already-small stock atlas parts retain all source faces, material charts and UVs',()=>{
 for(const def of PARTS.filter(p=>p.category==='Mos Eisley'))eachPair(makePart(def.id),(full,low)=>{
  assert.equal(count(low),count(full));assert.equal(low.children.length,full.children.length);
  for(let i=0;i<full.children.length;i++){for(const name of ['position','uv','normal'])assert.deepEqual(low.children[i].geometry.attributes[name].array,full.children[i].geometry.attributes[name].array);assert.deepEqual(low.children[i].geometry.index.array,full.children[i].geometry.index.array);assert.equal(low.children[i].material.map,full.children[i].material.map);}
 });
});

test('manual facet paint keeps its authored boundaries and textures at a distance',()=>{
 const part=makePart('round'),root=buildPart(part,{collision:false});root.updateMatrixWorld(true);
 try{const hit=new T.Raycaster(new T.Vector3(2,.4,1),new T.Vector3(-2,0,-1).normalize(),0,5).intersectObject(root,true)[0],selected=selectSurface(hit,root);selected.face.finish={color:'#a83c29',preset:'brick',scale:.5};part.faceFinishes=[selected.face];selected.geometry.dispose();}
 finally{disposePart(root);}
 const project={format:'open-building-studio',version:1,name:'Painted body',parts:[part]},options={shadows:false,includeCollision:false,aiNavigation:false},plan=planSWBF2(project,options),asset=plan.assets[0];assert.deepEqual(asset.lowDetailSegments,asset.segments);
});

test('distant platform supports reduce sides while preserving the deck edge and rail openings',()=>{
 const part=makePart('platform',{position:[0,15,0]});part.platform.supports=true;
 eachPair(part,(full,low)=>{assert.ok(count(low)<count(full));const deck=root=>root.children.filter(m=>m.geometry.userData.platformPart!=='supports').map(m=>Array.from(m.geometry.attributes.position.array));assert.deepEqual(deck(low),deck(full));});
});

test('metaball LODs keep small detached lobes as well as the large body',()=>{
 const part=makePart('metaballs');part.metaballs.blend=0;part.metaballs.blobs=[{id:'large',position:[0,0,0],radius:1},{id:'small',position:[5,0,0],radius:.12}];
 eachPair(part,(full,low)=>{assert.ok(count(low)<count(full));for(const root of [full,low])for(const x of [0,5])assert.ok(!clear(root,[x,2,0],[0,-1,0]),'lobe at '+x+' survives');});
});

test('highway LOD samples the same curve and endpoints while joined networks retain their shared seams',()=>{
 const h={...defaultHighway(),width:4,nodes:[{point:[0,0,0],tangent:[0,0,6]},{point:[14,6,18],tangent:[6,2,0]},{point:[30,3,12],tangent:[4,-1,-5]}]},full=highwaySamples(h),low=highwaySamples(h,{lowDetail:true});
 assert.ok(low.length<full.length);assert.deepEqual(low[0].point.toArray(),full[0].point.toArray());assert.deepEqual(low.at(-1).point.toArray(),full.at(-1).point.toArray());
 eachPair(makePart('highway',{highway:h}),(full,low)=>assert.ok(count(low)<count(full)));
 const fixture=highwayJunctionFixture(),part=fixture.parts[0],hi=buildPart(part,{parts:fixture.parts,collision:false}),lo=buildPart(part,{parts:fixture.parts,collision:false,lowDetail:true});
 try{assert.deepEqual(lo.children.map(m=>Array.from(m.geometry.attributes.position.array)),hi.children.map(m=>Array.from(m.geometry.attributes.position.array)));}finally{disposePart(hi);disposePart(lo);}
});

test('Bespin platform LOD preserves its deck outline while simplifying the underside profile',()=>{
 const part=makePart('platform');part.platform.style='bespin';part.platform.railing='none';part.platform.sections[0].kind='circle';part.platform.sections[0].width=12;part.platform.sections[0].depth=12;
 eachPair(part,(full,low)=>{assert.ok(count(low)<count(full));const top=root=>{const set=new Set();root.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i))<1e-5)set.add([p.getX(i),p.getZ(i)].join(','));});return [...set].sort();};assert.deepEqual(top(low),top(full));});
});

test('all export modes use body construction rules while their full-detail mesh stays identical',()=>{
 for(const type of ['ionic','jp-hip-roof','cor-half-round-roof','rock','metaballs','ring-body','ny-barrel','mos-arch'])for(const output of ['scene','object','mesh']){
  const part=makePart(type),project={format:'open-building-studio',version:1,name:'LOD body',parts:[part]},settings={output,shadows:false,includeCollision:false,aiNavigation:false};
  const full=planSWBF2(project,{...settings,lowDetail:false}),low=planSWBF2(project,{...settings,lowDetail:true});
  assert.deepEqual(low.assets.map(a=>a.segments),full.assets.map(a=>a.segments),type+' keeps the main mesh');
  for(const a of low.assets){assert.ok(a.lowDetailSegments.length);assert.deepEqual(a.lowDetailRules,[lowDetailRule(part)]);}
 }
});
