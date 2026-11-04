import * as T from '../../vendor/three.module.js';
import {resolveRouteLinks} from './route-links.js';
import {routeLayout,validateRoute} from './stair-route.js';
const matrix=p=>new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion().setFromEuler(new T.Euler(...p.rotation)),new T.Vector3(...p.scale));
const flipSide=side=>({left:'right',right:'left','return-left':'return-right','return-right':'return-left'}[side]??side);
const attachments=p=>[...Object.entries(p.route.links||{}).map(([end,ref])=>({end,index:end==='start'?0:p.route.segments.length-1,ref})),...(p.route.attachments||[])];
// Targets precede their joining paths so ordinary internal junctions remain editable.
export function unionConnectedRoutes(parts,sourceId){
 const resolved=resolveRouteLinks(parts),byId=new Map(resolved.map(p=>[p.id,p])),source=byId.get(sourceId),order=[],seen=new Set();
 if(!source?.route)return {parts:resolved,indexOffset:0};
 function visit(p){if(seen.has(p.id))return;seen.add(p.id);for(const a of attachments(p)){const host=byId.get(a.ref.partId);if(host?.route&&a.ref.segment!==undefined)visit(host);}order.push(p);}
 visit(source);if(order.length===1)return {parts:resolved,indexOffset:0};
 const merged=structuredClone(source),inverse=matrix(source).invert(),offsets=new Map(),handedness=new Map();merged.route.segments=[];merged.route.attachments=[];delete merged.route.links;delete merged.route.externalOpenings;
 for(const p of order){
  const offset=merged.route.segments.length;offsets.set(p.id,offset);
  const transform=inverse.clone().multiply(matrix(p)),x=new T.Vector3(1,0,0).transformDirection(transform),z=new T.Vector3(0,0,1).transformDirection(transform),sx=new T.Vector3().setFromMatrixColumn(transform,0).length(),sy=new T.Vector3().setFromMatrixColumn(transform,1).length(),sz=new T.Vector3().setFromMatrixColumn(transform,2).length();
  if(Math.abs(sx-sz)>1e-5||Math.abs(x.dot(z))>1e-5)throw Error('These routes have different stretched proportions. Match their horizontal object scale before merging.');
  const sign=Math.sign(transform.determinant());handedness.set(p.id,sign);const angle=Math.atan2(z.x,z.z),layout=routeLayout(p.route);
  for(let i=0;i<p.route.segments.length;i++){
   const s=structuredClone(p.route.segments[i]);s.cutThroughSolids=s.cutThroughSolids??p.route.cutThroughSolids??false;if(p.route.cutHeight!==undefined)s.cutHeight??=p.route.cutHeight;s.floorFinish??={color:p.color,surface:structuredClone(p.surface??{preset:'plain',scale:1})};s.run*=sz;s.rise*=sy;s.gap=(s.gap??p.route.gap)*sx;s.width=(s.width??p.route.width)*sx;s.thickness=(s.thickness??p.route.thickness)*sy;
   if(s.treadDepth!==undefined)s.treadDepth*=sz;if(s.treadThickness!==undefined)s.treadThickness*=sy;
   if(sign<0){s.turn=flipSide(s.turn);if(s.turnAngle!==undefined)s.turnAngle=-s.turnAngle;if(s.curveAngle!==undefined)s.curveAngle=-s.curveAngle;if(s.railing?.sides)s.railing.sides=flipSide(s.railing.sides);}
   for(const key of ['branchFrom','joinTo','wallJoinTo'])if(s[key]){s[key].segment+=offset;if(sign<0)s[key].side=flipSide(s[key].side);}
   if((i===0||s.pathStart)&&!s.branchFrom)s.pathStart={point:new T.Vector3(...layout[i].start).applyMatrix4(transform).toArray(),heading:sign*layout[i].heading+angle};
   merged.route.segments.push(s);
  }
  for(const a of attachments(p)){
   const index=offset+a.index,s=merged.route.segments[index],hostOffset=offsets.get(a.ref.partId);
   if(hostOffset!==undefined&&a.ref.segment!==undefined){s[a.end==='start'?'branchFrom':'joinTo']={segment:hostOffset+a.ref.segment,side:handedness.get(a.ref.partId)<0?flipSide(a.ref.side):a.ref.side};if(a.end==='start')delete s.pathStart;}
   else merged.route.attachments.push({...structuredClone(a),index});
  }
 }
 // Keep the primary path's outward links in their familiar editor slots.
 for(const a of [...merged.route.attachments])if(a.end==='end'&&a.index===merged.route.segments.length-1){
  (merged.route.links??={})[a.end]=a.ref;merged.route.attachments.splice(merged.route.attachments.indexOf(a),1);
 }
 validateRoute(merged.route);routeLayout(merged.route);
 const result=resolved.filter(p=>!seen.has(p.id));result.push(merged);
 for(const p of result)if(p.route)for(const a of attachments(p)){if(offsets.has(a.ref.partId)&&a.ref.segment!==undefined){if(handedness.get(a.ref.partId)<0)a.ref.side=flipSide(a.ref.side);a.ref.segment+=offsets.get(a.ref.partId);a.ref.partId=sourceId;}}
 return {parts:resolveRouteLinks(result),indexOffset:offsets.get(sourceId)};
}
