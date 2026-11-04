import * as T from '../../vendor/three.module.js';
export const METABALL_DETAILS={low:16,standard:24,high:36};
export const defaultMetaballs=()=>({blend:.18,detail:'standard',blobs:[{id:crypto.randomUUID(),position:[0,.75,0],radius:.75}]});
export function validateMetaballs(data){
 if(!data||!Number.isFinite(data.blend)||data.blend<0||data.blend>1||!Object.hasOwn(METABALL_DETAILS,data.detail)||!Array.isArray(data.blobs)||!data.blobs.length||data.blobs.length>32)throw Error('Invalid metaball settings.');
 const ids=new Set();for(const b of data.blobs){if(!b||typeof b.id!=='string'||!b.id.length||b.id.length>100||ids.has(b.id)||!Number.isFinite(b.radius)||b.radius<.1||b.radius>10||!Array.isArray(b.position)||b.position.length!==3||b.position.some(v=>!Number.isFinite(v)||Math.abs(v)>20))throw Error('Invalid metaball blob.');for(const key of ['scale','rotation'])if(b[key]!==undefined&&(!Array.isArray(b[key])||b[key].length!==3||b[key].some(v=>!Number.isFinite(v)||(key==='scale'?(v<.1||v>10):Math.abs(v)>Math.PI*8))))throw Error('Invalid blob transform.');ids.add(b.id);}return data;
}
// A smooth minimum of sphere distances. Log-sum-exp gives the same surface
// regardless of blob order, and falls back to the exact union at zero blend.
function sphereInfo(b){const radii=(b.scale||[1,1,1]).map(v=>v*b.radius),matrix=new T.Matrix4().makeRotationFromEuler(new T.Euler(...(b.rotation||[0,0,0]))),r=matrix.elements;return {b,radii,r,spherical:radii[0]===radii[1]&&radii[1]===radii[2],extent:[0,1,2].map(i=>Math.hypot(r[i]*radii[0],r[i+4]*radii[1],r[i+8]*radii[2]))};}
function prepareField(data){const spheres=data.blobs.map(sphereInfo);return (x,y,z)=>{let min=Infinity;const distances=spheres.map(({b,radii,r,spherical})=>{const dx=x-b.position[0],dy=y-b.position[1],dz=z-b.position[2];if(spherical){const d=Math.hypot(dx,dy,dz)-radii[0];min=Math.min(min,d);return d;}const p=[r[0]*dx+r[1]*dy+r[2]*dz,r[4]*dx+r[5]*dy+r[6]*dz,r[8]*dx+r[9]*dy+r[10]*dz],k0=Math.hypot(...p.map((v,i)=>v/radii[i])),k1=Math.hypot(...p.map((v,i)=>v/(radii[i]*radii[i]))),d=k1?k0*(k0-1)/k1:-Math.min(...radii);min=Math.min(min,d);return d;});if(!data.blend||spheres.length===1)return min;return min-data.blend*Math.log(distances.reduce((sum,d)=>sum+Math.exp((min-d)/data.blend),0));};}
export function metaballField(data,x,y,z){return prepareField(data)(x,y,z);}
export function metaballGeometry(data){
 validateMetaballs(data);const field=prepareField(data);
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
 for(const b of data.blobs){const {extent}=sphereInfo(b);for(let k=0;k<3;k++){low[k]=Math.min(low[k],b.position[k]-extent[k]);high[k]=Math.max(high[k],b.position[k]+extent[k]);}}
 const padding=data.blend*Math.log(data.blobs.length)+.05;
 for(let k=0;k<3;k++){low[k]-=padding;high[k]+=padding;}
 // Preserve small isolated blobs: sample each connected region separately so a
 // distant blob cannot reduce its neighbor to less than a grid cell.
 const components=[];for(const b of data.blobs){let matching=components.filter(c=>c.some(q=>Math.hypot(...b.position.map((v,k)=>v-q.position[k]))<b.radius*Math.max(...(b.scale||[1,1,1]))+q.radius*Math.max(...(q.scale||[1,1,1]))+2*padding));if(!matching.length)components.push([b]);else{const combined=[b,...matching.flat()];for(const c of matching)components.splice(components.indexOf(c),1);components.push(combined);}}
 if(components.length>1){const pieces=components.map(blobs=>metaballGeometry({...data,blobs}));const positions=[],normals=[],indices=[];for(const g of pieces){const offset=positions.length/3;positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);for(const i of g.index.array)indices.push(i+offset);g.dispose();}return finish(positions,normals,indices);}
 const span=high.map((v,k)=>v-low[k]),step=Math.max(...span)/METABALL_DETAILS[data.detail],size=span.map(v=>Math.ceil(v/step)+1),[nx,ny,nz]=size,total=nx*ny*nz,values=new Float32Array(total),points=new Array(total);
 const id=(x,y,z)=>(z*ny+y)*nx+x;
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=id(x,y,z),p=[low[0]+x*step,low[1]+y*step,low[2]+z*step];points[i]=p;values[i]=field(...p);}
 const positions=[],normals=[],indices=[],edges=new Map(),epsilon=Math.max(1e-5,step*.01);
 const vertex=(a,b)=>{if(a>b)[a,b]=[b,a];const key=a+':'+b;if(edges.has(key))return edges.get(key);const t=values[a]/(values[a]-values[b]),p=points[a].map((v,k)=>v+(points[b][k]-v)*t),normal=[0,1,2].map(k=>{const plus=[...p],minus=[...p];plus[k]+=epsilon;minus[k]-=epsilon;return field(...plus)-field(...minus);}),len=Math.hypot(...normal)||1,index=positions.length/3;positions.push(...p);normals.push(...normal.map(v=>v/len));edges.set(key,index);return index;};
 const triangle=(a,b,c)=>{const va=new T.Vector3(...positions.slice(a*3,a*3+3)),vb=new T.Vector3(...positions.slice(b*3,b*3+3)),vc=new T.Vector3(...positions.slice(c*3,c*3+3)),n=vb.sub(va).cross(vc.sub(va));if(n.lengthSq()===0)return;const outward=new T.Vector3(...normals.slice(a*3,a*3+3));if(n.dot(outward)<0)[b,c]=[c,b];indices.push(a,b,c);};
 const tetrahedra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
  const cube=[id(x,y,z),id(x+1,y,z),id(x+1,y+1,z),id(x,y+1,z),id(x,y,z+1),id(x+1,y,z+1),id(x+1,y+1,z+1),id(x,y+1,z+1)];
  for(const tetra of tetrahedra){const inside=tetra.map(i=>cube[i]).filter(i=>values[i]<0),outside=tetra.map(i=>cube[i]).filter(i=>values[i]>=0);if(!inside.length||!outside.length)continue;if(inside.length===1||outside.length===1){const single=inside.length===1?inside[0]:outside[0],others=inside.length===1?outside:inside;triangle(...others.map(i=>vertex(single,i)));}else{const [a,b]=inside,[c,d]=outside,ac=vertex(a,c),ad=vertex(a,d),bc=vertex(b,c),bd=vertex(b,d);triangle(ac,ad,bc);triangle(ad,bd,bc);}}
 }
 return finish(positions,normals,indices);
}
function finish(positions,normals,indices){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(positions.flatMap((v,i)=>i%3===0?[v,positions[i+1]]:[]),2));g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();return g;}
export function addMetaball(data,sourceId){if(data.blobs.length>=32)return null;const source=data.blobs.find(b=>b.id===sourceId)||data.blobs.at(-1),b={id:crypto.randomUUID(),position:source.position.map((v,k)=>Math.min(20,Math.max(-20,v+(k===0?source.radius*1.2:0)))),radius:source.radius,...(source.scale?{scale:[...source.scale]}:{}),...(source.rotation?{rotation:[...source.rotation]}:{})};data.blobs.push(b);return b;}
export function removeMetaball(data,id){if(data.blobs.length<=1)return false;const index=data.blobs.findIndex(b=>b.id===id);if(index<0)return false;data.blobs.splice(index,1);return true;}
