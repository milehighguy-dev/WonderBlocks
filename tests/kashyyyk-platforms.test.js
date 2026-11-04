import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {KASHYYYK_PLATFORM_STYLES,kashyyykPlatformDefaults} from '../src/platforms/kashyyyk-platforms.js';
import {KASHYYYK_PLATFORMS} from '../src/platforms/data/kashyyyk-platform-source.js';
import {platformPort,platformOutline,platformRailingOutline,appendPlatformSection,validatePlatform} from '../src/platforms/platform.js';
import {bridgeConnectionsFixture} from './fixtures/bridge-connections-fixture.js';
import {resolveRouteLinks} from '../src/routes/route-links.js';
import {groundAt,moveWalker} from '../src/walk/walk-physics.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';

const landing=(style)=>{const p=makePart('platform',{color:'#ffffff',position:[0,20,0]});Object.assign(p.platform,kashyyykPlatformDefaults(style,24));Object.assign(p.platform.sections[0],{kind:'circle',width:24,depth:24});return p;};
test('native circular Kashyyyk posts have their complete footprint supported by the deck after resizing and rotation',()=>{
 for(const style of KASHYYYK_PLATFORM_STYLES){const p=landing(style);p.platform.railing='posts';p.rotation[1]=.65;p.scale=[1.3,1,.8];const s=p.platform.sections[0];s.width=14;s.depth=22;s.rotation=.4;
  const original=platformOutline(p.platform)[0],inner=platformRailingOutline(p.platform)[0];assert.ok(inner.every((v,i)=>Math.abs(v.x-original[i].x*.94)<1e-8&&Math.abs(v.z-original[i].z*.94)<1e-8));
  const root=buildPart(p,{collision:'sync'});root.updateMatrixWorld(true);try{const deck=root.children.filter(m=>m.geometry.userData.platformPart==='deck'),posts=root.children.filter(m=>m.userData.railingPart==='post');assert.ok(posts.length>=12);
   for(const post of posts){const positions=post.geometry.attributes.position;for(let i=0;i<positions.count;i++){const v=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(post.matrixWorld);if(Math.abs(v.y-p.position[1])>1e-4)continue;const hit=groundAt(deck,v.clone().add(new T.Vector3(0,.03,0)),.01,.06);assert.ok(hit,style+' post corner rests on the deck');assert.ok(Math.abs(hit.point.y-v.y)<1e-4);}}
   const guards=root.userData.collision.bodies.filter(b=>b.source==='railing barrier');assert.ok(guards.length,'movement guards remain prepared');
  }finally{disposePart(root);}
 }
 for(const style of ['plain','bespin','kotor-kashyyyk']){const p=landing('kashyyyk-timber');p.platform.style=style;assert.deepEqual(platformRailingOutline(p.platform),platformOutline(p.platform));}
 const p=landing('kashyyyk-thatched');p.platform.sections[0].kind='rectangle';assert.deepEqual(platformRailingOutline(p.platform),platformOutline(p.platform));
});
test('both Kashyyyk landings preserve visible reference triangles, atlas UVs, cutouts and source proportions',()=>{
 for(const [i,style] of KASHYYYK_PLATFORM_STYLES.entries()){
  const p=landing(style);p.platform.supports=true;const g=buildPart(p),ref=KASHYYYK_PLATFORMS[style];g.updateMatrixWorld(true);
  try{assert.equal(geometryStats(g).triangles,[166,354][i]);assert.equal(platformOutline(p.platform)[0].length,12);
   const b=new T.Box3().setFromObject(g);assert.ok(Math.abs(b.max.y-20)<1e-5);assert.ok(Math.abs(b.min.y)<1e-5);
   const uvSource=ref.meshes.flatMap(m=>m.uvs.flat().map(uv=>uv.map(v=>v.toFixed(5)).join(','))),uvBuilt=[];
   for(const m of g.children){if(m.geometry.userData.platformBottomCap)continue;assert.ok(m.material.map);assert.equal(m.geometry.attributes.uv.count,m.geometry.attributes.position.count);const uv=m.geometry.attributes.uv;for(let j=0;j<uv.count;j++)uvBuilt.push([uv.getX(j),uv.getY(j)].map(v=>v.toFixed(5)).join(','));}
   assert.deepEqual(uvBuilt.sort(),uvSource.sort());assert.ok(g.children.some(m=>m.material.alphaTest===.5));
   for(const x of [-7,0,7])for(const z of [-5,0,5]){const hit=groundAt(createWalkCollision([g]),new T.Vector3(x,20.1,z),.1,.4);assert.ok(hit);assert.ok(Math.abs(hit.point.y-20)<1e-5);}
  }finally{disposePart(g);}
 }
});
test('platforms omit pillars by default; optional pillars reach ground after elevation and transform edits',()=>{
 for(const style of ['plain','bespin',...KASHYYYK_PLATFORM_STYLES])for(const kind of ['circle','rectangle','half-circle','compound']){
  const p=landing(KASHYYYK_PLATFORM_STYLES.includes(style)?style:'kashyyyk-timber');p.platform.style=style;
  if(!KASHYYYK_PLATFORM_STYLES.includes(style))p.platform.thickness=1;
  p.platform.sections[0].kind=kind==='compound'?'rectangle':kind;
  if(kind==='half-circle')p.platform.sections[0].depth=12;
  if(kind==='compound')p.platform=appendPlatformSection(p.platform,0,'half-circle','back');
  const before=buildPart(p),body=before.children.map(m=>Array.from(m.geometry.attributes.position.array));
  assert.equal(p.platform.supports,false);assert.ok(before.children.every(m=>m.geometry.userData.platformPart!=='supports'));disposePart(before);
  for(const [y,rotation,scale] of [[20,[0,0,0],[1,1,1]],[40,[0,.6,0],[1.3,2,.8]],[25,[.15,.4,.12],[1,1.5,1]]]){
   p.position=[8,y,-3];p.rotation=rotation;p.scale=scale;p.platform.supports=true;
   const g=buildPart(p);g.updateMatrixWorld(true);try{
    const supports=g.children.filter(m=>m.geometry.userData.platformPart==='supports');assert.ok(supports.length,'enabled supports are present');
    for(const m of supports){const bounds=new T.Box3().setFromObject(m,true);assert.ok(Math.abs(bounds.min.y)<1e-4,'column foot stays on world ground');assert.ok(bounds.max.y>.1&&bounds.max.y<y,'column reaches the underside');}
    assert.deepEqual(g.children.filter(m=>m.geometry.userData.platformPart!=='supports').map(m=>Array.from(m.geometry.attributes.position.array)),body,'enabling supports does not change the deck or body');
    assert.deepEqual(validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Ground supports',parts:[p]}))).parts[0],p);
   }finally{disposePart(g);}
  }
  p.position=[0,-5,0];p.rotation=[0,0,0];p.scale=[1,1,1];const below=buildPart(p);assert.ok(below.children.every(m=>m.geometry.userData.platformPart!=='supports'));disposePart(below);
 }
});
test('resized and rotated native platforms keep all edge references on the visible perimeter',()=>{
 for(const style of KASHYYYK_PLATFORM_STYLES){const p=landing(style),s=p.platform.sections[0];s.width=18;s.depth=30;s.rotation=Math.PI/3;
  const loop=platformOutline(p.platform)[0];for(let edge=0;edge<48;edge++)for(const edgeT of [0,.5,1]){const port=platformPort(p,{partId:p.id,platformSection:s.id,edge,edgeT});assert.ok(port);assert.ok(loop.some((a,i)=>{const b=loop[(i+1)%loop.length],v=new T.Vector2(b.x-a.x,b.z-a.z),q=new T.Vector2(port.local.x-a.x,port.local.z-a.z),t=q.dot(v)/v.lengthSq();return Math.abs(v.cross(q))<1e-6&&t>=-1e-6&&t<=1+1e-6;}));}
 }
});
test('connected sample walks onto both platforms and route endpoints follow resizing and movement',()=>{
 const project=bridgeConnectionsFixture();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);
 const gs=project.parts.filter(p=>p.route||p.platform).map(p=>buildPart(p,{batch:true,parts:project.parts})),collision=createWalkCollision(gs);
 try{for(const r of project.parts.filter(p=>p.route)){let feet=new T.Vector3(...r.position).add(new T.Vector3(0,0,.2));for(let i=0;i<155;i++)feet.copy(moveWalker(collision,feet,new T.Vector3(0,0,.2)));assert.ok(feet.z>r.position[2]+30);assert.ok(Math.abs(feet.y-18)<1e-5);}
  const platform=project.parts.find(p=>p.platform);project.parts[0].route.segments[0].kind='ramp';platform.position[1]+=3;platform.position[2]+=4;platform.platform.sections[0].depth+=6;const resolved=resolveRouteLinks(project.parts),r=resolved[0],port=platformPort(platform,r.route.links.end);assert.ok(Math.abs(r.position[2]+r.route.segments[0].run-port.point.z)<1e-6);assert.ok(Math.abs(r.position[1]+r.route.segments[0].rise-port.point.y)<1e-6);
 }finally{gs.forEach(disposePart);}
});
test('rectangular and half-circle Kashyyyk profiles follow the chosen footprint without underside spikes',()=>{
 for(const style of KASHYYYK_PLATFORM_STYLES)for(const kind of ['rectangle','half-circle'])for(const [width,depth] of [[24,12],[2,1],[8,30]]){
  const p=landing(style),s=p.platform.sections[0];Object.assign(s,{kind,width,depth});p.platform.supports=false;
  const g=buildPart(p);g.updateMatrixWorld(true);
  try{
   assert.ok(g.children.some(m=>m.geometry.userData.platformPart==='trim'));
   assert.ok(g.children.some(m=>m.geometry.userData.platformPart==='fringe')===(style==='kashyyyk-thatched'));
   for(const m of g.children){const vertices=m.geometry.attributes.position;
    assert.ok(m.geometry.attributes.normal.array.every(Number.isFinite));
    for(let i=0;i<vertices.count;i++){
     const x=vertices.getX(i),z=vertices.getZ(i);assert.ok(Math.abs(x)<=width/2+1e-5&&z>=-depth/2-1e-5&&z<=depth/2+1e-5);
     if(kind==='half-circle')assert.ok((x/(width/2))**2+((z+depth/2)/depth)**2<=1+1e-5,'the skin stays inside the semicircular footprint');
    }
    if(m.geometry.userData.platformPart==='fringe'){assert.equal(m.material.userData.walkCollision,false);assert.equal(m.material.alphaTest,.5);}
   }
   const at=new T.Vector3(0,20.1,kind==='half-circle'?-depth/4:0),hit=groundAt(createWalkCollision([g]),at,.1,.4);assert.ok(hit);assert.ok(hit.point.y>=20-1e-5&&hit.point.y<=20.013);
   assert.ok(geometryStats(g).triangles<650,'the extrapolated profile stays inexpensive');
   assert.deepEqual(validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Shaped landing',parts:[p]}))).parts[0],p);
  }finally{disposePart(g);}
 }
});
test('compound and rectangular Kashyyyk outlines retain one continuous floor and serialize their style',()=>{
 for(const style of KASHYYYK_PLATFORM_STYLES){const p=landing(style);p.platform.sections[0].kind='rectangle';p.platform=appendPlatformSection(p.platform,0,'half-circle','back');const g=buildPart(p);g.updateMatrixWorld(true);try{assert.equal(platformOutline(p.platform).length,1);for(const z of [0,8,12,15])assert.ok(groundAt([g],new T.Vector3(0,20.1,z),.1,.4));for(const m of g.children)for(const name of ['position','normal','uv'])assert.ok(Array.from(m.geometry.attributes[name].array).every(Number.isFinite));assert.deepEqual(validateProject({format:'open-building-studio',version:1,name:'Native platform',parts:[p]}).parts[0],p);}finally{disposePart(g);}}
 const p=landing('kashyyyk-timber').platform;for(const bad of [-1,'yes',null]){p.supports=bad;assert.throws(()=>validatePlatform(p));}
});
