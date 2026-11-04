import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {groundAt,moveWalker,cameraPosition} from '../src/walk/walk-physics.js';
import {setCharacterData,buildCharacter,loadCharacter,characterInfo} from '../src/walk/character.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {exportOBJ} from '../src/export/export.js';

test('walk reference falls back to built-in geometry when optional local character assets are absent',async t=>{
 t.mock.method(globalThis,'fetch',async()=>({ok:false,status:404}));
 assert.equal(await loadCharacter(),false);assert.equal(characterInfo.loaded,false);
 const reference=buildCharacter(),bounds=new T.Box3().setFromObject(reference);
 assert.equal(reference.userData.referenceOnly,true);assert.equal(reference.children.length,2);
 assert.ok(Math.abs(bounds.max.y-1.8)<1e-6);disposePart(reference);
});

test('canceling and restarting walk preparation cannot activate an older snapshot',async()=>{
 const {createWalkMode}=await import('../src/walk/walk-mode.js'),previous={document:globalThis.document,window:globalThis.window};
 class Element{constructor(){this.children=new Map();this.appended=[];this.listeners=new Map();}querySelector(s){if(!this.children.has(s))this.children.set(s,new Element());return this.children.get(s);}append(value){this.appended.push(value);}addEventListener(k,f){this.listeners.set(k,f);}hasPointerCapture(){return false;}getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}}
 globalThis.document={createElement:()=>new Element()};globalThis.window=new Element();
 const first=new T.Group(),second=new T.Group();let resolveFirst,resolveSecond;
 first.userData.collision={partId:'old',scale:[1,1,1],status:'updating',bodies:[],whenReady:new Promise(resolve=>{resolveFirst=()=>{first.userData.collision.status='ready';resolve();};})};
 second.userData.collision={partId:'new',scale:[1,1,1],status:'updating',bodies:[],whenReady:new Promise(resolve=>{resolveSecond=()=>{second.userData.collision.status='ready';resolve();};})};
 try{const scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1,.1,1000),viewport=new Element(),orbit={enabled:true,target:new T.Vector3(),update(){}};let roots=[first];const api=createWalkMode({scene,camera,orbit,canvas:new Element(),viewport,roots:()=>roots,onStart(){},onStop(){},invalidate(){}}),help=()=>viewport.appended[0].querySelector('.walk-help').textContent;
  api.start();assert.equal(help(),'Preparing walk view...');api.stop();roots=[second];api.start();resolveFirst();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(help(),'Preparing walk view...');assert.equal(api.active,true);resolveSecond();await new Promise(resolve=>setTimeout(resolve,0));assert.ok(help().startsWith('Click a floor'));api.stop();assert.equal(api.active,false);assert.equal(orbit.enabled,true);assert.equal(camera.near,.1);
 }finally{Object.assign(globalThis,previous);}
});
function box(w,h,d,x,y,z){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial());m.position.set(x,y,z);m.updateMatrixWorld(true);return m;}
test('walk preview climbs low steps, blocks high walls, and ignores hidden/reference geometry',()=>{
 const floor=box(20,.2,20,0,-.1,0),step=box(2,.2,1,0,.1,1),wall=box(4,3,.2,0,1.5,3),roots=[floor,step,wall];
 const climbed=moveWalker(roots,new T.Vector3(0,0,0),new T.Vector3(0,0,1));assert.ok(Math.abs(climbed.y-.2)<1e-6);
 const stopped=moveWalker(roots,new T.Vector3(0,0,2),new T.Vector3(0,0,2));assert.ok(stopped.z<2.9);
 wall.visible=false;assert.ok(moveWalker(roots,new T.Vector3(0,0,2),new T.Vector3(0,0,2)).z>3.5);
 wall.visible=true;wall.userData.referenceOnly=true;assert.ok(moveWalker(roots,new T.Vector3(0,0,2),new T.Vector3(0,0,2)).z>3.5);
 assert.ok(Math.abs(groundAt(roots,new T.Vector3(0,2,0),0,3).point.y)<1e-6);roots.forEach(disposePart);
});
test('third-person camera stops in front of obstructing geometry',()=>{const wall=box(5,5,.2,0,2,2),target=new T.Vector3(0,1,0),desired=new T.Vector3(0,1,4);assert.ok(cameraPosition([wall],target,desired).z<1.9);wall.visible=false;assert.deepEqual(cameraPosition([wall],target,desired).toArray(),desired.toArray());disposePart(wall);});
test('static character preserves metre geometry and project transforms but is excluded from OBJ',()=>{
 setCharacterData({name:'Test reference',height:2,positions:[0,0,0,1,0,0,0,2,0],normals:[0,0,1,0,0,1,0,0,1],uvs:[0,0,1,0,0,1]});const p=makePart('character-reference',{position:[2,3,4]}),scene=new T.Group(),reference=buildPart(p);scene.add(reference);assert.equal(new T.Box3().setFromObject(reference).max.y,5);assert.equal(exportOBJ(scene).includes('\nv '),false);const saved=validateProject({format:'open-building-studio',version:1,name:'Reference',parts:[p]});assert.deepEqual(saved.parts[0].position,[2,3,4]);disposePart(scene);
});

test('holding Space rises continuously, release falls immediately, ceilings and floors stop travel',async()=>{
 const {verticalWalker}=await import('../src/walk/walk-physics.js');const floor=box(10,.2,10,0,-.1,0),ceiling=box(10,.2,10,0,4.1,0),roots=[floor,ceiling];let state={feet:new T.Vector3(),velocity:0};
 for(let i=0;i<5;i++)state=verticalWalker(roots,state.feet,state.velocity,.05,true,2);assert.ok(state.feet.y>.7);
 const before=state.feet.y;state=verticalWalker(roots,state.feet,state.velocity,.05,false,2);assert.ok(state.feet.y<before);
 for(let i=0;i<50;i++)state=verticalWalker(roots,state.feet,state.velocity,.05,true,2);assert.ok(state.feet.y+2<=4.001);assert.ok(state.feet.y>1.9);
 for(let i=0;i<80;i++)state=verticalWalker(roots,state.feet,state.velocity,.05,false,2);assert.ok(Math.abs(state.feet.y)<1e-6);roots.forEach(disposePart);
});
test('reference scale stays fixed through creation, imported project data and geometry',()=>{
 const p=makePart('character-reference',{scale:[3,4,5]});assert.deepEqual(p.scale,[1,1,1]);p.scale=[2,3,4];const saved=validateProject({format:'open-building-studio',version:1,name:'Reference',parts:[p]});assert.deepEqual(saved.parts[0].scale,[1,1,1]);const mesh=buildPart(p);assert.deepEqual(mesh.scale.toArray(),[1,1,1]);disposePart(mesh);
});

test('a low ceiling prevents stepping upward into it, while hidden ceilings do not block steps',()=>{const floor=box(20,.2,20,0,-.1,0),step=box(2,.3,2,0,.15,1.5),ceiling=box(8,.2,8,0,2.15,1),roots=[floor,step,ceiling],feet=new T.Vector3();const blocked=moveWalker(roots,feet,new T.Vector3(0,0,1.5),2);assert.ok(Math.abs(blocked.y)<1e-6);assert.ok(blocked.z<.6);ceiling.visible=false;const clear=moveWalker(roots,feet,new T.Vector3(0,0,1.5),2);assert.ok(Math.abs(clear.y-.3)<1e-6);roots.forEach(disposePart);});

test('long movement sweeps cannot pass through a thin wall at faster walk speeds',()=>{const wall=box(10,4,.04,0,2,1);const moved=moveWalker([wall],new T.Vector3(),new T.Vector3(0,0,4));assert.ok(moved.z<.8);disposePart(wall);});

test('walkthrough releases look capture on blur and exit, and retains doubled movement speeds',async()=>{const {createWalkMode}=await import('../src/walk/walk-mode.js'),previous={document:globalThis.document,window:globalThis.window};class Element{constructor(){this.listeners=new Map();this.children=new Map();this.captures=new Set();}querySelector(s){if(!this.children.has(s))this.children.set(s,new Element());return this.children.get(s);}append(){}addEventListener(k,f){this.listeners.set(k,[...(this.listeners.get(k)||[]),f]);}getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}fire(k,props={}){for(const f of this.listeners.get(k)||[])f({button:0,clientX:50,clientY:50,pointerId:1,preventDefault(){},stopImmediatePropagation(){},...props});}}const win=new Element();let modal=false;globalThis.document={createElement:()=>new Element(),querySelector:()=>modal?{open:true}:null};globalThis.window=win;const floor=box(200,.2,200,0,-.1,0);try{const scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1,.1,1000);camera.position.set(0,5,8);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);let redraws=0;const canvas=new Element(),orbit={enabled:true,target:new T.Vector3(),update(){}},api=createWalkMode({scene,camera,orbit,canvas,viewport:new Element(),roots:()=>[floor],onStart(){},onStop(){},invalidate(){redraws++;}});api.start();canvas.fire('pointerdown');const actor=scene.children[0],start=actor.position.clone();win.fire('keydown',{code:'KeyW'});api.update(.05);assert.ok(Math.abs(actor.position.distanceTo(start)-.25)<1e-5);const next=actor.position.clone();win.fire('keydown',{code:'ShiftLeft'});api.update(.05);assert.ok(Math.abs(actor.position.distanceTo(next)-.45)<1e-5);modal=true;const paused=actor.position.clone();assert.equal(api.update(.05),false);assert.deepEqual(actor.position.toArray(),paused.toArray(),'held movement stops behind a native dialog');modal=false;api.update(.05);assert.deepEqual(actor.position.toArray(),paused.toArray(),'closing a dialog does not leave stale movement keys');canvas.fire('pointerdown',{pointerId:7});assert.ok(canvas.hasPointerCapture(7));win.fire('blur');assert.equal(canvas.hasPointerCapture(7),false);const stopped=actor.position.clone();api.update(.05);assert.ok(actor.position.distanceTo(stopped)<1e-5);const settled=redraws;for(let i=0;i<100;i++)assert.equal(api.update(.016),false);assert.equal(redraws,settled,'standing still does not repaint the full scene');canvas.fire('pointerdown',{pointerId:8});canvas.fire('pointermove',{pointerId:8,clientX:65});assert.ok(redraws>settled,'dragging to look redraws immediately');assert.equal(api.update(.016),true);api.stop();assert.equal(canvas.hasPointerCapture(8),false);assert.equal(api.active,false);assert.equal(orbit.enabled,true);assert.equal(camera.near,.1);}finally{disposePart(floor);Object.assign(globalThis,previous);}});
