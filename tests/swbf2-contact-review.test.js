import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewContactPolygons,reviewContactSurface,summarizeContactReviews} from '../src/swbf2/swbf2-contact-review.js';
import {classifyContactReview,collisionHelperLayout} from '../src/swbf2/swbf2-collision-helpers.js';
import {boxSurface} from '../src/collision/collision-geometry.js';
import {recommendCollisionHelpers,createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {acornTowerFixture} from './fixtures/acorn-tower.js';

const triangle=[[-.01,0,-.01],[0,0,.01],[.01,0,-.01]];
const triangles=n=>Array.from({length:n},()=>triangle);
const surface=polygons=>({positions:polygons.flat(),triangles:polygons.map((p,i)=>[i*3,i*3+1,i*3+2])});

test('64-triangle preparation target is not mistaken for native contact capacity',()=>{
 for(const count of [64,65,99]){
  const review=reviewContactPolygons(triangles(count));assert.equal(review.infantry.maximumVertices,count*3);assert.equal(classifyContactReview(review).infantryCrowding,false);
 }
 const review=reviewContactPolygons(triangles(100));assert.equal(review.infantry.maximumVertices,300);assert.equal(classifyContactReview(review).infantryCrowding,true);
 const bodies=[0,1].map(i=>({mask:23,collisionGroup:i,surface:surface(triangles(50))})),r=collisionHelperLayout({primitives:[],bodies},new Set()).recommendation;
 assert.equal(r.required,false);assert.equal(r.recommended,true);assert.ok(r.reasons.includes('infantry-crowding'));
});

test('native polygons are counted with their actual vertex storage',()=>{
 const polygon=Array.from({length:80},(_,i)=>{const angle=-i/80*Math.PI*2;return [.01*Math.cos(angle),0,.01*Math.sin(angle)];});
 const review=reviewContactPolygons([polygon,polygon,polygon,polygon]);assert.equal(review.infantry.maximumPolygons,4);assert.equal(review.infantry.maximumVertices,320);assert.equal(classifyContactReview(review).infantryCrowding,true);
});

test('category masks exclude vehicle queries from soldier/projectile mesh profiles',()=>{
 const review=reviewContactPolygons(triangles(110),17);assert.ok(review.infantry.flaggedSamples);assert.equal(review.vehicle.samples,0);
 const vehicles=reviewContactPolygons(triangles(110),2);assert.equal(vehicles.infantry.samples,0);assert.ok(vehicles.vehicle.flaggedSamples);
});

test('total object size and total mesh triangles do not determine local density',()=>{
 const faces=Array.from({length:150},(_,i)=>triangle.map(([x,y,z])=>[x+i*10,y,z])),review=reviewContactPolygons(faces);
 assert.equal(review.infantry.maximumPolygons,1);assert.equal(review.vehicle.maximumPolygons,1);assert.deepEqual(classifyContactReview(review).reasons,[]);
});

test('embedded analytic vehicle blockers can accompany a soldier/projectile mesh',()=>{
 const p={shape:4,mask:2,dimensions:[1,2,1],position:[0,0,0],rotation:[0,0,0,1]},asset={primitives:[p],bodies:[{mask:17,surface:boxSurface(p)}]},r=collisionHelperLayout(asset,new Set([p]),false);
 assert.equal(r.recommendation.required,false);assert.equal(r.meshGroups.size,1);assert.equal(r.nativePrimitives.length,1);assert.equal(r.recommendation.contactReview.vehicle.samples,0);
});

test('Acorn Tower defaults to embedded collision with a vehicle advisory',()=>{
 const p=acornTowerFixture(),before=JSON.stringify(p),r=recommendCollisionHelpers(p,{output:'object'});
 assert.equal(r.recommended,false);assert.equal(r.required,false);assert.ok(r.reasons.includes('vehicle-review'));assert.equal(r.contactReview.infantry.flaggedSamples,0);assert.ok(r.contactReview.vehicle.flaggedSamples>0);
 assert.equal(r.contactReview.infantry.maximumPolygons,36);assert.equal(r.contactReview.vehicle.maximumPolygons,140);
 const out=createSWBF2Package(p,{output:'object',separateCollisionHelpers:r.recommended,shadows:false,lowDetail:false});assert.equal(out.manifest.assets.length,1);assert.equal(out.manifest.asset.collisionHelpers.length,0);assert.ok(out.manifest.warnings.some(w=>w.includes('does not prove collision helpers')));
 assert.equal(JSON.stringify(p),before);
});

test('compiled stock buildings do not acquire helper recommendations from vehicle-only flags',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/stock-collision-review.json',import.meta.url),'utf8'));
 assert.equal(fixture.models.length,23);
 for(const model of fixture.models){const r=classifyContactReview(summarizeContactReviews(model.meshes.map(m=>m.review)));assert.equal(r.infantryCrowding,false,model.name);}
 const main=fixture.models.find(m=>m.name==='myg1_bldg_central_building');assert.equal(main.meshes[0].polygons,854);assert.equal(main.primitiveCount,46);assert.equal(classifyContactReview(main.meshes[0].review).vehicleReview,true);
 assert.ok(fixture.models.some(m=>m.name==='tat2_bldg_dockingbay_01'));assert.ok(fixture.models.some(m=>m.name==='Cor1_bldg_Grand_hall'));assert.ok(fixture.models.some(m=>m.name==='yav2_bldg_Temple'));
});
