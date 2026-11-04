import * as T from '../../vendor/three.module.js';

// tat2_bldg_small1 has an intermediate ring near one third of the base
// height, with roughly one quarter of the ground-level projection remaining.
// Keep the two flat facets economical rather than smoothing them with loops.
export const BASE_BEVEL_HEIGHT=.35;
const BASE_BEVEL_PROJECTION=.25;
export function baseSlopeExpansion(t){
 if(t<=0)return 1;if(t>=1)return 0;
 return t<BASE_BEVEL_HEIGHT?1-(1-BASE_BEVEL_PROJECTION)*t/BASE_BEVEL_HEIGHT:BASE_BEVEL_PROJECTION*(1-t)/(1-BASE_BEVEL_HEIGHT);
}

export function validateBaseSlope(settings){
 if(!settings||typeof settings!=='object'||Array.isArray(settings)||Object.keys(settings).some(k=>!['height','projection'].includes(k))||!Number.isFinite(settings.height)||settings.height<0||settings.height>2||!Number.isFinite(settings.projection)||settings.projection<0||settings.projection>1.5)throw Error('Invalid base slope dimensions.');
 return settings;
}

// A continuous lower wall profile: wide at ground level, meeting the upright
// wall at the shoulder. Roof and upper-wall dimensions remain unchanged.
export function buildingBaseGeometry({width=1,height=1,depth=1,scale=[1,1,1]},settings){
 validateBaseSlope(settings);
 const h=Math.min(height,settings.height/Math.abs(scale[1])),px=settings.projection/Math.abs(scale[0]),pz=settings.projection/Math.abs(scale[2]);
 const ring=(w,d,y)=>[[-w/2,y,-d/2],[w/2,y,-d/2],[w/2,y,d/2],[-w/2,y,d/2]],outer=ring(width+2*px,depth+2*pz,0),bevel=ring(width+2*px*BASE_BEVEL_PROJECTION,depth+2*pz*BASE_BEVEL_PROJECTION,h*BASE_BEVEL_HEIGHT),shoulder=ring(width,depth,h),top=ring(width,depth,height);
 const positions=[],indices=[],uv=[],buildingUV=[],buildingUVAxes=[];
 const quad=(points,direction)=>{
  const p=points.map(p=>new T.Vector3(...p)),normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));
  if(normal.lengthSq()<1e-20)return;if(normal.dot(new T.Vector3(...direction))<0)points=[points[0],points[3],points[2],points[1]];
  const start=positions.length/3;positions.push(...points.flat());uv.push(0,0,1,0,1,1,0,1);indices.push(start,start+1,start+2,start,start+2,start+3);
  const u=direction[0]?2:0,v=direction[1]?2:1;
  for(const p of points){buildingUV.push(p[u],p[v]);buildingUVAxes.push(u,v);}
 };
 for(let i=0;i<4;i++){
  const j=(i+1)%4,n=[[0,0,-1],[1,0,0],[0,0,1],[-1,0,0]][i];
  quad([outer[i],outer[j],bevel[j],bevel[i]],n);
  quad([bevel[i],bevel[j],shoulder[j],shoulder[i]],n);
  if(h<height)quad([shoulder[i],shoulder[j],top[j],top[i]],n);
 }
 quad(outer,[0,-1,0]);quad(top,[0,1,0]);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('buildingUV',new T.Float32BufferAttribute(buildingUV,2));geometry.setAttribute('buildingUVAxes',new T.Float32BufferAttribute(buildingUVAxes,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
