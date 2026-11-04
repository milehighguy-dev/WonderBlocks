import * as T from '../../vendor/three.module.js';
import {partMatrix} from './entrances.js';
import {routeLayout} from '../routes/stair-route.js';
import {createWalkCollision} from '../walk/walk-collision.js';

const targets=new Map(),resolution=.3;
export const canConformHost=p=>!!p&&!p.interior&&!p.interiorProp&&['flora','block','round','hex','taper','cor-roundtop-body','metaballs'].includes(p.type);
export const canConformSection=s=>!!s?.hallway&&(s.hallway.style??'plain')==='plain'&&s.kind==='landing'&&s.turn==='straight'&&!s.curveAngle&&!s.turnAngle;

function targetSurface(part,build){
 const copy=structuredClone(part);delete copy.entrances;delete copy.entranceInteriors;delete copy.faceFinishes;delete copy.assemblyId;delete copy.assemblyName;
 const shape=structuredClone(copy);delete shape.color;delete shape.surface;delete shape.pattern;if(shape.flora){delete shape.flora.colors;delete shape.flora.finishes;}const key=JSON.stringify(shape);if(targets.has(key))return targets.get(key).collision;
 const root=build(copy,{parts:[],collision:false});root.updateMatrixWorld(true);
 root.traverse(mesh=>{if(!mesh.isMesh)return;mesh.visible=!mesh.userData.floraBillboard&&(!mesh.userData.floraComponent||mesh.userData.floraComponent==='bark');if(mesh.visible){const source=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const material of source)material.side=T.DoubleSide;}});
 const entry={root,collision:createWalkCollision([root])};targets.set(key,entry);
 if(targets.size>12){const [old,entry]=targets.entries().next().value;targets.delete(old);entry.root.traverse(m=>{m.geometry?.dispose();for(const material of Array.isArray(m.material)?m.material:[m.material])material?.dispose();});}
 return entry.collision;
}

function conformGeometry(mesh,frame,inverse,run,end,depth){
 mesh.updateMatrix();const toFrame=inverse.clone().multiply(mesh.matrix),toMesh=toFrame.clone().invert(),source=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone(),names=Object.keys(source.attributes),values=Object.fromEntries(names.map(n=>[n,[]]));
 const vertex=i=>{const attributes={};for(const name of names){const a=source.attributes[name];attributes[name]=Array.from({length:a.itemSize},(_,k)=>a.array[i*a.itemSize+k]);}return {attributes,point:new T.Vector3(...attributes.position).applyMatrix4(toFrame)};};
 const midpoint=(a,b)=>({attributes:Object.fromEntries(names.map(n=>[n,a.attributes[n].map((v,i)=>(v+b.attributes[n][i])/2)])),point:a.point.clone().add(b.point).multiplyScalar(.5)});
 const emit=triangle=>{for(const v of triangle){const p=v.point.clone(),front=depth(p.x,p.y),fraction=p.z/run;p.z=end==='start'?front+(run-front)*fraction:front*fraction;v.attributes.position=p.applyMatrix4(toMesh).toArray();for(const name of names)values[name].push(...v.attributes[name]);}};
 // Sample across the aperture, not along the whole corridor. Shared edges use
 // the same dyadic samples; all original UV attributes interpolate with them.
 const sample=triangle=>{const lengths=triangle.map((a,i)=>{const b=triangle[(i+1)%3];return Math.hypot((a.point.x-b.point.x)*frame.scaleX,(a.point.y-b.point.y)*frame.scaleY);}),longest=Math.max(...lengths);if(longest<=resolution){emit(triangle);return;}const i=lengths.indexOf(longest),a=triangle[i],b=triangle[(i+1)%3],c=triangle[(i+2)%3],middle=midpoint(a,b);sample([a,middle,c]);sample([middle,b,c]);};
 for(let i=0;i<source.attributes.position.count;i+=3)sample([vertex(i),vertex(i+1),vertex(i+2)]);
 const geometry=new T.BufferGeometry();for(const name of names)geometry.setAttribute(name,new T.Float32BufferAttribute(values[name],source.attributes[name].itemSize));geometry.userData={...mesh.geometry.userData};geometry.computeVertexNormals();source.dispose();return geometry;
}

// This is a shape modifier used before object collision is prepared. The floor
// stays connected to the outdoor landing; only the enclosure's mouth follows
// the original host surface. Host cuts then reveal that curved intersection.
export function conformRouteEntrances(group,part,parts,build){
 if(!part.route)return;
 for(const layout of routeLayout(part.route)){
  const fit=layout.segment.hallway?.entranceFit;if(!fit||!canConformSection(layout.segment))continue;
  const host=parts.find(p=>p.id===fit.partId);if(!canConformHost(host)||host.id===part.id)continue;
  const collision=targetSurface(host,build),local=new T.Matrix4().makeTranslation(...layout.start).multiply(new T.Matrix4().makeRotationY(layout.heading)),inverse=local.clone().invert(),world=partMatrix(part).multiply(local),worldInverse=world.clone().invert(),run=layout.segment.run,end=fit.end,scaleX=new T.Vector3().setFromMatrixColumn(world,0).length(),scaleY=new T.Vector3().setFromMatrixColumn(world,1).length(),scaleZ=new T.Vector3().setFromMatrixColumn(world,2).length(),direction=new T.Vector3(0,0,end==='start'?1:-1).transformDirection(world),samples=new Map();let hits=0,misses=0;
  const depth=(x,y)=>{const key=[Math.round(x*1e5),Math.round(y*1e5)].join(',');if(samples.has(key))return samples.get(key);const origin=new T.Vector3(x,y,end==='start'?-.5/scaleZ:run+.5/scaleZ).applyMatrix4(world),hit=collision.firstHit(new T.Raycaster(origin,direction,0,run*scaleZ+.5));let value=end==='start'?0:run;
   if(hit){const z=hit.point.clone().applyMatrix4(worldInverse).z;value=end==='start'?T.MathUtils.clamp(z-.03/scaleZ,0,run-.2):T.MathUtils.clamp(z+.03/scaleZ,.2,run);hits++;}else misses++;samples.set(key,value);return value;};
  // No intersection means the host was moved away. Keep the original hallway.
  depth(0,layout.segment.hallway.height/scaleY/2);if(!hits){(group.userData.entranceFits??=[]).push({segment:layout.index,partId:host.id,status:'no-intersection'});continue;}
  const replacements=[];for(const mesh of group.children){if(!mesh.isMesh||!mesh.userData.hallway||mesh.userData.routeSegment!==layout.index)continue;replacements.push({mesh,geometry:conformGeometry(mesh,{scaleX,scaleY},inverse,run,end,depth)});}
  if(misses){replacements.forEach(r=>r.geometry.dispose());(group.userData.entranceFits??=[]).push({segment:layout.index,partId:host.id,status:'incomplete-surface',surfaceSamples:samples.size,hits});continue;}
  for(const {mesh,geometry} of replacements){mesh.geometry.dispose();mesh.geometry=geometry;delete mesh.userData.structuralVolume;delete mesh.userData.shadowVolume;mesh.userData.conformedEntrance=true;}
  (group.userData.entranceFits??=[]).push({segment:layout.index,partId:host.id,status:'fitted',surfaceSamples:samples.size,hits});
 }
}
