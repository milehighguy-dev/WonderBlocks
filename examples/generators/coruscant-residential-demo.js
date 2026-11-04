import {prepareExampleCopies} from '../../src/editor/example-copies.js';
import * as T from '../../vendor/three.module.js';
import {makePart} from '../../src/core/model.js';
import {defaultInterior} from '../../src/interiors/interior.js';
import {interiorRouteStair} from '../../src/interiors/interior-route.js';
import {curveRoomFaces} from '../../src/interiors/room-outline.js';
import {roomPorts} from '../../src/interiors/room-route.js';
import {platformPorts,platformPort} from '../../src/platforms/platform.js';
import {resolveRouteLinks} from '../../src/routes/route-links.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';
import {addCoruscantUndercity} from '../../src/parts/coruscant-undercity.js';

// The district is built vertically around an occupied rim, rather than along a
// chain of remote destinations. Buildings share courtyards and circulation cores.
export function coruscantResidential(){
 const parts=[];let district='';
 const add=(type,name,position,scale=[1,1,1],color='#829794',preset='cor-concrete',prop=false)=>{
  const p=makePart(type,{name,position,scale,color,surface:{preset,scale:.4},assemblyId:district,assemblyName:district,...(prop?{interiorProp:true}:{})});parts.push(p);return p;
 };
 const plan=(w,d,height=11.8)=>{
  const p=defaultInterior();p.height=height;p.rooms=[{id:'room',x:-w/2,z:-d/2,w,d}];
  p.finishes={floor:{color:'#a5aca1',preset:'cor-floor-plates',scale:.4},wall:{color:'#b4bdb1',preset:'cor-interior-panel',scale:.5},outside:{color:'#74898a',preset:'cor-window-ribs',scale:.4},ceiling:{color:'#b5bfb4',preset:'cor-ceiling-panels',scale:.4},roof:{color:'#879992',preset:'cor-angular-plating',scale:.4}};return p;
 };
 const room=(name,position,w,d,height=6)=>{const p=add('interior',name,position);p.interior=plan(w,d,height);return p;};
 const level=(p,id)=>id==='ground'?p.interior:p.interior.storeys.find(l=>l.id===id).plan;
 const door=(p,axis,line,offset=0,width=7.5,id='ground',kind='door')=>{
  const q={id:crypto.randomUUID(),axis,line,offset,width,height:kind==='window'?2.6:5.4,kind,...(kind==='window'?{sill:1.2}:{})};level(p,id).doors.push(q);return {partId:p.id,roomDoorId:q.id,levelId:id};
 };
 const deck=(name,position,w,d,rotation=0)=>{const p=add('platform',name,position);Object.assign(p.platform.sections[0],{width:w,depth:d});p.platform.thickness=.6;p.platform.railHeight=1.1;p.rotation[1]=rotation;return p;};
 const port=(p,side)=>platformPorts(p).find(q=>q.ref.side===side).ref;
 const locate=ref=>{const p=parts.find(p=>p.id===ref.partId);return ref.platformSection?platformPort(p,ref):roomPorts(p).find(q=>q.ref.roomDoorId===ref.roomDoorId&&q.ref.levelId===ref.levelId);};
 const link=(name,start,end,width=7.5,enclosed=true)=>{
  const a=locate(start),b=locate(end),run=Math.hypot(b.point.x-a.point.x,b.point.z-a.point.z),rise=b.point.y-a.point.y;
  if(run<.2||run>30)throw Error(name+' must join neighboring spaces, not span the district');
  const p=add('stair-route',name,a.point.toArray());p.rotation[1]=Math.atan2(b.point.x-a.point.x,b.point.z-a.point.z);
  p.route={width,thickness:.25,gap:0,links:{start,end},segments:[{kind:rise?'stairs':'landing',run,rise,steps:Math.max(1,Math.ceil(Math.abs(rise)/.18)),turn:'straight',railing:enclosed?{style:'none'}:{style:'posts',height:1.1},...(enclosed?{hallway:{style:'plain',height:5.4,thickness:.22,ceiling:true,color:'#98aaa1',surface:{preset:'cor-interior-panel',scale:.4}}}:{})}]};return p;
 };
 const core=(name,position,w,d,elevations)=>{
  const p=room(name,position,w,d,elevations[1]-elevations[0]-.2);p.interior.storeys=elevations.slice(1).map((e,i)=>({id:'level-'+e,name:'Level '+(position[1]+e)+' m',elevation:e,plan:plan(w,d,i===elevations.length-2?7.2:elevations[i+2]-e-.2)}));
  p.interior.stairs=[];
  for(let i=0;i<elevations.length-1;i++){
   const rise=elevations[i+1]-elevations[i],run=rise===6?7:12,source=i?'level-'+elevations[i]:'ground';
   const stair={position:[position[0]-w/2+4,position[1]+elevations[i],position[2]-d/2+3],rotation:[0,0,0],scale:[1,1,1],route:{width:3.2,thickness:.2,gap:.2,segments:[{kind:'stairs',run,rise:rise/2,steps:Math.ceil(rise/2/.18),turn:'straight',railing:{style:'posts',height:1.1}},{kind:'landing',run:3.4,rise:0,steps:1,turn:'return-left'},{kind:'stairs',run,rise:rise/2,steps:Math.ceil(rise/2/.18),turn:'straight',railing:{style:'posts',height:1.1}},{kind:'landing',run:2,rise:0,steps:1,turn:'straight'}]}};
   p.interior.stairs.push(interiorRouteStair(p,source,stair,'stair-'+elevations[i]));
  }
  return p;
 };

 district='02 · Meridian tower / shared vertical circulation';
 const tower=core('Meridian tower · inhabited circulation core',[-145,0,-50],28,24,[0,12,24,36,48,60,72]);
 const topSouth=door(tower,'x',12,0,7.5,'level-72'),midNorth=door(tower,'x',-12,0,7.5,'level-36'),groundNorth=door(tower,'x',-12);
 const overlookDoor=door(tower,'z',-14,0,6,'level-72');
 for(const elevation of [12,24,36,48,60,72]){
  const id='level-'+elevation;
  door(tower,'z',14,4,4,id,'window');door(tower,'x',12,8,4,id,'window');
  add('block','Gallery seating at '+elevation+' m',[-137,elevation,-46],[3,.7,1.2],'#8a8f7a','plain',true);
 }
 district='01 · Crown enclave / elevation 72 m';
 const apartment=room('START · penthouse apartment',[-145,72,-26],18,16,7.2);apartment.interior=curveRoomFaces(apartment.interior,'room',[1,2,3],.45);
 Object.assign(apartment.interior.finishes,{floor:{color:'#d6cbb6',preset:'tile',scale:.7},wall:{color:'#ded4bc',preset:'plain',scale:1},outside:{color:'#bfc3af',preset:'cor-concrete',scale:.4}});
 const hallDoor=door(apartment,'x',-8),padDoor=door(apartment,'z',9,0,5.4),terraceDoor=door(apartment,'x',8,0,9.2);
 link('Apartment / shared residential gallery',hallDoor,topSouth);
 const terrace=deck('Penthouse curved reception terrace',[-145,72,-11],24,6);terrace.surface={preset:'plain',scale:1};terrace.platform.sections.push({id:crypto.randomUUID(),kind:'half-circle',x:0,z:6,width:20,depth:10,radius:0,rotation:0});
 const reception=link('Penthouse portico',terraceDoor,port(terrace,'front'),9.2,false);reception.route.segments[0].railing={style:'none'};
 const pad=deck('Private landing platform · charter berth',[-123,72,-26],14,16);link('Private landing vestibule',padDoor,port(pad,'left'),5.4);
 add('block','Private berth supporting spine',[-123,0,-26],[6,71.4,8],'#8b9b95','cor-window-ribs');
 for(const [y,w,h] of [[70.25,20,.3],[70.55,19,.35],[70.9,18,.35]])add('round','Penthouse terrace stepped ledge',[-145,y,-10],[w,h,w],'#c9c3ae','plain',true);
 for(const x of [-157,-133]){
  add('round','Residence rounded tower shoulder',[x,0,-32],[6,92,6],'#b8bba8','cor-concrete');add('dome','Residence shoulder dome',[x,92,-32],[6,6,6],'#c7c7b0','cor-weathered-cladding');
  for(const y of [36,60,79,90])add('ring','Bronze shoulder belt',[x,y,-32],[6.7,.8,6.7],'#ac945f','plain');
 }
 add('archbody','Residence monumental curved crown',[-145,80,-32],[18,16,8],'#b8bcaa','cor-concrete');
 for(const x of [-152.4,-137.6])add('round','Penthouse portico column',[x,72,-16],[1.2,7.2,1.2],'#ddd3bb','plain',true);
 add('archbody','Residence crown bronze reveal',[-145,80.2,-32.35],[17.4,15.5,.8],'#9a8456','plain');
 for(const x of [-150.8,-139.2])for(const dx of [-.28,0,.28])add('round','Cream portico curtain folds',[x+dx,72.15,-18.1],[.24,4.6,.22],'#e4deca','plain',true);
 add('round','Reception terrace red medallion',[-145,72.015,-9],[5.4,.06,5.4],'#84544a','plain',true);
 add('block','Apartment sofa',[-141,72,-22],[4,.8,1.2],'#80544b','plain',true);add('block','Low living table',[-141,72,-25],[2,.5,1.2],'#a18c70','plain',true);add('block','Bedroom sleeping platform',[-151,72,-23],[3,.55,4],'#947956','plain',true);add('block','Kitchen counter',[-151,72,-31],[4,1,1.2],'#77888a','plain',true);
 add('character-reference','Player start · apartment living room',[-144,72,-25]);
 district='03 · Sky promenade / shared tower overlook';
 const promenade=deck('Upper public promenade',[-173,72,-50],20,16);link('Residential gallery / sky overlook',overlookDoor,port(promenade,'right'),6,false);
 add('block','Overlook inhabited tower wing',[-173,0,-50],[20,71.4,16],'#83988f','cor-window-ribs');
 district='04 · Mid city / courtyard on the inhabited podium';
 const plaza=deck('Lower market plaza · public concourse',[-145,36,-96],46,28);link('Tower ground gallery / market courtyard',midNorth,port(plaza,'back'));
 add('block','Market district structural podium',[-145,34.8,-96],[46,.6,28],'#596f76','cor-concrete');
 for(const x of [-167,-123])for(const z of [-109,-83])add('block','Market atrium supporting pier',[x,-.4,z],[2,35.8,2],'#596f76','cor-riveted-wall');
 for(const [x,z] of [[-159,-94],[-131,-101],[-145,-106]]){add('block','Market vendor kiosk',[x,36,z],[3,1,2],'#8c958a','cor-riveted-wall',true);add('block','Market vendor awning',[x,38.6,z],[4,.2,3],'#b2a780','plain',true);}
 district='05 · Market buildings / adjoining occupied rooms';
 const cafe=room('West arcade · cafe and service room',[-183,36,-96],16,24),clinic=room('East arcade · clinic reception',[-83,36,-96],18,24);
 link('Market / cafe arcade',port(plaza,'left'),door(cafe,'z',8));
 const transit=core('Transit administration · stacked station',[-109,0,-96],20,24,[0,12,24,36]);
 const transitWest=door(transit,'z',-10,0,7.5,'level-36'),transitEast=door(transit,'z',10,0,7.5,'level-36'),transitGround=door(transit,'z',-10);
 link('Market / transit station',port(plaza,'right'),transitWest);link('Station / clinic reception',transitEast,door(clinic,'z',-9));
 for(const p of [cafe,clinic]){add('block',p.name+' · foundation',[p.position[0],-.4,p.position[2]],[p.interior.rooms[0].w,35.8,24],'#657b80','cor-window-ribs');door(p,'x',-12,0,5,'ground','window');}
 add('block','Cafe counter',[-188,36,-96],[1.4,1.1,6],'#91836d','plain',true);add('block','Clinic reception counter',[-77,36,-94],[1.2,1.1,4],'#9bada2','plain',true);
 district='06 · Crown neighbors / layered city skyline';
 for(const [x,z,h,w] of [[-201,-22,98,24],[-90,-20,108,26],[-191,-59,90,20]]){
  add('round','Luxury neighboring tower shaft',[x,0,z],[w,h,w],'#b6bcae','cor-window-ribs');add('dome','Luxury neighboring silver crown',[x,h,z],[w,w*.85,w],'#c6cabb','cor-weathered-cladding');
  for(const y of [h-24,h-12,h-.7])add('ring','Luxury neighboring bronze belt',[x,y,z],[w+1,.8,w+1],'#b09b6c','plain');
 }
 for(const [i,[x,z,h,w]] of [[-222,-121,75,20],[-63,-123,65,24],[-245,-202,94,22],[123,-191,82,28],[75,-94,102,24],[143,-330,70,30]].entries()){
  add('cor-roundtop-body','Distant tower '+(i+1),[x,0,z],[w/6,h/4,w/3],'#738b92','cor-window-ribs');add('cor-half-round-roof','Distant crown '+(i+1),[x,h,z],[w/6,1.5,w/3],'#96a9a4','cor-weathered-cladding');
 }
 district='07 · Underground / shared neighborhood interchange';
 const entry=room('Underground service passage · entry',[-145,0,-74],12,16,6),entryBack=door(entry,'x',8),entryFront=door(entry,'x',-8);
 link('Tower basement / underground interchange',groundNorth,entryBack);
 add('block','Underground street mass / carved tunnel',[-145,-1,-74],[44,36.4,24],'#536970','cor-riveted-wall');
 district='08 · Industrial sinkhole / inhabited western rim';
 const shaft=add('ring-body','Sinkhole circular retaining shaft',[0,-72,-266],[248,108,248],'#40535c','cor-riveted-wall');shaft.parameters={sides:48,wallThickness:6.25};shaft.interiorProp=false;
 const collar=add('ring-body','Sinkhole heavy street rim',[0,36,-266],[254,2.4,254],'#667679','cor-concrete');collar.parameters={sides:48,wallThickness:7.6};
 const sump=add('round','Sinkhole deep sump floor',[0,-74,-266],[248,2,248],'#263b47');sump.parameters={sides:48};
 for(const y of [30,12,-12,-36,-60]){const belt=add('ring-body','Sinkhole annular service belt',[0,y,-266],[225,1.2,225],'#718082','plain');belt.parameters={sides:48,wallThickness:3};}
 const radial=(a,r,y)=>{a*=Math.PI/180;return [Math.sin(a)*r,y,-266+Math.cos(a)*r];};
 for(let angle=30;angle<360;angle+=30){const p=add('block','Sinkhole vertical structural pier',radial(angle,108.5,-72),[2.2,107,4],'#53656c');p.rotation[1]=angle*Math.PI/180;for(const y of [-47,-23,1,25]){const light=add('block','Shaft amber bay marker',radial(angle,106.4,y),[1.2,.6,.22],'#d9a254','plain');light.rotation[1]=p.rotation[1];}}
 for(const angle of [150,170,190,210]){const position=radial(angle,103.5,-72);const riser=add('round','Industrial coolant riser',position,[2,104,2],'#88785f','cor-riveted-wall');riser.parameters={sides:12};for(const y of [-55,-30,-5,20]){const band=add('ring-body','Coolant riser coupling',[position[0],y,position[2]],[2.5,.9,2.5],'#ad9a70','plain');band.parameters={sides:12,wallThickness:12};}}
 for(const x of [-108,108])add('block','Freight crane wall bracket',[x,12,-248],[5,4,4],'#8c8068');add('block','Sinkhole overhead freight crane',[0,16,-248],[216,2,3],'#9a8968','cor-riveted-wall');add('block','Freight crane trolley',[-22,14,-248],[5,2,5],'#7c8786','cor-riveted-wall');
 for(const x of [-121,121]){add('block','Industrial rim factory',[x,36,-266],[22,18,50],'#627278','cor-riveted-wall');for(const z of [-251,-276])add('round','Industrial rim chimney',[x,54,z],[4,18,4],'#717f80','cor-weathered-cladding');}

 const streets=addCoruscantUndercity(parts,entry,{origin:[-145,0,-106],bend:-1,entryRef:entryFront,freight:false});
 for(const street of [...streets.banks,...streets.upperBanks])for(const segment of street.route.segments){segment.cutThroughSolids=true;segment.cutHeight=6;}
 district='07 · Underground / shared neighborhood interchange';
 link('Station basement / market arrival square',transitGround,port(streets.arrival,'right'));
 district='08 · Industrial sinkhole / inhabited western rim';
 const exitPort=platformPort(streets.exit,port(streets.exit,'left')),outward=new T.Vector3(Math.sin(exitPort.angle),0,Math.cos(exitPort.angle));
 const freightPosition=exitPort.point.clone().addScaledVector(outward,16);freightPosition.y=-30;
 const freight=core('Rim freight works · vertical cargo circulation',freightPosition.toArray(),20,24,[0,12,24,30]);freight.rotation[1]=exitPort.angle;
 // Interior stair routes are stored in local plan space; rotating the complete
 // works rotates every floor, stair and doorway together.
 const freightTop=door(freight,'x',-12,0,7.5,'level-30'),freightBottom=door(freight,'x',12);
 // The core face is 12 m from its centre: keep a four-metre threshold bridge.
 link('Market street / rim freight entrance',port(streets.exit,'left'),freightTop);
 const yardPosition=new T.Vector3(...freight.position).addScaledVector(outward,23);const yard=deck('Sinkhole lower loading platform',yardPosition.toArray(),24,14,exitPort.angle);
 link('Freight works / lower loading apron',freightBottom,port(yard,'front'),7.5,false);
 for(const x of [-6,6]){const position=new T.Vector3(x,0,2).applyAxisAngle(new T.Vector3(0,1,0),yard.rotation[1]).add(new T.Vector3(...yard.position));const box=add('block','Lower yard freight container',position.toArray(),[4,2.4,3],'#84775e','cor-riveted-wall',true);box.rotation[1]=yard.rotation[1];}
 return prepareExampleCopies(preparePatternScaling({format:'open-building-studio',version:1,name:'Coruscant · Meridian rim district',parts:resolveRouteLinks(parts)}),'coruscant-residential-copy');
}
