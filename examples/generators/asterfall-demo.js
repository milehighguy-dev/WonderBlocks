import {prepareExampleCopies} from '../../src/editor/example-copies.js';
import * as T from '../../vendor/three.module.js';
import {makePart,validateProject} from '../../src/core/model.js';
import {defaultInterior} from '../../src/interiors/interior.js';
import {platformPorts} from '../../src/platforms/platform.js';
import {resolveRouteLinks} from '../../src/routes/route-links.js';
import {instantiateFloraTreePreset} from '../../src/flora/flora-tree-presets.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';

// A complete native scene, in metres. No preview-only architecture: the water,
// engine, cliff strata, interiors and connected circulation all live in the file.
export function asterfall(){
 const parts=[],C={stone:'#d9c7a3',light:'#efe0ba',dark:'#46575b',rock:'#516369',bronze:'#ad7945',teal:'#387d7a',water:'#56bdbd',cloth:'#b85840'};
 let district='';
 const add=(type,name,position,scale=[1,1,1],color=C.stone,preset='plain',rotation=[0,0,0])=>{
  const p=makePart(type,{id:'asterfall-'+parts.length,name,position,scale,color,rotation,surface:{preset,scale:1},...(district?{assemblyId:'asterfall-'+district,assemblyName:district}:{})});parts.push(p);return p;
 };
 const box=(name,p,s,c=C.stone,texture='stone')=>add('block',name,p,s,c,texture);
 const beam=(name,a,b,w=.4,d=w,c=C.bronze,texture='metal')=>{const v=new T.Vector3(...b).sub(new T.Vector3(...a)),r=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize()));return add('block',name,a,[w,v.length(),d],c,texture,r.toArray().slice(0,3));};
 const ring=(name,x,y,z,diameter,depth,wall=4,color=C.bronze,vertical=false)=>{const p=add('ring-body',name,[x,y,z],[diameter,depth,diameter],color,'metal',vertical?[Math.PI/2,0,0]:[0,0,0]);p.parameters={sides:48,wallThickness:wall};return p;};
 const deck=(name,x,y,z,w,d,round=false)=>{const p=add('platform',name,[x,y,z],[1,1,1],C.light,'stone');p.platform.thickness=.65;p.platform.railing='posts';Object.assign(p.platform.sections[0],{id:p.id+'-deck',kind:round?'circle':'rectangle',width:w,depth:d,radius:0});return p;};
 const ref=(p,side)=>({partId:p.id,platformSection:p.platform.sections[0].id,side});
 const port=(p,side)=>platformPorts(p).find(q=>q.ref.side===side).point.toArray();
 function bridge(name,from,side,to,endSide,width=4){
  const a=port(from,side),b=port(to,endSide),run=Math.hypot(b[0]-a[0],b[2]-a[2]),rise=b[1]-a[1];
  const p=add('stair-route',name,a,[1,1,1],C.stone,'stone',[0,Math.atan2(b[0]-a[0],b[2]-a[2]),0]);
  const n=Math.max(1,Math.ceil(Math.abs(rise)/2),Math.ceil(run/22)),rest=rise?1.8:0,flight=(run-rest*(n-1))/n;
  p.route={width,thickness:.45,gap:.2,links:{start:ref(from,side),end:ref(to,endSide)},segments:[]};
  for(let i=0;i<n;i++){
   p.route.segments.push({kind:rise?'stairs':'landing',run:flight,rise:rise/n,steps:rise?Math.ceil(Math.abs(rise/n)/.17):1,turn:'straight',fillToGround:false});
   if(rest&&i<n-1)p.route.segments.push({kind:'landing',run:rest,rise:0,steps:1,turn:'straight'});
  }
  for(const s of p.route.segments)s.railing={style:'posts',height:1.1,spacing:2.5,color:C.bronze};return p;
 }
 function room(name,x,y,z,w,d,h=4,doors=true){
  const p=add('interior',name,[x,y,z]),plan=defaultInterior();plan.height=h;plan.rooms=[{id:p.id+'-room',x:-w/2,z:-d/2,w,d}];
  plan.finishes={floor:{color:C.light,preset:'tile',scale:1},wall:{color:C.light,preset:'plain',scale:1},outside:{color:C.stone,preset:'stone',scale:1},ceiling:{color:C.light,preset:'plain',scale:1},roof:{color:C.teal,preset:'metal',scale:1}};
  if(doors)for(const side of [-1,1])plan.doors.push({id:p.id+'-door-'+side,axis:'x',line:side*d/2,offset:0,width:Math.min(w-1,4),height:Math.min(h-.4,3.6),kind:'door'});
  for(const side of [-1,1])for(const offset of [-d*.25,d*.25])plan.doors.push({id:p.id+'-window-'+side+'-'+offset,axis:'z',line:side*w/2,offset,width:Math.min(1.3,d*.2),height:Math.min(1.6,h-1.3),sill:1.1,kind:'window'});
  p.interior=plan;return p;
 }
 function lamp(x,y,z){box('Bronze lantern foot',[x,y,z],[.55,.2,.55],C.bronze,'metal');box('Lantern stem',[x,y+.2,z],[.16,2.5,.16],C.dark,'metal');box('Amber lantern glass',[x,y+2.7,z],[.5,.7,.5],'#ffd18b','plain');add('cone','Lantern cap',[x,y+3.4,z],[.8,.35,.8],C.bronze,'metal');}
 function tree(x,y,z,size=.35,season='summer'){const p=add('flora','Terrace aspen · '+season,[x,y,z],[size,size,size]);Object.assign(p,instantiateFloraTreePreset('aspen-'+season));return p;}
 function island(name,x,y,z,w,d){
  // Overlapping low-poly basalt columns read as stratified cliff rather than
  // a flat floating plate. The dressed upper courses carry the public decks.
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7,r=i? .26:0;const p=add('hex',name+' · basalt buttress',[x+Math.sin(a)*w*r,-32-i%3*3,z+Math.cos(a)*d*r],[w*.52,y+30+i%3*3+i*.063,d*.52],i%2?C.rock:'#627475','slate');p.shape={taper:.2,bulge:.08};}
  // The structural cap ends inside the deck's thickness, below its walk face.
  // Equal cap/deck heights otherwise leave two competing coplanar surfaces.
  add('round',name+' · dressed crown',[x,y-2,z],[w,1.4,d],C.dark,'stone');
  ring(name+' · bronze waterline',x,y-.5,z,w+.5,.3,2).scale[2]=d+.5;
  for(let i=0;i<4;i++){
   const a=i*Math.PI/2+.45;
   const p=add('hex',name+' · fractured cliff spur',[x+Math.sin(a)*w*.34,-29,z+Math.cos(a)*d*.34],[w*.28,y+18-i*2,d*.28],i%2?'#78837a':C.rock,'slate',[.06*Math.cos(a),a,.08*Math.sin(a)]);
   p.shape={taper:-.35,bulge:.16};
  }
 }

 district='01 · Tide engine';
 island('Engine island',0,16,0,32,32);const hub=deck('Engine plaza',0,16,0,32,32,true);
 for(const sign of [-1,1]){
  add('taper','Engine stone abutment',[sign*28,-18,-8],[10,58,13],C.dark,'stone');
  box('Abutment bronze collar',[sign*28,39,-8],[10.6,1.1,13.6],C.bronze,'metal');
 }
 ring('Great tide wheel · outer housing',0,50,-9,68,2,5,C.bronze,true);
 ring('Great tide wheel · ivory rim',0,50,-9.45,64,.45,2,C.light,true);
 ring('Great tide wheel · inner track',0,50,-9.6,57,.35,2,C.teal,true);
 for(let i=0;i<24;i++){
  const a=i*Math.PI/12,r=32.1,u=[Math.sin(a),Math.cos(a)];
  beam('Wheel index '+(i+1),[u[0]*r,50+u[1]*r,-9.8],[u[0]*(r+1.1),50+u[1]*(r+1.1),-9.8],i%3?.35:.7,.4,C.light);
 }
 ring('Orbital stabilizer',0,50,-10,29,1.1,3,C.bronze,true);
 const orbit=ring('Inclined gyroscope',0,49.5,-8,20,1,3,C.teal);orbit.rotation=[.5,0,.5];
 add('orb','Tidal heart · turquoise crystal',[0,44.6,-8],[9,9,9],C.water,'hammered');
 for(const sign of [-1,1]){beam('Engine suspension spoke',[sign*14.5,50,-9.5],[sign*27.3,50,-9.5],.5,.7);beam('Ring bracing',[sign*27,33,-7],[sign*30,24,-7],.8,.8);}
 // Six metres of headroom beneath the wheel's lowest rim, above the plaza.
 for(const p of parts)if(/Great tide wheel|Wheel index|Orbital stabilizer|Inclined gyroscope|Tidal heart|Engine suspension spoke/.test(p.name))p.position[1]+=6;
 // The center remains clear: sightlines and the northern bridge pass beneath it.
 for(const [x,z] of [[-8,8],[8,8],[-8,-8],[8,-8]]){add('round','Engine plaza planter',[x,16,z],[3.4,.7,3.4],C.bronze,'metal');tree(x,16.7,z,.25);}
 for(const x of [-11,11])lamp(x,16,1);

 district='02 · Lantern harbor';
 island('Harbor cliff',0,12,51,44,25);const harbor=deck('Harbor arrival terrace',0,12,51,44,24);
 bridge('Processional bridge · harbor to engine',harbor,'front',hub,'back',5);
 for(const x of [-15,0,15]){
  const finger=deck('Boarding pier '+x,x,12,77,5,18);bridge('Harbor gangway '+x,harbor,'back',finger,'front',2.4);
  // Offset gangways use explicit endpoints rather than forcing a central port.
  const gang=parts.at(-1);if(x){gang.route.links.start={partId:harbor.id,platformSection:harbor.platform.sections[0].id,edge:2,edgeT:(22-x)/44};}
  for(const z of [66,78])lamp(x+(x<0?-2:2),12,z);
 }
 room('Harbor master · open ticket hall',-14,12,49,9,9,4);
 for(const x of [-20,20])for(const z of [43,57])lamp(x,12,z);
 for(const x of [-10,10]){add('round','Mooring capstan',[x,12,57],[1.1,.8,1.1],C.bronze,'metal');}
 // Two distinct native-part skiffs at the quays.
 for(const [x,z,angle] of [[-23,73,-.15],[8,76,.12]]){
  const old=district;district=x<0?'03 · Courier skiff':'04 · Cargo skiff';
  const hull=add('taper','Stepped vessel hull',[x,9.5,z],[7,1.5,14],C.teal,'metal',[0,angle,0]);hull.shape={taper:.2};
  box('Vessel deck',[x,11,z],[5.6,.35,11],C.light,'wood');
  room('Skiff wheelhouse',x,11.35,z-2,3.6,4,2.5);
  add('saucer','Pilot canopy',[x,13.9,z-2],[4,1,4.6],C.bronze,'metal');
  beam('Signal mast',[x+1.7,11.4,z],[x+1.7,18,z],.15,.15);
  box('Cargo locker',[x,11.35,z+3],[3,.9,2],C.cloth,'metal');district=old;
 }

 district='05 · Hanging gardens';
 island('Garden island',-54,12,0,42,44);const garden=deck('Garden promenade',-54,12,0,42,44,true);
 bridge('West bridge · engine to gardens',hub,'left',garden,'right',4);
 for(const [x,z,season] of [[-65,7,'fall'],[-43,7,'summer'],[-65,-9,'summer'],[-43,-9,'fall']]){
  add('round','Raised garden planter',[x,12,z],[6,.65,6],C.dark,'stone');tree(x,12.65,z,.48,season);
  add('ring','Planter bronze coping',[x,12.65,z],[6.2,.8,6.2],C.bronze,'metal');
 }
 room('Conservatory · inhabited garden room',-54,12,0,13,11,4.2);
 add('dome','Conservatory turquoise dome',[-54,16.4,0],[16,10,14],C.teal,'metal');
 ring('Conservatory lantern drum',-54,21.2,0,3,1.6,15,C.bronze);
 add('dome','Conservatory lantern cap',[-54,22.8,0],[4,2.4,4],C.bronze,'metal');
 for(const x of [-60,-48])for(const z of [-7,7])add('doric-smooth','Garden loggia column',[x,12,z],[.75,1.4,.75],C.light,'marble');
 for(const z of [-16,16]){box('Garden reflecting basin',[-54,12,z],[9,.25,3],C.dark,'stone');box('Still turquoise water',[-54,12.26,z],[8.5,.08,2.5],C.water,'metal');}
 for(const z of [-14,14])lamp(-70,12,z);

 district='06 · Saffron exchange';
 island('Market island',54,20,0,42,44);const market=deck('Market court',54,20,0,42,44,true);
 bridge('East bridge · engine to exchange',hub,'right',market,'left',4);
 for(const [x,z] of [[45,-10],[63,-10],[45,11],[63,11]]){
  room('Market shop · open through passage',x,20,z,9,8,3.6);
  add('roof','Copper market hip roof',[x,23.8,z],[10,3.5,9],C.teal,'metal');
  box('Shopfront canopy',[x,23.3,z+5],[8,.15,2],C.cloth,'plain');
  for(const dx of [-3.5,3.5])box('Canopy post',[x+dx,20,z+5.5],[.12,3.3,.12],C.bronze,'metal');
 }
 for(const z of [-3,4]){box('Spice stall counter',[55,20,z],[5,1,1.4],C.bronze,'wood');add('awning','Saffron striped sunshade',[55,22.8,z],[4.8,1.2,2.5],C.cloth,'plain');for(const x of [53.5,55,56.5])add('orb','Market spice jar',[x,21,z],[.6,.7,.6],x===55?C.water:C.light,'plain');}
 for(const z of [-16,16])lamp(72,20,z);
 add('round','Exchange clock tower',[71,20,0],[5,17,5],C.stone,'stone');
 ring('Clocktower gallery',71,34,0,7,.6,10);
 add('cone','Clocktower copper spire',[71,37,0],[7,8,7],C.teal,'metal');
 add('orb','Clocktower finial',[71,45,0],[1.2,1.2,1.2],C.bronze,'metal');

 district='07 · Observatory acropolis';
 island('Acropolis cliff',0,24,-62,44,32);const north=deck('Observatory forecourt',0,24,-62,44,32);
 bridge('North bridge · ascent beneath the wheel',hub,'front',north,'back',5);
 room('Chart archive · through hall',0,24,-64,23,14,5.5);
 for(const x of [-10,-5,5,10])add('doric-smooth','Archive front column',[x,24,-55.5],[1.15,1.85,1.15],C.light,'marble');
 box('Archive continuous entablature',[0,29.6,-64],[26,.8,18],C.light,'stone');
 add('roof','Archive copper roof',[0,30.4,-64],[28,4.5,19],C.teal,'metal');
 add('round','Observatory upper drum',[0,31.8,-65],[12,7,12],C.stone,'stone');
 ring('Observatory bronze crown',0,38.6,-65,13,.7,6);
 add('dome','Split-sky observatory dome',[0,39.3,-65],[14,11,14],C.teal,'metal');
 beam('Telescope outer barrel',[0,40,-61],[0,47,-53],1.5,1.5,C.bronze);
 for(const x of [-17,17])lamp(x,24,-53);
 // An asymmetric cluster gives the skyline a recognisable silhouette.
 for(const [x,z,height,diameter] of [[-14,-77,47,9],[13,-77,64,10],[27,-71,34,7]]){
  add('round','Archive signal tower',[x,-15,z],[diameter,height,diameter],C.stone,'cor-column-windows');
  for(let y=4;y<height-15;y+=9)ring('Tower bronze belt',x,y+.04,z,diameter+.5,.35,4);
  add('dome','Signal tower crown',[x,height-15,z],[diameter+1,6,diameter+1],C.teal,'metal');
  add('antenna','Signal finial',[x,height-12,z],[1,5,1],C.bronze,'metal');
 }

 // Two outer returns form a genuine circuit. Connections cut the native deck
 // rail openings and survive edits; there are no collision walls at the joins.
 district='08 · Western pilgrims walk';
 const westTurn=deck('Western waterfall belvedere',-54,16,-62,12,10);
 bridge('Garden return · short resting flights',garden,'front',westTurn,'back',3);
 bridge('High west bridge · belvedere to archive',westTurn,'right',north,'left',3);
 district='09 · Eastern merchants walk';
 const eastTurn=deck('Eastern aqueduct lookout',54,24,-62,12,10);
 bridge('Market return · upper arcade steps',market,'front',eastTurn,'back',3);
 bridge('High east bridge · lookout to archive',eastTurn,'left',north,'right',3);
 for(const sign of [-1,1]){
  const x=sign*54;add('hex','Lookout basalt needle',[x,-30,-62],[10,sign<0?45.3:53.3,10],C.rock,'slate');
  for(const dx of [-4,4])lamp(x+dx,sign<0?16:24,-64);
  beam('Bridge diagonal support',[sign*26,1,-62],[sign*44,sign<0?15.3:23.3,-62],1.1,1.1,C.dark,'stone');
 }

 district='10 · The twin falls';
 // Solid stylized water ribbons export exactly as seen. Stepped pale ribbons
 // break up their silhouette; no particles or hidden preview meshes are needed.
 for(const [x,z,top,w] of [[-32,-27,32,5],[33,-28,32,4]]){
  add('hex','Waterfall source cliff',[x,-35,z],[14,top+34,8],C.rock,'slate');
  box('Aqueduct spill basin',[x,top-1,z],[w+2,1,9],C.stone,'stone');
  box('Turquoise spill pool',[x,top+.02,z],[w,.1,8],C.water,'metal');
  for(let i=0;i<3;i++)box('Waterfall ribbon '+i,[x+(i-1)*w/3,-29.8-i*.03,z+4+i*.12],[w/3+.12,top+29.96-i*.87,.22],i===1?'#b4e8dc':C.water,'plain');
  for(const sign of [-1,1])beam('Aqueduct retaining rail',[x+sign*(w/2+.5),top,z-4],[x+sign*(w/2+.5),top,z+4],.25,.25,C.bronze);
  add('orb','Waterfall foam fan',[x,-29.8,z+4],[w*2,.65,6],'#b3dcd1','plain');
 }
 district='11 · Sky aqueduct';
 for(const x of [-26,-13,0,13,26])add('archbody','Aqueduct · open stone span',[x,13.3,-29],[10,14,5],C.stone,'stone');
 box('Aqueduct channel bed',[0,31.5,-28],[67,.6,3],C.dark,'stone');
 box('Aqueduct upper water',[0,32.12,-28],[66,.12,2.2],C.water,'metal');
 for(const z of [-29.4,-26.6])box('Aqueduct bronze channel edge',[0,32.1,z],[67,.45,.2],C.bronze,'metal');

 district='12 · Sea and ruins';
 box('Quiet sea · editable water plane',[0,-30,2],[190,.2,190],'#367c88','metal');
 for(const [x,z,h,w] of [[-83,-67,30,17],[-78,33,23,12],[85,-60,35,14],[85,39,19,13],[-35,-84,28,14],[45,-84,20,12]]){
  add('hex','Offshore basalt stack',[x,-32,z],[w,h,w*.8],C.rock,'slate');
  add('taper','Weathered stack crown',[x,h-32,z],[w*.9,4,w*.7],C.stone,'stone');
 }
 district='13 · Arrival reference';add('character-reference','Start here · harbor arrival',[0,12,53]);
 // Keep the sea at the editor ground plane, with only submerged rock below it.
 for(const p of parts)p.position[1]+=30;
 return prepareExampleCopies(validateProject(preparePatternScaling({format:'open-building-studio',version:1,name:'Asterfall · City of the Tide Engine',parts:resolveRouteLinks(parts)})),'asterfall-copy');
}
