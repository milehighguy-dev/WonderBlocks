import {DEFAULT_DOOR_WIDTH,DEFAULT_DOOR_HEIGHT} from './interior-defaults.js';
import {applySurface} from '../materials/surfaces.js';
import {wallPoint} from './polygon-plan.js';
import {beveledTowerFootprint} from '../parts/coruscant.js';
import {invalidateStructuralVolume} from '../collision/structural-volumes.js';
import * as T from '../../vendor/three.module.js';
export const entranceHost=p=>!!p&&['block','round','hex','taper','cor-roundtop-body','interior'].includes(p.type)&&!p.rotation[0]&&!p.rotation[2]&&p.scale[1]>0&&p.scale[2]>0&&!Object.values(p.shape||{}).some(Boolean);
export const partMatrix=p=>new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion().setFromEuler(new T.Euler(...p.rotation)),new T.Vector3(...p.scale));
export function entranceFrame(p,e){const origin=new T.Vector3(...e.anchor).applyMatrix4(partMatrix(p));return new T.Matrix4().compose(origin,new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.rotation[1]+Math.sign(p.scale[0])*e.yaw),new T.Vector3(Math.sign(p.scale[0]),1,1));}
export function entrancePort(p,e){const matrix=entranceFrame(p,e);return {point:new T.Vector3().applyMatrix4(matrix),angle:p.rotation[1]+Math.sign(p.scale[0])*e.yaw,width:e.width};}
export function makeEntrance(p,point,normal,width=DEFAULT_DOOR_WIDTH){if(!entranceHost(p))throw Error('Place entrances on an upright building shell.');return {id:crypto.randomUUID(),anchor:point.clone().applyMatrix4(partMatrix(p).invert()).toArray(),yaw:Math.sign(p.scale[0])*(Math.atan2(normal.x,normal.z)-p.rotation[1]),width,height:DEFAULT_DOOR_HEIGHT,landingWidth:Math.max(3,width),depth:3};}
export function validateEntrances(p){if(p.entrances===undefined)return;if(!entranceHost(p)||!Array.isArray(p.entrances)||p.entrances.length>32)throw Error('Invalid building entrances.');const ids=new Set();for(const e of p.entrances){if(!e||typeof e.id!=='string'||ids.has(e.id)||!Array.isArray(e.anchor)||e.anchor.length!==3||e.anchor.some(v=>!Number.isFinite(v)||Math.abs(v)>1000)||!Number.isFinite(e.yaw))throw Error('Invalid entrance anchor.');ids.add(e.id);for(const [key,min,max] of [['width',.5,30],['height',1.8,12],['landingWidth',.5,50],['depth',.5,30]])if(!Number.isFinite(e[key])||e[key]<min||e[key]>max)throw Error('Invalid entrance '+key);if(e.landingWidth<e.width)throw Error('The landing must be at least as wide as its opening.');if(!e.interiorId&&!entranceFits(p,e))throw Error('Keep the opening and landing within the building shell.');}}
// Triangle/convex-volume subtraction preserves UVs and normals at every clipped edge.
export function subtractEntranceVolume(geometry,matrix,bounds){return subtractConvexVolume(geometry,matrix,[[1,0,0,-bounds[0]],[-1,0,0,bounds[1]],[0,1,0,-bounds[2]],[0,-1,0,bounds[3]],[0,0,1,-bounds[4]],[0,0,-1,bounds[5]]]);}
export function subtractConvexVolume(geometry,matrix,planes){const src=geometry.index?geometry.toNonIndexed():geometry.clone(),names=Object.keys(src.attributes),out=Object.fromEntries(names.map(n=>[n,[]]));

 const mix=(a,b,t)=>Object.fromEntries(Object.keys(a).map(k=>[k,a[k].map((v,i)=>v+(b[k][i]-v)*t)]));
 function split(poly,nx,ny,nz,offset){const inside=[],outside=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a.cut[0]*nx+a.cut[1]*ny+a.cut[2]*nz+offset,db=b.cut[0]*nx+b.cut[1]*ny+b.cut[2]*nz+offset;(da>=0?inside:outside).push(a);if((da>=0)!==(db>=0)){const v=mix(a,b,da/(da-db));inside.push(v);outside.push(v);}}return [inside,outside];}
 function emit(poly){for(let i=1;i<poly.length-1;i++)for(const v of [poly[0],poly[i],poly[i+1]])for(const n of names)out[n].push(...v[n]);}
 for(let i=0;i<src.attributes.position.count;i+=3){let poly=Array.from({length:3},(_,j)=>{const v={};for(const n of names){const a=src.attributes[n];v[n]=Array.from({length:a.itemSize},(_,k)=>a.array[(i+j)*a.itemSize+k]);}v.cut=new T.Vector3(...v.position).applyMatrix4(matrix).toArray();return v;});if(planes.some(([nx,ny,nz,d])=>poly.every(v=>v.cut[0]*nx+v.cut[1]*ny+v.cut[2]*nz+d<0))){emit(poly);continue;}for(const plane of planes){if(poly.length<3)break;const [inside,outside]=split(poly,...plane);emit(outside);poly=inside;}}
 const g=new T.BufferGeometry();for(const n of names)g.setAttribute(n,new T.Float32BufferAttribute(out[n],src.attributes[n].itemSize));src.dispose();return g;
}
export function buildEntrances(group,p){if(!p.entrances?.length)return;group.updateMatrixWorld(true);const host=partMatrix(p);
 for(const e of p.entrances){const frame=entranceFrame(p,e),toEntry=frame.clone().invert().multiply(host),toHost=toEntry.clone().invert(),w=e.width,h=e.height,d=e.depth,lw=e.landingWidth;
   const space=p.entranceInteriors?.find(s=>s.id===e.interiorId),levels=space?[space.plan,...(space.plan.storeys||[]).map(s=>s.plan)]:[],plan=levels.find(p=>p.doors.some(d=>d.entranceId===e.id)),door=plan?.doors.find(d=>d.entranceId===e.id),roomFrame=space?entranceFrame(p,space):frame;
   let depth=.2;if(door?.axis){const pt=wallPoint(door,door.offset),v=new T.Vector3(pt.x,0,pt.z).applyMatrix4(roomFrame).applyMatrix4(frame.clone().invert());depth=Math.max(.001,-v.z);}
  // A short throat keeps opening width independent from the wider room behind it.
  const cuts=e.interiorId?[[-w/2,w/2,1e-5,h,-Math.max(.5,depth+(plan?.thickness||.2)/2),.12]]:[[-w/2,w/2,0,h,-Math.min(.45,d),.12],[-lw/2,lw/2,0,h,-d,-.35]];
  for(const m of [...group.children])if(m.isMesh){m.updateMatrix();for(const bounds of cuts){const matrix=toEntry.clone().multiply(m.matrix),next=subtractEntranceVolume(m.geometry,matrix,bounds);invalidateStructuralVolume(m,matrix,{bounds});m.geometry.dispose();m.geometry=next;}}
  if(e.interiorId){
   const slab=plan?.slab||.2,finish=plan?.finishes.floor,material=new T.MeshStandardMaterial({color:finish?.color||'#d9d4bd',roughness:.8}),geometry=new T.BoxGeometry(w,slab,depth);geometry.translate(0,-slab/2,-depth/2);
   // Project UVs in the same room frame before baking into the host, so tiles meet.
   geometry.applyMatrix4(roomFrame.clone().invert().multiply(frame));const threshold=new T.Mesh(geometry,material),temporary=new T.Group();temporary.add(threshold);if(finish)applySurface(temporary,material,{scale:[1,1,1],surface:{preset:finish.preset,scale:finish.scale}});threshold.geometry.applyMatrix4(host.clone().invert().multiply(roomFrame));threshold.userData.connectedInteriorId=e.interiorId;threshold.userData.entranceId=e.id;group.add(threshold);
   // The cut removes the room's original reveal caps too. Line the complete
   // throat through the inner wall face, with normals facing the opening.
   const back=-(depth+(plan?.thickness||.2)/2),a=-w/2,b=w/2,vertices=[];
   const quad=(a,b,c,d,normal)=>{let pts=[a,b,c,d].map(v=>new T.Vector3(...v));if(pts[1].clone().sub(pts[0]).cross(pts[2].clone().sub(pts[0])).dot(new T.Vector3(...normal))<0)pts.reverse();for(const i of [0,1,2,0,2,3])vertices.push(...pts[i].toArray());};
   quad([a,0,0],[a,0,back],[a,h,back],[a,h,0],[1,0,0]);
   quad([b,0,0],[b,h,0],[b,h,back],[b,0,back],[-1,0,0]);
   quad([a,h,0],[a,h,back],[b,h,back],[b,h,0],[0,-1,0]);
   const liningGeometry=new T.BufferGeometry();liningGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));liningGeometry.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));liningGeometry.computeVertexNormals();liningGeometry.applyMatrix4(roomFrame.clone().invert().multiply(frame));
   const wallFinish=plan?.finishes.wall,wallMaterial=new T.MeshStandardMaterial({color:wallFinish?.color||'#d9d4bd',roughness:.8}),lining=new T.Mesh(liningGeometry,wallMaterial),liningGroup=new T.Group();liningGroup.add(lining);if(wallFinish)applySurface(liningGroup,wallMaterial,{scale:[1,1,1],surface:{preset:wallFinish.preset,scale:wallFinish.scale}});liningGeometry.applyMatrix4(host.clone().invert().multiply(roomFrame));lining.userData.connectedInteriorId=e.interiorId;lining.userData.entranceId=e.id;lining.castShadow=lining.receiveShadow=true;group.add(lining);continue;
  }
  const material=new T.MeshStandardMaterial({color:'#d9d4bd',roughness:.8});
  // Line the cavity itself. Closed wall boxes left end caps on the facade,
  // overlapping the uncut hull and producing a flickering rectangular border.
  const throat=Math.min(.35,d),outline=[[-w/2,0],[w/2,0],[w/2,-throat],[lw/2,-throat],[lw/2,-d],[-lw/2,-d],[-lw/2,-throat],[-w/2,-throat]];
  const positions=[];
  function triangle(a,b,c,normal){if(b.clone().sub(a).cross(c.clone().sub(a)).dot(normal)<0)[b,c]=[c,b];if(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()<1e-16)return;positions.push(...a.toArray(),...b.toArray(),...c.toArray());}
  const planar=outline.map(([x,z])=>new T.Vector2(x,z)),triangles=T.ShapeUtils.triangulateShape(planar,[]);
  function horizontal(y,normal){for(const tri of triangles)triangle(...tri.map(i=>new T.Vector3(outline[i][0],y,outline[i][1])),normal);}
  horizontal(0,new T.Vector3(0,1,0));
  if(!p.interior){horizontal(h,new T.Vector3(0,-1,0));for(let i=1;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length],normal=new T.Vector3(b[1]-a[1],0,a[0]-b[0]),v=[new T.Vector3(a[0],0,a[1]),new T.Vector3(b[0],0,b[1]),new T.Vector3(b[0],h,b[1]),new T.Vector3(a[0],h,a[1])];triangle(v[0],v[1],v[2],normal);triangle(v[0],v[2],v[3],normal);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(positions.flatMap((_,i)=>i%3===0?[positions[i],positions[i+2]]:[]),2));g.computeVertexNormals();g.applyMatrix4(toHost);const lining=new T.Mesh(g,material);lining.userData.entranceId=e.id;lining.castShadow=lining.receiveShadow=true;group.add(lining);

 }
}

export function entranceFits(p,e){
 const s=p.interior?.shell,body=p.type==='cor-roundtop-body',height=(s?.height??(body?4:1))*p.scale[1];
 const local=partMatrix(p).invert().multiply(entranceFrame(p,e));
 let outline=s?.points|| (body?beveledTowerFootprint():null);
 if(!outline&&['round','hex','taper'].includes(p.type)){const n=p.type==='round'?(p.parameters?.sides??24):6;outline=Array.from({length:n},(_,i)=>({x:Math.sin(i*2*Math.PI/n)*.5,z:Math.cos(i*2*Math.PI/n)*.5}));}
 const inside=(x,z,y)=>{if(outline){let sign=0;const factor=p.type==='taper'?1-.4*y:1;for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length],v=(b.x-a.x)*(z/factor-a.z)-(b.z-a.z)*(x/factor-a.x);if(Math.abs(v)<1e-5)continue;if(sign&&sign!==Math.sign(v))return false;sign=Math.sign(v);}return true;}return Math.abs(x)<=(s?.width??1)/2+1e-5&&Math.abs(z)<=(s?.depth??1)/2+1e-5;};
 for(const y of [0,e.height])for(const [width,z] of [[e.width,-.02],[e.landingWidth,-.36],[e.landingWidth,-e.depth]])for(const x of [-width/2,width/2]){const v=new T.Vector3(x,y,z).applyMatrix4(local);if(v.y*p.scale[1]<-1e-5||v.y*p.scale[1]>height+1e-5||!inside(v.x,v.z,v.y))return false;}
 return true;
}
