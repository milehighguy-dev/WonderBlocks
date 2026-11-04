import * as T from '../../vendor/three.module.js';
import {buildingContours,offsetContour} from './building-contours.js';
import {validateBaseSlope,baseSlopeExpansion,BASE_BEVEL_HEIGHT} from '../parts/building-base.js';
import {weldSurface} from '../collision/collision-geometry.js';

// Split existing faces at the shoulder before widening their lower vertices.
// Jambs, wall corners and closed collision volumes receive the same profile.
function splitTriangle(triangle,height){
 const low=[],high=[];
 for(let i=0;i<triangle.length;i++){
  const a=triangle[i],b=triangle[(i+1)%triangle.length],da=a.y-height,db=b.y-height;
  if(da<=1e-9)low.push(a);if(da>=-1e-9)high.push(a);
  if(da*db< -1e-18){const p=a.clone().lerp(b,da/(da-db));low.push(p);high.push(p);}
 }
 if(triangle.every(p=>Math.abs(p.y-height)<1e-9))return [triangle];
 return [low,high].filter(p=>p.length>=3).flatMap(p=>p.slice(1,-1).map((v,i)=>[p[0],v,p[i+2]]));
}
function barycentric(p,a,b,c){
 const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-12)return null;
 const u=((b.z-c.z)*(p.x-c.x)+(c.x-b.x)*(p.z-c.z))/den,v=((c.z-a.z)*(p.x-c.x)+(a.x-c.x)*(p.z-c.z))/den,w=1-u-v;
 return Math.min(u,v,w)>=-2e-5?[u,v,w]:null;
}
export function profileBuildingBase(group,part,settings){
 validateBaseSlope(settings);if(!settings.height||!settings.projection)return;
 const plan=part.interior,scale=part.scale.map(Math.abs),loops=buildingContours(plan),height=Math.min(settings.height/scale[1],...loops.flatMap(loop=>loop.map(e=>e.height))),bands=[];
 for(const loop of loops){
  const outer=offsetContour(loop,plan.shell?0:plan.thickness/2,[1,1,1]),inner=offsetContour(loop,plan.shell?-plan.shell.inset:-plan.thickness/2,[1,1,1]),foot=offsetContour(loop.map((e,i)=>({...e,a:outer[i]})),settings.projection,scale);
  for(let i=0;i<loop.length;i++){
   const j=(i+1)%loop.length,delta=[i,j].map(k=>({x:foot[k].x-outer[k].x,z:foot[k].z-outer[k].z}));
   bands.push({points:[outer[i],outer[j],inner[j]],deltas:[delta[0],delta[1],{x:0,z:0}]},{points:[outer[i],inner[j],inner[i]],deltas:[delta[0],{x:0,z:0},{x:0,z:0}]});
  }
 }
 const warp=p=>{
  if(p.y>=height-1e-9)return p;
  for(const band of bands){const weights=barycentric(p,...band.points);if(!weights)continue;const fade=baseSlopeExpansion(p.y/height);
   p.x+=weights.reduce((n,w,i)=>n+w*band.deltas[i].x,0)*fade;p.z+=weights.reduce((n,w,i)=>n+w*band.deltas[i].z,0)*fade;break;
  }return p;
 };
 const warpTriangles=(positions,triangles,matrix,uv=null,targetUV=[])=>{
  const inverse=matrix.clone().invert(),result=[];
  for(const tri of triangles){const points=tri.map(i=>new T.Vector3(...positions[i]).applyMatrix4(matrix));
   const pieces=splitTriangle(points,height).flatMap(piece=>splitTriangle(piece,height*BASE_BEVEL_HEIGHT));
   for(const piece of pieces){
    const warped=piece.map(p=>warp(p.clone()).applyMatrix4(inverse));
    if(warped[1].clone().sub(warped[0]).cross(warped[2].clone().sub(warped[0])).lengthSq()>1e-18){result.push(...warped.map(p=>p.toArray()));
     if(uv)for(const p of piece){const w=T.Triangle.getBarycoord(p,...points,new T.Vector3()).toArray();targetUV.push(w.reduce((n,v,i)=>n+v*uv.getX(tri[i]),0),w.reduce((n,v,i)=>n+v*uv.getY(tri[i]),0));}
    }
   }
  }return result;
 };
 const volumes=new Map();
 for(const mesh of group.children){
  if(!mesh.isMesh||mesh.userData.interiorStair||mesh.userData.roofParapet)continue;
  mesh.updateMatrix();const source=mesh.geometry,position=source.attributes.position;if(!position)continue;
  const positions=Array.from({length:position.count},(_,i)=>new T.Vector3().fromBufferAttribute(position,i).toArray());
  if(!positions.some(p=>new T.Vector3(...p).applyMatrix4(mesh.matrix).y<height-1e-9))continue;
  const index=source.index,triangles=Array.from({length:(index?.count??position.count)/3},(_,i)=>[0,1,2].map(j=>index?index.getX(i*3+j):i*3+j)),uv=[],vertices=warpTriangles(positions,triangles,mesh.matrix,source.attributes.uv,uv);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices.flat(),3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv.length?uv:new Float32Array(vertices.length*2),2));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();mesh.geometry=geometry;source.dispose();
  for(const key of ['structuralVolume','shadowVolume']){const volume=mesh.userData[key];if(!volume)continue;
   const matrix=mesh.matrix.clone().multiply(volume.matrix?new T.Matrix4().fromArray(volume.matrix):new T.Matrix4()),cacheKey=JSON.stringify([volume,matrix.elements]);let result=volumes.get(cacheKey);
   if(!result){const vertices=warpTriangles(volume.positions,volume.triangles,matrix);result=weldSurface([{positions:vertices,triangles:Array.from({length:vertices.length/3},(_,i)=>[i*3,i*3+1,i*3+2])}]);if(volume.matrix)result.matrix=volume.matrix;volumes.set(cacheKey,result);}mesh.userData[key]=result;
  }
 }
 // UVs are interpolated from the original wall faces, so even steep slopes
 // retain their wall projection and join the upright texture at the shoulder.
}
