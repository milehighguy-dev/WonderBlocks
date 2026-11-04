const radius=hub=>hub.walkableRadius??hub.radius;
function between(a,middle,b){
 const line=b.point.clone().sub(a.point),length=line.lengthSq();if(length<1e-8)return null;
 const t=middle.point.clone().sub(a.point).dot(line)/length;
 return t>1e-5&&t<1-1e-5&&a.point.clone().addScaledVector(line,t).distanceTo(middle.point)<=.005?t:null;
}

// Remove collinear shortcut triangles before collapsing chains: otherwise a
// featureless route appears to have branches simply because every sample was
// also connected to its neighbour's neighbour. Keep the full corridor profile,
// unit flags and real branches, then verify each replacement against collision.
export function simplifyNavigationGraph(hubs,connections,{removable,clear}){
 const adjacency=new Map(hubs.map(h=>[h,new Map()])),alive=new Set(hubs),edges=new Set(connections);
 const put=edge=>{edges.add(edge);adjacency.get(edge.start).set(edge.end,edge);adjacency.get(edge.end).set(edge.start,edge);};
 const drop=edge=>{edges.delete(edge);adjacency.get(edge.start).delete(edge.end);adjacency.get(edge.end).delete(edge.start);};
 for(const edge of connections)put(edge);
 let removedConnections=0,removedHubs=0;
 for(const edge of [...edges].sort((a,b)=>b.start.point.distanceToSquared(b.end.point)-a.start.point.distanceToSquared(a.end.point))){
  if(!edges.has(edge))continue;const {start:a,end:b}=edge;
  for(const [middle,first] of adjacency.get(a)){
   const second=adjacency.get(middle).get(b);if(!second||first.flags!==edge.flags||second.flags!==edge.flags)continue;
   const t=between(a,middle,b);if(t===null||radius(middle)+.001<radius(a)+(radius(b)-radius(a))*t||middle.radius+.001<a.radius+(b.radius-a.radius)*t)continue;
   drop(edge);removedConnections++;break;
  }
 }
 for(;;){
  let changed=false;const locked=new Set();
  for(const h of hubs){if(locked.has(h))continue;if(!alive.has(h)||!removable(h)||adjacency.get(h).size!==2)continue;
  const [[a,first],[b,second]]=[...adjacency.get(h)];if(first.flags!==second.flags||!!h.layered!==!!a.layered||!!h.layered!==!!b.layered)continue;
  const t=between(a,h,b);if(t===null||Math.abs(radius(h)-radius(a)-(radius(b)-radius(a))*t)>.001)continue;
  // Ownership shared by several objects is an authored seam/portal. Keep it;
  // do not erase another route's only planning or an entrance anchor.
  if(h.partIds.length!==1||!a.partIds.includes(h.partIds[0])||!b.partIds.includes(h.partIds[0]))continue;
  const existing=adjacency.get(a).get(b);if(existing&&existing.flags!==first.flags||!clear(a,b))continue;
  drop(first);drop(second);alive.delete(h);removedHubs++;changed=true;locked.add(a);locked.add(b);
  if(!existing)put({...first,start:a,end:b});
  }
  if(!changed)break;
 }
 hubs.splice(0,hubs.length,...hubs.filter(h=>alive.has(h)));connections.splice(0,connections.length,...edges);
 return {removedHubs,removedConnections};
}
