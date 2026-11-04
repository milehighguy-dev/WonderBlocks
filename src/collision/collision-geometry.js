import * as T from '../../vendor/three.module.js';
const key=v=>v.map(x=>Math.round(x*1e6)).join(',');

// Collision topology validation has no file-format limits or render materials.
export function assertClosedSurface(surface){
 const edges=new Set();
 for(const t of surface.triangles)for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],k=a+','+b;if(a===b||edges.has(k))throw Error('Collision surface has duplicate or degenerate edges.');edges.add(k);}
 for(const t of surface.triangles)for(let i=0;i<3;i++)if(!edges.has(t[(i+1)%3]+','+t[i]))throw Error('Collision surface has an open edge.');
 return surface;
}

export function weldSurface(segments){const positions=[],triangles=[],map=new Map();for(const s of segments)for(const t of s.triangles){const face=t.map(v=>{const p=s.positions[v],k=key(p);if(!map.has(k)){map.set(k,positions.length);positions.push([...p]);}return map.get(k);});if(new Set(face).size===3)triangles.push(face);}return {positions,triangles};}

// Intersection clipping can leave sub-millimetre strips which the native
// compiler welds away. Resolve them in the object's physical data, rather than
// emitting a collision-only model whose entire polygon tree disappears.
export function cleanCollisionSurface(surface,tolerance=.001){
 const positions=[],triangles=[],cells=new Map(),remap=[],seenFaces=new Set(),distanceSquared=tolerance*tolerance;
 const cell=p=>p.map(v=>Math.floor(v/tolerance)),cellKey=p=>p.join(',');
 for(const p of surface.positions){const c=cell(p);let found=-1;
  search:for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const i of cells.get(cellKey([c[0]+x,c[1]+y,c[2]+z]))??[]){if(p.reduce((sum,v,axis)=>sum+(v-positions[i][axis])**2,0)<distanceSquared){found=i;break search;}}
  if(found<0){found=positions.length;positions.push([...p]);const key=cellKey(c);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(found);}remap.push(found);
 }
 for(const t of surface.triangles){const face=t.map(v=>remap[v]);if(new Set(face).size<3)continue;const [a,b,c]=face.map(v=>new T.Vector3(...positions[v])),u=b.clone().sub(a),v=c.clone().sub(a),longest=Math.max(u.length(),v.length(),c.distanceTo(b));if(u.cross(v).length()/longest<tolerance)continue;
  const rotations=[face.join(','),[face[1],face[2],face[0]].join(','),[face[2],face[0],face[1]].join(',')],key=rotations.sort()[0];if(seenFaces.has(key))continue;seenFaces.add(key);triangles.push(face);
 }
 return weldSurface([{positions,triangles}]);
}

export function surfaceSegment(surface,material=0){const normals=surface.positions.map(()=>new T.Vector3());for(const t of surface.triangles){const [a,b,c]=t.map(v=>new T.Vector3(...surface.positions[v])),n=b.sub(a).cross(c.sub(a));for(const v of t)normals[v].add(n);}return {positions:surface.positions,normals:normals.map(n=>n.normalize().toArray()),uvs:surface.positions.map(()=>[0,0]),triangles:surface.triangles,material};}

export function boxSurface(primitive,{shrink=1}={}){const dimensions=primitive.dimensions.map(v=>v*2*shrink),geometry=primitive.shape===0?new T.SphereGeometry(dimensions[0]/2,8,4):new T.BoxGeometry(...dimensions),matrix=new T.Matrix4().compose(new T.Vector3(...primitive.position),new T.Quaternion(...primitive.rotation),new T.Vector3(1,1,1));geometry.applyMatrix4(matrix);const positions=Array.from({length:geometry.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(geometry.attributes.position,i).toArray()),triangles=Array.from({length:geometry.index.count/3},(_,i)=>[0,1,2].map(j=>geometry.index.getX(i*3+j))),surface=weldSurface([{positions,triangles}]);geometry.dispose();return surface;}

export function fitBox(segments,{thickness=.08}={}){
 const surface=weldSurface(segments),points=surface.positions.map(p=>new T.Vector3(...p));if(!points.length)return null;const normals=[];
 for(const t of surface.triangles){const [a,b,c]=t.map(i=>points[i]),n=b.clone().sub(a).cross(c.clone().sub(a));if(n.lengthSq()<1e-16)continue;n.normalize();if(!normals.some(v=>Math.abs(v.dot(n))>.99999))normals.push(n);if(normals.length>3)return null;}
 let axes;if(normals.length===1){const n=normals[0],counts=new Map();for(const t of surface.triangles)for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],k=[Math.min(a,b),Math.max(a,b)].join(',');counts.set(k,(counts.get(k)??0)+1);}const boundary=[...counts].filter(([,count])=>count===1).map(([edge])=>{const [a,b]=edge.split(',').map(Number);return points[b].clone().sub(points[a]);}).sort((a,b)=>b.lengthSq()-a.lengthSq());const e=boundary[0]?.normalize();if(!e)return null;axes=[e,n.clone().cross(e).normalize(),n];}
 else if(normals.length===3&&normals.every((a,i)=>normals.every((b,j)=>i===j||Math.abs(a.dot(b))<1e-5)))axes=[normals[0],normals[1],normals[0].clone().cross(normals[1]).normalize()];else return null;
 const min=axes.map(()=>Infinity),max=axes.map(()=>-Infinity);for(const p of points)axes.forEach((a,i)=>{const d=a.dot(p);min[i]=Math.min(min[i],d);max[i]=Math.max(max[i],d);});const span=max.map((v,i)=>v-min[i]),epsilon=Math.max(.00001,...span.map(v=>v*.00001));
 const faceAreas=Array(6).fill(0);for(const t of surface.triangles){const vertices=t.map(v=>points[v]),area=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).length()/2;if(normals.length===1){faceAreas[0]+=area;continue;}let face=-1;for(let i=0;i<3;i++)for(let side=0;side<2;side++)if(vertices.every(p=>Math.abs(axes[i].dot(p)-(side?max[i]:min[i]))<=epsilon))face=i*2+side;if(face<0)return null;faceAreas[face]+=area;}
 if(normals.length===1){if(Math.abs(faceAreas[0]-span[0]*span[1])>Math.max(1e-6,span[0]*span[1]*1e-5))return null;}
 else for(let i=0;i<3;i++){const area=span[(i+1)%3]*span[(i+2)%3];if([0,1].some(side=>Math.abs(faceAreas[i*2+side]-area)>Math.max(1e-6,area*1e-5)))return null;}
 const center=new T.Vector3();axes.forEach((a,i)=>center.addScaledVector(a,(min[i]+max[i])/2));if(normals.length===1){const planarAxis=span.findIndex(v=>v<epsilon);if(planarAxis<0)return null;span[planarAxis]=thickness;center.addScaledVector(axes[planarAxis],-thickness/2);}
 const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(...axes));return {shape:4,dimensions:span.map(v=>Math.max(.0001,v/2)),position:center.toArray(),rotation:rotation.toArray(),source:'box',...(normals.length===1?{inferredThicknessMetres:thickness}:{})};
}


export function structuralSegments(mesh,frameInverse,volume=mesh.userData.structuralVolume){if(!volume)return null;const matrix=frameInverse.clone().multiply(mesh.matrixWorld);if(volume.matrix)matrix.multiply(new T.Matrix4().fromArray(volume.matrix));const positions=volume.positions.map(p=>new T.Vector3(...p).applyMatrix4(matrix).toArray()),triangles=volume.triangles.map(t=>matrix.determinant()<0?[t[0],t[2],t[1]]:[...t]);return [surfaceSegment(weldSurface([{positions,triangles}]))];}


export function fitSphere(segments){const surface=weldSurface(segments);if(surface.positions.length<6)return null;try{assertClosedSurface(surface);}catch{return null;}const points=surface.positions.map(p=>new T.Vector3(...p)),center=new T.Box3().setFromPoints(points).getCenter(new T.Vector3()),radii=points.map(p=>p.distanceTo(center)),radius=Math.max(...radii);if(radius<=1e-6||Math.min(...radii)<radius*.99999)return null;let inside=Infinity;for(const t of surface.triangles){const [a,b,c]=t.map(v=>points[v]),normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),distance=normal.dot(a.clone().sub(center));if(distance<=0)return null;inside=Math.min(inside,distance);if(points.some(p=>normal.dot(p.clone().sub(a))>radius*1e-5))return null;}return {shape:0,dimensions:[inside,inside,inside],position:center.toArray(),rotation:[0,0,0,1],source:'sphere'};}


export function fitDetailBox(segments){
 const surface=weldSurface(segments);if(surface.positions.length<4||surface.positions.length>512)return null;
 try{assertClosedSurface(surface);}catch{return null;}
 const points=surface.positions.map(p=>new T.Vector3(...p)),center=points.reduce((p,q)=>p.add(q),new T.Vector3()).multiplyScalar(1/points.length),planes=[],edges=[];
 for(const t of surface.triangles){const [a,b,c]=t.map(v=>points[v]),normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),distance=normal.dot(a.clone().sub(center));
  if(distance<1e-7)return null;
  if(!planes.some(p=>p.normal.dot(normal)>.99999&&Math.abs(p.distance-distance)<1e-5))planes.push({normal,distance});
  for(const [a,b] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]])edges.push(points[b].clone().sub(points[a]));
 }
 edges.sort((a,b)=>b.lengthSq()-a.lengthSq());const candidates=[];
 // Long triangle diagonals alone produce tilted, short cores in tapered posts.
 // Include cap normals and frame axes before considering edge directions.
 const addAxis=direction=>{const axis=direction.clone().normalize();if(!candidates.some(a=>Math.abs(a.dot(axis))>.999))candidates.push(axis);};
 for(const axis of [new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1),...planes.slice(0,12).map(p=>p.normal)])addAxis(axis);
 let edgeAxes=0;for(const edge of edges){const before=candidates.length;addAxis(edge);if(candidates.length>before&&++edgeAxes===4)break;}
 let best=null;
 for(const x of candidates){const perpendicular=planes.map(p=>p.normal.clone().addScaledVector(x,-p.normal.dot(x))).filter(n=>n.lengthSq()>1e-8);
  for(const normal of perpendicular.slice(0,8)){const y=normal.normalize(),z=x.clone().cross(y).normalize(),axes=[x,y,z],limits=axes.map(a=>Math.max(...points.map(p=>Math.abs(a.dot(p.clone().sub(center)))))),constraints=planes.map(p=>({a:axes.map(a=>Math.abs(p.normal.dot(a))),d:p.distance}));
   for(let iy=1;iy<=12;iy++)for(let iz=1;iz<=12;iz++){const hy=limits[1]*iy/12,hz=limits[2]*iz/12;let hx=limits[0];for(const p of constraints){const rest=p.d-p.a[1]*hy-p.a[2]*hz;if(rest<0){hx=-1;break;}if(p.a[0]>1e-8)hx=Math.min(hx,rest/p.a[0]);}const volume=hx*hy*hz;if(hx>1e-5&&(!best||volume>best.volume))best={volume,dimensions:[hx,hy,hz],axes:axes.map(a=>a.clone())};}
  }
 }
 if(!best)return null;const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(...best.axes));return {shape:4,dimensions:best.dimensions.map(v=>v*.999),position:center.toArray(),rotation:rotation.toArray(),source:'inscribed detail'};
}




export function collisionNeedsPreservation(surface){
 const points=surface.positions.map(p=>new T.Vector3(...p)),groups=new Map();
 for(const triangle of surface.triangles){const [a,b,c]=triangle.map(v=>points[v]),normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.lengthSq()<1e-18)continue;normal.normalize();const plane=[...normal.toArray(),-normal.dot(a)].map(v=>Math.round(v*1e4)).join(',');if(!groups.has(plane))groups.set(plane,{normal,edges:new Map()});const group=groups.get(plane);for(let i=0;i<3;i++){const a=triangle[i],b=triangle[(i+1)%3],key=a<b?a+','+b:b+','+a;group.edges.set(key,(group.edges.get(key)??0)+1);}}
 for(const {normal,edges} of groups.values()){
  if([...edges.values()].some(count=>count>2))return true;
  const neighbours=new Map();for(const [edge,count] of edges)if(count===1){const [a,b]=edge.split(',').map(Number);for(const [v,n] of [[a,b],[b,a]]){if(!neighbours.has(v))neighbours.set(v,[]);neighbours.get(v).push(n);}}
  if(!neighbours.size)continue;if([...neighbours.values()].some(list=>list.length!==2))return true;
  const first=neighbours.keys().next().value,loop=[first];let previous=first,current=neighbours.get(first)[0];while(current!==first){if(loop.length>neighbours.size)return true;loop.push(current);const next=neighbours.get(current).find(v=>v!==previous);previous=current;current=next;}
  if(loop.length!==neighbours.size)return true; // Multiple loops include holes.
  if(loop.length>100)return true; // Native traversal truncates larger polygons.
  let positive=false,negative=false;for(let i=0;i<loop.length;i++){const a=points[loop[i]],b=points[loop[(i+1)%loop.length]],c=points[loop[(i+2)%loop.length]],turn=b.clone().sub(a).cross(c.clone().sub(b)).dot(normal);if(turn>1e-8)positive=true;if(turn<-1e-8)negative=true;}if(positive&&negative)return true;
 }
 return false;
}
