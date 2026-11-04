import {snapPlatformResize} from './platform-resize-snap.js';
import * as T from '../../vendor/three.module.js';
import {partMatrix} from '../interiors/entrances.js';
import {extendPlatformEdge,platformHandleEdge,branchPlatformEdge,extendPlatformTurn,platformExtensionAnchor,resizePlatformSection} from './platform-flow.js';
import {layoutPlatform,validatePlatform,platformOutline,sectionPolygon} from './platform.js';
export function platformTurnBlocked(platform,index,turn,rounded){
 const s=platform.sections[index],children=platform.sections.filter(c=>c.attachment?.sectionId===s.id&&c.attachment.edge===undefined&&c.kind!=='half-circle');
 return s.kind==='half-circle'||s.kind==='corner'&&turn!=='straight'||turn==='back'&&(!!s.attachment||platform.entry?.sectionId===s.id)||children.some(c=>(c.attachment.turn||'straight')===turn);
}
export function platformDragPreview(base,index,key,worldDelta,{turn,kind='rectangle',rounded=true,id,snap=true,steer=false,edgeRef,branchWidth=4,roundedEnd=false,parts=[],edgeSnapDistance=.35}={}){
 let edgeSnap=null;const part=structuredClone(base),s=part.platform.sections[index],local=worldDelta.clone().applyMatrix3(new T.Matrix3().setFromMatrix4(partMatrix(base).invert())),round=n=>snap?Math.round(n*4)/4:n;
 if(key==='edge-branch'){
 const poly=sectionPolygon(s),a=poly[edgeRef.edge],b=poly[(edgeRef.edge+1)%poly.length],angle=Math.atan2(b.z-a.z,a.x-b.x),length=local.x*Math.sin(angle)+local.z*Math.cos(angle);
 if(length<.25)return {part,index,changed:false};part.platform=branchPlatformEdge(part.platform,edgeRef,branchWidth,round(length),id,roundedEnd);index=part.platform.sections.findIndex(s=>s.id===id);
 }else if(key==='extend'&&steer&&platformHandleEdge(s,turn)){
 const ref=platformHandleEdge(s,turn),poly=sectionPolygon(s),a=poly[ref.edge],b=poly[(ref.edge+1)%poly.length],angle=Math.atan2(b.z-a.z,a.x-b.x),forward=local.x*Math.sin(angle)+local.z*Math.cos(angle),across=local.x*Math.cos(angle)-local.z*Math.sin(angle),bend=Math.abs(across)>Math.abs(forward)*1.2?(across>0?'right':'left'):null,length=bend?Math.abs(across):forward;
 if(length<.25)return {part,index,changed:false};
 const width=['left','right'].includes(turn)?Math.min(s.width,s.depth,branchWidth):s.width;
 part.platform=extendPlatformEdge(part.platform,ref,width,Math.max(2,round(length)),id,{bend,rounded,kind,roundedEnd});index=part.platform.sections.findIndex(s=>s.id===id);
 }else if(key==='extend'){
  if(steer){
   const a=s.rotation+({straight:0,left:-Math.PI/2,right:Math.PI/2,back:Math.PI}[turn]||0),forward=local.x*Math.sin(a)+local.z*Math.cos(a),across=local.x*Math.cos(a)-local.z*Math.sin(a);
   if(Math.abs(across)>Math.abs(forward)*1.2){const turns=['straight','right','back','left'],step=Math.round((a-s.rotation)/(Math.PI/2))+(across>0?1:-1);turn=turns[(step%4+4)%4];}
  }
  if(platformTurnBlocked(part.platform,index,turn,rounded))throw Error('This edge is already connected. Choose a free edge.');
  const anchor=platformExtensionAnchor(s,turn,rounded),length=local.x*Math.sin(anchor.angle)+local.z*Math.cos(anchor.angle);
  if(length<.25)return {part,index,changed:false};
  part.platform=extendPlatformTurn(part.platform,index,turn,kind,Math.max(2,Math.min(100,round(length))),id,rounded);index=part.platform.sections.length-1;
 }else if(key.startsWith('edge:')){
  const side=key.slice(5),wide=side==='left'||side==='right',sign=side==='left'||side==='front'?-1:1,axis=wide?'width':'depth',dx=wide?Math.cos(s.rotation):Math.sin(s.rotation),dz=wide?-Math.sin(s.rotation):Math.cos(s.rotation);
  const old=s[axis],raw=Math.max(2,Math.min(100,old+sign*(local.x*dx+local.z*dz)));edgeSnap=snap?snapPlatformResize(base,index,side,raw,parts,edgeSnapDistance):null;const value=edgeSnap?.value??Math.max(2,Math.min(100,round(raw))),shift=sign*(value-old)/2,target={x:s.x+dx*shift,z:s.z+dz*shift};
  s[axis]=value;s.freeDimensions=true;s.radius=Math.min(s.radius,s.width/2,s.depth/2);
  if(s.attachment)s.attachment.followWidth=false;
  if(part.platform.entry?.sectionId===s.id&&!s.attachment){part.platform.entry.x=target.x;part.platform.entry.z=target.z-s.depth/2;}
  s.x=target.x;s.z=target.z;layoutPlatform(part.platform);
  if(s.attachment){s.attachment.offsetX=(s.attachment.offsetX||0)+target.x-s.x;s.attachment.offsetZ=(s.attachment.offsetZ||0)+target.z-s.z;}
 }else if(key==='width'||key==='depth'){
  const change=key==='width'?local.x*Math.cos(s.rotation)-local.z*Math.sin(s.rotation):local.x*Math.sin(s.rotation)+local.z*Math.cos(s.rotation);
  if(s.kind==='rectangle')resizePlatformSection(s,key,Math.max(2,Math.min(100,round(s[key]+change*(key==='width'?2:1)))));
  else resizePlatformSection(s,'width',Math.max(2,Math.min(100,round(s.width+change*2))));
  s.radius=Math.min(s.radius,s.width/2,s.depth/2);
 }
 layoutPlatform(part.platform);validatePlatform(part.platform);platformOutline(part.platform);
 return {part,index,changed:JSON.stringify(part)!==JSON.stringify(base),...(edgeSnap?{edgeSnap}:{})};
}
