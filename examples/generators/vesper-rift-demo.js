import {prepareExampleCopies} from '../../src/editor/example-copies.js';
import * as T from '../../vendor/three.module.js';
import {makePart,validateProject} from '../../src/core/model.js';
import {defaultInterior,interiorWalls} from '../../src/interiors/interior.js';
import {polygonRoom} from '../../src/interiors/polygon-plan.js';
import {roomPorts} from '../../src/interiors/room-route.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';

export const VESPER_REFERENCE_VIEW={feet:[-35.7,28,20],eye:[-35.7,29.7,20],target:[28,42,-145]};

export const VESPER_SITES=[
 {id:'west',label:'West arrival',position:[-49,28,55],team:1},
 {id:'east',label:'East arrival',position:[49,28,55],team:0},
 {id:'market',label:'A · Cliff galleries',position:[-48,32,-50],team:0},
 {id:'rotunda',label:'B · Hanging council hall',position:[29,32,-50],team:0},
 {id:'waterworks',label:'C · Far village',position:[-3,38,-168.5],team:2}
];

// Reference-driven composition: two continuous inhabited canyon banks, three
// masonry crossings and a single projecting civic hall. All architecture and
// geology below is saved native geometry, not scenery added only by the preview.
export function vesperRift(){
 const parts=[],C={rock:'#a8a08a',stone:'#9f9277',dark:'#4d4a3b',paving:'#998a6c',trim:'#b5a480',rust:'#71362e',cyan:'#6fbbb3',amber:'#efc58a'};
 let group='';
 const add=(type,name,position,scale=[1,1,1],color=C.stone,preset='rift-stone',rotation=[0,0,0])=>{
  const p=makePart(type,{id:'vesper-'+parts.length,name,position,scale,color,rotation,surface:{preset,scale:.3},assemblyId:'vesper-'+group,assemblyName:group});parts.push(p);return p;
 };
 const box=(name,p,s,c=C.stone,surface='rift-stone')=>add('block',name,p,s,c,surface);
 const beam=(name,a,b,w=.3,d=w,c=C.trim)=>{const v=new T.Vector3(...b).sub(new T.Vector3(...a)),e=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize()));return add('block',name,a,[w,v.length(),d],c,'rift-stone',e.toArray().slice(0,3));};
 const circle=(w,d,n=16)=>Array.from({length:n},(_,i)=>({x:Math.cos(i*Math.PI*2/n)*w/2,z:Math.sin(i*Math.PI*2/n)*d/2}));
 const prop=(name,p,s,c=C.dark,preset='rift-stone')=>{const part=box(name,p,s,c,preset);part.interiorProp=true;return part;};
 const light=(x,y,z,w=.35)=>prop('Warm inhabited doorway lamp',[x,y,z],[w,.55,.2],C.amber,'plain');
 function room(name,x,y,z,w,d,h=5.3,rounded=false){
  const p=add('interior',name,[x,y,z]),plan=defaultInterior();plan.height=h;plan.thickness=.36;
  plan.rooms=[rounded?polygonRoom(p.id+'-room',circle(w,d)):{id:p.id+'-room',x:-w/2,z:-d/2,w,d}];
  plan.finishes={floor:{color:C.paving,preset:'rift-stone',scale:.35},wall:{color:C.stone,preset:'rift-stone',scale:.35},outside:{color:C.stone,preset:'rift-stone',scale:.35},ceiling:{color:C.dark,preset:'rift-stone',scale:.35},roof:{color:C.dark,preset:'rift-stone',scale:.35}};p.interior=plan;return p;
 }
 function threshold(p,width,point,angle){const q=prop('Carved doorway threshold',[point.x,point.y-.17,point.z],[width,.16,.85],C.paving);q.rotation[1]=angle;}
 function door(p,axis,line,offset,width=3.4){p.interior.doors.push({id:p.id+'-door-'+p.interior.doors.length,axis,line,offset,width,height:3.5,kind:'door'});const port=roomPorts(p).at(-1);threshold(p,width,port.point,port.angle);}
 function roundedDoors(p){const walls=interiorWalls(p.interior);for(const i of [1,5,9,13]){const w=walls[i];p.interior.doors.push({id:p.id+'-door-'+i,wall:w.key,offset:(w.start+w.end)/2,width:4,height:4.2,kind:'door'});}for(const port of roomPorts(p))threshold(p,4,port.point,port.angle);}
 function street(name,a,b,width=6){
  const run=Math.hypot(b[0]-a[0],b[2]-a[2]),rise=b[1]-a[1],n=Math.max(1,Math.ceil(run/26),Math.ceil(Math.abs(rise)/2)),rest=rise?1.5:0,flight=(run-rest*(n-1))/n;
  const p=add('stair-route',name,a,[1,1,1],C.paving,'rift-stone',[0,Math.atan2(b[0]-a[0],b[2]-a[2]),0]);p.route={width,thickness:.65,gap:.2,cutThroughSolids:true,cutHeight:4.5,segments:[]};
  const railing={style:'solid',sides:'both',height:1,panelThickness:.32,color:C.stone,surface:{preset:'rift-stone',scale:.35}};
  for(let i=0;i<n;i++){p.route.segments.push({kind:rise?'stairs':'landing',run:flight,rise:rise/n,steps:rise?Math.ceil(Math.abs(rise/n)/.16):1,turn:'straight',railing});if(rest&&i<n-1)p.route.segments.push({kind:'landing',run:rest,rise:0,steps:1,turn:'straight',railing});}
  return p;
 }
 function bridge(name,z,y,width=7){
  const r=street(name,[-35.25,y,z],[35.25,y,z],width);
  const h=17+(y-28)*1.2,arch=add('flat-arch',name+' · continuous masonry arch',[0,y-.65-h*1.3,z-width/2],[74/1.3,h,width/.4],C.rock,'rift-stone');
  // This support stops at the deck underside; passage cutters must not shave its roof.
  arch.interiorProp=true;
  arch.assemblyId='vesper-canyon-masonry';arch.assemblyName='08 · Canyon masonry supports';
  return r;
 }
 function shelf(sign,z,y,index){
  group=`0${index+1} · ${sign<0?'West':'East'} inhabited cliff`;
  const p=add('platform','Cliff street · continuous inhabited bank',[sign*52,y,z]);p.platform.thickness=.7;p.platform.railing='none';Object.assign(p.platform.sections[0],{id:p.id+'-floor',kind:'rectangle',width:34,depth:78,radius:0});
  const rock=add('block','Solid carved cliff foundation',[sign*57,-104,z],[46,y+103.5,81],C.rock);rock.shape={taper:-.08,bulge:.04};
  // A second irregular rock shoulder joins each street to the enclosing wall.
  const shoulder=add('hex','Natural stepped cliff shoulder',[sign*(index===2?87:83),-98,z-9],[34,y+121,94],C.rock);shoulder.shape={taper:.2,bulge:.15,twist:sign*7};
  const r=room(index===0?(sign<0?'WEST START · carved arrival hall':'EAST START · carved arrival hall'):(sign<0?'West':'East')+' cliff gallery '+index,sign*65,y,z,16,28,5.8);
  door(r,'z',-sign*8,-7,3.6);door(r,'z',-sign*8,7,3.6);door(r,'x',-14,0,3.6);door(r,'x',14,0,3.6);
  for(const dz of [-5,5])prop('Interior stone archive · crossfire break',[sign*67,y,z+dz],[2.2,1.2,2.5]);
  for(const dz of [-29,29])prop('Street stone planter cover',[sign*(sign<0&&index===1&&dz===29?51:45),y,z+dz],[4,1.1,2.2]);
  // The chasm edge is interrupted at its crossing and the street connectors.
  for(const dz of [-24,24]){
   // The west overlook has a deliberate open edge, as in the reference.
   if(sign<0&&index===0&&dz===-24){for(const [zz,length] of [[6.75,10.5],[25.75,9.5]])box('Overlook side parapet',[sign*35.8,y,zz],[.55,1.05,length]);}
   else box('Cliff street low stone parapet',[sign*35.8,y,z+dz],[.55,1.05,29]);
  }
  group='D · Inhabited cliff facades';
  for(const offset of [6.1,10.4])prop('Recessed warm window galleries',[sign*57.2,y+offset,z],[.28,2.2,29],C.stone,'rift-habitat');
  for(const offset of [5.95,9.8,13])prop('Carved stone string course',[sign*57,y+offset,z],[.65,.4,30],C.dark);
  box('Stepped stone gallery roof',[sign*64,y+13.5,z],[17,1.1,30],C.dark);
  for(const dz of [-12,12])light(sign*56.5,y+3.8,z+dz,.6);
 }

 // Each bank is a broad inhabited street, rather than a separate round island.
 for(const sign of [-1,1])for(const [i,z,y] of [[0,40,28],[1,-50,32],[2,-140,38]])shelf(sign,z,y,i);
 group='07 · Cliff street ascents';
 for(const sign of [-1,1]){street('Lower cliff street ascent · '+sign,[sign*50,28,1.15],[sign*60,32,-11.15],6);street('Upper cliff street ascent · '+sign,[sign*50,32,-88.85],[sign*65,38,-101.15],6);}
 group='08 · Three canyon crossings';
 bridge('Arrival arch crossing',40,28,7);const high=bridge('High aqueduct crossing',-140,38,8);
 // The village opens from the north side of the high crossing.
 for(const segment of high.route.segments)segment.railing.sides='right';
 for(const x of [-28.625,28.625])prop('High crossing outer return parapet',[x,38,-144],[13.25,1,.32],C.stone);
 // This crossing reaches an actual doorway, rather than running into the hall wall.
 const councilEnd=[19.4,32,-60.3];street('Council arch crossing',[-35.25,32,-50],councilEnd,7);
 const councilSpan=Math.hypot(councilEnd[0]+35.25,councilEnd[2]+50),councilAngle=Math.atan2(-(councilEnd[2]+50),councilEnd[0]+35.25);
 // The support shares the route centre line and flat underside, including its rotation.
 const councilDepth=7,councilBottom=32-.65,councilHeight=18,councilMid=new T.Vector3(-35.25,0,-50).lerp(new T.Vector3(...councilEnd),.5);
 const councilArch=add('flat-arch','Council crossing · diagonal masonry arch',[councilMid.x-Math.sin(councilAngle)*councilDepth/2,councilBottom-councilHeight*1.3,councilMid.z-Math.cos(councilAngle)*councilDepth/2],[councilSpan/1.3,councilHeight,councilDepth/.4],C.rock,'rift-stone',[0,councilAngle,0]);
 councilArch.interiorProp=true;
 councilArch.assemblyId='vesper-canyon-masonry';councilArch.assemblyName='08 · Canyon masonry supports';
 for(const z of [40,-140])prop('Crossing center refuge',[0,z===40?28:38,z],[2.2,1.15,2.2]);

 group='09 · Projecting council district';
 const balcony=add('platform','Council terrace · joined to the right cliff',[31,32,-50]);balcony.platform.thickness=.8;balcony.platform.railing='none';Object.assign(balcony.platform.sections[0],{id:balcony.id+'-floor',kind:'circle',width:43,depth:47,radius:0});
 const base=add('waist','Council cliff · natural cantilever root',[42,-104,-50],[42,135,39],C.rock);base.shape={taper:.25,bulge:.12,twist:-7};
 const hall=room('HANGING COUNCIL HALL · carved round chamber',31,32,-50,31,35,7,true);roundedDoors(hall);
 prop('Council archive · interrupted sightline',[31,32,-50],[4.2,2.1,4]);
 group='D · Hanging council architecture';
 add('saucer','Council broad weathered stone roof',[31,39.25,-50],[29,15,33],C.dark);
 add('round','Council upper roof drum',[31,40.3,-50],[15,2.8,17],C.dark);add('dome','Council shallow upper crown',[31,43.1,-50],[15,5,17],C.dark);
 for(let i=0;i<16;i++){const a=i*Math.PI/8;const p=prop('Council recessed clerestory gallery',[31+Math.cos(a)*15.75,37.15,-50+Math.sin(a)*17.75],[5.5,1.45,.22],C.stone,'rift-habitat');p.rotation[1]=Math.PI/2-a;}
 for(const z of [-66,-34]){prop('Council carved exterior cornice',[30,38.3,z],[26,.65,1],C.dark);for(const x of [20,29,38])light(x,37,z,.4);}
 for(const z of [-63,-37]){
  const p=prop('Council hanging civic banner',[15.1,27.2,z],[.1,10,3.3],'#ffffff','rift-banner');p.surface.scale=1;p.pattern={mode:'fixed',texture:[1,1/10,1/3.3]};
  beam('Banner iron hanging bracket',[15.1,37.3,z],[11.8,37.3,z],.18,.18,C.dark);
 }
 // A narrow walk stays in the cliff; the terrace is an attached part of the city.
 street('Council side balcony approach',[50,32,-74],[31,32,-73],5);
 street('Council side balcony return',[50,32,-26],[31,32,-27],5);

 group='D · Village rock outcrop';
 const villageRock=add('hex','Far village natural canyon outcrop',[0,-104,-165],[52,141.4,46],C.rock);villageRock.shape={taper:-.08,bulge:.1,twist:5};
 group='11 · Far bank village';
 const villageFloor=add('platform','Far settlement plaza',[0,38,-164.9]);villageFloor.platform.thickness=.7;villageFloor.platform.railing='none';Object.assign(villageFloor.platform.sections[0],{id:villageFloor.id+'-floor',kind:'rectangle',width:44,depth:42,radius:0});
 for(const [i,x,z,w,d] of [[0,-10,-159,10,10],[1,4,-160,10,10],[2,14,-175,8,8],[3,-13,-175,6,8],[4,0,-177,6,8]]){
  const y=38,h=4.8,r=room('Far village dwelling '+(i+1),x,y,z,w,d,h);
  door(r,'x',-d/2,0,2.7);door(r,'x',d/2,0,2.7);
  prop('Village flat stone roof',[x,y+h,z],[w+1,.65,d+1],C.dark);
  prop('Village upper roof course',[x,y+h+.65,z],[w-.6,.45,d-.6],C.stone);
  for(const sign of [-1,1]){
   prop('Village recessed clerestory windows',[x,y+3.65,z+sign*(d/2+.08)],[w-.4,.95,.15],C.stone,'rift-habitat');
   light(x+w/2-.7,y+2.7,z+sign*(d/2+.22),.32);
  }
 }
 group='D · Far village upper dwellings';
 for(const [x,z,y,w,h] of [[-10,-159,44,7,8],[4,-160,44,8,12],[0,-177,44,5,9]]){
  prop('Far settlement upper stone dwelling',[x,y,z],[w,h,8],C.stone,'rift-habitat');
  prop('Far settlement stepped roof',[x,y+h,z],[w+1,.8,9],C.dark);
  light(x-2,y+2,z+4.1,.4);
 }
 group='D · Chasm wall geology';
 for(const sign of [-1,1])for(let i=0;i<7;i++){
  const x=sign*(99+(i%3)*6),z=75-i*48,h=130+(i*17)%61;
  const mass=add('hex','Irregular enclosing cliff stratum',[x,-110,z],[42,h,66],i%2?'#a49b85':C.rock);mass.shape={taper:.13,bulge:.14,twist:sign*(i%2?8:-5)};
  const spur=add('taper','Overhanging canyon shoulder',[x-sign*10,h-115,z-12],[36,24,48],C.rock,'rift-stone',[Math.PI,0,sign*.08]);spur.shape={bulge:.3};
 }
 group='D · Great mineral formations';
 const formations=[[-28,-130,18,207],[12,-215,21,247],[-15,-330,24,272],[71,-255,24,242],[-92,-204,25,230],[-75,220,24,215],[8,310,23,240],[80,255,24,230]];
 for(let i=0;i<formations.length;i++){
  const [x,z,w,h]=formations[i],top=h-110;
  const shaft=add('waist','Great flared mineral shaft '+i,[x,-110,z],[w,h,w*.82],'#b6b09c','mineral-basalt');shaft.surface.scale=.12;shaft.shape={taper:.08,bulge:.1,twist:i%2?9:-7};
  // Rock flares widen upward into a chipped shelf, not a rounded mushroom lid.
  const flare=add('taper','Great mineral crown · flared rock shelf '+i,[x,top+10,z],[w*2.6,16,w*2.25],'#b6b09c','mineral-basalt',[Math.PI,.12*i,.045]);flare.shape={bulge:.13,twist:14};flare.surface.scale=.12;
  for(let j=0;j<3;j++){const a=j*2.1+i*.4,xx=x+Math.sin(a)*w*.45,zz=z+Math.cos(a)*w*.4;const shelf=add('hex','Broken irregular mineral crown rim',[xx,top+8+(j%2)*2,zz],[w*1.65,3+j,w*1.45],'#b6b09c','mineral-basalt',[0,a,.06*(j-1)]);shelf.shape={taper:.12,twist:8};shelf.surface.scale=.12;}
  for(let j=0;j<5;j++){const a=j*1.3+i*.3,xx=x+Math.sin(a)*w*.8,zz=z+Math.cos(a)*w*.69;const tooth=add('cone','Hanging rock curtain tooth',[xx,top+11,zz],[1.3,21+(j%3)*9,2.4],C.rock,'rift-stone',[Math.PI,0,.06]);tooth.shape={bulge:.2};}

 }
 // Remote streets cross the same canyon at other heights; they are real saved
 // scenery, spatially separate from the infantry routes used by this map.
 group='D · Far city bridges';
 for(const [z,y,w,cx,span] of [[-130,82,5,-64,72],[-335,87,5,0,182],[-120,-24,5,0,182]]){
  box(y>70?'High canyon skywalk deck':y<0?'Lower chasm causeway deck':'Distant inhabited crossing deck',[cx,y-.65,z],[span,.65,w],C.dark);
  if(z!==-130)add('flat-arch','Distant crossing · great masonry arch',[0,y-.65-32*1.3,z-w/2],[span/1.3,32,w/.4],C.rock);
  for(const sign of [-1,1])box('Distant crossing parapet',[cx,y,z+sign*w/2],[span,.9,.4],C.stone);
 }
 box('High skywalk cliff abutment',[-92,45,-130],[8,37,10],C.rock);
 group='D · Lower causeway lanterns';
 for(const x of [-70,-50,-30,-10,10,30,50,70]){
  prop('Lower causeway lamp socket',[x,-24,-118],[.45,1.5,.45],C.dark);
  light(x,-22.5,-117.9,.32);
 }
 group='D · Carved spire neighbourhoods';
 for(const sign of [-1,1])for(let i=0;i<7;i++){
  const x=sign*(69+(i%3)*7),z=30-i*56,y=34+(i%3)*6,h=28+(i*11)%34;
  const tower=add('taper','Carved inhabited stone spire',[x,y,z],[7,h,9],C.stone);tower.shape={taper:.12};
  add('taper','Spire weathered stone crown',[x,y+h,z],[5.8,7+i%3*2,7.6],C.stone);
  prop('Spire recessed amber niche',[x-sign*3.35,y+h*.4,z],[.13,h*.43,4],'#a69b7e','rift-habitat');
 }
 group='D · Hanging inhabited cliff bands';
 for(const sign of [-1,1])for(let i=0;i<5;i++){
  const x=sign*(38+(i%2)*3),z=45-i*47,y=-8+(i%3)*8;
  prop('Lower cliff dwelling · recessed row',[x,y,z],[.8,5,27],C.stone,'rift-habitat');
  box('Lower cliff dwelling · stone balcony',[x-sign*1.4,y-.8,z],[4,.6,30],C.dark);
 }
 group='D · Waterfalls and basin';
 for(const [x,z,top] of [[-38,-76,54],[41,-185,77],[-47,-277,89]]){
  for(let i=0;i<3;i++){const w=3.1+i*.7,h=top+111,p=add('waterfall','Waterfall descending through the city',[x+i*.55,-111,z+i*.17],[w,h,1],i%2?'#d8dacc':'#b8c9c1','waterfall');p.surface.scale=1;p.pattern={mode:'fixed',texture:[1/w,1/h,1]};}
  box('Waterfall attached stone conduit',[(x+(x<0?-80:80))/2,top-.6,z],[Math.abs((x<0?-80:80)-x)+2,1.4,5],C.dark);
  box('Waterfall cliff spill lip',[x,top-.6,z],[6,1.4,6],C.rock);
  if(top===54){const rock=add('hex','Cliff above the lower spillway',[-70,-104,z],[31,163,23],C.rock);rock.shape={taper:.1,bulge:.15,twist:-6};}
 }
 box('Mist-darkened water in the deep gorge',[0,-112,-130],[285,.2,620],'#505d59','hammered');
 group='D · Lantern lines and occupied streets';
 for(const sign of [-1,1])for(const z of [65,13,-25,-75,-115,-165]){
  const y=z>0?28:z>-95?32:38;
  const lanternX=sign<0&&z===13?-48:sign*40;
  prop('Street lantern stone socket',[lanternX,y,z],[.6,1.6,.6],C.dark);light(lanternX,y+1.6,z,.4);
 }
 group='10 · Human scale';add('character-reference','START HERE · west cliff street',VESPER_REFERENCE_VIEW.feet);
 // Dressing is ordinary non-floor scenery. The native shape rules still own
 // its collision; the exporter does not hand-author collision or AI here.
 for(const p of parts)if(p.assemblyName.startsWith('D · '))p.interiorProp=true;
 return prepareExampleCopies(validateProject(preparePatternScaling({format:'open-building-studio',version:1,name:'Vesper Rift · City of the Hollow Moon',parts})),'vesper-rift-copy');
}
