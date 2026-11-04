import test from 'node:test';import assert from 'node:assert/strict';
import {defaultRoute,routeLayout,validateRoute,dragDimensions} from '../src/routes/stair-route.js';
import {makePart,validateProject,History} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {Box3,Raycaster,Vector3} from '../vendor/three.module.js';
import {captureAssembly,instantiateAssembly} from '../src/core/library.js';
const flight=()=>({kind:'stairs',run:3,rise:2.5,steps:12,turn:'straight'});
test('straight landings can be shallow independently of width; turns keep connection space',()=>{
 const r=turnRoute('straight');r.segments[1].run=.4;validateRoute(r);
 assert.equal(dragDimensions(r,1,.4,0,0).run,.4);
 r.segments[1].width=3;validateRoute(r);assert.equal(dragDimensions(r,1,.4,0,0).run,.4);
 r.segments[1].turn='right';assert.throws(()=>validateRoute(r));assert.equal(dragDimensions(r,1,.4,0,0).run,3);
});
test('zero rise becomes a flat landing and preserves the flight settings',()=>{
 const r=defaultRoute({width:1.5});Object.assign(r.segments[0],dragDimensions(r,0,3,-.01,Math.atan(.5)));r.segments.push(flight());
 assert.equal(r.segments[0].rise,0);assert.equal(routeLayout(r)[1].start[1],0);validateRoute(r);
 const g=buildPart(makePart('stair-route',{route:r})),flat=g.children[0],box=new Box3().setFromObject(flat);
 assert.equal(flat.geometry.index.count/3,12);assert.ok(Math.abs(box.max.y)<1e-6);assert.equal(r.segments[0].steps,8);disposePart(g);
 r.segments[0].rise=1.5;const restored=buildPart(makePart('stair-route',{route:r}));assert.equal(new Box3().setFromObject(restored.children[0]).max.y,1.5);disposePart(restored);
});
test('ground fill affects only the chosen flight or landing',()=>{
 for(const index of [0,1,2]){
  const r=turnRoute('return-right'),p=makePart('stair-route',{route:r,position:[0,3,0]}),original=buildPart(p);
  r.segments[index].fillToGround=true;const filled=buildPart({...p,route:r});original.updateMatrixWorld(true);filled.updateMatrixWorld(true);
  for(let i=0;i<3;i++){
   const before=new Box3().setFromObject(original.children[i]),after=new Box3().setFromObject(filled.children[i]);
   if(i===index){assert.ok(Math.abs(after.min.y)<1e-5);assert.ok(Math.abs(after.max.y-before.max.y)<1e-5);}
   else assert.deepEqual(after,before);
  }
  const project={format:'open-building-studio',version:1,name:'Mixed supports',parts:[{...p,route:r}]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);
  disposePart(original);disposePart(filled);
 }
});
test('ground fill anchors every support bottom after moving, rotating and scaling',()=>{
 const r=turnRoute('return-right');r.segments.forEach(s=>s.fillToGround=true);
 for(const rotation of [[0,0,0],[.1,.7,.05]]){
 const p=makePart('stair-route',{route:r,position:[2,4,3],rotation,scale:[1.5,2,.8]}),g=buildPart(p);g.updateMatrixWorld(true);let count=0;
 g.traverse(m=>{const mask=m.geometry?.userData.groundVertices;if(!mask)return;const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);assert.ok(Number.isFinite(v.y));if(mask[i]){assert.ok(Math.abs(v.y)<1e-5);count++;}}});
 assert.ok(count>20);assert.ok(Math.abs(new Box3().setFromObject(g,true).min.y)<1e-5);disposePart(g);
 const project={format:'open-building-studio',version:1,name:'Supported stairs',parts:[p]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);
 }
 r.segments[0].fillToGround='yes';assert.throws(()=>validateRoute(r));
});
function turnRoute(turn){return {...defaultRoute({width:1.5}),segments:[flight(),{kind:'landing',run:1.5,rise:1,steps:1,turn},flight()]};}
test('route flights, right-angle landings and switchbacks connect without level jumps',()=>{
 for(const turn of ['straight','left','right','return-left','return-right']){
 const r=turnRoute(turn),layout=routeLayout(r);assert.deepEqual(layout[0].end,layout[1].start);assert.deepEqual(layout[1].end,layout[2].start);assert.equal(layout[1].end[1],2.5);assert.equal(layout[2].end[1],5);
 if(turn.startsWith('return')){assert.ok(Math.abs(Math.abs(layout[2].start[0])-(r.width+r.gap))<1e-6);assert.ok(Math.abs(layout[2].end[2])<1e-6);}
 const g=buildPart(makePart('stair-route',{route:r}));g.updateMatrixWorld(true);
 for(const seg of layout){const s=seg.segment;if(s.kind==='landing')continue;const mid=new Vector3(Math.sin(seg.heading)*s.run*.5+seg.start[0],100,Math.cos(seg.heading)*s.run*.5+seg.start[2]);assert.ok(new Raycaster(mid,new Vector3(0,-1,0)).intersectObject(g,true).length>0);}
 disposePart(g);
 }
});
test('flight mesh keeps correct width and endpoint height',()=>{
 const r=defaultRoute({width:1.5}),g=buildPart(makePart('stair-route',{route:r})),b=new Box3().setFromObject(g);assert.ok(Math.abs(b.min.x+r.width/2)<1e-6);assert.ok(Math.abs(b.max.x-r.width/2)<1e-6);assert.ok(Math.abs(b.max.z-3)<1e-6);assert.ok(Math.abs(b.max.y-1.5)<1e-6);disposePart(g);
 r.segments[0].kind='ramp';const ramp=buildPart(makePart('stair-route',{route:r}));ramp.updateMatrixWorld(true);const hits=new Raycaster(new Vector3(0,10,1.5),new Vector3(0,-1,0)).intersectObject(ramp,true);assert.ok(Math.abs(hits[0].point.y-.75)<1e-6);disposePart(ramp);
});
test('segment edits propagate; routes survive save, undo and reusable object groups',()=>{
 const p=makePart('stair-route',{route:turnRoute('return-right')}),project={format:'open-building-studio',version:1,name:'Stairwell',parts:[p]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);
 const history=new History(project);p.route.segments[0].rise=3;history.push(project);assert.equal(routeLayout(p.route)[2].start[1],3);assert.equal(history.undo().parts[0].route.segments[0].rise,2.5);
 const saved=captureAssembly('Stairwell',[p]),copy=instantiateAssembly(saved);assert.deepEqual(copy[0].route,p.route);copy[0].route.width=2;assert.equal(p.route.width,1.5);
});
test('invalid segment and repetition counts are rejected',()=>{
 for(const value of [0,1.2,65,NaN]){const r=defaultRoute({width:1.5});r.segments[0].steps=value;assert.throws(()=>validateRoute(r));}
 const r=defaultRoute({width:1.5});r.segments[0].turn='right';assert.throws(()=>validateRoute(r));r.segments=[];assert.throws(()=>validateRoute(r));
});

test('left and right use the walking direction, including rotated subsequent flights',()=>{
 for(const turn of ['right','left','return-right','return-left']){
  const entries=routeLayout(turnRoute(turn));const right=turn.includes('right');assert.ok(right?entries[1].end[0]<0:entries[1].end[0]>0);
  if(!turn.startsWith('return'))assert.ok(right?Math.sin(entries[2].heading)<0:Math.sin(entries[2].heading)>0);
 }
});
test('mouse dimensions snap near the reference slope, bypass freely and keep landings flat',()=>{
 const r=defaultRoute({width:1.5}),angle=Math.atan(.5),locked=dragDimensions(r,0,4,2.05,angle,true);
 assert.equal(locked.locked,true);assert.ok(Math.abs(locked.rise-locked.run*.5)<1e-9);
 assert.equal(dragDimensions(r,0,4,2.05,angle,false).rise,2.05);
 assert.equal(dragDimensions(r,0,4,4,angle,true).locked,false);
 r.segments[0].kind='landing';assert.equal(dragDimensions(r,0,5,9,angle,true).rise,r.segments[0].rise);
});
test('different segment widths and thicknesses persist and return landings span both flights',()=>{
 const r=turnRoute('return-right');r.segments[0].width=1;r.segments[0].thickness=.1;r.segments[2].width=2;r.segments[2].thickness=.35;r.segments[1].run=2;
 const entries=routeLayout(r),g=buildPart(makePart('stair-route',{route:r}));g.updateMatrixWorld(true);
 const a=new Box3().setFromObject(g.children.find(m=>m.userData.routeSegment===0)),b=new Box3().setFromObject(g.children.find(m=>m.userData.routeSegment===2)),l=new Box3().setFromObject(g.children.find(m=>m.userData.routeSegment===1));assert.ok(Math.abs(a.max.x-a.min.x-1)<1e-6);assert.ok(Math.abs(b.max.x-b.min.x-2)<1e-6);assert.ok(l.min.x<=b.min.x+1e-6&&l.max.x>=a.max.x-1e-6);assert.equal(entries[2].start[1],2.5);
 const p={format:'open-building-studio',version:1,name:'Variable stair',parts:[makePart('stair-route',{route:r})]};assert.deepEqual(validateProject(p),p);disposePart(g);
 r.segments[0].width=0;assert.throws(()=>validateRoute(r));
});

test('whole-step dragging preserves tread depth while flights remain connected shells',()=>{
 const r=defaultRoute({width:1.5}),depth=r.segments[0].run/r.segments[0].steps;
 const result=dragDimensions(r,0,6,4,Math.atan(.5),false);Object.assign(r.segments[0],{run:result.run,rise:result.rise,steps:result.steps,treadDepth:result.treadDepth,treadThickness:result.treadThickness});
 const after=buildPart(makePart('stair-route',{route:r}));assert.equal(after.children.length,1);assert.equal(r.segments[0].steps,16);assert.equal(r.segments[0].run/r.segments[0].steps,depth);assert.equal(r.segments[0].rise,4);
 after.updateMatrixWorld(true);
 // Every internal riser must have a solid face between successive tread levels.
 for(let i=1;i<16;i++){const y=(i+.5)*4/16,z=i*depth;const hits=new Raycaster(new Vector3(0,y,z-.05),new Vector3(0,0,1),0,.1).intersectObject(after,true);assert.ok(hits.length,'solid riser '+i);assert.ok(Math.abs(hits[0].point.z-z)<1e-5);}
 disposePart(after);
});


test('descending filled stairs triangulate solid sides below every tread and reach ground',()=>{
 const r=defaultRoute({width:1.5});Object.assign(r.segments[0],{rise:-3,run:6,steps:16,fillToGround:true});r.segments.push({kind:'landing',run:2,rise:0,steps:1,turn:'straight',fillToGround:true});
 const g=buildPart(makePart('stair-route',{route:r,position:[0,5,0]}));g.updateMatrixWorld(true);
 for(let i=0;i<16;i++){
  const z=(i+.5)*6/16,top=5-i*3/16;
  const floor=new Raycaster(new Vector3(0,6,z),new Vector3(0,-1,0),0,7).intersectObject(g,true)[0];assert.ok(Math.abs(floor.point.y-top)<1e-5);
  for(const fraction of [.05,.5,.95])for(const sign of [-1,1]){
   const hit=new Raycaster(new Vector3(sign*2,top*fraction,z),new Vector3(-sign,0,0),0,2).intersectObject(g,true)[0];assert.ok(hit,'closed descending support');assert.ok(Math.abs(hit.point.x-sign*.75)<1e-5);
  }
 }
 const landing=new Box3().setFromObject(g.children[1]);assert.equal(landing.min.y,0);assert.equal(landing.max.y,2);disposePart(g);
});

test('descending stairs start flush and end one riser above ground with or without fill',()=>{
 for(const fillToGround of [false,true])for(const scale of [[1,1,1],[1.5,2,.8]]){
  const r=defaultRoute({width:1.5});Object.assign(r.segments[0],{rise:-3,run:6,steps:16,fillToGround});
  const g=buildPart(makePart('stair-route',{route:r,position:[0,3*scale[1],0],scale}));g.updateMatrixWorld(true);
  for(let i=0;i<16;i++){
   const z=(i+.5)*6/16*scale[2],top=(3-i*3/16)*scale[1];
   const hit=new Raycaster(new Vector3(0,10,z),new Vector3(0,-1,0),0,20).intersectObject(g,true)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-top)<1e-5,'tread '+i);
   if(fillToGround)for(const f of [.05,.5,.95])for(const sign of [-1,1]){const side=new Raycaster(new Vector3(sign*4,top*f,z),new Vector3(-sign,0,0),0,5).intersectObject(g,true)[0];assert.ok(side,'solid support '+i);assert.ok(Math.abs(side.point.x-sign*.75*scale[0])<1e-5);}
   // The support must not leave any triangle projecting above the tread.
   const above=new Raycaster(new Vector3(4,top+.02,z),new Vector3(-1,0,0),0,8).intersectObject(g,true);assert.equal(above.length,0);
  }
  disposePart(g);
 }
});
