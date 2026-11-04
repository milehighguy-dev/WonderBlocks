import test from 'node:test';
import assert from 'node:assert/strict';
import {dragScale,limitScaleTravel} from '../src/editor/scale-drag.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} versus ${b}`);

test('uniform snapping preserves the proportions of thin and unequal dimensions',()=>{
 const start=[20,.08,12],result=dragScale(start,'XYZ',160*Math.log(1.1),.1);
 result.forEach((v,i)=>near(v/start[i],1.1));
 assert.deepEqual(dragScale(start,'XYZ',0,.1),start);
});
test('uniform scaling stops all dimensions together at the model limits',()=>{
 const start=[800,.08,500],grown=dragScale(start,'XYZ',10000,.1),shrunk=dragScale(start,'XYZ',-10000,.1);
 near(grown[0],1000);grown.forEach((v,i)=>near(v/start[i],1.25));
 near(shrunk[1],.05);shrunk.forEach((v,i)=>near(v/start[i],.625));
});
test('axis and planar scaling affect only the chosen dimensions and retain reflection signs',()=>{
 const start=[-4,2,8],pixels=160*Math.log(2);
 assert.deepEqual(dragScale(start,'X',pixels),[-8,2,8]);
 assert.deepEqual(dragScale(start,'XY',pixels),[-8,4,8]);
 for(const value of [-1e5,0,1e5]){
  const result=dragScale(start,'XYZ',value);assert.ok(result[0]<0&&result[1]>0&&result[2]>0);
  result.forEach(v=>assert.ok(Number.isFinite(v)&&Math.abs(v)>=.05&&Math.abs(v)<=1000));
 }
});
test('reversing a drag at a limit responds without unwinding excess mouse travel',()=>{
 const start=[800,.08,500];
 for(const snap of [null,.1]){
  const edge=limitScaleTravel(start,'XYZ',10000,snap);
  near(dragScale(start,'XYZ',edge,snap)[0],1000);
  assert.ok(dragScale(start,'XYZ',edge-12,snap)[0]<1000);
 }
});
test('unsnapped scaling is smooth, reversible and stable from an exact center start',()=>{
 const start=[3,.05,11];let previous=1;
 for(let pixels=0;pixels<=160;pixels++){
  const result=dragScale(start,'XYZ',pixels);assert.ok(result[0]/start[0]>=previous);previous=result[0]/start[0];
  result.forEach((v,i)=>near(v/start[i],previous));
 }
 assert.deepEqual(dragScale(start,'XYZ',0),start);
});
