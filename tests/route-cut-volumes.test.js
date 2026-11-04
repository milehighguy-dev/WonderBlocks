import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject,History} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {defaultHallway} from '../src/routes/hallway.js';
import {routeCutVolumes} from '../src/routes/route-cut-volumes.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';
import {partMatrix} from '../src/interiors/entrances.js';
import {curveMeshPoint} from '../src/routes/curved-route.js';
import {angledLanding} from '../src/routes/angled-landing.js';
const segment=(extra={})=>({kind:'landing',run:10,rise:0,steps:1,turn:'straight',...extra});
const route=(segments=[segment({hallway:defaultHallway()})],extra={})=>makePart('stair-route',{position:[0,1,0],route:{width:4,thickness:.2,gap:.2,segments,...extra}});
const contains=(volumes,p)=>volumes.some(v=>v.planes.every(([x,y,z,d])=>x*p.x+y*p.y+z*p.z+d>=-1e-7));
const hit=(g,x,y)=>{g.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(x,y,-2),new T.Vector3(0,0,1),0,14).intersectObject(g,true).length;};

test('hallways carve a real passage through solids, retain adjacent hull, and restore on removal',()=>{for(const batch of [false,true]){const r=route(),h=makePart('block',{position:[0,-2,5],scale:[20,15,8]}),parts=[h,r],cut=buildPart(h,{batch,parts,openingCuts:prepareInteriorCuts(parts)}),whole=buildPart(h,{batch,parts:[h]});assert.equal(hit(cut,0,3),0);assert.ok(hit(cut,4,3));assert.ok(hit(cut,0,9));assert.ok(hit(whole,0,3));disposePart(cut);disposePart(whole);}});

test('open routes require opt-in and save their clearance and undo state',()=>{const r=route([segment()]),p={format:'open-building-studio',version:1,name:'Cut route',parts:[r]},history=new History(p);assert.equal(routeCutVolumes(r).length,0);r.route.cutThroughSolids=true;r.route.cutHeight=3;history.push(p);const saved=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(saved.parts[0].route.cutHeight,3);const v=routeCutVolumes(saved.parts[0]);assert.ok(contains(v,new T.Vector3(0,3,5)));assert.equal(contains(v,new T.Vector3(0,5,5)),false);assert.equal(routeCutVolumes(history.undo().parts[0]).length,0);assert.ok(routeCutVolumes(history.redo().parts[0]).length);r.route.cutHeight=NaN;assert.throws(()=>validateProject(p));});

test('ramp and stair cuts follow their pitch and preserve fixed world headroom under mirrors and scaling',()=>{for(const kind of ['ramp','stairs'])for(const scale of [[1,1,1],[-2,2,.7]]){const r=route([segment({kind,rise:4,steps:16,hallway:{...defaultHallway(),height:4}})]);r.scale=scale;r.rotation[1]=.6;r.position=[5,2,-3];const m=partMatrix(r),v=routeCutVolumes(r),floor=new T.Vector3(0,2,5).applyMatrix4(m);assert.ok(contains(v,floor.clone().add(new T.Vector3(0,3.8,0))));assert.equal(contains(v,floor.clone().add(new T.Vector3(0,5,0))),false);assert.equal(contains(v,new T.Vector3(3,2,5).applyMatrix4(m)),false);}});

test('curved ascending passages follow faceted arcs without cutting the entire bounding box',()=>{const r=route([segment({kind:'ramp',rise:3,curveAngle:Math.PI/2,hallway:defaultHallway()})]);r.rotation[1]=-.4;const m=partMatrix(r),v=routeCutVolumes(r);for(const z of [1,3,5,7,9]){const p=new T.Vector3(...curveMeshPoint(0,3*z/10,z,10,Math.PI/2)).applyMatrix4(m);assert.ok(contains(v,p.add(new T.Vector3(0,2,0))));}assert.equal(contains(v,new T.Vector3(-3,3,5).applyMatrix4(m)),false);});

test('arbitrary turn landings, return landings and detached branches use their actual footprint',()=>{const a=segment({run:8,turn:'left',turnAngle:Math.PI/3,hallway:defaultHallway()}),r=route([a]),shape=angledLanding({segment:a,width:4,nextWidth:4});assert.ok(contains(routeCutVolumes(r),new T.Vector3(...[shape.end[0],3,shape.end[1]])));const returning=route([segment({run:5,turn:'return-left',hallway:defaultHallway()})]);assert.ok(contains(routeCutVolumes(returning),new T.Vector3(5,3,2)));assert.equal(contains(routeCutVolumes(returning),new T.Vector3(-5,3,2)),false);const branch=route([segment({hallway:defaultHallway()}),segment({run:4,pathStart:{point:[20,0,0],heading:Math.PI/2},hallway:defaultHallway()})]);assert.ok(contains(routeCutVolumes(branch),new T.Vector3(22,3,0)));assert.equal(contains(routeCutVolumes(branch),new T.Vector3(12,3,0)),false);});

test('all hallway styles cut, including peek/open-ceiling variants; independent routes and protected props survive',()=>{for(const style of ['plain','tantive','death-star-prison','hoth-natural']){const r=route([segment({hallway:{...defaultHallway(),style,ceiling:false}})]);assert.ok(routeCutVolumes(r).length);}const r=route(),prop=makePart('block',{interiorProp:true,position:[0,2,5]}),other=route([segment()]),parts=[r,prop,other];const signature=g=>g.children.filter(m=>m.geometry).map(m=>[...m.geometry.attributes.position.array]);for(const p of [prop,other]){const alone=buildPart(p),context=buildPart(p,{parts,openingCuts:prepareInteriorCuts(parts)});assert.deepEqual(signature(context),signature(alone));disposePart(alone);disposePart(context);}});

test('vertical route footprints never generate degenerate infinite cutting planes',()=>{const r=route();r.rotation[0]=Math.PI/2;assert.equal(routeCutVolumes(r).length,0);const hull=makePart('block',{scale:[10,10,10]}),solo=buildPart(hull),cut=buildPart(hull,{parts:[hull,r]});assert.deepEqual([...cut.children[0].geometry.attributes.position.array],[...solo.children[0].geometry.attributes.position.array]);disposePart(solo);disposePart(cut);});
