import * as T from '../../vendor/three.module.js';
import {JAPANESE_WALL,japaneseRoofCurve} from '../parts/japanese-wall-profile.js';

// A closed swept tile cap. Its cross section follows the Japan kit's roof
// curve; shared mitred rings join both curved panels and sharp wall corners.
export function japaneseWallRoof(e,side,inverse=new T.Matrix4()){
 const half=e.r.panelThickness/2+JAPANESE_WALL.roofOverhang,profile=[[-half,0]];
 for(let i=0;i<=8;i++){const t=-1+i/4;profile.push([t*half,japaneseRoofCurve(Math.abs(t))*half]);}
 profile.push([half,0]);
 const ring=p=>profile.map(([x,y])=>side(e,p,Math.sign(x)||1,false,Math.abs(x)).add(new T.Vector3(0,e.r.height+y,0))),a=ring(e.a),b=ring(e.b),positions=[],uvs=[],uDirections=[],vDirections=[],toLocal=new T.Matrix3().setFromMatrix4(inverse),start=e.roofStart??0,end=start+e.a.distanceTo(e.b),across=profile.map(()=>0),ridge=5;
 // Unwrap each slope from the ridge to its eave, following the swept surface.
 // Curves use radial stations; straight roofs measure each mitred vertex
 // along the ridge so the diagonal end cut cannot shear the entire run.
 for(const step of [-1,1])for(let i=ridge+step;i>0&&i<profile.length-1;i+=step){const j=i-step;across[i]=across[j]+Math.hypot(profile[i][0]-profile[j][0],profile[i][1]-profile[j][1]);}
 across[0]=across[1]+profile[1][1];across[profile.length-1]=across.at(-2)+profile.at(-2)[1];
 function triangle(points,uv,direction,uDirection=e.tangent,vDirection=e.normal){const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));if(normal.dot(direction)<0){points.reverse();uv.reverse();}const u=uDirection.clone().applyMatrix3(toLocal),v=vDirection.clone().applyMatrix3(toLocal);for(let i=0;i<3;i++){positions.push(...points[i].toArray());uvs.push(...uv[i]);uDirections.push(...u.toArray());vDirections.push(...v.toArray());}}
 for(let i=0;i<profile.length;i++){
  const j=(i+1)%profile.length,dx=profile[j][0]-profile[i][0],dy=profile[j][1]-profile[i][1],direction=e.normal.clone().multiplyScalar(-dy).add(new T.Vector3(0,dx,0));
  const vDirection=e.normal.clone().multiplyScalar(dx).add(new T.Vector3(0,dy,0)).normalize();
  const vi=i===profile.length-1?profile[i][0]:across[i],vj=i===profile.length-1?profile[j][0]:across[j];
  const along=(p,station)=>e.s.curveAngle?station:start+p.clone().sub(e.a).dot(e.tangent),ai=along(a[i],start),aj=along(a[j],start),bi=along(b[i],end),bj=along(b[j],end);
  triangle([a[i],b[i],b[j]],[[ai,vi],[bi,vi],[bj,vj]],direction,e.tangent,vDirection);triangle([a[i],b[j],a[j]],[[ai,vi],[bj,vj],[aj,vj]],direction,e.tangent,vDirection);
 }
 const caps=T.ShapeUtils.triangulateShape(profile.map(p=>new T.Vector2(...p)),[]);
 for(const face of caps){triangle(face.map(i=>a[i]),face.map(i=>profile[i]),e.tangent.clone().negate(),e.normal,new T.Vector3(0,1,0));triangle(face.map(i=>b[i]),face.map(i=>profile[i]),e.tangent,e.normal,new T.Vector3(0,1,0));}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('roofUV',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('roofU',new T.Float32BufferAttribute(uDirections,3));geometry.setAttribute('roofV',new T.Float32BufferAttribute(vDirections,3));geometry.computeVertexNormals();return geometry;
}
