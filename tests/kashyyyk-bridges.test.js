import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {bridgeFixture} from './fixtures/bridge-connections-fixture.js';
import {KASHYYYK_BRIDGE_STYLES,bridgeStyleDefaults} from '../src/routes/kashyyyk-bridges.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {groundAt,moveWalker,firstWalkHit} from '../src/walk/walk-physics.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {curveMeshPoint} from '../src/routes/curved-route.js';
import {routeFinishParts,routeMeshPart} from '../src/routes/route-finishes.js';
import {KASHYYYK_BRIDGES} from '../src/routes/data/kashyyyk-bridge-source.js';

test('two native bridge samples preserve source UVs and original low polygon budgets',()=>{
 const project=bridgeFixture();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);
 for(const [i,p] of project.parts.filter(p=>p.route).entries()){const g=buildPart(p);let count=0;try{g.traverse(m=>{if(m.isMesh)count+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});assert.equal(count,[102,532][i]);assert.equal(g.children.filter(m=>m.userData.routeFloor).length,1,'native deck replaces the generic floor instead of overlapping it');for(const m of g.children){assert.ok(m.material.map);assert.equal(m.material.map.image.width,m.geometry.userData.bridgePart!=='deck'?512:i===1?256:128);assert.equal(m.geometry.attributes.uv.count,m.geometry.attributes.position.count);}}finally{disposePart(g);}}
});
test('rigid timber has a level deck, flush entrances and the original underside without row-height spikes',()=>{
 const source=KASHYYYK_BRIDGES.kas2_bldg_bridge[0],top=Math.max(...source.positions.map(p=>p[2])),xs=source.positions.map(p=>p[0]),ys=source.positions.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),center=(Math.min(...ys)+Math.max(...ys))/2;
 for(const width of [2,5.6,8])for(const rise of [0,2,-2]){
  const p=bridgeFixture().parts[0];p.route.width=width;const s=p.route.segments[0];s.kind=rise?'ramp':'landing';s.rise=rise;p.position=[0,0,0];const g=buildPart(p);g.updateMatrixWorld(true);
  try{for(const x of [-width*.25,0,width*.25])for(const z of [.3,1,4,8,13,18,23,26.7]){const y=rise*z/s.run,hit=groundAt([g],new T.Vector3(x,y+.1,z),.1,.3);assert.ok(hit,'floor remains solid, including the end tongues');assert.ok(Math.abs(hit.point.y-y)<1e-6,'walking surface follows one plane');}
   const pos=g.children[0].geometry.attributes.position,k=width/(Math.max(...ys)-Math.min(...ys));
   for(const [x,y,h] of source.positions.filter(p=>p[2]<.3)){const z=(xmax-x)/(xmax-xmin)*s.run,expected=new T.Vector3((y-center)*k,rise*z/s.run+(h-top)*k,z);assert.ok(Array.from({length:pos.count},(_,i)=>new T.Vector3().fromBufferAttribute(pos,i)).some(v=>v.distanceTo(expected)<2e-6),'underside uses the single rigid deck datum');}
  }finally{disposePart(g);}
 }
});
test('suspension details use the exact Blender BF1 atlas and preserve all native rope and strut UVs',()=>{
 const g=buildPart(bridgeFixture().parts[1]);
 try{for(const source of KASHYYYK_BRIDGES.kas2_bridge_1.slice(1)){
  const m=g.children.find(m=>m.geometry.userData.bridgeSource===source.name);assert.ok(m);
  assert.equal(m.material.map.image.width,512);
  assert.equal(createHash('sha256').update(m.material.map.image.data).digest('hex'),'4cdc0d66cd0eb436f83604b852c5e1f30f78e29f0d969c595d818231e283edc3','same filename in BF2 has a different atlas layout');
  assert.equal(m.material.roughness,1);assert.equal(m.material.metalness,0);
  const uv=m.geometry.attributes.uv;assert.deepEqual(Array.from({length:uv.count},(_,i)=>[uv.getX(i),uv.getY(i)]),source.uvs.flatMap(tri=>[tri[0],tri[2],tri[1]]));
 }}finally{disposePart(g);}
 const p=makePart('stair-route',{route:{width:3,thickness:.18,gap:.15,segments:[{kind:'landing',run:6,rise:0,steps:1,turn:'left',railing:bridgeStyleDefaults('kashyyyk-suspension')}]}}),corner=buildPart(p);
 try{const m=corner.children.find(m=>m.geometry.userData.bridgeSource==='corner cable');assert.ok(m);const uv=m.geometry.attributes.uv,vs=KASHYYYK_BRIDGES.kas2_bridge_1.find(m=>m.name==='bridge_cable_1').uvs.flat().map(p=>p[1]);for(let i=0;i<uv.count;i++)assert.ok(uv.getY(i)>=Math.min(...vs)&&uv.getY(i)<=Math.max(...vs),'corner ropes remain in the rope strip');}finally{disposePart(corner);}
});
test('both bridge decks can be crossed with the ordinary walker',()=>{
 for(const p of bridgeFixture().parts.filter(p=>p.route)){const g=buildPart(p);g.updateMatrixWorld(true);try{let feet=new T.Vector3(...p.position).add(new T.Vector3(0,0,.3));feet.copy(groundAt([g],feet,.5,1).point);for(let i=0;i<130;i++)feet.copy(moveWalker([g],feet,new T.Vector3(0,0,.2)));assert.ok(Math.abs(feet.z-p.position[2]-26.3)<1e-6);assert.ok(Math.abs(feet.y-p.position[1])<.1);}finally{disposePart(g);}}
});
test('suspension keeps its original reed alpha fringe separate from the solid walking deck, including after batching',()=>{
 for(const batch of [false,true]){
  const p=bridgeFixture().parts[1],g=buildPart(p,{batch});g.updateMatrixWorld(true);
  try{
   const fringe=g.children.find(m=>m.material.userData.walkCollision===false);assert.ok(fringe);
   assert.equal(fringe.geometry.attributes.position.count/3,32,'authored fringe triangles are preserved');
   assert.equal(fringe.material.alphaTest,.5);assert.equal(fringe.material.side,T.DoubleSide);
   const texture=fringe.material.map,alphas=Array.from(texture.image.data).filter((_,i)=>i%4===3);
   assert.equal(texture.image.width,256);assert.equal(Math.min(...alphas),0);assert.equal(Math.max(...alphas),255);
   const pos=fringe.geometry.attributes.position,center=new T.Vector3();for(let i=0;i<3;i++)center.add(new T.Vector3().fromBufferAttribute(pos,i));center.divideScalar(3).applyMatrix4(fringe.matrixWorld);
   const ray=new T.Raycaster(center.clone().add(new T.Vector3(0,2,0)),new T.Vector3(0,-1,0),0,4);
   assert.ok(ray.intersectObject(fringe).length,'fringe has visible geometry');
   assert.equal(firstWalkHit([fringe],ray),undefined,'decorative cutout has no phantom collision');
   assert.equal(firstWalkHit(createWalkCollision([fringe]),ray),null,'walk acceleration excludes fringe too');
   for(const x of [-1.6,0,1.6])assert.ok(groundAt(createWalkCollision([g]),new T.Vector3(...p.position).add(new T.Vector3(x,.1,13)),.1,.4),'solid deck stays walkable across its width');
  }finally{disposePart(g);}
 }
});
test('bridge styles follow bends, slopes, stairs and turn landings without losing normal route floors',()=>{
 for(const style of KASHYYYK_BRIDGE_STYLES)for(const segment of [{kind:'ramp',run:12,rise:2,curveAngle:Math.PI/2},{kind:'stairs',run:12,rise:2,steps:16},{kind:'landing',run:6,rise:0,turn:'left'},{kind:'landing',run:6,rise:0,turn:'return-right'}]){
  const p=makePart('stair-route',{route:{width:3,thickness:.18,gap:.15,segments:[{steps:1,turn:'straight',...segment,railing:bridgeStyleDefaults(style)}]}}),g=buildPart(p);g.updateMatrixWorld(true);try{for(const m of g.children)for(const name of ['position','normal','uv'])for(const v of m.geometry.attributes[name]?.array??[])assert.ok(Number.isFinite(v));assert.ok(g.children.some(m=>m.userData.routeFloor));if(segment.curveAngle){for(const z of [1,4,8,11]){const pos=new T.Vector3(...curveMeshPoint(0,2*z/12+.5,z,12,segment.curveAngle)),hit=groundAt([g],pos,.1,1);assert.ok(hit,'curved native floor remains solid');assert.ok(Math.abs(hit.point.y-2*z/12)<.2);}}}finally{disposePart(g);}
 }
});
test('branch junction retains its full floor footprint and opens the suspension cable and braces',()=>{
 const p=makePart('stair-route',{route:{width:4,thickness:.18,gap:.15,segments:[{kind:'landing',run:20,rise:0,steps:1,turn:'straight',railing:bridgeStyleDefaults('kashyyyk-suspension')},{kind:'landing',run:6,rise:0,steps:1,turn:'straight',width:3,branchFrom:{segment:0,side:'left'},railing:{style:'none'}}]}}),g=buildPart(p);g.updateMatrixWorld(true);try{
  for(const x of [1.8,2,2.2])assert.ok(groundAt([g],new T.Vector3(x,.2,10),.1,.5),'no gap at the landing junction');
  const ray=new T.Raycaster(new T.Vector3(0,1,10),new T.Vector3(1,0,0),0,5);assert.equal(ray.intersectObjects(g.children).length,0,'side entrance is clear at body height');
 }finally{disposePart(g);}
});
test('bridge deck, cables and supports have independent saved finishes',()=>{
 const p=bridgeFixture().parts[1];p.route.segments[0].componentFinishes={deck:{color:'#345678',surface:{preset:'wood',scale:2}},rails:{color:'#123456'},posts:{color:'#6789ab'}};assert.deepEqual(routeFinishParts(p.route.segments[0]),['deck','rails','posts']);const g=buildPart(p);try{for(const m of g.children){const key=routeMeshPart(m);assert.equal(m.material.color.getHexString(),p.route.segments[0].componentFinishes[key].color.slice(1));}assert.deepEqual(validateProject({format:'open-building-studio',version:1,name:'Bridge finishes',parts:[p]}).parts[0],p);}finally{disposePart(g);}
});
