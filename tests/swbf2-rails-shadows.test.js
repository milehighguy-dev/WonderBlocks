import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {defaultRoute,routeLayout} from '../src/routes/stair-route.js';
import {defaultRailing} from '../src/routes/railings.js';
import {railingBarriers} from '../src/collision/collision-guards.js';
import {createSWBF2Package,planSWBF2} from '../src/swbf2/export-swbf2.js';
import {closedShadow} from '../src/swbf2/swbf2-binary.js';
import {kotorRailingDefaults} from '../src/routes/kotor-kashyyyk.js';
import {curveMeshPoint} from '../src/routes/curved-route.js';
import {KASHYYYK_PLATFORM_STYLES,kashyyykPlatformDefaults} from '../src/platforms/kashyyyk-platforms.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createObjectCollision} from '../src/collision/object-collision.js';
const project=parts=>({format:'open-building-studio',version:1,name:'Bridge regression',parts});
function hit(surfaces,origin,direction){const ray=new T.Ray(new T.Vector3(...origin),new T.Vector3(...direction)),point=new T.Vector3();return surfaces.some(s=>s.triangles.some(t=>ray.intersectTriangle(...t.map(i=>new T.Vector3(...s.positions[i])),false,point)));}
function children(bytes){const out=[];for(let at=0;at<bytes.length;){const tag=new TextDecoder().decode(bytes.subarray(at,at+4)),n=new DataView(bytes.buffer,bytes.byteOffset+at).getUint32(4,true);out.push([tag,bytes.subarray(at+8,at+8+n)]);at+=8+n;}return out;}
function shadows(bytes){const result=[];function walk(bytes){for(const [tag,b] of children(bytes)){if(['HEDR','MSH2','MODL','GEOM','SEGM'].includes(tag))walk(b);if(tag==='SHDW'){const v=new DataView(b.buffer,b.byteOffset),n=v.getUint32(0,true),positions=Array.from({length:n},(_,i)=>[0,1,2].map(j=>v.getFloat32(4+12*i+4*j,true))),count=v.getUint32(4+12*n,true),triangles=Array.from({length:count/3},(_,i)=>[0,1,2].map(j=>v.getUint16(8+12*n+8*(3*i+j),true)));result.push({positions,triangles});}}}walk(bytes);return result;}

test('Kashyyyk timber and thatched platforms cast closed body shadows across all footprints',()=>{
 for(const style of KASHYYYK_PLATFORM_STYLES)for(const kind of ['circle','rectangle','half-circle']){
  const part=makePart('platform');Object.assign(part.platform,kashyyykPlatformDefaults(style,12));Object.assign(part.platform.sections[0],{kind,width:12,depth:kind==='half-circle'?6:12});
  const group=buildPart(part,{collision:'sync'});try{
   const hint=group.children.find(m=>m.userData.shadowVolume);assert.ok(hint,style+' '+kind);const volume=hint.userData.shadowVolume;assert.doesNotThrow(()=>closedShadow(volume.positions,volume.triangles));
   const before=createObjectCollision(part,group);delete hint.userData.shadowVolume;assert.deepEqual(createObjectCollision(part,group),before,'shadow hint never changes prepared collision');
  }finally{disposePart(group);}
  const output=createSWBF2Package(project([part]),{aiNavigation:false}),asset=output.manifest.assets.find(a=>a.role==='exterior'),volumes=shadows(output.files.get('msh/'+asset.name+'.msh'));
  assert.ok(asset.shadowTriangles>0,style+' '+kind+' body casts a shadow');for(const s of volumes)assert.doesNotThrow(()=>closedShadow(s.positions,s.triangles));
  for(const x of [-2,0,2])for(const z of [-1,0,1])assert.ok(hit(volumes,[x,-20,z],[0,1,0]),style+' '+kind+' covers underside '+[x,z]);
 }
});

test('KOTOR boardwalk material splits cast a complete deck shadow and retain a distant model',()=>{
 for(const angle of [0,1.5,-1.5])for(const kind of ['landing','ramp','stairs']){
  const route=defaultRoute();route.width=4;route.segments=[{kind,run:8,rise:kind==='landing'?0:2,steps:12,turn:'straight',curveAngle:angle,railing:kotorRailingDefaults()}];
  const output=createSWBF2Package(project([makePart('stair-route',{route})]),{aiNavigation:false});
  for(const asset of output.manifest.assets.filter(a=>a.role!=='collision')){assert.ok(asset.lowDetailTriangles>0,kind+' retains LOD even when already simple');assert.ok(Buffer.from(output.files.get('msh/'+asset.name+'.msh')).includes(Buffer.from('visible_lowrez')));}
  const asset=output.manifest.assets.find(a=>a.role==='exterior'),volumes=shadows(output.files.get('msh/'+asset.name+'.msh'));
  for(const s of volumes)assert.doesNotThrow(()=>closedShadow(s.positions,s.triangles));
  for(const t of [.1,.3,.5,.7,.9]){const p=curveMeshPoint(0,-3,8*t,8,angle);p[0]*=-1;assert.ok(hit(volumes,p,[0,1,0]),kind+' deck casts at station '+t+' bend '+angle);}
 }
});
test('joined bridge sections keep closed deck shadows from underneath',()=>{
 const route=defaultRoute();route.segments=Array.from({length:6},(_,i)=>({kind:i%2?'landing':'stairs',run:3,rise:i%2?0:1,steps:38,turn:'straight',railing:defaultRailing()}));
 const part=makePart('stair-route',{route}),output=createSWBF2Package(project([part])),asset=output.manifest.assets.find(a=>a.role==='exterior'),volumes=shadows(output.files.get('msh/'+asset.name+'.msh'));
 assert.ok(volumes.length);assert.ok(asset.shadowTriangles>12);for(const s of volumes)assert.doesNotThrow(()=>closedShadow(s.positions,s.triangles));
 for(const l of routeLayout(route))for(const t of [.15,.5,.85])assert.ok(hit(volumes,[l.start[0],l.start[1]-2,l.start[2]+l.segment.run*t],[0,1,0]),'every deck section must cast a shadow from below');
});
test('post gaps block walking while route ends and disabled sides remain open',()=>{
 const route=defaultRoute();route.width=4;route.segments=[{kind:'landing',run:8,rise:0,steps:4,turn:'straight',railing:{...defaultRailing(),style:'posts',spacing:4,sides:'left'}}];
 const part=makePart('stair-route',{route}),barriers=railingBarriers(part,new T.Matrix4()).get(0);
 for(const z of [.2,1,2,3,4,5,6,7.8])for(const y of [.1,.55,1])assert.ok(hit(barriers,[0,y,z],[1,0,0]));
 assert.equal(hit(barriers,[0,.55,4],[-1,0,0]),false);assert.equal(hit(barriers,[0,.55,4],[0,0,-1]),false);assert.equal(hit(barriers,[0,.55,4],[0,0,1]),false);
 const plan=planSWBF2(project([part]));assert.ok(plan.assets.some(a=>a.primitives.some(p=>p.source==='railing barrier')));
});
test('sloping and curved barriers remain closed and follow the route',()=>{
 for(const style of ['posts','kashyyyk-suspension','kotor-kashyyyk']){const route=defaultRoute();route.width=3;route.segments=[{kind:'ramp',run:8,rise:2,steps:4,turn:'straight',curveAngle:Math.PI/2,railing:{...defaultRailing(),style}}];const part=makePart('stair-route',{route}),map=railingBarriers(part,new T.Matrix4());assert.ok(map.get(0).length>2);for(const s of map.get(0))assert.doesNotThrow(()=>closedShadow(s.positions,s.triangles));}
});
test('branch junctions remain passable through continuous guard collision',()=>{
 const route=defaultRoute(),railing={...defaultRailing(),style:'posts'};route.width=4;route.segments=[{kind:'landing',run:14,rise:0,steps:1,turn:'straight',railing},{kind:'landing',run:5,rise:0,steps:1,width:2,turn:'straight',branchFrom:{segment:0,side:'left'},railing}];
 const part=makePart('stair-route',{route}),barriers=railingBarriers(part,new T.Matrix4()).get(0);
 assert.equal(hit(barriers,[0,.55,7],[1,0,0]),false);assert.equal(hit(barriers,[0,.55,3],[1,0,0]),true);assert.equal(hit(barriers,[0,.55,11],[1,0,0]),true);
});
