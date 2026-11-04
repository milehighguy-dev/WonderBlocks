import {buildBuildingStyle,validateBuildingStyle} from './building-style.js';
import {validateBaseSlope} from '../parts/building-base.js';
import {profileBuildingBase} from './wall-base-profile.js';
import {buildRoofParapet,validateRoofParapet} from '../parts/roof-parapet.js';
import {boxVolume} from '../collision/structural-volumes.js';
import {DEFAULT_ROOM_HEIGHT} from './interior-defaults.js';
import {wallFinishAt,wallFinishHeights} from './interior-finishes.js';
import {validateRoomCurve} from './room-curves.js';
import {validatePartitions} from './interior-partitions.js';
import {beveledTowerFootprint} from '../parts/coruscant.js';
import {pointsOf,polygonRoom,inside,area,containsPolygon,overlapArea,validatePolygon,polygonWalls,shellInner,wallAlong,wallDistance} from './polygon-plan.js';
import {buildPolygonInterior} from './polygon-interior.js';
import {validateStoreys,buildStoreys} from './interior-storeys.js';
import * as THREE from '../../vendor/three.module.js';
import {SURFACES,applySurface} from '../materials/surfaces.js';

export function defaultInterior(){return {height:DEFAULT_ROOM_HEIGHT,thickness:.2,slab:.2,rooms:[{id:'room-1',x:0,z:0,w:6,d:5}],doors:[],finishes:{floor:{color:'#a8a18b',preset:'tile',scale:1},wall:{color:'#d9d4bd',preset:'stone',scale:1},outside:{color:'#b6bcae',preset:'plain',scale:1},ceiling:{color:'#eee8d8',preset:'plain',scale:1},roof:{color:'#eee8d8',preset:'plain',scale:1}}};}
export const containsRoom=(a,b)=>a.points||b.points?containsPolygon(pointsOf(a),pointsOf(b)):a.x<=b.x+1e-6&&a.z<=b.z+1e-6&&a.x+a.w>=b.x+b.w-1e-6&&a.z+a.d>=b.z+b.d-1e-6;
export const roomWallHeight=(p,r)=>r.wallHeight??p.height;
export const roomCeilingHeight=(p,r)=>r.ceilingHeight??r.wallHeight??p.height;
const clean=v=>Math.round(v*1000000)/1000000;
export function interiorWalls(plan){if(plan.partitions?.length||plan.rooms.some(r=>r.points)||plan.shell?.points)return polygonWalls(plan);
 const edges=[];
 for(const axis of ['x','z']){
  const cross=axis==='x'?'z':'x',along=axis==='x'?'x':'z',size=axis==='x'?'w':'d',crossSize=axis==='x'?'d':'w';
  const lines=[...new Set(plan.rooms.flatMap(r=>[r[cross],clean(r[cross]+r[crossSize])]))].sort((a,b)=>a-b);
  const points=[...new Set(plan.rooms.flatMap(r=>[r[along],clean(r[along]+r[size])]))].sort((a,b)=>a-b);
  for(const line of lines)for(let i=0;i<points.length-1;i++){
   const start=points[i],end=points[i+1],mid=(start+end)/2;
   const side=sign=>[...plan.rooms].sort((a,b)=>a.w*a.d-b.w*b.d).find(r=>mid>r[along]&&mid<r[along]+r[size]&&line+sign*1e-5>r[cross]&&line+sign*1e-5<r[cross]+r[crossSize]);
   const neg=side(-1),pos=side(1);if(neg?.id===pos?.id)continue;
   const shared=!!neg&&!!pos,negative=!!neg,last=edges.at(-1);
   if(last&&last.axis===axis&&last.line===line&&last.end===start&&last.shared===shared&&last.negative===negative&&last.neg===neg?.id&&last.pos===pos?.id)last.end=end;
   else edges.push({axis,line,start,end,shared,negative,neg:neg?.id,pos:pos?.id});
  }
 }
 return edges.map(({negative,neg,pos,...w})=>({...w,key:[w.axis,w.line,w.start,w.end].join(':')}));
}
export function shellBounds(p){const s=p.shell;return s?{minX:-s.width/2+s.inset,maxX:s.width/2-s.inset,minZ:-s.depth/2+s.inset,maxZ:s.depth/2-s.inset}:null;}
export const supportsInteriorType=type=>['block','round','hex','cor-roundtop-body'].includes(type);
const shellDimensions=part=>part.scale.map((v,i)=>Math.abs(v)*(part.type==='cor-roundtop-body'?[6,4,3][i]:1));
export function canAddInterior(part){return supportsInteriorType(part?.type)&&!Object.values(part.shape||{}).some(Boolean)&&shellDimensions(part).every(v=>v>=2.4);}
export function interiorFromShell(part){
 if(!canAddInterior(part))throw Error('Choose a supported unsculpted shell at least 2.4 metres wide, deep, and tall.');
 const result=structuredClone(part),[width,height,depth]=shellDimensions(part),p=defaultInterior();
 p.shell={width,height,depth,inset:Math.min(.4,(Math.min(width,depth)-2)/2),pattern:{mode:part.pattern?.mode||'fixed',texture:(part.pattern?.texture||[1,1,1]).map((v,i)=>v*((part.pattern?.mode||'fixed')==='fixed'?1:1/Math.abs(part.scale[i])))}};
 if(part.type==='block'&&part.parameters?.baseSlopeHeight&&part.parameters?.baseSlopeProjection)p.shell.baseSlope={height:part.parameters.baseSlopeHeight,projection:part.parameters.baseSlopeProjection};
 if(part.type==='block'&&part.parameters?.parapetHeight)p.shell.parapet={height:part.parameters.parapetHeight,thickness:part.parameters.parapetThickness??.3};
 p.height=clean(Math.min(DEFAULT_ROOM_HEIGHT,height-2*p.slab));p.finishes.outside={color:part.color,preset:part.surface?.preset||'plain',scale:part.surface?.scale||1};p.finishes.roof=structuredClone(p.finishes.outside);
 if(part.type==='cor-roundtop-body')p.shell.points=beveledTowerFootprint().map(({x,z})=>({x:x*Math.abs(part.scale[0]),z:z*Math.abs(part.scale[2])}));
 else if(part.type!=='block'){const sides=part.type==='hex'?6:(part.parameters?.sides??24);p.shell.points=Array.from({length:sides},(_,i)=>({x:Math.sin(i*2*Math.PI/sides)*width/2,z:Math.cos(i*2*Math.PI/sides)*depth/2})).reverse();}
 const bounds=shellBounds(p);p.rooms=[{id:'room-1',x:bounds.minX,z:bounds.minZ,w:clean(bounds.maxX-bounds.minX),d:clean(bounds.maxZ-bounds.minZ)}];
 if(p.shell.points)p.rooms=[polygonRoom('room-1',shellInner(p.shell))];if(result.entrances)for(const e of result.entrances)e.anchor=e.anchor.map((v,i)=>v*Math.abs(part.scale[i]));if(result.entranceInteriors)for(const space of result.entranceInteriors)space.anchor=space.anchor.map((v,i)=>v*Math.abs(part.scale[i]));result.type='interior';result.interior=p;result.scale=part.scale.map(v=>Math.sign(v));delete result.shape;delete result.parameters;delete result.surface;delete result.pattern;validateInterior(p);return result;
}
export function openingLine(d,walls){return d.axis&&Number.isFinite(d.line)?{axis:d.axis,line:d.line}:walls.find(w=>w.key===d.wall);}
export function wallSpan(walls,axis,line,at){const matches=walls.filter(w=>w.axis===axis&&Math.abs(w.line-line)<1e-6).sort((a,b)=>a.start-b.start),runs=[];for(const w of matches){const last=runs.at(-1);if(last&&w.start<=last.end+1e-6)last.end=Math.max(last.end,w.end);else runs.push({axis,line,start:w.start,end:w.end});}return runs.find(w=>at>=w.start-1e-6&&at<=w.end+1e-6);}
export function wallHeight(p,w){if(w.height!==undefined)return w.height;const mid=(w.start+w.end)/2,owners=p.rooms.filter(r=>w.axis==='x'?mid>r.x&&mid<r.x+r.w&&(Math.abs(w.line-r.z)<1e-6||Math.abs(w.line-r.z-r.d)<1e-6):mid>r.z&&mid<r.z+r.d&&(Math.abs(w.line-r.x)<1e-6||Math.abs(w.line-r.x-r.w)<1e-6));return Math.max(...owners.map(r=>Math.max(roomWallHeight(p,r),roomCeilingHeight(p,r))),p.shell&&shellBoundary(p,w)?p.height:0);}
function shellBoundary(p,w){const b=shellBounds(p);return b&&(w.axis==='x'?Math.abs(w.line-b.minZ)<1e-6||Math.abs(w.line-b.maxZ)<1e-6:Math.abs(w.line-b.minX)<1e-6||Math.abs(w.line-b.maxX)<1e-6);}
export function reconcileDoors(before,after,move){
 const oldWalls=interiorWalls(before),walls=interiorWalls(after);after.doors=[];
 for(const d of before.doors){const old=openingLine(d,oldWalls);if(!old)continue;const movement=(Array.isArray(move)?move:[move]).find(m=>m&&old.axis===m.axis&&Math.abs(old.line-m.line)<1e-6),line=movement?movement.to:old.line;const span=wallSpan(walls,old.axis,line,d.offset);if(!span||span.end-span.start<d.width+2*after.thickness)continue;const offset=clean(Math.max(span.start+after.thickness+d.width/2,Math.min(span.end-after.thickness-d.width/2,d.offset)));const exact=walls.find(w=>w.axis===old.axis&&Math.abs(w.line-line)<1e-6&&offset-d.width/2>=w.start&&offset+d.width/2<=w.end);const next={...d,offset};if(exact&&!d.axis){next.wall=exact.key;}else{delete next.wall;next.axis=old.axis;next.line=line;}after.doors.push(next);}
 return before.doors.length-after.doors.length;
}
// Subtract rectangular doors/windows from a wall face, including spans across room seams.
function wallPieces(p,w,height){let rects=[[w.start,0,w.end,height]];const all=interiorWalls(p);for(const d of p.doors){const line=openingLine(d,all);if(!line||line.axis!==w.axis||Math.abs(line.line-w.line)>1e-6)continue;const lo=d.kind==='window'?(d.sill):0,hi=lo+d.height;rects=rects.flatMap(([a,b,c,e])=>{const x=Math.max(a,d.offset-d.width/2),xx=Math.min(c,d.offset+d.width/2),y=Math.max(b,lo),yy=Math.min(e,hi);if(xx<=x||yy<=y)return [[a,b,c,e]];return [[a,b,x,e],[xx,b,c,e],[x,b,xx,y],[x,yy,xx,e]].filter(r=>r[2]-r[0]>1e-6&&r[3]-r[1]>1e-6);});}return rects.map(([a,lo,b,hi])=>[a,b,lo,hi]);}
export function ceilingTiles(p){const b=shellBounds(p),xs=[...new Set(p.rooms.flatMap(r=>[r.x,clean(r.x+r.w)]).concat(b?[b.minX,b.maxX]:[]))].sort((a,b)=>a-b),zs=[...new Set(p.rooms.flatMap(r=>[r.z,clean(r.z+r.d)]).concat(b?[b.minZ,b.maxZ]:[]))].sort((a,b)=>a-b),tiles=[];for(let z=0;z<zs.length-1;z++)for(let x=0;x<xs.length-1;x++){const cx=(xs[x]+xs[x+1])/2,cz=(zs[z]+zs[z+1])/2,owner=[...p.rooms].sort((a,b)=>a.w*a.d-b.w*b.d).find(r=>cx>r.x&&cx<r.x+r.w&&cz>r.z&&cz<r.z+r.d);if(!owner&&!b)continue;const h=owner?roomCeilingHeight(p,owner):p.height,last=tiles.at(-1);if(last&&last.z===zs[z]&&last.d===zs[z+1]-zs[z]&&last.h===h&&Math.abs(last.x+last.w-xs[x])<1e-6)last.w=xs[x+1]-last.x;else tiles.push({x:xs[x],z:zs[z],w:xs[x+1]-xs[x],d:zs[z+1]-zs[z],h});}return tiles;}
export function resizeRoomEdge(plan,id,edge,value){
 const next=structuredClone(plan),room=next.rooms.find(r=>r.id===id);if(room?.points)throw Error('Polygon rooms use vertex handles.');if(!room||!['left','right','front','back'].includes(edge)||!Number.isFinite(value))throw Error('Invalid room edge.');
 const horizontal=['left','right'].includes(edge),axis=horizontal?'x':'z',size=horizontal?'w':'d',cross=horizontal?'z':'x',crossSize=horizontal?'d':'w',low=['left','front'].includes(edge),old=clean(room[axis]+(low?0:room[size]));
 const b=shellBounds(plan),min=horizontal?b?.minX:b?.minZ,max=horizontal?b?.maxX:b?.maxZ;
 value=clean(Math.max(min??-500,Math.min(max??500,value)));value=low?Math.min(value,room[axis]+room[size]-2):Math.max(value,room[axis]+2);
 const delta=clean(value-old);
 for(const neighbor of next.rooms){if(neighbor===room||containsRoom(neighbor,room)||containsRoom(room,neighbor)||Math.min(neighbor[cross]+neighbor[crossSize],room[cross]+room[crossSize])-Math.max(neighbor[cross],room[cross])<=1e-6)continue;
  if(low&&Math.abs(neighbor[axis]+neighbor[size]-old)<1e-6)neighbor[size]=clean(neighbor[size]+delta);
  if(!low&&Math.abs(neighbor[axis]-old)<1e-6){neighbor[axis]=clean(neighbor[axis]+delta);neighbor[size]=clean(neighbor[size]-delta);}
 }
 if(low){room[axis]=value;room[size]=clean(room[size]-delta);}else room[size]=clean(room[size]+delta);
 reconcileDoors(plan,next,{axis:horizontal?'z':'x',line:old,to:value});validateInterior(next);return next;
}
export function setShellInset(plan,inset){
 if(plan.rooms.some(r=>r.points)){const next=structuredClone(plan),before=shellInner(plan.shell);if(!before)throw Error('No existing shell.');next.shell.inset=inset;const after=shellInner(next.shell);for(const r of next.rooms)if(containsPolygon(pointsOf(r),before)&&containsPolygon(before,pointsOf(r)))Object.assign(r,polygonRoom(r.id,after,r));const oldWalls=polygonWalls({height:plan.height,rooms:[polygonRoom('boundary',before)]}),newWalls=polygonWalls({height:plan.height,rooms:[polygonRoom('boundary',after)]});reconcileDoors(plan,next,oldWalls.flatMap(w=>{const n=newWalls.filter(n=>n.axis===w.axis).sort((a,b)=>Math.abs(a.line-w.line)-Math.abs(b.line-w.line))[0];return n?[{axis:w.axis,line:w.line,to:n.line}]:[];}));validateInterior(next);return next;}

 const next=structuredClone(plan),old=shellBounds(plan);if(!old)throw Error('No existing shell.');next.shell.inset=inset;const b=shellBounds(next);
 for(const r of next.rooms){const x=Math.abs(r.x-old.minX)<1e-6?b.minX:Math.max(r.x,b.minX),z=Math.abs(r.z-old.minZ)<1e-6?b.minZ:Math.max(r.z,b.minZ),right=Math.abs(r.x+r.w-old.maxX)<1e-6?b.maxX:Math.min(r.x+r.w,b.maxX),back=Math.abs(r.z+r.d-old.maxZ)<1e-6?b.maxZ:Math.min(r.z+r.d,b.maxZ);r.x=clean(x);r.z=clean(z);r.w=clean(right-x);r.d=clean(back-z);}
 reconcileDoors(plan,next,[{axis:'z',line:old.minX,to:b.minX},{axis:'z',line:old.maxX,to:b.maxX},{axis:'x',line:old.minZ,to:b.minZ},{axis:'x',line:old.maxZ,to:b.maxZ}]);validateInterior(next);return next;
}
export function validateInterior(p){
 if(p?.buildingStyle!==undefined)validateBuildingStyle(p.buildingStyle);
 const range=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 if(!p||!range(p.height,2,12)||!range(p.thickness,.1,.5)||!range(p.slab,.1,.5)||!Array.isArray(p.rooms)||!p.rooms.length||p.rooms.length>24||!Array.isArray(p.doors)||p.doors.length>64)throw Error('Use 1–24 rooms, height 2–12, and thickness 0.1–0.5.');
 const ids=new Set();for(const r of p.rooms){if(!r||typeof r.id!=='string'||ids.has(r.id)||!['x','z','w','d'].every(k=>Number.isFinite(r[k]))||!range(r.x,-500,500)||!range(r.z,-500,500)||!range(r.w,2,1000)||!range(r.d,2,1000)||r.x+r.w>500||r.z+r.d>500)throw Error('Rooms must be at least 2 × 2 and stay inside the plan.');validateRoomCurve(r);if(r.curve)validatePolygon(pointsOf(r),.001,160);if(r.points){validatePolygon(r.points,p.shell?.points?.length ? .001 : .1);const bounds=polygonRoom(r.id,r.points);if(['x','z','w','d'].some(k=>Math.abs(bounds[k]-r[k])>1e-5))throw Error('Polygon bounds do not match its corners.');}ids.add(r.id);}
 for(let i=0;i<p.rooms.length;i++)for(const b of p.rooms.slice(i+1)){const a=p.rooms[i];if(a.points||b.points){if(overlapArea(pointsOf(a),pointsOf(b))>1e-5&&(!containsRoom(a,b)&&!containsRoom(b,a)||containsRoom(a,b)&&containsRoom(b,a)))throw Error('Rooms may nest or share walls, but cannot partially overlap.');continue;}if(a.x<b.x+b.w-1e-6&&a.x+a.w>b.x+1e-6&&a.z<b.z+b.d-1e-6&&a.z+a.d>b.z+1e-6&&(!containsRoom(a,b)&&!containsRoom(b,a)||containsRoom(a,b)&&containsRoom(b,a)))throw Error('Rooms may nest or share walls, but cannot partially overlap.');}
 if(p.shell){const s=p.shell;if(s.baseSlope){validateBaseSlope(s.baseSlope);if(s.points)throw Error('Base slopes require a rectangular shell.');}if(s.parapet){validateRoofParapet(s.parapet);if(s.points)throw Error('Roof rims require a rectangular shell.');}if(!range(s.width,2.4,1000)||!range(s.depth,2.4,1000)||!range(s.height,2.4,1000)||!range(s.inset,.1,Math.min(s.width,s.depth)/2-1)||p.height+2*p.slab>s.height+1e-6)throw Error('The interior must fit within the shell; keep at least 2 units of room width and height.');if(s.pattern&&(!['fixed','stretch'].includes(s.pattern.mode)||!Array.isArray(s.pattern.texture)||s.pattern.texture.length!==3||s.pattern.texture.some(v=>!range(v,.000001,1e6))))throw Error('Invalid shell texture density.');if(s.points){validatePolygon(s.points,.001);const signs=s.points.map((a,i)=>{const b=s.points[(i+1)%s.points.length],c=s.points[(i+2)%s.points.length];return (b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x);});if(signs.some(v=>v>1e-6)&&signs.some(v=>v< -1e-6)||s.points.some(v=>Math.abs(v.x)>s.width/2+1e-6||Math.abs(v.z)>s.depth/2+1e-6))throw Error('Shell footprints must be convex and fit their dimensions.');for(const r of p.rooms)if(!containsPolygon(shellInner(s),pointsOf(r)))throw Error('Rooms must stay inside the polygon shell.');}const b=shellBounds(p);for(const r of p.rooms)if(r.x<b.minX-1e-6||r.z<b.minZ-1e-6||r.x+r.w>b.maxX+1e-6||r.z+r.d>b.maxZ+1e-6)throw Error('Rooms must stay inside the inset shell boundary.');}
 for(const r of p.rooms)for(const h of [roomWallHeight(p,r),roomCeilingHeight(p,r)])if(!range(h,.5,100)||p.shell&&h+2*p.slab>p.shell.height+1e-6)throw Error('Room wall and ceiling heights must fit inside the shell.');
 validatePartitions(p);
 const walls=interiorWalls(p);for(const d of p.doors){const line=openingLine(d,walls),span=line&&wallSpan(walls,line.axis,line.line,d.offset);const sill=d.kind==='window'?(d.sill):0;if(!span||!range(d.width,.2,1000)||!range(d.height,d.kind==='window'?.2:1.8,100)||!range(sill,0,100)||!Number.isFinite(d.offset)||d.offset-d.width/2<span.start+p.thickness-1e-6||d.offset+d.width/2>span.end-p.thickness+1e-6||walls.filter(w=>w.axis===line.axis&&Math.abs(w.line-line.line)<1e-6&&w.end>d.offset-d.width/2&&w.start<d.offset+d.width/2).some(w=>sill+d.height>wallHeight(p,w)-.05)||d.kind!==undefined&&!['door','window'].includes(d.kind))throw Error('Opening must fit a continuous wall and stay below its top.');}

 for(const role of ['floor','wall','outside','ceiling','roof']){const f=p.finishes?.[role];if(!f||!/^#[\da-f]{6}$/i.test(f.color)||!SURFACES.some(s=>s.id===f.preset)||!range(f.scale,.1,8))throw Error('Invalid interior finish.');}
 if(p.storeys!==undefined||p.stairs!==undefined)validateStoreys(p);
 return p;
}
export function buildInterior(group,part){
 if(part.interior.storeys?.length||part.interior.stairs?.length){validateInterior(part.interior);buildStoreys(group,part);}else buildInteriorLevel(group,part);
 if(part.interior.buildingStyle){buildBuildingStyle(group,part);return;}
 const shell=part.interior.shell;
 if(shell?.baseSlope)profileBuildingBase(group,part,shell.baseSlope);
 if(shell?.parapet?.height){const finish=part.interior.finishes.roof,material=new THREE.MeshStandardMaterial({color:finish.color,roughness:.8});material.userData.interiorRole='roof';buildRoofParapet(group,material,{...shell,scale:part.scale},shell.parapet);applySurface(group,material,{...part,pattern:shell.pattern,surface:{preset:finish.preset,scale:finish.scale}});}
}
export function buildInteriorLevel(group,part,options={}){if(options.flushBase||part.interior.partitions?.length||part.interior.rooms.some(r=>r.points)||part.interior.shell?.points||options.boundaryPoints){if(!options.validated)validateInterior(part.interior);return buildPolygonInterior(group,part,options);}
 const p=options.validated?part.interior:validateInterior(part.interior),finishes=p.finishes,mats=Object.fromEntries(Object.entries(finishes).map(([k,f])=>[k,new THREE.MeshStandardMaterial({color:f.color,roughness:.8})]));
 for(const [role,mat] of Object.entries(mats))mat.userData.interiorRole=role;
 function rawBox(w,h,d,x,y,z,role,ceiling=false){if(w<=0||h<=0||d<=0)return;const volume=boxVolume(w,h,d);if(ceiling){const source=new THREE.BoxGeometry(w,h,d).toNonIndexed();for(let face=0;face<6;face++){const geometry=new THREE.BufferGeometry();for(const [name,attr] of Object.entries(source.attributes))geometry.setAttribute(name,new THREE.BufferAttribute(attr.array.slice(face*6*attr.itemSize,(face+1)*6*attr.itemSize),attr.itemSize));const m=new THREE.Mesh(geometry,mats[face===2?'roof':face===3?'ceiling':'outside']);m.position.set(x,y,z);m.userData.structuralVolume=volume;m.userData.interiorCeiling=true;m.castShadow=m.receiveShadow=true;group.add(m);}source.dispose();return;}const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mats[role]);m.position.set(x,y,z);m.userData.structuralVolume=volume;m.castShadow=m.receiveShadow=true;m.userData.interiorCeiling=ceiling;m.userData.interiorFloor=role==='floor';group.add(m);return m;}
 function box(w,h,d,x,y,z,role,ceiling=false){
  if(role==='floor'&&options.noFloor||ceiling&&options.ceilingAt!==undefined&&Math.abs(y-h/2-options.ceilingAt)<1e-6)return;
  let tiles=[{x:x-w/2,z:z-d/2,w,d}];const holes=role==='floor'?(options.floorHoles||[]):ceiling?(options.ceilingHoles||[]):[];
  for(const hole of holes)tiles=tiles.flatMap(t=>subtractTile(t,hole));
  for(const t of tiles)rawBox(t.w,h,t.d,t.x+t.w/2,y,t.z+t.d/2,role,ceiling);
 }
 const floorY=p.shell?p.slab:0,bounds=options.boundary||shellBounds(p);
 function finishedSlab(w,d,y,ceiling){let tiles=[{x:-w/2,z:-d/2,w,d}];if(ceiling)for(const hole of options.roofHoles||[])tiles=tiles.flatMap(t=>subtractTile(t,hole));for(const tile of tiles){const volume=boxVolume(tile.w,p.slab,tile.d),source=new THREE.BoxGeometry(tile.w,p.slab,tile.d).toNonIndexed();for(let f=0;f<6;f++){const g=new THREE.BufferGeometry();for(const [name,attr] of Object.entries(source.attributes))g.setAttribute(name,new THREE.BufferAttribute(attr.array.slice(f*6*attr.itemSize,(f+1)*6*attr.itemSize),attr.itemSize));const role=ceiling&&f===2?'roof':f===(ceiling?3:2)?(ceiling?'ceiling':'floor'):'outside',m=new THREE.Mesh(g,mats[role]);m.position.set(tile.x+tile.w/2,y,tile.z+tile.d/2);m.userData.structuralVolume=volume;m.userData.interiorCeiling=ceiling;m.castShadow=m.receiveShadow=true;group.add(m);}source.dispose();}}
 if(p.shell){finishedSlab(p.shell.width,p.shell.depth,p.slab/2,false);finishedSlab(p.shell.width,p.shell.depth,p.shell.height-p.slab/2,true);}else for(const r of p.rooms.filter(r=>!p.rooms.some(other=>other!==r&&containsRoom(other,r))))box(r.w,p.slab,r.d,r.x+r.w/2,-p.slab/2,r.z+r.d/2,'floor');
 for(const t of ceilingTiles(p.shell?p:{...p,rooms:p.rooms.map(r=>({...r,x:r.x-p.thickness/2,z:r.z-p.thickness/2,w:r.w+p.thickness,d:r.d+p.thickness}))}))if(!p.shell||t.h+2*p.slab<p.shell.height-1e-6)box(t.w,p.slab,t.d,t.x+t.w/2,floorY+t.h+p.slab/2,t.z+t.d/2,'ceiling',true);
 const walls=[];
 const roomWalls=interiorWalls(p);
 const onBoundary=w=>bounds&&(w.axis==='x'?(Math.abs(w.line-bounds.minZ)<1e-6||Math.abs(w.line-bounds.maxZ)<1e-6):(Math.abs(w.line-bounds.minX)<1e-6||Math.abs(w.line-bounds.maxX)<1e-6));
 for(const w of roomWalls){
  if(onBoundary(w))continue;
  const pieces=wallPieces(p,w,wallHeight(p,w));
  for(const [a,b,lo,hi] of pieces){if(b<=a||hi<=lo)continue;const mid=(a+b)/2,negativeInside=p.rooms.some(r=>w.axis==='x'?mid>r.x&&mid<r.x+r.w&&w.line-1e-5>r.z&&w.line-1e-5<r.z+r.d:mid>r.z&&mid<r.z+r.d&&w.line-1e-5>r.x&&w.line-1e-5<r.x+r.w);
   const exterior=w.shared?-1:w.axis==='x'?(negativeInside?4:5):(negativeInside?0:1);
   const start=a-(Math.abs(a-w.start)<1e-7?p.thickness/2:0),end=b+(Math.abs(b-w.end)<1e-7?p.thickness/2:0);
   const heights=[lo+floorY,...wallFinishHeights(p,floorY).filter(y=>y>lo+floorY+1e-7&&y<hi+floorY-1e-7),hi+floorY].sort((a,b)=>a-b);for(let i=1;i<heights.length;i++)walls.push({min:w.axis==='x'?[start,heights[i-1],w.line-p.thickness/2]:[w.line-p.thickness/2,heights[i-1],start],max:w.axis==='x'?[end,heights[i],w.line+p.thickness/2]:[w.line+p.thickness/2,heights[i],end],exterior:p.shell?-1:exterior,wallAxis:w.axis==='x'?2:0});
  }
 }
 if(p.shell){const {width:W,depth:D,height:H}=p.shell,cut=Math.min(H-p.slab,floorY+Math.max(p.height,...p.rooms.map(r=>roomWallHeight(p,r)),...p.rooms.map(r=>roomCeilingHeight(p,r)))+p.slab);
  for(const side of [{axis:'x',line:bounds.minZ,start:-W/2,end:W/2,low:-D/2,high:bounds.minZ,exterior:5},{axis:'x',line:bounds.maxZ,start:-W/2,end:W/2,low:bounds.maxZ,high:D/2,exterior:4},{axis:'z',line:bounds.minX,start:bounds.minZ,end:bounds.maxZ,low:-W/2,high:bounds.minX,exterior:1},{axis:'z',line:bounds.maxX,start:bounds.minZ,end:bounds.maxZ,low:bounds.maxX,high:W/2,exterior:0}]){
   const add=(a,b,lo,hi,ceiling=false)=>{if(b-a<1e-7||hi-lo<1e-7)return;walls.push({min:side.axis==='x'?[a,lo,side.low]:[side.low,lo,a],max:side.axis==='x'?[b,hi,side.high]:[side.high,hi,b],exterior:side.exterior,wallAxis:side.axis==='x'?2:0,ceiling,shell:true});};
   for(const [a,b,lo,hi] of wallPieces(p,side,cut-floorY))add(a,b,lo+floorY,Math.min(hi+floorY,cut));add(side.start,side.end,cut,H-p.slab,true);
  }
 }
 // Emit only exposed faces of the wall union. Clip intersections at corners and
 // T junctions, so touching walls have no doubled coplanar faces or internal caps.
 const axes=[[0,1,1,2],[0,-1,1,2],[1,1,0,2],[1,-1,0,2],[2,1,0,1],[2,-1,0,1]];
 walls.forEach((wall,index)=>axes.forEach(([axis,sign,u,v],face)=>{
  const plane=sign>0?wall.max[axis]:wall.min[axis];let rects=[[wall.min[u],wall.min[v],wall.max[u],wall.max[v]]];
  walls.forEach((other,j)=>{if(j===index||(!wall.ceiling&&other.ceiling))return;const eps=1e-8,outward=sign>0?other.max[axis]>plane+eps:other.min[axis]<plane-eps;
   if(plane<other.min[axis]-eps||plane>other.max[axis]+eps||(!outward&&j>index))return;
   const coplanar=sign>0?Math.abs(other.max[axis]-plane)<eps:Math.abs(other.min[axis]-plane)<eps;if(!outward&&!coplanar)return;
   rects=rects.flatMap(([a,b,c,d])=>{const x=Math.max(a,other.min[u]),y=Math.max(b,other.min[v]),xx=Math.min(c,other.max[u]),yy=Math.min(d,other.max[v]);if(xx<=x+eps||yy<=y+eps)return [[a,b,c,d]];return [[a,b,x,d],[xx,b,c,d],[x,b,xx,y],[x,yy,xx,d]].filter(r=>r[2]-r[0]>eps&&r[3]-r[1]>eps);});
  });
  for(const [a,b,c,d] of rects){const points=[[a,b],[c,b],[c,d],[a,d]].map(([x,y])=>{const p=[0,0,0];p[axis]=plane;p[u]=x;p[v]=y;return new THREE.Vector3(...p);});const n=new THREE.Vector3();n.setComponent(axis,sign);if(points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).dot(n)<0)points.reverse();const vertices=[0,1,2,0,2,3].flatMap(i=>points[i].toArray()),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(Array.from({length:6},()=>n.toArray()).flat(),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(12),2));const center=points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(.25),role=face===wall.exterior?'outside':axis===wall.wallAxis?wallFinishAt(p,center,floorY):'wall';const m=new THREE.Mesh(g,mats[role]);m.userData.structuralVolume=boxVolume(...wall.max.map((v,i)=>v-wall.min[i]),wall.max.map((v,i)=>(v+wall.min[i])/2));m.userData.interiorHull=!!wall.shell;m.userData.interiorCeiling=!!wall.ceiling;m.castShadow=m.receiveShadow=true;group.add(m);}
 }));
 for(const [role,mat] of Object.entries(mats))applySurface(group,mat,{...part,surfaceOffset:[0,options.textureElevation??0,0],...(role==='outside'&&p.shell?.pattern?{pattern:p.shell.pattern}:{}),surface:{preset:finishes[role].preset,scale:finishes[role].scale}});
}
export function cutawayInterior(root,on){root.traverse(m=>{if(m.userData.interiorCeiling)m.visible=!on;});}

export function subtractTile(t,h){const x=Math.max(t.x,h.x),z=Math.max(t.z,h.z),xx=Math.min(t.x+t.w,h.x+h.w),zz=Math.min(t.z+t.d,h.z+h.d);if(xx<=x+1e-7||zz<=z+1e-7)return [t];return [{...t,w:x-t.x},{...t,x:xx,w:t.x+t.w-xx},{...t,x,w:xx-x,d:z-t.z},{...t,x,z:zz,w:xx-x,d:t.z+t.d-zz}].filter(r=>r.w>1e-7&&r.d>1e-7);}
