import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3,Raycaster,Box3} from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';import {buildPart,disposePart} from '../src/core/geometry.js';
import {placementScale} from '../src/walk/human-scale.js';import {castleCompound} from '../examples/generators/compound-demo.js';import {newYorkBlock} from '../examples/generators/new-york-demo.js';import {routeLayout} from '../src/routes/stair-route.js';
const projects=()=>[castleCompound(),newYorkBlock()];
test('example routes have human-sized steps, usable treads and full-height railings',()=>{
 for(const p of projects())for(const part of p.parts)for(const s of part.route?.segments||[]){if(s.kind==='stairs'&&s.rise){assert.ok(s.rise/s.steps<=.200001,part.name+' riser');assert.ok(s.run/s.steps>=.25-1e-6,part.name+' tread');}if(s.railing&&s.railing.style!=='none')assert.ok(s.railing.height>=1.1,part.name+' rail');}
});
test('Japanese occupied storeys and gateway openings fit the reference character',()=>{
 for(const project of [castleCompound()])for(const p of project.parts){if(['jp-story','jp-entry-story','jp-dark-story'].includes(p.type))assert.ok(1.2*p.scale[1]>=2.4,p.name+' storey');if(p.type==='jp-entry-story')assert.ok(.95*p.scale[1]>=2.4,p.name+' doorway');if(p.type==='jp-gate')assert.ok(1.4*p.scale[1]>=2.4,p.name+' gateway');}
});
test('keep approaches reach the entrance and clear the sloped foundation',()=>{
 for(const project of [castleCompound()]){const p=project.parts.find(p=>p.route&&(p.name.startsWith('Main keep')||p.name.startsWith('Keep •'))),g=buildPart(p),gate=(project.parts.find(p=>p.type==='jp-gate'&&p.name.startsWith('Main keep'))??project.parts.find(p=>p.type==='jp-gate')),bases=project.parts.filter(p=>p.type==='jp-base').map(p=>buildPart(p));g.updateMatrixWorld(true);bases.forEach(m=>m.updateMatrixWorld(true));const end=new Vector3(...routeLayout(p.route).at(-1).end).applyMatrix4(g.matrixWorld);assert.ok(Math.abs(end.y-gate.position[1])<1e-6);assert.ok(Math.abs(end.z-gate.position[2])<.9);const s=p.route.segments[0];for(let i=0;i<s.steps;i++){const pt=new Vector3(0,(i+1)*s.rise/s.steps,(i+.5)*s.run/s.steps).applyMatrix4(g.matrixWorld),hit=new Raycaster(new Vector3(pt.x,100,pt.z),new Vector3(0,-1,0)).intersectObjects(bases,true)[0];assert.ok(!hit||hit.point.y<=pt.y+.03,p.name+' tread '+i);}disposePart(g);bases.forEach(disposePart);}
});
test('city entrance and facade floors use metre dimensions',()=>{const p=newYorkBlock();const door=p.parts.find(p=>p.type==='ny-entry');assert.ok(1.2*door.scale[1]>=2.4);for(const q of p.parts.filter(p=>['ny-deco','ny-brick','ny-glass'].includes(p.surface?.preset)))assert.equal(q.surface.scale*q.pattern.texture[1],1/3);});
test('new palette architectural defaults have character-sized clearances',()=>{for(const [type,clearance] of [['temple-door',1.6],['jp-gate',1.4],['jp-entry-story',.95],['ny-entry',1.2]])assert.ok(clearance*placementScale(type)[1]>=2.4,type);assert.deepEqual(placementScale('block'),[1,1,1]);assert.deepEqual(placementScale('character-reference'),[1,1,1]);});

test('every palette part has an audited default with finite geometry',async()=>{
 const {PARTS}=await import('../src/core/model.js'),{placementScales}=await import('../src/walk/human-scale.js');
 for(const def of PARTS){assert.ok(placementScales[def.id],def.id+' needs a reviewed default');const g=buildPart(makePart(def.id,{scale:placementScale(def.id)})),b=new Box3().setFromObject(g);if(def.id==='flora')assert.ok(b.isEmpty(),'Flora starts with an invisible placement origin');else assert.ok([b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z].every(Number.isFinite),def.id);disposePart(g);}
});

test('new passage defaults clear a character-sized corridor through the actual meshes',()=>{
 for(const type of ['archbody','flat-arch','temple-door','jp-entry-story','jp-gate','ny-entry']){
  const g=buildPart(makePart(type,{scale:placementScale(type)}));g.updateMatrixWorld(true);const b=new Box3().setFromObject(g);
  for(const x of [-.35,0,.35])for(const y of [.2,1.1,2.35]){
   const hits=new Raycaster(new Vector3(x,y,b.max.z+1),new Vector3(0,0,-1),0,b.max.z-b.min.z+2).intersectObject(g,true);
   // Keep entrance storeys have a rear wall: test the entrance facade only.
   const blocking=type==='jp-entry-story'?hits.filter(h=>h.point.z>0):hits;
   assert.equal(blocking.length,0,type+' must clear head and shoulders at '+[x,y]);
  }disposePart(g);
 }
});

test('new covered structures have headroom and balconies have full-height rails',()=>{
 for(const [type,floor] of [['awning',0],['ny-lantern',.12*3.2]]){
  const g=buildPart(makePart(type,{scale:placementScale(type)}));g.updateMatrixWorld(true);
  const hit=new Raycaster(new Vector3(0,floor+.01,0),new Vector3(0,1,0)).intersectObject(g,true)[0];
  assert.ok(hit&&hit.point.y-floor>=2.4,type+' overhead clearance');disposePart(g);
 }
 for(const [type,railTop,deckTop] of [['balcony',.585,.12],['ny-fire-escape',.57,.07],['jp-balcony',.515,.1],['jp-railing',.515,0]])assert.ok((railTop-deckTop)*placementScale(type)[1]>=1.0999,type+' rail height');
 for(const [type,riser,tread] of [['temple-base',.15,.1]]){const [x,y,z]=placementScale(type);assert.ok(riser*y<=.2,type+' riser');assert.ok(tread*z>=.25,type+' tread');}
});
