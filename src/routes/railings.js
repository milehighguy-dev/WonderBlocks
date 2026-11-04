import {buildBespinArches} from './bespin-arches.js';
import {angledTurn,angledLanding,angledFootprint} from './angled-landing.js';
import {junctionHoles} from './route-junctions.js';
import {routeBacking} from './route-profile.js';
import * as THREE from '../../vendor/three.module.js';
import {SURFACES,applySurface} from '../materials/surfaces.js';

export const defaultRailing=()=>({style:'none',sides:'both',height:1.1,railWidth:.08,railHeight:.08,postWidth:.07,spacing:2,panelThickness:.1,color:'#85734f',surface:{preset:'plain',scale:1}});
export function validateRailing(value){
 if(value===undefined)return;const r={...defaultRailing(),...value};
 if(!value||typeof value!=='object'||Array.isArray(value)||!['none','yavin-aqueduct','yavin-temple-bridge','posts','solid','buttressed','yavin-stepped','yavin-ruined','arched-recess','arched-openings','japanese-open','japanese-roofed','walkway','bespin','bespin-arches','kashyyyk-timber','kashyyyk-suspension','kotor-kashyyyk'].includes(r.style)||!['both','left','right'].includes(r.sides)||!/^#[0-9a-f]{6}$/i.test(r.color))throw Error('Invalid railing style or color.');
 for(const [key,min,max] of [['height',.2,['yavin-ruined','yavin-aqueduct'].includes(r.style)?8:3],['railWidth',.02,.5],['railHeight',.02,['yavin-temple-bridge','yavin-aqueduct'].includes(r.style)?1.5:.5],['postWidth',.02,r.style==='yavin-temple-bridge'?4:r.style==='yavin-aqueduct'?1.5:.5],['spacing',.25,['yavin-ruined','yavin-aqueduct'].includes(r.style)?16:5],['panelThickness',.02,r.style==='yavin-temple-bridge'?1.5:.5]])if(!Number.isFinite(r[key])||r[key]<min||r[key]>max)throw Error('Invalid railing '+key+'.');
 if(r.style==='yavin-aqueduct'){if(r.enclosed!==undefined&&typeof r.enclosed!=='boolean')throw Error('Invalid aqueduct section.');if(r.enclosed&&r.height<2.4)throw Error('Enclosed aqueduct passages need at least 2.4 metres of headroom.');}
 if(r.style==='yavin-stepped'&&r.height<1.8)throw Error('Yavin screen walls need at least 1.8 m of height for their openings.');
 for(const [key,min,max] of [['archWidth',.2,4],['archHeight',.3,3],['recessDepth',.01,.4]])if(r[key]!==undefined&&(!Number.isFinite(r[key])||r[key]<min||r[key]>max))throw Error('Invalid wall '+key+'.');
 if(!r.surface||!SURFACES.some(s=>s.id===r.surface.preset)||!Number.isFinite(r.surface.scale)||r.surface.scale<.1||r.surface.scale>8)throw Error('Invalid railing texture.');
}
// Boundary intervals leave the incoming and outgoing walking openings unobstructed.
export function landingRailEdges(route,l,index){
 if(angledTurn(l.segment))return angledLanding(l).edges;
 const s=l.segment,w=l.width,next=l.nextWidth,prior=(s.branchFrom||s.pathStart)?s.width??route.width:route.segments[index-1]?.width??route.width;
 const returning=s.turn.startsWith('return-'),sign=s.turn.includes('right')?-1:1;
 const shift=returning?sign*((w+next)/2+(s.gap??route.gap)):0,min=Math.min(-w/2,shift-next/2),max=Math.max(w/2,shift+next/2);
 const xmin=returning?min:-w/2,xmax=returning?max:w/2,edges=[];
 function edge(a,b,holes,side){let spans=[[a[0]===b[0]?a[1]:a[0],a[0]===b[0]?b[1]:b[0]]];for(const [lo,hi] of holes){spans=spans.flatMap(([x,y])=>hi<=x||lo>=y?[[x,y]]:[[x,Math.min(y,lo)],[Math.max(x,hi),y]].filter(([u,v])=>v-u>1e-6));}for(const [u,v] of spans)edges.push({a:a[0]===b[0]?[a[0],u]:[u,a[1]],b:a[0]===b[0]?[a[0],v]:[v,a[1]],side});}
 const front=[[-prior/2,prior/2],...junctionHoles(route,index,'back')];if(returning)front.push([shift-next/2,shift+next/2]);
 edge([xmin,0],[xmax,0],front,'both');
 edge([xmin,s.run],[xmax,s.run],[...(s.turn==='straight'?[[-next/2,next/2]]:[]),...junctionHoles(route,index,'front')],'both');
 edge([xmin,0],[xmin,s.run],[...(s.turn==='right'?[[s.run-next,s.run]]:[]),...junctionHoles(route,index,'right')],'right');
 edge([xmax,0],[xmax,s.run],[...(s.turn==='left'?[[s.run-next,s.run]]:[]),...junctionHoles(route,index,'left')],'left');
 return edges;
}
// A complete rib needs uninterrupted walls on both sides of its whole band.
export function hallwayRibFits(route,l,index,z,half){
 if(l.segment.kind!=='landing'&&l.segment.rise)return true;
 const edges=landingRailEdges(route,l,index);
 return [-1,1].every(sign=>edges.some(e=>Math.abs(e.a[0]-sign*l.width/2)<1e-5&&Math.abs(e.b[0]-sign*l.width/2)<1e-5&&Math.min(e.a[1],e.b[1])<=z-half&&Math.max(e.a[1],e.b[1])>=z+half));
}
export function buildRouteRailings(group,part,layout){
 const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...part.position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation)),new THREE.Vector3(...part.scale)),inverse=matrix.clone().invert();
 buildSolidRouteWalls(group,part,layout,matrix,inverse);
 const walkwayEdges=measuredWalkwayEdges(part,layout,matrix);
 const placedPosts=new Set();
 layout.forEach((l,index)=>{
  const s=l.segment,r={...defaultRailing(),...s.railing};if(['none','solid','yavin-aqueduct','yavin-temple-bridge','kashyyyk-timber','kashyyyk-suspension','kotor-kashyyyk'].includes(r.style))return;
  const material=new THREE.MeshStandardMaterial({color:r.color,roughness:.6}),rails=new THREE.Group();material.userData.railing=true;
  const world=(x,y,z)=>new THREE.Vector3(l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[1]+y,l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z).applyMatrix4(matrix);
  function mesh(g){g.applyMatrix4(inverse);const m=new THREE.Mesh(g,material);m.castShadow=m.receiveShadow=true;m.userData.routeSegment=index;m.userData.railing=true;m.userData.routePost=!!g.userData.routePost;rails.add(m);}
  function beam(a,b,width,height){const delta=b.clone().sub(a),g=new THREE.BoxGeometry(width,height,delta.length()),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),delta.normalize());g.applyQuaternion(q);g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());mesh(g);}
  if(['walkway','bespin','bespin-arches'].includes(r.style)){buildMeasuredWalkway(part,l,index,r,world,mesh,walkwayEdges);applySurface(rails,material,{...part,surface:r.surface});for(const m of [...rails.children])group.add(m);return;}
  function edge(a,b,profile){
   const delta=b.clone().sub(a),length=Math.hypot(delta.x,delta.z);if(length<1e-5)return;
   const tangent=new THREE.Vector3(delta.x,0,delta.z).normalize(),normal=new THREE.Vector3(-tangent.z,0,tangent.x),lift=new THREE.Vector3(0,r.height,0);
   beam(a.clone().add(lift),b.clone().add(lift),r.railWidth,r.railHeight);
   if(r.style==='posts'){
    const localA=a.clone().applyMatrix4(inverse),sideX=(localA.x-l.start[0])*Math.cos(l.heading)-(localA.z-l.start[2])*Math.sin(l.heading),arcFactor=s.curveAngle?Math.abs(1-sideX*s.curveAngle/s.run):1;const n=Math.max(1,Math.ceil(length*arcFactor/r.spacing));for(let i=0;i<=n;i++){const t=i/n,p=a.clone().lerp(b,t);let base=p.y;if(profile){const step=Math.min(s.rise<0?s.steps-1:s.steps,Math.floor(t*s.steps)+(s.rise<0?0:1));base=world(0,step*s.rise/s.steps,0).y;}
     const key=[p.x,p.z,p.y+r.height,r.postWidth].map(v=>v.toFixed(5)).join(',')+r.color+JSON.stringify(r.surface);if(placedPosts.has(key))continue;placedPosts.add(key);
     const top=p.y+r.height,g=new THREE.BoxGeometry(r.postWidth,Math.max(.02,top-base),r.postWidth);g.translate(p.x,(top+base)/2,p.z);g.userData.routePost=true;mesh(g);
    }
   }
  }
  if(s.kind==='landing'||s.rise===0){
   for(const e of landingRailEdges(part.route,l,index))if(r.sides==='both'||e.side===r.sides)edge(world(e.a[0],0,e.a[1]),world(e.b[0],0,e.b[1]),false);
  }else for(const [sign,side] of [[1,'left'],[-1,'right']])if(r.sides==='both'||r.sides===side){const x=sign*l.width/2,a=world(x,0,0),b=world(x,s.rise,s.run);
   if(r.style==='solid'){const outward=world(sign,0,0).sub(world(0,0,0)).normalize().multiplyScalar(r.panelThickness/2);a.add(outward);b.add(outward);}
   edge(a,b,s.kind==='stairs');}
  applySurface(rails,material,{...part,surface:r.surface});for(const m of [...rails.children])group.add(m);
 });
}

// Keep the outer wall face on the floor edge; thickness occupies the floor inward.
// Caps share the wall footprint and mitred joins, forming flush box corners.
function buildSolidRouteWalls(group,part,layout,matrix,inverse){
 const edges=[];
 layout.forEach((l,index)=>{
  const s=l.segment,r={...defaultRailing(),...s.railing};if(r.style!=='solid')return;
  const world=(x,y,z)=>new THREE.Vector3(l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[1]+y,l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z).applyMatrix4(matrix);
  const add=(a,b,out)=>{const tangent=b.clone().sub(a);tangent.y=0;tangent.normalize();const normal=world(out[0],0,out[1]).sub(world(0,0,0));normal.y=0;normal.normalize();edges.push({a,b,normal,tangent,r,s,index});};
  if(s.kind==='landing'||s.rise===0){for(const e of landingRailEdges(part.route,l,index))if(r.sides==='both'||e.side===r.sides){const out=e.out||(e.out||(e.a[0]===e.b[0]?[e.side==='left'?1:-1,0]:[0,e.a[1]===0?-1:1]));add(world(e.a[0],0,e.a[1]),world(e.b[0],0,e.b[1]),out);}}
  else for(const [sign,side] of [[1,'left'],[-1,'right']])if(r.sides==='both'||r.sides===side)add(world(sign*l.width/2,0,0),world(sign*l.width/2,s.rise,s.run),[sign,0]);
 });
 const key=p=>p.toArray().map(v=>v.toFixed(5)).join(','),joins=new Map();
 for(const e of edges)for(const end of ['a','b']){const k=key(e[end]);if(!joins.has(k))joins.set(k,[]);joins.get(k).push(e);}
 const distance=(e,layer,side)=>side?0:-e.r.panelThickness;
 function corner(e,end,layer,side){const p=e[end].clone().addScaledVector(e.normal,distance(e,layer,side));const other=(joins.get(key(e[end]))||[]).find(q=>q!==e);if(!other)return p;
  const q=e[end].clone().addScaledVector(other.normal,distance(other,layer,side)),u=e.tangent,v=other.tangent,det=u.x*v.z-u.z*v.x;
  if(Math.abs(det)>1e-6){const t=((q.x-p.x)*v.z-(q.z-p.z)*v.x)/det;p.addScaledVector(u,t);}
  return p;
 }
 for(const e of edges){const {r,s,index}=e,holder=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:r.color,roughness:.6});material.userData.railing=true;
  for(const layer of ['cap','wall']){
   const corners=[corner(e,'a',layer,0),corner(e,'b',layer,0),corner(e,'b',layer,1),corner(e,'a',layer,1)];
   const bottom=corners.map((p,i)=>{const v=p.clone(),base=(i===0||i===3?e.a:e.b).y;v.y=layer==='cap'?base+r.height-r.railHeight/2:s.fillToGround?(part.route.groundHeight??0):base-routeBacking(part.route,s)*matrix.elements[5];return v;});
   const top=corners.map((p,i)=>{const v=p.clone();v.y=(i===0||i===3?e.a:e.b).y+r.height+(layer==='cap'?r.railHeight/2:-r.railHeight/2);return v;});
   const vertices=[...bottom,...top],center=vertices.reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(1/8),positions=[];
   for(const face of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]){
    const points=face.map(i=>vertices[i]),normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])),mid=points.reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(.25);
    if(normal.dot(mid.sub(center))<0)points.reverse();for(const i of [0,1,2,0,2,3])positions.push(...points[i].toArray());
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((_,i)=>i%3===0?[positions[i],positions[i+1]]:[]),2));g.computeVertexNormals();g.applyMatrix4(inverse);const mesh=new THREE.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.routeSegment=index;mesh.userData.railing=true;mesh.userData.wallLayer=layer;holder.add(mesh);
  }
  applySurface(holder,material,{...part,surface:r.surface});for(const m of [...holder.children])group.add(m);
 }
}
// Cross-sections measured from kam_bldg_bridge1, railings and railpost vertices.
// Source deck width 5.89702; deck Z=1. Rail apex Z=1.508492, post apex Z=1.612792.
function buildMeasuredWalkway(part,l,index,r,world,mesh,walkwayEdges){
 if(r.style==='bespin-arches')buildBespinArches(part,l,r,world,mesh);
 const s=l.segment,w=l.width,bespin=['bespin','bespin-arches'].includes(r.style),k=w/(bespin?4.98109:5.89702);
 // bes1_bldg_ramp_32: x=-2.507..2.47409, inner x=-2.02544..1.99253.
 // Mid-ramp deck z=5.40332; shoulder=3.41374; underside=1.41374.
 const shoulderDepth=bespin?1.98958:1.774,bottomDepth=bespin?3.98958:3.547357;
 function loft(rings,tag){
  const n=rings[0].length,points=rings.flat(),positions=[];
  const center=points.reduce((a,b)=>a.add(b),new THREE.Vector3()).divideScalar(points.length);
  function face(ids){const ps=ids.map(i=>points[i]),normal=ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0])),mid=ps.reduce((a,b)=>a.add(b),new THREE.Vector3()).divideScalar(ps.length);if(normal.dot(mid.sub(center))<0)ps.reverse();for(let i=1;i<ps.length-1;i++)positions.push(...ps[0].toArray(),...ps[i].toArray(),...ps[i+1].toArray());}
  for(const base of [0,points.length-n]){const ring=points.slice(base,base+n),normal=ring.slice(1).map((p,i)=>p.clone().sub(ring[0]).cross(ring[(i+2)%ring.length].clone().sub(ring[0]))).sort((a,b)=>b.lengthSq()-a.lengthSq())[0];const axis=['x','y','z'].sort((a,b)=>Math.abs(normal[b])-Math.abs(normal[a]))[0],outline=ring.map(p=>axis==='x'?new THREE.Vector2(p.y,p.z):axis==='y'?new THREE.Vector2(p.x,p.z):new THREE.Vector2(p.x,p.y));for(const tri of THREE.ShapeUtils.triangulateShape(outline,[]))face(tri.map(i=>base+i));}
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++)face([j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((_,i)=>i%3===0?[positions[i],positions[i+1]]:[]),2));g.computeVertexNormals();g.userData.walkwayProfile=tag;mesh(g);
 }
 // One full solid hull, with vertical shoulders and inward-sloping lower sides.
 const returning=s.kind==='landing'&&s.turn.startsWith('return-'),shift=returning?(s.turn.includes('right')?-1:1)*((w+l.nextWidth)/2+(s.gap??part.route.gap)):0;
 const xmin=Math.min(-w/2,shift-w/2),xmax=Math.max(w/2,shift+w/2),inset=(bespin?.54112:1.32183)*k;
 // Kamino's deck has closed side faces down to its soffit. Start the
 // underbody there, rather than overlapping that same strip of side wall.
 const hullTop=!s.fillToGround?-(s.kind==='landing'||s.rise===0?(s.thickness??part.route.thickness):routeBacking(part.route,s)):-.005;
 const hullShoulder=Math.min(-shoulderDepth*k-.005,hullTop-.001),hullBottom=Math.min(-bottomDepth*k-.005,hullShoulder-.001);
 const terminalStart=!bespin&&index===0,terminalEnd=!bespin&&index===part.route.segments.length-1;
 const bevel=Math.min(3*k,s.run/3),stations=[0,...(terminalStart?[bevel]:[]),...(terminalEnd?[s.run-bevel]:[]),s.run];
 if(angledTurn(s)){loft([[0,hullTop],[0,hullShoulder],[inset,hullBottom]].map(([d,y])=>angledFootprint(l,d).map(([x,z])=>world(x,y,z))),'hull');
 }else if(s.kind==='landing'&&s.turn!=='straight'){
  // Match the flight cross-section at each port; inset only exposed boundaries.
  function footprint(d){
   if(returning){const lo=-w/2+d,span=(w+l.nextWidth)/2+(s.gap??part.route.gap),hi=span+l.nextWidth/2-d,far=s.run-d,half=w/2;
    return [[lo,0],[-half+w-d,0],[-half+w-d,d],[span-l.nextWidth/2+d,d],[span-l.nextWidth/2+d,0],[hi,0],[hi,far],[lo,far]].map(([x,z])=>[s.turn==='return-right'?-x:x,z]);
   }
   const p=[[-w/2+d,0],[w/2-d,0],[w/2-d,s.run-l.nextWidth+d],[w/2,s.run-l.nextWidth+d],[w/2,s.run-d],[-w/2+d,s.run-d]];
   return p.map(([x,z])=>[s.turn==='right'?-x:x,z]);
  }
  loft([[0,hullTop],[0,hullShoulder],[inset,hullBottom]].map(([d,y])=>footprint(d).map(([x,z])=>world(x,y,z))),'hull');
 }else loft(stations.map(z=>{const end=(terminalStart&&z===0)||(terminalEnd&&z===s.run),y=s.rise*z/s.run,shoulder=Math.min(end?-.5*k-.005:hullShoulder,hullTop-.001),bottom=Math.min(end?-1*k-.005:hullBottom,shoulder-.001);return [[xmin,hullTop],[xmax,hullTop],[xmax,shoulder],[xmax-inset,bottom],[xmin+inset,bottom],[xmin,shoulder]].map(([x,h])=>world(x,y+h,z));}),'hull');
 for(const e of walkwayEdges.filter(e=>e.index===index)){
  const {a,b,out}=e;
  if(bespin){
   function corner(end,inset,height){const source=e[end],p=source.clone().addScaledVector(out,-inset),other=walkwayEdges.find(q=>q!==e&&['bespin','bespin-arches'].includes(q.r.style)&&(q.a.distanceTo(source)<1e-5||q.b.distanceTo(source)<1e-5));if(other){const q=source.clone().addScaledVector(other.out,-inset),u=b.clone().sub(a),v=other.b.clone().sub(other.a),det=u.x*v.z-u.z*v.x;if(Math.abs(det)>1e-8){const t=((q.x-p.x)*v.z-(q.z-p.z)*v.x)/det;p.x+=u.x*t;p.z+=u.z*t;}}p.y=source.y+height;return p;}
   loft(['a','b'].map(end=>[[0,hullTop],[r.panelThickness,hullTop],[r.panelThickness,r.height],[0,r.height]].map(([d,h])=>corner(end,d,h))),'bespin-parapet');continue;
  }
  const offset=.56895*k,scale=r.height/.612792,length=a.distanceTo(b);
  if(length<.01)continue;
  function endpoint(end,x,y){
   const source=e[end],p=source.clone().addScaledVector(out,x*scale-offset),other=walkwayEdges.find(q=>q!==e&&(q.a.distanceTo(source)<1e-5||q.b.distanceTo(source)<1e-5));
   if(other){const q=source.clone().addScaledVector(other.out,x*(other.r.height/.612792)-.56895*other.width/5.89702),u=b.clone().sub(a),v=other.b.clone().sub(other.a),det=u.x*v.z-u.z*v.x;if(Math.abs(det)>1e-8){const d=((q.x-p.x)*v.z-(q.z-p.z)*v.x)/det;p.x+=u.x*d;p.z+=u.z*d;}}
   p.y=source.y+y*scale;return p;
  }
  const joined=end=>walkwayEdges.some(q=>q!==e&&(q.a.distanceTo(e[end])<1e-5||q.b.distanceTo(e[end])<1e-5));
  function prism(profile,start,end,tag='rail'){loft([start,end].map(t=>profile.map(([x,y])=>endpoint('a',x,y).lerp(endpoint('b',x,y),t))),tag);}
  const railProfile=[[-.223624,.121165],[.223624,.121165],[.223624,.379383],[0,.508492],[-.223624,.379383]],postProfile=[[-.317776,0],[.317776,0],[.317776,.309332],[.217045,.526598],[0,.612792],[-.217045,.526598],[-.317776,.309332]];
  const n=Math.max(1,Math.ceil(length/r.spacing)),half=Math.min(.5003*scale/length,.2/n),ja=joined('a'),jb=joined('b');
  for(let i=0;i<=n;i++){const t=i/n;if(!(i===0&&ja)&&!(i===n&&jb))prism(postProfile,Math.max(0,t-half),Math.min(1,t+half),'post');if(i<n)prism(railProfile,i===0&&ja?0:t+half,i===n-1&&jb?1:(i+1)/n-half);}
 }

}

function measuredWalkwayEdges(part,layout,matrix){
 const edges=[];
 for(const l of layout){const s=l.segment,r={...defaultRailing(),...s.railing};if(!['walkway','bespin','bespin-arches'].includes(r.style))continue;
 const world=(x,y,z)=>new THREE.Vector3(l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[1]+y,l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z).applyMatrix4(matrix);
 const add=(a,b,out)=>edges.push({a,b,out:world(out[0],0,out[1]).sub(world(0,0,0)).normalize(),index:l.index,width:l.width,r});
 if(s.kind==='landing'||s.rise===0){for(const e of landingRailEdges(part.route,l,l.index))if(r.sides==='both'||e.side===r.sides)add(world(e.a[0],0,e.a[1]),world(e.b[0],0,e.b[1]),e.out||(e.a[0]===e.b[0]?[e.side==='left'?1:-1,0]:[0,e.a[1]===0?-1:1]));}
 else for(const [sign,side] of [[1,'left'],[-1,'right']])if(r.sides==='both'||r.sides===side)add(world(sign*l.width/2,0,0),world(sign*l.width/2,s.rise,s.run),[sign,0]);
 }return edges;
}
