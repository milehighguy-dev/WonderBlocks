import * as T from '../../vendor/three.module.js';
import {routeLayout} from '../routes/stair-route.js';
import {partMatrix} from '../interiors/entrances.js';
import {KOTOR_KASHYYYK_STYLE,KOTOR_LIP,kotorRailNode,kotorRailingDefaults} from '../routes/kotor-kashyyyk.js';

const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);

// A route meeting a faceted circle needs a full-width landing, especially at
// vertices. Continue past the native atlas's transparent outer thatch fringe.
export function platformRouteAprons(part,parts,loops,portFor){
 const section=part.platform.sections[0];
 if(part.platform.sections.length!==1||section.kind!=='circle')return [];
 const inverse=partMatrix(part).invert(),inner=loops[0].map(p=>({x:section.x+(p.x-section.x)*.9,z:section.z+(p.z-section.z)*.9})),joins=[];
 for(const route of parts.filter(p=>p.route&&p.type!=='wall-route')){
  const refs=[...['start','end'].map(end=>({end,index:end==='start'?0:route.route.segments.length-1,ref:route.route.links?.[end]})),...(route.route.attachments||[])].filter(a=>a.ref?.partId===part.id&&a.ref.platformSection);
  if(!refs.length)continue;
  const layout=routeLayout(route.route),matrix=partMatrix(route);
  for(const {end,index,ref}of refs){
   if(ref?.partId!==part.id||!ref.platformSection)continue;
   const port=portFor(ref),row=layout[index];if(!port||!row)continue;
   const heading=end==='start'?row.heading:row.endHeading;
   const direction=new T.Vector3(Math.sin(heading),0,Math.cos(heading)).transformDirection(matrix).multiplyScalar(end==='start'?-1:1);
   const sideways=new T.Vector3(Math.cos(heading),0,-Math.sin(heading)).applyMatrix3(new T.Matrix3().setFromMatrix4(matrix)).multiplyScalar(row.width/2);
   const edge=[-1,1].map(sign=>port.point.clone().addScaledVector(sideways,sign).applyMatrix4(inverse));
   const inward=direction.transformDirection(inverse),center=port.point.clone().applyMatrix4(inverse);
   if(inward.dot(new T.Vector3(section.x-center.x,0,section.z-center.z))<=1e-6)continue;
   let depth=0,limit=Infinity;
   for(const point of edge)for(let i=0;i<inner.length;i++){
    const a=inner[i],b=inner[(i+1)%inner.length],distance=cross(a,b,point),rate=(b.x-a.x)*inward.z-(b.z-a.z)*inward.x;
    if(rate>1e-8)depth=Math.max(depth,-distance/rate);
    else if(rate< -1e-8)limit=Math.min(limit,-distance/rate);
   }
   // Very wide openings can exceed the inset chord; still meet the centre of
   // the deck instead of constructing an unbounded extension.
   depth=Math.max(.02,Math.min(depth+.02,Math.max(.02,limit),Math.hypot(section.width,section.depth)));
   const far=edge.map(p=>p.clone().addScaledVector(inward,depth)),polygon=[edge[0],edge[1],far[1],far[0]].map(p=>({x:p.x,z:p.z}));
   if(polygon.reduce((sum,p,i)=>sum+p.x*polygon[(i+1)%4].z-p.z*polygon[(i+1)%4].x,0)<0)polygon.reverse();
   const endpoint=end==='start'?row.start:row.end,uvMatrix=matrix.clone().multiply(new T.Matrix4().makeTranslation(...endpoint)).multiply(new T.Matrix4().makeRotationY(heading)).invert().multiply(partMatrix(part)),finish=row.segment.componentFinishes?.deck;
   const terminals=[];
   if(row.segment.railing?.style===KOTOR_KASHYYYK_STYLE){
    const r={...kotorRailingDefaults(),...row.segment.railing},z=end==='start'?0:row.segment.run,ratio=Math.abs(route.scale[1]/part.scale[1]);
    for(const sign of [-1,1]){
     const x=sign*(row.width/2-KOTOR_LIP.width/2),seed=new T.Vector3(row.start[0]+Math.cos(row.heading)*x+Math.sin(row.heading)*z,row.start[1]+(end==='start'?0:row.segment.rise),row.start[2]-Math.sin(row.heading)*x+Math.cos(row.heading)*z),node=kotorRailNode(seed);
     const point=port.point.clone().addScaledVector(sideways,sign*(1-KOTOR_LIP.width/row.width)).applyMatrix4(inverse);
     terminals.push({point:point.toArray(),postTop:(KOTOR_LIP.height+r.height*node.height)*ratio,railTop:(KOTOR_LIP.height+r.height*node.rail)*ratio,width:r.postWidth*node.width});
    }
   }
   joins.push({polygon,mouth:edge.map(p=>({x:p.x,z:p.z})),terminals,thickness:Math.min(.2,part.platform.thickness),uvMatrix:uvMatrix.elements,uvOffset:end==='start'?0:row.segment.run,woven:row.segment.railing?.style===KOTOR_KASHYYYK_STYLE,color:finish?.color??row.segment.floorFinish?.color??route.color,surface:finish?.surface});
  }
 }
 return joins;
}

// Follow the outer boundary of the deck plus its connecting landings, leaving
// each route mouth open. This carries both guard rails right up to the route.
export function apronRailingSpans(loops,joins){
 const polygons=[...loops,...joins.map(j=>j.polygon)],edges=polygons.flatMap(poly=>poly.map((a,i)=>({a,b:poly[(i+1)%poly.length]}))),spans=[],seen=new Set();
 const inside=(p,poly)=>poly.every((a,i)=>cross(a,poly[(i+1)%poly.length],p)>=-1e-8);
 for(const {a,b}of edges){const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<1e-8)continue;const cuts=[0,1];
  for(const e of edges){const ux=e.b.x-e.a.x,uz=e.b.z-e.a.z,qx=e.a.x-a.x,qz=e.a.z-a.z,den=dx*uz-dz*ux;
   if(Math.abs(den)>1e-9){const t=(qx*uz-qz*ux)/den,u=(qx*dz-qz*dx)/den;if(t>1e-7&&t<1-1e-7&&u>=-1e-7&&u<=1+1e-7)cuts.push(t);}
   else if(Math.abs(qx*dz-qz*dx)<1e-7)for(const p of [e.a,e.b]){const t=((p.x-a.x)*dx+(p.z-a.z)*dz)/(length*length);if(t>0&&t<1)cuts.push(t);}
  }
  cuts.sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++){if(cuts[i]-cuts[i-1]<1e-7)continue;const at=t=>({x:a.x+dx*t,z:a.z+dz*t}),p=at(cuts[i-1]),q=at(cuts[i]),mid=at((cuts[i-1]+cuts[i])/2),outside={x:mid.x+dz/length*1e-5,z:mid.z-dx/length*1e-5};
   if(polygons.some(poly=>inside(outside,poly)))continue;
   if(joins.some(j=>Math.abs(cross(j.mouth[0],j.mouth[1],mid))<1e-6&&mid.x>=Math.min(...j.mouth.map(p=>p.x))-1e-6&&mid.x<=Math.max(...j.mouth.map(p=>p.x))+1e-6&&mid.z>=Math.min(...j.mouth.map(p=>p.z))-1e-6&&mid.z<=Math.max(...j.mouth.map(p=>p.z))+1e-6))continue;
   const key=[p.x,p.z,q.x,q.z].map(x=>x.toFixed(5)).join(',');if(!seen.has(key)){seen.add(key);spans.push([new T.Vector3(p.x,0,p.z),new T.Vector3(q.x,0,q.z)]);}
  }
 }
 return spans;
}

// Split a textured triangle around convex landing footprints, preserving UVs.
// The new landing replaces these faces; it never overlays a coplanar floor.
export function subtractApron(polygons,clip){
 const outside=[];
 for(const polygon of polygons){let remaining=polygon;
  for(let i=0;i<clip.length&&remaining.length;i++){
   const a=clip[i],b=clip[(i+1)%clip.length],inside=[],out=[];
   for(let j=0;j<remaining.length;j++){
    const p=remaining[j],q=remaining[(j+1)%remaining.length],dp=cross(a,b,p),dq=cross(a,b,q);
    (dp>=-1e-9?inside:out).push(p);
    if((dp>=-1e-9)!==(dq>=-1e-9)){const t=T.MathUtils.clamp(dp/(dp-dq),0,1),v=Object.fromEntries(Object.keys(p).map(k=>[k,p[k]+(q[k]-p[k])*t]));inside.push(v);out.push(v);}
   }
   if(out.length>=3)outside.push(out);remaining=inside;
  }
 }
 return outside;
}

export function cutApronFaces(mesh,joins){
 const geometry=mesh.geometry,positions=geometry.attributes.position,uvs=geometry.attributes.uv,out=[],uv=[];
 for(let i=0;i<positions.count;i+=3){
  let polygons=[[0,1,2].map(j=>({x:positions.getX(i+j),y:positions.getY(i+j),z:positions.getZ(i+j),u:uvs.getX(i+j),v:uvs.getY(i+j)}))];
  for(const join of joins)polygons=subtractApron(polygons,join.polygon);
  for(const polygon of polygons)for(let j=1;j<polygon.length-1;j++){
   const triangle=[polygon[0],polygon[j],polygon[j+1]];if(Math.abs(cross(...triangle))<1e-10)continue;
   for(const p of triangle){out.push(p.x,p.y,p.z);uv.push(p.u,p.v);}
  }
 }
 geometry.setAttribute('position',new T.Float32BufferAttribute(out,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.deleteAttribute('normal');geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
}
