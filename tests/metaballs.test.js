import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Vector3} from '../vendor/three.module.js';
import {metaballGeometry,metaballField,defaultMetaballs,addMetaball,removeMetaball} from '../src/parts/metaballs.js';
import {makePart,validateProject,History,mirrorPart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {exportOBJ} from '../src/export/export.js';
const project=p=>({format:'open-building-studio',version:1,name:'Organic',parts:[p]});
test('metaballs blend in an order-independent field; zero blend leaves a separated gap',()=>{
 const data={blend:0,detail:'low',blobs:[{id:'a',position:[-.8,1,0],radius:.65},{id:'b',position:[.8,1,0],radius:.65}]};assert.ok(metaballField(data,0,1,0)>0);data.blend=.4;assert.ok(metaballField(data,0,1,0)<0);const reverse={...data,blobs:[...data.blobs].reverse()};for(const p of [[0,1,0],[.4,1.3,.2],[-1,0,2]])assert.ok(Math.abs(metaballField(data,...p)-metaballField(reverse,...p))<1e-12);
});
test('metaball meshes are finite, closed, outward facing, and detail controls triangle count',()=>{
 let previous=0;for(const detail of ['low','standard','high']){const data={...defaultMetaballs(),detail},g=metaballGeometry(data),edges=new Map(),p=g.attributes.position,n=g.attributes.normal;assert.ok(g.index.count>previous);previous=g.index.count;for(const attr of [p,n,g.attributes.uv])assert.ok(Array.from(attr.array).every(Number.isFinite));for(let i=0;i<g.index.count;i+=3){const ids=[0,1,2].map(k=>g.index.getX(i+k));for(let k=0;k<3;k++){const edge=[ids[k],ids[(k+1)%3]].sort((a,b)=>a-b).join(':');edges.set(edge,(edges.get(edge)||0)+1);}const [a,b,c]=ids.map(j=>new Vector3().fromBufferAttribute(p,j)),normal=b.sub(a).cross(c.sub(a));assert.ok(normal.dot(new Vector3().fromBufferAttribute(n,ids[0]))>0);}assert.ok([...edges.values()].every(v=>v===2));g.dispose();}
});
test('distant small blobs remain visible and export with the cluster',()=>{
 const p=makePart('metaballs');p.metaballs={blend:0,detail:'low',blobs:[{id:'large',position:[-10,1,0],radius:1},{id:'small',position:[10,.2,0],radius:.1}]};const root=new Group(),group=buildPart(p,{batch:true});root.add(group);const pos=group.children[0].geometry.attributes.position;assert.ok(Array.from({length:pos.count},(_,i)=>pos.getX(i)).some(x=>x>9.9));const obj=exportOBJ(root);assert.ok(obj.includes('f '));disposePart(group);
});
test('blob edits round-trip, undo, mirror, and reject invalid data',()=>{
 const p=makePart('metaballs'),history=new History(project(p)),original=structuredClone(p.metaballs);const added=addMetaball(p.metaballs,p.metaballs.blobs[0].id);added.position=[2,3,1];added.radius=1.2;p.metaballs.blend=.4;p.metaballs.detail='low';history.push(project(p));assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project(p)))).parts[0].metaballs,p.metaballs);assert.deepEqual(history.undo().parts[0].metaballs,original);assert.deepEqual(history.redo().parts[0].metaballs,p.metaballs);const mirrored=mirrorPart(p);mirrored.metaballs.blobs[0].radius=3;assert.notEqual(p.metaballs.blobs[0].radius,3);while(p.metaballs.blobs.length>1)assert.equal(removeMetaball(p.metaballs,p.metaballs.blobs[0].id),true);assert.equal(removeMetaball(p.metaballs,p.metaballs.blobs[0].id),false);
 for(const mutate of [d=>d.blobs=[],d=>d.blobs[0].radius=0,d=>d.blobs[0].position[0]=NaN,d=>d.blend=2,d=>d.detail='extreme',d=>d.blobs.push(structuredClone(d.blobs[0]))]){const q=makePart('metaballs');mutate(q.metaballs);assert.throws(()=>validateProject(project(q)));}assert.throws(()=>validateProject(project(makePart('block',{metaballs:defaultMetaballs()}))));
});

test('scaled and rotated blobs generate ellipsoids with closed meshes and validate their transforms',()=>{const p=makePart('metaballs');p.metaballs.blobs[0].scale=[2,1,.6];p.metaballs.blobs[0].rotation=[0,0,Math.PI/2];const g=metaballGeometry(p.metaballs);assert.ok(g.boundingBox.max.y-g.boundingBox.min.y>2.9);assert.ok(g.boundingBox.max.x-g.boundingBox.min.x<1.6);const edges=new Map();for(let i=0;i<g.index.count;i+=3){const ids=[0,1,2].map(k=>g.index.getX(i+k));for(let k=0;k<3;k++){const e=[ids[k],ids[(k+1)%3]].sort((a,b)=>a-b).join(':');edges.set(e,(edges.get(e)||0)+1);}}assert.ok([...edges.values()].every(v=>v===2));g.dispose();assert.deepEqual(validateProject(project(p)).parts[0].metaballs,p.metaballs);for(const key of ['scale','rotation'])for(const value of [[NaN,1,1],[1,2],key==='scale'?[0,1,1]:[100,0,0]]){const q=structuredClone(p);q.metaballs.blobs[0][key]=value;assert.throws(()=>validateProject(project(q)));}});
