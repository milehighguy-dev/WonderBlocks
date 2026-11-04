import * as T from '../../vendor/three.module.js';

const priority={edge:0,railing:1,wall:2};
function corners(bar){const d=bar.b.clone().sub(bar.a).setY(0).normalize(),n=new T.Vector3(-d.z,0,d.x).multiplyScalar(bar.width/2);return [bar.a.clone().add(n),bar.b.clone().add(n),bar.b.clone().sub(n),bar.a.clone().sub(n)];}
const heights=bar=>bar.sourceHeightRange??[Math.min(bar.a.y,bar.b.y),Math.max(bar.a.y,bar.b.y)];
function metadata(a,b){
 const primary=(priority[a.kind]??0)>=(priority[b.kind]??0)?a:b;
 return {partId:primary.partId,kind:primary.kind,partIds:[...new Set([...(a.partIds??[a.partId]),...(b.partIds??[b.partId])])],sourceKinds:[...new Set([...(a.sourceKinds??[a.kind]),...(b.sourceKinds??[b.kind])])],sourceHeightRange:[Math.min(...heights(a),...heights(b)),Math.max(...heights(a),...heights(b))]};
}
function contains(a,b){
 const d=a.b.clone().sub(a.a).setY(0),length=d.length();d.normalize();const n=new T.Vector3(-d.z,0,d.x);
 return corners(b).every(p=>{const offset=p.sub(a.a),along=offset.dot(d);return along>=-1e-6&&along<=length+1e-6&&Math.abs(offset.dot(n))<=a.width/2+1e-6;});
}
function combine(a,b,maxWidth){
 if(a.flags!==b.flags)return null;
 // Native barriers have no vertical bounds. A contained footprint remains
 // redundant even if it came from another object, height or face direction.
 if(contains(a,b))return {...a,...metadata(a,b)};
 if(contains(b,a))return {...b,...metadata(a,b)};
 const d=a.b.clone().sub(a.a).setY(0).normalize(),n=new T.Vector3(-d.z,0,d.x),other=b.b.clone().sub(b.a).setY(0).normalize();if(Math.abs(d.dot(other))<.9999)return null;
 const ai=[a.a.dot(d),a.b.dot(d)].sort((x,y)=>x-y),bi=[b.a.dot(d),b.b.dot(d)].sort((x,y)=>x-y);
 // Source spans must actually touch; never fill the gap between door jambs.
 if(Math.max(ai[0],bi[0])>Math.min(ai[1],bi[1])+.001)return null;
 const ac=corners(a),bc=corners(b),points=[...ac,...bc],along=points.map(p=>p.dot(d)),across=points.map(p=>p.dot(n)),lo=Math.min(...across),hi=Math.max(...across),width=hi-lo;
 const al=ac.map(p=>p.dot(n)),bl=bc.map(p=>p.dot(n)),overlapAlong=Math.max(0,Math.min(ai[1],bi[1])-Math.max(ai[0],bi[0])),overlapAcross=Math.max(0,Math.min(Math.max(...al),Math.max(...bl))-Math.max(Math.min(...al),Math.min(...bl)));
 const unionArea=(ai[1]-ai[0])*a.width+(bi[1]-bi[0])*b.width-overlapAlong*overlapAcross,area=(Math.max(...along)-Math.min(...along))*width;
 // Thick walls can have overlapping front/back estimates. Their exact
 // rectangular union is safe at any width; otherwise retain the small bound
 // on added footprint and recheck against the complete planning graph.
 const exact=Math.abs(Math.abs(d.dot(other))-1)<1e-10&&area-unionArea<=1e-6;
 if(width>maxWidth+1e-6&&!exact)return null;
 const meta=metadata(a,b),y=(meta.sourceHeightRange[0]+meta.sourceHeightRange[1])/2,point=t=>d.clone().multiplyScalar(t).addScaledVector(n,(lo+hi)/2).setY(y);
 return {...a,...meta,a:point(Math.min(...along)),b:point(Math.max(...along)),width};
}
const bounds=bar=>{const points=corners(bar);return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};};
const overlap=(a,b)=>a.minX<=b.maxX+.001&&a.maxX+.001>=b.minX&&a.minZ<=b.maxZ+.001&&a.maxZ+.001>=b.minZ;
function mergePass(source,blocked,maxWidth,local){
 const result=[],groups=new Map();
 for(const original of source){
  let bar=original,box=bounds(bar);const key=bar.flags+(local?'|'+bar.partId:''),group=groups.get(key)??[];groups.set(key,group);
  // An incoming span may bridge two earlier spans. Restart after each merge
  // until no further union exists, independently of source triangle order.
  for(let i=0;i<group.length;){const previous=group[i];if(!overlap(box,previous.box)){i++;continue;}const proposal=combine(previous.bar,bar,maxWidth);if(!proposal||blocked(proposal)){i++;continue;}bar=proposal;box=bounds(bar);group.splice(i,1);i=0;}
  group.push({bar,box});
 }
 for(const group of groups.values())for(const entry of group)result.push(entry.bar);
 return result;
}

export function mergeNavigationBarriers(barriers,blocked,{maxWidth=.44}={}){
 const source=barriers.map(b=>({...b,a:b.a.clone(),b:b.b.clone()}));
 // Reduce triangle slices within objects first so the cross-object pass only
 // compares compact spans rather than every source face against every other.
 return mergePass(mergePass(source,blocked,maxWidth,true),blocked,maxWidth,false);
}
