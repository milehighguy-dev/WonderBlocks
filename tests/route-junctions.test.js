import test from 'node:test';import assert from 'node:assert/strict';import {routeJunctionFixture} from './fixtures/route-junction-fixture.js';import {routeLayout,validateRoute} from '../src/routes/stair-route.js';import {branchRoute,joinRoute,appendRouteSegment,removeRouteSegment} from '../src/routes/route-actions.js';import {validateProject,History} from '../src/core/model.js';import {buildPart,disposePart} from '../src/core/geometry.js';import {Raycaster,Vector3} from '../vendor/three.module.js';
test('split and rejoin remain connected after edits, save and undo; hallway junctions are open',()=>{
 const p=routeJunctionFixture();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);const r=p.parts[0].route,l=routeLayout(r);assert.deepEqual(l[3].start,[1,0,1.5]);assert.deepEqual(l[7].end,[1,0,11.5]);
 const history=new History(p);r.segments[2].width=3;history.push(p);const moved=routeLayout(r);assert.ok(new Vector3(...moved[7].end).distanceTo(new Vector3(1.5,0,11.5))<1e-6);assert.equal(history.undo().parts[0].route.segments[2].width,undefined);delete r.segments[2].width;
 const g=buildPart(p.parts[0]);g.updateMatrixWorld(true);for(const z of [1.5,11.5])for(const y of [1,2.08])assert.equal(new Raycaster(new Vector3(0,y,z),new Vector3(1,0,0),0,2).intersectObject(g,true).length,0,'open wall at junction');disposePart(g);
});
test('branch extension does not copy source attachments; invalid or removed junction references are rejected',()=>{
 let r=routeJunctionFixture().parts[0].route;r=branchRoute(r,0,'right','ramp');const n=appendRouteSegment(r,'landing');assert.equal(n.segments.at(-1).branchFrom,undefined);assert.equal(n.segments.at(-1).joinTo,undefined);const detached=removeRouteSegment(r,0);assert.ok(detached.segments.at(-1).pathStart);assert.equal(detached.segments.at(-1).branchFrom,undefined);
 assert.throws(()=>joinRoute(r,3,7,'left'),/earlier/);const bad=structuredClone(r);bad.segments[3].branchFrom.segment=999;assert.throws(()=>validateRoute(bad));
});

test('joins reject sideways approaches that would leave walls across the path',()=>{const r=routeJunctionFixture().parts[0].route;const branch=branchRoute(r,0,'right','landing');assert.throws(()=>joinRoute(branch,8,2,'right'),/Aim this section/);});
