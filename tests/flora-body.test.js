import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {floraBodyField,floraBodyGeometry,floraBodySurface,floraBodyJointIds,floraBodyPinSurface} from '../src/flora/flora-body.js';
import {FLORA_BODY_FIELDS} from '../src/flora/procedural-flora.js';
import {floraAsset} from '../src/flora/flora-palette.js';
import {defaultFlora,addFloraAsset,buildFlora,floraConnectionSockets,floraCurve,floraSocketPose,floraOrganMatrix} from '../src/flora/flora.js';
import {disposePart} from '../src/core/geometry.js';

function root(id='flora-buttress-root'){const f=defaultFlora();return addFloraAsset(f,f.branches[0].id,id);}
function inspect(g){
 const p=g.attributes.position,edges=new Map(),parents=Array.from({length:p.count},(_,i)=>i);
 const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};let volume=0;
 for(let i=0;i<g.index.count;i+=3){const ids=[0,1,2].map(j=>g.index.getX(i+j)),[a,b,c]=ids.map(j=>new T.Vector3().fromBufferAttribute(p,j));volume+=a.dot(b.clone().cross(c))/6;
  for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)||0)+1);parents[find(a)]=find(b);}
  assert.ok(a.distanceTo(b)<=Math.sqrt(3)*g.userData.skinStep+1e-5,'no stretched triangles spanning old joint locations');
 }
 assert.ok([...edges.values()].every(n=>n===2),'watertight surface');assert.ok(volume>0,'outward winding');
 assert.equal(new Set(Array.from(g.index.array,find)).size,1,'one connected exterior');
 assert.ok(Array.from(g.attributes.normal.array).every(Number.isFinite));
}
test('all native body object groups rebuild closed skin that includes every joint',()=>{
 for(const id of Object.keys(FLORA_BODY_FIELDS)){const o=root(id),field=floraBodyField(o),g=floraBodyGeometry(o),active=floraBodyJointIds(id);try{inspect(g);for(const n of floraAsset(id).skeleton.filter(n=>active.has(n.id))){assert.ok(field.distance(...n.point)<0,id+' '+n.id);assert.ok(g.boundingBox.containsPoint(new T.Vector3(...n.point)),id+' tip was lost');}}catch(e){e.message=id+': '+e.message;throw e;}finally{g.dispose();}}
});

test('a root remains round and joined when pulled through and across its central joint',()=>{
 const o=root(),nodes=floraAsset(o.asset).skeleton,tip=nodes.find(n=>n.id==='joint:2'),base=nodes.find(n=>n.id===tip.parent),a=new T.Vector3(...base.point),rest=new T.Vector3(...tip.point).sub(a);
 for(const factor of [1,.15,0,-.15,-1,-2]){const target=a.clone().addScaledVector(rest,factor);o.controls={[tip.id]:{offset:target.clone().sub(new T.Vector3(...tip.point)).toArray(),scale:[1,1,1],rotation:[0,0,0]}};const field=floraBodyField(o),g=floraBodyGeometry(o);
  try{inspect(g);assert.ok(field.distance(...target.toArray())<-.03,'the moved tip retains its volume');if(Math.abs(factor)>=1){const mid=a.clone().lerp(target,.7),axis=rest.clone().normalize(),u=axis.clone().cross(new T.Vector3(0,1,0)).normalize(),w=axis.clone().cross(u);for(let i=0;i<8;i++){const p=mid.clone().addScaledVector(u,.045*Math.cos(i*Math.PI/4)).addScaledVector(w,.045*Math.sin(i*Math.PI/4));assert.ok(field.distance(...p.toArray())<0,'cross-section stays solid in every direction');}}}finally{g.dispose();}
 }
});
test('surface projection follows rebuilt skin after joint movement and caches never mutate earlier meshes',()=>{
 const o=root(),first=floraBodyGeometry(o),saved=first.attributes.position.array.slice(),n=floraAsset(o.asset).skeleton[2];o.controls={[n.id]:{offset:[-2,.3,.4],scale:[1.3,1.3,1.3],rotation:[.1,.3,0]}};const second=floraBodyGeometry(o),field=floraBodyField(o);
 try{assert.deepEqual(first.attributes.position.array,saved);assert.notDeepEqual(second.attributes.position.array,saved);for(const p of [[.2,.4,0],[-.5,.2,.3],[-2,1,0]]){const surface=floraBodySurface(o,new T.Vector3(...p));assert.ok(Math.abs(field.distance(...surface.point.toArray(),false))<.002,'decoration touches the skin');assert.ok(Math.abs(surface.normal.length()-1)<1e-5);}}finally{first.dispose();second.dispose();}
});
test('saved triangle pins stay on the regenerated skin after a root crosses the center',()=>{
 const o=root(),asset=floraAsset(o.asset),tip=asset.skeleton[2],source=asset.meshes[0];let triangle=0,distance=Infinity;
 for(let i=0;i<source.indices.length;i+=3){const p=new T.Vector3();for(let j=0;j<3;j++)p.add(new T.Vector3().fromArray(source.positions,source.indices[i+j]*3));p.divideScalar(3);const d=p.distanceToSquared(new T.Vector3(...tip.point));if(d<distance){triangle=i/3;distance=d;}}
 const pin={mesh:0,triangle,bary:[.2,.3,.5]};
 for(const x of [0,2,-3]){o.controls={[tip.id]:{offset:[x,.2,.1],scale:[1.4,1.4,1.4],rotation:[.2,0,0]}};const pose=floraBodyPinSurface(o,pin),field=floraBodyField(o);assert.ok(Math.abs(field.distance(...pose.point.toArray(),false))<.002);assert.ok(pose.normal.length()>.99);}
});
test('procedural body sockets expose only the structural skeleton and survive a finished weld',()=>{
 const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,'flora-forked-bough'),child=addFloraAsset(f,o.branch,'flora-basic-branch',0,0,{organ:o.id,socket:'joint:2'}),ids=floraAsset(o.asset).skeleton.map(n=>n.id);
 assert.deepEqual(floraConnectionSockets(o.asset).map(n=>n.id),ids);
 for(const live of [true,false]){const group=new T.Group();buildFlora(group,f,{}, {editable:true,live});try{
  const bounds=new T.Box3().setFromObject(group);let triangles=0;group.traverse(m=>{if(!m.isMesh)return;triangles+=m.geometry.index.count/3;assert.ok(Array.from(m.geometry.attributes.position.array).every(Number.isFinite));});assert.ok(triangles>0);
  assert.deepEqual(floraConnectionSockets(o.asset).map(n=>n.id),ids,'finishing the weld keeps every editable joint');
  const socket=floraConnectionSockets(o.asset).find(n=>n.id==='joint:2'),point=new T.Vector3(...floraSocketPose(o,socket).point).applyMatrix4(floraOrganMatrix(f,o));assert.ok(bounds.containsPoint(point),'the welded skin includes its connected structural joint');assert.ok(floraCurve(f,child.id).getPoint(0).distanceTo(point)<1e-6,'the outgoing branch stays on the body joint');
 }finally{disposePart(group);}}
});
