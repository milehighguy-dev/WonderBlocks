import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {yavinRainwell} from '../examples/generators/yavin-rainwell-demo.js';
import {validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {moveWalker,groundAt,verticalWalker} from '../src/walk/walk-physics.js';
const project=JSON.parse(readFileSync(new URL('../examples/projects/yavin-rainwell.building.json',import.meta.url),'utf8'));let roots,collision;
before(()=>{const openingCuts=prepareInteriorCuts(project.parts);roots=project.parts.filter(p=>p.type!=='character-reference').map(p=>buildPart(p,{parts:project.parts,openingCuts,batch:true,collision:p.flora?false:'sync'}));collision=createWalkCollision(roots.filter((_,i)=>!project.parts.filter(p=>p.type!=='character-reference')[i].flora));});
after(()=>roots?.forEach(disposePart));
function walk(points,label){points=points.map(([x,y,z])=>[x,y+6,z]);let feet=new T.Vector3(...points[0]),velocity=0;const start=groundAt(collision,feet,.4,.7);assert.ok(start,label+' starting floor');feet.y=start.point.y;
 for(const point of points.slice(1)){const target=new T.Vector3(...point);let steps=0;while(Math.hypot(target.x-feet.x,target.z-feet.z)>.04){const d=target.clone().sub(feet).setY(0),length=d.length();d.multiplyScalar(Math.min(.09,length)/length);const horizontal=moveWalker(collision,feet,d),vertical=verticalWalker(collision,horizontal,velocity,.03,false);velocity=vertical.velocity;assert.ok(vertical.feet.distanceTo(feet)>1e-5,label+' blocked at '+feet.toArray()+' toward '+point);feet=vertical.feet;assert.ok(++steps<3500,label+' waypoint reached');assert.ok(groundAt(collision,feet,.2,.7),label+' continuous footing at '+feet.toArray());}for(let i=0;i<20;i++){const v=verticalWalker(collision,feet,velocity,.03,false);feet=v.feet;velocity=v.velocity;}assert.ok(Math.abs(feet.y-target.y)<.16,label+' expected '+point+' reached '+feet.toArray());}
}
test('Rainwell saved scene matches its native generator and has a modest finite geometry budget',()=>{assert.deepEqual(validateProject(project),project);assert.deepEqual(yavinRainwell(),project);let triangles=0,meshes=0;for(const g of roots){const s=geometryStats(g);triangles+=s.triangles;meshes+=s.meshes;g.traverse(m=>{for(const a of Object.values(m.geometry?.attributes??{}))assert.ok(a.array.every(Number.isFinite));});}assert.ok(triangles<55000,'triangles '+triangles);assert.ok(meshes<600,'batches '+meshes);const groups=new Map();for(const p of project.parts.filter(p=>p.assemblyId)){if(!groups.has(p.assemblyId))groups.set(p.assemblyId,[]);groups.get(p.assemblyId).push(p);}assert.ok([...groups.values()].every(parts=>parts.length<=4),'groups describe objects rather than whole districts');assert.ok(project.parts.filter(p=>p.instanceCopy).length>=90);assert.ok(project.parts.filter(p=>p.type==='flora').every(p=>!p.assemblyId));assert.ok(project.parts.some(p=>p.type==='flora'&&p.instanceFamily));});
test('pilgrim stair and broad bridge connect to the sanctuary through its entrance',()=>{walk([[0,.06,65],[0,.06,41],[0,4,24],[0,4,-16],[0,10,-37],[0,10,-44]],'main approach');});
test('high aqueduct is reachable at both ends and returns to the temple stair',()=>{walk([[-25,0,62],[-25,12,34],[-25,12,-32],[-25,6,-51],[-29,6,-51],[-29,6,-23],[-2,6,-23]],'high flank');});
test('creek flank and the transverse underpass connect the banks below the bridge',()=>{walk([[30,0,40],[30,0,34],[30,-1.8,24],[30,-1.8,-8],[30,4,-22.5],[25,4,-22.5],[25,4,-20],[8,4,-20],[8,4,-16],[0,4,-16]],'east creek flank');walk([[-35,0,40],[-35,0,34],[-35,-1.8,24],[-35,-1.8,15],[30,-1.8,15]],'bridge underpass');});
