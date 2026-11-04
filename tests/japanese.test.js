import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart,validateProject} from '../src/core/model.js';
import {JAPANESE_PARTS} from '../src/parts/japanese.js';
import {castleKeepParts} from '../src/parts/castle-keep.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {captureAssembly,instantiateAssembly} from '../src/core/library.js';
import {exportOBJ} from '../src/export/export.js';
import {placementScale} from '../src/walk/human-scale.js';
import {Group,Raycaster,Vector3,Box3} from '../vendor/three.module.js';

test('castle tier roofs and balconies leave an open center; top roof closes it',()=>{
 for(const type of ['jp-tier-roof','jp-balcony','jp-story','jp-irimoya']){
  const m=buildPart(makePart(type));m.updateMatrixWorld(true);const hits=new Raycaster(new Vector3(0,3,0),new Vector3(0,-1,0)).intersectObject(m,true);
  assert.equal(hits.length>0,type==='jp-irimoya',type);disposePart(m);
 }
});
test('gate and entrance story have clear passages',()=>{
 for(const type of ['jp-gate','jp-entry-story']){const m=buildPart(makePart(type));m.updateMatrixWorld(true);const ray=new Raycaster(new Vector3(0,.5,1.4),new Vector3(0,0,-1),0,1.8);assert.equal(ray.intersectObject(m,true).length,0,type);disposePart(m);}
});

test('red torii has a human-sized open passage, red posts and a dark swept cap',()=>{
 const part=makePart('jp-torii',{scale:placementScale('jp-torii')}),root=buildPart(part);
 try{
  root.updateMatrixWorld(true);
  assert.equal(part.color,'#bd3926');
  const bounds=new Box3().setFromObject(root);assert.ok(bounds.max.y>4&&bounds.min.y>=-1e-6);
  for(const x of [-.5,0,.5])for(const y of [.1,1.1,2.4])assert.equal(new Raycaster(new Vector3(x,y,1),new Vector3(0,0,-1),0,2).intersectObject(root,true).length,0,'clear passage');
  assert.ok(root.children.some(m=>m.material.color.getHexString()==='bd3926'));
  const cap=root.children.find(m=>m.material.color.getHexString()==='242723'&&m.geometry.type==='ExtrudeGeometry');assert.ok(cap);
  const vertices=cap.geometry.attributes.position;let middle=-Infinity,edge=-Infinity;
  for(let i=0;i<vertices.count;i++){const x=Math.abs(vertices.getX(i)),y=vertices.getY(i);if(x<.01)middle=Math.max(middle,y);if(x>1.6)edge=Math.max(edge,y);}
  assert.ok(edge>middle+.1,'lintel tips sweep upward');
  assert.ok(!/NaN|Infinity/.test(exportOBJ(root)));
 }finally{disposePart(root);}
 for(const type of ['stairs','jp-stair'])assert.throws(()=>makePart(type),/Unknown part/);
});
test('compound keep survives save and library round trips and exports finite geometry',()=>{
 {const p={format:'open-building-studio',version:1,name:'Keep fixture',parts:castleKeepParts()};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);assert.equal(p.parts.filter(p=>['jp-tier-roof','jp-irimoya','jp-gable-roof'].includes(p.type)).length,0);assert.ok(p.parts.filter(p=>p.type==='jp-half-roof').length>=22);const g=new Group();for(const part of p.parts)g.add(buildPart(part));const obj=exportOBJ(g);assert.ok(obj.includes('\nf '));assert.ok(!/NaN|Infinity/.test(obj));disposePart(g);const entry=captureAssembly(p.name,p.parts);assert.equal(instantiateAssembly(entry).length,p.parts.length);}
});
test('all Japan parts have distinct IDs and usable bounds',()=>{
 assert.equal(JAPANESE_PARTS.length,32);assert.equal(new Set(JAPANESE_PARTS.map(p=>p.id)).size,JAPANESE_PARTS.length);
 for(const def of JAPANESE_PARTS){const m=buildPart(makePart(def.id)),box=new Box3().setFromObject(m);assert.ok(box.min.y>=-.031,def.id);assert.ok(box.max.y>box.min.y,def.id);disposePart(m);}
});
test('adjacent half-roof panels share their hip seam in world space',()=>{
 const project={parts:castleKeepParts()},a=buildPart(project.parts.find(p=>p.name==='Tier 1 roof • east half')),b=buildPart(project.parts.find(p=>p.name==='Tier 1 roof • front half'));
 const points=m=>{m.updateMatrixWorld(true);const set=[];m.traverse(o=>{if(!o.isMesh||o.material!==m.children[0].material)return;const pos=o.geometry.attributes.position;for(let i=0;i<pos.count;i++)set.push(new Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld));});return set;};
 // Five shared samples (four slope segments), on both top and underside.
 const first=points(a),second=points(b);assert.ok(first.filter(p=>second.some(q=>q.distanceTo(p)<1e-4)).length>=10);disposePart(a);disposePart(b);
});
