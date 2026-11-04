import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {frameViewportBox} from '../src/editor/viewport-framing.js';

test('framed room bounds remain visible below controls across narrow and desktop viewports',()=>{
 for(const [width,height,inset] of [[960,720,105],[465,720,150],[530,336,120],[250,336,150],[1280,720,0]]){
  const camera=new T.PerspectiveCamera(42,1,.1,250),orbit={target:new T.Vector3(),update(){camera.updateMatrixWorld();}},box=new T.Box3(new T.Vector3(-4,0,-4),new T.Vector3(4,5,4));
  const viewport={getBoundingClientRect:()=>({width,height,top:42}),querySelectorAll:()=>inset?[{getBoundingClientRect:()=>({height:45,bottom:42+inset-12})}]:[]};
  assert.equal(frameViewportBox(camera,orbit,box,viewport),true);
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(camera),screenY=(1-p.y)*height/2;assert.ok(Math.abs(p.x)<=1,JSON.stringify({width,height,p}));assert.ok(screenY>=inset&&screenY<=height,JSON.stringify({width,height,inset,screenY}));assert.ok(p.z>=-1&&p.z<=1);}
 }
});
test('framing handles world scale and distant positions, and leaves empty selections alone',()=>{
 const camera=new T.PerspectiveCamera(42,1,.1,250),orbit={target:new T.Vector3(),update(){camera.updateMatrixWorld();}},box=new T.Box3(new T.Vector3(900,50,-100),new T.Vector3(1100,350,100)),viewport={clientWidth:500,clientHeight:400};
 assert.equal(frameViewportBox(camera,orbit,box,viewport),true);assert.ok(camera.far>250);const before=camera.position.clone();assert.equal(frameViewportBox(camera,orbit,new T.Box3(),viewport),false);assert.deepEqual(camera.position,before);
});
