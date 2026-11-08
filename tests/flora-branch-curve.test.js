import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {joinedBranchCurve} from '../src/flora/flora-branch-curve.js';

test('a two-joint neutral span has uniform parameters and a valid initial tangent',()=>{
 const a=new T.Vector3(2,3,-4),b=new T.Vector3(-1,7,6),curve=joinedBranchCurve([a.toArray(),b.toArray()]);
 for(const t of [0,1e-5,.125,.25,.5,.75,1]){
  assert.ok(curve.getPoint(t).distanceTo(a.clone().lerp(b,t))<1e-10);
  assert.ok(curve.getTangent(t).dot(b.clone().sub(a).normalize())>1-1e-10);
 }
});

test('joined curves pass through saved controls and use the requested connection directions',()=>{
 const points=[[0,0,0],[0,3,0],[2,6,1]],start=[.4,1,0],end=[1,.3,.2],curve=joinedBranchCurve(points,{startTangent:start,endTangent:end});
 points.forEach((p,i)=>assert.ok(curve.getPoint(i/2).distanceTo(new T.Vector3(...p))<1e-10));
 assert.ok(curve.getTangent(0).dot(new T.Vector3(...start).normalize())>1-1e-10);
 assert.ok(curve.getTangent(1).dot(new T.Vector3(...end).normalize())>1-1e-10);
 assert.ok(curve.getTangent(.5-1e-6).dot(curve.getTangent(.5+1e-6))>1-1e-8,'the end spans also agree at the internal joint');
});
