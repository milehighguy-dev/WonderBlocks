import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {mergeNavigationBarriers} from '../src/swbf2/swbf2-navigation-barriers.js';

const bar=(start,end,z=0,kind='edge',partId='deck',height=2)=>({a:new T.Vector3(start,height,z),b:new T.Vector3(end,height,z),width:.22,flags:3,partId,kind});
test('projected edge and railing duplicates combine while preserving their source and height range',()=>{
 const source=[bar(0,4),bar(4,8),bar(0,8,.08,'railing','deck',6)],before=JSON.stringify(source),result=mergeNavigationBarriers(source,()=>false);
 assert.equal(result.length,1);assert.equal(result[0].kind,'railing');assert.deepEqual(result[0].sourceKinds,['edge','railing']);assert.deepEqual(result[0].sourceHeightRange,[2,6]);assert.ok(Math.abs(result[0].width-.3)<1e-7);assert.equal(result[0].a.x,0);assert.equal(result[0].b.x,8);assert.equal(JSON.stringify(source),before);
});
test('barrier merging preserves door gaps, separate strips and differing unit flags',()=>{
 assert.equal(mergeNavigationBarriers([bar(0,4),bar(5,8)],()=>false).length,2);
 assert.equal(mergeNavigationBarriers([bar(0,4),bar(0,4,.3)],()=>false).length,2);
 assert.equal(mergeNavigationBarriers([bar(0,4),{...bar(0,4),flags:1}],()=>false).length,2);
});

test('touching spans across objects collapse to one barrier with all sources retained',()=>{
 const source=[bar(0,2),bar(6,8,0,'wall','last',8),bar(4,6),bar(2,4,0,'railing','middle',4)],result=mergeNavigationBarriers(source,()=>false);
 assert.equal(result.length,1);assert.equal(result[0].a.x,0);assert.equal(result[0].b.x,8);assert.equal(result[0].kind,'wall');assert.equal(result[0].partId,'last');assert.deepEqual(new Set(result[0].partIds),new Set(['deck','last','middle']));assert.deepEqual(result[0].sourceHeightRange,[2,8]);
});

test('overlapping thick wall estimates retain their exact rectangular union without a width cutoff',()=>{
 const result=mergeNavigationBarriers([bar(0,8),bar(0,8,.2)],()=>false,{maxWidth:.32});assert.equal(result.length,1);assert.ok(Math.abs(result[0].width-.42)<1e-7);
 // Staggered thick spans would invent blocked corners: the width bound applies.
 assert.equal(mergeNavigationBarriers([bar(0,4),bar(2,8,.2)],()=>false,{maxWidth:.32}).length,2);
});

test('a contained estimate is removed even when it has a different orientation and source height',()=>{
 const outer={...bar(0,10),width:2},inner={...bar(0,1,0,'wall','other',20),a:new T.Vector3(5,20,-.5),b:new T.Vector3(5,20,.5)};
 const result=mergeNavigationBarriers([outer,inner],()=>false);assert.equal(result.length,1);assert.equal(result[0].width,2);assert.deepEqual(new Set(result[0].partIds),new Set(['deck','other']));assert.deepEqual(result[0].sourceHeightRange,[2,20]);
});
test('a broader merged footprint is refused when it would obstruct verified planning',()=>{
 const source=[bar(0,4),bar(4,8,.08)],result=mergeNavigationBarriers(source,proposal=>proposal.width>.25);
 assert.equal(result.length,2);assert.ok(result.every(b=>b.width===.22));
});
