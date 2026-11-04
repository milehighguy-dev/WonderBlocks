import * as T from '../../vendor/three.module.js';
import {applySurface,updateSurfaceUVs} from '../materials/surfaces.js';
import {landingSupportOutline} from './flared-landing.js';
import {segmentThickness} from './stair-route.js';
import {landingRailEdges} from './railings.js';
import {buildPresetHallways} from './preset-hallway.js';

export const yavinAqueductDefaults=(enclosed=false)=>({style:'yavin-aqueduct',sides:'both',enclosed,height:4.6,postWidth:.5,railHeight:.85,panelThickness:.33,railWidth:.5,spacing:4,color:'#ffffff',surface:{preset:'yavin-aqueduct-stone',scale:.16}});

// The tall viaduct uses yav_bldg_ruins_wall1 (12 m pier / enclosed passage)
// and wall2 (18 m open span). Both share a 3.535 m walking surface.
// Continue the stock open span's substantial middle body through the ends.
const AQUEDUCT_BODY_DEPTH=2.1;
const TOWER_PROFILE={width:3.6,height:4.6,ceilingStart:1,profile:[[0,0],[.828,4.6]]};

export function buildYavinAqueducts(group,part,layout){
 const enclosed=new Map(),matrix=new T.Matrix4().compose(new T.Vector3(...part.position),new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),new T.Vector3(...part.scale)),ground=part.route.groundHeight??0;
 for(const l of layout){
  const s=l.segment;if(s.hallway||s.railing?.style!=='yavin-aqueduct')continue;
  const r={...yavinAqueductDefaults(),...s.railing},w=l.width,t=segmentThickness(part.route,s),material=new T.MeshStandardMaterial({color:r.color,roughness:1}),holder=new T.Group();
  const floor=z=>s.kind==='landing'?0:s.rise*z/s.run;
  const add=(g,kind)=>{const m=new T.Mesh(g,material);m.userData={routeSegment:l.index,yavinAqueductPart:kind,railing:kind==='cap'};m.castShadow=m.receiveShadow=true;holder.add(m);};
  const worldY=(x,z)=>new T.Vector3(l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[1]+floor(z)-t,l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z).applyMatrix4(matrix).y;
  const filled=s.fillToGround&&Math.min(...[-w/2,w/2].flatMap(x=>[0,s.run].map(z=>worldY(x,z))))>ground+.01;
  if(filled){
   const depth=Math.max(.01,(worldY(0,s.run/2)-ground)/Math.max(.01,Math.abs(matrix.elements[5]))),shaft=w/2+r.railWidth,neck=w*.488,base=w*.796,foot=w*1.053,profile=[[shaft,0],[shaft,.57],[neck,.625],[neck,.709],[base,.719],[base,.804],[foot,.885],[foot,1]],rings=profile.map(([half,f])=>landingSupportOutline(l,half-w/2).base.map(([x,z])=>({p:new T.Vector3(x,floor(z)-t-depth*f,z),f,top:l.start[1]+floor(z)-t}))),positions=[],weights=[],tops=[];
   const emit=v=>{positions.push(...v.p.toArray());weights.push(v.f);tops.push(v.top);},tri=(a,b,c)=>{emit(a);emit(b);emit(c);};
   for(const [ring,up] of [[rings[0],true],[rings.at(-1),false]])for(const face of T.ShapeUtils.triangulateShape(ring.map(v=>new T.Vector2(v.p.x,v.p.z)),[])){const vertices=face.map(i=>ring[i]);if((vertices[1].p.clone().sub(vertices[0].p).cross(vertices[2].p.clone().sub(vertices[0].p)).y>0)!==up)vertices.reverse();tri(...vertices);}
   for(let i=0;i<rings.length-1;i++)for(let j=0;j<rings[i].length;j++){const k=(j+1)%rings[i].length,face=[rings[i][j],rings[i][k],rings[i+1][k],rings[i+1][j]];tri(face[0],face[1],face[2]);tri(face[0],face[2],face[3]);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('aqueductGroundWeight',new T.Float32BufferAttribute(weights,1));g.setAttribute('aqueductGroundTop',new T.Float32BufferAttribute(tops,1));g.computeVertexNormals();g.rotateY(l.heading);g.translate(...l.start);add(g,'underbody');
  }else{
   // A substantial, constant-depth body continues through floating sections.
   // Connection planes remain fixed when the outline turns or widens.
   const depth=Math.max(t+.1,AQUEDUCT_BODY_DEPTH),points=landingSupportOutline(l,r.railWidth).base,shape=new T.Shape(points.map(([x,z])=>new T.Vector2(x,-z))),g=new T.ExtrudeGeometry(shape,{depth:depth-t,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);g.translate(0,-depth,0);const a=g.getAttribute('position');for(let i=0;i<a.count;i++)a.setY(i,a.getY(i)+floor(a.getZ(i)));g.computeVertexNormals();g.rotateY(l.heading);g.translate(...l.start);add(g,'underbody');
  }
  if(r.enclosed)enclosed.set(l.index,{...l,segment:{...s,hallway:{style:'yavin-aqueduct-pier',height:r.height,thickness:r.postWidth,roofThickness:r.railHeight,outsideClearance:true,ceiling:true,color:r.color,surface:r.surface}}});
  // Low curbs sit outside the clear walking width and meet the span underside.
  const spans=s.kind==='landing'||!s.rise?landingRailEdges(part.route,l,l.index):[-1,1].map(sign=>({a:[sign*w/2,0],b:[sign*w/2,s.run],side:sign>0?'left':'right'}));
  for(const edge of spans){
   const out=edge.out||(edge.a[0]===edge.b[0]?[Math.sign(edge.a[0]),0]:[0,edge.a[1]===0?-1:1]),a=new T.Vector3(edge.a[0],floor(edge.a[1])-t,edge.a[1]),b=new T.Vector3(edge.b[0],floor(edge.b[1])-t,edge.b[1]),n=new T.Vector3(out[0],0,out[1]).multiplyScalar(r.railWidth),ring=[a,b,b.clone().add(n),a.clone().add(n)],v=[...ring,...ring.map(p=>p.clone().add(new T.Vector3(0,t+r.panelThickness,0)))],center=v.reduce((p,q)=>p.add(q),new T.Vector3()).multiplyScalar(1/8),positions=[];
   for(const ids of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]){const p=ids.map(i=>v[i]),normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])),mid=p.reduce((p,q)=>p.add(q),new T.Vector3()).multiplyScalar(.25);if(normal.dot(mid.sub(center))<0)ids.reverse();for(const i of [0,1,2,0,2,3])positions.push(...v[ids[i]].toArray());}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();g.rotateY(l.heading);g.translate(...l.start);add(g,'cap');
  }
  applySurface(holder,material,{...part,surface:r.surface});for(const m of [...holder.children])group.add(m);
 }
 // Reuse hallway mitres, turn openings and roof triangulation, but keep these
 // thick walls outside the aqueduct's clear walking width.
 if(enclosed.size){
  const before=new Set(group.children),synthetic=layout.map(l=>enclosed.get(l.index)??{...l,segment:{...l.segment,hallway:undefined}});
  buildPresetHallways(group,part,synthetic,id=>id==='yavin-aqueduct-pier'?TOWER_PROFILE:undefined);
  for(const m of group.children)if(!before.has(m))m.userData.yavinAqueductPart=m.userData.hallwayCeiling?'ceiling':'walls';
 }
 // Preserve unbent section coordinates for the surface unwrap. Ground fill
 // resolves their finished height before texture coordinates are calculated.
 for(const m of group.children){if(!m.userData.yavinAqueductPart)continue;const l=layout[m.userData.routeSegment],g=m.geometry,a=g.getAttribute('position'),source=[],up=new T.Vector3(0,1,0);m.updateMatrix();for(let i=0;i<a.count;i++)source.push(...new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrix).sub(new T.Vector3(...l.start)).applyAxisAngle(up,-l.heading).toArray());g.setAttribute('aqueductLocal',new T.Float32BufferAttribute(source,3));}
}

// Map each face along the route's 3D tangent and its own transverse tangent.
// On a ramp, constant mortar courses follow the grade instead of world Y.
function unwrapAqueduct(m,l,phase){
 const g=m.geometry,a=g.getAttribute('aqueductLocal'),s=l.segment,slope=s.kind==='landing'?0:s.rise/s.run,gradeLength=Math.hypot(1,slope),along=new T.Vector3(0,slope,1).normalize(),up=new T.Vector3(0,1,0),uv=[],u=[],v=[];
 for(let i=0;i<a.count;i+=3){const p=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,i+j)),profile=p.map(p=>new T.Vector3(p.x,p.y-slope*p.z,p.z)),normal=profile[1].clone().sub(profile[0]).cross(profile[2].clone().sub(profile[0])).normalize(),end=Math.abs(normal.z)>Math.max(Math.abs(normal.x),Math.abs(normal.y));let du=end?new T.Vector3(1,0,0):along.clone(),dv=end?up.clone():new T.Vector3(normal.y,-normal.x,0).normalize();if(Math.abs(dv.y)>.1?dv.y<0:dv.x<0)dv.negate();const basisU=du.applyAxisAngle(up,l.heading),basisV=dv.clone().applyAxisAngle(up,l.heading);for(let j=0;j<3;j++){uv.push(end?profile[j].x:p[j].z*gradeLength+phase,profile[j].dot(dv));u.push(...basisU.toArray());v.push(...basisV.toArray());}}
 g.setAttribute('aqueductUV',new T.Float32BufferAttribute(uv,2));g.setAttribute('aqueductU',new T.Float32BufferAttribute(u,3));g.setAttribute('aqueductV',new T.Float32BufferAttribute(v,3));
}

// Resolve the optional pier against world ground after route curves are bent.
// Fractional support courses follow elevation, slopes, rotation and scale;
// no stored depth can leave the foot suspended or buried underground.
export function finishYavinAqueducts(group,part,layout){
 const matrix=new T.Matrix4().compose(new T.Vector3(...part.position),new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),new T.Vector3(...part.scale)),inverse=matrix.clone().invert(),ground=part.route.groundHeight??0;
 for(const m of [...group.children]){if(!m.userData.yavinAqueductPart)continue;const l=layout[m.userData.routeSegment],g=m.geometry,a=g.getAttribute('position'),weight=g.getAttribute('aqueductGroundWeight'),source=g.getAttribute('aqueductLocal');
  if(weight){const top=g.getAttribute('aqueductGroundTop');for(let i=0;i<a.count;i++){const p=new T.Vector3(a.getX(i),top.getX(i),a.getZ(i)).applyMatrix4(matrix);p.y=T.MathUtils.lerp(p.y,ground,weight.getX(i));p.applyMatrix4(inverse);a.setXYZ(i,p.x,p.y,p.z);source.setY(i,p.y-l.start[1]);}a.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();}
  let phase=0;for(let i=l.index-1;i>=0;i--){if(layout[i+1].segment.pathStart||layout[i+1].segment.branchFrom)break;const s=layout[i].segment;phase+=Math.hypot(s.run,s.kind==='landing'?0:s.rise);}
  unwrapAqueduct(m,l,phase);
  const surface=l.segment.componentFinishes?.[m.userData.yavinAqueductPart]?.surface??l.segment.railing.surface??yavinAqueductDefaults().surface;updateSurfaceUVs(new T.Group().add(m),m.material,{...part,surface});group.add(m);
 }
}
