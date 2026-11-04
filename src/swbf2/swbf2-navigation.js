import * as T from '../../vendor/three.module.js';
import {PARTS} from '../core/model.js';
import {routeLayout} from '../routes/stair-route.js';
import {curveMeshPoint,curvePanelCount} from '../routes/curved-route.js';
import {collisionPose,transformCollisionBody} from '../collision/object-collision.js';
import {boxSurface} from '../collision/collision-geometry.js';
import {createWalkCollision} from '../walk/walk-collision.js';
import {levelsOf} from '../interiors/interior-storeys.js';
import {interiorWalls,openingLine} from '../interiors/interior.js';
import {wallPoint,wallBasis} from '../interiors/polygon-plan.js';
import {junctionPort} from '../routes/route-junctions.js';
import {entranceFrame} from '../interiors/entrances.js';
import {preparedNavigationVoids} from './swbf2-navigation-voids.js';
import {mergeNavigationBarriers} from './swbf2-navigation-barriers.js';
import {simplifyNavigationGraph} from './swbf2-navigation-simplify.js';

// Planning is deliberately independent of exported render batches and route
// chunking. Read the same physical scene used by walk mode; never author or
// change collision here. Native prohibit flags differ from collision masks.
export const SWBF2_AI_RULE_VERSION=9;
export const SWBF2_INFANTRY_AI_FLAGS=3; // SOLDIER | HOVER (stock jet troops and mobile heroes)
// Normal stock infantry derives roughly .48 m from the clone model's X/Z
// bounds. Reserve .5 m; custom unit models and ODF overrides can differ.
const DEFAULT_RULES={spacing:6,agentRadius:.5,agentHeight:1.8,maxSlope:.75,step:.4,seamGap:.25,barrierWidth:.22,mergedBarrierWidth:.44,unitMask:SWBF2_INFANTRY_AI_FLAGS,maxHubs:255,maxConnections:255,maxDegree:8,maxSamples:1800,maxBarriers:3000};
const up=new T.Vector3(0,1,0),down=up.clone().negate(),v=p=>new T.Vector3(...p);
const key=p=>p.map(n=>Math.round(n*1000)).join(',');
const distanceXZ=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const visible=m=>{for(let o=m;o;o=o.parent)if(!o.visible||o.userData.referenceOnly)return false;return true;};
const walkingRoute=part=>!!part.route&&part.type!=='wall-route';
const samplePriority=kind=>kind==='door'||kind==='junction'||kind==='transition'?2:kind==='route'?1:0;
function spatial(items,position,cell=6){
 const map=new Map();for(const item of items){const p=position(item),k=[Math.floor(p.x/cell),Math.floor(p.z/cell)].join(',');if(!map.has(k))map.set(k,[]);map.get(k).push(item);}
 return (minX,minZ,maxX,maxZ)=>{const result=[];for(let x=Math.floor(minX/cell);x<=Math.floor(maxX/cell);x++)for(let z=Math.floor(minZ/cell);z<=Math.floor(maxZ/cell);z++)result.push(...(map.get([x,z].join(','))??[]));return result;};
}
// Index the whole arc, not only its midpoint: simplified straight corridors
// can be much longer than the sampling radius. Sampling grid cells plus their
// neighbours gives conservative coverage in linear space, even on diagonals.
function spatialLinks(items,cell=6){
 const map=new Map();for(const item of items){const a=item.start.point,b=item.end.point,steps=Math.max(1,Math.ceil(Math.max(Math.abs(a.x-b.x),Math.abs(a.z-b.z))*2/cell));
  for(let i=0;i<=steps;i++){const t=i/steps,x=Math.floor((a.x+(b.x-a.x)*t)/cell),z=Math.floor((a.z+(b.z-a.z)*t)/cell);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const key=[x+dx,z+dz].join(',');if(!map.has(key))map.set(key,new Set());map.get(key).add(item);}}
 }
 return (minX,minZ,maxX,maxZ)=>{const result=new Set();for(let x=Math.floor(minX/cell);x<=Math.floor(maxX/cell);x++)for(let z=Math.floor(minZ/cell);z<=Math.floor(maxZ/cell);z++)for(const item of map.get([x,z].join(','))??[])result.add(item);return [...result];};
}
function floorMesh(part,mesh){
 if(!visible(mesh)||mesh.userData.railing||mesh.userData.routePost||mesh.userData.highwayRailing||mesh.userData.interiorCeiling)return false;
 const role=(Array.isArray(mesh.material)?mesh.material[0]:mesh.material)?.userData.interiorRole;
 if(role==='floor'||mesh.userData.interiorFloor||mesh.userData.interiorStair||mesh.userData.routeFloor||mesh.userData.highwayDeck)return true;
 if(part.platform)return !['body','supports','trim','fringe'].includes(mesh.geometry.userData.platformPart);
 if(part.interior||part.entranceInteriors?.length||part.flora||part.interiorProp||part.route||part.highway)return false;
 return PARTS.find(p=>p.id===part.type)?.category==='Bodies';
}
function meshFloors(mesh){
 const g=mesh.geometry,p=g.attributes.position,index=g.index,triangles=[];if(!p)return triangles;
 for(let i=0;i<(index?.count??p.count);i+=3){const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));if(mesh.matrixWorld.determinant()<0)[points[1],points[2]]=[points[2],points[1]];
  const normal=T.Triangle.getNormal(...points,new T.Vector3());if(normal.y>=.7)triangles.push(points);
 }return triangles;
}
function pointOnTriangleXZ(points,x,z){
 const [a,b,c]=points,den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-9)return null;
 const s=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,t=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;
 if(s<-.00001||t<-.00001||s+t>1.00001)return null;return new T.Vector3(x,s*a.y+t*b.y+(1-s-t)*c.y,z);
}
function segmentDistanceXZ(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
function closestFloorXZ(points,p){const inside=pointOnTriangleXZ(points,p.x,p.z);if(inside)return inside;let best=null;for(let i=0;i<3;i++){const a=points[i],b=points[(i+1)%3],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1))),point=a.clone().lerp(b,t);if(!best||distanceXZ(point,p)<distanceXZ(best,p))best=point;}return best;}
function barrierIntersects(a,b,barrier,padding=0,endPadding=padding){
 const d=barrier.b.clone().sub(barrier.a);d.y=0;const length=d.length();d.normalize();const n=new T.Vector3(-d.z,0,d.x),center=barrier.a.clone().lerp(barrier.b,.5),half=[length/2,barrier.width/2];
 const p=a.clone().sub(center),q=b.clone().sub(center),start=[p.dot(d),p.dot(n)],end=[q.dot(d),q.dot(n)];let lo=0,hi=1;
 // Native corridor widths interpolate between endpoint radii. Inflating the
 // whole arc by its widest end falsely suppresses barriers near a narrow end.
 for(let i=0;i<2;i++)for(const sign of [-1,1]){const value=sign*start[i]-half[i]-padding,slope=sign*(end[i]-start[i])-(endPadding-padding);if(Math.abs(slope)<1e-9){if(value>0)return false;continue;}const t=-value/slope;if(slope>0)hi=Math.min(hi,t);else lo=Math.max(lo,t);if(lo>hi)return false;}return true;
}

export function navigationInput(parts,roots,prefix){
 const byId=new Map(parts.map(p=>[p.id,p])),floors=[];
 for(const root of roots){const part=byId.get(root.userData.partId);if(!part)continue;root.updateWorldMatrix(true,true);root.traverse(mesh=>{if(!mesh.isMesh||!floorMesh(part,mesh))return;for(const points of meshFloors(mesh))floors.push({partId:part.id,routeSegment:mesh.userData.routeSegment,points:points.map(p=>p.toArray())});});}
 return {parts,prefix,floors,roots:roots.map(root=>({partId:root.userData.partId,matrix:root.matrixWorld.toArray(),visible:visible(root),collision:root.userData.collision}))};
}
export function navigationFromInput(input){
 const roots=input.roots.map(data=>{const root=new T.Group();root.matrixAutoUpdate=false;root.matrix.fromArray(data.matrix);root.visible=data.visible;root.userData={partId:data.partId,collision:data.collision};return root;});
 return generateSWBF2Navigation(input.parts,roots,{prefix:input.prefix,floorSource:input.floors});
}

export function generateSWBF2Navigation(parts,roots,{prefix='wb_ai',spacing=DEFAULT_RULES.spacing,attempt=0,floorSource=null}={}){
 const RULES={...DEFAULT_RULES,spacing:Number(spacing.toFixed(4))};
 const collision=createWalkCollision(roots),inPreparedVoid=preparedNavigationVoids(parts),ray=new T.Raycaster(),hubs=[],connections=[],barriers=[],warnings=[],floors=[],boundary=new Map(),stats={rejectedSamples:0,blockedConnections:0,suppressedBarriers:0,limitsReached:false};
 const rootById=new Map(roots.map(r=>[r.userData.partId,r])),partById=new Map(parts.map(p=>[p.id,p])),hubKeys=new Map(),sampleCells=new Map();
 const hit=(point,direction,far,accept)=>{ray.set(point,direction);ray.near=.0001;ray.far=far;return collision.firstHit(ray,accept);};
 const normal=h=>h.face.normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(h.object.matrixWorld)).normalize();
 const ground=p=>hit(p.clone().addScaledVector(up,.65),down,1.3,h=>normal(h).y>.7)?.point??null;
 const supported=p=>{const g=ground(p);return g&&Math.abs(g.y-p.y)<=RULES.step+.03?g:null;};
 function clear(p,radius=RULES.agentRadius){
  const bodyPoint=p.clone().addScaledVector(up,.9);if(collision.containsPoint(bodyPoint,{openSkins:true,excludeOpenSkin:(body,root)=>!partById.get(body.partId??root.userData.partId)?.interiorProp&&inPreparedVoid(bodyPoint)}))return false;
  if(hit(p.clone().addScaledVector(up,.1),up,RULES.agentHeight-.1))return false;
  for(const y of [.45,1,RULES.agentHeight-.1])for(let i=0;i<8;i++){const d=new T.Vector3(Math.cos(i*Math.PI/4),0,Math.sin(i*Math.PI/4));if(hit(p.clone().addScaledVector(up,y),d,radius))return false;}return true;
 }
 const stand=p=>{const g=supported(p);if(!g||!clear(g))return null;for(const d of [[1,0],[-1,0],[0,1],[0,-1]])if(!supported(g.clone().add(new T.Vector3(d[0]*RULES.agentRadius,0,d[1]*RULES.agentRadius))))return null;return g;};
 function add(point,partId,kind='surface'){
  const grounded=stand(point);if(!grounded){stats.rejectedSamples++;return null;}const k=key(grounded.toArray());if(hubKeys.has(k)){const old=hubs[hubKeys.get(k)];if(!old.partIds.includes(partId))old.partIds.push(partId);if(samplePriority(kind)>samplePriority(old.kind))old.kind=kind;return old;}
  const cx=Math.floor(grounded.x/1.5),cz=Math.floor(grounded.z/1.5);
  const separation=kind==='surface'?RULES.spacing*.6:1.25,range=Math.ceil(separation/1.5);
  for(let x=cx-range;x<=cx+range;x++)for(let z=cz-range;z<=cz+range;z++)for(const h of sampleCells.get([x,z].join(','))??[])if(distanceXZ(h.point,grounded)<separation&&Math.abs(h.point.y-grounded.y)<.25){if(!h.partIds.includes(partId))h.partIds.push(partId);if(samplePriority(kind)>samplePriority(h.kind))h.kind=kind;return h;}
  if(hubs.length>=RULES.maxSamples){stats.limitsReached=true;return null;}
  const hub={name:prefix+'_h'+hubs.length,point:grounded,partIds:[partId],kind,radius:.35};hubKeys.set(k,hubs.length);hubs.push(hub);const cell=[cx,cz].join(',');if(!sampleCells.has(cell))sampleCells.set(cell,[]);sampleCells.get(cell).push(hub);return hub;
 }
 const semantic=p=>!!(walkingRoute(p)||p.platform||p.interior||p.highway||p.entranceInteriors?.length),hasSemantic=parts.some(semantic),ordered=[...parts].sort((a,b)=>Number(semantic(b))-Number(semantic(a)));
 const intentIds=new Set(parts.filter(semantic).map(p=>p.id)),isIntentHub=h=>h.partIds.some(id=>intentIds.has(id));
 const nearSample=p=>{const cx=Math.floor(p.x/1.5),cz=Math.floor(p.z/1.5);for(let x=cx-4;x<=cx+4;x++)for(let z=cz-4;z<=cz+4;z++)for(const h of sampleCells.get([x,z].join(','))??[])if(isIntentHub(h)&&distanceXZ(h.point,p)<6&&Math.abs(h.point.y-p.y)<.3)return true;return false;};
 for(const part of ordered){const root=rootById.get(part.id);if(!root||!visible(root))continue;root.updateWorldMatrix(true,true);const local=[];
  if(floorSource){for(const floor of floorSource)if(floor.partId===part.id)local.push({...floor,points:floor.points.map(v)});}
  else {root.traverse(mesh=>{if(!mesh.isMesh||!floorMesh(part,mesh))return;for(const points of meshFloors(mesh))local.push({points,partId:part.id,routeSegment:mesh.userData.routeSegment});});}floors.push(...local);
  if(walkingRoute(part)){
   let priorLane=0;
   const layouts=routeLayout(part.route),ports=[...(part.route.externalOpenings??[]),...part.route.segments.flatMap(s=>[s.branchFrom,s.joinTo].filter(Boolean))];
   for(const ref of ports){const port=junctionPort(layouts,ref);for(const t of [-.8,0,.8])add(v(port.point).add(new T.Vector3(Math.sin(port.angle)*t,0,Math.cos(port.angle)*t)).applyMatrix4(root.matrixWorld),part.id,'junction');}
   for(const layout of layouts){const {segment:s,start,heading,width}=layout,panels=Math.max(Math.ceil(s.run*Math.max(Math.abs(part.scale[0]),Math.abs(part.scale[2]))/RULES.spacing),s.curveAngle?curvePanelCount(s):1),frame=root.matrixWorld.clone().multiply(new T.Matrix4().makeTranslation(...start)).multiply(new T.Matrix4().makeRotationY(heading));add(v(layout.end).applyMatrix4(root.matrixWorld),part.id,layouts[layout.index+1]&&Math.abs(layouts[layout.index+1].width-width)>.001?'transition':'route');
    // Include lateral lanes so a trunk, pillar or furniture can displace the
    // preferred centre line without disconnecting the entire route.
    const lanes=width>=3?[0,-.28,.28]:[0];for(let i=0;i<=panels;i++){let best=null;const portal=i===0&&(layout.index===0&&part.route.links?.start||part.route.attachments?.some(a=>a.index===layout.index&&a.end==='start'))||i===panels&&(layout.index===layouts.length-1&&part.route.links?.end||part.route.attachments?.some(a=>a.index===layout.index&&a.end==='end'));for(const lane of lanes){const inset=Math.min(RULES.agentRadius+RULES.barrierWidth/2+.1,s.run/4),z=Math.max(inset,Math.min(s.run-inset,s.run*i/panels)),y=s.kind==='landing'?0:s.rise*z/s.run,point=stand(v(curveMeshPoint(width*lane,y,z,s.run,s.curveAngle??0)).applyMatrix4(frame));if(!point)continue;if(portal)add(point,part.id,'junction');let clearance=2.5;
     for(let j=0;j<8;j++){const d=new T.Vector3(Math.cos(j*Math.PI/4),0,Math.sin(j*Math.PI/4));for(const height of [.9,1.6]){const obstacle=hit(point.clone().addScaledVector(up,height),d,clearance);if(obstacle)clearance=Math.min(clearance,obstacle.distance);}}
     const score=clearance-Math.abs(lane-priorLane)*width*.05;if(!best||score>best.score+.001)best={point,lane,score};
    }if(best){add(best.point,part.id,'route');priorLane=best.lane;}else stats.rejectedSamples++;}
   }
  }
  const spaces=[...(part.interior?[{plan:part.interior,frame:root.matrixWorld}]:[]),...(part.entranceInteriors??[]).map(space=>({plan:space.plan,frame:entranceFrame(part,space)}))];
  for(const space of spaces)for(const level of levelsOf(space.plan)){const walls=interiorWalls(level.plan);for(const door of level.plan.doors){if(door.kind==='window')continue;const line=openingLine(door,walls),wall=walls.find(w=>w.axis===line?.axis&&Math.abs(w.line-line.line)<.00001&&door.offset>=w.start&&door.offset<=w.end);if(!wall)continue;const point=wallPoint(wall,door.offset),basis=wallBasis(wall),height=level.elevation+(space.plan.shell?space.plan.slab:0);for(const side of [-1,0,1])add(new T.Vector3(point.x+basis.nx*side*.8,height,point.z+basis.nz*side*.8).applyMatrix4(space.frame),part.id,'door');}}
  // Sample broad decks and rooms in world space, and triangle centroids for
  // small/narrow floors. Ground probes replace visual treads with their ramps.
  const seen=new Set();for(const {points,routeSegment} of local){if(part.route&&part.route.segments[routeSegment]?.kind!=='landing')continue;const box=new T.Box3().setFromPoints(points),samples=[points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3)];
   const limited=hasSemantic&&!semantic(part),areas=limited?hubs.filter(isIntentHub).flatMap(h=>{const point=closestFloorXZ(points,h.point);if(distanceXZ(point,h.point)>6||Math.abs(point.y-h.point.y)>.3)return [];return [{minX:Math.max(box.min.x,h.point.x-6),maxX:Math.min(box.max.x,h.point.x+6),minZ:Math.max(box.min.z,h.point.z-6),maxZ:Math.min(box.max.z,h.point.z+6)}];}):[{minX:box.min.x,maxX:box.max.x,minZ:box.min.z,maxZ:box.max.z}];
   for(const area of areas){const count=(area.maxX-area.minX)*(area.maxZ-area.minZ)/(RULES.spacing**2);if(count>20000){stats.limitsReached=true;continue;}
    for(let x=Math.ceil(area.minX/RULES.spacing)*RULES.spacing;x<=area.maxX;x+=RULES.spacing)for(let z=Math.ceil(area.minZ/RULES.spacing)*RULES.spacing;z<=area.maxZ;z+=RULES.spacing){const p=pointOnTriangleXZ(points,x,z);if(p)samples.push(p);}
   }
   // Curved routes already have closely spaced lanes; floor samples here are
   // only needed for turns, landings, and enclosed halls.
   for(const p of samples){const k=key(p.toArray());if(seen.has(k))continue;seen.add(k);if(hasSemantic&&!semantic(part)&&!nearSample(p))continue;add(p,part.id);}
  }
 }
 // The native compiler has a hard limit of 255 hubs, with eight connections
 // per hub. Coarsen floor sampling globally before dropping any coverage.
 // Leave capacity for verified doorway bends and isolated-sample repairs.
 // Filling every native slot before connectivity repair strands safe floors.
 if(hubs.length>RULES.maxHubs-12&&attempt<6)return generateSWBF2Navigation(parts,roots,{prefix,spacing:spacing*1.4,attempt:attempt+1,floorSource});
 // A route can contain 256 straight construction sections. Coarser sampling
 // alone cannot reduce their mandatory end points. Remove an intermediate
 // route-only sample only when its two neighbours are collinear and the full
 // shortcut has verified floor support and clearance. Preserve doors, turns,
 // junctions and samples shared with other scene objects.
 stats.compactedRouteSamples=0;
 if(hubs.length>RULES.maxHubs){const alive=new Set(hubs),nearRoute=spatial(hubs,h=>h.point);for(const h of hubs){if(h.kind!=='route'||h.partIds.length!==1)continue;
  const neighbours=nearRoute(h.point.x-24,h.point.z-24,h.point.x+24,h.point.z+24).filter(n=>n!==h&&alive.has(n)&&n.partIds.length===1&&n.partIds[0]===h.partIds[0]&&distanceXZ(n.point,h.point)<=24).sort((a,b)=>a.point.distanceToSquared(h.point)-b.point.distanceToSquared(h.point));let remove=false;
  for(let i=0;i<neighbours.length&&!remove;i++)for(let j=i+1;j<neighbours.length;j++){const a=neighbours[i].point,b=neighbours[j].point,line=b.clone().sub(a),length=line.length();if(length>24||length<.001)continue;const t=h.point.clone().sub(a).dot(line)/(length*length);if(t<=0||t>=1||a.clone().addScaledVector(line,t).distanceTo(h.point)>.01||!traversable(a,b))continue;remove=true;break;}
  if(remove){alive.delete(h);stats.compactedRouteSamples++;}
 }hubs.splice(0,hubs.length,...hubs.filter(h=>alive.has(h)));}
 if(hubs.length>RULES.maxHubs){hubs.length=RULES.maxHubs;stats.limitsReached=true;}
 let near=spatial(hubs,h=>h.point);const reach=Math.max(6,Math.min(24,spacing*2)),candidates=[],parents=hubs.map((_,i)=>i),degree=hubs.map(()=>0),links=hubs.map(()=>[]),indexes=new Map(hubs.map((h,i)=>[h,i]));
 function traversable(a,b,startRadius=0,endRadius=0){
  const distance=distanceXZ(a,b);if(distance<.001)return false;if(Math.abs(a.y-b.y)>distance*RULES.maxSlope+RULES.step)return false;
  const n=new T.Vector3(b.z-a.z,0,a.x-b.x).normalize(),forward=new T.Vector3(b.x-a.x,0,b.z-a.z).normalize(),steps=Math.max(1,Math.ceil(distance/(RULES.seamGap/2)));let previous=a;
  const floorAt=p=>{const g=supported(p);if(g)return g;const left=supported(p.clone().addScaledVector(forward,-RULES.seamGap/2)),right=supported(p.clone().addScaledVector(forward,RULES.seamGap/2));if(!left||!right||Math.abs(left.y-right.y)>RULES.step)return null;return p.clone().setY((left.y+right.y)/2);};
  for(let i=1;i<=steps;i++){
   const p=a.clone().lerp(b,i/steps),g=floorAt(p);if(!g||Math.abs(g.y-previous.y)>RULES.step+.01)return false;
   const margin=startRadius||endRadius?RULES.barrierWidth/2:0,extent=RULES.agentRadius+margin+T.MathUtils.lerp(startRadius,endRadius,i/steps),priorExtent=RULES.agentRadius+margin+T.MathUtils.lerp(startRadius,endRadius,(i-1)/steps);
   for(const side of [-1,0,1]){const s=g.clone().addScaledVector(n,side*extent),floor=floorAt(s);if(!floor)return false;
    for(const y of [.45,1,RULES.agentHeight-.1]){const from=previous.clone().addScaledVector(n,side*priorExtent).addScaledVector(up,y),to=g.clone().addScaledVector(n,side*extent).addScaledVector(up,y),d=to.sub(from),len=d.length();if(len>1e-6&&hit(from,d.multiplyScalar(1/len),len))return false;}
   }
   if(startRadius||endRadius){
    // Native arcs use interpolated endpoint radii, not just their centre line.
    // Check the entire lateral strip for floor holes and intervening blockers.
    const lanes=Math.ceil(2*extent/RULES.seamGap);for(let lane=1;lane<lanes;lane++)if(!floorAt(g.clone().addScaledVector(n,-extent+2*extent*lane/lanes)))return false;
    for(const y of [.45,1,RULES.agentHeight-.1])for(const side of [-1,1])if(hit(g.clone().addScaledVector(up,y),n.clone().multiplyScalar(side),extent))return false;
   }
   if(hit(g.clone().addScaledVector(up,.1),up,RULES.agentHeight-.1))return false;previous=g;
  }return true;
 }
 for(let i=0;i<hubs.length;i++){const p=hubs[i].point;for(const b of near(p.x-reach,p.z-reach,p.x+reach,p.z+reach)){const j=indexes.get(b);if(j<=i||distanceXZ(p,b.point)>reach||Math.abs(p.y-b.point.y)>reach*RULES.maxSlope+RULES.step)continue;candidates.push({i,j,length:p.distanceToSquared(b.point)});}}
 candidates.sort((a,b)=>a.length-b.length||a.i-b.i||a.j-b.j);
 const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
 const join=edge=>{const {i,j}=edge;if(connections.length>=RULES.maxConnections||degree[i]>=RULES.maxDegree||degree[j]>=RULES.maxDegree)return false;if(!traversable(hubs[i].point,hubs[j].point)){stats.blockedConnections++;edge.blocked=true;return false;}degree[i]++;degree[j]++;parents[find(i)]=find(j);edge.used=true;const distance=hubs[i].point.distanceTo(hubs[j].point);links[i].push({index:j,distance});links[j].push({index:i,distance});connections.push({name:prefix+'_c'+connections.length,start:hubs[i],end:hubs[j],flags:RULES.unitMask});return true;};
 const pathLength=(start,end,maximum=Infinity)=>{const distances=new Map([[start,0]]),pending=[start];while(pending.length){pending.sort((a,b)=>distances.get(b)-distances.get(a));const index=pending.pop(),distance=distances.get(index);if(index===end)return distance;for(const edge of links[index]){const next=distance+edge.distance;if(next>maximum||next>=(distances.get(edge.index)??Infinity))continue;distances.set(edge.index,next);pending.push(edge.index);}}return Infinity;};
 // A short spanning forest preserves reachability before adding local loops;
 // greedy per-node neighbour caps can strand an otherwise reachable doorway.
 for(const edge of candidates)if(find(edge.i)!==find(edge.j))join(edge);
 // Node unit flags are inherited from incident arcs in the native graph. A
 // lone hub on a small floor is not usable planning. Give it a short, verified
 // on-floor connection when there is physical room and native budget for it.
 stats.pairedIsolatedSamples=0;
 for(const h of [...hubs]){const index=indexes.get(h);if(degree[index]||hubs.length>=RULES.maxHubs||connections.length>=RULES.maxConnections)continue;let paired=false;
  for(const radius of [.6,.9,1.2]){for(let i=0;i<8;i++){const point=stand(h.point.clone().add(new T.Vector3(Math.cos(i*Math.PI/4)*radius,0,Math.sin(i*Math.PI/4)*radius)));if(!point||!traversable(h.point,point))continue;
   const j=hubs.length;hubs.push({name:prefix+'_h'+j,point,radius:.35,kind:'coverage',partIds:[...h.partIds]});parents.push(j);degree.push(0);links.push([]);indexes.set(hubs[j],j);join({i:index,j});stats.pairedIsolatedSamples++;paired=true;break;
  }if(paired)break;}
 }
 // A centre line can graze a trunk or a doorway jamb even when the full deck
 // has room. Try a small, physically verified bend before reporting a gap.
 stats.localDetourLoops=0;stats.localShortcutLinks=0;
 // Finish genuine disconnected components first. Then rank local repairs by
 // the detour they remove, so finite native slots serve missing streets ahead
 // of minor shortcuts around furniture.
 for(const local of [false,true]){
 const repairEdges=local?candidates.filter(e=>!e.used&&isIntentHub(hubs[e.i])&&isIntentHub(hubs[e.j])):[...candidates];
 while(repairEdges.length&&connections.length<RULES.maxConnections){
  // Re-score after each repair: closing one gap can remove many candidate
  // detours. Keep the original edge records so a shortcut is never added twice.
  if(local){for(const edge of repairEdges)edge.benefit=pathLength(edge.i,edge.j)-Math.sqrt(edge.length)*1.75-1;repairEdges.sort((a,b)=>b.benefit-a.benefit||a.length-b.length||a.i-b.i||a.j-b.j);if(repairEdges[0].benefit<=0)break;}
  const edge=repairEdges.shift();if(degree[edge.i]>=RULES.maxDegree||degree[edge.j]>=RULES.maxDegree)continue;
  const a=hubs[edge.i],b=hubs[edge.j],middle=a.point.clone().lerp(b.point,.5),side=new T.Vector3(b.point.z-a.point.z,0,a.point.x-b.point.x).normalize();
  const connected=find(edge.i)===find(edge.j);
  // World connectivity can hide a missing local street or landing link: the
  // existing path may cross the whole map. Repair nearby intended surfaces
  // (including a separately constructed stair and its adjoining floor) before spending the remaining native arcs on extra loops.
  if(local?(!connected||pathLength(edge.i,edge.j,Math.sqrt(edge.length)*1.75+1)<Infinity):connected)continue;
  if(local&&!edge.blocked&&join(edge)){stats.localShortcutLinks++;continue;}
  if(hubs.length>=RULES.maxHubs||connections.length+2>RULES.maxConnections)continue;
  for(const offset of [.8,-.8,1.5,-1.5,2.5,-2.5,4,-4]){const point=stand(middle.clone().addScaledVector(side,offset));if(!point||!traversable(a.point,point)||!traversable(point,b.point))continue;
   const i=hubs.length;hubs.push({name:prefix+'_h'+i,point,radius:.35,kind:'detour',partIds:[...new Set([...a.partIds,...b.partIds])]});parents.push(i);degree.push(0);links.push([]);join({i:edge.i,j:i});join({i,j:edge.j});if(connected)stats.localDetourLoops++;break;
  }
 }
 }
 for(const edge of candidates)if(!edge.used&&!edge.blocked&&degree[edge.i]<4&&degree[edge.j]<4)join(edge);
 if(hasSemantic){
  const intent=new Set(parts.filter(semantic).map(p=>p.id)),adjacency=new Map(hubs.map(h=>[h,[]])),reached=new Set(hubs.filter(h=>h.partIds.some(id=>intent.has(id)))),pending=[...reached];
  for(const c of connections){adjacency.get(c.start).push(c.end);adjacency.get(c.end).push(c.start);}while(pending.length){const h=pending.pop();for(const next of adjacency.get(h))if(!reached.has(next)){reached.add(next);pending.push(next);}}
  stats.discardedUnreachableBlockSamples=hubs.length-reached.size;hubs.splice(0,hubs.length,...hubs.filter(h=>reached.has(h)));connections.splice(0,connections.length,...connections.filter(c=>reached.has(c.start)&&reached.has(c.end)));
 }
 near=spatial(hubs,h=>h.point);
 // Hub circles must fit on the surface and away from nearby solids. A broad
 // hub otherwise permits shortcuts even if its centre-to-centre arc is safe.
 for(const h of hubs){let clearance=2.3;for(let i=0;i<12;i++){const d=new T.Vector3(Math.cos(i*Math.PI/6),0,Math.sin(i*Math.PI/6));for(const y of [.45,1,RULES.agentHeight-.1]){const obstacle=hit(h.point.clone().addScaledVector(up,y),d,clearance);if(obstacle)clearance=Math.min(clearance,obstacle.distance);}}
  h.radius=0;for(const radius of [.1,.2,.35,.5,.75,1,1.5,2]){if(radius>clearance-RULES.agentRadius-RULES.barrierWidth/2)break;let okay=true;for(let i=0;i<12;i++){const extent=radius+RULES.agentRadius+RULES.barrierWidth/2,p=h.point.clone().add(new T.Vector3(Math.cos(i*Math.PI/6)*extent,0,Math.sin(i*Math.PI/6)*extent));if(!supported(p)){okay=false;break;}}if(!okay)break;h.radius=radius;}
 }
 // Native ConnectivityNode::IsPointInside ignores Y. A cylindrical hub above
 // another physical walking surface can classify an actor on the wrong floor.
 // Radius zero disables that shortcut; SetDestination then uses the nearest
 // 3D arc. Native random-point selection clamps radius-buffer to zero, so the
 // waypoint remains the verified floor point rather than an invented anchor.
 stats.layeredPointHubs=0;
 for(const h of hubs){const fittedRadius=h.radius;for(const floor of floors){let point=closestFloorXZ(floor.points,h.point);if(!point||distanceXZ(point,h.point)>fittedRadius||Math.abs(point.y-h.point.y)<RULES.agentHeight)continue;
   if(!stand(point)){const centre=floor.points[0].clone().add(floor.points[1]).add(floor.points[2]).multiplyScalar(1/3),toward=centre.clone().sub(point).setY(0);if(toward.length()<.001)continue;point.addScaledVector(toward.normalize(),.35);const onFloor=pointOnTriangleXZ(floor.points,point.x,point.z);if(!onFloor||distanceXZ(onFloor,h.point)>fittedRadius||!stand(onFloor))continue;}
   h.walkableRadius=fittedRadius;h.radius=0;h.layered=true;stats.layeredPointHubs++;break;
  }}
 // Boundary triangles can have T junctions and tread seams. Test both sides
 // against the complete physical scene before declaring an exposed edge.
 for(const floor of floors)for(let i=0;i<3;i++){const a=floor.points[i],b=floor.points[(i+1)%3],k=[key(a.toArray()),key(b.toArray())].sort().join('|');if(!boundary.has(k))boundary.set(k,{a,b,partId:floor.partId,count:0});boundary.get(k).count++;}
 // Shrinking a shared endpoint can only narrow its other corridors. Keep the
 // graph intact while reducing unsafe arc widths to verified floor clearance.
 stats.tightenedCorridorHubs=0;const originalRadii=new Map(hubs.map(h=>[h,h.radius]));
 const narrower=radius=>[0,.1,.2,.35,.5,.75,1,1.5,2].filter(r=>r<radius-.00001).at(-1)??0;
 for(const c of connections)while((c.start.radius||c.end.radius)&&!traversable(c.start.point,c.end.point,c.start.radius,c.end.radius)){
  const h=c.start.radius>=c.end.radius?c.start:c.end;h.radius=narrower(h.radius);
 }
 const simplified=simplifyNavigationGraph(hubs,connections,{removable:h=>(h.kind==='route'||h.kind==='surface')&&h.partIds.every(id=>walkingRoute(partById.get(id))),clear:(a,b)=>traversable(a.point,b.point,a.radius,b.radius)});
 stats.compactedRouteSamples+=simplified.removedHubs;stats.removedRedundantConnections=simplified.removedConnections;
 stats.layeredPointHubs=hubs.filter(h=>h.layered).length;
 stats.tightenedCorridorHubs=hubs.filter(h=>h.radius<originalRadii.get(h)).length;
 near=spatial(hubs,h=>h.point);
 const candidateKeys=new Set(),nearLinks=spatialLinks(connections);
 function closestLinkPoint(point,link){const a=link.start.point,b=link.end.point,dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz||1)));return a.clone().lerp(b,t);}
 function blocksPlanning(barrier){const pad=barrier.width/2+2+RULES.agentRadius,minX=Math.min(barrier.a.x,barrier.b.x)-pad,maxX=Math.max(barrier.a.x,barrier.b.x)+pad,minZ=Math.min(barrier.a.z,barrier.b.z)-pad,maxZ=Math.max(barrier.a.z,barrier.b.z)+pad;
  return near(minX,minZ,maxX,maxZ).some(h=>barrierIntersects(h.point,h.point,barrier,h.radius+RULES.agentRadius))||nearLinks(minX,minZ,maxX,maxZ).some(c=>barrierIntersects(c.start.point,c.end.point,barrier,c.start.radius+RULES.agentRadius,c.end.radius+RULES.agentRadius));
 }
 function candidate(a,b,partId,kind,width=RULES.barrierWidth){
  const length=distanceXZ(a,b);if(length<.12)return;const count=Math.ceil(length/(kind==='edge'?1:4));for(let i=0;i<count;i++){
   const start=a.clone().lerp(b,i/count),end=a.clone().lerp(b,(i+1)/count),middle=start.clone().lerp(end,.5),nearby=near(middle.x-6,middle.z-6,middle.x+6,middle.z+6).filter(h=>segmentDistanceXZ(h.point,start,end)<6&&Math.abs(h.point.y-middle.y)<1);
   // Broad playable floors need their entire perimeter protected. Native AI
   // can leave its planning corridor while fighting or approaching a target;
   // sparse hub sampling must never create unguarded stretches of cliff.
   const nearCorridor=kind==='edge'&&semantic(partById.get(partId))||nearby.length||nearLinks(middle.x-6,middle.z-6,middle.x+6,middle.z+6).some(c=>{const point=closestLinkPoint(middle,c);return segmentDistanceXZ(point,start,end)<6&&Math.abs(point.y-middle.y)<1;});
   if(!nearCorridor)continue;const k=[key([start.x,0,start.z]),key([end.x,0,end.z])].sort().join('|');if(candidateKeys.has(k))continue;
   const barrier={a:start,b:end,width,partId,kind},d=end.clone().sub(start).setY(0).normalize(),n=new T.Vector3(-d.z,0,d.x),inset=RULES.agentRadius+.1;
   // Detect the floor boundary independently of hub/body clearance. Nearby
   // cover must not erase the drop behind it, or leave short corner gaps.
   const probe=kind==='edge'?sign=>supported(middle.clone().addScaledVector(n,sign*.2)):sign=>stand(middle.clone().addScaledVector(n,sign*inset)),left=probe(1),right=probe(-1);
   if(kind==='edge'&&!!left===!!right)continue;
   if(kind!=='edge'&&!left&&!right&&![.85,1.2,1.8].some(offset=>stand(middle.clone().addScaledVector(n,offset))||stand(middle.clone().addScaledVector(n,-offset))))continue;candidateKeys.add(k);
   // The inner face follows the actual drop. Centering a finite-width barrier
   // on that line steals supported floor and suppresses valid narrow passages.
   if(kind==='edge'){const offset=(left?-1:1)*width/2;barrier.a=start.clone().addScaledVector(n,offset).addScaledVector(d,-width/2);barrier.b=end.clone().addScaledVector(n,offset).addScaledVector(d,width/2);}
   // Never let an infinite-height native barrier cut a verified connection,
   // including a connection passing above/below this wall or deck edge.
   const overlapping=blocksPlanning(barrier);
   if(overlapping){stats.suppressedBarriers++;continue;}if(barriers.length>=RULES.maxBarriers*4){stats.limitsReached=true;continue;}barriers.push({...barrier,name:prefix+'_b'+barriers.length,flags:RULES.unitMask});
  }
 }
 for(const e of boundary.values())if(e.count===1)candidate(e.a,e.b,e.partId,'edge');
 // Slice existing collision walls/guards at nearby walking heights. This also
 // works for curved walls and trees, and respects holes cut into their skins.
 for(const part of parts){const root=rootById.get(part.id);if(!root||!visible(root))continue;const bodies=root.userData.collision?.bodies??[];for(const original of bodies){if(!(original.mask&1))continue;
  // Continuous movement guards already cover the visible rail/post profiles.
  // Solid standalone walls and nearby props still need obstacle estimates.
  if(part.type!=='wall-route'&&original.source==='railing profile'&&bodies.some(b=>b!==original&&b.routeSegment===original.routeSegment&&(b.source==='railing barrier'||b.role==='details'&&b.mask===7&&b.source==='composite shape')))continue;
  const body=transformCollisionBody(original,collisionPose(part));if(body.primitive?.shape===0)continue;const surface=body.surface??(body.primitive?boxSurface(body.primitive):null);if(!surface)continue;
  for(const tri of surface.triangles){const points=tri.map(i=>v(surface.positions[i])),normal=T.Triangle.getNormal(...points,new T.Vector3());if(Math.abs(normal.y)>.9999||normal.y>=.7)continue;const box=new T.Box3().setFromPoints(points),levels=new Map();
   const probes=[.45,1,RULES.agentHeight-.1],canBlock=height=>probes.some(y=>height+y>=box.min.y&&height+y<=box.max.y);
   for(const h of near(box.min.x-6,box.min.z-6,box.max.x+6,box.max.z+6)){if(!canBlock(h.point.y))continue;levels.set(Math.round(h.point.y*2)/2,h.point.y);}
   const center=box.getCenter(new T.Vector3());for(const c of nearLinks(box.min.x-6,box.min.z-6,box.max.x+6,box.max.z+6)){const point=closestLinkPoint(center,c);if(point.x<box.min.x-6||point.x>box.max.x+6||point.z<box.min.z-6||point.z>box.max.z+6||!canBlock(point.y))continue;levels.set(Math.round(point.y*2)/2,point.y);}
   for(const height of levels.values())for(const probe of probes){const y=height+probe;if(y<box.min.y||y>box.max.y)continue;const crossings=[];for(let i=0;i<3;i++){const a=points[i],b=points[(i+1)%3];if((a.y<y)===(b.y<y)||Math.abs(a.y-b.y)<1e-8)continue;crossings.push(a.clone().lerp(b,(y-a.y)/(b.y-a.y)).setY(height));}if(crossings.length===2)candidate(...crossings,part.id,original.source==='railing barrier'?'railing':'wall');}
  }
 }}
 const merged=mergeNavigationBarriers(barriers,blocksPlanning,{maxWidth:RULES.mergedBarrierWidth});stats.combinedBarrierCandidates=barriers.length-merged.length;
 const adjacency=new Map(hubs.map(h=>[h,[]]));for(const c of connections){adjacency.get(c.start).push(c.end);adjacency.get(c.end).push(c.start);}const seen=new Set(),components=[];for(const h of hubs){if(seen.has(h))continue;const pending=[h],component=[];seen.add(h);while(pending.length){const node=pending.pop();component.push(node);for(const next of adjacency.get(node))if(!seen.has(next)){seen.add(next);pending.push(next);}}components.push(component);}
 hubs.forEach((h,i)=>{h.name=prefix+'_h'+i;});connections.forEach((c,i)=>{c.name=prefix+'_c'+i;});
 stats.isolatedHubs=hubs.filter(h=>!adjacency.get(h).length).length;
 if(merged.length>RULES.maxBarriers){merged.length=RULES.maxBarriers;stats.limitsReached=true;}
 const emptyRoutes=parts.filter(p=>walkingRoute(p)&&!hubs.some(h=>h.partIds.includes(p.id))).map(p=>p.name);
 if(emptyRoutes.length)warnings.push('No safe AI planning surface was found on: '+emptyRoutes.join(', ')+'.');
 if(stats.suppressedBarriers)warnings.push(`${stats.suppressedBarriers} AI barrier candidates were omitted because their horizontal footprints would block verified planning hubs or connections, including paths at other heights.`);
 if(stats.limitsReached)warnings.push('Automatic AI navigation reached its source complexity limit; review the navigation report for incomplete coverage.');
 if(stats.isolatedHubs)warnings.push(`${stats.isolatedHubs} safe floor samples have no usable planning connection. They remain in the report for review but cannot provide native graph following alone.`);
 if(components.length>1)warnings.push(`Automatic AI planning has ${components.length} disconnected surface groups; it does not invent connections across gaps, walls or storeys.`);
 return {version:SWBF2_AI_RULE_VERSION,prefix,rules:{...RULES},hubs:hubs.map(h=>({name:h.name,position:h.point.toArray(),radius:h.radius,partIds:h.partIds,kind:h.kind,...(h.layered?{layered:true,walkableRadius:h.walkableRadius}:{})})),connections:connections.map(c=>({name:c.name,start:c.start.name,end:c.end.name,flags:c.flags})),barriers:merged.map((b,i)=>{const d=b.b.clone().sub(b.a).setY(0).normalize(),n=new T.Vector3(-d.z,0,d.x).multiplyScalar(b.width/2);return {name:prefix+'_b'+i,corners:[b.a.clone().add(n),b.b.clone().add(n),b.b.clone().sub(n),b.a.clone().sub(n)].map(p=>[p.x,0,p.z]),flags:b.flags,sourcePartId:b.partId,kind:b.kind,surfaceHeight:(b.a.y+b.b.y)/2,...(b.sourceKinds?{sourceKinds:b.sourceKinds,sourceHeightRange:b.sourceHeightRange}:{}),...(b.partIds?.length>1?{sourcePartIds:b.partIds}:{})};}),components:components.map(c=>({hubs:c.map(h=>h.name),partIds:[...new Set(c.flatMap(h=>h.partIds))]})),stats:{...stats,queries:collision.stats.queries},warnings};
}

const number=n=>{if(!Number.isFinite(n))throw Error('Non-finite AI navigation coordinate.');return Number(n.toFixed(6));};
export function planningFile(nav){return nav.hubs.map(h=>`Hub(${JSON.stringify(h.name)})\n{\n\tPos(${h.position.map(number).join(',')});\n\tRadius(${number(h.radius)});\n}\n`).concat(nav.connections.map(c=>`Connection(${JSON.stringify(c.name)})\n{\n\tStart(${JSON.stringify(c.start)});\n\tEnd(${JSON.stringify(c.end)});\n\tFlag(${c.flags});\n}\n`)).join('\n');}
export function barrierFile(nav){return `BarrierCount(${nav.barriers.length});\n\n`+nav.barriers.map(b=>`Barrier(${JSON.stringify(b.name)})\n{\n${b.corners.map(p=>'\tCorner('+p.map(number).join(',')+');').join('\n')}\n\tFlag(${b.flags});\n}\n`).join('\n');}
