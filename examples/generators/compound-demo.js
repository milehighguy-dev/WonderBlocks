import {prepareExampleCopies} from '../../src/editor/example-copies.js';
import {makePart} from '../../src/core/model.js';
import {castleKeepParts} from '../../src/parts/castle-keep.js';
import {japaneseOpenWallDefaults,japaneseRoofCurve} from '../../src/parts/japanese-wall-profile.js';
import {defaultInterior} from '../../src/interiors/interior.js';
import {resolveRouteLinks} from '../../src/routes/route-links.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';

// Metres throughout. The courts, curtain walls, rooms and approaches remain
// native builder objects; object groups keep each building easy to select.
export function castleCompound(){
 const parts=[],roof='#61958b',plaster='#eee9d8',timber='#403e35',stone='#85877c';
 const add=(type,name,position,scale=[1,1,1],color,angle=0,surface)=>{
  const p=makePart(type,{name,position,scale,rotation:[0,angle,0],...(color?{color}:{}),...(surface?{surface:{preset:surface,scale:1}}:{})});parts.push(p);return p;
 };
 const assembly=(name,build)=>{const start=parts.length,id=crypto.randomUUID();build();for(const p of parts.slice(start)){p.assemblyId=id;p.assemblyName=name;p.name=name+' · '+p.name;}};
 const platform=(name,x,y,z,width,depth,color='#c4b99c',radius=0)=>{
  const p=add('platform',name,[x,y,z],[1,1,1],color,0,'plain');
  Object.assign(p.platform,{railing:'none',thickness:.25});Object.assign(p.platform.sections[0],{width,depth,radius});return p;
 };
 const terrace=(name,x,z,width,depth,bottom,height)=>{
  const base=add('jp-base',name+' · retaining foundation',[x,bottom,z],[width/1.56,(height-.04)/1.2,depth/1.56],stone);
  base.parameters={batter:.1};base.pattern={mode:'fixed',texture:[.18,.65,.18]};
  return platform(name+' · courtyard',x,bottom+height,z,width,depth);
 };
 const wall=(name,y,points)=>{
  const p=add('wall-route',name,[points[0][0],y,points[0][1]]);
  p.route={width:.5,thickness:.18,gap:.15,segments:[]};
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/24),heading=Math.atan2(b[0]-a[0],b[1]-a[1]);
   for(let j=0;j<n;j++)p.route.segments.push({kind:'landing',run:length/n,rise:0,steps:1,turn:'straight',pathStart:{point:[a[0]-points[0][0]+(b[0]-a[0])*j/n,0,a[1]-points[0][1]+(b[1]-a[1])*j/n],heading},railing:{...japaneseOpenWallDefaults(),style:'japanese-roofed'}});
  }return p;
 };
 const curtain=(name,y,left,right,back,front,entry,gap=6)=>wall(name,y,[[entry-gap/2,front],[left,front],[left,back],[right,back],[right,front],[entry+gap/2,front]]);
 function gable(name,x,y,z,halfWidth,halfDepth,rise,angle=0){
  // The underside at the eaves rests on the posts / room wall top.
  const base=y-(japaneseRoofCurve(1)-.06)*rise;
  for(const sign of [-1,1])add('jp-half-roof',name+(sign<0?' · west roof half':' · east roof half'),[x,base,z],[halfWidth,rise,halfDepth],roof,angle+(sign<0?Math.PI:0));
  for(const sign of [-1,1])add('jp-swept-gable',name+(sign<0?' · rear gable':' · front gable'),[x+Math.sin(angle)*sign*halfDepth,base,z+Math.cos(angle)*sign*halfDepth],[halfWidth,rise,.5],plaster,angle+(sign<0?Math.PI:0));
 }
 function gate(name,x,y,z,angle=0,large=true){assembly(name,()=>{
  add('jp-gate','open passage',[x,y,z],[large?4.25:2.8,large?2.5:2,2],timber,angle);
  if(large){add('jp-story','guard loft',[x,y+4.3,z],[4.5,2,1.8],plaster,angle);gable('loft',x,y+6.7,z,5.3,2.6,1.8,angle);}
  else gable('gate',x,y+3.52,z,3.3,1.3,1.3,angle);
 });}
 function hall(name,x,y,z,width,depth,angle=0){assembly(name,()=>{
  const p=add('interior','inhabited hall',[x,y,z],[1,1,1],plaster,angle),plan=defaultInterior();
  plan.height=3.2;plan.rooms=[{id:'hall',x:-width/2,z:-depth/2,w:width,d:depth}];
  plan.finishes={floor:{color:'#88755b',preset:'wood',scale:1},wall:{color:plaster,preset:'plain',scale:1},outside:{color:plaster,preset:'plain',scale:1},ceiling:{color:plaster,preset:'plain',scale:1},roof:{color:plaster,preset:'plain',scale:1}};
  plan.doors=[{id:'entry',axis:'x',line:depth/2,offset:0,width:2.8,height:2.7,kind:'door'}];
  for(const side of [-1,1])for(const offset of [-width/3,width/3])plan.doors.push({id:crypto.randomUUID(),axis:'x',line:side*depth/2,offset,width:1.2,height:1.3,sill:1.1,kind:'window'});
  p.interior=plan;gable('hall',x,y+3.4,z,width/2+.8,depth/2+.8,2,angle);
 });}
 function tower(name,x,y,z){assembly(name,()=>{
  add('jp-base','stone foot',[x,y,z],[3.8,.5,3.8],stone);
  for(let i=0;i<2;i++){add('jp-story','watch chamber '+(i+1),[x,y+.6+i*3.4,z],[3-i*.4,2.5,3-i*.4],plaster);gable('tier '+(i+1),x,y+3.6+i*3.4,z,3.8-i*.4,3.8-i*.4,1.6);}
 });}
 const edge=(p,which,t)=>({partId:p.id,platformSection:p.platform.sections[0].id,edge:which,edgeT:t});
 const approach=(name,x,y,z,target,ref,width=4.5)=>{
  const p=add('stair-route',name,[x,y,z],[1,1,1],stone,Math.PI,'stone');
  const rise=target.position[1]-y;
  p.route={width,thickness:.22,gap:.2,groundHeight:y,links:{end:ref},segments:[
   {kind:'stairs',run:3.6,rise:rise/2,steps:6,turn:'straight',fillToGround:true},
   {kind:'landing',run:2,rise:0,steps:1,turn:'straight',fillToGround:true},
   {kind:'stairs',run:3.6,rise:rise/2,steps:6,turn:'straight',fillToGround:true}
  ].map(s=>({...s,railing:{style:'posts',height:1.1,color:timber}}))};return p;
 };
 platform('01 · Arrival & service court',0,0,0,96,94);
 const middle=terrace('02 · Audience & garden court',0,-8,68,64,0,2.4);
 const upper=terrace('03 · Keep court',-10,-16,40,40,2.4,2.4);
 curtain('Outer curtain · roofed defensive wall',0,-44,44,-43,43,20);
 // The east postern gives the curved garden stair a second way into the court.
 wall('Middle curtain · roofed defensive wall',2.4,[[17,22],[-32,22],[-32,-38],[32,-38],[32,-13]]);
 wall('Middle curtain · postern return',2.4,[[32,-9],[32,22],[23,22]]);
 curtain('Keep curtain · roofed defensive wall',4.8,-28,8,-34,2,5,5);
 gate('South gatehouse',20,0,43);gate('Audience gate',20,2.4,22,0,false);gate('Keep gate',5,4.8,2,0,false);gate('Garden postern',32,2.4,-11,Math.PI/2,false);
 approach('Audience approach · two gentle flights',20,0,33.2,middle,edge(middle,2,14/68));
 approach('Keep court approach · resting landing',5,2.4,13.2,upper,edge(upper,2,5/40),3.6);
 const curve=add('stair-route','East garden · curved stair return',[40,0,-5],[1,1,1],stone,Math.PI,'stone');
 curve.route={width:2.4,thickness:.2,gap:.2,groundHeight:0,links:{end:edge(middle,1,29/64)},segments:[{kind:'stairs',run:Math.PI*3,rise:2.4,steps:14,turn:'straight',curveAngle:Math.PI/2,fillToGround:true,railing:{style:'posts',height:1.1,color:timber}}]};
 // Use the current half-roof keep at its authored metre scale.
 for(const source of castleKeepParts()){const p=structuredClone(source);p.position=p.position.map((v,i)=>v+[-10,4.8,-18][i]);p.name='Main keep · '+p.name;parts.push(p);}
 tower('Southwest watchtower',-39,0,38);tower('Southeast watchtower',39,0,38);tower('Northeast watchtower',39,0,-38);
 hall('West barracks',-25,0,35,18,8);hall('East provisions store',38,0,13,18,8,Math.PI/2);hall('Audience hall',23,2.4,-19,20,10,Math.PI/2);
 // Long shaded gallery on the lower service lane, with open walking bays.
 assembly('West covered gallery',()=>{
  platform('timber deck',-41, .04,-5,3.8,44,'#8b795b');
  gable('gallery',-41,3.3,-5,2.5,22.8,1.3);
  for(let z=-26;z<=16;z+=6)for(const x of [-42.5,-39.5])add('block','timber post',[x,.04,z],[.18,3.26,.18],timber);
 });
 // Raised dry garden: distinct from the court, without blocking the main path.
 assembly('Moon garden',()=>{
  platform('rounded gravel bed',-17,2.45,14,18,10,'#ddd4b6',2.5);
  for(const [x,z,w,h,d] of [[-22,14,2.1,1.1,1.5],[-18,13,1.5,.8,2],[-12,15,2.6,1.4,1.8]])add('crystal','garden stone',[x,2.45,z],[w,h,d],'#777e72');
  const path=add('stair-route','curving garden walk',[-6,2.46,17],[1,1,1],'#a7a38d',Math.PI,'stone');
  path.route={width:1.6,thickness:.12,gap:.15,segments:[{kind:'landing',run:Math.PI*4,rise:0,steps:1,turn:'straight',curveAngle:Math.PI/2}]};
 });
 // Small props make the courts read as occupied spaces while leaving routes clear.
 assembly('Service court well',()=>{add('round','shaft',[-6,0,36],[1.6,.8,1.6],stone);add('ring','stone coping',[-6,.8,36],[1.9,.5,1.9],'#b9baa4');});
 for(const [x,z] of [[-37,30],[34,29]])assembly(x<0?'West supply racks':'East supply racks',()=>{add('block','timber plinth',[x,0,z],[3,.25,1.6],timber);for(const dx of [-.85,.85])add('block','supply chest',[x+dx,.25,z],[1.2,.9,1.2],'#8d7750',0,'wood');});
 add('character-reference','Arrival · human scale',[20,0,46]);
 return prepareExampleCopies(preparePatternScaling({format:'open-building-studio',version:1,name:'Shirogane · Gate, Garden & Keep',parts:resolveRouteLinks(parts)}),'castle-compound-copy');
}
