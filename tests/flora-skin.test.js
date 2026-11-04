import {testStem,testPlant} from './flora-fixtures.js';
import {skinBone,skinSolid,floraSkinGeometry} from '../src/flora/flora-skin.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {defaultFlora,addFloraAsset,buildFlora,syncFloraSharedJoints} from '../src/flora/flora.js';
import {PROCEDURAL_FLORA,floraAsset,floraPlacementCategory} from '../src/flora/flora-palette.js';
import {disposePart} from '../src/core/geometry.js';

function inspect(geometry){
 const edges=new Map(),adj=new Map();let volume=0;
 const p=geometry.attributes.position;
 for(let i=0;i<geometry.index.count;i+=3){const ids=[0,1,2].map(j=>geometry.index.getX(i+j)),[a,b,c]=ids.map(i=>new T.Vector3().fromBufferAttribute(p,i));volume+=a.dot(b.clone().cross(c))/6;
  for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)||0)+1);if(!adj.has(a))adj.set(a,new Set());if(!adj.has(b))adj.set(b,new Set());adj.get(a).add(b);adj.get(b).add(a);}
 }
 assert.ok(volume>0,'outward-facing skin');assert.ok([...edges.values()].every(x=>x===2),'closed manifold skin');
 const visited=new Set();let components=0;for(const start of adj.keys())if(!visited.has(start)){components++;const queue=[start];visited.add(start);while(queue.length)for(const next of adj.get(queue.pop()))if(!visited.has(next)){visited.add(next);queue.push(next);}}
 return components;
}
function skin(f){const g=new T.Group();buildFlora(g,f,{});const woody=g.children.filter(m=>m.userData.floraComponent==='bark');assert.equal(woody.length,1);return {g,geometry:woody[0].geometry};}

test('sampling reinforcement preserves thin limbs without inflating their visible surface',()=>{
 const trunk=new T.BoxGeometry(4,28,4).translate(0,14,0),branch=new T.CylinderGeometry(.08,.08,8,12,10).rotateZ(-Math.PI/2).translate(5,14,0),solid=skinSolid([branch],'branch'),reinforcement=skinBone(new T.Vector3(1,14,0),new T.Vector3(9,14,0),.02,.02,'branch');reinforcement.reinforcement=true;
 const g=floraSkinGeometry([skinSolid([trunk],'trunk'),solid,reinforcement]);try{assert.equal(inspect(g),1);let checked=0,tip=Infinity;for(let i=0;i<g.attributes.position.count;i++){const p=new T.Vector3().fromBufferAttribute(g.attributes.position,i);tip=Math.min(tip,p.distanceTo(new T.Vector3(9,14,0)));if(p.x>3&&p.x<8){assert.ok(Math.hypot(p.y-14,p.z)<.095,'sampling envelope must not become swollen wood');checked++;}}assert.ok(checked>10);assert.ok(tip<g.userData.skinStep*1.5,'thin endpoint remains represented');}finally{g.dispose();trunk.dispose();branch.dispose();}
});
test('starting with a root renders that root without a preset trunk or connector',()=>{const f=defaultFlora();f.detail='standard';addFloraAsset(f,f.branches[0].id,'flora-taproot',.8);const {g,geometry}=skin(f);try{assert.equal(geometry.userData.floraBodyVolume,true);assert.equal(inspect(geometry),1);assert.ok(geometry.boundingBox.max.y<1.2);assert.ok(geometry.boundingBox.min.y< -1);assert.equal(f.organs[0].at,0);}finally{disposePart(g);}});
test('trunk and branch joints share one closed exterior, including thin tips',()=>{
 for(const detail of ['low','standard']){const f=testPlant();f.detail=detail;const {g,geometry}=skin(f);try{assert.equal(inspect(geometry),1);}finally{disposePart(g);}}
});

test('each authored native joint shape welds into its parent with a single closed exterior',()=>{
 const ids=PROCEDURAL_FLORA.filter(a=>a.profile).map(a=>a.id);
 for(const [i,id] of ids.entries()){
  const f=defaultFlora(),root=addFloraAsset(f,f.branches[0].id,id);
  addFloraAsset(f,root.id,ids[(i+1)%ids.length],1);
  const {g,geometry}=skin(f);try{assert.equal(inspect(geometry),1,id);}finally{disposePart(g);}
 }
});
test('imported body presets fuse with their parent skin without internal shells or loose pieces',()=>{
 for(const a of PROCEDURAL_FLORA.filter(a=>a.category==='Trunks'&&floraPlacementCategory(a)==='Body presets')){const f=testStem();addFloraAsset(f,f.branches[0].id,a.id,.5);const {g,geometry}=skin(f);try{assert.equal(inspect(geometry),1,a.name);}finally{disposePart(g);}}
});
test('a snapped body pivots and scales around the shared joint without generating a connector',()=>{
 const f=testStem(),o=addFloraAsset(f,f.branches[0].id,'flora-taproot',.5),first=skin(f);
 try{const saved=first.geometry.attributes.position.array.slice();o.offset=[1.5,.4,-.6];syncFloraSharedJoints(f);const unchanged=skin(f);try{assert.deepEqual(unchanged.geometry.attributes.position.array,saved);}finally{disposePart(unchanged.g);}
  o.rotation=[.2,.7,.3];o.scale=o.scale.map(x=>x*1.4);syncFloraSharedJoints(f);const changed=skin(f);try{assert.equal(inspect(changed.geometry),1);assert.notDeepEqual(changed.geometry.attributes.position.array,saved);}finally{disposePart(changed.g);}
 }finally{disposePart(first.g);}
});
test('cached skin copies are independent and foliage still has a separate material',()=>{
 const f=testPlant(),a=skin(f),b=skin(f);try{assert.equal(a.g.children.filter(m=>m.userData.floraComponent==='leaf').length,9);assert.notEqual(a.geometry,b.geometry);assert.notEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array);const value=b.geometry.attributes.position.getX(0);a.geometry.attributes.position.setX(0,999);assert.equal(b.geometry.attributes.position.getX(0),value);}finally{disposePart(a.g);disposePart(b.g);}
});

test('finishing a single imported body preserves every authored tip and edited vertex',()=>{
 for(const id of ['flora-forked-bough','flora-twisting-stem']){const f=defaultFlora();f.detail='standard';const o=addFloraAsset(f,f.branches[0].id,id);o.controls={'joint:1':{offset:[.3,.1,0],rotation:[0,0,.3],scale:[1,1,1]}};const edit=new T.Group(),finished=new T.Group();buildFlora(edit,f,{}, {editable:true,live:true});buildFlora(finished,f,{});try{const vertices=g=>{const out=[];g.updateMatrixWorld(true);g.traverse(m=>{if(m.isMesh&&m.userData.floraComponent==='bark')for(let i=0;i<m.geometry.attributes.position.count;i++)out.push(...new T.Vector3().fromBufferAttribute(m.geometry.attributes.position,i).applyMatrix4(m.matrixWorld).toArray());});return out;};assert.deepEqual(vertices(finished),vertices(edit),id);}finally{disposePart(edit);disposePart(finished);}}
});

test('small separate authored parts survive skin cleanup beside a large trunk',()=>{const shapes=[skinBone(new T.Vector3(0,0,0),new T.Vector3(0,3,0),.4,.4,'trunk'),skinBone(new T.Vector3(2,1,0),new T.Vector3(2,1.04,0),.03,.03,'small part')],g=floraSkinGeometry(shapes);try{assert.equal(inspect(g),2);const positions=g.attributes.position;assert.ok(Array.from({length:positions.count},(_,i)=>positions.getX(i)).some(x=>x>1.8));}finally{g.dispose();}});


test('overlapping source shells remain solid while outward and reversed windings agree',()=>{
 for(const reverse of [false,true]){
  const a=new T.BoxGeometry(2,2,2),b=new T.BoxGeometry(2,2,2);b.translate(1,0,0);
  if(reverse)for(const g of [a,b])for(let i=0;i<g.index.count;i+=3){const x=g.index.getX(i);g.index.setX(i,g.index.getX(i+1));g.index.setX(i+1,x);}
  const solid=skinSolid([a,b],'body');for(const x of [-.5,.5,1.5])assert.ok(solid.distance(new T.Vector3(x,.13,.21))<0,'inside solid union');assert.ok(solid.distance(new T.Vector3(3,0,0))>0);a.dispose();b.dispose();
 }
});
