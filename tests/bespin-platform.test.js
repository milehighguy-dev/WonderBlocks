import test from 'node:test';import assert from 'node:assert/strict';
import {makePart,validateProject} from '../src/core/model.js';import {buildPart} from '../src/core/geometry.js';import {bespinPlatformFixture} from './fixtures/bespin-platform-fixture.js';import {platformRailSpans,platformPorts,platformPort,platformOutline,validatePlatform} from '../src/platforms/platform.js';import {geometryStats} from '../src/core/mesh-budget.js';import * as T from '../vendor/three.module.js';
test('Bespin platform preserves measured saucer proportions and outward faces',()=>{
 const p=bespinPlatformFixture().parts[0],g=buildPart(p),b=new T.Box3().setFromObject(g);assert.ok(Math.abs(b.min.y-2.7)<1e-5);assert.ok(Math.abs(b.max.y-5.12)<1e-5);assert.ok(b.max.x>6.7&&b.max.x<6.9);assert.ok(geometryStats(g).triangles===656);
 g.updateMatrixWorld(true);for(const [origin,dir] of [[[0,10,0],[0,-1,0]],[[0,0,0],[0,1,0]],[[12,4,0],[-1,0,0]]])assert.ok(new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...dir)).intersectObject(g,true).length);
});
test('Bespin rim opens for linked routes and retains existing edge references',()=>{
 const demo=bespinPlatformFixture(),p=demo.parts[0],spans=platformRailSpans(p,demo.parts),mesh=buildPart(p,{parts:demo.parts});assert.ok(spans.reduce((s,[a,b])=>s+a.distanceTo(b),0)<37);
 mesh.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(8,5.06,0),new T.Vector3(-1,0,0));assert.equal(ray.intersectObject(mesh,true).filter(h=>h.object.userData.railingPart==='bespin-rim'&&h.distance<4).length,0);
 const refs=platformPorts(p).map(v=>v.ref);p.platform.style='plain';for(const ref of refs)assert.ok(platformPort(p,ref));
});
test('Bespin compound decks and preset round trip remain finite',()=>{const demo=bespinPlatformFixture();assert.equal(validateProject(JSON.parse(JSON.stringify(demo))).parts[0].platform.style,'bespin');for(const p of demo.parts.filter(p=>p.platform)){const g=buildPart(p,{parts:demo.parts});g.traverse(m=>{if(m.isMesh)for(const v of m.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});}const p=makePart('platform').platform;p.style='unknown';assert.throws(()=>validatePlatform(p));});

test('round rim joints follow the perimeter without spikes',()=>{const p=bespinPlatformFixture().parts[0],g=buildPart(p);g.traverse(m=>{if(m.userData.railingPart!=='bespin-rim')return;const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){const r=Math.hypot(a.getX(i),a.getZ(i));assert.ok(r<=6.00001&&r>=5.74);}});});

test('30-sided Bespin circles retain style-independent edge connections on their visible perimeter',()=>{const p=bespinPlatformFixture().parts[0],s=p.platform.sections[0];assert.equal(platformOutline(p.platform)[0].length,30);for(let edge=0;edge<48;edge++)for(const edgeT of [0,.3,1]){const ref={partId:p.id,platformSection:s.id,edge,edgeT},port=platformPort(p,ref);assert.ok(port);assert.ok(Math.hypot(port.local.x,port.local.z)>5.96);p.platform.style='plain';assert.ok(platformPort(p,ref));p.platform.style='bespin';} });
