import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {asterfall} from '../examples/generators/asterfall-demo.js';
import {validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {resolveRouteLinks} from '../src/routes/route-links.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';
import {platformPort} from '../src/platforms/platform.js';

const saved=JSON.parse(readFileSync(new URL('../examples/projects/asterfall.building.json',import.meta.url),'utf8'));
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function overlapArea(a,b){
 let polygon=a;const sign=Math.sign(cross(...b));
 for(let i=0;i<3&&polygon.length;i++){
  const p=b[i],q=b[(i+1)%3],next=[];
  for(let j=0;j<polygon.length;j++){const u=polygon[j],v=polygon[(j+1)%polygon.length],du=sign*cross(p,q,u),dv=sign*cross(p,q,v);if(du>=-1e-8)next.push(u);if((du>0)!==(dv>0)){const t=du/(du-dv);next.push([u[0]+t*(v[0]-u[0]),u[1]+t*(v[1]-u[1])]);}}
  polygon=next;
 }
 return Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
}

test('Asterfall has no competing coplanar faces above the sea',()=>{
 const planes=new Map(),openingCuts=prepareInteriorCuts(saved.parts),conflicts=new Set(),sea=saved.parts.find(p=>p.name.startsWith('Quiet sea')),seaLevel=sea.position[1]+sea.scale[1];
 for(const p of saved.parts.filter(p=>!['flora','character-reference'].includes(p.type))){
  const group=buildPart(p,{parts:saved.parts,openingCuts,batch:true,collision:false});group.updateMatrixWorld(true);
  try{group.traverse(mesh=>{if(!mesh.isMesh)return;const geometry=mesh.geometry,a=geometry.attributes.position,count=geometry.index?.count??a.count;
   for(let i=0;i<count;i+=3){
    const v=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(a,geometry.index?geometry.index.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld));
    if(v.every(q=>q.y<seaLevel-1e-5))continue;
    const n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));if(n.lengthSq()<1e-14)continue;n.normalize();
    const axis=n.toArray().map(Math.abs).indexOf(Math.max(...n.toArray().map(Math.abs))),axes=[0,1,2].filter(a=>a!==axis),triangle=v.map(q=>axes.map(a=>q.getComponent(a)));
    const key=[...n.toArray().map(a=>a.toFixed(4)),n.dot(v[0]).toFixed(4)].join(','),bounds={minX:Math.min(...triangle.map(q=>q[0])),maxX:Math.max(...triangle.map(q=>q[0])),minZ:Math.min(...triangle.map(q=>q[1])),maxZ:Math.max(...triangle.map(q=>q[1]))},list=planes.get(key)||[];
    for(const other of list){if(other.id===p.id||bounds.maxX<=other.minX+1e-6||bounds.minX>=other.maxX-1e-6||bounds.maxZ<=other.minZ+1e-6||bounds.minZ>=other.maxZ-1e-6)continue;if(overlapArea(triangle,other.triangle)>1e-4)conflicts.add(p.name+' / '+other.name+' on plane '+key);}
    list.push({id:p.id,name:p.name,triangle,...bounds});planes.set(key,list);
   }
  });}finally{disposePart(group);}
 }
 assert.deepEqual([...conflicts],[]);
});

test('Asterfall saved map contains the native connected districts and rebuilds within its geometry budget',()=>{
 const project=validateProject(saved),generated=asterfall();
 assert.deepEqual(project.parts.map(p=>[p.id,p.type,p.name,p.position]),generated.parts.map(p=>[p.id,p.type,p.name,p.position]));
 assert.ok(project.parts.length<=400);assert.equal(new Set(project.parts.map(p=>p.assemblyId)).size,13);
 assert.equal(project.parts.filter(p=>p.interior).length,9);
 let triangles=0,meshes=0;const openingCuts=prepareInteriorCuts(project.parts);
 for(const p of project.parts){const g=buildPart(p,{parts:project.parts,openingCuts,batch:true,collision:false});const stats=geometryStats(g);triangles+=stats.triangles;meshes+=stats.meshes;
  g.traverse(m=>{if(!m.isMesh)return;for(const attr of Object.values(m.geometry.attributes))assert.ok(attr.array.every(Number.isFinite),p.name+' has finite geometry');});disposePart(g);
 }
 assert.ok(triangles<80000,'scene triangles '+triangles);assert.ok(meshes<750,'scene batches '+meshes);
});

test('Asterfall routes form two alternate district loops and all endpoints stay attached',()=>{
 const parts=resolveRouteLinks(saved.parts),byId=new Map(parts.map(p=>[p.id,p])),routes=parts.filter(p=>p.route),graph=new Map();
 const connect=(a,b)=>{if(!graph.has(a))graph.set(a,new Set());graph.get(a).add(b);};
 for(const p of routes){const layout=routeLayout(p.route),m=new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion().setFromEuler(new T.Euler(...p.rotation)),new T.Vector3(...p.scale));
  for(const [end,point] of [['start',layout[0].start],['end',layout.at(-1).end]]){const r=p.route.links[end],target=byId.get(r.partId),expected=platformPort(target,r).point;
   assert.ok(new T.Vector3(...point).applyMatrix4(m).distanceTo(expected)<1e-6,p.name+' '+end);
  }
  const a=p.route.links.start.partId,b=p.route.links.end.partId;connect(a,b);connect(b,a);
  for(const l of layout)if(l.segment.kind==='stairs'){assert.ok(Math.abs(l.segment.rise/l.segment.steps)<=.18,p.name+' riser');assert.ok(l.segment.run/l.segment.steps>=.3,p.name+' tread');assert.ok(Math.abs(l.segment.rise)<=2.01,p.name+' short flights');}
 }
 const start=parts.find(p=>p.name==='Engine plaza').id,reached=new Set();function visit(id){if(reached.has(id))return;reached.add(id);for(const n of graph.get(id)||[])visit(n);}visit(start);
 assert.equal(reached.size,parts.filter(p=>p.platform).length,'all public decks are reachable');
 assert.equal(routes.length-reached.size+1,2,'two independent circulation loops');
});

test('Asterfall bridges have continuous floors, clear headroom and open railing connections',()=>{
 const scene=new T.Group(),routes=saved.parts.filter(p=>p.route),openingCuts=prepareInteriorCuts(saved.parts);
 for(const p of saved.parts.filter(p=>p.type!=='flora'&&p.type!=='character-reference'))scene.add(buildPart(p,{parts:saved.parts,openingCuts,batch:true,collision:false}));scene.updateMatrixWorld(true);
 const up=new T.Vector3(0,1,0),down=new T.Vector3(0,-1,0);
 try{for(const p of routes){const g=scene.children.find(g=>g.userData.partId===p.id),layout=routeLayout(p.route);
  for(const l of layout)for(let i=1;i<=9;i++){
   const t=(i+.173)/10,s=l.segment,y=s.kind==='stairs'?(s.rise>0?Math.ceil(t*s.steps):Math.floor(t*s.steps))*s.rise/s.steps:0;
   const point=new T.Vector3(l.start[0]+Math.sin(l.heading)*s.run*t,l.start[1]+y,l.start[2]+Math.cos(l.heading)*s.run*t).applyMatrix4(g.matrixWorld);
   const floor=new T.Raycaster(point.clone().addScaledVector(up,.25),down,0,.5).intersectObject(scene,true)[0];assert.ok(floor&&Math.abs(floor.point.y-point.y)<.02,p.name+' floor at '+t+' expected '+point.y+' actual '+floor?.point.y);
   const hits=new T.Raycaster(point.clone().addScaledVector(up,.08),up,0,2.3).intersectObject(scene,true);assert.equal(hits.length,0,p.name+' headroom at '+point.toArray()+' blocked by '+hits[0]?.object.parent.name+' height '+hits[0]?.point.y);
  }
  for(const [point,l] of [[layout[0].start,layout[0]],[layout.at(-1).end,layout.at(-1)]]){
   const direction=new T.Vector3(Math.sin(l.heading),0,Math.cos(l.heading)).transformDirection(g.matrixWorld),at=new T.Vector3(...point).applyMatrix4(g.matrixWorld).addScaledVector(up,1);
   assert.equal(new T.Raycaster(at.clone().addScaledVector(direction,-.6),direction,0,1.2).intersectObject(scene,true).length,0,p.name+' railing opening');
  }
 }}finally{for(const g of scene.children)disposePart(g);}
});
