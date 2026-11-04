import * as T from '../../vendor/three.module.js';
import {KASHYYYK_BRIDGES} from './data/kashyyyk-bridge-source.js';
import {bridgeTexture} from '../materials/kashyyyk-bridge-textures.js';
import {landingRailEdges} from './railings.js';
import {junctionHoles} from './route-junctions.js';
import {applySurface} from '../materials/surfaces.js';

export const KASHYYYK_BRIDGE_STYLES=['kashyyyk-timber','kashyyyk-suspension'];
export function bridgeStyleDefaults(style){return {style,color:'#ffffff',height:1.76,spacing:4,railWidth:.1,railHeight:.1,postWidth:.16};}

// Keep the authored triangles, silhouettes and atlas UVs. Remove the source
// suspension sag so the bridge follows the route's own elevation and bends.
// The static source scene and its hidden collision/LOD meshes are never edited.
export function buildKashyyykBridges(group,part,layout){
 for(const l of layout){
  const s=l.segment,style=s.railing?.style;if(s.hallway||!KASHYYYK_BRIDGE_STYLES.includes(style))continue;
  const suspended=style==='kashyyyk-suspension',source=KASHYYYK_BRIDGES[suspended?'kas2_bridge_1':'kas2_bldg_bridge'],deck=source[0],xs=deck.positions.map(p=>p[0]),xmin=Math.min(...xs),xmax=Math.max(...xs),ys=deck.positions.map(p=>p[1]),center=(Math.min(...ys)+Math.max(...ys))/2,width=Math.max(...ys)-Math.min(...ys),k=l.width/width;
  const rows=new Map();for(const [x,,y] of deck.positions){const key=Number(x.toFixed(2));rows.set(key,Math.max(rows.get(key)??-Infinity,y));}
  const stations=[...rows].sort((a,b)=>a[0]-b[0]),timberDeckTop=Math.max(...deck.positions.map(p=>p[2]));
  const timberFloorVertices=new Set();
  if(!suspended)for(const tri of deck.triangles){const [a,b,c]=tri.map(i=>new T.Vector3(...deck.positions[i]));if(T.Triangle.getNormal(a,b,c,new T.Vector3()).z>.55)for(const i of tri)timberFloorVertices.add(i);}
  // Timber is already rigid and level. Underside-only vertex rows must not
  // become floor-height samples: doing so lifts their triangles into spikes.
  function top(x){if(!suspended)return timberDeckTop;const b=stations.findIndex(p=>p[0]>=x);if(b<=0)return stations[b<0?stations.length-1:0][1];const a=stations[b-1],q=stations[b];return T.MathUtils.lerp(a[1],q[1],T.MathUtils.clamp((x-a[0])/(q[0]-a[0]),0,1));}
  const railing={height:1.76,color:'#ffffff',sides:'both',...s.railing},heightScale=railing.height/(1.76*k);
  const world=(x,y,z)=>new T.Vector3(l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[1]+y,l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z);
  const holes=sign=>junctionHoles(part.route,l.index,sign>0?'left':'right');
  const branched=holes(1).length||holes(-1).length;
  const straight=s.turn==='straight',nativeFloor=straight&&s.kind!=='stairs'&&!s.fillToGround&&!branched;
  const floorMeshes=group.children.filter(m=>m.userData.routeFloor&&m.userData.routeSegment===l.index);
  if(nativeFloor)for(const m of floorMeshes){group.remove(m);m.geometry.dispose();}
  // Corners and stairs retain their exact existing walkable footprints. Give
  // those surfaces timber and place details only on exposed boundary spans.
  else for(const m of floorMeshes){const material=m.material.clone();material.color.set('#a98d61');applySurface(new T.Group().add(m),material,{...part,surface:{preset:'forest-timber',scale:1}});group.add(m);m.material=material;}
  const materials=new Map();
  function material(component,cutout=false){const key=component+(cutout?'-fringe':'');if(!materials.has(key)){const m=new T.MeshStandardMaterial({color:component==='deck'?(s.floorFinish?.color??part.color):railing.color,map:bridgeTexture(component==='deck'?(suspended?'kas2-suspension-deck':'kas2_bldg_platform_edge'):'kas2-suspension-details'),roughness:component==='deck'?.87:1,metalness:0,alphaTest:cutout?.5:0,side:cutout?T.DoubleSide:T.FrontSide});if(cutout)m.userData.walkCollision=false;materials.set(key,m);}return materials.get(key);}
  function add(positions,uvs,component,name,cutout=false){if(!positions.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.bridgePart=component;g.userData.bridgeSource=name;g.userData.bridgeFringe=cutout;const m=new T.Mesh(g,material(component,cutout));m.userData.routeSegment=l.index;m.userData.routeFloor=component==='deck'&&!cutout;m.userData.railing=component!=='deck';m.userData.routePost=component==='posts';m.castShadow=m.receiveShadow=true;group.add(m);}
  for(const item of source){
   const isDeck=item===deck;if(isDeck&&!nativeFloor||!isDeck&&!straight)continue;
   const component=isDeck?'deck':item.name.startsWith('bridge_cable')?'rails':item.name.startsWith('cylinder')?'rails':'posts';
   const positions=[],uvs=[],fringePositions=[],fringeUvs=[];
   for(let i=0;i<item.triangles.length;i++){
    const cutout=isDeck&&suspended&&item.materialIndices[i]===0,outputPositions=cutout?fringePositions:positions,outputUvs=cutout?fringeUvs:uvs;
    const tri=item.triangles[i].map(n=>item.positions[n]),side=Math.sign(tri.reduce((sum,p)=>sum+p[1]-center,0));
    if(!isDeck&&component==='rails'&&railing.sides!=='both'&&railing.sides!==(side>0?'left':'right'))continue;
    if(!isDeck&&component==='posts'&&item.name.startsWith('Bridge_Strut')&&railing.sides!=='both'&&railing.sides!==(side>0?'left':'right'))continue;
    const zmean=tri.reduce((sum,p)=>sum+(xmax-p[0])/(xmax-xmin)*s.run,0)/3;
    if(!isDeck&&component==='posts'&&[...holes(1),...holes(-1)].some(([a,b])=>zmean>=a-.2&&zmean<=b+.2))continue;
    // Route entrances meet the deck level. Lift only the authored upper end
    // tongues to that level; keep every underside vertex in its original plane.
    let polygons=[tri.map((p,j)=>({p:!suspended&&isDeck&&timberFloorVertices.has(item.triangles[i][j])?[p[0],p[1],timberDeckTop]:p,uv:item.uvs[i]?.[j]??[0,0]}))];
    if(!isDeck&&component==='rails')for(const [a,b] of holes(side)){
     function clip(poly,z,below){const out=[];for(let n=0;n<poly.length;n++){const u=poly[n],v=poly[(n+1)%poly.length],da=(xmax-u.p[0])/(xmax-xmin)*s.run-z,db=(xmax-v.p[0])/(xmax-xmin)*s.run-z,inside=d=>below?d<=1e-9:d>=-1e-9;if(inside(da))out.push(u);if(inside(da)!==inside(db)){const t=da/(da-db);out.push({p:u.p.map((x,k)=>T.MathUtils.lerp(x,v.p[k],t)),uv:u.uv.map((x,k)=>T.MathUtils.lerp(x,v.uv[k],t))});}}return out;}
     polygons=polygons.flatMap(poly=>[clip(poly,a,true),clip(poly,b,false)]).filter(poly=>poly.length>=3);
    }
    // XYZ -> YZX reverses winding when the longitudinal source axis is flipped.
    for(const poly of polygons)for(let n=1;n<poly.length-1;n++){
     const indices=[0,n+1,n],points=indices.map(j=>{const {p:[x,y,h]}=poly[j],z=T.MathUtils.clamp((xmax-x)/(xmax-xmin),0,1)*s.run,base=s.kind==='landing'?0:s.rise*z/s.run,relative=(h-top(x))*k*(component==='rails'||item.name.startsWith('Bridge_Strut')?heightScale:1);return world((y-center)*k,base+relative,z);});
     if(points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).lengthSq()<1e-16)continue;
     for(let j=0;j<3;j++){outputPositions.push(...points[j].toArray());outputUvs.push(...poly[indices[j]].uv);}
    }
   }
   add(positions,uvs,component,item.name);add(fringePositions,fringeUvs,component,item.name+' thatched fringe',true);
  }
  if(suspended&&!straight){
   const edges=landingRailEdges(part.route,l,l.index),post=source.find(m=>m.name==='Bridge_Strut');
   for(const e of edges){if(railing.sides!=='both'&&e.side!==railing.sides&&e.side!=='both')continue;const a=new T.Vector2(...e.a),b=new T.Vector2(...e.b),length=a.distanceTo(b),positions=[],uvs=[];
    const tangent=b.clone().sub(a).normalize(),out=new T.Vector2(-tangent.y,tangent.x);if(e.side==='right')out.negate();
    // The same native end-post profile follows each exposed corner boundary.
    const pmin=Math.min(...post.positions.map(p=>p[0])),pmax=Math.max(...post.positions.map(p=>p[0])),pc=(pmin+pmax)/2,py=Math.max(...post.positions.map(p=>p[1]));
    const count=Math.max(1,Math.ceil(length/(railing.spacing??4)));
    for(let n=0;n<=count;n++){const station=a.clone().lerp(b,n/count);for(let i=0;i<post.triangles.length;i++)for(const j of [0,2,1]){const [x,y,h]=post.positions[post.triangles[i][j]],u=(x-pc)*k,v=(y-py)*k,q=station.clone().addScaledVector(tangent,u).addScaledVector(out,-v);positions.push(...world(q.x,(h+.112)*k*heightScale,q.y).toArray());uvs.push(...post.uvs[i][j]);}}
    add(positions,uvs,'posts','Bridge_Strut corner repeats');
    const railPositions=[],railUvs=[],radius=.075*k,normal=new T.Vector2(-tangent.y,tangent.x);
    // Generated corner cables sample the authored rope strip, not the full atlas.
    const cableUvs=source.find(m=>m.name==='bridge_cable_1').uvs.flat(),umin=Math.min(...cableUvs.map(p=>p[0])),umax=Math.max(...cableUvs.map(p=>p[0])),vmin=Math.min(...cableUvs.map(p=>p[1])),vmax=Math.max(...cableUvs.map(p=>p[1])),ropeUvs=[[umin,vmin],[umin,vmax],[umax,vmax],[umax,vmin]];
    for(let n=0;n<count;n++){const p=a.clone().lerp(b,n/count),q=a.clone().lerp(b,(n+1)/count),ps=[];for(const point of [p,q])for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,1]])ps.push(world(point.x+normal.x*u*radius,railing.height+v*radius,point.y+normal.y*u*radius));for(const ids of [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])for(const j of [0,1,2,0,2,3]){railPositions.push(...ps[ids[j]].toArray());railUvs.push(...ropeUvs[j]);}}
    add(railPositions,railUvs,'rails','corner cable');
   }
  }
 }
}
