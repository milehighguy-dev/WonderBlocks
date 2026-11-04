import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {MOS_EISLEY_PARTS} from '../src/parts/mos-eisley.js';
import {MOS_SOURCE} from '../src/parts/data/mos-eisley-source.js';
import {surfacesForTheme} from '../src/materials/surfaces.js';
import {editMaterial} from '../src/editor/material-editing.js';
import {MOS_CANDIDATES,mosEisleyReview} from '../examples/generators/mos-eisley-demo.js';
import {planSWBF2} from '../src/swbf2/export-swbf2.js';
import {interiorFromShell} from '../src/interiors/interior.js';
import {BASE_BEVEL_HEIGHT,baseSlopeExpansion} from '../src/parts/building-base.js';
import {boxSurface,weldSurface,assertClosedSurface} from '../src/collision/collision-geometry.js';

test('the base bevel proportions follow the stock small-building intermediate ring',()=>{
 const reference=JSON.parse(fs.readFileSync(new URL('../assets/mos-eisley/reference-buildings.json',import.meta.url),'utf8'))['reference-small'];
 const points=reference.meshes.flatMap(m=>Array.from({length:m.positions.length/3},(_,i)=>m.positions.slice(i*3,i*3+3))).filter(([x,y,z])=>x>-4&&x<-3.8&&y<1&&z<-4.1);
 const shoulder=points.reduce((a,b)=>a[1]>b[1]?a:b),toe=points.filter(p=>p[1]===0).sort((a,b)=>a[2]-b[2])[0],bevel=points.filter(p=>p[1]>0&&p[1]<shoulder[1]-.1).sort((a,b)=>a[1]-b[1])[0];
 assert.ok(shoulder&&toe&&bevel);
 const height=bevel[1]/shoulder[1],projection=(shoulder[2]-bevel[2])/(shoulder[2]-toe[2]);
 assert.ok(Math.abs(BASE_BEVEL_HEIGHT-height)<.02);assert.ok(Math.abs(baseSlopeExpansion(height)-projection)<.025,'two facets approximate the measured stock bevel, not a straight ramp');
});

test('stock sample pieces preserve source topology, UVs, scale and ground anchor',()=>{
 assert.equal(MOS_EISLEY_PARTS.length,9);assert.deepEqual(Object.keys(MOS_SOURCE).sort(),MOS_EISLEY_PARTS.map(p=>p.id).sort());
 for(const type of ['mos-vaporator','mos-canopy-round','mos-machinery','mos-salvage','mos-wall','mos-wall-column'])assert.throws(()=>makePart(type),/Unknown part/);
 for(const def of MOS_EISLEY_PARTS){
  const source=MOS_SOURCE[def.id],g=buildPart(makePart(def.id),{collision:false});
  try{
   const box=new T.Box3().setFromObject(g),size=box.getSize(new T.Vector3());assert.ok(Math.abs(box.min.y+(source.groundOffset||0))<1e-5,def.id);
   for(let i=0;i<3;i++)assert.ok(Math.abs(size.getComponent(i)-source.size[i])<1e-4,def.id);
   assert.equal(geometryStats(g).triangles,source.triangles);assert.ok(source.triangles<=420);
   for(const [i,m] of g.children.entries()){
    assert.deepEqual([...m.geometry.attributes.uv.array],source.meshes[i].uv.map(Math.fround));
    assert.ok(m.material.map.isDataTexture);assert.ok(m.geometry.attributes.normal.array.every(Number.isFinite));
   }
  }finally{disposePart(g);}
 }
});

test('review rooms keep their furniture, editable finishes and native export data',()=>{
 assert.deepEqual(MOS_CANDIDATES.map(c=>c.id),['01','02','03','04','05']);
 const p=mosEisleyReview();assert.equal(p.parts.length,27);assert.equal(new Set(p.parts.map(p=>p.assemblyId)).size,5);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
 assert.doesNotThrow(()=>validateProject(JSON.parse(fs.readFileSync(new URL('../examples/projects/mos-eisley-review.building.json',import.meta.url)))));
 for(const prop of p.parts.filter(p=>p.assemblyId==='mos-review-04'&&p.type!=='interior')){
  assert.equal(prop.interiorProp,true);const g=buildPart(prop,{parts:p.parts,collision:false});assert.ok(geometryStats(g).triangles>0,prop.name);disposePart(g);
 }
 const room=p.parts.find(p=>p.type==='interior'),block=p.parts.find(p=>p.type==='block');
 assert.ok(editMaterial(room,'wall',{preset:'mos-stucco'}));assert.equal(room.interior.finishes.wall.preset,'mos-stucco');
 assert.ok(editMaterial(block,'all',{preset:'mos-worn-stucco'}));assert.equal(block.surface.preset,'mos-worn-stucco');
 const plan=planSWBF2(p,{aiNavigation:false,includeCollision:false});assert.ok(plan.assets.length);assert.ok(plan.materials.some(m=>m.texture));
});

test('review finishes are discoverable for blocks and interiors without changing existing themes',()=>{
 const ids=surfacesForTheme('Mos Eisley').map(s=>s.id);assert.equal(ids.length,6);assert.ok(ids.includes('mos-interior-plaster'));assert.ok(ids.includes('plain'));
 assert.ok(!surfacesForTheme('Classical').some(s=>s.id.startsWith('mos-')));
});

test('doorless entries clear the rendered and movement collision passages; narrow jambs meet the floor',()=>{
 for(const suffix of ['a','b']){
  const closed=buildPart(makePart('mos-entry-'+suffix),{collision:false}),open=buildPart(makePart('mos-entry-'+suffix+'-open'),{collision:'sync'}),proxy=new T.Group();
  closed.updateMatrixWorld(true);open.updateMatrixWorld(true);
  for(const body of open.userData.collision.bodies){if(!(body.mask&1))continue;const s=body.surface||boxSurface(body.primitive),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(s.positions.flat(),3));g.setIndex(s.triangles.flat());proxy.add(new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide})));}proxy.updateMatrixWorld(true);
  try{
   const center=new T.Raycaster(new T.Vector3(0,1,4),new T.Vector3(0,0,-1),0,8);assert.ok(center.intersectObject(closed,true).length);
   for(const x of [-.4,0,.4])for(const y of [.1,1,2.2]){const ray=new T.Raycaster(new T.Vector3(x,y,4),new T.Vector3(0,0,-1),0,8);assert.equal(ray.intersectObject(open,true).length,0,suffix+' visible opening');assert.equal(ray.intersectObject(proxy,true).length,0,suffix+' collision opening');}
   if(suffix==='a')for(const g of [closed,open])for(const mesh of g.children.slice(0,2)){mesh.geometry.computeBoundingBox();assert.ok(Math.abs(mesh.geometry.boundingBox.min.y)<1e-6,'architectural jambs reach ground despite the pipe below it');}
  }finally{disposePart(closed);disposePart(open);disposePart(proxy);}
 }
});

test('all entry shells have closed backs, jamb undersides and doorless inner reveals',()=>{
 for(const type of ['mos-entry-a','mos-entry-b','mos-entry-a-open','mos-entry-b-open']){
  const source=MOS_SOURCE[type],shell=source.meshes.filter(m=>['tat2_bldg_set01','tat2_bldg_set03'].includes(m.texture)).map(m=>({positions:Array.from({length:m.positions.length/3},(_,i)=>m.positions.slice(i*3,i*3+3)),triangles:Array.from({length:m.indices.length/3},(_,i)=>m.indices.slice(i*3,i*3+3))}));
  assert.doesNotThrow(()=>assertClosedSurface(weldSurface(shell)),type+' must be a closed solid around its doorway');
  const g=buildPart(makePart(type),{collision:false});g.updateMatrixWorld(true);
  try{
   for(const x of [-1.5,1.5])assert.ok(new T.Raycaster(new T.Vector3(x,1,-6),new T.Vector3(0,0,1),0,12).intersectObject(g,true).length,type+' rear jamb');
   assert.ok(new T.Raycaster(new T.Vector3(0,3,-6),new T.Vector3(0,0,1),0,12).intersectObject(g,true).length,type+' rear header');
   assert.ok(new T.Raycaster(new T.Vector3(1.5,-2,0),new T.Vector3(0,1,0),0,4).intersectObject(g,true).length,type+' underside');
   if(type.endsWith('-open'))for(const direction of [-1,1])assert.ok(new T.Raycaster(new T.Vector3(0,1,-.8),new T.Vector3(direction,0,0),0,4).intersectObject(g,true).length,type+' inner reveal');
  }finally{disposePart(g);}
 }
});

test('the canopy retains its shade and posts without the stock merchandise crate',()=>{
 const source=MOS_SOURCE['mos-canopy'];assert.equal(source.meshes.length,4);assert.ok(source.meshes.every(m=>m.texture==='tat2_bldg_tent'));
 const g=buildPart(makePart('mos-canopy'),{collision:false});g.updateMatrixWorld(true);
 try{
  assert.equal(new T.Raycaster(new T.Vector3(0,2,2),new T.Vector3(0,-1,0),0,2.1).intersectObject(g,true).length,0,'the former crate space is empty');
  const shade=new T.Raycaster(new T.Vector3(0,6,2),new T.Vector3(0,-1,0),0,6).intersectObject(g,true);assert.ok(shade.length&&shade[0].point.y>2.4);
 }finally{disposePart(g);}
});

test('roof vent hood surrounds and shaft ends are closed without replacing its inset grilles',()=>{
 const source=MOS_SOURCE['mos-vent'],surfaces=source.meshes.map(m=>({positions:Array.from({length:m.positions.length/3},(_,i)=>m.positions.slice(i*3,i*3+3)),triangles:Array.from({length:m.indices.length/3},(_,i)=>m.indices.slice(i*3,i*3+3))}));
 assert.doesNotThrow(()=>assertClosedSurface(weldSurface(surfaces)));
 assert.equal(source.meshes[0].indices.length/3,40,'original grille and housing faces are retained');
 assert.ok(source.triangles<=72,'completion remains low poly');
 const root=buildPart(makePart('mos-vent'),{collision:false});root.updateMatrixWorld(true);
 try{
  for(const side of [-1,1])for(const [x,y] of [[.4,.55],[0,.89],[0,.52]])assert.ok(new T.Raycaster(new T.Vector3(x,y,side*2),new T.Vector3(0,0,-side),0,4).intersectObject(root,true).length,'hood surround '+[side,x,y]);
  assert.ok(new T.Raycaster(new T.Vector3(0,-1,0),new T.Vector3(0,1,0),0,2).intersectObject(root,true).length,'shaft underside');
 }finally{disposePart(root);}
});

test('building blocks own their roof rim, including resized geometry and collision',()=>{
 const p=makePart('block',{scale:[7.5,4.2,6.5],parameters:{parapetHeight:.4,parapetThickness:.3}});
 for(const size of [[7.5,4.2,6.5],[-12,7,9]]){
  p.scale=size;const g=buildPart(p,{collision:'sync'});g.updateMatrixWorld(true);
  try{
   const top=x=>new T.Raycaster(new T.Vector3(x,10,0),new T.Vector3(0,-1,0)).intersectObject(g,true)[0].point.y;
   assert.ok(Math.abs(top(0)-size[1])<1e-5,'roof remains recessed');
   assert.ok(Math.abs(top(Math.abs(size[0])/2-.15)-size[1]-.4)<1e-5,'rim keeps its height after resizing');
   assert.ok(Math.abs(top(Math.abs(size[0])/2-.31)-size[1])<1e-5,'rim keeps its thickness after resizing');
   assert.ok(g.userData.collision.bodies.some(b=>b.primitive&&b.primitive.position[1]>size[1]),'raised rim must have physical collision');
  }finally{disposePart(g);}
 }
 const scene=mosEisleyReview();assert.equal(scene.parts.filter(p=>p.parameters?.parapetHeight).length,2);assert.ok(!scene.parts.some(p=>p.name==='Raised roof parapet'));
});

test('adding an interior and saving preserves the integrated roof rim',()=>{
 const source=makePart('block',{scale:[8,4,7],parameters:{parapetHeight:.4,parapetThickness:.3},surface:{preset:'mos-stucco',scale:.25}}),room=interiorFromShell(source);
 assert.deepEqual(room.interior.shell.parapet,{height:.4,thickness:.3});
 const saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Roof rim',parts:[room]}))).parts[0],g=buildPart(saved,{batch:true});
 try{assert.ok(Math.abs(new T.Box3().setFromObject(g).max.y-4.4)<1e-5);}finally{disposePart(g);}
 const invalid=structuredClone(saved);invalid.interior.shell.parapet.height=-1;assert.throws(()=>validateProject({format:'open-building-studio',version:1,name:'Invalid',parts:[invalid]}));
});

test('base slopes widen only the lower wall and retain their dimensions after resizing',()=>{
 for(const scale of [[8,4,7],[-12,6,9]]){
  const p=makePart('block',{scale,parameters:{baseSlopeHeight:.55,baseSlopeProjection:.3}}),g=buildPart(p,{collision:'sync'});g.updateMatrixWorld(true);
  try{
   const width=Math.abs(scale[0]),distance=y=>new T.Raycaster(new T.Vector3(width/2+2,y,0),new T.Vector3(-1,0,0)).intersectObject(g,true)[0].point.x;
   assert.ok(Math.abs(distance(.275)-width/2-.0576923077)<1e-5,'upper bevel is steeper than the broad lower flare');
   assert.ok(Math.abs(distance(1)-width/2)<1e-5,'upper walls keep their original footprint');
   const b=new T.Box3().setFromObject(g);assert.ok(Math.abs(b.max.x-width/2-.3)<1e-5);assert.ok(Math.abs(b.min.y)<1e-5);
   assert.ok(g.userData.collision.bodies.some(b=>b.surface),'the slope must retain shaped mesh collision');
  }finally{disposePart(g);}
 }
});

test('a converted sloped-base interior preserves its foot and leaves doorways clear',()=>{
 const source=makePart('block',{scale:[8,4,7],parameters:{baseSlopeHeight:.55,baseSlopeProjection:.3}}),room=interiorFromShell(source);
 assert.deepEqual(room.interior.shell.baseSlope,{height:.55,projection:.3});
 const shell=room.interior.shell;room.interior.doors=[{axis:'x',line:shell.depth/2-shell.inset,offset:0,width:1.6,height:2.6,kind:'door'}];
 validateProject({format:'open-building-studio',version:1,name:'Flared room',parts:[room]});
 const g=buildPart(room,{batch:true});g.updateMatrixWorld(true);
 try{
  assert.ok(Math.abs(new T.Box3().setFromObject(g).max.z-3.8)<1e-5);
  const ray=x=>new T.Raycaster(new T.Vector3(x,.3,4.5),new T.Vector3(0,0,-1),0,2).intersectObject(g,true);
  assert.equal(ray(0).length,0,'no skirt or lip may obstruct the door');assert.ok(ray(2).length,'base remains beside the door');
 }finally{disposePart(g);}
 const saved=JSON.parse(JSON.stringify(room));saved.interior.shell.baseSlope.projection=-.1;assert.throws(()=>validateProject({format:'open-building-studio',version:1,name:'Invalid foot',parts:[saved]}));
});
