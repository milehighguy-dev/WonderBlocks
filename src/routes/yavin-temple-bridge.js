import * as T from '../../vendor/three.module.js';
import {landingRailEdges} from './railings.js';
import {applySurface} from '../materials/surfaces.js';

export const yavinTempleBridgeDefaults=()=>({style:'yavin-temple-bridge',sides:'both',height:2.6,railHeight:.7,panelThickness:.65,postWidth:1.8,spacing:3,color:'#ffffff',surface:{preset:'yavin-bridge-stone',scale:.35}});

// The complete bridge shown in the Temple level: broad slab, raised curbs,
// battered masonry blocks and a carved continuous lintel. Native source bay:
// 5.76 m spacing; blocks 3.74 m at their feet / 2.13 m at the crown.
export function buildYavinTempleBridge(group,part,layout){
 const edges=[];
 for(const l of layout){
  const s=l.segment;if(s.hallway||s.railing?.style!=='yavin-temple-bridge')continue;
  const r={...yavinTempleBridgeDefaults(),...s.railing},world=(x,y,z)=>new T.Vector3(l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[1]+y,l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z);
  const spans=s.kind==='landing'||!s.rise?landingRailEdges(part.route,l,l.index):[-1,1].map(sign=>({a:[sign*l.width/2,0],b:[sign*l.width/2,s.run],side:sign>0?'left':'right'}));
  for(const span of spans){
   if(r.sides!=='both'&&span.side!==r.sides&&span.side!=='both')continue;
   const out=span.out||(span.a[0]===span.b[0]?[Math.sign(span.a[0]),0]:[0,span.a[1]===0?-1:1]),at=p=>world(p[0],s.kind==='landing'?0:s.rise*p[1]/s.run,p[1]);
   const a=at(span.a),b=at(span.b),tangent=b.clone().sub(a).setY(0).normalize(),normal=world(out[0],0,out[1]).sub(world(0,0,0)).normalize();edges.push({a,b,tangent,normal,r,l,length:Math.hypot(b.x-a.x,b.z-a.z)});
  }
 }
 const key=p=>p.toArray().map(v=>v.toFixed(5)).join(','),joins=new Map();
 for(const e of edges)for(const p of [e.a,e.b]){const k=key(p);if(!joins.has(k))joins.set(k,[]);joins.get(k).push(e);}
 // Carry the frieze around the perimeter instead of restarting it at every
 // section, corner or material split. Each open side is its own chain.
 const unseen=new Set(edges);
 while(unseen.size){
  const first=[...unseen].find(e=>[e.a,e.b].some(p=>joins.get(key(p)).length===1))??unseen.values().next().value;
  let node=joins.get(key(first.a)).length===1?first.a:first.b,distance=0;
  for(;;){const e=(joins.get(key(node))||[]).find(e=>unseen.has(e));if(!e)break;unseen.delete(e);e.trimSign=e.a.distanceTo(node)<1e-5?1:-1;e.trimOffset=distance;distance+=e.length;node=e.trimSign>0?e.b:e.a;}
 }
 function offset(e,p,d){
  const v=p.clone().addScaledVector(e.normal,d),other=(joins.get(key(p))||[]).find(q=>q!==e&&Math.abs(q.r.height-e.r.height)<1e-5);if(!other)return v;
  const q=p.clone().addScaledVector(other.normal,d),den=e.tangent.x*other.tangent.z-e.tangent.z*other.tangent.x;
  if(Math.abs(den)>1e-6){const t=((q.x-v.x)*other.tangent.z-(q.z-v.z)*other.tangent.x)/den;if(Math.abs(t)<Math.abs(d)*8)v.addScaledVector(e.tangent,t);}return v;
 }
 for(const e of edges){
  const {r,l,length}=e,materials=new Map(),holder=new T.Group(),curb=Math.min(.4,r.height*.14),beam=Math.min(r.railHeight,r.height*.4),crown=r.height-beam;
  const mat=kind=>{if(!materials.has(kind))materials.set(kind,new T.MeshStandardMaterial({color:r.color,roughness:1}));return materials.get(kind);};
  const add=(g,kind)=>{const m=new T.Mesh(g,mat(kind));m.userData={routeSegment:l.index,yavinTempleBridgePart:kind,railing:true};m.castShadow=m.receiveShadow=true;holder.add(m);};
  // Closed prisms keep the rear faces and undersides, including at corner joins.
  function solid(vertices,kind,trim=false){
   const center=vertices.reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(1/8),positions=[],uv=[],us=[],vs=[];
   for(const ids of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]){
    const p=ids.map(i=>vertices[i]),normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])),mid=p.reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(.25);if(normal.dot(mid.sub(center))<0)ids.reverse();
    for(const i of [0,1,2,0,2,3]){const p=vertices[ids[i]],along=trim?([0,3].includes(ids[i]%4)?0:length):T.MathUtils.clamp(p.clone().sub(e.a).dot(e.tangent),0,length),base=e.a.y+(e.b.y-e.a.y)*along/length,phase=e.trimOffset+(e.trimSign>0?along:length-along);positions.push(...p.toArray());uv.push(phase/(beam*4),(p.y-base-crown)/beam);us.push(...e.tangent.toArray());vs.push(0,1,0);}
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(trim){g.setAttribute('yavinTrimUV',new T.Float32BufferAttribute(uv,2));g.setAttribute('yavinTrimU',new T.Float32BufferAttribute(us,3));g.setAttribute('yavinTrimV',new T.Float32BufferAttribute(vs,3));}g.computeVertexNormals();add(g,kind);
  }
  function strip(low,high,inside,outside,kind,trim=false){
   const ring=[offset(e,e.a,inside),offset(e,e.b,inside),offset(e,e.b,outside),offset(e,e.a,outside)],vertices=[...ring.map(p=>p.clone().add(new T.Vector3(0,low,0))),...ring.map(p=>p.clone().add(new T.Vector3(0,high,0)))];solid(vertices,kind,trim);
  }
  strip(0,curb*.45,-r.panelThickness-.2,.04,'cap');strip(curb*.45,curb,-r.panelThickness-.1,0,'cap');
  strip(crown,r.height,-r.panelThickness-.07,.07,'rails',true);
  const width=Math.min(r.postWidth,r.spacing*.75);
  for(let station=0;station<=length+1e-6;station+=r.spacing){
   const at=Math.min(station,length),start=Math.max(0,at-width/2),end=Math.min(length,at+width/2);if(end-start<.001)continue;
   const point=(x,y,z)=>e.a.clone().lerp(e.b,x/length).addScaledVector(e.normal,z).add(new T.Vector3(0,y,0)),topStart=at-(at-start)*.58,topEnd=at+(end-at)*.58;
   solid([point(start,curb,-r.panelThickness),point(end,curb,-r.panelThickness),point(end,curb,0),point(start,curb,0),point(topStart,crown,-r.panelThickness),point(topEnd,crown,-r.panelThickness),point(topEnd,crown,0),point(topStart,crown,0)],'posts');
  }
  for(const [kind,material] of materials)applySurface(holder,material,{...part,surface:kind==='rails'?{preset:'yavin-bridge-trim',scale:1}:r.surface});
  for(const m of [...holder.children])group.add(m);
 }
}
