import * as T from '../../vendor/three.module.js';
import {cleanCollisionSurface} from '../collision/collision-geometry.js';
export const curveMinimum=(width,angle)=>Math.max(.2,(width/2+.25)*Math.abs(angle));
export function curvePoint(x,y,z,run,angle){if(!angle)return [x,y,z];const a=z*angle/run,r=run/angle;return [r*(1-Math.cos(a))+x*Math.cos(a),y,(r-x)*Math.sin(a)];}
export const curvePanelCount=s=>Math.max(1,Math.ceil(Math.abs(s.curveAngle)/(Math.PI/12)));
// Floors and sides share the same faceted boundary, including intermediate
// tread vertices. Independently sampled arcs would expose thin seams.
export function curveMeshPoint(x,y,z,run,angle){const count=curvePanelCount({curveAngle:angle}),t=z/run*count,i=Math.floor(t),f=t-i,a=curvePoint(x,y,i*run/count,run,angle),b=curvePoint(x,y,(i+1)*run/count,run,angle);return a.map((v,k)=>v+(b[k]-v)*f);}
// Broad 15-degree panels are sufficient for the low-poly side profiles. This preserves
// treads, risers, UV seams and the existing solid/walkway cross-sections.
export function bendRouteMeshes(group,layout){
 const volumes=new WeakMap();
 for(const m of group.children){const l=layout[m.userData.routeSegment];if(!m.geometry||!l?.segment.curveAngle||m.userData.routeCurved)continue;
  const s=l.segment,old=m.geometry,source=old.index?old.toNonIndexed():old,attrs=source.attributes,names=Object.keys(attrs).filter(n=>n!=='normal'),out=Object.fromEntries(names.map(n=>[n,[]]));
  m.updateMatrix();const toLocal=new T.Matrix4().makeRotationY(-l.heading).multiply(new T.Matrix4().makeTranslation(-l.start[0],-l.start[1],-l.start[2])).multiply(m.matrix),back=toLocal.clone().invert();
  // Native rails and hallway shells carry closed construction volumes across
  // material splits. Bend those with the exact same facets as the visible mesh;
  // leaving the original straight volume creates an invisible wall in a turn.
  const volume=m.userData.structuralVolume;
  if(volume){
   const transform=m.matrix.clone().multiply(volume.matrix?new T.Matrix4().fromArray(volume.matrix):new T.Matrix4()),key=l.index+':'+transform.elements.join(',');let variants=volumes.get(volume);if(!variants){variants=new Map();volumes.set(volume,variants);}let bent=variants.get(key);
   if(!bent){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(volume.positions.flat(),3));geometry.setIndex(volume.triangles.flat());const temporary=new T.Mesh(geometry,m.material);temporary.matrixAutoUpdate=false;temporary.updateMatrix=()=>{};temporary.matrix.copy(transform);temporary.userData.routeSegment=l.index;const holder=new T.Group().add(temporary);bendRouteMeshes(holder,layout);const p=temporary.geometry.attributes.position;bent={...volume,positions:Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)]),triangles:Array.from({length:p.count/3},(_,i)=>[i*3,i*3+1,i*3+2])};bent={...bent,...cleanCollisionSurface(bent,.00001)};temporary.geometry.dispose();variants.set(key,bent);}
   m.userData.structuralVolume=bent;
  }
  const count=curvePanelCount(s),spacing=s.run/count;
  const mix=(a,b,t)=>Object.fromEntries(names.map(n=>[n,a[n].map((v,k)=>v+(b[n][k]-v)*t)]));
  function clip(poly,z,above){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a.position[2]-z,db=b.position[2]-z,ia=above?da>=-1e-9:da<=1e-9,ib=above?db>=-1e-9:db<=1e-9;if(ia)result.push(a);if(ia!==ib)result.push(mix(a,b,da/(da-db)));}return result;}
  for(let i=0;i<attrs.position.count;i+=3){const triangle=[0,1,2].map(j=>{const v=Object.fromEntries(names.map(n=>[n,Array.from({length:attrs[n].itemSize},(_,k)=>attrs[n].array[(i+j)*attrs[n].itemSize+k])]));v.position=new T.Vector3(...v.position).applyMatrix4(toLocal).toArray();return v;}),lo=Math.floor(Math.min(...triangle.map(v=>v.position[2]))/spacing),hi=Math.floor(Math.max(...triangle.map(v=>v.position[2]))/spacing);
   for(let k=lo;k<=hi;k++){let poly=clip(clip(triangle,k*spacing,true),(k+1)*spacing,false);for(let j=1;j+1<poly.length;j++){const tri=[poly[0],poly[j],poly[j+1]];const a=new T.Vector3(...tri[1].position).sub(new T.Vector3(...tri[0].position)),b=new T.Vector3(...tri[2].position).sub(new T.Vector3(...tri[0].position));if(a.cross(b).lengthSq()<1e-18)continue;for(const v of tri){const position=new T.Vector3(...curveMeshPoint(...v.position,s.run,s.curveAngle)).applyMatrix4(back).toArray();for(const n of names)out[n].push(...(n==='position'?position:v[n]));}}}
  }
  const g=new T.BufferGeometry();for(const n of names)g.setAttribute(n,new T.Float32BufferAttribute(out[n],attrs[n].itemSize));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData={...old.userData};
  if(old.userData.groundVertices){const ys=[];for(let i=0;i<old.attributes.position.count;i++)if(old.userData.groundVertices[i])ys.push(old.attributes.position.getY(i));const ground=Math.min(...ys);g.userData.groundVertices=Array.from({length:g.attributes.position.count},(_,i)=>Math.abs(g.attributes.position.getY(i)-ground)<1e-5);}
  m.geometry=g;m.userData.routeCurved=true;if(source!==old)source.dispose();old.dispose();
 }
}

// Build the stepped shell directly: two triangles per visible quad, no clipping
// across long side triangles and no hidden faces between neighbouring steps.
export function curvedFloorGeometry(s,width,offset,backing,groundBase,closeLeft=true,closeRight=true){
 const steps=s.kind==='stairs'&&s.rise!==0?s.steps:1,panels=curvePanelCount(s),positions=[],uvs=[],uvAxes=[],ground=[],groundSources=[];
 const bottom=z=>s.fillToGround?groundBase:s.rise*z/s.run-backing;
 const top=(step,z)=>s.kind==='landing'?0:s.kind==='stairs'?(step+(s.rise<0?0:1))*s.rise/steps:s.rise*z/s.run;
 const left=offset+width/2,right=offset-width/2;
 function quad(points,normal){const a=new T.Vector3(...points[1]).sub(new T.Vector3(...points[0])),b=new T.Vector3(...points[2]).sub(new T.Vector3(...points[0]));if(a.cross(b).dot(new T.Vector3(...normal))<0)points.reverse();for(const i of [0,1,2,0,2,3]){const p=points[i];groundSources.push(p.slice());positions.push(...curveMeshPoint(...p,s.run,s.curveAngle));uvs.push(...(normal[1]?[p[0],p[2]]:normal[0]?[p[2],p[1]]:[p[0],p[1]]));uvAxes.push(...(normal[1]?[0,2]:normal[0]?[2,1]:[0,1]));ground.push(!!s.fillToGround&&Math.abs(p[1]-groundBase)<1e-6);}}
 for(let i=0;i<steps;i++){const lo=i*s.run/steps,hi=(i+1)*s.run/steps,cuts=[lo,...Array.from({length:panels-1},(_,j)=>(j+1)*s.run/panels).filter(z=>z>lo+1e-7&&z<hi-1e-7),hi];for(let j=0;j<cuts.length-1;j++){
  const z0=cuts[j],z1=cuts[j+1],h0=top(i,z0),h1=top(i,z1),b0=bottom(z0),b1=bottom(z1),u0=s.fillToGround?(s.kind==='landing'?0:s.rise*z0/s.run):b0,u1=s.fillToGround?(s.kind==='landing'?0:s.rise*z1/s.run):b1;
  quad([[right,h0,z0],[left,h0,z0],[left,h1,z1],[right,h1,z1]],[0,1,0]);
  quad([[right,b0,z0],[left,b0,z0],[left,b1,z1],[right,b1,z1]],[0,-1,0]);
  if(closeLeft)quad([[left,u0,z0],[left,h0,z0],[left,h1,z1],[left,u1,z1]],[1,0,0]);
  if(s.fillToGround)quad([[left,b0,z0],[left,u0,z0],[left,u1,z1],[left,b1,z1]],[1,0,0]);
  if(closeRight)quad([[right,u0,z0],[right,h0,z0],[right,h1,z1],[right,u1,z1]],[-1,0,0]);
  if(s.fillToGround)quad([[right,b0,z0],[right,u0,z0],[right,u1,z1],[right,b1,z1]],[-1,0,0]);
  if(i===0&&j===0){quad([[right,u0,z0],[left,u0,z0],[left,h0,z0],[right,h0,z0]],[0,0,-1]);if(s.fillToGround)quad([[right,b0,z0],[left,b0,z0],[left,u0,z0],[right,u0,z0]],[0,0,-1]);}
  if(j===cuts.length-2){if(i===steps-1){quad([[right,u1,z1],[left,u1,z1],[left,h1,z1],[right,h1,z1]],[0,0,1]);if(s.fillToGround)quad([[right,b1,z1],[left,b1,z1],[left,u1,z1],[right,u1,z1]],[0,0,1]);}else{const next=top(i+1,z1);if(Math.abs(next-h1)>1e-8)quad([[right,h1,z1],[left,h1,z1],[left,next,z1],[right,next,z1]],[0,0,next>h1?-1:1]);}}
 }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('routeUV',new T.Float32BufferAttribute(uvs,2));g.setAttribute('routeUVAxes',new T.Float32BufferAttribute(uvAxes,2));g.computeVertexNormals();if(s.fillToGround){g.userData.groundVertices=ground;g.userData.groundSources=groundSources;}return g;
}
