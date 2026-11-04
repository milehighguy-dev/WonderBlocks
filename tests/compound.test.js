import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {castleCompound} from '../examples/generators/compound-demo.js';
import {validateProject,PARTS} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {Group,Vector3,Raycaster,Box3} from '../vendor/three.module.js';
import {exportOBJ} from '../src/export/export.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {curvePoint} from '../src/routes/curved-route.js';
import {platformPort} from '../src/platforms/platform.js';

const routes=p=>p.parts.filter(p=>p.type==='stair-route'&&p.route.segments.some(s=>s.kind==='stairs'));
const bounds=p=>{const g=buildPart(p),b=new Box3().setFromObject(g);disposePart(g);return b;};

test('rebuilt compound uses native editable courts, roofed wall paths and inhabited rooms and exports finite geometry',()=>{
 const p=castleCompound(),saved=JSON.parse(readFileSync(new URL('../examples/projects/castle-compound.building.json',import.meta.url),'utf8'));assert.deepEqual(validateProject(saved),saved);assert.deepEqual(saved.parts.map(p=>[p.name,p.type]),p.parts.map(p=>[p.name,p.type]));assert.ok(p.parts.length<350);assert.ok(p.parts.every(p=>PARTS.some(d=>d.id===p.type)));assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
 // Connecting the upper flight must not change its tread or riser sizes.
 for(const scene of [p,saved])for(const route of scene.parts.filter(p=>p.name.startsWith('Audience approach')||p.name.startsWith('Keep court approach'))){const [a,b]=route.route.segments.filter(s=>s.kind==='stairs');assert.equal(a.steps,6);assert.equal(b.steps,6);assert.ok(Math.abs(a.run/a.steps-b.run/b.steps)<1e-8);assert.ok(Math.abs(a.rise/a.steps-b.rise/b.steps)<1e-8);}
 assert.equal(p.parts.filter(p=>p.type==='interior').length,3);assert.equal(p.parts.filter(p=>p.type==='wall-route').length,4);
 assert.equal(p.parts.filter(p=>['jp-gallery-wall','jp-wall-cap','jp-stair'].includes(p.type)).length,0);
 for(const wall of p.parts.filter(p=>p.type==='wall-route'))assert.ok(wall.route.segments.every(s=>s.railing.style==='japanese-roofed'));
 const scene=new Group();try{p.parts.forEach(p=>scene.add(buildPart(p)));const obj=exportOBJ(scene);assert.ok(obj.includes('\nf '));assert.ok(!/NaN|Infinity/.test(obj));}finally{disposePart(scene);}
});

test('all four ascent routes have usable steps and no treads buried in courtyard platforms or retaining stone',()=>{
 const project=castleCompound(),support=new Group();project.parts.filter(p=>p.type==='jp-base'||p.type==='platform').forEach(p=>support.add(buildPart(p)));support.updateMatrixWorld(true);
 assert.equal(routes(project).length,4);
 try{for(const p of routes(project)){
  const g=buildPart(p);g.updateMatrixWorld(true);
  try{for(const l of routeLayout(p.route)){
   const s=l.segment;if(s.kind!=='stairs')continue;assert.ok(s.rise/s.steps<=.200001);assert.ok(s.run/s.steps>=.25);if(s.railing)assert.ok(s.railing.height>=1.1);
   for(let i=0;i<s.steps;i++){
    const t=(i+.5)/s.steps,q=s.curveAngle?curvePoint(0,0,t*s.run,s.run,s.curveAngle):[0,0,t*s.run];
    const point=new Vector3(l.start[0]+Math.cos(l.heading)*q[0]+Math.sin(l.heading)*q[2],l.start[1]+(i+1)*s.rise/s.steps,l.start[2]-Math.sin(l.heading)*q[0]+Math.cos(l.heading)*q[2]).applyMatrix4(g.matrixWorld);
    const hit=new Raycaster(new Vector3(point.x,100,point.z),new Vector3(0,-1,0)).intersectObject(support,true)[0];
    assert.ok(!hit||hit.point.y<=point.y+.035,p.name+' tread '+i+' is exposed');
   }
  }}finally{disposePart(g);}
 }}finally{disposePart(support);}
});

test('platform-linked approaches meet their native court edge anchors',()=>{
 const project=castleCompound(),linked=routes(project).filter(p=>p.route.links?.end);assert.equal(linked.length,3);
 const verify=(p,parts)=>{const ref=p.route.links.end,host=parts.find(q=>q.id===ref.partId),port=platformPort(host,ref),g=buildPart(p);g.updateMatrixWorld(true);const end=new Vector3(...routeLayout(p.route).at(-1).end).applyMatrix4(g.matrixWorld);disposePart(g);assert.ok(end.distanceTo(port.point)<1e-5,p.name+' reaches platform');};
 for(const p of linked)verify(p,project.parts);
});

test('terrace tops overlap supporting stone and the keep has circulation on all sides',()=>{
 const parts=castleCompound().parts;
 for(const p of parts.filter(p=>p.name.endsWith('retaining foundation'))){const base=bounds(p),floor=bounds(parts.find(q=>q.name===p.name.replace('retaining foundation','courtyard')));assert.ok(floor.max.y-base.max.y>.035);assert.ok(floor.min.y<base.max.y);assert.ok(base.max.x>floor.max.x&&base.min.z<floor.min.z);const g=buildPart(p);g.updateMatrixWorld(true);const hit=new Raycaster(new Vector3(floor.max.x-.1,100,floor.min.z+.1),new Vector3(0,-1,0)).intersectObject(g,true)[0];assert.ok(hit&&Math.abs(hit.point.y-base.max.y)<1e-5,'stone supports the courtyard corner');disposePart(g);}
 const keep=bounds(parts.find(p=>p.name==='Main keep · Keep • stone foundation'));
 assert.ok(keep.min.x-(-28)>=5);assert.ok(8-keep.max.x>=5);assert.ok(keep.min.z-(-34)>=5);
 const stair=bounds(parts.find(p=>p.name.startsWith('Main keep')&&p.route));assert.ok(2-stair.max.z>=3,'forecourt remains open in front of the keep stair');
});

test('gate passages and new room doors have real shoulder and head clearance',()=>{
 const project=castleCompound(),scene=new Group();project.parts.forEach(p=>scene.add(buildPart(p)));scene.updateMatrixWorld(true);
 try{for(const [x,y,z,angle] of [[20,0,43,0],[20,2.4,22,0],[5,4.8,2,0],[32,2.4,-11,Math.PI/2]])for(const dx of [-.35,0,.35])for(const h of [.2,1.1,2.35]){
  const direction=new Vector3(-Math.sin(angle),0,-Math.cos(angle)),origin=new Vector3(x+Math.cos(angle)*dx+Math.sin(angle)*1.5,y+h,z-Math.sin(angle)*dx+Math.cos(angle)*1.5);
  assert.equal(new Raycaster(origin,direction,0,3).intersectObject(scene,true).length,0,'gate '+[x,z]+' at height '+h);
 }
 for(const p of project.parts.filter(p=>p.interior)){const g=scene.children.find(g=>g.name===p.name);g.updateMatrixWorld(true);const d=p.interior.rooms[0].d;for(const x of [-.35,0,.35])for(const h of [.2,1.1,2.35]){const origin=new Vector3(x,h,d/2+1).applyMatrix4(g.matrixWorld),direction=new Vector3(0,0,-1).transformDirection(g.matrixWorld);assert.equal(new Raycaster(origin,direction,0,2).intersectObject(g,true).length,0,p.name+' entry');}}
 }finally{disposePart(scene);}
});
