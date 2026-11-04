import * as T from '../../vendor/three.module.js';
import {defaultPlatform,layoutPlatform,validatePlatform,sectionPolygon} from './platform.js';
import {routeLayout} from '../routes/stair-route.js';
import {partMatrix} from '../interiors/entrances.js';
export function extendPlatformFlow(platform,index,turn='straight',kind='rectangle',length=8,id=crypto.randomUUID()){
 const next=structuredClone(platform),parent=next.sections[index];if(!parent)throw Error('Select a platform section.');if(parent.kind==='corner'&&turn!=='straight')throw Error('Continue from the corner exit.');if(parent.kind==='half-circle')throw Error('Rounded ends are caps. Select the straight section to extend or turn.');if(next.sections.some(s=>s.attachment?.flow&&s.attachment.sectionId===parent.id&&s.attachment.turn===turn&&s.kind!=='half-circle'))throw Error('This edge already continues into another section. Select that section to extend it.');const rotation=parent.rotation+({straight:0,left:-Math.PI/2,right:Math.PI/2,back:Math.PI}[turn]??0),width=parent.width;
 next.sections.push({id,kind,x:0,z:0,width,depth:kind==='half-circle'?width/2:kind==='circle'?width:Math.max(2,Math.min(100,length)),radius:0,rotation,attachment:{sectionId:parent.id,side:'back',followWidth:true,flow:true,turn}});if(kind!=='half-circle')for(const cap of next.sections.filter(s=>s.kind==='half-circle'&&s.attachment?.sectionId===parent.id&&s.attachment.turn===turn)){cap.attachment={sectionId:id,side:'back',followWidth:true,flow:true,turn:'straight'};}layoutPlatform(next);validatePlatform(next);return next;
}
export function platformFromRoute(route,index=route.route.segments.length-1){if(route.route.segments[index]?.joinTo||(index===route.route.segments.length-1&&route.route.links?.end)||route.route.attachments?.some(a=>a.index===index&&a.end==='end'))throw Error('This route already has an end connection.');const last=routeLayout(route.route)[index],point=new T.Vector3(...last.end).applyMatrix4(partMatrix(route)),platform={id:crypto.randomUUID(),type:'platform',name:'Route landing platform',position:point.toArray(),rotation:[0,route.rotation[1]+Math.sign(route.scale[0])*last.endHeading,0],scale:[1,1,1],color:route.color,platform:defaultPlatform()};const s=platform.platform.sections[0];s.width=Math.max(6,last.width*Math.abs(route.scale[0])+2);s.depth=8;s.z=4;platform.platform.entry={sectionId:s.id,x:0,z:0};const linked=structuredClone(route);const ref={partId:platform.id,platformSection:s.id,side:'front'};if(index===linked.route.segments.length-1)(linked.route.links??={}).end=ref;else(linked.route.attachments??=[]).push({index,end:'end',ref});return {platform,route:linked};}

export function platformExtensionAnchor(s,turn,rounded=false){if(rounded&&s.kind==='rectangle'&&['left','right'].includes(turn)){const angle=s.rotation+(turn==='left'?-Math.PI/2:Math.PI/2);return {x:s.x+Math.sin(s.rotation)*(s.depth/2+s.width/2)+Math.sin(angle)*s.width/2,z:s.z+Math.cos(s.rotation)*(s.depth/2+s.width/2)+Math.cos(angle)*s.width/2,angle};}if(s.kind==='corner'){const angle=s.rotation+(s.bend==='left'?-Math.PI/2:Math.PI/2);return {x:s.x+Math.sin(angle)*s.width/2,z:s.z+Math.cos(angle)*s.width/2,angle};}const angle=s.rotation+({straight:0,left:-Math.PI/2,right:Math.PI/2,back:Math.PI}[turn]??0),turning=turn==='left'||turn==='right',pivot=turning?Math.max(0,s.depth/2-s.width/2):turn==='back'?-s.depth/2:s.depth/2,offset=turning?s.width/2:0;return {x:s.x+Math.sin(s.rotation)*pivot+Math.sin(angle)*offset,z:s.z+Math.cos(s.rotation)*pivot+Math.cos(angle)*offset,angle};}

// Length edits keep the entry edge fixed, matching the viewport length handle.
export function resizePlatformSection(section,key,value){
 const oldDepth=section.depth;
 section[key]=value;
 if(key==='width'&&section.attachment)section.attachment.followWidth=false;
 if(section.kind!=='rectangle'&&!section.freeDimensions)section.depth=section.width/(section.kind==='half-circle'?2:1);
 section.radius=Math.min(section.radius,section.width/2,section.depth/2);
 if(!section.attachment){
  const shift=(section.depth-oldDepth)/2;
  section.x+=Math.sin(section.rotation)*shift;
  section.z+=Math.cos(section.rotation)*shift;
 }
}

export function extendPlatformTurn(platform,index,turn='straight',kind='rectangle',length=8,id=crypto.randomUUID(),rounded=false){
 if(!['left','right'].includes(turn))return extendPlatformFlow(platform,index,turn,kind,length,id);
 const parent=platform.sections[index];
 // A side branch shares the existing deck edge. Only a free end needs a new elbow.
 if(parent.kind!=='rectangle'||platform.sections.some(s=>s.attachment?.sectionId===parent.id&&s.attachment.edge===undefined&&s.kind!=='half-circle'&&s.attachment.turn!=='back')){
  const next=extendPlatformFlow(platform,index,turn,kind,length,id),child=next.sections.at(-1);
  child.attachment.branchSide=true;child.attachment.followWidth=false;child.width=Math.min(parent.width,parent.depth);if(kind!=='rectangle')child.depth=child.width/(kind==='half-circle'?2:1);
  layoutPlatform(next);validatePlatform(next);return next;
 }
 if(!rounded)return extendPlatformFlow(platform,index,turn,kind,length,id);
 // Build the elbow as a quarter-disc: its two radial edges exactly match the strips.
 let next=extendPlatformFlow(platform,index,'straight','rectangle',parent.width,id+'-corner');
 const corner=next.sections.at(-1);corner.kind='corner';corner.bend=turn;corner.depth=corner.width;
 layoutPlatform(next);
 next=extendPlatformFlow(next,next.sections.length-1,'straight',kind,length,id);
 return next;
}
export function roundPlatformEnds(platform){
 let next=structuredClone(platform);
 const roots=next.sections.filter(s=>!s.attachment&&s.kind==='rectangle'&&s.id!==next.entry?.sectionId);
 for(const s of roots)if(!next.sections.some(c=>c.attachment?.sectionId===s.id&&c.attachment.turn==='back'))next=extendPlatformFlow(next,next.sections.findIndex(c=>c.id===s.id),'back','half-circle');
 const ends=next.sections.filter(s=>s.kind==='rectangle'&&!next.sections.some(c=>c.attachment?.sectionId===s.id&&c.attachment.edge===undefined&&(c.attachment.turn||'straight')==='straight'));
 for(const s of ends)next=extendPlatformFlow(next,next.sections.findIndex(c=>c.id===s.id),'straight','half-circle');
 return next;
}

// Removing a section must not move or erase the surviving branches.
export function removePlatformSection(platform,index){
 const next=structuredClone(platform);layoutPlatform(next);
 const removed=next.sections[index];if(!removed||next.sections.length===1)throw Error('Keep at least one platform section.');
 for(const child of next.sections)if(child.attachment?.sectionId===removed.id)delete child.attachment;
 next.sections.splice(index,1);if(next.entry?.sectionId===removed.id)delete next.entry;
 layoutPlatform(next);validatePlatform(next);return next;
}

// An edge branch has its own width and a persistent position along its parent.
export function branchPlatformEdge(platform,ref,width,length,id,roundedEnd=false){
 const next=structuredClone(platform),parent=next.sections.find(s=>s.id===ref.platformSection);if(!parent)throw Error('Select a platform edge.');
 const poly=sectionPolygon(parent),a=poly[ref.edge],b=poly[(ref.edge+1)%poly.length];if(!a||!b)throw Error('Choose a straight edge.');
 const span=Math.hypot(b.x-a.x,b.z-a.z);if(span<2)throw Error('Choose a longer straight edge for this branch.');
 width=Math.max(2,Math.min(span,width));
 next.sections.push({id,kind:'rectangle',x:0,z:0,width,depth:Math.max(2,Math.min(100,length)),radius:0,rotation:0,attachment:{sectionId:parent.id,side:'back',followWidth:false,edge:ref.edge,edgeT:ref.edgeT}});
 layoutPlatform(next);validatePlatform(next);
 return roundedEnd?extendPlatformFlow(next,next.sections.length-1,'straight','half-circle',width/2,id+'-cap'):next;
}

// Resolve a trident to the actual edge it is drawn beside.
export function platformHandleEdge(section,turn){
 const anchor=platformExtensionAnchor(section,turn,false),angle=anchor.angle,poly=sectionPolygon(section);let best=null,score=-Infinity;
 for(let edge=0;edge<poly.length;edge++){const a=poly[edge],b=poly[(edge+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<2)continue;const alignment=(dz*Math.sin(angle)-dx*Math.cos(angle))/length;if(alignment<.99)continue;const rank=length-Math.hypot((a.x+b.x)/2-section.x,(a.z+b.z)/2-section.z)*.001;if(rank>score){score=rank;best={platformSection:section.id,edge,edgeT:.5};}}
 return best;
}
export function extendPlatformEdge(platform,ref,width,length,id,{bend=null,rounded=true,kind='rectangle',roundedEnd=false}={}){
 if(!bend){const next=branchPlatformEdge(platform,ref,width,length,id,roundedEnd);if(kind!=='rectangle'&&!roundedEnd){const child=next.sections.at(-1);child.kind=kind;child.depth=child.width/(kind==='half-circle'?2:1);layoutPlatform(next);validatePlatform(next);}return next;}
 let next=branchPlatformEdge(platform,ref,width,width,id+'-corner'),corner=next.sections.at(-1);corner.depth=corner.width;
 if(rounded){corner.kind='corner';corner.bend=bend;layoutPlatform(next);next=extendPlatformFlow(next,next.sections.length-1,'straight',kind,length,id);}
 else next=extendPlatformFlow(next,next.sections.length-1,bend,kind,length,id);
 return next;
}
