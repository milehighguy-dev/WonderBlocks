import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {YAVIN_PRESETS} from '../src/parts/yavin-presets.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {physicalSurface} from '../src/collision/object-collision.js';
import {assertClosedSurface} from '../src/collision/collision-geometry.js';
import {applySurface} from '../src/materials/surfaces.js';
const aqueduct=covered=>makePart('stair-route',structuredClone(YAVIN_PRESETS[covered?6:4].preset));
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<2e-4,message+': '+a+' != '+b);

test('floating aqueduct keeps its substantial underside body at constant depth across flat/ramp/flat joins',()=>{
 for(const covered of [false,true])for(const rise of [-5,5]){
  const p=aqueduct(covered);p.position[1]=12;const base=p.route.segments[0];p.route.segments=[{...structuredClone(base),run:8},{...structuredClone(base),kind:'ramp',run:12,rise},{...structuredClone(base),run:7}];const g=buildPart(p,{collision:'sync'}),layout=routeLayout(p.route);g.updateMatrixWorld(true);
  try{
   const bodies=g.children.filter(m=>m.userData.yavinAqueductPart==='underbody');assert.equal(bodies.length,3);
   for(const m of bodies){const l=layout[m.userData.routeSegment],s=l.segment,a=m.geometry.attributes.position;assert.doesNotThrow(()=>assertClosedSurface(physicalSurface(m,new T.Matrix4())));for(let i=0;i<a.count;i++){const z=a.getZ(i)-l.start[2],offset=a.getY(i)-l.start[1]-(s.kind==='landing'?0:s.rise*z/s.run);assert.ok(Math.abs(offset+.5)<1e-5||Math.abs(offset+2.1)<1e-5,'retain the 2.1 m deep body without deepening at section ends');}}
   for(let i=0;i<2;i++){const left=bodies[i].geometry.attributes.position,right=bodies[i+1].geometry.attributes.position,end=layout[i].end,edge=(a)=>Array.from({length:a.count},(_,j)=>Math.abs(a.getZ(j)-end[2])<1e-5?[a.getX(j),a.getY(j),a.getZ(j)]:null).filter(Boolean);const a=edge(left),b=edge(right);assert.ok(a.length&&b.length);for(const p of a)assert.ok(b.some(q=>p.every((v,k)=>Math.abs(v-q[k])<1e-5)),'the next floating section meets the same straight underside');}
  }finally{disposePart(g);}
 }
});

test('aqueduct masonry follows the 3D grade on ramp walls, roof, curbs and soffit',()=>{
 for(const covered of [false,true])for(const rise of [-6,6]){
  const p=aqueduct(covered),s=p.route.segments[0];s.kind='ramp';s.run=12;s.rise=rise;const slope=rise/s.run,g=buildPart(p,{collision:false});
  try{for(const density of [.16,.4]){const counts=new Map();for(const m of [...g.children].filter(m=>m.userData.yavinAqueductPart)){
    applySurface(new T.Group().add(m),m.material,{...p,surface:{preset:'yavin-aqueduct-stone',scale:density}});g.add(m);const a=m.geometry.attributes.position,uv=m.geometry.attributes.uv;
    for(let i=0;i<a.count;i+=3)for(const [j,k] of [[0,1],[1,2],[2,0]]){const p=new T.Vector3().fromBufferAttribute(a,i+j),q=new T.Vector3().fromBufferAttribute(a,i+k);if(Math.abs(p.x-q.x)>1e-5||Math.abs(p.y-slope*p.z-q.y+slope*q.z)>1e-5||Math.abs(p.z-q.z)<1)continue;near(uv.getY(i+j),uv.getY(i+k),'mortar course tracks the ramp rather than world height');near(Math.abs(uv.getX(i+j)-uv.getX(i+k)),p.distanceTo(q)*density,'texture length follows actual surface distance');const kind=m.userData.yavinAqueductPart;counts.set(kind,(counts.get(kind)||0)+1);}
   }
   for(const key of ['underbody','cap',...(covered?['walls','ceiling']:[])])assert.ok(counts.get(key)>0,key+' grade alignment was sampled');
  }}finally{disposePart(g);}
 }
});


test('masonry courses and texture phase meet across flat-to-ramp joins',()=>{
 const p=aqueduct(true),base=p.route.segments[0];p.route.segments=[{...structuredClone(base),run:8},{...structuredClone(base),kind:'ramp',run:12,rise:-6}];const g=buildPart(p,{collision:false});
 try{for(const kind of ['underbody','cap','walls','ceiling']){const samples=[new Map(),new Map()];for(const m of g.children.filter(m=>m.userData.yavinAqueductPart===kind)){const a=m.geometry.attributes.position,n=m.geometry.attributes.normal,uv=m.geometry.attributes.uv;for(let i=0;i<a.count;i++)if(Math.abs(a.getZ(i)-8)<1e-5&&Math.abs(n.getZ(i))<.8){const key=[a.getX(i),a.getY(i),a.getZ(i)].map(v=>Math.round(v*1e5)).join(',');samples[m.userData.routeSegment].set(key,[uv.getX(i),uv.getY(i)]);}}let matches=0;for(const [key,a] of samples[0])if(samples[1].has(key)){const b=samples[1].get(key);near(a[0],b[0],kind+' texture phase at the grade joint');near(a[1],b[1],kind+' mortar course at the grade joint');matches++;}assert.ok(matches>0,kind+' joint sampled');}}
 finally{disposePart(g);}
});
