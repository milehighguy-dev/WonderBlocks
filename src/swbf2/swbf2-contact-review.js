import * as T from '../../vendor/three.module.js';

// Verified PC PolyListContainer<100>::AddPolygon accepts at most 100 polygons
// and strictly fewer than 300 polygon vertices. The object's 64-triangle
// partition target is a safety margin, not this native capacity.
export const NATIVE_CONTACT_LIMITS=Object.freeze({polygons:100,vertices:300});
const profiles=[{kind:'infantry',bit:1,half:[.35,1.1,.35]},{kind:'vehicle',bit:2,half:[2,2,4]},{kind:'vehicle',bit:2,half:[4,2,2]}];
const empty=()=>({samples:0,flaggedSamples:0,maximumPolygons:0,maximumVertices:0});

// Accept actual compiled polygons as well as source triangles. Native review
// must count polygon vertices, not triangulate a quad and call it two contacts.
export function reviewContactPolygons(polygons,mask=23){
 const items=polygons.map(vertices=>{
  const points=vertices.map(p=>new T.Vector3(...p)),box=new T.Box3().setFromPoints(points),center=points.reduce((a,p)=>a.add(p),new T.Vector3()).multiplyScalar(1/points.length),normal=new T.Vector3();
  for(let i=1;i+1<points.length;i++){normal.crossVectors(points[i].clone().sub(points[0]),points[i+1].clone().sub(points[0]));if(normal.lengthSq()>1e-18)break;}
  return {box,center,normal:normal.normalize(),vertices:points.length};
 }).filter(p=>p.normal.lengthSq()>0);
 function tree(entries){
  const box=new T.Box3();for(const p of entries)box.union(p.box);
  const node={box,polygons:entries.length,vertices:entries.reduce((n,p)=>n+p.vertices,0)};
  if(entries.length<=12)return {...node,items:entries};
  const span=box.getSize(new T.Vector3()),axis=span.x>=span.y&&span.x>=span.z?'x':span.y>=span.z?'y':'z',sorted=[...entries].sort((a,b)=>a.center[axis]-b.center[axis]),at=sorted.length>>1;
  return {...node,left:tree(sorted.slice(0,at)),right:tree(sorted.slice(at))};
 }
 const root=items.length?tree(items):null,result={infantry:empty(),vehicle:empty(),limits:NATIVE_CONTACT_LIMITS,basis:'source-triangles',reachabilityChecked:false};
 // Bound preflight work on very large scenes. These are sampled broad-phase
 // candidates: no terrain, swept movement or reachable vehicle poses are known.
 const stride=Math.max(1,Math.ceil(items.length/2048)),normalOffset=new T.Vector3(),box=new T.Box3();
 for(const {kind,bit,half} of profiles){
  if(!(mask&bit))continue;
  const stats=result[kind],extent=new T.Vector3(...half);
  for(let i=0;i<items.length;i+=stride){
   const item=items[i],support=half.reduce((n,h,axis)=>n+h*Math.abs(item.normal.getComponent(axis)),0),center=normalOffset.copy(item.center).addScaledVector(item.normal,support);
   box.min.copy(center).sub(extent).addScalar(-.001);box.max.copy(center).add(extent).addScalar(.001);
   let count=0,vertices=0;
   function visit(node){
    if(!node||!node.box.intersectsBox(box))return;
    if(box.containsBox(node.box)){count+=node.polygons;vertices+=node.vertices;return;}
    if(node.items){for(const p of node.items)if(p.box.intersectsBox(box)){count++;vertices+=p.vertices;}}
    else{visit(node.left);visit(node.right);}
   }
   visit(root);stats.samples++;stats.maximumPolygons=Math.max(stats.maximumPolygons,count);stats.maximumVertices=Math.max(stats.maximumVertices,vertices);
   if(count>NATIVE_CONTACT_LIMITS.polygons||vertices>=NATIVE_CONTACT_LIMITS.vertices)stats.flaggedSamples++;
  }
 }
 return result;
}

export function reviewContactSurface(surface,mask=23){return reviewContactPolygons(surface.triangles.map(t=>t.map(v=>surface.positions[v])),mask);}

export function summarizeContactReviews(reviews){
 const result={infantry:empty(),vehicle:empty(),limits:NATIVE_CONTACT_LIMITS,basis:'source-triangles',reachabilityChecked:false};
 for(const review of reviews)for(const kind of ['infantry','vehicle']){
  const into=result[kind],from=review[kind];into.samples+=from.samples;into.flaggedSamples+=from.flaggedSamples;into.maximumPolygons=Math.max(into.maximumPolygons,from.maximumPolygons);into.maximumVertices=Math.max(into.maximumVertices,from.maximumVertices);
 }
 return result;
}
