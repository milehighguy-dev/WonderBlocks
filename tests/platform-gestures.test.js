import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';import {makePart} from '../src/core/model.js';import {partMatrix} from '../src/interiors/entrances.js';
import {platformDragPreview,platformTurnBlocked} from '../src/platforms/platform-gestures.js';import {platformExtensionAnchor,extendPlatformTurn} from '../src/platforms/platform-flow.js';import {layoutPlatform,platformOutline} from '../src/platforms/platform.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const world=(part,x,z)=>new T.Vector3(x,0,z).applyMatrix3(new T.Matrix3().setFromMatrix4(partMatrix(part)));
test('width and depth drags use section axes, account for object scale, and keep the entry fixed',()=>{
 for(const angle of [0,.6,Math.PI/2,Math.PI,-Math.PI/2]){
 const p=makePart('platform',{rotation:[0,.35,0],scale:[2,1,3]}),s=p.platform.sections[0];s.rotation=angle;const before=JSON.stringify(p),back=[s.x-Math.sin(angle)*s.depth/2,s.z-Math.cos(angle)*s.depth/2];
 const width=platformDragPreview(p,0,'width',world(p,Math.cos(angle)*2,-Math.sin(angle)*2)).part.platform.sections[0];near(width.width,12);near(width.depth,8);near(width.x,0);near(width.z,0);
 const depth=platformDragPreview(p,0,'depth',world(p,Math.sin(angle)*3,Math.cos(angle)*3)).part.platform.sections[0];near(depth.depth,11);near(depth.width,8);near(depth.x-Math.sin(angle)*depth.depth/2,back[0]);near(depth.z-Math.cos(angle)*depth.depth/2,back[1]);assert.equal(JSON.stringify(p),before);
 }
});
test('new sections follow rotated arrows at their true local length with stable preview ids',()=>{
 for(const angle of [0,.6,Math.PI/2,Math.PI,-Math.PI/2])for(const turn of ['straight','left','right','back']){
 const p=makePart('platform',{rotation:[0,.3,0],scale:[2,1,3]});p.platform.sections[0].rotation=angle;const anchor=platformExtensionAnchor(p.platform.sections[0],turn,false),delta=world(p,Math.sin(anchor.angle)*5,Math.cos(anchor.angle)*5),options={turn,rounded:false,id:'gesture-section'};
 const a=platformDragPreview(p,0,'extend',delta,options),b=platformDragPreview(p,0,'extend',delta,options);near(a.part.platform.sections.at(-1).depth,5);near(a.part.platform.sections.at(-1).rotation,anchor.angle);assert.equal(platformOutline(a.part.platform).length,1);assert.deepEqual(a,b);
 const inward=platformDragPreview(p,0,'extend',delta.clone().negate(),options);assert.equal(inward.changed,false);assert.deepEqual(inward.part,p);
 }
});
test('rounded turns retain one shared edge while widths, lengths and repeated previews change',()=>{
 const p=makePart('platform');p.platform.sections[0].rotation=.7;const anchor=platformExtensionAnchor(p.platform.sections[0],'left',true),options={turn:'left',rounded:true,id:'turn'};
 const a=platformDragPreview(p,0,'extend',world(p,Math.sin(anchor.angle)*6,Math.cos(anchor.angle)*6),options);assert.equal(a.part.platform.sections.length,3);assert.equal(a.index,2);assert.equal(platformOutline(a.part.platform).length,1);
 assert.equal(platformTurnBlocked(a.part.platform,2,'back',true),true);
 const resized=platformDragPreview(a.part,2,'width',world(a.part,Math.cos(anchor.angle),-Math.sin(anchor.angle))).part;assert.equal(platformOutline(resized.platform).length,1);assert.equal(resized.platform.sections[2].attachment.followWidth,false);
 const shortened=platformDragPreview(a.part,2,'depth',world(a.part,-Math.sin(anchor.angle)*2,-Math.cos(anchor.angle)*2)).part;near(shortened.platform.sections[2].depth,4);assert.equal(platformOutline(shortened.platform).length,1);
});
test('entry-connected platforms cannot extend backward into their route and radius clamps when shrinking',()=>{
 const p=makePart('platform'),s=p.platform.sections[0];p.platform.entry={sectionId:s.id,x:0,z:0};s.radius=4;layoutPlatform(p.platform);assert.equal(platformTurnBlocked(p.platform,0,'back',false),true);
 const resized=platformDragPreview(p,0,'width',new T.Vector3(-3,0,0)).part;near(resized.platform.sections[0].width,2);near(resized.platform.sections[0].radius,1);near(resized.platform.sections[0].z-resized.platform.sections[0].depth/2,0);
});

test('each edge drag moves only that side for rectangular and curved sections',()=>{
 for(const kind of ['rectangle','circle','half-circle','corner'])for(const angle of [0,.7,Math.PI/2])for(const side of ['left','right','front','back']){
  const p=makePart('platform',{rotation:[0,.4,0],scale:[2,1,3]}),s=p.platform.sections[0];s.kind=kind;s.bend='right';s.rotation=angle;if(kind==='half-circle')s.depth=4;
  const wide=side==='left'||side==='right',sign=side==='left'||side==='front'?-1:1,axis=wide?'width':'depth',dx=wide?Math.cos(angle):Math.sin(angle),dz=wide?-Math.sin(angle):Math.cos(angle),before=structuredClone(s);
  const result=platformDragPreview(p,0,'edge:'+side,world(p,dx*sign*2,dz*sign*2)).part,a=result.platform.sections[0];
  near(a[axis],before[axis]+2);near(a[wide?'depth':'width'],before[wide?'depth':'width']);
  near(a.x*dx+a.z*dz-sign*a[axis]/2,before.x*dx+before.z*dz-sign*before[axis]/2);
  const saved=structuredClone(result);layoutPlatform(result.platform);assert.deepEqual(result,saved);assert.equal(platformOutline(result.platform).length,1);
 }
});
test('one-sided edits survive attachment layout and entry anchoring',()=>{
 for(const attached of [false,true])for(const side of ['left','right','front','back']){
  const p=makePart('platform');if(attached)p.platform=extendPlatformTurn(p.platform,0,'straight','rectangle',8,'child',false);else {p.platform.entry={sectionId:p.platform.sections[0].id,x:0,z:0};layoutPlatform(p.platform);}
  const index=attached?1:0,before=structuredClone(p.platform.sections[index]),wide=side==='left'||side==='right',sign=side==='left'||side==='front'?-1:1;
  const result=platformDragPreview(p,index,'edge:'+side,new T.Vector3(wide?sign*2:0,0,wide?0:sign*2)).part,s=result.platform.sections[index];
  near(wide?s.x:s.z,(wide?before.x:before.z)+sign);near(s[wide?'width':'depth'],10);
  const saved=structuredClone(result);layoutPlatform(result.platform);assert.deepEqual(result,saved);assert.equal(platformOutline(result.platform).length,1);
 }
});

test('green trident drags choose a left or right turn from the forward handle',()=>{
 for(const sign of [-1,1]){const p=makePart('platform'),result=platformDragPreview(p,0,'extend',new T.Vector3(sign*6,0,0),{turn:'straight',rounded:true,steer:true,id:'turn'});assert.equal(result.part.platform.sections[1].bend,sign<0?'left':'right');near(result.part.platform.sections[2].depth,6);assert.equal(platformOutline(result.part.platform).length,1);}
});

test('middle decks expose both side branches with rounded turns enabled and support a four-way platform',()=>{
 for(const angle of [0,.7,Math.PI/2]){
  const p=makePart('platform');p.platform.sections[0].rotation=angle;
  p.platform=extendPlatformTurn(p.platform,0,'straight','rectangle',12,'middle',true);
  p.platform=extendPlatformTurn(p.platform,1,'straight','rectangle',8,'end',true);
  const original=structuredClone(p.platform.sections);
  for(const [turn,sign] of [['left',-1],['right',1]]){
   assert.equal(platformTurnBlocked(p.platform,1,turn,true),false);
   const result=platformDragPreview(p,1,'extend',world(p,Math.cos(angle)*sign*6,-Math.sin(angle)*sign*6),{turn,rounded:true,id:turn});p.platform=result.part.platform;
   const child=p.platform.sections.at(-1);assert.equal(child.attachment.sectionId,'middle');assert.equal(child.attachment.branchSide,true);assert.equal(platformOutline(p.platform).length,1);assert.equal(platformTurnBlocked(p.platform,1,turn,true),true);
  }
  assert.deepEqual(p.platform.sections.slice(0,3),original);assert.equal(p.platform.sections.length,5);
  const saved=JSON.parse(JSON.stringify(p.platform));layoutPlatform(saved);assert.deepEqual(saved,p.platform);
 }
});
