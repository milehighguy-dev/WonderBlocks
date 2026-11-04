import test from 'node:test';import assert from 'node:assert/strict';
import {canAddInterior,supportsInteriorType,defaultInterior,interiorWalls,validateInterior,cutawayInterior,interiorFromShell,resizeRoomEdge,shellBounds,setShellInset} from '../src/interiors/interior.js';
import {makePart,validateProject,History,mirrorPart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';import {geometryStats} from '../src/core/mesh-budget.js';
import {Vector3,Raycaster,Box3} from '../vendor/three.module.js';import {exportOBJ} from '../src/export/export.js';
import {captureAssembly,instantiateAssembly} from '../src/core/library.js';
const project=p=>({format:'open-building-studio',version:1,name:'Interior test',parts:[p]});
function pair(){const p=defaultInterior();p.height=3;p.rooms.push({id:'room-2',x:6,z:0,w:4,d:5});return p;}
test('touching rooms share one continuous partition, including partial edges',()=>{const p=pair();const walls=interiorWalls(p);assert.equal(walls.filter(w=>w.shared).length,1);assert.deepEqual(walls.find(w=>w.shared),{axis:'z',line:6,start:0,end:5,shared:true,key:'z:6:0:5'});p.rooms[1].d=3;assert.equal(interiorWalls(p).filter(w=>w.shared).length,1);assert.equal(interiorWalls(p).find(w=>w.shared).end,3);});
test('door is a real passage with intact side walls and header; materials and batching stay small',()=>{const interior=pair();interior.doors=[{wall:'z:6:0:5',offset:2.5,width:1.2,height:2.2}];const g=buildPart(makePart('interior',{interior}),{batch:true});g.updateMatrixWorld(true);const hits=(y,z)=>new Raycaster(new Vector3(5,y,z),new Vector3(1,0,0),0,2).intersectObject(g,true);assert.equal(hits(1,2.5).length,0);assert.ok(hits(2.5,2.5).length>0);assert.ok(hits(1,1).length>0);assert.ok(geometryStats(g).triangles<200);assert.ok(geometryStats(g).meshes<=6);assert.equal(new Raycaster(new Vector3(3,1,2),new Vector3(1,0,0),0,2).intersectObject(g,true).length,0);disposePart(g);});
test('interiors preserve rooms and finishes through saves, copies, object groups and undo',()=>{const p=makePart('interior',{interior:pair()});const saved=validateProject(JSON.parse(JSON.stringify(project(p))));assert.deepEqual(saved.parts[0].interior,p.interior);const copy=mirrorPart(p);copy.interior.rooms[0].w=3;assert.equal(p.interior.rooms[0].w,6);const entry=captureAssembly('Rooms',[p]);assert.deepEqual(instantiateAssembly(entry)[0].interior,p.interior);const history=new History(project(p));p.interior.height=4;history.push(project(p));assert.equal(history.undo().parts[0].interior.height,3);});
test('cutaway hides only ceilings and retains full export geometry',()=>{const g=buildPart(makePart('interior'),{batch:true});const before=exportOBJ(g);cutawayInterior(g,true);assert.ok(g.children.some(m=>m.userData.interiorCeiling&&!m.visible));assert.ok(g.children.filter(m=>!m.userData.interiorCeiling).every(m=>m.visible));assert.equal(exportOBJ(g),before);cutawayInterior(g,false);assert.ok(g.children.every(m=>m.visible));assert.ok(!/NaN|Infinity/.test(before));disposePart(g);});
test('reject overlapping rooms, malformed dimensions, absent walls, and blocked doors',()=>{const p=pair();p.rooms[1].x=5;assert.throws(()=>validateInterior(p),/overlap/);p.rooms[1].x=6;p.height=NaN;assert.throws(()=>validateInterior(p));p.height=3;p.doors=[{wall:'missing',offset:2,width:1,height:2}];assert.throws(()=>validateInterior(p));p.doors[0].wall='z:6:0:5';p.doors[0].width=10;assert.throws(()=>validateInterior(p));});
test('hollowing an existing transformed body preserves its exact outer envelope and identity',()=>{
 const source=makePart('block',{position:[7,2,-3],rotation:[0,.6,0],scale:[-12,8,10],color:'#628a79',surface:{preset:'stone',scale:2},pattern:{mode:'stretch',texture:[1,1,1]},assemblyId:'district'});
 const before=buildPart(source),part=interiorFromShell(source),after=buildPart(part,{batch:true});
 assert.equal(part.id,source.id);assert.equal(part.assemblyId,source.assemblyId);assert.deepEqual(part.position,source.position);assert.deepEqual(part.rotation,source.rotation);assert.equal(part.interior.finishes.outside.color,source.color);assert.equal(part.interior.finishes.outside.preset,'stone');
 const a=exactBounds(before),b=exactBounds(after);assert.ok(a.min.distanceTo(b.min)<1e-5);assert.ok(a.max.distanceTo(b.max)<1e-5);
 assert.deepEqual(validateProject(project(part)).parts[0].interior,part.interior);assert.equal(source.type,'block');assert.equal(source.interior,undefined);disposePart(before);disposePart(after);
});
test('shell door cuts completely through the inset and cutaway retains full OBJ geometry',()=>{
 const part=interiorFromShell(makePart('block',{scale:[12,8,10]})),p=part.interior,b=shellBounds(p),front=interiorWalls(p).find(w=>w.axis==='x'&&w.line===b.minZ);
 p.doors=[{wall:front.key,offset:0,width:1.2,height:2.2}];const g=buildPart(part,{batch:true});g.updateMatrixWorld(true);
 assert.equal(new Raycaster(new Vector3(0,1,-6),new Vector3(0,0,1),0,2).intersectObject(g,true).length,0);
 assert.ok(new Raycaster(new Vector3(2,1,-6),new Vector3(0,0,1),0,2).intersectObject(g,true).length>0);
 assert.equal(new Raycaster(new Vector3(0,1,0),new Vector3(1,0,0),0,4).intersectObject(g,true).length,0);
 const obj=exportOBJ(g);cutawayInterior(g,true);assert.equal(exportOBJ(g),obj);assert.ok(g.children.some(m=>m.userData.interiorCeiling&&!m.visible));disposePart(g);
});
test('dragging a shared wall resizes both rooms and retains its doorway',()=>{
 const p=pair();p.doors=[{wall:'z:6:0:5',offset:2.5,width:1.2,height:2.2}];const next=resizeRoomEdge(p,'room-1','right',7);
 assert.equal(next.rooms[0].w,7);assert.equal(next.rooms[1].x,7);assert.equal(next.rooms[1].w,3);assert.equal(next.doors[0].wall,'z:7:0:5');assert.equal(p.rooms[0].w,6);
 assert.throws(()=>resizeRoomEdge(p,'room-1','right',9),/at least 2/);
 const back=resizeRoomEdge(next,'room-2','left',6.25);assert.equal(back.rooms[0].w,6.25);assert.equal(back.rooms[1].x,6.25);assert.equal(back.doors[0].wall,'z:6.25:0:5');
});
test('resizing respects the shell inset and shrinking a wall preserves a fitting door',()=>{
 const part=interiorFromShell(makePart('block',{scale:[10,4,8]})),p=part.interior,b=shellBounds(p),r=p.rooms[0];
 const wider=resizeRoomEdge(p,r.id,'right',100);assert.equal(wider.rooms[0].x+wider.rooms[0].w,b.maxX);
 const inset=setShellInset(p,.8);assert.equal(inset.rooms[0].x,-4.2);assert.equal(inset.rooms[0].w,8.4);assert.equal(inset.shell.width,10);
 const free=defaultInterior();free.doors=[{wall:'x:0:0:6',offset:3,width:1.2,height:2.2}];const shrunk=resizeRoomEdge(free,'room-1','right',4);assert.equal(shrunk.doors.length,1);assert.equal(shrunk.doors[0].wall,'x:0:0:4');
});

test('beveled tower interiors preserve real shell dimensions, outline and finish',()=>{assert.ok(supportsInteriorType('cor-roundtop-body'));assert.ok(!supportsInteriorType('cor-half-round-roof'));for(const scale of [[1,1,1],[2,2,1.5],[-1,1,1]]){const shell=makePart('cor-roundtop-body',{scale,position:[2,3,4],rotation:[0,.4,0],surface:{preset:'cor-concrete',scale:.5}});assert.ok(canAddInterior(shell));const part=interiorFromShell(shell),p=part.interior;assert.deepEqual([p.shell.width,p.shell.height,p.shell.depth],[6*Math.abs(scale[0]),4*Math.abs(scale[1]),3*Math.abs(scale[2])]);assert.equal(p.shell.points.length,20);assert.equal(p.finishes.outside.preset,'cor-concrete');assert.deepEqual(part.position,shell.position);assert.deepEqual(part.rotation,shell.rotation);validateInterior(p);const before=buildPart(shell),after=buildPart(part),a=exactBounds(before),b=exactBounds(after);assert.ok(a.min.distanceTo(b.min)<1e-5);assert.ok(a.max.distanceTo(b.max)<1e-5);assert.ok(geometryStats(after).triangles>0);cutawayInterior(after,true);assert.ok(after.children.some(m=>!m.visible));disposePart(before);disposePart(after);}assert.ok(!canAddInterior(makePart('cor-roundtop-body',{scale:[1,.5,1]})));});

function exactBounds(g){g.updateMatrixWorld(true);const b=new Box3();g.traverse(m=>{if(m.isMesh){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++)b.expandByPoint(new Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld));}});return b;}
